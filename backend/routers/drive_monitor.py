"""
Router: drive_monitor.py
Monitora automaticamente a pasta "ENTRADA" no Google Drive a cada 10 minutos.

Fluxo:
  1. Funcionário externo (ou interno) coloca PDF na pasta "ENTRADA"
  2. Este monitor varre a pasta, pega arquivos novos
  3. Extrai CNPJ, vencimento, valor do PDF (PyMuPDF)
  4. Identifica o cliente pelo CNPJ
  5. Salva na estrutura organizada: CNPJ/Obrigação/Ano/Mês/
  6. Envia ao cliente via WA ou email
  7. Move o arquivo para "PROCESSADOS" ou "NÃO RECONHECIDOS"

Variáveis de ambiente necessárias:
  GOOGLE_DRIVE_FOLDER_ID         — ID da pasta raiz "EPimentel - Obrigações"
  GOOGLE_SERVICE_ACCOUNT_JSON    — JSON da Service Account
  EVOLUTION_API_URL / KEY / INST — Evolution API para WhatsApp
  GMAIL_USER / GMAIL_APP_PASSWORD — Gmail para email
"""

import os, re, json, base64, asyncio, io, logging
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from database import get_db

router = APIRouter(prefix="/drive-monitor", tags=["drive_monitor"])
logger = logging.getLogger("drive_monitor")

# ── Env vars ──────────────────────────────────────────────────────────────────
DRIVE_FOLDER_ID = os.getenv("GOOGLE_DRIVE_FOLDER_ID", "")
DRIVE_SA_JSON   = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
# Subpastas do Drive (criadas automaticamente na 1ª execução)
PASTA_ENTRADA      = "📥 ENTRADA"
PASTA_PROCESSADOS  = "✅ PROCESSADOS"
PASTA_NAO_RECONHEC = "⚠️ NÃO RECONHECIDOS"

# Controle de arquivos já processados (em memória + SQLite)
_processados_cache = set()

# ── Helpers Drive ─────────────────────────────────────────────────────────────

def drive_service():
    if not DRIVE_SA_JSON or not DRIVE_FOLDER_ID:
        return None
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        sa = json.loads(DRIVE_SA_JSON)
        creds = service_account.Credentials.from_service_account_info(
            sa, scopes=["https://www.googleapis.com/auth/drive"]
        )
        return build("drive", "v3", credentials=creds, cache_discovery=False)
    except Exception as e:
        logger.error(f"Drive auth error: {e}")
        return None

def buscar_ou_criar_pasta(svc, nome: str, parent_id: str) -> Optional[str]:
    q = f"mimeType='application/vnd.google-apps.folder' and name='{nome}' and '{parent_id}' in parents and trashed=false"
    r = svc.files().list(q=q, fields="files(id,name)").execute()
    if r.get("files"):
        return r["files"][0]["id"]
    meta = {"name": nome, "mimeType": "application/vnd.google-apps.folder", "parents": [parent_id]}
    return svc.files().create(body=meta, fields="id").execute()["id"]

def listar_arquivos_pasta(svc, pasta_id: str) -> List[dict]:
    """Lista PDFs na pasta ENTRADA."""
    q = f"'{pasta_id}' in parents and mimeType='application/pdf' and trashed=false"
    r = svc.files().list(q=q, fields="files(id,name,createdTime,size)", orderBy="createdTime").execute()
    return r.get("files", [])

def baixar_arquivo(svc, file_id: str) -> Optional[bytes]:
    """Baixa o conteúdo de um arquivo do Drive."""
    try:
        from googleapiclient.http import MediaIoBaseDownload
        buf = io.BytesIO()
        req = svc.files().get_media(fileId=file_id)
        dl = MediaIoBaseDownload(buf, req)
        done = False
        while not done:
            _, done = dl.next_chunk()
        return buf.getvalue()
    except Exception as e:
        logger.error(f"Erro ao baixar arquivo {file_id}: {e}")
        return None

