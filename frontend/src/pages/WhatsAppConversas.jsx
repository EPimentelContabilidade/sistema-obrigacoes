import { useState, useEffect, useRef } from 'react'
import { Send, Paperclip, Link2, Search, X, Check, CheckCheck, FileText, RefreshCw, Plus, QrCode, Wifi, WifiOff, Loader, Trash2, Reply } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'
const WPP_GREEN = '#25D366'
const BACKEND = window.location.hostname.includes('railway.app')
  ? 'https://sistema-obrigacoes-production.up.railway.app/api/v1'
  : '/api/v1'

const addDDI = (t) => { const n=(t||'').replace(/\D/g,''); return n.startsWith('55')?n:'55'+n }
const fmtHora = (iso) => { try { return new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) } catch { return '' } }
const fmtData = (iso) => { try { const d=new Date(iso),h=new Date(); if(d.toDateString()===h.toDateString()) return 'Hoje'; const on=new Date(h); on.setDate(h.getDate()-1); if(d.toDateString()===on.toDateString()) return 'Ontem'; return d.toLocaleDateString('pt-BR') } catch { return '' } }
const fmtTam = (b) => { if(!b) return ''; if(b<1024) return b+'B'; if(b<1048576) return (b/1024).toFixed(1)+'KB'; return (b/1048576).toFixed(1)+'MB' }

function Tick({ status }) {
  if(status==='lida'||status==='reproduzida') return <CheckCheck size={12} style={{color:'#53bdeb'}}/>
  if(status==='entregue') return <CheckCheck size={12} style={{color:'rgba(255,255,255,.55)'}}/>
  if(status==='enviada') return <Check size={12} style={{color:'rgba(255,255,255,.55)'}}/>
  return null
}

function Bolha({ msg, onReply }) {
  const env = msg.direcao==='enviada'
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:env?'flex-end':'flex-start',marginBottom:3}}>
      <div style={{maxWidth:'75%',padding:'7px 11px 5px',borderRadius:env?'12px 2px 12px 12px':'2px 12px 12px 12px',background:env?NAVY:'#fff',color:env?'#fff':'#333',boxShadow:'0 1px 3px rgba(0,0,0,.1)'}}>
        {!env&&msg.cliente_nome&&<div style={{fontSize:10,fontWeight:700,color:WPP_GREEN,marginBottom:2}}>{msg.cliente_nome}</div>}
        {msg.resposta_a&&<div style={{padding:'3px 8px',borderRadius:6,background:env?'rgba(255,255,255,.15)':'#f0f4ff',borderLeft:`3px solid ${WPP_GREEN}`,marginBottom:5,fontSize:11,color:env?'rgba(255,255,255,.8)':'#555'}}>{msg.resposta_a}</div>}
        {(msg.tipo==='document'||msg.tipo==='image')&&msg.nome_arquivo&&(
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 8px',borderRadius:7,background:env?'rgba(255,255,255,.12)':'#f0f4ff',marginBottom:4}}>
            <FileText size={20} style={{color:env?'#fff':NAVY,flexShrink:0}}/>
            <div style={{minWidth:0}}>
              <div style={{fontSize:11,fontWeight:600,color:env?'#fff':NAVY,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:180}}>{msg.nome_arquivo}</div>
              {msg.tamanho&&<div style={{fontSize:9,color:env?'rgba(255,255,255,.6)':'#888'}}>{fmtTam(msg.tamanho)}</div>}
            </div>
          </div>
        )}
        {msg.mensagem&&!msg.mensagem.startsWith('[')&&<div style={{fontSize:13,lineHeight:1.45,wordBreak:'break-word',whiteSpace:'pre-wrap'}}>{msg.mensagem}</div>}
        {msg.mensagem&&msg.mensagem.startsWith('[')&&!msg.nome_arquivo&&<div style={{fontSize:12,color:env?'rgba(255,255,255,.65)':'#888',fontStyle:'italic'}}>{msg.mensagem}</div>}
        <div style={{display:'flex',alignItems:'center',gap:3,justifyContent:'flex-end',marginTop:2}}>
          <span style={{fontSize:10,color:env?'rgba(255,255,255,.5)':'#aaa'}}>{fmtHora(msg.timestamp)}</span>
          {env&&<Tick status={msg.status}/>}
        </div>
      </div>
    </div>
  )
}

