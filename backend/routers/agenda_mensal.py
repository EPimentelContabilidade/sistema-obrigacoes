"""
Router: agenda_mensal.py
Envia para cada cliente um único e-mail (e/ou WhatsApp) com TODAS as suas
obrigações do mês: competência, nome da obrigação e vencimento.

Acionado:
  - Automaticamente no 1º dia de cada mês (APScheduler no main.py)
  - Manualmente pelo endpoint POST /api/v1/agenda-mensal/disparar
  - Por cliente individual: POST /api/v1/agenda-mensal/disparar/{cliente_id}

O template HTML do e-mail é profissional e inclui link para o sistema.
"""

import os, re, json
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from database import get_db
import httpx, aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

router = APIRouter(prefix="/agenda-mensal", tags=["agenda_mensal"])

GMAIL_USER = os.getenv("GMAIL_USER", "")
GMAIL_PASS = os.getenv("GMAIL_APP_PASSWORD", "")
EVO_URL    = os.getenv("EVOLUTION_API_URL",  "")
EVO_KEY    = os.getenv("EVOLUTION_API_KEY",  "")
EVO_INST   = os.getenv("EVOLUTION_INSTANCE", "")
SISTEMA_URL = os.getenv("SISTEMA_URL", "https://adventurous-generosity-production-f892.up.railway.app")

NAVY = "#1B2A4A"
GOLD = "#C5A55A"

