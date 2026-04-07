import { useState, useEffect, useRef } from 'react'
import { Search, Plus, X, Upload, Download, AlertTriangle, CheckCircle, Clock, Shield, User, Building2, Key, Loader, FileText, Send, Mail, MessageSquare } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'
const API  = '/api/v1'
const inp  = { padding:'7px 10px', borderRadius:6, border:'1px solid #ddd', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', color:'#333' }

// Usuário logado
const getUsuario = () => {
  try { return JSON.parse(localStorage.getItem('epimentel_user') || localStorage.getItem('usuario') || '{}') } catch { return {} }
}
const isAdmin = () => {
  const u = getUsuario()
  return u.perfil === 'Administrador' || u.perfil === 'admin'
}

const statusCert = (validade) => {
  if (!validade) return { label:'Sem data', cor:'#aaa', bg:'#f5f5f5', icon:'—', dias: null }
  const dias = Math.ceil((new Date(validade) - new Date()) / (1000*60*60*24))
  if (dias < 0)   return { label:'Vencido',  cor:'#dc2626', bg:'#FEF2F2', icon:'✗', dias }
  if (dias <= 30) return { label:`${dias}d`, cor:'#f59e0b', bg:'#FEF9C3', icon:'⚠', dias }
  if (dias <= 90) return { label:`${dias}d`, cor:'#3b82f6', bg:'#EFF6FF', icon:'⏳', dias }
  return             { label:'OK',          cor:'#16a34a', bg:'#F0FDF4', icon:'✓', dias }
}

const fmtData = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('pt-BR') } catch { return d } }

// ── Leitura automática do certificado ────────────────────────────────────────
const carregarForge = () => new Promise((resolve) => {
  if (window.forge) { resolve(); return }
  const s = document.createElement('script')
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/forge/1.3.1/forge.min.js'
  s.onload = resolve; s.onerror = () => resolve()
  document.head.appendChild(s)
})

const lerCertificado = async (arquivo, senha = '') => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const forge = window.forge
        if (!forge) { reject(new Error('forge não carregado')); return }
        const ext = arquivo.name.toLowerCase().split('.').pop()
        let cert = null
        if (ext === 'pfx' || ext === 'p12') {
          const bytes = new Uint8Array(e.target.result)
          let bin = ''; for (let i=0;i<bytes.length;i++) bin+=String.fromCharCode(bytes[i])
          const asn1 = forge.asn1.fromDer(bin)
          const pfx  = forge.pkcs12.pkcs12FromAsn1(asn1, senha)
          const bags  = pfx.getBags({ bagType: forge.pki.oids.certBag })
          cert = bags[forge.pki.oids.certBag]?.[0]?.cert
        } else if (ext === 'cer' || ext === 'crt') {
          const text = e.target.result
          cert = text.includes('-----BEGIN')
            ? forge.pki.certificateFromPem(text)
            : forge.pki.certificateFromAsn1(forge.asn1.fromDer((() => { const b=new Uint8Array(e.target.result); let s=''; for(let i=0;i<b.length;i++) s+=String.fromCharCode(b[i]); return s })()))
        }
        if (!cert) { reject(new Error('Não lido')); return }
        const getAttr = (attrs, t) => attrs.find(a=>a.shortName===t||a.type===t)?.value||''
        const subject = cert.subject.attributes
        const issuer  = cert.issuer.attributes
        const cn = getAttr(subject,'CN')
        const issuerO = getAttr(issuer,'O')||getAttr(issuer,'CN')
        const match = cn.match(/:(\d+)$/)
        const cnpjCpf = match?.[1]||''
        const nome = match ? cn.replace(/:(\d+)$/,'').trim() : cn
        const isPF = cnpjCpf.length===11
        const autorid = ['serasa','valid','certi','soluti','safe','caixa'].reduce((a,k)=>issuerO.toLowerCase().includes(k)?({'serasa':'Serasa','valid':'Valid','certi':'Certisign','soluti':'Soluti','safe':'Safeweb','caixa':'AC Caixa'}[k]):a,'ICP-Brasil')
        const fmt = d => new Date(d).toISOString().split('T')[0]
        resolve({ nome, cnpjCpf, tipo_pessoa: isPF?'PF':'PJ', validade:fmt(cert.validity.notAfter), emissao:fmt(cert.validity.notBefore), numero_serie:cert.serialNumber, autoridade_cert:autorid, arquivo_nome:arquivo.name })
      } catch(err) { reject(err) }
    }
    const ext = arquivo.name.toLowerCase().split('.').pop()
    if (ext==='cer') reader.readAsText(arquivo); else reader.readAsArrayBuffer(arquivo)
  })
}

// ── Geração de PDF com jsPDF ──────────────────────────────────────────────────
const carregarJsPDF = () => new Promise((resolve) => {
  if (window.jspdf) { resolve(window.jspdf.jsPDF); return }
  const s = document.createElement('script')
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  s.onload = () => resolve(window.jspdf.jsPDF)
  s.onerror = () => resolve(null)
  document.head.appendChild(s)
})

