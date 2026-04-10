"""
Router: entrega_auto.py
Fluxo automático completo após reconhecimento do Robô:
  1. Identifica cliente pelo CNPJ extraído do PDF
  2. Marca a obrigação como entregue (cria registro de Entrega)
  3. Armazena documento organizado: CNPJ/Obrigacao/Ano/Mes/
     - Google Drive se configurado (GOOGLE_DRIVE_FOLDER_ID)
     - SQLite base64 como fallback
  4. Envia para o cliente via WhatsApp ou e-mail conforme canal_preferido
"""

import os, re, json, base64, asyncio, io
from datetime import datetime
from typing import Optional
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from database import get_db
import httpx

router = APIRouter(prefix="/entrega-auto", tags=["entrega_auto"])

# ── Config ────────────────────────────────────────────────────────────────────
EVO_URL         = os.getenv("EVOLUTION_API_URL",   "http://localhost:8080")
EVO_KEY         = os.getenv("EVOLUTION_API_KEY",   "epimentel-secret")
EVO_INST        = os.getenv("EVOLUTION_INSTANCE",  "epimentel")
GMAIL_USER      = os.getenv("GMAIL_USER",          "ceampimentel@gmail.com")
GMAIL_APP_PASS  = os.getenv("GMAIL_APP_PASSWORD",  "")   # App Password do Gmail
DRIVE_FOLDER_ID = os.getenv("GOOGLE_DRIVE_FOLDER_ID", "")  # ID da pasta raiz no Drive
DRIVE_SA_JSON   = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")  # JSON da service account

# ── Schemas ───────────────────────────────────────────────────────────────────

class EntregaAutoPayload(BaseModel):
    # Dados do documento
    base64_pdf:      str
    nome_arquivo:    str
    # Dados extraídos pelo Robô
    cnpj:            Optional[str] = None
    obrigacao_nome:  str
    vencimento:      Optional[str] = None
    competencia:     Optional[str] = None
    valor:           Optional[str] = None
    tipo_obrigacao:  Optional[str] = None
    # Controle
    cliente_id:      Optional[int] = None   # Se já identificado
    template_id:     Optional[str] = "guia_mensal"
    ano:             Optional[str] = None
    mes:             Optional[str] = None
    # Forçar canal (deixar None para usar o do cliente)
    canal_override:  Optional[str] = None   # "whatsapp" | "email" | "ambos"

class ResultadoEntregaAuto(BaseModel):
    ok:             bool
    cliente_nome:   Optional[str]
    canal_usado:    Optional[str]
    entrega_id:     Optional[int]
    drive_url:      Optional[str]
    doc_id:         Optional[int]
    erros:          list = []

# ── Helpers ───────────────────────────────────────────────────────────────────

def limpar_cnpj(cnpj: str) -> str:
    return re.sub(r"\D", "", cnpj or "")

def normalizar_tel(tel: str) -> str:
    n = re.sub(r"\D", "", tel or "")
    return ("55" + n) if not n.startswith("55") else n

def mes_por_extenso(mes_num: str) -> str:
    meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
             "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
    try:
        return meses[int(mes_num) - 1]
    except Exception:
        return mes_num

def pasta_organizada(cnpj: str, obrigacao: str, ano: str, mes: str) -> str:
    """Retorna o caminho organizado: CNPJ/Obrigacao/Ano/Mes"""
    cnpj_limpo = re.sub(r"\D", "", cnpj or "sem_cnpj")
    obr = re.sub(r"[^a-zA-Z0-9_ -]", "", obrigacao or "geral").strip()[:40]
    mes_nome = mes_por_extenso(mes) if mes.isdigit() else mes
    return f"{cnpj_limpo}/{obr}/{ano}/{mes:>02}-{mes_nome}" if mes.isdigit() else f"{cnpj_limpo}/{obr}/{ano}/{mes_nome}"

# ── Google Drive ──────────────────────────────────────────────────────────────

