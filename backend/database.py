from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from config import settings
from models import Base

engine = create_async_engine(settings.DATABASE_URL, echo=settings.APP_DEBUG)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_tipos_obrigacao()


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def seed_tipos_obrigacao():
    """Popula tipos de obrigação padrão na primeira execução."""
    from sqlalchemy import select, func
    from models import TipoObrigacao

    async with AsyncSessionLocal() as session:
        count = await session.execute(select(func.count()).select_from(TipoObrigacao))
        if count.scalar() > 0:
            return

        tipos = [
            TipoObrigacao(nome="DAS - Simples Nacional", descricao="Guia mensal do Simples Nacional", periodicidade="mensal", dia_vencimento=20),
            TipoObrigacao(nome="ISS - Nota Fiscal", descricao="Declaração de ISS e envio de NFS-e", periodicidade="mensal", dia_vencimento=10),
            TipoObrigacao(nome="FGTS", descricao="Guia de recolhimento do FGTS", periodicidade="mensal", dia_vencimento=7),
            TipoObrigacao(nome="GPS - INSS", descricao="Guia da Previdência Social", periodicidade="mensal", dia_vencimento=20),
            TipoObrigacao(nome="DCTF", descricao="Declaração de Débitos e Créditos Tributários Federais", periodicidade="mensal", dia_vencimento=15),
            TipoObrigacao(nome="SPED Contábil", descricao="Escrituração Contábil Digital", periodicidade="anual", dia_vencimento=31),
            TipoObrigacao(nome="DIRF", descricao="Declaração do Imposto de Renda Retido na Fonte", periodicidade="anual", dia_vencimento=28),
            TipoObrigacao(nome="RAIS", descricao="Relação Anual de Informações Sociais", periodicidade="anual", dia_vencimento=31),
            TipoObrigacao(nome="eSocial", descricao="Sistema de Escrituração Digital das Obrigações Fiscais", periodicidade="mensal", dia_vencimento=7),
            TipoObrigacao(nome="EFD ICMS/IPI", descricao="Escrituração Fiscal Digital", periodicidade="mensal", dia_vencimento=20),
            TipoObrigacao(nome="RET - Recolhimento", descricao="Regime Especial de Tributação - Incorporação Imobiliária", periodicidade="mensal", dia_vencimento=20),
            TipoObrigacao(nome="Balancete Mensal", descricao="Envio de balancete mensal ao cliente", periodicidade="mensal", dia_vencimento=15),
        ]
        session.add_all(tipos)
        await session.commit()
