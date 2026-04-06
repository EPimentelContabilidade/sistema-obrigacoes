from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json, os, base64, re

router = APIRouter(prefix="/certificados", tags=["Certificados Digitais"])
DB_FILE = "certificados.json"

def ler_db():
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE) as f: return json.load(f)
        except: pass
    return []

def salvar_db(db):
    with open(DB_FILE, "w") as f: json.dump(db, f, ensure_ascii=False, default=str)


class LerCertificadoRequest(BaseModel):
    base64: str
    senha: str
    nome_arquivo: str = ""


class CertificadoCreate(BaseModel):
    cnpj: str
    nome_titular: str
    tipo: str = "A1"
    validade: str
    cliente_id: Optional[str] = None
    dias_alerta: int = 30
    observacoes: Optional[str] = None
    base64_arquivo: Optional[str] = None
    nome_arquivo: Optional[str] = None
    senha: Optional[str] = None


@router.get("/")
async def listar():
    return ler_db()


@router.post("/ler")
async def ler_certificado(data: LerCertificadoRequest):
    """Lê um certificado .pfx e extrai CNPJ, titular e validade."""
    try:
        cert_bytes = base64.b64decode(data.base64)
        senha_bytes = data.senha.encode()
        
        # Tentar com cryptography
        try:
            from cryptography.hazmat.primitives.serialization import pkcs12
            from cryptography.x509.oid import NameOID
            from cryptography import x509

            private_key, cert, _ = pkcs12.load_key_and_certificates(cert_bytes, senha_bytes)
            
            if cert is None:
                raise HTTPException(status_code=400, detail="Não foi possível extrair o certificado. Verifique a senha.")

            # Extrair dados
            subject = cert.subject
            
            # Nome do titular
            try: nome = subject.get_attributes_for_oid(NameOID.COMMON_NAME)[0].value
            except: nome = subject.get_attributes_for_oid(NameOID.ORGANIZATION_NAME)[0].value if subject.get_attributes_for_oid(NameOID.ORGANIZATION_NAME) else "Desconhecido"
            
            # CNPJ — geralmente no campo serialNumber ou no CN
            cnpj = ""
            try:
                serial = subject.get_attributes_for_oid(NameOID.SERIAL_NUMBER)[0].value
                # Extrair CNPJ do serial (formato: CNPJ:00.000.000/0001-00 ou só os 14 dígitos)
                numeros = re.sub(r"\D", "", serial)
                if len(numeros) >= 14:
                    cnpj = numeros[:14]
                    cnpj = f"{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:14]}"
            except: pass

            # Tentar extrair CNPJ do CN se não encontrou
            if not cnpj and nome:
                numeros = re.sub(r"\D", "", nome)
                if len(numeros) >= 14:
                    n = numeros[:14]
                    cnpj = f"{n[:2]}.{n[2:5]}.{n[5:8]}/{n[8:12]}-{n[12:14]}"

            # Validade
            validade = cert.not_valid_after_utc.strftime("%Y-%m-%d") if hasattr(cert, 'not_valid_after_utc') else cert.not_valid_after.strftime("%Y-%m-%d")

            # Tipo (A1 = sem smart card, A3 = com)
            tipo = "A3" if "A3" in nome.upper() else "A1"

            return {
                "nome_titular": nome.split(":")[0].strip() if ":" in nome else nome,
                "cnpj": cnpj,
                "validade": validade,
                "tipo": tipo,
                "emitido_para": nome,
            }

        except ImportError:
            pass  # cryptography não instalado

        # Fallback: tentar OpenSSL
        try:
            import subprocess, tempfile
            with tempfile.NamedTemporaryFile(suffix=".pfx", delete=False) as f:
                f.write(cert_bytes)
                tmp = f.name
            result = subprocess.run(
                ["openssl", "pkcs12", "-in", tmp, "-nokeys", "-passin", f"pass:{data.senha}", "-legacy"],
                capture_output=True, text=True
            )
            os.unlink(tmp)
            txt = result.stdout + result.stderr
            
            # Extrair CN
            cn_match = re.search(r"subject=.*?CN\s*=\s*([^\n,/]+)", txt)
            nome = cn_match.group(1).strip() if cn_match else "Desconhecido"
            
            # Extrair CNPJ
            cnpj_match = re.search(r"(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})", txt)
            cnpj = cnpj_match.group(1) if cnpj_match else ""
            if not cnpj:
                numeros = re.sub(r"\D", "", nome)
                if len(numeros) >= 14:
                    n = numeros[:14]
                    cnpj = f"{n[:2]}.{n[2:5]}.{n[5:8]}/{n[8:12]}-{n[12:14]}"
            
            # Extrair validade
            val_match = re.search(r"notAfter=(.+)", txt)
            validade = ""
            if val_match:
                try:
                    validade = datetime.strptime(val_match.group(1).strip(), "%b %d %H:%M:%S %Y %Z").strftime("%Y-%m-%d")
                except: pass

            return {"nome_titular": nome, "cnpj": cnpj, "validade": validade, "tipo": "A1"}
        except Exception:
            pass

        # Se nenhum método funcionou
        raise HTTPException(status_code=400, detail="Instale a biblioteca 'cryptography': pip install cryptography")

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "password" in error_msg.lower() or "mac" in error_msg.lower() or "password" in error_msg.lower():
            raise HTTPException(status_code=400, detail="Senha incorreta. Verifique a senha do certificado.")
        raise HTTPException(status_code=400, detail=f"Erro ao ler certificado: {error_msg}")


@router.post("/")
async def criar(data: CertificadoCreate):
    db = ler_db()
    item = {k: v for k, v in data.model_dump().items() if k not in ('senha', 'base64_arquivo')}
    item["id"] = int(datetime.now().timestamp() * 1000)
    item["criado_em"] = datetime.now().isoformat()
    db.append(item)
    salvar_db(db)
    return item


@router.put("/{id}")
async def editar(id: int, data: CertificadoCreate):
    db = ler_db()
    for i, c in enumerate(db):
        if c.get("id") == id:
            atualizado = {k: v for k, v in data.model_dump().items() if k not in ('senha', 'base64_arquivo')}
            atualizado["id"] = id
            atualizado["criado_em"] = c.get("criado_em", "")
            atualizado["atualizado_em"] = datetime.now().isoformat()
            db[i] = atualizado
            salvar_db(db)
            return atualizado
    raise HTTPException(status_code=404, detail="Certificado não encontrado")


@router.delete("/{id}")
async def excluir(id: int):
    db = [c for c in ler_db() if c.get("id") != id]
    salvar_db(db)
    return {"ok": True}


@router.post("/{id}/enviar-alerta")
async def enviar_alerta(id: int):
    db = ler_db()
    cert = next((c for c in db if c.get("id") == id), None)
    if not cert: raise HTTPException(404, "Não encontrado")
    validade = datetime.strptime(cert["validade"], "%Y-%m-%d")
    dias = (validade - datetime.now()).days
    cert["ultimo_alerta"] = datetime.now().isoformat()
    salvar_db(db)
    return {"mensagem": f"Alerta de vencimento em {dias} dias registrado. Configure WhatsApp/e-mail para envio real."}


@router.get("/verificar-vencimentos")
async def verificar_vencimentos():
    db = ler_db()
    alertas = []
    for c in db:
        try:
            dias = (datetime.strptime(c["validade"], "%Y-%m-%d") - datetime.now()).days
            if 0 <= dias <= c.get("dias_alerta", 30):
                alertas.append({"id": c["id"], "cnpj": c["cnpj"], "dias": dias})
        except: pass
    return {"total": len(alertas), "alertas": alertas}
