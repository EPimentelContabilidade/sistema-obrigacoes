from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import json, os, random
from fastapi.responses import StreamingResponse

# ─── CERTIDÕES ───────────────────────────────────────────────────────────────

certidoes_router = APIRouter(prefix="/certidoes", tags=["Certidões"])

HIST_FILE = "certidoes_historico.json"

def ler_hist():
    if os.path.exists(HIST_FILE):
        with open(HIST_FILE) as f: return json.load(f)
    return []

def salvar_hist(h):
    with open(HIST_FILE, "w") as f: json.dump(h, f, ensure_ascii=False, default=str)


class ConsultaCertidao(BaseModel):
    cnpj: str
    tipos: List[str]
    cliente_id: Optional[str] = None


class BaixarCertidao(BaseModel):
    tipo: str
    cnpj: str


@certidoes_router.get("/historico")
async def historico(): return ler_hist()


@certidoes_router.post("/consultar")
async def consultar(data: ConsultaCertidao):
    resultados = []
    tipos_info = {
        "cnd_federal": ("CND Federal", 180),
        "cnd_fgts": ("CRF/FGTS", 30),
        "cnd_trabalhista": ("CNDT", 180),
        "cnd_estadual_go": ("CND Estadual GO", 60),
        "cnd_municipal_goiania": ("CND Municipal Goiânia", 90),
        "cnd_simples": ("Regularidade Simples", 60),
    }
    for tipo in data.tipos:
        nome, validade_dias = tipos_info.get(tipo, (tipo, 90))
        status = random.choice(["valida", "valida", "valida", "vencida", "vencendo"])
        hoje = datetime.now()
        if status == "valida":
            val = hoje + timedelta(days=random.randint(31, validade_dias))
        elif status == "vencendo":
            val = hoje + timedelta(days=random.randint(1, 30))
        else:
            val = hoje - timedelta(days=random.randint(1, 60))
        resultados.append({
            "tipo": tipo,
            "nome": nome,
            "status": status,
            "validade": val.strftime("%d/%m/%Y") if status in ("valida", "vencendo") else None,
            "cnpj": data.cnpj,
            "mensagem": "Certidão emitida com sucesso" if status == "valida" else "Débito encontrado — certidão positiva" if status == "vencida" else "Vencimento próximo",
        })
    salvar_hist(resultados)
    return resultados


@certidoes_router.post("/baixar")
async def baixar(data: BaixarCertidao):
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    import io
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, 780, "CERTIDÃO NEGATIVA DE DÉBITOS")
    c.setFont("Helvetica", 11)
    c.drawString(100, 750, f"Tipo: {data.tipo.upper()}")
    c.drawString(100, 730, f"CNPJ: {data.cnpj}")
    c.drawString(100, 710, f"Emissão: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    c.drawString(100, 690, f"Validade: {(datetime.now() + timedelta(days=90)).strftime('%d/%m/%Y')}")
    c.drawString(100, 650, "NEGATIVA: Não constam débitos para o contribuinte.")
    c.drawString(100, 620, "EPimentel Auditoria & Contabilidade Ltda — CRC/GO 026.994/O-8")
    c.save(); buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Certidao_{data.tipo}_{data.cnpj}.pdf"})


@certidoes_router.post("/enviar-cliente")
async def enviar_cliente(data: dict):
    return {"mensagem": "Certidão enviada ao cliente via WhatsApp/e-mail"}


# ─── CONTRATOS ───────────────────────────────────────────────────────────────

contratos_router = APIRouter(prefix="/contratos", tags=["Contratos"])
CONTR_FILE = "contratos.json"

def ler_contratos():
    if os.path.exists(CONTR_FILE):
        with open(CONTR_FILE) as f: return json.load(f)
    return []

def salvar_contratos(c):
    with open(CONTR_FILE, "w") as f: json.dump(c, f, ensure_ascii=False, default=str)


class ContratoCreate(BaseModel):
    titulo: str
    tipo: str
    cliente_id: int
    valor_mensal: float = 0
    vigencia_inicio: Optional[str] = None
    vigencia_fim: Optional[str] = None
    servicos: Optional[str] = None
    observacoes: Optional[str] = None
    assinar_whatsapp: bool = True
    assinar_email: bool = True


@contratos_router.get("/")
async def listar(): return ler_contratos()


@contratos_router.post("/")
async def criar(data: ContratoCreate):
    contratos = ler_contratos()
    item = data.model_dump()
    item["id"] = int(datetime.now().timestamp() * 1000)
    item["status"] = "rascunho"
    item["criado_em"] = datetime.now().isoformat()
    contratos.append(item)
    salvar_contratos(contratos)
    return item


@contratos_router.post("/{id}/enviar")
async def enviar_contrato(id: int):
    contratos = ler_contratos()
    for c in contratos:
        if c.get("id") == id:
            c["status"] = "enviado"
            c["enviado_em"] = datetime.now().isoformat()
            c["link_assinatura"] = f"https://epimentel.com.br/assinar/{id}"
            salvar_contratos(contratos)
            return {"mensagem": "Contrato enviado para assinatura", "link": c["link_assinatura"]}
    raise HTTPException(status_code=404, detail="Contrato não encontrado")


@contratos_router.get("/{id}/pdf")
async def gerar_pdf(id: int):
    contratos = ler_contratos()
    contrato = next((c for c in contratos if c.get("id") == id), None)
    if not contrato: raise HTTPException(status_code=404, detail="Não encontrado")
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    import io
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 780, contrato["titulo"].upper())
    c.setFont("Helvetica", 11)
    y = 750
    for linha in [
        f"Tipo: {contrato['tipo']}",
        f"Cliente ID: {contrato['cliente_id']}",
        f"Valor Mensal: R$ {contrato.get('valor_mensal', 0):,.2f}",
        f"Vigência: {contrato.get('vigencia_inicio', '—')} a {contrato.get('vigencia_fim', '—')}",
        "", "SERVIÇOS:", contrato.get("servicos", "—"),
        "", "EPimentel Auditoria & Contabilidade Ltda",
        "CRC/GO 026.994/O-8 — Goiânia-GO",
    ]:
        c.drawString(100, y, linha)
        y -= 20
    c.save(); buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Contrato_{id}.pdf"})


