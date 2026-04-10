"""
Router: automacao.py
Orquestração completa do fluxo automatizado:
  1. Robô reconhece documento (por Docs Base ou critério)
  2. Registra entrega na obrigação do cliente
  3. Salva PDF no Google Drive (estrutura: CNPJ / Ano / Mês / arquivo)
  4. Envia para o cliente via WhatsApp OU e-mail (conforme canal_preferido)
  5. Registra tudo no histórico

Google Drive: autenticado via Service Account JSON (env GOOGLE_SERVICE_ACCOUNT_JSON)
ou via OAuth2 credentials (env GOOGLE_CREDENTIALS_JSON).
"""

import os, json, base64, re, io, asyncio
from datetime import datetime
from typing import Optional, List
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
import httpx

from database import get_db

router = APIRouter(prefix="/automacao", tags=["automacao"])

# ── Configurações ─────────────────────────────────────────────────────────────
EVO_URL  = os.getenv("EVOLUTION_API_URL",  "http://localhost:8080")
EVO_KEY  = os.getenv("EVOLUTION_API_KEY",  "epimentel-secret")
EVO_INST = os.getenv("EVOLUTION_INSTANCE", "epimentel")

SMTP_HOST   = os.getenv("SMTP_HOST",   "smtp.gmail.com")
SMTP_PORT   = int(os.getenv("SMTP_PORT",   "587"))
SMTP_USER   = os.getenv("SMTP_USER",   "")
SMTP_PASS   = os.getenv("SMTP_PASS",   "")
EMAIL_FROM  = os.getenv("EMAIL_FROM",  "ceampimentel@gmail.com")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "EPimentel Auditoria & Contabilidade")

# ID da pasta raiz no Google Drive (criar uma vez e salvar)
GDRIVE_ROOT_FOLDER = os.getenv("GDRIVE_ROOT_FOLDER_ID", "")
MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
            "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]

# ── Schemas ───────────────────────────────────────────────────────────────────

class ProcessarDocumento(BaseModel):
    """Payload completo para processar um documento reconhecido."""
    cliente_id:      int
    obrigacao_nome:  str
    obrigacao_id:    Optional[int]   = None
    mes_ref:         Optional[str]   = None   # "Abril/2026"
    vencimento:      Optional[str]   = None
    valor:           Optional[str]   = None
    competencia:     Optional[str]   = None
    nome_arquivo:    str
    base64_pdf:      Optional[str]   = None
    # Controle de canais
    enviar_whatsapp: bool = True
    enviar_email:    bool = True
    salvar_gdrive:   bool = True
    registrar_entrega: bool = True
    # Mensagem customizada (se None, usa template padrão)
    mensagem_custom: Optional[str]   = None
    template_id:     Optional[str]   = None

class ResultadoProcessamento(BaseModel):
    ok:               bool
    cliente_nome:     str
    entrega_id:       Optional[int]
    gdrive_url:       Optional[str]
    gdrive_path:      Optional[str]
    whatsapp_status:  Optional[str]
    email_status:     Optional[str]
    erros:            List[str]

class ConfigGDrive(BaseModel):
    service_account_json: Optional[str] = None  # JSON da Service Account
    root_folder_id:       Optional[str] = None  # ID da pasta raiz

# ── Google Drive helpers ──────────────────────────────────────────────────────

def _gdrive_service():
    """Cria um serviço autenticado do Google Drive."""
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        creds_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
        if not creds_json:
            return None

        info = json.loads(creds_json)
        creds = service_account.Credentials.from_service_account_info(
            info,
            scopes=["https://www.googleapis.com/auth/drive"]
        )
        return build("drive", "v3", credentials=creds)
    except Exception as e:
        print(f"[GDrive] Erro ao criar serviço: {e}")
        return None


