from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx, os, json, re, base64

router = APIRouter(prefix="/ai", tags=["IA"])

# Prioridade de provedores:
# 1. Google Gemini Flash 2.0 (GRATUITO - 1500 req/dia, sem custo)
# 2. Claude Haiku 4.5        (BARATISSIMO - ~$0.25/1M tokens input)
# 3. Analise heuristica      (GRATIS, sem API)

GOOGLE_KEY    = os.getenv("GOOGLE_AI_KEY", "")       # Gemini Flash — GRATIS
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")   # Claude Haiku  — barato

# Modelo mais barato da Anthropic que suporta documentos
CLAUDE_MODEL  = "claude-haiku-4-5-20251001"
# Gemini Flash 2.0 — gratuito com 1500 req/dia
GEMINI_MODEL  = "gemini-2.0-flash"

PROMPT_EXTRACAO = """Voce e um especialista em documentos fiscais brasileiros.
Analise este documento e responda APENAS com JSON puro (sem markdown, sem texto extra).

Extraia os campos disponiveis:
{
  "tipo_documento": "DAS|DARF|DCTFWeb|NF-e|CAGED|eSocial|FGTS|GPS|Folha|SPED|Balancete|Certidao|DIRF|Outro",
  "tipo_confianca": 0.0,
  "campos": {
    "competencia": "MM/AAAA",
    "vencimento": "DD/MM/AAAA",
    "valor": "R$ X.XXX,XX",
    "valor_multa": "",
    "cnpj": "XX.XXX.XXX/XXXX-XX",
    "razao_social": "",
    "codigo_barras": "",
    "numero_doc": "",
    "tipo_tributo": "",
    "codigo_receita": "",
    "responsavel": ""
  },
  "obrigacao_match": null,
  "obrigacao_confianca": 0.0,
  "cliente_match": null,
  "resumo_ia": "Descricao em 1 frase"
}"""


class DocumentoRequest(BaseModel):
    arquivo_b64:  str
    arquivo_nome: str
    arquivo_tipo: str = "application/pdf"
    obrigacoes_catalogo: list = []
    clientes: list = []

class DocumentoResponse(BaseModel):
    tipo_documento:      str
    tipo_confianca:      float
    campos:              dict
    obrigacao_match:     Optional[str] = None
    obrigacao_confianca: float = 0.0
    cliente_match:       Optional[str] = None
    resumo_ia:           str
    modo:                str
    tokens_usados:       int = 0
    provedor:            str = "heuristica"


def analise_heuristica(nome: str, obrigacoes: list = [], clientes: list = []) -> dict:
    nome_lower = nome.lower()
    PADROES = [
        (r'das|pgdas|simples',       'DAS / Simples Nacional', 0.80),
        (r'dctf|dctfweb',            'DCTFWeb',                0.85),
        (r'darf.*irpj|irpj',         'DARF IRPJ',             0.80),
        (r'darf.*csll|csll',         'DARF CSLL',             0.80),
        (r'darf',                    'DARF',                  0.75),
        (r'nfs|nfe|nota.*fiscal',    'NF-e / NFS-e',          0.80),
        (r'caged',                   'CAGED',                 0.90),
        (r'esocial|e-social',        'eSocial',               0.90),
        (r'fgts',                    'FGTS',                  0.90),
        (r'inss|gps',                'GPS / INSS',            0.80),
        (r'folha|payroll',           'Folha de Pagamento',    0.80),
        (r'sped|efd',                'SPED / EFD',            0.85),
        (r'balanc|balancete',        'Balancete',             0.80),
        (r'certid|cnd',              'Certidao',              0.80),
        (r'dirf|rais',               'DIRF / RAIS',           0.80),
    ]
    tipo, confianca = 'Documento Fiscal', 0.30
    for padrao, t, c in PADROES:
        if re.search(padrao, nome_lower):
            tipo, confianca = t, c
            break
    comp = ''
    m = re.search(r'(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[_\-\s]*(\d{4})', nome_lower)
    if m:
        mm = {'jan':'01','fev':'02','mar':'03','abr':'04','mai':'05','jun':'06',
              'jul':'07','ago':'08','set':'09','out':'10','nov':'11','dez':'12'}
        comp = mm.get(m.group(1),'01') + '/' + m.group(2)
    else:
        m2 = re.search(r'(\d{4})[_\-\.](\d{2})', nome)
        if m2: comp = m2.group(2) + '/' + m2.group(1)
    ob_match = None
    for o in obrigacoes:
        if any(p in (o.get('nome','') or o.get('codigo','')).lower()
               for p in tipo.lower().split('/')):
            ob_match = o.get('nome') or o.get('codigo')
            break
    return dict(tipo_documento=tipo, tipo_confianca=confianca,
                campos=dict(competencia=comp, nome_documento=nome),
                obrigacao_match=ob_match, obrigacao_confianca=0.55 if ob_match else 0.0,
                cliente_match=None,
                resumo_ia=f'{tipo} identificado pelo padrao do nome.',
                modo='heuristica', tokens_usados=0, provedor='heuristica')


