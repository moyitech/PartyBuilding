from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import logging
from pathlib import Path
from src.agent.music_agent import MusicAgent
from src.model.music import MusicGenerateParam
from src.conf.env import settings

logger = logging.getLogger(__name__)

app = FastAPI(debug=settings.DEBUG_MODE)
app.mount("/", StaticFiles(directory="frontend", html=True), name="static")

# @app.get("/")
# async def func():
#     logger.info(f"request / endpoint!")
#     return {"message": "hello world!"}


@app.get("/music/prompt_generate")
async def music_prompt_generate():
    agent = MusicAgent()
    generated_prompt = await agent.generate_prompt(stream=False)
    return generated_prompt


@app.post("/music/generate")
async def music_generate(generate_param: MusicGenerateParam):
    agent = MusicAgent()
    song_url = await agent.generate_music(
        prompt=generate_param.prompt,
        gender=generate_param.gender,
        genre=generate_param.genre,
        mood=generate_param.mood
    )
    return {"music_url": song_url}


if __name__ == "__main__":
    import uvicorn
    log_config_file = Path(__file__).resolve().parent / "log_conf.yaml"
    print(f"Using log config file at: {log_config_file}")
    uvicorn.run(app, host="0.0.0.0", port=8002, log_config=str(log_config_file))