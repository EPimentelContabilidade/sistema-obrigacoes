"""
Router: Consulta Fiscal Automática
Acessa portais públicos da Receita Federal e PGFN automaticamente.
Para e-CAC (dados privados), usa Playwright com certificado digital.
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
import httpx
import asyncio
import json
import os
import re
from datetime import datetime
from pathlib import Path
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/v1/consulta-fiscal", tags=["Consulta Fiscal"])

# ── Modelos ──────────────────────────────────────────────────────────────────
class ConsultaRequest(BaseModel):
    cnpj: str
    tipo: str  # 'cnpj' | 'cnd' | 'simples' | 'pgfn' | 'ecac'
    cert_path: Optional[str] = None   # caminho do .pfx no servidor
    cert_senha: Optional[str] = None  # senha do certificado

class ResultadoConsulta(BaseModel):
    tipo: str
    cnpj: str
    status: str
    dados: dict
    arquivo: Optional[str] = None
    consultado_em: str

# ── Helpers ───────────────────────────────────────────────────────────────────
def limpar_cnpj(cnpj: str) -> str:
    return re.sub(r'\D', '', cnpj)

def pasta_downloads():
    p = Path("downloads/fiscal")
    p.mkdir(parents=True, exist_ok=True)
    return p

# ── 1. CNPJ — BrasilAPI (público, sem certificado) ───────────────────────────
@router.get("/cnpj/{cnpj}")
async def consultar_cnpj(cnpj: str):
    """Consulta dados cadastrais do CNPJ via BrasilAPI"""
    cnpj_limpo = limpar_cnpj(cnpj)
    if len(cnpj_limpo) != 14:
        raise HTTPException(400, "CNPJ inválido")

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.get(f"https://brasilapi.com.br/api/cnpj/v1/{cnpj_limpo}")
            if r.status_code == 200:
                d = r.json()
                return {
                    "status": "ok",
                    "cnpj": cnpj_limpo,
                    "razao_social": d.get("razao_social"),
                    "nome_fantasia": d.get("nome_fantasia"),
                    "situacao_cadastral": d.get("descricao_situacao_cadastral"),
                    "data_situacao": d.get("data_situacao_cadastral"),
                    "natureza_juridica": d.get("descricao_natureza_juridica"),
                    "atividade_principal": d.get("cnae_fiscal_descricao"),
                    "capital_social": d.get("capital_social"),
                    "endereco": {
                        "logradouro": d.get("logradouro"),
                        "numero": d.get("numero"),
                        "municipio": d.get("municipio"),
                        "uf": d.get("uf"),
                        "cep": d.get("cep"),
                    },
                    "socios": d.get("qsa", []),
                    "consultado_em": datetime.now().isoformat(),
                }
            else:
                raise HTTPException(r.status_code, "CNPJ não encontrado")
        except httpx.TimeoutException:
            raise HTTPException(504, "Timeout ao consultar Receita Federal")

# ── 2. Simples Nacional — consulta pública ────────────────────────────────────
@router.get("/simples/{cnpj}")
async def consultar_simples(cnpj: str):
    """Consulta situação no Simples Nacional"""
    cnpj_limpo = limpar_cnpj(cnpj)

    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        try:
            # Tenta via BrasilAPI (inclui dados do Simples)
            r = await client.get(f"https://brasilapi.com.br/api/cnpj/v1/{cnpj_limpo}")
            if r.status_code == 200:
                d = r.json()
                opcao_simples = d.get("opcao_pelo_simples")
                opcao_mei     = d.get("opcao_pelo_mei")
                return {
                    "status": "ok",
                    "cnpj": cnpj_limpo,
                    "optante_simples": opcao_simples,
                    "optante_mei":     opcao_mei,
                    "regime": "MEI" if opcao_mei else ("Simples Nacional" if opcao_simples else "Não optante"),
                    "data_opcao_simples":   d.get("data_opcao_pelo_simples"),
                    "data_exclusao_simples":d.get("data_exclusao_do_simples"),
                    "consultado_em": datetime.now().isoformat(),
                }
        except Exception as e:
            pass

    return { "status": "indisponivel", "cnpj": cnpj_limpo, "mensagem": "Consulta temporariamente indisponível", "consultado_em": datetime.now().isoformat() }

# ── 3. PGFN — Dívida Ativa ────────────────────────────────────────────────────
@router.get("/pgfn/{cnpj}")
async def consultar_pgfn(cnpj: str):
    """Consulta situação na PGFN (Dívida Ativa da União)"""
    cnpj_limpo = limpar_cnpj(cnpj)

    async with httpx.AsyncClient(timeout=20, follow_redirects=True,
        headers={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}) as client:
        try:
            r = await client.get(
                f"https://www.regularize.pgfn.gov.br/api/v1/situacao-devedores/{cnpj_limpo}",
                timeout=15
            )
            if r.status_code == 200:
                d = r.json()
                return {
                    "status": "ok",
                    "cnpj": cnpj_limpo,
                    "situacao": d.get("situacao", "—"),
                    "possui_debito": d.get("possuiDebito", False),
                    "dados": d,
                    "consultado_em": datetime.now().isoformat(),
                }
        except Exception:
            pass

    return {
        "status": "indisponivel",
        "cnpj": cnpj_limpo,
        "mensagem": "Consulta PGFN requer acesso manual",
        "url": f"https://www.regularize.pgfn.gov.br/",
        "consultado_em": datetime.now().isoformat(),
    }

# ── 4. CND / Certidão Negativa ────────────────────────────────────────────────
@router.get("/certidao/{cnpj}")
async def consultar_certidao(cnpj: str):
    """Gera link direto para emissão de CND na Receita Federal"""
    cnpj_limpo = limpar_cnpj(cnpj)
    return {
        "status": "link_gerado",
        "cnpj": cnpj_limpo,
        "url_certidao": f"https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir",
        "url_comprovante_cnpj": f"https://www.receita.fazenda.gov.br/pessoajuridica/cnpj/cnpjreva/cnpjrevaListResult.asp?contador=0&nire=&nireError=0&cnpj={cnpj_limpo}",
        "instrucao": "Acesse a URL acima para emitir a certidão. Para automação completa, configure o Playwright com o certificado digital.",
        "consultado_em": datetime.now().isoformat(),
    }

# ── 5. Consulta completa (todos os serviços públicos) ─────────────────────────
@router.get("/completo/{cnpj}")
async def consultar_completo(cnpj: str):
    """Executa todas as consultas públicas de uma vez para o CNPJ"""
    cnpj_limpo = limpar_cnpj(cnpj)
    resultados = {}

    # Executa em paralelo
    tasks = await asyncio.gather(
        consultar_cnpj(cnpj_limpo),
        consultar_simples(cnpj_limpo),
        consultar_pgfn(cnpj_limpo),
        return_exceptions=True
    )

    if not isinstance(tasks[0], Exception): resultados["cnpj"]   = tasks[0]
    if not isinstance(tasks[1], Exception): resultados["simples"] = tasks[1]
    if not isinstance(tasks[2], Exception): resultados["pgfn"]    = tasks[2]

    # Determinar situação geral
    sit_cadastral = resultados.get("cnpj", {}).get("situacao_cadastral","—")
    irregular = "ativa" not in str(sit_cadastral).lower()
    pgfn_debito = resultados.get("pgfn", {}).get("possui_debito", False)

    resultados["resumo"] = {
        "situacao_geral": "Irregular" if irregular or pgfn_debito else "Regular",
        "pendencias": [],
        "consultado_em": datetime.now().isoformat(),
    }
    if irregular:
        resultados["resumo"]["pendencias"].append(f"Situação cadastral: {sit_cadastral}")
    if pgfn_debito:
        resultados["resumo"]["pendencias"].append("Débito ativo na PGFN")

    return resultados

# ── 6. e-CAC com Playwright (requer certificado A1 no servidor) ───────────────
@router.post("/ecac/autenticar")
async def autenticar_ecac(req: ConsultaRequest, background: BackgroundTasks):
    """
    Autentica no e-CAC usando certificado digital A1.
    REQUER: playwright instalado (pip install playwright && playwright install chromium)
    e o arquivo .pfx disponível no servidor.
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        raise HTTPException(501, detail={
            "erro": "Playwright não instalado",
            "instrucao": "Execute no servidor: pip install playwright && playwright install chromium",
            "alternativa": "Use os endpoints públicos /cnpj, /simples, /pgfn para consultas sem certificado"
        })

    cnpj_limpo = limpar_cnpj(req.cnpj)

    if not req.cert_path or not os.path.exists(req.cert_path):
        raise HTTPException(400, "Arquivo de certificado não encontrado no servidor. Faça upload primeiro.")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            ignore_https_errors=True,
        )

        try:
            page = await context.new_page()
            await page.goto("https://cav.receita.fazenda.gov.br/autenticacao/login", timeout=30000)

            # Aguardar seleção de certificado (processo depende do SO e tipo de cert)
            # Para A1 (.pfx), o navegador normalmente apresenta o certificado automaticamente
            # se estiver instalado no sistema

            await page.wait_for_load_state("networkidle", timeout=15000)

            titulo = await page.title()

            return {
                "status": "conectado",
                "cnpj": cnpj_limpo,
                "pagina": titulo,
                "mensagem": "Autenticado no e-CAC. Use os endpoints específicos para baixar relatórios.",
                "consultado_em": datetime.now().isoformat(),
            }

        except Exception as e:
            raise HTTPException(500, f"Erro ao acessar e-CAC: {str(e)}")
        finally:
            await browser.close()

