from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx
import os
import json
import re

router = APIRouter(prefix="/ai", tags=["IA"])

ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")

class DocumentoRequest(BaseModel):
    arquivo_b64:  str            # base64 do arquivo
    arquivo_nome: str            # nome do arquivo original
    arquivo_tipo: str = "application/pdf"  # MIME type
    obrigacoes_catalogo: list = []  # lista de obrigacoes para matching
    clientes: list = []          # lista de clientes para matching
    prompt_extra: str = ""       # instrucoes extras do usuario

class DocumentoResponse(BaseModel):
    tipo_documento:   str
    tipo_confianca:   float
    campos:           dict
    obrigacao_match:  Optional[str] = None
    obrigacao_confianca: float = 0.0
    cliente_match:    Optional[str] = None
    resumo_ia:        str
    modo:             str  # "claude" | "heuristica"
    tokens_usados:    int = 0

def analise_heuristica(nome: str) -> dict:
    """Analise por padrao quando nao ha chave de API."""
    nome_lower = nome.lower()
    
    PADROES = [
        (r'das|pgdas|simples',           'DAS / Simples Nacional', 'guia'),
        (r'dctf|dctfweb',                'DCTFWeb',                'guia'),
        (r'darf.*irpj|irpj.*darf',       'DARF IRPJ',             'darf'),
        (r'darf.*csll|csll.*darf',       'DARF CSLL',             'darf'),
        (r'darf.*pis|pis.*darf',         'DARF PIS',              'darf'),
        (r'darf.*cofins',                'DARF COFINS',           'darf'),
        (r'darf',                        'DARF',                  'darf'),
        (r'nfs|nfe|nf-e|nota.*fiscal',   'Nota Fiscal',           'nfe'),
        (r'caged',                       'CAGED',                 'guia'),
        (r'esocial|e-social',            'eSocial',               'guia'),
        (r'fgts',                        'FGTS',                  'guia'),
        (r'inss|gps',                    'GPS / INSS',            'guia'),
        (r'folha|payroll|holerite',      'Folha de Pagamento',    'folha'),
        (r'sped|efd',                    'SPED / EFD',            'sped'),
        (r'balancete|balanco',           'Balancete',             'balancete'),
        (r'extrato',                     'Extrato Bancário',      'extrato'),
        (r'certidao|cnd|cpd-en',         'Certidão',              'certidao'),
        (r'contrato',                    'Contrato',              'contrato'),
        (r'dirf',                        'DIRF',                  'guia'),
        (r'rais',                        'RAIS',                  'guia'),
    ]
    
    for padrao, tipo, tipo_id in PADROES:
        if re.search(padrao, nome_lower):
            # Extrair competencia do nome
            comp = None
            m = re.search(r'(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[_\-\s]*(\d{4})', nome_lower)
            if m:
                meses = {'jan':'01','fev':'02','mar':'03','abr':'04','mai':'05','jun':'06',
                         'jul':'07','ago':'08','set':'09','out':'10','nov':'11','dez':'12'}
                comp = f"{meses.get(m.group(1),'01')}/{m.group(2)}"
            m2 = re.search(r'(\d{4})[_\-\.](\d{2})', nome)
            if m2 and not comp:
                comp = f"{m2.group(2)}/{m2.group(1)}"
            
            return {
                'tipo_documento': tipo,
                'tipo_id': tipo_id,
                'tipo_confianca': 0.75,
                'competencia': comp or '',
                'resumo': f'Identificado como {tipo} pelo padrão do nome do arquivo.',
                'modo': 'heuristica'
            }
    
    return {
        'tipo_documento': 'Documento Fiscal',
        'tipo_id': 'guia',
        'tipo_confianca': 0.3,
        'competencia': '',
        'resumo': 'Tipo não identificado automaticamente.',
        'modo': 'heuristica'
    }


