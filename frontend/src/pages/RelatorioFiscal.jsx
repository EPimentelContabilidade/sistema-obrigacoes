import { useState, useEffect } from 'react'
import { Search, ExternalLink, CheckCircle, AlertTriangle, FileText, Building2, ChevronDown, ChevronUp, X, Loader, Zap, Shield, Download, RefreshCw } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'

const BACKEND = window.location.hostname.includes('railway.app')
  ? 'https://sistema-obrigacoes-production.up.railway.app/api/v1'
  : '/api/v1'

// ── Geração de PDF local ──────────────────────────────────────────────────────
const carregarJsPDF = () => new Promise((resolve) => {
  if (window.jspdf) { resolve(window.jspdf.jsPDF); return }
  const s = document.createElement('script')
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  s.onload = () => resolve(window.jspdf.jsPDF)
  s.onerror = () => resolve(null)
  document.head.appendChild(s)
})

const gerarRelatorioCliente = async (cli, resultados, historico) => {
  const JsPDF = await carregarJsPDF()
  if (!JsPDF) { alert('Erro ao carregar gerador de PDF.'); return }
  const doc = new JsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
  const W = 210, M = 15
  const NAVY_RGB = [27,42,74], GOLD_RGB = [197,165,90], GRAY = [80,80,80], LGRAY = [200,200,200]
  const hoje = new Date().toLocaleString('pt-BR')
  const hojeD = new Date().toLocaleDateString('pt-BR')
  let y = M

  doc.setFillColor(240,240,240); doc.rect(M,y,W-M*2,22,'F')
  doc.setFillColor(...NAVY_RGB); doc.rect(M,y,3,22,'F')
  doc.setTextColor(...NAVY_RGB); doc.setFontSize(11); doc.setFont('helvetica','bold')
  doc.text('EPIMENTEL AUDITORIA & CONTABILIDADE LTDA', M+6, y+7)
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(...GRAY)
  doc.text('CRC/GO 026.994/O-8  |  Goiânia - GO', M+6, y+12)
  doc.text(`Por meio do sistema EPimentel — CNPJ: 22.939.803/0001-49`, M+6, y+17)
  doc.setFontSize(8); doc.text(hojeD, W-M, y+7, {align:'right'})
  y += 26

  doc.setFillColor(...NAVY_RGB); doc.rect(M,y,W-M*2,8,'F')
  doc.setTextColor(255,255,255); doc.setFontSize(10); doc.setFont('helvetica','bold')
  doc.text('DIAGNÓSTICO FISCAL', W/2, y+5.5, {align:'center'})
  y += 12

  const cnpjR = resultados?.cnpj_dados || resultados?.completo || {}
  const simplesR = resultados?.simples || resultados?.completo || {}
  const pgfnR = resultados?.pgfn || {}

  const formatCNPJ = (c) => {
    const n=(c||'').replace(/\D/g,'')
    return n.length===14?`${n.slice(0,2)}.${n.slice(2,5)}.${n.slice(5,8)}/${n.slice(8,12)}-${n.slice(12)}`:c||'—'
  }

  doc.setTextColor(...NAVY_RGB); doc.setFontSize(9.5); doc.setFont('helvetica','bold')
  doc.text('Dados Cadastrais', M, y); y+=1
  doc.setDrawColor(...LGRAY); doc.line(M,y,W-M,y); y+=4
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY)

  const campo = (label, valor, x, yy, w=85) => {
    doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY_RGB)
    doc.text(`${label}:`, x, yy)
    doc.setFont('helvetica','normal'); doc.setTextColor(...GRAY)
    doc.text(String(valor||'—').substring(0,50), x+w*0.38, yy)
  }

  campo('CNPJ', formatCNPJ(cli?.cnpj), M, y)
  campo('Situação', cnpjR.situacao_cadastral||'—', M+95, y); y+=6
  campo('Razão Social', cnpjR.razao_social||cli?.nome||'—', M, y, 170); y+=6
  campo('Regime', simplesR.regime||'—', M, y)
  campo('CNAE', (cnpjR.atividade_principal||'—').substring(0,35), M+95, y); y+=6

  if (cnpjR.socios?.length > 0) {
    y+=2; doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY_RGB); doc.setFontSize(8.5)
    doc.text('Sócios', M, y); y+=1; doc.setDrawColor(...LGRAY); doc.line(M,y,W-M,y); y+=4
    doc.setFont('helvetica','normal'); doc.setTextColor(...GRAY)
    cnpjR.socios.slice(0,5).forEach(s => { doc.text(`• ${s.nome_socio||'—'}`, M+3, y); y+=5 })
  }

  y+=3; doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY_RGB); doc.setFontSize(9.5)
  doc.text('Certidão', M, y); y+=1; doc.setDrawColor(...LGRAY); doc.line(M,y,W-M,y); y+=5

  const semPendencias = !pgfnR.possui_debito && (cnpjR.situacao_cadastral||'').toLowerCase().includes('ativa')
  const boxH = 22
  doc.setFillColor(semPendencias?240:255, semPendencias?253:240, semPendencias?244:240)
  doc.setDrawColor(semPendencias?22:220, semPendencias?163:38, semPendencias?74:38)
  doc.roundedRect(M, y, W-M*2, boxH, 3, 3, 'FD')
  doc.setTextColor(semPendencias?22:220, semPendencias?163:38, semPendencias?74:38)
  doc.setFontSize(11); doc.setFont('helvetica','bold')
  doc.text(semPendencias ? '✓ CERTIDÃO NEGATIVA' : '✗ CERTIDÃO POSITIVA', W/2, y+9, {align:'center'})
  y += boxH + 6

  const histCli = historico.filter(h=>String(h.cliente_id)===String(cli?.id))
  if (histCli.length > 0) {
    doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY_RGB); doc.setFontSize(9.5)
    doc.text('Histórico', M, y); y+=1; doc.setDrawColor(...LGRAY); doc.line(M,y,W-M,y); y+=4
    histCli.slice(0,6).forEach((h,i)=>{
      const cor = h.status?.includes('Pendente')||h.status==='Irregular'?[220,38,38]:h.status==='Sem pendências'?[22,163,74]:[100,100,100]
      doc.setFillColor(i%2===0?248:255,i%2===0?249:255,i%2===0?251:255)
      doc.rect(M,y-3,W-M*2,6,'F')
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...GRAY)
      doc.text(new Date(h.data).toLocaleDateString('pt-BR'), M+2, y+0.5)
      doc.text((h.relatorio||'—').substring(0,28), M+22, y+0.5)
      doc.setTextColor(...cor); doc.setFont('helvetica','bold')
      doc.text(h.status||'—', M+100, y+0.5); y+=6
    })
  }

  const rodY = 280
  doc.setFillColor(...NAVY_RGB); doc.rect(0,rodY,W,17,'F')
  doc.setFillColor(...GOLD_RGB); doc.rect(0,rodY,W,1.5,'F')
  doc.setTextColor(255,255,255); doc.setFontSize(7.5); doc.setFont('helvetica','bold')
  doc.text('EPimentel Auditoria & Contabilidade Ltda  ·  CRC/GO 026.994/O-8', W/2, rodY+6, {align:'center'})
  doc.setFont('helvetica','normal'); doc.setFontSize(7)
  doc.text(`Gerado eletronicamente em ${hoje}  ·  Não substitui certidões oficiais.`, W/2, rodY+11, {align:'center'})
  doc.save(`EPimentel_DiagnosticoFiscal_${(cli?.nome||'cliente').replace(/[^a-zA-Z0-9]/g,'_').substring(0,20)}_${hojeD.replace(/\//g,'-')}.pdf`)
}