def drive_service():
    """Retorna cliente autenticado do Google Drive (service account)."""
    if not DRIVE_SA_JSON or not DRIVE_FOLDER_ID:
        return None
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        sa_info = json.loads(DRIVE_SA_JSON)
        creds = service_account.Credentials.from_service_account_info(
            sa_info,
            scopes=["https://www.googleapis.com/auth/drive"]
        )
        return build("drive", "v3", credentials=creds, cache_discovery=False)
    except Exception:
        return None

def criar_ou_buscar_pasta(service, nome: str, parent_id: str) -> str:
    """Cria pasta no Drive ou retorna ID se já existir."""
    q = f"mimeType='application/vnd.google-apps.folder' and name='{nome}' and '{parent_id}' in parents and trashed=false"
    res = service.files().list(q=q, fields="files(id,name)").execute()
    if res.get("files"):
        return res["files"][0]["id"]
    meta = {"name": nome, "mimeType": "application/vnd.google-apps.folder", "parents": [parent_id]}
    pasta = service.files().create(body=meta, fields="id").execute()
    return pasta["id"]

def salvar_no_drive(base64_pdf: str, nome_arquivo: str, cnpj: str, obrigacao: str, ano: str, mes: str) -> Optional[str]:
    """
    Salva PDF no Google Drive na estrutura:
    EPimentel/[CNPJ]/[Obrigacao]/[Ano]/[Mes]/arquivo.pdf
    Retorna URL de visualização ou None se Drive não configurado.
    """
    service = drive_service()
    if not service:
        return None
    try:
        from googleapiclient.http import MediaIoBaseUpload
        # Criar hierarquia de pastas
        p_cnpj  = criar_ou_buscar_pasta(service, re.sub(r"\D","", cnpj or "sem_cnpj"), DRIVE_FOLDER_ID)
        p_obr   = criar_ou_buscar_pasta(service, (obrigacao or "Geral")[:40], p_cnpj)
        p_ano   = criar_ou_buscar_pasta(service, ano or str(datetime.now().year), p_obr)
        mes_str = f"{mes:>02}-{mes_por_extenso(mes)}" if (mes or "").isdigit() else (mes or "")
        p_mes   = criar_ou_buscar_pasta(service, mes_str, p_ano)
        # Upload do arquivo
        conteudo = base64.b64decode(base64_pdf)
        media = MediaIoBaseUpload(io.BytesIO(conteudo), mimetype="application/pdf")
        meta = {"name": nome_arquivo, "parents": [p_mes]}
        arq = service.files().create(body=meta, media_body=media, fields="id,webViewLink").execute()
        # Tornar público para leitura (opcional)
        service.permissions().create(
            fileId=arq["id"],
            body={"type":"anyone","role":"reader"}
        ).execute()
        return arq.get("webViewLink")
    except Exception as e:
        return None

# ── Armazenar no SQLite (fallback) ────────────────────────────────────────────

