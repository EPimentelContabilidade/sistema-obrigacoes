import { useState, useEffect, useRef, useCallback } from 'react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'
const WPP_GREEN = '#25D366'
const WPP_API = '/api/v1/whatsapp'

// ââ Helper: busca cliente pelo nÃºmero ââââââââââââââââââââââââââââââââââââââââ
function getClientes() { try { return JSON.parse(localStorage.getItem('ep_clientes')||'[]') } catch { return [] } }
function clientePorTel(jid) {
  const num = (jid||'').split('@')[0].replace(/\D/g,'').replace(/^55/,'')
  return getClientes().find(c => {
    const ws = (c.whatsapp||c.telefone||'').replace(/\D/g,'').replace(/^55/,'')
    return ws && ws === numh
  }) || null
}

const API = window.location.hostname === 'localhost' ? '/api/v1' : 'https://api.ephimentel.com.br/api/v1'

function tocarSom() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3)
  } catch {}
}

async function notificar(titulo, corpo) {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') await Notification.requestPermission()
  if (Notification.permission === 'granted') {
    const n = new Notification(titulo, { body: corpo, icon: '/favicon.ico', tag: 'ep-msg' })
    setTimeout(() => n.close(), 5000)
  }
}

const fmtHora = iso => { try { return new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) } catch { return '' } }

const USUARIO_LOCAL = (() => { try { return JSON.parse(localStorage.getItem('usuario')||'{}') } catch { return {} } })()
const MEU_NOME = USUARIO_LOCAL.nome || 'Eduardo Pimentel'
const MEU_AVATAR = MEU_NOME.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

