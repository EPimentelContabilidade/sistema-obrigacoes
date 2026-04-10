"""
Router: disparos.py
Disparo automático de obrigações via WhatsApp.
- Lê PDFs (PyMuPDF / pdfplumber) para extrair CNPJ, vencimento, valor
- Localiza o cliente pelo CNPJ
- Envia PDF + mensagem personalizada via Evolution API
- Registra histórico de disparos com status de entrega
"""

import os, re, json, base64, asyncio
from datetime import datetime
from typing import Optional, List
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from database import get_db
import httpx

router = APIRouter(prefix="/disparos", tags=["disparos"])

# ── Evolution API config ──────────────────────────────────────────────────────
EVO_URL  = os.getenv("EVOLUTION_API_URL",  "http://localhost:8080")
EVO_KEY  = os.getenv("EVOLUTION_API_KEY",  "epimentel-secret")
EVO_INST = os.getenv("EVOLUTION_INSTANCE", "epimentel")

def evo_headers():
    return {"apikey": EVO_KEY, "Content-Type": "application/json"}

def normalizar_tel(tel: str) -> str:
    n = re.sub(r"\D", "", tel or "")
    if not n.startswith("55"):
        n = "55" + n
    return n

# ── Schemas ───────────────────────────────────────────────────────────────────

class DisparoManual(BaseModel):
    cliente_id:    int
    telefone:      str
    mensagem:      str
    nome_arquivo:  Optional[str] = None
    base64_pdf:    Optional[str] = None
    template_id:   Optional[str] = None
    obrigacao_nome: Optional[str] = None

class TemplateMsg(BaseModel):
    id:        str
    nome:      str
    tipo:      str   # guia_mensal | lembrete | recibo | geral
    assunto:   str
    corpo:     str   # suporta {cliente_nome}, {obrigacao}, {vencimento}, {valor}, {mes_ref}
    ativo:     bool  = True

class DisparoLote(BaseModel):
    obrigacao_nome: str
    mes_ref:        str    # "Abril/2026"
    vencimento:     str    # "30/04/2026"
    template_id:    str
    clientes_ids:   List[int]
    base64_pdf:     Optional[str] = None
    nome_arquivo:   Optional[str] = None

# ── Templates padrão ──────────────────────────────────────────────────────────
TEMPLATES_PADRAO = [
    {
        "id": "guia_mensal",
        "nome": "Guia Mensal",
        "tipo": "guia_mensal",
        "assunto": "Guia {obrigacao} — {mes_ref}",
        "corpo": (
            "Olá, {cliente_nome}! 👋\n\n"
            "Segue em anexo a guia *{obrigacao}* referente a *{mes_ref}*.\n\n"
            "📅 Vencimento: *{vencimento}*\n"
            "💰 Valor: *{valor}*\n\n"
            "Qualquer dúvida, estamos à disposição.\n\n"
            "_EPimentel Auditoria & Contabilidade_"
        ),
        "ativo": True,
    },
    {
        "id": "lembrete_vencimento",
        "nome": "Lembrete de Vencimento",
        "tipo": "lembrete",
        "assunto": "⚠️ Lembrete — {obrigacao} vence amanhã",
        "corpo": (
            "Olá, {cliente_nome}! ⚠️\n\n"
            "Lembramos que a guia *{obrigacao}* vence *amanhã ({vencimento})*.\n\n"
            "Segue novamente o documento para facilitar o pagamento.\n\n"
            "_EPimentel Auditoria & Contabilidade_"
        ),
        "ativo": True,
    },
    {
        "id": "recibo_pagamento",
        "nome": "Recibo / Comprovante",
        "tipo": "recibo",
        "assunto": "Comprovante {obrigacao} — {mes_ref}",
        "corpo": (
            "Olá, {cliente_nome}! ✅\n\n"
            "Segue o comprovante de *{obrigacao}* referente a *{mes_ref}*.\n\n"
            "Guarde este documento para sua contabilidade.\n\n"
            "_EPimentel Auditoria & Contabilidade_"
        ),
        "ativo": True,
    },
    {
        "id": "folha_pagamento",
        "nome": "Folha de Pagamento",
        "tipo": "folha",
        "assunto": "Folha de Pagamento — {mes_ref}",
        "corpo": (
            "Olá, {cliente_nome}! 👥\n\n"
            "Segue a *Folha de Pagamento* de *{mes_ref}* para sua conferência.\n\n"
            "Após conferência, favor confirmar o recebimento respondendo esta mensagem.\n\n"
            "_EPimentel Auditoria & Contabilidade_"
        ),
        "ativo": True,
    },
    {
        "id": "construcao_obra",
        "nome": "Guias de Obra (CNO)",
        "tipo": "construcao",
        "assunto": "Guias {mes_ref} — Obra {obra}",
        "corpo": (
            "Olá, {cliente_nome}! 🏗️\n\n"
            "Segue em anexo as guias de *{mes_ref}* referentes à obra *{obra}*.\n\n"
            "📋 Obrigações incluídas: {obrigacao}\n"
            "📅 Vencimento: *{vencimento}*\n\n"
            "_EPimentel Auditoria & Contabilidade_"
        ),
        "ativo": True,
    },
    {
        "id": "certidao",
        "nome": "Certidão Negativa",
        "tipo": "certidao",
        "assunto": "Certidão {obrigacao}",
        "corpo": (
            "Olá, {cliente_nome}! 🏛️\n\n"
            "Segue em anexo a *{obrigacao}* solicitada.\n\n"
            "⚠️ Atenção: Este documento tem validade. Verifique a data de vencimento no PDF.\n\n"
            "_EPimentel Auditoria & Contabilidade_"
        ),
        "ativo": True,
    },
]

