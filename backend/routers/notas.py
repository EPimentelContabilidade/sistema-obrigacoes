from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import httpx, os, random
from config import settings

router = APIRouter(prefix="/notas", tags=["Notas Fiscais"])

SEFAZ_CERT_PATH = os.getenv("SEFAZ_CERT_PATH", "")
SEFAZ_CERT_PASS = os.getenv("SEFAZ_CERT_PASS", "")

# URLs dos portais
PORTAIS_URL = {
    "sefaz_nfe": "https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx",
    "portal_nfse": "https://www.nfse.gov.br/EmissaoNFSe/ConsultaNfse",
    "goiania_nfse": "https://nfse.goiania.go.gov.br/nota-fiscal-servico-eletronica",
    "sefaz_go": "https://www.sefaz.go.gov.br/NfeConsulta/NfeConsulta.aspx",
}


def _mock_notas(cnpj: str, tipo: str, quantidade: int = 10):
    """Retorna notas simuladas para demonstração."""
    status_opcoes = ["autorizada", "autorizada", "autorizada", "cancelada", "denegada"]
    notas = []
    for i in range(quantidade):
        data = datetime.now() - timedelta(days=i * 3)
        notas.append({
            "chave": "".join([str(random.randint(0, 9)) for _ in range(44)]),
            "numero": str(random.randint(1000, 99999)).zfill(6),
            "data_emissao": data.strftime("%d/%m/%Y"),
            "emitente": f"EMPRESA EMITENTE {i+1} LTDA" if tipo == "nfe" else cnpj,
            "destinatario": f"CLIENTE {i+1} SA" if tipo == "nfe" else f"TOMADOR {i+1}",
            "valor": round(random.uniform(500, 50000), 2),
            "status": random.choice(status_opcoes),
            "tipo": tipo,
            "serie": str(random.randint(1, 3)),
        })
    return notas


@router.get("/buscar")
async def buscar_notas(
    portal: str = Query(...),
    cnpj: str = Query(default=""),
    chave: str = Query(default=""),
    inicio: str = Query(default=""),
    fim: str = Query(default=""),
):
    if not cnpj and not chave:
        raise HTTPException(status_code=400, detail="Informe o CNPJ ou a chave de acesso.")

    # Consulta por chave específica
    if chave and len(chave) == 44:
        nota = {
            "chave": chave,
            "numero": chave[25:34],
            "data_emissao": datetime.now().strftime("%d/%m/%Y"),
            "emitente": "EMITENTE CONSULTADO LTDA",
            "destinatario": "DESTINATÁRIO LTDA",
            "valor": round(random.uniform(1000, 30000), 2),
            "status": "autorizada",
            "tipo": "nfe",
            "serie": "1",
        }
        return [nota]

    # Consulta por CNPJ — Em produção, conectar ao SEFAZ via certificado digital
    if SEFAZ_CERT_PATH and os.path.exists(SEFAZ_CERT_PATH):
        # TODO: Implementar consulta real via SOAP/HTTPS com certificado A1
        # Requer biblioteca zeep ou requests com certificado pkcs12
        pass

    # Modo demonstração — retorna dados simulados
    tipo = "nfse" if "nfse" in portal else "nfe"
    notas = _mock_notas(cnpj, tipo)

    return notas


class BaixarRequest(BaseModel):
    portal: str
    chave: str
    formato: str = "pdf"


@router.post("/baixar")
async def baixar_nota(data: BaixarRequest):
    """Baixa XML ou PDF de uma nota fiscal."""

    # Em produção: consultar SEFAZ e retornar o arquivo real
    if SEFAZ_CERT_PATH and os.path.exists(SEFAZ_CERT_PATH):
        # TODO: Download real via SEFAZ com certificado
        pass

    # Modo demonstração — gera PDF simulado
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    import io

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 750, "NOTA FISCAL ELETRÔNICA")
    c.setFont("Helvetica", 12)
    c.drawString(100, 720, f"Chave: {data.chave}")
    c.drawString(100, 700, f"Portal: {data.portal}")
    c.drawString(100, 680, f"Emitido em: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    c.drawString(100, 650, "EPimentel Auditoria & Contabilidade Ltda")
    c.drawString(100, 630, "CRC/GO 026.994/O-8 — Goiânia-GO")
    c.save()
    buffer.seek(0)

    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=NF_{data.chave[:10]}.pdf"}
    )
