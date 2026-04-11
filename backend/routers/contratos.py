"""Router: contratos.py — Gestão completa de contratos com IA Claude e alertas automáticos"""
import os, re, json, base64
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from database import get_db
import httpx, aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

router = APIRouter(prefix="/contratos", tags=["Contratos"])

GMAIL_USER=os.getenv("GMAIL_USER",""); GMAIL_PASS=os.getenv("GMAIL_APP_PASSWORD","")
SMTP_HOST=os.getenv("SMTP_HOST","smtp.gmail.com"); SMTP_PORT=int(os.getenv("SMTP_PORT","587"))
SMTP_USER=os.getenv("SMTP_USER",""); SMTP_PASS=os.getenv("SMTP_PASS","")
SMTP_FROM=os.getenv("SMTP_FROM_NAME","EPimentel Auditoria & Contabilidade")
EVO_URL=os.getenv("EVOLUTION_API_URL",""); EVO_KEY=os.getenv("EVOLUTION_API_KEY",""); EVO_INST=os.getenv("EVOLUTION_INSTANCE","")
ANTHROPIC_KEY=os.getenv("ANTHROPIC_API_KEY","")
NAVY="#1B2A4A"; GOLD="#C5A55A"

TIPOS_CONTRATO=["Prestação de Serviços Contábeis","Assessoria Tributária","Consultoria Fiscal","Auditoria","Holding/Estruturação",
    "Abertura de Empresa","Terceirização de RH","Contrato de Confidencialidade","Termo de Cessão","Locação","Fornecimento","Parceria","Outro"]
STATUS_CONTRATO={"ativo":"Ativo","vencendo":"Vencendo","vencido":"Vencido","suspenso":"Suspenso","encerrado":"Encerrado","aguardando":"Aguardando Assinatura"}
TEMPLATES_WA={
    "assinatura": "Olá, {nome}! 👋\n\nSeu contrato de *{tipo}* está pronto para assinatura.\nPor favor, confirme o recebimento e retorne assinado.\n_EPimentel Auditoria & Contabilidade_",
    "renovacao":  "Olá, {nome}! 📋\n\nSeu contrato de *{tipo}* vence em *{dias} dias* ({vencimento}).\nGostaria de renová-lo? Podemos manter as mesmas condições ou ajustar conforme necessário.\n_EPimentel_",
    "vencimento": "Atenção, {nome}! ⚠️\n\nO contrato *{tipo}* venceu em {vencimento}.\nPor favor, entre em contato para regularização.\n_EPimentel Auditoria & Contabilidade_",
    "boas_vindas":"Seja bem-vindo(a), {nome}! 🎉\n\nFicamos felizes em tê-lo como cliente.\nSeu contrato de *{tipo}* foi ativado com sucesso.\nQualquer dúvida, estamos à disposição!\n_EPimentel_",
    "reajuste":   "Olá, {nome}! 📊\n\nInformamos que será aplicado o reajuste anual no contrato de *{tipo}*.\nNovo valor: *R$ {valor_novo}* (índice: {indice}%)\nVigência: {vigencia}\n_EPimentel_",
}