export default function WhatsAppConversas() {
  const [conversas, setConversas] = useState([])
  const [convSel, setConvSel] = useState(null)
  const [mensagens, setMensagens] = useState([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [busca, setBusca] = useState('')
  const [docAnexo, setDocAnexo] = useState(null)
  const [legendaDoc, setLegendaDoc] = useState('')
  const [modalLink, setModalLink] = useState(false)
  const [modalNova, setModalNova] = useState(false)
  const [modalQR, setModalQR] = useState(false)
  const [linkForm, setLinkForm] = useState({url:'',mensagem:''})
  const [novaForm, setNovaForm] = useState({telefone:'',cliente_nome:'',mensagem_inicial:''})
  const [status, setStatus] = useState(null)
  const [qrCode, setQrCode] = useState('')
  const [carregandoMsgs, setCarregandoMsgs] = useState(false)
  const [respondendo, setRespondendo] = useState(null)
  const [clientes, setClientes] = useState([])
  const [clienteBusca, setClienteBusca] = useState('')
  const chatRef = useRef()
  const inputRef = useRef()

  useEffect(() => {
    try { setClientes(JSON.parse(localStorage.getItem('ep_clientes')||'[]')) } catch {}
    verificarStatus(); carregarConversas()
    const iv = setInterval(() => { carregarConversas(); if(convSel) carregarMensagens(convSel.telefone,false) }, 8000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => { if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight }, [mensagens])

  const verificarStatus = async () => {
    try { const r=await fetch(`${BACKEND}/whatsapp/status`); const d=await r.json(); setStatus(d); if(d.status==='desconectado') buscarQR() }
    catch { setStatus({status:'erro',mensagem:'Backend indisponível'}) }
  }

  const buscarQR = async () => {
    try { const r=await fetch(`${BACKEND}/whatsapp/qrcode`); const d=await r.json(); if(d.qrcode) setQrCode(d.qrcode) } catch {}
  }

  const carregarConversas = async () => {
    try { const r=await fetch(`${BACKEND}/whatsapp/conversas`); const d=await r.json(); setConversas(d.conversas||[]) } catch {}
  }

  const carregarMensagens = async (tel, loader=true) => {
    if(loader) setCarregandoMsgs(true)
    try { const r=await fetch(`${BACKEND}/whatsapp/historico/${tel}`); const d=await r.json(); setMensagens(d.mensagens||[]) } catch {}
    if(loader) setCarregandoMsgs(false)
  }

  const selecionarConversa = async (conv) => {
    setConvSel(conv); setDocAnexo(null); setLegendaDoc(''); setRespondendo(null)
    await carregarMensagens(conv.telefone)
    await fetch(`${BACKEND}/whatsapp/marcar-todas-lidas/${conv.telefone}`,{method:'POST'})
    await carregarConversas()
    setTimeout(()=>inputRef.current?.focus(),100)
  }

  const enviarTexto = async () => {
    if(!texto.trim()||!convSel||enviando) return
    const msg = texto.trim()
    const msgFinal = respondendo ? `_↩ "${respondendo.mensagem?.substring(0,40)}"_\n\n${msg}` : msg
    setTexto(''); setRespondendo(null); setEnviando(true)
    setMensagens(prev=>[...prev,{id:'tmp_'+Date.now(),tipo:'texto',mensagem:msg,direcao:'enviada',status:'enviando',timestamp:new Date().toISOString(),resposta_a:respondendo?.mensagem?.substring(0,60)}])
    try {
      await fetch(`${BACKEND}/whatsapp/enviar-texto`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({telefone:convSel.telefone,mensagem:msgFinal,cliente_nome:convSel.cliente_nome})})
      await carregarMensagens(convSel.telefone,false); await carregarConversas()
    } catch {}
    setEnviando(false)
  }

  const enviarDocumento = async () => {
    if(!docAnexo||!convSel||enviando) return
    setEnviando(true)
    const fd=new FormData(); fd.append('arquivo',docAnexo); fd.append('telefone',convSel.telefone); fd.append('legenda',legendaDoc); fd.append('cliente_nome',convSel.cliente_nome||'')
    try {
      const r=await fetch(`${BACKEND}/whatsapp/enviar-documento`,{method:'POST',body:fd}); const d=await r.json()
      if(!r.ok) alert('Erro: '+(d.detail||JSON.stringify(d)))
      else { setDocAnexo(null); setLegendaDoc(''); await carregarMensagens(convSel.telefone,false); await carregarConversas() }
    } catch(e) { alert('Erro: '+e.message) }
    setEnviando(false)
  }

  const enviarLink = async () => {
    if(!linkForm.url||!convSel) return
    setEnviando(true)
    try {
      await fetch(`${BACKEND}/whatsapp/enviar-link`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({telefone:convSel.telefone,mensagem:linkForm.mensagem,url:linkForm.url,cliente_nome:convSel.cliente_nome})})
      setModalLink(false); setLinkForm({url:'',mensagem:''})
      await carregarMensagens(convSel.telefone,false); await carregarConversas()
    } catch {}
    setEnviando(false)
  }

  const iniciarConversa = async (tel,nome,msgInicial='') => {
    const conv={telefone:addDDI(tel),cliente_nome:nome}
    setConvSel(conv); setMensagens([]); setModalNova(false)
    if(msgInicial) {
      setEnviando(true)
      try { await fetch(`${BACKEND}/whatsapp/enviar-texto`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({telefone:addDDI(tel),mensagem:msgInicial,cliente_nome:nome})}); await carregarMensagens(addDDI(tel),false); await carregarConversas() } catch {}
      setEnviando(false)
    }
    setNovaForm({telefone:'',cliente_nome:'',mensagem_inicial:''})
  }

  const excluirConversa = async (tel) => {
    if(!confirm('Excluir histórico?')) return
    await fetch(`${BACKEND}/whatsapp/conversa/${tel}`,{method:'DELETE'}); await carregarConversas()
    if(convSel?.telefone===tel) setConvSel(null)
  }

  const convsFiltradas = conversas.filter(c=>!busca||c.cliente_nome?.toLowerCase().includes(busca.toLowerCase())||c.telefone.includes(busca.replace(/\D/g,'')))
  const cliFiltrados = clientes.filter(c=>c.ativo!==false&&(!clienteBusca||c.nome?.toLowerCase().includes(clienteBusca.toLowerCase())))
  const grupos = mensagens.reduce((acc,msg)=>{ const d=fmtData(msg.timestamp)||'Sem data'; if(!acc[d]) acc[d]=[]; acc[d].push(msg); return acc },{})
  const conectado = status?.status==='ok'

  const inp = {padding:'7px 10px',borderRadius:7,border:'1px solid #ddd',fontSize:12,outline:'none',width:'100%',boxSizing:'border-box'}

  return (
    <div style={{display:'flex',height:'calc(100vh - 44px)',fontFamily:'Inter, system-ui, sans-serif'}}>

      {/* Sidebar */}
      <div style={{width:340,minWidth:300,background:'#fff',display:'flex',flexDirection:'column',borderRight:'1px solid #e8e8e8'}}>
        <div style={{background:NAVY,padding:'12px 14px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{fontWeight:800,fontSize:16,color:'#fff'}}>💬 WhatsApp</div>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <button onClick={verificarStatus} style={{background:'transparent',border:`1px solid ${conectado?WPP_GREEN:'#dc2626'}`,borderRadius:16,padding:'3px 9px',cursor:'pointer',color:conectado?WPP_GREEN:'#fca5a5',fontSize:10,display:'flex',alignItems:'center',gap:3}}>
                {conectado?<Wifi size={11}/>:<WifiOff size={11}/>} {conectado?'Online':'Offline'}
              </button>
              {!conectado&&<button onClick={()=>{setModalQR(true);buscarQR()}} style={{background:GOLD,border:'none',borderRadius:7,padding:'4px 8px',cursor:'pointer',color:NAVY,fontSize:10,fontWeight:700,display:'flex',alignItems:'center',gap:3}}><QrCode size={11}/> QR</button>}
              <button onClick={()=>setModalNova(true)} style={{background:WPP_GREEN,border:'none',borderRadius:7,padding:'5px 10px',cursor:'pointer',color:'#fff',fontWeight:700,fontSize:12,display:'flex',alignItems:'center',gap:4}}><Plus size={12}/> Nova</button>
            </div>
          </div>
          <div style={{position:'relative'}}>
            <Search size={12} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,.4)'}}/>
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar conversa..." style={{...inp,paddingLeft:28,background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.15)',color:'#fff'}}/>
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          {convsFiltradas.length===0&&<div style={{padding:40,textAlign:'center',color:'#ccc'}}><div style={{fontSize:28,marginBottom:8}}>💬</div>Nenhuma conversa.</div>}
          {convsFiltradas.map(conv=>{
            const sel=convSel?.telefone===conv.telefone
            return (
              <div key={conv.telefone} onClick={()=>selecionarConversa(conv)}
                style={{padding:'10px 14px',borderBottom:'1px solid #f5f5f5',cursor:'pointer',background:sel?'#f0f4ff':'#fff',display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:44,height:44,borderRadius:22,background:NAVY+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:NAVY,flexShrink:0}}>
                  {conv.cliente_nome?conv.cliente_nome.charAt(0).toUpperCase():'📱'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{fontWeight:600,color:NAVY,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{conv.cliente_nome||'+'+conv.telefone}</div>
                    <div style={{fontSize:10,color:conv.nao_lidas?WPP_GREEN:'#aaa',whiteSpace:'nowrap',fontWeight:conv.nao_lidas?700:400}}>{fmtData(conv.ultima_data)}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:1}}>
                    <div style={{fontSize:11,color:'#888',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{conv.ultima_mensagem}</div>
                    {conv.nao_lidas>0&&<div style={{minWidth:19,height:19,borderRadius:10,background:WPP_GREEN,color:'#fff',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px',marginLeft:5}}>{conv.nao_lidas}</div>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chat */}
      {!convSel?(
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#f0f2f5'}}>
          <div style={{fontSize:48,marginBottom:16}}>💬</div>
          <div style={{fontSize:18,fontWeight:700,color:NAVY,marginBottom:8}}>EPimentel WhatsApp</div>
          <div style={{fontSize:13,color:'#888',textAlign:'center',maxWidth:280}}>
            Selecione uma conversa ou inicie uma nova.<br/>
            {!conectado&&<><br/><span style={{color:'#dc2626'}}>⚠ Escaneie o QR Code para conectar.</span></>}
          </div>
          {!conectado&&<button onClick={()=>{setModalQR(true);buscarQR()}} style={{marginTop:20,display:'flex',alignItems:'center',gap:8,padding:'10px 24px',borderRadius:10,background:NAVY,color:'#fff',fontWeight:700,fontSize:14,border:'none',cursor:'pointer'}}><QrCode size={16}/> Escanear QR Code</button>}
        </div>
      ):(
        <div style={{flex:1,display:'flex',flexDirection:'column'}}>
          {/* Header */}
          <div style={{padding:'10px 16px',background:NAVY,display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:40,height:40,borderRadius:20,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,color:'#fff',fontWeight:700}}>
              {convSel.cliente_nome?convSel.cliente_nome.charAt(0).toUpperCase():'📱'}
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:'#fff',fontSize:14}}>{convSel.cliente_nome||'+'+convSel.telefone}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,.55)'}}>+{convSel.telefone}</div>
            </div>
            <button onClick={()=>carregarMensagens(convSel.telefone)} style={{background:'rgba(255,255,255,.1)',border:'none',borderRadius:7,padding:'6px 8px',cursor:'pointer',color:'#fff'}}><RefreshCw size={13}/></button>
            <button onClick={()=>window.open(`https://wa.me/${addDDI(convSel.telefone)}`,'_blank')} style={{background:'rgba(255,255,255,.1)',border:'none',borderRadius:7,padding:'6px 12px',cursor:'pointer',color:'#fff',fontSize:11,fontWeight:600}}>WA ↗</button>
            <button onClick={()=>excluirConversa(convSel.telefone)} style={{background:'rgba(220,38,38,.25)',border:'none',borderRadius:7,padding:'6px 8px',cursor:'pointer',color:'#fca5a5'}}><Trash2 size={13}/></button>
          </div>

          {/* Mensagens */}
          <div ref={chatRef} style={{flex:1,overflowY:'auto',padding:'10px 16px',background:'#e5ddd5'}}>
            {carregandoMsgs&&<div style={{textAlign:'center',padding:16}}><Loader size={18} style={{color:'#888',animation:'spin 1s linear infinite'}}/></div>}
            {Object.entries(grupos).map(([data,msgs])=>(
              <div key={data}>
                <div style={{textAlign:'center',margin:'8px 0'}}><span style={{fontSize:11,color:'#888',background:'rgba(255,255,255,.75)',padding:'2px 10px',borderRadius:8}}>{data}</span></div>
                {msgs.map((msg,i)=><Bolha key={msg.id||i} msg={msg} onReply={setRespondendo}/>)}
              </div>
            ))}
            {mensagens.length===0&&!carregandoMsgs&&<div style={{textAlign:'center',marginTop:50,color:'#888',fontSize:13}}>Nenhuma mensagem ainda. Envie a primeira!</div>}
          </div>

          {/* Resposta preview */}
          {respondendo&&(
            <div style={{padding:'6px 14px',background:'#f0f4ff',borderTop:`2px solid ${NAVY}`,display:'flex',alignItems:'center',gap:10}}>
              <div style={{flex:1,borderLeft:`3px solid ${NAVY}`,paddingLeft:10}}>
                <div style={{fontSize:10,color:NAVY,fontWeight:700}}>Respondendo</div>
                <div style={{fontSize:11,color:'#555'}}>{respondendo.mensagem?.substring(0,60)}</div>
              </div>
              <button onClick={()=>setRespondendo(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa'}}><X size={14}/></button>
            </div>
          )}

          {/* Doc preview */}
          {docAnexo&&(
            <div style={{padding:'10px 14px',background:'#fff',borderTop:'1px solid #e8e8e8'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:9,background:'#f0f4ff',border:'1px solid #c7d7fd',marginBottom:8}}>
                <FileText size={20} style={{color:NAVY,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:NAVY,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{docAnexo.name}</div>
                  <div style={{fontSize:10,color:'#888'}}>{fmtTam(docAnexo.size)}</div>
                </div>
                <button onClick={()=>{setDocAnexo(null);setLegendaDoc('')}} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa'}}><X size={15}/></button>
              </div>
              <input value={legendaDoc} onChange={e=>setLegendaDoc(e.target.value)} placeholder="Legenda (opcional)" style={{...inp,marginBottom:8,fontSize:12}} onKeyDown={e=>e.key==='Enter'&&enviarDocumento()}/>
              <button onClick={enviarDocumento} disabled={enviando} style={{width:'100%',padding:'8px',borderRadius:8,background:enviando?'#ccc':NAVY,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:enviando?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                {enviando?<><Loader size={13} style={{animation:'spin 1s linear infinite'}}/> Enviando...</>:<><Send size={13}/> Enviar Documento</>}
              </button>
            </div>
          )}

          {/* Input */}
          {!docAnexo&&(
            <div style={{padding:'8px 12px',background:'#f0f2f5',display:'flex',gap:8,alignItems:'flex-end'}}>
              <label style={{width:38,height:38,borderRadius:19,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,boxShadow:'0 1px 2px rgba(0,0,0,.1)'}}>
                <Paperclip size={17} style={{color:'#888'}}/>
                <input type="file" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" style={{display:'none'}} onChange={e=>{if(e.target.files[0]){setDocAnexo(e.target.files[0]);e.target.value=''}}}/>
              </label>
              <button onClick={()=>setModalLink(true)} style={{width:38,height:38,borderRadius:19,background:'#fff',border:'none',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 1px 2px rgba(0,0,0,.1)'}}>
                <Link2 size={17} style={{color:'#888'}}/>
              </button>
              <div style={{flex:1,background:'#fff',borderRadius:20,boxShadow:'0 1px 2px rgba(0,0,0,.08)',padding:'8px 14px'}}>
                <textarea ref={inputRef} value={texto} onChange={e=>setTexto(e.target.value)} placeholder="Digite uma mensagem" rows={1}
                  style={{width:'100%',border:'none',outline:'none',resize:'none',fontSize:13,fontFamily:'inherit',maxHeight:110,overflow:'auto',background:'transparent',lineHeight:1.4}}
                  onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviarTexto()}}}/>
              </div>
              <button onClick={enviarTexto} disabled={!texto.trim()||enviando}
                style={{width:40,height:40,borderRadius:20,background:texto.trim()&&!enviando?WPP_GREEN:'#ccc',border:'none',cursor:texto.trim()&&!enviando?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background .2s',boxShadow:'0 2px 4px rgba(0,0,0,.12)'}}>
                {enviando?<Loader size={16} style={{color:'#fff',animation:'spin 1s linear infinite'}}/>:<Send size={16} style={{color:'#fff',marginLeft:1}}/>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal QR Code */}
      {modalQR&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:400}}>
          <div style={{background:'#fff',borderRadius:16,padding:28,maxWidth:360,width:'100%',textAlign:'center'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontWeight:700,color:NAVY,fontSize:16}}>📱 Conectar WhatsApp</div>
              <button onClick={()=>setModalQR(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa'}}><X size={18}/></button>
            </div>
            {qrCode?(
              <>
                <img src={qrCode.startsWith('data:')?qrCode:`data:image/png;base64,${qrCode}`} alt="QR" style={{width:220,height:220,borderRadius:12,border:'2px solid #e8e8e8'}}/>
                <div style={{fontSize:11,color:'#888',marginTop:10}}>WhatsApp → Dispositivos Conectados → Conectar dispositivo</div>
                <button onClick={()=>{buscarQR();verificarStatus()}} style={{marginTop:12,padding:'7px 18px',borderRadius:8,background:'#f0f4ff',color:NAVY,fontWeight:600,fontSize:12,border:'1px solid #c7d7fd',cursor:'pointer',display:'flex',alignItems:'center',gap:5,margin:'12px auto 0'}}>
                  <RefreshCw size={12}/> Atualizar QR
                </button>
              </>
            ):(
              <div style={{padding:40,color:'#aaa'}}><Loader size={24} style={{animation:'spin 1s linear infinite',marginBottom:10}}/><br/>Aguarde...</div>
            )}
          </div>
        </div>
      )}

      {/* Modal Link */}
      {modalLink&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
          <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:420,padding:22}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}><div style={{fontWeight:700,color:NAVY,fontSize:15}}>🔗 Enviar Link</div><button onClick={()=>setModalLink(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa'}}><X size={18}/></button></div>
            <div style={{marginBottom:10}}><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:3}}>URL *</label><input value={linkForm.url} onChange={e=>setLinkForm(f=>({...f,url:e.target.value}))} placeholder="https://..." style={inp}/></div>
            <div style={{marginBottom:16}}><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:3}}>Mensagem</label><textarea value={linkForm.mensagem} onChange={e=>setLinkForm(f=>({...f,mensagem:e.target.value}))} placeholder="Texto acompanhante..." style={{...inp,height:70,resize:'vertical',fontFamily:'inherit'}}/></div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>setModalLink(false)} style={{padding:'8px 14px',borderRadius:8,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:12}}>Cancelar</button>
              <button onClick={enviarLink} disabled={!linkForm.url||enviando} style={{display:'flex',alignItems:'center',gap:5,padding:'8px 18px',borderRadius:8,background:!linkForm.url||enviando?'#ccc':WPP_GREEN,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:!linkForm.url||enviando?'default':'pointer'}}>
                {enviando?<Loader size={12} style={{animation:'spin 1s linear infinite'}}/>:<Send size={12}/>} Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Conversa */}
      {modalNova&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
          <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:480,padding:22,maxHeight:'85vh',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}><div style={{fontWeight:700,color:NAVY,fontSize:15}}>💬 Nova Conversa</div><button onClick={()=>setModalNova(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa'}}><X size={18}/></button></div>
            <div style={{position:'relative',marginBottom:8}}>
              <Search size={12} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'#aaa'}}/>
              <input value={clienteBusca} onChange={e=>setClienteBusca(e.target.value)} placeholder="Buscar cliente..." style={{...inp,paddingLeft:28}}/>
            </div>
            <div style={{flex:1,overflowY:'auto',marginBottom:14,maxHeight:220}}>
              {cliFiltrados.map(cli=>{
                const wpp=cli.contatos?.find(c=>c.whatsapp)?.whatsapp||cli.whatsapp
                return(
                  <div key={cli.id} style={{display:'flex',alignItems:'center',gap:9,padding:'7px 10px',borderRadius:8,background:'#f8f9fb',border:'1px solid #e8e8e8',marginBottom:5,cursor:wpp?'pointer':'default',opacity:wpp?1:.5}} onClick={()=>wpp&&iniciarConversa(wpp,cli.nome)}>
                    <div style={{width:32,height:32,borderRadius:16,background:NAVY+'15',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:NAVY,flexShrink:0}}>{cli.nome.charAt(0)}</div>
                    <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:NAVY}}>{cli.nome}</div><div style={{fontSize:10,color:'#888'}}>{wpp?`📱 ${wpp}`:'Sem WhatsApp'}</div></div>
                    {wpp&&<Send size={12} style={{color:WPP_GREEN}}/>}
                  </div>
                )
              })}
            </div>
            <div style={{borderTop:'1px solid #f0f0f0',paddingTop:12}}>
              <div style={{fontSize:10,fontWeight:700,color:'#aaa',textTransform:'uppercase',marginBottom:8}}>Número Avulso</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                <div><label style={{fontSize:10,color:'#888',fontWeight:600,display:'block',marginBottom:3}}>Telefone *</label><input value={novaForm.telefone} onChange={e=>setNovaForm(f=>({...f,telefone:e.target.value}))} placeholder="(62) 99999-9999" style={inp}/></div>
                <div><label style={{fontSize:10,color:'#888',fontWeight:600,display:'block',marginBottom:3}}>Nome</label><input value={novaForm.cliente_nome} onChange={e=>setNovaForm(f=>({...f,cliente_nome:e.target.value}))} placeholder="Nome" style={inp}/></div>
              </div>
              <textarea value={novaForm.mensagem_inicial} onChange={e=>setNovaForm(f=>({...f,mensagem_inicial:e.target.value}))} placeholder="Mensagem inicial (opcional)" style={{...inp,height:55,resize:'none',fontFamily:'inherit',marginBottom:8}}/>
              <button onClick={()=>iniciarConversa(novaForm.telefone,novaForm.cliente_nome,novaForm.mensagem_inicial)} disabled={!novaForm.telefone}
                style={{width:'100%',padding:'8px',borderRadius:8,background:!novaForm.telefone?'#ccc':WPP_GREEN,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:!novaForm.telefone?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                <Send size={12}/> Iniciar Conversa
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}*{scrollbar-width:thin;scrollbar-color:#ddd transparent}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#ddd;border-radius:2px}`}</style>
    </div>
  )
}
