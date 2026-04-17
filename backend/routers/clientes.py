from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, Any
from database import get_db
from models import Cliente

router = APIRouter(prefix="/clientes", tags=["Clientes"])


class ClienteCreate(BaseModel):
    model_config = {"extra": "ignore"}
    id:               Optional[str] = None
    ep_id:            Optional[str] = None
    nome:             str
    cnpj:             str = ""
    tipoCadastro:     Optional[str] = None
    nome_fantasia:    Optional[str] = None
    email:            Optional[str] = None
    email2:           Optional[str] = None
    email_contador:   Optional[str] = None
    whatsapp:         Optional[str] = None
    whatsapp2:        Optional[str] = None
    telefone:         Optional[str] = None
    regime:           str = "Simples Nacional"
    tributacao:       Optional[str] = None
    canal_preferido:  str = "ambos"
    canal_padrao:     Optional[str] = None
    observacoes:      Optional[str] = None
    obs_comunicacao:  Optional[str] = None
    cep:              Optional[str] = None
    logradouro:       Optional[str] = None
    numero:           Optional[str] = None
    complemento:      Optional[str] = None
    bairro:           Optional[str] = None
    municipio:        Optional[str] = None
    cidade:           Optional[str] = None
    uf:               Optional[str] = None
    estado:           Optional[str] = None
    responsavel_nome: Optional[str] = None
    responsavel_cpf:  Optional[str] = None
    responsavel_tel:  Optional[str] = None
    responsavel_email:Optional[str] = None
    inscricao_estadual:   Optional[str] = None
    inscricao_municipal:  Optional[str] = None
    cnae:             Optional[str] = None
    cnae_principal:   Optional[str] = None
    cnaes_secundarios:Optional[Any] = None
    porte:            Optional[str] = None
    natureza_juridica:Optional[str] = None
    capital_social:   Optional[Any] = None
    situacao_receita: Optional[str] = None
    situacao_cadastral: Optional[str] = None
    data_inicio:      Optional[str] = None
    data_abertura:    Optional[str] = None
    grupo:            Optional[str] = None
    valor_honorario:  Optional[float] = None
    ativo:            Optional[bool] = True


def _to_dict(data: ClienteCreate) -> dict:
    ep = (data.ep_id or data.id or "").strip()
    return {
        "ep_id": ep or None,
        "nome": data.nome,
        "cnpj": data.cnpj or "",
        "nome_fantasia": data.nome_fantasia,
        "email": data.email,
        "email2": data.email2,
        "email_contador": data.email_contador,
        "whatsapp": data.whatsapp,
        "whatsapp2": data.whatsapp2,
        "telefone": data.telefone,
        "regime": data.tributacao or data.regime or "Simples Nacional",
        "canal_preferido": data.canal_padrao or data.canal_preferido or "ambos",
        "observacoes": data.observacoes,
        "obs_comunicacao": data.obs_comunicacao,
        "cep": data.cep,
        "logradouro": data.logradouro,
        "numero": data.numero,
        "complemento": data.complemento,
        "bairro": data.bairro,
        "municipio": data.municipio or data.cidade,
        "uf": data.uf or data.estado,
        "responsavel_nome": data.responsavel_nome,
        "responsavel_cpf": data.responsavel_cpf,
        "responsavel_tel": data.responsavel_tel,
        "responsavel_email": data.responsavel_email,
        "inscricao_estadual": data.inscricao_estadual,
        "inscricao_municipal": data.inscricao_municipal,
        "cnae": data.cnae or data.cnae_principal,
        "cnaes_secundarios": str(data.cnaes_secundarios) if data.cnaes_secundarios else None,
        "porte": data.porte,
        "natureza_juridica": data.natureza_juridica,
        "capital_social": str(data.capital_social) if data.capital_social else None,
        "situacao_receita": data.situacao_cadastral or data.situacao_receita,
        "data_inicio": data.data_abertura or data.data_inicio,
        "grupo": data.grupo,
        "ativo": data.ativo if data.ativo is not None else True,
    }


