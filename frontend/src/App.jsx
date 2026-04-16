import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, FileText, Send, Receipt, Shield,
  CreditCard, DollarSign, BarChart2, Award, MessageSquare,
  Bot, CheckSquare, LogOut, Menu, Bell,
  ScrollText, Smartphone, BarChart, Repeat, Briefcase,
  Settings, ChevronDown, ChevronRight, Search, Heart, X, Sparkles
} from 'lucide-react'

import Dashboard             from './pages/Dashboard'
import Clientes              from './pages/Clientes'
import NotasFiscais          from './pages/NotasFiscais'
import Parcelamentos         from './pages/Parcelamentos'
import Financeiro            from './pages/Financeiro'
import AnaliseBalanco        from './pages/AnaliseBalanco'
import Certificados          from './pages/Certificados'
import Certidoes             from './pages/Certidoes'
import Conversas             from './pages/Conversas'
import Robo                  from './pages/Robo'
import Admin                 from './pages/Admin'
import EntregasTarefas       from './pages/EntregasTarefas'
import Contratos             from './pages/Contratos'
import GoianiaNFSe           from './pages/GoianiaNFSe'
import RelatorioFiscal       from './pages/RelatorioFiscal'
import RoboObrigacoes        from './pages/RoboObrigacoes'
import ConfiguracoesTarefas  from './pages/ConfiguracoesTarefas'
import AnaliseRetencoes      from './pages/AnaliseRetencoes'
import Processos             from './pages/Processos'
import DisparoWhatsApp       from './pages/DisparoWhatsApp'
import BoasVindas            from './pages/BoasVindas'
import Comunicados           from './pages/Comunicados'
import Obrigacoes            from './pages/Obrigacoes'
import Alvaras              from './pages/Alvaras'
import EPInteligencia       from './pages/EPInteligencia'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'

const NAV_GROUPS = [
  { id:'principal', label:'Principal', items:[
    { id:'dashboard', label:'Dashboard',         icon:LayoutDashboard },
    { id:'clientes',  label:'Clientes',           icon:Users           },
    { id:'tarefas',   label:'Entregas / Tarefas', icon:CheckSquare     },
    { id:'processos', label:'Processos',           icon:Briefcase       },
  ]},
  { id:'fiscal', label:'Fiscal & Contábil', items:[
  { id:'notas',         label:'Notas Fiscais',     icon:Receipt    },
  { id:'retencoes',     label:'Retenções',         icon:BarChart2  },
  { id:'balanco',       label:'Análise Balanço',   icon:BarChart   },
  { id:'relatorio',     label:'Relatório Fiscal',  icon:FileText   },
  { id:'goiania_nfse',  label:'Goiânia NFS-e',     icon:Smartphone },
]},
  { id:'financeiro', label:'Financeiro', items:[
    { id:'financeiro',    label:'Financeiro',   icon:DollarSign },
    { id:'parcelamentos', label:'Parcelamentos',icon:CreditCard },
    { id:'contratos',     label:'Contratos',    icon:ScrollText },
  ]},
  { id:'documentos', label:'Documentos & Legal', items:[
    { id:'certidoes',    label:'Certidões',            icon:Award  },
    { id:'certificados', label:'Certificados Digitais',icon:Shield },
    { id:'alvaras',      label:'Alvarás e Licenças',   icon:Award  },
  ]},
  { id:'comunicacao', label:'Comunicação', items:[
    { id:'conversas',   label:'WhatsApp',            icon:MessageSquare                          },
    { id:'disparo_wa',  label:'Disparo Automático',  icon:Send                                   },
    { id:'comunicados', label:'Comunicados',          icon:MessageSquare, badge:'NOVO'            },
    { id:'boas_vindas', label:'Boas-vindas',          icon:Heart,     badge:'NOVO'                },
  ]},
  { id:'automacao', label:'Automação & IA', items:[
    { id:'robo_obrig',      label:'Robô de Obrigações', icon:Repeat   },
    { id:'robo',            label:'Robô IA',            icon:Bot      },
    { id:'ep_inteligencia', label:'EP Inteligência',    icon:Sparkles },
  ]},
  { id:'config', label:'Configurações', items:[
    { id:'configuracoes_tarefas', label:'Config. Tarefas', icon:Settings },
    { id:'admin',                 label:'Administração',   icon:Shield   },
  ]},
]

