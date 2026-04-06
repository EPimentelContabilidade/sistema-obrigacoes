from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import json, os, re

certidoes_router = APIRouter(prefix="/certidoes", tags=["Certidoes"])

HIST_FILE = "certidoes_historico.json"

def ler_hist():
    if os.path.exists(HIST_FILE):
        try:
            with open(HIST_FILE) as f:
                return json.load(f)
        except Exception:
            os.remove(HIST_FILE)
    return []

def salvar_hist(h):
    with open(HIST_FILE, "w") as f: json.dump(h, f, ensure_ascii=False, default=str)

PORTAIS = {
    "cnd_federal":           {"nome": "CND Federal",           "orgao": "Receita Federal / PGFN",  "url": "https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir"},
    "cnd_fgts":              {"nome": "CRF/FGTS",              "orgao": "Caixa Economica Federal", "url": "https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf"},
    "cnd_trabalhista":       {"nome": "CNDT",                  "orgao": "TST",                     "url": "https://www.tst.jus.br/certidao"},
    "cnd_estadual_go":       {"nome": "CND Estadual GO",       "orgao": "SEFAZ Goias",             "url": "https://www.economia.go.gov.br/component/sefaz/?view=certidao"},
    "cnd_municipal_goiania": {"nome": "CND Municipal Goiania", "orgao": "Prefeitura de Goiania",   "url": "https://tributos.goiania.go.gov.br/cnd"},
    "cnd_simples":           {"nome": "Regularidade Simples",  "orgao": "Receita Federal",         "url": "https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir"},
}

class ConsultaCertidao(BaseModel):
    cnpj: str
    tipos: List[str]
    cliente_id: Optional[str] = None

class BaixarCertidao(BaseModel):
    tipo: str
    cnpj: str

@certidoes_router.get("/historico")
async def historico():
    return ler_hist()

@certidoes_router.post("/consultar")
async def consultar(data: ConsultaCertidao):
    cnpj = re.sub(r"\D", "", data.cnpj)
    if len(cnpj) != 14:
        raise HTTPException(status_code=400, detail="CNPJ invalido.")
    resultados = []
    for tipo in data.tipos:
        portal = PORTAIS.get(tipo, {})
        resultados.append({
            "tipo": tipo,
            "nome": portal.get("nome", tipo),
            "status": "pendente",
            "cnpj": data.cnpj,
            "url_portal": portal.get("url", ""),
            "orgao": portal.get("orgao", ""),
            "tem_pdf": False,
            "validade": None,
            "mensagem": "Clique em Abrir Portal para emitir no site oficial",
        })
    salvar_hist(resultados)
    return resultados

@certidoes_router.post("/baixar")
async def baixar(data: BaixarCertidao):
    portal = PORTAIS.get(data.tipo, {})
    return {"url_portal": portal.get("url", ""), "mensagem": "Acesse o portal para baixar"}

@certidoes_router.post("/enviar-cliente")
async def enviar_cliente(data: dict):
    return {"mensagem": "Certidao enviada ao cliente"}