async def salvar_doc_sqlite(db: AsyncSession, cliente_id: int, cnpj: str,
                             obrigacao: str, ano: str, mes: str,
                             nome_arquivo: str, base64_pdf: str,
                             drive_url: Optional[str] = None) -> int:
    """Armazena documento organizado no SQLite."""
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS docs_obrigacoes (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id    INTEGER,
            cnpj          TEXT,
            obrigacao     TEXT,
            ano           TEXT,
            mes           TEXT,
            nome_arquivo  TEXT,
            conteudo_b64  TEXT,
            drive_url     TEXT,
            criado_em     TEXT DEFAULT (datetime('now','localtime'))
        )
    """))
    await db.commit()
    await db.execute(text("""
        INSERT INTO docs_obrigacoes (cliente_id, cnpj, obrigacao, ano, mes, nome_arquivo, conteudo_b64, drive_url)
        VALUES (:cid, :cnpj, :obr, :ano, :mes, :narq, :b64, :durl)
    """), {
        "cid": cliente_id, "cnpj": cnpj, "obr": obrigacao,
        "ano": ano, "mes": mes, "narq": nome_arquivo,
        "b64": base64_pdf, "durl": drive_url,
    })
    await db.commit()
    r = await db.execute(text("SELECT last_insert_rowid()"))
    return r.scalar()

# ── Criar registro de Entrega ─────────────────────────────────────────────────

async def criar_entrega(db: AsyncSession, cliente_id: int, obrigacao_nome: str,
                        competencia: str, doc_id: int, drive_url: str) -> int:
    """Cria registro de Entrega/Tarefa marcando a obrigação como cumprida."""
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS entregas (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id      INTEGER,
            obrigacao_nome  TEXT,
            competencia     TEXT,
            status          TEXT DEFAULT 'entregue',
            doc_id          INTEGER,
            drive_url       TEXT,
            entregue_em     TEXT DEFAULT (datetime('now','localtime'))
        )
    """))
    await db.commit()

    # Verificar se já existe entrega para esta competência
    r = await db.execute(text("""
        SELECT id FROM entregas
        WHERE cliente_id=:cid AND obrigacao_nome=:obr AND competencia=:comp
    """), {"cid": cliente_id, "obr": obrigacao_nome, "comp": competencia or ""})
    existente = r.fetchone()
    if existente:
        await db.execute(text("""
            UPDATE entregas SET status='entregue', doc_id=:did, drive_url=:durl,
            entregue_em=datetime('now','localtime')
            WHERE id=:id
        """), {"did": doc_id, "durl": drive_url or "", "id": existente[0]})
        await db.commit()
        return existente[0]

    await db.execute(text("""
        INSERT INTO entregas (cliente_id, obrigacao_nome, competencia, doc_id, drive_url)
        VALUES (:cid, :obr, :comp, :did, :durl)
    """), {
        "cid": cliente_id, "obr": obrigacao_nome,
        "comp": competencia or "", "did": doc_id, "durl": drive_url or ""
    })
    await db.commit()
    r2 = await db.execute(text("SELECT last_insert_rowid()"))
    return r2.scalar()

# ── Envio via WhatsApp (Evolution API) ────────────────────────────────────────

async def enviar_whatsapp(telefone: str, mensagem: str, base64_pdf: str, nome_arquivo: str) -> bool:
    numero = normalizar_tel(telefone)
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            payload = {
                "number": numero,
                "mediatype": "document",
                "mimetype": "application/pdf",
                "caption": mensagem,
                "media": base64_pdf,
                "fileName": nome_arquivo,
            }
            r = await c.post(
                f"{EVO_URL}/message/sendMedia/{EVO_INST}",
                headers={"apikey": EVO_KEY, "Content-Type": "application/json"},
                json=payload,
            )
            return r.status_code in (200, 201)
    except Exception:
        return False

# ── Envio via E-mail (Gmail SMTP) ─────────────────────────────────────────────

async def enviar_email(destinatario: str, assunto: str, corpo: str,
                       base64_pdf: str, nome_arquivo: str) -> bool:
    if not GMAIL_APP_PASS:
        return False
    try:
        import email.mime.multipart as mp
        import email.mime.base as mb
        import email.mime.text as mt
        from email.encoders import encode_base64
        import aiosmtplib

        msg = mp.MIMEMultipart()
        msg["From"]    = GMAIL_USER
        msg["To"]      = destinatario
        msg["Subject"] = assunto

        msg.attach(mt.MIMEText(corpo, "plain", "utf-8"))

        # Anexar PDF
        pdf_bytes = base64.b64decode(base64_pdf)
        part = mb.MIMEBase("application", "pdf")
        part.set_payload(pdf_bytes)
        encode_base64(part)
        part.add_header("Content-Disposition", f'attachment; filename="{nome_arquivo}"')
        msg.attach(part)

        await aiosmtplib.send(
            msg,
            hostname="smtp.gmail.com",
            port=587,
            start_tls=True,
            username=GMAIL_USER,
            password=GMAIL_APP_PASS,
        )
        return True
    except Exception:
        return False

# ── Template de mensagem ──────────────────────────────────────────────────────