MESES_PT = ["","Janeiro","Fevereiro","Março","Abril","Maio","Junho",
            "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]

# ── Helpers ───────────────────────────────────────────────────────────────────

def limpar_tel(tel: str) -> str:
    n = re.sub(r"\D", "", tel or "")
    return ("55" + n) if not n.startswith("55") else n

def mes_nome(mes_num: int) -> str:
    return MESES_PT[mes_num] if 1 <= mes_num <= 12 else str(mes_num)

def formatar_competencia(competencia_str: str, mes: int, ano: int) -> str:
    """Converte código de competência para texto legível."""
    if competencia_str == "mes_atual":
        return f"{mes_nome(mes)}/{ano}"
    elif competencia_str == "mes_anterior":
        m2 = mes - 1 if mes > 1 else 12
        a2 = ano if mes > 1 else ano - 1
        return f"{mes_nome(m2)}/{a2}"
    elif competencia_str == "ano_anterior":
        return f"Ano {ano - 1}"
    return f"{mes_nome(mes)}/{ano}"

def vencimento_mes(dia_str: str, mes: int, ano: int) -> str:
    """Calcula data de vencimento a partir da string 'Todo dia X'."""
    try:
        dia = int(re.search(r"\d+", dia_str or "20").group())
        import calendar
        ultimo = calendar.monthrange(ano, mes)[1]
        dia = min(dia, ultimo)
        return f"{dia:02d}/{mes:02d}/{ano}"
    except Exception:
        return f"20/{mes:02d}/{ano}"

# ── Buscar obrigações do cliente para o mês ───────────────────────────────────

def obrigacoes_cliente_mes(cliente, mes: int, ano: int) -> List[dict]:
    """
    Retorna lista de obrigações do cliente para o mês/ano,
    excluindo as não-recorrentes (Anual/Trimestral) fora do mês certo.
    """
    from models import Cliente
    obrigacoes_vinculadas = []

    # Buscar do localStorage via campo JSON no banco
    try:
        obr_json = getattr(cliente, "obrigacoes_vinculadas_json", None) or "[]"
        obrigacoes_vinculadas = json.loads(obr_json) if isinstance(obr_json, str) else (obr_json or [])
    except Exception:
        return []

    resultado = []
    for obr in obrigacoes_vinculadas:
        periodicidade = obr.get("periodicidade", "Mensal")
        ativo = obr.get("ativo", obr.get("ativa", True))
        if not ativo:
            continue

        # ── Filtro por periodicidade ──────────────────────────────────────
        incluir = False
        if periodicidade == "Mensal":
            incluir = True
        elif periodicidade == "Anual":
            # Só inclui no mês de vencimento (padrão: março para maioria)
            mes_venc = obr.get("mes_vencimento", 3)  # março = DEFIS, ECF, etc.
            incluir = (mes == int(mes_venc))
        elif periodicidade == "Trimestral":
            # Trimestral: meses 3, 6, 9, 12
            incluir = (mes % 3 == 0)
        elif periodicidade == "Semestral":
            incluir = (mes in [6, 12])
        elif periodicidade == "Eventual":
            incluir = False  # nunca aparece automaticamente

        if not incluir:
            continue

        # ── Calcular vencimento ───────────────────────────────────────────
        meses_config = obr.get("meses", [])
        idx = mes - 1
        dia_str = meses_config[idx] if isinstance(meses_config, list) and len(meses_config) > idx else "Todo dia 20"
        venc = vencimento_mes(dia_str, mes, ano)
        competencia = formatar_competencia(obr.get("competencia", "mes_anterior"), mes, ano)

        resultado.append({
            "nome":          obr.get("nome", ""),
            "codigo":        obr.get("codigo", ""),
            "departamento":  obr.get("departamento", "Fiscal"),
            "periodicidade": periodicidade,
            "competencia":   competencia,
            "vencimento":    venc,
            "passivel_multa": obr.get("passivel_multa", False),
        })

    # Ordenar por departamento e nome
    ordem_dept = {"Fiscal": 0, "Contábil": 1, "Pessoal": 2, "Financeiro": 3}
    resultado.sort(key=lambda x: (ordem_dept.get(x["departamento"], 9), x["nome"]))
    return resultado

# ── Template HTML do e-mail ───────────────────────────────────────────────────

def gerar_html_email(cliente_nome: str, mes: int, ano: int,
                     obrigacoes: List[dict], link_sistema: str) -> str:
    mes_label = f"{mes_nome(mes)}/{ano}"

    # Agrupar por departamento
    grupos = {}
    for o in obrigacoes:
        d = o["departamento"]
        grupos.setdefault(d, []).append(o)

    cores_dept = {
        "Fiscal":    ("#EBF5FF", "#1D6FA4", "📊"),
        "Contábil":  ("#F3EEFF", "#6B3EC9", "📒"),
        "Pessoal":   ("#EDFBF1", "#1A7A3C", "👥"),
        "Financeiro":("#FEF9C3", "#854D0E", "💰"),
    }

    tabelas_html = ""
    for dept, lista in grupos.items():
        bg, cor, ico = cores_dept.get(dept, ("#f8f9fb", "#555", "📋"))
        linhas = ""
        for i, o in enumerate(lista):
            bg_row = "#ffffff" if i % 2 == 0 else "#fafbfc"
            multa_badge = '<span style="background:#FEF2F2;color:#dc2626;font-size:10px;padding:1px 6px;border-radius:8px;font-weight:700;margin-left:4px;">⚠ Multa</span>' if o.get("passivel_multa") else ""
            linhas += f"""
            <tr style="background:{bg_row};">
              <td style="padding:9px 14px;font-size:13px;color:#1B2A4A;font-weight:600;border-bottom:1px solid #f0f0f0;">
                {o['nome']}{multa_badge}
              </td>
              <td style="padding:9px 14px;font-size:12px;color:#555;text-align:center;border-bottom:1px solid #f0f0f0;">{o['competencia']}</td>
              <td style="padding:9px 14px;font-size:12px;color:{cor};font-weight:700;text-align:center;border-bottom:1px solid #f0f0f0;">{o['vencimento']}</td>
            </tr>"""

        tabelas_html += f"""
        <div style="margin-bottom:22px;">
          <div style="background:{bg};border-left:4px solid {cor};padding:10px 16px;border-radius:8px 8px 0 0;display:flex;align-items:center;gap:8px;">
            <span style="font-size:16px;">{ico}</span>
            <span style="font-weight:800;color:{cor};font-size:14px;">{dept}</span>
            <span style="margin-left:auto;background:{cor};color:#fff;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700;">{len(lista)} obrigação(ões)</span>
          </div>
          <table style="width:100%;border-collapse:collapse;border-radius:0 0 8px 8px;overflow:hidden;border:1px solid #e8e8e8;">
            <thead>
              <tr style="background:{cor};">
                <th style="padding:8px 14px;text-align:left;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Obrigação</th>
                <th style="padding:8px 14px;text-align:center;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:.5px;width:120px;">Competência</th>
                <th style="padding:8px 14px;text-align:center;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:.5px;width:110px;">Vencimento</th>
              </tr>
            </thead>
            <tbody>{linhas}</tbody>
          </table>
        </div>"""

    total = len(obrigacoes)
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f2f7;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:24px 16px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1B2A4A 0%,#2d4a7a 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
    <div style="width:56px;height:56px;background:linear-gradient(135deg,{GOLD},{GOLD}cc);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
      <span style="color:{NAVY};font-size:22px;font-weight:900;line-height:1;">EP</span>
    </div>
    <h1 style="color:#fff;margin:0 0 4px;font-size:20px;font-weight:800;letter-spacing:-.3px;">
      Cronograma de Obrigações
    </h1>
    <p style="color:{GOLD};margin:0;font-size:14px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;">
      {mes_label}
    </p>
  </div>

  <!-- Saudação -->
  <div style="background:#fff;padding:22px 32px;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">
    <p style="margin:0 0 8px;font-size:14px;color:#333;">
      Prezado(a) <strong style="color:{NAVY};">{cliente_nome}</strong>,
    </p>
    <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">
      Segue abaixo o cronograma completo de obrigações fiscais, contábeis e trabalhistas
      para <strong>{mes_label}</strong>. Organize-se para cumprir os prazos e evitar multas.
    </p>
  </div>

  <!-- Resumo -->
  <div style="background:{GOLD}15;padding:14px 32px;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;display:flex;align-items:center;gap:12px;border-top:2px solid {GOLD};">
    <span style="font-size:24px;">📋</span>
    <div>
      <span style="font-size:18px;font-weight:800;color:{NAVY};">{total}</span>
      <span style="font-size:13px;color:#555;margin-left:6px;">obrigação(ões) neste mês</span>
    </div>
    <a href="{link_sistema}" style="margin-left:auto;background:{NAVY};color:#fff;text-decoration:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;white-space:nowrap;">
      Acessar Sistema →
    </a>
  </div>

  <!-- Tabelas por departamento -->
  <div style="background:#fff;padding:24px 32px;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">
    {tabelas_html}
  </div>

  <!-- Aviso multas -->
  <div style="background:#FEF2F2;border:1px solid #fca5a5;border-radius:8px;padding:14px 18px;margin:0 0 20px;background-clip:padding-box;">
    <div style="font-size:13px;color:#991B1B;font-weight:600;margin-bottom:4px;">⚠️ Atenção — Obrigações com risco de multa</div>
    <div style="font-size:12px;color:#7f1d1d;line-height:1.5;">
      As obrigações marcadas com <span style="background:#FEF2F2;color:#dc2626;font-size:10px;padding:1px 6px;border-radius:8px;font-weight:700;border:1px solid #fca5a5;">⚠ Multa</span>
      estão sujeitas a penalidades por atraso. Priorize seu cumprimento no prazo.
    </div>
  </div>

  <!-- Footer -->
  <div style="background:linear-gradient(135deg,#1B2A4A,#2d4a7a);border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
    <p style="color:{GOLD};margin:0 0 6px;font-weight:800;font-size:13px;">
      Carlos Eduardo de Araújo Marques Pimentel
    </p>
    <p style="color:rgba(255,255,255,.7);margin:0 0 10px;font-size:11px;">
      CRC/GO 026.994/O-8 · EPimentel Auditoria & Contabilidade Ltda
    </p>
    <a href="{link_sistema}" style="color:{GOLD};font-size:11px;text-decoration:none;">
      🔗 {link_sistema}
    </a>
  </div>

</div>
</body></html>"""

# ── Template WhatsApp ─────────────────────────────────────────────────────────

def gerar_wa_resumo(cliente_nome: str, mes: int, ano: int,
                    obrigacoes: List[dict], link: str) -> str:
    mes_label = f"{mes_nome(mes)}/{ano}"
    linhas = []
    for o in obrigacoes[:12]:  # limite WA
        multa = " ⚠️" if o.get("passivel_multa") else ""
        linhas.append(f"• *{o['nome']}*{multa}\n  📅 Vence: {o['vencimento']} | Ref: {o['competencia']}")
    corpo = "\n\n".join(linhas)
    total = len(obrigacoes)
    mais = f"\n\n_+ {total - 12} outras obrigações — acesse o sistema._" if total > 12 else ""
    return (
        f"Olá, *{(cliente_nome or '').split()[0]}*! 👋\n\n"
        f"📋 *Cronograma de Obrigações — {mes_label}*\n"
        f"_EPimentel Auditoria & Contabilidade_\n\n"
        f"{corpo}{mais}\n\n"
        f"🔗 Acesse o sistema para mais detalhes:\n{link}\n\n"
        f"_Carlos Eduardo Pimentel · CRC/GO 026.994/O-8_"
    )

# ── Envio de e-mail ───────────────────────────────────────────────────────────

async def enviar_email_agenda(para: str, nome: str, html: str, mes: int, ano: int) -> bool:
    if not GMAIL_USER or not GMAIL_PASS or not para:
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"📋 Cronograma de Obrigações — {mes_nome(mes)}/{ano} | EPimentel"
        msg["From"]    = f"EPimentel Auditoria <{GMAIL_USER}>"
        msg["To"]      = para
        msg.attach(MIMEText(html, "html", "utf-8"))
        async with aiosmtplib.SMTP(hostname="smtp.gmail.com", port=587, use_tls=False) as smtp:
            await smtp.starttls()
            await smtp.login(GMAIL_USER, GMAIL_PASS)
            await smtp.send_message(msg)
        return True
    except Exception:
        return False

async def enviar_wa_agenda(telefone: str, texto: str) -> bool:
    if not EVO_URL or not telefone:
        return False
    numero = limpar_tel(telefone)
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(f"{EVO_URL}/message/sendText/{EVO_INST}",
                headers={"apikey": EVO_KEY, "Content-Type": "application/json"},
                json={"number": numero, "text": texto})
            return r.status_code < 300
    except Exception:
        return False

# ── Disparar para um cliente ──────────────────────────────────────────────────

async def disparar_para_cliente(cliente, mes: int, ano: int, db: AsyncSession) -> dict:
    obrigacoes = obrigacoes_cliente_mes(cliente, mes, ano)
    if not obrigacoes:
        return {"cliente": cliente.nome, "status": "sem_obrigacoes", "enviado_email": False, "enviado_wa": False}

    link = SISTEMA_URL
    html = gerar_html_email(cliente.nome, mes, ano, obrigacoes, link)
    wa   = gerar_wa_resumo(cliente.nome, mes, ano, obrigacoes, link)
    canal = getattr(cliente, "canal_preferido", "email") or "email"

    enviado_email = False
    enviado_wa    = False

    if canal in ("email", "ambos") and (cliente.email or getattr(cliente, "email2", None)):
        enviado_email = await enviar_email_agenda(cliente.email or cliente.email2, cliente.nome, html, mes, ano)

    if canal in ("whatsapp", "ambos"):
        tel = getattr(cliente, "whatsapp", None) or getattr(cliente, "whatsapp2", None) or getattr(cliente, "telefone", None)
        if tel:
            enviado_wa = await enviar_wa_agenda(tel, wa)

    # Registrar no banco
    try:
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS agenda_mensal_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_id INTEGER, cliente_nome TEXT,
                mes INTEGER, ano INTEGER,
                total_obrigacoes INTEGER, enviado_email INTEGER, enviado_wa INTEGER,
                enviado_em TEXT DEFAULT (datetime('now','localtime'))
            )
        """))
        await db.execute(text("""
            INSERT INTO agenda_mensal_log (cliente_id,cliente_nome,mes,ano,total_obrigacoes,enviado_email,enviado_wa)
            VALUES (:cid,:cnome,:mes,:ano,:tot,:em,:wa)
        """), {"cid":cliente.id,"cnome":cliente.nome,"mes":mes,"ano":ano,
               "tot":len(obrigacoes),"em":int(enviado_email),"wa":int(enviado_wa)})
        await db.commit()
    except Exception:
        pass

    return {
        "cliente": cliente.nome,
        "status": "ok",
        "obrigacoes": len(obrigacoes),
        "enviado_email": enviado_email,
        "enviado_wa": enviado_wa,
        "canal": canal,
    }