function Avatar({ nome, size=38, cor=NAVY }) {
  const ini = (nome||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  return <div style={{width:size,height:size,borderRadius:'50%',background:cor,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:size*0.36,flexShrink:0}}>{ini}</div>
}

function Popup({ msg, onClose }) {
  useEffect(() => { const t=setTimeout(onClose,5000); return ()=>clearTimeout(t) },[])
  return (
    <div style={{position:'fixed',bottom:24,right:24,zIndex:9999,background:'#fff',borderRadius:12,padding:'14px 18px',boxShadow:'0 8px 32px rgba(0,0,0,.18)',border:`2px solid ${WPP_GREEN}`,maxWidth:320,display:'flex',gap:12,alignItems:'flex-start'}}>
      <div style={{fontSize:28}}>ð¬</div>
      <div style={{flex:1}}>
        <div style={{fontWeight:700,color:NAVY,fontSize:13}}>{msg.de}</div>
        <div style={{fontSize:12,color:'#555',marginTop:2}}>{msg.texto}</div>
        <div style={{fontSize:10,color:'#aaa',marginTop:4}}>{fmtHora(msg.timestamp)}</div>
      </div>
      <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa',fontSize:16}}>Ã</button>
    </div>
  )
}

// ââ TabConversas ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function TabConversas() {
  const [conversas,setConversas]=useState([])
  const [convSel,setConvSel]=useState(null)
  const [mensagens,setMensagens]=useState([])
  const [texto,setTexto]=useState('')
  const [enviando,setEnviando]=useState(false)
  const [busca,setBusca]=useState('')
  const chatRef=useRef()

  const carregar=useCallback(async()=>{
    try { const r=await fetch(`${WPP_API}/chats`); const d=await r.json(); setConversas(Array.isArray(d)?d:[]) } catch { setConversas([]) }
  },[])

  const carregarMsgs=useCallback(async(jid)=>{
    try { const r=await fetch(`${WPP_API}/messages`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({where:{key:{remoteJid:jid}},limit:50})}); const d=await r.json(); const m=Array.isArray(d?.messages?.records)?d.messages.records:[]; setMensagens(m.sort((a,b)=>a.messageTimestamp-b.messageTimestamp)) } catch { setMensagens([]) }
  },[])

  const enviar=async()=>{
    if(!texto.trim()||!convSel||enviando) return
    setEnviando(true)
    try { await fetch(`${WPP_API}/send`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({number:convSel.id,text:texto})}); setTexto(''); await carregarMsgs(convSel.id) } finally { setEnviando(false) }
  }

  useEffect(()=>{ carregar() },[])
  useEffect(()=>{ if(convSel) carregarMsgs(convSel.id) },[convSel])
  useEffect(()=>{ chatRef.current?.scrollTo(0,chatRef.current.scrollHeight) },[mensagens])
  useEffect(()=>{ const iv=setInterval(()=>{ if(convSel) carregarMsgs(convSel.id) },8000); return()=>clearInterval(iv) },[convSel])

  const filtradas=conversas.filter(c=>!busca||(c.pushName||c.id||'').toLowerCase().includes(busca.toLowerCase()))

  return (
    <div style={{display:'flex',flex:1,overflow:'hidden'}}>
      <div style={{width:300,background:'#fff',borderRight:'1px solid #E0E0E0',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'10px 12px',borderBottom:'1px solid #eee'}}>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar..." style={{width:'100%',padding:'8px 12px',borderRadius:20,border:'1px solid #ddd',fontSize:13,outline:'none',boxSizing:'border-box'}}/>
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          {filtradas.length===0&&<div style={{padding:24,textAlign:'center',color:'#aaa',fontSize:13}}>Nenhuma conversa.<br/>Conecte o WhatsApp.</div>}
          {filtradas.map(c=>(
            <div key={c.id} onClick={()=>setConvSel(c)} style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',borderBottom:'1px solid #F5F5F5',background:convSel?.id===c.id?'#E8F5E9':'transparent'}}>
              <Avatar nome={c.pushName||c.id} cor={WPP_GREEN}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,color:NAVY,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.pushName||c.id?.split('@')[0]}</div>
                <div style={{fontSize:11,color:'#888',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.lastMessage?.message?.conversation||''}</div>
              </div>
              {c.unreadCount>0&&<div style={{background:WPP_GREEN,color:'#fff',borderRadius:10,padding:'1px 7px',fontSize:11,fontWeight:700}}>{c.unreadCount}</div>}
            </div>
          ))}
        </div>
        <div style={{padding:10}}>
          <button onClick={carregar} style={{width:'100%',padding:8,background:NAVY,color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:700}}>ð Atualizar</button>
        </div>
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column',background:'#ECE5DD'}}>
        {!convSel?(
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:10}}><div style={{fontSize:48}}>ð¬</div><div style={{color:'#aaa',fontSize:14}}>Selecione uma conversa</div></div>
        ):(
          <>
            <div style={{background:'#075E54',padding:'10px 16px',display:'flex',alignItems:'center',gap:12}}>
              <Avatar nome={convSel.pushName||convSel.id} cor={WPP_GREEN}/>
              <div style={{flex:1}}>
                <div style={{color:'#fff',fontWeight:700}}>{convSel.pushName||convSel.id?.split('@')[0]}</div>
                {(()=>{ const cli=clientePorTel(convSel.id); return cli?(
                  <div style={{display:'flex',alignItems:'center',gap:8,marginTop:2}}>
                    <span style={{color:'#88c8a8',fontSize:11}}>ð {cli.nome_razao||cli.nome}</span>
                    <span style={{color:GOLD,fontSize:10,background:'rgba(197,165,90,.2)',padding:'1px 6px',borderRadius:6}}>{cli.tributacao||cli.regime}</span>
                    {cli.cnpj&&<span style={{color:'rgba(255,255,255,.5)',fontSize:10}}>{cli.cnpj}</span>}
                  </div>
                ):<div style={{color:'#88c8a8',fontSize:11}}>{convSel.id?.split('@')[0]}</div>})()}
              </div>
            </div>
            <div ref={chatRef} style={{flex:1,overflowY:'auto',padding:16,display:'flex',flexDirection:'column',gap:4}}>
              {mensagens.map((m,i)=>{
                const minha=m.key?.fromMe
                const txt=m.message?.conversation||m.message?.extendedTextMessage?.text||'[mÃ­dia]'
                return (
                  <div key={i} style={{display:'flex',justifyContent:minha?'flex-end':'flex-start'}}>
                    <div style={{maxWidth:'72%',padding:'7px 11px 5px',borderRadius:minha?'12px 2px 12px 12px':'2px 12px 12px 12px',background:minha?'#DCF8C6':'#fff',boxShadow:'0 1px 2px rgba(0,0,0,.1)',fontSize:13}}>
                      <div>{txt}</div>
                      <div style={{fontSize:10,color:'#999',textAlign:'right',marginTop:2}}>{new Date(m.messageTimestamp*1000).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}{minha&&' ââ'}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{background:'#F0F2F5',padding:'8px 12px',display:'flex',gap:8}}>
              <input value={texto} onChange={e=>setTexto(e.target.value)} onKeyDown={e=>e.key==='Enter'&&enviar()} placeholder="Digite uma mensagem..." style={{flex:1,padding:'10px 14px',borderRadius:20,border:'none',fontSize:13,outline:'none'}}/>
              <button onClick={enviar} disabled={!texto.trim()||enviando} style={{background:WPP_GREEN,color:'#fff',border:'none',borderRadius:'50%',width:42,height:42,cursor:'pointer',fontSize:18,opacity:!texto.trim()?0.5:1}}>â¤</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ââ TabQRCode âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function TabQRCode() {
  const [status,setStatus]=useState(null)
  const [qr,setQr]=useState(null)
  const [loading,setLoading]=useState(false)
  const [countdown,setCountdown]=useState(0)
  const timerRef=useRef()

  const verificar=async()=>{
    try {
            const r=await fetch(`${API}/whatsapp/status`)
            const d=await r.json()
            const ok=d.status==='ok'
            setStatus(ok?'conectado':'desconectado')
            return ok
    } catch { setStatus('erro'); return false }
  }

  const gerarQR=async()=>{
    setLoading(true); setQr(null)
    try {
      try { await fetch(`${API}/instance/create`,{method:'POST',headers:{'Content-Type':'application/json',},body:JSON.stringify({instanceName:INSTANCE,qrcode:true,integration:'WHATSAPP-BAILEYS'})}) } catch {}
      const r=await fetch(`${API}/instance/connect/${INSTANCE}`,{headers:{}})
      const d=await r.json()
      const code=d.base64||d.qrcode?.base64||d.code
      if(code){
        setQr(code.startsWith('data:')?code:`data:image/png;base64,${code}`)
        setCountdown(60)
        clearInterval(timerRef.current)
        timerRef.current=setInterval(()=>setCountdown(c=>{if(c<=1){clearInterval(timerRef.current);return 0}return c-1}),1000)
      }
    } catch(e){console.error('QR:',e)}
    setLoading(false)
  }

  useEffect(()=>{
    verificar()
    const iv=setInterval(async()=>{ const ok=await verificar(); if(ok){setQr(null);clearInterval(timerRef.current)} },5000)
    return()=>{clearInterval(iv);clearInterval(timerRef.current)}
  },[])

  return (
    <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'#F0F2F5'}}>
      <div style={{background:'#fff',borderRadius:16,padding:40,boxShadow:'0 4px 24px rgba(0,0,0,.08)',textAlign:'center',maxWidth:420,width:'100%'}}>
        <div style={{fontSize:44,marginBottom:12}}>ð±</div>
        <h2 style={{color:NAVY,margin:'0 0 6px'}}>Conectar WhatsApp</h2>
        <p style={{color:'#666',fontSize:13,marginBottom:24}}>Abra o WhatsApp â Menu â Dispositivos conectados â Conectar dispositivo</p>
        {status==='conectado'?(
          <div style={{background:'#E8F5E9',borderRadius:10,padding:20,marginBottom:16}}>
            <div style={{fontSize:36}}>â</div>
            <div style={{color:'#2E7D32',fontWeight:700,fontSize:16,marginTop:8}}>WhatsApp Conectado!</div>
            <div style={{color:'#555',fontSize:12,marginTop:4}}>InstÃ¢ncia: {INSTANCE}</div>
          </div>
        ):qr&&countdown>0?(
          <div style={{marginBottom:16}}>
            <img src={qr} alt="QR Code" style={{width:250,height:250,border:`4px solid ${NAVY}`,borderRadius:12}}/>
            <div style={{marginTop:8,fontSize:12,color:'#888'}}>Expira em <b style={{color:countdown<15?'#e53935':'#555'}}>{countdown}s</b></div>
          </div>
        ):(
          <div style={{marginBottom:16}}>
            {status==='desconectado'&&<div style={{background:'#FFF3E0',borderRadius:8,padding:10,marginBottom:12,fontSize:12,color:'#E65100'}}>â  WhatsApp desconectado</div>}
            {status==='erro'&&<div style={{background:'#FFEBEE',borderRadius:8,padding:10,marginBottom:12,fontSize:12,color:'#C62828'}}>â Erro ao conectar com Evolution API</div>}
            {countdown===0&&qr&&<div style={{background:'#FFEBEE',borderRadius:8,padding:10,marginBottom:12,fontSize:12,color:'#C62828'}}>QR Code expirado. Gere novamente.</div>}
          </div>
        )}
        <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
          {(!qr||countdown===0)?
            <button onClick={gerarQR} disabled={loading} style={{background:NAVY,color:'#fff',border:'none',borderRadius:10,padding:'11px 24px',cursor:'pointer',fontWeight:700,fontSize:14,opacity:loading?0.6:1}}>{loading?'Gerando...':'ð± Gerar QR Code'}</button>
          :
            <button onClick={gerarQR} style={{background:'none',border:`1px solid ${NAVY}`,color:NAVY,borderRadius:8,padding:'8px 16px',cursor:'pointer',fontSize:13}}>ð Novo QR Code</button>
          }
          <button onClick={verificar} style={{background:'none',border:'1px solid #ddd',color:'#555',borderRadius:8,padding:'8px 16px',cursor:'pointer',fontSize:13}}>ð Verificar Status</button>
        </div>
      </div>
    </div>
  )
}

// ââ TabEnviar âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function TabEnviar() {
  const [numero,setNumero]=useState('')
  const [mensagem,setMensagem]=useState('')
  const [enviando,setEnviando]=useState(false)
  const [fb,setFb]=useState(null)

  const enviar=async()=>{
    if(!numero.trim()||!mensagem.trim()) return
    setEnviando(true); setFb(null)
    try {
            const num=numero.replace(/\D/g,'')
            const r=await fetch(`${API}/whatsapp/enviar-texto`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({telefone:num,mensagem})})
            const d=await r.json()
            if(r.ok&&(d.ok||d.status==='enviado')){setFb({ok:true,msg:'Mensagem enviada!'});setMensagem('')}
            else setFb({ok:false,msg:d.erro||'Erro ao enviar.'})
    } catch { setFb({ok:false,msg:'Falha de conexÃ£o.'}) }
    setEnviando(false)
  }

  return (
    <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'#F0F2F5'}}>
      <div style={{background:'#fff',borderRadius:16,padding:36,boxShadow:'0 4px 24px rgba(0,0,0,.08)',width:'100%',maxWidth:500}}>
        <h2 style={{color:NAVY,margin:'0 0 22px'}}>âï¸ Enviar Mensagem</h2>
        <div style={{marginBottom:14}}>
          <label style={{display:'block',fontWeight:700,color:NAVY,marginBottom:6,fontSize:13}}>NÃºmero (DDD + nÃºmero, sem +55)</label>
          <input value={numero} onChange={e=>setNumero(e.target.value)} placeholder="Ex: 62999887766" style={{width:'100%',padding:'10px 14px',borderRadius:8,border:'1px solid #ddd',fontSize:13,outline:'none',boxSizing:'border-box'}}/>
        </div>
        <div style={{marginBottom:18}}>
          <label style={{display:'block',fontWeight:700,color:NAVY,marginBottom:6,fontSize:13}}>Mensagem</label>
          <textarea value={mensagem} onChange={e=>setMensagem(e.target.value)} rows={5} placeholder="Digite a mensagem..." style={{width:'100%',padding:'10px 14px',borderRadius:8,border:'1px solid #ddd',fontSize:13,resize:'vertical',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
        </div>
        {fb&&<div style={{padding:'10px 14px',borderRadius:8,marginBottom:14,background:fb.ok?'#E8F5E9':'#FFEBEE',color:fb.ok?'#2E7D32':'#C62828',fontWeight:600,fontSize:13}}>{fb.msg}</div>}
        <button onClick={enviar} disabled={enviando||!numero.trim()||!mensagem.trim()} style={{width:'100%',padding:12,background:NAVY,color:'#fff',border:'none',borderRadius:10,fontWeight:700,fontSize:14,cursor:'pointer',opacity:(enviando||!numero.trim()||!mensagem.trim())?0.5:1}}>
          {enviando?'Enviando...':'ð¤ Enviar Mensagem'}
        </button>
      </div>
    </div>
  )
}

