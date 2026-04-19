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
    certidoes_real_router, extras_router,
    goiania_router, robo_obrig_router,
    consulta_fiscal_router, ecac_download_router,
    whatsapp_evolution_router, disparos_router, entrega_auto_router,
    automacao_router, drive_monitor_router, whatsapp_bot_router, agenda_mensal_router, comunicados_router, contratos_router,
    ai_router,
    prolabore_router,
    pessoal_router,
)
from routers import retencoes
from routers import storage as storage_mod

@asynccontextmanager
async def lifespan(app: FastAPI):
        await init_db()
        # ── Scheduler: varrer pasta ENTRADA do Drive a cada 10 minutos ─────────
        try:
            from apscheduler.schedulers.asyncio import AsyncIOScheduler
            from routers.drive_monitor import varrer_pasta_entrada
            from database import get_db as _get_db

            scheduler = AsyncIOScheduler()

            async def _varrer():
                async for db in _get_db():
                    await varrer_pasta_entrada(db)
                    break

            scheduler.add_job(_varrer, "interval", minutes=10, id="drive_monitor")
            # Agenda mensal: 1º dia de cada mês às 08:00
            from routers.agenda_mensal import disparar_agenda_mensal
            async def _agenda_mensal():
                async for db in _get_db():
                    await disparar_agenda_mensal(db)
                    break
            scheduler.add_job(_agenda_mensal, "cron", day=1, hour=8, minute=0, id="agenda_mensal")
            scheduler.start()
            app.state.scheduler = scheduler
        except Exception as e:
            print(f"⚠️ Scheduler não iniciado: {e}")
        yield
        # Shutdown
        if hasattr(app.state, "scheduler"):
            app.state.scheduler.shutdown(wait=False)

app = FastAPI(title="EPimentel Sistema", lifespan=lifespan)

app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
)

app.include_router(storage_mod.router,        prefix="/api/v1")  # storage universal — deve vir PRIMEIRO
app.include_router(dashboard_router,       prefix="/api/v1")
app.include_router(clientes_router,        prefix="/api/v1")
app.include_router(obrigacoes_router,      prefix="/api/v1")
app.include_router(entregas_router,        prefix="/api/v1")
app.include_router(webhook_router,         prefix="/api/v1")
app.include_router(conversas_router,       prefix="/api/v1")
app.include_router(robo_router,            prefix="/api/v1")
app.include_router(admin_router,           prefix="/api/v1")
app.include_router(notas_router,           prefix="/api/v1")
app.include_router(parcelamentos_router,   prefix="/api/v1")
app.include_router(financeiro_router,      prefix="/api/v1")
app.include_router(certificados_router,    prefix="/api/v1")
app.include_router(receita_balanco_router, prefix="/api/v1")
app.include_router(certidoes_real_router,  prefix="/api/v1")
app.include_router(extras_router,          prefix="/api/v1")
app.include_router(goiania_router,         prefix="/api/v1")
app.include_router(robo_obrig_router,      prefix="/api/v1")
app.include_router(consulta_fiscal_router, prefix="/api/v1")
app.include_router(ecac_download_router,   prefix="/api/v1")
app.include_router(whatsapp_evolution_router, prefix="/api/v1")
app.include_router(automacao_router,          prefix="/api/v1")
app.include_router(disparos_router,           prefix="/api/v1")
app.include_router(entrega_auto_router,       prefix="/api/v1")
app.include_router(drive_monitor_router,      prefix="/api/v1")
app.include_router(whatsapp_bot_router,        prefix="/api/v1")
app.include_router(agenda_mensal_router,       prefix="/api/v1")
app.include_router(comunicados_router, prefix="/api/v1")
app.include_router(contratos_router,   prefix="/api/v1")
app.include_router(retencoes.router,   prefix="/api/v1")
app.include_router(ai_router,            prefix="/api/v1")
app.include_router(prolabore_router,       prefix="/api/v1")
app.include_router(pessoal_router,         prefix="/api/v1")

@app.get("/")
async def root():
        return {"status": "ok", "sistema": "EPimentel"}

@app.get("/health")
async def health():
        return {"status": "healthy"}
