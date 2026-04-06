from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os

app = FastAPI(title="Aerya NLP Proxy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"


class AnalyzeRequest(BaseModel):
    message: str


@app.post("/analyze")
async def analyze_sentiment(req: AnalyzeRequest):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(500, "API key not configured")

    prompt = (
        "Eres un modelo NLP de análisis de sentimiento para aerolíneas. "
        "Analiza este mensaje de un cliente y responde SOLO en JSON puro sin markdown ni backticks:\n"
        '{"sentiment":"positivo|negativo|neutral|urgente",'
        '"score":0.XX,"intent":"tipo_intent",'
        '"entities":["entidad1"],"confidence":0.XX,'
        '"emotion":"emocion",'
        '"suggestion":"respuesta sugerida para el agente de Aerya en 1 línea"}\n\n'
        f'Mensaje: "{req.message}"'
    )

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(
                ANTHROPIC_URL,
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                },
                json={
                    "model": "claude-haiku-3-5-20241022",,
                    "max_tokens": 500,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            text = "".join(
                block.get("text", "") for block in data.get("content", [])
            )
            return {"result": text}
        except httpx.HTTPStatusError as e:
            raise HTTPException(e.response.status_code, f"Anthropic API error: {e.response.text}")
        except Exception as e:
            raise HTTPException(500, str(e))


@app.get("/health")
async def health():
    return {"status": "ok", "api_configured": bool(ANTHROPIC_API_KEY)}