// ââ TabEquipe âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const CANAIS = [
  {id:'geral',   nome:'# geral',    icone:'ð¢', desc:'Canal geral da equipe'},
  {id:'fiscal',  nome:'# fiscal',   icone:'ð', desc:'Departamento Fiscal'},
  {id:'pessoal', nome:'# pessoal',  icone:'ð¥', desc:'Departamento Pessoal'},
  {id:'contabil',nome:'# contÃ¡bil', icone:'ð', desc:'Departamento ContÃ¡bil'},
  {id:'urgente', nome:'ð¨ urgente', icone:'ð¨', desc:'Avisos urgentes'},
]
const EMOJIS=['ð','â¤ï¸','ð','ð®','ð','â']

function TabEquipe({ setPopup, notifAtiva }) {
  const [canal,setCanal]=useState('geral')
  const [msgs,setMsgs]=useState(()=>{ try{return JSON.parse(localStorage.getItem('ep_chat_equipe')||'{}')}catch{return {}} })
  const [texto,setTexto]=useState('')
  const [usuarios]=useState(()=>{ try{return JSON.parse(localStorage.getItem('ep_usuarios')||'[]')}catch{return []} })
  const chatRef=useRef()
  const inputRef=useRef()
  const prevRef=useRef(msgs)

  const msgsCanal=(msgs[canal]||[]).slice(-200)

  const salvar=novas=>{ localStorage.setItem('ep_chat_equipe',JSON.stringify(novas)); setMsgs(novas) }

  const enviar=()=>{
    if(!texto.trim()) return
    const nova={id:Date.now(),de:MEU_NOME,avatar:MEU_AVATAR,texto:texto.trim(),timestamp:new Date().toISOString(),reacoes:{}}
    salvar({...msgs,[canal]:[...(msgs[canal]||[]),nova]})
    setTexto(''); inputRef.current?.focus()
  }

  const reagir=(msgId,emoji)=>{
    const lista=msgs[canal]||[]
    const novaLista=lista.map(m=>{
      if(m.id!==msgId) return m
      const r={...m.reacoes}
      if(r[emoji]?.includes(MEU_NOME)){r[emoji]=r[emoji].filter(n=>n!==MEU_NOME); if(!r[emoji].length) delete r[emoji]}
      else r[emoji]=[...(r[emoji]||[]),MEU_NOME]
      return {...m,reacoes:r}
    })
    salvar({...msgs,[canal]:novaLista})
  }

  // Polling para novas mensagens de outros usuÃ¡rios
  useEffect(()=>{
    const iv=setInterval(()=>{
      try {
        const novas=JSON.parse(localStorage.getItem('ep_chat_equipe')||'{}')
        const mCanal=novas[canal]||[]
        const prevCanal=prevRef.current[canal]||[]
        if(mCanal.length>prevCanal.length){
          const nova=mCanal[mCanal.length-1]
          if(nova.de!==MEU_NOME&&notifAtiva){
            tocarSom()
            setPopup({de:nova.de,texto:nova.texto,timestamp:nova.timestamp})
            notificar(`ð¬ ${nova.de}`,nova.texto)
          }
        }
        prevRef.current=novas; setMsgs(novas)
      } catch {}
    },2000)
    return()=>clearInterval(iv)
  },[canal,notifAtiva])

  useEffect(()=>{ chatRef.current?.scrollTo(0,chatRef.current.scrollHeight) },[msgsCanal.length,canal])

  const naoLidas=c=>(msgs[c]||[]).filter(m=>m.de!==MEU_NOME).length

  return (
    <div style={{display:'flex',flex:1,overflow:'hidden'}}>
      {/* Sidebar */}
      <div style={{width:220,background:NAVY,display:'flex',flexDirection:'column'}}>
        <div style={{padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,.1)'}}>
          <div style={{color:'#fff',fontWeight:700,fontSize:14}}>EPimentel</div>
          <div style={{color:GOLD,fontSize:11}}>Chat da Equipe</div>
        </div>
        <div style={{flex:1,overflowY:'auto',paddingTop:8}}>
          <div style={{padding:'6px 16px 4px',fontSize:10,color:'rgba(255,255,255,.4)',fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>Canais</div>
          {CANAIS.map(c=>{
            const qtd=naoLidas(c.id)
            return (
              <button key={c.id} onClick={()=>setCanal(c.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'8px 16px',background:canal===c.id?'rgba(197,165,90,.2)':'transparent',border:'none',cursor:'pointer',color:canal===c.id?GOLD:'rgba(255,255,255,.7)',textAlign:'left',fontSize:13,borderLeft:canal===c.id?`3px solid ${GOLD}`:'3px solid transparent'}}>
                <span style={{flex:1}}>{c.nome}</span>
                {qtd>0&&canal!==c.id&&<span style={{background:'#e53935',color:'#fff',borderRadius:10,padding:'1px 6px',fontSize:10,fontWeight:700}}>{qtd}</span>}
              </button>
            )
          })}
          {usuarios.length>0&&<>
            <div style={{padding:'12px 16px 4px',fontSize:10,color:'rgba(255,255,255,.4)',fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginTop:8}}>Mensagens Diretas</div>
            {usuarios.slice(0,8).map(u=>(
              <button key={u.id} onClick={()=>setCanal(`dm_${u.id}`)} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'7px 16px',background:canal===`dm_${u.id}`?'rgba(197,165,90,.2)':'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,.7)',textAlign:'left',fontSize:12,borderLeft:canal===`dm_${u.id}`?`3px solid ${GOLD}`:'3px solid transparent'}}>
                <div style={{width:24,height:24,borderRadius:'50%',background:GOLD,color:NAVY,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0}}>{(u.nome||'').split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{u.nome}</span>
              </button>
            ))}
          </>}
        </div>
        <div style={{padding:'10px 14px',borderTop:'1px solid rgba(255,255,255,.1)',display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:32,height:32,borderRadius:'50%',background:GOLD,color:NAVY,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700}}>{MEU_AVATAR}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:'#fff',fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{MEU_NOME}</div>
            <div style={{color:GOLD,fontSize:10}}>â Online</div>
          </div>
        </div>
      </div>

      {/* Chat */}
      <div style={{flex:1,display:'flex',flexDirection:'column',background:'#F8F9FA'}}>
        <div style={{background:'#fff',borderBottom:'1px solid #E0E0E0',padding:'12px 20px',display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:20}}>{CANAIS.find(c=>c.id===canal)?.icone||'ð¬'}</span>
          <div>
            <div style={{fontWeight:700,color:NAVY,fontSize:15}}>{CANAIS.find(c=>c.id===canal)?.nome||(canal.startsWith('dm_')?usuarios.find(u=>`dm_${u.id}`===canal)?.nome||'DM':canal)}</div>
            <div style={{fontSize:11,color:'#888'}}>{CANAIS.find(c=>c.id===canal)?.desc||'Mensagem direta'}</div>
          </div>
        </div>
        <div ref={chatRef} style={{flex:1,overflowY:'auto',padding:'16px 20px',display:'flex',flexDirection:'column',gap:2}}>
          {msgsCanal.length===0&&(
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8,color:'#aaa'}}>
              <div style={{fontSize:48}}>ð¬</div>
              <div style={{fontSize:14}}>Nenhuma mensagem. Seja o primeiro!</div>
            </div>
          )}
          {msgsCanal.map((m,i)=>{
            const minha=m.de===MEU_NOME
            const showAvatar=i===0||msgsCanal[i-1]?.de!==m.de
            return (
              <div key={m.id} style={{display:'flex',gap:10,alignItems:'flex-end',justifyContent:minha?'flex-end':'flex-start',marginTop:showAvatar?8:2}}>
                {!minha&&(showAvatar?<Avatar nome={m.de} size={32} cor="#607D8B"/>:<div style={{width:32}}/>)}
                <div style={{maxWidth:'70%'}}>
                  {!minha&&showAvatar&&<div style={{fontSize:11,fontWeight:700,color:'#555',marginBottom:2,marginLeft:4}}>{m.de}</div>}
                  <div style={{padding:'8px 12px',borderRadius:minha?'12px 2px 12px 12px':'2px 12px 12px 12px',background:minha?NAVY:'#fff',color:minha?'#fff':'#333',boxShadow:'0 1px 3px rgba(0,0,0,.08)',fontSize:13,lineHeight:1.5,wordBreak:'break-word'}}>
                    {m.texto}
                    <div style={{fontSize:10,color:minha?'rgba(255,255,255,.5)':'#aaa',textAlign:'right',marginTop:3}}>{fmtHora(m.timestamp)}</div>
                  </div>
                  {Object.keys(m.reacoes||{}).length>0&&(
                    <div style={{display:'flex',gap:4,marginTop:3,flexWrap:'wrap',justifyContent:minha?'flex-end':'flex-start'}}>
                      {Object.entries(m.reacoes).map(([emoji,nomes])=>(
                        <button key={emoji} onClick={()=>reagir(m.id,emoji)} style={{padding:'1px 7px',borderRadius:10,background:nomes.includes(MEU_NOME)?GOLD+'33':'#f0f0f0',border:`1px solid ${nomes.includes(MEU_NOME)?GOLD:'#ddd'}`,cursor:'pointer',fontSize:12}}>
                          {emoji} {nomes.length}
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{display:'flex',gap:2,marginTop:2,opacity:0,transition:'opacity .2s',justifyContent:minha?'flex-end':'flex-start'}} onMouseOver={e=>e.currentTarget.style.opacity=1} onMouseOut={e=>e.currentTarget.style.opacity=0}>
                    {EMOJIS.map(e=><button key={e} onClick={()=>reagir(m.id,e)} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,padding:'1px 2px',borderRadius:4}}>{e}</button>)}
                  </div>
                </div>
                {minha&&(showAvatar?<Avatar nome={m.de} size={32} cor={NAVY}/>:<div style={{width:32}}/>)}
              </div>
            )
          })}
        </div>
        <div style={{background:'#fff',borderTop:'1px solid #E0E0E0',padding:'12px 20px'}}>
          <div style={{display:'flex',gap:10,alignItems:'flex-end',background:'#F0F2F5',borderRadius:12,padding:'8px 14px'}}>
            <textarea ref={inputRef} value={texto} onChange={e=>setTexto(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviar()}}} placeholder={`Mensagem em ${CANAIS.find(c=>c.id===canal)?.nome||canal}...`} rows={1} style={{flex:1,background:'transparent',border:'none',outline:'none',fontSize:13,resize:'none',fontFamily:'inherit',lineHeight:1.5,maxHeight:100,overflowY:'auto'}}/>
            <button onClick={enviar} disabled={!texto.trim()} style={{background:NAVY,color:'#fff',border:'none',borderRadius:8,width:38,height:38,cursor:'pointer',fontSize:16,flexShrink:0,opacity:!texto.trim()?0.4:1}}>â¤</button>
          </div>
          <div style={{fontSize:10,color:'#aaa',marginTop:4}}>Enter para enviar Â· Shift+Enter para nova linha</div>
        </div>
      </div>
    </div>
  )
}

// ââ MAIN ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function WhatsAppConversas() {
  const [tab,setTab]=useState('conversas')
  const [instStatus,setInstStatus]=useState(null)
  const [popup,setPopup]=useState(null)
  const [notifAtiva,setNotifAtiva]=useState(true)

  useEffect(()=>{
    const v=async()=>{
      try {
              const r=await fetch(`${API}/whatsapp/status`)
                const d=await r.json()
                setInstStatus(d.status==='ok'?'open':'closed')
    } catch { setInstStatus('error') }
    }
        v()
          const iv=setInterval(v,15000)
          return ()=>clearInterval(iv)
  },[])

  useEffect(()=>{ if('Notification' in window&&Notification.permission==='default') Notification.requestPermission() },[])

  const ABAS=[{id:'conversas',label:'ð¬ Conversas'},{id:'qrcode',label:'ð± QR Code'},{id:'enviar',label:'âï¸ Enviar'},{id:'equipe',label:'ð¥ Equipe'}]

  return (
    <div style={{fontFamily:'Inter, system-ui, sans-serif',height:'100%',display:'flex',flexDirection:'column',background:'#F0F2F5'}}>
      <div style={{background:NAVY,padding:'12px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:22}}>ð¬</span>
          <span style={{color:'#fff',fontWeight:700,fontSize:17}}>WhatsApp</span>
          <span style={{color:GOLD,fontWeight:700,fontSize:17}}>EPimentel</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>setNotifAtiva(v=>!v)} style={{background:'none',border:`1px solid ${notifAtiva?GOLD:'#555'}`,borderRadius:8,padding:'4px 10px',cursor:'pointer',color:notifAtiva?GOLD:'#888',fontSize:13}} title={notifAtiva?'Desativar notificaÃ§Ãµes':'Ativar notificaÃ§Ãµes'}>{notifAtiva?'ð':'ð'}</button>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:instStatus==='open'?'#4CAF50':instStatus==='error'?'#FF9800':'#F44336'}}/>
            <span style={{color:'#ccc',fontSize:12}}>{instStatus==='open'?'Conectado':'Desconectado'}</span>
          </div>
        </div>
      </div>
      <div style={{background:'#fff',display:'flex',borderBottom:'2px solid #E0E0E0',flexShrink:0}}>
        {ABAS.map(a=><button key={a.id} onClick={()=>setTab(a.id)} style={{padding:'12px 22px',border:'none',background:'none',cursor:'pointer',fontWeight:tab===a.id?700:400,color:tab===a.id?NAVY:'#666',fontSize:13,borderBottom:tab===a.id?`3px solid ${GOLD}`:'3px solid transparent'}}>{a.label}</button>)}
      </div>
      <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
        {tab==='conversas'&&<TabConversas/>}
        {tab==='qrcode'&&<TabQRCode/>}
        {tab==='enviar'&&<TabEnviar/>}
        {tab==='equipe'&&<TabEquipe setPopup={setPopup} notifAtiva={notifAtiva}/>}
      </div>
      {popup&&<Popup msg={popup} onClose={()=>setPopup(null)}/>}
    </div>
  )
}