async def init_tables(db: AsyncSession):
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS contratos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero TEXT, tipo TEXT, titulo TEXT,
            cliente_id INTEGER, cliente_nome TEXT, cliente_cnpj TEXT,
            parte_a TEXT, parte_b TEXT,
            valor_mensal REAL DEFAULT 0, valor_total REAL DEFAULT 0, valor_hora REAL DEFAULT 0,
            forma_pagamento TEXT, dia_vencimento INTEGER DEFAULT 10,
            data_assinatura TEXT, data_inicio TEXT, data_vencimento TEXT, data_renovacao TEXT,
            vigencia_meses INTEGER DEFAULT 12, renovacao_automatica INTEGER DEFAULT 1,
            indice_reajuste TEXT DEFAULT 'IPCA', percentual_reajuste REAL DEFAULT 0,
            status TEXT DEFAULT 'aguardando',
            objeto TEXT, clausulas TEXT, observacoes TEXT,
            arquivo_b64 TEXT, assinado INTEGER DEFAULT 0,
            responsavel TEXT DEFAULT 'Carlos Eduardo Pimentel',
            email_contato TEXT, whatsapp_contato TEXT, dias_alerta INTEGER DEFAULT 30,
            alerta_ia TEXT, ultimo_alerta TEXT,
            banco_id INTEGER, centro_custo_id INTEGER,
            criado_em TEXT DEFAULT (datetime('now','localtime')),
            atualizado_em TEXT DEFAULT (datetime('now','localtime'))
        )"""))
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS contratos_aditivos (
            id INTEGER PRIMARY KEY AUTOINCREMENT, contrato_id INTEGER,
            numero TEXT, descricao TEXT, valor_anterior REAL, valor_novo REAL,
            data_aditivo TEXT, motivo TEXT, arquivo_b64 TEXT,
            criado_em TEXT DEFAULT (datetime('now','localtime'))
        )"""))
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS contratos_ocorrencias (
            id INTEGER PRIMARY KEY AUTOINCREMENT, contrato_id INTEGER,
            tipo TEXT, descricao TEXT, data TEXT,
            criado_em TEXT DEFAULT (datetime('now','localtime'))
        )"""))
    await db.commit()

class ContratoCadastro(BaseModel):
    numero: str = ""; tipo: str = "Prestação de Serviços Contábeis"; titulo: str = ""
    cliente_id: Optional[int] = None; cliente_nome: str = ""; cliente_cnpj: str = ""
    parte_a: str = "EPimentel Auditoria & Contabilidade Ltda"; parte_b: str = ""
    valor_mensal: float = 0; valor_total: float = 0; valor_hora: float = 0
    forma_pagamento: str = "PIX"; dia_vencimento: int = 10
    data_assinatura: str = ""; data_inicio: str = ""; data_vencimento: str = ""; data_renovacao: str = ""
    vigencia_meses: int = 12; renovacao_automatica: bool = True
    indice_reajuste: str = "IPCA"; percentual_reajuste: float = 0
    status: str = "aguardando"; objeto: str = ""; clausulas: str = ""; observacoes: str = ""
    arquivo_b64: str = ""; assinado: bool = False; responsavel: str = "Carlos Eduardo Pimentel"
    email_contato: str = ""; whatsapp_contato: str = ""; dias_alerta: int = 30
    banco_id: Optional[int] = None; centro_custo_id: Optional[int] = None

async def gerar_alerta_ia_contrato(contrato: dict, dias: int) -> str:
    if not ANTHROPIC_KEY:
        emoji="🚨" if dias<0 else ("⏰" if dias<=30 else "📋")
        return f"{emoji} Contrato {contrato.get('tipo','')} — {contrato.get('cliente_nome','')} {'vencido há' if dias<0 else 'vence em'} {abs(dias)} dias"
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r=await c.post("https://api.anthropic.com/v1/messages",
                headers={"x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01","Content-Type":"application/json"},
                json={"model":"claude-haiku-4-5-20251001","max_tokens":250,"messages":[{"role":"user","content":
                    f"Gere alerta profissional (3 linhas, emojis) sobre contrato:\n"
                    f"Cliente: {contrato.get('cliente_nome','')}\nTipo: {contrato.get('tipo','')}\n"
                    f"Valor: R$ {contrato.get('valor_mensal',0):,.2f}/mês\nStatus: {contrato.get('status','')}\n"
                    f"{'Dias em atraso' if dias<0 else 'Dias até vencer'}: {abs(dias)}\n"
                    f"Renovação automática: {'Sim' if contrato.get('renovacao_automatica') else 'Não'}\n"
                    f"Dê orientação de ação imediata para o escritório contábil."}]})
            return r.json().get("content",[{}])[0].get("text","")
    except: return f"⏰ Contrato {contrato.get('tipo','')} — {contrato.get('cliente_nome','')} — {abs(dias)}d {'atrasado' if dias<0 else 'para vencer'}"

async def enviar_wa(telefone: str, texto: str):
    if not EVO_URL or not telefone: return
    n=re.sub(r"\D","",telefone); num=("55"+n) if not n.startswith("55") else n
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            await c.post(f"{EVO_URL}/message/sendText/{EVO_INST}",headers={"apikey":EVO_KEY,"Content-Type":"application/json"},json={"number":num,"text":texto})
    except: pass

async def enviar_email(para: str, assunto: str, html: str):
    u=SMTP_USER or GMAIL_USER; pw=SMTP_PASS or GMAIL_PASS
    if not u or not pw or not para: return
    try:
        msg=MIMEMultipart("alternative"); msg["Subject"]=assunto; msg["From"]=f"{SMTP_FROM} <{u}>"; msg["To"]=para
        msg.attach(MIMEText(html,"html","utf-8"))
        async with aiosmtplib.SMTP(hostname=SMTP_HOST,port=SMTP_PORT,use_tls=False) as s:
            await s.starttls(); await s.login(u,pw); await s.send_message(msg)
    except: pass

@router.get("/listar")
async def listar(status: str=None, cliente_id: int=None, db: AsyncSession=Depends(get_db)):
    await init_tables(db)
    q="SELECT * FROM contratos WHERE 1=1"
    params={}
    if status: q+=" AND status=:sts"; params["sts"]=status
    if cliente_id: q+=" AND cliente_id=:cid"; params["cid"]=cliente_id
    q+=" ORDER BY CASE status WHEN 'vencendo' THEN 0 WHEN 'vencido' THEN 1 WHEN 'ativo' THEN 2 ELSE 3 END, data_vencimento ASC"
    r=await db.execute(text(q),params)
    rows=[dict(x) for x in r.mappings().fetchall()]
    agora=datetime.now()
    for row in rows:
        try:
            v=datetime.strptime(row["data_vencimento"],"%d/%m/%Y"); row["dias_vencimento"]=(v-agora).days
            if row["status"]=="ativo" and 0<row["dias_vencimento"]<=row.get("dias_alerta",30): row["status"]="vencendo"
            elif row["status"] in ("ativo","vencendo") and row["dias_vencimento"]<0: row["status"]="vencido"
        except: row["dias_vencimento"]=None
    return rows

@router.post("/criar")
async def criar(p: ContratoCadastro, db: AsyncSession=Depends(get_db)):
    await init_tables(db)
    num=p.numero or f"EP-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    await db.execute(text("""INSERT INTO contratos
        (numero,tipo,titulo,cliente_id,cliente_nome,cliente_cnpj,parte_a,parte_b,
         valor_mensal,valor_total,valor_hora,forma_pagamento,dia_vencimento,
         data_assinatura,data_inicio,data_vencimento,data_renovacao,vigencia_meses,renovacao_automatica,
         indice_reajuste,percentual_reajuste,status,objeto,clausulas,observacoes,
         arquivo_b64,assinado,responsavel,email_contato,whatsapp_contato,dias_alerta,banco_id,centro_custo_id)
        VALUES (:num,:tipo,:tit,:clid,:cnome,:ccnpj,:pa,:pb,:vm,:vt,:vh,:fp,:dv,
                :das,:di,:dvenc,:dr,:vm2,:ra,:ir,:pr,:sts,:obj,:cla,:obs,
                :arq,:ass,:resp,:email,:wa,:dias,:bid,:cid)"""),
        {"num":num,"tipo":p.tipo,"tit":p.titulo or p.tipo,"clid":p.cliente_id,"cnome":p.cliente_nome,
         "ccnpj":p.cliente_cnpj,"pa":p.parte_a,"pb":p.parte_b or p.cliente_nome,"vm":p.valor_mensal,
         "vt":p.valor_total,"vh":p.valor_hora,"fp":p.forma_pagamento,"dv":p.dia_vencimento,
         "das":p.data_assinatura,"di":p.data_inicio,"dvenc":p.data_vencimento,"dr":p.data_renovacao,
         "vm2":p.vigencia_meses,"ra":int(p.renovacao_automatica),"ir":p.indice_reajuste,
         "pr":p.percentual_reajuste,"sts":p.status,"obj":p.objeto,"cla":p.clausulas,"obs":p.observacoes,
         "arq":p.arquivo_b64,"ass":int(p.assinado),"resp":p.responsavel,"email":p.email_contato,
         "wa":p.whatsapp_contato,"dias":p.dias_alerta,"bid":p.banco_id,"cid":p.centro_custo_id})
    r=await db.execute(text("SELECT last_insert_rowid() as id"))
    await db.commit(); return {"ok":True,"id":r.fetchone()[0],"numero":num}

@router.put("/atualizar/{id}")
async def atualizar(id: int, dados: dict, db: AsyncSession=Depends(get_db)):
    campos_ok=["tipo","titulo","status","valor_mensal","valor_total","data_vencimento","data_renovacao",
               "observacoes","email_contato","whatsapp_contato","dias_alerta","assinado","objeto"]
    sets=", ".join(f"{c}=:{c}" for c in campos_ok if c in dados)
    if not sets: raise HTTPException(400,"Nada para atualizar")
    dados["id"]=id; dados["atualizado_em"]=datetime.now().isoformat()
    await db.execute(text(f"UPDATE contratos SET {sets},atualizado_em=:atualizado_em WHERE id=:id"),dados)
    await db.commit(); return {"ok":True}

@router.delete("/{id}")
async def excluir(id: int, db: AsyncSession=Depends(get_db)):
    await db.execute(text("DELETE FROM contratos WHERE id=:id"),{"id":id}); await db.commit(); return {"ok":True}

@router.post("/gerar-alerta/{id}")
async def gerar_alerta(id: int, background: BackgroundTasks, db: AsyncSession=Depends(get_db)):
    r=await db.execute(text("SELECT * FROM contratos WHERE id=:id"),{"id":id})
    cont=r.mappings().fetchone()
    if not cont: raise HTTPException(404)
    cont=dict(cont)
    async def _enviar():
        dias=0
        try: dias=(datetime.strptime(cont["data_vencimento"],"%d/%m/%Y")-datetime.now()).days
        except: pass
        alerta=await gerar_alerta_ia_contrato(cont,dias)
        await db.execute(text("UPDATE contratos SET alerta_ia=:a,ultimo_alerta=datetime('now','localtime') WHERE id=:id"),{"a":alerta,"id":id})
        await db.commit()
        if cont.get("whatsapp_contato"): await enviar_wa(cont["whatsapp_contato"],alerta)
        if cont.get("email_contato"):
            html=f"<div style='font-family:Arial;padding:20px'><h3 style='color:#1B2A4A'>Alerta de Contrato</h3><p>{alerta.replace(chr(10),'<br>')}</p></div>"
            await enviar_email(cont["email_contato"],f"Alerta — Contrato {cont.get('tipo','')} | {cont.get('cliente_nome','')}",html)
    background.add_task(_enviar)
    return {"ok":True}

@router.post("/enviar-template/{id}")
async def enviar_template(id: int, template_id: str, background: BackgroundTasks, db: AsyncSession=Depends(get_db)):
    r=await db.execute(text("SELECT * FROM contratos WHERE id=:id"),{"id":id})
    cont=r.mappings().fetchone()
    if not cont: raise HTTPException(404)
    cont=dict(cont)
    tpl=TEMPLATES_WA.get(template_id,"")
    if not tpl: raise HTTPException(400,"Template não encontrado")
    dias=0
    try: dias=(datetime.strptime(cont["data_vencimento"],"%d/%m/%Y")-datetime.now()).days
    except: pass
    msg=tpl.format(nome=cont.get("cliente_nome",""),tipo=cont.get("tipo",""),dias=abs(dias),vencimento=cont.get("data_vencimento",""),
        valor_novo=f"{cont.get('valor_mensal',0):,.2f}",indice=cont.get("percentual_reajuste",0),vigencia=cont.get("data_vencimento",""))
    async def _enviar():
        if cont.get("whatsapp_contato"): await enviar_wa(cont["whatsapp_contato"],msg)
        await db.execute(text("INSERT INTO contratos_ocorrencias (contrato_id,tipo,descricao,data) VALUES (:cid,'template','Enviado template: '+:tpl,date('now'))"),{"cid":id,"tpl":template_id})
        await db.commit()
    background.add_task(_enviar)
    return {"ok":True,"mensagem":msg}

@router.get("/templates")
async def listar_templates():
    return [{"id":k,"preview":v[:80]+"..."} for k,v in TEMPLATES_WA.items()]

@router.post("/verificar-vencimentos")
async def verificar_vencimentos(background: BackgroundTasks, db: AsyncSession=Depends(get_db)):
    await init_tables(db)
    r=await db.execute(text("SELECT * FROM contratos WHERE status IN ('ativo','vencendo')"))
    contratos=[dict(x) for x in r.mappings().fetchall()]
    async def _processar():
        agora=datetime.now(); alertas=0
        for cont in contratos:
            try:
                v=datetime.strptime(cont["data_vencimento"],"%d/%m/%Y"); dias=(v-agora).days
                dias_alerta=cont.get("dias_alerta",30) or 30
                if dias<=dias_alerta:
                    alerta=await gerar_alerta_ia_contrato(cont,dias)
                    await db.execute(text("UPDATE contratos SET alerta_ia=:a,status=:sts,atualizado_em=datetime('now','localtime') WHERE id=:id"),
                        {"a":alerta,"sts":"vencendo" if dias>0 else "vencido","id":cont["id"]})
                    if cont.get("whatsapp_contato"): await enviar_wa(cont["whatsapp_contato"],alerta)
                    if cont.get("email_contato"):
                        html=f"<div style='font-family:Arial;padding:20px;'><p>{alerta.replace(chr(10),'<br>')}</p></div>"
                        await enviar_email(cont["email_contato"],f"{'🚨' if dias<0 else '⏰'} Contrato {cont.get('tipo','')} — {cont.get('cliente_nome','')}",html)
                    alertas+=1
            except: pass
        await db.commit()
    background.add_task(_processar)
    return {"ok":True,"verificados":len(contratos)}

@router.get("/aditivos/{contrato_id}")
async def listar_aditivos(contrato_id: int, db: AsyncSession=Depends(get_db)):
    await init_tables(db)
    r=await db.execute(text("SELECT * FROM contratos_aditivos WHERE contrato_id=:id ORDER BY data_aditivo DESC"),{"id":contrato_id})
    return [dict(x) for x in r.mappings().fetchall()]

@router.post("/aditivos")
async def criar_aditivo(dados: dict, db: AsyncSession=Depends(get_db)):
    await init_tables(db)
    await db.execute(text("INSERT INTO contratos_aditivos (contrato_id,numero,descricao,valor_anterior,valor_novo,data_aditivo,motivo,arquivo_b64) VALUES (:cid,:num,:desc,:va,:vn,:da,:mot,:arq)"),
        {"cid":dados.get("contrato_id"),"num":dados.get("numero",""),"desc":dados.get("descricao",""),
         "va":dados.get("valor_anterior",0),"vn":dados.get("valor_novo",0),"da":dados.get("data_aditivo",""),"mot":dados.get("motivo",""),"arq":dados.get("arquivo_b64","")})
    if dados.get("valor_novo") and dados.get("contrato_id"):
        await db.execute(text("UPDATE contratos SET valor_mensal=:vn WHERE id=:id"),{"vn":dados["valor_novo"],"id":dados["contrato_id"]})
    await db.commit(); return {"ok":True}

@router.get("/resumo")
async def resumo(db: AsyncSession=Depends(get_db)):
    await init_tables(db)
    r=await db.execute(text("SELECT status,COUNT(*) as qtd,SUM(valor_mensal) as valor FROM contratos GROUP BY status"))
    rows=[dict(x) for x in r.mappings().fetchall()]
    return {"por_status":rows,"total":sum(x["qtd"] for x in rows),"valor_mensal_total":sum((x["valor"] or 0) for x in rows if x["status"]=="ativo")}

@router.get("/tipos")
async def listar_tipos():
    return {"tipos":TIPOS_CONTRATO,"status":STATUS_CONTRATO,"templates":[{"id":k} for k in TEMPLATES_WA]}

# ── API de Assinatura Digital ─────────────────────────────────────────────────
# Suporta: Autentique (GraphQL), ZapSign (REST)
AUTENTIQUE_TOKEN = os.getenv("AUTENTIQUE_TOKEN", "")
ZAPSIGN_TOKEN    = os.getenv("ZAPSIGN_TOKEN", "")
CLICKSIGN_KEY    = os.getenv("CLICKSIGN_KEY", "")
ZAPSIGN_SANDBOX  = os.getenv("ZAPSIGN_SANDBOX", "true").lower() == "true"

class AssinaturaRequest(BaseModel):
    contrato_id: int
    provider: str = "autentique"  # autentique | zapsign | clicksign
    documento_b64: str = ""  # PDF base64 — se vazio usa arquivo do contrato
    signatarios: List[dict] = []  # [{nome, email, telefone, acao}]
    mensagem: str = ""
    enviar_por_email: bool = True
    enviar_por_whatsapp: bool = False

async def assinar_autentique(contrato: dict, doc_b64: str, signatarios: List[dict], mensagem: str) -> dict:
    """Envia contrato para assinatura via Autentique (GraphQL)."""
    if not AUTENTIQUE_TOKEN: return {"erro": "AUTENTIQUE_TOKEN não configurado"}
    nome_doc = f"Contrato {contrato.get('tipo','')} — {contrato.get('cliente_nome','')}"
    # Build signatários GraphQL
    sign_gql = "\n".join([
        f'{{ action: {{name: "{s.get("acao","SIGN")}"}}, email: "{s.get("email","")}", name: "{s.get("nome","")}" }}'
        for s in signatarios
    ])
    query = f"""
    mutation CreateDocument {{
        createDocument(
            document: {{
                name: "{nome_doc}"
                message: "{mensagem or 'Por favor, assine o documento.'}"
            }}
            signatories: [{sign_gql}]
            file: {{ content_base64: "{doc_b64[:50]}..." }}
        ) {{
            id name created_at
            signatories {{ public_id email name token
                action {{ name }} signed {{ created_at }}
            }}
        }}
    }}"""
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post("https://api.autentique.com.br/v2/graphql",
                headers={"Authorization": f"Bearer {AUTENTIQUE_TOKEN}", "Content-Type": "application/json"},
                json={"query": query})
            data = r.json()
            if "errors" in data: return {"erro": str(data["errors"])}
            doc = data.get("data",{}).get("createDocument",{})
            return {"provider": "autentique", "documento_id": doc.get("id",""),
                    "nome": doc.get("name",""), "signatarios": doc.get("signatories",[]),
                    "url": f"https://app.autentique.com.br/dashboard/documentos/{doc.get('id','')}"}
    except Exception as e:
        return {"erro": str(e)}

async def assinar_zapsign(contrato: dict, doc_b64: str, signatarios: List[dict], mensagem: str, por_wa: bool) -> dict:
    """Envia contrato para assinatura via ZapSign (pode enviar por WhatsApp)."""
    if not ZAPSIGN_TOKEN: return {"erro": "ZAPSIGN_TOKEN não configurado"}
    base_url = "https://sandbox.api.zapsign.com.br/api/v1" if ZAPSIGN_SANDBOX else "https://api.zapsign.com.br/api/v1"
    nome_doc = f"Contrato {contrato.get('tipo','')} — {contrato.get('cliente_nome','')}"
    signers = []
    for s in signatarios:
        signer = {"name": s.get("nome",""), "email": s.get("email",""), "sign_as": "signer"}
        if por_wa and s.get("telefone"): signer["phone_country"] = "55"; signer["phone_number"] = re.sub(r"\D","",s.get("telefone",""))[-11:]
        signers.append(signer)
    payload = {"name": nome_doc, "lang": "pt-br", "signers": signers, "brand_logo": "",
               "brand_name": "EPimentel Auditoria", "brand_primary_color": "#1B2A4A",
               "external_id": str(contrato.get("id","")),
               "send_automatic_email": True, "send_automatic_whatsapp": por_wa}
    if doc_b64:
        payload["base64_pdf"] = doc_b64
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(f"{base_url}/docs/", headers={"Authorization": f"Bearer {ZAPSIGN_TOKEN}", "Content-Type": "application/json"}, json=payload)
            data = r.json()
            if r.status_code >= 400: return {"erro": data.get("detail", str(data))}
            return {"provider": "zapsign", "documento_id": data.get("token",""), "nome": data.get("name",""),
                    "status": data.get("status",""), "url": data.get("request_signature_link",""),
                    "signatarios": data.get("signers",[])}
    except Exception as e:
        return {"erro": str(e)}

@router.post("/assinar")
async def enviar_para_assinatura(req: AssinaturaRequest, db: AsyncSession = Depends(get_db)):
    """Envia contrato para assinatura digital via Autentique ou ZapSign."""
    await init_tables(db)
    r = await db.execute(text("SELECT * FROM contratos WHERE id=:id"), {"id": req.contrato_id})
    cont = r.mappings().fetchone()
    if not cont: raise HTTPException(404, "Contrato não encontrado")
    cont = dict(cont)

    doc_b64 = req.documento_b64 or cont.get("arquivo_b64", "")

    # Signatários padrão se não fornecidos
    signatarios = req.signatarios or [
        {"nome": "Carlos Eduardo Pimentel", "email": "ceampimentel@gmail.com", "acao": "SIGN", "telefone": ""},
        {"nome": cont.get("cliente_nome",""), "email": cont.get("email_contato",""), "acao": "SIGN", "telefone": cont.get("whatsapp_contato","")},
    ]
    signatarios = [s for s in signatarios if s.get("email")]

    if req.provider == "zapsign":
        resultado = await assinar_zapsign(cont, doc_b64, signatarios, req.mensagem, req.enviar_por_whatsapp)
    else:  # autentique (padrão)
        resultado = await assinar_autentique(cont, doc_b64, signatarios, req.mensagem)

    if "erro" not in resultado:
        await db.execute(text("""
            UPDATE contratos SET status='aguardando', assinado=0,
            atualizado_em=datetime('now','localtime')
            WHERE id=:id
        """), {"id": req.contrato_id})
        await db.execute(text("""
            INSERT INTO contratos_ocorrencias (contrato_id, tipo, descricao, data)
            VALUES (:cid, 'assinatura_enviada', :desc, date('now'))
        """), {"cid": req.contrato_id,
               "desc": f"Enviado para assinatura via {req.provider} · Doc ID: {resultado.get('documento_id','')}"})
        await db.commit()

    return resultado

@router.get("/status-assinatura/{doc_id}")
async def status_assinatura(doc_id: str, provider: str = "autentique"):
    """Verifica o status de assinatura de um documento."""
    if provider == "zapsign":
        if not ZAPSIGN_TOKEN: raise HTTPException(400, "ZAPSIGN_TOKEN não configurado")
        base_url = "https://sandbox.api.zapsign.com.br/api/v1" if ZAPSIGN_SANDBOX else "https://api.zapsign.com.br/api/v1"
        try:
            async with httpx.AsyncClient(timeout=15) as c:
                r = await c.get(f"{base_url}/docs/{doc_id}/", headers={"Authorization": f"Bearer {ZAPSIGN_TOKEN}"})
                data = r.json()
                return {"provider": "zapsign", "status": data.get("status",""), "nome": data.get("name",""),
                        "signatarios": data.get("signers",[]), "created_at": data.get("created_at","")}
        except Exception as e: raise HTTPException(500, str(e))
    else:  # autentique
        if not AUTENTIQUE_TOKEN: raise HTTPException(400, "AUTENTIQUE_TOKEN não configurado")
        query = f'query {{ document(id: "{doc_id}") {{ id name status created_at signatories {{ email name signed {{ created_at }} }} }} }}'
        try:
            async with httpx.AsyncClient(timeout=15) as c:
                r = await c.post("https://api.autentique.com.br/v2/graphql",
                    headers={"Authorization": f"Bearer {AUTENTIQUE_TOKEN}", "Content-Type": "application/json"},
                    json={"query": query})
                data = r.json().get("data",{}).get("document",{})
                return {"provider": "autentique", **data}
        except Exception as e: raise HTTPException(500, str(e))

@router.post("/webhook-assinatura")
async def webhook_assinatura(request: Request, db: AsyncSession = Depends(get_db)):
    """Recebe eventos de assinatura do Autentique/ZapSign."""
    from fastapi import Request
    body = await request.json()
    await init_tables(db)
    # ZapSign webhook
    token = body.get("token") or body.get("doc_token","")
    status = body.get("status","")
    external_id = body.get("external_id","")
    if external_id and status == "signed":
        await db.execute(text("UPDATE contratos SET assinado=1, status='ativo', atualizado_em=datetime('now','localtime') WHERE id=:id"),{"id": int(external_id)})
        await db.execute(text("INSERT INTO contratos_ocorrencias (contrato_id,tipo,descricao,data) VALUES (:cid,'assinatura_concluida','Contrato assinado por todas as partes',date('now'))"),{"cid": int(external_id)})
        await db.commit()
    return {"ok": True}

@router.get("/providers-assinatura")
async def listar_providers():
    """Lista providers de assinatura disponíveis e configurados."""
    return {
        "providers": [
            {"id": "autentique", "nome": "Autentique", "url": "https://autentique.com.br",
             "configurado": bool(AUTENTIQUE_TOKEN), "variaveis": ["AUTENTIQUE_TOKEN"],
             "descricao": "Plataforma brasileira · Envio por e-mail · GraphQL API · Jurídico válido (ICP-Brasil)"},
            {"id": "zapsign", "nome": "ZapSign", "url": "https://zapsign.com.br",
             "configurado": bool(ZAPSIGN_TOKEN), "variaveis": ["ZAPSIGN_TOKEN", "ZAPSIGN_SANDBOX"],
             "descricao": "Plataforma brasileira · Envio por WhatsApp e e-mail · REST API · ICP-Brasil"},
        ],
        "configurados": [p["id"] for p in [
            {"id":"autentique","ok":bool(AUTENTIQUE_TOKEN)},{"id":"zapsign","ok":bool(ZAPSIGN_TOKEN)}
        ] if p["ok"]]
    }
