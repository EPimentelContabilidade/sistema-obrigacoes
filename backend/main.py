from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import settings
from database import init_db
from routers import (
    clientes_router, obrigacoes_router, entregas_router,
    webhook_router, dashboard_router, conversas_router, robo_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Sistema de Obrigações Acessórias",
    description="EPimentel Auditoria & Contabilidade Ltda - Entrega automática via WhatsApp e E-mail com IA",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(clientes_router, prefix="/api/v1")
app.include_router(obrigacoes_router, prefix="/api/v1")
app.include_router(entregas_router, prefix="/api/v1")
app.include_router(webhook_router, prefix="/api/v1")
app.include_router(conversas_router, prefix="/api/v1")
app.include_router(robo_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "sistema": "Obrigações Acessórias - EPimentel",
        "versao": "1.0.0",
        "docs": "/docs",
        "status": "online",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=settings.APP_DEBUG)
