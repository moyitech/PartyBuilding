import json

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
import logging
from pathlib import Path
import httpx
import os
import uuid
import aiofiles
from urllib.parse import urlparse

import src.agent.policy_qa
from src.agent.activity_design import ActivityDesignAgent
from src.agent.music_agent import MusicAgent
from src.agent.policy_qa import PolicyAgent
from src.model.activity import ActivityDesignOutput, ActivityDesignInput
from src.model.music import MusicGenerateParam
from src.conf.env import settings
from collections.abc import AsyncIterator
from langchain_core.messages import AIMessageChunk

from src.model.policy import PolicyQaParam

logger = logging.getLogger(__name__)

app = FastAPI(debug=settings.DEBUG_MODE)

# 创建音频缓存目录
CACHE_DIR = Path(__file__).resolve().parent.parent / "cache" / "audio"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

async def openai_stream_generator(stream: AsyncIterator[AIMessageChunk]):
    async for token in stream:
        chunk = {
            "id": "chatcmpl-xxx",
            "object": "chat.completion.chunk",
            "choices": [
                {
                    "delta": {"content": token.content},
                    "index": 0,
                    "finish_reason": None
                }
            ]
        }

        yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"

    # 结束标志
    yield "data: [DONE]\n\n"


async def dict_stream_generator(stream: AsyncIterator[dict]):
    async for chunk in stream:
        yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
    # 结束标志
    yield "data: [DONE]\n\n"


# 缓存音频文件到本地服务器
async def cache_audio_file(url: str) -> str:
    """下载并缓存音频文件，返回本地文件名"""
    try:
        # 生成唯一的文件名
        file_extension = ".mp3"  # 默认扩展名
        parsed_url = urlparse(url)
        if "mp3" in parsed_url.path.lower():
            file_extension = ".mp3"
        elif "wav" in parsed_url.path.lower():
            file_extension = ".wav"
        elif "ogg" in parsed_url.path.lower():
            file_extension = ".ogg"

        filename = f"{uuid.uuid4()}{file_extension}"
        local_path = CACHE_DIR / filename

        logger.info(f"开始缓存音频文件: {url}")
        logger.info(f"本地保存路径: {local_path}")

        # 使用httpx下载文件
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            # 设置合适的请求头
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'audio/webm,audio/ogg,audio/wav,audio/mp3,audio/mpeg,*/*;q=0.9',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Referer': 'https://www.douyin.com/',
            }

            async with client.stream('GET', url, headers=headers) as response:
                response.raise_for_status()

                # 保存文件
                async with aiofiles.open(local_path, 'wb') as f:
                    async for chunk in response.aiter_bytes(chunk_size=8192):
                        await f.write(chunk)

        logger.info(f"音频文件缓存成功: {filename}")
        return filename

    except Exception as e:
        logger.error(f"缓存音频文件失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"缓存音频失败: {str(e)}")

@app.get("/music/cache/{filename}")
async def serve_cached_music(filename: str, request: Request):
    """提供缓存的音频文件，支持流式播放和范围请求"""
    import os

    file_path = CACHE_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="音频文件不存在")

    # 确定MIME类型
    if filename.endswith('.mp3'):
        media_type = 'audio/mpeg'
    elif filename.endswith('.wav'):
        media_type = 'audio/wav'
    elif filename.endswith('.ogg'):
        media_type = 'audio/ogg'
    else:
        media_type = 'audio/mpeg'  # 默认

    # 获取文件大小
    file_size = os.path.getsize(file_path)

    # 处理范围请求（支持流式播放）
    range_header = request.headers.get("range")
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Type": media_type,
        "Cache-Control": "public, max-age=3600",  # 缓存1小时
    }

    if range_header:
        # 解析范围请求头
        try:
            start, end = range_header.replace("bytes=", "").split("-")
            start = int(start) if start else 0
            end = int(end) if end else file_size - 1
        except (ValueError, IndexError):
            raise HTTPException(status_code=416, detail="Invalid range header")

        # 验证范围
        if start >= file_size or end >= file_size or start > end:
            raise HTTPException(status_code=416, detail="Requested range not satisfiable")

        # 计算内容长度
        content_length = end - start + 1

        # 更新响应头
        headers.update({
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Content-Length": str(content_length),
        })

        # 流式读取文件范围
        async def file_sender():
            with open(file_path, "rb") as file:
                file.seek(start)
                remaining_bytes = content_length
                chunk_size = 8192  # 8KB chunks

                while remaining_bytes > 0:
                    chunk = file.read(min(chunk_size, remaining_bytes))
                    if not chunk:
                        break
                    remaining_bytes -= len(chunk)
                    yield chunk

        return StreamingResponse(
            file_sender(),
            status_code=206,  # Partial Content
            headers=headers
        )
    else:
        # 完整文件响应
        headers.update({
            "Content-Length": str(file_size),
        })

        async def file_sender():
            with open(file_path, "rb") as file:
                chunk_size = 8192  # 8KB chunks
                while True:
                    chunk = file.read(chunk_size)
                    if not chunk:
                        break
                    yield chunk

        return StreamingResponse(
            file_sender(),
            headers=headers
        )

