from pydantic import BaseModel
from typing import Literal


class PolicyQaMessage(BaseModel):
    role: Literal["assistant", "user"]
    content: str


class PolicyQaParam(BaseModel):
    user_input: str
    context_messages: list[PolicyQaMessage] | None = None

