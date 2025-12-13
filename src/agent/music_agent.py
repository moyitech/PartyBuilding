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

    async def generate_music(self, prompt: str=None, gender: str=None, genre: str=None, mood: str=None) -> str:
        music_url = await generate_music_async(prompt, gender, genre, mood)
        return music_url


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