@app.get("/music/prompt_generate")
async def music_prompt_generate():
    agent = MusicAgent()
    generated_prompt = await agent.generate_prompt(stream=False)
    return generated_prompt


@app.post("/music/generate")
async def music_generate(generate_param: MusicGenerateParam):
    # return {
    #   "music_url": "/music/cache/198ef557-8c2f-4cb4-8e6f-bb12e579ce5d.mp3",
    #   "audio_captions": "{\"attribute\":{\"extra\":{\"sta_use_batch_request\":\"False\",\"asr_service\":\"asr\",\"caption_type\":\"singing\",\"is_singing\":\"False\",\"language\":\"zh-CN\"}},\"code\":0,\"duration\":107.737125,\"id\":\"44505667-6802-49a6-a565-d1a5f64b3273\",\"message\":\"Success\",\"utterances\":[{\"attribute\":{},\"end_time\":3089,\"start_time\":730,\"text\":\"[intro]\",\"words\":[{\"attribute\":{},\"end_time\":730,\"start_time\":730,\"text\":\"[\"},{\"attribute\":{},\"end_time\":1389,\"start_time\":730,\"text\":\"intro\"},{\"attribute\":{},\"end_time\":3089,\"start_time\":1389,\"text\":\"]\"}]},{\"attribute\":{},\"end_time\":6260,\"start_time\":3090,\"text\":\"[verse]\",\"words\":[{\"attribute\":{},\"end_time\":3090,\"start_time\":3090,\"text\":\"[\"},{\"attribute\":{},\"end_time\":6260,\"start_time\":3090,\"text\":\"verse\"},{\"attribute\":{},\"end_time\":6260,\"start_time\":6260,\"text\":\"]\"}]},{\"attribute\":{},\"end_time\":9689,\"start_time\":6260,\"text\":\"一艘红船破浪前行\",\"words\":[{\"attribute\":{},\"end_time\":6549,\"start_time\":6260,\"text\":\"一\"},{\"attribute\":{},\"end_time\":6989,\"start_time\":6690,\"text\":\"艘\"},{\"attribute\":{},\"end_time\":7360,\"start_time\":7090,\"text\":\"红\"},{\"attribute\":{},\"end_time\":7580,\"start_time\":7360,\"text\":\"船\"},{\"attribute\":{},\"end_time\":7780,\"start_time\":7580,\"text\":\"破\"},{\"attribute\":{},\"end_time\":8000,\"start_time\":7780,\"text\":\"浪\"},{\"attribute\":{},\"end_time\":8140,\"start_time\":8000,\"text\":\"前\"},{\"attribute\":{},\"end_time\":8309,\"start_time\":8140,\"text\":\"行\"},{\"attribute\":{},\"end_time\":9689,\"start_time\":8309,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":13049,\"start_time\":9690,\"text\":\"见证百年风云变幻\",\"words\":[{\"attribute\":{},\"end_time\":9860,\"start_time\":9690,\"text\":\"见\"},{\"attribute\":{},\"end_time\":10029,\"start_time\":9860,\"text\":\"证\"},{\"attribute\":{},\"end_time\":10220,\"start_time\":10050,\"text\":\"百\"},{\"attribute\":{},\"end_time\":10389,\"start_time\":10220,\"text\":\"年\"},{\"attribute\":{},\"end_time\":10780,\"start_time\":10530,\"text\":\"风\"},{\"attribute\":{},\"end_time\":11000,\"start_time\":10780,\"text\":\"云\"},{\"attribute\":{},\"end_time\":11140,\"start_time\":11000,\"text\":\"变\"},{\"attribute\":{},\"end_time\":11309,\"start_time\":11140,\"text\":\"幻\"},{\"attribute\":{},\"end_time\":13049,\"start_time\":11309,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":16529,\"start_time\":13050,\"text\":\"南湖烟雨初心如磐\",\"words\":[{\"attribute\":{},\"end_time\":13220,\"start_time\":13050,\"text\":\"南\"},{\"attribute\":{},\"end_time\":13389,\"start_time\":13220,\"text\":\"湖\"},{\"attribute\":{},\"end_time\":13760,\"start_time\":13490,\"text\":\"烟\"},{\"attribute\":{},\"end_time\":13980,\"start_time\":13760,\"text\":\"雨\"},{\"attribute\":{},\"end_time\":14229,\"start_time\":13980,\"text\":\"初\"},{\"attribute\":{},\"end_time\":14709,\"start_time\":14410,\"text\":\"心\"},{\"attribute\":{},\"end_time\":15469,\"start_time\":15170,\"text\":\"如\"},{\"attribute\":{},\"end_time\":15909,\"start_time\":15610,\"text\":\"磐\"},{\"attribute\":{},\"end_time\":16529,\"start_time\":15909,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":19569,\"start_time\":16530,\"text\":\"燎原星火点燃天地间\",\"words\":[{\"attribute\":{},\"end_time\":16780,\"start_time\":16530,\"text\":\"燎\"},{\"attribute\":{},\"end_time\":16980,\"start_time\":16780,\"text\":\"原\"},{\"attribute\":{},\"end_time\":17200,\"start_time\":16980,\"text\":\"星\"},{\"attribute\":{},\"end_time\":17420,\"start_time\":17200,\"text\":\"火\"},{\"attribute\":{},\"end_time\":17540,\"start_time\":17420,\"text\":\"点\"},{\"attribute\":{},\"end_time\":17709,\"start_time\":17540,\"text\":\"燃\"},{\"attribute\":{},\"end_time\":18780,\"start_time\":18610,\"text\":\"天\"},{\"attribute\":{},\"end_time\":18949,\"start_time\":18780,\"text\":\"地\"},{\"attribute\":{},\"end_time\":19429,\"start_time\":19130,\"text\":\"间\"},{\"attribute\":{},\"end_time\":19569,\"start_time\":19429,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":20809,\"start_time\":19570,\"text\":\"[verse]\",\"words\":[{\"attribute\":{},\"end_time\":19570,\"start_time\":19570,\"text\":\"[\"},{\"attribute\":{},\"end_time\":20509,\"start_time\":19570,\"text\":\"verse\"},{\"attribute\":{},\"end_time\":20809,\"start_time\":20509,\"text\":\"]\"}]},{\"attribute\":{},\"end_time\":23809,\"start_time\":20810,\"text\":\"镰刀铁锤交相辉映\",\"words\":[{\"attribute\":{},\"end_time\":21060,\"start_time\":20810,\"text\":\"镰\"},{\"attribute\":{},\"end_time\":21260,\"start_time\":21060,\"text\":\"刀\"},{\"attribute\":{},\"end_time\":21480,\"start_time\":21260,\"text\":\"铁\"},{\"attribute\":{},\"end_time\":21700,\"start_time\":21480,\"text\":\"锤\"},{\"attribute\":{},\"end_time\":21949,\"start_time\":21700,\"text\":\"交\"},{\"attribute\":{},\"end_time\":22340,\"start_time\":22090,\"text\":\"相\"},{\"attribute\":{},\"end_time\":22460,\"start_time\":22340,\"text\":\"辉\"},{\"attribute\":{},\"end_time\":22629,\"start_time\":22460,\"text\":\"映\"},{\"attribute\":{},\"end_time\":23809,\"start_time\":22629,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":27249,\"start_time\":23810,\"text\":\"照亮万里锦绣河山\",\"words\":[{\"attribute\":{},\"end_time\":23980,\"start_time\":23810,\"text\":\"照\"},{\"attribute\":{},\"end_time\":24149,\"start_time\":23980,\"text\":\"亮\"},{\"attribute\":{},\"end_time\":24380,\"start_time\":24210,\"text\":\"万\"},{\"attribute\":{},\"end_time\":24549,\"start_time\":24380,\"text\":\"里\"},{\"attribute\":{},\"end_time\":24820,\"start_time\":24650,\"text\":\"锦\"},{\"attribute\":{},\"end_time\":24989,\"start_time\":24820,\"text\":\"绣\"},{\"attribute\":{},\"end_time\":25829,\"start_time\":25530,\"text\":\"河\"},{\"attribute\":{},\"end_time\":26309,\"start_time\":26010,\"text\":\"山\"},{\"attribute\":{},\"end_time\":27249,\"start_time\":26309,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":32369,\"start_time\":27250,\"text\":\"浴血奋战初心不变\",\"words\":[{\"attribute\":{},\"end_time\":27500,\"start_time\":27250,\"text\":\"浴\"},{\"attribute\":{},\"end_time\":27700,\"start_time\":27500,\"text\":\"血\"},{\"attribute\":{},\"end_time\":27949,\"start_time\":27700,\"text\":\"奋\"},{\"attribute\":{},\"end_time\":28429,\"start_time\":28130,\"text\":\"战\"},{\"attribute\":{},\"end_time\":29140,\"start_time\":28970,\"text\":\"初\"},{\"attribute\":{},\"end_time\":29309,\"start_time\":29140,\"text\":\"心\"},{\"attribute\":{},\"end_time\":30549,\"start_time\":30250,\"text\":\"不\"},{\"attribute\":{},\"end_time\":31429,\"start_time\":31130,\"text\":\"变\"},{\"attribute\":{},\"end_time\":32369,\"start_time\":31429,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":37769,\"start_time\":32370,\"text\":\"前赴后继奏响凯歌传\",\"words\":[{\"attribute\":{},\"end_time\":32540,\"start_time\":32370,\"text\":\"前\"},{\"attribute\":{},\"end_time\":32709,\"start_time\":32540,\"text\":\"赴\"},{\"attribute\":{},\"end_time\":33109,\"start_time\":32810,\"text\":\"后\"},{\"attribute\":{},\"end_time\":33589,\"start_time\":33290,\"text\":\"继\"},{\"attribute\":{},\"end_time\":34340,\"start_time\":34090,\"text\":\"奏\"},{\"attribute\":{},\"end_time\":34580,\"start_time\":34340,\"text\":\"响\"},{\"attribute\":{},\"end_time\":34869,\"start_time\":34580,\"text\":\"凯\"},{\"attribute\":{},\"end_time\":35709,\"start_time\":35410,\"text\":\"歌\"},{\"attribute\":{},\"end_time\":36549,\"start_time\":36250,\"text\":\"传\"},{\"attribute\":{},\"end_time\":37769,\"start_time\":36549,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":39649,\"start_time\":37770,\"text\":\"[chorus]\",\"words\":[{\"attribute\":{},\"end_time\":37770,\"start_time\":37770,\"text\":\"[\"},{\"attribute\":{},\"end_time\":38309,\"start_time\":37770,\"text\":\"chorus\"},{\"attribute\":{},\"end_time\":39649,\"start_time\":38309,\"text\":\"]\"}]},{\"attribute\":{},\"end_time\":43089,\"start_time\":39650,\"text\":\"百年风华恰是少年\",\"words\":[{\"attribute\":{},\"end_time\":39840,\"start_time\":39650,\"text\":\"百\"},{\"attribute\":{},\"end_time\":40029,\"start_time\":39840,\"text\":\"年\"},{\"attribute\":{},\"end_time\":40500,\"start_time\":40330,\"text\":\"风\"},{\"attribute\":{},\"end_time\":40669,\"start_time\":40500,\"text\":\"华\"},{\"attribute\":{},\"end_time\":41669,\"start_time\":41370,\"text\":\"恰\"},{\"attribute\":{},\"end_time\":42060,\"start_time\":41810,\"text\":\"是\"},{\"attribute\":{},\"end_time\":42180,\"start_time\":42060,\"text\":\"少\"},{\"attribute\":{},\"end_time\":42349,\"start_time\":42180,\"text\":\"年\"},{\"attribute\":{},\"end_time\":43089,\"start_time\":42349,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":46529,\"start_time\":43090,\"text\":\"乘风破浪奋勇向前\",\"words\":[{\"attribute\":{},\"end_time\":43360,\"start_time\":43090,\"text\":\"乘\"},{\"attribute\":{},\"end_time\":43580,\"start_time\":43360,\"text\":\"风\"},{\"attribute\":{},\"end_time\":43780,\"start_time\":43580,\"text\":\"破\"},{\"attribute\":{},\"end_time\":44000,\"start_time\":43780,\"text\":\"浪\"},{\"attribute\":{},\"end_time\":44269,\"start_time\":44000,\"text\":\"奋\"},{\"attribute\":{},\"end_time\":44640,\"start_time\":44370,\"text\":\"勇\"},{\"attribute\":{},\"end_time\":44780,\"start_time\":44640,\"text\":\"向\"},{\"attribute\":{},\"end_time\":44949,\"start_time\":44780,\"text\":\"前\"},{\"attribute\":{},\"end_time\":46529,\"start_time\":44949,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":50129,\"start_time\":46530,\"text\":\"百年征程波澜壮阔\",\"words\":[{\"attribute\":{},\"end_time\":46700,\"start_time\":46530,\"text\":\"百\"},{\"attribute\":{},\"end_time\":46869,\"start_time\":46700,\"text\":\"年\"},{\"attribute\":{},\"end_time\":47340,\"start_time\":47170,\"text\":\"征\"},{\"attribute\":{},\"end_time\":47509,\"start_time\":47340,\"text\":\"程\"},{\"attribute\":{},\"end_time\":48420,\"start_time\":48250,\"text\":\"波\"},{\"attribute\":{},\"end_time\":48589,\"start_time\":48420,\"text\":\"澜\"},{\"attribute\":{},\"end_time\":49060,\"start_time\":48890,\"text\":\"壮\"},{\"attribute\":{},\"end_time\":49229,\"start_time\":49060,\"text\":\"阔\"},{\"attribute\":{},\"end_time\":50129,\"start_time\":49229,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":55269,\"start_time\":50130,\"text\":\"开天辟地辉煌诗篇\",\"words\":[{\"attribute\":{},\"end_time\":50380,\"start_time\":50130,\"text\":\"开\"},{\"attribute\":{},\"end_time\":50620,\"start_time\":50380,\"text\":\"天\"},{\"attribute\":{},\"end_time\":50860,\"start_time\":50620,\"text\":\"辟\"},{\"attribute\":{},\"end_time\":51109,\"start_time\":50860,\"text\":\"地\"},{\"attribute\":{},\"end_time\":51820,\"start_time\":51650,\"text\":\"辉\"},{\"attribute\":{},\"end_time\":51989,\"start_time\":51820,\"text\":\"煌\"},{\"attribute\":{},\"end_time\":53100,\"start_time\":52930,\"text\":\"诗\"},{\"attribute\":{},\"end_time\":53269,\"start_time\":53100,\"text\":\"篇\"},{\"attribute\":{},\"end_time\":55269,\"start_time\":53269,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":57290,\"start_time\":56569,\"text\":\"[inst]\",\"words\":[{\"attribute\":{},\"end_time\":56650,\"start_time\":56569,\"text\":\"[\"},{\"attribute\":{},\"end_time\":57229,\"start_time\":56650,\"text\":\"inst\"},{\"attribute\":{},\"end_time\":57290,\"start_time\":57229,\"text\":\"]\"}]},{\"attribute\":{},\"end_time\":60249,\"start_time\":57290,\"text\":\"[verse]\",\"words\":[{\"attribute\":{},\"end_time\":57290,\"start_time\":57290,\"text\":\"[\"},{\"attribute\":{},\"end_time\":58869,\"start_time\":57290,\"text\":\"verse\"},{\"attribute\":{},\"end_time\":60249,\"start_time\":58869,\"text\":\"]\"}]},{\"attribute\":{},\"end_time\":62000,\"start_time\":60250,\"text\":\"一艘红船破浪前行\",\"words\":[{\"attribute\":{},\"end_time\":60500,\"start_time\":60250,\"text\":\"一\"},{\"attribute\":{},\"end_time\":60700,\"start_time\":60500,\"text\":\"艘\"},{\"attribute\":{},\"end_time\":60900,\"start_time\":60700,\"text\":\"红\"},{\"attribute\":{},\"end_time\":61120,\"start_time\":60900,\"text\":\"船\"},{\"attribute\":{},\"end_time\":61389,\"start_time\":61120,\"text\":\"破\"},{\"attribute\":{},\"end_time\":61660,\"start_time\":61490,\"text\":\"浪\"},{\"attribute\":{},\"end_time\":61780,\"start_time\":61660,\"text\":\"前\"},{\"attribute\":{},\"end_time\":62000,\"start_time\":61780,\"text\":\"行\"},{\"attribute\":{},\"end_time\":62000,\"start_time\":62000,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":64929,\"start_time\":62000,\"text\":\"见证百年风云变幻\",\"words\":[{\"attribute\":{},\"end_time\":62140,\"start_time\":62000,\"text\":\"见\"},{\"attribute\":{},\"end_time\":62309,\"start_time\":62140,\"text\":\"证\"},{\"attribute\":{},\"end_time\":63380,\"start_time\":63210,\"text\":\"百\"},{\"attribute\":{},\"end_time\":63549,\"start_time\":63380,\"text\":\"年\"},{\"attribute\":{},\"end_time\":63780,\"start_time\":63610,\"text\":\"风\"},{\"attribute\":{},\"end_time\":63820,\"start_time\":63780,\"text\":\"云\"},{\"attribute\":{},\"end_time\":63989,\"start_time\":63820,\"text\":\"变\"},{\"attribute\":{},\"end_time\":64389,\"start_time\":64090,\"text\":\"幻\"},{\"attribute\":{},\"end_time\":64929,\"start_time\":64389,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":71769,\"start_time\":64930,\"text\":\"南湖烟雨初心如磐\",\"words\":[{\"attribute\":{},\"end_time\":65100,\"start_time\":64930,\"text\":\"南\"},{\"attribute\":{},\"end_time\":65140,\"start_time\":65100,\"text\":\"湖\"},{\"attribute\":{},\"end_time\":65309,\"start_time\":65140,\"text\":\"烟\"},{\"attribute\":{},\"end_time\":66949,\"start_time\":66650,\"text\":\"雨\"},{\"attribute\":{},\"end_time\":68709,\"start_time\":68410,\"text\":\"初\"},{\"attribute\":{},\"end_time\":69149,\"start_time\":68850,\"text\":\"心\"},{\"attribute\":{},\"end_time\":69820,\"start_time\":69650,\"text\":\"如\"},{\"attribute\":{},\"end_time\":69989,\"start_time\":69820,\"text\":\"磐\"},{\"attribute\":{},\"end_time\":71769,\"start_time\":69989,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":77989,\"start_time\":71770,\"text\":\"燎原星火点燃天地间\",\"words\":[{\"attribute\":{},\"end_time\":71940,\"start_time\":71770,\"text\":\"燎\"},{\"attribute\":{},\"end_time\":72080,\"start_time\":71940,\"text\":\"原\"},{\"attribute\":{},\"end_time\":72300,\"start_time\":72080,\"text\":\"星\"},{\"attribute\":{},\"end_time\":72549,\"start_time\":72300,\"text\":\"火\"},{\"attribute\":{},\"end_time\":74000,\"start_time\":73730,\"text\":\"点\"},{\"attribute\":{},\"end_time\":74140,\"start_time\":74000,\"text\":\"燃\"},{\"attribute\":{},\"end_time\":74309,\"start_time\":74140,\"text\":\"天\"},{\"attribute\":{},\"end_time\":75149,\"start_time\":74850,\"text\":\"地\"},{\"attribute\":{},\"end_time\":75989,\"start_time\":75690,\"text\":\"间\"},{\"attribute\":{},\"end_time\":77989,\"start_time\":75989,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":79089,\"start_time\":78250,\"text\":\"[chorus]\",\"words\":[{\"attribute\":{},\"end_time\":78250,\"start_time\":78250,\"text\":\"[\"},{\"attribute\":{},\"end_time\":78829,\"start_time\":78250,\"text\":\"chorus\"},{\"attribute\":{},\"end_time\":79089,\"start_time\":78829,\"text\":\"]\"}]},{\"attribute\":{},\"end_time\":82529,\"start_time\":79090,\"text\":\"百年风华薪火相传\",\"words\":[{\"attribute\":{},\"end_time\":79260,\"start_time\":79090,\"text\":\"百\"},{\"attribute\":{},\"end_time\":79429,\"start_time\":79260,\"text\":\"年\"},{\"attribute\":{},\"end_time\":79940,\"start_time\":79770,\"text\":\"风\"},{\"attribute\":{},\"end_time\":80109,\"start_time\":79940,\"text\":\"华\"},{\"attribute\":{},\"end_time\":80380,\"start_time\":80210,\"text\":\"薪\"},{\"attribute\":{},\"end_time\":80549,\"start_time\":80380,\"text\":\"火\"},{\"attribute\":{},\"end_time\":80980,\"start_time\":80810,\"text\":\"相\"},{\"attribute\":{},\"end_time\":81149,\"start_time\":80980,\"text\":\"传\"},{\"attribute\":{},\"end_time\":82529,\"start_time\":81149,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":85969,\"start_time\":82530,\"text\":\"披荆斩棘一往无前\",\"words\":[{\"attribute\":{},\"end_time\":82700,\"start_time\":82530,\"text\":\"披\"},{\"attribute\":{},\"end_time\":82869,\"start_time\":82700,\"text\":\"荆\"},{\"attribute\":{},\"end_time\":83100,\"start_time\":82930,\"text\":\"斩\"},{\"attribute\":{},\"end_time\":83269,\"start_time\":83100,\"text\":\"棘\"},{\"attribute\":{},\"end_time\":83709,\"start_time\":83410,\"text\":\"一\"},{\"attribute\":{},\"end_time\":84080,\"start_time\":83810,\"text\":\"往\"},{\"attribute\":{},\"end_time\":84220,\"start_time\":84080,\"text\":\"无\"},{\"attribute\":{},\"end_time\":84389,\"start_time\":84220,\"text\":\"前\"},{\"attribute\":{},\"end_time\":85969,\"start_time\":84389,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":89369,\"start_time\":85970,\"text\":\"百年伟业初心不忘\",\"words\":[{\"attribute\":{},\"end_time\":86140,\"start_time\":85970,\"text\":\"百\"},{\"attribute\":{},\"end_time\":86309,\"start_time\":86140,\"text\":\"年\"},{\"attribute\":{},\"end_time\":86909,\"start_time\":86610,\"text\":\"伟\"},{\"attribute\":{},\"end_time\":87349,\"start_time\":87050,\"text\":\"业\"},{\"attribute\":{},\"end_time\":87989,\"start_time\":87690,\"text\":\"初\"},{\"attribute\":{},\"end_time\":88360,\"start_time\":88090,\"text\":\"心\"},{\"attribute\":{},\"end_time\":88629,\"start_time\":88360,\"text\":\"不\"},{\"attribute\":{},\"end_time\":89069,\"start_time\":88770,\"text\":\"忘\"},{\"attribute\":{},\"end_time\":89369,\"start_time\":89069,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":91769,\"start_time\":89370,\"text\":\"红色江山坚如磐石\",\"words\":[{\"attribute\":{},\"end_time\":89540,\"start_time\":89370,\"text\":\"红\"},{\"attribute\":{},\"end_time\":89709,\"start_time\":89540,\"text\":\"色\"},{\"attribute\":{},\"end_time\":90080,\"start_time\":89850,\"text\":\"江\"},{\"attribute\":{},\"end_time\":90280,\"start_time\":90080,\"text\":\"山\"},{\"attribute\":{},\"end_time\":90549,\"start_time\":90280,\"text\":\"坚\"},{\"attribute\":{},\"end_time\":90920,\"start_time\":90650,\"text\":\"如\"},{\"attribute\":{},\"end_time\":91060,\"start_time\":90920,\"text\":\"磐\"},{\"attribute\":{},\"end_time\":91229,\"start_time\":91060,\"text\":\"石\"},{\"attribute\":{},\"end_time\":91769,\"start_time\":91229,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":92809,\"start_time\":91770,\"text\":\"[chorus]\",\"words\":[{\"attribute\":{},\"end_time\":91770,\"start_time\":91770,\"text\":\"[\"},{\"attribute\":{},\"end_time\":92709,\"start_time\":91770,\"text\":\"chorus\"},{\"attribute\":{},\"end_time\":92809,\"start_time\":92709,\"text\":\"]\"}]},{\"attribute\":{},\"end_time\":96249,\"start_time\":92810,\"text\":\"百年风华续写新篇\",\"words\":[{\"attribute\":{},\"end_time\":92980,\"start_time\":92810,\"text\":\"百\"},{\"attribute\":{},\"end_time\":93149,\"start_time\":92980,\"text\":\"年\"},{\"attribute\":{},\"end_time\":93620,\"start_time\":93450,\"text\":\"风\"},{\"attribute\":{},\"end_time\":93789,\"start_time\":93620,\"text\":\"华\"},{\"attribute\":{},\"end_time\":94829,\"start_time\":94530,\"text\":\"续\"},{\"attribute\":{},\"end_time\":95200,\"start_time\":94930,\"text\":\"写\"},{\"attribute\":{},\"end_time\":95340,\"start_time\":95200,\"text\":\"新\"},{\"attribute\":{},\"end_time\":95509,\"start_time\":95340,\"text\":\"篇\"},{\"attribute\":{},\"end_time\":96249,\"start_time\":95509,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":99649,\"start_time\":96250,\"text\":\"中华巨轮扬帆远航\",\"words\":[{\"attribute\":{},\"end_time\":96420,\"start_time\":96250,\"text\":\"中\"},{\"attribute\":{},\"end_time\":96589,\"start_time\":96420,\"text\":\"华\"},{\"attribute\":{},\"end_time\":96920,\"start_time\":96690,\"text\":\"巨\"},{\"attribute\":{},\"end_time\":97140,\"start_time\":96920,\"text\":\"轮\"},{\"attribute\":{},\"end_time\":97300,\"start_time\":97140,\"text\":\"扬\"},{\"attribute\":{},\"end_time\":97469,\"start_time\":97300,\"text\":\"帆\"},{\"attribute\":{},\"end_time\":97940,\"start_time\":97770,\"text\":\"远\"},{\"attribute\":{},\"end_time\":98109,\"start_time\":97940,\"text\":\"航\"},{\"attribute\":{},\"end_time\":99649,\"start_time\":98109,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":103089,\"start_time\":99650,\"text\":\"百年奋斗圆梦可期\",\"words\":[{\"attribute\":{},\"end_time\":99840,\"start_time\":99650,\"text\":\"百\"},{\"attribute\":{},\"end_time\":100029,\"start_time\":99840,\"text\":\"年\"},{\"attribute\":{},\"end_time\":100500,\"start_time\":100330,\"text\":\"奋\"},{\"attribute\":{},\"end_time\":100669,\"start_time\":100500,\"text\":\"斗\"},{\"attribute\":{},\"end_time\":101709,\"start_time\":101410,\"text\":\"圆\"},{\"attribute\":{},\"end_time\":102080,\"start_time\":101810,\"text\":\"梦\"},{\"attribute\":{},\"end_time\":102349,\"start_time\":102080,\"text\":\"可\"},{\"attribute\":{},\"end_time\":102789,\"start_time\":102490,\"text\":\"期\"},{\"attribute\":{},\"end_time\":103089,\"start_time\":102789,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":106529,\"start_time\":103090,\"text\":\"复兴路上再创辉煌\",\"words\":[{\"attribute\":{},\"end_time\":103260,\"start_time\":103090,\"text\":\"复\"},{\"attribute\":{},\"end_time\":103429,\"start_time\":103260,\"text\":\"兴\"},{\"attribute\":{},\"end_time\":103660,\"start_time\":103490,\"text\":\"路\"},{\"attribute\":{},\"end_time\":103829,\"start_time\":103660,\"text\":\"上\"},{\"attribute\":{},\"end_time\":104269,\"start_time\":103970,\"text\":\"再\"},{\"attribute\":{},\"end_time\":105149,\"start_time\":104850,\"text\":\"创\"},{\"attribute\":{},\"end_time\":106220,\"start_time\":106050,\"text\":\"辉\"},{\"attribute\":{},\"end_time\":106389,\"start_time\":106220,\"text\":\"煌\"},{\"attribute\":{},\"end_time\":106529,\"start_time\":106389,\"text\":\"\"}]},{\"attribute\":{},\"end_time\":107737,\"start_time\":106530,\"text\":\"[outro]\",\"words\":[{\"attribute\":{},\"end_time\":106530,\"start_time\":106530,\"text\":\"[\"},{\"attribute\":{},\"end_time\":107623,\"start_time\":106530,\"text\":\"outro\"},{\"attribute\":{},\"end_time\":107737,\"start_time\":107623,\"text\":\"]\"}]}]}"
    # }
    try:
        # 生成音乐URL
        agent = MusicAgent()
        original_url, audio_captions = await agent.generate_music(
            prompt=generate_param.prompt,
            gender=generate_param.gender,
            genre=generate_param.genre,
            mood=generate_param.mood
        )

        logger.info(f"生成音乐原始URL: {original_url}")

        # 缓存音频文件
        cached_filename = await cache_audio_file(original_url)

        # 返回本地缓存URL
        local_url = f"/music/cache/{cached_filename}"
        logger.info(f"返回本地缓存URL: {local_url}")

        return {"music_url": local_url, "audio_captions": audio_captions}

    except Exception as e:
        logger.error(f"音乐生成失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"音乐生成失败: {str(e)}")


@app.post("/policy_agent/ask")
async def policy_qa(qa_param: PolicyQaParam):
    try:
        agent = PolicyAgent()
        stream = await agent.ask(qa_param.user_input, qa_param.context_messages)
        return StreamingResponse(openai_stream_generator(stream), media_type="text/event-stream")
    except Exception as e:
        logger.error(f"政策问答失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"政策问答失败: {str(e)}")

@app.post("/activity_design")
async def activity_design(design_param: ActivityDesignInput):
    try:
        agent = ActivityDesignAgent()
        stream = await agent.generate(design_param)
        return StreamingResponse(dict_stream_generator(stream), media_type="text/event-stream")
    except Exception as e:
        logger.error(f"活动设计失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"活动设计失败: {str(e)}")


frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="static")



if __name__ == "__main__":
    import uvicorn
    log_config_file = Path(__file__).resolve().parent / "log_conf.yaml"
    print(f"Using log config file at: {log_config_file}")
    uvicorn.run(app, host="0.0.0.0", port=8002, log_config=str(log_config_file))