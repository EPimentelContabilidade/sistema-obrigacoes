from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from models import Cliente

router = APIRouter(prefix="/clientes", tags=["Clientes"])


class ClienteCreate(BaseModel):
    nome: str
    cnpj: str
    nome_fantasia: Optional[str] = None
    email: Optional[str] = None
    email2: Optional[str] = None
    email_contador: Optional[str] = None
    whatsapp: Optional[str] = None
    whatsapp2: Optional[str] = None
    telefone: Optional[str] = None
    regime: str = "Simples Nacional"
    canal_preferido: str = "ambos"
    observacoes: Optional[str] = None
    obs_comunicacao: Optional[str] = None
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None
    responsavel_nome: Optional[str] = None
    responsavel_cpf: Optional[str] = None
    responsavel_tel: Optional[str] = None
    responsavel_email: Optional[str] = None
    inscricao_estadual: Optional[str] = None
    inscricao_municipal: Optional[str] = None
    cnae: Optional[str] = None
    cnaes_secundarios: Optional[str] = None
    porte: Optional[str] = None
    natureza_juridica: Optional[str] = None
    capital_social: Optional[str] = None
    situacao_receita: Optional[str] = None
    data_inicio: Optional[str] = None
    grupo: Optional[str] = None
    ativo: Optional[bool] = True


class ClienteResponse(BaseModel):
    id: int
    nome: str
    cnpj: str
    nome_fantasia: Optional[str] = None
    email: Optional[str] = None
    email2: Optional[str] = None
    whatsapp: Optional[str] = None
    whatsapp2: Optional[str] = None
    telefone: Optional[str] = None
    regime: str
    canal_preferido: str
    ativo: bool
    observacoes: Optional[str] = None
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None
    responsavel_nome: Optional[str] = None
    responsavel_cpf: Optional[str] = None
    cnae: Optional[str] = None
    cnaes_secundarios: Optional[str] = None
    porte: Optional[str] = None
    situacao_receita: Optional[str] = None
    data_inicio: Optional[str] = None
    grupo: Optional[str] = None
    natureza_juridica: Optional[str] = None
    capital_social: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/por-cnpj", response_model=ClienteResponse)
async def buscar_por_cnpj(cnpj: str = Query(...), db: AsyncSession = Depends(get_db)):
    cnpj_limpo = cnpj.replace(".", "").replace("/", "").replace("-", "")
    result = await db.execute(select(Cliente))
    for c in result.scalars().all():
        if c.cnpj:
            c_limpo = c.cnpj.replace(".", "").replace("/", "").replace("-", "")
            if c_limpo == cnpj_limpo or c_limpo[:8] == cnpj_limpo[:8]:
                return c
    raise HTTPException(status_code=404, detail="Cliente não encontrado")


@router.get("/", response_model=List[ClienteResponse])
async def listar_clientes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Cliente).where(Cliente.ativo == True).order_by(Cliente.nome))
    return result.scalars().all()


