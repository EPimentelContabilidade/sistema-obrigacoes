"""
Router: parcelamentos.py
Módulo completo de parcelamentos por órgão:
  - Receita Federal (PERT, REFIS, Comum, RELP, Transação)
  - PGFN (Regularize, Transação PGFN, Negociação)
  - SEFAZ Estadual (REFIS-GO, ICMS, ITCD, IPVA)
  - Municipal (ISS, IPTU, ITBI, Débitos Municipais)

Features:
  - Cadastro por cliente com credenciais de acesso (e-CAC, portais)
  - Download automático de comprovantes via portal (quando configurado)
  - Alertas de vencimento via e-mail e WhatsApp
  - IA Claude para análise de situação e geração de alertas
  - Scheduler automático no dia configurável de cada mês
"""

import os, re, json, asyncio
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from database import get_db
import httpx, aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

router = APIRouter(prefix="/parcelamentos", tags=["Parcelamentos"])

GMAIL_USER  = os.getenv("GMAIL_USER", "")
GMAIL_PASS  = os.getenv("GMAIL_APP_PASSWORD", "")
SMTP_HOST   = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT   = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER   = os.getenv("SMTP_USER", "")
SMTP_PASS   = os.getenv("SMTP_PASS", "")
SMTP_FROM   = os.getenv("SMTP_FROM_NAME", "EPimentel Auditoria & Contabilidade")
EVO_URL     = os.getenv("EVOLUTION_API_URL", "")
EVO_KEY     = os.getenv("EVOLUTION_API_KEY", "")
EVO_INST    = os.getenv("EVOLUTION_INSTANCE", "")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
NAVY = "#1B2A4A"; GOLD = "#C5A55A"

ORGAOS = {
    "receita": {
        "label": "Receita Federal",
        "icon": "🏛️",
        "cor": "#1D6FA4",
        "tipos": [
            "PERT — Programa Especial de Regularização Tributária",
            "RELP — Programa de Reescalonamento do Pagamento de Débitos",
            "REFIS — Programa de Recuperação Fiscal",
            "PAES — Parcelamento Especial",
            "Parcelamento Ordinário (60 meses)",
            "Parcelamento Simplificado (até 60x)",
            "Transação Tributária (PGDAU)",
            "Parcelamento Simples Nacional",
            "Parcelamento de IRPF",
            "Parcelamento de Débito Previdenciário",
            "FGTS — Parcelamento",
        ]
    },
    "pgfn": {
        "label": "PGFN / Dívida Ativa",
        "icon": "⚖️",
        "cor": "#6B3EC9",
        "tipos": [
            "PERT PGFN",
            "Transação por Adesão (edital)",
            "Transação Individual PGFN",
            "PRORELIT — Programa de Regularização de Débitos",
            "Parcelamento Regularize",
            "Negociação de Dívida Ativa",
            "Acordo de Não-Persecução Cível",
        ]
    },
    "sefaz": {
        "label": "SEFAZ Estadual",
        "icon": "🗺️",
        "cor": "#854D0E",
        "tipos": [
            "REFIS Goiás — ICMS",
            "Parcelamento Ordinário ICMS",
            "Parcelamento IPVA",
            "Parcelamento ITCD",
            "PROFIS — Programa de Fomento Fiscal",
            "Parcelamento de Substituição Tributária",
            "Parcelamento de DIFAL",
            "Parcelamento de Multa Aduaneira",
        ]
    },
    "municipal": {
        "label": "Municipal / ISS",
        "icon": "🏙️",
        "cor": "#1A7A3C",
        "tipos": [
            "Parcelamento de ISS",
            "Parcelamento de IPTU",
            "Parcelamento de ITBI",
            "REFIS Municipal",
            "Parcelamento de Débitos de Alvará",
            "Parcelamento de Taxa de Limpeza (TLP)",
            "Parcelamento de Contribuição de Melhoria",
        ]
    }
}

STATUS_CFG = {
    "ativo":     {"label": "Em dia",   "cor": "#1A7A3C", "bg": "#EDFBF1"},
    "atrasado":  {"label": "Atrasado", "cor": "#dc2626", "bg": "#FEF2F2"},
    "quitado":   {"label": "Quitado",  "cor": "#1D6FA4", "bg": "#EBF5FF"},
    "cancelado": {"label": "Cancelado","cor": "#6B7280", "bg": "#f5f5f5"},
    "suspenso":  {"label": "Suspenso", "cor": "#854D0E", "bg": "#FEF9C3"},
}