TEMPLATES_MSG = {
    "guia_mensal": (
        "Olá, {cliente_nome}! 👋\n\n"
        "Segue em anexo a guia *{obrigacao}* referente a *{competencia}*.\n\n"
        "📅 Vencimento: *{vencimento}*\n"
        "{valor_linha}"
        "\nQualquer dúvida, estamos à disposição.\n\n"
        "_EPimentel Auditoria & Contabilidade_"
    ),
    "lembrete": (
        "Olá, {cliente_nome}! ⚠️\n\n"
        "Lembrete: a guia *{obrigacao}* vence *{vencimento}*.\n"
        "Segue novamente em anexo.\n\n"
        "_EPimentel Auditoria & Contabilidade_"
    ),
}

def montar_mensagem(template_id: str, cliente_nome: str, obrigacao: str,
                    competencia: str, vencimento: str, valor: str) -> str:
    tpl = TEMPLATES_MSG.get(template_id, TEMPLATES_MSG["guia_mensal"])
    valor_linha = f"💰 Valor: *{valor}*\n" if valor and valor != "—" else ""
    return tpl.format(
        cliente_nome=cliente_nome or "prezado cliente",
        obrigacao=obrigacao or "obrigação",
        competencia=competencia or "—",
        vencimento=vencimento or "—",
        valor_linha=valor_linha,
    )

# ── Endpoint principal ────────────────────────────────────────────────────────

