import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Send, X, Eye, CheckCircle, Clock, MessageSquare,
         Briefcase, Building2, Bot, Settings, Mail, Filter,
         Archive, RefreshCw, Paperclip, Download, Trash2, Bell,
         Save, Edit2, Users, Lock } from 'lucide-react'

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

// Canais separados por tipo
const CANAIS_EXTERNO = [
  { id:'email',    label:'📧 E-mail' },
  { id:'whatsapp', label:'💬 WhatsApp' },
  { id:'ambos',    label:'📲 E-mail + WhatsApp' },
]
const CANAIS_INTERNO = [
  { id:'interno_sistema', label:'🏢 Somente no sistema' },
  { id:'email',           label:'📧 E-mail interno' },
  { id:'whatsapp',        label:'💬 WhatsApp interno' },
]

const STATUS_CFG = {
  salvo:      { label:'Salvo',      cor:'#6B7280', bg:'#f0f0f0' },
  pendente:   { label:'Pendente',   cor:'#854D0E', bg:'#FEF9C3' },
  enviado:    { label:'Enviado',    cor:'#1D6FA4', bg:'#EBF5FF' },
  respondido: { label:'Respondido', cor:'#1A7A3C', bg:'#EDFBF1' },
  encerrado:  { label:'Encerrado',  cor:'#6B7280', bg:'#f5f5f5' },
}
const STATUS_CORES_PROC = {
  'Em Andamento':'#2196F3','Aguardando Cliente':'#FF9800',
  'Concluído':'#4CAF50','Cancelado':'#F44336','Pendente':'#9C27B0',
}

const inp = { padding:'9px 12px', borderRadius:8, border:'1px solid #e0e0e0', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', fontFamily:'inherit', color:'#333' }
const sel = { ...inp, cursor:'pointer' }
const btn = (bg='#1B2A4A', c='#fff') => ({ padding:'9px 16px', borderRadius:8, background:bg, color:c, fontWeight:700, fontSize:13, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6 })

function fmtBytes(b) {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024*1024) return `${(b/1024).toFixed(1)} KB`
  return `${(b/1024/1024).toFixed(1)} MB`
}
function iconeDoc(tipo='') {
  if ((tipo||'').includes('pdf'))   return '📄'
  if ((tipo||'').includes('image')) return '🖼️'
  return '📎'
}

const FORM_VAZIO = {
  titulo:'', conteudo:'', resumo:'', urgencia:'normal', departamento:'Geral',
  responsavel:'', canal:'email', tipo:'externo',
  cliente_ids:[], emails_extra:[], processo_ids:[],
  usa_dominio_proprio:false, assinatura_personalizada:'',
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponentes
// ─────────────────────────────────────────────────────────────────────────────

function Toast({ toasts, fechar }) {
  if (!toasts.length) return null
  return (
    <div style={{ position:'fixed', top:20, right:20, zIndex:99999, display:'flex', flexDirection:'column', gap:10, maxWidth:390, pointerEvents:'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.tipo==='alerta'?'#fff9e6':t.tipo==='erro'?'#FEF2F2':'#f0fdf4',
          border:`1.5px solid ${t.tipo==='alerta'?GOLD:t.tipo==='erro'?'#fca5a5':'#86efac'}`,
          borderLeft:`5px solid ${t.tipo==='alerta'?GOLD:t.tipo==='erro'?'#dc2626':'#22c55e'}`,
          borderRadius:10, padding:'13px 15px',
          boxShadow:'0 8px 24px rgba(0,0,0,.13)',
          display:'flex', alignItems:'flex-start', gap:10,
          pointerEvents:'all', animation:'slideIn .22s ease',
        }}>
          <span style={{ fontSize:20, flexShrink:0, marginTop:1 }}>
            {t.tipo==='alerta'?'🔔':t.tipo==='erro'?'❌':'✅'}
          </span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:800, fontSize:13, color:NAVY, marginBottom:2 }}>{t.titulo}</div>
            <div style={{ fontSize:12, color:'#555', lineHeight:1.5 }}>{t.msg}</div>
            {t.canais?.length>0 && (
              <div style={{ marginTop:5, display:'flex', gap:5, flexWrap:'wrap' }}>
                {t.canais.map((c,i)=><span key={i} style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:`${NAVY}11`, color:NAVY, fontWeight:700 }}>{c}</span>)}
              </div>
            )}
          </div>
          <button onClick={()=>fechar(t.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#aaa', padding:0, flexShrink:0 }}><X size={13}/></button>
        </div>
      ))}
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(32px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  )
}

function ModalAlerta({ comunicados, onClose }) {
  if (!comunicados.length) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', maxWidth:520, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,.3)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ background:`linear-gradient(135deg,${NAVY},#2d4a7a)`, padding:'20px 24px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:GOLD, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Bell size={22} style={{ color:NAVY }}/>
          </div>
          <div>
            <div style={{ color:'#fff', fontWeight:800, fontSize:16 }}>🔔 Comunicado Importante!</div>
            <div style={{ color:GOLD, fontSize:12, marginTop:2 }}>Você tem {comunicados.length} comunicado(s) aguardando atenção</div>
          </div>
        </div>
        <div style={{ padding:20, maxHeight:320, overflowY:'auto' }}>
          {comunicados.map(com => {
            const urg = URGENCIAS.find(u=>u.id===com.urgencia)||URGENCIAS[1]
            return (
              <div key={com.id} style={{ border:`1px solid ${urg.border}`, borderRadius:10, padding:'12px 14px', marginBottom:10, background:urg.bg }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:5 }}>
                  <span style={{ fontWeight:800, fontSize:12, color:urg.cor }}>{urg.emoji} {urg.label}</span>
                  <span style={{ fontSize:11, color:'#888' }}>{com.departamento}</span>
                </div>
                <div style={{ fontWeight:700, fontSize:14, color:NAVY, marginBottom:3 }}>{com.titulo}</div>
                {com.resumo && <div style={{ fontSize:12, color:'#555', fontStyle:'italic' }}>{com.resumo}</div>}
              </div>
            )
          })}
        </div>
        <div style={{ padding:'14px 20px', borderTop:'1px solid #e8e8e8', display:'flex', justifyContent:'flex-end' }}>
          <button onClick={onClose} style={btn(NAVY)}><CheckCircle size={14}/> Entendido</button>
        </div>
      </div>
    </div>
  )
}