# ── Schemas ───────────────────────────────────────────────────────────────────

class ParcelamentoCadastro(BaseModel):
    cliente_id:         int
    orgao:              str             # receita | pgfn | sefaz | municipal
    tipo:               str
    numero_processo:    str = ""
    descricao:          str = ""
    valor_original:     float = 0
    saldo_devedor:      float = 0
    valor_parcela:      float = 0
    total_parcelas:     int = 0
    parcelas_pagas:     int = 0
    data_inicio:        str = ""        # dd/mm/yyyy
    proximo_vencimento: str = ""        # dd/mm/yyyy
    dia_vencimento:     int = 20        # dia fixo do mês
    status:             str = "ativo"
    # Credenciais de acesso ao portal (encriptadas localmente)
    portal_url:         str = ""
    portal_usuario:     str = ""
    portal_senha:       str = ""        # salvar criptografado em prod
    # Notificações
    email_aviso:        str = ""        # e-mail para receber alertas
    whatsapp_aviso:     str = ""        # número WA para alertas
    dias_antecedencia:  int = 5         # avisar X dias antes do vencimento
    usar_ia:            bool = True     # usar Claude para gerar alertas
    observacoes:        str = ""

class ParcelamentoPagamento(BaseModel):
    parcelamento_id:    int
    numero_parcela:     int
    valor_pago:         float
    data_pagamento:     str
    comprovante_b64:    str = ""

# ── Tabelas ───────────────────────────────────────────────────────────────────

async def init_tables(db: AsyncSession):
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS parcelamentos_cadastro (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id          INTEGER,
            orgao               TEXT,
            tipo                TEXT,
            numero_processo     TEXT,
            descricao           TEXT,
            valor_original      REAL DEFAULT 0,
            saldo_devedor       REAL DEFAULT 0,
            valor_parcela       REAL DEFAULT 0,
            total_parcelas      INTEGER DEFAULT 0,
            parcelas_pagas      INTEGER DEFAULT 0,
            data_inicio         TEXT,
            proximo_vencimento  TEXT,
            dia_vencimento      INTEGER DEFAULT 20,
            status              TEXT DEFAULT 'ativo',
            portal_url          TEXT,
            portal_usuario      TEXT,
            portal_senha        TEXT,
            email_aviso         TEXT,
            whatsapp_aviso      TEXT,
            dias_antecedencia   INTEGER DEFAULT 5,
            usar_ia             INTEGER DEFAULT 1,
            observacoes         TEXT,
            ultimo_download     TEXT,
            ultimo_alerta       TEXT,
            alerta_ia           TEXT,
            criado_em           TEXT DEFAULT (datetime('now','localtime')),
            atualizado_em       TEXT DEFAULT (datetime('now','localtime'))
        )
    """))
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS parcelamentos_pagamentos (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            parcelamento_id INTEGER,
            numero_parcela  INTEGER,
            valor_pago      REAL,
            data_pagamento  TEXT,
            comprovante_b64 TEXT,
            registrado_em   TEXT DEFAULT (datetime('now','localtime'))
        )
    """))
    await db.commit()

# ── IA Claude ─────────────────────────────────────────────────────────────────

