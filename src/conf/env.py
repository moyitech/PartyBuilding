from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import Field

load_dotenv()


class Settings(BaseSettings):
    DEBUG_MODE: bool = Field(default=True)
    LOGURU_LEVEL: str = Field(default="DEBUG")
    VE_KEY: str = Field(description="火山引擎key")


settings = Settings()

if __name__ == "__main__":
    print(settings.model_dump_json(indent=2, exclude_none=True))
