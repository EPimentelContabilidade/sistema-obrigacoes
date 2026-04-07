from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import settings
from database import init_db
6    from routers import (
7        clientes_router, obrigacoes_router, entregas_router,
8        webhook_router, dashboard_router, conversas_router,
9        robo_router, admin_router, notas_router, parcelamentos_router,
10       financeiro_router, certificados_router, receita_balanco_router,
11       certidoes_router, contratos_router, comunicacao_router,
12       goiania_router, robo_obrig_router, consulta_fiscal_router,
13       ecac_download_router,
14   )

def instalar_playwright():
    """Instala o Chromium do Playwright se não estiver disponível"""
    chrome_path = os.path.expanduser('~/.cache/ms-playwright/chromium-1091/chrome-linux/chrome')
    if not os.path.exists(chrome_path):
        try:
            subprocess.run(['python', '-m', 'playwright', 'install', 'chromium'], check=False, timeout=120)
            subprocess.run(['python', '-m', 'playwright', 'install-deps', 'chromium'], check=False, timeout=120)
            print("✅ Playwright Chromium instalado com sucesso")
        except Exception as e:
            print(f"⚠️ Playwright não instalado: {e}")
    else:
        print("✅ Playwright Chromium já disponível")

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    instalar_playwright()
    yield

app = FastAPI(
    title="Sistema de Obrigações Acessórias",
    description="EPimentel Auditoria & Contabilidade Ltda",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000", "https://adventurous-generosity-production-f892.up.railway.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clientes_router)
app.include_router(obrigacoes_router)
app.include_router(entregas_router)
app.include_router(webhook_router)
app.include_router(dashboard_router)
app.include_router(conversas_router)
app.include_router(robo_router)
app.include_router(admin_router)
app.include_router(notas_router)
app.include_router(parcelamentos_router)
app.include_router(financeiro_router)
app.include_router(certificados_router)
app.include_router(receita_balanco_router)
app.include_router(certidoes_router)
app.include_router(contratos_router)
app.include_router(comunicacao_router)
app.include_router(consulta_fiscal_router)
app.include_router(ecac_download_router)
@app.get("/")
async def root():
    return {"status": "ok", "sistema": "EPimentel Auditoria & Contabilidade"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
