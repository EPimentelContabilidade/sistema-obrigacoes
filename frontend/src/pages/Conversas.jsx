import { useState, useEffect, useRef } from 'react'
import { getClientes } from '../api'
import { Send, Bot, User, Search, MessageCircle, Wifi, WifiOff } from 'lucide-react'

const API = '/api/v1'

// Busca histórico de mensagens do cliente
async function fetchMensagens(clienteId) {
  try {
    const r = await fetch(`${API}/conversas/${clienteId}`)
    if (!r.ok) return []
    return await r.json()
  } catch { return [] }
}

// Envia mensagem
async function enviarMensagem(clienteId, texto, usarIA) {
  try {
    const r = await fetch(`${API}/conversas/${clienteId}/mensagem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto, usar_ia: usarIA }),
    })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

const CORES_CANAL = { whatsapp: '#25D366', email: '#1B2A4A', sistema: '#C5A55A' }

export default function Conversas() {
  const [clientes, setClientes] = useState([])
  const [selecionado, setSelecionado] = useState(null)
  const [mensagens, setMensagens] = useState([])
  const [texto, setTexto] = useState('')
  const [usarIA, setUsarIA] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [busca, setBusca] = useState('')
  const [backendOk, setBackendOk] = useState(true)
  const fimRef = useRef(null)

  useEffect(() => {
    getClientes().then(r => setClientes(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selecionado) return
    fetchMensagens(selecionado.id).then(msgs => {
      if (Array.isArray(msgs)) {
        setMensagens(msgs)
        setBackendOk(true)
      } else {
        // Backend ainda sem rota de conversas — usar mock local
        setMensagens(mockMensagens(selecionado))
        setBackendOk(false)
      }
    })
  }, [selecionado])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  const mockMensagens = (cliente) => [
    { id: 1, origem: 'sistema', texto: `Conversa iniciada com ${cliente.nome}`, hora: new Date().toISOString() },
  ]

  const selecionar = (c) => {
    setSelecionado(c)
    setMensagens([])
    setTexto('')
  }

  const enviar = async () => {
    if (!texto.trim() || !selecionado || enviando) return
    const msgLocal = { id: Date.now(), origem: 'escritorio', texto, hora: new Date().toISOString(), canal: selecionado.canal_preferido }
    setMensagens(m => [...m, msgLocal])
    setTexto('')
    setEnviando(true)

    if (backendOk) {
      const resp = await enviarMensagem(selecionado.id, texto, usarIA)
      if (resp?.resposta_ia) {
        setMensagens(m => [...m, { id: Date.now() + 1, origem: 'ia', texto: resp.resposta_ia, hora: new Date().toISOString() }])
      }
    } else {
      // Simular resposta IA localmente
      if (usarIA) {
        setTimeout(() => {
          setMensagens(m => [...m, {
            id: Date.now() + 1,
            origem: 'ia',
            texto: `(Prévia IA) Mensagem para ${selecionado.nome} via ${selecionado.canal_preferido}: "${texto}" — Configure a rota /conversas no backend para envio real.`,
            hora: new Date().toISOString(),
          }])
        }, 800)
      }
    }
    setEnviando(false)
  }

  const filtrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.whatsapp || '').includes(busca)
  )

  const formatarHora = (iso) => {
    try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
    catch { return '' }
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', background: '#fff', borderRadius: 14, boxShadow: '0 1px 8px rgba(0,0,0,.1)', overflow: 'hidden' }}>

      {/* Sidebar - lista de clientes */}
      <div style={{ width: 300, borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
        {/* Header */}
        <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid #eee', background: '#1B2A4A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <MessageCircle size={20} color="#C5A55A" />
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>Conversas</span>
            <span style={{ marginLeft: 'auto', background: '#C5A55A', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 12 }}>
              {clientes.length}
            </span>
          </div>
          {/* Busca */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,.15)', borderRadius: 8, padding: '6px 10px', gap: 6 }}>
            <Search size={14} color="rgba(255,255,255,.6)" />
            <input
              value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar cliente..."
              style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13, flex: 1 }}
            />
          </div>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtrados.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 13 }}>
              {clientes.length === 0 ? 'Cadastre clientes primeiro.' : 'Nenhum cliente encontrado.'}
            </div>
          ) : filtrados.map(c => (
            <div key={c.id} onClick={() => selecionar(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0',
                background: selecionado?.id === c.id ? '#E8EDF5' : 'transparent',
                transition: 'background .15s',
              }}>
              {/* Avatar */}
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                background: '#1B2A4A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#C5A55A', fontWeight: 700, fontSize: 15, flexShrink: 0,
              }}>
                {c.nome.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1B2A4A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nome}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  <span style={{
                    background: CORES_CANAL[c.canal_preferido] + '20',
                    color: CORES_CANAL[c.canal_preferido] || '#888',
                    padding: '1px 6px', borderRadius: 8, fontSize: 11,
                  }}>{c.canal_preferido}</span>
                  {c.whatsapp && <span style={{ marginLeft: 6 }}>{c.whatsapp}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Área de conversa */}
      {!selecionado ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#bbb' }}>
          <MessageCircle size={56} color="#ddd" />
          <p style={{ marginTop: 16, fontSize: 15 }}>Selecione um cliente para ver a conversa</p>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header conversa */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 12, background: '#fff' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: '#1B2A4A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#C5A55A', fontWeight: 700, fontSize: 16,
            }}>
              {selecionado.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#1B2A4A', fontSize: 15 }}>{selecionado.nome}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{selecionado.cnpj} · {selecionado.regime}</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              {!backendOk && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#f59e0b', background: '#fef9ee', padding: '3px 10px', borderRadius: 20 }}>
                  <WifiOff size={12} /> Modo prévia
                </span>
              )}
              <span style={{ fontSize: 12, color: '#888' }}>
                {selecionado.whatsapp || selecionado.email || '—'}
              </span>
            </div>
          </div>

          {/* Mensagens */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#f5f5f0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mensagens.map(msg => {
              const isEscritorio = msg.origem === 'escritorio'
              const isIA = msg.origem === 'ia'
              const isSistema = msg.origem === 'sistema'

              if (isSistema) return (
                <div key={msg.id} style={{ textAlign: 'center' }}>
                  <span style={{ background: 'rgba(0,0,0,.08)', color: '#888', fontSize: 12, padding: '3px 12px', borderRadius: 20 }}>{msg.texto}</span>
                </div>
              )

              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isEscritorio ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
                  {!isEscritorio && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: isIA ? '#C5A55A' : '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isIA ? <Bot size={14} color="#fff" /> : <User size={14} color="#fff" />}
                    </div>
                  )}
                  <div style={{
                    maxWidth: '65%',
                    background: isEscritorio ? '#1B2A4A' : '#fff',
                    color: isEscritorio ? '#fff' : '#222',
                    padding: '9px 13px', borderRadius: isEscritorio ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    boxShadow: '0 1px 2px rgba(0,0,0,.1)',
                    fontSize: 14, lineHeight: 1.5,
                  }}>
                    {isIA && <div style={{ fontSize: 11, color: '#C5A55A', fontWeight: 600, marginBottom: 4 }}>✨ Gerado pela IA</div>}
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.texto}</div>
                    <div style={{ fontSize: 11, marginTop: 4, opacity: .6, textAlign: 'right' }}>{formatarHora(msg.hora)}</div>
                  </div>
                </div>
              )
            })}
            <div ref={fimRef} />
          </div>

          {/* Input de envio */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #eee', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555', cursor: 'pointer' }}>
                <input type="checkbox" checked={usarIA} onChange={e => setUsarIA(e.target.checked)} />
                <Bot size={14} color="#C5A55A" /> Usar IA para responder
              </label>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#aaa' }}>
                Enviando via: <strong>{selecionado.canal_preferido}</strong>
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
                placeholder={`Mensagem para ${selecionado.nome}... (Enter para enviar)`}
                rows={2}
                style={{
                  flex: 1, padding: '9px 13px', border: '1px solid #ddd', borderRadius: 10,
                  fontSize: 14, resize: 'none', fontFamily: 'inherit', outline: 'none',
                }}
              />
              <button onClick={enviar} disabled={!texto.trim() || enviando}
                style={{
                  background: '#1B2A4A', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '0 18px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: (!texto.trim() || enviando) ? .5 : 1, transition: 'opacity .15s',
                }}>
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