const PAGES = {
  dashboard:Dashboard, clientes:Clientes, tarefas:EntregasTarefas, processos:Processos,
  obrigacoes:Obrigacoes, notas:NotasFiscais, retencoes:AnaliseRetencoes,
  parcelamentos:Parcelamentos, financeiro:Financeiro, balanco:AnaliseBalanco,
  certificados:Certificados, certidoes:Certidoes, conversas:Conversas,
  disparo_wa:DisparoWhatsApp, robo:Robo, comunicados:Comunicados,
  contratos:Contratos, goiania_nfse:GoianiaNFSe, relatorio:RelatorioFiscal,
  robo_obrig:RoboObrigacoes, configuracoes_tarefas:ConfiguracoesTarefas,
  admin:Admin, boas_vindas:BoasVindas, alvaras:Alvaras, ep_inteligencia:EPInteligencia,
}

const allItems = () => NAV_GROUPS.flatMap(g => g.items)

function getTheme() {
  try {
    const t = JSON.parse(localStorage.getItem('ep_tema') || '{}')
    return { navy:t.navy||NAVY, gold:t.gold||GOLD, logo:t.logo||null, nomeEmpresa:t.nomeEmpresa||'EPimentel', slogan:t.slogan||'Auditoria & Contabilidade' }
  } catch { return { navy:NAVY, gold:GOLD, logo:null, nomeEmpresa:'EPimentel', slogan:'Auditoria & Contabilidade' } }
}

function BotaoNotificacoes({ usuario }) {
  const [open, setOpen] = React.useState(false)
  const [notifs, setNotifs] = React.useState([])
  React.useEffect(() => {
    const load = () => {
      try {
        const todas = JSON.parse(localStorage.getItem('ep_notificacoes')||'[]')
        setNotifs(todas.filter(n=>!n.para||n.para===usuario.nome))
      } catch {}
    }
    load(); const t=setInterval(load,5000); return ()=>clearInterval(t)
  }, [usuario.nome])
  const naolidas = notifs.filter(n=>!n.lida).length
  const marcarLida = id => {
    const todas=JSON.parse(localStorage.getItem('ep_notificacoes')||'[]')
    localStorage.setItem('ep_notificacoes',JSON.stringify(todas.map(n=>String(n.id)===String(id)?{...n,lida:true}:n)))
    setNotifs(notifs.map(n=>String(n.id)===String(id)?{...n,lida:true}:n))
  }
  const marcarTodas = () => {
    const todas=JSON.parse(localStorage.getItem('ep_notificacoes')||'[]')
    localStorage.setItem('ep_notificacoes',JSON.stringify(todas.map(n=>n.para===usuario.nome?{...n,lida:true}:n)))
    setNotifs(notifs.map(n=>({...n,lida:true})))
  }
  return (
    <div style={{position:'relative'}}>
      <button onClick={()=>setOpen(v=>!v)} style={{position:'relative',background:'none',border:'none',cursor:'pointer',color:'#bbb',padding:5,borderRadius:7}}>
        <Bell size={15}/>
        {naolidas>0&&<div style={{position:'absolute',top:1,right:1,minWidth:16,height:16,borderRadius:8,background:'#f87171',border:'2px solid #fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff',padding:'0 3px'}}>{naolidas>9?'9+':naolidas}</div>}
      </button>
      {open&&(<>
        <div style={{position:'fixed',inset:0,zIndex:1998}} onClick={()=>setOpen(false)}/>
        <div style={{position:'absolute',top:'100%',right:0,width:300,maxHeight:380,overflowY:'auto',background:'#fff',borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,.15)',zIndex:1999,border:'1px solid #e8e8e8',marginTop:6}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:'1px solid #f0f0f0'}}>
            <span style={{fontWeight:700,fontSize:13,color:'#1B2A4A'}}>🔔 Notificações{naolidas>0&&<span style={{background:'#f87171',color:'#fff',borderRadius:8,padding:'1px 6px',fontSize:10,marginLeft:4}}>{naolidas}</span>}</span>
            {naolidas>0&&<button onClick={marcarTodas} style={{fontSize:11,color:'#1D6FA4',background:'none',border:'none',cursor:'pointer'}}>Marcar lidas</button>}
          </div>
          {notifs.length===0
            ? <div style={{padding:24,textAlign:'center',color:'#ccc',fontSize:13}}>Sem notificações</div>
            : notifs.slice(0,20).map(n=>(
              <div key={n.id} onClick={()=>marcarLida(n.id)} style={{padding:'10px 14px',borderBottom:'1px solid #f5f5f5',cursor:'pointer',background:n.lida?'#fff':'#EBF5FF',display:'flex',gap:8}}>
                <span style={{fontSize:16,flexShrink:0}}>{n.tipo==='processo'?'📋':'🔔'}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:n.lida?400:700,color:'#1B2A4A'}}>{n.titulo}</div>
                  <div style={{fontSize:11,color:'#666',marginTop:2}}>{n.mensagem}</div>
                  <div style={{fontSize:10,color:'#aaa',marginTop:2}}>{new Date(n.data).toLocaleString('pt-BR')}</div>
                </div>
                {!n.lida&&<div style={{width:7,height:7,borderRadius:'50%',background:'#1D6FA4',flexShrink:0,marginTop:3}}/>}
              </div>
            ))
          }
        </div>
      </>)}
    </div>
  )
}


