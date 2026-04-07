"""
Router: ecac_download.py
Baixa automaticamente CND e Parcelamentos do e-CAC / PGFN
usando certificado digital A1 (.pfx) via Playwright.
"""

import os
import asyncio
import tempfile
import zipfile
from pathlib import Path
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/ecac", tags=["ecac-download"])

CERT_DIR = Path("/app/certificados_servidor")
DOWNLOAD_DIR = Path("/app/downloads_temp")
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ── Schemas ───────────────────────────────────────────────────────────────────

class BaixarRequest(BaseModel):
    cnpj: str
    cert_path: str           # caminho relativo em /app/certificados_servidor
    cert_senha: str
    tipo: str = "ambos"      # "cnd" | "parcelamentos" | "pgfn" | "ambos"
    cliente_nome: Optional[str] = None

class StatusResponse(BaseModel):
    status: str
    mensagem: str
    arquivos: list[str] = []

# ── Utilitários ───────────────────────────────────────────────────────────────

def limpar_cnpj(cnpj: str) -> str:
    return "".join(c for c in cnpj if c.isdigit())

def formatar_cnpj(cnpj: str) -> str:
    c = limpar_cnpj(cnpj)
    if len(c) == 14:
        return f"{c[:2]}.{c[2:5]}.{c[5:8]}/{c[8:12]}-{c[12:]}"
    return cnpj

def caminho_cert(cert_path: str) -> Path:
    """Resolve o caminho absoluto do certificado."""
    p = Path(cert_path)
    if p.is_absolute() and p.exists():
        return p
    candidato = CERT_DIR / p.name
    if candidato.exists():
        return candidato
    raise FileNotFoundError(f"Certificado não encontrado: {cert_path}")

# ── Download via Playwright ───────────────────────────────────────────────────

