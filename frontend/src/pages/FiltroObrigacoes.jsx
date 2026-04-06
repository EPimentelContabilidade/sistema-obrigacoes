// FiltroObrigacoes.jsx
// Componente de barra de filtros avançados — importe e adicione no topo do Obrigacoes.jsx

import { useState } from 'react'
import { Search, Filter, X, ChevronDown } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'

const inp = {
  padding: '5px 9px', borderRadius: 6, border: '1px solid #d0d0d0',
  fontSize: 12, outline: 'none', background: '#fff', color: '#333', width: '100%', boxSizing: 'border-box',
}

export default function FiltroObrigacoes({ clientes = [], departamentos = [], onFiltrar }) {
  const [filtros, setFiltros] = useState({
    empresa: '',
    competencia_de: '',
    competencia_ate: '',
    prazo_tec_de: '',
    prazo_tec_ate: '',
    prazo_legal_de: '',
    prazo_legal_ate: '',
    entrega_de: '',
    entrega_ate: '',
    status_pendente:   true,
    status_justificada: false,
    status_entregue:   false,
    status_dispensada: false,
    departamento: '',
    responsavel: '',
    busca: '',
  })
  const [expandido, setExpandido] = useState(true)

  const set = (k, v) => setFiltros(f => ({ ...f, [k]: v }))

  const limpar = () => setFiltros({
    empresa: '', competencia_de: '', competencia_ate: '',
    prazo_tec_de: '', prazo_tec_ate: '', prazo_legal_de: '', prazo_legal_ate: '',
    entrega_de: '', entrega_ate: '', status_pendente: true,
    status_justificada: false, status_entregue: false, status_dispensada: false,
    departamento: '', responsavel: '', busca: '',
  })

  const aplicar = () => onFiltrar && onFiltrar(filtros)

  const CheckStatus = ({ label, campo, cor }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', userSelect: 'none' }}>
      <input type="checkbox" checked={filtros[campo]} onChange={e => set(campo, e.target.checked)}
        style={{ width: 14, height: 14, accentColor: cor || NAVY }} />
      <span style={{ fontSize: 12, color: filtros[campo] ? '#333' : '#888', fontWeight: filtros[campo] ? 600 : 400 }}>{label}</span>
    </label>
  )

  const Label = ({ children }) => (
    <div style={{ fontSize: 10, color: '#999', marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>{children}</div>
  )

  return (
    <div style={{ background: '#fff', borderBottom: '2px solid #e8e8e8', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Linha 1: Busca + Status checkboxes + Filtrar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
        {/* Busca */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={12} style={{ position: 'absolute', left: 8, top: 8, color: '#bbb' }} />
          <input value={filtros.busca} onChange={e => set('busca', e.target.value)}
            placeholder="Buscar obrigação / tarefa..."
            style={{ ...inp, paddingLeft: 26, height: 32 }} />
        </div>

        {/* Status checkboxes */}
        <div style={{ display: 'flex', gap: 14, padding: '4px 12px', borderRadius: 8, background: '#f8f9fb', border: '1px solid #e8e8e8' }}>
          <CheckStatus label="Pendentes"   campo="status_pendente"   cor="#f59e0b" />
          <CheckStatus label="Justificadas" campo="status_justificada" cor="#3b82f6" />
          <CheckStatus label="Entregues"   campo="status_entregue"   cor="#22c55e" />
          <CheckStatus label="Dispensadas" campo="status_dispensada"  cor="#6b7280" />
        </div>

        {/* Botões */}
        <button onClick={aplicar} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 7, background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <Search size={13} /> Filtrar
        </button>
        <button onClick={limpar} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, background: '#fee2e2', color: '#dc2626', fontWeight: 600, fontSize: 12, border: '1px solid #fca5a5', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <X size={12} /> Limpar
        </button>
        <button onClick={() => setExpandido(e => !e)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 7, background: expandido ? NAVY : '#f5f5f5', color: expandido ? '#fff' : '#555', fontSize: 12, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <Filter size={12} /> {expandido ? 'Menos filtros' : '+Filtros'}
        </button>
      </div>

      {/* Linha 2: Filtros avançados (expansível) */}
      {expandido && (
        <div style={{ padding: '10px 16px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px 14px' }}>

          {/* Empresa */}
          <div>
            <Label>Filtrar por Empresa</Label>
            <select value={filtros.empresa} onChange={e => set('empresa', e.target.value)} style={inp}>
              <option value="">Todas as empresas</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          {/* Departamento */}
          <div>
            <Label>Departamento</Label>
            <select value={filtros.departamento} onChange={e => set('departamento', e.target.value)} style={inp}>
              <option value="">Todos</option>
              {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
              <option value="Fiscal">Fiscal</option>
              <option value="Pessoal">Pessoal</option>
              <option value="Contábil">Contábil</option>
            </select>
          </div>

          {/* Competência de/até */}
          <div>
            <Label>Competência de</Label>
            <input type="month" value={filtros.competencia_de} onChange={e => set('competencia_de', e.target.value)} style={inp} />
          </div>
          <div>
            <Label>Competência até</Label>
            <input type="month" value={filtros.competencia_ate} onChange={e => set('competencia_ate', e.target.value)} style={inp} />
          </div>

          {/* Prazo técnico de/até */}
          <div>
            <Label>Prazo téc. de</Label>
            <input type="date" value={filtros.prazo_tec_de} onChange={e => set('prazo_tec_de', e.target.value)} style={inp} />
          </div>
          <div>
            <Label>Prazo téc. até</Label>
            <input type="date" value={filtros.prazo_tec_ate} onChange={e => set('prazo_tec_ate', e.target.value)} style={inp} />
          </div>

          {/* Prazo legal de/até */}
          <div>
            <Label>Prazo legal de</Label>
            <input type="date" value={filtros.prazo_legal_de} onChange={e => set('prazo_legal_de', e.target.value)} style={inp} />
          </div>
          <div>
            <Label>Prazo legal até</Label>
            <input type="date" value={filtros.prazo_legal_ate} onChange={e => set('prazo_legal_ate', e.target.value)} style={inp} />
          </div>

          {/* Entrega de/até */}
          <div>
            <Label>Entrega do dia</Label>
            <input type="date" value={filtros.entrega_de} onChange={e => set('entrega_de', e.target.value)} style={inp} />
          </div>
          <div>
            <Label>Entrega até dia</Label>
            <input type="date" value={filtros.entrega_ate} onChange={e => set('entrega_ate', e.target.value)} style={inp} />
          </div>
        </div>
      )}
    </div>
  )
}
