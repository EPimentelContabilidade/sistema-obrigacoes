"""
Router: whatsapp_evolution.py
Integração completa com Evolution API (WhatsApp unofficial).
Suporta texto, PDF, links, recebimento e resposta de mensagens.
"""

import os
import json
import httpx
import base64
from pathlib import Path
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

# ── Configurações da Evolution API ────────────────────────────────────────────
EVO_URL    = os.getenv("EVOLUTION_API_URL", "http://localhost:8080")
EVO_KEY    = os.getenv("EVOLUTION_API_KEY", "epimentel-secret")
EVO_INST   = os.getenv("EVOLUTION_INSTANCE", "epimentel")

# Armazenamento local de conversas (histórico)
CONV_DIR = Path("/app/conversas_whatsapp")
CONV_DIR.mkdir(parents=True, exist_ok=True)

# ── Utilitários ───────────────────────────────────────────────────────────────

def headers_evo():
    return {"apikey": EVO_KEY, "Content-Type": "application/json"}

def limpar_tel(tel: str) -> str:
    n = "".join(c for c in (tel or "") if c.isdigit())
    if not n.startswith("55"):
        n = "55" + n
    return n

def jid(tel: str) -> str:
    """Converte número para formato JID do WhatsApp."""
    return limpar_tel(tel) + "@s.whatsapp.net"

def salvar_msg(telefone: str, msg: dict):
    arq = CONV_DIR / f"{limpar_tel(telefone)}.json"
    hist = []
    if arq.exists():
        try: hist = json.loads(arq.read_text())
        except: hist = []
    hist.append({**msg, "timestamp": datetime.now().isoformat()})
    arq.write_text(json.dumps(hist, ensure_ascii=False, indent=2))

def ler_hist(telefone: str) -> list:
    arq = CONV_DIR / f"{limpar_tel(telefone)}.json"
    if not arq.exists(): return []
    try: return json.loads(arq.read_text())
    except: return []

def listar_conversas() -> list:
    convs = []
    for arq in sorted(CONV_DIR.glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True):
        try:
            msgs = json.loads(arq.read_text())
            if not msgs: continue
            ultima = msgs[-1]
            nao_lidas = sum(1 for m in msgs if m.get("direcao") == "recebida" and not m.get("lida"))
            convs.append({
                "telefone": arq.stem,
                "cliente_nome": ultima.get("cliente_nome", ""),
                "ultima_mensagem": str(ultima.get("mensagem", ultima.get("tipo", "")))[:60],
                "ultima_data": ultima.get("timestamp", ""),
                "nao_lidas": nao_lidas,
                "total": len(msgs),
            })
        except: pass
    return convs

# ── Schemas ───────────────────────────────────────────────────────────────────

class EnviarTexto(BaseModel):
    telefone: str
    mensagem: str
    cliente_nome: Optional[str] = None
    cliente_id: Optional[str] = None

class EnviarLink(BaseModel):
    telefone: str
    mensagem: str
    url: str
    cliente_nome: Optional[str] = None

class EnviarPDFBase64(BaseModel):
    telefone: str
    base64_arquivo: str
    nome_arquivo: str
    legenda: Optional[str] = ""
    mime: Optional[str] = "application/pdf"
    cliente_nome: Optional[str] = None
    cliente_id: Optional[str] = None

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/status")
async def status():
    """Verifica conexão com a Evolution API e estado da instância."""
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{EVO_URL}/instance/connectionState/{EVO_INST}", headers=headers_evo())
            d = r.json()
        estado = d.get("instance", {}).get("state", d.get("state", "unknown"))
        conectado = estado in ("open", "connected")
        return {
            "status": "ok" if conectado else "desconectado",
            "estado": estado,
            "instancia": EVO_INST,
            "evo_url": EVO_URL,
        }
    except Exception as e:
        return {"status": "erro", "mensagem": str(e), "instancia": EVO_INST}


@router.get("/qrcode")
async def qrcode():
    """Retorna QR Code para autenticar a instância."""
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(f"{EVO_URL}/instance/connect/{EVO_INST}", headers=headers_evo())
            d = r.json()
        qr = d.get("code", d.get("base64", d.get("qrcode", "")))
        return {"status": "ok", "qrcode": qr, "dados": d}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/instancia/criar")
async def criar_instancia():
    """Cria a instância na Evolution API se não existir."""
    payload = {
        "instanceName": EVO_INST,
        "token": EVO_KEY,
        "qrcode": True,
        "integration": "WHATSAPP-BAILEYS",
    }
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(f"{EVO_URL}/instance/create", headers=headers_evo(), json=payload)
            return r.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/enviar-texto")
