from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path

env_file = Path(__file__).resolve().parent.parent / ".env"

load_dotenv(env_file)


class Settings(BaseSettings):
    DEBUG_MODE: bool = Field(default=True)
    LOGURU_LEVEL: str = Field(default="DEBUG")
    VE_KEY: str = Field(description="火山引擎方舟大模型key")
    VE_AK: str = Field(description="火山引擎AK")
    VE_SK: str = Field(description="火山引擎SK")


settings = Settings()

if __name__ == "__main__":
    print(settings.model_dump_json(indent=2, exclude_none=True))
