from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import enum

Base = declarative_base()


class RegimeTributario(str, enum.Enum):
    SIMPLES = "Simples Nacional"
    LUCRO_PRESUMIDO = "Lucro Presumido"
    LUCRO_REAL = "Lucro Real"
    RET = "RET"


class StatusEntrega(str, enum.Enum):
    PENDENTE = "pendente"
    ENVIADO = "enviado"
    ERRO = "erro"
    CONFIRMADO = "confirmado"


class CanalEntrega(str, enum.Enum):
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    AMBOS = "ambos"


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    ep_id = Column(String(20), unique=True, nullable=True, index=True)
    nome = Column(String(200), nullable=False)
    cnpj = Column(String(18), unique=True, nullable=True)
    nome_fantasia = Column(String(200))
    email = Column(String(200))
    email2 = Column(String(200))
    email_contador = Column(String(200))
    whatsapp = Column(String(20))
    whatsapp2 = Column(String(20))
    telefone = Column(String(20))
    regime = Column(String(50), default=RegimeTributario.SIMPLES)
    ativo = Column(Boolean, default=True)
    canal_preferido = Column(String(20), default=CanalEntrega.AMBOS)
    criado_em = Column(DateTime, default=datetime.utcnow)
    observacoes = Column(Text)
    obs_comunicacao = Column(Text)
    # Endereço
    cep = Column(String(10))
    logradouro = Column(String(300))
    numero = Column(String(20))
    complemento = Column(String(100))
    bairro = Column(String(100))
    municipio = Column(String(100))
    uf = Column(String(2))
    # Responsável
    responsavel_nome = Column(String(200))
    responsavel_cpf = Column(String(14))
    responsavel_tel = Column(String(20))
    responsavel_email = Column(String(200))
    # Dados Fiscais
    inscricao_estadual = Column(String(50))
    inscricao_municipal = Column(String(50))
    cnae = Column(String(200))
    cnaes_secundarios = Column(Text)
    porte = Column(String(50))
    natureza_juridica = Column(String(200))
    capital_social = Column(String(50))
    situacao_receita = Column(String(50))
    data_inicio = Column(String(20))
    grupo = Column(String(100))

    obrigacoes = relationship("Obrigacao", back_populates="cliente")
    entregas = relationship("Entrega", back_populates="cliente")


class TipoObrigacao(Base):
    __tablename__ = "tipos_obrigacao"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    descricao = Column(Text)
    periodicidade = Column(String(50))  # mensal, trimestral, anual
    dia_vencimento = Column(Integer)
    ativo = Column(Boolean, default=True)

    obrigacoes = relationship("Obrigacao", back_populates="tipo")


class Obrigacao(Base):
    __tablename__ = "obrigacoes"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    tipo_id = Column(Integer, ForeignKey("tipos_obrigacao.id"), nullable=False)
    competencia = Column(String(7), nullable=False)  # AAAA-MM
    vencimento = Column(DateTime)
    valor = Column(Float)
    arquivo_path = Column(String(500))
    status = Column(String(20), default="pendente")
    criado_em = Column(DateTime, default=datetime.utcnow)
    observacoes = Column(Text)

    cliente = relationship("Cliente", back_populates="obrigacoes")
    tipo = relationship("TipoObrigacao", back_populates="obrigacoes")
    entregas = relationship("Entrega", back_populates="obrigacao")


class Entrega(Base):
    __tablename__ = "entregas"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    obrigacao_id = Column(Integer, ForeignKey("obrigacoes.id"), nullable=True)
    canal = Column(String(20), nullable=False)
    status = Column(String(20), default=StatusEntrega.PENDENTE)
    mensagem = Column(Text)
    resposta_api = Column(Text)
    tentativas = Column(Integer, default=0)
    enviado_em = Column(DateTime)
    criado_em = Column(DateTime, default=datetime.utcnow)

    cliente = relationship("Cliente", back_populates="entregas")
    obrigacao = relationship("Obrigacao", back_populates="entregas")