async def baixar_ecac(
    cnpj: str,
    cert_path_abs: Path,
    cert_senha: str,
    tipo: str,
    pasta_destino: Path,
) -> dict:
    """
    Abre o e-CAC com certificado A1, navega até os serviços e baixa os PDFs.
    Retorna dict com arquivos baixados e eventuais erros.
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="Playwright não instalado. Execute: pip install playwright && playwright install chromium"
        )

    arquivos_baixados = []
    erros = []
    hoje = datetime.now().strftime("%Y%m%d_%H%M%S")
    cnpj_limpo = limpar_cnpj(cnpj)

    async with async_playwright() as p:
        # Contexto com certificado A1
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-web-security",
            ]
        )

        context = await browser.new_context(
            accept_downloads=True,
            ignore_https_errors=True,
            client_certificates=[{
                "origin": "https://cav.receita.fazenda.gov.br",
                "pfx_path": str(cert_path_abs),
                "passphrase": cert_senha,
            }],
        )
        page = await context.new_page()
        page.set_default_timeout(60_000)

        # ── 1. CND ────────────────────────────────────────────────────────────
        if tipo in ("cnd", "ambos"):
            try:
                arquivo_cnd = await _baixar_cnd(page, cnpj_limpo, pasta_destino, hoje)
                if arquivo_cnd:
                    arquivos_baixados.append(arquivo_cnd)
                else:
                    erros.append("CND: não foi possível baixar o PDF")
            except Exception as e:
                erros.append(f"CND: {str(e)[:120]}")

        # ── 2. Login no e-CAC ────────────────────────────────────────────────
        logado = False
        if tipo in ("parcelamentos", "pgfn", "ambos"):
            try:
                logado = await _login_ecac(page, cnpj_limpo)
            except Exception as e:
                erros.append(f"Login e-CAC: {str(e)[:120]}")

        # ── 3. Parcelamentos ─────────────────────────────────────────────────
        if tipo in ("parcelamentos", "ambos") and logado:
            try:
                arquivo_parc = await _baixar_parcelamentos(page, cnpj_limpo, pasta_destino, hoje)
                if arquivo_parc:
                    arquivos_baixados.append(arquivo_parc)
                else:
                    erros.append("Parcelamentos: nenhum registro encontrado ou erro ao baixar")
            except Exception as e:
                erros.append(f"Parcelamentos: {str(e)[:120]}")

        # ── 4. PGFN ──────────────────────────────────────────────────────────
        if tipo in ("pgfn", "ambos"):
            try:
                arquivo_pgfn = await _baixar_pgfn(page, cnpj_limpo, pasta_destino, hoje, cert_path_abs, cert_senha)
                if arquivo_pgfn:
                    arquivos_baixados.append(arquivo_pgfn)
                else:
                    erros.append("PGFN: não foi possível gerar o comprovante")
            except Exception as e:
                erros.append(f"PGFN: {str(e)[:120]}")

        await context.close()
        await browser.close()

    return {"arquivos": arquivos_baixados, "erros": erros}


async def _baixar_cnd(page, cnpj: str, destino: Path, ts: str) -> Optional[str]:
    """Emite CND na Receita Federal (não requer login para CNPJ ativo)."""
    url_cnd = "https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir"
    await page.goto(url_cnd, wait_until="networkidle")

    # Preenche CNPJ
    campo = page.locator("input[name='NI'], input#cnpj, input[id*='cnpj' i]").first
    await campo.fill(cnpj)

    # Clica em emitir
    botao = page.locator("button[type='submit'], input[type='submit'], button:has-text('Emitir')").first
    await botao.click()

    await page.wait_for_load_state("networkidle")

    # Verifica se gerou PDF (certidão na mesma página ou nova janela)
    arquivo_path = str(destino / f"CND_{cnpj}_{ts}.pdf")

    # Tenta capturar download automático
    try:
        async with page.expect_download(timeout=30_000) as dl_info:
            botao_pdf = page.locator("a[href*='.pdf'], button:has-text('PDF'), a:has-text('Imprimir')").first
            await botao_pdf.click()
        download = await dl_info.value
        await download.save_as(arquivo_path)
        return arquivo_path
    except Exception:
        pass

    # Fallback: imprime a página como PDF
    conteudo = await page.content()
    if "certid" in conteudo.lower() and "negativa" in conteudo.lower():
        await page.pdf(path=arquivo_path, format="A4", print_background=True)
        return arquivo_path

    return None


async def _login_ecac(page, cnpj: str) -> bool:
    """Faz login no e-CAC via certificado digital."""
    # Acessa o e-CAC pelo endpoint de certificado
    await page.goto(
        "https://cav.receita.fazenda.gov.br/autenticacao/login/certificado",
        wait_until="networkidle"
    )

    # Aguarda redirecionamento pós-certificado
    await page.wait_for_url("**/cav/**", timeout=30_000)

    # Verifica se está logado (elemento do menu ou CPF/CNPJ visível)
    conteudo = await page.content()
    return (
        "sair" in conteudo.lower()
        or "logoff" in conteudo.lower()
        or cnpj[:8] in conteudo
    )


async def _baixar_parcelamentos(page, cnpj: str, destino: Path, ts: str) -> Optional[str]:
    """Navega até Parcelamentos no e-CAC e baixa o relatório."""
    arquivo_path = str(destino / f"Parcelamentos_{cnpj}_{ts}.pdf")

    # URL direta do serviço de parcelamentos no e-CAC
    await page.goto(
        "https://cav.receita.fazenda.gov.br/cav/app/financeiro/parcelamento/consultar",
        wait_until="networkidle"
    )

    await page.wait_for_load_state("networkidle")
    conteudo = await page.content()

    # Se não achou rota direta, tenta pelo menu
    if "parcelamento" not in conteudo.lower():
        await page.goto("https://cav.receita.fazenda.gov.br/cav/", wait_until="networkidle")
        link_parc = page.locator("a:has-text('Parcelamento'), a:has-text('parcelamento')").first
        await link_parc.click()
        await page.wait_for_load_state("networkidle")

    # Tenta baixar como PDF
    try:
        async with page.expect_download(timeout=25_000) as dl_info:
            botao = page.locator(
                "button:has-text('Imprimir'), button:has-text('PDF'), a:has-text('Exportar')"
            ).first
            await botao.click()
        download = await dl_info.value
        await download.save_as(arquivo_path)
        return arquivo_path
    except Exception:
        pass

    # Fallback: imprime página como PDF
    conteudo2 = await page.content()
    if "parcelamento" in conteudo2.lower():
        await page.pdf(path=arquivo_path, format="A4", print_background=True)
        return arquivo_path

    return None


async def _baixar_pgfn(page, cnpj: str, destino: Path, ts: str,
                        cert_path: Path, cert_senha: str) -> Optional[str]:
    """Acessa o Regularize (PGFN) e baixa a situação do devedor."""
    arquivo_path = str(destino / f"PGFN_{cnpj}_{ts}.pdf")

    # Cria contexto separado com certificado para PGFN
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
        )
        ctx = await browser.new_context(
            accept_downloads=True,
            ignore_https_errors=True,
            client_certificates=[{
                "origin": "https://regularize.pgfn.gov.br",
                "pfx_path": str(cert_path),
                "passphrase": cert_senha,
            }]
        )
        pg = await ctx.new_page()
        pg.set_default_timeout(45_000)

        await pg.goto(
            f"https://regularize.pgfn.gov.br/api/v1/situacao-devedores/{cnpj}/comprovante",
            wait_until="networkidle"
        )

        conteudo = await pg.content()

        # Tenta download direto (API retorna PDF)
        try:
            async with pg.expect_download(timeout=20_000) as dl_info:
                await pg.goto(
                    f"https://regularize.pgfn.gov.br/#/situacaoDevedor?ni={cnpj}",
                    wait_until="networkidle"
                )
                botao = pg.locator("button:has-text('Comprovante'), button:has-text('PDF'), button:has-text('Imprimir')").first
                await botao.click()
            download = await dl_info.value
            await download.save_as(arquivo_path)
            await ctx.close()
            await browser.close()
            return arquivo_path
        except Exception:
            pass

        # Fallback: imprime página
        if cnpj[:8] in conteudo or "situação" in conteudo.lower() or "pgfn" in conteudo.lower():
            await pg.pdf(path=arquivo_path, format="A4", print_background=True)
            await ctx.close()
            await browser.close()
            return arquivo_path

        await ctx.close()
        await browser.close()

    return None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/baixar")
async def baixar_documentos(req: BaixarRequest):
    """
    Baixa CND e/ou Parcelamentos do e-CAC via certificado A1.
    Retorna um arquivo ZIP com os PDFs gerados.
    """
    cnpj = limpar_cnpj(req.cnpj)
    if len(cnpj) != 14:
        raise HTTPException(status_code=400, detail="CNPJ inválido")

    try:
        cert_abs = caminho_cert(req.cert_path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Pasta temporária para esta operação
    pasta_op = DOWNLOAD_DIR / f"{cnpj}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    pasta_op.mkdir(parents=True, exist_ok=True)

    try:
        resultado = await baixar_ecac(
            cnpj=cnpj,
            cert_path_abs=cert_abs,
            cert_senha=req.cert_senha,
            tipo=req.tipo,
            pasta_destino=pasta_op,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no Playwright: {str(e)}")

    arquivos = resultado["arquivos"]
    erros = resultado["erros"]

    if not arquivos:
        raise HTTPException(
            status_code=422,
            detail={
                "mensagem": "Nenhum documento foi baixado.",
                "erros": erros,
                "dicas": [
                    "Verifique se a senha do certificado está correta",
                    "Confirme que o escritório tem procuração eletrônica no e-CAC para este CNPJ",
                    "O certificado pode estar vencido",
                ]
            }
        )

    # Se um único arquivo: retorna direto
    if len(arquivos) == 1:
        nome_cliente = (req.cliente_nome or cnpj).replace(" ", "_")[:30]
        return FileResponse(
            path=arquivos[0],
            media_type="application/pdf",
            filename=f"EPimentel_{nome_cliente}_{Path(arquivos[0]).stem}.pdf",
            headers={"X-Avisos": "; ".join(erros)} if erros else {}
        )

    # Múltiplos arquivos: ZIP
    nome_cliente = (req.cliente_nome or cnpj).replace(" ", "_")[:30]
    zip_path = str(pasta_op / f"EPimentel_{nome_cliente}_{datetime.now().strftime('%Y%m%d')}.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for arq in arquivos:
            zf.write(arq, Path(arq).name)

    return FileResponse(
        path=zip_path,
        media_type="application/zip",
        filename=Path(zip_path).name,
        headers={"X-Avisos": "; ".join(erros)} if erros else {}
    )


@router.get("/status")
async def status_playwright():
    """Verifica se o Playwright está instalado e funcional."""
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
            await browser.close()
        return {"status": "ok", "mensagem": "Playwright operacional"}
    except Exception as e:
        return {"status": "erro", "mensagem": str(e)}
