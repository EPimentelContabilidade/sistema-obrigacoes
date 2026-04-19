"""
Router: comunicados.py
Módulo de Comunicados Avulsos integrado a Clientes, Processos e Departamentos.

Features:
  - CRUD de comunicados com urgência (baixa/normal/alta/muito_urgente)
  - Envio por e-mail (domínio próprio) e/ou WhatsApp
  - IA Claude para analisar comunicados >30 dias sem resposta
  - Alerta automático ao responsável pelo departamento
  - Assinatura de e-mail personalizada por usuário
"""

import os, re, json, base64
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from database import get_db
import httpx, aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

router = APIRouter(prefix="/comunicados", tags=["comunicados"])

# ── Env vars ──────────────────────────────────────────────────────────────────
# Gmail padrão
GMAIL_USER  = os.getenv("GMAIL_USER", "")
GMAIL_PASS  = os.getenv("GMAIL_APP_PASSWORD", "")
# SMTP domínio próprio (opcional)
SMTP_HOST   = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT   = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER   = os.getenv("SMTP_USER", "")        # ex: contato@epimentel.com.br
SMTP_PASS   = os.getenv("SMTP_PASS", "")
SMTP_FROM   = os.getenv("SMTP_FROM_NAME", "EPimentel Auditoria & Contabilidade")
# Z-API (WhatsApp)
ZAPI_INST   = os.getenv("ZAPI_INSTANCE_ID", "3F1E5BA013CA029438426E59E5E6857E")
ZAPI_TOKEN  = os.getenv("ZAPI_TOKEN",       "461022EFD597101868B011B32")
# Claude API
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
NAVY = "#1B2A4A"; GOLD = "#C5A55A"
URGENCIAS = {
    "baixa":         {"label":"Baixa",        "cor":"#1A7A3C","bg":"#EDFBF1","emoji":"🟢"},
    "normal":        {"label":"Normal",       "cor":"#1D6FA4","bg":"#EBF5FF","emoji":"🔵"},
    "alta":          {"label":"Alta",         "cor":"#854D0E","bg":"#FEF9C3","emoji":"🟡"},
    "muito_urgente": {"label":"Muito Urgente","cor":"#dc2626","bg":"#FEF2F2","emoji":"🔴"},
}
DEPARTAMENTOS = ["Fiscal","Contábil","Pessoal","Financeiro","Jurídico","Diretoria","Geral"]

ASSINATURA_PADRAO = """
<br><br>
<div style="border-top:2px solid {GOLD};padding-top:12px;margin-top:12px;font-family:Arial,sans-serif;font-size:13px;">
  <strong style="color:{NAVY};">Carlos Eduardo de Araújo Marques Pimentel</strong><br>
  <span style="color:#555;">CRC/GO 026.994/O-8</span><br>
  <span style="color:#555;">EPimentel Auditoria &amp; Contabilidade Ltda</span><br>
  <span style="color:#555;">Goiânia — GO | contato@epimentel.com.br</span><br>
  <a href="https://adventurous-generosity-production-f892.up.railway.app" style="color:{GOLD};font-size:11px;">🔗 Sistema EPimentel</a>
</div>
""".replace("{NAVY}", NAVY).replace("{GOLD}", GOLD)

# ── Schemas ───────────────────────────────────────────────────────────────────

class ComunicadoCreate(BaseModel):
    titulo:       str
    conteudo:     str
    urgencia:     str = "normal"
    departamento: str = "Geral"
    responsavel:  str = ""
    canal:        str = "email"
    cliente_ids:  List[int] = []
    processo_ids: List[int] = []
    emails_extra: List[str] = []
    usa_dominio_proprio: bool = False
    assinatura_personalizada: str = ""

class ComunicadoResposta(BaseModel):
    comunicado_id: int
    resposta: str
    respondente: str = "Eduardo Pimentel"
# ── Banco ────────────────────────────────────────────────────────────────────

async def init_tables(db: AsyncSession):
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS comunicados (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo        TEXT NOT NULL,
            conteudo      TEXT,
            urgencia      TEXT DEFAULT 'normal',
            departamento  TEXT DEFAULT 'Geral',
            responsavel   TEXT,
            canal         TEXT DEFAULT 'email',
            status        TEXT DEFAULT 'pendente',
            cliente_ids   TEXT DEFAULT '[]',
            processo_ids  TEXT DEFAULT '[]',
            emails_extra  TEXT DEFAULT '[]',
            respostas     TEXT DEFAULT '[]',
            alerta_ia     TEXT,
            criado_em     TEXT DEFAULT (datetime('now','localtime')),
            atualizado_em TEXT DEFAULT (datetime('now','localtime')),
            encerrado_em  TEXT
        )
    """))
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS smtp_config (
            id    INTEGER PRIMARY KEY DEFAULT 1,
            host  TEXT, port INTEGER DEFAULT 587,
            user  TEXT, pass TEXT,
            from_name TEXT, from_email TEXT,
            assinatura_html TEXT,
            atualizado_em TEXT DEFAULT (datetime('now','localtime'))
        )
    """))
    await db.commit()