def _gdrive_get_or_create_folder(service, nome: str, parent_id: str) -> str:
    """Retorna o ID de uma pasta (cria se não existir)."""
    q = (
        f"name='{nome}' and mimeType='application/vnd.google-apps.folder' "
        f"and '{parent_id}' in parents and trashed=false"
    )
    res = service.files().list(q=q, fields="files(id,name)").execute()
    items = res.get("files", [])
    if items:
        return items[0]["id"]

    meta = {
        "name": nome,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    folder = service.files().create(body=meta, fields="id").execute()
    return folder["id"]


def salvar_no_gdrive(
    base64_pdf: str,
    nome_arquivo: str,
    cnpj: str,
    nome_empresa: str,
    ano: str,
    mes: str,
) -> dict:
    """
    Salva o PDF no Google Drive na estrutura:
    Raiz / CNPJ - Empresa / Ano / Mês / arquivo.pdf
    Retorna {"url": ..., "path": ..., "file_id": ...}
    """
    service = _gdrive_service()
    root_id = GDRIVE_ROOT_FOLDER

    if not service or not root_id:
        return {"url": None, "path": None, "file_id": None, "erro": "Google Drive não configurado"}

    try:
        from googleapiclient.http import MediaIoBaseUpload

        # Criar hierarquia de pastas
        nome_pasta_empresa = f"{cnpj} — {nome_empresa}"[:60] if cnpj else nome_empresa[:60]
        pasta_empresa = _gdrive_get_or_create_folder(service, nome_pasta_empresa, root_id)
        pasta_ano     = _gdrive_get_or_create_folder(service, ano,  pasta_empresa)
        pasta_mes     = _gdrive_get_or_create_folder(service, mes,  pasta_ano)

        # Upload do arquivo
        conteudo = base64.b64decode(base64_pdf)
        media = MediaIoBaseUpload(io.BytesIO(conteudo), mimetype="application/pdf")
        meta = {"name": nome_arquivo, "parents": [pasta_mes]}
        arquivo = service.files().create(
            body=meta, media_body=media, fields="id,webViewLink,name"
        ).execute()

        # Tornar público para leitura (opcional — comentar se quiser manter privado)
        service.permissions().create(
            fileId=arquivo["id"],
            body={"role": "reader", "type": "anyone"},
        ).execute()

        path = f"{nome_pasta_empresa} / {ano} / {mes} / {nome_arquivo}"
        return {
            "url": arquivo.get("webViewLink"),
            "path": path,
            "file_id": arquivo["id"],
            "erro": None,
        }
    except Exception as e:
        return {"url": None, "path": None, "file_id": None, "erro": str(e)[:200]}


# ── Email helpers ─────────────────────────────────────────────────────────────

async def enviar_email_automatico(
    destinatario: str,
    nome_cliente: str,
    obrigacao: str,
    mes_ref: str,
    vencimento: str,
    valor: str,
    gdrive_url: Optional[str],
    base64_pdf: Optional[str],
    nome_arquivo: str,
) -> dict:
    """Envia e-mail com o documento e/ou link do Google Drive."""
    if not SMTP_USER or not SMTP_PASS:
        return {"status": "ignorado", "erro": "SMTP não configurado"}

    try:
        import aiosmtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        from email.mime.application import MIMEApplication
        from email.utils import formataddr

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"{obrigacao} — {mes_ref}"
        msg["From"]    = formataddr((EMAIL_FROM_NAME, EMAIL_FROM))
        msg["To"]      = destinatario

        link_html = ""
        if gdrive_url:
            link_html = f'<p>🔗 <a href="{gdrive_url}">Clique aqui para acessar o documento no Google Drive</a></p>'

        html = f"""
<html><body style="font-family:Arial,sans-serif;color:#333">
<div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e8e8e8;border-radius:10px;overflow:hidden">
  <div style="background:#1B2A4A;padding:20px 24px">
    <h2 style="color:#C5A55A;margin:0;font-size:18px">EPimentel Auditoria &amp; Contabilidade</h2>
  </div>
  <div style="padding:24px">
    <p>Olá, <strong>{nome_cliente}</strong>!</p>
    <p>Segue em anexo o documento <strong>{obrigacao}</strong> referente a <strong>{mes_ref}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:8px;background:#f8f9fb;font-weight:bold;width:140px">Obrigação</td><td style="padding:8px">{obrigacao}</td></tr>
      <tr><td style="padding:8px;background:#f8f9fb;font-weight:bold">Mês Ref.</td><td style="padding:8px">{mes_ref}</td></tr>
      {'<tr><td style="padding:8px;background:#f8f9fb;font-weight:bold">Vencimento</td><td style="padding:8px"><strong style="color:#dc2626">'+vencimento+'</strong></td></tr>' if vencimento else ''}
      {'<tr><td style="padding:8px;background:#f8f9fb;font-weight:bold">Valor</td><td style="padding:8px">'+valor+'</td></tr>' if valor else ''}
    </table>
    {link_html}
    <p style="color:#888;font-size:12px;margin-top:24px">
      Qualquer dúvida, entre em contato conosco.<br>
      <strong>EPimentel Auditoria &amp; Contabilidade Ltda</strong><br>
      CRC/GO 026.994/O-8
    </p>
  </div>
</div>
</body></html>"""

        msg.attach(MIMEText(html, "html"))

        # Anexar PDF se disponível
        if base64_pdf and nome_arquivo:
            try:
                pdf_bytes = base64.b64decode(base64_pdf)
                part = MIMEApplication(pdf_bytes, Name=nome_arquivo)
                part["Content-Disposition"] = f'attachment; filename="{nome_arquivo}"'
                msg.attach(part)
            except Exception:
                pass

        await aiosmtplib.send(
            msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            start_tls=True,
            username=SMTP_USER,
            password=SMTP_PASS,
        )
        return {"status": "enviado"}

    except Exception as e:
        return {"status": "erro", "erro": str(e)[:300]}


# ── WhatsApp helpers ──────────────────────────────────────────────────────────

def normalizar_tel(tel: str) -> str:
    n = re.sub(r"\D", "", tel or "")
    return n if n.startswith("55") else "55" + n


async def enviar_whatsapp_automatico(
    telefone: str,
    mensagem: str,
    base64_pdf: Optional[str],
    nome_arquivo: str,
) -> dict:
    """Envia documento + mensagem via Evolution API."""
    numero = normalizar_tel(telefone)
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            headers = {"apikey": EVO_KEY, "Content-Type": "application/json"}
            if base64_pdf and nome_arquivo:
                r = await c.post(
                    f"{EVO_URL}/message/sendMedia/{EVO_INST}",
                    headers=headers,
                    json={
                        "number": numero,
                        "mediatype": "document",
                        "mimetype": "application/pdf",
                        "caption": mensagem,
                        "media": base64_pdf,
                        "fileName": nome_arquivo,
                    },
                )
            else:
                r = await c.post(
                    f"{EVO_URL}/message/sendText/{EVO_INST}",
                    headers=headers,
                    json={"number": numero, "text": mensagem},
                )
        return {"status": "enviado" if r.status_code in (200, 201) else "erro",
                "http": r.status_code}
    except Exception as e:
        return {"status": "erro", "erro": str(e)[:200]}


# ── Tabelas auxiliares ────────────────────────────────────────────────────────

async def init_tables(db: AsyncSession):
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS automacao_historico (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id       INTEGER,
            cliente_nome     TEXT,
            cnpj             TEXT,
            obrigacao        TEXT,
            mes_ref          TEXT,
            vencimento       TEXT,
            nome_arquivo     TEXT,
            gdrive_url       TEXT,
            gdrive_path      TEXT,
            whatsapp_status  TEXT,
            email_status     TEXT,
            entrega_id       INTEGER,
            erros            TEXT,
            criado_em        TEXT DEFAULT (datetime('now','localtime'))
        )
    """))
    # Tabela de docs armazenados por empresa/obrigação/mês
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS docs_obrigacoes (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id   INTEGER NOT NULL,
            cliente_nome TEXT,
            cnpj         TEXT,
            obrigacao    TEXT NOT NULL,
            mes_ref      TEXT,
            ano          TEXT,
            mes          TEXT,
            nome_arquivo TEXT,
            gdrive_url   TEXT,
            gdrive_path  TEXT,
            base64       TEXT,
            enviado_wa   INTEGER DEFAULT 0,
            enviado_email INTEGER DEFAULT 0,
            criado_em    TEXT DEFAULT (datetime('now','localtime'))
        )
    """))
    await db.commit()


