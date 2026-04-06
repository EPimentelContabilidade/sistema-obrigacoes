import httpx
from config import settings


BASE_URL = "https://graph.facebook.com/v19.0"


async def enviar_whatsapp_texto(telefone: str, mensagem: str) -> dict:
    """Envia mensagem de texto via WhatsApp Business API."""

    # Normalizar telefone (remover caracteres não numéricos e garantir código do país)
    tel = "".join(filter(str.isdigit, telefone))
    if not tel.startswith("55"):
        tel = "55" + tel

    url = f"{BASE_URL}/{settings.WHATSAPP_PHONE_ID}/messages"
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": tel,
        "type": "text",
        "text": {"preview_url": False, "body": mensagem},
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=15)
            data = response.json()

            if response.status_code == 200:
                return {"sucesso": True, "mensagem": "WhatsApp enviado", "data": data}
            else:
                return {"sucesso": False, "mensagem": data.get("error", {}).get("message", "Erro desconhecido"), "data": data}
    except Exception as e:
        return {"sucesso": False, "mensagem": str(e)}


async def enviar_whatsapp_documento(telefone: str, url_arquivo: str, nome_arquivo: str, caption: str = "") -> dict:
    """Envia documento via WhatsApp."""

    tel = "".join(filter(str.isdigit, telefone))
    if not tel.startswith("55"):
        tel = "55" + tel

    url = f"{BASE_URL}/{settings.WHATSAPP_PHONE_ID}/messages"
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": tel,
        "type": "document",
        "document": {
            "link": url_arquivo,
            "caption": caption,
            "filename": nome_arquivo,
        },
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=15)
            data = response.json()

            if response.status_code == 200:
                return {"sucesso": True, "mensagem": "Documento enviado via WhatsApp", "data": data}
            else:
                return {"sucesso": False, "mensagem": data.get("error", {}).get("message", "Erro"), "data": data}
    except Exception as e:
        return {"sucesso": False, "mensagem": str(e)}


async def responder_duvida(telefone: str, mensagem: str) -> dict:
    """Responde dúvida via WhatsApp."""
    return await enviar_whatsapp_texto(telefone, mensagem)