class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError:false, error:null }; }
  static getDerivedStateFromError(e) { return {hasError:true,error:e}; }
  componentDidCatch(e,i) { console.error('ErrorBoundary:',e,i); }
  render() {
    if(this.state.hasError) return (
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f8f9fa',padding:32,textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16}}>⚠️</div>
        <h2 style={{color:'#1B2A4A',marginBottom:8}}>Algo deu errado</h2>
        <p style={{color:'#666',marginBottom:4,maxWidth:400}}>{String(this.state.error?.message||'').slice(0,120)}</p>
        <p style={{color:'#aaa',fontSize:12,marginBottom:24}}>Seus dados estão seguros no localStorage</p>
        <button onClick={()=>{this.setState({hasError:false,error:null});window.location.reload();}}
          style={{background:'#1B2A4A',color:'#fff',border:'none',borderRadius:8,padding:'10px 24px',cursor:'pointer',fontWeight:700,fontSize:14,marginBottom:10}}>🔄 Recarregar</button>
        <button onClick={()=>this.setState({hasError:false,error:null})}
          style={{background:'none',border:'1px solid #ddd',color:'#666',borderRadius:8,padding:'8px 20px',cursor:'pointer',fontSize:13}}>Tentar novamente</button>
      </div>
    );
    return this.props.children;
  }
}

