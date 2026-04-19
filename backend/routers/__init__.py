from .clientes import router as clientes_router
from .obrigacoes import router as obrigacoes_router
from .entregas import router as entregas_router
from .webhook import router as webhook_router
from .dashboard import router as dashboard_router
from .conversas import router as conversas_router
from .robo import router as robo_router
from .admin import router as admin_router
from .notas import router as notas_router
from .parcelamentos import router as parcelamentos_router
from .financeiro import router as financeiro_router
from .certificados import router as certificados_router
from .receita_balanco import router as receita_balanco_router
from .certidoes_real import certidoes_router as certidoes_real_router
from .extras import certidoes_router as extras_router
from .goiania_robo import goiania_router, robo_obrig_router
from .consulta_fiscal import router as consulta_fiscal_router
from .ecac_download import router as ecac_download_router
from .whatsapp_evolution import router as whatsapp_evolution_router
from .disparos import router as disparos_router
from .automacao import router as automacao_router
from .entrega_auto import router as entrega_auto_router
from .drive_monitor import router as drive_monitor_router
from .whatsapp_bot import router as whatsapp_bot_router
from .agenda_mensal import router as agenda_mensal_router

from .comunicados import router as comunicados_router

from .contratos import router as contratos_router
from .ai import router as ai_router