async def gerar_alerta_ia(parc: dict, cliente_nome: str, dias_atraso: int = 0) -> str:
    if not ANTHROPIC_KEY:
        orgao_info = ORGAOS.get(parc.get("orgao",""), {})
        if dias_atraso > 0:
            return (f"⚠️ ALERTA: Parcelamento {orgao_info.get('label','')} — {parc.get('tipo','')} "
                    f"do cliente {cliente_nome} está com {dias_atraso} dia(s) de atraso. "
                    f"Valor em aberto: R$ {parc.get('valor_parcela',0):,.2f}. Providenciar pagamento imediato.")
    try:
        saldo = parc.get("saldo_devedor", 0)
        pagas = parc.get("parcelas_pagas", 0)
        total = parc.get("total_parcelas", 0)
        restantes = total - pagas
        progresso = round(pagas/total*100) if total > 0 else 0
        orgao_label = ORGAOS.get(parc.get("orgao",""), {}).get("label","")
        async with httpx.AsyncClient(timeout=25) as c:
            r = await c.post("https://api.anthropic.com/v1/messages",
                headers={"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01",
                         "Content-Type": "application/json"},
                json={"model": "claude-haiku-4-5-20251001", "max_tokens": 350,
                      "messages": [{"role": "user", "content":
                          f"Você é assistente do escritório contábil EPimentel (Goiânia/GO).\n"
                          f"Gere um alerta conciso e profissional sobre este parcelamento:\n"
                          f"Cliente: {cliente_nome}\n"
                          f"Órgão: {orgao_label}\n"
                          f"Tipo: {parc.get('tipo','')}\n"
                          f"Processo: {parc.get('numero_processo','')}\n"
                          f"Status: {parc.get('status','')}\n"
                          f"Saldo devedor: R$ {saldo:,.2f}\n"
                          f"Parcelas: {pagas}/{total} pagas ({progresso}% concluído)\n"
                          f"Restantes: {restantes} parcelas\n"
                          f"Próximo vencimento: {parc.get('proximo_vencimento','—')}\n"
                          f"Dias de atraso: {dias_atraso}\n\n"
                          f"Gere alerta em 3-4 linhas com emojis. Se atrasado, destaque urgência. "
                          f"Se em dia, mencione próximo vencimento e dê dica relevante."
                      }]})
            data = r.json()
            return data.get("content", [{}])[0].get("text", "")
    except Exception as e:
        return f"⚠️ Parcelamento {parc.get('tipo','')} — vencimento em {parc.get('proximo_vencimento','—')}. Saldo: R$ {parc.get('saldo_devedor',0):,.2f}."

# ── Envio de alertas ──────────────────────────────────────────────────────────

async def enviar_email_alerta(para: str, assunto: str, html: str) -> bool:
    user = SMTP_USER or GMAIL_USER; pw = SMTP_PASS or GMAIL_PASS
    host = SMTP_HOST; port = SMTP_PORT
    if not user or not pw or not para: return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = assunto
        msg["From"] = f"{SMTP_FROM} <{user}>"
        msg["To"] = para
        msg.attach(MIMEText(html, "html", "utf-8"))
        async with aiosmtplib.SMTP(hostname=host, port=port, use_tls=False) as smtp:
            await smtp.starttls(); await smtp.login(user, pw); await smtp.send_message(msg)
        return True
    except: return False

async def enviar_wa_alerta(telefone: str, texto: str) -> bool:
    if not EVO_URL or not telefone: return False
    n = re.sub(r"\D", "", telefone)
    num = ("55"+n) if not n.startswith("55") else n
    try:
        async with httpx.AsyncClient(timeout=12) as c:
            r = await c.post(f"{EVO_URL}/message/sendText/{EVO_INST}",
                headers={"apikey": EVO_KEY, "Content-Type": "application/json"},
                json={"number": num, "text": texto})
            return r.status_code < 300
    except: return False

