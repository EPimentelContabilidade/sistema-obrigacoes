from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import httpx
import os
import json
from datetime import datetime

router = APIRouter(prefix="/api/v1/retencoes", tags=["retencoes"])
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")


class DadosNF(BaseModel):
    cliente_id: Optional[str] = None
    cliente_nome: Optional[str] = None
    fornecedor: str
    numero_nf: Optional[str] = None
    data_emissao: Optional[str] = None
    valor_bruto: float
    descricao_servico: str
    tipo_servico: str


class RetencaoItem(BaseModel):
    tributo: str
    incide: bool
    aliquota: Optional[float] = None
    base_calculo: Optional[float] = None
    valor: Optional[float] = None
    fundamentacao: str
    observacao: Optional[str] = None


class ResultadoAnalise(BaseModel):
    retencoes: List[RetencaoItem]
    valor_bruto: float
    total_retencoes: float
    valor_liquido: float
    alertas: List[str]
    resumo: str


class AnaliseResponse(BaseModel):
    id: str
    dados_nf: DadosNF
    resultado: ResultadoAnalise
    criado_em: str


_historico: List[dict] = []


@router.post("/analisar", response_model=AnaliseResponse)
async def analisar_retencoes(dados: DadosNF):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY nao configurada")
    prompt = (
        "Voce e contador BR especialista em retencoes tributarias.\n"
        "Determine tributos a reter. Responda APENAS JSON sem markdown:\n"
        "{\"retencoes\":[{\"tributo\":\"INSS\",\"incide\":true,\"aliquota\":11.0,\"base_calculo\":1000,\"valor\":110.0,\"fundamentacao\":\"Lei 9.711/98\",\"observacao\":\"\"},...],\"alertas\":[],\"resumo\":\"\"}\n"
        "REGRAS: Simples=ISS/PIS/COFINS/CSLL nao retidos; INSS 11pct cessao mao obra; IRRF vigilancia 1pct; base=valor_bruto\n"
        f"Prestador={dados.fornecedor} Tomador={dados.cliente_nome} NF={dados.numero_nf} Valor=R${dados.valor_bruto:.2f} Servico={dados.descricao_servico} Tipo={dados.tipo_servico}"
    )
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json={"model": "claude-haiku-4-5-20251001", "max_tokens": 2000, "messages": [{"role": "user", "content": prompt}]},
            )
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=r.text)
        text = r.json()["content"][0]["text"].strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            text = text[4:] if text.startswith("json") else text
        if text.endswith("```"): text = text[:-3]
        parsed = json.loads(text.strip())
        retencoes = []; total = 0.0
        for item in parsed.get("retencoes", []):
            v = item.get("valor") or 0.0
            if item.get("incide") and v: total += float(v)
            retencoes.append(RetencaoItem(
                tributo=item["tributo"], incide=item["incide"],
                aliquota=item.get("aliquota"), base_calculo=item.get("base_calculo"),
                valor=item.get("valor"), fundamentacao=item.get("fundamentacao", ""),
                observacao=item.get("observacao")))
        resultado = ResultadoAnalise(
            retencoes=retencoes, valor_bruto=dados.valor_bruto,
            total_retencoes=round(total, 2), valor_liquido=round(dados.valor_bruto - total, 2),
            alertas=parsed.get("alertas", []), resumo=parsed.get("resumo", ""))
        aid = f"RET-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        _historico.append({"id": aid, "dados_nf": dados.dict(), "resultado": resultado.dict(), "criado_em": datetime.now().isoformat()})
        return AnaliseResponse(id=aid, dados_nf=dados, resultado=resultado, criado_em=datetime.now().isoformat())
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Erro JSON: {str(e)}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Erro conexao: {str(e)}")


@router.get("/historico")
async def listar_historico():
    return {"total": len(_historico), "analises": _historico}


@router.delete("/historico/{analise_id}")
async def deletar_analise(analise_id: str):
    global _historico
    antes = len(_historico)
    _historico = [a for a in _historico if a["id"] != analise_id]
    if len(_historico) == antes:
        raise HTTPException(status_code=404, detail="Analise nao encontrada")
    return {"ok": True}


class ProxyRequest(BaseModel):
    model: str
    max_tokens: int = 2000
    messages: list


@router.post("/proxy")
async def anthropic_proxy(req: ProxyRequest):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY nao configurada")
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json={"model": req.model, "max_tokens": req.max_tokens, "messages": req.messages},
            )
        return r.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=str(e))
