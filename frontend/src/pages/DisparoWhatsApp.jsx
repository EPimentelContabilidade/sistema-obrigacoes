import { useState, useEffect, useRef } from 'react'
import { Send, Upload, FileText, CheckCircle, Loader, Search, Users, MessageSquare,
         Clock, CheckCheck, AlertTriangle, X, Plus, Zap, Eye, RefreshCw, ChevronDown } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'
const WPP  = '#25D366'
const API = window.location.hostname === 'localhost' ? '/api/v1' : 'https://api.epimentel.com.br/api/v1'

const inp = { padding:'7px 10px', borderRadius:7, border:'1px solid #ddd', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', color:'#333' }
const sel = { ...inp, cursor:'pointer', background:'#fff' }

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const mesAtual = () => { const d = new Date(); return `${MESES[d.getMonth()]}/${d.getFullYear()}` }

// ── Status badge ──────────────────────────────────────────────────────────────
function Badge({ status }) {
  const cfg = {
    enviado:  { bg:'#EBF5FF', color:'#1D6FA4', icon:'✓',  label:'Enviado' },
    lida:     { bg:'#EDFBF1', color:'#1A7A3C', icon:'✓✓', label:'Lida' },
    erro:     { bg:'#FEF2F2', color:'#dc2626', icon:'✕',  label:'Erro' },
    pendente: { bg:'#FEF9C3', color:'#854D0E', icon:'⏳', label:'Pendente' },
  }
  const c = cfg[status] || cfg.pendente
  return (
    <span style={{ fontSize:10, padding:'2px 7px', borderRadius:10, background:c.bg, color:c.color, fontWeight:700, whiteSpace:'nowrap' }}>
      {c.icon} {c.label}
    </span>
  )
}

export default function DisparoWhatsApp() {
  const [aba, setAba] = useState('disparar')

  const [clientes, setClientes]       = useState([])
  const [templates, setTemplates]     = useState([])
  const [historico, setHistorico]     = useState([])
  const [wppStatus, setWppStatus]     = useState(null)
  const [equipe, setEquipe]           = useState([])
  const [deptos, setDeptos]           = useState([])
  const [equipeEdit, setEquipeEdit]   = useState({})
  const [salvarEqId, setSalvarEqId]   = useState(null)
  const [testando, setTestando]       = useState({})

  // ── Form disparo único ────────────────────────────────────────────────────
  const [clienteSel, setClienteSel]   = useState(null)
  const [buscaCliente, setBuscaCliente] = useState('')
  const [dropCliente, setDropCliente] = useState(false)
  const [templateSel, setTemplateSel] = useState('guia_mensal')
  const [mesRef, setMesRef]           = useState(mesAtual())
  const [vencimento, setVencimento]   = useState('')
  const [obrigacao, setObrigacao]     = useState('')
  const [valor, setValor]             = useState('')
  const [obra, setObra]               = useState('')
  const [msgPreview, setMsgPreview]   = useState('')
  const [arquivo, setArquivo]         = useState(null)
  const [base64PDF, setBase64PDF]     = useState(null)
  const [enviando, setEnviando]       = useState(false)
  const [resultadoEnvio, setResultadoEnvio] = useState(null)
  const fileRef = useRef()

  // ── Form leitura de PDF ───────────────────────────────────────────────────
  const [dadosPDF, setDadosPDF]       = useState(null)
  const [lendoPDF, setLendoPDF]       = useState(false)
  const pdfRef = useRef()

  // ── Form disparo em lote ──────────────────────────────────────────────────
  const [clientesLote, setClientesLote] = useState([])
  const [buscaLote, setBuscaLote]       = useState('')
  const [enviandoLote, setEnviandoLote] = useState(false)
  const [resultadoLote, setResultadoLote] = useState(null)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    // Clientes do localStorage
    try {
      const local = localStorage.getItem('ep_clientes')
      if (local) setClientes(JSON.parse(local))
    } catch {}
    // Templates e histórico do backend
    try {
      const [tRes, hRes, wRes] = await Promise.all([
        fetch(`${API}/disparos/templates`),
        fetch(`${API}/disparos/historico?limite=50`),
        fetch(`${API}/whatsapp/status`),
      ])
      if (tRes.ok) setTemplates(await tRes.json())
      if (hRes.ok) setHistorico(await hRes.json())
      if (wRes.ok) setWppStatus(await wRes.json())
    } catch {}
  }

  // Atualizar preview da mensagem ao mudar campos
  useEffect(() => {
    const tpl = templates.find(t => t.id === templateSel)
    if (!tpl || !clienteSel) { setMsgPreview(''); return }
    const msg = tpl.corpo
      .replace(/\{cliente_nome\}/g, clienteSel.nome || '')
      .replace(/\{obrigacao\}/g, obrigacao || '—')
      .replace(/\{mes_ref\}/g, mesRef || '—')
      .replace(/\{vencimento\}/g, vencimento || '—')
      .replace(/\{valor\}/g, valor || '—')
      .replace(/\{obra\}/g, obra || '—')
    setMsgPreview(msg)
  }, [templateSel, clienteSel, obrigacao, mesRef, vencimento, valor, obra, templates])

  const lerArquivo = (file) => {
    if (!file) return
    setArquivo(file)
    const reader = new FileReader()
    reader.onload = ev => {
      const bytes = new Uint8Array(ev.target.result)
      let b64 = ''
      for (let i = 0; i < bytes.length; i += 8192)
        b64 += String.fromCharCode(...bytes.subarray(i, i + 8192))
      setBase64PDF(btoa(b64))
    }
    reader.readAsArrayBuffer(file)
  }

  const lerPDF = async (file) => {
    if (!file) return
    lerArquivo(file)
    setLendoPDF(true); setDadosPDF(null)
    const fd = new FormData()
    fd.append('arquivo', file)
    try {
      const r = await fetch(`${API}/disparos/ler-pdf`, { method:'POST', body:fd })
      if (r.ok) {
        const dados = await r.json()
        setDadosPDF(dados)
        // Auto-preencher campos
        if (dados.tipo_obrigacao) setObrigacao(dados.tipo_obrigacao)
        if (dados.vencimento) setVencimento(dados.vencimento)
        if (dados.valor) setValor(dados.valor)
        // Tentar encontrar cliente pelo CNPJ
        if (dados.cnpj) {
          const cnpjLimpo = dados.cnpj.replace(/\D/g, '')
          const cli = clientes.find(c => (c.cnpj||'').replace(/\D/g,'') === cnpjLimpo)
          if (cli) setClienteSel(cli)
        }
      }
    } catch {}
    setLendoPDF(false)
  }

  const enviarDisparo = async () => {
    if (!clienteSel) { alert('Selecione um cliente'); return }
    const tel = clienteSel.whatsapp || clienteSel.whatsapp2 || clienteSel.telefone
    if (!tel) { alert('Cliente sem número de WhatsApp cadastrado'); return }
    if (!msgPreview) { alert('Configure a mensagem'); return }

    setEnviando(true); setResultadoEnvio(null)
    try {
      const r = await fetch(`${API}/disparos/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id:    clienteSel.id,
          telefone:      tel,
          mensagem:      msgPreview,
          obrigacao_nome: obrigacao,
          template_id:   templateSel,
          nome_arquivo:  arquivo?.name || null,
          base64_pdf:    base64PDF || null,
        }),
      })
      const data = await r.json()
      if (r.ok) {
        setResultadoEnvio({ ok: true, msg: `Enviado para ${data.cliente}!`, numero: data.numero })
        setHistorico(h => [{ id: Date.now(), cliente_nome: data.cliente, telefone: data.numero, obrigacao, status:'enviado', criado_em: new Date().toLocaleString('pt-BR') }, ...h])
      } else {
        setResultadoEnvio({ ok: false, msg: data.detail || 'Erro ao enviar' })
      }
    } catch (e) {
      setResultadoEnvio({ ok: false, msg: e.message })
    }
    setEnviando(false)
  }

  const toggleLote = (id) => {
    setClientesLote(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])
  }

  const enviarLote = async () => {
    if (clientesLote.length === 0) { alert('Selecione ao menos um cliente'); return }
    setEnviandoLote(true); setResultadoLote(null)
    try {
      const r = await fetch(`${API}/disparos/enviar-lote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          obrigacao_nome: obrigacao,
          mes_ref:        mesRef,
          vencimento:     vencimento,
          template_id:    templateSel,
          clientes_ids:   clientesLote,
          base64_pdf:     base64PDF || null,
          nome_arquivo:   arquivo?.name || null,
        }),
      })
      const data = await r.json()
      setResultadoLote(data)
    } catch (e) {
      setResultadoLote({ ok: false, erro: e.message })
    }
    setEnviandoLote(false)
  }

  const clientesFiltrados = clientes.filter(c => {
    const q = buscaCliente.toLowerCase()
    return !q || (c.nome||'').toLowerCase().includes(q) || (c.cnpj||'').includes(q)
  })

  const clientesFiltradosLote = clientes.filter(c => {
    const q = buscaLote.toLowerCase()
    return !q || (c.nome||'').toLowerCase().includes(q) || (c.cnpj||'').includes(q)
  })

  // ── Render ────────────────────────────────────────────────────────────────

  useEffect(() => {
    function loadEquipe() {
      const users = JSON.parse(localStorage.getItem('ep_usuarios') || '[]')
      const depts = JSON.parse(localStorage.getItem('ep_departamentos_admin') || '[]')
      setEquipe(users); setDeptos(Array.isArray(depts) ? depts : [])
    }
    loadEquipe()
    window.addEventListener('storage', loadEquipe)
    return () => window.removeEventListener('storage', loadEquipe)
  }, [])

  function salvarWppMembro(uid, numero) {
    const users = JSON.parse(localStorage.getItem('ep_usuarios') || '[]')
    const updated = users.map(u => (u.id||u.email) === uid ? {...u, whatsapp: numero} : u)
    localStorage.setItem('ep_usuarios', JSON.stringify(updated))
    setEquipe(updated); setSalvarEqId(uid)
    setTimeout(() => setSalvarEqId(null), 2500)
  }

  async function testarWppMembro(m) {
    if (!m.whatsapp) { alert('Configure o WhatsApp do funcionário primeiro'); return }
    const uid = m.id||m.email
    setTestando(p => ({...p, [uid]: true}))
    const num = m.whatsapp.replace(/\D/g,'')
    const fone = num.length <= 11 ? '55' + num : num
    try {
      const r = await fetch(API + '/whatsapp/enviar', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ numero: fone, mensagem: 'Olá ' + m.nome + '! Teste do Sistema EPimentel. Canal ativo ✅' }),
        signal: AbortSignal.timeout(15000)
      })
      const d = await r.json()
      alert(d.ok || d.status==='enviado' ? '✅ Enviado para '+m.nome : '⚠️ '+(d.erro||JSON.stringify(d).slice(0,80)))
    } catch(e) { alert('Erro: '+e.message) }
    setTestando(p => ({...p, [uid]: false}))
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 44px)', fontFamily:'Inter,system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ background:NAVY, padding:'12px 20px', display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ width:38,height:38,borderRadius:9,background:WPP,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <MessageSquare size={20} color="#fff"/>
        </div>
        <div>
          <div style={{ color:'#fff',fontWeight:700,fontSize:14 }}>Disparo WhatsApp</div>
          <div style={{ color:GOLD,fontSize:11 }}>Envio automático de obrigações e documentos</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
          {/* Status WhatsApp */}
          <div style={{ display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:8,background:'rgba(255,255,255,.1)' }}>
            <div style={{ width:8,height:8,borderRadius:'50%',background:wppStatus?.status==='ok'?WPP:'#f87171' }}/>
            <span style={{ fontSize:11,color:'#fff',fontWeight:600 }}>
              {wppStatus?.status==='ok'?'WhatsApp conectado':'WhatsApp desconectado'}
            </span>
          </div>
          {[
            { n:historico.filter(h=>h.status==='enviado').length, l:'Enviados' },
            { n:historico.filter(h=>h.status==='lida').length,    l:'Lidos' },
            { n:historico.filter(h=>h.status==='erro').length,    l:'Erros' },
          ].map(s => (
            <div key={s.l} style={{ textAlign:'center',padding:'4px 12px',borderRadius:8,background:'rgba(255,255,255,.08)' }}>
              <div style={{ color:GOLD,fontWeight:700,fontSize:15 }}>{s.n}</div>
              <div style={{ color:'rgba(255,255,255,.5)',fontSize:10 }}>{s.l}</div>
            </div>
          ))}
          <button onClick={carregarDados} style={{ padding:'6px 10px',borderRadius:7,background:'rgba(255,255,255,.1)',border:'none',cursor:'pointer',color:'#fff' }}>
            <RefreshCw size={14}/>
          </button>
        </div>
      </div>

      {/* Abas */}
      <div style={{ background:'#fff',borderBottom:'1px solid #e8e8e8',display:'flex',paddingLeft:16 }}>
        {[
          { id:'disparar',  label:'📤 Enviar' },
          { id:'lote',      label:'👥 Envio em Lote' },
          { id:'templates', label:'📋 Templates' },
          { id:'historico', label:'🕐 Histórico' },
          { id:'equipe', label:'👥 Equipe' },
        ].map(a => (
          <button key={a.id} onClick={()=>setAba(a.id)} style={{ padding:'10px 16px',fontSize:12,fontWeight:aba===a.id?700:400,color:aba===a.id?NAVY:'#999',background:'none',border:'none',borderBottom:aba===a.id?`2px solid ${GOLD}`:'2px solid transparent',cursor:'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ flex:1,overflowY:'auto',background:'#f8f9fb',padding:20 }}>

        {/* ── ABA: ENVIAR ────────────────────────────────────────────────── */}
        {aba === 'disparar' && (
          <div style={{ maxWidth:900,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>

            {/* Coluna esquerda — configuração */}
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>

              {/* Upload PDF com leitura automática */}
              <div style={{ background:'#fff',borderRadius:12,border:'1px solid #e8e8e8',padding:16 }}>
                <div style={{ fontSize:13,fontWeight:700,color:NAVY,marginBottom:12 }}>📎 Documento PDF</div>
                <div
                  onClick={()=>pdfRef.current?.click()}
                  style={{ border:`2px dashed ${arquivo?WPP:'#e8e8e8'}`,borderRadius:10,padding:20,textAlign:'center',cursor:'pointer',background:arquivo?'#F0FDF4':'#fafafa',transition:'all .2s' }}
                >
                  {lendoPDF ? (
                    <><Loader size={24} style={{ color:GOLD,marginBottom:8,animation:'spin 1s linear infinite' }}/><div style={{ fontSize:12,color:NAVY }}>Lendo PDF...</div></>
                  ) : arquivo ? (
                    <>
                      <FileText size={24} style={{ color:WPP,marginBottom:6 }}/>
                      <div style={{ fontSize:12,fontWeight:700,color:NAVY }}>{arquivo.name}</div>
                      {dadosPDF && (
                        <div style={{ marginTop:8,display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap' }}>
                          {dadosPDF.tipo_obrigacao && <span style={{ fontSize:10,padding:'2px 8px',borderRadius:10,background:NAVY+'15',color:NAVY,fontWeight:700 }}>{dadosPDF.tipo_obrigacao}</span>}
                          {dadosPDF.vencimento    && <span style={{ fontSize:10,padding:'2px 8px',borderRadius:10,background:'#FEF9C3',color:'#854D0E',fontWeight:700 }}>Venc: {dadosPDF.vencimento}</span>}
                          {dadosPDF.valor         && <span style={{ fontSize:10,padding:'2px 8px',borderRadius:10,background:'#EDFBF1',color:'#1A7A3C',fontWeight:700 }}>{dadosPDF.valor}</span>}
                          {dadosPDF.cnpj          && <span style={{ fontSize:10,padding:'2px 8px',borderRadius:10,background:'#F3EEFF',color:'#6B3EC9',fontWeight:600 }}>{dadosPDF.cnpj}</span>}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <Upload size={24} style={{ color:'#ccc',marginBottom:8 }}/>
                      <div style={{ fontSize:12,color:'#888' }}>Clique para selecionar o PDF</div>
                      <div style={{ fontSize:10,color:'#bbb',marginTop:4 }}>O sistema lerá CNPJ, vencimento e valor automaticamente</div>
                    </>
                  )}
                </div>
                <input ref={pdfRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={e=>lerPDF(e.target.files[0])}/>
                {arquivo && <button onClick={()=>{setArquivo(null);setBase64PDF(null);setDadosPDF(null)}} style={{ marginTop:8,width:'100%',padding:'5px',borderRadius:7,background:'#fee2e2',color:'#dc2626',border:'none',cursor:'pointer',fontSize:11 }}>✕ Remover arquivo</button>}
              </div>

              {/* Seleção de cliente */}
              <div style={{ background:'#fff',borderRadius:12,border:'1px solid #e8e8e8',padding:16 }}>
                <div style={{ fontSize:13,fontWeight:700,color:NAVY,marginBottom:10 }}>👤 Cliente</div>
                <div style={{ position:'relative' }}>
                  <div style={{ display:'flex',gap:8 }}>
                    <div style={{ position:'relative',flex:1 }}>
                      <Search size={12} style={{ position:'absolute',left:8,top:9,color:'#bbb' }}/>
                      <input
                        value={clienteSel ? clienteSel.nome : buscaCliente}
                        onChange={e=>{ setBuscaCliente(e.target.value); setClienteSel(null); setDropCliente(true) }}
                        onFocus={()=>setDropCliente(true)}
                        placeholder="Buscar cliente..."
                        style={{ ...inp,paddingLeft:26,fontSize:12 }}
                      />
                    </div>
                    {clienteSel && <button onClick={()=>{setClienteSel(null);setBuscaCliente('')}} style={{ padding:'5px 8px',borderRadius:7,background:'#fee2e2',color:'#dc2626',border:'none',cursor:'pointer' }}><X size={13}/></button>}
                  </div>
                  {dropCliente && !clienteSel && (
                    <div style={{ position:'absolute',top:'100%',left:0,right:0,zIndex:50,background:'#fff',border:'1px solid #ddd',borderRadius:8,boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxHeight:220,overflowY:'auto' }}>
                      {clientesFiltrados.slice(0,12).map(c=>(
                        <div key={c.id} onClick={()=>{setClienteSel(c);setDropCliente(false);setBuscaCliente('')}}
                          style={{ padding:'9px 12px',cursor:'pointer',borderBottom:'1px solid #f5f5f5' }}
                          onMouseEnter={e=>e.currentTarget.style.background='#f8f9fb'}
                          onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                          <div style={{ fontSize:12,fontWeight:600,color:NAVY }}>{c.nome}</div>
                          <div style={{ fontSize:10,color:'#888' }}>{c.cnpj} {c.whatsapp?'· 📱 '+c.whatsapp:''}{!c.whatsapp&&!c.telefone?' · ⚠ Sem telefone':''}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {dropCliente && !clienteSel && <div style={{ position:'fixed',inset:0,zIndex:49 }} onClick={()=>setDropCliente(false)}/>}
                </div>
                {clienteSel && (
                  <div style={{ marginTop:10,padding:'8px 12px',borderRadius:8,background:'#EBF5FF',border:'1px solid #bfdbfe' }}>
                    <div style={{ fontSize:12,fontWeight:700,color:NAVY }}>{clienteSel.nome}</div>
                    <div style={{ fontSize:11,color:'#555',marginTop:2 }}>
                      {clienteSel.cnpj} · {clienteSel.tributacao||'—'}<br/>
                      📱 {clienteSel.whatsapp||clienteSel.telefone||<span style={{color:'#dc2626'}}>Sem telefone</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* Campos da obrigação */}
              <div style={{ background:'#fff',borderRadius:12,border:'1px solid #e8e8e8',padding:16 }}>
                <div style={{ fontSize:13,fontWeight:700,color:NAVY,marginBottom:12 }}>📋 Dados da Obrigação</div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                  <div>
                    <label style={{ fontSize:11,fontWeight:600,color:'#888',display:'block',marginBottom:3 }}>Obrigação *</label>
                    <input value={obrigacao} onChange={e=>setObrigacao(e.target.value)} placeholder="Ex: DAS Mensal, DARF IRPJ..." style={{ ...inp,fontSize:12 }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:11,fontWeight:600,color:'#888',display:'block',marginBottom:3 }}>Mês de Referência</label>
                    <input value={mesRef} onChange={e=>setMesRef(e.target.value)} placeholder="Ex: Abril/2026" style={{ ...inp,fontSize:12 }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:11,fontWeight:600,color:'#888',display:'block',marginBottom:3 }}>Vencimento</label>
                    <input value={vencimento} onChange={e=>setVencimento(e.target.value)} placeholder="Ex: 30/04/2026" style={{ ...inp,fontSize:12 }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:11,fontWeight:600,color:'#888',display:'block',marginBottom:3 }}>Valor</label>
                    <input value={valor} onChange={e=>setValor(e.target.value)} placeholder="Ex: R$ 1.240,00" style={{ ...inp,fontSize:12 }}/>
                  </div>
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={{ fontSize:11,fontWeight:600,color:'#888',display:'block',marginBottom:3 }}>Obra / CNO (construção civil)</label>
                    <input value={obra} onChange={e=>setObra(e.target.value)} placeholder="Ex: Residencial Vila Verde — CNO 12.345.67890/00" style={{ ...inp,fontSize:12 }}/>
                  </div>
                </div>
              </div>

              {/* Template */}
              <div style={{ background:'#fff',borderRadius:12,border:'1px solid #e8e8e8',padding:16 }}>
                <div style={{ fontSize:13,fontWeight:700,color:NAVY,marginBottom:10 }}>📝 Template de Mensagem</div>
                <select value={templateSel} onChange={e=>setTemplateSel(e.target.value)} style={{ ...sel,fontSize:12 }}>
                  {templates.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
            </div>

            {/* Coluna direita — preview + enviar */}
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <div style={{ background:'#fff',borderRadius:12,border:'1px solid #e8e8e8',padding:16,flex:1 }}>
                <div style={{ fontSize:13,fontWeight:700,color:NAVY,marginBottom:12 }}>📱 Preview da Mensagem</div>
                <div style={{ background:'#ECE5DD',borderRadius:10,padding:16,minHeight:280 }}>
                  {arquivo && (
                    <div style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:'#fff',marginBottom:10,boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
                      <FileText size={22} style={{ color:NAVY }}/>
                      <div>
                        <div style={{ fontSize:12,fontWeight:700,color:NAVY }}>{arquivo.name}</div>
                        <div style={{ fontSize:10,color:'#888' }}>PDF · {(arquivo.size/1024).toFixed(0)} KB</div>
                      </div>
                    </div>
                  )}
                  {msgPreview ? (
                    <div style={{ background:NAVY,borderRadius:'12px 2px 12px 12px',padding:'10px 14px',color:'#fff',fontSize:13,lineHeight:1.5,whiteSpace:'pre-wrap',wordBreak:'break-word',boxShadow:'0 1px 4px rgba(0,0,0,.15)' }}>
                      {msgPreview}
                      <div style={{ fontSize:10,color:'rgba(255,255,255,.5)',marginTop:6,textAlign:'right' }}>
                        {new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} ✓
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign:'center',padding:40,color:'#aaa',fontSize:12 }}>
                      Selecione um cliente e template<br/>para ver o preview
                    </div>
                  )}
                </div>
              </div>

              {/* Resultado do envio */}
              {resultadoEnvio && (
                <div style={{ padding:'12px 16px',borderRadius:10,background:resultadoEnvio.ok?'#EDFBF1':'#FEF2F2',border:`1px solid ${resultadoEnvio.ok?'#86efac':'#fca5a5'}` }}>
                  <div style={{ fontSize:13,fontWeight:700,color:resultadoEnvio.ok?'#166534':'#991B1B' }}>
                    {resultadoEnvio.ok ? '✅ '+resultadoEnvio.msg : '❌ '+resultadoEnvio.msg}
                  </div>
                  {resultadoEnvio.numero && <div style={{ fontSize:11,color:'#888',marginTop:2 }}>Número: {resultadoEnvio.numero}</div>}
                </div>
              )}

              <button onClick={enviarDisparo} disabled={enviando||!clienteSel||!msgPreview}
                style={{ padding:14,borderRadius:10,background:enviando||!clienteSel||!msgPreview?'#ccc':WPP,color:'#fff',fontWeight:700,fontSize:14,border:'none',cursor:enviando||!clienteSel||!msgPreview?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
                {enviando ? <><Loader size={17} style={{ animation:'spin 1s linear infinite' }}/> Enviando...</> : <><Send size={17}/> Enviar via WhatsApp</>}
              </button>
            </div>
          </div>
        )}

        {/* ── ABA: ENVIO EM LOTE ────────────────────────────────────────── */}
        {aba === 'lote' && (
          <div style={{ maxWidth:900,margin:'0 auto' }}>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
              <div style={{ display:'flex',flexDirection:'column',gap:12 }}>

                {/* Configuração */}
                <div style={{ background:'#fff',borderRadius:12,border:'1px solid #e8e8e8',padding:16 }}>
                  <div style={{ fontSize:13,fontWeight:700,color:NAVY,marginBottom:12 }}>⚙️ Configuração do Lote</div>
                  <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                    <div>
                      <label style={{ fontSize:11,fontWeight:600,color:'#888',display:'block',marginBottom:3 }}>Obrigação *</label>
                      <input value={obrigacao} onChange={e=>setObrigacao(e.target.value)} placeholder="Ex: DAS Mensal" style={{ ...inp,fontSize:12 }}/>
                    </div>
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                      <div>
                        <label style={{ fontSize:11,fontWeight:600,color:'#888',display:'block',marginBottom:3 }}>Mês ref.</label>
                        <input value={mesRef} onChange={e=>setMesRef(e.target.value)} style={{ ...inp,fontSize:12 }}/>
                      </div>
                      <div>
                        <label style={{ fontSize:11,fontWeight:600,color:'#888',display:'block',marginBottom:3 }}>Vencimento</label>
                        <input value={vencimento} onChange={e=>setVencimento(e.target.value)} placeholder="30/04/2026" style={{ ...inp,fontSize:12 }}/>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize:11,fontWeight:600,color:'#888',display:'block',marginBottom:3 }}>Template</label>
                      <select value={templateSel} onChange={e=>setTemplateSel(e.target.value)} style={{ ...sel,fontSize:12 }}>
                        {templates.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize:11,fontWeight:600,color:'#888',display:'block',marginBottom:3 }}>PDF para anexar (opcional)</label>
                      <div style={{ display:'flex',gap:8 }}>
                        <input type="text" value={arquivo?.name||''} readOnly placeholder="Sem arquivo" style={{ ...inp,flex:1,fontSize:11,background:'#f9f9f9',cursor:'default' }}/>
                        <input ref={fileRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={e=>lerArquivo(e.target.files[0])}/>
                        <button type="button" onClick={()=>fileRef.current?.click()} style={{ padding:'6px 12px',borderRadius:7,background:'#555',color:'#fff',fontSize:11,border:'none',cursor:'pointer' }}>📂</button>
                      </div>
                    </div>
                  </div>
                </div>

                {resultadoLote && (
                  <div style={{ padding:'12px 16px',borderRadius:10,background:'#EDFBF1',border:'1px solid #86efac' }}>
                    <div style={{ fontSize:13,fontWeight:700,color:'#166534' }}>✅ Lote enviado!</div>
                    <div style={{ fontSize:12,color:'#555',marginTop:4 }}>
                      {resultadoLote.agendados} disparos programados
                      {resultadoLote.pulados_sem_telefone > 0 && ` · ${resultadoLote.pulados_sem_telefone} pulados (sem telefone)`}
                    </div>
                  </div>
                )}

                <button onClick={enviarLote} disabled={enviandoLote||clientesLote.length===0||!obrigacao}
                  style={{ padding:14,borderRadius:10,background:enviandoLote||clientesLote.length===0||!obrigacao?'#ccc':WPP,color:'#fff',fontWeight:700,fontSize:14,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
                  {enviandoLote ? <><Loader size={17} style={{ animation:'spin 1s linear infinite' }}/> Enviando...</> : <><Zap size={17}/> Disparar para {clientesLote.length} cliente(s)</>}
                </button>
              </div>

              {/* Seleção de clientes */}
              <div style={{ background:'#fff',borderRadius:12,border:'1px solid #e8e8e8',padding:16 }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
                  <div style={{ fontSize:13,fontWeight:700,color:NAVY }}>👥 Selecionar Clientes</div>
                  <div style={{ display:'flex',gap:6 }}>
                    <button onClick={()=>setClientesLote(clientes.filter(c=>c.whatsapp||c.telefone).map(c=>c.id))}
                      style={{ fontSize:11,padding:'3px 8px',borderRadius:6,background:'#EBF5FF',color:NAVY,border:'none',cursor:'pointer',fontWeight:600 }}>Todos c/ WA</button>
                    <button onClick={()=>setClientesLote([])}
                      style={{ fontSize:11,padding:'3px 8px',borderRadius:6,background:'#f5f5f5',color:'#555',border:'none',cursor:'pointer' }}>Limpar</button>
                  </div>
                </div>
                <div style={{ position:'relative',marginBottom:8 }}>
                  <Search size={12} style={{ position:'absolute',left:8,top:8,color:'#bbb' }}/>
                  <input value={buscaLote} onChange={e=>setBuscaLote(e.target.value)} placeholder="Filtrar clientes..." style={{ ...inp,paddingLeft:26,fontSize:12 }}/>
                </div>
                <div style={{ maxHeight:380,overflowY:'auto' }}>
                  {clientesFiltradosLote.map(c => {
                    const isSel = clientesLote.includes(c.id)
                    const temTel = !!(c.whatsapp||c.telefone)
                    return (
                      <label key={c.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 6px',borderRadius:7,cursor:temTel?'pointer':'default',background:isSel?'#EDFBF1':'transparent',marginBottom:2,opacity:temTel?1:0.5 }}>
                        <input type="checkbox" checked={isSel} disabled={!temTel} onChange={()=>temTel&&toggleLote(c.id)} style={{ accentColor:WPP,width:15,height:15 }}/>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:12,fontWeight:isSel?700:400,color:NAVY,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.nome}</div>
                          <div style={{ fontSize:10,color:'#888' }}>
                            {c.cnpj} · {c.tributacao||'—'} {temTel?'· 📱':' · ⚠ sem tel'}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
                <div style={{ fontSize:11,color:'#aaa',marginTop:8,textAlign:'center' }}>
                  {clientesLote.length} selecionados de {clientes.filter(c=>c.whatsapp||c.telefone).length} com telefone
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ABA: TEMPLATES ───────────────────────────────────────────── */}
        {aba === 'templates' && (
          <div style={{ maxWidth:800,margin:'0 auto' }}>
            <div style={{ fontSize:14,fontWeight:700,color:NAVY,marginBottom:16 }}>📋 Templates de Mensagem</div>
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {templates.map(t => (
                <div key={t.id} style={{ background:'#fff',borderRadius:10,border:'1px solid #e8e8e8',padding:16 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:13,fontWeight:700,color:NAVY }}>{t.nome}</div>
                      <span style={{ fontSize:10,padding:'2px 7px',borderRadius:10,background:GOLD+'20',color:GOLD,fontWeight:600,marginTop:4,display:'inline-block' }}>{t.tipo}</span>
                    </div>
                    <span style={{ fontSize:10,padding:'2px 7px',borderRadius:10,background:t.ativo?'#EDFBF1':'#f5f5f5',color:t.ativo?'#166534':'#888',fontWeight:600 }}>{t.ativo?'● Ativo':'○ Inativo'}</span>
                  </div>
                  <div style={{ background:'#f8f9fb',borderRadius:8,padding:12,fontSize:12,color:'#555',lineHeight:1.7,whiteSpace:'pre-wrap',fontFamily:'monospace',borderLeft:`3px solid ${WPP}` }}>
                    {t.corpo}
                  </div>
                  <div style={{ marginTop:8,fontSize:11,color:'#aaa' }}>
                    Variáveis: {'{cliente_nome}'} · {'{obrigacao}'} · {'{mes_ref}'} · {'{vencimento}'} · {'{valor}'} · {'{obra}'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ABA: HISTÓRICO ────────────────────────────────────────────── */}
        {aba === 'historico' && (
          <div style={{ maxWidth:900,margin:'0 auto' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
              <div style={{ fontSize:14,fontWeight:700,color:NAVY }}>🕐 Histórico de Disparos</div>
              <button onClick={carregarDados} style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:7,background:'#fff',border:'1px solid #ddd',cursor:'pointer',fontSize:12,color:'#555' }}>
                <RefreshCw size={13}/> Atualizar
              </button>
            </div>
            {historico.length === 0 ? (
              <div style={{ textAlign:'center',padding:60,color:'#aaa',background:'#fff',borderRadius:12,border:'1px dashed #e8e8e8' }}>
                <Clock size={40} style={{ marginBottom:12,opacity:.3 }}/>
                <div style={{ fontSize:13 }}>Nenhum disparo registrado ainda</div>
              </div>
            ) : (
              <div style={{ background:'#fff',borderRadius:12,border:'1px solid #e8e8e8',overflow:'hidden' }}>
                <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
                  <thead>
                    <tr style={{ background:'#f8f9fb',borderBottom:'2px solid #e8e8e8' }}>
                      {['Data/Hora','Cliente','Telefone','Obrigação','Documento','Status'].map(h=>(
                        <th key={h} style={{ padding:'8px 12px',textAlign:'left',fontSize:10,fontWeight:700,color:'#888',textTransform:'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((h,i)=>(
                      <tr key={h.id||i} style={{ borderBottom:'1px solid #f0f0f0',background:i%2===0?'#fff':'#fafafa' }}>
                        <td style={{ padding:'8px 12px',color:'#888',fontSize:11,whiteSpace:'nowrap' }}>{h.criado_em}</td>
                        <td style={{ padding:'8px 12px',fontWeight:600,color:NAVY }}>{h.cliente_nome}</td>
                        <td style={{ padding:'8px 12px',color:'#555',fontFamily:'monospace' }}>{h.telefone}</td>
                        <td style={{ padding:'8px 12px',color:'#555' }}>{h.obrigacao||'—'}</td>
                        <td style={{ padding:'8px 12px',color:'#888',fontSize:11 }}>{h.nome_arquivo||'—'}</td>
                        <td style={{ padding:'8px 12px' }}><Badge status={h.status}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>


      {aba === 'equipe' && (
        <div style={{ maxWidth:860,margin:'0 auto',padding:24 }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
            <div>
              <div style={{ fontWeight:800,color:NAVY,fontSize:17 }}>👥 Equipe — WhatsApp</div>
              <div style={{ fontSize:12,color:'#888',marginTop:2 }}>Sincronizado com Admin → Usuários e Departamentos</div>
            </div>
            <button onClick={() => {
              setEquipe(JSON.parse(localStorage.getItem('ep_usuarios')||'[]'))
              setDeptos(JSON.parse(localStorage.getItem('ep_departamentos_admin')||'[]')||[])
            }} style={{ padding:'8px 16px',borderRadius:8,background:NAVY,color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:700 }}>🔄 Sincronizar</button>
          </div>
          {equipe.length === 0 ? (
            <div style={{ textAlign:'center',padding:60,background:'#f9fafb',borderRadius:16,border:'2px dashed #e5e7eb' }}>
              <div style={{ fontSize:48,marginBottom:12 }}>👥</div>
              <div style={{ fontWeight:700,color:NAVY,marginBottom:8 }}>Nenhum funcionário cadastrado</div>
              <div style={{ fontSize:13,color:'#888' }}>Cadastre em <b>Admin → Usuários</b> com nome, departamento e WhatsApp.</div>
            </div>
          ) : (
            <div>
              {(() => {
                const grupos = {}
                equipe.forEach(u => {
                  const d = u.departamento || 'Sem Departamento'
                  if (!grupos[d]) grupos[d] = []
                  grupos[d].push(u)
                })
                return Object.entries(grupos).map(([dept, members]) => (
                  <div key={dept} style={{ marginBottom:24 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:12 }}>
                      <div style={{ width:4,height:20,borderRadius:2,background:GOLD }}/>
                      <div style={{ fontWeight:700,color:NAVY,fontSize:14 }}>{dept}</div>
                      <div style={{ fontSize:11,color:'#888' }}>({members.length} {members.length===1?'membro':'membros'})</div>
                    </div>
                    {members.map(m => {
                      const uid = m.id||m.email
                      const edited = equipeEdit[uid]
                      const wppAtual = edited !== undefined ? edited : (m.whatsapp||'')
                      return (
                        <div key={uid} style={{ background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',gap:14,marginBottom:8 }}>
                          <div style={{ width:42,height:42,borderRadius:21,background:NAVY+'18',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:NAVY,fontSize:16,flexShrink:0 }}>{(m.nome||'?')[0].toUpperCase()}</div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontWeight:700,color:NAVY,fontSize:14 }}>{m.nome}</div>
                            <div style={{ fontSize:11,color:'#666',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{m.cargo||m.perfil||'Funcionário'} · {m.email||'—'}</div>
                          </div>
                          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                            <span style={{ fontSize:16 }}>📱</span>
                            <input value={wppAtual} onChange={e => setEquipeEdit(p=>({...p,[uid]:e.target.value}))} placeholder="(62) 9xxxx-xxxx"
                              style={{ padding:'7px 10px',borderRadius:8,border:'1.5px solid '+(m.whatsapp?'#16a34a':'#fbbf24'),fontSize:13,width:158,outline:'none' }}/>
                            {edited !== undefined && edited !== (m.whatsapp||'') && (
                              <button onClick={()=>{salvarWppMembro(uid,edited);setEquipeEdit(p=>{const n={...p};delete n[uid];return n})}}
                                style={{ padding:'6px 12px',borderRadius:8,background:'#16a34a',color:'#fff',border:'none',cursor:'pointer',fontSize:11,fontWeight:700 }}>💾 Salvar</button>
                            )}
                            {salvarEqId===uid && <span style={{ fontSize:11,color:'#16a34a',fontWeight:700 }}>✅</span>}
                          </div>
                          <div style={{ display:'flex',alignItems:'center',gap:8,flexShrink:0 }}>
                            <span style={{ fontSize:11,padding:'3px 10px',borderRadius:20,background:m.whatsapp?'#f0fdf4':'#fef9c3',color:m.whatsapp?'#16a34a':'#92400e',fontWeight:700 }}>
                              {m.whatsapp?'✅ Ativo':'⚠️ Pendente'}
                            </span>
                            <button onClick={()=>testarWppMembro(m)} disabled={!m.whatsapp||testando[uid]}
                              style={{ padding:'6px 12px',borderRadius:8,background:m.whatsapp?'#1e40af':'#e5e7eb',color:m.whatsapp?'#fff':'#999',border:'none',cursor:m.whatsapp?'pointer':'not-allowed',fontSize:11,fontWeight:700 }}>
                              {testando[uid]?'⏳':'📤 Testar'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))
              })()}
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginTop:8,padding:16,borderRadius:12,background:'#f9fafb',border:'1px solid #e5e7eb' }}>
                {[['Total Equipe',equipe.length,'#1e40af'],['Com WhatsApp',equipe.filter(u=>u.whatsapp).length,'#16a34a'],['Sem WhatsApp',equipe.filter(u=>!u.whatsapp).length,'#f59e0b']].map(([lb,vl,cor])=>(
                  <div key={lb} style={{ textAlign:'center',padding:12,borderRadius:8,background:'#fff',border:'1px solid #e5e7eb' }}>
                    <div style={{ fontSize:22,fontWeight:800,color:cor }}>{vl}</div>
                    <div style={{ fontSize:11,color:'#888',marginTop:2 }}>{lb}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
