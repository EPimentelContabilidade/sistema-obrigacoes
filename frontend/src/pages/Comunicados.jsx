import { useState, useEffect, useRef } from 'react'
import { Plus, Send, X, Eye, CheckCircle, Clock, AlertTriangle, MessageSquare,
         Users, Briefcase, Building2, Bot, Settings, Mail, Phone, Filter,
         ChevronDown, Edit2, Archive, RefreshCw, Zap } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'
const API  = '/api/v1'

const URGENCIAS = [
  { id:'baixa',         label:'Baixa',         cor:'#1A7A3C', bg:'#EDFBF1', emoji:'🟢', border:'#86efac' },
  { id:'normal',        label:'Normal',        cor:'#1D6FA4', bg:'#EBF5FF', emoji:'🔵', border:'#93c5fd' },
  { id:'alta',          label:'Alta',          cor:'#854D0E', bg:'#FEF9C3', emoji:'🟡', border:'#fcd34d' },
  { id:'muito_urgente', label:'Muito Urgente', cor:'#dc2626', bg:'#FEF2F2', emoji:'🔴', border:'#fca5a5' },
]
const DEPARTAMENTOS = ['Geral','Fiscal','Contábil','Pessoal','Financeiro','Jurídico','Diretoria']
const CANAIS = [
  { id:'email',     label:'📧 E-mail' },
  { id:'whatsapp',  label:'💬 WhatsApp' },
  { id:'ambos',     label:'📲 E-mail + WhatsApp' },
  { id:'interno',   label:'🏢 Interno (sem envio)' },
]
const STATUS_CFG = {
  pendente:   { label:'Pendente',  cor:'#854D0E', bg:'#FEF9C3' },
  enviado:    { label:'Enviado',   cor:'#1D6FA4', bg:'#EBF5FF' },
  respondido: { label:'Respondido',cor:'#1A7A3C', bg:'#EDFBF1' },
  encerrado:  { label:'Encerrado', cor:'#6B7280', bg:'#f5f5f5' },
}

