import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Send, X, Eye, CheckCircle, Clock, MessageSquare,
         Briefcase, Building2, Bot, Settings, Mail, Filter,
         Archive, RefreshCw, Paperclip, Download, Trash2, Bell,
         Save, Edit2, Users, Lock } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'
const API = window.location.hostname === 'localhost' ? '/api/v1' : 'https://api.epimentel.com.br/api/v1'

const URGENCIAS = [
  { id:'baixa',         label:'Baixa',         cor:'#1A7A3C', bg:'#EDFBF1', emoji:'ð¢', border:'#86efac' },
  { id:'normal',        label:'Normal',        cor:'#1D6FA4', bg:'#EBF5FF', emoji:'ðµ', border:'#93c5fd' },
  { id:'alta',          label:'Alta',          cor:'#854D0E', bg:'#FEF9C3', emoji:'ð¡', border:'#fcd34d' },
  { id:'muito_urgente', label:'Muito Urgente', cor:'#dc2626', bg:'#FEF2F2', emoji:'ð´', border:'#fca5a5' },
]
const DEPARTAMENTOS = ['Geral','Fiscal','ContÃ¡bil','Pessoal','Financeiro','JurÃ­dico','Diretoria']

// Canais separados por tipo
const CANAIS_EXTERNO = [
  { id:'email',    label:'ð§ E-mail' },
  { id:'whatsapp', label:'ð¬ WhatsApp' },
  { id:'ambos',    label:'ð² E-mail + WhatsApp' },
]
const CANAIS_INTERNO = [
  { id:'interno_sistema', label:'ð¢ Somente no sistema' },
  { id:'email',           label:'ð§ E-mail interno' },
  { id:'whatsapp',        label:'ð¬ WhatsApp interno' },
]

const STATUS_CFG = {
  salvo:      { label:'Salvo',      cor:'#6B7280', bg:'#f0f0f0' },
  pendente:   { label:'Pendente',   cor:'#854D0E', bg:'#FEF9C3' },
  enviado:    { label:'Enviado',    cor:'#1D6FA4', bg:'#EBF5FF' },
  respondido: { label:'Respondido', cor:'#1A7A3C', bg:'#EDFBF1' },
  encerrado:  { label:'Encerrado',  cor:'#6B7280', bg:'#f5f5f5' },
  pausado:    { label:'Pausado',    cor:'#7C3AED', bg:'#F3EEFF' },
  desistido:  { label:'Desistido',  cor:'#dc2626', bg:'#FEF2F2' },
}
const STATUS_CORES_PROC = {
  'Em Andamento':'#2196F3','Aguardando Cliente':'#FF9800',
  'ConcluÃ­do':'#4CAF50','Cancelado':'#F44336','Pendente':'#9C27B0',
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
  if ((tipo||'').includes('pdf'))   return 'ð'
  if ((tipo||'').includes('image')) return 'ð¼ï¸'
  return 'ð'
}

