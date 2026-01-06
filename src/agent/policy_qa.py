from langchain_openai import ChatOpenAI
from src.conf.env import settings
from src.agent.prompt import policy_qa_system_prompt
from datetime import datetime
from langchain_core.messages import ChatMessage, HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_core.output_parsers.json import JsonOutputParser
from src.utils import constant
from src.model.policy import PolicyQaMessage


class PolicyAgent:
    def __init__(self):
        self.llm =ChatOpenAI(temperature=1.0, model="kimi-k2-250905", base_url=constant.VE_BASE_URL, api_key=settings.VE_KEY)

    async def ask(self, user_input: str, context_messages: list[PolicyQaMessage] | None = None):
        processed_messages: list[BaseMessage] = [SystemMessage(content=policy_qa_system_prompt)]
        context_messages = context_messages or []
        # process ChatMessage
        def convert_to_chat_message(message: PolicyQaMessage):
            if message.role == "assistant":
                return AIMessage(content=message.content)
            elif message.role == "user":
                return HumanMessage(content=message.content)
            else:
                raise ValueError(f"Unknown role: {message.role}")
        processed_messages += [convert_to_chat_message(message) for message in context_messages]
        processed_messages.append(HumanMessage(content=user_input))
        stream = self.llm.astream(processed_messages)
        return stream

if __name__ == "__main__":
    import asyncio
    async def main():
        agent = PolicyAgent()
        stream = await agent.ask(user_input="你好", context_messages=[PolicyQaMessage(role="user", content="你好")])
        async for chunk in stream:
            print(chunk.content, end="", flush=True)

    asyncio.run(main())