# ── Disparo em lote (todos os clientes) ──────────────────────────────────────

async def disparar_agenda_mensal(db: AsyncSession, mes: int = None, ano: int = None):
    """Função chamada pelo scheduler no 1º dia de cada mês."""
    agora = datetime.now()
    mes = mes or agora.month
    ano = ano or agora.year

    try:
        from models import Cliente
        r = await db.execute(select(Cliente).where(Cliente.ativo == True))
        clientes = r.scalars().all()
    except Exception:
        return {"erro": "Não foi possível carregar clientes", "total": 0}

    resultados = []
    for cli in clientes:
        result = await disparar_para_cliente(cli, mes, ano, db)
        resultados.append(result)

    ok    = sum(1 for r in resultados if r.get("status") == "ok")
    semob = sum(1 for r in resultados if r.get("status") == "sem_obrigacoes")
    return {"mes": mes, "ano": ano, "total_clientes": len(clientes), "enviados": ok, "sem_obrigacoes": semob, "detalhes": resultados}

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/disparar")
async def disparar_todos(mes: int = None, ano: int = None, db: AsyncSession = Depends(get_db)):
    """Dispara cronograma mensal para TODOS os clientes ativos."""
    agora = datetime.now()
    resultado = await disparar_agenda_mensal(db, mes or agora.month, ano or agora.year)
    return resultado

