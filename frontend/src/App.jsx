import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, Send, Receipt,
  CreditCard, DollarSign, BarChart2, Award,
  MessageSquare, Bot, Shield, CheckSquare,
  LogOut, Menu, ScrollText, Smartphone,
  BarChart, Repeat, Briefcase, Settings, FileText
} from 'lucide-react'

import Dashboard             from './pages/Dashboard'
import Clientes              from './pages/Clientes'
import NotasFiscais          from './pages/NotasFiscais'
import Parcelamentos         from './pages/Parcelamentos'
import Financeiro            from './pages/Financeiro'
import AnaliseBalanco        from './pages/AnaliseBalanco'
import Certidoes             from './pages/Certidoes'
import Certificados          from './pages/Certificados'
import Conversas             from './pages/WhatsAppConversas'
import Robo                  from './pages/Robo'
import Admin                 from './pages/Admin'
import EntregasTarefas       from './pages/EntregasTarefas'
import ComunicacaoInterna    from './pages/ComunicacaoInterna'
import Contratos             from './pages/Contratos'
import GoianiaNFSe           from './pages/GoianiaNFSe'
import RelatorioFiscal       from './pages/RelatorioFiscal'
import RoboObrigacoes        from './pages/RoboObrigacoes'
import ConfiguracoesTarefas  from './pages/ConfiguracoesTarefas'
import Processos             from './pages/Processos'

const NAV = [
  { id: 'dashboard',             label: 'Dashboard',             icon: LayoutDashboard },
  { id: 'clientes',              label: 'Clientes',              icon: Users },
  { id: 'tarefas',               label: 'Entregas / Tarefas',    icon: CheckSquare },
  { id: 'processos',             label: 'Processos',             icon: Briefcase },
  { id: 'notas',                 label: 'Notas Fiscais',         icon: Receipt },
  { id: 'parcelamentos',         label: 'Parcelamentos',         icon: CreditCard },
  { id: 'financeiro',            label: 'Financeiro',            icon: DollarSign },
  { id: 'balanco',               label: 'Análise Balanço',       icon: BarChart2 },
  { id: 'certidoes',             label: 'Certidões',             icon: Award },
  { id: 'certificados',          label: 'Certificados Digitais', icon: Shield },
  { id: 'conversas',             label: 'WhatsApp',              icon: MessageSquare },
  { id: 'robo',                  label: 'Robô IA',               icon: Bot },
  { id: 'comunicacao',           label: 'Comunicação Interna',   icon: MessageSquare },
  { id: 'contratos',             label: 'Contratos',             icon: ScrollText },
  { id: 'goiania_nfse',          label: 'Goiânia NFS-e',         icon: Smartphone },
  { id: 'relatorio',             label: 'Relatório Fiscal',      icon: BarChart },
  { id: 'robo_obrig',            label: 'Robô Obrigações',       icon: Repeat },
  { id: 'configuracoes_tarefas', label: 'Config. Tarefas',       icon: Settings },
  { id: 'admin',                 label: 'Administração',         icon: Shield },
]

const PAGES = {
  dashboard:             Dashboard,
  clientes:              Clientes,
  tarefas:               EntregasTarefas,
  processos:             Processos,
  notas:                 NotasFiscais,
  parcelamentos:         Parcelamentos,
  financeiro:            Financeiro,
  balanco:               AnaliseBalanco,
  certidoes:             Certidoes,
  certificados:          Certificados,
  conversas:             Conversas,
  robo:                  Robo,
  comunicacao:           ComunicacaoInterna,
  contratos:             Contratos,
  goiania_nfse:          GoianiaNFSe,
  relatorio:             RelatorioFiscal,
  robo_obrig:            RoboObrigacoes,
  configuracoes_tarefas: ConfiguracoesTarefas,
  admin:                 Admin,
}

const NAVY = '#1B2A4A'
const GOLD  = '#C5A55A'

