from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import get_db
from models import Entrega, Cliente, Obrigacao, TipoObrigacao
from services import (
    gerar_mensagem_obrigacao,
    enviar_email,
    enviar_whatsapp_texto,
)

router = APIRouter(prefix="/entregas", tags=["Entregas"])


class EntregaCreate(BaseModel):
    cliente_id: int
    obrigacao_id: Optional[int] = None
    canal: str  # whatsapp, email, ambos
    mensagem_customizada: Optional[str] = None
    usar_ia: bool = True


class EntregaResponse(BaseModel):
    id: int
    cliente_id: int
    obrigacao_id: Optional[int]
    canal: str
    status: str
    mensagem: Optional[str]
    enviado_em: Optional[datetime]
    criado_em: datetime

    class Config:
        from_attributes = True


async def _executar_entrega(db: AsyncSession, entrega_id: int):
    """Executa o envio de uma entrega em background."""
    result = await db.execute(select(Entrega).where(Entrega.id == entrega_id))
    entrega = result.scalar_one_or_none()
    if not entrega:
        return

    # Buscar cliente
    cliente_result = await db.execute(select(Cliente).where(Cliente.id == entrega.cliente_id))
    cliente = cliente_result.scalar_one_or_none()
    if not cliente:
        entrega.status = "erro"
        entrega.resposta_api = "Cliente não encontrado"
        await db.commit()
        return

    entrega.tentativas += 1
    canais = ["whatsapp", "email"] if entrega.canal == "ambos" else [entrega.canal]
    sucesso_geral = True

    for canal in canais:
        if canal == "whatsapp" and cliente.whatsapp:
            resultado = await enviar_whatsapp_texto(cliente.whatsapp, entrega.mensagem)
            if not resultado["sucesso"]:
                sucesso_geral = False
        elif canal == "email" and cliente.email:
            resultado = await enviar_email(
                destinatario=cliente.email,
                nome_destinatario=cliente.nome,
                assunto=f"EPimentel Contabilidade - {entrega.mensagem[:50]}...",
                corpo=entrega.mensagem,
            )
            if not resultado["sucesso"]:
                sucesso_geral = False

    entrega.status = "enviado" if sucesso_geral else "erro"
    entrega.enviado_em = datetime.utcnow()
    await db.commit()


@router.get("/", response_model=List[EntregaResponse])
async def listar_entregas(
    cliente_id: Optional[int] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Entrega)
    if cliente_id:
        query = query.where(Entrega.cliente_id == cliente_id)
    if status:
        query = query.where(Entrega.status == status)
    result = await db.execute(query.order_by(Entrega.criado_em.desc()))
    return result.scalars().all()


@router.post("/", response_model=EntregaResponse, status_code=201)
async def criar_entrega(
    data: EntregaCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    # Buscar cliente
    cliente_result = await db.execute(select(Cliente).where(Cliente.id == data.cliente_id))
    cliente = cliente_result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    # Gerar mensagem
    mensagem = data.mensagem_customizada
    if not mensagem and data.obrigacao_id:
        obr_result = await db.execute(
            select(Obrigacao, TipoObrigacao)
            .join(TipoObrigacao)
            .where(Obrigacao.id == data.obrigacao_id)
        )
        row = obr_result.first()
        if row:
            obr, tipo = row
            canal_msg = data.canal if data.canal != "ambos" else "email"
            vencimento_str = obr.vencimento.strftime("%d/%m/%Y") if obr.vencimento else "a definir"
            if data.usar_ia:
                mensagem = gerar_mensagem_obrigacao(
                    nome_cliente=cliente.nome,
                    tipo_obrigacao=tipo.nome,
                    competencia=obr.competencia,
                    vencimento=vencimento_str,
                    valor=obr.valor,
                    canal=canal_msg,
                    observacoes=obr.observacoes,
                )
            else:
                mensagem = f"Olá {cliente.nome}, segue {tipo.nome} - Competência {obr.competencia} - Vencimento {vencimento_str}."

    if not mensagem:
        mensagem = f"Olá {cliente.nome}, temos uma atualização para você. Entre em contato com o escritório. - EPimentel Contabilidade"

    entrega = Entrega(
        cliente_id=data.cliente_id,
        obrigacao_id=data.obrigacao_id,
        canal=data.canal,
        mensagem=mensagem,
        status="pendente",
    )
    db.add(entrega)
    await db.commit()
    await db.refresh(entrega)

    # Enviar em background
    background_tasks.add_task(_executar_entrega, db, entrega.id)

    return entrega


@router.post("/{entrega_id}/reenviar")
async def reenviar(entrega_id: int, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Entrega).where(Entrega.id == entrega_id))
    entrega = result.scalar_one_or_none()
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega não encontrada")
    entrega.status = "pendente"
    await db.commit()
    background_tasks.add_task(_executar_entrega, db, entrega_id)
    return {"mensagem": "Reenvio iniciado"}
