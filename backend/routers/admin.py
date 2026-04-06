from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json, os

router = APIRouter(prefix="/admin", tags=["Admin"])

LOGS_FILE = "admin_logs.json"
CONFIG_FILE = "admin_config.json"


def ler_logs():
    if os.path.exists(LOGS_FILE):
        with open(LOGS_FILE) as f:
            return json.load(f)
    return []


def salvar_log(nivel: str, mensagem: str):
    logs = ler_logs()
    logs.append({"hora": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "nivel": nivel, "mensagem": mensagem})
    logs = logs[-500:]  # manter últimos 500
    with open(LOGS_FILE, "w") as f:
        json.dump(logs, f)


@router.get("/logs")
async def listar_logs():
    return ler_logs()


@router.delete("/logs")
async def limpar_logs():
    if os.path.exists(LOGS_FILE):
        os.remove(LOGS_FILE)
    return {"mensagem": "Logs limpos"}


@router.get("/config")
async def obter_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return {
        "nome_escritorio": "EPimentel Auditoria & Contabilidade Ltda",
        "crc": "CRC/GO 026.994/O-8",
        "email": "",
        "telefone": "",
        "cnpj": "",
    }


class ConfigUpdate(BaseModel):
    nome_escritorio: Optional[str] = None
    crc: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    cnpj: Optional[str] = None


@router.post("/config")
async def salvar_config(data: ConfigUpdate):
    with open(CONFIG_FILE, "w") as f:
        json.dump(data.model_dump(), f)
    salvar_log("info", "Configurações do sistema atualizadas")
    return {"mensagem": "Configurações salvas"}
