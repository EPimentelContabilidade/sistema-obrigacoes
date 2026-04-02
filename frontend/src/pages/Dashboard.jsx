import { useState, useEffect } from 'react'
import { getStats, getEntregasRecentes } from '../api'
import { Users, FileText, Send, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react'

const card = (label, value, icon, color) => ({ label, value, icon, color })

const STATUS_COLOR = {
  enviado: '#22c55e',
  erro: '#ef4444',
  pendente: '#f59e0b',
  confirmado: '#3b82f6',
}

const STATUS_ICON = {
  enviado: CheckCircle,
  erro: XCircle,
  pendente: Clock,
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentes, setRecentes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getStats(), getEntregasRecentes()])
      .then(([s, r]) => { setStats(s.data); setRecentes(r.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ color: '#888', padding: 40 }}>Carregando...</div>

  const cards = stats ? [
    card('Clientes Ativos', stats.clientes_ativos, Users, '#1B2A4A'),
    card('Obrigações', stats.total_obrigacoes, FileText, '#C5A55A'),
    card('Enviadas', stats.entregas_enviadas, Send, '#22c55e'),
    card('Pendentes', stats.entregas_pendentes, Clock, '#f59e0b'),
    card('Com Erro', stats.entregas_com_erro, AlertCircle, '#ef4444'),
  ] : []

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1B2A4A', marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: '#888', marginBottom: 28, fontSize: 14 }}>Visão geral do sistema de obrigações acessórias</p>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{
            background: '#fff', borderRadius: 12, padding: '20px 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,.08)', display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#888' }}>{label}</span>
              <Icon size={20} color={color} />
            </div>
            <span style={{ fontSize: 30, fontWeight: 700, color }}>{value ?? '—'}</span>
          </div>
        ))}
      </div>

      {/* Entregas recentes */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: '#1B2A4A', fontSize: 15 }}>
          Entregas Recentes
        </div>
        {recentes.length === 0 ? (
          <div style={{ padding: 32, color: '#aaa', textAlign: 'center', fontSize: 14 }}>Nenhuma entrega realizada ainda.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {['#', 'Cliente', 'Canal', 'Status', 'Data'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#888', fontWeight: 500, fontSize: 13 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentes.map((e) => {
                const Icon = STATUS_ICON[e.status] || Clock
                return (
                  <tr key={e.id} style={{ borderTop: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '10px 16px', color: '#aaa' }}>{e.id}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 500, color: '#1B2A4A' }}>{e.cliente}</td>
                    <td style={{ padding: '10px 16px', color: '#555', textTransform: 'capitalize' }}>{e.canal}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                        background: STATUS_COLOR[e.status] + '20', color: STATUS_COLOR[e.status],
                      }}>
                        <Icon size={12} /> {e.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#888', fontSize: 13 }}>
                      {e.criado_em ? new Date(e.criado_em).toLocaleString('pt-BR') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
