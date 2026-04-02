from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import get_db
from models import Cliente, Entrega
from services import gerar_mensagem_obrigacao, enviar_whatsapp_texto, enviar_email
from services.claude_service import responder_duvida

router = APIRouter(prefix="/conversas", tags=["Conversas WhatsApp"])


class MensagemCreate(BaseModel):
    texto: str
    usar_ia: bool = True


class MensagemResponse(BaseModel):
    id: int
    origem: str   # escritorio | cliente | ia | sistema
    texto: str
    hora: str
    canal: Optional[str] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/{cliente_id}", response_model=List[MensagemResponse])
async def historico(cliente_id: int, db: AsyncSession = Depends(get_db)):
    """Retorna histórico de entregas/mensagens do cliente como conversa."""
    cliente = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cliente = cliente.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    entregas = await db.execute(
        select(Entrega)
        .where(Entrega.cliente_id == cliente_id)
        .order_by(Entrega.criado_em)
        .limit(50)
    )
    entregas = entregas.scalars().all()

    msgs = [
        MensagemResponse(
            id=0,
            origem="sistema",
            texto=f"Conversa com {cliente.nome} | {cliente.regime} | {cliente.canal_preferido}",
            hora=datetime.utcnow().isoformat(),
        )
    ]

    for e in entregas:
        msgs.append(MensagemResponse(
            id=e.id,
            origem="escritorio",
            texto=e.mensagem or "(sem mensagem)",
            hora=e.criado_em.isoformat() if e.criado_em else datetime.utcnow().isoformat(),
            canal=e.canal,
            status=e.status,
        ))

    return msgs


@router.post("/{cliente_id}/mensagem")
async def enviar(cliente_id: int, data: MensagemCreate, db: AsyncSession = Depends(get_db)):
    """Envia mensagem ao cliente e opcionalmente gera resposta IA."""
    cliente_result = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cliente = cliente_result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    # Gerar resposta da IA se solicitado
    resposta_ia = None
    if data.usar_ia:
        contexto = f"Cliente: {cliente.nome}, CNPJ: {cliente.cnpj}, Regime: {cliente.regime}, Canal: {cliente.canal_preferido}"
        resposta_ia = responder_duvida(pergunta=data.texto, contexto_cliente=contexto)

    # Enviar via canal preferido
    mensagem_envio = resposta_ia if resposta_ia else data.texto
    resultado = {"sucesso": False}

    if cliente.canal_preferido in ("whatsapp", "ambos") and cliente.whatsapp:
        resultado = await enviar_whatsapp_texto(cliente.whatsapp, mensagem_envio)
    elif cliente.canal_preferido in ("email", "ambos") and cliente.email:
        resultado = await enviar_email(
            destinatario=cliente.email,
            nome_destinatario=cliente.nome,
            assunto="Mensagem - EPimentel Auditoria",
            corpo=mensagem_envio,
        )

    # Registrar entrega
    from models import Entrega
    entrega = Entrega(
        cliente_id=cliente_id,
        canal=cliente.canal_preferido,
        mensagem=mensagem_envio,
        status="enviado" if resultado.get("sucesso") else "erro",
        enviado_em=datetime.utcnow(),
    )
    db.add(entrega)
    await db.commit()

    return {
        "sucesso": resultado.get("sucesso", False),
        "mensagem_enviada": mensagem_envio,
        "resposta_ia": resposta_ia,
        "canal": cliente.canal_preferido,
    }
