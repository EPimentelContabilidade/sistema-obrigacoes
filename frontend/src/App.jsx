import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, FileText, Send, Receipt, Shield,
  CreditCard, DollarSign, BarChart2, Award, MessageSquare,
  Bot, CheckSquare, LogOut, Menu, Bell,
  ScrollText, Smartphone, BarChart, Repeat, Briefcase,
  Settings, ChevronDown, ChevronRight, Search, Heart, X
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
import ComunicacaoInterna    from './pages/ComunicacaoInterna'
import Contratos             from './pages/Contratos'
import GoianiaNFSe           from './pages/GoianiaNFSe'
import RelatorioFiscal       from './pages/RelatorioFiscal'
import RoboObrigacoes        from './pages/RoboObrigacoes'
import ConfiguracoesTarefas  from './pages/ConfiguracoesTarefas'
import AnaliseRetencoes      from './pages/AnaliseRetencoes'
import Processos             from './pages/Processos'
import DisparoWhatsApp       from './pages/DisparoWhatsApp'
import BoasVindas            from './pages/BoasVindas'
import Obrigacoes            from './pages/Obrigacoes'

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
    { id:'obrigacoes',    label:'Obrigações',        icon:FileText   },
    { id:'notas',         label:'Notas Fiscais',     icon:Receipt    },
    { id:'retencoes',     label:'Retenções',          icon:BarChart2  },
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
  ]},
  { id:'comunicacao', label:'Comunicação', items:[
    { id:'conversas',   label:'WhatsApp',            icon:MessageSquare                          },
    { id:'disparo_wa',  label:'Disparo Automático',  icon:Send                                   },
    { id:'comunicacao', label:'Comunicação Interna', icon:MessageSquare                          },
    { id:'boas_vindas', label:'Boas-vindas',          icon:Heart,     badge:'NOVO'                },
  ]},
  { id:'automacao', label:'Automação & IA', items:[
    { id:'robo_obrig', label:'Robô de Obrigações', icon:Repeat },
    { id:'robo',       label:'Robô IA',            icon:Bot    },
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
  disparo_wa:DisparoWhatsApp, robo:Robo, comunicacao:ComunicacaoInterna,
  contratos:Contratos, goiania_nfse:GoianiaNFSe, relatorio:RelatorioFiscal,
  robo_obrig:RoboObrigacoes, configuracoes_tarefas:ConfiguracoesTarefas,
  admin:Admin, boas_vindas:BoasVindas,
}

const allItems = () => NAV_GROUPS.flatMap(g => g.items)

function getTheme() {
  try {
    const t = JSON.parse(localStorage.getItem('ep_tema') || '{}')
    return { navy:t.navy||NAVY, gold:t.gold||GOLD, logo:t.logo||null, nomeEmpresa:t.nomeEmpresa||'EPimentel', slogan:t.slogan||'Auditoria & Contabilidade' }
  } catch { return { navy:NAVY, gold:GOLD, logo:null, nomeEmpresa:'EPimentel', slogan:'Auditoria & Contabilidade' } }
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
    const demo = { nome:'Carlos Eduardo Pimentel', perfil:'Administrador' }
    try {
      const r = await fetch('/api/v1/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(loginForm) })
      const data = r.ok ? await r.json() : null
      const user = data?.usuario || demo
      setUsuario(user); localStorage.setItem('usuario', JSON.stringify(user))
    } catch { setUsuario(demo); localStorage.setItem('usuario', JSON.stringify(demo)) }
    setLoginErro('')
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
      <div style={{ position:'relative', background:'#fff', borderRadius:20, boxShadow:'0 32px 80px rgba(0,0,0,.45)', padding:'44px 40px', width:'100%', maxWidth:380, boxSizing:'border-box' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:68, height:68, borderRadius:16, background:`linear-gradient(135deg, ${NAVY}, #2d4a7a)`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:`0 8px 24px ${NAVY}60` }}>
            <span style={{ color:GOLD, fontSize:26, fontWeight:900 }}>E</span><span style={{ color:'#fff', fontSize:26, fontWeight:900 }}>P</span>
          </div>
          <div style={{ fontSize:22, fontWeight:800, color:NAVY, letterSpacing:-.5 }}>Sistema <span style={{ color:GOLD }}>E</span>Pimentel</div>
          <div style={{ fontSize:11, color:'#bbb', marginTop:4, letterSpacing:1, textTransform:'uppercase' }}>Auditoria & Contabilidade</div>
        </div>
        <form onSubmit={login}>
          {[['E-mail','text','email','admin@epimentel.com.br'],['Senha','password','senha','••••••••']].map(([l,t,k,p]) => (
            <div key={k} style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#aaa', marginBottom:6, textTransform:'uppercase', letterSpacing:.8 }}>{l}</label>
              <input type={t} value={loginForm[k]} onChange={e=>setLoginForm(f=>({...f,[k]:e.target.value}))} placeholder={p}
                style={{ width:'100%', boxSizing:'border-box', border:'2px solid #f0f0f0', borderRadius:10, padding:'11px 14px', fontSize:13, outline:'none', fontFamily:'inherit' }}
                onFocus={e=>e.target.style.borderColor=NAVY} onBlur={e=>e.target.style.borderColor='#f0f0f0'}/>
            </div>
          ))}
          {loginErro && <p style={{ color:'#e53e3e', fontSize:12, marginBottom:12 }}>{loginErro}</p>}
          <button type="submit" style={{ width:'100%', padding:13, borderRadius:10, background:`linear-gradient(135deg, ${GOLD}, #d4a84b)`, color:NAVY, fontWeight:800, fontSize:14, border:'none', cursor:'pointer', boxShadow:`0 4px 16px ${GOLD}50`, marginTop:8 }}>
            Entrar no Sistema
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
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', fontFamily:"'Sora','Inter',system-ui,sans-serif" }}>

      {/* Sidebar */}
      <aside style={{ display:'flex', flexDirection:'column', flexShrink:0, width:sideW, minWidth:sideW, background:'linear-gradient(180deg,#0d1929 0%,#1B2A4A 45%,#172338 100%)', overflow:'hidden', transition:'width .28s ease,min-width .28s ease', boxShadow:'4px 0 20px rgba(0,0,0,.25)', zIndex:20 }}>

        {/* Logo */}
        <div style={{ padding:'14px 12px 12px', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', gap:9, minHeight:62, flexShrink:0 }}>
          {tema.logo
            ? <img src={tema.logo} alt="" style={{ width:32, height:32, borderRadius:8, objectFit:'contain', background:'#fff', padding:2, flexShrink:0 }}/>
            : <div style={{ width:32, height:32, borderRadius:8, background:`linear-gradient(135deg,${tema.gold},#d4a84b)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, flexShrink:0, boxShadow:`0 3px 10px ${tema.gold}50` }}>
                <span style={{ color:tema.navy }}>E</span><span style={{ color:'#fff' }}>P</span>
              </div>
          }
          {!collapsed && (
            <div style={{ minWidth:0, overflow:'hidden' }}>
              <div style={{ fontWeight:800, color:'#fff', fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', letterSpacing:-.3 }}>{tema.nomeEmpresa}</div>
              <div style={{ fontSize:8, color:tema.gold, whiteSpace:'nowrap', letterSpacing:1.2, textTransform:'uppercase', marginTop:1 }}>{tema.slogan}</div>
            </div>
          )}
        </div>

        {/* Perfil */}
        {!collapsed && (
          <div style={{ padding:'9px 12px 8px', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:7, background:`${tema.gold}25`, border:`1px solid ${tema.gold}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:tema.gold, flexShrink:0 }}>
              {(usuario.nome||'U').split(' ').map(n=>n[0]).slice(0,2).join('')}
            </div>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:11, color:'#fff', fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{(usuario.nome||'').split(' ').slice(0,2).join(' ')}</div>
              <div style={{ fontSize:9, color:tema.gold, textTransform:'uppercase', letterSpacing:.6 }}>{usuario.perfil}</div>
            </div>
          </div>
        )}

        {/* Busca */}
        {!collapsed && (
          <div style={{ padding:'7px 10px', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
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
        )}

        {/* Nav grupos */}
        <nav style={{ flex:1, overflowY:'auto', padding:'4px 0', scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,.1) transparent' }}>
          {NAV_GROUPS.map(g => (
            <div key={g.id} style={{ marginBottom:1 }}>
              {!collapsed && (
                <button onClick={()=>setGroups(p=>({...p,[g.id]:!p[g.id]}))}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', padding:'6px 12px 4px', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.3)', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:1.2, textAlign:'left' }}>
                  <span>{g.label}</span>
                  {groups[g.id] ? <ChevronDown size={9}/> : <ChevronRight size={9}/>}
                </button>
              )}
              {(collapsed || groups[g.id]) && g.items.map(item => {
                const I = item.icon; const act = page === item.id
                return (
                  <button key={item.id} onClick={()=>navTo(item.id)} title={collapsed ? item.label : undefined}
                    style={{ display:'flex', alignItems:'center', gap:9, width:'100%', padding:collapsed?'9px 0':'7px 12px', justifyContent:collapsed?'center':'flex-start', textAlign:'left', fontSize:11.5, cursor:'pointer', border:'none', borderLeft:!collapsed?(act?`3px solid ${tema.gold}`:'3px solid transparent'):'none', background:act?`linear-gradient(90deg,${tema.gold}22,transparent)`:'transparent', color:act?tema.gold:'rgba(255,255,255,.7)', whiteSpace:'nowrap', overflow:'hidden', transition:'all .12s', position:'relative' }}
                    onMouseEnter={e=>{ if(!act){e.currentTarget.style.background='rgba(255,255,255,.07)';e.currentTarget.style.color='rgba(255,255,255,.95)'} }}
                    onMouseLeave={e=>{ if(!act){e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(255,255,255,.7)'} }}>
                    <I size={13} style={{ flexShrink:0 }}/>
                    {!collapsed && <>
                      <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', fontWeight:act?700:400 }}>{item.label}</span>
                      {item.badge && <span style={{ fontSize:8, padding:'1px 5px', borderRadius:7, background:item.badge==='NOVO'?tema.gold:'#dc2626', color:item.badge==='NOVO'?tema.navy:'#fff', fontWeight:800, flexShrink:0 }}>{item.badge}</span>}
                    </>}
                    {act && !collapsed && <div style={{ position:'absolute', right:0, top:'15%', height:'70%', width:3, background:tema.gold, borderRadius:'3px 0 0 3px' }}/>}
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
            <Menu size={13}/>{!collapsed && <span>Recolher</span>}
          </button>
          <button onClick={logout}
            style={{ display:'flex', alignItems:'center', justifyContent:collapsed?'center':'flex-start', gap:8, width:'100%', padding:'9px 12px', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.35)', fontSize:11, transition:'color .15s' }}
            onMouseEnter={e=>e.currentTarget.style.color='#f87171'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,.35)'}>
            <LogOut size={13}/>{!collapsed && <span>Sair</span>}
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
            <button style={{ position:'relative', background:'none', border:'none', cursor:'pointer', color:'#bbb', padding:5, borderRadius:7 }}>
              <Bell size={15}/>
              <div style={{ position:'absolute', top:3, right:3, width:6, height:6, borderRadius:'50%', background:'#f87171', border:'2px solid #fff' }}/>
            </button>
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
  )
}
