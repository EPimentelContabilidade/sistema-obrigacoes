from fastapi import APIRouter, Request, Response, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from services import verificar_webhook, responder_duvida, enviar_whatsapp_texto
from sqlalchemy import select
from models import Cliente

router = APIRouter(prefix="/webhook", tags=["Webhook"])


@router.get("/whatsapp")
async def verificar(request: Request):
    """Verificação do webhook pelo Meta."""
    params = dict(request.query_params)
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    result = verificar_webhook(mode, token, challenge)
    if result:
        return Response(content=result, media_type="text/plain")
    return Response(content="Token inválido", status_code=403)


@router.post("/whatsapp")
async def receber_mensagem(request: Request, db: AsyncSession = Depends(get_db)):
    """Recebe mensagens do WhatsApp e responde automaticamente via IA."""
    try:
        body = await request.json()
        entry = body.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        messages = value.get("messages", [])

        for msg in messages:
            if msg.get("type") != "text":
                continue

            telefone = msg["from"]
            texto = msg["text"]["body"]

            # Buscar cliente pelo WhatsApp
            tel_limpo = "".join(filter(str.isdigit, telefone))
            result = await db.execute(select(Cliente).where(Cliente.whatsapp.contains(tel_limpo[-8:])))
            cliente = result.scalar_one_or_none()

            contexto = f"Cliente: {cliente.nome}, CNPJ: {cliente.cnpj}, Regime: {cliente.regime}" if cliente else "Cliente não identificado na base"

            resposta = responder_duvida(pergunta=texto, contexto_cliente=contexto)
            await enviar_whatsapp_texto(telefone, resposta)

    except Exception as e:
        pass  # Webhook deve sempre retornar 200

    return {"status": "ok"}
