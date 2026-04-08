"""
Router: whatsapp_docs.py
Envio de mensagens, documentos PDF e links via WhatsApp Cloud API (Meta).
Gestão de conversas e histórico de mensagens.
"""

import os
import json
import httpx
import base64
from pathlib import Path
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from config import settings

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

# ── Configurações ─────────────────────────────────────────────────────────────
WPP_TOKEN = os.getenv("WHATSAPP_TOKEN", getattr(settings, "WHATSAPP_TOKEN", ""))
WPP_PHONE_ID = os.getenv("WHATSAPP_PHONE_ID", getattr(settings, "WHATSAPP_PHONE_ID", ""))
WPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", getattr(settings, "WHATSAPP_VERIFY_TOKEN", "epimentel"))
WPP_API_URL = f"https://graph.facebook.com/v20.0/{WPP_PHONE_ID}"

# Pasta para armazenar histórico de conversas e documentos enviados
CONV_DIR = Path("/app/conversas_whatsapp")
CONV_DIR.mkdir(parents=True, exist_ok=True)

DOCS_DIR = Path("/app/documentos_whatsapp")
DOCS_DIR.mkdir(parents=True, exist_ok=True)

# ── Schemas ───────────────────────────────────────────────────────────────────

class MensagemTexto(BaseModel):
    telefone: str
    mensagem: str
    cliente_nome: Optional[str] = None
    cliente_id: Optional[str] = None

class MensagemLink(BaseModel):
    telefone: str
    mensagem: str
    url: str
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    cliente_nome: Optional[str] = None

class MensagemTemplate(BaseModel):
    telefone: str
    template_nome: str
    idioma: str = "pt_BR"
    parametros: Optional[List[str]] = []
    cliente_nome: Optional[str] = None

class ReenviarDocumento(BaseModel):
    telefone: str
    media_id: str
    nome_arquivo: str
    legenda: Optional[str] = None

# ── Utilitários ───────────────────────────────────────────────────────────────

def limpar_telefone(tel: str) -> str:
    """Remove formatação e adiciona código do país se necessário."""
    numero = "".join(c for c in tel if c.isdigit())
    if not numero.startswith("55"):
        numero = "55" + numero
    return numero

def headers_wpp():
    return {
        "Authorization": f"Bearer {WPP_TOKEN}",
        "Content-Type": "application/json",
    }

def salvar_mensagem(telefone: str, mensagem: dict):
    """Salva mensagem no histórico local."""
    arquivo = CONV_DIR / f"{limpar_telefone(telefone)}.json"
    historico = []
    if arquivo.exists():
        try:
            historico = json.loads(arquivo.read_text())
        except Exception:
            historico = []
    historico.append({**mensagem, "timestamp": datetime.now().isoformat()})
    arquivo.write_text(json.dumps(historico, ensure_ascii=False, indent=2))

def carregar_historico(telefone: str) -> list:
    arquivo = CONV_DIR / f"{limpar_telefone(telefone)}.json"
    if not arquivo.exists():
        return []
    try:
        return json.loads(arquivo.read_text())
    except Exception:
        return []

def listar_conversas() -> list:
    conversas = []
    for arq in CONV_DIR.glob("*.json"):
        try:
            msgs = json.loads(arq.read_text())
            if msgs:
                ultima = msgs[-1]
                nao_lidas = sum(1 for m in msgs if m.get("direcao") == "recebida" and not m.get("lida"))
                conversas.append({
                    "telefone": arq.stem,
                    "cliente_nome": ultima.get("cliente_nome", ""),
                    "ultima_mensagem": ultima.get("mensagem", ultima.get("tipo", ""))[:60],
                    "ultima_data": ultima.get("timestamp", ""),
                    "nao_lidas": nao_lidas,
                    "total": len(msgs),
                })
        except Exception:
            pass
    conversas.sort(key=lambda x: x.get("ultima_data", ""), reverse=True)
    return conversas

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/enviar-texto")
async def enviar_texto(req: MensagemTexto):
    """Envia mensagem de texto via WhatsApp."""
    if not WPP_TOKEN or not WPP_PHONE_ID:
        raise HTTPException(status_code=503, detail="WhatsApp não configurado. Verifique WHATSAPP_TOKEN e WHATSAPP_PHONE_ID.")

    numero = limpar_telefone(req.telefone)
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": numero,
        "type": "text",
        "text": {"preview_url": True, "body": req.mensagem}
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{WPP_API_URL}/messages", headers=headers_wpp(), json=payload)
        data = resp.json()

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=data.get("error", {}).get("message", str(data)))

    msg_id = data.get("messages", [{}])[0].get("id", "")
    salvar_mensagem(numero, {
        "id": msg_id,
        "tipo": "texto",
        "mensagem": req.mensagem,
        "direcao": "enviada",
        "status": "enviada",
        "cliente_nome": req.cliente_nome or "",
        "cliente_id": req.cliente_id or "",
    })
    return {"status": "ok", "message_id": msg_id, "telefone": numero}