@router.post("/processar")
async def processar_entrega_auto(
    payload: EntregaAutoPayload,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> ResultadoEntregaAuto:
    """
    Fluxo completo automático:
    1. Identifica cliente pelo CNPJ
    2. Armazena documento (Drive > SQLite)
    3. Cria registro de Entrega
    4. Envia WA ou e-mail conforme canal_preferido do cliente
    """
    erros = []
    from models import Cliente

    # ── 1. Identificar cliente ────────────────────────────────────────────────
    cliente = None
    if payload.cliente_id:
        r = await db.execute(select(Cliente).where(Cliente.id == payload.cliente_id))
        cliente = r.scalar_one_or_none()

    if not cliente and payload.cnpj:
        cnpj_limpo = limpar_cnpj(payload.cnpj)
        r = await db.execute(select(Cliente))
        for c in r.scalars().all():
            if limpar_cnpj(c.cnpj or "") == cnpj_limpo:
                cliente = c
                break

    if not cliente:
        raise HTTPException(404, f"Cliente não encontrado para CNPJ {payload.cnpj}")

    # ── 2. Definir ano e mês ──────────────────────────────────────────────────
    agora = datetime.now()
    ano = payload.ano or str(agora.year)
    mes = payload.mes or f"{agora.month:02d}"
    competencia = payload.competencia or f"{mes_por_extenso(mes)}/{ano}"

    # ── 3. Salvar no Google Drive ─────────────────────────────────────────────
    drive_url = None
    try:
        drive_url = salvar_no_drive(
            payload.base64_pdf, payload.nome_arquivo,
            cliente.cnpj or "", payload.obrigacao_nome, ano, mes
        )
    except Exception as e:
        erros.append(f"Drive: {e}")

    # ── 4. Salvar no SQLite ───────────────────────────────────────────────────
    doc_id = await salvar_doc_sqlite(
        db, cliente.id, cliente.cnpj or "",
        payload.obrigacao_nome, ano, mes,
        payload.nome_arquivo, payload.base64_pdf, drive_url
    )

    # ── 5. Criar Entrega (baixar a tarefa) ────────────────────────────────────
    entrega_id = await criar_entrega(
        db, cliente.id, payload.obrigacao_nome,
        competencia, doc_id, drive_url or ""
    )

    # ── 6. Montar mensagem ────────────────────────────────────────────────────
    mensagem = montar_mensagem(
        payload.template_id or "guia_mensal",
        cliente.nome,
        payload.obrigacao_nome,
        competencia,
        payload.vencimento or "—",
        payload.valor or "—",
    )

    # ── 7. Enviar via canal do cliente ────────────────────────────────────────
    canal = payload.canal_override or cliente.canal_preferido or "whatsapp"
    canal_usado = []
    assunto_email = f"{payload.obrigacao_nome} — {competencia} | EPimentel"

    async def _enviar():
        if canal in ("whatsapp", "ambos"):
            tel = cliente.whatsapp or cliente.whatsapp2 or cliente.telefone
            if tel:
                ok = await enviar_whatsapp(tel, mensagem, payload.base64_pdf, payload.nome_arquivo)
                canal_usado.append("whatsapp" if ok else "whatsapp_erro")
            else:
                erros.append("Cliente sem telefone para WhatsApp")

        if canal in ("email", "ambos"):
            email_dest = cliente.email or cliente.email2
            if email_dest:
                ok = await enviar_email(email_dest, assunto_email, mensagem, payload.base64_pdf, payload.nome_arquivo)
                canal_usado.append("email" if ok else "email_erro")
            else:
                erros.append("Cliente sem e-mail cadastrado")

    background_tasks.add_task(_enviar)

    return ResultadoEntregaAuto(
        ok=True,
        cliente_nome=cliente.nome,
        canal_usado=canal,
        entrega_id=entrega_id,
        drive_url=drive_url,
        doc_id=doc_id,
        erros=erros,
    )


@router.get("/docs/{cliente_id}")
async def listar_docs_cliente(cliente_id: int, db: AsyncSession = Depends(get_db)):
    """Lista documentos armazenados de um cliente, organizados por obrigação/ano/mês."""
    try:
        r = await db.execute(text("""
            SELECT id, cnpj, obrigacao, ano, mes, nome_arquivo, drive_url, criado_em
            FROM docs_obrigacoes
            WHERE cliente_id = :cid
            ORDER BY ano DESC, mes DESC, criado_em DESC
        """), {"cid": cliente_id})
        rows = r.mappings().fetchall()
        return [dict(row) for row in rows]
    except Exception:
        return []


@router.get("/docs/buscar")
async def buscar_docs(
    cnpj: Optional[str] = None,
    obrigacao: Optional[str] = None,
    ano: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Busca documentos por CNPJ/obrigação/ano."""
    condicoes = []
    params = {}
    if cnpj:
        condicoes.append("cnpj LIKE :cnpj")
        params["cnpj"] = f"%{re.sub(r'\\D','',cnpj)}%"
    if obrigacao:
        condicoes.append("obrigacao LIKE :obr")
        params["obr"] = f"%{obrigacao}%"
    if ano:
        condicoes.append("ano = :ano")
        params["ano"] = ano

    where = ("WHERE " + " AND ".join(condicoes)) if condicoes else ""
    try:
        r = await db.execute(text(f"""
            SELECT id, cliente_id, cnpj, obrigacao, ano, mes, nome_arquivo, drive_url, criado_em
            FROM docs_obrigacoes {where}
            ORDER BY ano DESC, mes DESC, criado_em DESC
            LIMIT 200
        """), params)
        return [dict(row) for row in r.mappings().fetchall()]
    except Exception:
        return []


@router.get("/drive/status")
async def status_drive():
    """Verifica se o Google Drive está configurado e acessível."""
    if not DRIVE_FOLDER_ID:
        return {"configurado": False, "motivo": "GOOGLE_DRIVE_FOLDER_ID não definido"}
    if not DRIVE_SA_JSON:
        return {"configurado": False, "motivo": "GOOGLE_SERVICE_ACCOUNT_JSON não definido"}
    svc = drive_service()
    if not svc:
        return {"configurado": False, "motivo": "Falha ao autenticar com a Service Account"}
    try:
        meta = svc.files().get(fileId=DRIVE_FOLDER_ID, fields="id,name").execute()
        return {"configurado": True, "pasta_raiz": meta.get("name"), "pasta_id": meta.get("id")}
    except Exception as e:
        return {"configurado": False, "motivo": str(e)}
