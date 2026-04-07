from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
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

class ConsultaRequest(BaseModel):
    cnpj: str
    tipo: str
    cert_path: Optional[str] = None
    cert_senha: Optional[str] = None

def limpar_cnpj(cnpj: str) -> str:
    return re.sub(r'\D', '', cnpj)

# ── 1. CNPJ via BrasilAPI ─────────────────────────────────────────────────────
@router.get("/cnpj/{cnpj}")
async def consultar_cnpj(cnpj: str):
    cnpj_limpo = limpar_cnpj(cnpj)
    if len(cnpj_limpo) != 14:
        raise HTTPException(400, "CNPJ inválido")
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.get(f"https://brasilapi.com.br/api/cnpj/v1/{cnpj_limpo}")
            if r.status_code == 200:
                d = r.json()
                return {
                    "status": "ok", "cnpj": cnpj_limpo,
                    "razao_social": d.get("razao_social"),
                    "situacao_cadastral": d.get("descricao_situacao_cadastral"),
                    "natureza_juridica": d.get("descricao_natureza_juridica"),
                    "atividade_principal": d.get("cnae_fiscal_descricao"),
                    "capital_social": d.get("capital_social"),
                    "endereco": {"logradouro": d.get("logradouro"), "numero": d.get("numero"), "municipio": d.get("municipio"), "uf": d.get("uf"), "cep": d.get("cep")},
                    "socios": d.get("qsa", []),
                    "consultado_em": datetime.now().isoformat(),
                }
            raise HTTPException(r.status_code, "CNPJ não encontrado")
        except httpx.TimeoutException:
            raise HTTPException(504, "Timeout")

# ── 2. Simples Nacional ───────────────────────────────────────────────────────
@router.get("/simples/{cnpj}")
async def consultar_simples(cnpj: str):
    cnpj_limpo = limpar_cnpj(cnpj)
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        try:
            r = await client.get(f"https://brasilapi.com.br/api/cnpj/v1/{cnpj_limpo}")
            if r.status_code == 200:
                d = r.json()
                return {
                    "status": "ok", "cnpj": cnpj_limpo,
                    "optante_simples": d.get("opcao_pelo_simples"),
                    "optante_mei": d.get("opcao_pelo_mei"),
                    "regime": "MEI" if d.get("opcao_pelo_mei") else ("Simples Nacional" if d.get("opcao_pelo_simples") else "Não optante"),
                    "data_opcao_simples": d.get("data_opcao_pelo_simples"),
                    "data_exclusao_simples": d.get("data_exclusao_do_simples"),
                    "consultado_em": datetime.now().isoformat(),
                }
        except Exception:
            pass
    return {"status": "indisponivel", "cnpj": cnpj_limpo, "consultado_em": datetime.now().isoformat()}

# ── 3. PGFN ───────────────────────────────────────────────────────────────────
@router.get("/pgfn/{cnpj}")
async def consultar_pgfn(cnpj: str):
    cnpj_limpo = limpar_cnpj(cnpj)
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0"}) as client:
        try:
            r = await client.get(f"https://www.regularize.pgfn.gov.br/api/v1/situacao-devedores/{cnpj_limpo}", timeout=15)
            if r.status_code == 200:
                d = r.json()
                return {"status": "ok", "cnpj": cnpj_limpo, "situacao": d.get("situacao", "—"), "possui_debito": d.get("possuiDebito", False), "consultado_em": datetime.now().isoformat()}
        except Exception:
            pass
    return {"status": "indisponivel", "cnpj": cnpj_limpo, "mensagem": "Consulte www.regularize.pgfn.gov.br", "consultado_em": datetime.now().isoformat()}

# ── 4. Consulta completa ──────────────────────────────────────────────────────
@router.get("/completo/{cnpj}")
async def consultar_completo(cnpj: str):
    cnpj_limpo = limpar_cnpj(cnpj)
    resultados = {}
    tasks = await asyncio.gather(consultar_cnpj(cnpj_limpo), consultar_simples(cnpj_limpo), consultar_pgfn(cnpj_limpo), return_exceptions=True)
    if not isinstance(tasks[0], Exception): resultados["cnpj"]    = tasks[0]
    if not isinstance(tasks[1], Exception): resultados["simples"]  = tasks[1]
    if not isinstance(tasks[2], Exception): resultados["pgfn"]     = tasks[2]
    sit = resultados.get("cnpj", {}).get("situacao_cadastral", "—")
    irregular = "ativa" not in str(sit).lower()
    pgfn_debito = resultados.get("pgfn", {}).get("possui_debito", False)
    pendencias = []
    if irregular: pendencias.append(f"Situação cadastral: {sit}")
    if pgfn_debito: pendencias.append("Débito ativo na PGFN")
    resultados["resumo"] = {"situacao_geral": "Irregular" if irregular or pgfn_debito else "Regular", "pendencias": pendencias, "consultado_em": datetime.now().isoformat()}
    return resultados

# ── 5. Upload certificado .pfx ────────────────────────────────────────────────
@router.post("/certificado/upload")
async def upload_certificado(arquivo: UploadFile = File(...)):
    if not arquivo.filename.endswith(('.pfx', '.p12')):
        raise HTTPException(400, "Apenas .pfx ou .p12")
    pasta = Path("certificados_servidor")
    pasta.mkdir(exist_ok=True)
    nome_seguro = re.sub(r'[^a-zA-Z0-9._-]', '_', arquivo.filename)
    caminho = pasta / nome_seguro
    conteudo = await arquivo.read()
    with open(caminho, "wb") as f:
        f.write(conteudo)
    return {"status": "ok", "arquivo": nome_seguro, "caminho": str(caminho), "mensagem": "Certificado salvo no servidor."}

# ── 6. Listar certificados no servidor ───────────────────────────────────────
@router.get("/certificados/listados")
async def listar_certificados():
    pasta = Path("certificados_servidor")
    if not pasta.exists():
        return {"certificados": []}
    certs = []
    for ext in ["*.pfx", "*.p12"]:
        for f in pasta.glob(ext):
            certs.append({"nome": f.name, "tamanho_kb": round(f.stat().st_size/1024, 1), "caminho": str(f)})
    return {"certificados": certs}

# ── 7. e-CAC com Playwright ───────────────────────────────────────────────────
@router.post("/ecac/autenticar")
async def autenticar_ecac(req: ConsultaRequest):
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        raise HTTPException(501, detail={"erro": "Playwright não instalado", "instrucao": "pip install playwright && playwright install chromium"})

    if not req.cert_path or not os.path.exists(req.cert_path):
        raise HTTPException(400, "Certificado não encontrado no servidor.")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(ignore_https_errors=True)
        try:
            page = await context.new_page()
            await page.goto("https://cav.receita.fazenda.gov.br/autenticacao/login", timeout=30000)
            await page.wait_for_load_state("networkidle", timeout=15000)
            titulo = await page.title()
            return {"status": "conectado", "cnpj": req.cnpj, "pagina": titulo, "consultado_em": datetime.now().isoformat()}
        except Exception as e:
            raise HTTPException(500, f"Erro ao acessar e-CAC: {str(e)}")
        finally:
            await browser.close()
