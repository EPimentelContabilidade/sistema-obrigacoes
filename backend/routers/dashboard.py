from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models import Cliente, Obrigacao, Entrega

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def estatisticas(db: AsyncSession = Depends(get_db)):
    total_clientes = await db.execute(select(func.count()).select_from(Cliente).where(Cliente.ativo == True))
    total_obrigacoes = await db.execute(select(func.count()).select_from(Obrigacao))
    entregas_enviadas = await db.execute(select(func.count()).select_from(Entrega).where(Entrega.status == "enviado"))
    entregas_erro = await db.execute(select(func.count()).select_from(Entrega).where(Entrega.status == "erro"))
    entregas_pendentes = await db.execute(select(func.count()).select_from(Entrega).where(Entrega.status == "pendente"))

    return {
        "clientes_ativos": total_clientes.scalar(),
        "total_obrigacoes": total_obrigacoes.scalar(),
        "entregas_enviadas": entregas_enviadas.scalar(),
        "entregas_com_erro": entregas_erro.scalar(),
        "entregas_pendentes": entregas_pendentes.scalar(),
    }


@router.get("/entregas-recentes")
async def entregas_recentes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Entrega, Cliente)
        .join(Cliente)
        .order_by(Entrega.criado_em.desc())
        .limit(10)
    )
    rows = result.all()
    return [
        {
            "id": e.id,
            "cliente": c.nome,
            "canal": e.canal,
            "status": e.status,
            "criado_em": e.criado_em.isoformat() if e.criado_em else None,
        }
        for e, c in rows
    ]
