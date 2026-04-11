"""
Router: whatsapp_bot.py
Chatbot de autoatendimento via WhatsApp para clientes da EPimentel.

Fluxo:
  1. Cliente manda qualquer mensagem
  2. Sistema identifica pelo número de celular
  3. Exibe menu de opções
  4. Cliente escolhe → sistema busca e envia o PDF automaticamente

Estados da conversa (salvo em SQLite com TTL de 30 min):
  inicio      → menu principal
  menu_docs   → escolher tipo de documento
  menu_periodo→ escolher mês/ano
  aguardando  → aguardando resposta humana
"""

import os, re, json, asyncio
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from database import get_db
import httpx

router = APIRouter(prefix="/whatsapp-bot", tags=["whatsapp_bot"])

EVO_URL  = os.getenv("EVOLUTION_API_URL",  "http://localhost:8080")
EVO_KEY  = os.getenv("EVOLUTION_API_KEY",  "epimentel-secret")
EVO_INST = os.getenv("EVOLUTION_INSTANCE", "epimentel")

def evo_headers():
    return {"apikey": EVO_KEY, "Content-Type": "application/json"}

def limpar_tel(tel: str) -> str:
    n = re.sub(r"\D", "", tel or "")
    return ("55" + n) if not n.startswith("55") else n

# ── Banco de conversas ─────────────────────────────────────────────────────────

