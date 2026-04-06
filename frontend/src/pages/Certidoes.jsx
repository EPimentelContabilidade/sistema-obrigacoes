import { useState, useEffect } from 'react'
import { Search, Download, RefreshCw, CheckCircle, AlertCircle, Clock, Loader, Plus, X } from 'lucide-react'
import ClienteSelector from '../components/ClienteSelector'

const API = '/api/v1'

const TIPOS_CERTIDAO = [
  { id: 'cnd_federal', label: 'CND Federal', orgao: 'Receita Federal / PGFN', prazo: '180 dias', icon: '🏛️' },
  { id: 'cnd_fgts', label: 'CRF/FGTS', orgao: 'Caixa Econômica Federal', prazo: '30 dias', icon: '🏦' },
  { id: 'cnd_trabalhista', label: 'CNDT', orgao: 'Tribunal Superior do Trabalho', prazo: '180 dias', icon: '⚖️' },
  { id: 'cnd_estadual_go', label: 'CND Estadual - GO', orgao: 'SEFAZ Goiás', prazo: '60 dias', icon: '🏢' },
  { id: 'cnd_municipal_goiania', label: 'CND Municipal - Goiânia', orgao: 'Prefeitura de Goiânia', prazo: '90 dias', icon: '🏙️' },
  { id: 'cnd_simples', label: 'Regularidade Simples Nacional', orgao: 'Receita Federal', prazo: '60 dias', icon: '📋' },
]

const STATUS_COLOR = { valida: '#22c55e', vencida: '#ef4444', vencendo: '#f59e0b', pendente: '#3b82f6', erro: '#ef4444' }