@router.post("/enviar-documento")
async def enviar_documento(
    telefone: str = Form(...),
    legenda: str = Form(""),
    cliente_nome: str = Form(""),
    cliente_id: str = Form(""),
    arquivo: UploadFile = File(...),
):
    """
    Faz upload de PDF/documento para a API do WhatsApp e envia ao destinatário.
    Suporta PDF, DOCX, XLSX, imagens.
    """
    if not WPP_TOKEN or not WPP_PHONE_ID:
        raise HTTPException(status_code=503, detail="WhatsApp não configurado.")

    conteudo = await arquivo.read()
    mime = arquivo.content_type or "application/pdf"
    nome = arquivo.filename or "documento.pdf"

    # 1. Upload do arquivo para o WhatsApp
    async with httpx.AsyncClient(timeout=60) as client:
        upload_resp = await client.post(
            f"https://graph.facebook.com/v20.0/{WPP_PHONE_ID}/media",
            headers={"Authorization": f"Bearer {WPP_TOKEN}"},
            data={"messaging_product": "whatsapp", "type": mime},
            files={"file": (nome, conteudo, mime)},
        )
        upload_data = upload_resp.json()

    if upload_resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=upload_resp.status_code,
            detail=f"Erro no upload: {upload_data.get('error', {}).get('message', str(upload_data))}"
        )

    media_id = upload_data.get("id")
    if not media_id:
        raise HTTPException(status_code=500, detail="media_id não retornado pelo WhatsApp.")

    # Salvar cópia local com media_id para reenvio futuro
    doc_path = DOCS_DIR / f"{media_id}_{nome}"
    doc_path.write_bytes(conteudo)

    # 2. Enviar documento ao número
    numero = limpar_telefone(telefone)
    tipo_msg = "image" if mime.startswith("image/") else "document"
    doc_payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": numero,
        "type": tipo_msg,
        tipo_msg: {
            "id": media_id,
            "caption": legenda,
            **({"filename": nome} if tipo_msg == "document" else {}),
        }
    }

    async with httpx.AsyncClient(timeout=30) as client:
        send_resp = await client.post(f"{WPP_API_URL}/messages", headers=headers_wpp(), json=doc_payload)
        send_data = send_resp.json()

    if send_resp.status_code not in (200, 201):
        raise HTTPException(status_code=send_resp.status_code, detail=send_data.get("error", {}).get("message", str(send_data)))

    msg_id = send_data.get("messages", [{}])[0].get("id", "")
    salvar_mensagem(numero, {
        "id": msg_id,
        "tipo": tipo_msg,
        "mensagem": legenda or f"[{nome}]",
        "nome_arquivo": nome,
        "media_id": media_id,
        "tamanho": len(conteudo),
        "mime": mime,
        "direcao": "enviada",
        "status": "enviada",
        "cliente_nome": cliente_nome,
        "cliente_id": cliente_id,
    })

    return {
        "status": "ok",
        "message_id": msg_id,
        "media_id": media_id,
        "telefone": numero,
        "arquivo": nome,
        "tamanho_bytes": len(conteudo),
    }