async def init_bot_tables(db: AsyncSession):
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS bot_sessoes (
            telefone    TEXT PRIMARY KEY,
            cliente_id  INTEGER,
            cliente_nome TEXT,
            estado      TEXT DEFAULT 'inicio',
            contexto    TEXT DEFAULT '{}',
            atualizado  TEXT DEFAULT (datetime('now','localtime'))
        )
    """))
    await db.commit()

async def get_sessao(db: AsyncSession, telefone: str) -> dict:
    await init_bot_tables(db)
    # Expirar sessões com mais de 30 min
    await db.execute(text("""
        UPDATE bot_sessoes SET estado='inicio', contexto='{}'
        WHERE telefone=:tel AND
        datetime(atualizado) < datetime('now','-30 minutes','localtime')
    """), {"tel": telefone})
    await db.commit()
    r = await db.execute(text("SELECT * FROM bot_sessoes WHERE telefone=:tel"), {"tel": telefone})
    row = r.mappings().fetchone()
    if row:
        return dict(row)
    return {"telefone": telefone, "cliente_id": None, "cliente_nome": None, "estado": "inicio", "contexto": "{}"}

async def salvar_sessao(db: AsyncSession, telefone: str, estado: str, ctx: dict, cliente_id: int = None, cliente_nome: str = None):
    await db.execute(text("""
        INSERT INTO bot_sessoes (telefone, cliente_id, cliente_nome, estado, contexto, atualizado)
        VALUES (:tel, :cid, :cnome, :est, :ctx, datetime('now','localtime'))
        ON CONFLICT(telefone) DO UPDATE SET
            cliente_id=:cid, cliente_nome=:cnome,
            estado=:est, contexto=:ctx,
            atualizado=datetime('now','localtime')
    """), {"tel": telefone, "cid": cliente_id, "cnome": cliente_nome, "est": estado, "ctx": json.dumps(ctx)})
    await db.commit()

# ── Identificar cliente pelo telefone ─────────────────────────────────────────

async def identificar_cliente_por_tel(db: AsyncSession, telefone: str):
    tel_limpo = re.sub(r"\D", "", telefone)
    # Tentar variações: com/sem DDI 55, com/sem DDD
    variacoes = {tel_limpo, tel_limpo[-11:] if len(tel_limpo) > 11 else tel_limpo,
                 tel_limpo[-10:] if len(tel_limpo) > 10 else tel_limpo}
    try:
        from models import Cliente
        r = await db.execute(select(Cliente).where(Cliente.ativo == True))
        for cli in r.scalars().all():
            for campo in [cli.whatsapp, cli.whatsapp2, cli.telefone]:
                if campo:
                    c = re.sub(r"\D", "", campo)
                    if c in variacoes or c[-11:] in variacoes or c[-10:] in variacoes:
                        return cli
    except Exception:
        pass
    return None

# ── Buscar documentos disponíveis do cliente ──────────────────────────────────

async def buscar_docs_cliente(db: AsyncSession, cliente_id: int, tipo_doc: str = None) -> list:
    try:
        query = "SELECT * FROM docs_obrigacoes WHERE cliente_id=:cid"
        params = {"cid": cliente_id}
        if tipo_doc:
            query += " AND obrigacao LIKE :tipo"
            params["tipo"] = f"%{tipo_doc}%"
        query += " ORDER BY ano DESC, mes DESC, criado_em DESC LIMIT 12"
        r = await db.execute(text(query), params)
        return [dict(row) for row in r.mappings().fetchall()]
    except Exception:
        return []

async def buscar_doc_por_id(db: AsyncSession, doc_id: int) -> Optional[dict]:
    try:
        r = await db.execute(text("SELECT * FROM docs_obrigacoes WHERE id=:id"), {"id": doc_id})
        row = r.mappings().fetchone()
        return dict(row) if row else None
    except Exception:
        return None

# ── Enviar mensagem via Evolution API ─────────────────────────────────────────

async def enviar_msg(telefone: str, texto: str):
    numero = limpar_tel(telefone)
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            await c.post(f"{EVO_URL}/message/sendText/{EVO_INST}",
                headers=evo_headers(),
                json={"number": numero, "text": texto})
    except Exception:
        pass

async def enviar_pdf(telefone: str, b64: str, nome_arquivo: str, legenda: str):
    numero = limpar_tel(telefone)
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            await c.post(f"{EVO_URL}/message/sendMedia/{EVO_INST}",
                headers=evo_headers(),
                json={"number": numero, "mediatype": "document", "mimetype": "application/pdf",
                      "caption": legenda, "media": b64, "fileName": nome_arquivo})
    except Exception:
        pass

# ── Lógica principal do chatbot ───────────────────────────────────────────────

SAUDACOES = {"oi","olá","ola","boa tarde","bom dia","boa noite","oi!","olá!","hey","menu","oi tudo bem"}

async def processar_mensagem(telefone: str, texto: str, db: AsyncSession):
    """Processa mensagem recebida e responde automaticamente."""
    texto_lower = texto.strip().lower()
    sessao = await get_sessao(db, telefone)
    estado = sessao.get("estado", "inicio")
    ctx = json.loads(sessao.get("contexto", "{}"))
    cliente_id = sessao.get("cliente_id")
    cliente_nome = sessao.get("cliente_nome")

    # ── Comandos globais ─────────────────────────────────────────────────────
    if texto_lower in ("0", "voltar", "menu", "início", "inicio", "cancelar"):
        await salvar_sessao(db, telefone, "inicio", {}, cliente_id, cliente_nome)
        estado = "inicio"
        texto_lower = "oi"  # Força exibir menu

    if texto_lower == "falar com contador" or texto_lower == "4":
        await enviar_msg(telefone,
            "👨‍💼 *Atendimento Humano*\n\n"
            "Sua mensagem foi encaminhada para nossa equipe.\n"
            "Em breve um contador entrará em contato.\n\n"
            "_EPimentel Auditoria & Contabilidade_")
        await salvar_sessao(db, telefone, "aguardando", {}, cliente_id, cliente_nome)
        return

    # ── Estado: INICIO / SAUDAÇÃO ────────────────────────────────────────────
    if estado == "inicio" or texto_lower in SAUDACOES or not cliente_id:

        # Identificar cliente pelo número
        cliente = await identificar_cliente_por_tel(db, telefone)
        if not cliente:
            await enviar_msg(telefone,
                "Olá! 👋\n\n"
                "Não encontrei seu número em nosso cadastro.\n"
                "Para acesso ao autoatendimento, entre em contato com nosso escritório.\n\n"
                "📞 Estamos à disposição!\n"
                "_EPimentel Auditoria & Contabilidade_")
            return

        cliente_id = cliente.id
        cliente_nome = cliente.nome
        await salvar_sessao(db, telefone, "menu_principal", {}, cliente_id, cliente_nome)

        # Contar documentos disponíveis
        docs = await buscar_docs_cliente(db, cliente_id)
        n_docs = len(docs)

        await enviar_msg(telefone,
            f"Olá, *{(cliente_nome or '').split()[0]}*! 👋\n\n"
            f"Bem-vindo ao autoatendimento da *EPimentel Auditoria & Contabilidade*.\n\n"
            f"📁 Você tem *{n_docs} documento(s)* disponível(eis).\n\n"
            "O que você precisa?\n\n"
            "1️⃣ — Guias e boletos recentes\n"
            "2️⃣ — Buscar documento específico\n"
            "3️⃣ — Documentos do mês atual\n"
            "4️⃣ — Falar com o contador\n\n"
            "_Responda com o número da opção desejada._")
        return

    # ── Estado: MENU PRINCIPAL ───────────────────────────────────────────────
    if estado == "menu_principal":
        docs = await buscar_docs_cliente(db, cliente_id)

        if texto_lower == "1":
            # Últimos 5 documentos
            if not docs:
                await enviar_msg(telefone, "Não há documentos cadastrados ainda.\nAguarde o envio pela nossa equipe. 📋")
                return
            lista = "\n".join([
                f"*{i+1}.* {d['obrigacao']} — {d.get('mes','?')}/{d.get('ano','?')}"
                for i, d in enumerate(docs[:8])
            ])
            ids_str = ",".join(str(d["id"]) for d in docs[:8])
            await salvar_sessao(db, telefone, "aguardando_escolha_doc", {"ids": ids_str, "docs": [{"id":d["id"],"obr":d["obrigacao"],"mes":d.get("mes",""),"ano":d.get("ano","")} for d in docs[:8]]}, cliente_id, cliente_nome)
            await enviar_msg(telefone,
                f"📋 *Documentos disponíveis:*\n\n{lista}\n\n"
                "Responda com o *número* do documento que deseja receber.\n"
                "_(0 para voltar ao menu)_")
            return

        elif texto_lower == "2":
            await salvar_sessao(db, telefone, "busca_livre", {}, cliente_id, cliente_nome)
            await enviar_msg(telefone,
                "🔍 *Busca de documento*\n\n"
                "Digite o nome ou parte do nome do documento que procura:\n"
                "_(Ex: DAS, DARF, e-Social, Folha, Certidão)_\n\n"
                "_(0 para voltar ao menu)_")
            return

        elif texto_lower == "3":
            agora = datetime.now()
            mes = f"{agora.month:02d}"
            docs_mes = await buscar_docs_cliente(db, cliente_id, None)
            docs_mes = [d for d in docs_mes if d.get("mes") == mes and d.get("ano") == str(agora.year)]
            if not docs_mes:
                await enviar_msg(telefone, f"Não há documentos de {agora.strftime('%B/%Y')} cadastrados ainda. 📭")
                return
            lista = "\n".join([f"*{i+1}.* {d['obrigacao']}" for i, d in enumerate(docs_mes[:8])])
            await salvar_sessao(db, telefone, "aguardando_escolha_doc", {"ids": ",".join(str(d["id"]) for d in docs_mes[:8]), "docs": [{"id":d["id"],"obr":d["obrigacao"],"mes":d.get("mes",""),"ano":d.get("ano","")} for d in docs_mes[:8]]}, cliente_id, cliente_nome)
            await enviar_msg(telefone,
                f"📂 *Documentos de {agora.strftime('%B/%Y')}:*\n\n{lista}\n\n"
                "Responda com o *número* para receber o PDF.\n_(0 para voltar)_")
            return

        else:
            await enviar_msg(telefone,
                "❓ Opção inválida. Por favor responda com *1*, *2*, *3* ou *4*.\n\n"
                "1️⃣ — Guias e boletos recentes\n"
                "2️⃣ — Buscar documento específico\n"
                "3️⃣ — Documentos do mês atual\n"
                "4️⃣ — Falar com o contador")
            return

    # ── Estado: AGUARDANDO ESCOLHA DE DOCUMENTO ───────────────────────────────
    if estado == "aguardando_escolha_doc":
        docs_ctx = ctx.get("docs", [])
        try:
            idx = int(texto_lower) - 1
            if 0 <= idx < len(docs_ctx):
                doc_info = docs_ctx[idx]
                doc = await buscar_doc_por_id(db, doc_info["id"])
                if doc and doc.get("conteudo_b64"):
                    await enviar_msg(telefone,
                        f"📎 Preparando *{doc['obrigacao']}* — {doc.get('mes','')}/{doc.get('ano','')}...\n"
                        "Aguarde um momento. ⏳")
                    nome_arq = doc.get("nome_arquivo") or f"{doc['obrigacao']}_{doc.get('mes','')}_{doc.get('ano','')}.pdf"
                    legenda = (
                        f"*{doc['obrigacao']}*\n"
                        f"📅 Referência: {doc.get('mes','')}/{doc.get('ano','')}\n"
                        f"_EPimentel Auditoria & Contabilidade_"
                    )
                    await enviar_pdf(telefone, doc["conteudo_b64"], nome_arq, legenda)
                    await salvar_sessao(db, telefone, "menu_principal", {}, cliente_id, cliente_nome)
                    await asyncio.sleep(1)
                    await enviar_msg(telefone,
                        "✅ Documento enviado!\n\n"
                        "Precisa de mais alguma coisa?\n\n"
                        "1️⃣ — Ver mais documentos\n"
                        "2️⃣ — Buscar outro documento\n"
                        "4️⃣ — Falar com o contador\n"
                        "0️⃣ — Encerrar")
                    return
                elif doc and doc.get("drive_url"):
                    await enviar_msg(telefone,
                        f"📎 *{doc['obrigacao']}* — {doc.get('mes','')}/{doc.get('ano','')}\n\n"
                        f"🔗 Acesse pelo link:\n{doc['drive_url']}\n\n"
                        "_EPimentel Auditoria & Contabilidade_")
                    await salvar_sessao(db, telefone, "menu_principal", {}, cliente_id, cliente_nome)
                    return
                else:
                    await enviar_msg(telefone, "⚠️ Arquivo não disponível no momento. Fale com nosso escritório.")
                    return
        except (ValueError, IndexError):
            pass
        await enviar_msg(telefone, "❓ Número inválido. Responda com o número do documento desejado.")
        return

    # ── Estado: BUSCA LIVRE ───────────────────────────────────────────────────
    if estado == "busca_livre":
        docs = await buscar_docs_cliente(db, cliente_id, texto)
        if not docs:
            await enviar_msg(telefone,
                f"🔍 Nenhum documento encontrado com *\"{texto}\"*.\n\n"
                "Tente com outro nome. _(0 para voltar ao menu)_")
            return
        lista = "\n".join([f"*{i+1}.* {d['obrigacao']} — {d.get('mes','?')}/{d.get('ano','?')}" for i, d in enumerate(docs[:8])])
        await salvar_sessao(db, telefone, "aguardando_escolha_doc",
                             {"ids": ",".join(str(d["id"]) for d in docs[:8]),
                              "docs": [{"id":d["id"],"obr":d["obrigacao"],"mes":d.get("mes",""),"ano":d.get("ano","")} for d in docs[:8]]},
                             cliente_id, cliente_nome)
        await enviar_msg(telefone,
            f"🔍 Encontrei *{len(docs[:8])}* resultado(s) para *\"{texto}\"*:\n\n{lista}\n\n"
            "Responda com o *número* para receber o PDF. _(0 para voltar)_")
        return

    # ── Estado: AGUARDANDO (transferido para humano) ──────────────────────────
    if estado == "aguardando":
        await enviar_msg(telefone,
            "⏳ Sua mensagem foi recebida.\nNossa equipe responderá em breve.\n\n"
            "_(0 para voltar ao menu automático)_")
        return

    # Fallback
    await salvar_sessao(db, telefone, "inicio", {}, None, None)
    await enviar_msg(telefone,
        "Olá! 👋 Digite *oi* para acessar o autoatendimento da EPimentel.")

# ── Endpoint que recebe chamada do webhook ────────────────────────────────────

class MsgWebhook(BaseModel):
    telefone: str
    mensagem: str

@router.post("/processar")
async def processar_msg_webhook(req: MsgWebhook, db: AsyncSession = Depends(get_db)):
    """Chamado pelo webhook da Evolution API ao receber mensagem."""
    await processar_mensagem(req.telefone, req.mensagem, db)
    return {"ok": True}

@router.get("/sessoes")
async def listar_sessoes(db: AsyncSession = Depends(get_db)):
    """Lista sessões ativas no bot."""
    try:
        await init_bot_tables(db)
        r = await db.execute(text("SELECT * FROM bot_sessoes ORDER BY atualizado DESC LIMIT 50"))
        return [dict(row) for row in r.mappings().fetchall()]
    except Exception:
        return []

@router.delete("/sessao/{telefone}")
async def resetar_sessao(telefone: str, db: AsyncSession = Depends(get_db)):
    """Reseta a sessão de um cliente (útil para testes)."""
    await db.execute(text("DELETE FROM bot_sessoes WHERE telefone=:tel"), {"tel": telefone})
    await db.commit()
    return {"ok": True, "telefone": telefone}
