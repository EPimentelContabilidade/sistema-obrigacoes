"""
Router: whatsapp_evolution.py
Integração com Z-API (WhatsApp).
Substitui Evolution API — mantém mesmos endpoints para compatibilidade.
"""

import os, json, base64, re
from pathlib import Path
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request, BackgroundTasks
from pydantic import BaseModel
import httpx

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

# ── Z-API config ───────────────────────────────────────────────────────────────
ZAPI_INST  = os.getenv("ZAPI_INSTANCE_ID", "3F1E5BA013CA029438426E59E5E6857E")
ZAPI_TOKEN = os.getenv("ZAPI_TOKEN",       "461022EFD597101868B011B32")
ZAPI_BASE  = f"https://api.z-api.io/instances/{ZAPI_INST}/token/{ZAPI_TOKEN}"

CONV_DIR = Path("/app/conversas_whatsapp")
CONV_DIR.mkdir(parents=True, exist_ok=True)

# ── Utilitários ───────────────────────────────────────────────────────────────

def limpar_tel(tel: str) -> str:
    n = "".join(c for c in (tel or "") if c.isdigit())
    return ("55" + n) if not n.startswith("55") else n

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

# ── Schemas ──────────────────────────────────────────────────────────────────

class EnviarTexto(BaseModel):
    telefone: str
    mensagem: str
    cliente_nome: Optional[str] = None
    cliente_id: Optional[str] = None

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
    """Verifica conexão com Z-API."""
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{ZAPI_BASE}/status",
                headers={"Content-Type": "application/json"})
            d = r.json()
        conectado = d.get("connected", False)
        return {
            "status": "ok" if conectado else "desconectado",
            "estado": "open" if conectado else "closed",
            "instancia": ZAPI_INST,
            "smartphoneConnected": d.get("smartphoneConnected", False),
            "dados": d,
        }
    except Exception as e:
        return {"status": "erro", "mensagem": str(e), "instancia": ZAPI_INST}


@router.get("/qrcode")
async def qrcode():
    """Z-API gerencia conexão via dashboard. Retorna URL do painel."""
    return {
        "status": "ok",
        "mensagem": "Z-API: conecte via painel em app.z-api.io",
        "dashboard_url": "https://app.z-api.io",
        "qrcode": "",
    }


@router.post("/enviar-texto")
async def enviar_texto(req: EnviarTexto):
    """Envia mensagem de texto via Z-API."""
    numero = limpar_tel(req.telefone)
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(f"{ZAPI_BASE}/send-text",
            headers={"Content-Type": "application/json"},
            json={"phone": numero, "message": req.mensagem})
        d = r.json()
    if r.status_code not in (200, 201):
        raise HTTPException(status_code=r.status_code, detail=str(d))
    salvar_msg(numero, {
        "id": d.get("zaapId", d.get("messageId", "")),
        "tipo": "texto", "mensagem": req.mensagem,
        "direcao": "enviada", "status": "enviada",
        "cliente_nome": req.cliente_nome or "", "cliente_id": req.cliente_id or "",
    })
    return {"status": "ok", "dados": d}


@router.post("/enviar-link")
async def enviar_link(req: EnviarTexto):
    """Envia link como texto simples."""
    return await enviar_texto(req)


@router.post("/enviar-documento")
async def enviar_documento(
    telefone: str = Form(...),
    legenda: str = Form(""),
    cliente_nome: str = Form(""),
    cliente_id: str = Form(""),
    arquivo: UploadFile = File(...),
):
    """Envia documento (PDF, DOCX, XLSX) via Z-API."""
    conteudo = await arquivo.read()
    mime = arquivo.content_type or "application/pdf"
    nome = arquivo.filename or "documento.pdf"
    b64 = base64.b64encode(conteudo).decode()
    numero = limpar_tel(telefone)
    eh_imagem = mime.startswith("image/")
    endpoint = "send-image" if eh_imagem else "send-document/base64"
    payload = {"phone": numero, "caption": legenda}
    if eh_imagem:
        payload["image"] = f"data:{mime};base64,{b64}"
    else:
        payload["document"] = f"data:{mime};base64,{b64}"
        payload["fileName"] = nome
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(f"{ZAPI_BASE}/{endpoint}",
            headers={"Content-Type": "application/json"}, json=payload)
        d = r.json()
    if r.status_code not in (200, 201):
        raise HTTPException(status_code=r.status_code, detail=str(d))
    salvar_msg(numero, {
        "id": d.get("zaapId", ""), "tipo": "documento" if not eh_imagem else "imagem",
        "mensagem": legenda or f"[{nome}]", "nome_arquivo": nome,
        "direcao": "enviada", "status": "enviada",
        "cliente_nome": cliente_nome, "cliente_id": cliente_id,
    })
    return {"status": "ok", "dados": d, "arquivo": nome}


