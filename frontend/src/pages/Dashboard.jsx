import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Save, LayoutDashboard, Users, FileText, Send, Clock, AlertCircle, CheckCircle, DollarSign, BarChart2, TrendingUp, Calendar, RefreshCw, GripVertical, Eye, EyeOff, Settings } from 'lucide-react'

const API = '/api/v1'
const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'

// Tipos de widgets disponíveis
const TIPOS_WIDGET = [
  { id: 'stat',        label: 'Contador / KPI',        icon: '📊', desc: 'Número com ícone e título' },
  { id: 'lista',       label: 'Lista de Entregas',     icon: '📋', desc: 'Tabela de entregas recentes' },
  { id: 'grafico_bar', label: 'Gráfico de Barras',     icon: '📈', desc: 'Comparativo mensal' },
  { id: 'grafico_pie', label: 'Gráfico de Pizza',      icon: '🥧', desc: 'Distribuição por status' },
  { id: 'calendario',  label: 'Calendário de Prazos',  icon: '📅', desc: 'Próximos vencimentos' },
  { id: 'clientes',    label: 'Resumo de Clientes',    icon: '👥', desc: 'Clientes e status' },
  { id: 'alertas',     label: 'Alertas e Pendências',  icon: '⚠️', desc: 'Itens que precisam de atenção' },
  { id: 'texto',       label: 'Texto / Notas',         icon: '📝', desc: 'Bloco de texto livre' },
]

const ICONES_STAT = ['👥','📄','✉️','⏳','⚠️','✅','💰','📊','📅','🔔','⚡','🏆']
const CORES_STAT = [
  { nome: 'Azul', val: '#3b82f6' }, { nome: 'Verde', val: '#22c55e' },
  { nome: 'Amarelo', val: '#f59e0b' }, { nome: 'Vermelho', val: '#ef4444' },
  { nome: 'Roxo', val: '#8b5cf6' }, { nome: 'Dourado', val: GOLD },
  { nome: 'Navy', val: NAVY }, { nome: 'Cinza', val: '#6b7280' },
]

// Dashboards iniciais
const DASHBOARDS_INICIAL = [
  {
    id: 1, nome: 'Visão Geral', icone: '🏠',
    widgets: [
      { id: 1, tipo: 'stat', titulo: 'Clientes Ativos', icone: '👥', cor: '#3b82f6', fonte: 'clientes_ativos', w: 1 },
      { id: 2, tipo: 'stat', titulo: 'Obrigações',      icone: '📄', cor: GOLD,       fonte: 'total_obrigacoes', w: 1 },
      { id: 3, tipo: 'stat', titulo: 'Enviadas',        icone: '✉️', cor: '#22c55e',  fonte: 'enviadas', w: 1 },
      { id: 4, tipo: 'stat', titulo: 'Pendentes',       icone: '⏳', cor: '#f59e0b',  fonte: 'pendentes', w: 1 },
      { id: 5, tipo: 'stat', titulo: 'Com Erro',        icone: '⚠️', cor: '#ef4444',  fonte: 'com_erro', w: 1 },
      { id: 6, tipo: 'lista', titulo: 'Entregas Recentes', w: 3 },
    ]
  },
  {
    id: 2, nome: 'Fiscal', icone: '📋',
    widgets: [
      { id: 7,  tipo: 'stat', titulo: 'Obrigações Fiscais', icone: '📄', cor: '#3b82f6', fonte: 'total_obrigacoes', w: 1 },
      { id: 8,  tipo: 'stat', titulo: 'Atrasadas',          icone: '⚠️', cor: '#ef4444', fonte: 'com_erro', w: 1 },
      { id: 9,  tipo: 'stat', titulo: 'Entregues Mês',      icone: '✅', cor: '#22c55e', fonte: 'enviadas', w: 1 },
      { id: 10, tipo: 'alertas', titulo: 'Alertas Fiscais', w: 2 },
      { id: 11, tipo: 'calendario', titulo: 'Vencimentos Abril', w: 2 },
    ]
  },
  {
    id: 3, nome: 'Clientes', icone: '👥',
    widgets: [
      { id: 12, tipo: 'clientes', titulo: 'Resumo de Clientes', w: 3 },
      { id: 13, tipo: 'stat', titulo: 'Total Clientes', icone: '👥', cor: NAVY, fonte: 'clientes_ativos', w: 1 },
    ]
  },
]