# ── Endpoint principal ────────────────────────────────────────────────────────

@router.post("/processar", response_model=ResultadoProcessamento)
async def processar_documento(req: ProcessarDocumento, db: AsyncSession = Depends(get_db)):
    """
    Fluxo completo:
    1. Busca dados do cliente
    2. Registra entrega na obrigação
    3. Salva no Google Drive (estrutura organizada)
    4. Envia por WhatsApp e/ou e-mail conforme canal_preferido
    5. Salva no histórico e na tabela docs_obrigacoes
    """
    await init_tables(db)
    erros = []
    entrega_id = None
    gdrive_url = None
    gdrive_path = None
    whatsapp_status = None
    email_status = None

    # 1. Buscar dados do cliente ───────────────────────────────────────────────
    from models import Cliente
    result = await db.execute(select(Cliente).where(Cliente.id == req.cliente_id))
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(404, f"Cliente ID {req.cliente_id} não encontrado")

    nome_cliente  = cliente.nome or ""
    cnpj          = cliente.cnpj or ""
    telefone_wa   = cliente.whatsapp or cliente.whatsapp2 or cliente.telefone or ""
    email_cliente = cliente.email or cliente.email2 or ""
    canal         = (cliente.canal_preferido or "ambos").lower()

    # Derivar mês/ano
    agora = datetime.now()
    mes_ref = req.mes_ref or f"{MESES_PT[agora.month-1]}/{agora.year}"
    partes = mes_ref.split("/")
    mes_str = partes[0] if len(partes) > 0 else MESES_PT[agora.month-1]
    ano_str = partes[1] if len(partes) > 1 else str(agora.year)

    # Montar nome do arquivo com padrão organizado
    nome_safe = re.sub(r"[^\w\-.]", "_", req.nome_arquivo or f"{req.obrigacao_nome}_{mes_ref}.pdf")
    if not nome_safe.endswith(".pdf"):
        nome_safe += ".pdf"

    # 2. Registrar entrega ────────────────────────────────────────────────────
    if req.registrar_entrega:
        try:
            from models import Entrega
            entrega = Entrega(
                cliente_id=req.cliente_id,
                obrigacao_id=req.obrigacao_id,
                descricao=f"{req.obrigacao_nome} — {mes_ref}",
                status="concluido",
                data_entrega=agora.strftime("%Y-%m-%d"),
                arquivo=nome_safe,
                competencia=req.competencia or mes_ref,
                vencimento=req.vencimento,
                valor=req.valor,
            )
            db.add(entrega)
            await db.flush()
            entrega_id = entrega.id
        except Exception as e:
            erros.append(f"Entrega: {str(e)[:100]}")

    # 3. Salvar no Google Drive ────────────────────────────────────────────────
    if req.salvar_gdrive and req.base64_pdf:
        gdrive_result = salvar_no_gdrive(
            base64_pdf=req.base64_pdf,
            nome_arquivo=nome_safe,
            cnpj=cnpj,
            nome_empresa=nome_cliente,
            ano=ano_str,
            mes=mes_str,
        )
        gdrive_url  = gdrive_result.get("url")
        gdrive_path = gdrive_result.get("path")
        if gdrive_result.get("erro"):
            erros.append(f"GDrive: {gdrive_result['erro']}")

    # 4. Montar mensagem ───────────────────────────────────────────────────────
    if req.mensagem_custom:
        mensagem = req.mensagem_custom
    else:
        gdrive_link = f"\n\n🔗 Acesse em: {gdrive_url}" if gdrive_url else ""
        mensagem = (
            f"Olá, {nome_cliente}! 👋\n\n"
            f"Segue em anexo *{req.obrigacao_nome}* referente a *{mes_ref}*."
            + (f"\n📅 Vencimento: *{req.vencimento}*" if req.vencimento else "")
            + (f"\n💰 Valor: *{req.valor}*" if req.valor else "")
            + gdrive_link
            + "\n\n_EPimentel Auditoria & Contabilidade_"
        )

    # 5. Enviar por WhatsApp ───────────────────────────────────────────────────
    deve_wa = req.enviar_whatsapp and canal in ("whatsapp", "ambos", "both", "wa")
    if deve_wa and telefone_wa:
        wa_result = await enviar_whatsapp_automatico(
            telefone=telefone_wa,
            mensagem=mensagem,
            base64_pdf=req.base64_pdf,
            nome_arquivo=nome_safe,
        )
        whatsapp_status = wa_result.get("status")
        if wa_result.get("status") == "erro":
            erros.append(f"WhatsApp: {wa_result.get('erro','')}")
    elif deve_wa and not telefone_wa:
        erros.append("WhatsApp: cliente sem número cadastrado")

    # 6. Enviar por e-mail ─────────────────────────────────────────────────────
    deve_email = req.enviar_email and canal in ("email", "ambos", "both")
    if deve_email and email_cliente:
        email_result = await enviar_email_automatico(
            destinatario=email_cliente,
            nome_cliente=nome_cliente,
            obrigacao=req.obrigacao_nome,
            mes_ref=mes_ref,
            vencimento=req.vencimento or "",
            valor=req.valor or "",
            gdrive_url=gdrive_url,
            base64_pdf=req.base64_pdf,
            nome_arquivo=nome_safe,
        )
        email_status = email_result.get("status")
        if email_result.get("status") == "erro":
            erros.append(f"Email: {email_result.get('erro','')}")
    elif deve_email and not email_cliente:
        erros.append("Email: cliente sem e-mail cadastrado")

    # 7. Salvar no histórico e docs_obrigacoes ─────────────────────────────────
    try:
        await db.execute(text("""
            INSERT INTO automacao_historico
                (cliente_id, cliente_nome, cnpj, obrigacao, mes_ref, vencimento,
                 nome_arquivo, gdrive_url, gdrive_path, whatsapp_status, email_status,
                 entrega_id, erros)
            VALUES
                (:cid, :cnome, :cnpj, :obr, :mes, :venc,
                 :narq, :gurl, :gpath, :wsts, :ests,
                 :eid, :erros)
        """), {
            "cid": req.cliente_id, "cnome": nome_cliente, "cnpj": cnpj,
            "obr": req.obrigacao_nome, "mes": mes_ref, "venc": req.vencimento,
            "narq": nome_safe, "gurl": gdrive_url, "gpath": gdrive_path,
            "wsts": whatsapp_status, "ests": email_status,
            "eid": entrega_id, "erros": json.dumps(erros),
        })
        # Salvar na tabela de docs por empresa/obrigação/mês
        await db.execute(text("""
            INSERT INTO docs_obrigacoes
                (cliente_id, cliente_nome, cnpj, obrigacao, mes_ref, ano, mes,
                 nome_arquivo, gdrive_url, gdrive_path, enviado_wa, enviado_email)
            VALUES
                (:cid, :cnome, :cnpj, :obr, :mes, :ano, :mstr,
                 :narq, :gurl, :gpath, :wa, :em)
        """), {
            "cid": req.cliente_id, "cnome": nome_cliente, "cnpj": cnpj,
            "obr": req.obrigacao_nome, "mes": mes_ref,
            "ano": ano_str, "mstr": mes_str,
            "narq": nome_safe, "gurl": gdrive_url, "gpath": gdrive_path,
            "wa": 1 if whatsapp_status == "enviado" else 0,
            "em": 1 if email_status == "enviado" else 0,
        })
        await db.commit()
    except Exception as e:
        erros.append(f"Histórico: {str(e)[:100]}")

    return ResultadoProcessamento(
        ok=len([e for e in erros if "GDrive" not in e or GDRIVE_ROOT_FOLDER]) == 0,
        cliente_nome=nome_cliente,
        entrega_id=entrega_id,
        gdrive_url=gdrive_url,
        gdrive_path=gdrive_path,
        whatsapp_status=whatsapp_status,
        email_status=email_status,
        erros=erros,
    )


