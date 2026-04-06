from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import json, os, random

router = APIRouter(prefix="/financeiro", tags=["Financeiro"])

DB_FILE = "financeiro.json"

def ler_db():
    if os.path.exists(DB_FILE):
        with open(DB_FILE) as f: return json.load(f)
    return {"pagar": [], "receber": []}

def salvar_db(db):
    with open(DB_FILE, "w") as f: json.dump(db, f, ensure_ascii=False, default=str)


class Lancamento(BaseModel):
    descricao: str
    valor: float
    vencimento: str
    tipo: str  # pagar | receber
    categoria: Optional[str] = None
    cliente_fornecedor: Optional[str] = None
    status: str = "pendente"
    observacoes: Optional[str] = None


@router.get("/lancamentos")
async def listar(tipo: str = Query(...), mes: int = Query(default=1), ano: int = Query(default=2026)):
    db = ler_db()
    dados = db.get(tipo, [])
    # filtrar por mês/ano
    filtrados = []
    for d in dados:
        try:
            dt = datetime.strptime(d.get("vencimento", ""), "%Y-%m-%d")
            if dt.month == mes and dt.year == ano:
                filtrados.append(d)
        except:
            filtrados.append(d)  # sem data, inclui
    return filtrados


@router.post("/lancamentos")
async def criar(data: Lancamento):
    db = ler_db()
    chave = data.tipo if data.tipo in ("pagar", "receber") else "pagar"
    item = data.model_dump()
    item["id"] = int(datetime.now().timestamp() * 1000)
    item["criado_em"] = datetime.now().isoformat()
    # verificar vencimento
    try:
        venc = datetime.strptime(data.vencimento, "%Y-%m-%d")
        if venc < datetime.now() and data.status == "pendente":
            item["status"] = "vencido"
    except: pass
    db.setdefault(chave, []).append(item)
    salvar_db(db)
    return item


@router.patch("/lancamentos/{id}/status")
async def atualizar_status(id: int, body: dict):
    db = ler_db()
    for tipo in ("pagar", "receber"):
        for item in db.get(tipo, []):
            if item.get("id") == id:
                item["status"] = body.get("status", item["status"])
                if body.get("status") in ("pago", "recebido"):
                    item["data_pagamento"] = datetime.now().isoformat()
                salvar_db(db)
                return item
    raise HTTPException(status_code=404, detail="Lançamento não encontrado")


@router.get("/dre")
async def dre(mes: int = Query(default=1), ano: int = Query(default=2026)):
    db = ler_db()
    receber = sum(d["valor"] for d in db.get("receber", []) if d.get("status") in ("recebido", "pendente"))
    pagar = sum(d["valor"] for d in db.get("pagar", []) if d.get("status") in ("pago", "pendente"))
    return {
        "periodo": f"{str(mes).zfill(2)}/{ano}",
        "receita_bruta": receber,
        "deducoes": receber * 0.06,
        "receita_liquida": receber * 0.94,
        "custos": pagar,
        "resultado": (receber * 0.94) - pagar,
    }


@router.get("/fluxo-caixa")
async def fluxo_caixa(mes: int = Query(default=1), ano: int = Query(default=2026)):
    return [
        {"semana": i+1, "entradas": round(random.uniform(5000, 30000), 2), "saidas": round(random.uniform(3000, 20000), 2)}
        for i in range(4)
    ]


@router.get("/banco-inter/extrato")
async def extrato_inter(mes: int = Query(default=1), ano: int = Query(default=2026)):
    INTER_CLIENT_ID = os.getenv("INTER_CLIENT_ID", "")
    if not INTER_CLIENT_ID:
        return []  # Não configurado — retorna vazio
    # TODO: Implementar integração real com API Banco Inter
    # https://developers.bancointer.com.br/reference/obterextrato
    return []


@router.post("/banco-inter/sincronizar")
async def sincronizar_inter():
    return {"mensagem": "Configure INTER_CLIENT_ID e INTER_CLIENT_SECRET no .env para sincronizar"}
