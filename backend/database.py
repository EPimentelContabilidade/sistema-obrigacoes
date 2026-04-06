from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from config import settings
from models import Base
import sqlite3, os

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Todas as colunas que devem existir na tabela clientes
COLUNAS_CLIENTES = [
    ("nome_fantasia","TEXT"),("email2","TEXT"),("email_contador","TEXT"),
    ("whatsapp2","TEXT"),("telefone","TEXT"),("obs_comunicacao","TEXT"),
    ("cep","TEXT"),("logradouro","TEXT"),("numero","TEXT"),("complemento","TEXT"),
    ("bairro","TEXT"),("municipio","TEXT"),("uf","TEXT"),
    ("responsavel_nome","TEXT"),("responsavel_cpf","TEXT"),
    ("responsavel_tel","TEXT"),("responsavel_email","TEXT"),
    ("inscricao_estadual","TEXT"),("inscricao_municipal","TEXT"),
    ("cnae","TEXT"),("cnaes_secundarios","TEXT"),("porte","TEXT"),
    ("natureza_juridica","TEXT"),("capital_social","TEXT"),
    ("situacao_receita","TEXT"),("data_inicio","TEXT"),("grupo","TEXT"),
]

def migrar_banco():
    """Adiciona colunas novas SEM apagar dados existentes. Executado a cada inicio."""
    db_path = settings.DATABASE_URL.replace("sqlite+aiosqlite:///","").replace("./","")
    if not os.path.exists(db_path):
        return
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        c.execute("PRAGMA table_info(clientes)")
        existentes = {row[1] for row in c.fetchall()}
        for nome, tipo in COLUNAS_CLIENTES:
            if nome not in existentes:
                conn.execute(f"ALTER TABLE clientes ADD COLUMN {nome} {tipo}")
                print(f"  [DB] Coluna adicionada: {nome}")
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"  [DB] Migracao: {e}")

async def init_db():
    migrar_banco()  # Sempre migra antes de criar tabelas
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
    from sqlalchemy import select, func
    from models import TipoObrigacao
    async with AsyncSessionLocal() as session:
        count = await session.execute(select(func.count()).select_from(TipoObrigacao))
        if count.scalar() > 0:
            return
        tipos = [
            TipoObrigacao(nome="DAS - Simples Nacional", periodicidade="mensal", dia_vencimento=20),
            TipoObrigacao(nome="PGDAS-D", periodicidade="mensal", dia_vencimento=20),
            TipoObrigacao(nome="ISS - Nota Fiscal", periodicidade="mensal", dia_vencimento=10),
            TipoObrigacao(nome="FGTS", periodicidade="mensal", dia_vencimento=7),
            TipoObrigacao(nome="GPS - INSS", periodicidade="mensal", dia_vencimento=20),
            TipoObrigacao(nome="DCTF", periodicidade="mensal", dia_vencimento=15),
            TipoObrigacao(nome="DCTFWeb", periodicidade="mensal", dia_vencimento=15),
            TipoObrigacao(nome="EFD Contribuições", periodicidade="mensal", dia_vencimento=10),
            TipoObrigacao(nome="EFD ICMS/IPI", periodicidade="mensal", dia_vencimento=20),
            TipoObrigacao(nome="REINF", periodicidade="mensal", dia_vencimento=15),
            TipoObrigacao(nome="eSocial", periodicidade="mensal", dia_vencimento=7),
            TipoObrigacao(nome="Folha de Pagamento", periodicidade="mensal", dia_vencimento=5),
            TipoObrigacao(nome="SPED Contábil", periodicidade="anual", dia_vencimento=31),
            TipoObrigacao(nome="SPED Fiscal", periodicidade="mensal", dia_vencimento=25),
            TipoObrigacao(nome="DIRF", periodicidade="anual", dia_vencimento=28),
            TipoObrigacao(nome="RAIS", periodicidade="anual", dia_vencimento=31),
            TipoObrigacao(nome="DEFIS", periodicidade="anual", dia_vencimento=31),
            TipoObrigacao(nome="Balancete Mensal", periodicidade="mensal", dia_vencimento=15),
            TipoObrigacao(nome="IRPJ Trimestral", periodicidade="trimestral", dia_vencimento=31),
            TipoObrigacao(nome="CSLL Trimestral", periodicidade="trimestral", dia_vencimento=31),
            TipoObrigacao(nome="PIS Mensal", periodicidade="mensal", dia_vencimento=25),
            TipoObrigacao(nome="COFINS Mensal", periodicidade="mensal", dia_vencimento=25),
            TipoObrigacao(nome="RET - Recolhimento", periodicidade="mensal", dia_vencimento=20),
        ]
        session.add_all(tipos)
        await session.commit()
