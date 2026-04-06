import { useState, useEffect } from 'react'
import { Plus, Send, Download, Eye, FileSignature, X, Save, CheckCircle, Clock, Loader } from 'lucide-react'

const API = '/api/v1'

const STATUS_COLOR = { rascunho: '#94a3b8', enviado: '#3b82f6', assinado: '#22c55e', recusado: '#ef4444', vencido: '#f59e0b' }
const TIPOS_CONTRATO = ['Prestação de Serviços Contábeis', 'Contrato de Honorários', 'Procuração', 'Contrato Social', 'Termo de Confidencialidade', 'Contrato Específico']

const emptyForm = { titulo: '', tipo: TIPOS_CONTRATO[0], cliente_id: '', valor_mensal: '', vigencia_inicio: '', vigencia_fim: '', servicos: '', observacoes: '', assinar_whatsapp: true, assinar_email: true }

export default function Contratos() {
  const [contratos, setContratos] = useState([])
  const [clientes, setClientes] = useState([])
  const [modal, setModal] = useState(null) // null | 'novo' | 'preview'
  const [form, setForm] = useState(emptyForm)
  const [contratoSel, setContratoSel] = useState(null)
  const [loading, setLoading] = useState(false)
  const [enviando, setEnviando] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    carregar()
    fetch(`${API}/clientes/`).then(r => r.json()).then(setClientes).catch(() => {})
  }, [])

  const carregar = async () => {
    try {
      const r = await fetch(`${API}/contratos/`)
      if (r.ok) setContratos(await r.json())
    } catch {}
  }

  const salvar = async () => {
    if (!form.titulo || !form.cliente_id) return setMsg('❌ Preencha título e cliente.')
    setLoading(true)
    try {
      const r = await fetch(`${API}/contratos/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, cliente_id: Number(form.cliente_id), valor_mensal: Number(form.valor_mensal) || 0 })
      })
      if (r.ok) { setModal(null); setForm(emptyForm); carregar(); setMsg('✅ Contrato criado!') }
      else { const d = await r.json(); setMsg('❌ ' + d.detail) }
    } catch { setMsg('❌ Erro de conexão') }
    setLoading(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const enviarAssinatura = async (contrato) => {
    setEnviando(contrato.id)
    try {
      const r = await fetch(`${API}/contratos/${contrato.id}/enviar`, { method: 'POST' })
      const d = await r.json()
      setMsg(r.ok ? '✅ Contrato enviado para assinatura!' : '❌ ' + d.detail)
      if (r.ok) carregar()
    } catch { setMsg('❌ Erro ao enviar') }
    setEnviando(null)
    setTimeout(() => setMsg(''), 4000)
  }

  const gerarPDF = async (contrato) => {
    try {
      const r = await fetch(`${API}/contratos/${contrato.id}/pdf`)
      if (r.ok) {
        const blob = await r.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `Contrato_${contrato.titulo.replace(/\s/g, '_')}.pdf`; a.click()
      }
    } catch {}
  }

  const assinaturasPendentes = contratos.filter(c => c.status === 'enviado').length
  const assinados = contratos.filter(c => c.status === 'assinado').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1B2A4A', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileSignature size={22} /> Contratos
          </h1>
          <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>Gestão de contratos com assinatura digital e envio automático</p>
        </div>
        <button onClick={() => { setModal('novo'); setForm(emptyForm) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#1B2A4A', color: '#C5A55A', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} /> Novo Contrato
        </button>
      </div>

      {msg && <div style={{ padding: '10px 16px', background: msg.includes('✅') ? '#f0fdf4' : '#fef2f2', borderRadius: 8, fontSize: 13, marginBottom: 16, color: msg.includes('✅') ? '#16a34a' : '#dc2626' }}>{msg}</div>}

      {/* Cards resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', valor: contratos.length, cor: '#1B2A4A' },
          { label: 'Aguardando Assinatura', valor: assinaturasPendentes, cor: '#3b82f6' },
          { label: 'Assinados', valor: assinados, cor: '#22c55e' },
          { label: 'Rascunhos', valor: contratos.filter(c => c.status === 'rascunho').length, cor: '#94a3b8' },
        ].map(({ label, valor, cor }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ fontSize: 11, color: '#888' }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: cor, marginTop: 4 }}>{valor}</div>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Título', 'Cliente', 'Tipo', 'Vigência', 'Valor/Mês', 'Status', 'Ações'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contratos.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#aaa' }}>Nenhum contrato cadastrado.</td></tr>
            ) : contratos.map(c => (
              <tr key={c.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '11px 14px', fontWeight: 600, color: '#1B2A4A' }}>{c.titulo}</td>
                <td style={{ padding: '11px 14px', color: '#475569' }}>{clientes.find(cl => cl.id === c.cliente_id)?.nome || '—'}</td>
                <td style={{ padding: '11px 14px', color: '#64748b', fontSize: 12 }}>{c.tipo}</td>
                <td style={{ padding: '11px 14px', color: '#64748b', fontSize: 12 }}>{c.vigencia_inicio ? `${new Date(c.vigencia_inicio).toLocaleDateString('pt-BR')} até ${new Date(c.vigencia_fim).toLocaleDateString('pt-BR')}` : '—'}</td>
                <td style={{ padding: '11px 14px', fontWeight: 600, color: '#22c55e' }}>{c.valor_mensal ? `R$ ${c.valor_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ background: (STATUS_COLOR[c.status] || '#aaa') + '20', color: STATUS_COLOR[c.status] || '#aaa', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                    {c.status === 'rascunho' ? '📝 Rascunho' : c.status === 'enviado' ? '⏳ Aguardando' : c.status === 'assinado' ? '✅ Assinado' : c.status}
                  </span>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => gerarPDF(c)} title="Baixar PDF" style={{ padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#475569', fontSize: 11 }}>
                      <Download size={12} />
                    </button>
                    {c.status === 'rascunho' && (
                      <button onClick={() => enviarAssinatura(c)} disabled={enviando === c.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: 'none', background: '#1B2A4A', color: '#C5A55A', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
                        {enviando === c.id ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={11} />} Enviar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>

      {/* Modal novo contrato */}
      {modal === 'novo' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1B2A4A' }}>📝 Novo Contrato</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={20} /></button>
            </div>

            {[
              { label: 'Título do Contrato *', field: 'titulo', placeholder: 'Ex: Contrato de Prestação de Serviços Contábeis' },
            ].map(({ label, field, placeholder }) => (
              <div key={field} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>{label}</label>
                <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} placeholder={placeholder}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Tipo *</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, background: '#fff' }}>
                  {TIPOS_CONTRATO.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Cliente *</label>
                <select value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, background: '#fff' }}>
                  <option value="">Selecione...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Valor Mensal (R$)</label>
                <input type="number" value={form.valor_mensal} onChange={e => setForm(f => ({ ...f, valor_mensal: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Início</label>
                <input type="date" value={form.vigencia_inicio} onChange={e => setForm(f => ({ ...f, vigencia_inicio: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Fim</label>
                <input type="date" value={form.vigencia_fim} onChange={e => setForm(f => ({ ...f, vigencia_fim: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Serviços incluídos</label>
              <textarea value={form.servicos} onChange={e => setForm(f => ({ ...f, servicos: e.target.value }))} rows={3}
                placeholder="Descreva os serviços contábeis incluídos no contrato..."
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <div style={{ fontWeight: 600, color: '#1B2A4A', fontSize: 12, marginBottom: 10 }}>📤 Envio após criação</div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={form.assinar_whatsapp} onChange={e => setForm(f => ({ ...f, assinar_whatsapp: e.target.checked }))} />
                Enviar link de assinatura via WhatsApp
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={form.assinar_email} onChange={e => setForm(f => ({ ...f, assinar_email: e.target.checked }))} />
                Enviar link de assinatura via E-mail
              </label>
            </div>

            {msg && <div style={{ padding: '8px 12px', background: msg.includes('✅') ? '#f0fdf4' : '#fef2f2', borderRadius: 7, fontSize: 13, marginBottom: 12, color: msg.includes('✅') ? '#16a34a' : '#dc2626' }}>{msg}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '9px 18px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={salvar} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: '#1B2A4A', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                <Save size={14} /> {loading ? 'Salvando...' : 'Criar Contrato'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