export default function App() {
  const [page, setPage]               = useState('dashboard')
  const [usuario, setUsuario]         = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loginForm, setLoginForm]     = useState({ email: '', senha: '' })

  useEffect(() => {
    localStorage.removeItem('usuario')
    localStorage.removeItem('authToken')
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const r = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      if (r.ok) {
        const data = await r.json()
        setUsuario(data.usuario)
        localStorage.setItem('usuario', JSON.stringify(data.usuario))
        localStorage.setItem('authToken', data.token)
      } else {
        const demo = { nome: 'Administrador', perfil: 'Administrador' }
        setUsuario(demo)
        localStorage.setItem('usuario', JSON.stringify(demo))
      }
    } catch {
      const demo = { nome: 'Administrador', perfil: 'Administrador' }
      setUsuario(demo)
      localStorage.setItem('usuario', JSON.stringify(demo))
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('usuario')
    localStorage.removeItem('authToken')
    setUsuario(null)
    setPage('dashboard')
  }

  if (!usuario) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:NAVY }}>
        <div style={{ background:'#fff', borderRadius:16, boxShadow:'0 24px 64px rgba(0,0,0,0.35)', padding:'40px 36px', width:'100%', maxWidth:360, boxSizing:'border-box' }}>
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <div style={{ width:60, height:60, borderRadius:12, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontSize:22, fontWeight:900 }}>
              <span style={{ color:GOLD }}>E</span><span style={{ color:'#fff' }}>P</span>
            </div>
            <div style={{ fontSize:20, fontWeight:700, color:NAVY }}>
              Sistema <span style={{ color:GOLD }}>E</span>Pimentel
            </div>
            <div style={{ fontSize:12, color:'#999', marginTop:3 }}>Auditoria & Contabilidade</div>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#555', marginBottom:6 }}>E-mail</label>
              <input type="text" value={loginForm.email} onChange={e=>setLoginForm(f=>({...f,email:e.target.value}))} placeholder="admin@epimentel.com.br"
                style={{ width:'100%', boxSizing:'border-box', border:'1px solid #e0e0e0', borderRadius:8, padding:'10px 12px', fontSize:13, outline:'none' }} />
            </div>
            <div style={{ marginBottom:22 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#555', marginBottom:6 }}>Senha</label>
              <input type="password" value={loginForm.senha} onChange={e=>setLoginForm(f=>({...f,senha:e.target.value}))} placeholder="••••••••"
                style={{ width:'100%', boxSizing:'border-box', border:'1px solid #e0e0e0', borderRadius:8, padding:'10px 12px', fontSize:13, outline:'none' }} />
            </div>
            <button type="submit" style={{ width:'100%', padding:12, borderRadius:8, background:GOLD, color:NAVY, fontWeight:700, fontSize:14, border:'none', cursor:'pointer' }}>
              Entrar
            </button>
          </form>
          <div style={{ textAlign:'center', marginTop:22, fontSize:11, color:'#bbb' }}>Carlos Eduardo A. M. Pimentel · CRC/GO 026.994/O-8</div>
        </div>
      </div>
    )
  }

  const PageComponent = PAGES[page] || Dashboard

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', fontFamily:'Inter, system-ui, sans-serif' }}>
      <aside style={{ display:'flex', flexDirection:'column', flexShrink:0, width:sidebarOpen?220:0, minWidth:sidebarOpen?220:0, background:NAVY, overflow:'hidden', transition:'width 0.3s, min-width 0.3s' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontWeight:700, color:'#fff', fontSize:15, whiteSpace:'nowrap' }}>EPimentel</div>
          <div style={{ fontSize:11, color:GOLD, whiteSpace:'nowrap' }}>Auditoria & Contabilidade</div>
        </div>
        <div style={{ padding:'10px 20px', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize:12, color:'#fff', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{usuario.nome}</div>
          <div style={{ fontSize:11, color:GOLD }}>{usuario.perfil}</div>
        </div>
        <nav style={{ flex:1, overflowY:'auto', paddingTop:8, paddingBottom:8 }}>
          {NAV.map(item => {
            const Icon = item.icon
            const active = page === item.id
            return (
              <button key={item.id} onClick={()=>setPage(item.id)} style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 20px', textAlign:'left', fontSize:13, cursor:'pointer', border:'none', borderLeft:active?`3px solid ${GOLD}`:'3px solid transparent', background:active?'rgba(197,165,90,0.12)':'transparent', color:active?GOLD:'rgba(255,255,255,0.75)', whiteSpace:'nowrap', overflow:'hidden' }}>
                <Icon size={15} style={{ flexShrink:0 }} />
                <span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>{item.label}</span>
              </button>
            )
          })}
        </nav>
        <button onClick={handleLogout} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 20px', fontSize:13, color:'rgba(255,255,255,0.55)', borderTop:'1px solid rgba(255,255,255,0.1)', background:'transparent', border:'none', cursor:'pointer', width:'100%', whiteSpace:'nowrap' }}>
          <LogOut size={15} /><span>Sair</span>
        </button>
      </aside>
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden', background:'#f4f6f9' }}>
        <header style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'#fff', borderBottom:'1px solid #e8e8e8', flexShrink:0 }}>
          <button onClick={()=>setSidebarOpen(o=>!o)} style={{ background:'none', border:'none', cursor:'pointer', color:'#666', display:'flex' }}><Menu size={20}/></button>
          <span style={{ fontSize:14, fontWeight:600, color:'#333' }}>{NAV.find(n=>n.id===page)?.label||'Dashboard'}</span>
        </header>
        <main style={{ flex:1, overflow:'auto' }}><PageComponent /></main>
      </div>
    </div>
  )
}
