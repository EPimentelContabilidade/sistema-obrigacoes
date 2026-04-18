"""
Router: storage.py — Persistência Universal de Módulos
=======================================================
Substitui localStorage para TODOS os módulos do frontend.
GET  /api/v1/storage/         → lista todas as chaves salvas
GET  /api/v1/storage/{key}    → retorna dados de um módulo
POST /api/v1/storage/{key}    → salva/atualiza dados de um módulo
DELETE /api/v1/storage/{key}  → remove dados de um módulo
GET  /api/v1/storage/export   → exporta todos os módulos (backup completo)

Novos módulos: apenas chamam POST /storage/{key} — persistência automática.
"""

import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import Any
from pydantic import BaseModel

from database import get_db
from models import AppStorage

router = APIRouter(prefix="/storage", tags=["Storage Universal"])


class StoragePayload(BaseModel):
    data: Any


@router.get("/")
async def listar_chaves(db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(AppStorage.key, AppStorage.updated_at)
        .order_by(AppStorage.key)
    )
    rows = r.all()
    return {
        "total": len(rows),
        "chaves": [{"key": row.key, "updated_at": row.updated_at} for row in rows]
    }


@router.get("/export")
async def exportar_backup(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(AppStorage).order_by(AppStorage.key))
    items = r.scalars().all()
    backup = {}
    for item in items:
        try:
            backup[item.key] = json.loads(item.data) if isinstance(item.data, str) else item.data
        except Exception:
            backup[item.key] = item.data
    return {
        "backup_em": datetime.utcnow().isoformat(),
        "total_modulos": len(backup),
        "dados": backup
    }


@router.post("/import")
async def importar_backup(payload: dict, db: AsyncSession = Depends(get_db)):
    dados = payload.get("dados", payload)
    salvos = 0
    for key, value in dados.items():
        if not key or not isinstance(key, str):
            continue
        r = await db.execute(select(AppStorage).where(AppStorage.key == key))
        item = r.scalar_one_or_none()
        data_str = json.dumps(value, ensure_ascii=False)
        if item:
            item.data = data_str
            item.updated_at = datetime.utcnow()
        else:
            db.add(AppStorage(key=key, data=data_str))
        salvos += 1
    await db.commit()
    return {"ok": True, "modulos_importados": salvos}


@router.get("/{key}")
async def obter(key: str, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(AppStorage).where(AppStorage.key == key))
    item = r.scalar_one_or_none()
    if not item:
        return {"key": key, "data": None, "exists": False}
    try:
        data = json.loads(item.data) if isinstance(item.data, str) else item.data
    except Exception:
        data = item.data
    return {"key": key, "data": data, "exists": True, "updated_at": item.updated_at}


@router.post("/{key}")
async def salvar(key: str, payload: StoragePayload, db: AsyncSession = Depends(get_db)):
    if not key or len(key) > 200:
        raise HTTPException(400, "Chave inválida")
    r = await db.execute(select(AppStorage).where(AppStorage.key == key))
    item = r.scalar_one_or_none()
    data_str = json.dumps(payload.data, ensure_ascii=False)
    if item:
        item.data = data_str
        item.updated_at = datetime.utcnow()
    else:
        item = AppStorage(key=key, data=data_str)
        db.add(item)
    await db.commit()
    return {"ok": True, "key": key, "updated_at": item.updated_at}


@router.delete("/{key}")
async def deletar(key: str, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(AppStorage).where(AppStorage.key == key))
    await db.commit()
    return {"ok": True, "key": key, "deleted": True}
