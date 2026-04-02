import anthropic
from config import settings
from typing import Optional


client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.ANTHROPIC_API_KEY else None


def gerar_mensagem_obrigacao(
    nome_cliente: str,
    tipo_obrigacao: str,
    competencia: str,
    vencimento: str,
    valor: Optional[float],
    canal: str,
    observacoes: Optional[str] = None,
) -> str:
    """Gera mensagem personalizada via Claude AI para entrega de obrigação."""

    if not client:
        return _mensagem_padrao(nome_cliente, tipo_obrigacao, competencia, vencimento, valor, canal)

    valor_str = f"Valor: R$ {valor:,.2f}" if valor else ""
    obs_str = f"Observações: {observacoes}" if observacoes else ""
    estilo = "WhatsApp (informal, use emojis, máximo 3 parágrafos curtos)" if canal == "whatsapp" else "e-mail profissional (formal, com saudação e assinatura)"

    prompt = f"""Você é um assistente do escritório EPimentel Auditoria & Contabilidade Ltda, CRC/GO 026.994/O-8, em Goiânia-GO.

Redija uma mensagem de {estilo} para entregar/comunicar ao cliente sobre uma obrigação acessória.

Dados:
- Cliente: {nome_cliente}
- Obrigação: {tipo_obrigacao}
- Competência: {competencia}
- Vencimento: {vencimento}
{valor_str}
{obs_str}

A mensagem deve ser clara, profissional e amigável. Se for WhatsApp, seja breve e direto. Se for e-mail, seja mais completo. Não invente dados não fornecidos. Inclua que o cliente pode entrar em contato em caso de dúvidas."""

    try:
        response = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text
    except Exception:
        return _mensagem_padrao(nome_cliente, tipo_obrigacao, competencia, vencimento, valor, canal)


def analisar_documento(conteudo: str, tipo: str) -> str:
    """Analisa um documento contábil e gera resumo para o cliente."""

    if not client:
        return "Análise de IA não disponível. Configure a chave ANTHROPIC_API_KEY no .env"

    prompt = f"""Você é contador sênior do escritório EPimentel Auditoria & Contabilidade Ltda.

Analise o seguinte {tipo} e gere um resumo executivo claro para o cliente (não contador). 
Use linguagem simples, destaque pontos importantes e alertas se houver.

Conteúdo:
{conteudo[:3000]}

Formate o resumo em até 5 tópicos objetivos."""

    try:
        response = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text
    except Exception as e:
        return f"Erro na análise: {str(e)}"


def responder_duvida(pergunta: str, contexto_cliente: str) -> str:
    """Responde dúvida do cliente via IA."""

    if not client:
        return "IA não disponível. Entre em contato pelo telefone do escritório."

    prompt = f"""Você é assistente do escritório EPimentel Auditoria & Contabilidade Ltda, Goiânia-GO.

Contexto do cliente: {contexto_cliente}

Dúvida: {pergunta}

Responda de forma clara e profissional. Se não souber ou for muito específico, oriente o cliente a entrar em contato diretamente com o escritório."""

    try:
        response = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text
    except Exception as e:
        return f"Não foi possível processar sua dúvida. Entre em contato pelo telefone do escritório."


def _mensagem_padrao(nome, tipo, competencia, vencimento, valor, canal) -> str:
    """Mensagem padrão quando IA não está disponível."""
    valor_str = f"\n💰 Valor: R$ {valor:,.2f}" if valor else ""
    if canal == "whatsapp":
        return f"""Olá, {nome}! 👋

📋 *{tipo}* - Competência {competencia}
📅 Vencimento: {vencimento}{valor_str}

Segue em anexo o documento para sua apreciação. Em caso de dúvidas, estamos à disposição! 😊

*EPimentel Auditoria & Contabilidade*"""
    else:
        return f"""Prezado(a) {nome},

Encaminhamos o documento referente à obrigação acessória abaixo:

• Obrigação: {tipo}
• Competência: {competencia}
• Vencimento: {vencimento}{valor_str}

O documento está em anexo. Qualquer dúvida, entre em contato conosco.

Atenciosamente,
EPimentel Auditoria & Contabilidade Ltda
CRC/GO 026.994/O-8"""
