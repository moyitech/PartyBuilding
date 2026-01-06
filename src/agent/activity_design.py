from langchain_openai import ChatOpenAI
from src.conf.env import settings
from src.agent.prompt import activity_design_prompt_template
from langchain_core.output_parsers.json import JsonOutputParser
from src.utils import constant
from src.model.activity import ActivityDesignInput, ActivityDesignOutput


class ActivityDesignAgent:
    def __init__(self):
        self.llm =ChatOpenAI(temperature=0.2, model="kimi-k2-250905", base_url=constant.VE_BASE_URL, api_key=settings.VE_KEY)

    async def generate(self, user_input: ActivityDesignInput):
        parser = JsonOutputParser(pydantic_object=ActivityDesignOutput)
        chain = self.llm | parser
        stream = chain.astream(activity_design_prompt_template.format(theme=user_input.theme, minute=user_input.minute, participant=user_input.participant))
        return stream

if __name__ == "__main__":
    import asyncio
    async def main():
        agent = ActivityDesignAgent()
        stream = await agent.generate(ActivityDesignInput(
            theme="科技强国",
            minute=45,
            participant="预备党员"
        ))
        async for chunk in stream:
            print(chunk, end="\n", flush=True)

    asyncio.run(main())