const gerarPDF = async (certs, filtro, clientes) => {
  const JsPDF = await carregarJsPDF()
  if (!JsPDF) { alert('Erro ao carregar gerador de PDF.'); return }

  const doc = new JsPDF({ orientation:'landscape', unit:'mm', format:'a4' })
  const W = 297, H = 210
  const NAVY_RGB = [27,42,74]
  const GOLD_RGB = [197,165,90]
  const hoje = new Date().toLocaleDateString('pt-BR')

  // ── Cabeçalho ──
  doc.setFillColor(...NAVY_RGB)
  doc.rect(0, 0, W, 28, 'F')
  doc.setTextColor(255,255,255)
  doc.setFontSize(16); doc.setFont('helvetica','bold')
  doc.text('EPimentel Auditoria & Contabilidade', 14, 11)
  doc.setFontSize(10); doc.setFont('helvetica','normal')
  doc.text('Relatório de Certificados Digitais', 14, 18)
  doc.setFontSize(9)
  doc.text(`Emitido em: ${hoje}`, W-14, 11, { align:'right' })
  doc.text(`CRC/GO 026.994/O-8`, W-14, 18, { align:'right' })

  // Linha dourada
  doc.setFillColor(...GOLD_RGB)
  doc.rect(0, 28, W, 1.5, 'F')

  // ── Resumo ──
  const vencidos = certs.filter(c=>{ const s=statusCert(c.validade); return s.dias!==null&&s.dias<0 }).length
  const alerta   = certs.filter(c=>{ const s=statusCert(c.validade); return s.dias!==null&&s.dias>=0&&s.dias<=90 }).length
  const ok       = certs.filter(c=>{ const s=statusCert(c.validade); return s.dias!==null&&s.dias>90 }).length

  const cards = [
    { l:'Total', n:certs.length, rgb:[29,111,164] },
    { l:'Válidos', n:ok, rgb:[22,163,74] },
    { l:'Alerta (90d)', n:alerta, rgb:[245,158,11] },
    { l:'Vencidos', n:vencidos, rgb:[220,38,38] },
  ]
  cards.forEach((c,i) => {
    const x = 14 + i*68
    doc.setFillColor(...c.rgb)
    doc.roundedRect(x, 33, 62, 16, 3, 3, 'F')
    doc.setTextColor(255,255,255)
    doc.setFontSize(18); doc.setFont('helvetica','bold')
    doc.text(String(c.n), x+10, 44)
    doc.setFontSize(8); doc.setFont('helvetica','normal')
    doc.text(c.l, x+10, 47)
  })

  // Filtro aplicado
  if (filtro) {
    doc.setTextColor(100,100,100); doc.setFontSize(8)
    doc.text(`Filtro: ${filtro}`, 14, 54)
  }

  // ── Tabela ──
  const cols = [
    { label:'Tipo',      w:16 },
    { label:'Cliente',   w:62 },
    { label:'Titular / CPF', w:52 },
    { label:'Validade',  w:24 },
    { label:'Status',    w:22 },
    { label:'Tipo Cert', w:20 },
    { label:'Autoridade',w:28 },
    { label:'Nº Série',  w:45 },
  ]

  let y = 59
  // Cabeçalho tabela
  doc.setFillColor(...NAVY_RGB)
  doc.rect(14, y, W-28, 7, 'F')
  doc.setTextColor(255,255,255); doc.setFontSize(7.5); doc.setFont('helvetica','bold')
  let x = 16
  cols.forEach(c => { doc.text(c.label, x, y+5); x+=c.w })

  y += 7
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5)

  certs.forEach((cert, i) => {
    if (y > H - 20) {
      doc.addPage()
      y = 20
      // Repetir cabeçalho tabela
      doc.setFillColor(...NAVY_RGB)
      doc.rect(14, y, W-28, 7, 'F')
      doc.setTextColor(255,255,255); doc.setFontSize(7.5); doc.setFont('helvetica','bold')
      let xh = 16
      cols.forEach(c => { doc.text(c.label, xh, y+5); xh+=c.w })
      y += 7; doc.setFont('helvetica','normal')
    }

    const st = statusCert(cert.validade)
    // Linha alternada
    if (i%2===0) { doc.setFillColor(248,249,251); doc.rect(14, y, W-28, 7, 'F') }
    else { doc.setFillColor(255,255,255); doc.rect(14, y, W-28, 7, 'F') }

    // Cor status
    const corSt = st.dias===null?[150,150,150]:st.dias<0?[220,38,38]:st.dias<=30?[245,158,11]:st.dias<=90?[59,130,246]:[22,163,74]

    doc.setTextColor(50,50,50)
    x = 16
    // Tipo
    doc.setTextColor(cert.tipo==='PF'?197:27, cert.tipo==='PF'?165:42, cert.tipo==='PF'?90:74)
    doc.setFont('helvetica','bold'); doc.text(cert.tipo, x, y+5); doc.setFont('helvetica','normal')
    x += cols[0].w

    // Cliente
    doc.setTextColor(50,50,50)
    doc.text((cert.cliente_nome||'—').substring(0,30), x, y+5)
    x += cols[1].w

    // Titular
    const titular = cert.tipo==='PF' ? `${(cert.responsavel_nome||'').substring(0,20)} ${cert.responsavel_cpf||''}` : (cert.responsavel_cpf||cert.cnpj||'—')
    doc.text(titular.substring(0,28), x, y+5)
    x += cols[2].w

    // Validade
    doc.text(fmtData(cert.validade), x, y+5)
    x += cols[3].w

    // Status
    doc.setTextColor(...corSt)
    doc.setFont('helvetica','bold')
    doc.text(`${st.icon} ${st.label}${st.dias!==null&&st.dias>=0&&st.dias<=90?' dias':''}`, x, y+5)
    doc.setFont('helvetica','normal'); doc.setTextColor(50,50,50)
    x += cols[4].w

    // Tipo Cert
    doc.text(cert.tipo_cert||'—', x, y+5); x += cols[5].w
    // Autoridade
    doc.text((cert.autoridade_cert||'—').substring(0,14), x, y+5); x += cols[6].w
    // Série
    doc.text((cert.numero_serie||'—').substring(0,20), x, y+5)

    y += 7
  })

  // Borda tabela
  doc.setDrawColor(220,220,220)
  doc.rect(14, 59, W-28, y-59)

  // ── Rodapé ──
  const pags = doc.getNumberOfPages()
  for (let p=1; p<=pags; p++) {
    doc.setPage(p)
    doc.setFillColor(...NAVY_RGB); doc.rect(0, H-10, W, 10, 'F')
    doc.setTextColor(255,255,255); doc.setFontSize(7)
    doc.text('EPimentel Auditoria & Contabilidade Ltda  ·  CRC/GO 026.994/O-8  ·  Documento gerado eletronicamente', 14, H-4)
    doc.text(`Pág. ${p}/${pags}`, W-14, H-4, { align:'right' })
  }

  doc.save(`EPimentel_Certificados_${hoje.replace(/\//g,'-')}.pdf`)
}