@router.get("/{cliente_id}", response_model=ClienteResponse)
async def obter_cliente(cliente_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return cliente


@router.post("/", response_model=ClienteResponse, status_code=201)
async def criar_cliente(data: ClienteCreate, db: AsyncSession = Depends(get_db)):
    cnpj_limpo = data.cnpj.replace(".", "").replace("/", "").replace("-", "")
    result = await db.execute(select(Cliente))
    for c in result.scalars().all():
        if c.cnpj and c.cnpj.replace(".","").replace("/","").replace("-","") == cnpj_limpo:
            raise HTTPException(status_code=400, detail=f"CNPJ já cadastrado: {c.nome}")
    campos = {k: v for k, v in data.model_dump().items() if hasattr(Cliente, k)}
    cliente = Cliente(**campos)
    db.add(cliente)
    await db.commit()
    await db.refresh(cliente)
    return cliente


@router.put("/{cliente_id}", response_model=ClienteResponse)
async def atualizar_cliente(cliente_id: int, data: ClienteCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    for field, value in data.model_dump().items():
        if hasattr(cliente, field):
            setattr(cliente, field, value)
    await db.commit()
    await db.refresh(cliente)
    return cliente


@router.delete("/{cliente_id}")
async def excluir_cliente(
    cliente_id: int,
    perfil: str = Query(default=""),
    db: AsyncSession = Depends(get_db)
):
    """Exclusão protegida — apenas admin pode excluir clientes com registros."""
    result = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    from models import Entrega, Obrigacao
    entregas = await db.execute(select(Entrega).where(Entrega.cliente_id == cliente_id))
    obrigacoes = await db.execute(select(Obrigacao).where(Obrigacao.cliente_id == cliente_id))
    tem_registros = bool(entregas.first() or obrigacoes.first())

    if tem_registros and perfil != "admin":
        raise HTTPException(status_code=403, detail="Este cliente possui registros vinculados. Apenas o administrador pode excluí-lo.")

    if tem_registros and perfil == "admin":
        cliente.ativo = False
        await db.commit()
        return {"mensagem": "Cliente desativado pelo administrador"}

    cliente.ativo = False
    await db.commit()
    return {"mensagem": "Cliente removido"}


@router.get("/{cliente_id}/verificar-exclusao")
async def verificar_exclusao(cliente_id: int, db: AsyncSession = Depends(get_db)):
    from models import Entrega, Obrigacao
    motivos = []
    try:
        r = await db.execute(select(Entrega).where(Entrega.cliente_id == cliente_id))
        cnt = len(r.fetchall())
        if cnt > 0: motivos.append(f"{cnt} entregas/tarefas")
    except Exception: pass
    try:
        r = await db.execute(select(Obrigacao).where(Obrigacao.cliente_id == cliente_id))
        cnt = len(r.fetchall())
        if cnt > 0: motivos.append(f"{cnt} obrigações")
    except Exception: pass
    for tabela, desc in [("notas_fiscais","notas fiscais"),("certidoes","certidões"),("lancamentos","lançamentos"),("documentos_cliente","documentos")]:
        try:
            from sqlalchemy import text
            r = await db.execute(text(f"SELECT COUNT(*) FROM {tabela} WHERE cliente_id = :id"), {"id": cliente_id})
            cnt = r.scalar()
            if cnt and cnt > 0: motivos.append(f"{cnt} {desc}")
        except Exception: pass

    if motivos:
        return {"bloqueado": True, "motivo": "Este cliente possui: " + ", ".join(motivos) + ". Remova os vínculos antes de excluir."}
    return {"bloqueado": False, "motivo": ""}


from fastapi import UploadFile, File, Form
from fastapi.responses import Response
from datetime import datetime
import uuid, base64 as _b64


async def _init_docs_table(db):
    """Cria tabela de documentos com conteúdo em base64 (sem filesystem)."""
    from sqlalchemy import text
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS documentos_cliente (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id    INTEGER NOT NULL,
            nome_arquivo  TEXT NOT NULL,
            nome_original TEXT,
            categoria     TEXT DEFAULT 'outros',
            descricao     TEXT,
            tamanho       INTEGER,
            mime_type     TEXT,
            conteudo      TEXT,
            criado_em     TEXT DEFAULT (datetime('now','localtime'))
        )
    """))
    # Migração: adicionar coluna conteudo se não existir (tabelas antigas com 'caminho')
    try:
        await db.execute(text("ALTER TABLE documentos_cliente ADD COLUMN conteudo TEXT"))
    except Exception:
        pass
    await db.commit()


@router.get("/{cliente_id}/docs")
async def listar_docs(cliente_id: int, db: AsyncSession = Depends(get_db)):
    await _init_docs_table(db)
    from sqlalchemy import text
    r = await db.execute(
        text("SELECT id,cliente_id,nome_arquivo,nome_original,categoria,descricao,tamanho,mime_type,criado_em FROM documentos_cliente WHERE cliente_id = :id ORDER BY criado_em DESC"),
        {"id": cliente_id}
    )
    rows = r.mappings().fetchall()
    return [dict(row, url=f"/api/v1/clientes/docs/arquivo/{row['id']}") for row in rows]


@router.post("/{cliente_id}/docs")
async def upload_doc(
    cliente_id: int,
    arquivo: UploadFile = File(...),
    categoria: str = Form("outros"),
    descricao: str = Form(""),
    db: AsyncSession = Depends(get_db)
):
    await _init_docs_table(db)
    conteudo = await arquivo.read()
    if len(conteudo) > 20 * 1024 * 1024:
        raise HTTPException(400, "Arquivo muito grande. Máximo: 20 MB")

    conteudo_b64 = _b64.b64encode(conteudo).decode("utf-8")
    nome_salvo = f"{uuid.uuid4().hex}_{arquivo.filename}"

    from sqlalchemy import text
    await db.execute(text("""
        INSERT INTO documentos_cliente
            (cliente_id, nome_arquivo, nome_original, categoria, descricao, tamanho, mime_type, conteudo)
        VALUES (:cid, :nf, :no, :cat, :desc, :tam, :mime, :cont)
    """), {
        "cid": cliente_id, "nf": nome_salvo, "no": arquivo.filename,
        "cat": categoria, "desc": descricao, "tam": len(conteudo),
        "mime": arquivo.content_type or "application/octet-stream", "cont": conteudo_b64
    })
    await db.commit()

    r = await db.execute(text("SELECT last_insert_rowid()"))
    doc_id = r.scalar()

    return {
        "id": doc_id, "cliente_id": cliente_id,
        "nome_arquivo": nome_salvo, "nome_original": arquivo.filename,
        "categoria": categoria, "descricao": descricao,
        "tamanho": len(conteudo), "mime_type": arquivo.content_type,
        "criado_em": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "url": f"/api/v1/clientes/docs/arquivo/{doc_id}"
    }


@router.get("/docs/arquivo/{doc_id}")
async def servir_arquivo(doc_id: int, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text
    r = await db.execute(text("SELECT * FROM documentos_cliente WHERE id = :id"), {"id": doc_id})
    row = r.mappings().fetchone()
    if not row:
        raise HTTPException(404, "Documento não encontrado")
    if not row.get("conteudo"):
        raise HTTPException(404, "Conteúdo não encontrado (arquivo armazenado no filesystem antigo)")
    try:
        conteudo = _b64.b64decode(row["conteudo"])
    except Exception:
        raise HTTPException(500, "Erro ao decodificar arquivo")
    nome = row["nome_original"] or row["nome_arquivo"]
    mime = row["mime_type"] or "application/octet-stream"
    return Response(
        content=conteudo,
        media_type=mime,
        headers={"Content-Disposition": f'attachment; filename="{nome}"'}
    )


@router.delete("/{cliente_id}/docs/{doc_id}")
async def excluir_doc(cliente_id: int, doc_id: int, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text
    r = await db.execute(
        text("SELECT id FROM documentos_cliente WHERE id = :id AND cliente_id = :cid"),
        {"id": doc_id, "cid": cliente_id}
    )
    if not r.fetchone():
        raise HTTPException(404, "Documento não encontrado")
    await db.execute(text("DELETE FROM documentos_cliente WHERE id = :id"), {"id": doc_id})
    await db.commit()
    return {"ok": True}


@router.post("/certificado/info")
async def ler_certificado(payload: dict):
    try:
        from cryptography.hazmat.primitives.serialization.pkcs12 import load_key_and_certificates
        from cryptography.hazmat.backends import default_backend
        from cryptography.x509.oid import NameOID
        import base64, re as _re
        dados = base64.b64decode(payload.get("cert_base64", ""))
        senha = payload.get("senha", "").encode()
        _, certificate, _ = load_key_and_certificates(dados, senha, default_backend())
        if not certificate: raise HTTPException(400, "Certificado não pôde ser lido")
        cn_attrs = certificate.subject.get_attributes_for_oid(NameOID.COMMON_NAME)
        cn_val = cn_attrs[0].value if cn_attrs else ""
        validade = certificate.not_valid_after.strftime("%d/%m/%Y")
        cnpj = ""
        raw = _re.sub(r'\D', '', cn_val)
        if len(raw) >= 14:
            r = raw[:14]
            cnpj = f"{r[:2]}.{r[2:5]}.{r[5:8]}/{r[8:12]}-{r[12:14]}"
        tipo = "e-CPF A1" if len(raw) == 11 else ("e-CNPJ A1" if len(dados) < 10000 else "e-CNPJ A3")
        return {"titular": cn_val, "cnpj": cnpj, "validade": validade, "tipo": tipo, "emitente": str(certificate.issuer.rfc4514_string())[:60]}
    except ImportError:
        raise HTTPException(500, "Execute: pip install cryptography")
    except Exception as e:
        raise HTTPException(400, f"Erro ao ler certificado: {str(e)}")
