"""
Router: financeiro.py — Módulo Financeiro Completo
Contas a Pagar/Receber, Bancos, Fornecedores (CNPJ lookup), Centros de Custo, Relatórios, IA Claude
"""
import os, re, json, asyncio
from datetime import datetime, timedelta, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from database import get_db
import httpx, aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

router = APIRouter(prefix="/financeiro", tags=["Financeiro"])

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

CATEGORIAS_PAGAR = {
    "Impostos e Tributos": ["DAS","GPS/INSS","FGTS","DARF","ISS","ICMS","IRPJ","CSLL","PIS","COFINS","Outros Tributos"],
    "Pessoal":             ["Salários","Pró-labore","Férias","13º Salário","INSS Patronal","FGTS Folha","Rescisão"],
    "Fornecedores":        ["Contabilidade","Advocacia","TI/Tecnologia","Aluguel","Água","Energia","Internet","Telefone","Outros Serviços"],
    "Administrativo":      ["Material de Escritório","Manutenção","Seguro","Viagens","Representação","Outros"],
    "Financeiro":          ["Empréstimos","Financiamentos","Tarifas Bancárias","IOF","Outros Financeiros"],
}
CATEGORIAS_RECEBER = {
    "Honorários":          ["Honorários Mensais","Assessoria Avulsa","Consultoria","Auditoria"],
    "Serviços Avulsos":    ["Abertura de Empresa","Alteração Contratual","Declaração IR","Certidões","Parcelamentos","Regularização"],
    "Reembolsos":          ["Reembolso de Taxas","Reembolso de Despesas"],
    "Outros":              ["Juros Recebidos","Aluguel Recebido","Outros"],
}
FORMAS_PAGAMENTO = ["PIX","Boleto","TED/DOC","Cartão de Crédito","Cartão de Débito","Dinheiro","Cheque","Débito Automático"]

# ── Tabelas ───────────────────────────────────────────────────────────────────
async def init_tables(db: AsyncSession):
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS fin_bancos (
            id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, banco TEXT, agencia TEXT, conta TEXT,
            tipo TEXT DEFAULT 'Conta Corrente', saldo_inicial REAL DEFAULT 0, saldo_atual REAL DEFAULT 0,
            ativo INTEGER DEFAULT 1, cor TEXT DEFAULT '#1D6FA4', observacoes TEXT,
            criado_em TEXT DEFAULT (datetime('now','localtime'))
        )"""))
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS fin_centros_custo (
            id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, codigo TEXT, descricao TEXT,
            tipo TEXT DEFAULT 'Despesa', ativo INTEGER DEFAULT 1,
            criado_em TEXT DEFAULT (datetime('now','localtime'))
        )"""))
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS fin_fornecedores (
            id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, cnpj TEXT, cpf TEXT,
            email TEXT, telefone TEXT, whatsapp TEXT, endereco TEXT, cidade TEXT, uf TEXT,
            categoria TEXT, banco TEXT, agencia TEXT, conta TEXT, tipo_conta TEXT, pix TEXT,
            ativo INTEGER DEFAULT 1, observacoes TEXT,
            criado_em TEXT DEFAULT (datetime('now','localtime'))
        )"""))
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS fin_contas_pagar (
            id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, fornecedor_id INTEGER,
            fornecedor_nome TEXT, categoria TEXT, subcategoria TEXT,
            banco_id INTEGER, centro_custo_id INTEGER, cliente_id INTEGER,
            valor REAL DEFAULT 0, valor_pago REAL DEFAULT 0, desconto REAL DEFAULT 0, multa REAL DEFAULT 0,
            forma_pagamento TEXT, numero_documento TEXT, codigo_barras TEXT, pix_copia_cola TEXT,
            data_emissao TEXT, data_vencimento TEXT, data_pagamento TEXT,
            parcela_atual INTEGER DEFAULT 1, total_parcelas INTEGER DEFAULT 1,
            status TEXT DEFAULT 'pendente', recorrente INTEGER DEFAULT 0, dia_recorrencia INTEGER,
            observacoes TEXT, comprovante_b64 TEXT, alerta_ia TEXT,
            email_aviso TEXT, whatsapp_aviso TEXT, dias_antecedencia INTEGER DEFAULT 3,
            criado_em TEXT DEFAULT (datetime('now','localtime')),
            atualizado_em TEXT DEFAULT (datetime('now','localtime'))
        )"""))
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS fin_contas_receber (
            id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, cliente_id INTEGER,
            cliente_nome TEXT, categoria TEXT, subcategoria TEXT,
            banco_id INTEGER, centro_custo_id INTEGER,
            valor REAL DEFAULT 0, valor_recebido REAL DEFAULT 0, desconto REAL DEFAULT 0, juros REAL DEFAULT 0,
            forma_recebimento TEXT, numero_documento TEXT, chave_pix TEXT,
            data_emissao TEXT, data_vencimento TEXT, data_recebimento TEXT,
            parcela_atual INTEGER DEFAULT 1, total_parcelas INTEGER DEFAULT 1,
            status TEXT DEFAULT 'pendente', recorrente INTEGER DEFAULT 0, dia_recorrencia INTEGER,
            observacoes TEXT, comprovante_b64 TEXT, alerta_ia TEXT,
            email_aviso TEXT, whatsapp_aviso TEXT, dias_antecedencia INTEGER DEFAULT 3,
            criado_em TEXT DEFAULT (datetime('now','localtime')),
            atualizado_em TEXT DEFAULT (datetime('now','localtime'))
        )"""))
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS fin_movimentacoes_banco (
            id INTEGER PRIMARY KEY AUTOINCREMENT, banco_id INTEGER, tipo TEXT,
            descricao TEXT, valor REAL, saldo_apos REAL, data TEXT,
            conta_pagar_id INTEGER, conta_receber_id INTEGER,
            criado_em TEXT DEFAULT (datetime('now','localtime'))
        )"""))
    await db.commit()