@router.get("/historico")
async def listar_historico(db: AsyncSession = Depends(get_db), limite: int = 100):
    await init_tables(db)
    r = await db.execute(text(
        "SELECT * FROM automacao_historico ORDER BY criado_em DESC LIMIT :lim"
    ), {"lim": limite})
    return [dict(row) for row in r.mappings().fetchall()]


@router.get("/docs-empresa/{cliente_id}")
async def docs_por_empresa(cliente_id: int, db: AsyncSession = Depends(get_db)):
    """Retorna todos os documentos arquivados de um cliente, organizados por ano/mês."""
    await init_tables(db)
    r = await db.execute(text("""
        SELECT obrigacao, mes_ref, ano, mes, nome_arquivo, gdrive_url, gdrive_path,
               enviado_wa, enviado_email, criado_em
        FROM docs_obrigacoes
        WHERE cliente_id = :cid
        ORDER BY criado_em DESC
    """), {"cid": cliente_id})
    rows = [dict(row) for row in r.mappings().fetchall()]
    # Agrupar por ano/mês
    agrupado = {}
    for row in rows:
        chave = f"{row['ano']} / {row['mes']}"
        agrupado.setdefault(chave, []).append(row)
    return {"cliente_id": cliente_id, "total": len(rows), "agrupado": agrupado}


