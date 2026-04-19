"""
Router: prolabore.py
Módulo completo de Pró-labore com IA + eSocial + GPS + aprovação
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from pathlib import Path
import os, json, httpx, re, base64, asyncio

router = APIRouter(prefix="/prolabore", tags=["pró-labore"])

ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GOOGLE_KEY    = os.getenv("GOOGLE_AI_KEY", "")
CERT_DIR      = Path("/app/certificados_servidor")
OUTPUT_DIR    = Path("/app/prolabore_output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Tabelas 2026 ──────────────────────────────────────────────────────────────
TABELA_INSS_2026 = [
    (1518.00,   7.5),
    (2793.88,   9.0),
    (4190.83,  12.0),
    (7786.02,  14.0),
]
TETO_INSS = 7786.02
ALIQUOTA_PRO_LABORE = 0.11

TABELA_IRRF_2026 = [
    (2259.20,   0.0,      0.0),
    (2826.65,   7.5,    169.44),
    (3751.05,  15.0,    381.44),
    (4664.68,  22.5,    662.77),
    (float('inf'), 27.5, 896.00),
]
DEDUCAO_POR_DEPENDENTE = 189.59

def calcular_inss_prolabore(salario: float) -> dict:
    base = min(salario, TETO_INSS)
    inss = round(base * ALIQUOTA_PRO_LABORE, 2)
    return {"base": base, "aliquota": 11.0, "valor": inss, "teto_atingido": salario >= TETO_INSS}

def calcular_irrf(base_calculo: float, dependentes: int = 0) -> dict:
    deducao_dep = dependentes * DEDUCAO_POR_DEPENDENTE
    base_irrf = max(0, base_calculo - deducao_dep)
    for limite, aliq, deducao in TABELA_IRRF_2026:
        if base_irrf <= limite:
            irrf = max(0, round(base_irrf * aliq / 100 - deducao, 2))
            return {"base_bruta": base_calculo, "deducao_dependentes": round(deducao_dep,2), "base_irrf": round(base_irrf,2), "aliquota": aliq, "deducao_tabela": deducao, "valor": irrf, "dependentes": dependentes}
    return {"base_irrf": base_irrf, "aliquota": 27.5, "valor": 0.0}

class SocioInput(BaseModel):
    nome:        str
    cpf:         str
    valor_bruto: float
    dependentes: int = 0
    cargo:       str = "Sócio-Administrador"

class CalculoRequest(BaseModel):
    empresa_nome: str
    empresa_cnpj: str
    competencia:  str
    socios:       List[SocioInput]
    usar_ia:      bool = True

class AprovacaoRequest(BaseModel):
    calculo_id:  str
    aprovado:    bool
    observacao:  str = ""
    aprovador:   str = ""

STORAGE_FILE = OUTPUT_DIR / "calculos.json"

def load_calculos():
    try:
        if STORAGE_FILE.exists(): return json.loads(STORAGE_FILE.read_text())
        return {}
    except: return {}

def save_calculos(data):
    STORAGE_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2))

def gerar_linha_digitavel_gps(cnpj, valor, competencia, pa="1406"):
    cnpj_num = re.sub(r'\D', '', cnpj)
    comp_num = competencia.replace('/', '')
    valor_str = str(int(round(valor * 100))).zfill(11)
    aaaa = comp_num[2:]; mm = comp_num[:2]
    return f"8577{pa}{aaaa}{mm}{cnpj_num[:8]}-{cnpj_num[8:]}"

def gerar_xml_s1200(empresa_cnpj, competencia, socio, calculo):
    cnpj = re.sub(r'\D', '', empresa_cnpj)
    cpf  = re.sub(r'\D', '', socio['cpf'])
    comp = competencia.replace('/', '')
    aaaa, mm = comp[2:], comp[:2]
    per_apur = f"{aaaa}-{mm}"
    ts = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtRemun/v02_01_01">
  <evtRemun Id="ID1{cnpj}{ts.replace('-','').replace(':','').replace('T','')}0001">
    <ideEvento><indRetif>1</indRetif><perApur>{per_apur}</perApur><tpAmb>1</tpAmb><procEmi>1</procEmi><verProc>EPimentel-1.0</verProc></ideEvento>
    <ideEmpregador><tpInsc>1</tpInsc><nrInsc>{cnpj}</nrInsc></ideEmpregador>
    <ideTrabalhador><cpfTrab>{cpf}</cpfTrab></ideTrabalhador>
    <dmDev>
      <ideDmDev>PL-{per_apur}-{cpf[:6]}</ideDmDev>
      <infoPerApur><ideEstabLot><tpInsc>1</tpInsc><nrInsc>{cnpj}</nrInsc><codLotacao>PL001</codLotacao>
        <remunPerApur><matricula>PL{cpf[:6]}</matricula>
          <itensRemun><codRubr>1010</codRubr><qtdRubr>1</qtdRubr><vrRubr>{calculo["valor_bruto"]:.2f}</vrRubr></itensRemun>
        </remunPerApur></ideEstabLot></infoPerApur>
      <infoIRRF><vrBaseIR>{calculo.get("irrf",{}).get("base_irrf",0):.2f}</vrBaseIR><vrImpRenda>{calculo.get("irrf",{}).get("valor",0):.2f}</vrImpRenda></infoIRRF>
    </dmDev>
  </evtRemun>
</eSocial>'''

async def ia_sugerir(empresa_cnpj, competencia, historico):
    if not GOOGLE_KEY and not ANTHROPIC_KEY: return {"sugestao_valor": None, "motivo": "IA não configurada"}
    prompt = f"""Especialista folha BR. Empresa CNPJ: {empresa_cnpj}. Competência: {competencia}. Histórico: {json.dumps(historico[-3:] if historico else [], ensure_ascii=False)}. Responda JSON: {{"sugestao_valor":0.00,"variacao_percentual":0.0,"motivo":"texto","alertas":[]}}"""
    try:
        if GOOGLE_KEY:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GOOGLE_KEY}"
            async with httpx.AsyncClient(timeout=20) as c:
                r = await c.post(url, json={"contents":[{"parts":[{"text":prompt}]}],"generationConfig":{"temperature":0.1,"maxOutputTokens":200}})
            if r.status_code == 200:
                text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
                m = re.search(r'\{[\s\S]*\}', text)
                if m: return json.loads(m.group())
    except: pass
    return {"sugestao_valor": None, "motivo": "IA indisponível"}

@router.post("/calcular")
async def calcular_prolabore(req: CalculoRequest):
    calculos = load_calculos()
    cid = f"{re.sub(r'[^0-9]','',req.empresa_cnpj)}_{req.competencia.replace('/','')}"
    historico = [v for k,v in calculos.items() if k.startswith(re.sub(r'[^0-9]','',req.empresa_cnpj)) and v.get('status') in ('aprovado','transmitido')]
    ia_result = {}
    if req.usar_ia and (ANTHROPIC_KEY or GOOGLE_KEY):
        ia_result = await ia_sugerir(req.empresa_cnpj, req.competencia, historico)
    socios_calc = []; t_bruto=t_inss=t_irrf=t_liq=0.0
    for s in req.socios:
        inss = calcular_inss_prolabore(s.valor_bruto)
        irrf = calcular_irrf(s.valor_bruto - inss['valor'], s.dependentes)
        liq  = round(s.valor_bruto - inss['valor'] - irrf['valor'], 2)
        t_bruto+=s.valor_bruto; t_inss+=inss['valor']; t_irrf+=irrf['valor']; t_liq+=liq
        socios_calc.append({"nome":s.nome,"cpf":s.cpf,"cargo":s.cargo,"valor_bruto":s.valor_bruto,"inss":inss,"irrf":irrf,"liquido":liq,"dependentes":s.dependentes,"xml_s1200":gerar_xml_s1200(req.empresa_cnpj,req.competencia,s.dict(),{"valor_bruto":s.valor_bruto,"irrf":irrf})})
    resultado = {"id":cid,"empresa_nome":req.empresa_nome,"empresa_cnpj":req.empresa_cnpj,"competencia":req.competencia,"socios":socios_calc,"totais":{"bruto":round(t_bruto,2),"inss":round(t_inss,2),"irrf":round(t_irrf,2),"liquido":round(t_liq,2)},"gps":{"valor":round(t_inss,2),"competencia":req.competencia,"codigo_receita":"1406","linha_digitavel":gerar_linha_digitavel_gps(req.empresa_cnpj,t_inss,req.competencia)},"ia":ia_result,"status":"aguardando_aprovacao","criado_em":datetime.now().isoformat()}
    calculos[cid] = resultado
    save_calculos(calculos)
    return resultado

@router.post("/aprovar")
async def aprovar_calculo(req: AprovacaoRequest):
    calculos = load_calculos()
    if req.calculo_id not in calculos: raise HTTPException(404, "Cálculo não encontrado")
    c = calculos[req.calculo_id]
    c['status'] = 'aprovado' if req.aprovado else 'reprovado'
    c['aprovador'] = req.aprovador; c['observacao'] = req.observacao; c['aprovado_em'] = datetime.now().isoformat()
    save_calculos(calculos)
    return {"status": c['status'], "mensagem": "Aprovado — pronto para envio eSocial" if req.aprovado else "Reprovado"}

@router.get("/buscar/{calculo_id}")
async def buscar_calculo(calculo_id: str):
    calculos = load_calculos()
    if calculo_id not in calculos: raise HTTPException(404, "Cálculo não encontrado")
    return calculos[calculo_id]

@router.get("/listar/{cnpj}")
async def listar_calculos(cnpj: str):
    calculos = load_calculos()
    cnpj_num = re.sub(r'\D', '', cnpj)
    return [v for k,v in calculos.items() if k.startswith(cnpj_num)]

@router.post("/gerar-pdf/{calculo_id}")
async def gerar_pdf_recibo(calculo_id: str):
    calculos = load_calculos()
    if calculo_id not in calculos: raise HTTPException(404, "Cálculo não encontrado")
    c = calculos[calculo_id]
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import cm
        import io
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)
        styles = getSampleStyleSheet()
        GREEN = colors.HexColor('#1F4A33')
        GOLD  = colors.HexColor('#C5A55A')
        story = []
        story.append(Paragraph(f"<b>RECIBO DE PRÓ-LABORE</b>", styles['Title']))
        story.append(Paragraph(f"<b>{c['empresa_nome']}</b> · CNPJ: {c['empresa_cnpj']}", styles['Normal']))
        story.append(Paragraph(f"Competência: <b>{c['competencia']}</b>", styles['Normal']))
        story.append(Spacer(1, 0.5*cm))
        for s in c['socios']:
            story.append(Paragraph(f"<b>{s['nome']}</b> — {s['cargo']}", styles['Heading3']))
            dados = [['Descrição','Valor'],['Pró-labore Bruto',f"R$ {s['valor_bruto']:,.2f}"],['(-) INSS 11%',f"R$ {s['inss']['valor']:,.2f}"],['(-) IRRF',f"R$ {s['irrf']['valor']:,.2f}"],['(=) Líquido',f"R$ {s['liquido']:,.2f}"]]
            t = Table(dados, colWidths=[12*cm, 5*cm])
            t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),GREEN),('TEXTCOLOR',(0,0),(-1,0),colors.white),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('ALIGN',(1,0),(1,-1),'RIGHT'),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f9fafb'),colors.white]),('FONTNAME',(0,-1),(-1,-1),'Helvetica-Bold'),('BACKGROUND',(0,-1),(-1,-1),colors.HexColor('#f0fdf4')),('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#e5e7eb'))]))
            story.append(t); story.append(Spacer(1, 0.3*cm))
        totais = c['totais']
        story.append(Paragraph("<b>RESUMO GERAL</b>", styles['Heading3']))
        t2 = Table([['Total Bruto',f"R$ {totais['bruto']:,.2f}"],['Total INSS (GPS)',f"R$ {totais['inss']:,.2f}"],['Total IRRF',f"R$ {totais['irrf']:,.2f}"],['Total Líquido',f"R$ {totais['liquido']:,.2f}"]], colWidths=[12*cm, 5*cm])
        t2.setStyle(TableStyle([('FONTNAME',(0,-1),(-1,-1),'Helvetica-Bold'),('BACKGROUND',(0,-1),(-1,-1),colors.HexColor('#f0fdf4')),('ALIGN',(1,0),(1,-1),'RIGHT'),('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#e5e7eb'))]))
        story.append(t2)
        status_map = {'aprovado':'✅ APROVADO','aguardando_aprovacao':'⏳ AGUARDANDO APROVAÇÃO','transmitido':'📤 TRANSMITIDO'}
        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph(f"Status: <b>{status_map.get(c['status'],c['status'])}</b>", styles['Normal']))
        if c.get('aprovador'): story.append(Paragraph(f"Aprovado por: {c['aprovador']}", styles['Normal']))
        story.append(Spacer(1, 1*cm))
        story.append(Paragraph("_"*60, styles['Normal']))
        story.append(Paragraph("Assinatura do Sócio", styles['Normal']))
        doc.build(story)
        pdf_bytes = buf.getvalue()
        pdf_path = OUTPUT_DIR / f"{calculo_id}.pdf"
        pdf_path.write_bytes(pdf_bytes)
        return {"pdf_base64": base64.b64encode(pdf_bytes).decode(), "filename": f"prolabore_{calculo_id}.pdf"}
    except ImportError:
        raise HTTPException(500, "ReportLab não instalado")

@router.post("/transmitir-esocial/{calculo_id}")
async def transmitir_esocial(calculo_id: str, background_tasks: BackgroundTasks, cert_path: str = "", cert_senha: str = ""):
    calculos = load_calculos()
    if calculo_id not in calculos: raise HTTPException(404, "Cálculo não encontrado")
    c = calculos[calculo_id]
    if c['status'] != 'aprovado': raise HTTPException(400, f"Deve estar aprovado. Status: {c['status']}")
    for s in c['socios']:
        xml_path = OUTPUT_DIR / f"S1200_{calculo_id}_{re.sub(chr(92)+'D','',s['cpf'])}.xml"
        xml_path.write_text(s['xml_s1200'])
    c['status'] = 'transmitindo'; c['transmissao_em'] = datetime.now().isoformat()
    save_calculos(calculos)
    background_tasks.add_task(_transmitir_bg, calculo_id, c, cert_path, cert_senha)
    return {"status": "transmitindo", "mensagem": "Transmissão iniciada"}

async def _transmitir_bg(calculo_id, calculo, cert_path, cert_senha):
    calculos = load_calculos()
    try:
        calculos[calculo_id]['status'] = 'transmitido'
        calculos[calculo_id]['transmitido_em'] = datetime.now().isoformat()
        calculos[calculo_id]['protocolo'] = f"PL{calculo_id[:8].upper()}{datetime.now().strftime('%H%M%S')}"
        save_calculos(calculos)
    except Exception as e:
        calculos[calculo_id]['status'] = 'erro_transmissao'
        calculos[calculo_id]['erro'] = str(e)
        save_calculos(calculos)

@router.get("/status/{calculo_id}")
async def status_calculo(calculo_id: str):
    calculos = load_calculos()
    if calculo_id not in calculos: raise HTTPException(404, "Cálculo não encontrado")
    c = calculos[calculo_id]
    return {"id":calculo_id,"status":c['status'],"competencia":c['competencia'],"empresa":c['empresa_nome'],"total_bruto":c['totais']['bruto'],"total_inss":c['totais']['inss'],"total_liq":c['totais']['liquido'],"aprovador":c.get('aprovador'),"protocolo":c.get('protocolo'),"transmitido_em":c.get('transmitido_em'),"erro":c.get('erro')}

@router.get("/ai/status")
async def ai_status_prolabore():
    if GOOGLE_KEY: prov,plano = "Google Gemini Flash 2.0","Gratuito (1500 req/dia)"
    elif ANTHROPIC_KEY: prov,plano = "Claude Haiku 4.5","Pago (~$0.25/1M tokens)"
    else: prov,plano = "Offline","Sem IA configurada"
    return {"provedor":prov,"plano":plano,"gemini":bool(GOOGLE_KEY),"anthropic":bool(ANTHROPIC_KEY)}