async def enviar_texto(req: EnviarTexto):
    """Envia mensagem de texto."""
    numero = limpar_tel(req.telefone)
    payload = {
        "number": numero,
        "options": {"delay": 500, "presence": "composing"},
        "textMessage": {"text": req.mensagem}
    }
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(f"{EVO_URL}/message/sendText/{EVO_INST}", headers=headers_evo(), json=payload)
        d = r.json()
    if r.status_code not in (200, 201):
        raise HTTPException(status_code=r.status_code, detail=str(d))
    salvar_msg(numero, {"id": d.get("key", {}).get("id",""), "tipo":"texto", "mensagem":req.mensagem, "direcao":"enviada", "status":"enviada", "cliente_nome":req.cliente_nome or "", "cliente_id":req.cliente_id or ""})
    return {"status": "ok", "dados": d}


@router.post("/enviar-link")
async def enviar_link(req: EnviarLink):
    """Envia link com preview automático."""
    texto_completo = f"{req.mensagem}\n\n{req.url}" if req.mensagem else req.url
    return await enviar_texto(EnviarTexto(telefone=req.telefone, mensagem=texto_completo, cliente_nome=req.cliente_nome))


@router.post("/enviar-documento")
async def enviar_documento(
    telefone: str = Form(...),
    legenda: str = Form(""),
    cliente_nome: str = Form(""),
    cliente_id: str = Form(""),
    arquivo: UploadFile = File(...),
):
    """Envia documento (PDF, DOCX, XLSX) ou imagem."""
    conteudo = await arquivo.read()
    mime = arquivo.content_type or "application/pdf"
    nome = arquivo.filename or "documento.pdf"
    b64 = base64.b64encode(conteudo).decode()
    numero = limpar_tel(telefone)

    # Evolution API: enviar mídia via base64
    eh_imagem = mime.startswith("image/")
    tipo = "image" if eh_imagem else "document"

    payload = {
        "number": numero,
        "options": {"delay": 500},
        "mediaMessage": {
            "mediatype": tipo,
            "media": b64,
            "mimetype": mime,
            "caption": legenda,
            **({"fileName": nome} if not eh_imagem else {}),
        }
    }

    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(f"{EVO_URL}/message/sendMedia/{EVO_INST}", headers=headers_evo(), json=payload)
        d = r.json()

    if r.status_code not in (200, 201):
        raise HTTPException(status_code=r.status_code, detail=str(d))

    salvar_msg(numero, {
        "id": d.get("key", {}).get("id", ""),
        "tipo": tipo,
        "mensagem": legenda or f"[{nome}]",
        "nome_arquivo": nome,
        "mime": mime,
        "tamanho": len(conteudo),
        "direcao": "enviada",
        "status": "enviada",
        "cliente_nome": cliente_nome,
        "cliente_id": cliente_id,
    })
    return {"status": "ok", "dados": d, "arquivo": nome}


@router.post("/enviar-pdf-base64")
async def enviar_pdf_base64(req: EnviarPDFBase64):
    """Envia PDF já convertido em base64 (útil para documentos gerados internamente)."""
    numero = limpar_tel(req.telefone)
    eh_imagem = req.mime.startswith("image/")
    tipo = "image" if eh_imagem else "document"

    payload = {
        "number": numero,
        "options": {"delay": 500},
        "mediaMessage": {
            "mediatype": tipo,
            "media": req.base64_arquivo,
            "mimetype": req.mime,
            "caption": req.legenda or "",
            **({"fileName": req.nome_arquivo} if not eh_imagem else {}),
        }
    }

    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(f"{EVO_URL}/message/sendMedia/{EVO_INST}", headers=headers_evo(), json=payload)
        d = r.json()

    if r.status_code not in (200, 201):
        raise HTTPException(status_code=r.status_code, detail=str(d))

    salvar_msg(numero, {
        "id": d.get("key", {}).get("id", ""),
        "tipo": tipo,
        "mensagem": req.legenda or f"[{req.nome_arquivo}]",
        "nome_arquivo": req.nome_arquivo,
        "direcao": "enviada",
        "status": "enviada",
        "cliente_nome": req.cliente_nome or "",
        "cliente_id": req.cliente_id or "",
    })
    return {"status": "ok", "dados": d}


@router.post("/marcar-lida/{telefone}")
async def marcar_lida(telefone: str, message_id: str):
    """Marca mensagens como lidas no histórico local."""
    numero = limpar_tel(telefone)
    arq = CONV_DIR / f"{numero}.json"
    if arq.exists():
        try:
            msgs = json.loads(arq.read_text())
            msgs = [{**m, "lida": True} if m.get("id") == message_id else m for m in msgs]
            arq.write_text(json.dumps(msgs, ensure_ascii=False, indent=2))
        except: pass
    return {"status": "ok"}


