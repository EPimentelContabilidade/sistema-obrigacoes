from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json, os
import httpx

router = APIRouter(prefix="/admin", tags=["Admin"])

LOGS_FILE   = "admin_logs.json"
CONFIG_FILE = "admin_config.json"


def ler_logs():
    if os.path.exists(LOGS_FILE):
        with open(LOGS_FILE) as f:
            return json.load(f)
    return []


def salvar_log(nivel, mensagem):
    logs = ler_logs()
    logs.append({"hora": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "nivel": nivel, "mensagem": mensagem})
    logs = logs[-500:]
    with open(LOGS_FILE, "w") as f:
        json.dump(logs, f)


@router.get("/logs")
async def listar_logs():
    return ler_logs()


@router.delete("/logs")
async def limpar_logs():
    if os.path.exists(LOGS_FILE):
        os.remove(LOGS_FILE)
    return {"mensagem": "Logs limpos"}


@router.get("/config")
async def obter_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return {
        "nome_escritorio": "EPimentel Auditoria & Contabilidade Ltda",
        "crc": "CRC/GO 026.994/O-8",
        "email": "",
        "telefone": "",
        "cnpj": "",
    }


class ConfigUpdate(BaseModel):
    nome_escritorio: Optional[str] = None
    crc: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    cnpj: Optional[str] = None


@router.post("/config")
async def salvar_config(data: ConfigUpdate):
    with open(CONFIG_FILE, "w") as f:
        json.dump(data.model_dump(), f)
    salvar_log("info", "Configuracoes do sistema atualizadas")
    return {"mensagem": "Configuracoes salvas"}


class ConviteAcesso(BaseModel):
    email: str
    nome: str
    usuario: str
    senha: str
    sistema_url: str


@router.post("/enviar-convite")
async def enviar_convite(data: ConviteAcesso):
    resend_key = os.getenv("RESEND_API_KEY", "")
    email_from = os.getenv("EMAIL_FROM_NAME", "EPimentel Sistema")

    if not resend_key:
        raise HTTPException(status_code=503, detail="RESEND_API_KEY nao configurada.")

    html = (
        "<!DOCTYPE html><html><head><meta charset='UTF-8'></head>"
        "<body style='font-family:Arial,sans-serif;background:#f4f6f9;padding:30px'>"
        "<div style='max-width:520px;margin:0 auto;background:#fff;border-radius:14px'>"
        "<div style='background:#1B2A4A;padding:28px 32px;text-align:center'>"
        "<div style='font-size:28px;font-weight:900;color:#fff'>"
        "<span style='color:#C5A55A'>E</span>Pimentel</div>"
        "<div style='color:rgba(255,255,255,.7);font-size:13px'>Auditoria &amp; Contabilidade</div></div>"
        "<div style='padding:32px'>"
        "<h2 style='color:#1B2A4A;font-size:18px'>Bem-vindo ao Sistema EPimentel!</h2>"
        "<p style='color:#555;font-size:14px;line-height:1.6'>"
        "Ola, <strong>" + data.nome + "</strong>!<br>Seu acesso foi criado.</p>"
        "<div style='background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin:20px 0'>"
        "<div style='margin-bottom:12px'>"
        "<div style='font-size:11px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:4px'>Usuario</div>"
        "<div style='font-size:16px;font-weight:700;color:#1B2A4A;background:#fff;padding:8px 12px;border-radius:7px;border:1px solid #e2e8f0;font-family:monospace'>"
        + data.usuario + "</div></div>"
        "<div><div style='font-size:11px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:4px'>Senha</div>"
        "<div style='font-size:16px;font-weight:700;color:#1B2A4A;background:#fff;padding:8px 12px;border-radius:7px;border:1px solid #e2e8f0;font-family:monospace'>"
        + data.senha + "</div></div></div>"
        "<div style='text-align:center;margin:24px 0'>"
        "<a href='" + data.sistema_url + "' style='display:inline-block;background:#C5A55A;color:#1B2A4A;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none'>Acessar o Sistema</a>"
        "</div></div>"
        "<div style='background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0'>"
        "<div style='font-size:12px;color:#aaa'>EPimentel Auditoria &amp; Contabilidade Ltda · CRC/GO 026.994/O-8 · Goiania - GO</div>"
        "</div></div></body></html>"
    )

    payload = {
        "from": email_from + " <onboarding@resend.dev>",
        "to": [data.email],
        "subject": "Seu acesso ao Sistema EPimentel - " + data.usuario,
        "html": html,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": "Bearer " + resend_key,
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            d = r.json()
        if r.status_code not in (200, 201):
            raise HTTPException(status_code=r.status_code, detail="Resend erro: " + str(d))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro ao enviar e-mail: " + str(e))

    salvar_log("info", "Convite enviado para " + data.email + " (usuario: " + data.usuario + ")")
    return {"mensagem": "Convite enviado com sucesso para " + data.email}