// ── Alertas WhatsApp / Email ──────────────────────────────────────────────────
const gerarMensagemAlerta = (cert) => {
  const st = statusCert(cert.validade)
  const titular = cert.tipo==='PF' ? cert.responsavel_nome : cert.cliente_nome
  const status  = st.dias<0 ? `*VENCIDO há ${Math.abs(st.dias)} dias*` : `vence em *${st.dias} dias* (${fmtData(cert.validade)})`
  return `🔐 *Alerta de Certificado Digital — EPimentel*\n\n` +
    `Empresa: *${cert.cliente_nome}*\n` +
    (cert.tipo==='PF'?`Titular: *${titular}*\n`:'')+
    `Tipo: *${cert.tipo} — ${cert.tipo_cert||'A1'}*\n` +
    `Status: O certificado ${status}.\n\n` +
    `Por favor, providencie a renovação para evitar problemas operacionais.\n\n` +
    `_EPimentel Auditoria & Contabilidade — CRC/GO 026.994/O-8_`
}

const CERT_VAZIO = {
  tipo:'PJ', cliente_id:'', cliente_nome:'', responsavel_nome:'', responsavel_cpf:'',
  numero_serie:'', validade:'', emissao:'', arquivo_nome:'', observacoes:'',
  autoridade_cert:'ICP-Brasil', tipo_cert:'A1',
}