async def get_smtp_config(db: AsyncSession) -> dict:
    """Retorna configuração SMTP customizada ou padrão Gmail."""
    try:
        r = await db.execute(text("SELECT * FROM smtp_config WHERE id=1"))
        row = r.mappings().fetchone()
        if row and row["user"] and row["pass"]:
            return dict(row)
    except Exception:
        pass
    return {"host": SMTP_HOST, "port": SMTP_PORT, "user": SMTP_USER or GMAIL_USER,
            "pass": SMTP_PASS or GMAIL_PASS, "from_name": SMTP_FROM,
            "from_email": SMTP_USER or GMAIL_USER,
            "assinatura_html": ASSINATURA_PADRAO}
# ── Template HTML ────────────────────────────────────────────────────────────

def gerar_html_comunicado(titulo, conteudo, urgencia, departamento, responsavel, assinatura, destinatario_nome=""):
    urg = URGENCIAS.get(urgencia, URGENCIAS["normal"])
    saudacao = f"Prezado(a) <strong>{destinatario_nome}</strong>," if destinatario_nome else "Prezado(a),"
    conteudo_html = conteudo.replace("\n", "<br>")
    assinatura_final = assinatura or ASSINATURA_PADRAO
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f2f7;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:linear-gradient(135deg,{NAVY},{NAVY}cc);border-radius:14px 14px 0 0;padding:24px 32px;">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:48px;height:48px;background:{GOLD};border-radius:10px;display:flex;align-items:center;justify-content:center;">
        <span style="color:{NAVY};font-size:18px;font-weight:900;">EP</span>
      </div>
      <div>
        <div style="color:#fff;font-weight:800;font-size:15px;">EPimentel Auditoria & Contabilidade</div>
        <div style="color:{GOLD};font-size:11px;letter-spacing:.5px;text-transform:uppercase;">{departamento}</div>
      </div>
      <span style="margin-left:auto;background:{urg['bg']};color:{urg['cor']};padding:4px 12px;border-radius:12px;font-size:11px;font-weight:800;">
        {urg['emoji']} {urg['label']}
      </span>
    </div>
  </div>
  <div style="background:#fff;padding:28px 32px;">
    <h2 style="color:{NAVY};margin:0 0 16px;">{titulo}</h2>
    <p style="color:#555;margin:0 0 16px;font-size:13px;">{saudacao}</p>
    <div style="color:#333;font-size:14px;line-height:1.7;">{conteudo_html}</div>
    {assinatura_final}
  </div>
  <div style="background:{NAVY};border-radius:0 0 14px 14px;padding:14px 32px;text-align:center;">
    <span style="color:rgba(255,255,255,.5);font-size:10px;">EPimentel Auditoria & Contabilidade · Goiânia/GO · CRC/GO 026.994/O-8</span>
  </div>
