from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import random, os

router = APIRouter(prefix="/parcelamentos", tags=["Parcelamentos"])

RECEITA_CERT_PATH = os.getenv("RECEITA_CERT_PATH", "")

PROGRAMAS_RECEITA = ["PARCELAMENTO ORDINÁRIO", "REFIS", "PAES", "PERT", "RELP", "TRANSAÇÃO TRIBUTÁRIA"]
PROGRAMAS_PGFN = ["REGULARIZE", "PGFN-PARCELAMENTO", "NEGOCIAÇÃO PGFN", "TRANSAÇÃO PGFN"]
TIPOS = ["Débito Previdenciário", "Débito Tributário Federal", "Simples Nacional", "FGTS", "Débito Trabalhista"]


def _mock_parcelamentos(orgao: str, cnpj: str):
    programas = PROGRAMAS_PGFN if orgao == "pgfn" else PROGRAMAS_RECEITA
    status_opcoes = ["ativo", "ativo", "ativo", "em_atraso", "suspenso"]
    parcelamentos = []

    for i in range(random.randint(2, 6)):
        total_parcelas = random.randint(12, 120)
        pagas = random.randint(0, total_parcelas - 1)
        restantes = total_parcelas - pagas
        saldo = round(random.uniform(5000, 500000), 2)
        proximo = datetime.now() + timedelta(days=random.randint(1, 30))

        parcelamentos.append({
            "numero": f"{random.randint(100000, 999999)}/{datetime.now().year}-{random.randint(10, 99)}",
            "tipo": random.choice(TIPOS),
            "programa": random.choice(programas),
            "parcelas_total": total_parcelas,
            "parcelas_pagas": pagas,
            "parcelas_restantes": restantes,
            "proximo_vencimento": proximo.strftime("%d/%m/%Y"),
            "saldo_devedor": saldo,
            "valor_parcela": round(saldo / restantes, 2) if restantes > 0 else 0,
            "status": random.choice(status_opcoes),
            "data_consolidacao": (datetime.now() - timedelta(days=random.randint(30, 730))).strftime("%d/%m/%Y"),
        })

    return parcelamentos


def _mock_parcelas(numero: str):
    parcelas = []
    total = random.randint(12, 60)
    pagas_ate = random.randint(3, min(total - 1, 20))

    for i in range(1, min(total + 1, 31)):  # mostrar max 30
        principal = round(random.uniform(800, 5000), 2)
        multa = round(principal * random.uniform(0, 0.2), 2)
        juros = round(principal * random.uniform(0, 0.15), 2)
        venc = datetime.now() - timedelta(days=(pagas_ate - i) * 30)

        parcelas.append({
            "numero": i,
            "vencimento": venc.strftime("%d/%m/%Y"),
            "principal": principal,
            "multa": multa if i > pagas_ate else 0,
            "juros": juros if i > pagas_ate else 0,
            "total": principal + (multa if i > pagas_ate else 0) + (juros if i > pagas_ate else 0),
            "situacao": "paga" if i <= pagas_ate else ("em_atraso" if venc < datetime.now() else "ativo"),
        })

    return parcelas


@router.get("/consultar")
async def consultar_parcelamentos(
    orgao: str = Query(...),
    cnpj: str = Query(default=""),
    cpf: str = Query(default=""),
):
    if not cnpj and not cpf:
        raise HTTPException(status_code=400, detail="Informe o CNPJ ou CPF.")

    # Em produção: conectar ao e-CAC / REGULARIZE com certificado digital
    if RECEITA_CERT_PATH and os.path.exists(RECEITA_CERT_PATH):
        # TODO: Implementar consulta real via API do e-CAC
        # https://www.gov.br/receitafederal/pt-br/servicos/digitais/parcelamento
        pass

    return _mock_parcelamentos(orgao, cnpj)


@router.get("/parcelas")
async def listar_parcelas(
    orgao: str = Query(...),
    numero: str = Query(...),
):
    return _mock_parcelas(numero)


class DarfRequest(BaseModel):
    orgao: str
    numero_parcelamento: str
    parcela: int


@router.post("/emitir-darf")
async def emitir_darf(data: DarfRequest):
    """Emite DARF para pagamento de parcela."""
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    import io

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)

    # Cabeçalho
    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, 780, "DOCUMENTO DE ARRECADAÇÃO DE RECEITAS FEDERAIS")
    c.setFont("Helvetica-Bold", 12)
    c.drawString(100, 760, "DARF — Parcelamento")

    # Dados
    c.setFont("Helvetica", 10)
    linhas = [
        f"Órgão: {'Receita Federal' if data.orgao == 'receita' else 'PGFN'}",
        f"Número do Parcelamento: {data.numero_parcelamento}",
        f"Parcela: {data.parcela}ª",
        f"Período de Apuração: {datetime.now().strftime('%m/%Y')}",
        f"Data de Vencimento: {(datetime.now() + timedelta(days=15)).strftime('%d/%m/%Y')}",
        f"Valor Principal: R$ {round(random.uniform(500, 5000), 2):,.2f}",
        f"Multa: R$ {round(random.uniform(0, 200), 2):,.2f}",
        f"Juros: R$ {round(random.uniform(0, 150), 2):,.2f}",
        "",
        "Código de Barras: (gerado pelo sistema em produção)",
        "",
        "EPimentel Auditoria & Contabilidade Ltda",
        "CRC/GO 026.994/O-8 — Goiânia-GO",
        f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}",
    ]
    y = 720
    for linha in linhas:
        c.drawString(100, y, linha)
        y -= 20

    c.save()
    buffer.seek(0)

    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=DARF_Parcela_{data.parcela}.pdf"}
    )