const gerarPDFFiscal = async (historico, clientes, filtroCliente) => {
  const JsPDF = await carregarJsPDF()
  if (!JsPDF) { alert('Erro ao carregar gerador de PDF.'); return }
  const doc = new JsPDF({ orientation:'landscape', unit:'mm', format:'a4' })
  const W = 297, H = 210
  const NAVY_RGB = [27,42,74], GOLD_RGB = [197,165,90]
  const hoje = new Date().toLocaleDateString('pt-BR')
  doc.setFillColor(...NAVY_RGB); doc.rect(0,0,W,28,'F')
  doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold')
  doc.text('EPimentel Auditoria & Contabilidade', 14, 11)
  doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.text('Relatório de Consultas Fiscais', 14, 18)
  doc.setFontSize(9); doc.text(`Emitido em: ${hoje}`, W-14, 11, {align:'right'}); doc.text('CRC/GO 026.994/O-8', W-14, 18, {align:'right'})
  doc.setFillColor(...GOLD_RGB); doc.rect(0,28,W,1.5,'F')
  const lista = filtroCliente ? historico.filter(h=>h.cliente_nome?.toLowerCase().includes(filtroCliente.toLowerCase())) : historico
  const clisUnicos = [...new Set(lista.map(h=>h.cliente_nome))].filter(Boolean)
  doc.setTextColor(...NAVY_RGB); doc.setFontSize(11); doc.setFont('helvetica','bold')
  doc.text(`Total: ${lista.length} consultas  |  Clientes: ${clisUnicos.length}`, 14, 38)
  if (filtroCliente) { doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(100,100,100); doc.text(`Filtro: ${filtroCliente}`, 14, 44) }
  const cols = [{label:'Data',w:22},{label:'Cliente',w:65},{label:'CNPJ',w:34},{label:'Relatório',w:52},{label:'Status',w:40},{label:'Observações',w:60},{label:'Usuário',w:22}]
  let y = filtroCliente ? 50 : 44
  doc.setFillColor(...NAVY_RGB); doc.rect(14,y,W-28,7,'F')
  doc.setTextColor(255,255,255); doc.setFontSize(7.5); doc.setFont('helvetica','bold')
  let x=16; cols.forEach(c=>{doc.text(c.label,x,y+5);x+=c.w}); y+=7; doc.setFont('helvetica','normal')
  const stCores = {'Sem pendências':[22,163,74],'Pendências regularizadas':[22,163,74],'Pendente — débitos':[220,38,38],'Pendente — cadastral':[220,38,38],'Irregular':[220,38,38],'Não consultado':[150,150,150]}
  lista.forEach((h,i)=>{
    if(y>H-18){doc.addPage();y=20;doc.setFillColor(...NAVY_RGB);doc.rect(14,y,W-28,7,'F');doc.setTextColor(255,255,255);doc.setFontSize(7.5);doc.setFont('helvetica','bold');let xh=16;cols.forEach(c=>{doc.text(c.label,xh,y+5);xh+=c.w});y+=7;doc.setFont('helvetica','normal')}
    if(i%2===0){doc.setFillColor(248,249,251)}else{doc.setFillColor(255,255,255)}
    doc.rect(14,y,W-28,7,'F')
    const cor=stCores[h.status]||[100,100,100]; x=16; doc.setTextColor(60,60,60)
    try{doc.text((new Date(h.data).toLocaleDateString('pt-BR')).substring(0,10),x,y+5)}catch{doc.text(h.data||'—',x,y+5)}; x+=cols[0].w
    doc.text((h.cliente_nome||'—').substring(0,28),x,y+5); x+=cols[1].w
    doc.text((h.cnpj||'—').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5').substring(0,18),x,y+5); x+=cols[2].w
    doc.text((h.relatorio||'—').substring(0,24),x,y+5); x+=cols[3].w
    doc.setTextColor(...cor); doc.setFont('helvetica','bold'); doc.text((h.status||'—').substring(0,22),x,y+5); doc.setFont('helvetica','normal'); doc.setTextColor(60,60,60); x+=cols[4].w
    doc.text((h.obs||'—').substring(0,30),x,y+5); x+=cols[5].w; doc.text((h.usuario||'—').substring(0,14),x,y+5); y+=7
  })
  const pags=doc.getNumberOfPages(); for(let pg=1;pg<=pags;pg++){doc.setPage(pg);doc.setFillColor(...NAVY_RGB);doc.rect(0,H-10,W,10,'F');doc.setTextColor(255,255,255);doc.setFontSize(7);doc.text('EPimentel Auditoria & Contabilidade Ltda  ·  CRC/GO 026.994/O-8',14,H-4);doc.text(`Pág. ${pg}/${pags}`,W-14,H-4,{align:'right'})}
  if(lista.length===0){doc.setTextColor(150,150,150);doc.setFontSize(14);doc.setFont('helvetica','italic');doc.text('Nenhuma consulta registrada.',W/2,H/2,{align:'center'})}
  doc.save(`EPimentel_RelatorioFiscal_${hoje.replace(/\//g,'-')}.pdf`)
}

// ── Utilitários ───────────────────────────────────────────────────────────────
const inp = { padding:'7px 10px', borderRadius:6, border:'1px solid #ddd', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', color:'#333' }
const fmtData = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('pt-BR') } catch { return d } }
const hoje = () => new Date().toISOString().split('T')[0]
const limparCNPJ = (c) => (c||'').replace(/\D/g,'')
const STATUS_OPTS = ['Sem pendências','Pendências regularizadas','Pendente — débitos','Pendente — cadastral','Irregular','Não consultado']
const stCor = (st) => {
  if (!st) return { cor:'#aaa', bg:'#f5f5f5', ic:'—' }
  if (st.includes('Pendente')||st==='Irregular') return { cor:'#dc2626', bg:'#FEF2F2', ic:'⚠' }
  if (st==='Sem pendências'||st==='Pendências regularizadas'||st==='Regular') return { cor:'#16a34a', bg:'#F0FDF4', ic:'✓' }
  return { cor:'#888', bg:'#f5f5f5', ic:'?' }
}
const PORTAIS = [
  { id:'cnpj_dados', label:'Dados Cadastrais CNPJ',   icon:'🏢', cor:'#1D6FA4', bg:'#EBF5FF', auto:true,  desc:'Situação cadastral, sócios, endereço' },
  { id:'simples',    label:'Simples Nacional',         icon:'💼', cor:'#1A7A3C', bg:'#EDFBF1', auto:true,  desc:'Situação de optante' },
  { id:'pgfn',       label:'PGFN — Dívida Ativa',      icon:'⚠️', cor:'#dc2626', bg:'#FEF2F2', auto:true,  desc:'Inscrições em dívida ativa' },
  { id:'completo',   label:'Consulta Completa',        icon:'🔍', cor:NAVY,      bg:'#f0f4ff', auto:true,  desc:'CNPJ + Simples + PGFN' },
  { id:'certidao',   label:'CND / Certidão Negativa',  icon:'✅', cor:'#16a34a', bg:'#F0FDF4', auto:false, url:'https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir', desc:'Emissão na Receita Federal' },
  { id:'ecac_sit',   label:'e-CAC — Situação Fiscal',  icon:'🏛️', cor:'#6B3EC9', bg:'#F3EEFF', auto:false, url:'https://cav.receita.fazenda.gov.br/autenticacao/login', desc:'Requer certificado + procuração', requerCert:true },
  { id:'ecac_decl',  label:'e-CAC — Declarações',      icon:'📋', cor:'#6B3EC9', bg:'#F3EEFF', auto:false, url:'https://cav.receita.fazenda.gov.br/autenticacao/login', desc:'DCTF, ECF, ECD', requerCert:true },
  { id:'ecac_parc',  label:'e-CAC — Parcelamentos',    icon:'💳', cor:'#f59e0b', bg:'#FEF9C3', auto:false, url:'https://cav.receita.fazenda.gov.br/autenticacao/login', desc:'PERT, REFIS', requerCert:true },
  { id:'nfe',        label:'NF-e Destinadas',          icon:'🧾', cor:'#854D0E', bg:'#FEF9C3', auto:false, url:'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=completa&tipoConteudo=XbSeqxE8pl8=', desc:'Manifestação de NF-e' },
]