@router.post("/analisar-documento", response_model=DocumentoResponse)
async def analisar_documento(req: DocumentoRequest):
    """
    Analisa documento fiscal com Claude IA.
    Extrai tipo, campos, competência, valor, CNPJ etc.
    Faz matching com catálogo de obrigações e clientes.
    """
    # Heurística de fallback (sem API key ou erro)
    heur = analise_heuristica(req.arquivo_nome)
    
    if not ANTHROPIC_KEY:
        # Sem API key: retornar análise heurística
        return DocumentoResponse(
            tipo_documento=heur['tipo_documento'],
            tipo_confianca=heur['tipo_confianca'],
            campos={'competencia': heur['competencia'], 'nome_documento': req.arquivo_nome},
            obrigacao_match=_match_obrigacao(heur['tipo_documento'], req.obrigacoes_catalogo),
            obrigacao_confianca=0.6 if heur['tipo_confianca'] > 0.5 else 0.0,
            cliente_match=None,
            resumo_ia=heur['resumo'] + ' Configure ANTHROPIC_API_KEY no Railway para análise completa.',
            modo='heuristica',
        )
    
    # Montar catálogo para o prompt
    catalogo_str = ''
    if req.obrigacoes_catalogo:
        catalogo_str = 'Obrigações no sistema: ' + ', '.join([o.get('nome','') for o in req.obrigacoes_catalogo[:20]])
    
    clientes_str = ''
    if req.clientes:
        clientes_str = 'Clientes no sistema: ' + ', '.join([c.get('nome','')[:30] for c in req.clientes[:10]])
    
    prompt = f"""Você é um especialista em documentos fiscais brasileiros. Analise este documento e responda em JSON puro (sem markdown).

{catalogo_str}
{clientes_str}
{req.prompt_extra}

Extraia TODOS os campos disponíveis e retorne exatamente neste formato JSON:
{{
  "tipo_documento": "nome do tipo (DAS, DARF, NF-e, DCTFWeb, CAGED, eSocial, Folha, SPED, etc.)",
  "tipo_confianca": 0.0 a 1.0,
  "campos": {{
    "competencia": "MM/AAAA",
    "vencimento": "DD/MM/AAAA",
    "valor": "R$ X.XXX,XX",
    "valor_multa": "R$ X,XX ou vazio",
    "valor_juros": "R$ X,XX ou vazio",
    "cnpj": "XX.XXX.XXX/XXXX-XX",
    "razao_social": "nome da empresa",
    "codigo_barras": "linha digitavel se houver",
    "numero_doc": "numero ou protocolo",
    "tipo_tributo": "IRPJ/CSLL/PIS/COFINS/ISS/etc",
    "codigo_receita": "se DARF",
    "periodo_apuracao": "periodo do tributo",
    "responsavel": "nome do assinante se houver"
  }},
  "obrigacao_match": "nome da obrigação do catálogo que melhor se encaixa ou null",
  "obrigacao_confianca": 0.0 a 1.0,
  "cliente_match": "nome do cliente do sistema que corresponde ao CNPJ/razão social ou null",
  "resumo_ia": "1-2 frases descrevendo o documento identificado"
}}"""

    try:
        content_parts = [{"type": "text", "text": prompt}]
        
        # Adicionar documento (PDF como base64)
        if req.arquivo_b64:
            # Tentar como documento
            if 'pdf' in req.arquivo_tipo.lower():
                content_parts.insert(0, {
                    "type": "document",
                    "source": {"type": "base64", "media_type": "application/pdf", "data": req.arquivo_b64}
                })
            elif any(x in req.arquivo_tipo.lower() for x in ['image', 'png', 'jpg', 'jpeg']):
                content_parts.insert(0, {
                    "type": "image",
                    "source": {"type": "base64", "media_type": req.arquivo_tipo, "data": req.arquivo_b64}
                })
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-opus-4-6",
                    "max_tokens": 1500,
                    "messages": [{"role": "user", "content": content_parts}]
                }
            )
        
        data = response.json()
        if response.status_code != 200:
            raise HTTPException(500, f"Claude API erro: {data.get('error', {}).get('message', 'desconhecido')}")
        
        text = data['content'][0]['text'].strip()
        tokens = data.get('usage', {}).get('output_tokens', 0)
        
        # Extrair JSON da resposta
        json_match = re.search(r'\{[\s\S]*\}', text)
        if not json_match:
            raise ValueError("Resposta sem JSON")
        
        resultado = json.loads(json_match.group())
        
        return DocumentoResponse(
            tipo_documento   = resultado.get('tipo_documento', heur['tipo_documento']),
            tipo_confianca   = float(resultado.get('tipo_confianca', 0.85)),
            campos           = resultado.get('campos', {}),
            obrigacao_match  = resultado.get('obrigacao_match'),
            obrigacao_confianca = float(resultado.get('obrigacao_confianca', 0.0)),
            cliente_match    = resultado.get('cliente_match'),
            resumo_ia        = resultado.get('resumo_ia', 'Documento analisado pela IA.'),
            modo             = 'claude',
            tokens_usados    = tokens,
        )
    
    except Exception as e:
        # Fallback para heurística se IA falhar
        return DocumentoResponse(
            tipo_documento=heur['tipo_documento'],
            tipo_confianca=heur['tipo_confianca'],
            campos={'competencia': heur['competencia'], 'nome_documento': req.arquivo_nome},
            obrigacao_match=_match_obrigacao(heur['tipo_documento'], req.obrigacoes_catalogo),
            obrigacao_confianca=0.5,
            cliente_match=None,
            resumo_ia=f'IA Claude indisponível ({str(e)[:80]}). Análise por padrão do nome.',
            modo='heuristica',
        )


def _match_obrigacao(tipo_doc: str, catalogo: list) -> Optional[str]:
    if not catalogo: return None
    tipo_lower = tipo_doc.lower()
    for o in catalogo:
        nome_lower = (o.get('nome','') or o.get('codigo','')).lower()
        if any(p in tipo_lower for p in nome_lower.split()):
            return o.get('nome') or o.get('codigo')
    return None
