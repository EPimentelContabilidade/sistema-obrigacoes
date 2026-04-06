from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from models import Cliente

router = APIRouter(prefix="/clientes", tags=["Clientes"])


class ClienteCreate(BaseModel):
    nome: str
    cnpj: str
    nome_fantasia: Optional[str] = None
    email: Optional[str] = None
    email2: Optional[str] = None
    email_contador: Optional[str] = None
    whatsapp: Optional[str] = None
    whatsapp2: Optional[str] = None
    telefone: Optional[str] = None
    regime: str = "Simples Nacional"
    canal_preferido: str = "ambos"
    observacoes: Optional[str] = None
    obs_comunicacao: Optional[str] = None
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None
    responsavel_nome: Optional[str] = None
    responsavel_cpf: Optional[str] = None
    responsavel_tel: Optional[str] = None
    responsavel_email: Optional[str] = None
    inscricao_estadual: Optional[str] = None
    inscricao_municipal: Optional[str] = None
    cnae: Optional[str] = None
    cnaes_secundarios: Optional[str] = None
    porte: Optional[str] = None
    natureza_juridica: Optional[str] = None
    capital_social: Optional[str] = None
    situacao_receita: Optional[str] = None
    data_inicio: Optional[str] = None
    grupo: Optional[str] = None
    ativo: Optional[bool] = True


class ClienteResponse(BaseModel):
    id: int
    nome: str
    cnpj: str
    nome_fantasia: Optional[str] = None
    email: Optional[str] = None
    email2: Optional[str] = None
    whatsapp: Optional[str] = None
    whatsapp2: Optional[str] = None
    telefone: Optional[str] = None
    regime: str
    canal_preferido: str
    ativo: bool
    observacoes: Optional[str] = None
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None
    responsavel_nome: Optional[str] = None
    responsavel_cpf: Optional[str] = None
    cnae: Optional[str] = None
    cnaes_secundarios: Optional[str] = None
    porte: Optional[str] = None
    situacao_receita: Optional[str] = None
    data_inicio: Optional[str] = None
    grupo: Optional[str] = None
    natureza_juridica: Optional[str] = None
    capital_social: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/por-cnpj", response_model=ClienteResponse)
async def buscar_por_cnpj(cnpj: str = Query(...), db: AsyncSession = Depends(get_db)):
    cnpj_limpo = cnpj.replace(".", "").replace("/", "").replace("-", "")
    result = await db.execute(select(Cliente))
    for c in result.scalars().all():
        if c.cnpj:
            c_limpo = c.cnpj.replace(".", "").replace("/", "").replace("-", "")
            if c_limpo == cnpj_limpo or c_limpo[:8] == cnpj_limpo[:8]:
                return c
    raise HTTPException(status_code=404, detail="Cliente não encontrado")


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
    cnpj_limpo = data.cnpj.replace(".", "").replace("/", "").replace("-", "")
    result = await db.execute(select(Cliente))
    for c in result.scalars().all():
        if c.cnpj and c.cnpj.replace(".","").replace("/","").replace("-","") == cnpj_limpo:
            raise HTTPException(status_code=400, detail=f"CNPJ já cadastrado: {c.nome}")
    campos = {k: v for k, v in data.model_dump().items() if hasattr(Cliente, k)}
    cliente = Cliente(**campos)
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
        if hasattr(cliente, field):
            setattr(cliente, field, value)
    await db.commit()
    await db.refresh(cliente)
    return cliente


@router.delete("/{cliente_id}")
async def excluir_cliente(
    cliente_id: int,
    perfil: str = Query(default=""),
    db: AsyncSession = Depends(get_db)
):
    """Exclusão protegida — apenas admin pode excluir clientes com registros."""
    result = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    # Verificar se tem entregas ou obrigações vinculadas
    from models import Entrega, Obrigacao
    entregas = await db.execute(select(Entrega).where(Entrega.cliente_id == cliente_id))
    obrigacoes = await db.execute(select(Obrigacao).where(Obrigacao.cliente_id == cliente_id))

    tem_registros = bool(entregas.first() or obrigacoes.first())

    if tem_registros and perfil != "admin":
        raise HTTPException(
            status_code=403,
            detail="Este cliente possui registros vinculados. Apenas o administrador pode excluí-lo."
        )

    if tem_registros and perfil == "admin":
        # Admin pode excluir — desativa em vez de apagar
        cliente.ativo = False
        await db.commit()
        return {"mensagem": "Cliente desativado pelo administrador"}

    # Sem registros — desativa normalmente
    cliente.ativo = False
    await db.commit()
    return {"mensagem": "Cliente removido"}
