import { useState, useEffect } from 'react'
import { getEntregas, createEntrega, reenviar, getClientes, getObrigacoes } from '../api'
import { Plus, X, Send, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'

const STATUS_COLOR = { enviado: '#22c55e', erro: '#ef4444', pendente: '#f59e0b', confirmado: '#3b82f6' }
const STATUS_ICON = { enviado: CheckCircle, erro: XCircle, pendente: Clock }
const empty = { cliente_id: '', obrigacao_id: '', canal: 'ambos', usar_ia: true, mensagem_customizada: '' }

export default function Entregas() {
  const [entregas, setEntregas] = useState([])
  const [clientes, setClientes] = useState([])
  const [obrigacoes, setObrigacoes] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const carregar = () => getEntregas().then(r => setEntregas(r.data)).finally(() => setLoading(false))

  useEffect(() => {
    Promise.all([getClientes(), carregar()])
      .then(([c]) => setClientes(c.data))
  }, [])

  useEffect(() => {
    if (form.cliente_id) {
      getObrigacoes({ cliente_id: form.cliente_id }).then(r => setObrigacoes(r.data))
    } else {
      setObrigacoes([])
    }
  }, [form.cliente_id])

  const enviar = async () => {
    if (!form.cliente_id || !form.canal) return alert('Preencha cliente e canal.')
    setEnviando(true)
    try {
      const data = {
        ...form,
        cliente_id: Number(form.cliente_id),
        obrigacao_id: form.obrigacao_id ? Number(form.obrigacao_id) : null,
      }
      await createEntrega(data)
      setModal(false); carregar()
    } catch (e) {
      alert('Erro: ' + (e.response?.data?.detail || e.message))
    } finally { setEnviando(false) }
  }

  const tentarReenviar = async (id) => {
    await reenviar(id); carregar()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1B2A4A' }}>Entregas</h1>
          <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>Histórico de envios via WhatsApp e E-mail</p>
        </div>
        <button onClick={() => { setForm(empty); setModal(true) }} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#1B2A4A', color: '#fff', border: 'none',
          padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500,
        }}>
          <Send size={16} /> Nova Entrega
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 32, color: '#aaa', textAlign: 'center' }}>Carregando...</div> :
          entregas.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#aaa', fontSize: 14 }}>
              Nenhuma entrega realizada ainda. Clique em "Nova Entrega" para enviar.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['#', 'Cliente', 'Canal', 'Status', 'Tentativas', 'Data', 'Ações'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#888', fontWeight: 500, fontSize: 13 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entregas.map(e => {
                  const Icon = STATUS_ICON[e.status] || Clock
                  return (
                    <tr key={e.id} style={{ borderTop: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '12px 16px', color: '#aaa' }}>{e.id}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1B2A4A' }}>
                        {clientes.find(c => c.id === e.cliente_id)?.nome || e.cliente_id}
                      </td>
                      <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#555' }}>{e.canal}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                          background: (STATUS_COLOR[e.status] || '#aaa') + '20',
                          color: STATUS_COLOR[e.status] || '#aaa',
                        }}>
                          <Icon size={12} /> {e.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#555', textAlign: 'center' }}>{e.tentativas ?? 0}</td>
                      <td style={{ padding: '12px 16px', color: '#888', fontSize: 13 }}>
                        {e.criado_em ? new Date(e.criado_em).toLocaleString('pt-BR') : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {e.status === 'erro' && (
                          <button onClick={() => tentarReenviar(e.id)} title="Reenviar"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f59e0b' }}>
                            <RefreshCw size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1B2A4A' }}>Nova Entrega</h2>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#555', display: 'block', marginBottom: 5 }}>Cliente *</label>
              <select value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value, obrigacao_id: '' }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fff' }}>
                <option value="">Selecione...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            {obrigacoes.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#555', display: 'block', marginBottom: 5 }}>Obrigação (opcional)</label>
                <select value={form.obrigacao_id} onChange={e => setForm(f => ({ ...f, obrigacao_id: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fff' }}>
                  <option value="">Mensagem geral</option>
                  {obrigacoes.map(o => <option key={o.id} value={o.id}>ID {o.id} — Comp. {o.competencia} — {o.status}</option>)}
                </select>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#555', display: 'block', marginBottom: 5 }}>Canal de Envio *</label>
              <select value={form.canal} onChange={e => setForm(f => ({ ...f, canal: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fff' }}>
                {['ambos', 'whatsapp', 'email'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" id="ia" checked={form.usar_ia} onChange={e => setForm(f => ({ ...f, usar_ia: e.target.checked }))} />
              <label htmlFor="ia" style={{ fontSize: 14, color: '#555', cursor: 'pointer' }}>
                Gerar mensagem automaticamente com IA (Claude)
              </label>
            </div>

            {!form.usar_ia && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#555', display: 'block', marginBottom: 5 }}>Mensagem Personalizada</label>
                <textarea value={form.mensagem_customizada} onChange={e => setForm(f => ({ ...f, mensagem_customizada: e.target.value }))}
                  rows={5} placeholder="Digite a mensagem que será enviada ao cliente..."
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            )}

            {form.usar_ia && (
              <div style={{ background: '#1B2A4A10', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#555' }}>
                💡 A IA vai gerar uma mensagem personalizada com base nos dados do cliente e da obrigação selecionada.
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setModal(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
              <button onClick={enviar} disabled={enviando} style={{
                padding: '9px 20px', borderRadius: 8, border: 'none',
                background: '#1B2A4A', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 6, opacity: enviando ? .7 : 1,
              }}>
                <Send size={15} /> {enviando ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
