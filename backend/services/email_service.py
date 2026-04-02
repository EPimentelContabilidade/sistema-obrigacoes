import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import os
from config import settings


async def enviar_email(
    destinatario: str,
    nome_destinatario: str,
    assunto: str,
    corpo: str,
    arquivo_path: str = None,
) -> dict:
    """Envia e-mail com ou sem anexo."""

    msg = MIMEMultipart()
    msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_USER}>"
    msg["To"] = f"{nome_destinatario} <{destinatario}>"
    msg["Subject"] = assunto

    msg.attach(MIMEText(corpo, "plain", "utf-8"))

    if arquivo_path and os.path.exists(arquivo_path):
        with open(arquivo_path, "rb") as f:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(f.read())
        encoders.encode_base64(part)
        filename = os.path.basename(arquivo_path)
        part.add_header("Content-Disposition", f'attachment; filename="{filename}"')
        msg.attach(part)

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.EMAIL_HOST,
            port=settings.EMAIL_PORT,
            username=settings.EMAIL_USER,
            password=settings.EMAIL_PASSWORD,
            start_tls=True,
        )
        return {"sucesso": True, "mensagem": f"E-mail enviado para {destinatario}"}
    except Exception as e:
        return {"sucesso": False, "mensagem": str(e)}