def mover_arquivo(svc, file_id: str, pasta_dest_id: str, pasta_origem_id: str):
    """Move arquivo de uma pasta para outra no Drive."""
    try:
        svc.files().update(
            fileId=file_id,
            addParents=pasta_dest_id,
            removeParents=pasta_origem_id,
            fields="id"
        ).execute()
    except Exception as e:
        logger.error(f"Erro ao mover arquivo: {e}")

# ── Extração de dados do PDF ──────────────────────────────────────────────────

def extrair_dados_pdf(conteudo: bytes) -> dict:
    """Extrai CNPJ, vencimento, valor, tipo de obrigação do PDF."""
    texto = ""
    try:
        import fitz
        doc = fitz.open(stream=conteudo, filetype="pdf")
        for p in doc: texto += p.get_text()
        doc.close()
    except Exception:
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(conteudo)) as pdf:
                for p in pdf.pages:
                    t = p.extract_text()
                    if t: texto += t + "\n"
        except Exception: pass

    result = {"cnpj": None, "vencimento": None, "valor": None,
              "competencia": None, "tipo_obrigacao": None, "texto": texto[:300]}

    if not texto: return result

    # CNPJ
    m = re.search(r"\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2}", texto)
    if m: result["cnpj"] = re.sub(r"\s", "", m.group())

    # Vencimento
    for p in [r"(?:vencimento|vence)[:\s]+(\d{2}/\d{2}/\d{4})", r"(\d{2}/\d{2}/\d{4})"]:
        m = re.search(p, texto, re.IGNORECASE)
        if m: result["vencimento"] = m.group(1); break

    # Valor
    for p in [r"(?:valor\s+total|total)[:\s]+R?\$?\s*([\d.,]+)", r"R\$\s*([\d.]+,\d{2})"]:
        m = re.search(p, texto, re.IGNORECASE)
        if m: result["valor"] = "R$ " + m.group(1); break

    # Competência
    m = re.search(r"(?:competência|período)[:\s]+(\d{2}/\d{4}|\d{2}/\d{2}/\d{4})", texto, re.IGNORECASE)
    if m: result["competencia"] = m.group(1)

    # Tipo de obrigação
    tipos = {
        "DAS": ["das", "simples nacional", "pgdas"],
        "DARF": ["darf", "irpj", "csll", "pis", "cofins", "irrf"],
        "DCTFWeb": ["dctfweb"], "FGTS": ["fgts", "grrf"],
        "e-Social": ["esocial", "e-social"], "GPS/INSS": ["gps", "inss"],
        "NFS-e": ["nfs-e", "nfse"], "DARF RET": ["ret"],
        "EFD": ["efd", "sped"], "DIRF": ["dirf"],
    }
    tl = texto.lower()
    for tipo, kws in tipos.items():
        if any(k in tl for k in kws):
            result["tipo_obrigacao"] = tipo; break

    return result

# ── Identificar cliente pelo CNPJ ─────────────────────────────────────────────

async def identificar_cliente(cnpj: str, db: AsyncSession):
    if not cnpj: return None
    cnpj_limpo = re.sub(r"\D", "", cnpj)
    try:
        from models import Cliente
        from sqlalchemy import select
        r = await db.execute(select(Cliente))
        for c in r.scalars().all():
            if re.sub(r"\D", "", c.cnpj or "") == cnpj_limpo:
                return c
    except Exception: pass
    return None

# ── Salvar tabela de controle ─────────────────────────────────────────────────