# ── Histórico de disparos (SQLite via raw SQL) ─────────────────────────────────

async def init_disparos_table(db: AsyncSession):
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS historico_disparos (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id    INTEGER,
            cliente_nome  TEXT,
            telefone      TEXT,
            obrigacao     TEXT,
            mes_ref       TEXT,
            template_id   TEXT,
            nome_arquivo  TEXT,
            mensagem      TEXT,
            status        TEXT DEFAULT 'enviado',
            erro          TEXT,
            criado_em     TEXT DEFAULT (datetime('now','localtime')),
            lida_em       TEXT
        )
    """))
    await db.commit()

# ── Extração de PDF ───────────────────────────────────────────────────────────

def extrair_dados_pdf(conteudo_bytes: bytes) -> dict:
    """
    Extrai CNPJ, vencimento, valor e tipo de obrigação do PDF.
    Tenta PyMuPDF primeiro, fallback para pdfplumber.
    """
    texto = ""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=conteudo_bytes, filetype="pdf")
        for page in doc:
            texto += page.get_text()
        doc.close()
    except Exception:
        try:
            import pdfplumber, io
            with pdfplumber.open(io.BytesIO(conteudo_bytes)) as pdf:
                for page in pdf.pages:
                    t = page.extract_text()
                    if t:
                        texto += t + "\n"
        except Exception:
            pass

    resultado = {
        "texto_extraido": texto[:500] if texto else "",
        "cnpj": None,
        "vencimento": None,
        "valor": None,
        "competencia": None,
        "tipo_obrigacao": None,
        "codigo_receita": None,
    }

    if not texto:
        return resultado

    # ── CNPJ ─────────────────────────────────────────────────────────────────
    m = re.search(r"\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2}", texto)
    if m:
        resultado["cnpj"] = re.sub(r"\s", "", m.group())

    # ── Vencimento ────────────────────────────────────────────────────────────
    padroes_venc = [
        r"(?:vencimento|data\s+de\s+vencimento|vence\s+em)[:\s]+(\d{2}[/.-]\d{2}[/.-]\d{4})",
        r"(\d{2}/\d{2}/\d{4})",
    ]
    for p in padroes_venc:
        m = re.search(p, texto, re.IGNORECASE)
        if m:
            resultado["vencimento"] = m.group(1)
            break

    # ── Valor ─────────────────────────────────────────────────────────────────
    padroes_val = [
        r"(?:valor\s+total|total\s+a\s+pagar|valor\s+principal|valor)[:\s]+R?\$?\s*([\d.,]+)",
        r"R\$\s*([\d.]+,\d{2})",
    ]
    for p in padroes_val:
        m = re.search(p, texto, re.IGNORECASE)
        if m:
            resultado["valor"] = "R$ " + m.group(1).strip()
            break

    # ── Competência ────────────────────────────────────────────────────────────
    m = re.search(r"(?:competência|período|pa)[:\s]+(\d{2}[/.-]\d{4}|\d{2}/\d{2}/\d{4})", texto, re.IGNORECASE)
    if m:
        resultado["competencia"] = m.group(1)

    # ── Tipo de obrigação ─────────────────────────────────────────────────────
    tipos = {
        "DAS": ["das", "simples nacional", "pgdas"],
        "DARF": ["darf", "irpj", "csll", "pis", "cofins", "irrf"],
        "DCTFWeb": ["dctfweb", "dctf web"],
        "FGTS": ["fgts", "grrf", "fundo de garantia"],
        "e-Social": ["esocial", "e-social"],
        "GPS/INSS": ["gps", "inss", "previdência"],
        "NFS-e": ["nfs-e", "nota fiscal de serviço", "nfse"],
        "DARF RET": ["ret", "regime especial"],
        "DIRF": ["dirf"],
        "EFD": ["efd", "sped"],
    }
    texto_lower = texto.lower()
    for tipo, palavras in tipos.items():
        if any(p in texto_lower for p in palavras):
            resultado["tipo_obrigacao"] = tipo
            break

    # ── Código de receita (DARF) ──────────────────────────────────────────────
    m = re.search(r"c[oó]digo\s+(?:de\s+)?receita[:\s]+(\d{4})", texto, re.IGNORECASE)
    if m:
        resultado["codigo_receita"] = m.group(1)

    return resultado


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/templates")
async def listar_templates():
    """Lista todos os templates de mensagem."""
    return TEMPLATES_PADRAO


@router.get("/historico")
async def listar_historico(db: AsyncSession = Depends(get_db), limite: int = 100):
    """Lista histórico de disparos recentes."""
    await init_disparos_table(db)
    r = await db.execute(text(
        "SELECT * FROM historico_disparos ORDER BY criado_em DESC LIMIT :lim"
    ), {"lim": limite})
    return [dict(row) for row in r.mappings().fetchall()]


@router.post("/ler-pdf")
async def ler_pdf(arquivo: UploadFile = File(...)):
    """
    Extrai dados de um PDF: CNPJ, vencimento, valor, tipo de obrigação.
    Retorna os dados para identificar o cliente automaticamente.
    """
    conteudo = await arquivo.read()
    if len(conteudo) > 30 * 1024 * 1024:
        raise HTTPException(400, "Arquivo muito grande. Máximo: 30 MB")
    dados = extrair_dados_pdf(conteudo)
    dados["nome_arquivo"] = arquivo.filename
    dados["tamanho"] = len(conteudo)
    return dados


@router.post("/ler-pdf-base64")
async def ler_pdf_base64(payload: dict):
    """Extrai dados de um PDF enviado em base64."""
    try:
        conteudo = base64.b64decode(payload.get("base64", ""))
    except Exception:
        raise HTTPException(400, "Base64 inválido")
    dados = extrair_dados_pdf(conteudo)
    dados["nome_arquivo"] = payload.get("nome_arquivo", "documento.pdf")
    return dados


@router.post("/enviar")
async def enviar_disparo(req: DisparoManual, db: AsyncSession = Depends(get_db)):
    """
    Envia um PDF + mensagem para um cliente via WhatsApp (Evolution API).
    Registra no histórico.
    """
    await init_disparos_table(db)

    # Buscar cliente no banco
    from models import Cliente
    result = await db.execute(select(Cliente).where(Cliente.id == req.cliente_id))
    cliente = result.scalar_one_or_none()
    cliente_nome = cliente.nome if cliente else "Cliente"

    numero = normalizar_tel(req.telefone)
    status_envio = "enviado"
    erro_msg = None

    try:
        async with httpx.AsyncClient(timeout=30) as c:
            if req.base64_pdf and req.nome_arquivo:
                # Enviar PDF
                payload = {
                    "number": numero,
                    "mediatype": "document",
                    "mimetype": "application/pdf",
                    "caption": req.mensagem,
                    "media": req.base64_pdf,
                    "fileName": req.nome_arquivo,
                }
                r = await c.post(
                    f"{EVO_URL}/message/sendMedia/{EVO_INST}",
                    headers=evo_headers(),
                    json=payload,
                )
            else:
                # Enviar só texto
                payload = {
                    "number": numero,
                    "text": req.mensagem,
                }
                r = await c.post(
                    f"{EVO_URL}/message/sendText/{EVO_INST}",
                    headers=evo_headers(),
                    json=payload,
                )

            if r.status_code not in (200, 201):
                status_envio = "erro"
                erro_msg = f"HTTP {r.status_code}: {r.text[:200]}"

    except Exception as e:
        status_envio = "erro"
        erro_msg = str(e)[:300]

    # Salvar histórico
    await db.execute(text("""
        INSERT INTO historico_disparos
            (cliente_id, cliente_nome, telefone, obrigacao, template_id, nome_arquivo, mensagem, status, erro)
        VALUES (:cid, :cnome, :tel, :obr, :tpl, :narq, :msg, :sts, :err)
    """), {
        "cid":  req.cliente_id,
        "cnome": cliente_nome,
        "tel":  numero,
        "obr":  req.obrigacao_nome or "",
        "tpl":  req.template_id or "",
        "narq": req.nome_arquivo or "",
        "msg":  req.mensagem[:500],
        "sts":  status_envio,
        "err":  erro_msg,
    })
    await db.commit()

    if status_envio == "erro":
        raise HTTPException(500, f"Erro ao enviar: {erro_msg}")

    return {"ok": True, "status": status_envio, "numero": numero, "cliente": cliente_nome}


@router.post("/enviar-lote")
async def enviar_lote(
    req: DisparoLote,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Dispara uma obrigação para múltiplos clientes em background.
    Retorna imediatamente com o número de disparos programados.
    """
    from models import Cliente
    await init_disparos_table(db)

    # Buscar clientes
    result = await db.execute(
        select(Cliente).where(Cliente.id.in_(req.clientes_ids))
    )
    clientes = result.scalars().all()

    # Localizar template
    tpl = next((t for t in TEMPLATES_PADRAO if t["id"] == req.template_id), TEMPLATES_PADRAO[0])

    agendados = []
    for cli in clientes:
        tel = cli.whatsapp or cli.whatsapp2 or cli.telefone
        if not tel:
            continue

        # Montar mensagem personalizada
        msg = tpl["corpo"].format(
            cliente_nome=cli.nome or "",
            obrigacao=req.obrigacao_nome,
            mes_ref=req.mes_ref,
            vencimento=req.vencimento,
            valor="—",
            obra="—",
        )

        background_tasks.add_task(
            _enviar_background,
            cli.id,
            cli.nome,
            tel,
            msg,
            req.obrigacao_nome,
            req.template_id,
            req.nome_arquivo,
            req.base64_pdf,
        )
        agendados.append(cli.id)

    return {
        "ok": True,
        "agendados": len(agendados),
        "pulados_sem_telefone": len(req.clientes_ids) - len(agendados),
    }


