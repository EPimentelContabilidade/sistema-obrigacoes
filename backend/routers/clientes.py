from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from database import get_db
from models import Cliente

router = APIRouter(prefix="/clientes", tags=["Clientes"])


class ClienteCreate(BaseModel):
    nome: str
    cnpj: str
    email: Optional[str] = None
    whatsapp: Optional[str] = None
    regime: str = "Simples Nacional"
    canal_preferido: str = "ambos"
    observacoes: Optional[str] = None


class ClienteResponse(BaseModel):
    id: int
    nome: str
    cnpj: str
    email: Optional[str]
    whatsapp: Optional[str]
    regime: str
    canal_preferido: str
    ativo: bool
    observacoes: Optional[str]

    class Config:
        from_attributes = True


@router.get("/", response_model=List[ClienteResponse])
async def listar_clientes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Cliente).where(Cliente.ativo == True).order_by(Cliente.nome))
    return result.scalars().all()


@router.get("/{cliente_id}", response_model=ClienteResponse)
async def obter_cliente(cliente_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return cliente


@router.post("/", response_model=ClienteResponse, status_code=201)
async def criar_cliente(data: ClienteCreate, db: AsyncSession = Depends(get_db)):
    cliente = Cliente(**data.model_dump())
    db.add(cliente)
    await db.commit()
    await db.refresh(cliente)
    return cliente


@router.put("/{cliente_id}", response_model=ClienteResponse)
async def atualizar_cliente(cliente_id: int, data: ClienteCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    for field, value in data.model_dump().items():
        setattr(cliente, field, value)
    await db.commit()
    await db.refresh(cliente)
    return cliente


@router.delete("/{cliente_id}")
async def desativar_cliente(cliente_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    cliente.ativo = False
    await db.commit()
    return {"mensagem": "Cliente desativado com sucesso"}