export default function Certidoes() {
  const [clienteSel, setClienteSel] = useState(null)
  const [cnpj, setCnpj] = useState('')
  const [certidoes, setCertidoes] = useState([])
  const [loading, setLoading] = useState(false)
  const [baixando, setBaixando] = useState(null)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [tiposSel, setTiposSel] = useState(TIPOS_CERTIDAO.map(t => t.id))

  useEffect(() => { carregarHistorico() }, [])

  const carregarHistorico = async () => {
    try {
      const r = await fetch(`${API}/certidoes/historico`)
      if (r.ok) setCertidoes(await r.json())
    } catch {}
  }

  const mascaraCNPJ = v => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18)

  const aoSelecionarCliente = (c) => {
    setClienteSel(c)
    if (c) setCnpj(c.cnpj)
    else setCnpj('')
  }

  const buscarCertidoes = async () => {
    const cnpjLimpo = cnpj.replace(/\D/g, '')
    if (cnpjLimpo.length !== 14) return setErro('CNPJ inválido.')
    if (tiposSel.length === 0) return setErro('Selecione pelo menos uma certidão.')
    setLoading(true); setErro(''); setCertidoes([])

    try {
      const r = await fetch(`${API}/certidoes/consultar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: cnpjLimpo, tipos: tiposSel, cliente_id: clienteSel?.id || null })
      })
      const text = await r.text()
      if (!text) { setErro('Sem resposta do servidor.'); setLoading(false); return }
      let data
      try { data = JSON.parse(text) } catch { setErro('Resposta inválida do servidor: ' + text.slice(0, 100)); setLoading(false); return }
      if (!r.ok) setErro(data.detail || 'Erro na consulta')
      else setCertidoes(Array.isArray(data) ? data : [])
    } catch (e) { setErro('Erro de conexão. Verifique se o backend está rodando.') }
    setLoading(false)
  }

  const baixarCertidao = async (cert) => {
    setBaixando(cert.tipo)
    try {
      const r = await fetch(`${API}/certidoes/baixar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: cert.tipo, cnpj: cnpj.replace(/\D/g, '') })
      })
      if (r.ok) {
        const blob = await r.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `Certidao_${cert.tipo}_${cnpj.replace(/\D/g, '')}.pdf`; a.click()
        URL.revokeObjectURL(url)
        setMsg('✅ Certidão baixada!')
      } else {
        const d = await r.json()
        setErro(d.detail || 'Erro ao baixar')
      }
    } catch (e) { setErro('Erro: ' + e.message) }
    setBaixando(null)
    setTimeout(() => setMsg(''), 3000)
  }

  const baixarTodasValidas = async () => {
    for (const cert of certidoes.filter(c => c.status === 'valida')) {
      await baixarCertidao(cert)
    }
  }

  const enviarCliente = async (cert) => {
    if (!clienteSel) return setErro('Selecione um cliente primeiro.')
    try {
      const r = await fetch(`${API}/certidoes/enviar-cliente`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: cert.tipo, cliente_id: clienteSel, cnpj: cnpj.replace(/\D/g, '') })
      })
      const d = await r.json()
      setMsg(r.ok ? '✅ Certidão enviada ao cliente!' : '❌ ' + d.detail)
    } catch { setMsg('❌ Erro ao enviar') }
    setTimeout(() => setMsg(''), 3000)
  }

  const toggleTipo = (id) => setTiposSel(s => s.includes(id) ? s.filter(t => t !== id) : [...s, id])

  const validas = certidoes.filter(c => c.status === 'valida').length
  const vencidas = certidoes.filter(c => c.status === 'vencida').length

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1B2A4A' }}>📜 Baixa de Certidões</h1>
        <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>Consulte e baixe certidões negativas de múltiplos órgãos automaticamente</p>
      </div>

      {msg && <div style={{ padding: '10px 16px', background: msg.includes('✅') ? '#f0fdf4' : '#fef2f2', borderRadius: 8, fontSize: 13, marginBottom: 16, color: msg.includes('✅') ? '#16a34a' : '#dc2626' }}>{msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
        {/* Painel de configuração */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Cliente / CNPJ */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ fontWeight: 600, color: '#1B2A4A', fontSize: 13, marginBottom: 12 }}>Contribuinte</div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Cliente</label>
            <div style={{ marginBottom: 10 }}>
              <ClienteSelector value={clienteSel} onChange={aoSelecionarCliente} placeholder="Selecione o cliente..." />
            </div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>CNPJ *</label>
            <input value={cnpj} onChange={e => setCnpj(mascaraCNPJ(e.target.value))} placeholder="00.000.000/0001-00"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box' }} />
          </div>

          {/* Tipos de certidão */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 600, color: '#1B2A4A', fontSize: 13 }}>Certidões</div>
              <button onClick={() => setTiposSel(tiposSel.length === TIPOS_CERTIDAO.length ? [] : TIPOS_CERTIDAO.map(t => t.id))}
                style={{ fontSize: 11, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>
                {tiposSel.length === TIPOS_CERTIDAO.length ? 'Desmarcar todas' : 'Marcar todas'}
              </button>
            </div>
            {TIPOS_CERTIDAO.map(t => (
              <label key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #f8fafc', cursor: 'pointer' }}>
                <input type="checkbox" checked={tiposSel.includes(t.id)} onChange={() => toggleTipo(t.id)} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 500, color: '#334155', fontSize: 13 }}>{t.icon} {t.label}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.orgao} · Validade: {t.prazo}</div>
                </div>
              </label>
            ))}
          </div>

          {erro && <div style={{ padding: '10px 14px', background: '#fef2f2', borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', gap: 6 }}><AlertCircle size={14} /> {erro}</div>}

          <button onClick={buscarCertidoes} disabled={loading} style={{
            padding: '12px', background: loading ? '#94a3b8' : '#1B2A4A', color: '#fff', border: 'none',
            borderRadius: 9, cursor: loading ? 'default' : 'pointer', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Consultando...</> : <><Search size={16} /> Consultar Certidões</>}
          </button>
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>

        {/* Resultados */}
        <div>
          {certidoes.length > 0 && (
            <>
              {/* Resumo */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Válidas', valor: validas, cor: '#22c55e' },
                  { label: 'Vencidas/Irregular', valor: vencidas, cor: '#ef4444' },
                  { label: 'Total consultado', valor: certidoes.length, cor: '#3b82f6' },
                ].map(({ label, valor, cor }) => (
                  <div key={label} style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,.08)', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: cor }}>{valor}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Botão baixar todas */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <button onClick={baixarTodasValidas} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>
                  <Download size={14} /> Baixar todas válidas ({validas})
                </button>
                <button onClick={buscarCertidoes} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#475569' }}>
                  <RefreshCw size={13} /> Atualizar
                </button>
              </div>
            </>
          )}

          {/* Lista de certidões */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {certidoes.length === 0 && !loading && (
              <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', color: '#cbd5e1', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📜</div>
                <div style={{ fontSize: 14 }}>Selecione o CNPJ e as certidões desejadas</div>
              </div>
            )}
            {certidoes.map(cert => {
              const tipo = TIPOS_CERTIDAO.find(t => t.id === cert.tipo)
              const STATUS_LABEL = {
                valida: '✓ Válida', vencida: '✗ Irregular',
                vencendo: '⚠ Vencendo', pendente: '⏳ Portal', erro: '❌ Erro'
              }
              return (
                <div key={cert.tipo} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.08)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: 28, flexShrink: 0 }}>{tipo?.icon || '📄'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#1B2A4A', fontSize: 14 }}>{tipo?.label || cert.nome || cert.tipo}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{cert.orgao || tipo?.orgao}</div>
                    {cert.validade && <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2, fontWeight: 500 }}>Válida até: {cert.validade}</div>}
                    {cert.mensagem && <div style={{ fontSize: 12, color: cert.status === 'valida' ? '#16a34a' : cert.status === 'vencida' ? '#dc2626' : '#64748b', marginTop: 2 }}>{cert.mensagem}</div>}
                    {cert.url_portal && cert.status === 'pendente' && (
                      <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 4 }}>
                        🔗 <a href={cert.url_portal} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>{cert.url_portal}</a>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span style={{ background: (STATUS_COLOR[cert.status] || '#aaa') + '20', color: STATUS_COLOR[cert.status] || '#aaa', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                      {STATUS_LABEL[cert.status] || cert.status}
                    </span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {/* Botão PDF — quando conseguiu baixar direto */}
                      {cert.status === 'valida' && cert.tem_pdf && (
                        <button onClick={() => baixarCertidao(cert)} disabled={baixando === cert.tipo}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: 'none', background: '#16a34a', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>
                          {baixando === cert.tipo ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={11} />} Baixar PDF
                        </button>
                      )}
                      {/* Botão Abrir Portal — quando precisa de CAPTCHA ou login */}
                      {(cert.status === 'pendente' || (cert.status === 'valida' && !cert.tem_pdf)) && cert.url_portal && (
                        <button onClick={() => window.open(cert.url_portal, '_blank')}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: 'none', background: '#2563eb', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
                          🌐 Abrir Portal
                        </button>
                      )}
                      {/* Enviar ao cliente */}
                      {cert.status === 'valida' && (
                        <button onClick={() => enviarCliente(cert)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid #1B2A4A', background: '#fff', color: '#1B2A4A', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>
                          📤 Enviar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
