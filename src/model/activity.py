from pydantic import BaseModel

class ActivityDesignInput(BaseModel):
    theme: str
    minute: int
    participant: str

class ActivityDesignOutput(BaseModel):
    学习资料: list[str] = list()
    讨论议题: list[str] = list()
    活动流程建议: str = ""