export default function Certificados() {
  const [certs,       setCerts]       = useState([])
  const [clientes,    setClientes]    = useState([])
  const [form,        setForm]        = useState(CERT_VAZIO)
  const [aba,         setAba]         = useState('lista')
  const [editId,      setEditId]      = useState(null)
  const [busca,       setBusca]       = useState('')
  const [filtroTipo,  setFiltroTipo]  = useState('')
  const [filtroSt,    setFiltroSt]    = useState('')
  const [modalExc,    setModalExc]    = useState(null)
  const [sociosSel,   setSociosSel]   = useState([])
  const [lendo,       setLendo]       = useState(false)
  const [modalSenha,  setModalSenha]  = useState(null)
  const [senha,       setSenha]       = useState('')
  const [erroLeitura, setErroLeitura] = useState('')
  const [modalAlerta, setModalAlerta] = useState(null)
  const [gerandoPDF,  setGerandoPDF]  = useState(false)
  const [modalPDF,    setModalPDF]    = useState(false)
  const [filtrosPDF,  setFiltrosPDF]  = useState({ tipo:'', status:'', titulo:'Relatório de Certificados Digitais' })
  const fileRef = useRef()
  const admin   = isAdmin()

  useEffect(() => {
    carregarForge()
    try { setClientes(JSON.parse(localStorage.getItem('ep_clientes')||'[]')) } catch {}
    try { setCerts(JSON.parse(localStorage.getItem('ep_certificados')||'[]')) } catch {}
    fetch(`${API}/certificados/`).then(r=>r.ok?r.json():{}).then(d=>{
      const lista = d.certificados||d||[]
      if (lista.length>0) {
        const local = JSON.parse(localStorage.getItem('ep_certificados')||'[]')
        const merged = lista.map(b=>{ const l=local.find(x=>String(x.id)===String(b.id)); return l?{...b,...l}:b })
        local.forEach(l=>{ if(!merged.find(m=>String(m.id)===String(l.id))) merged.push(l) })
        setCerts(merged); localStorage.setItem('ep_certificados', JSON.stringify(merged))
      }
    }).catch(()=>{})
  }, [])

  const setF = (k,v) => setForm(f=>({...f,[k]:v}))

  const onClienteChange = (cliId) => {
    setF('cliente_id', cliId)
    const cli = clientes.find(c=>String(c.id)===String(cliId))
    setF('cliente_nome', cli?.nome||'')
    setSociosSel(cli?.responsaveis||[])
  }

  const onSocioChange = (nome) => {
    if (!nome) { setF('responsavel_nome',''); setF('responsavel_cpf',''); return }
    const s = sociosSel.find(x=>x.nome===nome)
    if (s) { setF('responsavel_nome', s.nome); setF('responsavel_cpf', s.cpf_cnpj||'') }
  }

  const onArquivoSelecionado = async (arquivo) => {
    setErroLeitura('')
    const ext = arquivo.name.toLowerCase().split('.').pop()
    if (ext==='pfx'||ext==='p12') { setModalSenha(arquivo); setSenha(''); return }
    await processarArquivo(arquivo, '')
  }

  const processarArquivo = async (arquivo, senhaArq) => {
    setLendo(true); setErroLeitura('')
    try {
      await carregarForge()
      const info = await lerCertificado(arquivo, senhaArq)
      aplicarDadosCert(info); setModalSenha(null); setSenha('')
    } catch (err) {
      if (err.message?.includes('password')||err.message?.includes('mac')||err.message?.includes('integrity')) {
        setErroLeitura('Senha incorreta.')
      } else {
        setErroLeitura('Preencha manualmente.'); setF('arquivo_nome', arquivo.name); setModalSenha(null)
      }
    }
    setLendo(false)
  }

  const aplicarDadosCert = (info) => {
    const tipo = info.tipo_pessoa||form.tipo
    setF('tipo', tipo); setF('arquivo_nome', info.arquivo_nome); setF('validade', info.validade)
    setF('emissao', info.emissao); setF('numero_serie', info.numero_serie); setF('autoridade_cert', info.autoridade_cert)
    if (tipo==='PF') { setF('responsavel_nome', info.nome); setF('responsavel_cpf', info.cnpjCpf) }
    const cliMatch = clientes.find(c=>
      (info.cnpjCpf && c.cnpj?.replace(/\D/g,'')===info.cnpjCpf) ||
      info.nome?.toLowerCase().includes((c.nome||'').toLowerCase().split(' ')[0])
    )
    if (cliMatch) { setF('cliente_id', cliMatch.id); setF('cliente_nome', cliMatch.nome); setSociosSel(cliMatch.responsaveis||[]) }
  }

  const salvar = () => {
    const novoCert = { ...form, id: editId||Date.now() }
    const nova = editId ? certs.map(x=>x.id===editId?novoCert:x) : [...certs, novoCert]
    setCerts(nova); localStorage.setItem('ep_certificados', JSON.stringify(nova))
    try {
      const metodo = editId?'PUT':'POST'
      fetch(editId?`${API}/certificados/${editId}`:`${API}/certificados/`, { method:metodo, headers:{'Content-Type':'application/json'}, body:JSON.stringify(novoCert) })
    } catch {}
    setForm(CERT_VAZIO); setEditId(null); setAba('lista')
  }

  const excluir = (id) => {
    if (!admin) return
    const nova = certs.filter(x=>x.id!==id)
    setCerts(nova); localStorage.setItem('ep_certificados', JSON.stringify(nova)); setModalExc(null)
  }

  const editar = (c) => {
    setForm({...CERT_VAZIO,...c}); setEditId(c.id); setAba('cadastro')
    const cli = clientes.find(x=>String(x.id)===String(c.cliente_id))
    setSociosSel(cli?.responsaveis||[])
  }

  // ── Gerar PDF personalizado ──
  const handleGerarPDF = async () => {
    setGerandoPDF(true)
    const certsFiltradosPDF = certs.filter(c=>{
      if (filtrosPDF.tipo && c.tipo!==filtrosPDF.tipo) return false
      if (filtrosPDF.status) {
        const st = statusCert(c.validade)
        if (filtrosPDF.status==='ok'      && !(st.dias!==null&&st.dias>90)) return false
        if (filtrosPDF.status==='alerta'  && !(st.dias!==null&&st.dias>=0&&st.dias<=90)) return false
        if (filtrosPDF.status==='vencido' && !(st.dias!==null&&st.dias<0)) return false
      }
      return true
    })
    await gerarPDF(certsFiltradosPDF, filtrosPDF.tipo||filtrosPDF.status?`Tipo: ${filtrosPDF.tipo||'Todos'} | Status: ${filtrosPDF.status||'Todos'}`:'', clientes)
    setGerandoPDF(false); setModalPDF(false)
  }

  // ── Alerta automático WhatsApp/Email ──
  const enviarAlertaWhatsApp = (cert, numero) => {
    const msg = encodeURIComponent(gerarMensagemAlerta(cert))
    const tel = (numero||'').replace(/\D/g,'')
    window.open(`https://wa.me/55${tel}?text=${msg}`, '_blank')
  }

  const enviarAlertaEmail = (cert, email) => {
    const assunto = encodeURIComponent(`Certificado Digital — ${cert.cliente_nome} — ${statusCert(cert.validade).dias<0?'VENCIDO':'A vencer'}`)
    const corpo   = encodeURIComponent(gerarMensagemAlerta(cert).replace(/\*/g,'').replace(/\n/g,'%0A'))
    window.open(`mailto:${email}?subject=${assunto}&body=${corpo}`)
  }

  const certsFiltrados = certs.filter(c=>{
    if (busca && !c.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) && !c.responsavel_nome?.toLowerCase().includes(busca.toLowerCase()) && !c.numero_serie?.includes(busca)) return false
    if (filtroTipo && c.tipo!==filtroTipo) return false
    if (filtroSt) {
      const st = statusCert(c.validade)
      if (filtroSt==='ok'      && !(st.dias!==null&&st.dias>90)) return false
      if (filtroSt==='alerta'  && !(st.dias!==null&&st.dias>=0&&st.dias<=90)) return false
      if (filtroSt==='vencido' && !(st.dias!==null&&st.dias<0)) return false
    }
    return true
  })

  // Alertas automáticos — certs vencidos ou vencendo em 30d
  const certsAlerta = certs.filter(c=>{ const s=statusCert(c.validade); return s.dias!==null&&s.dias>=0&&s.dias<=30 })
  const certsVencidos = certs.filter(c=>{ const s=statusCert(c.validade); return s.dias!==null&&s.dias<0 })

  const vencidos  = certs.filter(c=>{ const s=statusCert(c.validade); return s.dias!==null&&s.dias<0 }).length
  const alerta30  = certs.filter(c=>{ const s=statusCert(c.validade); return s.dias!==null&&s.dias>=0&&s.dias<=30 }).length
  const ok        = certs.filter(c=>{ const s=statusCert(c.validade); return s.dias!==null&&s.dias>90 }).length

  // Contatos do escritório (para alertas)
  const ESCRITORIO = { whatsapp:'62999999999', email:'epimentel@epimentel.com.br' }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 44px)', fontFamily:'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', display:'flex', alignItems:'center', padding:'0 16px' }}>
        <button onClick={()=>setAba('lista')} style={{ padding:'11px 16px', fontSize:13, fontWeight:aba==='lista'?700:400, color:aba==='lista'?NAVY:'#999', background:'none', border:'none', borderBottom:aba==='lista'?`2px solid ${GOLD}`:'2px solid transparent', cursor:'pointer' }}>
          Certificados Digitais
        </button>
        {aba==='cadastro'&&<button style={{ padding:'11px 16px', fontSize:13, fontWeight:700, color:NAVY, background:'none', border:'none', borderBottom:`2px solid ${GOLD}`, cursor:'default' }}>{editId?'Editar':'Novo Certificado'}</button>}
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          {aba==='lista'&&<>
            <button onClick={()=>setModalPDF(true)} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, background:'#FEF2F2', color:'#dc2626', fontSize:12, fontWeight:600, border:'1px solid #fca5a5', cursor:'pointer' }}>
              <FileText size={13}/> Relatório PDF
            </button>
          </>}
          <button onClick={()=>{setForm(CERT_VAZIO);setEditId(null);setAba('cadastro')}} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, background:NAVY, color:'#fff', fontWeight:600, fontSize:12, border:'none', cursor:'pointer' }}>
            <Plus size={13}/> Novo Certificado
          </button>
        </div>
      </div>

      {/* ── LISTA ── */}
      {aba==='lista' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Alertas automáticos banner */}
          {(certsVencidos.length>0||certsAlerta.length>0) && (
            <div style={{ background:'#FEF2F2', borderBottom:'1px solid #fca5a5', padding:'8px 16px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <AlertTriangle size={16} style={{ color:'#dc2626', flexShrink:0 }}/>
              <span style={{ fontSize:12, color:'#dc2626', fontWeight:600 }}>
                {certsVencidos.length>0&&`${certsVencidos.length} certificado(s) VENCIDO(S)`}
                {certsVencidos.length>0&&certsAlerta.length>0&&' · '}
                {certsAlerta.length>0&&`${certsAlerta.length} vence(m) em até 30 dias`}
              </span>
              <div style={{ display:'flex', gap:6, marginLeft:'auto', flexWrap:'wrap' }}>
                {[...certsVencidos,...certsAlerta].slice(0,3).map(c=>(
                  <button key={c.id} onClick={()=>setModalAlerta(c)}
                    style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:7, background:'#dc2626', color:'#fff', border:'none', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                    <Send size={10}/> {c.cliente_nome?.split(' ')[0]}
                  </button>
                ))}
                {([...certsVencidos,...certsAlerta]).length>3&&(
                  <button onClick={()=>setFiltroSt('alerta')} style={{ padding:'4px 10px', borderRadius:7, background:'#FEF2F2', color:'#dc2626', border:'1px solid #fca5a5', cursor:'pointer', fontSize:11 }}>
                    +{([...certsVencidos,...certsAlerta]).length-3} mais
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Cards resumo */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, padding:'12px 16px', background:'#f8f9fb', borderBottom:'1px solid #e8e8e8' }}>
            {[
              { n:certs.length, l:'Total',        c:'#1D6FA4', bg:'#EBF5FF', ic:Shield },
              { n:vencidos,     l:'Vencidos',      c:'#dc2626', bg:'#FEF2F2', ic:AlertTriangle },
              { n:alerta30,     l:'Vencem em 30d', c:'#f59e0b', bg:'#FEF9C3', ic:Clock },
              { n:ok,           l:'Válidos',       c:'#16a34a', bg:'#F0FDF4', ic:CheckCircle },
            ].map(s=>{ const Ic=s.ic; return (
              <div key={s.l} style={{ background:'#fff', borderRadius:10, padding:'12px 16px', border:`1px solid ${s.c}20`, display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center' }}><Ic size={20} style={{ color:s.c }}/></div>
                <div><div style={{ fontSize:22, fontWeight:800, color:s.c }}>{s.n}</div><div style={{ fontSize:11, color:'#888' }}>{s.l}</div></div>
              </div>
            )})}
          </div>

          {/* Filtros */}
          <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', padding:'8px 16px', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ position:'relative', flex:1, maxWidth:320 }}>
              <Search size={12} style={{ position:'absolute', left:8, top:8, color:'#bbb' }}/>
              <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar cliente, titular ou série..." style={{ ...inp, paddingLeft:26 }}/>
            </div>
            <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)} style={{ ...inp, width:140, cursor:'pointer' }}>
              <option value="">Todos os tipos</option>
              <option value="PJ">🏢 PJ — Empresa</option>
              <option value="PF">👤 PF — Sócio/Titular</option>
            </select>
            <select value={filtroSt} onChange={e=>setFiltroSt(e.target.value)} style={{ ...inp, width:150, cursor:'pointer' }}>
              <option value="">Todos os status</option>
              <option value="ok">✓ Válidos</option>
              <option value="alerta">⚠ A vencer (90d)</option>
              <option value="vencido">✗ Vencidos</option>
            </select>
            {(busca||filtroTipo||filtroSt)&&<button onClick={()=>{setBusca('');setFiltroTipo('');setFiltroSt('')}} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:7, background:'#fee2e2', color:'#dc2626', border:'1px solid #fca5a5', fontSize:11, fontWeight:600, cursor:'pointer' }}><X size={11}/> Limpar</button>}
            <span style={{ fontSize:12, color:'#aaa', marginLeft:'auto' }}>{certsFiltrados.length} certificado(s)</span>
          </div>

          {/* Tabela */}
          <div style={{ flex:1, overflowY:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#fff', borderBottom:'2px solid #e8e8e8', position:'sticky', top:0, zIndex:1 }}>
                  {['Tipo','Cliente / Titular','Validade','Status','Nº Série','Autoridade','Tipo Cert','Alertas','Ações'].map(h=>(
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {certsFiltrados.map((c,i)=>{
                  const st   = statusCert(c.validade)
                  const isPF = c.tipo==='PF'
                  const needAlert = st.dias!==null&&st.dias<=30
                  return (
                    <tr key={c.id} style={{ background:needAlert?'#FFFBEB':i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0' }}>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:8, fontSize:11, fontWeight:700, background:isPF?GOLD+'20':NAVY+'15', color:isPF?'#854D0E':NAVY }}>
                          {isPF?<User size={11}/>:<Building2 size={11}/>} {c.tipo}
                        </span>
                      </td>
                      <td style={{ padding:'9px 12px' }}>
                        <div style={{ fontWeight:600, color:NAVY, fontSize:12 }}>{c.cliente_nome||'—'}</div>
                        {isPF&&c.responsavel_nome&&<div style={{ fontSize:11, color:'#888', marginTop:1 }}>👤 {c.responsavel_nome} {c.responsavel_cpf?`· ${c.responsavel_cpf}`:''}</div>}
                        {c.arquivo_nome&&<div style={{ fontSize:10, color:'#aaa', marginTop:1 }}>📎 {c.arquivo_nome}</div>}
                      </td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:'#555' }}>{fmtData(c.validade)}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ padding:'3px 9px', borderRadius:8, fontSize:11, fontWeight:700, background:st.bg, color:st.cor }}>
                          {st.icon} {st.label}{st.dias!==null&&st.dias>=0&&st.dias<=90?' dias':''}
                        </span>
                      </td>
                      <td style={{ padding:'9px 12px', fontFamily:'monospace', fontSize:10, color:'#888' }}>{(c.numero_serie||'—').slice(0,16)}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:'#555' }}>{c.autoridade_cert||'—'}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:'#555' }}>{c.tipo_cert||'—'}</td>
                      <td style={{ padding:'9px 12px' }}>
                        {needAlert||st.dias<0 ? (
                          <button onClick={()=>setModalAlerta(c)} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 9px', borderRadius:7, background:'#FEF2F2', color:'#dc2626', border:'1px solid #fca5a5', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                            <Send size={10}/> Alertar
                          </button>
                        ) : <span style={{ color:'#ccc', fontSize:11 }}>—</span>}
                      </td>
                      <td style={{ padding:'9px 12px' }}>
                        <div style={{ display:'flex', gap:5 }}>
                          <button onClick={()=>editar(c)} style={{ padding:'4px 9px', borderRadius:6, background:'#EBF5FF', color:'#1D6FA4', border:'none', cursor:'pointer', fontSize:11 }}>✏️</button>
                          {admin
                            ? <button onClick={()=>setModalExc(c)} style={{ padding:'4px 9px', borderRadius:6, background:'#FEF2F2', color:'#dc2626', border:'none', cursor:'pointer', fontSize:11 }}>🗑️</button>
                            : <button title="Somente Administrador pode excluir" style={{ padding:'4px 9px', borderRadius:6, background:'#f5f5f5', color:'#ccc', border:'none', cursor:'not-allowed', fontSize:11 }}>🔒</button>
                          }
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {certsFiltrados.length===0&&<tr><td colSpan={9} style={{ padding:40, textAlign:'center', color:'#ccc' }}>Nenhum certificado encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CADASTRO ── */}
      {aba==='cadastro' && (
        <div style={{ flex:1, overflowY:'auto', padding:20, background:'#f8f9fb' }}>
          <div style={{ maxWidth:780, margin:'0 auto', background:'#fff', borderRadius:12, padding:24, border:'1px solid #e8e8e8' }}>

            {/* Importar */}
            <div style={{ marginBottom:20, padding:'16px 18px', borderRadius:10, background:lendo?'#f0f4ff':GOLD+'06', border:`2px solid ${lendo?NAVY:GOLD}40` }}>
              <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
                <Key size={14}/> Importar Certificado Digital
                <span style={{ fontSize:10, fontWeight:400, color:'#888' }}>— Preenchimento automático</span>
              </div>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:9, background:NAVY, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', flexShrink:0 }}>
                  {lendo?<><Loader size={14} style={{ animation:'spin 1s linear infinite' }}/> Lendo...</>:<><Upload size={14}/> Selecionar arquivo</>}
                  <input ref={fileRef} type="file" accept=".pfx,.p12,.cer,.crt" style={{ display:'none' }} disabled={lendo} onChange={e=>{ if(e.target.files[0]) onArquivoSelecionado(e.target.files[0]) }}/>
                </label>
                {form.arquivo_nome&&<div style={{ flex:1, padding:'9px 14px', borderRadius:8, background:'#F0FDF4', border:'1px solid #bbf7d0', fontSize:12, color:'#166534' }}>✓ <b>{form.arquivo_nome}</b>{form.validade&&<span style={{ marginLeft:8, color:'#888' }}>· Válido até {fmtData(form.validade)}</span>}</div>}
                {erroLeitura&&<div style={{ flex:1, padding:'9px 14px', borderRadius:8, background:'#FEF9C3', border:'1px solid #fde68a', fontSize:12, color:'#854D0E' }}>⚠ {erroLeitura}</div>}
                {!form.arquivo_nome&&!erroLeitura&&<div style={{ fontSize:11, color:'#aaa' }}>Suporta .pfx, .p12, .cer, .crt</div>}
              </div>
            </div>

            {/* Tipo */}
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:'#888', fontWeight:700, display:'block', marginBottom:8, textTransform:'uppercase' }}>Tipo de Certificado</label>
              <div style={{ display:'flex', gap:10 }}>
                {[['PJ','🏢 PJ — Empresa (CNPJ)'],['PF','👤 PF — Pessoa Física (Sócio/Titular)']].map(([v,l])=>(
                  <button key={v} onClick={()=>setF('tipo',v)} style={{ flex:1, padding:'12px 16px', borderRadius:10, cursor:'pointer', border:`2px solid ${form.tipo===v?NAVY:'#ddd'}`, background:form.tipo===v?NAVY:'#fff', color:form.tipo===v?'#fff':'#888', fontWeight:form.tipo===v?700:400, fontSize:13 }}>{l}</button>
                ))}
              </div>
            </div>

            {/* Cliente + Tipo Cert */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Empresa / Cliente *</label>
                <select value={form.cliente_id} onChange={e=>onClienteChange(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  <option value="">Selecione...</option>
                  {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Tipo de Certificação</label>
                <select value={form.tipo_cert} onChange={e=>setF('tipo_cert',e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  <option value="A1">A1 — Software (sem token)</option>
                  <option value="A3">A3 — Token/Cartão</option>
                  <option value="A4">A4 — Cartão com leitor</option>
                </select>
              </div>
            </div>

            {/* Campos PF */}
            {form.tipo==='PF' && (
              <div style={{ marginBottom:14, padding:'14px 16px', borderRadius:10, background:GOLD+'08', border:`2px solid ${GOLD}40` }}>
                <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:10 }}>👤 Titular Pessoa Física</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Sócio Cadastrado</label>
                    <select value={form.responsavel_nome} onChange={e=>onSocioChange(e.target.value)} style={{ ...inp, cursor:'pointer' }} disabled={sociosSel.length===0}>
                      <option value="">— Selecione ou preencha —</option>
                      {sociosSel.map((s,i)=><option key={i} value={s.nome}>{s.nome}{s.cargo?` (${s.cargo})`:''}{s.cpf_cnpj?` — ${s.cpf_cnpj}`:''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Nome Completo *</label>
                    <input value={form.responsavel_nome} onChange={e=>setF('responsavel_nome',e.target.value)} placeholder="Nome completo" style={inp}/>
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>CPF *</label>
                    <input value={form.responsavel_cpf} onChange={e=>setF('responsavel_cpf',e.target.value)} placeholder="000.000.000-00" style={inp}/>
                  </div>
                </div>
              </div>
            )}

            {/* Dados */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:14 }}>
              <div><label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Emissão</label><input type="date" value={form.emissao} onChange={e=>setF('emissao',e.target.value)} style={inp}/></div>
              <div><label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Validade *</label><input type="date" value={form.validade} onChange={e=>setF('validade',e.target.value)} style={inp}/></div>
              <div>
                <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Autoridade Certificadora</label>
                <select value={form.autoridade_cert} onChange={e=>setF('autoridade_cert',e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  {['ICP-Brasil','Serasa','Valid','Certisign','Soluti','Safeweb','AC Caixa','Outro'].map(a=><option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div><label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Número de Série</label><input value={form.numero_serie} onChange={e=>setF('numero_serie',e.target.value)} placeholder="Preenchido automaticamente" style={inp}/></div>
              <div><label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Nome do Arquivo</label><input value={form.arquivo_nome} onChange={e=>setF('arquivo_nome',e.target.value)} placeholder="certificado.pfx" style={inp}/></div>
            </div>

            {form.validade&&(()=>{ const st=statusCert(form.validade); return (
              <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:9, background:st.bg, border:`1px solid ${st.cor}30`, display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:18 }}>{st.icon}</span>
                <span style={{ fontSize:12, color:st.cor, fontWeight:600 }}>{st.dias===null?'Data inválida':st.dias<0?`Vencido há ${Math.abs(st.dias)} dias`:st.dias===0?'Vence hoje':`Vence em ${st.dias} dias — ${fmtData(form.validade)}`}</span>
              </div>
            )})()}

            <div style={{ marginBottom:16 }}><label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Observações</label><textarea value={form.observacoes} onChange={e=>setF('observacoes',e.target.value)} style={{ ...inp, height:60, resize:'vertical', fontFamily:'inherit' }}/></div>

            <div style={{ display:'flex', justifyContent:'space-between', paddingTop:14, borderTop:'1px solid #f0f0f0' }}>
              <button onClick={()=>{setForm(CERT_VAZIO);setEditId(null);setAba('lista')}} style={{ padding:'8px 16px', borderRadius:8, background:'#f5f5f5', color:'#555', fontSize:13, border:'none', cursor:'pointer' }}>Cancelar</button>
              <button onClick={salvar} disabled={!form.cliente_id||!form.validade} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 22px', borderRadius:8, background:form.cliente_id&&form.validade?'#22c55e':'#ccc', color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:form.cliente_id&&form.validade?'pointer':'default' }}>
                <Shield size={14}/> Salvar Certificado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal PDF ── */}
      {modalPDF && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:460, padding:26 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <div style={{ fontWeight:700, color:NAVY, fontSize:15 }}>📄 Relatório PDF Personalizado</div>
              <button onClick={()=>setModalPDF(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#aaa' }}><X size={18}/></button>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Título do relatório</label>
              <input value={filtrosPDF.titulo} onChange={e=>setFiltrosPDF(f=>({...f,titulo:e.target.value}))} style={{ ...inp, fontSize:13 }}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Filtrar por Tipo</label>
                <select value={filtrosPDF.tipo} onChange={e=>setFiltrosPDF(f=>({...f,tipo:e.target.value}))} style={{ ...inp, cursor:'pointer' }}>
                  <option value="">Todos (PJ + PF)</option>
                  <option value="PJ">🏢 Somente PJ</option>
                  <option value="PF">👤 Somente PF</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Filtrar por Status</label>
                <select value={filtrosPDF.status} onChange={e=>setFiltrosPDF(f=>({...f,status:e.target.value}))} style={{ ...inp, cursor:'pointer' }}>
                  <option value="">Todos os status</option>
                  <option value="ok">✓ Somente Válidos</option>
                  <option value="alerta">⚠ Somente Alertas</option>
                  <option value="vencido">✗ Somente Vencidos</option>
                </select>
              </div>
            </div>
            <div style={{ padding:'10px 14px', borderRadius:8, background:'#f0f4ff', border:'1px solid #c7d7fd', fontSize:12, color:NAVY, marginBottom:18 }}>
              {(()=>{
                const n = certs.filter(c=>{
                  if (filtrosPDF.tipo && c.tipo!==filtrosPDF.tipo) return false
                  if (filtrosPDF.status) { const s=statusCert(c.validade); if(filtrosPDF.status==='ok'&&!(s.dias>90)) return false; if(filtrosPDF.status==='alerta'&&!(s.dias>=0&&s.dias<=90)) return false; if(filtrosPDF.status==='vencido'&&!(s.dias<0)) return false }
                  return true
                }).length
                return <><b>{n}</b> certificado(s) serão incluídos no PDF</>
              })()}
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>setModalPDF(false)} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #ddd', background:'#fff', cursor:'pointer', fontSize:13 }}>Cancelar</button>
              <button onClick={handleGerarPDF} disabled={gerandoPDF} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 22px', borderRadius:8, background:'#dc2626', color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
                {gerandoPDF?<><Loader size={13} style={{ animation:'spin 1s linear infinite' }}/> Gerando...</>:<><FileText size={13}/> Gerar PDF</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Alerta ── */}
      {modalAlerta && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:500, padding:26 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontWeight:700, color:NAVY, fontSize:14 }}>🔔 Enviar Alerta de Vencimento</div>
              <button onClick={()=>setModalAlerta(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#aaa' }}><X size={18}/></button>
            </div>

            {/* Info certificado */}
            <div style={{ padding:'12px 14px', borderRadius:9, background:'#FEF2F2', border:'1px solid #fca5a5', marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:NAVY }}>{modalAlerta.cliente_nome}</div>
              {modalAlerta.tipo==='PF'&&<div style={{ fontSize:12, color:'#888', marginTop:2 }}>👤 {modalAlerta.responsavel_nome}</div>}
              <div style={{ fontSize:12, color:'#dc2626', marginTop:4, fontWeight:600 }}>
                {(()=>{ const s=statusCert(modalAlerta.validade); return s.dias<0?`VENCIDO há ${Math.abs(s.dias)} dias`:`Vence em ${s.dias} dias (${fmtData(modalAlerta.validade)})` })()}
              </div>
            </div>

            {/* Preview mensagem */}
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:6 }}>Mensagem que será enviada:</label>
              <div style={{ padding:'10px 14px', borderRadius:8, background:'#f8f9fb', border:'1px solid #e8e8e8', fontSize:11, color:'#555', whiteSpace:'pre-line', maxHeight:120, overflowY:'auto', fontFamily:'monospace' }}>
                {gerarMensagemAlerta(modalAlerta)}
              </div>
            </div>

            {/* Botões de envio */}
            <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:10 }}>Enviar para o escritório:</div>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              <button onClick={()=>enviarAlertaWhatsApp(modalAlerta, ESCRITORIO.whatsapp)}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px 14px', borderRadius:9, background:'#22c55e', color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
                <MessageSquare size={14}/> WhatsApp Escritório
              </button>
              <button onClick={()=>enviarAlertaEmail(modalAlerta, ESCRITORIO.email)}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px 14px', borderRadius:9, background:'#3b82f6', color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
                <Mail size={14}/> E-mail Escritório
              </button>
            </div>

            {/* Envio para o cliente */}
            {(()=>{
              const cli = clientes.find(c=>String(c.id)===String(modalAlerta.cliente_id))
              const contatos = cli?.contatos||[]
              const wpp = contatos.find(c=>c.whatsapp)?.whatsapp || cli?.whatsapp
              const email = contatos.find(c=>c.email)?.email || cli?.email
              if (!wpp&&!email) return null
              return (
                <>
                  <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:10 }}>Enviar para o cliente:</div>
                  <div style={{ display:'flex', gap:8 }}>
                    {wpp&&<button onClick={()=>enviarAlertaWhatsApp(modalAlerta, wpp)}
                      style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'9px 14px', borderRadius:9, background:'#EDFBF1', color:'#166534', fontWeight:700, fontSize:12, border:'1px solid #bbf7d0', cursor:'pointer' }}>
                      <MessageSquare size={13}/> WhatsApp Cliente
                    </button>}
                    {email&&<button onClick={()=>enviarAlertaEmail(modalAlerta, email)}
                      style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'9px 14px', borderRadius:9, background:'#EFF6FF', color:'#1D4ED8', fontWeight:700, fontSize:12, border:'1px solid #bfdbfe', cursor:'pointer' }}>
                      <Mail size={13}/> E-mail Cliente
                    </button>}
                  </div>
                </>
              )
            })()}

            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
              <button onClick={()=>setModalAlerta(null)} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid #ddd', background:'#fff', cursor:'pointer', fontSize:13 }}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Senha PFX */}
      {modalSenha && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:400 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, maxWidth:400, width:'90%' }}>
            <div style={{ fontWeight:700, color:NAVY, fontSize:14, marginBottom:6 }}>🔐 Senha do Certificado</div>
            <div style={{ fontSize:12, color:'#888', marginBottom:16 }}><b>{modalSenha.name}</b></div>
            {erroLeitura&&<div style={{ padding:'8px 12px', borderRadius:7, background:'#FEF2F2', border:'1px solid #fca5a5', fontSize:12, color:'#dc2626', marginBottom:12 }}>{erroLeitura}</div>}
            <input type="password" value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={e=>e.key==='Enter'&&processarArquivo(modalSenha,senha)} placeholder="Senha do certificado..." autoFocus style={{ ...inp, marginBottom:16, fontSize:14 }}/>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>{ setModalSenha(null); setF('arquivo_nome', modalSenha.name); setErroLeitura('') }} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #ddd', background:'#fff', cursor:'pointer', fontSize:13 }}>Manual</button>
              <button onClick={()=>processarArquivo(modalSenha,senha)} disabled={lendo} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 20px', borderRadius:8, background:NAVY, color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
                {lendo?<><Loader size={13}/> Lendo...</>:<><Key size={13}/> Confirmar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Excluir */}
      {modalExc && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, maxWidth:380, width:'90%', textAlign:'center' }}>
            <AlertTriangle size={36} style={{ color:'#dc2626', marginBottom:12 }}/>
            <div style={{ fontSize:15, fontWeight:700, color:NAVY, marginBottom:8 }}>Excluir Certificado?</div>
            <div style={{ fontSize:13, color:'#666', marginBottom:4 }}>{modalExc.cliente_nome}</div>
            {modalExc.tipo==='PF'&&<div style={{ fontSize:12, color:'#888', marginBottom:16 }}>👤 {modalExc.responsavel_nome}</div>}
            <div style={{ padding:'8px 12px', borderRadius:8, background:'#FEF2F2', border:'1px solid #fca5a5', fontSize:11, color:'#dc2626', marginBottom:16 }}>
              ⚠ Somente <b>Administradores</b> podem excluir certificados.
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={()=>setModalExc(null)} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid #ddd', background:'#fff', cursor:'pointer', fontSize:13 }}>Cancelar</button>
              <button onClick={()=>excluir(modalExc.id)} style={{ padding:'8px 20px', borderRadius:8, background:'#dc2626', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:13, border:'none' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