function ModalPreview({ doc, onClose }) {
  const url = `${API}/comunicados/docs/arquivo/${doc.id}`
  const isPdf = (doc.tipo||'').includes('pdf')
  const isImg = (doc.tipo||'').includes('image')
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.78)', zIndex:9999, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#1a1a2e', borderRadius:14, overflow:'hidden', maxWidth:'93vw', maxHeight:'93vh', width:920, display:'flex', flexDirection:'column' }} onClick={e=>e.stopPropagation()}>
        <div style={{ background:NAVY, padding:'11px 18px', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>{iconeDoc(doc.tipo)}</span>
          <span style={{ color:'#fff', fontWeight:700, fontSize:14, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.nome}</span>
          <a href={url} download={doc.nome} style={{ ...btn('#f0f0f0','#333'), padding:'5px 10px', fontSize:11, textDecoration:'none' }} onClick={e=>e.stopPropagation()}><Download size={12}/> Baixar</a>
          <button onClick={onClose} style={{ ...btn('#dc2626'), padding:'5px 10px' }}><X size={13}/></button>
        </div>
        <div style={{ flex:1, overflow:'auto', background:'#f0f0f0', display:'flex', alignItems:'center', justifyContent:'center', minHeight:400 }}>
          {isPdf && <iframe src={`${url}#toolbar=1&navpanes=0`} title={doc.nome} style={{ width:'100%', height:'82vh', border:'none' }}/>}
          {isImg && <img src={url} alt={doc.nome} style={{ maxWidth:'100%', maxHeight:'82vh', objectFit:'contain' }}/>}
          {!isPdf && !isImg && (
            <div style={{ textAlign:'center', padding:40 }}>
              <div style={{ fontSize:56, marginBottom:12 }}>{iconeDoc(doc.tipo)}</div>
              <div style={{ color:'#555', fontSize:14, marginBottom:16 }}>{doc.nome}</div>
              <a href={url} download={doc.nome} style={{ ...btn(NAVY), textDecoration:'none', display:'inline-flex' }}><Download size={14}/> Baixar</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SecaoDocumentos({ comId, modoLeitura }) {
  const [docs, setDocs]       = useState([])
  const [preview, setPreview] = useState(null)
  const [drag, setDrag]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef()

  const carregar = useCallback(async () => {
    if (!comId) return
    try { const r = await fetch(`${API}/comunicados/${comId}/docs`); if (r.ok) setDocs(await r.json()) } catch {}
  }, [comId])

  useEffect(() => { carregar() }, [carregar])

  const uploadArqs = async (arqs) => {
    if (!comId || !arqs.length) return
    setUploading(true)
    for (const a of arqs) { const fd=new FormData(); fd.append('file',a); try{ await fetch(`${API}/comunicados/${comId}/docs`,{method:'POST',body:fd}) }catch{} }
    await carregar(); setUploading(false)
  }

  const excluir = async (id) => {
    if (!confirm('Excluir documento?')) return
    await fetch(`${API}/comunicados/${comId}/docs/${id}`,{method:'DELETE'}); await carregar()
  }

  return (
    <div>
      {preview && <ModalPreview doc={preview} onClose={()=>setPreview(null)}/>}
      {!modoLeitura && (
        <div
          onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);uploadArqs(Array.from(e.dataTransfer.files))}}
          onClick={()=>inputRef.current?.click()}
          style={{ border:`2px dashed ${drag?GOLD:'#d0d7e6'}`, borderRadius:10, padding:'14px 18px', textAlign:'center', cursor:'pointer', background:drag?'#fffbeb':'#fafbfc', marginBottom:10 }}>
          <input ref={inputRef} type="file" multiple style={{display:'none'}} onChange={e=>uploadArqs(Array.from(e.target.files))}/>
          <Paperclip size={16} style={{color:'#bbb',marginBottom:4}}/>
          <div style={{fontSize:12,color:'#888',fontWeight:600}}>{uploading?'⏳ Enviando...':'Arraste arquivos ou clique para selecionar'}</div>
          <div style={{fontSize:10,color:'#bbb',marginTop:2}}>PDF, imagens, Word, Excel…</div>
        </div>
      )}
      {docs.length > 0 ? docs.map(doc=>(
        <div key={doc.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:8,border:'1px solid #e8e8e8',background:'#fff',marginBottom:6 }}>
          <span style={{fontSize:20}}>{iconeDoc(doc.tipo)}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:NAVY,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.nome}</div>
            <div style={{fontSize:10,color:'#aaa'}}>{fmtBytes(doc.tamanho)} · {doc.criado_em?.slice(0,16)}</div>
          </div>
          <button onClick={()=>setPreview(doc)} style={{...btn('#EBF5FF','#1D6FA4'),padding:'5px 10px',fontSize:11}}><Eye size={12}/> Ver</button>
          {!modoLeitura && <button onClick={()=>excluir(doc.id)} style={{...btn('#FEF2F2','#dc2626'),padding:'5px 8px'}}><Trash2 size={12}/></button>}
        </div>
      )) : modoLeitura && (
        <div style={{padding:'16px 0',textAlign:'center',color:'#ccc',fontSize:12}}><Paperclip size={16} style={{display:'block',margin:'0 auto 6px'}}/> Nenhum documento anexado</div>
      )}
    </div>
  )
}

