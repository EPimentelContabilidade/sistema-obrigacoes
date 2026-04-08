from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import settings
from database import init_db
from routers import (
    clientes_router, obrigacoes_router, entregas_router,
    webhook_router, dashboard_router, conversas_router,
    robo_router, admin_router, notas_router, parcelamentos_router,
    financeiro_router, certificados_router, receita_balanco_router,
    certidoes_router, contratos_router, comunicacao_router,
    goiania_router, robo_obrig_router, consulta_fiscal_router,
    ecac_download_router, whatsapp_evolution_router,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="EPimentel Sistema", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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
app.include_router(goiania_router)
app.include_router(robo_obrig_router)
app.include_router(consulta_fiscal_router)
app.include_router(ecac_download_router, prefix="/api/v1")
app.include_router(whatsapp_evolution_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"status": "ok", "sistema": "EPimentel Auditoria & Contabilidade"}

@app.get("/health")
async def health():
    return {"status": "ok"}
