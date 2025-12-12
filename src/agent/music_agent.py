from langchain_openai import ChatOpenAI
from src.conf.env import settings
from src.agent.prompt import music_generate_prompt_generate_prompt_template, music_generate_prompt_polish_prompt_template
from datetime import datetime
import time


class MusicAgent:
    def __init__(self):
        self.llm =ChatOpenAI(temperature=0.7, model="doubao-1-5-pro-32k-250115", base_url="https://ark.cn-beijing.volces.com/api/v3/", api_key=settings.VE_KEY)

    async def generate_prompt(self):
        """
        自动生成一个 生成音乐的prompt
        :return: 生成音乐的prompt
        """
        stream = self.llm.astream(music_generate_prompt_generate_prompt_template.format())
        return stream

    async def polish_prompt(self, old_prompt: str):
        pass

    async def generate_music(self, prompt: str):
        gen_music_url = "https://open.volcengineapi.com?Action=GenSongV4&Version=2024-08-12"
        headers = {
            "Host": "open.volcengineapi.com",
            "X-Date": datetime.utcnow().strftime("%Y%m%dT%H%M%SZ"),
            "Authorization": f"HMAC-SHA256 Credential={AccessKeyId}/{ShortDate}/{Region}/{Service}/request, SignedHeaders={SignedHeaders}, Signature={Signature}",
            "Content-Type": "application/json"
        }
        data = {
            "prompt": prompt,
            "ModelVersion": "v4.3"
        }


        pass


if __name__ == "__main__":
    import asyncio
    async def main():
        agent = MusicAgent()
        generated_prompt_stream = await agent.generate_prompt()
        async for chunk in generated_prompt_stream:
            print(chunk.content, end="")
    asyncio.run(main())

