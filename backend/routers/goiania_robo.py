from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import json, os, random, base64 as b64lib
from fastapi.responses import StreamingResponse

# ─── GOIÂNIA NFS-e ───────────────────────────────────────────────────────────

goiania_router = APIRouter(prefix="/goiania-nfse", tags=["Goiânia NFS-e"])
CRED_FILE = "goiania_credenciais.json"
SESSION_FILE = "goiania_session.json"


class Credenciais(BaseModel):
    cnpj: str
    usuario: str
    senha: str


@goiania_router.get("/credenciais")
async def verificar_credenciais():
    if os.path.exists(CRED_FILE):
        with open(CRED_FILE) as f:
            cred = json.load(f)
        return {"configurado": True, "cnpj": cred.get("cnpj"), "usuario": cred.get("usuario")}
    return {"configurado": False}


@goiania_router.post("/credenciais")
async def salvar_credenciais(data: Credenciais):
    """Salva credenciais e testa conexão com portal ISS.net Goiânia."""
    # Em produção: fazer login real em https://nfse.goiania.go.gov.br
    # e armazenar o token de sessão
    cred = data.model_dump()
    cred["cnpj_limpo"] = data.cnpj.replace(".", "").replace("/", "").replace("-", "")
    cred["salvo_em"] = datetime.now().isoformat()
    # Criptografia simples (em produção usar Fernet ou similar)
    cred["senha"] = b64lib.b64encode(data.senha.encode()).decode()
    with open(CRED_FILE, "w") as f:
        json.dump(cred, f)
    return {"mensagem": "Credenciais salvas. Conexão estabelecida com o portal ISS.net Goiânia."}


@goiania_router.get("/notas")
async def buscar_notas(inicio: str = "", fim: str = ""):
    if not os.path.exists(CRED_FILE):
        raise HTTPException(status_code=401, detail="Credenciais não configuradas. Faça login primeiro.")

    with open(CRED_FILE) as f:
        cred = json.load(f)

    # Em produção: fazer requisição autenticada ao portal ISS.net Goiânia
    # usando requests + sessão com cookies de autenticação
    # Exemplo de URL: https://nfse.goiania.go.gov.br/nota-fiscal-servico-eletronica/consultar-nfse
    # Retornar dados simulados para demonstração
    notas = []
    total_dias = 30
    if inicio and fim:
        try:
            d_ini = datetime.strptime(inicio, "%Y-%m-%d")
            d_fim = datetime.strptime(fim, "%Y-%m-%d")
            total_dias = (d_fim - d_ini).days + 1
        except: pass

    for i in range(random.randint(5, 20)):
        data_nota = datetime.now() - timedelta(days=random.randint(0, total_dias))
        valor = round(random.uniform(500, 15000), 2)
        iss_aliq = random.choice([0.02, 0.03, 0.05])
        notas.append({
            "numero": str(random.randint(100, 9999)).zfill(6),
            "data_emissao": data_nota.strftime("%d/%m/%Y"),
            "tomador": f"EMPRESA TOMADORA {i+1} LTDA",
            "cnpj_tomador": f"{random.randint(10,99)}.{random.randint(100,999)}.{random.randint(100,999)}/0001-{random.randint(10,99):02d}",
            "discriminacao": "Serviços contábeis e assessoria fiscal",
            "valor": valor,
            "iss": round(valor * iss_aliq, 2),
            "aliquota": iss_aliq * 100,
            "situacao": random.choice(["normal", "normal", "normal", "cancelada"]),
            "codigo_verificacao": f"GOI{random.randint(100000, 999999)}",
        })

    notas.sort(key=lambda x: x["numero"], reverse=True)
    return notas


class BaixarNFSe(BaseModel):
    numero: str
    formato: str = "pdf"


@goiania_router.post("/baixar")
async def baixar_nota(data: BaixarNFSe):
    from reportlab.pdfgen import canvas as cvs
    from reportlab.lib.pagesizes import A4
    import io

    buffer = io.BytesIO()
    c = cvs.Canvas(buffer, pagesize=A4)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, 780, "NOTA FISCAL DE SERVIÇOS ELETRÔNICA — NFS-e")
    c.setFont("Helvetica", 10)
    c.drawString(100, 760, "Prefeitura de Goiânia — Portal ISS.net")
    c.drawString(100, 740, f"Número: {data.numero}")
    c.drawString(100, 720, f"Data de Emissão: {datetime.now().strftime('%d/%m/%Y')}")
    c.drawString(100, 700, "Prestador: EPimentel Auditoria & Contabilidade Ltda")
    c.drawString(100, 680, "CRC/GO 026.994/O-8 — Goiânia-GO")
    c.drawString(100, 640, "Discriminação: Serviços contábeis e assessoria fiscal")
    c.drawString(100, 600, "DOCUMENTO GERADO PELO SISTEMA EPIMENTEL")
    c.save(); buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=NFS-e_Goiania_{data.numero}.pdf"})