async def registrar_processamento(db: AsyncSession, file_id: str, nome: str,
                                   cnpj: str, obrigacao: str, cliente_nome: str,
                                   status: str, drive_url: str = ""):
    try:
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS drive_monitor_log (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                file_id     TEXT UNIQUE,
                nome        TEXT,
                cnpj        TEXT,
                obrigacao   TEXT,
                cliente     TEXT,
                status      TEXT,
                drive_url   TEXT,
                processado_em TEXT DEFAULT (datetime('now','localtime'))
            )
        """))
        await db.execute(text("""
            INSERT OR REPLACE INTO drive_monitor_log
                (file_id, nome, cnpj, obrigacao, cliente, status, drive_url)
            VALUES (:fid, :nome, :cnpj, :obr, :cli, :sts, :durl)
        """), {"fid":file_id,"nome":nome,"cnpj":cnpj,"obr":obrigacao,
               "cli":cliente_nome,"sts":status,"durl":drive_url})
        await db.commit()
    except Exception: pass

# ── Processar UM arquivo ──────────────────────────────────────────────────────

async def processar_arquivo(svc, arquivo: dict, pasta_entrada_id: str,
                             pasta_proc_id: str, pasta_nrec_id: str, db: AsyncSession):
    fid   = arquivo["id"]
    nome  = arquivo["name"]
    logger.info(f"Processando: {nome}")

    if fid in _processados_cache:
        return {"status": "ignorado", "nome": nome}

    # Baixar
    conteudo = baixar_arquivo(svc, fid)
    if not conteudo:
        return {"status": "erro_download", "nome": nome}

    # Extrair dados
    dados = extrair_dados_pdf(conteudo)
    b64   = base64.b64encode(conteudo).decode()

    # Identificar cliente
    cliente = await identificar_cliente(dados.get("cnpj"), db)

    if not cliente:
        # Mover para NÃO RECONHECIDOS
        mover_arquivo(svc, fid, pasta_nrec_id, pasta_entrada_id)
        await registrar_processamento(db, fid, nome, dados.get("cnpj","?"),
                                       dados.get("tipo_obrigacao","?"),
                                       "NÃO IDENTIFICADO", "nao_reconhecido")
        _processados_cache.add(fid)
        return {"status": "nao_reconhecido", "nome": nome, "cnpj": dados.get("cnpj")}

    # Definir ano/mês
    agora = datetime.now()
    ano   = str(agora.year)
    mes   = f"{agora.month:02d}"
    obr   = dados.get("tipo_obrigacao") or "Obrigação"

    # Salvar no Drive organizado
    drive_url = None
    try:
        from routers.entrega_auto import salvar_no_drive
        drive_url = salvar_no_drive(b64, nome, cliente.cnpj or "", obr, ano, mes)
    except Exception: pass

    # Salvar no SQLite
    try:
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS docs_obrigacoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_id INTEGER, cnpj TEXT, obrigacao TEXT,
                ano TEXT, mes TEXT, nome_arquivo TEXT,
                conteudo_b64 TEXT, drive_url TEXT,
                criado_em TEXT DEFAULT (datetime('now','localtime'))
            )
        """))
        await db.execute(text("""
            INSERT INTO docs_obrigacoes (cliente_id,cnpj,obrigacao,ano,mes,nome_arquivo,conteudo_b64,drive_url)
            VALUES (:cid,:cnpj,:obr,:ano,:mes,:narq,:b64,:durl)
        """), {"cid":cliente.id,"cnpj":cliente.cnpj,"obr":obr,"ano":ano,"mes":mes,
               "narq":nome,"b64":b64,"durl":drive_url or ""})
        await db.commit()
    except Exception: pass

    # Criar Entrega
    try:
        from routers.entrega_auto import criar_entrega
        competencia = dados.get("competencia") or f"{mes}/{ano}"
        await criar_entrega(db, cliente.id, obr, competencia, 0, drive_url or "")
    except Exception: pass

    # Enviar ao cliente
    canal = cliente.canal_preferido or "whatsapp"
    enviado = False
    mensagem = (
        f"Olá, {cliente.nome}! 👋\n\n"
        f"Segue em anexo *{obr}* referente a *{dados.get('competencia','este mês')}*.\n\n"
        f"📅 Vencimento: *{dados.get('vencimento','—')}*\n"
        f"💰 Valor: *{dados.get('valor','—')}*\n\n"
        "_EPimentel Auditoria & Contabilidade_"
    )
    try:
        if canal in ("whatsapp","ambos"):
            from routers.entrega_auto import enviar_whatsapp
            tel = cliente.whatsapp or cliente.whatsapp2 or cliente.telefone
            if tel:
                enviado = await enviar_whatsapp(tel, mensagem, b64, nome)
        if canal in ("email","ambos"):
            from routers.entrega_auto import enviar_email
            email = cliente.email or cliente.email2
            if email:
                enviado = await enviar_email(email, f"{obr} | EPimentel", mensagem, b64, nome)
    except Exception: pass

    # Mover para PROCESSADOS
    mover_arquivo(svc, fid, pasta_proc_id, pasta_entrada_id)
    _processados_cache.add(fid)

    await registrar_processamento(db, fid, nome, cliente.cnpj or "",
                                   obr, cliente.nome,
                                   "enviado" if enviado else "processado_sem_envio",
                                   drive_url or "")

    return {
        "status": "ok",
        "nome": nome,
        "cliente": cliente.nome,
        "obrigacao": obr,
        "enviado": enviado,
        "canal": canal,
        "drive_url": drive_url,
    }