def _resp(c: Cliente) -> dict:
    return {
        "id": c.ep_id or str(c.id),
        "ep_id": c.ep_id, "db_id": c.id,
        "nome": c.nome, "cnpj": c.cnpj,
        "nome_fantasia": c.nome_fantasia,
        "email": c.email, "email2": c.email2,
        "whatsapp": c.whatsapp, "whatsapp2": c.whatsapp2,
        "telefone": c.telefone,
        "regime": c.regime, "tributacao": c.regime,
        "canal_preferido": c.canal_preferido,
        "ativo": c.ativo,
        "observacoes": c.observacoes, "obs_comunicacao": c.obs_comunicacao,
        "cep": c.cep, "logradouro": c.logradouro,
        "numero": c.numero, "complemento": c.complemento,
        "bairro": c.bairro, "municipio": c.municipio, "cidade": c.municipio,
        "uf": c.uf, "estado": c.uf,
        "responsavel_nome": c.responsavel_nome,
        "responsavel_cpf": c.responsavel_cpf,
        "responsavel_tel": c.responsavel_tel,
        "responsavel_email": c.responsavel_email,
        "inscricao_estadual": c.inscricao_estadual,
        "inscricao_municipal": c.inscricao_municipal,
        "cnae": c.cnae, "cnae_principal": c.cnae,
        "cnaes_secundarios": c.cnaes_secundarios,
        "porte": c.porte,
        "natureza_juridica": c.natureza_juridica,
        "capital_social": c.capital_social,
        "situacao_receita": c.situacao_receita,
        "situacao_cadastral": c.situacao_receita,
        "data_inicio": c.data_inicio, "data_abertura": c.data_inicio,
        "grupo": c.grupo,
    }


async def _find(cid: str, db):
    if cid.upper().startswith("EP-"):
        r = await db.execute(select(Cliente).where(Cliente.ep_id == cid))
        return r.scalar_one_or_none()
    try:
        r = await db.execute(select(Cliente).where(Cliente.id == int(cid)))
        return r.scalar_one_or_none()
    except ValueError:
        r = await db.execute(select(Cliente).where(Cliente.ep_id == cid))
        return r.scalar_one_or_none()


@router.get("/")
async def listar(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Cliente).where(Cliente.ativo == True).order_by(Cliente.nome))
    return [_resp(c) for c in r.scalars().all()]


@router.get("/{cid}")
async def obter(cid: str, db: AsyncSession = Depends(get_db)):
    c = await _find(cid, db)
    if not c: raise HTTPException(404, "Cliente nao encontrado")
    return _resp(c)


@router.post("/", status_code=201)
async def criar(data: ClienteCreate, db: AsyncSession = Depends(get_db)):
    ep = (data.ep_id or data.id or "").strip()
    campos = _to_dict(data)
    ex = None
    if ep:
        r = await db.execute(select(Cliente).where(Cliente.ep_id == ep))
        ex = r.scalar_one_or_none()
    if not ex and data.cnpj:
        cl = data.cnpj.replace(".","").replace("/","").replace("-","").replace(" ","")
        if cl:
            r = await db.execute(select(Cliente))
            for c in r.scalars().all():
                if c.cnpj and c.cnpj.replace(".","").replace("/","").replace("-","").replace(" ","") == cl:
                    ex = c; break
    if ex:
        for k,v in campos.items():
            if hasattr(ex, k) and v is not None: setattr(ex, k, v)
        await db.commit(); await db.refresh(ex)
        return _resp(ex)
    c = Cliente(**campos)
    db.add(c); await db.commit(); await db.refresh(c)
    return _resp(c)


@router.put("/{cid}")
async def atualizar(cid: str, data: ClienteCreate, db: AsyncSession = Depends(get_db)):
    c = await _find(cid, db)
    if not c: return await criar(data, db)
    for k,v in _to_dict(data).items():
        if hasattr(c, k) and v is not None: setattr(c, k, v)
    await db.commit(); await db.refresh(c)
    return _resp(c)


@router.delete("/{cid}")
async def excluir(cid: str, db: AsyncSession = Depends(get_db)):
    c = await _find(cid, db)
    if not c: raise HTTPException(404, "Cliente nao encontrado")
    c.ativo = False
    await db.commit()
    return {"ok": True}


@router.get("/{cid}/verificar-exclusao")
async def verificar_exclusao(cid: str, db: AsyncSession = Depends(get_db)):
    return {"bloqueado": False}


@router.post("/certificado/info")
async def cert_info(payload: dict):
    try:
        import base64, re
        from cryptography.hazmat.primitives.serialization import pkcs12
        raw = base64.b64decode(payload.get("cert_base64",""))
        pw = (payload.get("senha") or "").encode()
        _, cert, _ = pkcs12.load_key_and_certificates(raw, pw)
        subj = {a.oid.dotted_string: a.value for a in cert.subject}
        cn = subj.get("2.5.4.3","")
        try:    va = cert.not_valid_after_utc.strftime("%Y-%m-%d")
        except: va = str(cert.not_valid_after)
        m = re.search(r"\d{14}", cn.replace(".","").replace("/","").replace("-",""))
        return {"titular": cn, "validade": va,
                "cnpj": m.group(0) if m else "",
                "tipo": "e-CPF" if "CPF" in cn.upper() else "e-CNPJ"}
    except Exception as e:
        raise HTTPException(400, str(e))