# ── Schemas ───────────────────────────────────────────────────────────────────
class BancoCadastro(BaseModel):
    nome: str; banco: str = ""; agencia: str = ""; conta: str = ""; tipo: str = "Conta Corrente"
    saldo_inicial: float = 0; cor: str = "#1D6FA4"; observacoes: str = ""

class CentroCustoCadastro(BaseModel):
    nome: str; codigo: str = ""; descricao: str = ""; tipo: str = "Despesa"

class FornecedorCadastro(BaseModel):
    nome: str; cnpj: str = ""; cpf: str = ""; email: str = ""; telefone: str = ""
    whatsapp: str = ""; endereco: str = ""; cidade: str = ""; uf: str = "GO"
    categoria: str = ""; banco: str = ""; agencia: str = ""; conta: str = ""
    tipo_conta: str = "Corrente"; pix: str = ""; observacoes: str = ""

class ContaPagar(BaseModel):
    descricao: str; fornecedor_id: Optional[int] = None; fornecedor_nome: str = ""
    categoria: str = ""; subcategoria: str = ""; banco_id: Optional[int] = None
    centro_custo_id: Optional[int] = None; cliente_id: Optional[int] = None
    valor: float = 0; desconto: float = 0; forma_pagamento: str = "PIX"
    numero_documento: str = ""; codigo_barras: str = ""; pix_copia_cola: str = ""
    data_emissao: str = ""; data_vencimento: str = ""; parcela_atual: int = 1; total_parcelas: int = 1
    status: str = "pendente"; recorrente: bool = False; dia_recorrencia: Optional[int] = None
    observacoes: str = ""; email_aviso: str = ""; whatsapp_aviso: str = ""; dias_antecedencia: int = 3

class ContaReceber(BaseModel):
    descricao: str; cliente_id: Optional[int] = None; cliente_nome: str = ""
    categoria: str = ""; subcategoria: str = ""; banco_id: Optional[int] = None
    centro_custo_id: Optional[int] = None
    valor: float = 0; desconto: float = 0; forma_recebimento: str = "PIX"
    numero_documento: str = ""; chave_pix: str = ""
    data_emissao: str = ""; data_vencimento: str = ""; parcela_atual: int = 1; total_parcelas: int = 1
    status: str = "pendente"; recorrente: bool = False; dia_recorrencia: Optional[int] = None
    observacoes: str = ""; email_aviso: str = ""; whatsapp_aviso: str = ""; dias_antecedencia: int = 3

class PagamentoRegistro(BaseModel):
    conta_id: int; tipo: str  # pagar | receber
    valor_pago: float; data_pagamento: str; forma_pagamento: str = "PIX"
    banco_id: Optional[int] = None; comprovante_b64: str = ""; observacoes: str = ""

