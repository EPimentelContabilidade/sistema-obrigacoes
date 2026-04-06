import { useState, useEffect } from 'react'
import { Search, User, X, ChevronDown } from 'lucide-react'

export default function ClienteSelector({ value, onChange, placeholder = 'Selecione o cliente...' }) {
  const [clientes, setClientes] = useState([])
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/v1/clientes/')
      .then(r => r.json())
      .then(data => setClientes(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.cnpj?.includes(busca)
  )

  const selecionado = clientes.find(c => c.id === value?.id)

  const selecionar = (c) => {
    onChange(c)
    setAberto(false)
    setBusca('')
  }

  const limpar = (e) => {
    e.stopPropagation()
    onChange(null)
    setBusca('')
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Botão de seleção */}
      <div
        onClick={() => setAberto(a => !a)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', border: '1px solid #e2e8f0',
          borderRadius: 8, cursor: 'pointer', background: '#fff',
          borderColor: aberto ? '#1B2A4A' : selecionado ? '#22c55e' : '#e2e8f0',
          boxShadow: aberto ? '0 0 0 2px rgba(27,42,74,.1)' : 'none',
          transition: 'all .15s',
        }}
      >
        <User size={15} color={selecionado ? '#22c55e' : '#94a3b8'} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {selecionado ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1B2A4A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selecionado.nome}
              </div>
              <div style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>{selecionado.cnpj}</div>
            </div>
          ) : (
            <span style={{ fontSize: 13, color: '#aaa' }}>{placeholder}</span>
          )}
        </div>
        {selecionado ? (
          <button onClick={limpar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 2 }}>
            <X size={14} />
          </button>
        ) : (
          <ChevronDown size={14} color="#aaa" style={{ flexShrink: 0, transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        )}
      </div>

      {/* Dropdown */}
      {aberto && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setAberto(false)} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
            background: '#fff', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.15)',
            border: '1px solid #e2e8f0', marginTop: 4, overflow: 'hidden',
            maxHeight: 320,
          }}>
            {/* Busca */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={14} color="#aaa" />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por nome ou CNPJ..."
                autoFocus
                style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, background: 'none' }}
              />
            </div>

            {/* Lista */}
            <div style={{ overflowY: 'auto', maxHeight: 260 }}>
              {loading && <div style={{ padding: 20, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Carregando...</div>}
              {!loading && filtrados.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                  {busca ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
                </div>
              )}
              {filtrados.map(c => (
                <div
                  key={c.id}
                  onClick={() => selecionar(c)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', cursor: 'pointer',
                    background: selecionado?.id === c.id ? '#eff6ff' : '#fff',
                    borderBottom: '1px solid #f8fafc',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = selecionado?.id === c.id ? '#eff6ff' : '#fff'}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', background: '#1B2A4A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#C5A55A', fontWeight: 700, fontSize: 14, flexShrink: 0,
                  }}>
                    {c.nome?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1B2A4A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.nome}
                    </div>
                    <div style={{ fontSize: 11, color: '#888', display: 'flex', gap: 8, marginTop: 2 }}>
                      <span style={{ fontFamily: 'monospace' }}>{c.cnpj}</span>
                      <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>{c.regime}</span>
                    </div>
                  </div>
                  {selecionado?.id === c.id && <span style={{ color: '#22c55e', fontSize: 16 }}>✓</span>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
