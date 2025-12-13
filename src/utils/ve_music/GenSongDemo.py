import json
import asyncio
from typing import Optional, Dict, Any

import aiohttp

from src.utils.ve_music import Sign
from src.conf.env import settings

STATUS_CODE_SUCCESS = 0

QUERY_STATUS_CODE_WAITING = 0
QUERY_STATUS_CODE_HANDING = 1
QUERY_STATUS_CODE_SUCCESS = 2
QUERY_STATUS_CODE_FAILED = 3


def get_response(response_text: str) -> tuple[int, str, Dict[str, Any], Dict[str, Any]]:
    response_json = json.loads(response_text)
    return response_json.get('Code'), response_json.get('Message'), response_json.get('Result'), response_json.get(
        'ResponseMetadata')


async def generate_music_async(
    prompt: str,
    gender: str = None,
    genre: str = None,
    mood: str = None,
    ak: Optional[str] = None,
    sk: Optional[str] = None,
    query_interval: float = 5.0,
    verbose: bool = True
) -> Optional[str]:
    """
    异步生成音乐

    Args:
        prompt: 音乐生成提示词
        gender: 歌曲性别 (Male/Female)
        genre: 音乐风格 (Pop等)
        mood: 情绪 (Happy等)
        ak: Access Key (默认从settings获取)
        sk: Secret Key (默认从settings获取)
        query_interval: 查询间隔时间（秒）
        verbose: 是否打印详细日志

    Returns:
        str: 生成的音频URL，失败返回None

    Raises:
        RuntimeError: 当API调用失败时
    """
    # 使用默认的ak/sk如果没有提供
    if ak is None:
        ak = settings.VE_AK
    if sk is None:
        sk = settings.VE_SK

    # API配置
    action = "GenSongV4"
    version = "2024-08-12"
    region = "cn-beijing"
    service = 'imagination'
    host = "open.volcengineapi.com"
    path = "/"
    query = {'Action': action, 'Version': version}

    # 请求体
    body = {
        'Prompt': prompt,
        'Gender': gender,
        'Genre': genre,
        'Mood': mood,
    }

    # 准备请求头
    x_content_sha256 = Sign.hash_sha256(json.dumps(body))
    headers = {
        "Content-Type": 'application/json',
        'Host': host,
        'X-Date': Sign.get_x_date(),
        'X-Content-Sha256': x_content_sha256
    }

    # 获取签名
    authorization = Sign.get_authorization(
        "POST", headers=headers, query=query,
        service=service, region=region, ak=ak, sk=sk
    )

    if verbose:
        print(f"===>authorization:{authorization}")

    headers["Authorization"] = authorization

    # 发送生成请求
    url = Sign.get_url(host, path, action, version)

    async with aiohttp.ClientSession() as session:
        # 发送音乐生成请求
        async with session.post(url, data=json.dumps(body), headers=headers) as response:
            if not response.ok:
                raise RuntimeError(f"HTTP Error: {response.status}")

            response_text = await response.text()
            if verbose:
                print(f"===>Response:{response_text}")

            # 解析响应
            code, message, result, response_metadata = get_response(response_text)

            if code != STATUS_CODE_SUCCESS:
                raise RuntimeError(f"API Error: {message}")

            task_id = result['TaskID']
            predicted_wait_time = result['PredictedWaitTime'] + 5  # 预计等待时间，单位：秒

            if verbose:
                print('===>waiting...')

            # 等待预测时间
            await asyncio.sleep(predicted_wait_time)

            # 准备查询请求
            query_body = {'TaskID': task_id}
            x_content_sha256 = Sign.hash_sha256(json.dumps(query_body))

            query_headers = headers.copy()
            query_headers['X-Content-Sha256'] = x_content_sha256
            query_headers['X-Date'] = Sign.get_x_date()

            query_action = 'QuerySong'
            query["Action"] = query_action

            authorization = Sign.get_authorization(
                "POST", headers=query_headers, query=query,
                service=service, region=region, ak=ak, sk=sk
            )

            if verbose:
                print(f"===>authorization:{authorization}")

            query_headers["Authorization"] = authorization
            query_url = Sign.get_url(host, path, query_action, version)

            # 轮询查询结果
            song_detail = None
            while True:
                async with session.post(query_url, data=json.dumps(query_body), headers=query_headers) as query_response:
                    if not query_response.ok:
                        raise RuntimeError(f"HTTP Error: {query_response.status}")

                    query_response_text = await query_response.text()
                    code, message, result, response_metadata = get_response(query_response_text)

                    progress = result.get('Progress')
                    status = result.get('Status')

                    if status == QUERY_STATUS_CODE_FAILED:
                        raise RuntimeError(f"Generation failed: {query_response_text}")
                    elif status == QUERY_STATUS_CODE_SUCCESS:
                        song_detail = result.get('SongDetail')
                        if verbose:
                            print(f"===>query finished:{progress}")
                        break
                    elif status == QUERY_STATUS_CODE_WAITING or status == QUERY_STATUS_CODE_HANDING:
                        if verbose:
                            print(f"===>Progress:{progress}")
                        await asyncio.sleep(query_interval)
                    else:
                        if verbose:
                            print(f"Unknown status: {query_response_text}")
                        break

            # 返回音频URL
            if song_detail is not None:
                audio_url = song_detail.get('AudioUrl')
                if verbose:
                    print(f"===>AudioUrl:{audio_url}")
                return audio_url
            else:
                return None


# 保持原有的同步函数作为向后兼容
def generate_music_sync(
    prompt: str,
    gender: str = "Female",
    genre: str = "Pop",
    mood: str = "Happy",
    ak: Optional[str] = None,
    sk: Optional[str] = None,
    query_interval: float = 5.0,
    verbose: bool = True
) -> Optional[str]:
    """
    同步版本的生成音乐函数（内部使用asyncio运行）
    """
    return asyncio.run(generate_music_async(
        prompt=prompt,
        gender=gender,
        genre=genre,
        mood=mood,
        ak=ak,
        sk=sk,
        query_interval=query_interval,
        verbose=verbose
    ))


if __name__ == "__main__":
    # 使用异步函数的示例
    async def main():
        try:
            audio_url = await generate_music_async(
                prompt="""我想创作一首歌曲，AI 帮我写歌词关于"庆祝中国共产党成立一百周年，回顾党的光辉历程，赞颂党带领人民取得的伟大成就"。这首歌是"史诗交响"音乐风格，传达"庄严、激昂、深情赞颂"的情绪，使用"铜管乐、弦乐、混声大合唱"音色。""",
                gender="Female",
                genre="Pop",
                mood="Happy"
            )
            print(f"生成的音频URL: {audio_url}")
        except Exception as e:
            print(f"生成音乐失败: {e}")

    # 或者使用同步版本
    # try:
    #     audio_url = generate_music_sync(
    #         prompt="我想创作一首歌曲...",
    #         gender="Female",
    #         genre="Pop",
    #         mood="Happy"
    #     )
    #     print(f"生成的音频URL: {audio_url}")
    # except Exception as e:
    #     print(f"生成音乐失败: {e}")

    asyncio.run(main())