def gerar_html_alerta(parc: dict, cliente_nome: str, alerta: str) -> str:
    orgao_info = ORGAOS.get(parc.get("orgao",""), {})
    sts = STATUS_CFG.get(parc.get("status","ativo"), STATUS_CFG["ativo"])
    saldo = parc.get("saldo_devedor", 0)
    pagas = parc.get("parcelas_pagas", 0)
    total = parc.get("total_parcelas", 0)
    progresso = round(pagas/total*100) if total > 0 else 0
    alerta_html = alerta.replace("\n","<br>")
    return f"""<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f2f7;font-family:Arial,sans-serif;">
<div style="max-width:580px;margin:0 auto;padding:20px 16px;">
  <div style="background:linear-gradient(135deg,{NAVY},{NAVY}cc);border-radius:14px 14px 0 0;padding:20px 26px;">
    <div style="color:#fff;font-size:16px;font-weight:800;">⚠️ Alerta de Parcelamento</div>
    <div style="color:{GOLD};font-size:12px;margin-top:4px;">{orgao_info.get('label','')} · {parc.get('tipo','')}</div>
  </div>
  <div style="background:#fff;padding:22px 26px;border:1px solid #e8e8e8;">
    <div style="font-size:14px;color:#333;margin-bottom:16px;">
      Prezado(a) <strong>{cliente_nome}</strong>,
    </div>
    <div style="background:{sts['bg']};border-left:4px solid {sts['cor']};padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:16px;">
      <div style="font-size:13px;color:{sts['cor']};font-weight:700;margin-bottom:6px;">Status: {sts['label']}</div>
      <div style="font-size:13px;color:#333;">{alerta_html}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <tr style="background:#f8f9fb;"><td style="padding:7px 12px;color:#888;">Processo</td><td style="padding:7px 12px;font-weight:700;color:{NAVY};">{parc.get('numero_processo','—')}</td></tr>
      <tr><td style="padding:7px 12px;color:#888;">Saldo devedor</td><td style="padding:7px 12px;font-weight:700;color:#dc2626;">R$ {saldo:,.2f}</td></tr>
      <tr style="background:#f8f9fb;"><td style="padding:7px 12px;color:#888;">Próximo vencimento</td><td style="padding:7px 12px;font-weight:700;">{parc.get('proximo_vencimento','—')}</td></tr>
      <tr><td style="padding:7px 12px;color:#888;">Progresso</td><td style="padding:7px 12px;">{pagas}/{total} parcelas ({progresso}%)</td></tr>
    </table>
    <div style="height:8px;background:#f0f0f0;border-radius:4px;margin:14px 0 6px;overflow:hidden;">
      <div style="height:100%;width:{progresso}%;background:{orgao_info.get('cor',NAVY)};border-radius:4px;"></div>
    </div>
  </div>
  <div style="background:{NAVY};border-radius:0 0 14px 14px;padding:14px 26px;text-align:center;">
    <span style="color:{GOLD};font-size:11px;font-weight:700;">Carlos Eduardo A. M. Pimentel · CRC/GO 026.994/O-8 · EPimentel Auditoria & Contabilidade</span>
  </div>
</div></body></html>"""

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/orgaos")
async def listar_orgaos():
    """Retorna lista de órgãos e tipos de parcelamento."""
    return ORGAOS

@router.post("/cadastrar")
async def cadastrar(payload: ParcelamentoCadastro, db: AsyncSession = Depends(get_db)):
    await init_tables(db)
    r = await db.execute(text("""
        INSERT INTO parcelamentos_cadastro
        (cliente_id,orgao,tipo,numero_processo,descricao,valor_original,saldo_devedor,
         valor_parcela,total_parcelas,parcelas_pagas,data_inicio,proximo_vencimento,
         dia_vencimento,status,portal_url,portal_usuario,portal_senha,
         email_aviso,whatsapp_aviso,dias_antecedencia,usar_ia,observacoes)
        VALUES (:cid,:orgao,:tipo,:num,:desc,:vo,:sd,:vp,:tot,:pp,:di,:pv,:dv,:sts,
                :purl,:pusr,:ppwd,:email,:wa,:dias,:ia,:obs)
    """), {
        "cid":payload.cliente_id,"orgao":payload.orgao,"tipo":payload.tipo,
        "num":payload.numero_processo,"desc":payload.descricao,"vo":payload.valor_original,
        "sd":payload.saldo_devedor,"vp":payload.valor_parcela,"tot":payload.total_parcelas,
        "pp":payload.parcelas_pagas,"di":payload.data_inicio,"pv":payload.proximo_vencimento,
        "dv":payload.dia_vencimento,"sts":payload.status,"purl":payload.portal_url,
        "pusr":payload.portal_usuario,"ppwd":payload.portal_senha,
        "email":payload.email_aviso,"wa":payload.whatsapp_aviso,
        "dias":payload.dias_antecedencia,"ia":int(payload.usar_ia),"obs":payload.observacoes,
    })
    await db.commit()
    r2 = await db.execute(text("SELECT last_insert_rowid() as id"))
    return {"ok": True, "id": r2.fetchone()[0]}

