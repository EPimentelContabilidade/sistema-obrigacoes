from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import httpx
from config import settings
import anthropic

router = APIRouter(tags=["Receita Federal e Balanço"])

# ─── Consulta Receita Federal ───────────────────────────────────────────────

@router.get("/clientes/consultar-receita")
async def consultar_receita(cnpj: str = Query(...)):
    """Consulta dados da empresa na Receita Federal via API pública."""
    cnpj_limpo = "".join(filter(str.isdigit, cnpj))
    if len(cnpj_limpo) != 14:
        raise HTTPException(status_code=400, detail="CNPJ inválido.")

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"https://receitaws.com.br/v1/cnpj/{cnpj_limpo}")
            if r.status_code == 200:
                data = r.json()
                if data.get("status") == "ERROR":
                    raise HTTPException(status_code=404, detail=data.get("message", "CNPJ não encontrado"))
                return data
            elif r.status_code == 429:
                raise HTTPException(status_code=429, detail="Limite de consultas atingido. Tente novamente em 1 minuto.")
            else:
                raise HTTPException(status_code=r.status_code, detail="Erro na consulta à Receita Federal")
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Timeout na consulta. Tente novamente.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao consultar Receita Federal: {str(e)}")


@router.get("/clientes/por-cnpj")
async def buscar_por_cnpj(cnpj: str = Query(...)):
    """Busca cliente cadastrado pelo CNPJ."""
    from database import AsyncSessionLocal
    from models import Cliente
    from sqlalchemy import select

    cnpj_limpo = cnpj.replace(".", "").replace("/", "").replace("-", "")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Cliente).where(Cliente.cnpj.contains(cnpj_limpo[:8])))
        cliente = result.scalar_one_or_none()
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente não cadastrado")
        return {"id": cliente.id, "nome": cliente.nome, "cnpj": cliente.cnpj}


# ─── Análise de Balanço ──────────────────────────────────────────────────────

class BalancoRequest(BaseModel):
    base64_data: str
    media_type: str
    tipo_analise: str = "completa"


@router.post("/analise-balanco/analisar")
async def analisar_balanco(data: BalancoRequest):
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=400, detail="ANTHROPIC_API_KEY não configurada")

    prompts = {
        "completa": """Você é um analista financeiro especialista do escritório EPimentel Auditoria & Contabilidade Ltda, CRC/GO 026.994/O-8.

Analise este balanço patrimonial/demonstrativo financeiro e forneça:

1. INDICADORES CALCULADOS (calcule cada um com os valores do documento):
   - Liquidez Corrente (AC/PC)
   - Liquidez Seca ((AC - Estoques)/PC)  
   - Liquidez Imediata (Disponível/PC)
   - Endividamento Geral (PC+ELP/AT)
   - ROE (LL/PL)
   - ROA (LL/AT)
   - Margem Líquida (LL/Receita)

2. SCORE DE SAÚDE FINANCEIRA (0-100)

3. CLASSIFICAÇÃO (Excelente/Boa/Regular/Crítica)

4. PARECER TÉCNICO (3-5 parágrafos com análise profissional, pontos fortes, riscos e recomendações)

Responda APENAS em JSON com este formato:
{
  "indicadores": [
    {"grupo": "Liquidez", "itens": [{"nome": "Liquidez Corrente", "valor": 1.85, "referencia": ">1.5"}]},
    {"grupo": "Endividamento", "itens": [{"nome": "Endividamento Geral", "valor": 45.2, "referencia": "<60%"}]},
    {"grupo": "Rentabilidade", "itens": [{"nome": "ROE", "valor": 12.5, "referencia": ">10%"}]}
  ],
  "score": 72,
  "classificacao": "Situação Financeira Boa",
  "recomendacao": "Empresa apresenta boa saúde financeira com pontos de atenção em...",
  "parecer": "Texto completo do parecer técnico..."
}""",
        "credito": "Analise este balanço focando em análise de crédito e risco. Calcule os principais indicadores e gere um score de crédito de 0 a 1000. Responda em JSON.",
        "liquidez": "Analise este balanço focando nos indicadores de liquidez. Detalhe a capacidade de pagamento de curto, médio e longo prazo. Responda em JSON.",
    }

    prompt = prompts.get(data.tipo_analise, prompts["completa"])
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    try:
        if "image" in data.media_type:
            content = [
                {"type": "image", "source": {"type": "base64", "media_type": data.media_type, "data": data.base64_data}},
                {"type": "text", "text": prompt}
            ]
        else:
            content = [
                {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": data.base64_data}},
                {"type": "text", "text": prompt}
            ]

        response = client.messages.create(model="claude-opus-4-5", max_tokens=3000, messages=[{"role": "user", "content": content}])
        texto = "".join(c.text for c in response.content if hasattr(c, "text"))

        import json, re
        texto_limpo = re.sub(r"```json|```", "", texto).strip()
        try:
            return json.loads(texto_limpo)
        except:
            return {"parecer": texto, "indicadores": [], "score": None, "classificacao": "Análise concluída"}

    except anthropic.AuthenticationError:
        raise HTTPException(status_code=401, detail="Chave API inválida")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
