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
    competencia: Optional[str] = None
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


# Armazenamento em memória (substituir por banco de dados se necessário)
_historico: List[dict] = []


@router.post("/analisar", response_model=AnaliseResponse)
async def analisar_retencoes(dados: DadosNF):
    """
    Analisa as retenções tributárias de uma nota fiscal usando Claude IA.
    Identifica INSS, ISS, IRRF, PIS, COFINS e CSLL com fundamentação legal.
    """
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY não configurada no servidor")

    prompt = f"""Você é um contador brasileiro especialista em retenções tributárias.
Analise os dados da nota fiscal abaixo e determine quais tributos devem ser retidos pelo tomador.

DADOS DA NOTA FISCAL:
- Prestador/Fornecedor: {dados.fornecedor}
- Tomador/Cliente: {dados.cliente_nome or 'Não informado'}
- Número NF: {dados.numero_nf or 'Não informado'}
- Data Emissão: {dados.data_emissao or 'Não informado'}
- Competência: {dados.competencia or 'Não informado'}
- Valor Bruto: R$ {dados.valor_bruto:.2f}
- Descrição do Serviço: {dados.descricao_servico}
- Tipo de Serviço: {dados.tipo_servico}

Responda APENAS em JSON com esta estrutura exata:
{{
  "retencoes": [
    {{
      "tributo": "INSS",
      "incide": true/false,
      "aliquota": 11.0,
      "base_calculo": {dados.valor_bruto},
      "valor": 0.0,
      "fundamentacao": "Art. X da Lei Y",
      "observacao": "texto opcional"
    }},
    {{
      "tributo": "ISS",
      "incide": true/false,
      "aliquota": 2.0,
      "base_calculo": {dados.valor_bruto},
      "valor": 0.0,
      "fundamentacao": "LC 116/2003",
      "observacao": "texto opcional"
    }},
    {{
      "tributo": "IRRF",
      "incide": true/false,
      "aliquota": 1.5,
      "base_calculo": {dados.valor_bruto},
      "valor": 0.0,
      "fundamentacao": "Art. X do RIR",
      "observacao": "texto opcional"
    }},
    {{
      "tributo": "PIS",
      "incide": true/false,
      "aliquota": 0.65,
      "base_calculo": {dados.valor_bruto},
      "valor": 0.0,
      "fundamentacao": "Lei 9.718/98",
      "observacao": "texto opcional"
    }},
    {{
      "tributo": "COFINS",
      "incide": true/false,
      "aliquota": 3.0,
      "base_calculo": {dados.valor_bruto},
      "valor": 0.0,
      "fundamentacao": "Lei 9.718/98",
      "observacao": "texto opcional"
    }},
    {{
      "tributo": "CSLL",
      "incide": true/false,
      "aliquota": 1.0,
      "base_calculo": {dados.valor_bruto},
      "valor": 0.0,
      "fundamentacao": "Lei 7.689/88",
      "observacao": "texto opcional"
    }}
  ],
  "alertas": ["lista de alertas importantes, ex: prestador Simples Nacional"],
  "resumo": "resumo textual da análise"
}}

REGRAS IMPORTANTES:
- Se o prestador for optante do Simples Nacional: ISS NÃO é retido (LC 123/2006 art. 21 §4º); INSS pode ser retido se for cessão de mão de obra; PIS/COFINS/CSLL não são retidos
- INSS 11% incide em cessão de mão de obra e empreitada (Lei 9.711/98)
- PIS/COFINS/CSLL somente quando tomador for PJ e valor >= R$ 215,05 (IN RFB 2.145/2023)
- IRRF sobre serviços: limpeza 1%, vigilância 1%, TI 1.5%, consultoria 1.5%, construção civil 1%
- Preencha "valor" com o cálculo correto: base_calculo * aliquota / 100
- Se não incide, coloque aliquota: null, base_calculo: null, valor: null
"""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 2000,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Erro na API Claude: {response.text}")

        data = response.json()
        text = data["content"][0]["text"].strip()

        # Limpar markdown se houver
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        if text.endswith("```"):
            text = text[:-3]

        parsed = json.loads(text.strip())

        retencoes = []
        total_retencoes = 0.0

        for r in parsed.get("retencoes", []):
            valor = r.get("valor") or 0.0
            if r.get("incide") and valor:
                total_retencoes += float(valor)
            retencoes.append(RetencaoItem(
                tributo=r["tributo"],
                incide=r["incide"],
                aliquota=r.get("aliquota"),
                base_calculo=r.get("base_calculo"),
                valor=r.get("valor"),
                fundamentacao=r.get("fundamentacao", ""),
                observacao=r.get("observacao"),
            ))

        resultado = ResultadoAnalise(
            retencoes=retencoes,
            valor_bruto=dados.valor_bruto,
            total_retencoes=round(total_retencoes, 2),
            valor_liquido=round(dados.valor_bruto - total_retencoes, 2),
            alertas=parsed.get("alertas", []),
            resumo=parsed.get("resumo", ""),
        )

        analise_id = f"RET-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        criado_em = datetime.now().isoformat()

        registro = {
            "id": analise_id,
            "dados_nf": dados.dict(),
            "resultado": resultado.dict(),
            "criado_em": criado_em,
        }
        _historico.append(registro)

        return AnaliseResponse(
            id=analise_id,
            dados_nf=dados,
            resultado=resultado,
            criado_em=criado_em,
        )

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao interpretar resposta da IA: {str(e)}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Erro de conexão com API Claude: {str(e)}")


@router.get("/historico")
async def listar_historico():
    """Retorna o histórico de análises realizadas."""
    return {"total": len(_historico), "analises": _historico}


@router.delete("/historico/{analise_id}")
async def deletar_analise(analise_id: str):
    """Remove uma análise do histórico."""
    global _historico
    antes = len(_historico)
    _historico = [a for a in _historico if a["id"] != analise_id]
    if len(_historico) == antes:
        raise HTTPException(status_code=404, detail="Análise não encontrada")
    return {"ok": True}
