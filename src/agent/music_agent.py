from langchain_openai import ChatOpenAI
from src.conf.env import settings
from src.agent.prompt import music_generate_prompt_generate_prompt_template, music_generate_prompt_polish_prompt_template
from datetime import datetime
from langchain_core.output_parsers.json import JsonOutputParser
from src.utils.ve_music.GenSongDemo import generate_music_async
from src.model.music import MusicGenerateParam
from pydantic import BaseModel
import time



class MusicAgent:

    def __init__(self):
        self.llm =ChatOpenAI(temperature=1.0, model="kimi-k2-250905", base_url="https://ark.cn-beijing.volces.com/api/v3/", api_key=settings.VE_KEY)

    async def generate_prompt(self, stream: bool):
        """
        自动生成一个 生成音乐的prompt
        :return: 生成音乐的prompt
        """
        parser = JsonOutputParser(pydantic_object=MusicGenerateParam)
        chain = self.llm | parser
        if stream:
            result = chain.astream(music_generate_prompt_generate_prompt_template.format())
        else:
            result = await chain.ainvoke(music_generate_prompt_generate_prompt_template.format())
            result = MusicGenerateParam.model_validate(result)
        return result

    async def polish_prompt(self, old_prompt: str):
        pass

    async def generate_music(self, prompt: str=None, gender: str=None, genre: str=None, mood: str=None) -> tuple[str, dict]:
        # return "https://v9-default.douyinvod.com/d2732d659c7ec48dc0bbcc59c0075eb6/6b1ea041/video/tos/cn/tos-cn-v-bfc035/ooBInAgAEFTgfPAgIBGDCHh7Wb2Axpp6YAKfBI/?a=7518&ch=0&cr=3&dr=0&er=0&cd=0%7C0%7C0%7C3&br=1378&bt=1378&ds=5&ft=GwL5G6EEBBkq8ZmoAMrIU_vjVQWw&mime_type=audio_wav&qs=13&rc=M2c2NG45cmtwNzczNDNoM0BpM2c2NG45cmtwNzczNDNoM0Bkb15sMmRzbHJhLS1kNC9zYSNkb15sMmRzbHJhLS1kNC9zcw%3D%3D&btag=80000e00028000&dy_q=1765633096&l=02176563307458200000000000000000000ffff0a843ad9425c30"
        music_url, audio_captions = await generate_music_async(prompt, gender, genre, mood)
        return music_url, audio_captions


if __name__ == "__main__":
    import asyncio
    async def main():
        agent = MusicAgent()
        generated_prompt = await agent.generate_prompt(stream=False)
        print(generated_prompt)
        # async for chunk in generated_prompt_stream:
        #     print(chunk, end="\n", flush=True)
        song_url = await agent.generate_music(
            prompt=generated_prompt.prompt,
            gender=generated_prompt.gender,
            genre=generated_prompt.genre,
            mood=generated_prompt.mood
        )
        print(song_url)

    asyncio.run(main())