@router.post("/marcar-todas-lidas/{telefone}")
async def marcar_todas_lidas(telefone: str):
    numero = limpar_tel(telefone)
    arq = CONV_DIR / f"{numero}.json"
    if arq.exists():
        try:
            msgs = json.loads(arq.read_text())
            msgs = [{**m, "lida": True} if m.get("direcao") == "recebida" else m for m in msgs]
            arq.write_text(json.dumps(msgs, ensure_ascii=False, indent=2))
        except: pass
    return {"status": "ok"}


@router.get("/conversas")
async def get_conversas():
    return {"conversas": listar_conversas()}


@router.get("/historico/{telefone}")
async def get_historico(telefone: str, limite: int = 100):
    numero = limpar_tel(telefone)
    hist = ler_hist(numero)
    return {"telefone": numero, "mensagens": hist[-limite:], "total": len(hist)}


@router.delete("/conversa/{telefone}")
async def excluir_conversa(telefone: str):
    arq = CONV_DIR / f"{limpar_tel(telefone)}.json"
    if arq.exists(): arq.unlink()
    return {"status": "ok"}


# ── Webhook — recebe mensagens da Evolution API ───────────────────────────────

@router.post("/webhook")
async def webhook_evolution(request: Request, background: BackgroundTasks):
    """
    Recebe eventos da Evolution API:
    - messages.upsert → nova mensagem recebida
    - messages.update → status atualizado (entregue, lido)
    - connection.update → mudança de estado da conexão
    """
    try:
        body = await request.json()
        evento = body.get("event", "")
        dados = body.get("data", {})

        if evento == "messages.upsert":
            msgs = dados if isinstance(dados, list) else [dados]
            for msg in msgs:
                key = msg.get("key", {})
                from_me = key.get("fromMe", False)
                if from_me:
                    continue  # mensagem enviada por nós, já registramos

                remote = key.get("remoteJid", "").replace("@s.whatsapp.net", "").replace("@g.us", "")
                msg_id = key.get("id", "")
                tipo = msg.get("messageType", "conversation")
                push_name = msg.get("pushName", "")

                # Extrair conteúdo
                conteudo = ""
                msg_content = msg.get("message", {})
                if "conversation" in msg_content:
                    conteudo = msg_content["conversation"]
                elif "extendedTextMessage" in msg_content:
                    conteudo = msg_content["extendedTextMessage"].get("text", "")
                elif "imageMessage" in msg_content:
                    conteudo = f"[IMAGEM] {msg_content['imageMessage'].get('caption', '')}"
                elif "documentMessage" in msg_content:
                    doc = msg_content["documentMessage"]
                    conteudo = f"[DOCUMENTO] {doc.get('fileName', '')} — {doc.get('caption', '')}"
                elif "audioMessage" in msg_content:
                    conteudo = "[ÁUDIO]"
                elif "videoMessage" in msg_content:
                    conteudo = f"[VÍDEO] {msg_content['videoMessage'].get('caption', '')}"
                elif "stickerMessage" in msg_content:
                    conteudo = "[STICKER]"
                elif "locationMessage" in msg_content:
                    loc = msg_content["locationMessage"]
                    conteudo = f"[LOCALIZAÇÃO] {loc.get('name', '')} — {loc.get('address', '')}"

                background.add_task(salvar_msg, remote, {
                    "id": msg_id,
                    "tipo": tipo,
                    "mensagem": conteudo,
                    "direcao": "recebida",
                    "status": "recebida",
                    "lida": False,
                    "cliente_nome": push_name,
                })

                # ── Acionar bot de autoatendimento (somente mensagens de texto) ──
                if conteudo and not conteudo.startswith("[") and remote and not "@g.us" in key.get("remoteJid",""):
                    async def _bot(tel=remote, txt=conteudo):
                        try:
                            from routers.whatsapp_bot import processar_mensagem
                            from database import get_db as _gdb
                            async for db in _gdb():
                                await processar_mensagem(tel, txt, db)
                                break
                        except Exception:
                            pass
                    background.add_task(_bot)

        elif evento == "messages.update":
            updates = dados if isinstance(dados, list) else [dados]
            for upd in updates:
                key = upd.get("key", {})
                remote = key.get("remoteJid", "").replace("@s.whatsapp.net", "").replace("@g.us", "")
                msg_id = key.get("id", "")
                novo_status = upd.get("update", {}).get("status", "")
                status_map = {1:"enviada", 2:"entregue", 3:"lida", 4:"reproduzida"}
                status_str = status_map.get(novo_status, str(novo_status))
                if remote and msg_id:
                    arq = CONV_DIR / f"{limpar_tel(remote)}.json"
                    if arq.exists():
                        try:
                            msgs = json.loads(arq.read_text())
                            msgs = [{**m, "status": status_str} if m.get("id") == msg_id else m for m in msgs]
                            arq.write_text(json.dumps(msgs, ensure_ascii=False, indent=2))
                        except: pass

    except Exception as e:
        print(f"Erro webhook Evolution: {e}")

    return {"status": "ok"}