// ── Modal Download e-CAC ──────────────────────────────────────────────────────
function ModalDownloadEcac({ cliente, certServidor, onClose }) {
  const [status, setStatus] = useState('idle')
  const [mensagem, setMensagem] = useState('')
  const [tipo, setTipo] = useState('ambos')
  const [certSel, setCertSel] = useState(certServidor[0]?.caminho || '')
  const [senha, setSenha] = useState('')

  const baixar = async () => {
    if (!certSel) { alert('Selecione um certificado.'); return }
    if (!senha) { alert('Informe a senha do certificado.'); return }
    setStatus('baixando'); setMensagem('Conectando ao e-CAC via certificado A1...')
    try {
      const resp = await fetch(`${BACKEND}/ecac/baixar`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ cnpj:limparCNPJ(cliente.cnpj), cert_path:certSel, cert_senha:senha, tipo, cliente_nome:cliente.nome })
      })
      if (!resp.ok) {
        const err = await resp.json().catch(()=>({}))
        const detalhe = err?.detail?.mensagem || err?.detail || 'Erro desconhecido'
        const erros = err?.detail?.erros || []
        setStatus('erro'); setMensagem(detalhe + (erros.length ? '\n• '+erros.join('\n• ') : '')); return
      }
      const blob = await resp.blob()
      const cd = resp.headers.get('content-disposition')||''
      const nm = cd.match(/filename="?([^"]+)"?/)
      const nomeArq = nm ? nm[1] : `EPimentel_${cliente.nome}_ecac.zip`
      const url = URL.createObjectURL(blob); const a = document.createElement('a')
      a.href=url; a.download=nomeArq; a.click(); URL.revokeObjectURL(url)
      const avisos = resp.headers.get('X-Avisos')
      setStatus('ok'); setMensagem(avisos ? `Baixado com avisos:\n${avisos}` : '✓ Documentos baixados com sucesso!')
    } catch(e) { setStatus('erro'); setMensagem(e.message||'Falha de conexão') }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:400}}>
      <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:460,padding:26,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
          <div>
            <div style={{fontWeight:700,color:NAVY,fontSize:15}}>⬇ Baixar via e-CAC</div>
            <div style={{fontSize:11,color:'#888',marginTop:2}}>{cliente.nome} · {cliente.cnpj}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa'}}><X size={18}/></button>
        </div>

        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:6,textTransform:'uppercase'}}>O que baixar</label>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {[{v:'cnd',l:'✅ CND',cor:'#16a34a',bg:'#F0FDF4'},{v:'parcelamentos',l:'💳 Parcelamentos',cor:'#f59e0b',bg:'#FEF9C3'},{v:'pgfn',l:'⚠️ PGFN',cor:'#dc2626',bg:'#FEF2F2'},{v:'ambos',l:'📦 Todos (ZIP)',cor:NAVY,bg:'#f0f4ff'}].map(op=>(
              <button key={op.v} onClick={()=>setTipo(op.v)} style={{padding:'6px 12px',borderRadius:8,fontSize:11,fontWeight:700,border:`2px solid ${tipo===op.v?op.cor:'#e8e8e8'}`,background:tipo===op.v?op.bg:'#fff',color:tipo===op.v?op.cor:'#888',cursor:'pointer'}}>{op.l}</button>
            ))}
          </div>
        </div>

        <div style={{marginBottom:12}}>
          <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4,textTransform:'uppercase'}}>Certificado A1</label>
          {certServidor.length > 0 ? (
            <select value={certSel} onChange={e=>setCertSel(e.target.value)} style={{...inp,cursor:'pointer',fontSize:12}}>
              <option value="">Selecione...</option>
              {certServidor.map(c=><option key={c.caminho} value={c.caminho}>{c.nome} ({c.tamanho_kb} KB)</option>)}
            </select>
          ) : (
            <div style={{padding:'10px 14px',borderRadius:8,background:'#FEF9C3',fontSize:11,color:'#854D0E'}}>⚠ Nenhum certificado no servidor. Envie um .pfx em <b>Certificado e-CAC</b>.</div>
          )}
        </div>

        <div style={{marginBottom:16}}>
          <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4,textTransform:'uppercase'}}>Senha do .pfx</label>
          <input type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Senha do certificado" style={inp} onKeyDown={e=>e.key==='Enter'&&baixar()}/>
        </div>

        {status !== 'idle' && (
          <div style={{padding:'10px 14px',borderRadius:8,marginBottom:14,fontSize:12,background:status==='ok'?'#F0FDF4':status==='erro'?'#FEF2F2':'#EBF5FF',color:status==='ok'?'#16a34a':status==='erro'?'#dc2626':'#1D6FA4',whiteSpace:'pre-line'}}>
            {status==='baixando'&&<Loader size={13} style={{animation:'spin 1s linear infinite',marginRight:6,display:'inline'}}/>}{mensagem}
          </div>
        )}

        <div style={{padding:'8px 12px',borderRadius:8,background:'#f8f9fb',border:'1px solid #e8e8e8',fontSize:10,color:'#888',marginBottom:16}}>
          <b style={{color:NAVY}}>Requisito:</b> O escritório precisa ter <b>procuração eletrônica</b> no e-CAC para cada cliente. Sem ela, só acessa dados do próprio CNPJ do certificado.
        </div>

        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{padding:'9px 16px',borderRadius:8,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:13}}>Cancelar</button>
          <button onClick={baixar} disabled={status==='baixando'||!certSel||!senha} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 22px',borderRadius:8,background:status==='baixando'||!certSel||!senha?'#ccc':'#6B3EC9',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:status==='baixando'||!certSel||!senha?'default':'pointer'}}>
            {status==='baixando'?<><Loader size={13} style={{animation:'spin 1s linear infinite'}}/> Baixando...</>:<><Download size={13}/> Baixar</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente Principal ──────────────────────────────────────────────────────
export default function RelatorioFiscal() {
  const [aba, setAba] = useState('consulta')
  const [clientes, setClientes] = useState([])
  const [certs, setCerts] = useState([])
  const [cliSel, setCliSel] = useState(null)
  const [certSel, setCertSel] = useState(null)
  const [portalSel, setPortalSel] = useState([])
  const [historico, setHistorico] = useState([])
  const [procuracao, setProcuracao] = useState({})
  const [resultados, setResultados] = useState({})
  const [carregando, setCarregando] = useState({})
  const [modalLog, setModalLog] = useState(null)
  const [logForm, setLogForm] = useState({ status:'Sem pendências', obs:'', data:hoje() })
  const [expandidos, setExpandidos] = useState({})
  const [filtroCliDash, setFiltroCliDash] = useState('')
  const [modalCert, setModalCert] = useState(false)
  const [certUpload, setCertUpload] = useState(null)
  const [certSenhaUp, setCertSenhaUp] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  const [certServidor, setCertServidor] = useState([])
  const [ecacRodando, setEcacRodando] = useState(false)
  const [ecacResultado, setEcacResultado] = useState(null)
  const [clienteEcacAtivo, setClienteEcacAtivo] = useState(null)
  const [playwrightOk, setPlaywrightOk] = useState(null)

  useEffect(() => {
    try { setClientes(JSON.parse(localStorage.getItem('ep_clientes')||'[]')) } catch {}
    try { setCerts(JSON.parse(localStorage.getItem('ep_certificados')||'[]')) } catch {}
    try { setHistorico(JSON.parse(localStorage.getItem('ep_hist_fiscal')||'[]')) } catch {}
    try { setProcuracao(JSON.parse(localStorage.getItem('ep_procuracao')||'{}')) } catch {}
    carregarCertsServidor()
    setPlaywrightOk(true) // Playwright instalado via Dockerfile
  }, [])

  const salvarHistorico = (nova) => { setHistorico(nova); localStorage.setItem('ep_hist_fiscal', JSON.stringify(nova)) }
  const toggleProcuracao = (id) => { const n={...procuracao,[id]:!procuracao[id]}; setProcuracao(n); localStorage.setItem('ep_procuracao',JSON.stringify(n)) }
  const togglePortal = (id) => setPortalSel(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])

  const carregarCertsServidor = async () => {
    try { const r=await fetch(`${BACKEND}/consulta-fiscal/certificados/listados`); if(r.ok){const d=await r.json();setCertServidor(d.certificados||[])} } catch {}
  }
  const fazerUploadCert = async () => {
    if (!certUpload) return; setUploadStatus('enviando')
    try {
      const fd=new FormData(); fd.append('arquivo',certUpload)
      const r=await fetch(`${BACKEND}/consulta-fiscal/certificado/upload`,{method:'POST',body:fd})
      if(r.ok){const d=await r.json();setUploadStatus('ok:'+d.caminho);await carregarCertsServidor()}else{setUploadStatus('erro')}
    } catch { setUploadStatus('erro') }
  }
  const acessarEcacAutomatico = async (certPath) => {
    if(!cliSel||!certPath) return; setEcacRodando(true); setEcacResultado(null)
    try {
      const r=await fetch(`${BACKEND}/consulta-fiscal/ecac/autenticar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cnpj:limparCNPJ(cliSel.cnpj),tipo:'ecac',cert_path:certPath,cert_senha:certSenhaUp})})
      setEcacResultado(await r.json())
    } catch { setEcacResultado({status:'erro',mensagem:'Falha ao conectar'}) }
    setEcacRodando(false)
  }
  const buscarBrasilAPI = async (cnpj) => { const r=await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`); if(!r.ok) throw new Error('CNPJ não encontrado'); return r.json() }

  const consultarAuto = async (portal) => {
    if (!cliSel) return
    const cnpj = limparCNPJ(cliSel.cnpj)
    setCarregando(c=>({...c,[portal.id]:true}))
    try {
      let dados = {}
      if (portal.id==='cnpj_dados') { const d=await buscarBrasilAPI(cnpj); dados={razao_social:d.razao_social,situacao_cadastral:d.descricao_situacao_cadastral,natureza_juridica:d.descricao_natureza_juridica,atividade_principal:d.cnae_fiscal_descricao,capital_social:d.capital_social,socios:d.qsa||[],endereco:{logradouro:d.logradouro,numero:d.numero,municipio:d.municipio,uf:d.uf},consultado_em:new Date().toISOString()}
      } else if (portal.id==='simples') { const d=await buscarBrasilAPI(cnpj); dados={regime:d.opcao_pelo_mei?'MEI':d.opcao_pelo_simples?'Simples Nacional':'Não optante',optante_simples:d.opcao_pelo_simples,optante_mei:d.opcao_pelo_mei,data_opcao_simples:d.data_opcao_pelo_simples,consultado_em:new Date().toISOString()}
      } else if (portal.id==='pgfn') { try{const r=await fetch(`https://www.regularize.pgfn.gov.br/api/v1/situacao-devedores/${cnpj}`);if(r.ok){dados=await r.json()}else{dados={mensagem:'Consulte www.regularize.pgfn.gov.br'}}}catch{dados={mensagem:'Consulte www.regularize.pgfn.gov.br'}}; dados.consultado_em=new Date().toISOString()
      } else if (portal.id==='completo') { const d=await buscarBrasilAPI(cnpj); const ok=d.descricao_situacao_cadastral?.toLowerCase().includes('ativa'); dados={razao_social:d.razao_social,situacao_cadastral:d.descricao_situacao_cadastral,regime:d.opcao_pelo_mei?'MEI':d.opcao_pelo_simples?'Simples Nacional':'Outro',socios:d.qsa||[],resumo:{situacao_geral:ok?'Regular':'Verificar situação',pendencias:ok?[]:[`Situação: ${d.descricao_situacao_cadastral}`]},consultado_em:new Date().toISOString()} }
      setResultados(prev=>({...prev,[portal.id]:dados}))
      const st=dados.resumo?.situacao_geral||(dados.situacao_cadastral?.toLowerCase().includes('ativa')?'Sem pendências':'Verificar')
      const stFinal=st.includes('Regular')||st.includes('Sem')?'Sem pendências':st.includes('Irregular')||st.includes('Pendente')?'Pendente — débitos':'Não consultado'
      salvarHistorico([{id:Date.now(),cliente_id:cliSel.id,cliente_nome:cliSel.nome,cnpj:cliSel.cnpj,relatorio_id:portal.id,relatorio:portal.label,status:stFinal,obs:dados.resumo?.pendencias?.join(', ')||dados.situacao||'',data:hoje(),usuario:'Sistema (automático)'},...historico])
    } catch(e) { setResultados(prev=>({...prev,[portal.id]:{erro:true,mensagem:e.message||'Erro'}})) }
    setCarregando(c=>({...c,[portal.id]:false}))
  }
  const consultarTodosAuto = async () => { await Promise.all(PORTAIS.filter(p=>p.auto&&portalSel.includes(p.id)).map(p=>consultarAuto(p))) }
  const registrarConsulta = () => {
    if (!cliSel||!modalLog) return
    salvarHistorico([{id:Date.now(),cliente_id:cliSel.id,cliente_nome:cliSel.nome,cnpj:cliSel.cnpj,relatorio_id:modalLog.id,relatorio:modalLog.label,status:logForm.status,obs:logForm.obs,data:logForm.data,usuario:'Eduardo Pimentel'},...historico])
    setModalLog(null); setLogForm({status:'Sem pendências',obs:'',data:hoje()})
  }
  const ultimaConsulta = (cliId, relId) => historico.find(h=>String(h.cliente_id)===String(cliId)&&h.relatorio_id===relId)

  const RenderResultado = ({portalId}) => {
    const r=resultados[portalId]; if(!r) return null
    if(r.erro) return <div style={{marginTop:8,padding:'8px 12px',borderRadius:7,background:'#FEF9C3',fontSize:11,color:'#854D0E'}}>⚠ {r.mensagem}</div>
    const campos=[]; if(r.razao_social) campos.push(['Razão Social',r.razao_social]); if(r.situacao_cadastral) campos.push(['Situação',r.situacao_cadastral]); if(r.regime) campos.push(['Regime',r.regime]); if(r.resumo) campos.push(['Situação Geral',r.resumo.situacao_geral]); if(r.resumo?.pendencias?.length) campos.push(['Pendências',r.resumo.pendencias.join(', ')]); if(r.mensagem) campos.push(['Info',r.mensagem])
    const cor=r.resumo?.situacao_geral==='Regular'||r.situacao_cadastral?.toLowerCase().includes('ativa')?'#F0FDF4':'#FEF9C3'
    return (<div style={{marginTop:8,padding:'10px 12px',borderRadius:8,background:cor,border:'1px solid #e8e8e8',fontSize:11}}>{campos.map(([k,v])=>(<div key={k} style={{display:'flex',gap:8,marginBottom:3}}><span style={{color:'#888',minWidth:120,fontWeight:600}}>{k}:</span><span style={{color:NAVY,fontWeight:500}}>{v}</span></div>))}{r.socios?.length>0&&<div style={{marginTop:4,color:'#555'}}>Sócios: {r.socios.map(s=>s.nome_socio).join(', ')}</div>}<div style={{marginTop:4,color:'#aaa',fontSize:10}}>Consultado: {new Date(r.consultado_em).toLocaleString('pt-BR')}</div></div>)
  }

  const clientesDash = clientes.filter(c=>!filtroCliDash||c.nome?.toLowerCase().includes(filtroCliDash.toLowerCase())).map(c=>({...c,histCli:historico.filter(h=>String(h.cliente_id)===String(c.id)),temCert:certs.some(x=>String(x.cliente_id)===String(c.id)),temProc:procuracao[c.id]||false,pendente:historico.some(h=>String(h.cliente_id)===String(c.id)&&(h.status?.includes('Pendente')||h.status==='Irregular'))}))

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 44px)',fontFamily:'Inter, system-ui, sans-serif'}}>

      {/* Banner Playwright */}
      {playwrightOk===false&&<div style={{background:'#FEF9C3',borderBottom:'1px solid #fde68a',padding:'5px 16px',fontSize:11,color:'#854D0E'}}>⚠ <b>Download automático indisponível</b> — Playwright não instalado. Verifique o Dockerfile no Railway.</div>}
      {playwrightOk===true&&<div style={{background:'#F0FDF4',borderBottom:'1px solid #bbf7d0',padding:'5px 16px',fontSize:11,color:'#166534'}}>✓ <b>Download automático via e-CAC disponível</b> — Playwright operacional.</div>}

      {/* Abas */}
      <div style={{background:'#fff',borderBottom:'1px solid #e8e8e8',display:'flex',alignItems:'center',padding:'0 16px'}}>
        {[['consulta','🔍 Consulta'],['dashboard','📊 Dashboard'],['historico','📋 Histórico'],['pdf','📄 PDF']].map(([id,label])=>(
          <button key={id} onClick={()=>setAba(id)} style={{padding:'11px 16px',fontSize:13,fontWeight:aba===id?700:400,color:aba===id?NAVY:'#999',background:'none',border:'none',borderBottom:aba===id?`2px solid ${GOLD}`:'2px solid transparent',cursor:'pointer'}}>{label}</button>
        ))}
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          <button onClick={()=>{setModalCert(true);carregarCertsServidor()}} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:7,background:'#F3EEFF',color:'#6B3EC9',fontSize:12,fontWeight:600,border:'1px solid #6B3EC930',cursor:'pointer'}}><Shield size={12}/> Certificado e-CAC</button>
          <a href="https://cav.receita.fazenda.gov.br" target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:7,background:'#EBF5FF',color:'#1D6FA4',fontSize:12,fontWeight:600,border:'1px solid #1D6FA430',textDecoration:'none'}}><ExternalLink size={12}/> Abrir e-CAC</a>
        </div>
      </div>

      {/* ── Aba Consulta ── */}
      {aba==='consulta'&&(
        <div style={{flex:1,display:'flex',overflow:'hidden'}}>
          <div style={{width:290,background:'#fff',borderRight:'1px solid #e8e8e8',display:'flex',flexDirection:'column',flexShrink:0,overflowY:'auto'}}>
            <div style={{padding:'14px 16px',borderBottom:'1px solid #f0f0f0'}}>
              <div style={{fontSize:12,fontWeight:700,color:NAVY,marginBottom:8}}>Cliente</div>
              <select value={cliSel?.id||''} onChange={e=>{const c=clientes.find(x=>String(x.id)===e.target.value);setCliSel(c||null);setCertSel(null);setPortalSel([]);setResultados({})}} style={{...inp,cursor:'pointer',fontSize:12}}>
                <option value="">Selecione...</option>
                {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            {cliSel&&<>
              <div style={{padding:'12px 16px',borderBottom:'1px solid #f0f0f0',background:'#f8f9fb'}}>
                <div style={{fontSize:12,fontWeight:700,color:NAVY}}>{cliSel.nome}</div>
                <div style={{fontSize:11,color:'#888',fontFamily:'monospace',marginTop:2}}>{cliSel.cnpj}</div>
                <div style={{marginTop:8,display:'flex',alignItems:'center',gap:8}}>
                  <input type="checkbox" checked={procuracao[cliSel.id]||false} onChange={()=>toggleProcuracao(cliSel.id)} style={{accentColor:NAVY,width:14,height:14}}/>
                  <span style={{fontSize:11,color:NAVY,fontWeight:600}}>📜 Procuração e-CAC ativa</span>
                </div>
              </div>
              <div style={{padding:'12px 16px',flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#aaa',textTransform:'uppercase'}}>Relatórios</div>
                  <button onClick={()=>setPortalSel(portalSel.length===PORTAIS.length?[]:PORTAIS.map(p=>p.id))} style={{fontSize:10,color:NAVY,background:'none',border:'none',cursor:'pointer',fontWeight:600}}>{portalSel.length===PORTAIS.length?'Nenhum':'Todos'}</button>
                </div>
                <div style={{fontSize:9,color:NAVY,fontWeight:700,textTransform:'uppercase',marginBottom:5,padding:'3px 6px',background:'#EBF5FF',borderRadius:5}}>⚡ Automáticos</div>
                {PORTAIS.filter(p=>p.auto).map(p=>{const uc=ultimaConsulta(cliSel.id,p.id);return(
                  <label key={p.id} style={{display:'flex',alignItems:'flex-start',gap:7,padding:'5px 0',cursor:'pointer'}}>
                    <input type="checkbox" checked={portalSel.includes(p.id)} onChange={()=>togglePortal(p.id)} style={{accentColor:NAVY,width:13,height:13,marginTop:2}}/>
                    <div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:NAVY}}>{p.icon} {p.label}</div>{uc&&<div style={{fontSize:9,color:stCor(uc.status).cor}}>{stCor(uc.status).ic} {uc.status} · {fmtData(uc.data)}</div>}</div>
                  </label>
                )})}
                <div style={{fontSize:9,color:'#6B3EC9',fontWeight:700,textTransform:'uppercase',marginBottom:5,marginTop:10,padding:'3px 6px',background:'#F3EEFF',borderRadius:5}}>🔐 Requerem login</div>
                {PORTAIS.filter(p=>!p.auto).map(p=>{const uc=ultimaConsulta(cliSel.id,p.id);const bloq=p.requerCert&&!certSel&&!procuracao[cliSel.id];return(
                  <label key={p.id} style={{display:'flex',alignItems:'flex-start',gap:7,padding:'5px 0',cursor:bloq?'not-allowed':'pointer',opacity:bloq?.55:1}}>
                    <input type="checkbox" checked={portalSel.includes(p.id)} onChange={()=>!bloq&&togglePortal(p.id)} disabled={bloq} style={{accentColor:NAVY,width:13,height:13,marginTop:2}}/>
                    <div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:NAVY}}>{p.icon} {p.label}</div>{uc&&<div style={{fontSize:9,color:stCor(uc.status).cor}}>{stCor(uc.status).ic} {uc.status} · {fmtData(uc.data)}</div>}</div>
                  </label>
                )})}
              </div>
            </>}
          </div>
          <div style={{flex:1,overflowY:'auto',background:'#f8f9fb',padding:16}}>
            {!cliSel?(<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'#ccc'}}><FileText size={48} style={{marginBottom:12,opacity:.3}}/><div style={{fontSize:14,fontWeight:700}}>Selecione um cliente</div></div>
            ):portalSel.length===0?(<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'#ccc'}}><CheckCircle size={48} style={{marginBottom:12,opacity:.3}}/><div style={{fontSize:14,fontWeight:700}}>Selecione os relatórios</div></div>
            ):(
              <>
                <div style={{background:'#fff',borderRadius:10,padding:'12px 16px',marginBottom:14,border:'1px solid #e8e8e8',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                  <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:NAVY}}>{cliSel.nome}</div><div style={{fontSize:11,color:'#888'}}>{cliSel.cnpj} · {portalSel.length} relatório(s)</div></div>
                  <button onClick={()=>gerarRelatorioCliente(cliSel,resultados,historico)} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,background:'#FEF2F2',color:'#dc2626',fontWeight:700,fontSize:12,border:'1px solid #dc262630',cursor:'pointer'}}><Download size={11}/> Diagnóstico PDF</button>
                  {playwrightOk&&<button onClick={()=>setClienteEcacAtivo(cliSel)} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,background:'#F3EEFF',color:'#6B3EC9',fontWeight:700,fontSize:12,border:'1px solid #6B3EC930',cursor:'pointer'}}><Shield size={11}/> Baixar CND + Parcelamentos</button>}
                  <button onClick={consultarTodosAuto} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',borderRadius:9,background:NAVY,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer'}}><Zap size={14}/> Consultar Automaticamente</button>
                </div>
                {PORTAIS.filter(p=>portalSel.includes(p.id)).map(p=>{
                  const uc=ultimaConsulta(cliSel.id,p.id); const stUC=stCor(uc?.status); const loading=carregando[p.id]; const res=resultados[p.id]; const exp=expandidos[p.id]
                  const histRel=historico.filter(h=>String(h.cliente_id)===String(cliSel.id)&&h.relatorio_id===p.id)
                  return (
                    <div key={p.id} style={{background:'#fff',borderRadius:12,border:'1px solid #e8e8e8',marginBottom:10,overflow:'hidden'}}>
                      <div style={{padding:'14px 16px',display:'flex',alignItems:'flex-start',gap:12}}>
                        <div style={{width:42,height:42,borderRadius:10,background:p.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{p.icon}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}><span style={{fontSize:13,fontWeight:700,color:NAVY}}>{p.label}</span>{p.auto?<span style={{fontSize:9,padding:'1px 6px',borderRadius:5,background:'#EBF5FF',color:'#1D6FA4',fontWeight:700}}>⚡ AUTO</span>:<span style={{fontSize:9,padding:'1px 6px',borderRadius:5,background:'#F3EEFF',color:'#6B3EC9',fontWeight:700}}>🔐 MANUAL</span>}</div>
                          <div style={{fontSize:11,color:'#888'}}>{p.desc}</div>
                          {uc&&<div style={{fontSize:11,marginTop:4,color:stUC.cor,fontWeight:600}}>{stUC.ic} {uc.status} · {fmtData(uc.data)}</div>}
                          {loading&&<div style={{display:'flex',alignItems:'center',gap:7,marginTop:8,fontSize:12,color:'#888'}}><Loader size={13} style={{animation:'spin 1s linear infinite'}}/> Consultando...</div>}
                          {res&&!loading&&<RenderResultado portalId={p.id}/>}
                        </div>
                        <div style={{display:'flex',gap:6,flexShrink:0}}>
                          {p.auto?<button onClick={()=>consultarAuto(p)} disabled={loading} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,background:'#EBF5FF',color:'#1D6FA4',fontWeight:700,fontSize:12,border:'1px solid #1D6FA430',cursor:'pointer'}}>{loading?<Loader size={11} style={{animation:'spin 1s linear infinite'}}/>:<Zap size={11}/>} {loading?'Buscando...':'Buscar'}</button>:<button onClick={()=>window.open(p.url,'_blank')} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,background:p.bg,color:p.cor,fontWeight:700,fontSize:12,border:`1px solid ${p.cor}30`,cursor:'pointer'}}><ExternalLink size={11}/> Acessar</button>}
                          <button onClick={()=>setModalLog(p)} style={{padding:'6px 10px',borderRadius:8,background:'#f0f4ff',color:NAVY,fontWeight:600,fontSize:12,border:`1px solid ${NAVY}30`,cursor:'pointer'}}>📝</button>
                          {histRel.length>0&&<button onClick={()=>setExpandidos(e=>({...e,[p.id]:!e[p.id]}))} style={{padding:'6px 8px',borderRadius:8,background:'#f5f5f5',color:'#888',border:'none',cursor:'pointer'}}>{exp?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>}
                        </div>
                      </div>
                      {exp&&histRel.length>0&&(<div style={{borderTop:'1px solid #f0f0f0',padding:'8px 16px 12px'}}>{histRel.slice(0,4).map((h,i)=>{const s=stCor(h.status);return(<div key={h.id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 8px',borderRadius:7,background:i%2===0?'#fafafa':'#fff',marginBottom:2}}><span style={{fontSize:10,padding:'1px 6px',borderRadius:5,background:s.bg,color:s.cor,fontWeight:700}}>{s.ic} {h.status}</span><span style={{fontSize:11,color:'#555',flex:1}}>{h.obs||'—'}</span><span style={{fontSize:10,color:'#aaa'}}>{fmtData(h.data)} · {h.usuario}</span></div>)})}</div>)}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Aba Dashboard ── */}
      {aba==='dashboard'&&(
        <div style={{flex:1,overflowY:'auto',padding:'16px 20px',background:'#f8f9fb'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
            {[{n:clientes.filter(c=>c.ativo!==false).length,l:'Clientes Ativos',cor:'#1D6FA4',bg:'#EBF5FF',ic:Building2},{n:Object.values(procuracao).filter(Boolean).length,l:'Com Procuração e-CAC',cor:'#16a34a',bg:'#F0FDF4',ic:CheckCircle},{n:clientes.filter(c=>!procuracao[c.id]&&c.ativo!==false).length,l:'Sem Procuração',cor:'#f59e0b',bg:'#FEF9C3',ic:AlertTriangle},{n:clientesDash.filter(c=>c.pendente).length,l:'Com Pendências',cor:'#dc2626',bg:'#FEF2F2',ic:AlertTriangle}].map(s=>{const Ic=s.ic;return(<div key={s.l} style={{background:'#fff',borderRadius:12,padding:'14px 18px',border:`1px solid ${s.cor}20`,display:'flex',alignItems:'center',gap:12}}><div style={{width:42,height:42,borderRadius:10,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center'}}><Ic size={20} style={{color:s.cor}}/></div><div><div style={{fontSize:22,fontWeight:800,color:s.cor}}>{s.n}</div><div style={{fontSize:11,color:'#888'}}>{s.l}</div></div></div>)})}
          </div>
          <div style={{marginBottom:12}}><input value={filtroCliDash} onChange={e=>setFiltroCliDash(e.target.value)} placeholder="Filtrar cliente..." style={{...inp,maxWidth:300,fontSize:12}}/></div>
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #e8e8e8',overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:NAVY}}>{['Cliente','CNPJ','Regime','Procuração','Última Consulta','Situação','Ações'].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#fff',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
              <tbody>{clientesDash.filter(c=>c.ativo!==false).map((c,i)=>{
                const uc=c.histCli[0]; const st=stCor(uc?.status)
                return(<tr key={c.id} style={{background:i%2===0?'#fff':'#fafafa',borderBottom:'1px solid #f5f5f5'}}>
                  <td style={{padding:'10px 14px',fontWeight:600,color:NAVY,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.nome}</td>
                  <td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:11,color:'#555'}}>{c.cnpj}</td>
                  <td style={{padding:'10px 14px'}}><span style={{fontSize:10,padding:'2px 7px',borderRadius:6,background:'#EBF5FF',color:'#1D6FA4',fontWeight:600}}>{(c.tributacao||c.regime||'—').replace(' Nacional','').replace(' Presumido','')}</span></td>
                  <td style={{padding:'10px 14px'}}><button onClick={()=>toggleProcuracao(c.id)} style={{padding:'3px 9px',borderRadius:7,fontSize:11,fontWeight:700,border:'none',cursor:'pointer',background:procuracao[c.id]?'#F0FDF4':'#FEF2F2',color:procuracao[c.id]?'#16a34a':'#dc2626'}}>{procuracao[c.id]?'✓ Ativa':'✗ Inativa'}</button></td>
                  <td style={{padding:'10px 14px',fontSize:11,color:'#888'}}>{uc?<><b style={{color:'#555',display:'block'}}>{uc.relatorio?.split(' —')[0]}</b>{fmtData(uc.data)}</>:<span style={{color:'#ccc',fontStyle:'italic'}}>Não consultado</span>}</td>
                  <td style={{padding:'10px 14px'}}>{uc?<span style={{fontSize:11,padding:'3px 8px',borderRadius:8,fontWeight:700,background:st.bg,color:st.cor}}>{st.ic} {uc.status}</span>:<span style={{fontSize:11,padding:'3px 8px',borderRadius:8,background:'#f5f5f5',color:'#aaa',fontWeight:600}}>⭕ Não consultado</span>}</td>
                  <td style={{padding:'10px 14px'}}><div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                    <button onClick={()=>{setCliSel(c);setPortalSel(['cnpj_dados','simples','pgfn']);setAba('consulta')}} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:7,background:'#EBF5FF',color:'#1D6FA4',border:'none',cursor:'pointer',fontSize:11,fontWeight:600}}><Zap size={10}/> Consultar</button>
                    <button onClick={()=>gerarPDFFiscal(historico.filter(h=>String(h.cliente_id)===String(c.id)),clientes,c.nome)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:7,background:'#FEF2F2',color:'#dc2626',border:'none',cursor:'pointer',fontSize:11,fontWeight:600}}><Download size={10}/> PDF</button>
                    {playwrightOk&&<button onClick={()=>setClienteEcacAtivo(c)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:7,background:'#F3EEFF',color:'#6B3EC9',border:'1px solid #6B3EC930',cursor:'pointer',fontSize:11,fontWeight:600}}><Shield size={10}/> e-CAC</button>}
                  </div></td>
                </tr>)
              })}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Aba Histórico ── */}
      {aba==='historico'&&(
        <div style={{flex:1,overflowY:'auto',padding:'16px 20px',background:'#f8f9fb'}}>
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #e8e8e8',overflow:'hidden'}}>
            <div style={{padding:'12px 18px',borderBottom:'1px solid #f0f0f0',display:'flex',justifyContent:'space-between'}}><div style={{fontWeight:700,color:NAVY,fontSize:13}}>📋 Histórico de Consultas</div><span style={{fontSize:12,color:'#aaa'}}>{historico.length} registro(s)</span></div>
            {historico.length===0?<div style={{padding:40,textAlign:'center',color:'#ccc'}}>Nenhuma consulta registrada.</div>:(
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr style={{background:'#f8f9fb',borderBottom:'2px solid #e8e8e8'}}>{['Data','Cliente','Relatório','Status','Observações','Usuário'].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#888',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
                <tbody>{historico.map((h,i)=>{const s=stCor(h.status);return(<tr key={h.id} style={{background:i%2===0?'#fff':'#fafafa',borderBottom:'1px solid #f0f0f0'}}><td style={{padding:'9px 14px',color:'#555',whiteSpace:'nowrap'}}>{fmtData(h.data)}</td><td style={{padding:'9px 14px',fontWeight:600,color:NAVY}}>{h.cliente_nome}</td><td style={{padding:'9px 14px',fontSize:11,color:'#555'}}>{h.relatorio}</td><td style={{padding:'9px 14px'}}><span style={{fontSize:11,padding:'2px 8px',borderRadius:7,fontWeight:700,background:s.bg,color:s.cor}}>{s.ic} {h.status}</span></td><td style={{padding:'9px 14px',fontSize:11,color:'#888',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.obs||'—'}</td><td style={{padding:'9px 14px',fontSize:11,color:'#888'}}>{h.usuario}</td></tr>)})}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Aba PDF ── */}
      {aba==='pdf'&&(
        <div style={{flex:1,overflowY:'auto',padding:'20px',background:'#f8f9fb'}}>
          <div style={{maxWidth:700,margin:'0 auto',background:'#fff',borderRadius:12,padding:28,border:'1px solid #e8e8e8'}}>
            <div style={{fontWeight:700,color:NAVY,fontSize:16,marginBottom:6}}>📄 Gerar Relatório PDF</div>
            <div style={{fontSize:12,color:'#888',marginBottom:20}}>Relatório profissional com todas as consultas fiscais registradas.</div>
            <div style={{marginBottom:16}}><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:6,textTransform:'uppercase'}}>Filtrar por Cliente</label><select value={filtroCliDash} onChange={e=>setFiltroCliDash(e.target.value)} style={{...inp,maxWidth:400,cursor:'pointer'}}><option value="">Todos os clientes</option>{[...new Set(historico.map(h=>h.cliente_nome).filter(Boolean))].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
            <div style={{marginBottom:20,padding:'14px 16px',borderRadius:10,background:'#FEF2F2',border:'1px solid #fca5a5'}}>
              <div style={{fontSize:12,fontWeight:700,color:'#dc2626',marginBottom:10}}>📋 Diagnóstico Fiscal Individual</div>
              <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                <select value={filtroCliDash} onChange={e=>setFiltroCliDash(e.target.value)} style={{...inp,maxWidth:280,cursor:'pointer',fontSize:12}}><option value="">Selecione o cliente...</option>{clientes.filter(c=>c.ativo!==false).map(c=><option key={c.id} value={c.nome}>{c.nome}</option>)}</select>
                <button onClick={()=>{const cli=clientes.find(c=>c.nome===filtroCliDash);const res={};historico.filter(h=>String(h.cliente_id)===String(cli?.id)).forEach(h=>{if(!res[h.relatorio_id])res[h.relatorio_id]=h});gerarRelatorioCliente(cli,res,historico)}} disabled={!filtroCliDash} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 20px',borderRadius:9,background:filtroCliDash?'#dc2626':'#ccc',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:filtroCliDash?'pointer':'default'}}><Download size={14}/> Gerar Diagnóstico PDF</button>
                {playwrightOk&&filtroCliDash&&<button onClick={()=>setClienteEcacAtivo(clientes.find(c=>c.nome===filtroCliDash))} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 20px',borderRadius:9,background:'#6B3EC9',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer'}}><Shield size={14}/> Baixar CND + Parcelamentos</button>}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>{[{l:'Total',n:(filtroCliDash?historico.filter(h=>h.cliente_nome?.toLowerCase().includes(filtroCliDash.toLowerCase())):historico).length,c:NAVY},{l:'Clientes',n:[...new Set((filtroCliDash?historico.filter(h=>h.cliente_nome?.toLowerCase().includes(filtroCliDash.toLowerCase())):historico).map(h=>h.cliente_nome).filter(Boolean))].length,c:'#1D6FA4'},{l:'Pendências',n:(filtroCliDash?historico.filter(h=>h.cliente_nome?.toLowerCase().includes(filtroCliDash.toLowerCase())):historico).filter(h=>h.status?.includes('Pendente')||h.status==='Irregular').length,c:'#dc2626'}].map(s=>(<div key={s.l} style={{textAlign:'center',padding:'10px',borderRadius:8,background:'#f0f4ff',border:'1px solid #c7d7fd'}}><div style={{fontSize:22,fontWeight:800,color:s.c}}>{s.n}</div><div style={{fontSize:10,color:'#888'}}>{s.l}</div></div>))}</div>
            <button onClick={()=>gerarPDFFiscal(historico,clientes,filtroCliDash)} disabled={historico.length===0} style={{display:'flex',alignItems:'center',gap:8,padding:'12px 24px',borderRadius:10,background:historico.length>0?'#dc2626':'#ccc',color:'#fff',fontWeight:700,fontSize:14,border:'none',cursor:historico.length>0?'pointer':'default'}}><Download size={16}/> Gerar PDF</button>
          </div>
        </div>
      )}

      {/* Modal Download e-CAC */}
      {clienteEcacAtivo&&<ModalDownloadEcac cliente={clienteEcacAtivo} certServidor={certServidor} onClose={()=>setClienteEcacAtivo(null)}/>}

      {/* Modal Registrar */}
      {modalLog&&cliSel&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
          <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:460,padding:26}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}><div><div style={{fontWeight:700,color:NAVY,fontSize:14}}>📝 Registrar Resultado</div><div style={{fontSize:11,color:'#888',marginTop:2}}>{modalLog.icon} {modalLog.label} · {cliSel.nome}</div></div><button onClick={()=>setModalLog(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa'}}><X size={18}/></button></div>
            <div style={{marginBottom:10}}><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Data</label><input type="date" value={logForm.data} onChange={e=>setLogForm(f=>({...f,data:e.target.value}))} style={inp}/></div>
            <div style={{marginBottom:10}}><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Situação</label><select value={logForm.status} onChange={e=>setLogForm(f=>({...f,status:e.target.value}))} style={{...inp,cursor:'pointer'}}>{STATUS_OPTS.map(s=><option key={s}>{s}</option>)}</select></div>
            <div style={{marginBottom:18}}><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Observações</label><textarea value={logForm.obs} onChange={e=>setLogForm(f=>({...f,obs:e.target.value}))} style={{...inp,height:70,resize:'vertical',fontFamily:'inherit'}}/></div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button onClick={()=>setModalLog(null)} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:13}}>Cancelar</button><button onClick={registrarConsulta} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 22px',borderRadius:8,background:'#22c55e',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer'}}><CheckCircle size={14}/> Salvar</button></div>
          </div>
        </div>
      )}

      {/* Modal Certificado */}
      {modalCert&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
          <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:520,padding:26}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}><div style={{fontWeight:700,color:NAVY,fontSize:15}}>🔐 Certificado Digital — e-CAC</div><button onClick={()=>setModalCert(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa'}}><X size={18}/></button></div>
            {certServidor.length>0&&(<div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',marginBottom:8}}>Certificados no servidor</div>{certServidor.map(c=>(<div key={c.nome} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:8,background:'#F0FDF4',border:'1px solid #bbf7d0',marginBottom:6}}><Shield size={14} style={{color:'#16a34a'}}/><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:NAVY}}>{c.nome}</div><div style={{fontSize:10,color:'#aaa'}}>{c.tamanho_kb} KB</div></div>{cliSel&&<button onClick={()=>acessarEcacAutomatico(c.caminho)} disabled={ecacRodando} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:7,background:'#6B3EC9',color:'#fff',fontWeight:700,fontSize:11,border:'none',cursor:'pointer'}}>{ecacRodando?<><Loader size={11} style={{animation:'spin 1s linear infinite'}}/> Conectando...</>:'🤖 Usar no e-CAC'}</button>}</div>))}{ecacResultado&&<div style={{marginTop:8,padding:'10px 14px',borderRadius:8,background:ecacResultado.status==='conectado'?'#F0FDF4':'#FEF2F2',fontSize:12}}>{ecacResultado.status==='conectado'?<><b style={{color:'#16a34a'}}>✓ Conectado!</b> {ecacResultado.pagina}</>:<><b style={{color:'#dc2626'}}>✗ Erro:</b> {ecacResultado.mensagem||ecacResultado.detail}</>}</div>}</div>)}
            <div style={{marginBottom:14}}><div style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',marginBottom:8}}>Enviar certificado .pfx</div><div style={{padding:'14px 16px',borderRadius:10,background:GOLD+'08',border:`2px dashed ${GOLD}`}}><label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',marginBottom:10}}><div style={{padding:'8px 16px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:12}}>📁 Selecionar .pfx</div><span style={{fontSize:12,color:'#888'}}>{certUpload?certUpload.name:'Nenhum arquivo'}</span><input type="file" accept=".pfx,.p12" style={{display:'none'}} onChange={e=>{if(e.target.files[0]){setCertUpload(e.target.files[0]);setUploadStatus('')}}}/></label><div style={{marginBottom:10}}><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Senha</label><input type="password" value={certSenhaUp} onChange={e=>setCertSenhaUp(e.target.value)} placeholder="Senha do .pfx" style={{...inp,fontSize:13}}/></div><button onClick={fazerUploadCert} disabled={!certUpload||uploadStatus==='enviando'} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 18px',borderRadius:8,background:certUpload?'#22c55e':'#ccc',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:certUpload?'pointer':'default'}}>{uploadStatus==='enviando'?<><Loader size={13} style={{animation:'spin 1s linear infinite'}}/> Enviando...</>:'⬆ Enviar para o servidor'}</button>{uploadStatus.startsWith('ok')&&<div style={{marginTop:8,fontSize:11,color:'#16a34a',fontWeight:600}}>✓ Certificado enviado!</div>}{uploadStatus==='erro'&&<div style={{marginTop:8,fontSize:11,color:'#dc2626'}}>✗ Erro ao enviar.</div>}</div></div>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:16}}><button onClick={()=>setModalCert(false)} style={{padding:'8px 18px',borderRadius:8,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:13}}>Fechar</button></div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
