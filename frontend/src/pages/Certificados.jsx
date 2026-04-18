import { useState, useEffect, useRef } from 'react'
import { Search, Shield, RefreshCw, Edit2, Download, Trash2, Eye, EyeOff, Lock, FileText } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'
const inp = { padding:'7px 10px', borderRadius:6, border:'1px solid #ddd', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', color:'#333' }
const sel = { ...inp, cursor:'pointer', background:'#fff' }
const CERT_EMISSORAS = ['Serasa','Certisign','Soluti','Valid','Safeweb','ICP-Brasil','Outro']
const ORGAOS_PROC = ['e-CAC (Receita Federal)','SEFAZ Estadual','Prefeitura / NFS-e','Portal Simples Nacional','Junta Comercial','INSS / eSocial','FGTS / Caixa','Outro']

function getClientes() { try { return JSON.parse(localStorage.getItem('ep_clientes')||'[]') } catch { return [] } }
function salvarClientes(l) { try { localStorage.setItem('ep_clientes',JSON.stringify(l)) } catch {} }
function diasParaVencer(d) { if(!d) return null; try { return Math.ceil((new Date(d+'T12:00:00')-new Date())/864e5) } catch { return null } }
function statusCert(dias) {
  if(dias===null) return {cor:'#aaa',bg:'#F5F5F5',label:'Sem data',icon:'—'}
  if(dias<0)      return {cor:'#dc2626',bg:'#FEF2F2',label:'Vencido',icon:'⛔'}
  if(dias<=30)    return {cor:'#f59e0b',bg:'#FEF9C3',label:dias+'d',icon:'⚠️'}
  if(dias<=90)    return {cor:'#3b82f6',bg:'#EFF6FF',label:dias+'d',icon:'ℹ️'}
  return {cor:'#22c55e',bg:'#F0FDF4',label:dias+'d',icon:'✅'}
}

// ── Carrega node-forge do CDN para parse real de PFX ─────────────────────────
let forgePromise = null
function loadForge() {
  if(forgePromise) return forgePromise
  forgePromise = new Promise((res,rej) => {
    if(window.forge) { res(window.forge); return }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/forge/1.3.1/forge.min.js'
    s.onload = () => res(window.forge)
    s.onerror = rej
    document.head.appendChild(s)
  })
  return forgePromise
}

// ── Parse REAL do .pfx com senha usando node-forge ────────────────────────────
async function parsePfxComSenha(file, senha) {
  try {
    const forge = await loadForge()
    const buf = await file.arrayBuffer()
    const der = forge.util.createBuffer(buf)
    const asn1 = forge.asn1.fromDer(der)
    const pfx = forge.pkcs12.pkcs12FromAsn1(asn1, senha || '')
    
    // Extrair certificado
    const bags = pfx.getBags({ bagType: forge.pki.oids.certBag })
    const certBags = bags[forge.pki.oids.certBag] || []
    if(!certBags.length) return { erro:'Nenhum certificado encontrado no arquivo.' }
    
    const cert = certBags[0].cert
    const subj = cert.subject
    const getAttr = (oid) => subj.getField(oid)?.value || ''
    
    const cn = getAttr('CN') || getAttr('commonName') || ''
    const o  = getAttr('O')  || getAttr('organizationName') || ''
    const ou = getAttr('OU') || getAttr('organizationalUnitName') || ''
    const serial = cert.serialNumber
    
    // Extrair CNPJ/CPF do CN (padrão ICP-Brasil: "NOME:00000000000000")
    let cnpj_cpf = ''
    let titular = cn
    const partes = cn.split(':')
    if(partes.length === 2) {
      titular = partes[0].trim()
      cnpj_cpf = partes[1].replace(/\D/g,'')
    } else {
      // Tentar extrair do campo serialNumber do subject
      const sn = getAttr('serialNumber') || ''
      cnpj_cpf = sn.replace(/\D/g,'')
    }
    
    // Formatar
    if(cnpj_cpf.length===14) cnpj_cpf = cnpj_cpf.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5')
    else if(cnpj_cpf.length===11) cnpj_cpf = cnpj_cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')
    
    const tipo = cnpj_cpf.replace(/\D/g,'').length===11 ? 'e-CPF' : 'e-CNPJ'
    
    // Validade
    const validade = cert.validity.notAfter
    const validadeStr = validade ? `${validade.getFullYear()}-${String(validade.getMonth()+1).padStart(2,'0')}-${String(validade.getDate()).padStart(2,'0')}` : ''
    
    // Emissora (Issuer CN)
    const issuerCN = cert.issuer?.getField('CN')?.value || cert.issuer?.getField('O')?.value || ''
    let emissora = ''
    for(const em of CERT_EMISSORAS) { if(issuerCN.toLowerCase().includes(em.toLowerCase())) { emissora = em; break } }
    
    // Cruzar com clientes
    const limpo = cnpj_cpf.replace(/\D/g,'')
    const cliente = getClientes().find(c => {
      if((c.cnpj||'').replace(/\D/g,'')===limpo&&limpo) return true
      return (c.socios||[]).some(s=>(s.cpf||'').replace(/\D/g,'')===limpo&&limpo)
    })||null
    
    return {
      arquivo: file.name, tipo, cnpj_cpf, titular, emissora,
      validade: validadeStr, cliente, eh_socio: cliente && limpo.length===11,
      tamanho: file.size, serial, issuer: issuerCN,
      ou, o, senha_ok: true
    }
  } catch(e) {
    if(e.message?.includes('password') || e.message?.includes('mac') || e.message?.toLowerCase().includes('invalid')) {
      return { erro: '🔑 Senha incorreta. Verifique a senha do certificado.', senha_invalida: true }
    }
    // Fallback: parse por nome
    const nome = file.name.toLowerCase()
    return {
      arquivo: file.name, erro_parse: e.message,
      tipo: nome.includes('cpf')?'e-CPF':'e-CNPJ',
      cnpj_cpf:'', titular:'', emissora:'', validade:'', cliente:null,
      tamanho: file.size, senha_ok: false,
      aviso: 'Não foi possível ler o certificado automaticamente. Preencha os campos manualmente.'
    }
  }
}

// ── Relatório via Claude API ──────────────────────────────────────────────────
async function gerarRelatorioIA(certClientes, tipo='analise') {
  const dados = certClientes.map(x=>({
    cliente: x.c.nome, cnpj: x.c.cnpj, regime: x.c.tributacao||x.c.regime,
    cert_tipo: x.cert.cert_tipo||'—', titular: x.cert.cert_titular||'—',
    validade: x.cert.cert_validade||null, dias: x.diasCert,
    status: statusCert(x.diasCert).label, emissora: x.cert.cert_emissora||'—',
    procuracao: x.temProc, proc_validade: x.cert.proc_validade||null,
    proc_orgaos: x.cert.proc_orgaos||[],
  }))
  
  const vencidos = dados.filter(d=>d.dias!==null&&d.dias<0)
  const alertas  = dados.filter(d=>d.dias!==null&&d.dias>=0&&d.dias<=30)
  const semCert  = dados.filter(d=>d.dias===null)
  
  const prompt = tipo==='alerta'
    ? `Você é um assistente do escritório EPimentel Auditoria & Contabilidade (CRC/GO 026.994/O-8).

Analise a situação dos certificados digitais e gere um ALERTA para o escritório:

VENCIDOS (${vencidos.length}): ${JSON.stringify(vencidos.map(d=>({cliente:d.cliente,validade:d.validade,dias:d.dias})))}
ALERTA 30 DIAS (${alertas.length}): ${JSON.stringify(alertas.map(d=>({cliente:d.cliente,validade:d.validade,dias:d.dias})))}
SEM CERTIFICADO (${semCert.length}): ${JSON.stringify(semCert.map(d=>d.cliente))}

Gere um alerta profissional e direto para o time do escritório, com:
1. Resumo executivo da situação
2. Ações urgentes (vencidos)
3. Ações preventivas (próximos 30 dias)
4. Orientações para os sem certificado
5. Mensagem de WhatsApp pronta para enviar aos clientes com certificado vencido

Use emojis e linguagem profissional. Seja objetivo.`
    : `Analise estes ${dados.length} certificados digitais do escritório EPimentel e produza:
1. Diagnóstico geral da carteira
2. Indicadores: % com certificado válido, médio de dias até vencimento
3. Lista priorizada de ações
4. Recomendações de renovação
5. Texto para relatório em PDF

Dados: ${JSON.stringify(dados)}`

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1200, messages:[{role:'user',content:prompt}] })
  })
  const d = await r.json()
  return d.content?.[0]?.text || 'Erro ao gerar análise.'
}