export default function App() {
  const [page, setPage]           = useState('dashboard')
  const [usuario, setUsuario]     = useState(null)
  const [sideOpen, setSideOpen]   = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [loginForm, setLoginForm] = useState({ email:'', senha:'' })
  const [loginErro, setLoginErro] = useState('')
  const [tema, setTema]           = useState(getTheme)
  const [groups, setGroups]       = useState(() => Object.fromEntries(NAV_GROUPS.map(g=>[g.id,true])))
  const [busca, setBusca]         = useState('')

  const [loginLoading, setLoginLoading] = useState(false)
  const [esqueciModal, setEsqueciModal]  = useState(false)
  const [esqueciEmail, setEsqueciEmail]  = useState('')
  const [esqueciMsg, setEsqueciMsg]      = useState('')

  useEffect(() => {
    document.documentElement.style.setProperty('--c-navy', tema.navy)
    document.documentElement.style.setProperty('--c-gold', tema.gold)
  }, [tema])

  useEffect(() => {
    const fn = e => { if(e.key==='ep_tema') setTema(getTheme()) }
    window.addEventListener('storage', fn)
    const t = setInterval(() => setTema(getTheme()), 3000)
    return () => { window.removeEventListener('storage', fn); clearInterval(t) }
  }, [])

  useEffect(() => { localStorage.removeItem('usuario'); localStorage.removeItem('authToken') }, [])

  const login = async e => {
    e.preventDefault()
    // Validação obrigatória dos campos
    if (!loginForm.email.trim()) { setLoginErro('Informe o e-mail.'); return }
    if (!loginForm.senha.trim()) { setLoginErro('Informe a senha.'); return }

    setLoginLoading(true); setLoginErro('')
    try {
      const r = await fetch('/api/v1/auth/login', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(loginForm)
      })
      if (r.ok) {
        const data = await r.json()
        const user = data.usuario || { nome:'Administrador', perfil:'Administrador' }
        setUsuario(user)
        localStorage.setItem('usuario', JSON.stringify(user))
        if (data.token) localStorage.setItem('authToken', data.token)
      } else if (r.status === 401) {
        setLoginErro('E-mail ou senha incorretos.')
      } else if (r.status === 403) {
        setLoginErro('Acesso bloqueado. Contate o administrador.')
      } else {
        // API offline — fallback demo apenas com credenciais corretas
        if (loginForm.email === 'admin@epimentel.com.br' && loginForm.senha === 'admin123') {
          const demo = { nome:'Carlos Eduardo Pimentel', perfil:'Administrador' }
          setUsuario(demo); localStorage.setItem('usuario', JSON.stringify(demo))
        } else {
          setLoginErro('E-mail ou senha incorretos.')
        }
      }
    } catch {
      // Sem conexão com backend — aceita credenciais demo
      if (loginForm.email === 'admin@epimentel.com.br' && loginForm.senha === 'admin123') {
        const demo = { nome:'Carlos Eduardo Pimentel', perfil:'Administrador' }
        setUsuario(demo); localStorage.setItem('usuario', JSON.stringify(demo))
      } else {
        setLoginErro('E-mail ou senha incorretos.')
      }
    }
    setLoginLoading(false)
  }

  const enviarEsqueci = async () => {
    if (!esqueciEmail.trim()) { setEsqueciMsg('Informe o e-mail cadastrado.'); return }
    setEsqueciMsg('⏳ Enviando...')
    try {
      const r = await fetch('/api/v1/auth/recuperar-senha', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email: esqueciEmail })
      })
      setEsqueciMsg(r.ok ? '✅ E-mail enviado! Verifique sua caixa de entrada.' : '⚠️ E-mail não encontrado no sistema.')
    } catch {
      setEsqueciMsg('⚠️ Sistema temporariamente indisponível. Contate: ceampimentel@gmail.com')
    }
  }

  const logout = () => { localStorage.removeItem('usuario'); localStorage.removeItem('authToken'); setUsuario(null); setPage('dashboard') }
  const navTo = id => { setPage(id); setBusca('') }

  const buscaRes = busca.trim() ? allItems().filter(i => i.label.toLowerCase().includes(busca.toLowerCase())) : []
  const pageInfo = allItems().find(i => i.id === page)
  const Page = PAGES[page] || Dashboard

  // ── Login ──────────────────────────────────────────────────────────────────
  if (!usuario) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:`linear-gradient(135deg, #0f1c30 0%, ${NAVY} 60%, #1a2f4a 100%)` }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 20% 50%, rgba(197,165,90,.12) 0%, transparent 50%)' }}/>

      {/* Modal Esqueci Minha Senha */}
      {esqueciModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:28, width:'100%', maxWidth:340, boxShadow:'0 24px 64px rgba(0,0,0,.4)' }}>
            <div style={{ fontSize:16, fontWeight:800, color:NAVY, marginBottom:6 }}>🔑 Recuperar Senha</div>
            <div style={{ fontSize:12, color:'#888', marginBottom:18 }}>Informe o e-mail cadastrado e enviaremos as instruções.</div>
            <label style={{ fontSize:10, fontWeight:700, color:'#aaa', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.8 }}>E-mail</label>
            <input value={esqueciEmail} onChange={e=>setEsqueciEmail(e.target.value)}
              placeholder="seu@email.com.br"
              style={{ width:'100%', boxSizing:'border-box', border:'2px solid #f0f0f0', borderRadius:9, padding:'10px 12px', fontSize:13, outline:'none', fontFamily:'inherit', marginBottom:12 }}
              onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#f0f0f0'}/>
            {esqueciMsg && (
              <div style={{ padding:'8px 12px', borderRadius:8, background: esqueciMsg.startsWith('✅')?'#EDFBF1':esqueciMsg.startsWith('⏳')?'#EBF5FF':'#FEF9C3', fontSize:12, marginBottom:12, color:'#333' }}>
                {esqueciMsg}
              </div>
            )}
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={enviarEsqueci}
                style={{ flex:1, padding:10, borderRadius:9, background:NAVY, color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
                Enviar
              </button>
              <button onClick={()=>{ setEsqueciModal(false); setEsqueciMsg(''); setEsqueciEmail('') }}
                style={{ padding:'10px 16px', borderRadius:9, background:'#f5f5f5', color:'#555', fontSize:13, border:'none', cursor:'pointer' }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ position:'relative', background:'#fff', borderRadius:20, boxShadow:'0 32px 80px rgba(0,0,0,.45)', padding:'44px 40px', width:'100%', maxWidth:380, boxSizing:'border-box' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:68, height:68, borderRadius:16, background:`linear-gradient(135deg, ${NAVY}, #2d4a7a)`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:`0 8px 24px ${NAVY}60` }}>
            <span style={{ color:GOLD, fontSize:26, fontWeight:900 }}>E</span><span style={{ color:'#fff', fontSize:26, fontWeight:900 }}>P</span>
          </div>
          <div style={{ fontSize:22, fontWeight:800, color:NAVY, letterSpacing:-.5 }}>Sistema <span style={{ color:GOLD }}>E</span>Pimentel</div>
          <div style={{ fontSize:11, color:'#bbb', marginTop:4, letterSpacing:1, textTransform:'uppercase' }}>Auditoria & Contabilidade</div>
        </div>
        <form onSubmit={login}>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#aaa', marginBottom:6, textTransform:'uppercase', letterSpacing:.8 }}>E-mail</label>
            <input type="text" value={loginForm.email} onChange={e=>setLoginForm(f=>({...f,email:e.target.value}))}
              placeholder="admin@epimentel.com.br" autoComplete="email"
              style={{ width:'100%', boxSizing:'border-box', border:'2px solid #f0f0f0', borderRadius:10, padding:'11px 14px', fontSize:13, outline:'none', fontFamily:'inherit' }}
              onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#f0f0f0'}/>
          </div>
          <div style={{ marginBottom:6 }}>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#aaa', marginBottom:6, textTransform:'uppercase', letterSpacing:.8 }}>Senha</label>
            <input type="password" value={loginForm.senha} onChange={e=>setLoginForm(f=>({...f,senha:e.target.value}))}
              placeholder="••••••••" autoComplete="current-password"
              style={{ width:'100%', boxSizing:'border-box', border:'2px solid #f0f0f0', borderRadius:10, padding:'11px 14px', fontSize:13, outline:'none', fontFamily:'inherit' }}
              onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#f0f0f0'}/>
          </div>
          {/* Link Esqueci minha senha */}
          <div style={{ textAlign:'right', marginBottom:18 }}>
            <button type="button" onClick={()=>{ setEsqueciModal(true); setEsqueciEmail(loginForm.email) }}
              style={{ background:'none', border:'none', cursor:'pointer', color:NAVY, fontSize:11, fontWeight:600, textDecoration:'underline', padding:0 }}>
              Esqueci minha senha
            </button>
          </div>
          {loginErro && (
            <div style={{ background:'#FEF2F2', border:'1px solid #fca5a5', borderRadius:8, padding:'9px 12px', fontSize:12, color:'#991B1B', marginBottom:14, fontWeight:600 }}>
              ⚠️ {loginErro}
            </div>
          )}
          <button type="submit" disabled={loginLoading}
            style={{ width:'100%', padding:13, borderRadius:10, background: loginLoading ? '#d0a84b' : `linear-gradient(135deg, ${GOLD}, #d4a84b)`, color:NAVY, fontWeight:800, fontSize:14, border:'none', cursor: loginLoading ? 'wait' : 'pointer', boxShadow:`0 4px 16px ${GOLD}50` }}>
            {loginLoading ? '⏳ Verificando...' : 'Entrar no Sistema'}
          </button>
        </form>
        <div style={{ textAlign:'center', marginTop:22, fontSize:10, color:'#ccc', borderTop:'1px solid #f5f5f5', paddingTop:18 }}>
          Carlos Eduardo A. M. Pimentel · CRC/GO 026.994/O-8
        </div>
      </div>
    </div>
  )

  const sideW = sideOpen ? (collapsed ? 58 : 226) : 0

  // ── App ────────────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', fontFamily:"'Sora','Inter',system-ui,sans-serif" }}>

      {/* Sidebar */}
      <aside style={{ display:'flex', flexDirection:'column', flexShrink:0, width:sideW, minWidth:sideW, background:'linear-gradient(180deg,#0d1929 0%,#1B2A4A 45%,#172338 100%)', overflow:'hidden', transition:'width .3s cubic-bezier(.4,0,.2,1),min-width .3s cubic-bezier(.4,0,.2,1)', boxShadow:'4px 0 20px rgba(0,0,0,.25)', zIndex:20 }}>

        {/* Logo */}
        <div style={{ padding:'14px 12px 12px', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', gap:9, minHeight:62, flexShrink:0, overflow:'hidden' }}>
          {tema.logo
            ? <img src={tema.logo} alt="" style={{ width:32, height:32, borderRadius:8, objectFit:'contain', background:'#fff', padding:2, flexShrink:0 }}/>
            : <div style={{ width:32, height:32, borderRadius:8, background:`linear-gradient(135deg,${tema.gold},#d4a84b)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, flexShrink:0, boxShadow:`0 3px 10px ${tema.gold}50` }}>
                <span style={{ color:tema.navy }}>E</span><span style={{ color:'#fff' }}>P</span>
              </div>
          }
          <div style={{ minWidth:0, overflow:'hidden', opacity:collapsed?0:1, transition:'opacity .2s ease', whiteSpace:'nowrap' }}>
            <div style={{ fontWeight:800, color:'#fff', fontSize:13, overflow:'hidden', textOverflow:'ellipsis', letterSpacing:-.3 }}>{tema.nomeEmpresa}</div>
            <div style={{ fontSize:8, color:tema.gold, letterSpacing:1.2, textTransform:'uppercase', marginTop:1 }}>{tema.slogan}</div>
          </div>
        </div>

        {/* Perfil */}
        <div style={{ padding:'9px 12px 8px', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', gap:8, overflow:'hidden', minHeight:46, flexShrink:0 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:`${tema.gold}25`, border:`1px solid ${tema.gold}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:tema.gold, flexShrink:0 }}>
            {(usuario.nome||'U').split(' ').map(n=>n[0]).slice(0,2).join('')}
          </div>
          <div style={{ minWidth:0, flex:1, overflow:'hidden', opacity:collapsed?0:1, transition:'opacity .2s ease', whiteSpace:'nowrap' }}>
            <div style={{ fontSize:11, color:'#fff', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis' }}>{(usuario.nome||'').split(' ').slice(0,2).join(' ')}</div>
            <div style={{ fontSize:9, color:tema.gold, textTransform:'uppercase', letterSpacing:.6 }}>{usuario.perfil}</div>
          </div>
        </div>

        {/* Busca */}
        <div style={{ overflow:'hidden', maxHeight:collapsed?0:80, opacity:collapsed?0:1, transition:'max-height .3s cubic-bezier(.4,0,.2,1), opacity .2s ease', borderBottom:'1px solid rgba(255,255,255,.07)', flexShrink:0 }}>
          <div style={{ padding:'7px 10px' }}>
            <div style={{ position:'relative' }}>
              <Search size={10} style={{ position:'absolute', left:8, top:8, color:'rgba(255,255,255,.3)' }}/>
              <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar módulo..."
                style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.1)', borderRadius:7, padding:'6px 8px 6px 24px', fontSize:11, color:'#fff', outline:'none', fontFamily:'inherit' }}/>
              {busca && <button onClick={()=>setBusca('')} style={{ position:'absolute', right:6, top:6, background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.4)', padding:0 }}><X size={11}/></button>}
            </div>
            {buscaRes.length > 0 && (
              <div style={{ marginTop:4, background:'rgba(255,255,255,.1)', borderRadius:7, overflow:'hidden' }}>
                {buscaRes.map(item => { const I=item.icon; return (
                  <button key={item.id} onClick={()=>navTo(item.id)} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'7px 10px', background:'transparent', border:'none', cursor:'pointer', color:'rgba(255,255,255,.85)', fontSize:11, textAlign:'left' }}>
                    <I size={11}/> {item.label}
                  </button>
                )})}
              </div>
            )}
          </div>
        </div>

        {/* Nav grupos */}
        <nav style={{ flex:1, overflowY:'auto', padding:'4px 0', scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,.1) transparent' }}>
          {NAV_GROUPS.map(g => (
            <div key={g.id} style={{ marginBottom:1 }}>
              {/* Header do grupo — fade ao colapsar */}
              <div style={{ overflow:'hidden', maxHeight:collapsed?0:28, opacity:collapsed?0:1, transition:'max-height .25s ease, opacity .18s ease' }}>
                <button onClick={()=>setGroups(p=>({...p,[g.id]:!p[g.id]}))}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', padding:'6px 12px 4px', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.3)', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:1.2, textAlign:'left' }}>
                  <span>{g.label}</span>
                  {groups[g.id] ? <ChevronDown size={9}/> : <ChevronRight size={9}/>}
                </button>
              </div>

              {/* Itens */}
              {(collapsed || groups[g.id]) && g.items.map(item => {
                const I = item.icon; const act = page === item.id
                return (
                  <button key={item.id} onClick={()=>navTo(item.id)} title={collapsed ? item.label : undefined}
                    style={{ display:'flex', alignItems:'center', gap:9, width:'100%', padding:collapsed?'9px 0':'7px 12px', justifyContent:collapsed?'center':'flex-start', textAlign:'left', fontSize:11.5, cursor:'pointer', border:'none', borderLeft:!collapsed?(act?`3px solid ${tema.gold}`:'3px solid transparent'):'none', background:act?`linear-gradient(90deg,${tema.gold}22,transparent)`:'transparent', color:act?tema.gold:'rgba(255,255,255,.7)', whiteSpace:'nowrap', overflow:'hidden', transition:'background .15s, color .15s, padding .3s, justify-content .3s', position:'relative' }}
                    onMouseEnter={e=>{ if(!act){e.currentTarget.style.background='rgba(255,255,255,.07)';e.currentTarget.style.color='rgba(255,255,255,.95)'} }}
                    onMouseLeave={e=>{ if(!act){e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(255,255,255,.7)'} }}>
                    <I size={13} style={{ flexShrink:0, transition:'transform .2s' }}/>
                    {/* Label e badge com fade */}
                    <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', fontWeight:act?700:400, opacity:collapsed?0:1, maxWidth:collapsed?0:160, transition:'opacity .2s ease, max-width .3s ease' }}>
                      {item.label}
                    </span>
                    {item.badge && (
                      <span style={{ fontSize:8, padding:'1px 5px', borderRadius:7, background:item.badge==='NOVO'?tema.gold:'#dc2626', color:item.badge==='NOVO'?tema.navy:'#fff', fontWeight:800, flexShrink:0, opacity:collapsed?0:1, transition:'opacity .2s ease' }}>
                        {item.badge}
                      </span>
                    )}
                    {act && <div style={{ position:'absolute', right:0, top:'15%', height:'70%', width:3, background:tema.gold, borderRadius:'3px 0 0 3px', opacity:collapsed?0:1, transition:'opacity .2s' }}/>}
                  </button>
                )
              })}
              {!collapsed && groups[g.id] && <div style={{ height:4 }}/>}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,.07)', flexShrink:0 }}>
          <button onClick={()=>setCollapsed(c=>!c)}
            style={{ display:'flex', alignItems:'center', justifyContent:collapsed?'center':'flex-start', gap:8, width:'100%', padding:'9px 12px', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.35)', fontSize:11, transition:'color .15s' }}
            onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,.8)'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,.35)'}>
            <Menu size={13} style={{ transition:'transform .3s', transform:collapsed?'rotate(180deg)':'rotate(0deg)' }}/>
            <span style={{ opacity:collapsed?0:1, maxWidth:collapsed?0:100, overflow:'hidden', whiteSpace:'nowrap', transition:'opacity .2s ease, max-width .3s ease' }}>Recolher</span>
          </button>
          <button onClick={logout}
            style={{ display:'flex', alignItems:'center', justifyContent:collapsed?'center':'flex-start', gap:8, width:'100%', padding:'9px 12px', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.35)', fontSize:11, transition:'color .15s' }}
            onMouseEnter={e=>e.currentTarget.style.color='#f87171'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,.35)'}>
            <LogOut size={13}/>
            <span style={{ opacity:collapsed?0:1, maxWidth:collapsed?0:100, overflow:'hidden', whiteSpace:'nowrap', transition:'opacity .2s ease, max-width .3s ease' }}>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden', background:'#f0f2f7' }}>
        {/* Header */}
        <header style={{ display:'flex', alignItems:'center', gap:12, padding:'0 20px', background:'#fff', borderBottom:'1px solid #e8ecf0', flexShrink:0, height:50, boxShadow:'0 1px 6px rgba(0,0,0,.06)' }}>
          <button onClick={()=>setSideOpen(o=>!o)} style={{ background:'none', border:'none', cursor:'pointer', color:'#bbb', padding:4, borderRadius:6 }}>
            <Menu size={17}/>
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:5, flex:1 }}>
            <span style={{ fontSize:10, color:'#ccc' }}>EPimentel</span>
            <ChevronRight size={11} style={{ color:'#e0e0e0' }}/>
            <span style={{ fontSize:13, fontWeight:700, color:NAVY }}>{pageInfo?.label||'Dashboard'}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <BotaoNotificacoes usuario={usuario}/>
            <div style={{ width:1, height:18, background:'#eee' }}/>
            <div style={{ display:'flex', alignItems:'center', gap:7, padding:'4px 10px', borderRadius:8, background:'#f8f9fb' }}>
              <div style={{ width:24, height:24, borderRadius:6, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:GOLD }}>
                {(usuario.nome||'U').split(' ').map(n=>n[0]).slice(0,2).join('')}
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:NAVY, lineHeight:1.2 }}>{(usuario.nome||'').split(' ')[0]}</div>
                <div style={{ fontSize:9, color:'#bbb', textTransform:'uppercase', letterSpacing:.5 }}>{usuario.perfil}</div>
              </div>
            </div>
          </div>
        </header>
        <main style={{ flex:1, overflow:'auto' }}><Page /></main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(0,0,0,.15); border-radius:10px; }
      `}</style>
    </div>
    </ErrorBoundary>
  )
}