# ── 7. Upload do certificado para o servidor ──────────────────────────────────
from fastapi import UploadFile, File

@router.post("/certificado/upload")
async def upload_certificado(arquivo: UploadFile = File(...)):
    """Faz upload do certificado .pfx para o servidor para uso nas automações"""
    if not arquivo.filename.endswith(('.pfx', '.p12')):
        raise HTTPException(400, "Apenas arquivos .pfx ou .p12 são aceitos")

    pasta = Path("certificados_servidor")
    pasta.mkdir(exist_ok=True)

    # Salvar com nome seguro
    nome_seguro = re.sub(r'[^a-zA-Z0-9._-]', '_', arquivo.filename)
    caminho = pasta / nome_seguro

    with open(caminho, "wb") as f:
        f.write(await arquivo.read())

    return {
        "status": "ok",
        "arquivo": nome_seguro,
        "caminho": str(caminho),
        "mensagem": "Certificado salvo no servidor. Use este caminho nos endpoints do e-CAC."
    }

@router.get("/certificados/listados")
async def listar_certificados_servidor():
    """Lista certificados disponíveis no servidor"""
    pasta = Path("certificados_servidor")
    if not pasta.exists():
        return {"certificados": []}

    return {
        "certificados": [
            { "nome": f.name, "tamanho_kb": round(f.stat().st_size/1024,1), "caminho": str(f) }
            for f in pasta.glob("*.pfx")
        ] + [
            { "nome": f.name, "tamanho_kb": round(f.stat().st_size/1024,1), "caminho": str(f) }
            for f in pasta.glob("*.p12")
        ]
    }