async def _enviar_background(
    cliente_id, cliente_nome, telefone, mensagem,
    obrigacao, template_id, nome_arquivo, base64_pdf
):
    """Função de background para envio em lote."""
    numero = normalizar_tel(telefone)
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            if base64_pdf and nome_arquivo:
                payload = {
                    "number": numero,
                    "mediatype": "document",
                    "mimetype": "application/pdf",
                    "caption": mensagem,
                    "media": base64_pdf,
                    "fileName": nome_arquivo,
                }
                await c.post(f"{EVO_URL}/message/sendMedia/{EVO_INST}", headers=evo_headers(), json=payload)
            else:
                await c.post(
                    f"{EVO_URL}/message/sendText/{EVO_INST}",
                    headers=evo_headers(),
                    json={"number": numero, "text": mensagem},
                )
    except Exception:
        pass
    await asyncio.sleep(1.5)  # Rate limit: 1.5s entre disparos


@router.put("/historico/{disparo_id}/lida")
async def marcar_lida(disparo_id: int, db: AsyncSession = Depends(get_db)):
    """Marca uma mensagem como lida pelo cliente."""
    await db.execute(text(
        "UPDATE historico_disparos SET status='lida', lida_em=datetime('now','localtime') WHERE id=:id"
    ), {"id": disparo_id})
    await db.commit()
    return {"ok": True}
