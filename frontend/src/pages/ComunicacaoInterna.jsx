import { useState, useEffect, useRef } from 'react'
import { Send, Users, Plus, X, Loader, Search, MessageSquare } from 'lucide-react'

const API = '/api/v1'

const GRUPOS_PADRAO = [
  { id: 'geral', nome: '📢 Geral — Escritório', membros: 0 },
  { id: 'contabil', nome: '📊 Depto Contábil', membros: 0 },
  { id: 'fiscal', nome: '📋 Depto Fiscal', membros: 0 },
  { id: 'pessoal', nome: '👥 Depto Pessoal', membros: 0 },
]

export default function ComunicacaoInterna() {
  const [grupos, setGrupos] = useState(GRUPOS_PADRAO)
  const [grupoSel, setGrupoSel] = useState(GRUPOS_PADRAO[0])
  const [funcionarios, setFuncionarios] = useState([])
  const [mensagens, setMensagens] = useState({})
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [busca, setBusca] = useState('')
  const [modalFuncionario, setModalFuncionario] = useState(false)
  const [novoFunc, setNovoFunc] = useState({ nome: '', whatsapp: '', cargo: '', departamento: 'Contábil' })
  const [msg, setMsg] = useState('')
  const fimRef = useRef(null)

  useEffect(() => {
    carregarFuncionarios()
    carregarMensagens(grupoSel.id)
  }, [])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, grupoSel])

  const carregarFuncionarios = async () => {
    try {
      const r = await fetch(`${API}/comunicacao/funcionarios`)
      if (r.ok) setFuncionarios(await r.json())
    } catch {}
  }

  const carregarMensagens = async (grupoId) => {
    try {
      const r = await fetch(`${API}/comunicacao/mensagens/${grupoId}`)
      if (r.ok) {
        const data = await r.json()
        setMensagens(m => ({ ...m, [grupoId]: data }))
      }
    } catch {}
  }

  const selecionarGrupo = (grupo) => {
    setGrupoSel(grupo)
    if (!mensagens[grupo.id]) carregarMensagens(grupo.id)
  }

  const enviar = async () => {
    if (!texto.trim() || enviando) return
    const msgLocal = { id: Date.now(), texto, hora: new Date().toISOString(), remetente: 'Eduardo Pimentel', tipo: 'enviado' }
    setMensagens(m => ({ ...m, [grupoSel.id]: [...(m[grupoSel.id] || []), msgLocal] }))
    const textoEnvio = texto
    setTexto('')
    setEnviando(true)
    try {
      await fetch(`${API}/comunicacao/enviar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grupo_id: grupoSel.id, texto: textoEnvio })
      })
    } catch {}
    setEnviando(false)
  }

  const salvarFuncionario = async () => {
    if (!novoFunc.nome || !novoFunc.whatsapp) return
    try {
      const r = await fetch(`${API}/comunicacao/funcionarios`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novoFunc)
      })
      if (r.ok) { carregarFuncionarios(); setModalFuncionario(false); setNovoFunc({ nome: '', whatsapp: '', cargo: '', departamento: 'Contábil' }); setMsg('✅ Funcionário adicionado!') }
    } catch {}
    setTimeout(() => setMsg(''), 3000)
  }

  const enviarAviso = async (tipo) => {
    const avisos = {
      reuniao: `🗓️ *REUNIÃO DE EQUIPE*\n\nOlá equipe!\nLembramos que temos reunião hoje às 09:00h.\nPor favor, confirmem presença.\n\n*EPimentel Contabilidade*`,
      prazo: `⚠️ *ALERTA DE PRAZO*\n\nAtenção equipe!\nTemos obrigações com vencimento nos próximos dias.\nVerifiquem suas tarefas no sistema.\n\n*EPimentel Contabilidade*`,
      informativo: `📢 *COMUNICADO*\n\nOlá equipe!\nInformativo importante do escritório.\nFiquem atentos às atualizações.\n\n*EPimentel Contabilidade*`,
    }
    setTexto(avisos[tipo] || '')
  }

  const msgs = mensagens[grupoSel.id] || []
  const funcFiltrados = funcionarios.filter(f => f.nome?.toLowerCase().includes(busca.toLowerCase()) || f.departamento?.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1B2A4A', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={22} /> Comunicação Interna
        </h1>
        <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>Mensagens para equipe via WhatsApp Business</p>
      </div>

      {msg && <div style={{ padding: '10px 16px', background: '#f0fdf4', borderRadius: 8, fontSize: 13, marginBottom: 14, color: '#16a34a' }}>{msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 220px', gap: 16, height: 'calc(100vh - 200px)', minHeight: 500 }}>
        {/* Grupos */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, fontSize: 13, background: '#1B2A4A', color: '#C5A55A' }}>
            💬 Grupos
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {grupos.map(g => (
              <button key={g.id} onClick={() => selecionarGrupo(g)} style={{
                width: '100%', padding: '12px 16px', border: 'none', borderBottom: '1px solid #f1f5f9',
                background: grupoSel.id === g.id ? '#eff6ff' : '#fff',
                color: grupoSel.id === g.id ? '#1B2A4A' : '#475569',
                cursor: 'pointer', textAlign: 'left', fontSize: 13,
                fontWeight: grupoSel.id === g.id ? 600 : 400,
              }}>
                <div>{g.nome}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  {msgs.length > 0 && grupoSel.id === g.id ? `${msgs.length} mensagens` : 'Clique para abrir'}
                </div>
              </button>
            ))}
          </div>
          {/* Templates rápidos */}
          <div style={{ padding: 12, borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 8 }}>MENSAGENS RÁPIDAS</div>
            {[
              { tipo: 'reuniao', label: '🗓️ Convocar Reunião' },
              { tipo: 'prazo', label: '⚠️ Alerta de Prazo' },
              { tipo: 'informativo', label: '📢 Comunicado' },
            ].map(({ tipo, label }) => (
              <button key={tipo} onClick={() => enviarAviso(tipo)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 11, color: '#475569', marginBottom: 4, textAlign: 'left' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', background: '#1B2A4A', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#C5A55A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              {grupoSel.nome.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{grupoSel.nome}</div>
              <div style={{ fontSize: 11, opacity: .7 }}>WhatsApp Business — {funcionarios.length} membro(s)</div>
            </div>
          </div>

          {/* Mensagens */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#f5f5f0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {msgs.length === 0 && (
              <div style={{ textAlign: 'center', color: '#aaa', padding: 32, fontSize: 13 }}>
                Nenhuma mensagem ainda. Envie a primeira mensagem para o grupo!
              </div>
            )}
            {msgs.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: m.tipo === 'enviado' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '70%', background: m.tipo === 'enviado' ? '#1B2A4A' : '#fff', color: m.tipo === 'enviado' ? '#fff' : '#222', padding: '10px 14px', borderRadius: m.tipo === 'enviado' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', boxShadow: '0 1px 2px rgba(0,0,0,.1)', fontSize: 13, lineHeight: 1.5 }}>
                  {m.tipo !== 'enviado' && <div style={{ fontSize: 11, color: '#C5A55A', fontWeight: 600, marginBottom: 4 }}>{m.remetente}</div>}
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.texto}</div>
                  <div style={{ fontSize: 10, opacity: .6, textAlign: 'right', marginTop: 4 }}>
                    {new Date(m.hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={fimRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#fff' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea value={texto} onChange={e => setTexto(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
                placeholder={`Mensagem para ${grupoSel.nome}... (Enter para enviar)`} rows={2}
                style={{ flex: 1, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 13, resize: 'none', fontFamily: 'inherit', outline: 'none' }} />
              <button onClick={enviar} disabled={!texto.trim() || enviando} style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 9, padding: '0 16px', cursor: 'pointer', opacity: !texto.trim() ? .5 : 1 }}>
                {enviando ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Funcionários */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
            <span style={{ fontWeight: 600, color: '#1B2A4A', fontSize: 13 }}>👥 Equipe</span>
            <button onClick={() => setModalFuncionario(true)} style={{ background: '#1B2A4A', color: '#C5A55A', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
              <Plus size={14} />
            </button>
          </div>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: 6, padding: '5px 10px', gap: 6 }}>
              <Search size={13} color="#aaa" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." style={{ border: 'none', background: 'none', outline: 'none', fontSize: 12, flex: 1 }} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {funcFiltrados.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#aaa', fontSize: 12 }}>Nenhum funcionário. Clique em + para adicionar.</div>
            ) : funcFiltrados.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1B2A4A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C5A55A', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {f.nome?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1B2A4A' }}>{f.nome}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{f.cargo} · {f.departamento}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>

      {/* Modal funcionário */}
      {modalFuncionario && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 400, boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1B2A4A' }}>Adicionar Funcionário</div>
              <button onClick={() => setModalFuncionario(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={18} /></button>
            </div>
            {[
              { label: 'Nome *', field: 'nome', placeholder: 'Nome completo' },
              { label: 'WhatsApp *', field: 'whatsapp', placeholder: '(62) 9xxxx-xxxx' },
              { label: 'Cargo', field: 'cargo', placeholder: 'Ex: Auxiliar Contábil' },
            ].map(({ label, field, placeholder }) => (
              <div key={field} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>{label}</label>
                <input value={novoFunc[field]} onChange={e => setNovoFunc(f => ({ ...f, [field]: e.target.value }))} placeholder={placeholder}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Departamento</label>
              <select value={novoFunc.departamento} onChange={e => setNovoFunc(f => ({ ...f, departamento: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, background: '#fff' }}>
                {['Contábil', 'Fiscal', 'Pessoal', 'Societário', 'Administrativo'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalFuncionario(false)} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={salvarFuncionario} style={{ padding: '8px 16px', background: '#1B2A4A', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