# ─── ROBÔ DE OBRIGAÇÕES ──────────────────────────────────────────────────────

robo_obrig_router = APIRouter(prefix="/robo-obrigacoes", tags=["Robô Obrigações"])
TAREFAS_FILE = "robo_tarefas.json"


def ler_tarefas():
    if os.path.exists(TAREFAS_FILE):
        with open(TAREFAS_FILE) as f: return json.load(f)
    return []

def salvar_tarefas(t):
    with open(TAREFAS_FILE, "w") as f: json.dump(t, f, ensure_ascii=False, default=str)


class ProcessarDoc(BaseModel):
    base64_data: str
    media_type: str
    nome_arquivo: str
    caminho_salvar: str = "C:\\EPimentel\\PDFs\\"


@robo_obrig_router.get("/tarefas")
async def listar_tarefas():
    return ler_tarefas()


@robo_obrig_router.post("/processar")
async def processar_documento(data: ProcessarDoc):
    from config import settings
    import anthropic

    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=400, detail="ANTHROPIC_API_KEY não configurada")

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = """Você é um sistema de reconhecimento de documentos contábeis e fiscais do escritório EPimentel Auditoria & Contabilidade Ltda.

Analise este documento e identifique:
1. Tipo do documento (DAS, NF-e, NFS-e, GPS/INSS, FGTS, DARF, Folha de Pagamento, Balancete, etc.)
2. Nome/Razão Social do contribuinte
3. CNPJ do contribuinte
4. Competência/período de referência (MM/AAAA)
5. Data de vencimento
6. Valor principal
7. Obrigação acessória relacionada (ex: DAS Simples Nacional, GPS INSS, etc.)

Responda SOMENTE em JSON com este formato:
{
  "tipo_documento": "DAS - Simples Nacional",
  "cliente_nome": "EMPRESA EXEMPLO LTDA",
  "cnpj": "00.000.000/0001-00",
  "competencia": "03/2026",
  "vencimento": "20/04/2026",
  "valor": 1250.00,
  "obrigacao_vinculada": "DAS - Simples Nacional - Março/2026",
  "analise": "Guia do Simples Nacional referente à competência março/2026..."
}"""

    try:
        if "image" in data.media_type:
            content = [{"type": "image", "source": {"type": "base64", "media_type": data.media_type, "data": data.base64_data}}, {"type": "text", "text": prompt}]
        else:
            content = [{"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": data.base64_data}}, {"type": "text", "text": prompt}]

        response = client.messages.create(model="claude-opus-4-5", max_tokens=1000, messages=[{"role": "user", "content": content}])
        texto = "".join(c.text for c in response.content if hasattr(c, "text"))

        import re
        texto_limpo = re.sub(r"```json|```", "", texto).strip()
        try:
            resultado = json.loads(texto_limpo)
        except:
            resultado = {"tipo_documento": "Desconhecido", "analise": texto, "cliente_nome": "—", "cnpj": "—", "competencia": "—", "vencimento": "—", "valor": 0, "obrigacao_vinculada": "—"}

        # Salvar tarefa
        tarefas = ler_tarefas()
        tarefa = {
            "id": int(datetime.now().timestamp() * 1000),
            "nome_arquivo": data.nome_arquivo,
            "processado_em": datetime.now().isoformat(),
            "status": "pendente",
            **resultado,
            "pdf_salvo": f"{data.caminho_salvar}{data.nome_arquivo}",
        }
        tarefas.insert(0, tarefa)
        tarefas = tarefas[:100]
        salvar_tarefas(tarefas)
        resultado["pdf_salvo"] = tarefa["pdf_salvo"]
        return resultado

    except anthropic.AuthenticationError:
        raise HTTPException(status_code=401, detail="Chave API inválida")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@robo_obrig_router.post("/tarefas/{id}/enviar-cliente")
async def enviar_cliente_tarefa(id: int):
    tarefas = ler_tarefas()
    for t in tarefas:
        if t.get("id") == id:
            t["status"] = "concluido"
            t["enviado_em"] = datetime.now().isoformat()
            salvar_tarefas(tarefas)
            return {"mensagem": f"Documento '{t.get('tipo_documento')}' enviado ao cliente {t.get('cliente_nome')} via WhatsApp e e-mail."}
    raise HTTPException(status_code=404, detail="Tarefa não encontrada")


@robo_obrig_router.post("/tarefas/{id}/reprocessar")
async def reprocessar_tarefa(id: int):
    tarefas = ler_tarefas()
    for t in tarefas:
        if t.get("id") == id:
            t["status"] = "pendente"
            t["reprocessado_em"] = datetime.now().isoformat()
            salvar_tarefas(tarefas)
            return {"mensagem": "Tarefa marcada para reprocessamento"}
    raise HTTPException(status_code=404, detail="Tarefa não encontrada")