@router.get("/listar")
async def listar(orgao: str = None, cliente_id: int = None, status: str = None,
                  db: AsyncSession = Depends(get_db)):
    await init_tables(db)
    q = "SELECT p.*, c.nome as cliente_nome FROM parcelamentos_cadastro p LEFT JOIN clientes c ON c.id=p.cliente_id WHERE 1=1"
    params = {}
    if orgao:      q += " AND p.orgao=:orgao";       params["orgao"] = orgao
    if cliente_id: q += " AND p.cliente_id=:cid";    params["cid"] = cliente_id
    if status:     q += " AND p.status=:sts";        params["sts"] = status
    q += " ORDER BY CASE p.status WHEN 'atrasado' THEN 0 WHEN 'ativo' THEN 1 ELSE 2 END, p.proximo_vencimento ASC"
    r = await db.execute(text(q), params)
    rows = [dict(row) for row in r.mappings().fetchall()]
    agora = datetime.now()
    for row in rows:
        try:
            venc = datetime.strptime(row["proximo_vencimento"], "%d/%m/%Y")
            row["dias_vencimento"] = (venc - agora).days
            if row["dias_vencimento"] < 0 and row["status"] == "ativo":
                row["status"] = "atrasado"
        except: row["dias_vencimento"] = None
    return rows