@router.post("/enviar-pdf-base64")
async def enviar_pdf_base64(req: EnviarPDFBase64):
    """Envia PDF em base64 via Z-API."""
    numero = limpar_tel(req.telefone)
    eh_imagem = req.mime.startswith("image/")
    endpoint = "send-image" if eh_imagem else "send-document/base64"
    payload = {"phone": numero, "caption": req.legenda or ""}
    if eh_imagem:
        payload["image"] = f"data:{req.mime};base64,{req.base64_arquivo}"
    else:
        payload["document"] = f"data:{req.mime};base64,{req.base64_arquivo}"
        payload["fileName"] = req.nome_arquivo
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(f"{ZAPI_BASE}/{endpoint}",
            headers={"Content-Type": "application/json"}, json=payload)
        d = r.json()
    if r.status_code not in (200, 201):
        raise HTTPException(status_code=r.status_code, detail=str(d))
    salvar_msg(numero, {
        "id": d.get("zaapId", ""), "tipo": "documento",
        "mensagem": req.legenda or f"[{req.nome_arquivo}]",
        "nome_arquivo": req.nome_arquivo, "direcao": "enviada", "status": "enviada",
        "cliente_nome": req.cliente_nome or "", "cliente_id": req.cliente_id or "",
    })
    return {"status": "ok", "dados": d}


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


@router.post("/webhook")
async def webhook_zapi(request: Request, background: BackgroundTasks):
    """
    Recebe eventos do Z-API webhook.
    Configure em app.z-api.io → Webhooks → URL: https://api.epimentel.com.br/api/v1/whatsapp/webhook
    """
    try:
        body = await request.json()
        tipo = body.get("type", body.get("event", ""))
        phone = body.get("phone", "")
        if not phone: return {"status": "ok"}
        numero = limpar_tel(phone)
        # Mensagem recebida
        if tipo in ("ReceivedCallback", "messages.upsert"):
            texto = (body.get("text", {}).get("message", "")
                     or body.get("message", "")
                     or body.get("body", ""))
            push_name = body.get("senderName", body.get("pushName", ""))
            background.add_task(salvar_msg, numero, {
                "id": body.get("messageId", ""),
                "tipo": "texto", "mensagem": texto,
                "direcao": "recebida", "status": "recebida",
                "lida": False, "cliente_nome": push_name,
            })
            if texto and not texto.startswith("["):
                async def _bot(tel=numero, txt=texto):
                    try:
                        from routers.whatsapp_bot import processar_mensagem
                        from database import get_db as _gdb
                        async for db in _gdb():
                            await processar_mensagem(tel, txt, db); break
                    except Exception: pass
                background.add_task(_bot)
        # Status de entrega
        elif tipo in ("MessageStatusCallback",):
            status_map = {"PENDING":"enviada","SENT":"enviada","RECEIVED":"entregue","READ":"lida"}
            novo_status = status_map.get(body.get("status",""), "enviada")
            msg_id = body.get("messageId","")
            arq = CONV_DIR / f"{numero}.json"
            if arq.exists() and msg_id:
                try:
                    msgs = json.loads(arq.read_text())
                    msgs = [{**m,"status":novo_status} if m.get("id")==msg_id else m for m in msgs]
                    arq.write_text(json.dumps(msgs, ensure_ascii=False, indent=2))
                except: pass
    except Exception as e:
        print(f"Erro webhook Z-API: {e}")
    return {"status": "ok"}