// Mock de dados dinâmicos
const MOCK_STATS = { clientes_ativos: 1, total_obrigacoes: 8, enviadas: 2, pendentes: 5, com_erro: 1 }
const MOCK_ENTREGAS = [
  { id: 1, cliente: 'EPIMENTEL-AUDITORIA & CONTABILIDADE LTDA', canal: 'Ambos', status: 'erro',    data: '03/04/2026, 17:47:43' },
  { id: 2, cliente: 'EPIMENTEL-AUDITORIA & CONTABILIDADE LTDA', canal: 'Email', status: 'entregue', data: '02/04/2026, 09:15:00' },
]
const MOCK_CLIENTES = [
  { nome: 'EPIMENTEL-AUDITORIA & CONTABILIDADE LTDA', cnpj: '22.939.803/0001-49', regime: 'Simples Nacional', status: 'ativo', obrigacoes: 8 },
]
const MOCK_ALERTAS = [
  { tipo: 'atrasada', msg: 'EFD-Contribuições venceu em 10/04/2026', cliente: 'EPIMENTEL' },
  { tipo: 'pendente', msg: 'Folha de Pagamento vence em 05/04/2026', cliente: 'EPIMENTEL' },
  { tipo: 'robo',     msg: 'SPED Fiscal aguarda processamento do Robô', cliente: 'EPIMENTEL' },
]
const MOCK_PRAZOS = [
  { dia: 5,  obrig: 'Folha de Pagamento', tipo: 'Pessoal' },
  { dia: 7,  obrig: 'FGTS / GFIP',       tipo: 'Pessoal' },
  { dia: 10, obrig: 'EFD-Contribuições', tipo: 'Fiscal' },
  { dia: 15, obrig: 'DCTF',              tipo: 'Fiscal' },
  { dia: 20, obrig: 'Declaração ISS',    tipo: 'Fiscal' },
  { dia: 20, obrig: 'INSS (GPS)',        tipo: 'Pessoal' },
  { dia: 30, obrig: 'Balancete Mensal',  tipo: 'Contábil' },
]