@router.post("/enviar-link")
async def enviar_link(req: MensagemLink):
    """Envia link com preview automático."""
    # WhatsApp gera preview automático quando a URL está no texto
    texto_completo = f"{req.mensagem}\n\n{req.url}" if req.mensagem else req.url
    return await enviar_texto(MensagemTexto(
        telefone=req.telefone,
        mensagem=texto_completo,
        cliente_nome=req.cliente_nome,
    ))


@router.post("/reenviar-documento")
async def reenviar_documento(req: ReenviarDocumento):
    """Reenvia um documento já enviado anteriormente usando o media_id."""
    if not WPP_TOKEN or not WPP_PHONE_ID:
        raise HTTPException(status_code=503, detail="WhatsApp não configurado.")

    numero = limpar_telefone(req.telefone)
    nome = req.nome_arquivo
    tipo_msg = "image" if nome.lower().endswith(('.jpg','.jpeg','.png','.gif','.webp')) else "document"

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": numero,
        "type": tipo_msg,
        tipo_msg: {
            "id": req.media_id,
            "caption": req.legenda or "",
            **({"filename": nome} if tipo_msg == "document" else {}),
        }
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{WPP_API_URL}/messages", headers=headers_wpp(), json=payload)
        data = resp.json()

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=data.get("error", {}).get("message", str(data)))

    msg_id = data.get("messages", [{}])[0].get("id", "")
    salvar_mensagem(numero, {
        "id": msg_id,
        "tipo": tipo_msg,
        "mensagem": req.legenda or f"[{nome}]",
        "nome_arquivo": nome,
        "media_id": req.media_id,
        "direcao": "enviada",
        "status": "enviada",
    })
    return {"status": "ok", "message_id": msg_id}


@router.post("/enviar-template")
async def enviar_template(req: MensagemTemplate):
    """Envia mensagem usando template aprovado pelo WhatsApp."""
    if not WPP_TOKEN or not WPP_PHONE_ID:
        raise HTTPException(status_code=503, detail="WhatsApp não configurado.")

    numero = limpar_telefone(req.telefone)
    componentes = []
    if req.parametros:
        componentes.append({
            "type": "body",
            "parameters": [{"type": "text", "text": p} for p in req.parametros]
        })

    payload = {
        "messaging_product": "whatsapp",
        "to": numero,
        "type": "template",
        "template": {
            "name": req.template_nome,
            "language": {"code": req.idioma},
            **({"components": componentes} if componentes else {}),
        }
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{WPP_API_URL}/messages", headers=headers_wpp(), json=payload)
        data = resp.json()

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=data.get("error", {}).get("message", str(data)))

    msg_id = data.get("messages", [{}])[0].get("id", "")
    salvar_mensagem(numero, {
        "id": msg_id,
        "tipo": "template",
        "mensagem": f"[Template: {req.template_nome}]",
        "direcao": "enviada",
        "status": "enviada",
        "cliente_nome": req.cliente_nome or "",
    })
    return {"status": "ok", "message_id": msg_id}


@router.post("/marcar-lida/{telefone}")
async def marcar_lida(telefone: str, message_id: str):
    """Marca mensagem como lida."""
    if WPP_TOKEN and WPP_PHONE_ID:
        payload = {"messaging_product":"whatsapp","status":"read","message_id":message_id}
        async with httpx.AsyncClient(timeout=15) as client:
            await client.post(f"{WPP_API_URL}/messages", headers=headers_wpp(), json=payload)

    # Atualizar histórico local
    numero = limpar_telefone(telefone)
    arquivo = CONV_DIR / f"{numero}.json"
    if arquivo.exists():
        try:
            msgs = json.loads(arquivo.read_text())
            msgs = [m if m.get("id") != message_id else {**m, "lida": True} for m in msgs]
            arquivo.write_text(json.dumps(msgs, ensure_ascii=False, indent=2))
        except Exception:
            pass
    return {"status": "ok"}


# ── Conversas ─────────────────────────────────────────────────────────────────

@router.get("/conversas")
async def get_conversas():
    """Lista todas as conversas com resumo."""
    return {"conversas": listar_conversas()}


