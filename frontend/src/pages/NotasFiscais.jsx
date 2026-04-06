import { useState } from 'react'
import { Search, Download, FileText, AlertCircle, CheckCircle, Loader, Eye } from 'lucide-react'
import ClienteSelector from '../components/ClienteSelector'

const API = '/api/v1'

const PORTAIS = [
  { id: 'sefaz_nfe', label: 'NF-e SEFAZ Nacional', tipo: 'nfe', desc: 'Nota Fiscal Eletrônica - Receita Federal' },
  { id: 'portal_nfse', label: 'NFS-e Portal Nacional', tipo: 'nfse', desc: 'Nota Fiscal de Serviços - Portal Nacional' },
  { id: 'goiania_nfse', label: 'NFS-e Goiânia', tipo: 'nfse_goiania', desc: 'Prefeitura de Goiânia - ISS.net' },
  { id: 'sefaz_go', label: 'NF-e SEFAZ-GO', tipo: 'nfe_go', desc: 'Secretaria da Fazenda de Goiás' },
]

const STATUS_COLOR = { autorizada: '#22c55e', cancelada: '#ef4444', denegada: '#f59e0b', pendente: '#3b82f6' }

export default function NotasFiscais() {
  const [portal, setPortal] = useState(PORTAIS[0])
  const [cliente, setCliente] = useState(null)
  const [cnpj, setCnpj] = useState('')
  const [chave, setChave] = useState('')
  const [periodo, setPeriodo] = useState({ inicio: '', fim: '' })
  const [notas, setNotas] = useState([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [baixando, setBaixando] = useState(null)
  const [selecionadas, setSelecionadas] = useState([])

  const aoSelecionarCliente = (c) => {
    setCliente(c)
    if (c) setCnpj(c.cnpj)
    else setCnpj('')
  }

  const buscar = async () => {
    if (!cnpj && !chave) return setErro('Informe o CNPJ ou chave de acesso.')
    setLoading(true); setErro(''); setNotas([])
    try {
      const params = new URLSearchParams({ portal: portal.id, cnpj, chave, ...periodo })
      const r = await fetch(`${API}/notas/buscar?${params}`)
      const data = await r.json()
      if (!r.ok) setErro(data.detail || 'Erro na consulta')
      else setNotas(data)
    } catch (e) { setErro('Erro de conexão: ' + e.message) }
    setLoading(false)
  }

  const baixarNota = async (nota) => {
    setBaixando(nota.chave)
    try {
      const r = await fetch(`${API}/notas/baixar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portal: portal.id, chave: nota.chave, formato: 'pdf' })
      })
      if (r.ok) {
        const blob = await r.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `NF_${nota.numero}.pdf`; a.click()
        URL.revokeObjectURL(url)
      } else {
        const d = await r.json()
        setErro(d.detail || 'Erro ao baixar')
      }
    } catch (e) { setErro('Erro: ' + e.message) }
    setBaixando(null)
  }

  const baixarSelecionadas = async () => {
    for (const chaveNota of selecionadas) {
      const nota = notas.find(n => n.chave === chaveNota)
      if (nota) await baixarNota(nota)
    }
  }

  const toggleSelecao = (chaveNota) => {
    setSelecionadas(s => s.includes(chaveNota) ? s.filter(c => c !== chaveNota) : [...s, chaveNota])
  }

  const mascaraCNPJ = (v) => {
    return v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18)
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1B2A4A' }}>📄 Baixa de Notas Fiscais</h1>
        <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>Consulte e baixe NF-e e NFS-e dos portais fiscais</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Painel de busca */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Seleção de portal */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ fontWeight: 600, color: '#1B2A4A', fontSize: 13, marginBottom: 12 }}>Portal Fiscal</div>
            {PORTAIS.map(p => (
              <button key={p.id} onClick={() => setPortal(p)} style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid',
                borderColor: portal.id === p.id ? '#1B2A4A' : '#e2e8f0',
                background: portal.id === p.id ? '#1B2A4A' : '#fff',
                color: portal.id === p.id ? '#C5A55A' : '#475569',
                cursor: 'pointer', textAlign: 'left', fontSize: 13, marginBottom: 6,
                fontWeight: portal.id === p.id ? 600 : 400,
              }}>
                <div>{p.label}</div>
                <div style={{ fontSize: 11, opacity: .7, marginTop: 2 }}>{p.desc}</div>
              </button>
            ))}
          </div>

          {/* Filtros */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ fontWeight: 600, color: '#1B2A4A', fontSize: 13, marginBottom: 12 }}>Filtros de Busca</div>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Cliente</label>
            <div style={{ marginBottom: 12 }}>
              <ClienteSelector value={cliente} onChange={aoSelecionarCliente} placeholder="Selecione o cliente..." />
            </div>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>CNPJ do Emitente/Tomador</label>
            <input value={cnpj} onChange={e => setCnpj(mascaraCNPJ(e.target.value))} placeholder="00.000.000/0001-00"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }} />

            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Chave de Acesso (NF-e)</label>
            <input value={chave} onChange={e => setChave(e.target.value.replace(/\D/g, '').slice(0, 44))} placeholder="44 dígitos"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 11, marginBottom: 12, boxSizing: 'border-box', fontFamily: 'monospace' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Data Início</label>
                <input type="date" value={periodo.inicio} onChange={e => setPeriodo(p => ({ ...p, inicio: e.target.value }))}
                  style={{ width: '100%', padding: '7px 8px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Data Fim</label>
                <input type="date" value={periodo.fim} onChange={e => setPeriodo(p => ({ ...p, fim: e.target.value }))}
                  style={{ width: '100%', padding: '7px 8px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' }} />
              </div>
            </div>

            <button onClick={buscar} disabled={loading} style={{
              width: '100%', padding: '10px', background: '#1B2A4A', color: '#fff', border: 'none',
              borderRadius: 8, cursor: loading ? 'default' : 'pointer', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loading ? .7 : 1,
            }}>
              {loading ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Consultando...</> : <><Search size={15} /> Consultar</>}
            </button>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        </div>

        {/* Resultados */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#1B2A4A', fontSize: 14 }}>
              Notas Fiscais {notas.length > 0 && <span style={{ background: '#1B2A4A', color: '#C5A55A', borderRadius: 20, padding: '2px 8px', fontSize: 12, marginLeft: 8 }}>{notas.length}</span>}
            </span>
            {selecionadas.length > 0 && (
              <button onClick={baixarSelecionadas} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>
                <Download size={14} /> Baixar {selecionadas.length} selecionada(s)
              </button>
            )}
          </div>

          {erro && (
            <div style={{ margin: 16, padding: '12px 16px', background: '#fef2f2', borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {erro}
            </div>
          )}

          {notas.length === 0 && !loading && !erro && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', padding: 48 }}>
              <FileText size={48} style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 14 }}>Selecione um portal e informe o CNPJ ou chave de acesso</div>
            </div>
          )}

          {notas.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: 36 }}>
                      <input type="checkbox" onChange={e => setSelecionadas(e.target.checked ? notas.map(n => n.chave) : [])} />
                    </th>
                    {['Número', 'Data', 'Emitente', 'Destinatário', 'Valor', 'Status', 'Ações'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {notas.map((nota, i) => (
                    <tr key={nota.chave} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <input type="checkbox" checked={selecionadas.includes(nota.chave)} onChange={() => toggleSelecao(nota.chave)} />
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#1B2A4A', fontWeight: 500 }}>{nota.numero}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{nota.data_emissao}</td>
                      <td style={{ padding: '10px 12px', color: '#334155', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nota.emitente}</td>
                      <td style={{ padding: '10px 12px', color: '#334155', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nota.destinatario}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1B2A4A' }}>R$ {nota.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: (STATUS_COLOR[nota.status] || '#94a3b8') + '20', color: STATUS_COLOR[nota.status] || '#94a3b8', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
                          {nota.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => baixarNota(nota)} disabled={baixando === nota.chave}
                            title="Baixar PDF" style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#16a34a', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11 }}>
                            {baixando === nota.chave ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={12} />} PDF
                          </button>
                          <button title="Baixar XML" style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11 }}>
                            <Download size={12} /> XML
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Aviso certificado */}
      <div style={{ marginTop: 16, background: '#fffbeb', borderRadius: 10, padding: '12px 16px', border: '1px solid #fde68a', fontSize: 13, color: '#92400e' }}>
        ⚠️ <strong>Certificado Digital:</strong> A consulta ao SEFAZ em produção requer certificado digital A1 (.pfx). Configure em <code style={{ background: '#fef3c7', padding: '1px 4px', borderRadius: 3 }}>backend\.env</code>: <code style={{ background: '#fef3c7', padding: '1px 4px', borderRadius: 3 }}>SEFAZ_CERT_PATH</code> e <code style={{ background: '#fef3c7', padding: '1px 4px', borderRadius: 3 }}>SEFAZ_CERT_PASS</code>
      </div>
    </div>
  )
}