export default function Dashboard() {
  const [dashboards, setDashboards] = useState(DASHBOARDS_INICIAL)
  const [abaAtiva, setAbaAtiva]     = useState(1)
  const [modoEditar, setModoEditar] = useState(false)
  const [modalDash, setModalDash]   = useState(null)   // null | 'novo' | dashboard obj
  const [modalWidget, setModalWidget] = useState(null) // null | { dashId, widget | null }
  const [formDash, setFormDash]     = useState({ nome: '', icone: '🏠' })
  const [formWidget, setFormWidget] = useState({ tipo: 'stat', titulo: '', icone: '📊', cor: '#3b82f6', fonte: 'clientes_ativos', w: 1, texto: '' })

  const dashAtivo = dashboards.find(d => d.id === abaAtiva)

  const salvarDash = () => {
    if (modalDash === 'novo') {
      const novo = { id: Date.now(), nome: formDash.nome, icone: formDash.icone, widgets: [] }
      setDashboards(p => [...p, novo])
      setAbaAtiva(novo.id)
    } else {
      setDashboards(p => p.map(d => d.id === modalDash.id ? { ...d, nome: formDash.nome, icone: formDash.icone } : d))
    }
    setModalDash(null)
  }

  const excluirDash = (id) => {
    setDashboards(p => p.filter(d => d.id !== id))
    if (abaAtiva === id) setAbaAtiva(dashboards.find(d => d.id !== id)?.id)
  }

  const salvarWidget = () => {
    const { dashId, widget } = modalWidget
    const novoWidget = { ...formWidget, id: widget?.id || Date.now() }
    setDashboards(p => p.map(d => d.id === dashId ? {
      ...d,
      widgets: widget
        ? d.widgets.map(w => w.id === widget.id ? novoWidget : w)
        : [...d.widgets, novoWidget]
    } : d))
    setModalWidget(null)
  }

  const excluirWidget = (dashId, widgetId) => {
    setDashboards(p => p.map(d => d.id === dashId ? { ...d, widgets: d.widgets.filter(w => w.id !== widgetId) } : d))
  }

  const ICONES_DASH = ['🏠','📊','📋','👥','💰','📈','🔔','⚡','🏛️','🗂️','📅','🎯']

  // ── Renderização dos widgets ──
  const renderWidget = (w, dashId) => {
    const wrapper = (content) => (
      <div key={w.id} style={{
        gridColumn: `span ${Math.min(w.w || 1, 3)}`,
        background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8',
        padding: 16, position: 'relative',
        boxShadow: modoEditar ? '0 0 0 2px ' + GOLD + '40' : 'none',
        transition: 'box-shadow 0.2s',
      }}>
        {modoEditar && (
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, zIndex: 10 }}>
            <button onClick={() => { setFormWidget({ ...w }); setModalWidget({ dashId, widget: w }) }}
              style={{ padding: '3px 7px', borderRadius: 5, background: '#EBF5FF', color: '#1D6FA4', border: 'none', cursor: 'pointer', fontSize: 11 }}>✏️</button>
            <button onClick={() => excluirWidget(dashId, w.id)}
              style={{ padding: '3px 7px', borderRadius: 5, background: '#FEF2F2', color: '#dc2626', border: 'none', cursor: 'pointer', fontSize: 11 }}>✕</button>
          </div>
        )}
        {content}
      </div>
    )

    if (w.tipo === 'stat') {
      const val = MOCK_STATS[w.fonte] ?? 0
      return wrapper(
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>{w.titulo}</div>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: (w.cor || '#3b82f6') + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{w.icone || '📊'}</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: w.cor || '#3b82f6' }}>{val}</div>
        </>
      )
    }

    if (w.tipo === 'lista') return wrapper(
      <>
        <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 12 }}>{w.titulo || 'Entregas Recentes'}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ borderBottom: '1px solid #f0f0f0' }}>{['#','Cliente','Canal','Status','Data'].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, color: '#aaa', fontWeight: 600 }}>{h}</th>)}</tr></thead>
          <tbody>
            {MOCK_ENTREGAS.map((e, i) => (
              <tr key={e.id} style={{ borderBottom: '1px solid #f8f8f8' }}>
                <td style={{ padding: '8px', color: '#aaa' }}>{i+1}</td>
                <td style={{ padding: '8px', fontWeight: 600, color: NAVY }}>{e.cliente}</td>
                <td style={{ padding: '8px', color: '#555' }}>{e.canal}</td>
                <td style={{ padding: '8px' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: e.status==='erro' ? '#FEF2F2' : '#F0FDF4', color: e.status==='erro' ? '#dc2626' : '#166534', fontWeight: 600 }}>
                    {e.status==='erro' ? '⊙ erro' : '✓ entregue'}
                  </span>
                </td>
                <td style={{ padding: '8px', color: '#aaa', fontSize: 11 }}>{e.data}</td>
              </tr>
            ))}
            {MOCK_ENTREGAS.length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#ccc' }}>Nenhuma entrega realizada ainda.</td></tr>}
          </tbody>
        </table>
      </>
    )

    if (w.tipo === 'clientes') return wrapper(
      <>
        <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 12 }}>{w.titulo || 'Resumo de Clientes'}</div>
        {MOCK_CLIENTES.map(c => (
          <div key={c.nome} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{c.nome}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{c.cnpj} · {c.regime}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#f5f5f5', color: '#666' }}>{c.obrigacoes} obrigações</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#F0FDF4', color: '#166534', fontWeight: 600 }}>● ativo</span>
            </div>
          </div>
        ))}
      </>
    )

    if (w.tipo === 'alertas') return wrapper(
      <>
        <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 10 }}>{w.titulo || 'Alertas e Pendências'}</div>
        {MOCK_ALERTAS.map((a, i) => {
          const cores = { atrasada: { bg: '#FEF2F2', color: '#dc2626', ic: '⚠️' }, pendente: { bg: '#FEF9C3', color: '#854D0E', ic: '⏳' }, robo: { bg: '#EDE9FF', color: '#6366f1', ic: '🤖' } }
          const c = cores[a.tipo] || cores.pendente
          return (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 10px', borderRadius: 8, background: c.bg, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>{c.ic}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: c.color }}>{a.msg}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{a.cliente}</div>
              </div>
            </div>
          )
        })}
      </>
    )

    if (w.tipo === 'calendario') return wrapper(
      <>
        <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 10 }}>{w.titulo || 'Vencimentos'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {MOCK_PRAZOS.map((p, i) => {
            const cores = { Fiscal: '#EBF5FF:#1D6FA4', Pessoal: '#EDFBF1:#1A7A3C', Contábil: '#F3EEFF:#6B3EC9' }
            const [bg, color] = (cores[p.tipo] || '#f5f5f5:#666').split(':')
            const hoje = new Date().getDate()
            const urgente = p.dia - hoje <= 3
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, background: urgente ? '#FEF9C3' : '#fafafa', border: `1px solid ${urgente ? '#fde68a' : '#f0f0f0'}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: urgente ? '#f59e0b' : NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{p.dia}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>{p.obrig}</div>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 5, background: bg, color }}>{p.tipo}</span>
                </div>
                {urgente && <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>URGENTE</span>}
              </div>
            )
          })}
        </div>
      </>
    )

    if (w.tipo === 'grafico_bar') return wrapper(
      <>
        <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 14 }}>{w.titulo || 'Entregas por Mês'}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 100 }}>
          {[['Jan',40],['Fev',65],['Mar',55],['Abr',30],['Mai',0],['Jun',0]].map(([m, v]) => (
            <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', background: v > 0 ? NAVY : '#f0f0f0', borderRadius: '4px 4px 0 0', height: `${v}px`, transition: 'height 0.3s' }} />
              <span style={{ fontSize: 10, color: '#aaa' }}>{m}</span>
            </div>
          ))}
        </div>
      </>
    )

    if (w.tipo === 'grafico_pie') return wrapper(
      <>
        <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 14 }}>{w.titulo || 'Status das Obrigações'}</div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <svg viewBox="0 0 100 100" style={{ width: 90, height: 90 }}>
            <circle cx="50" cy="50" r="40" fill="none" stroke="#f0f0f0" strokeWidth="20" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="20" strokeDasharray="50 200" strokeDashoffset="50" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="20" strokeDasharray="100 200" strokeDashoffset="0" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="20" strokeDasharray="20 200" strokeDashoffset="-100" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[['Entregues','#22c55e','63%'],['Pendentes','#f59e0b','25%'],['Atrasadas','#ef4444','12%']].map(([l,c,p]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                <span style={{ color: '#666' }}>{l}</span>
                <span style={{ fontWeight: 700, color: NAVY }}>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </>
    )

    if (w.tipo === 'texto') return wrapper(
      <>
        {modoEditar
          ? <textarea defaultValue={w.texto || ''} placeholder="Digite suas notas aqui..." style={{ width: '100%', minHeight: 100, border: 'none', outline: 'none', resize: 'vertical', fontSize: 13, color: '#333', fontFamily: 'inherit', background: 'transparent', boxSizing: 'border-box' }} />
          : <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{w.texto || <span style={{ color: '#ccc' }}>Bloco de texto vazio. Clique em editar para adicionar notas.</span>}</div>
        }
      </>
    )

    return wrapper(<div style={{ color: '#ccc', textAlign: 'center', padding: 20 }}>Widget: {w.tipo}</div>)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 44px)', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Barra de abas dos dashboards */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', paddingLeft: 8, overflowX: 'auto', flexShrink: 0 }}>
        {dashboards.map(d => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <button onClick={() => setAbaAtiva(d.id)} style={{
              padding: '10px 16px', fontSize: 13, fontWeight: abaAtiva===d.id ? 700 : 400,
              color: abaAtiva===d.id ? NAVY : '#888', background: 'none', border: 'none',
              borderBottom: abaAtiva===d.id ? `2px solid ${GOLD}` : '2px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>{d.icone}</span> {d.nome}
            </button>
            {modoEditar && (
              <div style={{ display: 'flex', gap: 2, marginRight: 4 }}>
                <button onClick={() => { setFormDash({ nome: d.nome, icone: d.icone }); setModalDash(d) }}
                  style={{ padding: '2px 5px', borderRadius: 4, background: '#f0f0f0', border: 'none', cursor: 'pointer', fontSize: 11, color: '#666' }}>✏️</button>
                {dashboards.length > 1 && (
                  <button onClick={() => excluirDash(d.id)}
                    style={{ padding: '2px 5px', borderRadius: 4, background: '#FEF2F2', border: 'none', cursor: 'pointer', fontSize: 11, color: '#dc2626' }}>✕</button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Botão novo dashboard */}
        {modoEditar && (
          <button onClick={() => { setFormDash({ nome: '', icone: '🏠' }); setModalDash('novo') }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, border: `1px dashed ${GOLD}`, background: GOLD+'10', color: GOLD, fontWeight: 600, fontSize: 12, cursor: 'pointer', marginLeft: 8, whiteSpace: 'nowrap' }}>
            <Plus size={13} /> Novo Dashboard
          </button>
        )}

        {/* Botão editar/salvar */}
        <div style={{ marginLeft: 'auto', padding: '0 12px', flexShrink: 0 }}>
          <button onClick={() => setModoEditar(e => !e)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: modoEditar ? GOLD : NAVY, color: modoEditar ? NAVY : '#fff', fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
            {modoEditar ? <><Save size={13} /> Salvar Layout</> : <><Settings size={13} /> Editar</>}
          </button>
        </div>
      </div>

      {/* Conteúdo do dashboard ativo */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', background: '#f8f9fb' }}>
        {dashAtivo && (
          <>
            {/* Título */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: NAVY }}>{dashAtivo.icone} {dashAtivo.nome}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Visão geral do sistema de obrigações acessórias</div>
              </div>
              {modoEditar && (
                <button onClick={() => { setFormWidget({ tipo: 'stat', titulo: '', icone: '📊', cor: '#3b82f6', fonte: 'clientes_ativos', w: 1, texto: '' }); setModalWidget({ dashId: dashAtivo.id, widget: null }) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, background: NAVY, color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
                  <Plus size={13} /> Adicionar Widget
                </button>
              )}
            </div>

            {/* Grid de widgets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {dashAtivo.widgets.map(w => renderWidget(w, dashAtivo.id))}
              {dashAtivo.widgets.length === 0 && (
                <div style={{ gridColumn: 'span 3', background: '#fff', borderRadius: 12, border: `2px dashed ${GOLD}30`, padding: 60, textAlign: 'center', color: '#ccc' }}>
                  <LayoutDashboard size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                  <div style={{ fontSize: 14 }}>Dashboard vazio.</div>
                  {modoEditar && <div style={{ fontSize: 12, marginTop: 4 }}>Clique em "Adicionar Widget" para começar.</div>}
                  {!modoEditar && <div style={{ fontSize: 12, marginTop: 4 }}>Clique em "Editar" para adicionar widgets.</div>}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Modal: Novo/Editar Dashboard ── */}
      {modalDash !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 420, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{modalDash==='novo' ? 'Novo Dashboard' : 'Editar Dashboard'}</div>
              <button onClick={() => setModalDash(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>Nome do Dashboard</label>
              <input value={formDash.nome} onChange={e => setFormDash(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Fiscal, RH, Meus Relatórios..." style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid #e0e0e0', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 8 }}>Ícone</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                {ICONES_DASH.map(ic => (
                  <button key={ic} onClick={() => setFormDash(f => ({ ...f, icone: ic }))} style={{ padding: '8px', borderRadius: 8, fontSize: 20, border: `2px solid ${formDash.icone===ic ? NAVY : '#e8e8e8'}`, background: formDash.icone===ic ? '#F0F4FF' : '#fff', cursor: 'pointer' }}>{ic}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalDash(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={salvarDash} disabled={!formDash.nome} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, background: formDash.nome ? NAVY : '#ccc', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: formDash.nome ? 'pointer' : 'default' }}>
                <Save size={13} /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Adicionar/Editar Widget ── */}
      {modalWidget !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{modalWidget.widget ? 'Editar Widget' : 'Adicionar Widget'}</div>
              <button onClick={() => setModalWidget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}><X size={18} /></button>
            </div>

            {/* Tipo */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 8 }}>Tipo de Widget</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 7 }}>
                {TIPOS_WIDGET.map(t => (
                  <button key={t.id} onClick={() => setFormWidget(f => ({ ...f, tipo: t.id }))} style={{ padding: '9px 12px', borderRadius: 8, textAlign: 'left', cursor: 'pointer', border: `2px solid ${formWidget.tipo===t.id ? NAVY : '#e8e8e8'}`, background: formWidget.tipo===t.id ? '#F0F4FF' : '#fff' }}>
                    <div style={{ fontSize: 16, marginBottom: 2 }}>{t.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>{t.label}</div>
                    <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Título */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>Título do Widget</label>
              <input value={formWidget.titulo} onChange={e => setFormWidget(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Total de Clientes" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid #e0e0e0', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            </div>

            {/* Largura */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>Largura</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1,2,3].map(w => (
                  <button key={w} onClick={() => setFormWidget(f => ({ ...f, w }))} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${formWidget.w===w ? NAVY : '#e8e8e8'}`, background: formWidget.w===w ? '#F0F4FF' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: formWidget.w===w ? 700 : 400, color: NAVY }}>
                    {w===1 ? '⅓ Pequeno' : w===2 ? '⅔ Médio' : '⬛ Largo'}
                  </button>
                ))}
              </div>
            </div>

            {/* Config específica por tipo */}
            {formWidget.tipo === 'stat' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>Fonte de dados</label>
                  <select value={formWidget.fonte} onChange={e => setFormWidget(f => ({ ...f, fonte: e.target.value }))} style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid #e0e0e0', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
                    <option value="clientes_ativos">Clientes Ativos</option>
                    <option value="total_obrigacoes">Total de Obrigações</option>
                    <option value="enviadas">Enviadas</option>
                    <option value="pendentes">Pendentes</option>
                    <option value="com_erro">Com Erro</option>
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>Ícone</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {ICONES_STAT.map(ic => <button key={ic} onClick={() => setFormWidget(f => ({ ...f, icone: ic }))} style={{ padding: '6px', borderRadius: 7, fontSize: 18, border: `2px solid ${formWidget.icone===ic ? NAVY : '#e8e8e8'}`, background: formWidget.icone===ic ? '#F0F4FF' : '#fff', cursor: 'pointer' }}>{ic}</button>)}
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>Cor</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {CORES_STAT.map(c => <button key={c.val} onClick={() => setFormWidget(f => ({ ...f, cor: c.val }))} title={c.nome} style={{ width: 28, height: 28, borderRadius: '50%', background: c.val, border: `3px solid ${formWidget.cor===c.val ? '#333' : 'transparent'}`, cursor: 'pointer' }} />)}
                  </div>
                </div>
              </>
            )}

            {formWidget.tipo === 'texto' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>Conteúdo</label>
                <textarea value={formWidget.texto} onChange={e => setFormWidget(f => ({ ...f, texto: e.target.value }))} placeholder="Escreva suas notas aqui..." style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid #e0e0e0', fontSize: 13, outline: 'none', width: '100%', height: 100, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            )}

            {/* Preview */}
            <div style={{ marginBottom: 18, padding: '10px 14px', borderRadius: 9, background: '#f8f9fb', border: '1px solid #e8e8e8' }}>
              <div style={{ fontSize: 10, color: '#aaa', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Preview</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {formWidget.tipo==='stat' && <>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: (formWidget.cor||'#3b82f6')+'18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{formWidget.icone||'📊'}</div>
                  <div>
                    <div style={{ fontSize: 12, color: '#666' }}>{formWidget.titulo || 'Título do KPI'}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: formWidget.cor||'#3b82f6' }}>{MOCK_STATS[formWidget.fonte] ?? 0}</div>
                  </div>
                </>}
                {formWidget.tipo!=='stat' && <div style={{ fontSize: 13, color: '#888' }}>{TIPOS_WIDGET.find(t=>t.id===formWidget.tipo)?.icon} {formWidget.titulo || TIPOS_WIDGET.find(t=>t.id===formWidget.tipo)?.label}</div>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalWidget(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={salvarWidget} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 8, background: NAVY, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                <Save size={13} /> {modalWidget.widget ? 'Atualizar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