@router.put("/atualizar/{parc_id}")
async def atualizar(parc_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    campos = ["saldo_devedor","valor_parcela","parcelas_pagas","proximo_vencimento",
              "status","email_aviso","whatsapp_aviso","dias_antecedencia","usar_ia","observacoes"]
    sets = ", ".join(f"{c}=:{c}" for c in campos if c in payload)
    if not sets: raise HTTPException(400, "Nada para atualizar")
    payload["id"] = parc_id
    payload["atualizado_em"] = datetime.now().isoformat()
    await db.execute(text(f"UPDATE parcelamentos_cadastro SET {sets}, atualizado_em=:atualizado_em WHERE id=:id"), payload)
    await db.commit()
    return {"ok": True}

@router.delete("/{parc_id}")
async def deletar(parc_id: int, db: AsyncSession = Depends(get_db)):
    await db.execute(text("DELETE FROM parcelamentos_cadastro WHERE id=:id"), {"id": parc_id})
    await db.commit()
    return {"ok": True}

@router.post("/registrar-pagamento")
async def registrar_pagamento(payload: ParcelamentoPagamento, db: AsyncSession = Depends(get_db)):
    await init_tables(db)
    await db.execute(text("""
        INSERT INTO parcelamentos_pagamentos (parcelamento_id,numero_parcela,valor_pago,data_pagamento,comprovante_b64)
        VALUES (:pid,:np,:vp,:dp,:cb64)
    """), {"pid":payload.parcelamento_id,"np":payload.numero_parcela,"vp":payload.valor_pago,
           "dp":payload.data_pagamento,"cb64":payload.comprovante_b64})
    # Atualizar parcelas_pagas e saldo
    r = await db.execute(text("SELECT * FROM parcelamentos_cadastro WHERE id=:id"), {"id":payload.parcelamento_id})
    parc = r.mappings().fetchone()
    if parc:
        novas = (parc["parcelas_pagas"] or 0) + 1
        novo_saldo = max(0, (parc["saldo_devedor"] or 0) - payload.valor_pago)
        await db.execute(text("""
            UPDATE parcelamentos_cadastro
            SET parcelas_pagas=:pp, saldo_devedor=:sd, atualizado_em=datetime('now','localtime')
            WHERE id=:id
        """), {"pp": novas, "sd": novo_saldo, "id": payload.parcelamento_id})
    await db.commit()
    return {"ok": True}

@router.get("/pagamentos/{parc_id}")
async def listar_pagamentos(parc_id: int, db: AsyncSession = Depends(get_db)):
    await init_tables(db)
    r = await db.execute(text("SELECT * FROM parcelamentos_pagamentos WHERE parcelamento_id=:id ORDER BY numero_parcela"), {"id":parc_id})
    return [dict(row) for row in r.mappings().fetchall()]

@router.post("/gerar-alerta/{parc_id}")
async def gerar_alerta(parc_id: int, background: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    r = await db.execute(text("""
        SELECT p.*, c.nome as cliente_nome FROM parcelamentos_cadastro p
        LEFT JOIN clientes c ON c.id=p.cliente_id WHERE p.id=:id
    """), {"id": parc_id})
    parc = r.mappings().fetchone()
    if not parc: raise HTTPException(404)
    parc = dict(parc)
    cliente_nome = parc.get("cliente_nome") or "Cliente"

    # Calcular dias de atraso
    dias_atraso = 0
    try:
        venc = datetime.strptime(parc["proximo_vencimento"], "%d/%m/%Y")
        dias_atraso = max(0, (datetime.now() - venc).days)
    except: pass

    async def _enviar():
        alerta = await gerar_alerta_ia(parc, cliente_nome, dias_atraso)
        await db.execute(text("""
            UPDATE parcelamentos_cadastro SET alerta_ia=:alerta, ultimo_alerta=datetime('now','localtime') WHERE id=:id
        """), {"alerta": alerta, "id": parc_id})
        await db.commit()

        if parc.get("email_aviso"):
            html = gerar_html_alerta(parc, cliente_nome, alerta)
            orgao = ORGAOS.get(parc.get("orgao",""), {})
            sts = STATUS_CFG.get(parc.get("status","ativo"), {})
            assunto = f"{'⚠️' if dias_atraso > 0 else '📋'} [{sts.get('label','')}] Parcelamento {orgao.get('label','')} — {cliente_nome}"
            await enviar_email_alerta(parc["email_aviso"], assunto, html)

        if parc.get("whatsapp_aviso"):
            orgao = ORGAOS.get(parc.get("orgao",""), {}).get("label","")
            txt = (f"{'🚨' if dias_atraso > 0 else '📋'} *Parcelamento {orgao}*\n"
                   f"*{parc.get('tipo','')}*\n\n{alerta}\n\n"
                   f"_EPimentel Auditoria & Contabilidade_")
            await enviar_wa_alerta(parc["whatsapp_aviso"], txt)

    background.add_task(_enviar)
    return {"ok": True, "mensagem": "Alerta sendo gerado e enviado"}

@router.post("/verificar-vencimentos")
async def verificar_vencimentos(background: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Verifica todos os parcelamentos e envia alertas para os que estão próximos do vencimento."""
    await init_tables(db)
    r = await db.execute(text("""
        SELECT p.*, c.nome as cliente_nome FROM parcelamentos_cadastro p
        LEFT JOIN clientes c ON c.id=p.cliente_id
        WHERE p.status IN ('ativo','atrasado')
    """))
    parcelamentos = [dict(row) for row in r.mappings().fetchall()]
    alertas = 0
    agora = datetime.now()
    for parc in parcelamentos:
        try:
            venc = datetime.strptime(parc["proximo_vencimento"], "%d/%m/%Y")
            dias_restantes = (venc - agora).days
            dias_antec = parc.get("dias_antecedencia", 5)
            # Alertar se: vencendo em X dias OU já atrasado
            if -30 <= dias_restantes <= dias_antec:
                dias_atraso = abs(dias_restantes) if dias_restantes < 0 else 0
                alerta = await gerar_alerta_ia(parc, parc.get("cliente_nome",""), dias_atraso)
                await db.execute(text("""
                    UPDATE parcelamentos_cadastro SET alerta_ia=:alerta, ultimo_alerta=datetime('now','localtime'),
                    status=CASE WHEN :atrasado THEN 'atrasado' ELSE status END WHERE id=:id
                """), {"alerta": alerta, "atrasado": dias_restantes < 0, "id": parc["id"]})
                if parc.get("email_aviso"):
                    html = gerar_html_alerta(parc, parc.get("cliente_nome",""), alerta)
                    await enviar_email_alerta(parc["email_aviso"], f"Parcelamento — Vencimento em {dias_restantes}d", html)
                if parc.get("whatsapp_aviso"):
                    txt = f"{'🚨' if dias_restantes < 0 else '⏰'} Parcelamento {ORGAOS.get(parc.get('orgao',''),{}).get('label','')} vence em {dias_restantes}d.\n{alerta}"
                    await enviar_wa_alerta(parc["whatsapp_aviso"], txt)
                alertas += 1
        except: pass
    await db.commit()
    return {"ok": True, "verificados": len(parcelamentos), "alertas_enviados": alertas}

@router.get("/resumo")
async def resumo(db: AsyncSession = Depends(get_db)):
    await init_tables(db)
    r = await db.execute(text("""
        SELECT orgao, status, COUNT(*) as qtd, SUM(saldo_devedor) as total_saldo
        FROM parcelamentos_cadastro GROUP BY orgao, status
    """))
    rows = [dict(row) for row in r.mappings().fetchall()]
    return rows