// ── Exportar Excel simples ────────────────────────────────────────────────────
function exportarExcel(certClientes) {
  const linhas = [
    ['Cliente','CNPJ','Regime','Tipo Cert.','Titular','CPF/CNPJ Cert.','Emissora','Validade','Dias Restantes','Status','Procuração','Órgãos Proc.','Data Proc.','Validade Proc.'],
    ...certClientes.map(x=>[
      x.c.nome, x.c.cnpj, x.c.tributacao||x.c.regime||'',
      x.cert.cert_tipo||'', x.cert.cert_titular||'', x.cert.cert_cnpj_cpf||'',
      x.cert.cert_emissora||'', x.cert.cert_validade||'',
      x.diasCert===null?'':x.diasCert, statusCert(x.diasCert).label,
      x.temProc?'Sim':'Não', (x.cert.proc_orgaos||[]).join('; '),
      x.cert.proc_data||'', x.cert.proc_validade||''
    ])
  ]
  const csv = linhas.map(l=>l.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n')
  const bom = '\uFEFF'
  const blob = new Blob([bom+csv],{type:'text/csv;charset=utf-8'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=`certificados_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`; a.click()
  URL.revokeObjectURL(url)
  logLGPD('exportacao_excel_certificados',{qtd:certClientes.length})
}

// ── Exportar PDF via impressão ────────────────────────────────────────────────
function exportarPDF(certClientes, analiseIA='') {
  const vencidos  = certClientes.filter(x=>x.diasCert!==null&&x.diasCert<0)
  const alertas   = certClientes.filter(x=>x.diasCert!==null&&x.diasCert>=0&&x.diasCert<=30)
  const validos   = certClientes.filter(x=>x.diasCert!==null&&x.diasCert>30)
  const semCert   = certClientes.filter(x=>x.diasCert===null)
  
  const linhasTabela = certClientes.map(x=>{
    const st=statusCert(x.diasCert)
    return `<tr>
      <td>${x.c.nome}</td>
      <td>${x.c.cnpj}</td>
      <td>${x.c.tributacao||x.c.regime||'—'}</td>
      <td>${x.cert.cert_tipo||'—'}</td>
      <td>${x.cert.cert_titular||'—'}</td>
      <td>${x.cert.cert_emissora||'—'}</td>
      <td style="color:${st.cor};font-weight:700">${x.cert.cert_validade?new Date(x.cert.cert_validade+'T12:00:00').toLocaleDateString('pt-BR'):'Não informado'}</td>
      <td style="color:${st.cor};font-weight:700">${st.icon} ${st.label}</td>
      <td>${x.temProc?'✅ Sim':'—'}</td>
    </tr>`
  }).join('')
  
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Relatório Certificados Digitais — EPimentel</title>
  <style>
    body{font-family:Arial,sans-serif;margin:30px;color:#333;font-size:12px}
    h1{color:#1B2A4A;border-bottom:3px solid #C5A55A;padding-bottom:8px}
    h2{color:#1B2A4A;margin-top:20px}
    .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}
    .card{border:1px solid #ddd;border-radius:8px;padding:12px;text-align:center}
    .card .num{font-size:28px;font-weight:800}
    .card .lbl{font-size:11px;color:#666}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th{background:#1B2A4A;color:#fff;padding:8px 6px;text-align:left;font-size:11px}
    td{padding:6px;border-bottom:1px solid #f0f0f0;font-size:11px}
    tr:nth-child(even){background:#FAFAFA}
    .analise{background:#F0F4FF;border:1px solid #C7D7FD;border-radius:8px;padding:14px;margin-top:16px;white-space:pre-wrap;font-size:12px}
    .footer{margin-top:24px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#aaa;text-align:center}
  </style></head><body>
  <h1>🔐 Relatório de Certificados Digitais</h1>
  <div><b>Escritório:</b> EPimentel Auditoria & Contabilidade Ltda | <b>CRC/GO:</b> 026.994/O-8 | <b>Data:</b> ${new Date().toLocaleString('pt-BR')}</div>
  <div class="cards">
    <div class="card"><div class="num" style="color:#1B2A4A">${certClientes.length}</div><div class="lbl">Total</div></div>
    <div class="card"><div class="num" style="color:#dc2626">${vencidos.length}</div><div class="lbl">Vencidos</div></div>
    <div class="card"><div class="num" style="color:#f59e0b">${alertas.length}</div><div class="lbl">Alerta 30d</div></div>
    <div class="card"><div class="num" style="color:#22c55e">${validos.length}</div><div class="lbl">Válidos</div></div>
  </div>
  <h2>📋 Listagem Completa</h2>
  <table><thead><tr><th>Cliente</th><th>CNPJ</th><th>Regime</th><th>Tipo</th><th>Titular</th><th>Emissora</th><th>Validade</th><th>Status</th><th>Proc.</th></tr></thead>
  <tbody>${linhasTabela}</tbody></table>
  ${analiseIA?`<h2>🤖 Análise Claude IA</h2><div class="analise">${analiseIA}</div>`:''}
  <div class="footer">Documento gerado pelo Sistema EPimentel | LGPD Lei 13.709/2018 | Uso restrito ao controlador autorizado</div>
  </body></html>`
  
  const win = window.open('','_blank')
  win.document.write(html)
  win.document.close()
  setTimeout(()=>win.print(),500)
  logLGPD('exportacao_pdf_certificados',{qtd:certClientes.length})
}

function logLGPD(acao,extra={}){ const l=JSON.parse(localStorage.getItem('ep_lgpd_log')||'[]'); l.push({acao,...extra,data:new Date().toISOString(),usuario:JSON.parse(localStorage.getItem('usuario')||'{}').nome||'Sistema'}); localStorage.setItem('ep_lgpd_log',JSON.stringify(l.slice(-200))) }

function SenhaInput({value,onChange,placeholder='••••••••'}) {
  const [show,setShow]=useState(false)
  return <div style={{position:'relative'}}><input type={show?'text':'password'} value={value} onChange={onChange} placeholder={placeholder} style={{...inp,paddingRight:36}}/><button type="button" onClick={()=>setShow(s=>!s)} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#aaa'}}>{show?<EyeOff size={14}/>:<Eye size={14}/>}</button></div>
}

export default function Certificados() {
  const [clientes,setClientes]=useState([])
  const [busca,setBusca]=useState('')
  const [filtroStatus,setFiltroStatus]=useState('')
  const [filtroProcuracao,setFiltroProcuracao]=useState(false)
  const [sortBy,setSortBy]=useState('validade')
  const [certEsc,setCertEsc]=useState(()=>{ try{return JSON.parse(localStorage.getItem('ep_cert_escritorio')||'null')||{tipo:'e-CNPJ',cnpj:'22.939.803/0001-49',emissora:'Serasa',arquivo:'',validade:''}}catch{return{tipo:'e-CNPJ',cnpj:'22.939.803/0001-49',emissora:'',arquivo:'',validade:''}} })
  const [editEsc,setEditEsc]=useState(false)
  const [modalDetalhe,setModalDetalhe]=useState(null)
  const [modalEditar,setModalEditar]=useState(null)
  const [modalExcluir,setModalExcluir]=useState(null)
  const [modalImportar,setModalImportar]=useState(null)
  const [analisando,setAnalisando]=useState(false)
  const [senhaImport,setSenhaImport]=useState('')
  const [arquivoImport,setArquivoImport]=useState(null)
  const [erroParse,setErroParse]=useState('')
  const [lgpdConsent,setLgpdConsent]=useState(()=>!!localStorage.getItem('ep_lgpd_cert_consent'))
  const [showLgpd,setShowLgpd]=useState(false)
  const [analisandoIA,setAnalisandoIA]=useState(false)
  const [resultadoIA,setResultadoIA]=useState('')
  const [modalIA,setModalIA]=useState(false)
  const fileRef=useRef()

  useEffect(()=>{ const limpos=limparCertsManuais(); setClientes(limpos) },[])
  const reload=()=>setClientes(getClientes())

  // Limpa certificados inseridos manualmente (sem arquivo de importação)
  const limparCertsManuais = () => {
    const todos = getClientes()
    const atualizados = todos.map(c => {
      const cred = c.credenciais || {}
      // Se tem CNPJ de cert mas não tem arquivo importado → limpar dados de cert
      if (cred.cert_cnpj_cpf && !cred.cert_arquivo) {
        return { ...c, credenciais: { ...cred, cert_cnpj_cpf:'', cert_titular:'', cert_tipo:'', cert_emissora:'', cert_validade:'', cert_serial:'' } }
      }
      return c
    })
    salvarClientes(atualizados)
    return atualizados
  }

  // Tentar parse com senha quando senha for preenchida
  useEffect(()=>{
    if(!arquivoImport||!senhaImport||senhaImport.length<1) return
    const timer=setTimeout(async()=>{
      setAnalisando(true); setErroParse('')
      const dados=await parsePfxComSenha(arquivoImport,senhaImport)
      setAnalisando(false)
      if(dados.erro){ setErroParse(dados.erro); return }
      setModalImportar(m=>({...m,...dados,senha:senhaImport}))
    },800)
    return ()=>clearTimeout(timer)
  },[senhaImport])

  const handleArquivoCert=async(file)=>{
    if(!lgpdConsent){setShowLgpd(true);return}
    setArquivoImport(file); setSenhaImport(''); setErroParse('')
    setAnalisando(true)
    // Parse inicial sem senha (extrai o que for possível)
    const dados=await parsePfxComSenha(file,'')
    setAnalisando(false)
    setModalImportar({...dados,arquivo:file.name,senha:'',_arquivo:file})
  }

  const tentarComSenha=async()=>{
    if(!arquivoImport||!senhaImport) return
    setAnalisando(true); setErroParse('')
    const dados=await parsePfxComSenha(arquivoImport,senhaImport)
    setAnalisando(false)
    if(dados.erro){ setErroParse(dados.erro); return }
    setModalImportar(m=>({...m,...dados,senha:senhaImport}))
  }

  const confirmarImportacao=()=>{
    if(!modalImportar?.cliente) return
    // Validar: CNPJ/CPF do certificado deve corresponder ao cliente selecionado
    const cnpjCert = (modalImportar.cnpj_cpf||'').replace(/\D/g,'')
    const cnpjCli  = (modalImportar.cliente.cnpj||'').replace(/\D/g,'')
    if (cnpjCert && cnpjCli && cnpjCert !== cnpjCli) {
      alert(`⚠️ CNPJ do certificado (${modalImportar.cnpj_cpf}) não corresponde ao cliente selecionado (${modalImportar.cliente.cnpj}).\nSelecione o cliente correto ou verifique o certificado.`)
      return
    }
    const lista=getClientes().map(c=>c.id!==modalImportar.cliente.id?c:{...c,credenciais:{...(c.credenciais||{}),cert_arquivo:modalImportar.arquivo,cert_tipo:modalImportar.tipo,cert_titular:modalImportar.titular,cert_cnpj_cpf:modalImportar.cnpj_cpf,cert_emissora:modalImportar.emissora,cert_validade:modalImportar.validade,cert_serial:modalImportar.serial||'',cert_issuer:modalImportar.issuer||''}})
    salvarClientes(lista); setClientes(lista)
    logLGPD('importacao_certificado',{arquivo:modalImportar.arquivo,cliente:modalImportar.cliente.nome})
    setModalImportar(null); setArquivoImport(null); setSenhaImport(''); reload()
  }

  const excluirCert=(cId)=>{
    const lista=getClientes().map(c=>c.id!==cId?c:{...c,credenciais:{...(c.credenciais||{}),cert_arquivo:'',cert_tipo:'',cert_titular:'',cert_cnpj_cpf:'',cert_emissora:'',cert_validade:'',cert_serial:''}})
    salvarClientes(lista); logLGPD('exclusao_certificado',{cliente_id:cId}); setModalExcluir(null); reload()
  }

  const salvarEdicao=()=>{
    if(!modalEditar) return
    const lista=getClientes().map(c=>c.id!==modalEditar.id?c:{...c,credenciais:{...(c.credenciais||{}),cert_arquivo:modalEditar.cert_arquivo,cert_tipo:modalEditar.cert_tipo,cert_titular:modalEditar.cert_titular,cert_cnpj_cpf:modalEditar.cert_cnpj_cpf,cert_emissora:modalEditar.cert_emissora,cert_validade:modalEditar.cert_validade,proc_ativa:modalEditar.proc_ativa,proc_validade:modalEditar.proc_validade,proc_orgaos:modalEditar.proc_orgaos||[],proc_data:modalEditar.proc_data}})
    salvarClientes(lista); logLGPD('edicao_certificado',{cliente_id:modalEditar.id}); setModalEditar(null); reload()
  }

  const baixarResumo=(c)=>{
    const cert=c.credenciais||{}
    const dados={aviso_lgpd:'LGPD Lei 13.709/2018',cliente:c.nome,cnpj:c.cnpj,certificado:{tipo:cert.cert_tipo||'—',titular:cert.cert_titular||'—',cpf_cnpj:cert.cert_cnpj_cpf||'—',emissora:cert.cert_emissora||'—',validade:cert.cert_validade?new Date(cert.cert_validade+'T12:00:00').toLocaleDateString('pt-BR'):'—',status:statusCert(diasParaVencer(cert.cert_validade)).label,serial:cert.cert_serial||'—'},procuracao:cert.proc_ativa?{ativa:true,data:cert.proc_data||'—',validade:cert.proc_validade?new Date(cert.proc_validade+'T12:00:00').toLocaleDateString('pt-BR'):'—',orgaos:cert.proc_orgaos||[]}:{ativa:false},gerado_em:new Date().toLocaleString('pt-BR')}
    const blob=new Blob([JSON.stringify(dados,null,2)],{type:'application/json'})
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`cert_${c.cnpj?.replace(/\D/g,'')}.json`; a.click(); URL.revokeObjectURL(url)
    logLGPD('download_resumo',{cliente:c.nome})
  }

  const ativarAlerteIA=async()=>{
    setAnalisandoIA(true); setResultadoIA(''); setModalIA(true)
    const res=await gerarRelatorioIA(certClientes,'alerta')
    setResultadoIA(res); setAnalisandoIA(false)
  }

  const certClientes=clientes.filter(c=>c.credenciais||c.obrigacoes_vinculadas?.length).map(c=>({c,cert:c.credenciais||{},diasCert:diasParaVencer(c.credenciais?.cert_validade),diasProc:diasParaVencer(c.credenciais?.proc_validade),temProc:!!c.credenciais?.proc_ativa})).filter(x=>{
    if(busca&&!(x.c.nome||'').toLowerCase().includes(busca.toLowerCase())&&!(x.c.cnpj||'').includes(busca)) return false
    if(filtroProcuracao&&!x.temProc) return false
    if(filtroStatus==='vencido'&&!(x.diasCert!==null&&x.diasCert<0)) return false
    if(filtroStatus==='alerta'&&!(x.diasCert!==null&&x.diasCert>=0&&x.diasCert<=30)) return false
    if(filtroStatus==='ok'&&!(x.diasCert!==null&&x.diasCert>30)) return false
    if(filtroStatus==='sem'&&x.diasCert!==null) return false
    return true
  }).sort((a,b)=>{if(sortBy==='validade'){if(a.diasCert===null)return 1;if(b.diasCert===null)return -1;return a.diasCert-b.diasCert};return(a.c.nome||'').localeCompare(b.c.nome||'')})

  const tots={total:certClientes.length,vencidos:certClientes.filter(x=>x.diasCert!==null&&x.diasCert<0).length,alertas:certClientes.filter(x=>x.diasCert!==null&&x.diasCert>=0&&x.diasCert<=30).length,sem:certClientes.filter(x=>x.diasCert===null).length,proc:certClientes.filter(x=>x.temProc).length}
  const diasEsc=diasParaVencer(certEsc.validade); const stEsc=statusCert(diasEsc)

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 44px)',fontFamily:'Inter, system-ui, sans-serif',background:'#F8F9FA',overflow:'hidden'}}>
      {/* Header */}
      <div style={{background:NAVY,padding:'12px 22px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}><Shield size={20} style={{color:GOLD}}/><span style={{color:'#fff',fontWeight:700,fontSize:16}}>Certificados</span><span style={{color:GOLD,fontWeight:700,fontSize:16}}> Digitais</span></div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button onClick={ativarAlerteIA} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:7,background:'#6366f1',color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}>🤖 Alerta IA</button>
          <button onClick={()=>exportarExcel(certClientes)} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:7,background:'#22c55e',color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}>📊 Excel</button>
          <button onClick={()=>exportarPDF(certClientes,'')} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:7,background:'#e53935',color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}>📄 PDF</button>
          <button onClick={()=>setShowLgpd(true)} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:7,background:'rgba(255,255,255,.08)',color:'#ccc',border:'1px solid rgba(255,255,255,.15)',cursor:'pointer',fontSize:12}}><Lock size={12}/> LGPD</button>
          <button onClick={()=>{if(!lgpdConsent){setShowLgpd(true);return};fileRef.current?.click()}} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:7,background:GOLD,color:NAVY,fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}>📥 Importar</button>
          <input ref={fileRef} type="file" accept=".pfx,.p12" style={{display:'none'}} onChange={e=>{if(e.target.files[0])handleArquivoCert(e.target.files[0])}}/>
        </div>
      </div>

      <div style={{flex:1,overflow:'auto',padding:20}}>
        {!lgpdConsent&&<div style={{marginBottom:16,padding:'12px 16px',borderRadius:10,background:'#FFF3E0',border:'2px solid #FF9800',display:'flex',gap:12,alignItems:'center'}}><Lock size={18} style={{color:'#E65100',flexShrink:0}}/><div style={{flex:1,fontSize:12,color:'#555'}}><b style={{color:'#E65100'}}>⚖️ LGPD:</b> Este módulo armazena dados pessoais sensíveis. Uso autorizado como obrigação legal contábil/fiscal.</div><button onClick={()=>{localStorage.setItem('ep_lgpd_cert_consent',new Date().toISOString());setLgpdConsent(true)}} style={{padding:'7px 16px',borderRadius:8,background:'#E65100',color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',flexShrink:0}}>✅ Confirmar</button></div>}

        {/* Certificado do Escritório */}
        <div style={{marginBottom:20,background:'#fff',borderRadius:12,border:`2px solid ${GOLD}40`,overflow:'hidden'}}>
          <div style={{padding:'12px 18px',background:NAVY,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:18}}>🏢</span><div><div style={{color:'#fff',fontWeight:700,fontSize:13}}>Certificado do Escritório (EPimentel)</div><div style={{color:GOLD,fontSize:11}}>Usado para acesso via procuração dos clientes</div></div></div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {certEsc.validade&&<span style={{fontSize:12,padding:'2px 10px',borderRadius:8,background:stEsc.bg,color:stEsc.cor,fontWeight:700}}>{stEsc.icon} {stEsc.label}</span>}
              <button onClick={()=>setEditEsc(e=>!e)} style={{padding:'5px 12px',borderRadius:7,background:'rgba(255,255,255,.1)',color:'#fff',border:'1px solid rgba(255,255,255,.2)',cursor:'pointer',fontSize:12}}>{editEsc?'× Fechar':'✏️ Editar'}</button>
            </div>
          </div>
          {!editEsc?(
            <div style={{padding:'12px 18px',display:'flex',gap:24,flexWrap:'wrap',alignItems:'center'}}>
              {[['Tipo',certEsc.tipo||'e-CNPJ'],['CNPJ',certEsc.cnpj||'22.939.803/0001-49'],['Emissora',certEsc.emissora||'—'],['Arquivo',certEsc.arquivo||'—'],['Validade',certEsc.validade?new Date(certEsc.validade+'T12:00:00').toLocaleDateString('pt-BR'):'Não informado']].map(([k,v])=>(
                <div key={k}><div style={{fontSize:10,color:'#aaa',fontWeight:600,textTransform:'uppercase'}}>{k}</div><div style={{fontWeight:600,color:NAVY,fontSize:13}}>{v}</div></div>
              ))}
            </div>
          ):(
            <div style={{padding:'14px 18px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12,marginBottom:12}}>
                {[['Tipo','tipo','select',['e-CNPJ','e-CPF']],['CNPJ','cnpj','text'],['Emissora','emissora','select',CERT_EMISSORAS],['Validade','validade','date']].map(([l,k,t,opts])=>(
                  <div key={k}><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>{l}</label>
                  {t==='select'?<select value={certEsc[k]||''} onChange={e=>setCertEsc(c=>({...c,[k]:e.target.value}))} style={sel}>{(opts||[]).map(o=><option key={o}>{o}</option>)}</select>
                  :<input type={t} value={certEsc[k]||''} onChange={e=>setCertEsc(c=>({...c,[k]:e.target.value}))} style={inp}/>}
                  </div>
                ))}
              </div>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Arquivo .pfx (para reconhecimento automático)</label>
                <div style={{display:'flex',gap:8}}>
                  <input type="text" value={certEsc.arquivo||''} readOnly style={{...inp,flex:1,background:'#f9f9f9',cursor:'default'}}/>
                  <label style={{padding:'7px 14px',borderRadius:7,background:'#555',color:'#fff',fontSize:12,cursor:'pointer',whiteSpace:'nowrap'}}>Browse
                    <input type="file" accept=".pfx,.p12" style={{display:'none'}} onChange={async e=>{if(e.target.files[0]){const d=await parsePfxComSenha(e.target.files[0],certEsc.senha||'');if(!d.erro)setCertEsc(c=>({...c,arquivo:d.arquivo,emissora:d.emissora||c.emissora,validade:d.validade||c.validade,cert_titular:d.titular||c.cert_titular}));}}}/>
                  </label>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                <button onClick={()=>setEditEsc(false)} style={{padding:'7px 14px',borderRadius:7,background:'#f5f5f5',color:'#555',border:'none',cursor:'pointer',fontSize:12}}>Cancelar</button>
                <button onClick={()=>{localStorage.setItem('ep_cert_escritorio',JSON.stringify(certEsc));setEditEsc(false)}} style={{padding:'7px 16px',borderRadius:7,background:NAVY,color:'#fff',fontWeight:700,border:'none',cursor:'pointer',fontSize:12}}>💾 Salvar</button>
              </div>
            </div>
          )}
        </div>

        {/* Cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
          {[['Total',tots.total,NAVY,'#EBF5FF','📋'],['Vencidos',tots.vencidos,'#dc2626','#FEF2F2','⛔'],['Alerta 30d',tots.alertas,'#f59e0b','#FEF9C3','⚠️'],['Sem Cert.',tots.sem,'#888','#F5F5F5','—'],['Procuração',tots.proc,'#22c55e','#F0FDF4','📜']].map(([l,v,cor,bg,icon])=>(
            <div key={l} style={{background:bg,borderRadius:12,padding:'14px 16px',border:`1px solid ${cor}20`}}><div style={{fontSize:26,marginBottom:4}}>{icon}</div><div style={{fontSize:24,fontWeight:800,color:cor}}>{v}</div><div style={{fontSize:11,color:'#666'}}>{l}</div></div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{background:'#fff',borderRadius:10,padding:'10px 16px',marginBottom:16,display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',border:'1px solid #eee'}}>
          <div style={{position:'relative',flex:1,minWidth:200}}><Search size={12} style={{position:'absolute',left:8,top:8,color:'#bbb'}}/><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar cliente ou CNPJ..." style={{...inp,paddingLeft:26}}/></div>
          <div style={{display:'flex',gap:5}}>{[['','Todos'],['vencido','⛔ Vencidos'],['alerta','⚠️ 30d'],['ok','✅ OK'],['sem','— Sem']].map(([v,l])=>(
            <button key={v} onClick={()=>setFiltroStatus(v)} style={{padding:'5px 10px',borderRadius:20,fontSize:11,cursor:'pointer',border:`1px solid ${filtroStatus===v?NAVY:'#ddd'}`,background:filtroStatus===v?NAVY:'#fff',color:filtroStatus===v?'#fff':'#666',fontWeight:filtroStatus===v?700:400}}>{l}</button>
          ))}</div>
          <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12}}><input type="checkbox" checked={filtroProcuracao} onChange={e=>setFiltroProcuracao(e.target.checked)} style={{accentColor:NAVY,width:14,height:14}}/> 📜 Procuração</label>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...sel,width:160,fontSize:12}}><option value="validade">Ordenar: Vencimento</option><option value="nome">Ordenar: Nome</option></select>
          <button onClick={reload} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:7,background:'#f5f5f5',color:'#555',border:'1px solid #ddd',cursor:'pointer',fontSize:12}}><RefreshCw size={12}/> Atualizar</button>
          <span style={{fontSize:11,color:'#aaa'}}>{certClientes.length} clientes</span>
        </div>

        {/* Tabela */}
        <div style={{background:'#fff',borderRadius:10,border:'1px solid #eee',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{background:NAVY}}>{['Cliente','CNPJ','Regime','Tipo','Titular / CPF-CNPJ','Emissora','Validade','Procuração','Ações'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',color:'#fff',fontSize:11,fontWeight:700,whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
            <tbody>
              {certClientes.length===0&&<tr><td colSpan={9} style={{padding:40,textAlign:'center',color:'#ccc'}}>Nenhum cliente. Use <b>📥 Importar</b> ou preencha em <b>Clientes → Credenciais</b>.</td></tr>}
              {certClientes.map(({c,cert,diasCert,diasProc,temProc},i)=>{
                const stC=statusCert(diasCert); const stP=statusCert(diasProc)
                return <tr key={c.id} style={{background:i%2===0?'#fff':'#FAFAFA',borderBottom:'1px solid #f0f0f0'}}>
                  <td style={{padding:'9px 12px'}}><div style={{fontWeight:600,color:NAVY}}>{c.nome}</div>{c.nome_fantasia&&<div style={{fontSize:10,color:'#aaa'}}>{c.nome_fantasia}</div>}</td>
                  <td style={{padding:'9px 12px',fontFamily:'monospace',fontSize:11,color:'#555'}}>{c.cnpj}</td>
                  <td style={{padding:'9px 12px'}}><span style={{fontSize:10,padding:'2px 7px',borderRadius:6,background:'#EBF5FF',color:'#1D6FA4',fontWeight:600}}>{c.tributacao||c.regime||'—'}</span></td>
                  <td style={{padding:'9px 12px'}}>{cert.cert_tipo?<span style={{padding:'2px 8px',borderRadius:6,background:cert.cert_tipo==='e-CNPJ'?'#EBF5FF':'#F3EEFF',color:cert.cert_tipo==='e-CNPJ'?'#1D6FA4':'#6B3EC9',fontWeight:700,fontSize:11}}>{cert.cert_tipo==='e-CPF'?'👤':'🏢'} {cert.cert_tipo}</span>:<span style={{color:'#ccc'}}>—</span>}</td>
                  <td style={{padding:'9px 12px',maxWidth:160}}><div style={{fontWeight:600,color:NAVY,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:12}}>{cert.cert_titular||'—'}</div>{cert.cert_cnpj_cpf&&<div style={{fontSize:10,color:'#888',fontFamily:'monospace'}}>{cert.cert_cnpj_cpf}</div>}</td>
                  <td style={{padding:'9px 12px',fontSize:11,color:'#555'}}>{cert.cert_emissora||'—'}</td>
                  <td style={{padding:'9px 12px'}}>{cert.cert_validade?<div><span style={{fontSize:11,padding:'2px 8px',borderRadius:8,background:stC.bg,color:stC.cor,fontWeight:700}}>{stC.icon} {stC.label}</span><div style={{fontSize:10,color:'#aaa',marginTop:2}}>{new Date(cert.cert_validade+'T12:00:00').toLocaleDateString('pt-BR')}</div></div>:<span style={{color:'#ccc',fontSize:11}}>Não informado</span>}</td>
                  <td style={{padding:'9px 12px'}}>{temProc?<div><span style={{fontSize:11,padding:'2px 7px',borderRadius:8,background:stP.bg,color:stP.cor,fontWeight:700}}>📜 {stP.icon} {stP.label}</span>{(cert.proc_orgaos||[]).length>0&&<div style={{display:'flex',gap:3,marginTop:2,flexWrap:'wrap'}}>{cert.proc_orgaos.slice(0,2).map(o=><span key={o} style={{fontSize:9,padding:'1px 5px',borderRadius:5,background:'#E8F5E9',color:'#2E7D32'}}>{o.split('(')[0].trim()}</span>)}{cert.proc_orgaos.length>2&&<span style={{fontSize:9,color:'#aaa'}}>+{cert.proc_orgaos.length-2}</span>}</div>}</div>:<span style={{color:'#ccc',fontSize:11}}>—</span>}</td>
                  <td style={{padding:'9px 12px'}}><div style={{display:'flex',gap:5}}>
                    <button onClick={()=>setModalDetalhe(c)} title="Ver" style={{padding:'4px 8px',borderRadius:6,background:'#EBF5FF',color:'#1D6FA4',border:'none',cursor:'pointer'}}><Eye size={12}/></button>
                    <button onClick={()=>setModalEditar({id:c.id,nome:c.nome,...cert})} title="Editar" style={{padding:'4px 8px',borderRadius:6,background:'#F0F4FF',color:NAVY,border:'none',cursor:'pointer'}}><Edit2 size={12}/></button>
                    <button onClick={()=>baixarResumo(c)} title="Baixar JSON" style={{padding:'4px 8px',borderRadius:6,background:'#EDFBF1',color:'#1A7A3C',border:'none',cursor:'pointer'}}><Download size={12}/></button>
                    <button onClick={()=>setModalExcluir(c)} title="Excluir" style={{padding:'4px 8px',borderRadius:6,background:'#FEF2F2',color:'#dc2626',border:'none',cursor:'pointer'}}><Trash2 size={12}/></button>
                  </div></td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Analisando */}
      {analisando&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:400}}><div style={{background:'#fff',borderRadius:14,padding:36,textAlign:'center'}}><div style={{fontSize:48,marginBottom:12}}>🔍</div><div style={{fontWeight:700,color:NAVY,fontSize:15}}>Lendo certificado...</div><div style={{fontSize:12,color:'#888',marginTop:6}}>Extraindo dados com node-forge</div></div></div>}

      {/* Modal Importar */}
      {modalImportar&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
        <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:640,maxHeight:'92vh',overflow:'auto',boxShadow:'0 8px 40px rgba(0,0,0,.2)'}}>
          <div style={{padding:'14px 22px',borderBottom:'1px solid #eee',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'#fff',zIndex:1}}><div style={{fontWeight:700,color:NAVY,fontSize:15}}>📥 Importar Certificado — {modalImportar.arquivo}</div><button onClick={()=>{setModalImportar(null);setArquivoImport(null);setSenhaImport('')}} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:'#999'}}>×</button></div>
          <div style={{padding:22}}>
            {/* Senha para decriptografar */}
            <div style={{marginBottom:14,padding:'14px 16px',borderRadius:10,background:modalImportar.senha_ok?'#F0FDF4':'#FFF3E0',border:`1px solid ${modalImportar.senha_ok?'#bbf7d0':'#FFB74D'}`}}>
              <div style={{fontWeight:700,color:modalImportar.senha_ok?'#166534':'#E65100',fontSize:13,marginBottom:8}}>{modalImportar.senha_ok?'🔓 Certificado lido com sucesso!':'🔑 Informe a senha para leitura automática'}</div>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <div style={{flex:1}}><SenhaInput value={senhaImport} onChange={e=>setSenhaImport(e.target.value)} placeholder="Senha do certificado .pfx"/></div>
                <button onClick={tentarComSenha} disabled={!senhaImport||analisando} style={{padding:'8px 16px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',whiteSpace:'nowrap',opacity:!senhaImport?0.5:1}}>🔓 Decriptografar</button>
              </div>
              {erroParse&&<div style={{marginTop:8,fontSize:12,color:'#dc2626',fontWeight:600}}>{erroParse}</div>}
              {modalImportar.aviso&&<div style={{marginTop:8,fontSize:12,color:'#f59e0b'}}>{modalImportar.aviso}</div>}
              {modalImportar.senha_ok&&<div style={{marginTop:8,fontSize:11,color:'#555'}}>Titular: <b>{modalImportar.titular}</b> | Issuer: {modalImportar.issuer} | Serial: {modalImportar.serial?.substring(0,16)}...</div>}
            </div>

            {/* Dados extraídos/confirmação */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Tipo</label><div style={{display:'flex',gap:6}}>{['e-CNPJ','e-CPF'].map(t=><button key={t} onClick={()=>setModalImportar(m=>({...m,tipo:t}))} style={{flex:1,padding:'7px 0',borderRadius:7,cursor:'pointer',border:`2px solid ${modalImportar.tipo===t?NAVY:'#ddd'}`,background:modalImportar.tipo===t?NAVY+'15':'#fff',color:modalImportar.tipo===t?NAVY:'#888',fontWeight:modalImportar.tipo===t?700:400,fontSize:12}}>{t==='e-CPF'?'👤 ':'🏢 '}{t}</button>)}</div></div>
              <div>
                <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>
                  CPF/CNPJ do Certificado
                  {modalImportar.cnpj_cpf
                    ? <span style={{marginLeft:6,fontSize:10,color:'#16a34a',fontWeight:700}}>✅ Extraído automaticamente</span>
                    : <span style={{marginLeft:6,fontSize:10,color:'#f59e0b',fontWeight:700}}>⚠️ Não detectado no arquivo</span>}
                </label>
                <div style={{...inp,background:'#f8f9fb',color:NAVY,fontWeight:700,fontFamily:'monospace',display:'flex',alignItems:'center',gap:8}}>
                  {modalImportar.cnpj_cpf||<span style={{color:'#aaa',fontWeight:400,fontFamily:'inherit'}}>Não identificado</span>}
                  <span style={{marginLeft:'auto',fontSize:10,color:'#aaa',fontFamily:'inherit',fontWeight:400}}>🔒 somente leitura</span>
                </div>
              </div>
              <div><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Titular</label><input value={modalImportar.titular||''} onChange={e=>setModalImportar(m=>({...m,titular:e.target.value}))} style={inp}/></div>
              <div><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Emissora</label><select value={modalImportar.emissora||''} onChange={e=>setModalImportar(m=>({...m,emissora:e.target.value}))} style={sel}><option value="">—</option>{CERT_EMISSORAS.map(e=><option key={e}>{e}</option>)}</select></div>
              <div>
                <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Validade {modalImportar.senha_ok&&<span style={{color:'#22c55e',fontSize:10}}>✅ extraída automaticamente</span>}</label>
                <input type="date" value={modalImportar.validade||''} onChange={e=>setModalImportar(m=>({...m,validade:e.target.value}))} style={{...inp,borderColor:modalImportar.validade&&new Date(modalImportar.validade+'T12:00:00')<new Date()?'#e53935':'#ddd'}}/>
                {modalImportar.validade&&<div style={{fontSize:11,marginTop:3,...statusCert(diasParaVencer(modalImportar.validade))}}>
                  {statusCert(diasParaVencer(modalImportar.validade)).icon} {statusCert(diasParaVencer(modalImportar.validade)).label}
                </div>}
              </div>
              <div><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Senha (armazenar)</label><SenhaInput value={modalImportar.senha||''} onChange={e=>setModalImportar(m=>({...m,senha:e.target.value}))}/></div>
            </div>
            <div style={{marginBottom:14}}><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Vincular ao Cliente *</label>
              {modalImportar.cliente&&<div style={{marginBottom:6,padding:'8px 12px',borderRadius:7,background:'#F0FDF4',border:'1px solid #bbf7d0',fontSize:12,color:'#166534',fontWeight:700}}>✅ Cliente identificado: {modalImportar.cliente.nome} {modalImportar.eh_socio&&'(e-CPF de sócio)'}</div>}
              <select value={modalImportar.cliente?.id||''} onChange={e=>{
                  const cli=clientes.find(c=>String(c.id)===e.target.value)
                  if(cli&&modalImportar.cnpj_cpf){
                    const cnpjCert=(modalImportar.cnpj_cpf||'').replace(/\D/g,'')
                    const cnpjCli=(cli.cnpj||'').replace(/\D/g,'')
                    if(cnpjCert&&cnpjCli&&cnpjCert!==cnpjCli){
                      setModalImportar(m=>({...m,cliente:cli||null,_cnpjDivergente:true}))
                      return
                    }
                  }
                  setModalImportar(m=>({...m,cliente:cli||null,_cnpjDivergente:false}))
                }} style={sel}>
                  <option value="">Selecione...</option>
                  {clientes.map(c=>{
                    const cnpjCert=(modalImportar.cnpj_cpf||'').replace(/\D/g,'')
                    const cnpjCli=(c.cnpj||'').replace(/\D/g,'')
                    const match=cnpjCert&&cnpjCli&&cnpjCert===cnpjCli
                    return <option key={c.id} value={c.id}>{match?'✅ ':''}{c.nome} — {c.cnpj}</option>
                  })}
                </select>
                {modalImportar._cnpjDivergente&&(
                  <div style={{marginTop:6,padding:'6px 10px',borderRadius:7,background:'#FEF2F2',border:'1px solid #fca5a5',fontSize:12,color:'#dc2626',fontWeight:600}}>
                    ⚠️ CNPJ do certificado ({modalImportar.cnpj_cpf}) diverge do cliente selecionado. Não será possível confirmar.
                  </div>
                )}
            </div>
            <div style={{marginBottom:16,padding:'10px 14px',borderRadius:8,background:'#FFF3E0',border:'1px solid #FFB74D',fontSize:11,color:'#E65100'}}><Lock size={11} style={{marginRight:5}}/> <b>LGPD Art. 7º II:</b> Dados armazenados para cumprimento de obrigação legal tributária.</div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>{setModalImportar(null);setArquivoImport(null);setSenhaImport('')}} style={{padding:'8px 16px',borderRadius:8,background:'#f5f5f5',color:'#555',border:'none',cursor:'pointer',fontSize:13}}>Cancelar</button>
              <button onClick={confirmarImportacao}
              disabled={!modalImportar.cliente||modalImportar._cnpjDivergente}
              style={{padding:'8px 20px',borderRadius:8,background:(modalImportar.cliente&&!modalImportar._cnpjDivergente)?NAVY:'#ccc',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:(modalImportar.cliente&&!modalImportar._cnpjDivergente)?'pointer':'default'}}>
              ✅ Confirmar
            </button>
            </div>
          </div>
        </div>
      </div>}

      {/* Modal Editar */}
      {modalEditar&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
        <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:580,maxHeight:'90vh',overflow:'auto',boxShadow:'0 8px 40px rgba(0,0,0,.2)'}}>
          <div style={{padding:'14px 22px',borderBottom:'1px solid #eee',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontWeight:700,color:NAVY,fontSize:15}}>✏️ {modalEditar.nome}</div><button onClick={()=>setModalEditar(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:'#999'}}>×</button></div>
          <div style={{padding:22}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
              {[['Tipo','cert_tipo','select',['e-CNPJ','e-CPF']],['Titular','cert_titular','text'],['CPF/CNPJ (somente leitura)','cert_cnpj_cpf','readonly'],['Emissora','cert_emissora','select',CERT_EMISSORAS],['Validade','cert_validade','date'],['Arquivo','cert_arquivo','text']].map(([l,k,t,opts])=>(
                <div key={k}><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>{l}</label>
                {t==='select'?<select value={modalEditar[k]||''} onChange={e=>setModalEditar(m=>({...m,[k]:e.target.value}))} style={sel}><option value="">—</option>{(opts||[]).map(o=><option key={o}>{o}</option>)}</select>
                :t==='readonly'?<div style={{...inp,background:'#f8f9fb',color:NAVY,fontWeight:700,fontFamily:'monospace',display:'flex',alignItems:'center',gap:8}}>{modalEditar[k]||'—'}<span style={{marginLeft:'auto',fontSize:10,color:'#aaa',fontFamily:'inherit',fontWeight:400}}>🔒</span></div>:<input type={t} value={modalEditar[k]||''} onChange={e=>setModalEditar(m=>({...m,[k]:e.target.value}))} style={inp}/>}
                {k==='cert_validade'&&modalEditar.cert_validade&&<div style={{fontSize:11,marginTop:2,color:statusCert(diasParaVencer(modalEditar.cert_validade)).cor}}>{statusCert(diasParaVencer(modalEditar.cert_validade)).icon} {statusCert(diasParaVencer(modalEditar.cert_validade)).label}</div>}
                </div>
              ))}
            </div>
            <div style={{marginBottom:14,padding:'12px 14px',borderRadius:9,border:'1px solid #e8e8e8',background:'#f9f9f9'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',marginBottom:10}} onClick={()=>setModalEditar(m=>({...m,proc_ativa:!m.proc_ativa}))}>
                <div style={{position:'relative',width:36,height:20,flexShrink:0}}><div style={{position:'absolute',inset:0,borderRadius:20,background:modalEditar.proc_ativa?'#22c55e':'#ccc',cursor:'pointer'}}><div style={{position:'absolute',top:2,left:modalEditar.proc_ativa?16:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left .2s'}}/></div></div>
                <span style={{fontSize:13,fontWeight:700,color:modalEditar.proc_ativa?'#22c55e':'#888'}}>📜 Acesso via Procuração</span>
              </div>
              {modalEditar.proc_ativa&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:3}}>Data</label><input type="date" value={modalEditar.proc_data||''} onChange={e=>setModalEditar(m=>({...m,proc_data:e.target.value}))} style={inp}/></div>
                <div><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:3}}>Validade</label><input type="date" value={modalEditar.proc_validade||''} onChange={e=>setModalEditar(m=>({...m,proc_validade:e.target.value}))} style={inp}/></div>
                <div style={{gridColumn:'span 2'}}><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:6}}>Órgãos autorizados</label><div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{ORGAOS_PROC.map(o=>{const s2=(modalEditar.proc_orgaos||[]).includes(o);return<button key={o} onClick={()=>{const l2=modalEditar.proc_orgaos||[];setModalEditar(m=>({...m,proc_orgaos:s2?l2.filter(x=>x!==o):[...l2,o]}))}} style={{padding:'4px 10px',borderRadius:20,fontSize:11,cursor:'pointer',border:`1px solid ${s2?NAVY:'#ddd'}`,background:s2?NAVY:'#fff',color:s2?'#fff':'#666',fontWeight:s2?700:400}}>{s2?'✓ ':''}{o}</button>})}</div></div>
              </div>}
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}><button onClick={()=>setModalEditar(null)} style={{padding:'8px 16px',borderRadius:8,background:'#f5f5f5',color:'#555',border:'none',cursor:'pointer',fontSize:13}}>Cancelar</button><button onClick={salvarEdicao} style={{padding:'8px 20px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer'}}>💾 Salvar</button></div>
          </div>
        </div>
      </div>}

      {/* Modal Excluir */}
      {modalExcluir&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
        <div style={{background:'#fff',borderRadius:14,padding:28,maxWidth:400,width:'90%',textAlign:'center'}}>
          <Trash2 size={40} style={{color:'#dc2626',marginBottom:12}}/>
          <div style={{fontSize:15,fontWeight:700,color:NAVY,marginBottom:8}}>Excluir certificado</div>
          <div style={{fontSize:14,fontWeight:700,color:NAVY,marginBottom:12}}>"{modalExcluir.nome}"</div>
          <div style={{padding:'10px 14px',borderRadius:8,background:'#FFF3E0',border:'1px solid #FFB74D',fontSize:12,color:'#E65100',marginBottom:16,textAlign:'left'}}><Lock size={12} style={{marginRight:4}}/> <b>LGPD Art. 18, IV:</b> Exclusão registrada no log de auditoria.</div>
          <div style={{display:'flex',gap:10,justifyContent:'center'}}><button onClick={()=>setModalExcluir(null)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:13}}>Cancelar</button><button onClick={()=>excluirCert(modalExcluir.id)} style={{padding:'9px 22px',borderRadius:8,background:'#dc2626',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13,border:'none'}}>Excluir</button></div>
        </div>
      </div>}

      {/* Modal IA Alerta */}
      {modalIA&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
        <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:720,maxHeight:'90vh',overflow:'auto',boxShadow:'0 8px 40px rgba(0,0,0,.2)'}}>
          <div style={{padding:'14px 22px',borderBottom:'1px solid #eee',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#EDE9FF'}}>
            <div style={{fontWeight:700,color:'#6366f1',fontSize:15}}>🤖 Alerta Inteligente — Claude IA</div>
            <button onClick={()=>setModalIA(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:'#999'}}>×</button>
          </div>
          <div style={{padding:22}}>
            {analisandoIA?(
              <div style={{textAlign:'center',padding:40}}><div style={{fontSize:48,marginBottom:12}}>🤖</div><div style={{fontWeight:700,color:'#6366f1',fontSize:15}}>Claude analisando certificados...</div><div style={{fontSize:12,color:'#888',marginTop:6}}>Verificando vencimentos e gerando alertas</div></div>
            ):(
              <>
                <pre style={{fontSize:13,lineHeight:1.7,color:'#333',whiteSpace:'pre-wrap',fontFamily:'inherit',background:'#F8F9FA',borderRadius:10,padding:16,marginBottom:16,border:'1px solid #eee'}}>{resultadoIA}</pre>
                <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                  <button onClick={()=>{exportarPDF(certClientes,resultadoIA);setModalIA(false)}} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:8,background:'#e53935',color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}>📄 PDF com Análise IA</button>
                  <button onClick={()=>{const blob=new Blob([resultadoIA],{type:'text/plain'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='alerta_certificados_ia.txt';a.click()}} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}>⬇️ Baixar</button>
                  <button onClick={()=>setModalIA(false)} style={{padding:'8px 18px',borderRadius:8,background:'#f5f5f5',color:'#555',border:'none',cursor:'pointer',fontSize:13}}>Fechar</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>}

      {/* Modal LGPD */}
      {showLgpd&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:400}}>
        <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:520,maxHeight:'85vh',overflow:'auto'}}>
          <div style={{padding:'14px 22px',borderBottom:'1px solid #eee',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#FFF3E0'}}><div style={{fontWeight:700,color:'#E65100',fontSize:15}}>⚖️ LGPD — Lei 13.709/2018</div><button onClick={()=>setShowLgpd(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:'#999'}}>×</button></div>
          <div style={{padding:22}}>
            {[['Base Legal','Art. 7º, II — Cumprimento de obrigação legal tributária.'],['Finalidade','Gestão de acessos a sistemas gov. para obrigações acessórias.'],['Controlador','EPimentel Auditoria & Contabilidade Ltda — CNPJ 22.939.803/0001-49'],['Direitos','Acesso, correção, portabilidade, eliminação (Art. 18 LGPD).'],['Retenção','5 anos (prazo prescricional fiscal).'],['Auditoria','Log completo em ep_lgpd_log — accountability.']].map(([t,v])=>(
              <div key={t} style={{marginBottom:10,padding:'10px 14px',borderRadius:8,background:'#F8F9FA',border:'1px solid #E0E0E0'}}><div style={{fontWeight:700,color:NAVY,fontSize:12,marginBottom:2}}>{t}</div><div style={{fontSize:12,color:'#555'}}>{v}</div></div>
            ))}
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
              <button onClick={()=>setShowLgpd(false)} style={{padding:'8px 16px',borderRadius:8,background:'#f5f5f5',color:'#555',border:'none',cursor:'pointer',fontSize:13}}>Fechar</button>
              {!lgpdConsent&&<button onClick={()=>{localStorage.setItem('ep_lgpd_cert_consent',new Date().toISOString());setLgpdConsent(true);setShowLgpd(false)}} style={{padding:'8px 20px',borderRadius:8,background:'#E65100',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer'}}>✅ Confirmar</button>}
            </div>
          </div>
        </div>
      </div>}
    </div>
  )
}
