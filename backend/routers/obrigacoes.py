from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import get_db
from models import Obrigacao, TipoObrigacao, Cliente

router = APIRouter(prefix="/obrigacoes", tags=["Obrigações"])


class ObrigacaoCreate(BaseModel):
    cliente_id: int
    tipo_id: int
    competencia: str  # AAAA-MM
    vencimento: Optional[datetime] = None
    valor: Optional[float] = None
    arquivo_path: Optional[str] = None
    observacoes: Optional[str] = None


class ObrigacaoResponse(BaseModel):
    id: int
    cliente_id: int
    tipo_id: int
    competencia: str
    vencimento: Optional[datetime]
    valor: Optional[float]
    status: str
    criado_em: datetime
    observacoes: Optional[str]

    class Config:
        from_attributes = True


class TipoObrigacaoResponse(BaseModel):
    id: int
    nome: str
    descricao: Optional[str]
    periodicidade: Optional[str]
    dia_vencimento: Optional[int]

    class Config:
        from_attributes = True


@router.get("/tipos", response_model=List[TipoObrigacaoResponse])
async def listar_tipos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TipoObrigacao).where(TipoObrigacao.ativo == True).order_by(TipoObrigacao.nome))
    return result.scalars().all()


@router.get("/", response_model=List[ObrigacaoResponse])
async def listar_obrigacoes(
    cliente_id: Optional[int] = None,
    competencia: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Obrigacao)
    if cliente_id:
        query = query.where(Obrigacao.cliente_id == cliente_id)
    if competencia:
        query = query.where(Obrigacao.competencia == competencia)
    if status:
        query = query.where(Obrigacao.status == status)
    result = await db.execute(query.order_by(Obrigacao.criado_em.desc()))
    return result.scalars().all()


@router.get("/{obrigacao_id}", response_model=ObrigacaoResponse)
async def obter_obrigacao(obrigacao_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Obrigacao).where(Obrigacao.id == obrigacao_id))
    obrigacao = result.scalar_one_or_none()
    if not obrigacao:
        raise HTTPException(status_code=404, detail="Obrigação não encontrada")
    return obrigacao


@router.post("/", response_model=ObrigacaoResponse, status_code=201)
async def criar_obrigacao(data: ObrigacaoCreate, db: AsyncSession = Depends(get_db)):
    # Verificar se cliente existe
    cliente = await db.execute(select(Cliente).where(Cliente.id == data.cliente_id))
    if not cliente.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    obrigacao = Obrigacao(**data.model_dump())
    db.add(obrigacao)
    await db.commit()
    await db.refresh(obrigacao)
    return obrigacao


@router.put("/{obrigacao_id}/status")
async def atualizar_status(obrigacao_id: int, status: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Obrigacao).where(Obrigacao.id == obrigacao_id))
    obrigacao = result.scalar_one_or_none()
    if not obrigacao:
        raise HTTPException(status_code=404, detail="Obrigação não encontrada")
    obrigacao.status = status
    await db.commit()
    return {"mensagem": f"Status atualizado para '{status}'"}