@router.post("/configurar-gdrive")
async def configurar_gdrive(cfg: ConfigGDrive):
    """
    Salva a configuração do Google Drive.
    Na prática, as variáveis de ambiente no Railway são:
    - GOOGLE_SERVICE_ACCOUNT_JSON: JSON da service account (minificado)
    - GDRIVE_ROOT_FOLDER_ID: ID da pasta raiz no Google Drive
    """
    # Validar o JSON da service account
    if cfg.service_account_json:
        try:
            info = json.loads(cfg.service_account_json)
            if "type" not in info or info.get("type") != "service_account":
                raise HTTPException(400, "JSON inválido: deve ser uma service_account")
        except json.JSONDecodeError:
            raise HTTPException(400, "JSON inválido")

    return {
        "ok": True,
        "instrucoes": [
            "1. No Railway → seu serviço backend → Variables",
            "2. Adicionar: GOOGLE_SERVICE_ACCOUNT_JSON = (cole o JSON da service account)",
            "3. Adicionar: GDRIVE_ROOT_FOLDER_ID = (ID da pasta raiz no Drive)",
            "4. Compartilhar a pasta raiz do Drive com o e-mail da service account",
            "5. Fazer redeploy do backend",
        ],
        "email_service_account": json.loads(cfg.service_account_json or "{}").get("client_email", "—"),
    }


@router.get("/status-integracao")
async def status_integracao():
    """Verifica quais integrações estão configuradas."""
    gdrive_ok = bool(os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON") and GDRIVE_ROOT_FOLDER)
    smtp_ok   = bool(SMTP_USER and SMTP_PASS)

    evo_ok = False
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get(
                f"{EVO_URL}/instance/connectionState/{EVO_INST}",
                headers={"apikey": EVO_KEY}
            )
            estado = r.json().get("instance", {}).get("state", "")
            evo_ok = estado in ("open", "connected")
    except Exception:
        pass

    return {
        "google_drive": {"ok": gdrive_ok, "pasta_raiz": GDRIVE_ROOT_FOLDER or "não configurado"},
        "email_smtp":   {"ok": smtp_ok,   "usuario": SMTP_USER or "não configurado"},
        "whatsapp":     {"ok": evo_ok,    "instancia": EVO_INST},
    }
