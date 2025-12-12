from fastapi import FastAPI
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

app = FastAPI()

@app.get("/")
async def func():
    logger.info(f"request / endpoint!")
    return {"message": "hello world!"}

if __name__ == "__main__":
    import uvicorn
    log_config_file = Path(__file__).resolve().parent / "log_conf.yaml"
    print(f"Using log config file at: {log_config_file}")
    uvicorn.run(app, host="0.0.0.0", port=8002, log_config=str(log_config_file))