@router.get("/historico/{telefone}")
async def get_historico(telefone: str, limite: int = 100):
    """Retorna histórico de mensagens de um número."""
    numero = limpar_telefone(telefone)
    historico = carregar_historico(numero)
    return {"telefone": numero, "mensagens": historico[-limite:], "total": len(historico)}


@router.delete("/conversa/{telefone}")
async def excluir_conversa(telefone: str):
    """Exclui histórico local de uma conversa."""
    numero = limpar_telefone(telefone)
    arquivo = CONV_DIR / f"{numero}.json"
    if arquivo.exists():
        arquivo.unlink()
    return {"status": "ok"}


@router.get("/status")
async def status_whatsapp():
    """Verifica se o WhatsApp está configurado e operacional."""
    if not WPP_TOKEN or not WPP_PHONE_ID:
        return {"status": "erro", "mensagem": "WHATSAPP_TOKEN ou WHATSAPP_PHONE_ID não configurados"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"https://graph.facebook.com/v20.0/{WPP_PHONE_ID}",
                headers={"Authorization": f"Bearer {WPP_TOKEN}"},
                params={"fields": "display_phone_number,verified_name,status"}
            )
            data = resp.json()
        if resp.status_code == 200:
            return {"status": "ok", "numero": data.get("display_phone_number"), "nome": data.get("verified_name"), "ativo": data.get("status")}
        else:
            return {"status": "erro", "mensagem": data.get("error", {}).get("message", "Erro desconhecido")}
    except Exception as e:
        return {"status": "erro", "mensagem": str(e)}


# ── Webhook (recebimento de mensagens) ────────────────────────────────────────

@router.get("/webhook")
async def verificar_webhook(request: Request):
    """Verificação do webhook pela Meta."""
    params = dict(request.query_params)
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    if mode == "subscribe" and token == WPP_VERIFY_TOKEN:
        return int(challenge)
    raise HTTPException(status_code=403, detail="Token inválido")


@router.post("/webhook")
async def receber_webhook(request: Request):
    """Recebe eventos do WhatsApp (mensagens recebidas, status de entrega)."""
    try:
        body = await request.json()
        entry = body.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        mensagens = value.get("messages", [])
        statuses = value.get("statuses", [])

        # Processar mensagens recebidas
        for msg in mensagens:
            telefone = msg.get("from", "")
            msg_id = msg.get("id", "")
            timestamp = msg.get("timestamp", "")
            tipo = msg.get("type", "text")

            conteudo = ""
            if tipo == "text":
                conteudo = msg.get("text", {}).get("body", "")
            elif tipo in ("image", "document", "audio", "video"):
                media = msg.get(tipo, {})
                conteudo = f"[{tipo.upper()}] {media.get('filename', media.get('caption', ''))}"
            elif tipo == "interactive":
                conteudo = msg.get("interactive", {}).get("button_reply", {}).get("title", "[Interativo]")

            # Dados do contato
            contatos = value.get("contacts", [{}])
            nome_contato = contatos[0].get("profile", {}).get("name", "") if contatos else ""

            salvar_mensagem(telefone, {
                "id": msg_id,
                "tipo": tipo,
                "mensagem": conteudo,
                "direcao": "recebida",
                "status": "recebida",
                "cliente_nome": nome_contato,
                "lida": False,
            })

        # Processar atualizações de status (entregue, lido)
        for st in statuses:
            msg_id = st.get("id", "")
            status = st.get("status", "")
            telefone = st.get("recipient_id", "")
            if telefone:
                arquivo = CONV_DIR / f"{telefone}.json"
                if arquivo.exists():
                    try:
                        msgs = json.loads(arquivo.read_text())
                        msgs = [m if m.get("id") != msg_id else {**m, "status": status} for m in msgs]
                        arquivo.write_text(json.dumps(msgs, ensure_ascii=False, indent=2))
                    except Exception:
                        pass

    except Exception as e:
        print(f"Erro no webhook WhatsApp: {e}")

    return {"status": "ok"}
