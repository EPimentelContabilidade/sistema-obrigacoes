import { useState } from 'react'
import { Search, RefreshCw, DollarSign, AlertCircle, Calendar, Download, Loader, FileText } from 'lucide-react'
import ClienteSelector from '../components/ClienteSelector'

const API = '/api/v1'

const ORGAOS = [
  { id: 'receita', label: 'Receita Federal', icon: '🏛️', desc: 'DARF, GPS, SIMPLES Nacional' },
  { id: 'pgfn', label: 'PGFN', icon: '⚖️', desc: 'Procuradoria Geral da Fazenda Nacional' },
  { id: 'simples', label: 'Simples Nacional', icon: '📋', desc: 'Parcelamentos do Simples' },
]

const STATUS_COLOR = {
  ativo: '#22c55e', em_atraso: '#ef4444', quitado: '#3b82f6',
  cancelado: '#94a3b8', suspenso: '#f59e0b'
}

export default function Parcelamentos() {
  const [orgao, setOrgao] = useState(ORGAOS[0])
  const [cliente, setCliente] = useState(null)
  const [cnpj, setCnpj] = useState('')
  const [cpf, setCpf] = useState('')
  const [parcelamentos, setParcelamentos] = useState([])
  const [detalhe, setDetalhe] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [parcelas, setParcelas] = useState([])

  const mascaraCNPJ = (v) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18)
  const mascaraCPF = (v) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').slice(0, 14)

  const aoSelecionarCliente = (c) => {
    setCliente(c)
    if (c) setCnpj(c.cnpj)
    else setCnpj('')
  }

  const consultar = async () => {
    if (!cnpj && !cpf) return setErro('Informe o CNPJ ou CPF do contribuinte.')
    setLoading(true); setErro(''); setParcelamentos([]); setDetalhe(null)
    try {
      const params = new URLSearchParams({ orgao: orgao.id, cnpj: cnpj.replace(/\D/g, ''), cpf: cpf.replace(/\D/g, '') })
      const r = await fetch(`${API}/parcelamentos/consultar?${params}`)
      const text = await r.text()
      if (!text) { setErro('Sem resposta do servidor. Verifique se o backend está rodando.'); setLoading(false); return }
      const data = JSON.parse(text)
      if (!r.ok) setErro(data.detail || 'Erro na consulta')
      else setParcelamentos(Array.isArray(data) ? data : [])
    } catch (e) { setErro('Erro de conexão. Verifique se o backend está rodando na porta 8000.') }
    setLoading(false)
  }

  const verDetalhe = async (parc) => {
    setDetalhe(parc)
    setLoading(true)
    try {
      const r = await fetch(`${API}/parcelamentos/parcelas?orgao=${orgao.id}&numero=${parc.numero}`)
      if (r.ok) setParcelas(await r.json())
    } catch {}
    setLoading(false)
  }

  const emitirDarf = async (parcela) => {
    try {
      const r = await fetch(`${API}/parcelamentos/emitir-darf`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgao: orgao.id, numero_parcelamento: detalhe.numero, parcela: parcela.numero })
      })
      if (r.ok) {
        const blob = await r.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `DARF_Parcela_${parcela.numero}.pdf`; a.click()
      } else {
        const d = await r.json()
        setErro(d.detail || 'Erro ao emitir DARF')
      }
    } catch (e) { setErro('Erro: ' + e.message) }
  }

  const totalDevido = parcelamentos.reduce((s, p) => s + (p.saldo_devedor || 0), 0)
  const totalParcelas = parcelamentos.reduce((s, p) => s + (p.parcelas_restantes || 0), 0)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1B2A4A' }}>💰 Parcelamentos Fiscais</h1>
        <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>Consulte parcelamentos na Receita Federal e PGFN</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
        {/* Painel esquerdo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Órgão */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ fontWeight: 600, color: '#1B2A4A', fontSize: 13, marginBottom: 12 }}>Órgão</div>
            {ORGAOS.map(o => (
              <button key={o.id} onClick={() => setOrgao(o)} style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid',
                borderColor: orgao.id === o.id ? '#C5A55A' : '#e2e8f0',
                background: orgao.id === o.id ? '#1B2A4A' : '#fff',
                color: orgao.id === o.id ? '#C5A55A' : '#475569',
                cursor: 'pointer', textAlign: 'left', fontSize: 13, marginBottom: 6,
              }}>
                <span style={{ marginRight: 6 }}>{o.icon}</span>
                <strong>{o.label}</strong>
                <div style={{ fontSize: 11, opacity: .7, marginTop: 2 }}>{o.desc}</div>
              </button>
            ))}
          </div>

          {/* Busca */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ fontWeight: 600, color: '#1B2A4A', fontSize: 13, marginBottom: 12 }}>Contribuinte</div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Cliente</label>
            <div style={{ marginBottom: 10 }}>
              <ClienteSelector value={cliente} onChange={aoSelecionarCliente} placeholder="Selecione o cliente..." />
            </div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>CNPJ</label>
            <input value={cnpj} onChange={e => setCnpj(mascaraCNPJ(e.target.value))} placeholder="00.000.000/0001-00"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }} />
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>CPF (sócio/responsável)</label>
            <input value={cpf} onChange={e => setCpf(mascaraCPF(e.target.value))} placeholder="000.000.000-00"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, marginBottom: 14, boxSizing: 'border-box' }} />
            <button onClick={consultar} disabled={loading} style={{
              width: '100%', padding: '10px', background: '#C5A55A', color: '#fff', border: 'none',
              borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? .7 : 1,
            }}>
              {loading ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Consultando...</> : <><Search size={14} /> Consultar</>}
            </button>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>

          {/* Totalizadores */}
          {parcelamentos.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
              <div style={{ fontWeight: 600, color: '#1B2A4A', fontSize: 13, marginBottom: 12 }}>Resumo</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#888' }}>Total de Parcelamentos</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1B2A4A' }}>{parcelamentos.length}</div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#888' }}>Saldo Total Devedor</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>R$ {totalDevido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#888' }}>Parcelas Restantes</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{totalParcelas}</div>
              </div>
            </div>
          )}
        </div>

        {/* Conteúdo principal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Lista de parcelamentos */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, color: '#1B2A4A', fontSize: 14 }}>
              Parcelamentos Encontrados
            </div>
            {erro && (
              <div style={{ margin: 16, padding: '12px 16px', background: '#fef2f2', borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', gap: 8 }}>
                <AlertCircle size={16} /> {erro}
              </div>
            )}
            {parcelamentos.length === 0 && !loading && (
              <div style={{ padding: 48, textAlign: 'center', color: '#cbd5e1', fontSize: 14 }}>
                <DollarSign size={40} style={{ margin: '0 auto 12px', display: 'block' }} />
                Informe o CNPJ e clique em Consultar
              </div>
            )}
            {parcelamentos.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Número', 'Tipo', 'Programa', 'Parcelas Rest.', 'Próx. Vencimento', 'Saldo Devedor', 'Status', 'Ações'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parcelamentos.map(p => (
                    <tr key={p.numero} style={{ borderTop: '1px solid #f1f5f9', background: detalhe?.numero === p.numero ? '#eff6ff' : 'transparent' }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#1B2A4A' }}>{p.numero}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{p.tipo}</td>
                      <td style={{ padding: '10px 12px', color: '#334155' }}>{p.programa}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: p.parcelas_restantes > 0 ? '#f59e0b' : '#22c55e' }}>{p.parcelas_restantes}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{p.proximo_vencimento}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#ef4444' }}>R$ {p.saldo_devedor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: (STATUS_COLOR[p.status] || '#94a3b8') + '20', color: STATUS_COLOR[p.status] || '#94a3b8', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
                          {p.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <button onClick={() => verDetalhe(p)} style={{ padding: '5px 10px', border: '1px solid #1B2A4A', borderRadius: 6, background: detalhe?.numero === p.numero ? '#1B2A4A' : '#fff', color: detalhe?.numero === p.numero ? '#fff' : '#1B2A4A', cursor: 'pointer', fontSize: 11 }}>
                          Ver parcelas
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Detalhe de parcelas */}
          {detalhe && (
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#1B2A4A', fontSize: 14 }}>Parcelas — Processo {detalhe.numero}</span>
              </div>
              {loading ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Carregando parcelas...</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Nº', 'Vencimento', 'Principal', 'Multa', 'Juros', 'Total', 'Situação', 'DARF'].map(h => (
                        <th key={h} style={{ padding: '9px 12px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parcelas.map(p => (
                      <tr key={p.numero} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: '#1B2A4A' }}>{p.numero}ª</td>
                        <td style={{ padding: '9px 12px', color: '#64748b' }}>{p.vencimento}</td>
                        <td style={{ padding: '9px 12px' }}>R$ {p.principal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '9px 12px', color: '#ef4444' }}>R$ {p.multa?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '9px 12px', color: '#f59e0b' }}>R$ {p.juros?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '9px 12px', fontWeight: 700 }}>R$ {p.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ background: (STATUS_COLOR[p.situacao] || '#94a3b8') + '20', color: STATUS_COLOR[p.situacao] || '#94a3b8', padding: '2px 7px', borderRadius: 20, fontSize: 11 }}>
                            {p.situacao}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          {p.situacao !== 'paga' && (
                            <button onClick={() => emitirDarf(p)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', border: '1px solid #16a34a', borderRadius: 6, background: '#fff', color: '#16a34a', cursor: 'pointer', fontSize: 11 }}>
                              <Download size={11} /> DARF
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16, background: '#f0f9ff', borderRadius: 10, padding: '12px 16px', border: '1px solid #bae6fd', fontSize: 13, color: '#0369a1' }}>
        ℹ️ Esta consulta requer <strong>certificado digital A1</strong> e acesso ao <strong>e-CAC</strong>. Em ambiente de teste, os dados são simulados. Configure <code style={{ background: '#e0f2fe', padding: '1px 4px', borderRadius: 3 }}>RECEITA_CERT_PATH</code> no .env para acesso real.
      </div>
    </div>
  )
}