const inp  = { padding:'9px 12px', borderRadius:8, border:'1px solid #e0e0e0', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', fontFamily:'inherit', color:'#333' }
const sel  = { ...inp, cursor:'pointer' }
const btn  = (bg='#1B2A4A', c='#fff') => ({ padding:'9px 16px', borderRadius:8, background:bg, color:c, fontWeight:700, fontSize:13, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6 })

export default function Comunicados() {
  const [aba, setAba]             = useState('lista')   // lista | novo | config_smtp
  const [comunicados, setComunicados] = useState([])
  const [clientes, setClientes]   = useState([])
  const [carregando, setCarregando] = useState(false)

  // Filtros
  const [filtroUrg, setFiltroUrg]   = useState('')
  const [filtroDept, setFiltroDept] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  // Novo comunicado
  const [form, setForm] = useState({
    titulo: '', conteudo: '', urgencia: 'normal', departamento: 'Geral',
    responsavel: 'Carlos Eduardo Pimentel', canal: 'email',
    cliente_ids: [], emails_extra: [], processo_ids: [],
    usa_dominio_proprio: false, assinatura_personalizada: '',
  })
  const [clienteBusca, setClienteBusca] = useState('')
  const [emailAvulso, setEmailAvulso]   = useState('')
  const [enviando, setEnviando]         = useState(false)
  const [sucesso, setSucesso]           = useState('')

  // Config SMTP
  const [smtp, setSmtp] = useState({ host:'smtp.gmail.com', port:587, user:'', pass:'', from_name:'EPimentel Auditoria & Contabilidade', from_email:'', assinatura_html:'' })
  const [smtpSalvo, setSmtpSalvo] = useState(false)

  // Detalhe do comunicado
  const [detalhe, setDetalhe]     = useState(null)
  const [resposta, setResposta]   = useState('')

  useEffect(() => {
    carregarComunicados()
    try { setClientes(JSON.parse(localStorage.getItem('ep_clientes') || '[]')) } catch {}
    fetch(`${API}/comunicados/config-smtp`).then(r=>r.json()).then(d=>setSmtp(s=>({...s,...d}))).catch(()=>{})
  }, [])

  const carregarComunicados = async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams()
      if (filtroUrg)    params.set('urgencia', filtroUrg)
      if (filtroDept)   params.set('departamento', filtroDept)
      if (filtroStatus) params.set('status', filtroStatus)
      const r = await fetch(`${API}/comunicados/listar?${params}`)
      if (r.ok) setComunicados(await r.json())
    } catch {} finally { setCarregando(false) }
  }

  useEffect(() => { carregarComunicados() }, [filtroUrg, filtroDept, filtroStatus])

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const cliFiltrados = clientes.filter(c => {
    const q = clienteBusca.toLowerCase()
    return !q || (c.nome||'').toLowerCase().includes(q) || (c.cnpj||'').includes(q)
  })

  const toggleCliente = (id) => {
    setF('cliente_ids', form.cliente_ids.includes(id)
      ? form.cliente_ids.filter(x=>x!==id)
      : [...form.cliente_ids, id])
  }

  const addEmail = () => {
    if (emailAvulso && emailAvulso.includes('@')) {
      setF('emails_extra', [...form.emails_extra, emailAvulso.trim()])
      setEmailAvulso('')
    }
  }

  const enviarComunicado = async () => {
    if (!form.titulo.trim() || !form.conteudo.trim()) { alert('Preencha título e conteúdo.'); return }
    setEnviando(true); setSucesso('')
    try {
      const r = await fetch(`${API}/comunicados/criar`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form)
      })
      const data = await r.json()
      if (r.ok) {
        setSucesso('✅ Comunicado criado e envio iniciado!')
        setForm({ titulo:'', conteudo:'', urgencia:'normal', departamento:'Geral',
                  responsavel:'Carlos Eduardo Pimentel', canal:'email',
                  cliente_ids:[], emails_extra:[], processo_ids:[],
                  usa_dominio_proprio:false, assinatura_personalizada:'' })
        await carregarComunicados()
        setTimeout(() => { setAba('lista'); setSucesso('') }, 2000)
      }
    } catch {} finally { setEnviando(false) }
  }

  const responder = async (id) => {
    if (!resposta.trim()) return
    await fetch(`${API}/comunicados/responder/${id}`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ comunicado_id:id, resposta, respondente:'Carlos Eduardo Pimentel' })
    })
    setResposta('')
    await carregarComunicados()
    setDetalhe(comunicados.find(c=>c.id===id))
  }

  const encerrar = async (id) => {
    if (!confirm('Encerrar este comunicado?')) return
    await fetch(`${API}/comunicados/encerrar/${id}`, { method:'POST' })
    setDetalhe(null)
    await carregarComunicados()
  }

  const verificarAtrasados = async () => {
    setCarregando(true)
    const r = await fetch(`${API}/comunicados/verificar-atrasados`, { method:'POST' })
    const d = await r.json()
    alert(`IA verificou: ${d.comunicados_atrasados} comunicado(s) atrasado(s) alertado(s).`)
    await carregarComunicados()
    setCarregando(false)
  }

  const salvarSmtp = async () => {
    await fetch(`${API}/comunicados/config-smtp`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(smtp)
    })
    setSmtpSalvo(true)
    setTimeout(() => setSmtpSalvo(false), 2000)
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total:      comunicados.length,
    atrasados:  comunicados.filter(c=>c.atrasado).length,
    urgentes:   comunicados.filter(c=>c.urgencia==='muito_urgente'&&c.status!=='encerrado').length,
    pendentes:  comunicados.filter(c=>c.status==='pendente').length,
  }

  const urgSel = URGENCIAS.find(u=>u.id===form.urgencia) || URGENCIAS[1]

  // ── DETALHE ───────────────────────────────────────────────────────────────
  if (detalhe) {
    const urg = URGENCIAS.find(u=>u.id===detalhe.urgencia) || URGENCIAS[1]
    const sts = STATUS_CFG[detalhe.status] || STATUS_CFG.pendente
    const resps = JSON.parse(detalhe.respostas || '[]')
    return (
      <div style={{ padding:24, maxWidth:800, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <button onClick={()=>setDetalhe(null)} style={{ ...btn('#f5f5f5','#555'), padding:'7px 12px' }}><X size={14}/> Voltar</button>
          <span style={{ fontSize:11, color:'#aaa' }}>Comunicados /</span>
          <span style={{ fontSize:13, fontWeight:700, color:NAVY }}>{detalhe.titulo}</span>
        </div>
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e8e8e8', overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
          <div style={{ background:`linear-gradient(135deg,${NAVY},#2d4a7a)`, padding:'18px 24px', display:'flex', gap:10, alignItems:'flex-start' }}>
            <div style={{ flex:1 }}>
              <div style={{ color:'#fff', fontWeight:800, fontSize:17 }}>{detalhe.titulo}</div>
              <div style={{ color:GOLD, fontSize:11, marginTop:4 }}>{detalhe.departamento} · {detalhe.criado_em?.slice(0,16)}</div>
            </div>
            <span style={{ background:urg.bg, color:urg.cor, padding:'4px 12px', borderRadius:12, fontSize:12, fontWeight:800, flexShrink:0 }}>{urg.emoji} {urg.label}</span>
            <span style={{ background:sts.bg, color:sts.cor, padding:'4px 12px', borderRadius:12, fontSize:12, fontWeight:800, flexShrink:0 }}>{sts.label}</span>
          </div>
          <div style={{ padding:24 }}>
            <div style={{ whiteSpace:'pre-wrap', fontSize:14, color:'#333', lineHeight:1.7, marginBottom:20 }}>{detalhe.conteudo}</div>
            {detalhe.alerta_ia && (
              <div style={{ background:'#FEF9C3', border:'1px solid #fcd34d', borderRadius:10, padding:'14px 16px', marginBottom:20 }}>
                <div style={{ fontWeight:700, color:'#854D0E', fontSize:12, marginBottom:6 }}>🤖 Alerta IA Claude ({detalhe.dias_aberto} dias em aberto)</div>
                <div style={{ fontSize:13, color:'#333', whiteSpace:'pre-wrap' }}>{detalhe.alerta_ia}</div>
              </div>
            )}
            {resps.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#888', marginBottom:10, textTransform:'uppercase', letterSpacing:.7 }}>Respostas</div>
                {resps.map((res, i) => (
                  <div key={i} style={{ background:'#f8f9fb', borderRadius:10, padding:'12px 16px', marginBottom:8 }}>
                    <div style={{ fontWeight:700, color:NAVY, fontSize:12 }}>{res.respondente}</div>
                    <div style={{ fontSize:11, color:'#aaa', marginBottom:6 }}>{new Date(res.data).toLocaleString('pt-BR')}</div>
                    <div style={{ fontSize:13, color:'#333' }}>{res.texto}</div>
                  </div>
                ))}
              </div>
            )}
            {detalhe.status !== 'encerrado' && (
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#888', marginBottom:8, textTransform:'uppercase', letterSpacing:.7 }}>Adicionar Resposta</div>
                <textarea value={resposta} onChange={e=>setResposta(e.target.value)} rows={3} placeholder="Digite sua resposta..."
                  style={{ ...inp, resize:'vertical', marginBottom:10 }}/>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>responder(detalhe.id)} style={btn(NAVY)}>
                    <Send size={13}/> Registrar Resposta
                  </button>
                  <button onClick={()=>encerrar(detalhe.id)} style={btn('#6B7280')}>
                    <Archive size={13}/> Encerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding:24, maxWidth:1100, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:42, height:42, borderRadius:10, background:`linear-gradient(135deg,${NAVY},#2d4a7a)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <MessageSquare size={20} style={{ color:GOLD }}/>
          </div>
          <div>
            <div style={{ fontSize:19, fontWeight:800, color:NAVY }}>Comunicados</div>
            <div style={{ fontSize:12, color:'#888' }}>Comunicações avulsas com clientes, processos e departamentos</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={verificarAtrasados} style={{ ...btn('#FEF9C3','#854D0E'), border:'1px solid #fcd34d' }}>
            <Bot size={13}/> IA: Verificar atrasados
          </button>
          <button onClick={()=>setAba(aba==='novo'?'lista':'novo')} style={btn(NAVY)}>
            <Plus size={14}/> Novo Comunicado
          </button>
          <button onClick={()=>setAba(aba==='config_smtp'?'lista':'config_smtp')} style={{ ...btn('#f5f5f5','#555'), padding:'9px 12px' }}>
            <Settings size={14}/>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { l:'Total', n:stats.total,      c:NAVY,     bg:'#EBF5FF' },
          { l:'Pendentes', n:stats.pendentes, c:'#854D0E', bg:'#FEF9C3' },
          { l:'Muito Urgentes', n:stats.urgentes, c:'#dc2626', bg:'#FEF2F2' },
          { l:'Atrasados (+30d)', n:stats.atrasados, c:'#6B3EC9', bg:'#F3EEFF' },
        ].map(s=>(
          <div key={s.l} style={{ background:s.bg, borderRadius:12, padding:'14px 16px', border:`1px solid ${s.c}20` }}>
            <div style={{ fontSize:24, fontWeight:800, color:s.c }}>{s.n}</div>
            <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Config SMTP */}
      {aba === 'config_smtp' && (
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e8e8e8', padding:24, marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:800, color:NAVY, marginBottom:16 }}>⚙️ Configuração de E-mail — Domínio Próprio</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div><label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:5, textTransform:'uppercase' }}>Servidor SMTP</label>
              <input value={smtp.host} onChange={e=>setSmtp(s=>({...s,host:e.target.value}))} placeholder="smtp.seuprovedor.com.br" style={inp}/></div>
            <div><label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:5, textTransform:'uppercase' }}>Porta</label>
              <input value={smtp.port} onChange={e=>setSmtp(s=>({...s,port:Number(e.target.value)}))} placeholder="587" style={inp}/></div>
            <div><label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:5, textTransform:'uppercase' }}>Usuário / E-mail</label>
              <input value={smtp.user} onChange={e=>setSmtp(s=>({...s,user:e.target.value}))} placeholder="contato@epimentel.com.br" style={inp}/></div>
            <div><label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:5, textTransform:'uppercase' }}>Senha</label>
              <input type="password" value={smtp.pass||''} onChange={e=>setSmtp(s=>({...s,pass:e.target.value}))} placeholder="••••••••" style={inp}/></div>
            <div><label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:5, textTransform:'uppercase' }}>Nome do Remetente</label>
              <input value={smtp.from_name||''} onChange={e=>setSmtp(s=>({...s,from_name:e.target.value}))} placeholder="EPimentel Auditoria & Contabilidade" style={inp}/></div>
            <div><label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:5, textTransform:'uppercase' }}>E-mail Remetente</label>
              <input value={smtp.from_email||''} onChange={e=>setSmtp(s=>({...s,from_email:e.target.value}))} placeholder="contato@epimentel.com.br" style={inp}/></div>
          </div>
          <div style={{ marginTop:14 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:5, textTransform:'uppercase' }}>Assinatura HTML do E-mail</label>
            <textarea value={smtp.assinatura_html||''} onChange={e=>setSmtp(s=>({...s,assinatura_html:e.target.value}))} rows={6} placeholder="Cole aqui o HTML da sua assinatura..." style={{ ...inp, resize:'vertical', fontFamily:'monospace', fontSize:11 }}/>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:14 }}>
            <button onClick={salvarSmtp} style={btn(NAVY)}><CheckCircle size={13}/> {smtpSalvo?'Salvo!':'Salvar Configuração'}</button>
            <button onClick={()=>setAba('lista')} style={btn('#f5f5f5','#555')}><X size={13}/> Fechar</button>
          </div>
          <div style={{ marginTop:14, padding:'10px 14px', borderRadius:8, background:'#EBF5FF', fontSize:12, color:'#1D6FA4' }}>
            💡 <strong>Variáveis de ambiente alternativas:</strong> Configure <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>, <code>SMTP_FROM_NAME</code> e <code>SMTP_FROM</code> no Railway para persistência permanente.
          </div>
        </div>
      )}

      {/* Novo Comunicado */}
      {aba === 'novo' && (
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e8e8e8', padding:24, marginBottom:20, boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
          <div style={{ fontSize:15, fontWeight:800, color:NAVY, marginBottom:18 }}>✉️ Novo Comunicado</div>
          {sucesso && <div style={{ padding:'10px 14px', borderRadius:8, background:'#EDFBF1', border:'1px solid #86efac', color:'#166534', fontWeight:700, fontSize:13, marginBottom:16 }}>{sucesso}</div>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.7 }}>Título *</label>
              <input value={form.titulo} onChange={e=>setF('titulo',e.target.value)} placeholder="Ex: Prazo de entrega da Folha de Março" style={inp}/>
            </div>
            {/* Urgência */}
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:.7 }}>Urgência</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {URGENCIAS.map(u=>(
                  <button key={u.id} onClick={()=>setF('urgencia',u.id)}
                    style={{ padding:'6px 14px', borderRadius:20, border:`2px solid ${form.urgencia===u.id?u.cor:u.border}`, background:form.urgencia===u.id?u.bg:'#fff', color:u.cor, fontSize:12, fontWeight:700, cursor:'pointer', transition:'all .15s' }}>
                    {u.emoji} {u.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.7 }}>Departamento</label>
                <select value={form.departamento} onChange={e=>setF('departamento',e.target.value)} style={sel}>
                  {DEPARTAMENTOS.map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.7 }}>Canal</label>
                <select value={form.canal} onChange={e=>setF('canal',e.target.value)} style={sel}>
                  {CANAIS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>
            {/* Conteúdo */}
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.7 }}>Conteúdo *</label>
              <textarea value={form.conteudo} onChange={e=>setF('conteudo',e.target.value)} rows={6} placeholder="Escreva o comunicado..." style={{ ...inp, resize:'vertical', lineHeight:1.6 }}/>
            </div>
            {/* Selecionar Clientes */}
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:.7 }}>
                <Users size={11} style={{ display:'inline', marginRight:4 }}/>Clientes
                {form.cliente_ids.length > 0 && <span style={{ marginLeft:6, background:NAVY, color:'#fff', fontSize:9, padding:'1px 6px', borderRadius:8 }}>{form.cliente_ids.length}</span>}
              </label>
              <input value={clienteBusca} onChange={e=>setClienteBusca(e.target.value)} placeholder="Buscar cliente..." style={{ ...inp, marginBottom:6 }}/>
              <div style={{ maxHeight:160, overflowY:'auto', border:'1px solid #e8e8e8', borderRadius:8 }}>
                {cliFiltrados.slice(0,20).map(c=>(
                  <div key={c.id} onClick={()=>toggleCliente(c.id)}
                    style={{ padding:'7px 12px', cursor:'pointer', borderBottom:'1px solid #f5f5f5', display:'flex', alignItems:'center', gap:8, background:form.cliente_ids.includes(c.id)?'#EBF5FF':'#fff' }}>
                    <div style={{ width:16, height:16, borderRadius:4, border:`2px solid ${form.cliente_ids.includes(c.id)?NAVY:'#ddd'}`, background:form.cliente_ids.includes(c.id)?NAVY:'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {form.cliente_ids.includes(c.id) && <CheckCircle size={10} style={{ color:'#fff' }}/>}
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:NAVY }}>{c.nome}</div>
                      <div style={{ fontSize:10, color:'#aaa' }}>{c.cnpj} · {c.tributacao||'—'}</div>
                    </div>
                  </div>
                ))}
                {cliFiltrados.length===0&&<div style={{ padding:12, textAlign:'center', color:'#ccc', fontSize:12 }}>Nenhum cliente</div>}
              </div>
            </div>
            {/* E-mails avulsos */}
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:.7 }}>
                <Mail size={11} style={{ display:'inline', marginRight:4 }}/>E-mails Avulsos
              </label>
              <div style={{ display:'flex', gap:6, marginBottom:6 }}>
                <input value={emailAvulso} onChange={e=>setEmailAvulso(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addEmail()} placeholder="email@dominio.com.br" style={{ ...inp, flex:1 }}/>
                <button onClick={addEmail} style={{ ...btn(NAVY), padding:'9px 12px', flexShrink:0 }}><Plus size={13}/></button>
              </div>
              {form.emails_extra.map((em,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:8, background:'#f8f9fb', marginBottom:4 }}>
                  <Mail size={11} style={{ color:'#888' }}/>
                  <span style={{ flex:1, fontSize:12 }}>{em}</span>
                  <button onClick={()=>setF('emails_extra',form.emails_extra.filter((_,j)=>j!==i))} style={{ background:'none', border:'none', cursor:'pointer', color:'#dc2626', padding:0 }}><X size={12}/></button>
                </div>
              ))}
              {/* Domínio próprio */}
              <div style={{ marginTop:12, padding:'10px 12px', borderRadius:8, background:'#f8f9fb', border:'1px solid #e8e8e8' }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                  <input type="checkbox" checked={form.usa_dominio_proprio} onChange={e=>setF('usa_dominio_proprio',e.target.checked)}/>
                  <span style={{ fontSize:12, color:'#555' }}>Usar domínio próprio (config acima)</span>
                </label>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button onClick={()=>setAba('lista')} style={btn('#f5f5f5','#555')}><X size={13}/> Cancelar</button>
            <button onClick={enviarComunicado} disabled={enviando} style={btn(enviando?'#aaa':NAVY)}>
              <Send size={13}/> {enviando?'Enviando...':'Enviar Comunicado'}
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e8e8e8', padding:'12px 16px', marginBottom:16, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
        <Filter size={13} style={{ color:'#aaa' }}/>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {URGENCIAS.map(u=>(
            <button key={u.id} onClick={()=>setFiltroUrg(filtroUrg===u.id?'':u.id)}
              style={{ padding:'4px 12px', borderRadius:16, border:`1px solid ${filtroUrg===u.id?u.cor:u.border}`, background:filtroUrg===u.id?u.bg:'#fff', color:u.cor, fontSize:11, fontWeight:700, cursor:'pointer' }}>
              {u.emoji} {u.label}
            </button>
          ))}
        </div>
        <select value={filtroDept} onChange={e=>setFiltroDept(e.target.value)} style={{ ...sel, width:'auto', fontSize:12, padding:'5px 10px' }}>
          <option value="">Todos departamentos</option>
          {DEPARTAMENTOS.map(d=><option key={d}>{d}</option>)}
        </select>
        <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} style={{ ...sel, width:'auto', fontSize:12, padding:'5px 10px' }}>
          <option value="">Todos status</option>
          <option value="pendente">Pendente</option>
          <option value="enviado">Enviado</option>
          <option value="respondido">Respondido</option>
          <option value="encerrado">Encerrado</option>
        </select>
        <button onClick={carregarComunicados} style={{ ...btn('#f5f5f5','#555'), padding:'5px 10px', marginLeft:'auto' }}>
          <RefreshCw size={12}/>
        </button>
      </div>

      {/* Lista */}
      {carregando ? (
        <div style={{ textAlign:'center', padding:40, color:'#aaa', fontSize:14 }}>Carregando...</div>
      ) : comunicados.length === 0 ? (
        <div style={{ textAlign:'center', padding:48, color:'#ccc' }}>
          <MessageSquare size={40} style={{ opacity:.3, marginBottom:12 }}/>
          <div style={{ fontSize:14 }}>Nenhum comunicado encontrado</div>
          <button onClick={()=>setAba('novo')} style={{ ...btn(NAVY), margin:'12px auto 0' }}><Plus size={13}/> Criar primeiro comunicado</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {comunicados.map(com=>{
            const urg = URGENCIAS.find(u=>u.id===com.urgencia)||URGENCIAS[1]
            const sts = STATUS_CFG[com.status]||STATUS_CFG.pendente
            return (
              <div key={com.id} onClick={()=>setDetalhe(com)}
                style={{ background:'#fff', borderRadius:12, border:`1px solid ${com.atrasado?'#fcd34d':'#e8e8e8'}`, padding:'14px 18px', cursor:'pointer', boxShadow: com.urgencia==='muito_urgente'?`0 0 0 2px ${urg.border}`:'0 1px 6px rgba(0,0,0,.04)', transition:'box-shadow .15s' }}
                onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.1)'}
                onMouseLeave={e=>e.currentTarget.style.boxShadow=com.urgencia==='muito_urgente'?`0 0 0 2px ${urg.border}`:'0 1px 6px rgba(0,0,0,.04)'}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                      <span style={{ fontSize:14, fontWeight:700, color:NAVY }}>{com.titulo}</span>
                      <span style={{ background:urg.bg, color:urg.cor, padding:'2px 10px', borderRadius:10, fontSize:11, fontWeight:700 }}>{urg.emoji} {urg.label}</span>
                      <span style={{ background:sts.bg, color:sts.cor, padding:'2px 10px', borderRadius:10, fontSize:11, fontWeight:700 }}>{sts.label}</span>
                      {com.atrasado && <span style={{ background:'#FEF9C3', color:'#854D0E', padding:'2px 10px', borderRadius:10, fontSize:11, fontWeight:800 }}>⚠️ {com.dias_aberto}d em aberto</span>}
                      {com.alerta_ia && <span style={{ background:'#F3EEFF', color:'#6B3EC9', padding:'2px 10px', borderRadius:10, fontSize:11, fontWeight:700 }}>🤖 IA</span>}
                    </div>
                    <div style={{ fontSize:12, color:'#888', display:'flex', gap:12, flexWrap:'wrap' }}>
                      <span><Building2 size={10} style={{ display:'inline', marginRight:2 }}/>{com.departamento}</span>
                      <span><Clock size={10} style={{ display:'inline', marginRight:2 }}/>{com.criado_em?.slice(0,16)}</span>
                      {com.responsavel && <span>👤 {com.responsavel}</span>}
                    </div>
                    <div style={{ fontSize:12, color:'#666', marginTop:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'80%' }}>
                      {com.conteudo?.slice(0,100)}...
                    </div>
                  </div>
                  <Eye size={16} style={{ color:'#ccc', flexShrink:0, marginTop:2 }}/>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