# ── Varredura da pasta ENTRADA ────────────────────────────────────────────────

async def varrer_pasta_entrada(db: AsyncSession):
    """Função principal chamada pelo scheduler a cada 10 minutos."""
    svc = drive_service()
    if not svc:
        logger.warning("Drive não configurado — varredura ignorada")
        return []

    try:
        # Garantir subpastas existem
        p_entrada  = buscar_ou_criar_pasta(svc, PASTA_ENTRADA,      DRIVE_FOLDER_ID)
        p_proc     = buscar_ou_criar_pasta(svc, PASTA_PROCESSADOS,   DRIVE_FOLDER_ID)
        p_nrec     = buscar_ou_criar_pasta(svc, PASTA_NAO_RECONHEC,  DRIVE_FOLDER_ID)

        arquivos = listar_arquivos_pasta(svc, p_entrada)
        if not arquivos:
            return []

        resultados = []
        for arq in arquivos:
            r = await processar_arquivo(svc, arq, p_entrada, p_proc, p_nrec, db)
            resultados.append(r)
            await asyncio.sleep(2)  # Delay entre processamentos

        return resultados

    except Exception as e:
        logger.error(f"Erro na varredura: {e}")
        return []

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/varrer")
async def varrer_agora(db: AsyncSession = Depends(get_db)):
    """Dispara a varredura da pasta ENTRADA manualmente."""
    resultados = await varrer_pasta_entrada(db)
    total_ok   = sum(1 for r in resultados if r.get("status") == "ok")
    total_nrec = sum(1 for r in resultados if r.get("status") == "nao_reconhecido")
    return {
        "ok": True,
        "total": len(resultados),
        "processados": total_ok,
        "nao_reconhecidos": total_nrec,
        "detalhes": resultados,
    }


@router.get("/status")
async def status_monitor(db: AsyncSession = Depends(get_db)):
    """Retorna status do monitor e os últimos processamentos."""
    drive_ok = drive_service() is not None
    try:
        r = await db.execute(text("""
            SELECT * FROM drive_monitor_log
            ORDER BY processado_em DESC LIMIT 20
        """))
        historico = [dict(row) for row in r.mappings().fetchall()]
    except Exception:
        historico = []

    return {
        "drive_configurado": drive_ok,
        "pasta_raiz_id": DRIVE_FOLDER_ID or "não configurada",
        "subpastas": {
            "entrada":          PASTA_ENTRADA,
            "processados":      PASTA_PROCESSADOS,
            "nao_reconhecidos": PASTA_NAO_RECONHEC,
        },
        "ultimo_processamento": historico[0].get("processado_em") if historico else None,
        "historico": historico,
    }


@router.get("/log")
async def log_processamentos(db: AsyncSession = Depends(get_db)):
    """Lista log completo de processamentos."""
    try:
        r = await db.execute(text("""
            SELECT * FROM drive_monitor_log ORDER BY processado_em DESC LIMIT 100
        """))
        return [dict(row) for row in r.mappings().fetchall()]
    except Exception:
        return []
