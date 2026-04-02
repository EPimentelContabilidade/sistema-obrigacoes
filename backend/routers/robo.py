from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import anthropic
import base64
from config import settings

router = APIRouter(prefix="/robo", tags=["Robô IA"])


class RoboRequest(BaseModel):
    base64_data: str
    media_type: str  # application/pdf ou image/jpeg etc
    prompt: str


@router.post("/analisar")
async def analisar_documento(data: RoboRequest):
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=400, detail="ANTHROPIC_API_KEY não configurada no .env")

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    try:
        if "image" in data.media_type:
            content = [
                {"type": "image", "source": {"type": "base64", "media_type": data.media_type, "data": data.base64_data}},
                {"type": "text", "text": data.prompt}
            ]
        else:
            content = [
                {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": data.base64_data}},
                {"type": "text", "text": data.prompt}
            ]

        response = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=2000,
            messages=[{"role": "user", "content": content}]
        )

        texto = "".join(c.text for c in response.content if hasattr(c, "text"))
        return {"resultado": texto}

    except anthropic.AuthenticationError:
        raise HTTPException(status_code=401, detail="Chave API inválida. Verifique o ANTHROPIC_API_KEY no .env")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
