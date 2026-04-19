"""
Router: pessoal.py
Módulo completo Pessoal/RH — Folha, Férias, Rescisão, 13º, eSocial, FGTS Digital
Tabelas 2026 atualizadas
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta
import os, json, re, math, httpx, base64
from pathlib import Path

router = APIRouter(prefix="/pessoal", tags=["pessoal-rh"])

ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GOOGLE_KEY    = os.getenv("GOOGLE_AI_KEY", "")
OUTPUT_DIR    = Path("/app/pessoal_output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def _load(key, default=None):
    f = OUTPUT_DIR / f"{key}.json"
    try: return json.loads(f.read_text()) if f.exists() else default
    except: return default

def _save(key, data):
    (OUTPUT_DIR / f"{key}.json").write_text(json.dumps(data, ensure_ascii=False, default=str))

# ── Tabelas 2026 ─────────────────────────────────────────────────────────────
SALARIO_MINIMO = 1518.00
TETO_INSS = 7786.02

TABELA_INSS_2026 = [
    (1518.00,  7.5),
    (2793.88,  9.0),
    (4190.83, 12.0),
    (7786.02, 14.0),
]

TABELA_IRRF_2026 = [
    (2259.20,   0.0,      0.0),
    (2826.65,   7.5,    169.44),
    (3751.05,  15.0,    381.44),
    (4664.68,  22.5,    662.77),
    (float('inf'), 27.5, 896.00),
]
DEDUCAO_DEPENDENTE = 189.59
LIMITE_FGTS = 0.08

def calcular_inss(salario):
    """INSS progressivo tabela 2026."""
    total = 0.0
    anterior = 0.0
    detalhes = []
    for teto, aliq in TABELA_INSS_2026:
        if salario <= 0: break
        faixa_min = anterior
        faixa_max = min(salario, teto)
        if faixa_max > faixa_min:
            parcela = round((faixa_max - faixa_min) * aliq / 100, 2)
            total += parcela
            detalhes.append({"faixa": f"R$ {faixa_min:,.2f} a R$ {faixa_max:,.2f}", "aliquota": aliq, "parcela": parcela})
        anterior = teto
        if salario <= teto: break
    total = min(total, round(TETO_INSS * 0.14, 2))
    return {"valor": round(total, 2), "detalhes": detalhes, "teto_atingido": salario >= TETO_INSS}

def calcular_irrf(base, dependentes=0, pensao_alimenticia=0):
    deducao_dep = dependentes * DEDUCAO_DEPENDENTE
    base_calc = max(0, base - deducao_dep - pensao_alimenticia)
    for limite, aliq, deducao in TABELA_IRRF_2026:
        if base_calc <= limite:
            irrf = max(0, round(base_calc * aliq / 100 - deducao, 2))
            return {"base_bruta": base, "deducao_dependentes": round(deducao_dep,2), "pensao_alimenticia": pensao_alimenticia, "base_irrf": round(base_calc,2), "aliquota": aliq, "valor": irrf}
    return {"base_irrf": base_calc, "aliquota": 27.5, "valor": 0.0}

def calcular_fgts(salario, competencia_meses=1):
    return round(salario * LIMITE_FGTS * competencia_meses, 2)

def dias_uteis_mes(ano, mes):
    from calendar import monthrange
    total = monthrange(ano, mes)[1]
    uteis = sum(1 for d in range(1, total+1) if datetime(ano,mes,d).weekday() < 5)
    return uteis

# ── Schemas ───────────────────────────────────────────────────────────────────
class FuncionarioInput(BaseModel):
    nome: str
    cpf: str
    pis: str = ""
    rg: str = ""
    data_nascimento: str = ""
    data_admissao: str
    cargo: str
    departamento: str = ""
    salario_base: float
    dependentes: int = 0
    regime: str = "CLT"  # CLT, PJ, Horista
    carga_horaria: int = 220
    adiantamento: float = 0.0
    vale_transporte: float = 0.0
    vale_refeicao: float = 0.0
    plano_saude: float = 0.0
    outros_descontos: float = 0.0
    outros_proventos: float = 0.0
    empresa_cnpj: str
    empresa_nome: str = ""
    ativo: bool = True
    observacoes: str = ""

class FolhaRequest(BaseModel):
    empresa_cnpj: str
    competencia: str  # MM/AAAA
    funcionario_ids: List[str] = []
    horas_extras_50: dict = {}  # {func_id: horas}
    horas_extras_100: dict = {}
    faltas: dict = {}  # {func_id: dias}
    afastamentos: dict = {}
    bonificacoes: dict = {}
    pensao_alimenticia: dict = {}

class FeriasRequest(BaseModel):
    funcionario_id: str
    data_inicio: str  # YYYY-MM-DD
    dias: int = 30
    abono_pecuniario: bool = False  # vender 10 dias
    adiantamento_13: bool = False

class RescisaoRequest(BaseModel):
    funcionario_id: str
    data_demissao: str  # YYYY-MM-DD
    tipo: str  # SEM_JUSTA, COM_JUSTA, PEDIDO, ACORDO, APOSENTADORIA
    aviso_previo_trabalhado: bool = True
    dias_aviso: int = 30
    saldo_fgts: float = 0.0

class DecimoTerceiroRequest(BaseModel):
    empresa_cnpj: str
    competencia_ano: int
    parcela: int  # 1 ou 2
    funcionario_ids: List[str] = []

# ── CRUD Funcionários ────────────────────────────────────────────────────────
@router.post("/funcionarios")
async def criar_funcionario(func: FuncionarioInput):
    funcionarios = _load("funcionarios", {})
    fid = f"{re.sub(r'[^0-9]','',func.cpf)}_{re.sub(r'[^0-9]','',func.empresa_cnpj)}"
    funcionarios[fid] = {"id": fid, **func.dict(), "criado_em": datetime.now().isoformat()}
    _save("funcionarios", funcionarios)
    return funcionarios[fid]

@router.get("/funcionarios")
async def listar_funcionarios(empresa_cnpj: str = ""):
    funcionarios = _load("funcionarios", {})
    lista = list(funcionarios.values())
    if empresa_cnpj:
        cnpj = re.sub(r'[^0-9]','',empresa_cnpj)
        lista = [f for f in lista if re.sub(r'[^0-9]','',f.get('empresa_cnpj','')) == cnpj]
    return lista

@router.get("/funcionarios/{fid}")
async def get_funcionario(fid: str):
    funcionarios = _load("funcionarios", {})
    if fid not in funcionarios: raise HTTPException(404, "Funcionário não encontrado")
    return funcionarios[fid]

@router.put("/funcionarios/{fid}")
async def atualizar_funcionario(fid: str, func: FuncionarioInput):
    funcionarios = _load("funcionarios", {})
    if fid not in funcionarios: raise HTTPException(404, "Funcionário não encontrado")
    funcionarios[fid] = {**funcionarios[fid], **func.dict(), "atualizado_em": datetime.now().isoformat()}
    _save("funcionarios", funcionarios)
    return funcionarios[fid]

@router.delete("/funcionarios/{fid}")
async def desligar_funcionario(fid: str):
    funcionarios = _load("funcionarios", {})
    if fid not in funcionarios: raise HTTPException(404, "Funcionário não encontrado")
    funcionarios[fid]['ativo'] = False
    funcionarios[fid]['data_desligamento'] = date.today().isoformat()
    _save("funcionarios", funcionarios)
    return {"status": "desligado"}

# ── Cálculo de Folha ────────────────────────────────────────────────────────
@router.post("/folha/calcular")
async def calcular_folha(req: FolhaRequest):
    funcionarios = _load("funcionarios", {})
    cnpj = re.sub(r'[^0-9]','',req.empresa_cnpj)
    lista = [f for f in funcionarios.values() if re.sub(r'[^0-9]','',f.get('empresa_cnpj',''))==cnpj and f.get('ativo',True)]
    if req.funcionario_ids:
        lista = [f for f in lista if f['id'] in req.funcionario_ids]
    if not lista: raise HTTPException(404, "Nenhum funcionário encontrado")

    holerites = []
    total_bruto = total_inss = total_irrf = total_fgts = total_liq = 0.0

    for func in lista:
        fid = func['id']
        salario = func['salario_base']
        dep = func.get('dependentes', 0)

        # Proventos
        he50  = req.horas_extras_50.get(fid, 0)
        he100 = req.horas_extras_100.get(fid, 0)
        faltas = req.faltas.get(fid, 0)
        bonus  = req.bonificacoes.get(fid, 0)
        pensao = req.pensao_alimenticia.get(fid, 0)

        hora_normal = round(salario / func.get('carga_horaria', 220), 4)
        valor_he50  = round(hora_normal * 1.5 * he50, 2)
        valor_he100 = round(hora_normal * 2.0 * he100, 2)
        desc_falta  = round(salario / 30 * faltas, 2)
        vt = func.get('vale_transporte', 0)
        vr = func.get('vale_refeicao', 0)
        plano = func.get('plano_saude', 0)
        outros_d = func.get('outros_descontos', 0)
        outros_p = func.get('outros_proventos', 0) + bonus
        adiant = func.get('adiantamento', 0)

        bruto = round(salario + valor_he50 + valor_he100 + outros_p, 2)
        inss_calc = calcular_inss(bruto)
        base_irrf = bruto - inss_calc['valor'] - pensao
        irrf_calc = calcular_irrf(base_irrf, dep, pensao)
        fgts_val  = calcular_fgts(bruto)

        total_desc = round(inss_calc['valor'] + irrf_calc['valor'] + desc_falta + vt*0.06 + plano + outros_d + adiant, 2)
        liquido    = round(bruto - total_desc, 2)

        holerite = {
            "funcionario_id": fid, "nome": func['nome'], "cargo": func['cargo'],
            "departamento": func.get('departamento',''),
            "competencia": req.competencia,
            "proventos": {"salario_base": salario, "horas_extras_50": valor_he50, "horas_extras_100": valor_he100, "outros": outros_p},
            "descontos": {"inss": inss_calc['valor'], "irrf": irrf_calc['valor'], "faltas": desc_falta, "vale_transporte": round(vt*0.06,2), "plano_saude": plano, "outros": outros_d, "adiantamento": adiant},
            "inss_detalhes": inss_calc, "irrf_detalhes": irrf_calc,
            "fgts": fgts_val, "bruto": bruto, "total_descontos": total_desc, "liquido": liquido,
            "pensao_alimenticia": pensao,
        }
        holerites.append(holerite)
        total_bruto += bruto; total_inss += inss_calc['valor']
        total_irrf  += irrf_calc['valor']; total_fgts += fgts_val; total_liq += liquido

    resultado = {
        "empresa_cnpj": req.empresa_cnpj, "competencia": req.competencia,
        "holerites": holerites,
        "totais": {"funcionarios": len(holerites), "bruto": round(total_bruto,2), "inss": round(total_inss,2), "irrf": round(total_irrf,2), "fgts": round(total_fgts,2), "liquido": round(total_liq,2)},
        "gerado_em": datetime.now().isoformat(),
    }
    # Salvar folha
    chave = f"folha_{cnpj}_{req.competencia.replace('/','')}"
    _save(chave, resultado)
    return resultado

@router.get("/folha/{empresa_cnpj}/{competencia}")
async def get_folha(empresa_cnpj: str, competencia: str):
    cnpj = re.sub(r'[^0-9]','',empresa_cnpj)
    chave = f"folha_{cnpj}_{competencia.replace('/','')}"
    data = _load(chave)
    if not data: raise HTTPException(404, "Folha não encontrada")
    return data

# ── Férias ────────────────────────────────────────────────────────────────────
@router.post("/ferias/calcular")
async def calcular_ferias(req: FeriasRequest):
    funcionarios = _load("funcionarios", {})
    if req.funcionario_id not in funcionarios: raise HTTPException(404, "Funcionário não encontrado")
    func = funcionarios[req.funcionario_id]
    salario = func['salario_base']
    dias_ferias = req.dias - (10 if req.abono_pecuniario else 0)
    dias_abono  = 10 if req.abono_pecuniario else 0

    valor_ferias   = round(salario / 30 * dias_ferias, 2)
    valor_um_terco = round(valor_ferias / 3, 2)
    valor_abono    = round(salario / 30 * dias_abono, 2) if req.abono_pecuniario else 0
    bruto_ferias   = valor_ferias + valor_um_terco + valor_abono

    inss_f  = calcular_inss(valor_ferias + valor_um_terco)
    base_ir = bruto_ferias - inss_f['valor']
    irrf_f  = calcular_irrf(base_ir, func.get('dependentes',0))
    fgts_f  = calcular_fgts(valor_ferias + valor_um_terco)
    liq_f   = round(bruto_ferias - inss_f['valor'] - irrf_f['valor'], 2)

    # Data de retorno
    from datetime import datetime as dt
    inicio = dt.strptime(req.data_inicio, '%Y-%m-%d')
    retorno = (inicio + timedelta(days=req.dias + (30 if not req.abono_pecuniario else 0))).date()

    resultado = {
        "funcionario_id": req.funcionario_id, "nome": func['nome'],
        "data_inicio": req.data_inicio, "dias_ferias": dias_ferias, "dias_abono": dias_abono,
        "data_retorno": retorno.isoformat(),
        "valores": {"ferias": valor_ferias, "um_terco": valor_um_terco, "abono_pecuniario": valor_abono, "bruto": round(bruto_ferias,2)},
        "descontos": {"inss": inss_f['valor'], "irrf": irrf_f['valor']},
        "fgts": fgts_f, "liquido": liq_f,
        "adiantamento_13": req.adiantamento_13,
        "calculado_em": datetime.now().isoformat(),
    }
    if req.adiantamento_13:
        dec_parcial = round(salario / 12, 2)
        resultado['adiantamento_13_valor'] = dec_parcial
        resultado['liquido'] = round(liq_f + dec_parcial, 2)
    return resultado

@router.get("/ferias/previsao/{funcionario_id}")
async def previsao_ferias(funcionario_id: str):
    funcionarios = _load("funcionarios", {})
    if funcionario_id not in funcionarios: raise HTTPException(404, "Funcionário não encontrado")
    func = funcionarios[funcionario_id]
    admissao = datetime.strptime(func['data_admissao'], '%Y-%m-%d').date()
    hoje = date.today()
    meses_trabalhados = (hoje.year - admissao.year)*12 + (hoje.month - admissao.month)
    periodo_atual_inicio = admissao
    while (periodo_atual_inicio + timedelta(days=365)) <= hoje:
        periodo_atual_inicio = date(periodo_atual_inicio.year+1, periodo_atual_inicio.month, periodo_atual_inicio.day)
    meses_no_periodo = min(12, max(0, (hoje - periodo_atual_inicio).days // 30))
    dias_direito = round(30 * meses_no_periodo / 12)
    vencimento = periodo_atual_inicio + timedelta(days=365+365)
    provisao_mensal = round(func['salario_base'] / 12 + func['salario_base'] / 12 / 3, 2)
    return {
        "funcionario_id": funcionario_id, "nome": func['nome'],
        "data_admissao": func['data_admissao'], "meses_trabalhados": meses_trabalhados,
        "periodo_atual": {"inicio": periodo_atual_inicio.isoformat(), "meses_completos": meses_no_periodo, "dias_direito": dias_direito},
        "vencimento_ferias": vencimento.isoformat(), "pode_tirar": meses_no_periodo >= 6,
        "provisao_mensal": provisao_mensal,
        "valor_estimado": round(func['salario_base'] + func['salario_base']/3, 2),
    }

# ── Rescisão ─────────────────────────────────────────────────────────────────
@router.post("/rescisao/calcular")
async def calcular_rescisao(req: RescisaoRequest):
    funcionarios = _load("funcionarios", {})
    if req.funcionario_id not in funcionarios: raise HTTPException(404, "Funcionário não encontrado")
    func = funcionarios[req.funcionario_id]
    salario = func['salario_base']
    admissao = datetime.strptime(func['data_admissao'], '%Y-%m-%d').date()
    demissao = datetime.strptime(req.data_demissao, '%Y-%m-%d').date()
    meses_trabalhados = (demissao.year - admissao.year)*12 + (demissao.month - admissao.month)
    anos = meses_trabalhados // 12
    meses_restantes = meses_trabalhados % 12
    dias_no_mes = (demissao - date(demissao.year, demissao.month, 1)).days + 1
    dep = func.get('dependentes', 0)

    # Saldo de salário
    saldo_sal = round(salario / 30 * dias_no_mes, 2)
    # Aviso prévio
    aviso = 30 + min(anos * 3, 60)  # 30 + 3 dias por ano, máx 90
    aviso_val = round(salario / 30 * aviso, 2) if not req.aviso_previo_trabalhado else 0
    aviso_trab_val = round(salario, 2) if req.aviso_previo_trabalhado else 0
    # 13° proporcional
    meses_13 = meses_restantes + (1 if dias_no_mes >= 15 else 0)
    dec_prop = round(salario / 12 * meses_13, 2)
    # Férias proporcionais
    periodo_inicio = admissao
    while (periodo_inicio + timedelta(days=365)) <= demissao:
        periodo_inicio = date(periodo_inicio.year+1, periodo_inicio.month, periodo_inicio.day)
    meses_ferias = min(11, (demissao - periodo_inicio).days // 30)
    ferias_prop = round(salario / 12 * meses_ferias, 2)
    um_terco_ferias = round(ferias_prop / 3, 2)
    # FGTS multa
    multa_fgts = round(req.saldo_fgts * 0.4, 2) if req.tipo in ('SEM_JUSTA','ACORDO') else 0
    multa_fgts_gov = round(req.saldo_fgts * 0.1, 2) if req.tipo in ('SEM_JUSTA','ACORDO') else 0
    if req.tipo == 'ACORDO': multa_fgts = round(multa_fgts * 0.5, 2)

    bruto_rescisao = saldo_sal + aviso_val + aviso_trab_val + dec_prop + ferias_prop + um_terco_ferias
    inss_r = calcular_inss(saldo_sal + aviso_trab_val + dec_prop)
    irrf_r = calcular_irrf(bruto_rescisao - inss_r['valor'], dep)
    fgts_r = calcular_fgts(saldo_sal + aviso_val + aviso_trab_val)
    liq_rescisao = round(bruto_rescisao - inss_r['valor'] - irrf_r['valor'], 2)

    return {
        "funcionario_id": req.funcionario_id, "nome": func['nome'], "cargo": func['cargo'],
        "tipo_rescisao": req.tipo, "data_admissao": func['data_admissao'],
        "data_demissao": req.data_demissao, "meses_trabalhados": meses_trabalhados,
        "aviso_previo_dias": aviso,
        "verbas": {"saldo_salario": saldo_sal, "aviso_previo_indenizado": aviso_val, "aviso_previo_trabalhado": aviso_trab_val, "decimo_terceiro_prop": dec_prop, "ferias_proporcionais": ferias_prop, "um_terco_ferias": um_terco_ferias},
        "fgts": {"deposito_rescisao": fgts_r, "multa_40pct": multa_fgts, "contribuicao_social_10pct": multa_fgts_gov, "saldo_informado": req.saldo_fgts},
        "descontos": {"inss": inss_r['valor'], "irrf": irrf_r['valor']},
        "bruto": round(bruto_rescisao,2), "liquido": liq_rescisao,
        "calculado_em": datetime.now().isoformat(),
    }

# ── 13° Salário ───────────────────────────────────────────────────────────────
@router.post("/decimo-terceiro/calcular")
async def calcular_decimo_terceiro(req: DecimoTerceiroRequest):
    funcionarios = _load("funcionarios", {})
    cnpj = re.sub(r'[^0-9]','',req.empresa_cnpj)
    lista = [f for f in funcionarios.values() if re.sub(r'[^0-9]','',f.get('empresa_cnpj',''))==cnpj and f.get('ativo',True)]
    if req.funcionario_ids: lista = [f for f in lista if f['id'] in req.funcionario_ids]
    resultados = []
    for func in lista:
        salario = func['salario_base']
        admissao = datetime.strptime(func['data_admissao'], '%Y-%m-%d').date()
        avos = min(12, max(1, 12 - admissao.month + 1 if admissao.year == req.competencia_ano else 12))
        valor_bruto = round(salario / 12 * avos, 2)
        if req.parcela == 1:
            liq = round(valor_bruto / 2, 2)
            inss_v = irrf_v = 0.0
        else:
            inss_d = calcular_inss(valor_bruto)
            irrf_d = calcular_irrf(valor_bruto - inss_d['valor'], func.get('dependentes',0))
            inss_v = inss_d['valor']; irrf_v = irrf_d['valor']
            liq = round(valor_bruto/2 - inss_v - irrf_v, 2)
        resultados.append({"funcionario_id":func['id'],"nome":func['nome'],"avos":avos,"valor_bruto":valor_bruto,"inss":inss_v,"irrf":irrf_v,"liquido":liq,"parcela":req.parcela})
    return {"empresa_cnpj":req.empresa_cnpj,"ano":req.competencia_ano,"parcela":req.parcela,"funcionarios":resultados,"total_bruto":round(sum(r['valor_bruto'] for r in resultados),2),"total_liquido":round(sum(r['liquido'] for r in resultados),2)}

@router.get("/provisoes/{empresa_cnpj}")
async def get_provisoes(empresa_cnpj: str):
    funcionarios = _load("funcionarios", {})
    cnpj = re.sub(r'[^0-9]','',empresa_cnpj)
    lista = [f for f in funcionarios.values() if re.sub(r'[^0-9]','',f.get('empresa_cnpj',''))==cnpj and f.get('ativo',True)]
    prov_13 = prov_ferias = prov_fgts = prov_inss_pat = 0.0
    for func in lista:
        s = func['salario_base']
        prov_13 += round(s/12, 2)
        prov_ferias += round(s/12 + s/12/3, 2)
        prov_fgts += round(s*0.08, 2)
        prov_inss_pat += round(s*0.20, 2)
    return {"empresa_cnpj":empresa_cnpj,"funcionarios_ativos":len(lista),"provisoes_mensais":{"decimo_terceiro":round(prov_13,2),"ferias":round(prov_ferias,2),"fgts":round(prov_fgts,2),"inss_patronal":round(prov_inss_pat,2),"total":round(prov_13+prov_ferias+prov_fgts+prov_inss_pat,2)},"calculado_em":datetime.now().isoformat()}

# ── eSocial ───────────────────────────────────────────────────────────────────
@router.post("/esocial/gerar-s2200/{funcionario_id}")
async def gerar_s2200(funcionario_id: str):
    funcionarios = _load("funcionarios", {})
    if funcionario_id not in funcionarios: raise HTTPException(404, "Funcionário não encontrado")
    func = funcionarios[funcionario_id]
    cnpj = re.sub(r'[^0-9]','',func['empresa_cnpj'])
    cpf  = re.sub(r'[^0-9]','',func['cpf'])
    ts = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtAdmissao/v03_00_00">
  <evtAdmissao Id="ID1{cnpj}{ts.replace('-','').replace(':','').replace('T','')}0001">
    <ideEvento><indRetif>1</indRetif><tpAmb>1</tpAmb><procEmi>1</procEmi><verProc>EPimentel-1.0</verProc></ideEvento>
    <ideEmpregador><tpInsc>1</tpInsc><nrInsc>{cnpj}</nrInsc></ideEmpregador>
    <trabalhador><cpfTrab>{cpf}</cpfTrab><nmTrab>{func['nome']}</nmTrab><dataNascto>{func.get('data_nascimento','')}</dataNascto></trabalhador>
    <vinculo>
      <dtAdm>{func['data_admissao']}</dtAdm>
      <infoRegimeTrab><infoCLT><dtAdm>{func['data_admissao']}</dtAdm><tpRegJor>1</tpRegJor><natAtividade>1</natAtividade><dtBase>01</dtBase></infoCLT></infoRegimeTrab>
      <infoContrato><cargo>{func['cargo']}</cargo><codCateg>101</codCateg><remuneracao><vrSalFx>{func['salario_base']:.2f}</vrSalFx><undSalFixo>5</undSalFixo></remuneracao></infoContrato>
    </vinculo>
  </evtAdmissao>
</eSocial>'''
    xml_path = OUTPUT_DIR / f"S2200_{funcionario_id}.xml"
    xml_path.write_text(xml)
    return {"funcionario_id":funcionario_id,"evento":"S-2200","xml":xml,"arquivo":str(xml_path)}

@router.post("/esocial/gerar-s2299/{funcionario_id}")
async def gerar_s2299(funcionario_id: str, data_demissao: str, tipo: str = "SEM_JUSTA"):
    funcionarios = _load("funcionarios", {})
    if funcionario_id not in funcionarios: raise HTTPException(404, "Funcionário não encontrado")
    func = funcionarios[funcionario_id]
    cnpj = re.sub(r'[^0-9]','',func['empresa_cnpj'])
    cpf  = re.sub(r'[^0-9]','',func['cpf'])
    ts = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    cod_motivo = {"SEM_JUSTA":"01","COM_JUSTA":"03","PEDIDO":"11","ACORDO":"43","APOSENTADORIA":"21"}.get(tipo,"01")
    xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtDesligamento/v03_00_00">
  <evtDesligamento Id="ID1{cnpj}{ts.replace('-','').replace(':','').replace('T','')}0001">
    <ideEvento><indRetif>1</indRetif><tpAmb>1</tpAmb><procEmi>1</procEmi><verProc>EPimentel-1.0</verProc></ideEvento>
    <ideEmpregador><tpInsc>1</tpInsc><nrInsc>{cnpj}</nrInsc></ideEmpregador>
    <ideTrabalhador><cpfTrab>{cpf}</cpfTrab></ideTrabalhador>
    <infoDeslig><dtDeslig>{data_demissao}</dtDeslig><mtvDeslig>{cod_motivo}</mtvDeslig></infoDeslig>
  </evtDesligamento>
</eSocial>'''
    return {"funcionario_id":funcionario_id,"evento":"S-2299","xml":xml,"data_demissao":data_demissao,"motivo":tipo}

@router.get("/fgts/calcular/{empresa_cnpj}/{competencia}")
async def calcular_fgts_empresa(empresa_cnpj: str, competencia: str):
    funcionarios = _load("funcionarios", {})
    cnpj = re.sub(r'[^0-9]','',empresa_cnpj)
    lista = [f for f in funcionarios.values() if re.sub(r'[^0-9]','',f.get('empresa_cnpj',''))==cnpj and f.get('ativo',True)]
    total = sum(calcular_fgts(f['salario_base']) for f in lista)
    return {"empresa_cnpj":empresa_cnpj,"competencia":competencia,"funcionarios":len(lista),"total_fgts":round(total,2),"detalhes":[{"nome":f['nome'],"salario":f['salario_base'],"fgts":calcular_fgts(f['salario_base'])} for f in lista]}

@router.post("/seguro-desemprego/{funcionario_id}")
async def calcular_seguro_desemprego(funcionario_id: str):
    funcionarios = _load("funcionarios", {})
    if funcionario_id not in funcionarios: raise HTTPException(404, "Funcionário não encontrado")
    func = funcionarios[funcionario_id]
    salario = func['salario_base']
    if salario <= 2259.20: parcela = round(salario * 0.80, 2)
    elif salario <= 3769.74: parcela = round(1807.36 + (salario - 2259.20) * 0.50, 2)
    else: parcela = 2564.93
    return {"funcionario_id":funcionario_id,"nome":func['nome'],"salario_base":salario,"valor_parcela":parcela,"parcelas":5,"valor_total":round(parcela*5,2),"observacao":"5 parcelas para demissão sem justa causa com mais de 24 meses"}

@router.post("/ia/sugestao")
async def ia_sugestao_rh(empresa_cnpj: str, tipo: str = "folha"):
    if not GOOGLE_KEY and not ANTHROPIC_KEY: return {"sugestao":None,"motivo":"IA não configurada"}
    funcionarios = _load("funcionarios", {})
    cnpj = re.sub(r'[^0-9]','',empresa_cnpj)
    lista = [f for f in funcionarios.values() if re.sub(r'[^0-9]','',f.get('empresa_cnpj',''))==cnpj]
    prompt = f"""Analise dados de RH e sugira melhorias. Tipo: {tipo}. Empresa: {empresa_cnpj}. Funcionários: {len(lista)}. Responda JSON: {{"sugestoes":["texto1","texto2"],"alertas":["alerta1"],"economia_estimada":0.0}}"""
    try:
        if GOOGLE_KEY:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GOOGLE_KEY}"
            async with httpx.AsyncClient(timeout=20) as c:
                r = await c.post(url, json={"contents":[{"parts":[{"text":prompt}]}],"generationConfig":{"temperature":0.1,"maxOutputTokens":400}})
            if r.status_code==200:
                text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
                m = re.search(r'\{[\s\S]*\}', text)
                if m: return json.loads(m.group())
    except: pass
    return {"sugestao":None,"motivo":"IA indisponível"}

@router.get("/dashboard/{empresa_cnpj}")
async def dashboard_rh(empresa_cnpj: str):
    funcionarios = _load("funcionarios", {})
    cnpj = re.sub(r'[^0-9]','',empresa_cnpj)
    lista = [f for f in funcionarios.values() if re.sub(r'[^0-9]','',f.get('empresa_cnpj',''))==cnpj]
    ativos = [f for f in lista if f.get('ativo',True)]
    total_folha = sum(f['salario_base'] for f in ativos)
    por_dept = {}
    for f in ativos:
        d = f.get('departamento','Geral')
        por_dept[d] = por_dept.get(d, 0) + 1
    ferias_vencendo = []
    hoje = date.today()
    for f in ativos:
        try:
            adm = datetime.strptime(f['data_admissao'],'%Y-%m-%d').date()
            anos = (hoje - adm).days // 365
            if anos >= 1:
                ult_ferias = date(adm.year + anos, adm.month, adm.day)
                vence = ult_ferias + timedelta(days=365)
                if (vence - hoje).days <= 90:
                    ferias_vencendo.append({"nome":f['nome'],"vencimento":vence.isoformat(),"dias_restantes":(vence-hoje).days})
        except: pass
    return {"empresa_cnpj":empresa_cnpj,"totais":{"funcionarios_ativos":len(ativos),"total_ativos":len(ativos),"total_inativos":len(lista)-len(ativos),"massa_salarial":round(total_folha,2),"custo_total_estimado":round(total_folha*1.30,2)},"por_departamento":por_dept,"ferias_vencendo":ferias_vencendo[:5],"calculado_em":datetime.now().isoformat()}
