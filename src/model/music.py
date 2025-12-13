from pydantic import BaseModel

class MusicGenerateParam(BaseModel):
    prompt: str|None = None
    gender: str|None = None
    genre: str|None = None
    mood: str|None = None