@router.post("/disparar/{cliente_id}")
async def disparar_cliente(cliente_id: int, mes: int = None, ano: int = None, db: AsyncSession = Depends(get_db)):
    """Dispara cronograma mensal para UM cliente específico."""
    from models import Cliente
    r = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cli = r.scalar_one_or_none()
    if not cli:
        raise HTTPException(404, "Cliente não encontrado")
    agora = datetime.now()
    return await disparar_para_cliente(cli, mes or agora.month, ano or agora.year, db)

@router.get("/preview/{cliente_id}")
async def preview_cliente(cliente_id: int, mes: int = None, ano: int = None, db: AsyncSession = Depends(get_db)):
    """Retorna preview do e-mail HTML e mensagem WA sem enviar."""
    from models import Cliente
    r = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cli = r.scalar_one_or_none()
    if not cli:
        raise HTTPException(404, "Cliente não encontrado")
    agora = datetime.now()
    m = mes or agora.month; a = ano or agora.year
    obrigacoes = obrigacoes_cliente_mes(cli, m, a)
    html = gerar_html_email(cli.nome, m, a, obrigacoes, SISTEMA_URL)
    wa   = gerar_wa_resumo(cli.nome, m, a, obrigacoes, SISTEMA_URL)
    return {"cliente": cli.nome, "mes": m, "ano": a, "total": len(obrigacoes),
            "obrigacoes": obrigacoes, "html_email": html, "wa_texto": wa}

@router.get("/log")
async def log_envios(db: AsyncSession = Depends(get_db)):
    """Histórico de envios da agenda mensal."""
    try:
        r = await db.execute(text("SELECT * FROM agenda_mensal_log ORDER BY enviado_em DESC LIMIT 100"))
        return [dict(row) for row in r.mappings().fetchall()]
    except Exception:
        return []