# ── IA Claude ─────────────────────────────────────────────────────────────────
async def gerar_alerta_ia(tipo: str, item: dict, dias: int) -> str:
    if not ANTHROPIC_KEY:
        emoji = "🚨" if dias < 0 else ("⏰" if dias <= 3 else "📋")
        return f"{emoji} {'VENCIDO há' if dias<0 else 'Vence em'} {abs(dias)} dia(s): {item.get('descricao','')} — R$ {item.get('valor',0):,.2f}"
    try:
        prompt = (
            f"Gere alerta financeiro profissional (3 linhas, emojis) para escritório contábil:\n"
            f"Tipo: {'Conta a Pagar' if tipo=='pagar' else 'Conta a Receber'}\n"
            f"Descrição: {item.get('descricao','')}\n"
            f"Valor: R$ {item.get('valor',0):,.2f}\n"
            f"Vencimento: {item.get('data_vencimento','')}\n"
            f"{'Dias em atraso' if dias<0 else 'Dias até vencer'}: {abs(dias)}\n"
            f"Fornecedor/Cliente: {item.get('fornecedor_nome') or item.get('cliente_nome','')}\n"
            f"Gere alerta curto, direto, com orientação de ação imediata."
        )
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post("https://api.anthropic.com/v1/messages",
                headers={"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
                json={"model": "claude-haiku-4-5-20251001", "max_tokens": 200,
                      "messages": [{"role": "user", "content": prompt}]})
            return r.json().get("content", [{}])[0].get("text", "")
    except:
        return f"⏰ Atenção: {item.get('descricao','')} — R$ {item.get('valor',0):,.2f} — vencimento {item.get('data_vencimento','')}"

async def enviar_alerta(email: str, wa: str, assunto: str, texto: str):
    u = SMTP_USER or GMAIL_USER; pw = SMTP_PASS or GMAIL_PASS
    if email and u and pw:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = assunto; msg["From"] = f"{SMTP_FROM} <{u}>"; msg["To"] = email
            msg.attach(MIMEText(f"<div style='font-family:Arial;'>{texto.replace(chr(10),'<br>')}</div>", "html", "utf-8"))
            async with aiosmtplib.SMTP(hostname=SMTP_HOST, port=SMTP_PORT, use_tls=False) as s:
                await s.starttls(); await s.login(u, pw); await s.send_message(msg)
        except: pass
    if wa and EVO_URL:
        n = re.sub(r"\D","",wa); num=("55"+n) if not n.startswith("55") else n
        try:
            async with httpx.AsyncClient(timeout=10) as c:
                await c.post(f"{EVO_URL}/message/sendText/{EVO_INST}",
                    headers={"apikey":EVO_KEY,"Content-Type":"application/json"},
                    json={"number":num,"text":texto})
        except: pass

# ── CNPJ Lookup ───────────────────────────────────────────────────────────────
@router.get("/fornecedores/cnpj/{cnpj}")
async def buscar_cnpj(cnpj: str):
    c = re.sub(r"\D","",cnpj)
    if len(c) != 14: raise HTTPException(400, "CNPJ inválido")
    try:
        async with httpx.AsyncClient(timeout=15) as h:
            r = await h.get(f"https://brasilapi.com.br/api/cnpj/v1/{c}")
            if r.status_code == 200:
                d = r.json()
                return {"nome": d.get("razao_social",""), "cnpj": cnpj,
                    "email": d.get("email",""), "telefone": d.get("ddd_telefone_1",""),
                    "endereco": f"{d.get('descricao_tipo_de_logradouro','')} {d.get('logradouro','')} {d.get('numero','')}".strip(),
                    "cidade": d.get("municipio",""), "uf": d.get("uf",""),
                    "situacao": d.get("descricao_situacao_cadastral",""), "atividade": d.get("cnae_fiscal_descricao",""),
                    "abertura": d.get("data_inicio_atividade","")}
    except: pass
    raise HTTPException(404, "CNPJ não encontrado na Receita Federal")

# ── Bancos ────────────────────────────────────────────────────────────────────
@router.get("/bancos")
async def listar_bancos(db: AsyncSession = Depends(get_db)):
    await init_tables(db)
    r = await db.execute(text("SELECT * FROM fin_bancos WHERE ativo=1 ORDER BY nome"))
    return [dict(x) for x in r.mappings().fetchall()]

@router.post("/bancos")
async def criar_banco(p: BancoCadastro, db: AsyncSession = Depends(get_db)):
    await init_tables(db)
    await db.execute(text("INSERT INTO fin_bancos (nome,banco,agencia,conta,tipo,saldo_inicial,saldo_atual,cor,observacoes) VALUES (:nome,:banco,:ag,:conta,:tipo,:si,:sa,:cor,:obs)"),
        {"nome":p.nome,"banco":p.banco,"ag":p.agencia,"conta":p.conta,"tipo":p.tipo,"si":p.saldo_inicial,"sa":p.saldo_inicial,"cor":p.cor,"obs":p.observacoes})
    await db.commit()
    return {"ok":True}

@router.delete("/bancos/{id}")
async def excluir_banco(id: int, db: AsyncSession = Depends(get_db)):
    await db.execute(text("UPDATE fin_bancos SET ativo=0 WHERE id=:id"), {"id":id}); await db.commit(); return {"ok":True}

# ── Centros de Custo ──────────────────────────────────────────────────────────
@router.get("/centros-custo")
async def listar_centros(db: AsyncSession = Depends(get_db)):
    await init_tables(db)
    r = await db.execute(text("SELECT * FROM fin_centros_custo WHERE ativo=1 ORDER BY nome"))
    return [dict(x) for x in r.mappings().fetchall()]

@router.post("/centros-custo")
async def criar_centro(p: CentroCustoCadastro, db: AsyncSession = Depends(get_db)):
    await init_tables(db)
    await db.execute(text("INSERT INTO fin_centros_custo (nome,codigo,descricao,tipo) VALUES (:n,:c,:d,:t)"), {"n":p.nome,"c":p.codigo,"d":p.descricao,"t":p.tipo})
    await db.commit(); return {"ok":True}

@router.delete("/centros-custo/{id}")
async def excluir_centro(id: int, db: AsyncSession = Depends(get_db)):
    await db.execute(text("UPDATE fin_centros_custo SET ativo=0 WHERE id=:id"), {"id":id}); await db.commit(); return {"ok":True}

# ── Fornecedores ──────────────────────────────────────────────────────────────
@router.get("/fornecedores")
async def listar_fornecedores(db: AsyncSession = Depends(get_db)):
    await init_tables(db)
    r = await db.execute(text("SELECT * FROM fin_fornecedores WHERE ativo=1 ORDER BY nome"))
    return [dict(x) for x in r.mappings().fetchall()]

@router.post("/fornecedores")
async def criar_fornecedor(p: FornecedorCadastro, db: AsyncSession = Depends(get_db)):
    await init_tables(db)
    await db.execute(text("""INSERT INTO fin_fornecedores (nome,cnpj,cpf,email,telefone,whatsapp,endereco,cidade,uf,categoria,banco,agencia,conta,tipo_conta,pix,observacoes)
        VALUES (:nome,:cnpj,:cpf,:email,:tel,:wa,:end,:cid,:uf,:cat,:banco,:ag,:conta,:tc,:pix,:obs)"""),
        {"nome":p.nome,"cnpj":p.cnpj,"cpf":p.cpf,"email":p.email,"tel":p.telefone,"wa":p.whatsapp,
         "end":p.endereco,"cid":p.cidade,"uf":p.uf,"cat":p.categoria,"banco":p.banco,"ag":p.agencia,
         "conta":p.conta,"tc":p.tipo_conta,"pix":p.pix,"obs":p.observacoes})
    await db.commit(); return {"ok":True}

@router.delete("/fornecedores/{id}")
async def excluir_fornecedor(id: int, db: AsyncSession = Depends(get_db)):
    await db.execute(text("UPDATE fin_fornecedores SET ativo=0 WHERE id=:id"), {"id":id}); await db.commit(); return {"ok":True}

# ── Contas a Pagar ────────────────────────────────────────────────────────────
@router.get("/contas-pagar")
async def listar_pagar(mes: int=None, ano: int=None, status: str=None, banco_id: int=None,
                        centro_id: int=None, db: AsyncSession=Depends(get_db)):
    await init_tables(db)
    q = "SELECT * FROM fin_contas_pagar WHERE 1=1"
    params = {}
    if mes and ano: q += " AND strftime('%m/%Y',data_vencimento)=:my"; params["my"]=f"{mes:02d}/{ano}"
    elif ano:       q += " AND strftime('%Y',data_vencimento)=:ano"; params["ano"]=str(ano)
    if status:      q += " AND status=:sts"; params["sts"]=status
    if banco_id:    q += " AND banco_id=:bid"; params["bid"]=banco_id
    if centro_id:   q += " AND centro_custo_id=:cid"; params["cid"]=centro_id
    q += " ORDER BY data_vencimento ASC"
    r = await db.execute(text(q), params)
    rows = [dict(x) for x in r.mappings().fetchall()]
    agora = datetime.now()
    for row in rows:
        try:
            v = datetime.strptime(row["data_vencimento"], "%d/%m/%Y")
            row["dias_vencimento"] = (v-agora).days
            if row["dias_vencimento"]<0 and row["status"]=="pendente": row["status"]="vencido"
        except: row["dias_vencimento"]=None
    return rows

@router.post("/contas-pagar")
async def criar_pagar(p: ContaPagar, db: AsyncSession=Depends(get_db)):
    await init_tables(db)
    await db.execute(text("""INSERT INTO fin_contas_pagar
        (descricao,fornecedor_id,fornecedor_nome,categoria,subcategoria,banco_id,centro_custo_id,cliente_id,
         valor,desconto,forma_pagamento,numero_documento,codigo_barras,pix_copia_cola,
         data_emissao,data_vencimento,parcela_atual,total_parcelas,status,recorrente,dia_recorrencia,
         observacoes,email_aviso,whatsapp_aviso,dias_antecedencia)
        VALUES (:desc,:fid,:fnome,:cat,:sub,:bid,:cid,:clid,:val,:desc2,:fp,:ndoc,:cb,:pix,
                :dei,:dv,:pa,:tp,:sts,:rec,:diar,:obs,:email,:wa,:dias)"""),
        {"desc":p.descricao,"fid":p.fornecedor_id,"fnome":p.fornecedor_nome,"cat":p.categoria,"sub":p.subcategoria,
         "bid":p.banco_id,"cid":p.centro_custo_id,"clid":p.cliente_id,"val":p.valor,"desc2":p.desconto,
         "fp":p.forma_pagamento,"ndoc":p.numero_documento,"cb":p.codigo_barras,"pix":p.pix_copia_cola,
         "dei":p.data_emissao,"dv":p.data_vencimento,"pa":p.parcela_atual,"tp":p.total_parcelas,
         "sts":p.status,"rec":int(p.recorrente),"diar":p.dia_recorrencia,"obs":p.observacoes,
         "email":p.email_aviso,"wa":p.whatsapp_aviso,"dias":p.dias_antecedencia})
    await db.commit(); return {"ok":True}

@router.put("/contas-pagar/{id}")
async def atualizar_pagar(id: int, dados: dict, db: AsyncSession=Depends(get_db)):
    campos_ok = ["descricao","valor","data_vencimento","status","categoria","fornecedor_nome","forma_pagamento","observacoes","email_aviso","whatsapp_aviso"]
    sets = ", ".join(f"{c}=:{c}" for c in campos_ok if c in dados)
    if not sets: raise HTTPException(400,"Nada para atualizar")
    dados["id"]=id; dados["atualizado_em"]=datetime.now().isoformat()
    await db.execute(text(f"UPDATE fin_contas_pagar SET {sets},atualizado_em=:atualizado_em WHERE id=:id"), dados)
    await db.commit(); return {"ok":True}

@router.delete("/contas-pagar/{id}")
async def excluir_pagar(id: int, db: AsyncSession=Depends(get_db)):
    await db.execute(text("DELETE FROM fin_contas_pagar WHERE id=:id"),{"id":id}); await db.commit(); return {"ok":True}

# ── Contas a Receber ──────────────────────────────────────────────────────────
@router.get("/contas-receber")
async def listar_receber(mes: int=None, ano: int=None, status: str=None,
                          db: AsyncSession=Depends(get_db)):
    await init_tables(db)
    q = "SELECT * FROM fin_contas_receber WHERE 1=1"
    params={}
    if mes and ano: q+=" AND strftime('%m/%Y',data_vencimento)=:my"; params["my"]=f"{mes:02d}/{ano}"
    elif ano:       q+=" AND strftime('%Y',data_vencimento)=:ano"; params["ano"]=str(ano)
    if status:      q+=" AND status=:sts"; params["sts"]=status
    q+=" ORDER BY data_vencimento ASC"
    r=await db.execute(text(q),params)
    rows=[dict(x) for x in r.mappings().fetchall()]
    agora=datetime.now()
    for row in rows:
        try:
            v=datetime.strptime(row["data_vencimento"],"%d/%m/%Y"); row["dias_vencimento"]=(v-agora).days
            if row["dias_vencimento"]<0 and row["status"]=="pendente": row["status"]="vencido"
        except: row["dias_vencimento"]=None
    return rows

@router.post("/contas-receber")
async def criar_receber(p: ContaReceber, db: AsyncSession=Depends(get_db)):
    await init_tables(db)
    await db.execute(text("""INSERT INTO fin_contas_receber
        (descricao,cliente_id,cliente_nome,categoria,subcategoria,banco_id,centro_custo_id,
         valor,desconto,forma_recebimento,numero_documento,chave_pix,
         data_emissao,data_vencimento,parcela_atual,total_parcelas,status,recorrente,dia_recorrencia,
         observacoes,email_aviso,whatsapp_aviso,dias_antecedencia)
        VALUES (:desc,:clid,:cnome,:cat,:sub,:bid,:cid,:val,:desc2,:fr,:ndoc,:pix,
                :dei,:dv,:pa,:tp,:sts,:rec,:diar,:obs,:email,:wa,:dias)"""),
        {"desc":p.descricao,"clid":p.cliente_id,"cnome":p.cliente_nome,"cat":p.categoria,"sub":p.subcategoria,
         "bid":p.banco_id,"cid":p.centro_custo_id,"val":p.valor,"desc2":p.desconto,"fr":p.forma_recebimento,
         "ndoc":p.numero_documento,"pix":p.chave_pix,"dei":p.data_emissao,"dv":p.data_vencimento,
         "pa":p.parcela_atual,"tp":p.total_parcelas,"sts":p.status,"rec":int(p.recorrente),
         "diar":p.dia_recorrencia,"obs":p.observacoes,"email":p.email_aviso,"wa":p.whatsapp_aviso,"dias":p.dias_antecedencia})
    await db.commit(); return {"ok":True}

@router.put("/contas-receber/{id}")
async def atualizar_receber(id: int, dados: dict, db: AsyncSession=Depends(get_db)):
    campos_ok=["descricao","valor","data_vencimento","status","cliente_nome","forma_recebimento","observacoes","email_aviso","whatsapp_aviso"]
    sets=", ".join(f"{c}=:{c}" for c in campos_ok if c in dados)
    if not sets: raise HTTPException(400,"Nada para atualizar")
    dados["id"]=id; dados["atualizado_em"]=datetime.now().isoformat()
    await db.execute(text(f"UPDATE fin_contas_receber SET {sets},atualizado_em=:atualizado_em WHERE id=:id"),dados)
    await db.commit(); return {"ok":True}

@router.delete("/contas-receber/{id}")
async def excluir_receber(id: int, db: AsyncSession=Depends(get_db)):
    await db.execute(text("DELETE FROM fin_contas_receber WHERE id=:id"),{"id":id}); await db.commit(); return {"ok":True}

# ── Registrar Pagamento/Recebimento ──────────────────────────────────────────
@router.post("/registrar-pagamento")
async def registrar_pagamento(p: PagamentoRegistro, background: BackgroundTasks, db: AsyncSession=Depends(get_db)):
    agora = datetime.now().strftime("%d/%m/%Y")
    if p.tipo=="pagar":
        await db.execute(text("""UPDATE fin_contas_pagar SET status='pago',valor_pago=:vp,
            data_pagamento=:dp,forma_pagamento=:fp,comprovante_b64=:cb,atualizado_em=datetime('now','localtime')
            WHERE id=:id"""), {"vp":p.valor_pago,"dp":p.data_pagamento or agora,"fp":p.forma_pagamento,"cb":p.comprovante_b64,"id":p.conta_id})
        # Atualizar saldo do banco
        if p.banco_id:
            await db.execute(text("UPDATE fin_bancos SET saldo_atual=saldo_atual-:val WHERE id=:id"),{"val":p.valor_pago,"id":p.banco_id})
            await db.execute(text("INSERT INTO fin_movimentacoes_banco (banco_id,tipo,descricao,valor,data,conta_pagar_id) VALUES (:bid,'debito','Pagamento conta',:val,:dt,:cid)"),{"bid":p.banco_id,"val":p.valor_pago,"dt":agora,"cid":p.conta_id})
    else:
        await db.execute(text("""UPDATE fin_contas_receber SET status='recebido',valor_recebido=:vp,
            data_recebimento=:dp,forma_recebimento=:fp,comprovante_b64=:cb,atualizado_em=datetime('now','localtime')
            WHERE id=:id"""), {"vp":p.valor_pago,"dp":p.data_pagamento or agora,"fp":p.forma_pagamento,"cb":p.comprovante_b64,"id":p.conta_id})
        if p.banco_id:
            await db.execute(text("UPDATE fin_bancos SET saldo_atual=saldo_atual+:val WHERE id=:id"),{"val":p.valor_pago,"id":p.banco_id})
            await db.execute(text("INSERT INTO fin_movimentacoes_banco (banco_id,tipo,descricao,valor,data,conta_receber_id) VALUES (:bid,'credito','Recebimento conta',:val,:dt,:cid)"),{"bid":p.banco_id,"val":p.valor_pago,"dt":agora,"cid":p.conta_id})
    await db.commit(); return {"ok":True}

# ── Relatórios ────────────────────────────────────────────────────────────────
@router.get("/relatorios/resumo")
async def resumo(mes: int=None, ano: int=None, db: AsyncSession=Depends(get_db)):
    await init_tables(db)
    agora=datetime.now(); mes=mes or agora.month; ano=ano or agora.year; my=f"{mes:02d}/{ano}"
    rp=await db.execute(text("SELECT SUM(valor) as total,SUM(valor_pago) as pago,COUNT(*) as qtd FROM fin_contas_pagar WHERE strftime('%m/%Y',data_vencimento)=:my"),{"my":my})
    rr=await db.execute(text("SELECT SUM(valor) as total,SUM(valor_recebido) as recebido,COUNT(*) as qtd FROM fin_contas_receber WHERE strftime('%m/%Y',data_vencimento)=:my"),{"my":my})
    vp=await db.execute(text("SELECT SUM(valor) FROM fin_contas_pagar WHERE status='vencido'"))
    vr=await db.execute(text("SELECT SUM(valor) FROM fin_contas_receber WHERE status='vencido'"))
    bp=dict(rp.mappings().fetchone()); br=dict(rr.mappings().fetchone())
    bancos=await db.execute(text("SELECT nome,saldo_atual,cor FROM fin_bancos WHERE ativo=1"))
    return {"mes":mes,"ano":ano,"a_pagar":{"total":bp["total"] or 0,"pago":bp["pago"] or 0,"qtd":bp["qtd"] or 0},
            "a_receber":{"total":br["total"] or 0,"recebido":br["recebido"] or 0,"qtd":br["qtd"] or 0},
            "inadimplencia_pagar":vp.scalar() or 0,"inadimplencia_receber":vr.scalar() or 0,
            "saldo_total":sum((b["saldo_atual"] or 0) for b in bancos.mappings().fetchall()),
            "bancos":[dict(b) for b in (await db.execute(text("SELECT nome,saldo_atual,cor FROM fin_bancos WHERE ativo=1"))).mappings().fetchall()]}

@router.get("/relatorios/fluxo-caixa")
async def fluxo_caixa(meses: int=6, db: AsyncSession=Depends(get_db)):
    await init_tables(db); agora=datetime.now(); resultado=[]
    for i in range(meses-1,-1,-1):
        d=agora.replace(day=1)-timedelta(days=i*30); m=d.month; a=d.year; my=f"{m:02d}/{a}"
        rp=await db.execute(text("SELECT COALESCE(SUM(valor_pago),0) as saidas FROM fin_contas_pagar WHERE status='pago' AND strftime('%m/%Y',data_pagamento)=:my"),{"my":my})
        rr=await db.execute(text("SELECT COALESCE(SUM(valor_recebido),0) as entradas FROM fin_contas_receber WHERE status='recebido' AND strftime('%m/%Y',data_recebimento)=:my"),{"my":my})
        s=rp.scalar() or 0; e=rr.scalar() or 0
        resultado.append({"mes":f"{m:02d}/{a}","entradas":e,"saidas":s,"saldo":e-s})
    return resultado

@router.get("/relatorios/dre")
async def dre(mes: int=None, ano: int=None, db: AsyncSession=Depends(get_db)):
    await init_tables(db); agora=datetime.now(); mes=mes or agora.month; ano=ano or agora.year; my=f"{mes:02d}/{ano}"
    rec=await db.execute(text("SELECT categoria,COALESCE(SUM(valor_recebido),0) as total FROM fin_contas_receber WHERE status='recebido' AND strftime('%m/%Y',data_recebimento)=:my GROUP BY categoria"),{"my":my})
    pag=await db.execute(text("SELECT categoria,COALESCE(SUM(valor_pago),0) as total FROM fin_contas_pagar WHERE status='pago' AND strftime('%m/%Y',data_pagamento)=:my GROUP BY categoria"),{"my":my})
    receitas=[dict(x) for x in rec.mappings().fetchall()]
    despesas=[dict(x) for x in pag.mappings().fetchall()]
    total_rec=sum(x["total"] for x in receitas)
    total_des=sum(x["total"] for x in despesas)
    return {"mes":mes,"ano":ano,"receitas":receitas,"despesas":despesas,"total_receitas":total_rec,"total_despesas":total_des,"lucro_liquido":total_rec-total_des}

@router.get("/relatorios/inadimplencia")
async def inadimplencia(db: AsyncSession=Depends(get_db)):
    await init_tables(db)
    rp=await db.execute(text("SELECT * FROM fin_contas_pagar WHERE status='vencido' ORDER BY data_vencimento ASC"))
    rr=await db.execute(text("SELECT * FROM fin_contas_receber WHERE status='vencido' ORDER BY data_vencimento ASC"))
    return {"a_pagar":[dict(x) for x in rp.mappings().fetchall()],"a_receber":[dict(x) for x in rr.mappings().fetchall()]}

@router.get("/relatorios/por-categoria")
async def por_categoria(tipo: str="pagar", mes: int=None, ano: int=None, db: AsyncSession=Depends(get_db)):
    await init_tables(db); agora=datetime.now(); mes=mes or agora.month; ano=ano or agora.year; my=f"{mes:02d}/{ano}"
    if tipo=="pagar":
        r=await db.execute(text("SELECT categoria,subcategoria,SUM(valor) as total,COUNT(*) as qtd FROM fin_contas_pagar WHERE strftime('%m/%Y',data_vencimento)=:my GROUP BY categoria,subcategoria ORDER BY total DESC"),{"my":my})
    else:
        r=await db.execute(text("SELECT categoria,subcategoria,SUM(valor) as total,COUNT(*) as qtd FROM fin_contas_receber WHERE strftime('%m/%Y',data_vencimento)=:my GROUP BY categoria,subcategoria ORDER BY total DESC"),{"my":my})
    return [dict(x) for x in r.mappings().fetchall()]

# ── Verificar alertas ────────────────────────────────────────────────────────
@router.post("/verificar-alertas")
async def verificar_alertas(background: BackgroundTasks, db: AsyncSession=Depends(get_db)):
    await init_tables(db)
    rp=await db.execute(text("SELECT * FROM fin_contas_pagar WHERE status IN ('pendente','vencido') AND (email_aviso!='' OR whatsapp_aviso!='')"))
    rr=await db.execute(text("SELECT * FROM fin_contas_receber WHERE status IN ('pendente','vencido') AND (email_aviso!='' OR whatsapp_aviso!='')"))
    pagar=[dict(x) for x in rp.mappings().fetchall()]
    receber=[dict(x) for x in rr.mappings().fetchall()]
    async def _processar():
        agora=datetime.now(); total=0
        for item in pagar:
            try:
                v=datetime.strptime(item["data_vencimento"],"%d/%m/%Y"); dias=(v-agora).days
                dias_antec=item.get("dias_antecedencia",3) or 3
                if dias<=dias_antec:
                    alerta=await gerar_alerta_ia("pagar",item,dias)
                    await db.execute(text("UPDATE fin_contas_pagar SET alerta_ia=:a WHERE id=:id"),{"a":alerta,"id":item["id"]})
                    await enviar_alerta(item["email_aviso"] or "",item["whatsapp_aviso"] or "",f"⚠️ Conta a Pagar — {item['descricao']}",alerta)
                    total+=1
            except: pass
        for item in receber:
            try:
                v=datetime.strptime(item["data_vencimento"],"%d/%m/%Y"); dias=(v-agora).days
                dias_antec=item.get("dias_antecedencia",3) or 3
                if dias<=dias_antec:
                    alerta=await gerar_alerta_ia("receber",item,dias)
                    await db.execute(text("UPDATE fin_contas_receber SET alerta_ia=:a WHERE id=:id"),{"a":alerta,"id":item["id"]})
                    await enviar_alerta(item["email_aviso"] or "",item["whatsapp_aviso"] or "",f"📥 Conta a Receber — {item['descricao']}",alerta)
                    total+=1
            except: pass
        await db.commit()
    background.add_task(_processar)
    return {"ok":True,"verificados":len(pagar)+len(receber)}

@router.get("/categorias")
async def listar_categorias():
    return {"pagar":CATEGORIAS_PAGAR,"receber":CATEGORIAS_RECEBER,"formas_pagamento":FORMAS_PAGAMENTO}