</div>
</body></html>"""
# ── Envio ────────────────────────────────────────────────────────────────────

async def enviar_email_comunicado(para, nome, assunto, html, smtp_cfg):
    user = smtp_cfg.get("user") or GMAIL_USER
    pw   = smtp_cfg.get("pass") or GMAIL_PASS
    host = smtp_cfg.get("host", "smtp.gmail.com")
    port = int(smtp_cfg.get("port", 587))
    from_email = smtp_cfg.get("from_email") or user
    from_name  = smtp_cfg.get("from_name") or "EPimentel"
    if not user or not pw or not para:
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = assunto
        msg["From"]    = f"{from_name} <{from_email}>"
        msg["To"]      = f"{nome} <{para}>" if nome else para
        msg.attach(MIMEText(html, "html", "utf-8"))
        async with aiosmtplib.SMTP(hostname=host, port=port, use_tls=False) as smtp:
            await smtp.starttls()
            await smtp.login(user, pw)
            await smtp.send_message(msg)
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False

async def enviar_wa(telefone: str, texto: str) -> bool:
    """Envia mensagem WhatsApp via Z-API."""
    if not ZAPI_INST or not telefone: return False
    n = re.sub(r"\D", "", telefone)
    num = ("55" + n) if not n.startswith("55") else n
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(
                f"https://api.z-api.io/instances/{ZAPI_INST}/token/{ZAPI_TOKEN}/send-text",
                headers={"Content-Type": "application/json"},
                json={"phone": num, "message": texto})
            return r.status_code < 300
    except Exception:
        return False
# ── IA Claude para comunicados atrasados ─────────────────────────────────────

async def analisar_comunicado_ia(titulo, conteudo, dias, departamento, responsavel):
    """Usa Claude para gerar alerta para comunicados atrasados."""
    if not ANTHROPIC_KEY:
        return (f"⚠️ ALERTA AUTOMÁTICO: O comunicado '{titulo}' está há {dias} dias "
                f"sem resposta no departamento {departamento}. "
                f"Responsável: {responsavel or 'não definido'}. "
                "Por favor, verifique e dê uma resposta ao cliente.")
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post("https://api.anthropic.com/v1/messages",
                headers={"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01",
                         "Content-Type": "application/json"},
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 400,
                    "messages": [{"role": "user", "content": (
                        f"Você é um assistente de escritório contábil brasileiro.\n"
                        f"Um comunicado está há {dias} dias sem resposta:\n\n"
                        f"Título: {titulo}\nDepartamento: {departamento}\n"
                        f"Responsável: {responsavel or 'não definido'}\n"
                        f"Conteúdo: {conteudo[:300]}...\n\n"
                        "Gere um alerta profissional e urgente (máximo 4 linhas) "
                        "sugerindo ação imediata. Use emojis. Seja direto."
                    )}]
                })
            data = r.json()
            return data.get("content", [{}])[0].get("text", "")
    except Exception:
        return (f"⚠️ ALERTA {dias}d: Comunicado '{titulo}' aguarda resposta. "
                f"Departamento: {departamento}. Ação necessária imediata.")
# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/criar")
async def criar_comunicado(payload: ComunicadoCreate, background: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    await init_tables(db)
    smtp_cfg = await get_smtp_config(db)
    r = await db.execute(text("""
        INSERT INTO comunicados (titulo, conteudo, urgencia, departamento, responsavel,
            canal, cliente_ids, processo_ids, emails_extra)
        VALUES (:titulo,:conteudo,:urgencia,:dept,:resp,:canal,:cids,:pids,:emails)
    """), {
        "titulo": payload.titulo, "conteudo": payload.conteudo,
        "urgencia": payload.urgencia, "dept": payload.departamento,
        "resp": payload.responsavel, "canal": payload.canal,
        "cids": json.dumps(payload.cliente_ids), "pids": json.dumps(payload.processo_ids),
        "emails": json.dumps(payload.emails_extra),
    })
    await db.commit()
    r2 = await db.execute(text("SELECT last_insert_rowid() as id"))
    com_id = r2.fetchone()[0]

    async def _enviar():
        from models import Cliente
        enviados = []
        urg = URGENCIAS.get(payload.urgencia, URGENCIAS["normal"])
        assunto = f"{urg['emoji']} [{urg['label']}] {payload.titulo} — EPimentel"
        destinatarios = []
        if payload.cliente_ids:
            try:
                for cid in payload.cliente_ids:
                    rc = await db.execute(select(Cliente).where(Cliente.id == cid))
                    cli = rc.scalar_one_or_none()
                    if cli:
                        email = cli.email or getattr(cli, "email2", "")
                        tel   = cli.whatsapp or getattr(cli, "telefone", "")
                        destinatarios.append({"email": email, "nome": cli.nome, "tel": tel})
            except Exception: pass
        for em in payload.emails_extra:
            destinatarios.append({"email": em, "nome": "", "tel": ""})
        assinatura = payload.assinatura_personalizada or smtp_cfg.get("assinatura_html") or ASSINATURA_PADRAO
        for dest in destinatarios:
            if payload.canal in ("email","ambos") and dest["email"]:
                html = gerar_html_comunicado(payload.titulo, payload.conteudo,
                    payload.urgencia, payload.departamento, payload.responsavel, assinatura, dest["nome"])
                ok = await enviar_email_comunicado(dest["email"], dest["nome"], assunto, html, smtp_cfg)
                enviados.append({"tipo":"email","dest":dest["email"],"ok":ok})
            if payload.canal in ("whatsapp","ambos") and dest["tel"]:
                txt = (f"{urg['emoji']} *{payload.titulo}*\n_{urg['label']}_ | {payload.departamento}\n\n"
                       f"{payload.conteudo[:500]}\n\n_EPimentel Auditoria & Contabilidade_")
                ok = await enviar_wa(dest["tel"], txt)
                enviados.append({"tipo":"whatsapp","dest":dest["tel"],"ok":ok})
        await db.execute(text("UPDATE comunicados SET status='enviado' WHERE id=:id"), {"id": com_id})
        await db.commit()

    background.add_task(_enviar)
    return {"ok": True, "id": com_id, "mensagem": "Comunicado criado e envio iniciado"}

@router.get("/listar")
async def listar(urgencia: str = None, departamento: str = None, status: str = None, db: AsyncSession = Depends(get_db)):
    await init_tables(db)
    q = "SELECT * FROM comunicados WHERE 1=1"
    params = {}
    if urgencia:    q += " AND urgencia=:urg";   params["urg"] = urgencia
    if departamento:q += " AND departamento=:dept"; params["dept"] = departamento
    if status:      q += " AND status=:sts";     params["sts"] = status
    q += " ORDER BY CASE urgencia WHEN 'muito_urgente' THEN 0 WHEN 'alta' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, criado_em DESC"
    r = await db.execute(text(q), params)
    rows = [dict(row) for row in r.mappings().fetchall()]
    agora = datetime.now()
    for row in rows:
        try:
            criado = datetime.fromisoformat(row["criado_em"])
            row["dias_aberto"] = (agora - criado).days
            row["atrasado"] = row["dias_aberto"] > 30 and row["status"] != "encerrado"
        except Exception:
            row["dias_aberto"] = 0; row["atrasado"] = False
    return rows


@router.post("/responder/{comunicado_id}")
async def responder(comunicado_id: int, payload: ComunicadoResposta, db: AsyncSession = Depends(get_db)):
    r = await db.execute(text("SELECT * FROM comunicados WHERE id=:id"), {"id": comunicado_id})
    com = r.mappings().fetchone()
    if not com: raise HTTPException(404, "Comunicado não encontrado")
    respostas = json.loads(com["respostas"] or "[]")
    respostas.append({"texto": payload.resposta, "respondente": payload.respondente, "data": datetime.now().isoformat()})
    await db.execute(text("UPDATE comunicados SET respostas=:resp, status='respondido', atualizado_em=datetime('now','localtime') WHERE id=:id"),
        {"resp": json.dumps(respostas, ensure_ascii=False), "id": comunicado_id})
    await db.commit()
    return {"ok": True}


@router.post("/encerrar/{comunicado_id}")
async def encerrar(comunicado_id: int, db: AsyncSession = Depends(get_db)):
    await db.execute(text("UPDATE comunicados SET status='encerrado', encerrado_em=datetime('now','localtime') WHERE id=:id"), {"id": comunicado_id})
    await db.commit()
    return {"ok": True}


@router.post("/verificar-atrasados")
async def verificar_atrasados(background: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Verifica comunicados >30 dias sem resposta e aciona IA Claude."""
    await init_tables(db)
    r = await db.execute(text("""
        SELECT * FROM comunicados WHERE status NOT IN ('encerrado','respondido')
        AND datetime(criado_em) < datetime('now','-30 days','localtime')
        AND (alerta_ia IS NULL OR alerta_ia = '')
    """))
    atrasados = [dict(row) for row in r.mappings().fetchall()]
    async def _processar():
        for com in atrasados:
            dias = (datetime.now() - datetime.fromisoformat(com["criado_em"])).days
            alerta = await analisar_comunicado_ia(com["titulo"], com["conteudo"] or "", dias, com["departamento"], com["responsavel"] or "")
            await db.execute(text("UPDATE comunicados SET alerta_ia=:alerta, atualizado_em=datetime('now','localtime') WHERE id=:id"), {"alerta": alerta, "id": com["id"]})
            if com.get("responsavel"):
                try:
                    from models import Usuario
                    ru = await db.execute(select(Usuario).where(Usuario.nome.ilike(f"%{com['responsavel']}%")))
                    u = ru.scalar_one_or_none()
                    if u and getattr(u, "telefone", None):
                        await enviar_wa(u.telefone, f"🚨 *ALERTA SISTEMA EPimentel*\n\n{alerta}")
                except Exception: pass
        await db.commit()
    background.add_task(_processar)
    return {"ok": True, "comunicados_atrasados": len(atrasados)}


@router.get("/config-smtp")
async def get_smtp(db: AsyncSession = Depends(get_db)):
    await init_tables(db)
    cfg = await get_smtp_config(db)
    cfg.pop("pass", None)
    return cfg


@router.post("/config-smtp")
async def salvar_smtp(config: dict, db: AsyncSession = Depends(get_db)):
    """Salva configuração de SMTP personalizado."""
    await init_tables(db)
    await db.execute(text("""
        INSERT INTO smtp_config (id,host,port,user,pass,from_name,from_email,assinatura_html)
        VALUES (1,:host,:port,:user,:pass,:fn,:fe,:assin)
        ON CONFLICT(id) DO UPDATE SET
            host=:host,port=:port,user=:user,pass=:pass,
            from_name=:fn,from_email=:fe,assinatura_html=:assin,
            atualizado_em=datetime('now','localtime')
    """), {"host": config.get("host","smtp.gmail.com"), "port": config.get("port",587),
           "user": config.get("user",""), "pass": config.get("pass",""),
           "fn": config.get("from_name","EPimentel"), "fe": config.get("from_email",""),
           "assin": config.get("assinatura_html", ASSINATURA_PADRAO)})
    await db.commit()
    return {"ok": True}
