from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from config import settings
from models import Base

def _fix_url(url: str) -> str:
    """Converte URL do Railway para formato asyncpg/aiosqlite."""
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("sqlite:///") and "+aiosqlite" not in url:
        url = url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    return url

DB_URL = _fix_url(settings.DATABASE_URL)
IS_POSTGRES = "postgresql" in DB_URL

connect_args = {}
if IS_POSTGRES:
    connect_args = {"ssl": "require"}

engine = create_async_engine(
    DB_URL,
    echo=False,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_tipos_obrigacao()
    print(f"[DB] Banco inicializado: {'PostgreSQL' if IS_POSTGRES else 'SQLite'}")

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def seed_tipos_obrigacao():
    from sqlalchemy import select, func
    from models import TipoObrigacao
    async with AsyncSessionLocal() as session:
        count = await session.execute(select(func.count()).select_from(TipoObrigacao))
        if count.scalar() > 0:
            return
        tipos = [
            TipoObrigacao(nome="DAS - Simples Nacional",      periodicidade="mensal",     dia_vencimento=20),
            TipoObrigacao(nome="PGDAS-D",                     periodicidade="mensal",     dia_vencimento=20),
            TipoObrigacao(nome="ISS - Nota Fiscal",           periodicidade="mensal",     dia_vencimento=10),
            TipoObrigacao(nome="FGTS",                        periodicidade="mensal",     dia_vencimento=7),
            TipoObrigacao(nome="GPS - INSS",                  periodicidade="mensal",     dia_vencimento=20),
            TipoObrigacao(nome="DCTF",                        periodicidade="mensal",     dia_vencimento=15),
            TipoObrigacao(nome="DCTFWeb",                     periodicidade="mensal",     dia_vencimento=15),
            TipoObrigacao(nome="EFD Contribuicoes",           periodicidade="mensal",     dia_vencimento=10),
            TipoObrigacao(nome="EFD ICMS/IPI",               periodicidade="mensal",     dia_vencimento=20),
            TipoObrigacao(nome="REINF",                       periodicidade="mensal",     dia_vencimento=15),
            TipoObrigacao(nome="eSocial",                     periodicidade="mensal",     dia_vencimento=7),
            TipoObrigacao(nome="Folha de Pagamento",          periodicidade="mensal",     dia_vencimento=5),
            TipoObrigacao(nome="SPED Contabil",               periodicidade="anual",      dia_vencimento=31),
            TipoObrigacao(nome="SPED Fiscal",                 periodicidade="mensal",     dia_vencimento=25),
            TipoObrigacao(nome="DIRF",                        periodicidade="anual",      dia_vencimento=28),
            TipoObrigacao(nome="RAIS",                        periodicidade="anual",      dia_vencimento=31),
            TipoObrigacao(nome="DEFIS",                       periodicidade="anual",      dia_vencimento=31),
            TipoObrigacao(nome="Balancete Mensal",            periodicidade="mensal",     dia_vencimento=15),
            TipoObrigacao(nome="IRPJ Trimestral",             periodicidade="trimestral", dia_vencimento=31),
            TipoObrigacao(nome="CSLL Trimestral",             periodicidade="trimestral", dia_vencimento=31),
            TipoObrigacao(nome="PIS Mensal",                  periodicidade="mensal",     dia_vencimento=25),
            TipoObrigacao(nome="COFINS Mensal",               periodicidade="mensal",     dia_vencimento=25),
            TipoObrigacao(nome="RET - Recolhimento",          periodicidade="mensal",     dia_vencimento=20),
        ]
        session.add_all(tipos)
        await session.commit()
        print("[DB] Tipos de obrigacao criados.")