const FORM_VAZIO = {
  titulo:'', conteudo:'', resumo:'', urgencia:'normal', departamento:'Geral',
  responsavel:'', canal:'email', tipo:'externo',
  cliente_ids:[], emails_extra:[], whatsapps_extra:[], processo_ids:[],
  usa_dominio_proprio:false, assinatura_personalizada:'',
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Subcomponentes
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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
            {t.tipo==='alerta'?'ð':t.tipo==='erro'?'â':'â'}
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
            <div style={{ color:'#fff', fontWeight:800, fontSize:16 }}>ð Comunicado Importante!</div>
            <div style={{ color:GOLD, fontSize:12, marginTop:2 }}>VocÃª tem {comunicados.length} comunicado(s) aguardando atenÃ§Ã£o</div>
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


/* âââ ModalConfirmacao âââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
function ModalConfirmacao({ aberto, titulo, mensagem, onConfirmar, onCancelar, corBotao='#dc2626', labelBotao='Confirmar' }) {
  if (!aberto) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9997, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onCancelar}>
      <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', maxWidth:420, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,.25)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ background:'linear-gradient(135deg,#1B2A4A,#2d4a7a)', padding:'16px 20px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
            {corBotao==='#dc2626'?'\uD83D\uDDD1\uFE0F':corBotao==='#7C3AED'?'\u23F8\uFE0F':corBotao==='#6B7280'?'\uD83D\uDD12':'\u26A0\uFE0F'}
          </div>
          <div style={{ color:'#fff', fontWeight:800, fontSize:15 }}>{titulo}</div>
        </div>
        <div style={{ padding:'20px 24px', fontSize:14, color:'#444', lineHeight:1.6 }}>{mensagem}</div>
        <div style={{ padding:'14px 20px', borderTop:'1px solid #e8e8e8', display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onCancelar} style={{ padding:'9px 18px', borderRadius:8, border:'1px solid #e0e0e0', background:'#f5f5f5', color:'#555', fontWeight:600, fontSize:13, cursor:'pointer' }}>Cancelar</button>
          <button onClick={onConfirmar} style={{ padding:'9px 18px', borderRadius:8, border:'none', background:corBotao, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>{labelBotao}</button>
        </div>
      </div>
    </div>
  )
}

function ModalPreview({ doc, onClose }) {
  const url = doc.dataUrl || `${API}/comunicados/docs/arquivo/${doc.id}`
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
    // Docs locais (quando ID comeÃ§a com local_)
    if (String(comId).startsWith('local_')) {
      try { const locais = JSON.parse(localStorage.getItem(`ep_docs_${comId}`)||'[]'); setDocs(locais) } catch {}
      return
    }
    // Docs da API
    try { const r = await fetch(`${API}/comunicados/${comId}/docs`); if (r.ok) setDocs(await r.json()) } catch {}
  }, [comId])

  useEffect(() => { carregar() }, [carregar])

  const uploadArqs = async (arqs) => {
    if (!comId || !arqs.length) return
    setUploading(true)
    if (String(comId).startsWith('local_')) {
      // Salvar localmente em base64
      const docsExist = JSON.parse(localStorage.getItem(`ep_docs_${comId}`)||'[]')
      for (const a of arqs) {
        try {
          const b64 = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(a) })
          docsExist.push({ id:`doc_${Date.now()}`, nome:a.name, tipo:a.type, tamanho:a.size, dataUrl:b64, criado_em:new Date().toISOString() })
        } catch {}
      }
      localStorage.setItem(`ep_docs_${comId}`, JSON.stringify(docsExist))
      await carregar(); setUploading(false); return
    }
    for (const a of arqs) { const fd=new FormData(); fd.append('file',a); try{ await fetch(`${API}/comunicados/${comId}/docs`,{method:'POST',body:fd}) }catch{} }
    await carregar(); setUploading(false)
  }

  const excluir = async (id) => {
    if (!confirm('Excluir documento?')) return
    if (String(comId).startsWith('local_')) {
      try {
        let docs = JSON.parse(localStorage.getItem(`ep_docs_${comId}`)||'[]')
        docs = docs.filter(d=>d.id!==id)
        localStorage.setItem(`ep_docs_${comId}`, JSON.stringify(docs))
      } catch {}
      await carregar(); return
    }
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
          <div style={{fontSize:12,color:'#888',fontWeight:600}}>{uploading?'â³ Enviando...':'Arraste arquivos ou clique para selecionar'}</div>
          <div style={{fontSize:10,color:'#bbb',marginTop:2}}>PDF, imagens, Word, Excelâ¦</div>
        </div>
      )}
      {docs.length > 0 ? docs.map(doc=>(
        <div key={doc.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:8,border:'1px solid #e8e8e8',background:'#fff',marginBottom:6 }}>
          <span style={{fontSize:20}}>{iconeDoc(doc.tipo)}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:NAVY,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.nome}</div>
            <div style={{fontSize:10,color:'#aaa'}}>{fmtBytes(doc.tamanho)} Â· {doc.criado_em?.slice(0,16)}</div>
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

function SeletorProcessos({ selectedIds: rawSelectedIds, onChange }) {
  const selectedIds = Array.isArray(rawSelectedIds) ? rawSelectedIds : []
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
                <div style={{fontSize:10,color:'#aaa'}}>{p.cliente} Â· <span style={{color:cor,fontWeight:700}}>{p.status}</span></div>
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
  if (!vins.length) return <div style={{fontSize:12,color:'#aaa'}}>{ids.length} processo(s) (nÃ£o encontrado no dispositivo)</div>
  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {vins.map(p=>{ const cor=STATUS_CORES_PROC[p.status]||'#888'; return (
        <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,border:`1px solid ${cor}33`,background:`${cor}08`}}>
          <Briefcase size={14} style={{color:cor,flexShrink:0}}/>
          <div><div style={{fontSize:13,fontWeight:700,color:NAVY}}>{p.titulo}</div><div style={{fontSize:11,color:'#888'}}>{p.cliente} Â· <span style={{color:cor,fontWeight:700}}>{p.status}</span></div></div>
        </div>
      )})}
    </div>
  )
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Componente principal
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function Comunicados() {
  const [aba, setAba]               = useState('lista')
  const [comunicados, setComunicados] = useState([])
  const [clientes, setClientes]     = useState([])
  const [carregando, setCarregando] = useState(false)
  const [filtroUrg, setFiltroUrg]   = useState('')
  const [filtroDept, setFiltroDept] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroTipo, setFiltroTipo]  = useState('')
  const [buscaGlobal, setBuscaGlobal] = useState('')
  const [todosProcessos, setTodosProcessos] = useState([])

  const [form, setForm]         = useState({ ...FORM_VAZIO })
  const [editandoId, setEditandoId] = useState(null)
  const [clienteBusca, setClienteBusca] = useState('')
  const [emailAvulso, setEmailAvulso]   = useState('')
  const [whatsappAvulso, setWhatsappAvulso] = useState('')
  const [lastSync, setLastSync] = useState(null)
  const [syncando, setSyncando] = useState(false)
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
  const [modalConfirm, setModalConfirm] = useState({ aberto:false, titulo:'', mensagem:'', onConfirmar:()=>{}, onCancelar:()=>{}, corBotao:'#dc2626', labelBotao:'Confirmar' })
  const confirmar = (titulo, mensagem, onConfirmarFn, corBotao='#dc2626', labelBotao='Confirmar') => {
    setModalConfirm({ aberto:true, titulo, mensagem, corBotao, labelBotao,
      onConfirmar:()=>{ setModalConfirm(m=>({...m,aberto:false})); onConfirmarFn() },
      onCancelar:()=>setModalConfirm(m=>({...m,aberto:false})) })
  }
  const toastCnt = useRef(0)
  const uploadRef = useRef()

  // ââ Toast helpers âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const addToast = (titulo, msg, tipo='info', canais=null, dur=5000) => {
    const id = ++toastCnt.current
    setToasts(t=>[...t,{id,titulo,msg,tipo,canais}])
    if (dur>0) setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)), dur)
    return id
  }
  const fecharToast = id => setToasts(t=>t.filter(x=>x.id!==id))

  // ââ Init ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
          setComunicados(merged); verificarAlertasUsuario(merged); setLastSync(new Date()); return
        }
      } catch {}
      setComunicados(locais); verificarAlertasUsuario(locais)
    } catch {} finally { setCarregando(false); setLastSync(new Date()) }
  }
  useEffect(()=>{ try{setTodosProcessos(JSON.parse(localStorage.getItem('ep_processos')||'[]'))}catch{} },[])
  useEffect(()=>{ carregarComunicados() },[filtroUrg,filtroDept,filtroStatus])

  const setF = (k,v) => setForm(f=>({...f,[k]:v}))

  // ââ Abrir ediÃ§Ã£o ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

  // ââ Excluir âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const excluirComunicado = (id, titulo) => {
    confirmar('Excluir Comunicado', `Tem certeza que deseja excluir "${titulo}"?`, async () => {
      try {
        try {
          let lista = JSON.parse(localStorage.getItem('ep_comunicados')||'[]')
          lista = lista.filter(x => String(x.id) !== String(id))
          localStorage.setItem('ep_comunicados', JSON.stringify(lista))
          localStorage.removeItem(`ep_docs_${id}`)
        } catch {}
        if (!String(id).startsWith('local_')) {
          try { await fetch(`${API}/comunicados/${id}`,{method:'DELETE'}) } catch {}
        }
        addToast('ðï¸ ExcluÃ­do',`"${titulo}" foi removido.`,'info',null,4000)
        setDetalhe(null); await carregarComunicados()
      } catch { addToast('Erro','NÃ£o foi possÃ­vel excluir.','erro',null,4000) }
    }, '#dc2626', 'ðï¸ Excluir')
  }

    // ââ Notificar responsÃ¡vel âââââââââââââââââââââââââââââââââââââââââââââââââ
  const onResp = async (nome) => {
    setF('responsavel', nome)
    if (!nome) return
    const u = usuariosAdmin.find(u=>u.nome===nome)
    const canais = [u?.email&&'ð§ '+u.email, (u?.whatsapp||u?.telefone)&&'ð¬ '+(u?.whatsapp||u?.telefone)].filter(Boolean)
    const tid = addToast('ð ResponsÃ¡vel selecionado',`${nome} â ${form.departamento}`,'alerta',canais,0)
    if (u && (u.email||u.telefone||u.whatsapp)) {
      try {
        await fetch(`${API}/comunicados/notificar-responsavel`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          responsavel:nome, departamento:form.departamento, titulo:form.titulo,
          urgencia:form.urgencia, usuario_email:u.email||'', usuario_telefone:u.whatsapp||u.telefone||''
        })})
        fecharToast(tid)
        addToast('â Notificado',`${nome} foi notificado${canais.length?' via '+canais.join(' e '):'.'}`, canais.length?'info':'alerta', canais, 6000)
      } catch {
        fecharToast(tid)
        addToast('â ï¸ ResponsÃ¡vel selecionado',`${nome} â notificaÃ§Ã£o automÃ¡tica indisponÃ­vel`,'alerta',null,5000)
      }
    } else {
      fecharToast(tid)
      addToast('â ï¸ ResponsÃ¡vel selecionado',`${nome} â sem e-mail/WhatsApp no Admin para notificaÃ§Ã£o automÃ¡tica.`,'alerta',null,7000)
    }
  }

  // ââ Gerar Resumo com IA âââââââââââââââââââââââââââââââââââââââââââââââââââ
  const gerarResumoIA = async () => {
    if (!form.titulo.trim() && !form.conteudo.trim()) {
      addToast('AtenÃ§Ã£o','Preencha tÃ­tulo ou conteÃºdo antes de gerar o resumo.','alerta',null,4000); return
    }
    setGerandoResumo(true)
    try {
      const r = await fetch(`${API}/comunicados/gerar-resumo`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ titulo:form.titulo, conteudo:form.conteudo, departamento:form.departamento, urgencia:form.urgencia, tipo:form.tipo })
      })
      const d = await r.json()
      if (d.resumo) { setF('resumo',d.resumo); addToast('â Resumo gerado','Preenchido automaticamente pela IA.','info',null,4000) }
      else addToast('â ï¸ Sem resultado','Verifique a API Key da IA.','alerta',null,5000)
    } catch { addToast('Erro','Falha ao conectar com a IA.','erro',null,4000) }
    setGerandoResumo(false)
  }

  const verificarAtrasos = async () => {
    setIaCarregando(true); setIaAtrasos('')
    const hoje = new Date()
    const resumo = comunicados.filter(c=>c.status==='pendente').map(c=>{
      const dias=Math.floor((hoje-new Date(c.criado_em))/86400000)
      return `"${c.titulo}" (${c.urgencia}, ${c.departamento}, ${dias}d, resp: ${c.responsavel||'â'})`
    }).join('\n')
    try {
      const r=await fetch(`${API}/ai/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:`Analise comunicados pendentes e identifique crÃ­ticos:\n${resumo||'Nenhum.'}`,max_tokens:600})})
      const d=await r.json(); setIaAtrasos(d.response||d.content||'AnÃ¡lise indisponÃ­vel.')
    } catch{ setIaAtrasos('Erro ao conectar com a IA.') }
    setIaCarregando(false)
  }

  const addEmail = () => {
    if (emailAvulso?.includes('@')) { setF('emails_extra',[...form.emails_extra,emailAvulso.trim()]); setEmailAvulso('') }
  }
  const addWhatsApp = () => {
    const n = whatsappAvulso.trim()
    if (n.length >= 8) { setF('whatsapps_extra',[...(form.whatsapps_extra||[]),n]); setWhatsappAvulso('') }
  }

  // ââ Salvar sem enviar (com fallback localStorage) âââââââââââââââââââââââââ
  const salvar = async () => {
    if (!form.titulo.trim()) { addToast('AtenÃ§Ã£o','Informe o tÃ­tulo.','alerta',null,4000); return }
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
          // API disponÃ­vel: upload normal
          for (const arq of uploadPendente) { const fd=new FormData(); fd.append('file',arq); try{ await fetch(`${API}/comunicados/${id}/docs`,{method:'POST',body:fd}) }catch{} }
        } else if (uploadPendente.length > 0) {
          // Sem API: salvar arquivos como base64 no localStorage
          const docsLocais = []
          for (const arq of uploadPendente) {
            try {
              const b64 = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(arq) })
              docsLocais.push({ id:`doc_${Date.now()}_${Math.random().toString(36).slice(2)}`, nome:arq.name, tipo:arq.type, tamanho:arq.size, dataUrl:b64, criado_em:new Date().toISOString() })
            } catch {}
          }
          if (docsLocais.length) {
            // Mesclar com docs jÃ¡ existentes (nÃ£o sobrescrever)
            let jaExistem = []
            try { jaExistem = JSON.parse(localStorage.getItem(`ep_docs_${id}`)||'[]') } catch {}
            localStorage.setItem(`ep_docs_${id}`, JSON.stringify([...jaExistem, ...docsLocais]))
          }
        }
        // Abrir arquivo automaticamente se houver 1 PDF/imagem
        if (uploadPendente.length === 1) {
          const arq = uploadPendente[0]
          if (arq.type.includes('pdf') || arq.type.includes('image')) {
            setTimeout(() => window.open(URL.createObjectURL(arq), '_blank'), 800)
          }
        }
        setUploadPendente([])
        addToast('ð¾ Salvo', editandoId?`"${form.titulo}" atualizado.`:`"${form.titulo}" salvo.`,'info',null,5000)
        setForm({...FORM_VAZIO}); setEditandoId(null)
        await carregarComunicados()
        setTimeout(()=>setAba('lista'),1200)
      }
    } catch(e){ addToast('Erro','NÃ£o foi possÃ­vel salvar.','erro',null,5000) }
    finally{ setSalvando(false) }
  }

    // ââ Enviar (criar ou de salvo) ââââââââââââââââââââââââââââââââââââââââââââ
  const enviar = async () => {
    if (!form.titulo.trim()||!form.conteudo.trim()) { addToast('AtenÃ§Ã£o','Preencha tÃ­tulo e conteÃºdo.','alerta',null,4000); return }
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
        addToast('â Comunicado enviado!',`"${form.titulo}" foi enviado.`,'info',null,6000)
        setForm({...FORM_VAZIO}); setEditandoId(null)
        await carregarComunicados()
        setTimeout(()=>setAba('lista'),1200)
      }
    } catch{ addToast('Erro','Falha ao enviar.','erro',null,5000) }
    finally{ setEnviando(false) }
  }

  // ââ Enviar direto da lista/detalhe (status 'salvo') âââââââââââââââââââââââ
  const enviarSalvo = async (com) => {
    if (!confirm(`Enviar o comunicado "${com.titulo}" agora?`)) return
    setEnviandoDetalhe(true)
    try {
      const r = await fetch(`${API}/comunicados/${com.id}/enviar`,{method:'POST'})
      if (r.ok) {
        addToast('â Enviado!',`"${com.titulo}" foi enviado com sucesso.`,'info',null,5000)
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

  const encerrar = (id, titulo) => {
    confirmar('Encerrar Comunicado', `Encerrar "${titulo}"?`, async () => {
      try { await fetch(`${API}/comunicados/encerrar/${id}`,{method:'POST'}) } catch {}
      try {
        let lista = JSON.parse(localStorage.getItem('ep_comunicados')||'[]')
        lista = lista.map(x=>String(x.id)===String(id)?{...x,status:'encerrado'}:x)
        localStorage.setItem('ep_comunicados', JSON.stringify(lista))
      } catch {}
      addToast('ð Encerrado',`"${titulo}" foi encerrado.`,'info',null,4000)
      setDetalhe(null); await carregarComunicados()
    }, '#6B7280', 'ð Encerrar')
  }

  const pausar = (id, titulo) => {
    confirmar('Pausar Comunicado', `Pausar "${titulo}"? O comunicado ficarÃ¡ aguardando.`, async () => {
      try { await fetch(`${API}/comunicados/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'pausado'})}) } catch {}
      try {
        let lista = JSON.parse(localStorage.getItem('ep_comunicados')||'[]')
        lista = lista.map(x=>String(x.id)===String(id)?{...x,status:'pausado'}:x)
        localStorage.setItem('ep_comunicados', JSON.stringify(lista))
      } catch {}
      addToast('â¸ï¸ Pausado',`"${titulo}" foi pausado.`,'info',null,4000)
      setDetalhe(null); await carregarComunicados()
    }, '#7C3AED', 'â¸ï¸ Pausar')
  }

  const desistir = (id, titulo) => {
    confirmar('Desistir', `Marcar "${titulo}" como desistido?`, async () => {
      try { await fetch(`${API}/comunicados/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'desistido'})}) } catch {}
      try {
        let lista = JSON.parse(localStorage.getItem('ep_comunicados')||'[]')
        lista = lista.map(x=>String(x.id)===String(id)?{...x,status:'desistido'}:x)
        localStorage.setItem('ep_comunicados', JSON.stringify(lista))
      } catch {}
      addToast('ð« Desistido',`"${titulo}" marcado como desistido.`,'alerta',null,4000)
      setDetalhe(null); await carregarComunicados()
    }, '#dc2626', 'ð« Desistir')
  }

  const reabrirComunicado = async (id, titulo) => {
    try { await fetch(`${API}/comunicados/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'pendente'})}) } catch {}
    try {
      let lista = JSON.parse(localStorage.getItem('ep_comunicados')||'[]')
      lista = lista.map(x=>String(x.id)===String(id)?{...x,status:'pendente'}:x)
      localStorage.setItem('ep_comunicados', JSON.stringify(lista))
    } catch {}
    addToast('ð Reaberto',`"${titulo}" foi reaberto.`,'info',null,4000)
    setDetalhe(null); await carregarComunicados()
  }

    const salvarSmtp = async () => {
    await fetch(`${API}/comunicados/config-smtp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(smtp)})
    setSmtpSalvo(true); setTimeout(()=>setSmtpSalvo(false),2000)
  }

  const syncManual = async () => {
    setSyncando(true)
    await carregarComunicados()
    setSyncando(false)
  }

  const backupDownload = () => {
    try {
      const dados = {
        comunicados: JSON.parse(localStorage.getItem('ep_comunicados')||'[]'),
        processos:   JSON.parse(localStorage.getItem('ep_processos')||'[]'),
        clientes:    JSON.parse(localStorage.getItem('ep_clientes')||'[]'),
        geradoEm:    new Date().toISOString(),
      }
      const blob = new Blob([JSON.stringify(dados, null, 2)], {type:'application/json'})
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `backup_comunicados_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.json`
      a.click(); URL.revokeObjectURL(url)
      addToast('✅ Backup baixado','Arquivo JSON gerado com sucesso.','info',null,4000)
    } catch { addToast('Erro','Falha ao gerar backup.','erro',null,4000) }
  }

  const cancelarForm = () => { setForm({...FORM_VAZIO}); setEditandoId(null); setUploadPendente([]); setEmailAvulso(''); setWhatsappAvulso(''); setAba('lista') }

  const stats = {
    total:     comunicados.length,
    pendentes: comunicados.filter(c=>c.status==='pendente').length,
    urgentes:  comunicados.filter(c=>c.urgencia==='muito_urgente'&&!['encerrado','salvo'].includes(c.status)).length,
    atrasados: comunicados.filter(c=>c.atrasado).length,
  }
  const cliFiltrados = clientes.filter(c=>{ const q=clienteBusca.toLowerCase(); return !q||(c.nome||'').toLowerCase().includes(q)||(c.cnpj||'').includes(q) })
  const comunicadosFiltrados = comunicados.filter(c=>{
    if(filtroTipo&&(c.tipo||'externo')!==filtroTipo) return false
    if(buscaGlobal){ const q=buscaGlobal.toLowerCase(); let n=''; try{n=JSON.parse(c.cliente_ids||'[]').map(id=>{const x=clientes.find(y=>y.id===id);return x?.nome||''}).join(' ')}catch{}; if(![c.titulo,c.assunto,c.conteudo,c.resumo,c.departamento,n].join(' ').toLowerCase().includes(q)) return false }
    return true
  })
  const processosBusca = buscaGlobal.length>=2 ? todosProcessos.filter(p=>{ const q=buscaGlobal.toLowerCase(); return (p.titulo||'').toLowerCase().includes(q)||(p.cliente||'').toLowerCase().includes(q) }).slice(0,8) : []

  // canal options baseadas no tipo
  const canaisDisponiveis = form.tipo==='interno' ? CANAIS_INTERNO : CANAIS_EXTERNO

  // ââ TELA DE DETALHE âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
      <ModalConfirmacao {...modalConfirm}/>

        {/* Breadcrumb + aÃ§Ãµes */}
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
              <div style={{color:GOLD,fontSize:11}}>{detalhe.departamento} Â· {detalhe.responsavel&&`ð¤ ${detalhe.responsavel} Â· `}{detalhe.criado_em?.slice(0,16)}</div>
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{background:isInterno?'#F3EEFF':'#EBF5FF',color:isInterno?'#6B3EC9':'#1D6FA4',padding:'4px 10px',borderRadius:10,fontSize:11,fontWeight:800}}>
                {isInterno?'ð¢ Interno':'ð Externo'}
              </span>
              <span style={{background:urg.bg,color:urg.cor,padding:'4px 12px',borderRadius:12,fontSize:12,fontWeight:800}}>{urg.emoji} {urg.label}</span>
              <span style={{background:sts.bg,color:sts.cor,padding:'4px 12px',borderRadius:12,fontSize:12,fontWeight:800}}>{sts.label}</span>
              {isSalvo && <span style={{background:'#fff9e6',color:'#854D0E',padding:'4px 10px',borderRadius:10,fontSize:11,fontWeight:700}}>â ï¸ Ainda nÃ£o enviado</span>}
            </div>
          </div>

          {/* Resumo destacado */}
          {detalhe.resumo && (
            <div style={{background:'linear-gradient(135deg,#fffef2,#fff9e6)',borderBottom:'1px solid #f5e6c0',padding:'14px 24px',display:'flex',gap:12,alignItems:'flex-start'}}>
              <span style={{fontSize:22,flexShrink:0}}>ð</span>
              <div>
                <div style={{fontSize:10,fontWeight:800,color:'#854D0E',textTransform:'uppercase',letterSpacing:.8,marginBottom:5}}>Resumo da SolicitaÃ§Ã£o</div>
                <div style={{fontSize:14,color:'#444',lineHeight:1.7,fontStyle:'italic'}}>{detalhe.resumo}</div>
              </div>
            </div>
          )}

          {/* Abas */}
          <div style={{display:'flex',borderBottom:'1px solid #e8e8e8',background:'#fafafa'}}>
            {[
              {id:'conteudo', label:'ð¬ ConteÃºdo'},
              {id:'docs',     label:'ð Documentos'},
              {id:'processos',label:`ð Processos${pids.length?` (${pids.length})`:''}`},
            ].map(ab=>(
              <button key={ab.id} onClick={()=>setAbaDetalhe(ab.id)}
                style={{padding:'10px 18px',background:'none',border:'none',cursor:'pointer',fontSize:13,fontWeight:abaDetalhe===ab.id?800:400,color:abaDetalhe===ab.id?NAVY:'#888',borderBottom:abaDetalhe===ab.id?`3px solid ${GOLD}`:'3px solid transparent',transition:'all .15s'}}>
                {ab.label}
              </button>
            ))}
          </div>

          <div style={{padding:24}}>
            {/* Aba ConteÃºdo */}
            {abaDetalhe==='conteudo' && (
              <>
                <div style={{whiteSpace:'pre-wrap',fontSize:14,color:'#333',lineHeight:1.8,marginBottom:24}}>{detalhe.conteudo}</div>
                {detalhe.alerta_ia && (
                  <div style={{background:'#FEF9C3',border:'1px solid #fcd34d',borderRadius:10,padding:'14px 16px',marginBottom:20}}>
                    <div style={{fontWeight:700,color:'#854D0E',fontSize:12,marginBottom:6}}>ð¤ Alerta IA ({detalhe.dias_aberto} dias em aberto)</div>
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

                {/* AÃ§Ãµes: responder / encerrar / enviar agora */}
                {isSalvo && (
                  <div style={{padding:'16px 20px',borderRadius:10,background:'#fff9e6',border:`1px solid ${GOLD}55`,marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
                    <span style={{fontSize:18}}>â ï¸</span>
                    <div style={{flex:1,fontSize:13,color:'#854D0E'}}>Este comunicado estÃ¡ <strong>salvo mas nÃ£o enviado</strong>. Clique em "Enviar Agora" para disparar para os destinatÃ¡rios.</div>
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
                      {!['encerrado','desistido'].includes(detalhe.status) && <button onClick={()=>pausar(detalhe.id,detalhe.titulo)} style={{...btn('#F3EEFF','#7C3AED'),border:'1px solid #c4b5fd'}}><Clock size={13}/> Pausar</button>}
                      {!['encerrado','desistido'].includes(detalhe.status) && <button onClick={()=>desistir(detalhe.id,detalhe.titulo)} style={{...btn('#FEF2F2','#dc2626'),border:'1px solid #fca5a5'}}><X size={13}/> Desistir</button>}
                      {['encerrado','pausado','desistido'].includes(detalhe.status) && <button onClick={()=>reabrirComunicado(detalhe.id,detalhe.titulo)} style={{...btn('#f0fdf4','#16a34a'),border:'1px solid #86efac'}}><RefreshCw size={13}/> Reabrir</button>}
                      {!['encerrado','desistido'].includes(detalhe.status) && <button onClick={()=>encerrar(detalhe.id, detalhe.titulo)} style={btn('#6B7280')}><Archive size={13}/> Encerrar</button>}
                    </div>
                  </div>
                )}
              </>
            )}

            {abaDetalhe==='docs' && (
              <><div style={{fontSize:13,fontWeight:700,color:NAVY,marginBottom:14}}>ð Documentos do Comunicado</div>
              <SecaoDocumentos comId={detalhe.id} modoLeitura={false}/></>
            )}

            {abaDetalhe==='processos' && (
              <div>
                <div style={{fontSize:13,fontWeight:700,color:NAVY,marginBottom:14}}>ð Processos Vinculados</div>
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

  // ââ LISTA PRINCIPAL âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
            <div style={{fontSize:12,color:'#888'}}>ComunicaÃ§Ãµes avulsas com clientes, processos e departamentos</div>
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
            <Bot size={13}/> {iaCarregando?'Analisando...':'ð¤ IA Atrasos'}
          </button>
          <button onClick={syncManual} disabled={syncando} title={lastSync?`Último sync: ${lastSync.toLocaleTimeString('pt-BR')}`:'Sincronizar'} style={{...btn('#f0f4ff',NAVY),border:'1px solid #c7d2fe',position:'relative'}}>
            <RefreshCw size={13} style={{animation:syncando?'spin 1s linear infinite':undefined}}/> {syncando?'Sync...':'Sync'}
            {lastSync&&<span style={{position:'absolute',top:-4,right:-4,background:'#22c55e',width:8,height:8,borderRadius:'50%',border:'1px solid #fff'}}/>}
          </button>
          <button onClick={backupDownload} title="Baixar backup JSON" style={{...btn('#f5f5f5','#555'),padding:'9px 12px'}}>
            <Download size={14}/>
          </button>
          <button onClick={()=>{ setForm({...FORM_VAZIO}); setEditandoId(null); setUploadPendente([]); setAba(aba==='novo'?'lista':'novo') }} style={btn(NAVY)}>
            <Plus size={14}/> Novo Comunicado
          </button>
          <button onClick={()=>setAba(aba==='config_smtp'?'lista':'config_smtp')} style={{...btn('#f5f5f5','#555'),padding:'9px 12px'}}>
            <Settings size={14}/>
          </button>
          {aba !== 'lista' && (
            <button onClick={()=>{ cancelarForm(); setAba('lista') }} style={{...btn('#f5f5f5','#555'),padding:'9px 12px',border:'1px solid #e0e0e0'}} title="Voltar">
              â Voltar
            </button>
          )}
        </div>
      </div>

      {/* IA Atrasos */}
      {iaAtrasos&&(
        <div style={{background:'#FFFBF0',border:'1px solid #fcd34d',borderRadius:12,padding:16,marginBottom:20}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
            <div style={{fontWeight:700,color:'#854D0E',fontSize:13}}>ð¤ AnÃ¡lise IA â Atrasos</div>
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
          <div style={{fontSize:15,fontWeight:800,color:NAVY,marginBottom:16}}>âï¸ ConfiguraÃ§Ã£o de E-mail</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            {[{k:'host',lb:'Servidor SMTP',ph:'smtp.gmail.com'},{k:'port',lb:'Porta',ph:'587',tp:'number'},{k:'user',lb:'UsuÃ¡rio',ph:'contato@epimentel.com.br'},{k:'pass',lb:'Senha',ph:'â¢â¢â¢â¢â¢â¢â¢â¢',tp:'password'},{k:'from_name',lb:'Nome Remetente',ph:'EPimentel'},{k:'from_email',lb:'E-mail Remetente',ph:'contato@epimentel.com.br'}].map(f=>(
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

      {/* ââ FORMULÃRIO âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
      {aba==='novo'&&(
        <div style={{background:'#fff',borderRadius:14,border:`2px solid ${editandoId?GOLD:'#e8e8e8'}`,padding:24,marginBottom:20,boxShadow:'0 2px 14px rgba(0,0,0,.07)'}}>
          {/* CabeÃ§alho */}
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:22}}>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:NAVY}}>
                {editandoId ? <><Edit2 size={15} style={{display:'inline',verticalAlign:'middle',marginRight:7}}/> Editando Comunicado #{editandoId}</> : 'âï¸ Novo Comunicado'}
              </div>
              {editandoId && <div style={{fontSize:11,color:GOLD,marginTop:3,fontWeight:600}}>As alteraÃ§Ãµes sÃ£o salvas ao clicar em ð¾ Salvar ou Enviar</div>}
            </div>
            <button onClick={cancelarForm} style={{...btn('#f5f5f5','#888'),padding:'6px 10px'}}><X size={14}/></button>
          </div>

          {/* Toggle Interno / Externo */}
          <div style={{marginBottom:22}}>
            <div style={{fontSize:11,fontWeight:700,color:'#888',marginBottom:10,textTransform:'uppercase',letterSpacing:.7}}>Tipo de Comunicado</div>
            <div style={{display:'inline-flex',borderRadius:12,overflow:'hidden',border:'2px solid #e0e0e0'}}>
              {[
                {id:'externo', label:'ð Externo', sub:'Clientes e parceiros',   cor:'#1D6FA4', bg:'#EBF5FF'},
                {id:'interno', label:'ð¢ Interno', sub:'Equipe e departamento',  cor:'#6B3EC9', bg:'#F3EEFF'},
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

          {/* Grid do formulÃ¡rio */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>

            {/* TÃ­tulo - full width */}
            <div style={{gridColumn:'1/-1'}}>
              <label style={{fontSize:11,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>TÃ­tulo *</label>
              <input value={form.titulo} onChange={e=>setF('titulo',e.target.value)} placeholder="Ex: Prazo de entrega da Folha de MarÃ§o" style={inp}/>
            </div>

            {/* UrgÃªncia */}
            <div>
              <label style={{fontSize:11,fontWeight:700,color:'#888',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:.7}}>UrgÃªncia</label>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {URGENCIAS.map(u=>(
                  <button key={u.id} onClick={()=>setF('urgencia',u.id)}
                    style={{padding:'6px 14px',borderRadius:20,border:`2px solid ${form.urgencia===u.id?u.cor:u.border}`,background:form.urgencia===u.id?u.bg:'#fff',color:u.cor,fontSize:12,fontWeight:700,cursor:'pointer',transition:'all .12s'}}>
                    {u.emoji} {u.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dept + Canal + ResponsÃ¡vel */}
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
                  ResponsÃ¡vel
                  <span style={{marginLeft:5,fontSize:9,color:GOLD,padding:'1px 5px',borderRadius:5,background:'#fff9e6',border:`1px solid ${GOLD}44`,fontWeight:700}}>notifica</span>
                </label>
                <select value={form.responsavel} onChange={e=>onResp(e.target.value)} style={sel}>
                  <option value=''>â Selecionar â</option>
                  {(usuariosAdmin.length>0
                    ? usuariosAdmin.map(u=>u.nome)
                    : ['Carlos Eduardo Pimentel','Eduardo Pimentel','Gleidson Tavares','Luciene Alves','Yasmin Larissa']
                  ).map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {/* ConteÃºdo - full width */}
            <div style={{gridColumn:'1/-1'}}>
              <label style={{fontSize:11,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>ConteÃºdo *</label>
              <textarea value={form.conteudo} onChange={e=>setF('conteudo',e.target.value)} rows={6} placeholder="Escreva o comunicado..." style={{...inp,resize:'vertical',lineHeight:1.6}}/>
            </div>

            {/* Resumo - full width */}
            <div style={{gridColumn:'1/-1'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7}}>
                <label style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:.7}}>
                  ð Resumo da SolicitaÃ§Ã£o
                  <span style={{marginLeft:8,fontSize:10,color:'#bbb',fontWeight:400,textTransform:'none',letterSpacing:0}}>gerado por IA ou preenchido manualmente</span>
                </label>
                <button onClick={gerarResumoIA} disabled={gerandoResumo}
                  style={{...btn(gerandoResumo?'#e8e8e8':NAVY,gerandoResumo?'#999':'#fff'),padding:'6px 14px',fontSize:12,flexShrink:0}}>
                  <Bot size={13}/>
                  {gerandoResumo ? 'â³ Gerando...' : 'ð¤ Gerar com IA'}
                </button>
              </div>
              <div style={{position:'relative'}}>
                <textarea value={form.resumo} onChange={e=>setF('resumo',e.target.value)} rows={2}
                  placeholder="Clique em 'ð¤ Gerar com IA' ou escreva um resumo objetivo aqui..."
                  style={{...inp,resize:'vertical',lineHeight:1.6,background:form.resumo?'#fffef8':'#fafafa',border:`1px solid ${form.resumo?GOLD+'66':'#e0e0e0'}`,paddingRight:38}}/>
                {form.resumo && (
                  <button onClick={()=>setF('resumo','')} title="Limpar"
                    style={{position:'absolute',top:10,right:10,background:'none',border:'none',cursor:'pointer',color:'#ccc',padding:0}}><X size={13}/></button>
                )}
              </div>
              {form.resumo && (
                <div style={{marginTop:5,padding:'7px 12px',borderRadius:7,background:'#fffef0',border:`1px solid ${GOLD}33`,display:'flex',gap:8,alignItems:'center'}}>
                  <span>â¨</span><span style={{fontSize:11,color:'#854D0E',fontWeight:600}}>Resumo preenchido â aparecerÃ¡ em destaque no comunicado e na listagem</span>
                </div>
              )}
            </div>

            {/* ââ Clientes (externo e interno) + E-mails (sÃ³ externo) ââ */}
            <>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:'#888',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:.7}}>
                  <Users size={11} style={{display:'inline',marginRight:4}}/>Clientes
                  {form.cliente_ids.length>0&&<span style={{marginLeft:6,background:NAVY,color:'#fff',fontSize:9,padding:'1px 6px',borderRadius:8}}>{form.cliente_ids.length}</span>}
                </label>
                <input value={clienteBusca} onChange={e=>setClienteBusca(e.target.value)} placeholder="ð Filtrar clientes (todos listados abaixo)..." style={{...inp,marginBottom:6}}/>
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
                          <div style={{fontSize:10,color:'#aaa'}}>{c.cnpj} Â· {c.tributacao||'â'}</div>
                        </div>
                      </div>
                    )
                  })}
                  {cliFiltrados.length===0&&<div style={{padding:12,textAlign:'center',color:'#ccc',fontSize:12}}>Nenhum cliente</div>}
                </div>
              </div>

              {form.tipo === 'externo' && (<>
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
                    <span style={{fontSize:12,color:'#555'}}>Usar domÃ­nio prÃ³prio (config. SMTP)</span>
                  </label>
                </div>
              </div>

              {/* WhatsApps avulsos */}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:'#888',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:.7}}>
                  ð¬ WhatsApps Avulsos
                </label>
                <div style={{display:'flex',gap:6,marginBottom:6}}>
                  <input value={whatsappAvulso} onChange={e=>setWhatsappAvulso(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addWhatsApp()} placeholder="(62) 99999-9999" style={{...inp,flex:1}}/>
                  <button onClick={addWhatsApp} style={{...btn(NAVY),padding:'9px 12px',flexShrink:0}}><Plus size={13}/></button>
                </div>
                {(form.whatsapps_extra||[]).map((wpp,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:8,background:'#f0fdf4',marginBottom:4}}>
                    <span style={{fontSize:13}}>ð¬</span>
                    <span style={{flex:1,fontSize:12}}>{wpp}</span>
                    <button onClick={()=>setF('whatsapps_extra',(form.whatsapps_extra||[]).filter((_,j)=>j!==i))} style={{background:'none',border:'none',cursor:'pointer',color:'#dc2626',padding:0}}><X size={12}/></button>
                  </div>
                ))}
              </div>
              </>)}
            </>

            {/* ââ INTERNO: banner informativo ââ */}
            {form.tipo==='interno' && (
              <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderRadius:10,background:'#F3EEFF',border:'1.5px solid #d8b4fe'}}>
                <Lock size={22} style={{color:'#6B3EC9',flexShrink:0}}/>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:'#6B3EC9',marginBottom:3}}>Comunicado Interno</div>
                  <div style={{fontSize:12,color:'#7c3aed'}}>NÃ£o envolve clientes externos. O envio vai para o responsÃ¡vel interno selecionado acima, via canal configurado.</div>
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
                <div style={{fontSize:10,color:'#bbb',marginTop:2}}>PDF, imagens, Word, Excelâ¦</div>
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

          {/* BotÃµes */}
          <div style={{display:'flex',gap:8,justifyContent:'flex-end',borderTop:'1px solid #f0f0f0',paddingTop:16,marginTop:4}}>
            <button onClick={cancelarForm} style={btn('#f5f5f5','#666')}><X size={13}/> Cancelar</button>
            <button onClick={salvar} disabled={salvando} style={{...btn('#f0f4ff',NAVY),border:`1px solid #c7d2fe`,opacity:salvando?.7:1}}>
              <Save size={13}/> {salvando?'Salvando...':'ð¾ Salvar'}
            </button>
            <button onClick={enviar} disabled={enviando} style={{...btn(enviando?'#aaa':NAVY),minWidth:160}}>
              <Send size={13}/> {enviando?'Enviando...':'Enviar Comunicado'}
            </button>
          </div>
        </div>
      )}

      {/* ââ FILTROS âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
      <div style={{background:'#fff',borderRadius:12,border:'1px solid #e8e8e8',padding:'12px 16px',marginBottom:16,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        <Filter size={13} style={{color:'#aaa',flexShrink:0}}/>
        {/* Tipo */}
        <div style={{display:'flex',gap:5}}>
          <div style={{marginBottom:12,position:'relative'}}>
            <input value={buscaGlobal} onChange={e=>setBuscaGlobal(e.target.value)} placeholder="ð Pesquisar comunicados e processos por palavra-chave..." style={{width:'100%',padding:'9px 36px 9px 14px',borderRadius:10,border:'1.5px solid #e0e0e0',fontSize:13,outline:'none',boxSizing:'border-box',background:'#fafafa'}}/>
            {buscaGlobal&&<button onClick={()=>setBuscaGlobal('')} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#aaa',fontSize:18}}>Ã</button>}
            {processosBusca.length>0&&<div style={{marginTop:6,background:'#EBF5FF',borderRadius:8,padding:'8px 12px',border:'1px solid #c7d2fe'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#1D6FA4',marginBottom:4}}>ð Processos encontrados ({processosBusca.length})</div>
              {processosBusca.map(p=>{const cor={'Em Andamento':'#2196F3','ConcluÃ­do':'#4CAF50','Pausado':'#7C3AED','Cancelado':'#F44336'}[p.status]||'#888';return(
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0',borderBottom:'1px solid #dbeafe'}}>
                  <span style={{fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:8,background:cor+'22',color:cor,flexShrink:0}}>{p.status}</span>
                  <div><div style={{fontSize:12,fontWeight:600,color:'#1B2A4A'}}>{p.titulo}</div><div style={{fontSize:10,color:'#888'}}>{p.cliente}</div></div>
                </div>)})}
            </div>}
          </div>
          {[{id:'',lb:'Todos'},{id:'externo',lb:'ð Externo'},{id:'interno',lb:'ð¢ Interno'}].map(t=>(
            <button key={t.id} onClick={()=>setFiltroTipo(t.id)}
              style={{padding:'4px 12px',borderRadius:16,border:`1px solid ${filtroTipo===t.id?NAVY:'#e0e0e0'}`,background:filtroTipo===t.id?NAVY:'#fff',color:filtroTipo===t.id?'#fff':'#555',fontSize:11,fontWeight:700,cursor:'pointer'}}>
              {t.lb}
            </button>
          ))}
        </div>
        {/* UrgÃªncia */}
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
          <option value="salvo">ð¾ Salvo</option>
          <option value="pendente">Pendente</option>
          <option value="enviado">Enviado</option>
          <option value="respondido">Respondido</option>
          <option value="encerrado">Encerrado</option>
          <option value="pausado">â¸ï¸ Pausado</option>
          <option value="desistido">ð« Desistido</option>
        </select>
        <button onClick={carregarComunicados} style={{...btn('#f5f5f5','#555'),padding:'5px 10px',marginLeft:'auto'}}><RefreshCw size={12}/></button>
      </div>

      {/* ââ LISTA âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
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
                  {/* ConteÃºdo clicÃ¡vel */}
                  <div style={{flex:1,minWidth:0,cursor:'pointer'}} onClick={()=>{setDetalhe(com);setAbaDetalhe('conteudo')}}>
                    <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:5,flexWrap:'wrap'}}>
                      <span style={{fontSize:14,fontWeight:700,color:NAVY}}>{com.titulo}</span>
                      <span style={{background:isInterno?'#F3EEFF':'#EBF5FF',color:isInterno?'#6B3EC9':'#1D6FA4',padding:'2px 8px',borderRadius:8,fontSize:10,fontWeight:700}}>
                        {isInterno?'ð¢ Interno':'ð Externo'}
                      </span>
                      {isSalvo
                        ? <span style={{background:'#f0f0f0',color:'#6B7280',padding:'2px 9px',borderRadius:9,fontSize:11,fontWeight:700}}>ð¾ Salvo</span>
                        : <span style={{background:urg.bg,color:urg.cor,padding:'2px 9px',borderRadius:9,fontSize:11,fontWeight:700}}>{urg.emoji} {urg.label}</span>}
                      <span style={{background:sts.bg,color:sts.cor,padding:'2px 9px',borderRadius:9,fontSize:11,fontWeight:700}}>{sts.label}</span>
                      {com.atrasado&&<span style={{background:'#FEF9C3',color:'#854D0E',padding:'2px 9px',borderRadius:9,fontSize:11,fontWeight:800}}>â ï¸ {com.dias_aberto}d</span>}
                      {com.alerta_ia&&<span style={{background:'#F3EEFF',color:'#6B3EC9',padding:'2px 9px',borderRadius:9,fontSize:11,fontWeight:700}}>ð¤ IA</span>}
                      {pids.length>0&&<span style={{background:'#EBF5FF',color:'#1D6FA4',padding:'2px 9px',borderRadius:9,fontSize:11,fontWeight:700}}>ð {pids.length}</span>}
                    </div>
                    <div style={{fontSize:12,color:'#888',display:'flex',gap:12,flexWrap:'wrap',marginBottom:4}}>
                      <span><Building2 size={10} style={{display:'inline',marginRight:2}}/>{com.departamento}</span>
                      <span><Clock size={10} style={{display:'inline',marginRight:2}}/>{com.criado_em?.slice(0,16)}</span>
                      {com.responsavel&&<span>ð¤ {com.responsavel}</span>}
                    </div>
                    {/* Resumo ou trecho do conteÃºdo */}
                    <div style={{fontSize:12,color: com.resumo?'#555':'#999',fontStyle:com.resumo?'italic':'normal',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'90%'}}>
                      {com.resumo
                        ? <><span style={{color:GOLD,fontWeight:700,marginRight:5,fontStyle:'normal'}}>ð</span>{com.resumo}</>
                        : com.conteudo?.slice(0,110)+'...'}
                    </div>
                  </div>

                  {/* AÃ§Ãµes rÃ¡pidas */}
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
                    {!['encerrado','desistido'].includes(com.status) && (
                      <button onClick={e=>{e.stopPropagation();pausar(com.id,com.titulo)}} title="Pausar"
                        style={{...btn('#F3EEFF','#7C3AED'),padding:'5px 9px',border:'1px solid #c4b5fd'}}>
                        <Clock size={12}/>
                      </button>
                    )}
                    {!['encerrado','desistido'].includes(com.status) && (
                      <button onClick={e=>{e.stopPropagation();desistir(com.id,com.titulo)}} title="Desistir"
                        style={{...btn('#FEF9C3','#854D0E'),padding:'5px 9px',border:'1px solid #fcd34d'}}>
                        <Archive size={12}/>
                      </button>
                    )}
                    {['encerrado','pausado','desistido'].includes(com.status) && (
                      <button onClick={e=>{e.stopPropagation();reabrirComunicado(com.id,com.titulo)}} title="Reabrir"
                        style={{...btn('#f0fdf4','#16a34a'),padding:'5px 9px',border:'1px solid #86efac'}}>
                        <RefreshCw size={12}/>
                      </button>
                    )}
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
