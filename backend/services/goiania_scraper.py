import asyncio
import re
import os
from playwright.async_api import async_playwright

async def executar_robot_goiania(login, senha, id_cliente_prefeitura, data_inicio, data_fim, nome_pasta):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(accept_downloads=True)
        page = await context.new_page()

        try:
            await page.goto("https://issnetonline.com.br/goiania/online/login/login.aspx")
            await page.locator("#ctl00_cphCabecalho_txtIdentificacao").fill(str(login))
            for d in str(senha):
                await page.get_by_role("button", name=re.compile(str(d))).first.click()
            await page.locator("input[type='submit']").first.click()
            await page.wait_for_load_state("networkidle")

            await page.get_by_role("row", name="Nota Fiscal Eletrônica").get_by_role("link").click()
            frame = page.frame_locator("#fraConteudo")
            await frame.get_by_role("link", name="Exportação de NFS-e").click()
            await asyncio.sleep(3) 

            await frame.get_by_role("combobox", name="Selecione o Cliente :").select_option(str(id_cliente_prefeitura))
            await frame.get_by_label("Data Inicial :").fill(data_inicio)
            await frame.get_by_label("Data Final :").fill(data_fim)
            await frame.get_by_role("cell", name="XML", exact=True).click()

            async with page.expect_download() as download_info:
                await frame.get_by_role("button", name="Exportar").click()
            
            download = await download_info.value
            
            # --- ORGANIZAÇÃO EM PASTAS ---
            caminho_pasta = os.path.join("downloads_nfs", nome_pasta)
            os.makedirs(caminho_pasta, exist_ok=True)
            
            await download.save_as(os.path.join(caminho_pasta, download.suggested_filename))
            return f"Sucesso! Salvo em: {caminho_pasta}"

        except Exception as e:
            return f"Erro: {str(e)}"
        finally:
            await browser.close()