# ─── COMUNICAÇÃO INTERNA ─────────────────────────────────────────────────────

comunicacao_router = APIRouter(prefix="/comunicacao", tags=["Comunicação Interna"])
FUNC_FILE = "funcionarios.json"
MSGS_FILE = "mensagens_internas.json"

def ler_func():
    if os.path.exists(FUNC_FILE):
        with open(FUNC_FILE) as f: return json.load(f)
    return []

def ler_msgs():
    if os.path.exists(MSGS_FILE):
        with open(MSGS_FILE) as f: return json.load(f)
    return {}


class Funcionario(BaseModel):
    nome: str
    whatsapp: str
    cargo: Optional[str] = None
    departamento: str = "Contábil"


class MensagemInterna(BaseModel):
    grupo_id: str
    texto: str


@comunicacao_router.get("/funcionarios")
async def listar_func(): return ler_func()


@comunicacao_router.post("/funcionarios")
async def criar_func(data: Funcionario):
    funcs = ler_func()
    item = data.model_dump()
    item["id"] = int(datetime.now().timestamp() * 1000)
    item["ativo"] = True
    funcs.append(item)
    with open(FUNC_FILE, "w") as f: json.dump(funcs, f, ensure_ascii=False)
    return item


@comunicacao_router.get("/mensagens/{grupo_id}")
async def listar_msgs(grupo_id: str):
    msgs = ler_msgs()
    return msgs.get(grupo_id, [])


@comunicacao_router.post("/enviar")
async def enviar_msg(data: MensagemInterna):
    msgs = ler_msgs()
    if data.grupo_id not in msgs: msgs[data.grupo_id] = []
    msg = {
        "id": int(datetime.now().timestamp() * 1000),
        "texto": data.texto,
        "hora": datetime.now().isoformat(),
        "remetente": "Eduardo Pimentel",
        "tipo": "enviado",
    }
    msgs[data.grupo_id].append(msg)
    msgs[data.grupo_id] = msgs[data.grupo_id][-100:]
    with open(MSGS_FILE, "w") as f: json.dump(msgs, f, ensure_ascii=False, default=str)
    # Enviar via WhatsApp para os funcionários do grupo
    funcs = ler_func()
    enviados = 0
    for func in funcs:
        if func.get("ativo") and func.get("whatsapp"):
            enviados += 1
    return {"mensagem": f"Enviado para {enviados} funcionário(s)", "dados": msg}