async def chamar_gemini(b64: str, mime: str, obrig: list, clientes: list, nome: str) -> Optional[dict]:
    """Gemini Flash 2.0 — GRATUITO (1500 req/dia)"""
    if not GOOGLE_KEY:
        return None
    ctx = ''
    if obrig:
        ctx += 'Obrigacoes: ' + ', '.join(o.get('nome','') for o in obrig[:15]) + '. '
    if clientes:
        ctx += 'Clientes: ' + ', '.join(c.get('nome','')[:25] for c in clientes[:10]) + '.'

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GOOGLE_KEY}"

    # Gemini aceita PDF e imagens em base64
    parts = []
    if b64:
        parts.append({"inline_data": {"mime_type": mime, "data": b64}})
    parts.append({"text": PROMPT_EXTRACAO + ('\n\n' + ctx if ctx else '')})

    body = {"contents": [{"parts": parts}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1000}}
    async with httpx.AsyncClient(timeout=45.0) as c:
        r = await c.post(url, json=body)
    if r.status_code != 200:
        return None
    data = r.json()
    text = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
    tokens = data.get('usageMetadata', {}).get('totalTokenCount', 0)
    m = re.search(r'\{[\s\S]*\}', text)
    if not m:
        return None
    res = json.loads(m.group())
    res['tokens_usados'] = tokens
    res['provedor'] = 'gemini-flash-gratis'
    return res


async def chamar_claude_haiku(b64: str, mime: str, obrig: list, clientes: list, nome: str) -> Optional[dict]:
    """Claude Haiku 4.5 — Mais barato da Anthropic com visao de documentos"""
    if not ANTHROPIC_KEY:
        return None
    ctx = ''
    if obrig:
        ctx += 'Obrigacoes: ' + ', '.join(o.get('nome','') for o in obrig[:15]) + '. '
    if clientes:
        ctx += 'Clientes: ' + ', '.join(c.get('nome','')[:25] for c in clientes[:10]) + '.'

    content = []
    if b64:
        if 'pdf' in mime.lower():
            content.append({"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": b64}})
        elif any(x in mime.lower() for x in ['image', 'png', 'jpg', 'jpeg']):
            content.append({"type": "image", "source": {"type": "base64", "media_type": mime, "data": b64}})
    content.append({"type": "text", "text": PROMPT_EXTRACAO + ('\n\n' + ctx if ctx else '')})

    async with httpx.AsyncClient(timeout=45.0) as c:
        r = await c.post("https://api.anthropic.com/v1/messages",
            headers={"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": CLAUDE_MODEL, "max_tokens": 800, "messages": [{"role": "user", "content": content}]})
    if r.status_code != 200:
        return None
    data = r.json()
    text = data.get('content', [{}])[0].get('text', '')
    tokens = data.get('usage', {}).get('output_tokens', 0)
    m = re.search(r'\{[\s\S]*\}', text)
    if not m:
        return None
    res = json.loads(m.group())
    res['tokens_usados'] = tokens
    res['provedor'] = 'claude-haiku'
    return res


@router.post("/analisar-documento", response_model=DocumentoResponse)
async def analisar_documento(req: DocumentoRequest):
    """
    Analisa documento fiscal.
    Prioridade: Gemini Flash (gratis) > Claude Haiku (barato) > Heuristica (offline)
    """
    heur = analise_heuristica(req.arquivo_nome, req.obrigacoes_catalogo, req.clientes)
    result = None

    # 1. Tentar Gemini Flash — GRATUITO
    if GOOGLE_KEY and req.arquivo_b64:
        try:
            result = await chamar_gemini(req.arquivo_b64, req.arquivo_tipo,
                                         req.obrigacoes_catalogo, req.clientes, req.arquivo_nome)
        except Exception as e:
            print(f"[IA] Gemini falhou: {e}")

    # 2. Tentar Claude Haiku — barato
    if not result and ANTHROPIC_KEY and req.arquivo_b64:
        try:
            result = await chamar_claude_haiku(req.arquivo_b64, req.arquivo_tipo,
                                               req.obrigacoes_catalogo, req.clientes, req.arquivo_nome)
        except Exception as e:
            print(f"[IA] Claude Haiku falhou: {e}")

    # 3. Fallback heuristica
    if not result:
        return DocumentoResponse(**heur)

    return DocumentoResponse(
        tipo_documento      = result.get('tipo_documento', heur['tipo_documento']),
        tipo_confianca      = float(result.get('tipo_confianca', 0.85)),
        campos              = result.get('campos', heur['campos']),
        obrigacao_match     = result.get('obrigacao_match') or heur['obrigacao_match'],
        obrigacao_confianca = float(result.get('obrigacao_confianca', 0.6)),
        cliente_match       = result.get('cliente_match'),
        resumo_ia           = result.get('resumo_ia', heur['resumo_ia']),
        modo                = 'ia',
        tokens_usados       = result.get('tokens_usados', 0),
        provedor            = result.get('provedor', 'desconhecido'),
    )


@router.get("/status")
async def status_ia():
    """Retorna o status e provedor ativo."""
    if GOOGLE_KEY:
        prov, plano = "Google Gemini Flash 2.0", "Gratuito (1500 req/dia)"
    elif ANTHROPIC_KEY:
        prov, plano = "Claude Haiku 4.5", "Pago (~$0.25/1M tokens)"
    else:
        prov, plano = "Heuristica local", "Gratuito (offline)"
    return {"provedor": prov, "plano": plano,
            "gemini_configurado": bool(GOOGLE_KEY),
            "anthropic_configurado": bool(ANTHROPIC_KEY)}
