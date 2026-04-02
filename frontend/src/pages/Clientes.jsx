import { useState, useEffect } from 'react'
import { getClientes, createCliente, updateCliente, deleteCliente } from '../api'
import { Plus, Pencil, Trash2, X, Save, WholeWord } from 'lucide-react'

const REGIMES = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'RET']
const CANAIS = ['ambos', 'whatsapp', 'email']

const emptyForm = { nome: '', cnpj: '', email: '', whatsapp: '', regime: 'Simples Nacional', canal_preferido: 'ambos', observacoes: '' }

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [modal, setModal] = useState(null) // null | 'novo' | cliente
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const carregar = () => getClientes().then(r => setClientes(r.data)).finally(() => setLoading(false))
  useEffect(() => { carregar() }, [])

  const abrirNovo = () => { setForm(emptyForm); setModal('novo') }
  const abrirEditar = (c) => { setForm({ ...c }); setModal(c) }

  const salvar = async () => {
    setSalvando(true)
    try {
      if (modal === 'novo') await createCliente(form)
      else await updateCliente(modal.id, form)
      setModal(null)
      carregar()
    } catch (e) {
      alert('Erro ao salvar: ' + (e.response?.data?.detail || e.message))
    } finally { setSalvando(false) }
  }

  const excluir = async (id) => {
    if (!confirm('Desativar este cliente?')) return
    await deleteCliente(id)
    carregar()
  }

  const inp = (label, field, type = 'text', opts) => (
    <div key={field} style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: '#555', display: 'block', marginBottom: 5 }}>{label}</label>
      {opts ? (
        <select value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fff' }}>
          {opts.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' }} />
      )}
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1B2A4A' }}>Clientes</h1>
          <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>{clientes.length} cliente(s) ativo(s)</p>
        </div>
        <button onClick={abrirNovo} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#1B2A4A', color: '#fff', border: 'none',
          padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500,
        }}>
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      {loading ? <div style={{ color: '#aaa' }}>Carregando...</div> : (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden' }}>
          {clientes.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#aaa', fontSize: 14 }}>
              Nenhum cliente cadastrado. Clique em "Novo Cliente" para começar.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Nome', 'CNPJ', 'E-mail', 'WhatsApp', 'Regime', 'Canal', 'Ações'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#888', fontWeight: 500, fontSize: 13 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.id} style={{ borderTop: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1B2A4A' }}>{c.nome}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#555' }}>{c.cnpj}</td>
                    <td style={{ padding: '12px 16px', color: '#555' }}>{c.email || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#555' }}>{c.whatsapp || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#555', fontSize: 13 }}>{c.regime}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#1B2A4A15', color: '#1B2A4A', padding: '2px 8px', borderRadius: 12, fontSize: 12, textTransform: 'capitalize' }}>
                        {c.canal_preferido}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => abrirEditar(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1B2A4A' }}><Pencil size={16} /></button>
                        <button onClick={() => excluir(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1B2A4A' }}>{modal === 'novo' ? 'Novo Cliente' : 'Editar Cliente'}</h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={20} /></button>
            </div>
            {inp('Nome / Razão Social *', 'nome')}
            {inp('CNPJ *', 'cnpj')}
            {inp('E-mail', 'email', 'email')}
            {inp('WhatsApp (com DDD)', 'whatsapp')}
            {inp('Regime Tributário', 'regime', 'text', REGIMES)}
            {inp('Canal Preferido', 'canal_preferido', 'text', CANAIS)}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#555', display: 'block', marginBottom: 5 }}>Observações</label>
              <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                rows={3} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setModal(null)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando} style={{
                padding: '9px 20px', borderRadius: 8, border: 'none',
                background: '#1B2A4A', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Save size={15} /> {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