function SeletorProcessos({ selectedIds, onChange }) {
  const [processos, setProcessos] = useState([])
  const [busca, setBusca] = useState('')
  useEffect(()=>{ try{ setProcessos(JSON.parse(localStorage.getItem('ep_processos')||'[]')) }catch{} },[])
  const filtrados = processos.filter(p=>{ const q=busca.toLowerCase(); return !q||(p.titulo||'').toLowerCase().includes(q)||(p.cliente||'').toLowerCase().includes(q) })
  const toggle = id => onChange(selectedIds.includes(id)?selectedIds.filter(x=>x!==id):[...selectedIds,id])
  return (
    <div>
      <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar processo..." style={{...inp,marginBottom:6}}/>
      <div style={{maxHeight:160,overflowY:'auto',border:'1px solid #e8e8e8',borderRadius:8}}>
        {filtrados.slice(0,30).map(p=>{
          const cor=STATUS_CORES_PROC[p.status]||'#888'; const sel2=selectedIds.includes(p.id)
          return (
            <div key={p.id} onClick={()=>toggle(p.id)} style={{padding:'7px 12px',cursor:'pointer',borderBottom:'1px solid #f5f5f5',display:'flex',alignItems:'center',gap:8,background:sel2?'#EBF5FF':'#fff'}}>
              <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${sel2?NAVY:'#ddd'}`,background:sel2?NAVY:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {sel2&&<CheckCircle size={10} style={{color:'#fff'}}/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:NAVY,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.titulo}</div>
                <div style={{fontSize:10,color:'#aaa'}}>{p.cliente} · <span style={{color:cor,fontWeight:700}}>{p.status}</span></div>
              </div>
            </div>
          )
        })}
        {filtrados.length===0&&<div style={{padding:16,textAlign:'center',color:'#ccc',fontSize:12}}>{processos.length===0?'Nenhum processo':'Nenhum resultado'}</div>}
      </div>
    </div>
  )
}

function TagsProcessos({ processo_ids }) {
  const [processos, setProcessos] = useState([])
  useEffect(()=>{ try{ setProcessos(JSON.parse(localStorage.getItem('ep_processos')||'[]')) }catch{} },[])
  const ids = (() => { try{ return JSON.parse(processo_ids||'[]') }catch{ return [] } })()
  if (!ids.length) return null
  const vins = ids.map(id=>processos.find(p=>String(p.id)===String(id))).filter(Boolean)
  if (!vins.length) return <div style={{fontSize:12,color:'#aaa'}}>{ids.length} processo(s) (não encontrado no dispositivo)</div>
  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {vins.map(p=>{ const cor=STATUS_CORES_PROC[p.status]||'#888'; return (
        <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,border:`1px solid ${cor}33`,background:`${cor}08`}}>
          <Briefcase size={14} style={{color:cor,flexShrink:0}}/>
          <div><div style={{fontSize:13,fontWeight:700,color:NAVY}}>{p.titulo}</div><div style={{fontSize:11,color:'#888'}}>{p.cliente} · <span style={{color:cor,fontWeight:700}}>{p.status}</span></div></div>
        </div>
      )})}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function Comunicados() {
  const [aba, setAba]               = useState('lista')
  const [comunicados, setComunicados] = useState([])
  const [clientes, setClientes]     = useState([])
  const [carregando, setCarregando] = useState(false)
  const [filtroUrg, setFiltroUrg]   = useState('')
  const [filtroDept, setFiltroDept] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroTipo, setFiltroTipo]  = useState('')

  const [form, setForm]         = useState({ ...FORM_VAZIO })
  const [editandoId, setEditandoId] = useState(null)
  const [clienteBusca, setClienteBusca] = useState('')
  const [emailAvulso, setEmailAvulso]   = useState('')
  const [enviando, setEnviando]     = useState(false)
  const [salvando, setSalvando]     = useState(false)
  const [gerandoResumo, setGerandoResumo] = useState(false)
  const [uploadPendente, setUploadPendente] = useState([])

  const [smtp, setSmtp]       = useState({ host:'smtp.gmail.com',port:587,user:'',pass:'',from_name:'EPimentel Auditoria & Contabilidade',from_email:'',assinatura_html:'' })
  const [smtpSalvo, setSmtpSalvo] = useState(false)

  const [detalhe, setDetalhe]       = useState(null)
  const [abaDetalhe, setAbaDetalhe] = useState('conteudo')
  const [resposta, setResposta]     = useState('')
  const [enviandoDetalhe, setEnviandoDetalhe] = useState(false)

  const [usuariosAdmin, setUsuariosAdmin] = useState([])
  const [iaAtrasos, setIaAtrasos]     = useState('')
  const [iaCarregando, setIaCarregando] = useState(false)

  const [toasts, setToasts]         = useState([])
  const [alertaComs, setAlertaComs] = useState([])
  const [modalAlerta, setModalAlerta] = useState(false)
  const toastCnt = useRef(0)
  const uploadRef = useRef()

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const addToast = (titulo, msg, tipo='info', canais=null, dur=5000) => {
    const id = ++toastCnt.current
    setToasts(t=>[...t,{id,titulo,msg,tipo,canais}])
    if (dur>0) setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)), dur)
    return id
  }
  const fecharToast = id => setToasts(t=>t.filter(x=>x.id!==id))

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    carregarComunicados()
    try{ setClientes(JSON.parse(localStorage.getItem('ep_clientes')||'[]')) }catch{}
    try{ const raw=localStorage.getItem('epimentel_usuarios'); if(raw) setUsuariosAdmin(JSON.parse(raw).filter(u=>u.ativo!==false)) }catch{}
    fetch(`${API}/comunicados/config-smtp`).then(r=>r.json()).then(d=>setSmtp(s=>({...s,...d}))).catch(()=>{})
  }, [])

  const verificarAlertasUsuario = (lista) => {
    let nome = ''
    try{ const s=JSON.parse(localStorage.getItem('epimentel_session')||'{}'); nome=s.nome||s.name||'' }catch{}
    if (!nome) { try{ const a=JSON.parse(localStorage.getItem('epimentel_usuarios')||'[]'); if(a.length) nome=a[0].nome }catch{} }
    if (!nome) return
    const meus = lista.filter(c=>c.responsavel?.toLowerCase().includes(nome.toLowerCase())&&['pendente','enviado'].includes(c.status))
    if (meus.length) { setAlertaComs(meus); setModalAlerta(true) }
  }

  const carregarComunicados = async () => {
    setCarregando(true)
    try {
      let locais = []
      try { locais = JSON.parse(localStorage.getItem('ep_comunicados')||'[]').filter(c=>c.origem==='local') } catch {}
      const p = new URLSearchParams()
      if (filtroUrg)    p.set('urgencia', filtroUrg)
      if (filtroDept)   p.set('departamento', filtroDept)
      if (filtroStatus) p.set('status', filtroStatus)
      try {
        const r = await fetch(`${API}/comunicados/listar?${p}`)
        if (r.ok) {
          const apiLista = await r.json()
          const apiIds = new Set(apiLista.map(x=>x.id))
          const merged = [...locais.filter(l=>!apiIds.has(l.id)), ...apiLista]
          setComunicados(merged); verificarAlertasUsuario(merged); return
        }
      } catch {}
      setComunicados(locais); verificarAlertasUsuario(locais)
    } catch {} finally { setCarregando(false) }
  }
  useEffect(()=>{ carregarComunicados() },[filtroUrg,filtroDept,filtroStatus])

  const setF = (k,v) => setForm(f=>({...f,[k]:v}))

  // ── Abrir edição ──────────────────────────────────────────────────────────
  const abrirEdicao = (com) => {
    const pids   = (() => { try{ return JSON.parse(com.processo_ids||'[]') }catch{ return [] } })()
    const cids   = (() => { try{ return JSON.parse(com.cliente_ids||'[]') }catch{ return [] } })()
    const emails = (() => { try{ return JSON.parse(com.emails_extra||'[]') }catch{ return [] } })()
    setForm({
      titulo: com.titulo||'', conteudo: com.conteudo||'', resumo: com.resumo||'',
      urgencia: com.urgencia||'normal', departamento: com.departamento||'Geral',
      responsavel: com.responsavel||'', canal: com.canal||'email',
      tipo: com.tipo||'externo',
      cliente_ids: cids, emails_extra: emails, processo_ids: pids,
      usa_dominio_proprio: false, assinatura_personalizada: '',
    })
    setEditandoId(com.id)
    setUploadPendente([])
    setDetalhe(null)
    setAba('novo')
  }

  // ── Excluir ───────────────────────────────────────────────────────────────
  const excluirComunicado = async (id, titulo) => {
    if (!confirm(`Excluir "${titulo}"? Esta ação não pode ser desfeita.`)) return
    try {
      const r = await fetch(`${API}/comunicados/${id}`,{method:'DELETE'})
      if (r.ok) {
        addToast('🗑️ Excluído',`"${titulo}" foi removido.`,'info',null,4000)
        setDetalhe(null)
        await carregarComunicados()
      }
    } catch { addToast('Erro','Não foi possível excluir.','erro',null,4000) }
  }

  // ── Notificar responsável ─────────────────────────────────────────────────
  const onResp = async (nome) => {
    setF('responsavel', nome)
    if (!nome) return
    const u = usuariosAdmin.find(u=>u.nome===nome)
    const canais = [u?.email&&'📧 '+u.email, (u?.whatsapp||u?.telefone)&&'💬 '+(u?.whatsapp||u?.telefone)].filter(Boolean)
    const tid = addToast('🔔 Responsável selecionado',`${nome} — ${form.departamento}`,'alerta',canais,0)
    if (u && (u.email||u.telefone||u.whatsapp)) {
      try {
        await fetch(`${API}/comunicados/notificar-responsavel`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          responsavel:nome, departamento:form.departamento, titulo:form.titulo,
          urgencia:form.urgencia, usuario_email:u.email||'', usuario_telefone:u.whatsapp||u.telefone||''
        })})
        fecharToast(tid)
        addToast('✅ Notificado',`${nome} foi notificado${canais.length?' via '+canais.join(' e '):'.'}`, canais.length?'info':'alerta', canais, 6000)
      } catch {
        fecharToast(tid)
        addToast('⚠️ Responsável selecionado',`${nome} — notificação automática indisponível`,'alerta',null,5000)
      }
    } else {
      fecharToast(tid)
      addToast('⚠️ Responsável selecionado',`${nome} — sem e-mail/WhatsApp no Admin para notificação automática.`,'alerta',null,7000)
    }
  }

  // ── Gerar Resumo com IA ───────────────────────────────────────────────────
  const gerarResumoIA = async () => {
    if (!form.titulo.trim() && !form.conteudo.trim()) {
      addToast('Atenção','Preencha título ou conteúdo antes de gerar o resumo.','alerta',null,4000); return
    }
    setGerandoResumo(true)
    try {
      const r = await fetch(`${API}/comunicados/gerar-resumo`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ titulo:form.titulo, conteudo:form.conteudo, departamento:form.departamento, urgencia:form.urgencia, tipo:form.tipo })
      })
      const d = await r.json()
      if (d.resumo) { setF('resumo',d.resumo); addToast('✅ Resumo gerado','Preenchido automaticamente pela IA.','info',null,4000) }
      else addToast('⚠️ Sem resultado','Verifique a API Key da IA.','alerta',null,5000)
    } catch { addToast('Erro','Falha ao conectar com a IA.','erro',null,4000) }
    setGerandoResumo(false)
  }

  const verificarAtrasos = async () => {
    setIaCarregando(true); setIaAtrasos('')
    const hoje = new Date()
    const resumo = comunicados.filter(c=>c.status==='pendente').map(c=>{
      const dias=Math.floor((hoje-new Date(c.criado_em))/86400000)
      return `"${c.titulo}" (${c.urgencia}, ${c.departamento}, ${dias}d, resp: ${c.responsavel||'—'})`
    }).join('\n')
    try {
      const r=await fetch(`${API}/ai/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:`Analise comunicados pendentes e identifique críticos:\n${resumo||'Nenhum.'}`,max_tokens:600})})
      const d=await r.json(); setIaAtrasos(d.response||d.content||'Análise indisponível.')
    } catch{ setIaAtrasos('Erro ao conectar com a IA.') }
    setIaCarregando(false)
  }

  const addEmail = () => {
    if (emailAvulso?.includes('@')) { setF('emails_extra',[...form.emails_extra,emailAvulso.trim()]); setEmailAvulso('') }
  }

  // ── Salvar sem enviar (com fallback localStorage) ─────────────────────────
  const salvar = async () => {
    if (!form.titulo.trim()) { addToast('Atenção','Informe o título.','alerta',null,4000); return }
    setSalvando(true)
    try {
      let id = editandoId || null
      let ok = false
      // Tentar API primeiro
      try {
        if (editandoId) {
          const r = await fetch(`${API}/comunicados/${editandoId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
          ok=r.ok; id=editandoId
        } else {
          const r = await fetch(`${API}/comunicados/criar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,status:'salvo'})})
          if (r.ok) { const d = await r.json(); ok=true; id=d.id||d.comunicado_id||Date.now() }
        }
      } catch { ok=false }
      // Fallback: localStorage se API falhar
      if (!ok) {
        id = editandoId || `local_${Date.now()}`
        const novoReg = { ...form, id, status:'salvo', criado_em: new Date().toISOString(), origem:'local' }
        let lista = []
        try { lista = JSON.parse(localStorage.getItem('ep_comunicados')||'[]') } catch {}
        if (editandoId) { lista = lista.map(c => String(c.id)===String(editandoId)?{...c,...form}:c) }
        else { lista = [novoReg, ...lista] }
        localStorage.setItem('ep_comunicados', JSON.stringify(lista))
        ok=true
      }
      if (ok && id) {
        if (!String(id).startsWith('local_')) {
          for (const arq of uploadPendente) { const fd=new FormData(); fd.append('file',arq); try{ await fetch(`${API}/comunicados/${id}/docs`,{method:'POST',body:fd}) }catch{} }
        }
        // Abrir arquivo automaticamente se houver 1 PDF/imagem
        if (uploadPendente.length === 1) {
          const arq = uploadPendente[0]
          if (arq.type.includes('pdf') || arq.type.includes('image')) {
            setTimeout(() => window.open(URL.createObjectURL(arq), '_blank'), 800)
          }
        }
        setUploadPendente([])
        addToast('💾 Salvo', editandoId?`"${form.titulo}" atualizado.`:`"${form.titulo}" salvo.`,'info',null,5000)
        setForm({...FORM_VAZIO}); setEditandoId(null)
        await carregarComunicados()
        setTimeout(()=>setAba('lista'),1200)
      }
    } catch(e){ addToast('Erro','Não foi possível salvar.','erro',null,5000) }
    finally{ setSalvando(false) }
  }

    // ── Enviar (criar ou de salvo) ────────────────────────────────────────────
  const enviar = async () => {
    if (!form.titulo.trim()||!form.conteudo.trim()) { addToast('Atenção','Preencha título e conteúdo.','alerta',null,4000); return }
    setEnviando(true)
    try {
      let id, ok
      if (editandoId) {
        const rUpd = await fetch(`${API}/comunicados/${editandoId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
        ok=rUpd.ok; id=editandoId
        if (ok) { const rEnv = await fetch(`${API}/comunicados/${editandoId}/enviar`,{method:'POST'}); ok=rEnv.ok }
      } else {
        const r = await fetch(`${API}/comunicados/criar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
        const d = await r.json(); ok=r.ok; id=d.id
      }
      if (ok && id) {
        for (const arq of uploadPendente) { const fd=new FormData(); fd.append('file',arq); try{ await fetch(`${API}/comunicados/${id}/docs`,{method:'POST',body:fd}) }catch{} }
        setUploadPendente([])
        addToast('✅ Comunicado enviado!',`"${form.titulo}" foi enviado.`,'info',null,6000)
        setForm({...FORM_VAZIO}); setEditandoId(null)
        await carregarComunicados()
        setTimeout(()=>setAba('lista'),1200)
      }
    } catch{ addToast('Erro','Falha ao enviar.','erro',null,5000) }
    finally{ setEnviando(false) }
  }

  // ── Enviar direto da lista/detalhe (status 'salvo') ───────────────────────
  const enviarSalvo = async (com) => {
    if (!confirm(`Enviar o comunicado "${com.titulo}" agora?`)) return
    setEnviandoDetalhe(true)
    try {
      const r = await fetch(`${API}/comunicados/${com.id}/enviar`,{method:'POST'})
      if (r.ok) {
        addToast('✅ Enviado!',`"${com.titulo}" foi enviado com sucesso.`,'info',null,5000)
        setDetalhe(null)
        await carregarComunicados()
      }
    } catch{ addToast('Erro','Falha ao enviar.','erro',null,4000) }
    finally{ setEnviandoDetalhe(false) }
  }

  const responder = async (id) => {
    if (!resposta.trim()) return
    await fetch(`${API}/comunicados/responder/${id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({comunicado_id:id,resposta,respondente:'Carlos Eduardo Pimentel'})})
    setResposta(''); await carregarComunicados()
    const updated = await fetch(`${API}/comunicados/listar`).then(r=>r.json())
    setDetalhe(updated.find(c=>c.id===id)||null)
  }

  const encerrar = async (id, titulo) => {
    if (!confirm('Encerrar este comunicado?')) return
    await fetch(`${API}/comunicados/encerrar/${id}`,{method:'POST'})
    addToast('🔒 Encerrado',`"${titulo}" foi encerrado.`,'info',null,4000)
    setDetalhe(null); await carregarComunicados()
  }

  const salvarSmtp = async () => {
    await fetch(`${API}/comunicados/config-smtp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(smtp)})
    setSmtpSalvo(true); setTimeout(()=>setSmtpSalvo(false),2000)
  }

  const cancelarForm = () => { setForm({...FORM_VAZIO}); setEditandoId(null); setUploadPendente([]); setAba('lista') }

  const stats = {
    total:     comunicados.length,
    pendentes: comunicados.filter(c=>c.status==='pendente').length,
    urgentes:  comunicados.filter(c=>c.urgencia==='muito_urgente'&&!['encerrado','salvo'].includes(c.status)).length,
    atrasados: comunicados.filter(c=>c.atrasado).length,
  }
  const cliFiltrados = clientes.filter(c=>{ const q=clienteBusca.toLowerCase(); return !q||(c.nome||'').toLowerCase().includes(q)||(c.cnpj||'').includes(q) })
  const comunicadosFiltrados = filtroTipo ? comunicados.filter(c=>(c.tipo||'externo')===filtroTipo) : comunicados

  // canal options baseadas no tipo
  const canaisDisponiveis = form.tipo==='interno' ? CANAIS_INTERNO : CANAIS_EXTERNO

  // ── TELA DE DETALHE ───────────────────────────────────────────────────────
  if (detalhe) {
    const urg = URGENCIAS.find(u=>u.id===detalhe.urgencia)||URGENCIAS[1]
    const sts = STATUS_CFG[detalhe.status]||STATUS_CFG.pendente
    const resps = JSON.parse(detalhe.respostas||'[]')
    const pids  = (() => { try{ return JSON.parse(detalhe.processo_ids||'[]') }catch{ return [] } })()
    const isInterno  = (detalhe.tipo||'externo')==='interno'
    const isSalvo    = detalhe.status === 'salvo'
    const isAberto   = !['encerrado','salvo'].includes(detalhe.status)

    return (
      <div style={{padding:24,maxWidth:880,margin:'0 auto'}}>
        <Toast toasts={toasts} fechar={fecharToast}/>

        {/* Breadcrumb + ações */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20,flexWrap:'wrap'}}>
          <button onClick={()=>{setDetalhe(null);setAbaDetalhe('conteudo')}} style={{...btn('#f5f5f5','#555'),padding:'7px 12px'}}><X size={14}/> Voltar</button>
          <span style={{fontSize:11,color:'#aaa'}}>Comunicados /</span>
          <span style={{fontSize:13,fontWeight:700,color:NAVY,flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{detalhe.titulo}</span>
          {/* Enviar direto se salvo */}
          {isSalvo && (
            <button onClick={()=>enviarSalvo(detalhe)} disabled={enviandoDetalhe}
              style={{...btn('#22c55e'),opacity:enviandoDetalhe?.7:1}}>
              <Send size={13}/> {enviandoDetalhe?'Enviando...':'Enviar Agora'}
            </button>
          )}
          <button onClick={()=>abrirEdicao(detalhe)} style={{...btn('#f0f4ff',NAVY),padding:'7px 12px',border:`1px solid #c7d2fe`}}><Edit2 size={13}/> Editar</button>
          <button onClick={()=>excluirComunicado(detalhe.id,detalhe.titulo)} style={{...btn('#FEF2F2','#dc2626'),padding:'7px 12px'}}><Trash2 size={13}/> Excluir</button>
        </div>

        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e8e8e8',overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
          {/* Header card */}
          <div style={{background:`linear-gradient(135deg,${NAVY},#2d4a7a)`,padding:'18px 24px',display:'flex',gap:10,alignItems:'flex-start',flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:200}}>
              <div style={{color:'#fff',fontWeight:800,fontSize:17,marginBottom:4}}>{detalhe.titulo}</div>
              <div style={{color:GOLD,fontSize:11}}>{detalhe.departamento} · {detalhe.responsavel&&`👤 ${detalhe.responsavel} · `}{detalhe.criado_em?.slice(0,16)}</div>
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{background:isInterno?'#F3EEFF':'#EBF5FF',color:isInterno?'#6B3EC9':'#1D6FA4',padding:'4px 10px',borderRadius:10,fontSize:11,fontWeight:800}}>
                {isInterno?'🏢 Interno':'🌐 Externo'}
              </span>
              <span style={{background:urg.bg,color:urg.cor,padding:'4px 12px',borderRadius:12,fontSize:12,fontWeight:800}}>{urg.emoji} {urg.label}</span>
              <span style={{background:sts.bg,color:sts.cor,padding:'4px 12px',borderRadius:12,fontSize:12,fontWeight:800}}>{sts.label}</span>
              {isSalvo && <span style={{background:'#fff9e6',color:'#854D0E',padding:'4px 10px',borderRadius:10,fontSize:11,fontWeight:700}}>⚠️ Ainda não enviado</span>}
            </div>
          </div>

          {/* Resumo destacado */}
          {detalhe.resumo && (
            <div style={{background:'linear-gradient(135deg,#fffef2,#fff9e6)',borderBottom:'1px solid #f5e6c0',padding:'14px 24px',display:'flex',gap:12,alignItems:'flex-start'}}>
              <span style={{fontSize:22,flexShrink:0}}>📋</span>
              <div>
                <div style={{fontSize:10,fontWeight:800,color:'#854D0E',textTransform:'uppercase',letterSpacing:.8,marginBottom:5}}>Resumo da Solicitação</div>
                <div style={{fontSize:14,color:'#444',lineHeight:1.7,fontStyle:'italic'}}>{detalhe.resumo}</div>
              </div>
            </div>
          )}

          {/* Abas */}
          <div style={{display:'flex',borderBottom:'1px solid #e8e8e8',background:'#fafafa'}}>
            {[
              {id:'conteudo', label:'💬 Conteúdo'},
              {id:'docs',     label:'📎 Documentos'},
              {id:'processos',label:`🔗 Processos${pids.length?` (${pids.length})`:''}`},
            ].map(ab=>(
              <button key={ab.id} onClick={()=>setAbaDetalhe(ab.id)}
                style={{padding:'10px 18px',background:'none',border:'none',cursor:'pointer',fontSize:13,fontWeight:abaDetalhe===ab.id?800:400,color:abaDetalhe===ab.id?NAVY:'#888',borderBottom:abaDetalhe===ab.id?`3px solid ${GOLD}`:'3px solid transparent',transition:'all .15s'}}>
                {ab.label}
              </button>
            ))}
          </div>

          <div style={{padding:24}}>
            {/* Aba Conteúdo */}
            {abaDetalhe==='conteudo' && (
              <>
                <div style={{whiteSpace:'pre-wrap',fontSize:14,color:'#333',lineHeight:1.8,marginBottom:24}}>{detalhe.conteudo}</div>
                {detalhe.alerta_ia && (
                  <div style={{background:'#FEF9C3',border:'1px solid #fcd34d',borderRadius:10,padding:'14px 16px',marginBottom:20}}>
                    <div style={{fontWeight:700,color:'#854D0E',fontSize:12,marginBottom:6}}>🤖 Alerta IA ({detalhe.dias_aberto} dias em aberto)</div>
                    <div style={{fontSize:13,color:'#333',whiteSpace:'pre-wrap'}}>{detalhe.alerta_ia}</div>
                  </div>
                )}
                {resps.length>0&&(
                  <div style={{marginBottom:20}}>
                    <div style={{fontSize:11,fontWeight:800,color:'#888',marginBottom:12,textTransform:'uppercase',letterSpacing:.8}}>Respostas ({resps.length})</div>
                    {resps.map((res,i)=>(
                      <div key={i} style={{background:'#f8f9fb',borderRadius:10,padding:'12px 16px',marginBottom:8,borderLeft:`3px solid ${NAVY}33`}}>
                        <div style={{fontWeight:700,color:NAVY,fontSize:12}}>{res.respondente}</div>
                        <div style={{fontSize:11,color:'#aaa',marginBottom:6}}>{new Date(res.data).toLocaleString('pt-BR')}</div>
                        <div style={{fontSize:13,color:'#333'}}>{res.texto}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ações: responder / encerrar / enviar agora */}
                {isSalvo && (
                  <div style={{padding:'16px 20px',borderRadius:10,background:'#fff9e6',border:`1px solid ${GOLD}55`,marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
                    <span style={{fontSize:18}}>⚠️</span>
                    <div style={{flex:1,fontSize:13,color:'#854D0E'}}>Este comunicado está <strong>salvo mas não enviado</strong>. Clique em "Enviar Agora" para disparar para os destinatários.</div>
                    <button onClick={()=>enviarSalvo(detalhe)} disabled={enviandoDetalhe} style={{...btn('#22c55e'),flexShrink:0}}>
                      <Send size={13}/> {enviandoDetalhe?'Enviando...':'Enviar Agora'}
                    </button>
                  </div>
                )}

                {isAberto && (
                  <div>
                    <div style={{fontSize:11,fontWeight:800,color:'#888',marginBottom:8,textTransform:'uppercase',letterSpacing:.8}}>Adicionar Resposta</div>
                    <textarea value={resposta} onChange={e=>setResposta(e.target.value)} rows={3} placeholder="Digite sua resposta..." style={{...inp,resize:'vertical',marginBottom:10}}/>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>responder(detalhe.id)} style={btn(NAVY)}><Send size={13}/> Registrar Resposta</button>
                      <button onClick={()=>encerrar(detalhe.id, detalhe.titulo)} style={btn('#6B7280')}><Archive size={13}/> Encerrar</button>
                    </div>
                  </div>
                )}
              </>
            )}

            {abaDetalhe==='docs' && (
              <><div style={{fontSize:13,fontWeight:700,color:NAVY,marginBottom:14}}>📎 Documentos do Comunicado</div>
              <SecaoDocumentos comId={detalhe.id} modoLeitura={false}/></>
            )}

            {abaDetalhe==='processos' && (
              <div>
                <div style={{fontSize:13,fontWeight:700,color:NAVY,marginBottom:14}}>🔗 Processos Vinculados</div>
                {pids.length===0
                  ? <div style={{padding:24,textAlign:'center',color:'#ccc',background:'#fafafa',borderRadius:10,border:'2px dashed #e8e8e8'}}><Briefcase size={22} style={{opacity:.3,display:'block',margin:'0 auto 8px'}}/><div>Nenhum processo vinculado</div></div>
                  : <TagsProcessos processo_ids={detalhe.processo_ids}/>}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── LISTA PRINCIPAL ───────────────────────────────────────────────────────
  return (
    <div style={{padding:24,maxWidth:1100,margin:'0 auto'}}>
      <Toast toasts={toasts} fechar={fecharToast}/>
      {modalAlerta&&alertaComs.length>0&&<ModalAlerta comunicados={alertaComs} onClose={()=>setModalAlerta(false)}/>}

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:42,height:42,borderRadius:10,background:`linear-gradient(135deg,${NAVY},#2d4a7a)`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <MessageSquare size={20} style={{color:GOLD}}/>
          </div>
          <div>
            <div style={{fontSize:19,fontWeight:800,color:NAVY}}>Comunicados</div>
            <div style={{fontSize:12,color:'#888'}}>Comunicações avulsas com clientes, processos e departamentos</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {alertaComs.length>0&&(
            <button onClick={()=>setModalAlerta(true)} style={{...btn('#FEF9C3','#854D0E'),border:'1px solid #fcd34d',position:'relative'}}>
              <Bell size={13}/> Alertas
              <span style={{position:'absolute',top:-5,right:-5,background:'#dc2626',color:'#fff',width:17,height:17,borderRadius:'50%',fontSize:9,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900}}>{alertaComs.length}</span>
            </button>
          )}
          <button onClick={verificarAtrasos} disabled={iaCarregando} style={{...btn('#f0f4ff',NAVY),border:`1px solid #c7d2fe`}}>
            <Bot size={13}/> {iaCarregando?'Analisando...':'🤖 IA Atrasos'}
          </button>
          <button onClick={()=>{ setForm({...FORM_VAZIO}); setEditandoId(null); setUploadPendente([]); setAba(aba==='novo'?'lista':'novo') }} style={btn(NAVY)}>
            <Plus size={14}/> Novo Comunicado
          </button>
          <button onClick={()=>setAba(aba==='config_smtp'?'lista':'config_smtp')} style={{...btn('#f5f5f5','#555'),padding:'9px 12px'}}>
            <Settings size={14}/>
          </button>
        </div>
      </div>

      {/* IA Atrasos */}
      {iaAtrasos&&(
        <div style={{background:'#FFFBF0',border:'1px solid #fcd34d',borderRadius:12,padding:16,marginBottom:20}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
            <div style={{fontWeight:700,color:'#854D0E',fontSize:13}}>🤖 Análise IA — Atrasos</div>
            <button onClick={()=>setIaAtrasos('')} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa'}}><X size={14}/></button>
          </div>
          <div style={{fontSize:13,color:'#333',whiteSpace:'pre-wrap',lineHeight:1.7}}>{iaAtrasos}</div>
        </div>
      )}

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[{l:'Total',n:stats.total,c:NAVY,bg:'#EBF5FF'},{l:'Pendentes',n:stats.pendentes,c:'#854D0E',bg:'#FEF9C3'},{l:'Muito Urgentes',n:stats.urgentes,c:'#dc2626',bg:'#FEF2F2'},{l:'Atrasados (+30d)',n:stats.atrasados,c:'#6B3EC9',bg:'#F3EEFF'}].map(s=>(
          <div key={s.l} style={{background:s.bg,borderRadius:12,padding:'14px 16px',border:`1px solid ${s.c}20`}}>
            <div style={{fontSize:24,fontWeight:800,color:s.c}}>{s.n}</div>
            <div style={{fontSize:11,color:'#888',marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Config SMTP */}
      {aba==='config_smtp'&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e8e8e8',padding:24,marginBottom:20}}>
          <div style={{fontSize:15,fontWeight:800,color:NAVY,marginBottom:16}}>⚙️ Configuração de E-mail</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            {[{k:'host',lb:'Servidor SMTP',ph:'smtp.gmail.com'},{k:'port',lb:'Porta',ph:'587',tp:'number'},{k:'user',lb:'Usuário',ph:'contato@epimentel.com.br'},{k:'pass',lb:'Senha',ph:'••••••••',tp:'password'},{k:'from_name',lb:'Nome Remetente',ph:'EPimentel'},{k:'from_email',lb:'E-mail Remetente',ph:'contato@epimentel.com.br'}].map(f=>(
              <div key={f.k}>
                <label style={{fontSize:11,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>{f.lb}</label>
                <input type={f.tp||'text'} value={smtp[f.k]||''} placeholder={f.ph} onChange={e=>setSmtp(s=>({...s,[f.k]:f.tp==='number'?Number(e.target.value):e.target.value}))} style={inp}/>
              </div>
            ))}
          </div>
          <div style={{marginTop:14}}>
            <label style={{fontSize:11,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Assinatura HTML</label>
            <textarea value={smtp.assinatura_html||''} onChange={e=>setSmtp(s=>({...s,assinatura_html:e.target.value}))} rows={4} style={{...inp,resize:'vertical',fontFamily:'monospace',fontSize:11}}/>
          </div>
          <div style={{display:'flex',gap:8,marginTop:14}}>
            <button onClick={salvarSmtp} style={btn(NAVY)}><CheckCircle size={13}/> {smtpSalvo?'Salvo!':'Salvar'}</button>
            <button onClick={()=>setAba('lista')} style={btn('#f5f5f5','#555')}><X size={13}/> Fechar</button>
          </div>
        </div>
      )}

      {/* ── FORMULÁRIO ───────────────────────────────────────────────────────── */}
      {aba==='novo'&&(
        <div style={{background:'#fff',borderRadius:14,border:`2px solid ${editandoId?GOLD:'#e8e8e8'}`,padding:24,marginBottom:20,boxShadow:'0 2px 14px rgba(0,0,0,.07)'}}>
          {/* Cabeçalho */}
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:22}}>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:NAVY}}>
                {editandoId ? <><Edit2 size={15} style={{display:'inline',verticalAlign:'middle',marginRight:7}}/> Editando Comunicado #{editandoId}</> : '✉️ Novo Comunicado'}
              </div>
              {editandoId && <div style={{fontSize:11,color:GOLD,marginTop:3,fontWeight:600}}>As alterações são salvas ao clicar em 💾 Salvar ou Enviar</div>}
            </div>
            <button onClick={cancelarForm} style={{...btn('#f5f5f5','#888'),padding:'6px 10px'}}><X size={14}/></button>
          </div>

          {/* Toggle Interno / Externo */}
          <div style={{marginBottom:22}}>
            <div style={{fontSize:11,fontWeight:700,color:'#888',marginBottom:10,textTransform:'uppercase',letterSpacing:.7}}>Tipo de Comunicado</div>
            <div style={{display:'inline-flex',borderRadius:12,overflow:'hidden',border:'2px solid #e0e0e0'}}>
              {[
                {id:'externo', label:'🌐 Externo', sub:'Clientes e parceiros',   cor:'#1D6FA4', bg:'#EBF5FF'},
                {id:'interno', label:'🏢 Interno', sub:'Equipe e departamento',  cor:'#6B3EC9', bg:'#F3EEFF'},
              ].map((t,i)=>(
                <button key={t.id}
                  onClick={()=>{
                    setF('tipo',t.id)
                    if (t.id==='interno') { setF('cliente_ids',[]); setF('emails_extra',[]); setF('canal','interno_sistema') }
                    else setF('canal','email')
                  }}
                  style={{
                    padding:'12px 30px', border:'none', cursor:'pointer', transition:'background .15s',
                    background: form.tipo===t.id ? t.bg : '#fff',
                    borderRight: i===0 ? '2px solid #e0e0e0' : 'none',
                  }}>
                  <div style={{fontSize:15,fontWeight:800,color:form.tipo===t.id?t.cor:'#aaa'}}>{t.label}</div>
                  <div style={{fontSize:10,color:form.tipo===t.id?t.cor+'aa':'#ccc',marginTop:2}}>{t.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Grid do formulário */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>

            {/* Título - full width */}
            <div style={{gridColumn:'1/-1'}}>
              <label style={{fontSize:11,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Título *</label>
              <input value={form.titulo} onChange={e=>setF('titulo',e.target.value)} placeholder="Ex: Prazo de entrega da Folha de Março" style={inp}/>
            </div>

            {/* Urgência */}
            <div>
              <label style={{fontSize:11,fontWeight:700,color:'#888',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:.7}}>Urgência</label>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {URGENCIAS.map(u=>(
                  <button key={u.id} onClick={()=>setF('urgencia',u.id)}
                    style={{padding:'6px 14px',borderRadius:20,border:`2px solid ${form.urgencia===u.id?u.cor:u.border}`,background:form.urgencia===u.id?u.bg:'#fff',color:u.cor,fontSize:12,fontWeight:700,cursor:'pointer',transition:'all .12s'}}>
                    {u.emoji} {u.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dept + Canal + Responsável */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Departamento</label>
                <select value={form.departamento} onChange={e=>setF('departamento',e.target.value)} style={sel}>
                  {DEPARTAMENTOS.map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Canal</label>
                <select value={form.canal} onChange={e=>setF('canal',e.target.value)} style={sel}>
                  {canaisDisponiveis.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>
                  Responsável
                  <span style={{marginLeft:5,fontSize:9,color:GOLD,padding:'1px 5px',borderRadius:5,background:'#fff9e6',border:`1px solid ${GOLD}44`,fontWeight:700}}>notifica</span>
                </label>
                <select value={form.responsavel} onChange={e=>onResp(e.target.value)} style={sel}>
                  <option value=''>— Selecionar —</option>
                  {(usuariosAdmin.length>0
                    ? usuariosAdmin.map(u=>u.nome)
                    : ['Carlos Eduardo Pimentel','Eduardo Pimentel','Gleidson Tavares','Luciene Alves','Yasmin Larissa']
                  ).map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {/* Conteúdo - full width */}
            <div style={{gridColumn:'1/-1'}}>
              <label style={{fontSize:11,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Conteúdo *</label>
              <textarea value={form.conteudo} onChange={e=>setF('conteudo',e.target.value)} rows={6} placeholder="Escreva o comunicado..." style={{...inp,resize:'vertical',lineHeight:1.6}}/>
            </div>

            {/* Resumo - full width */}
            <div style={{gridColumn:'1/-1'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7}}>
                <label style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:.7}}>
                  📋 Resumo da Solicitação
                  <span style={{marginLeft:8,fontSize:10,color:'#bbb',fontWeight:400,textTransform:'none',letterSpacing:0}}>gerado por IA ou preenchido manualmente</span>
                </label>
                <button onClick={gerarResumoIA} disabled={gerandoResumo}
                  style={{...btn(gerandoResumo?'#e8e8e8':NAVY,gerandoResumo?'#999':'#fff'),padding:'6px 14px',fontSize:12,flexShrink:0}}>
                  <Bot size={13}/>
                  {gerandoResumo ? '⏳ Gerando...' : '🤖 Gerar com IA'}
                </button>
              </div>
              <div style={{position:'relative'}}>
                <textarea value={form.resumo} onChange={e=>setF('resumo',e.target.value)} rows={2}
                  placeholder="Clique em '🤖 Gerar com IA' ou escreva um resumo objetivo aqui..."
                  style={{...inp,resize:'vertical',lineHeight:1.6,background:form.resumo?'#fffef8':'#fafafa',border:`1px solid ${form.resumo?GOLD+'66':'#e0e0e0'}`,paddingRight:38}}/>
                {form.resumo && (
                  <button onClick={()=>setF('resumo','')} title="Limpar"
                    style={{position:'absolute',top:10,right:10,background:'none',border:'none',cursor:'pointer',color:'#ccc',padding:0}}><X size={13}/></button>
                )}
              </div>
              {form.resumo && (
                <div style={{marginTop:5,padding:'7px 12px',borderRadius:7,background:'#fffef0',border:`1px solid ${GOLD}33`,display:'flex',gap:8,alignItems:'center'}}>
                  <span>✨</span><span style={{fontSize:11,color:'#854D0E',fontWeight:600}}>Resumo preenchido — aparecerá em destaque no comunicado e na listagem</span>
                </div>
              )}
            </div>

            {/* ── EXTERNO: Clientes + E-mails ── */}
            {form.tipo==='externo' && <>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:'#888',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:.7}}>
                  <Users size={11} style={{display:'inline',marginRight:4}}/>Clientes
                  {form.cliente_ids.length>0&&<span style={{marginLeft:6,background:NAVY,color:'#fff',fontSize:9,padding:'1px 6px',borderRadius:8}}>{form.cliente_ids.length}</span>}
                </label>
                <input value={clienteBusca} onChange={e=>setClienteBusca(e.target.value)} placeholder="Buscar cliente..." style={{...inp,marginBottom:6}}/>
                <div style={{maxHeight:160,overflowY:'auto',border:'1px solid #e8e8e8',borderRadius:8}}>
                  {cliFiltrados.slice(0,20).map(c=>{
                    const s2=form.cliente_ids.includes(c.id)
                    return (
                      <div key={c.id} onClick={()=>setF('cliente_ids',s2?form.cliente_ids.filter(x=>x!==c.id):[...form.cliente_ids,c.id])}
                        style={{padding:'7px 12px',cursor:'pointer',borderBottom:'1px solid #f5f5f5',display:'flex',alignItems:'center',gap:8,background:s2?'#EBF5FF':'#fff'}}>
                        <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${s2?NAVY:'#ddd'}`,background:s2?NAVY:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          {s2&&<CheckCircle size={10} style={{color:'#fff'}}/>}
                        </div>
                        <div>
                          <div style={{fontSize:12,fontWeight:600,color:NAVY}}>{c.nome}</div>
                          <div style={{fontSize:10,color:'#aaa'}}>{c.cnpj} · {c.tributacao||'—'}</div>
                        </div>
                      </div>
                    )
                  })}
                  {cliFiltrados.length===0&&<div style={{padding:12,textAlign:'center',color:'#ccc',fontSize:12}}>Nenhum cliente</div>}
                </div>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:'#888',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:.7}}>
                  <Mail size={11} style={{display:'inline',marginRight:4}}/>E-mails Avulsos
                </label>
                <div style={{display:'flex',gap:6,marginBottom:6}}>
                  <input value={emailAvulso} onChange={e=>setEmailAvulso(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addEmail()} placeholder="email@dominio.com.br" style={{...inp,flex:1}}/>
                  <button onClick={addEmail} style={{...btn(NAVY),padding:'9px 12px',flexShrink:0}}><Plus size={13}/></button>
                </div>
                {form.emails_extra.map((em,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:8,background:'#f8f9fb',marginBottom:4}}>
                    <Mail size={11} style={{color:'#888'}}/><span style={{flex:1,fontSize:12}}>{em}</span>
                    <button onClick={()=>setF('emails_extra',form.emails_extra.filter((_,j)=>j!==i))} style={{background:'none',border:'none',cursor:'pointer',color:'#dc2626',padding:0}}><X size={12}/></button>
                  </div>
                ))}
                <div style={{marginTop:10,padding:'10px 12px',borderRadius:8,background:'#f8f9fb',border:'1px solid #e8e8e8'}}>
                  <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                    <input type="checkbox" checked={form.usa_dominio_proprio} onChange={e=>setF('usa_dominio_proprio',e.target.checked)}/>
                    <span style={{fontSize:12,color:'#555'}}>Usar domínio próprio (config. SMTP)</span>
                  </label>
                </div>
              </div>
            </>}

            {/* ── INTERNO: banner informativo ── */}
            {form.tipo==='interno' && (
              <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderRadius:10,background:'#F3EEFF',border:'1.5px solid #d8b4fe'}}>
                <Lock size={22} style={{color:'#6B3EC9',flexShrink:0}}/>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:'#6B3EC9',marginBottom:3}}>Comunicado Interno</div>
                  <div style={{fontSize:12,color:'#7c3aed'}}>Não envolve clientes externos. O envio vai para o responsável interno selecionado acima, via canal configurado.</div>
                </div>
              </div>
            )}

            {/* Processos - full width quando interno, meia quando externo */}
            <div style={form.tipo==='interno' ? {gridColumn:'1/-1'} : {}}>
              <label style={{fontSize:11,fontWeight:700,color:'#888',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:.7}}>
                <Briefcase size={11} style={{display:'inline',marginRight:4}}/>Processos
                {form.processo_ids.length>0&&<span style={{marginLeft:6,background:'#3b82f6',color:'#fff',fontSize:9,padding:'1px 6px',borderRadius:8}}>{form.processo_ids.length}</span>}
              </label>
              <SeletorProcessos selectedIds={form.processo_ids} onChange={ids=>setF('processo_ids',ids)}/>
            </div>

            {/* Documentos */}
            <div style={form.tipo==='interno' ? {gridColumn:'1/-1'} : {}}>
              <label style={{fontSize:11,fontWeight:700,color:'#888',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:.7}}>
                <Paperclip size={11} style={{display:'inline',marginRight:4}}/>Documentos
                {uploadPendente.length>0&&<span style={{marginLeft:6,background:'#22c55e',color:'#fff',fontSize:9,padding:'1px 6px',borderRadius:8}}>{uploadPendente.length}</span>}
              </label>
              <div
                onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=GOLD}}
                onDragLeave={e=>{e.currentTarget.style.borderColor='#d0d7e6'}}
                onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor='#d0d7e6';setUploadPendente(p=>[...p,...Array.from(e.dataTransfer.files)])}}
                onClick={()=>uploadRef.current?.click()}
                style={{border:'2px dashed #d0d7e6',borderRadius:10,padding:'14px 18px',textAlign:'center',cursor:'pointer',background:'#fafbfc',marginBottom:8,transition:'border-color .2s'}}>
                <input ref={uploadRef} type="file" multiple style={{display:'none'}} onChange={e=>setUploadPendente(p=>[...p,...Array.from(e.target.files)])}/>
                <Paperclip size={16} style={{color:'#bbb',marginBottom:4}}/>
                <div style={{fontSize:12,color:'#888',fontWeight:600}}>Arraste ou clique para anexar</div>
                <div style={{fontSize:10,color:'#bbb',marginTop:2}}>PDF, imagens, Word, Excel…</div>
              </div>
              {uploadPendente.map((arq,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',borderRadius:7,border:'1px solid #e8e8e8',background:'#fff',marginBottom:4}}>
                  <span style={{fontSize:16}}>{iconeDoc(arq.type)}</span>
                  <span style={{flex:1,fontSize:12,color:NAVY,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{arq.name}</span>
                  <span style={{fontSize:10,color:'#aaa'}}>{fmtBytes(arq.size)}</span>
                  <button onClick={()=>setUploadPendente(p=>p.filter((_,j)=>j!==i))} style={{background:'none',border:'none',cursor:'pointer',color:'#dc2626',padding:0}}><X size={12}/></button>
                </div>
              ))}
            </div>
          </div>

          {/* Botões */}
          <div style={{display:'flex',gap:8,justifyContent:'flex-end',borderTop:'1px solid #f0f0f0',paddingTop:16,marginTop:4}}>
            <button onClick={cancelarForm} style={btn('#f5f5f5','#666')}><X size={13}/> Cancelar</button>
            <button onClick={salvar} disabled={salvando} style={{...btn('#f0f4ff',NAVY),border:`1px solid #c7d2fe`,opacity:salvando?.7:1}}>
              <Save size={13}/> {salvando?'Salvando...':'💾 Salvar'}
            </button>
            <button onClick={enviar} disabled={enviando} style={{...btn(enviando?'#aaa':NAVY),minWidth:160}}>
              <Send size={13}/> {enviando?'Enviando...':'Enviar Comunicado'}
            </button>
          </div>
        </div>
      )}

      {/* ── FILTROS ───────────────────────────────────────────────────────────── */}
      <div style={{background:'#fff',borderRadius:12,border:'1px solid #e8e8e8',padding:'12px 16px',marginBottom:16,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        <Filter size={13} style={{color:'#aaa',flexShrink:0}}/>
        {/* Tipo */}
        <div style={{display:'flex',gap:5}}>
          {[{id:'',lb:'Todos'},{id:'externo',lb:'🌐 Externo'},{id:'interno',lb:'🏢 Interno'}].map(t=>(
            <button key={t.id} onClick={()=>setFiltroTipo(t.id)}
              style={{padding:'4px 12px',borderRadius:16,border:`1px solid ${filtroTipo===t.id?NAVY:'#e0e0e0'}`,background:filtroTipo===t.id?NAVY:'#fff',color:filtroTipo===t.id?'#fff':'#555',fontSize:11,fontWeight:700,cursor:'pointer'}}>
              {t.lb}
            </button>
          ))}
        </div>
        {/* Urgência */}
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          {URGENCIAS.map(u=>(
            <button key={u.id} onClick={()=>setFiltroUrg(filtroUrg===u.id?'':u.id)}
              style={{padding:'4px 12px',borderRadius:16,border:`1px solid ${filtroUrg===u.id?u.cor:u.border}`,background:filtroUrg===u.id?u.bg:'#fff',color:u.cor,fontSize:11,fontWeight:700,cursor:'pointer'}}>
              {u.emoji} {u.label}
            </button>
          ))}
        </div>
        <select value={filtroDept} onChange={e=>setFiltroDept(e.target.value)} style={{...sel,width:'auto',fontSize:12,padding:'5px 10px'}}>
          <option value="">Todos departamentos</option>
          {DEPARTAMENTOS.map(d=><option key={d}>{d}</option>)}
        </select>
        <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} style={{...sel,width:'auto',fontSize:12,padding:'5px 10px'}}>
          <option value="">Todos status</option>
          <option value="salvo">💾 Salvo</option>
          <option value="pendente">Pendente</option>
          <option value="enviado">Enviado</option>
          <option value="respondido">Respondido</option>
          <option value="encerrado">Encerrado</option>
        </select>
        <button onClick={carregarComunicados} style={{...btn('#f5f5f5','#555'),padding:'5px 10px',marginLeft:'auto'}}><RefreshCw size={12}/></button>
      </div>

      {/* ── LISTA ─────────────────────────────────────────────────────────────── */}
      {carregando ? (
        <div style={{textAlign:'center',padding:40,color:'#aaa',fontSize:14}}>Carregando...</div>
      ) : comunicadosFiltrados.length===0 ? (
        <div style={{textAlign:'center',padding:48,color:'#ccc'}}>
          <MessageSquare size={40} style={{opacity:.3,marginBottom:12}}/>
          <div style={{fontSize:14}}>Nenhum comunicado encontrado</div>
          <button onClick={()=>setAba('novo')} style={{...btn(NAVY),margin:'12px auto 0'}}><Plus size={13}/> Criar primeiro comunicado</button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {comunicadosFiltrados.map(com=>{
            const urg = URGENCIAS.find(u=>u.id===com.urgencia)||URGENCIAS[1]
            const sts = STATUS_CFG[com.status]||STATUS_CFG.pendente
            const pids = (() => { try{ return JSON.parse(com.processo_ids||'[]') }catch{ return [] } })()
            const isInterno = (com.tipo||'externo')==='interno'
            const isSalvo   = com.status==='salvo'
            return (
              <div key={com.id}
                style={{background:'#fff',borderRadius:12,border:`1px solid ${isSalvo?'#d1d5db':com.atrasado?'#fcd34d':'#e8e8e8'}`,padding:'14px 18px',boxShadow:com.urgencia==='muito_urgente'?`0 0 0 2px ${urg.border}`:'0 1px 6px rgba(0,0,0,.04)',transition:'box-shadow .15s'}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 18px rgba(0,0,0,.1)'}
                onMouseLeave={e=>e.currentTarget.style.boxShadow=com.urgencia==='muito_urgente'?`0 0 0 2px ${urg.border}`:'0 1px 6px rgba(0,0,0,.04)'}>
                <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                  {/* Conteúdo clicável */}
                  <div style={{flex:1,minWidth:0,cursor:'pointer'}} onClick={()=>{setDetalhe(com);setAbaDetalhe('conteudo')}}>
                    <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:5,flexWrap:'wrap'}}>
                      <span style={{fontSize:14,fontWeight:700,color:NAVY}}>{com.titulo}</span>
                      <span style={{background:isInterno?'#F3EEFF':'#EBF5FF',color:isInterno?'#6B3EC9':'#1D6FA4',padding:'2px 8px',borderRadius:8,fontSize:10,fontWeight:700}}>
                        {isInterno?'🏢 Interno':'🌐 Externo'}
                      </span>
                      {isSalvo
                        ? <span style={{background:'#f0f0f0',color:'#6B7280',padding:'2px 9px',borderRadius:9,fontSize:11,fontWeight:700}}>💾 Salvo</span>
                        : <span style={{background:urg.bg,color:urg.cor,padding:'2px 9px',borderRadius:9,fontSize:11,fontWeight:700}}>{urg.emoji} {urg.label}</span>}
                      <span style={{background:sts.bg,color:sts.cor,padding:'2px 9px',borderRadius:9,fontSize:11,fontWeight:700}}>{sts.label}</span>
                      {com.atrasado&&<span style={{background:'#FEF9C3',color:'#854D0E',padding:'2px 9px',borderRadius:9,fontSize:11,fontWeight:800}}>⚠️ {com.dias_aberto}d</span>}
                      {com.alerta_ia&&<span style={{background:'#F3EEFF',color:'#6B3EC9',padding:'2px 9px',borderRadius:9,fontSize:11,fontWeight:700}}>🤖 IA</span>}
                      {pids.length>0&&<span style={{background:'#EBF5FF',color:'#1D6FA4',padding:'2px 9px',borderRadius:9,fontSize:11,fontWeight:700}}>🔗 {pids.length}</span>}
                    </div>
                    <div style={{fontSize:12,color:'#888',display:'flex',gap:12,flexWrap:'wrap',marginBottom:4}}>
                      <span><Building2 size={10} style={{display:'inline',marginRight:2}}/>{com.departamento}</span>
                      <span><Clock size={10} style={{display:'inline',marginRight:2}}/>{com.criado_em?.slice(0,16)}</span>
                      {com.responsavel&&<span>👤 {com.responsavel}</span>}
                    </div>
                    {/* Resumo ou trecho do conteúdo */}
                    <div style={{fontSize:12,color: com.resumo?'#555':'#999',fontStyle:com.resumo?'italic':'normal',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'90%'}}>
                      {com.resumo
                        ? <><span style={{color:GOLD,fontWeight:700,marginRight:5,fontStyle:'normal'}}>📋</span>{com.resumo}</>
                        : com.conteudo?.slice(0,110)+'...'}
                    </div>
                  </div>

                  {/* Ações rápidas */}
                  <div style={{display:'flex',gap:5,flexShrink:0,alignItems:'center',flexWrap:'wrap'}}>
                    {/* Enviar agora quando salvo */}
                    {isSalvo && (
                      <button onClick={e=>{e.stopPropagation();enviarSalvo(com)}} title="Enviar agora"
                        style={{...btn('#22c55e'),padding:'5px 10px',fontSize:11}}>
                        <Send size={11}/> Enviar
                      </button>
                    )}
                    <button onClick={e=>{e.stopPropagation();abrirEdicao(com)}} title="Editar"
                      style={{...btn('#f0f4ff',NAVY),padding:'5px 9px',border:`1px solid #c7d2fe`}}>
                      <Edit2 size={12}/>
                    </button>
                    <button onClick={e=>{e.stopPropagation();excluirComunicado(com.id,com.titulo)}} title="Excluir"
                      style={{...btn('#FEF2F2','#dc2626'),padding:'5px 9px'}}>
                      <Trash2 size={12}/>
                    </button>
                    <button onClick={()=>{setDetalhe(com);setAbaDetalhe('conteudo')}} title="Ver detalhes"
                      style={{...btn('#f5f5f5','#555'),padding:'5px 9px'}}>
                      <Eye size={12}/>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
