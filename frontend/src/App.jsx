import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Obrigacoes from './pages/Obrigacoes'
import Entregas from './pages/Entregas'
import Conversas from './pages/Conversas'
import Robo from './pages/Robo'
import {
  LayoutDashboard, Users, FileText, Send, MessageCircle, Bot
} from 'lucide-react'

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { id: 'clientes',   label: 'Clientes',   icon: Users },
  { id: 'obrigacoes', label: 'Obrigações', icon: FileText },
  { id: 'entregas',   label: 'Entregas',   icon: Send },
  { id: 'conversas',  label: 'WhatsApp',   icon: MessageCircle },
  { id: 'robo',       label: 'Robô IA',    icon: Bot },
]

const PAGES = {
  dashboard:  Dashboard,
  clientes:   Clientes,
  obrigacoes: Obrigacoes,
  entregas:   Entregas,
  conversas:  Conversas,
  robo:       Robo,
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const Page = PAGES[page]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, background: '#1B2A4A', color: '#fff',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, height: '100vh',
        zIndex: 100, transition: 'transform .2s',
      }}>
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{ color: '#C5A55A', fontWeight: 700, fontSize: 15 }}>EPimentel</div>
          <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, marginTop: 2 }}>Auditoria & Contabilidade</div>
        </div>
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setPage(id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '11px 20px', border: 'none',
              background: page === id ? 'rgba(197,165,90,.15)' : 'transparent',
              color: page === id ? '#C5A55A' : 'rgba(255,255,255,.75)',
              cursor: 'pointer', fontSize: 14, fontWeight: page === id ? 600 : 400,
              borderLeft: page === id ? '3px solid #C5A55A' : '3px solid transparent',
              transition: 'all .15s',
            }}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,.1)', fontSize: 12, color: 'rgba(255,255,255,.4)' }}>
          CRC/GO 026.994/O-8
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 240, flex: 1, padding: '32px 32px', minHeight: '100vh' }}>
        <Page />
      </main>
    </div>
  )
}
