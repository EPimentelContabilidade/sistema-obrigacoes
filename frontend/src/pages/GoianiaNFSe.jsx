import { useState, useEffect } from 'react'
import { LogIn, Download, Search, FileText, RefreshCw, Loader, AlertCircle, CheckCircle, X, Eye, EyeOff } from 'lucide-react'
import ClienteSelector from '../components/ClienteSelector'

const API = window.location.hostname === 'localhost' ? '/api/v1' : 'https://api.epimentel.com.br/api/v1'

export default function GoianiaNFSe() {
  const [logado, setLogado] = useState(false)
  const [credenciais, setCredenciais] = useState({ usuario: '', senha: '', cnpj: '' })
  const [salvando, setSalvando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [cliente, setCliente] = useState(null)
  const [notas, setNotas] = useState([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [periodo, setPeriodo] = useState({ inicio: '', fim: '' })
  const [baixando, setBaixando] = useState(null)
  const [selecionadas, setSelecionadas] = useState([])

  useEffect(() => {
    // Verificar se já tem credenciais salvas
    fetch(`${API}/goiania-nfse/credenciais`)
      .then(r => r.json())
      .then(d => {
        if (d.configurado) {
          setCredenciais(c => ({ ...c, cnpj: d.cnpj, usuario: d.usuario }))
          setLogado(true)
        }
      }).catch(() => {})
  }, [])

  const mascaraCNPJ = v => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18)

  const salvarCredenciais = async () => {
    if (!credenciais.usuario || !credenciais.senha || !credenciais.cnpj) return setErro('Preencha todos os campos.')
    setSalvando(true); setErro('')
    try {
      const r = await fetch(`${API}/goiania-nfse/credenciais`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credenciais)
      })
      const d = await r.json()
      if (r.ok) { setLogado(true); setMsg('✅ Credenciais salvas e conectado!') }
      else setErro(d.detail || 'Erro ao salvar credenciais')
    } catch { setErro('Erro de conexão') }
    setSalvando(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const buscarNotas = async () => {
    setLoading(true); setErro(''); setNotas([])
    try {
      const params = new URLSearchParams({ inicio: periodo.inicio, fim: periodo.fim })
      const r = await fetch(`${API}/goiania-nfse/notas?${params}`)
      const d = await r.json()
      if (!r.ok) {
        if (r.status === 401) { setLogado(false); setErro('Sessão expirada. Faça login novamente.') }
        else setErro(d.detail || 'Erro ao buscar notas')
      } else setNotas(d)
    } catch (e) { setErro('Erro: ' + e.message) }
    setLoading(false)
  }

  const baixarNota = async (nota) => {
    setBaixando(nota.numero)
    try {
      const r = await fetch(`${API}/goiania-nfse/baixar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: nota.numero, formato: 'pdf' })
      })
      if (r.ok) {
        const blob = await r.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `NFS-e_Goiania_${nota.numero}.pdf`; a.click()
        URL.revokeObjectURL(url)
      } else {
        const d = await r.json(); setErro(d.detail || 'Erro ao baixar')
      }
    } catch (e) { setErro('Erro: ' + e.message) }
    setBaixando(null)
  }

  const baixarSelecionadas = async () => {
    for (const num of selecionadas) {
      const nota = notas.find(n => n.numero === num)
      if (nota) await baixarNota(nota)
    }
  }

  const toggleSel = num => setSelecionadas(s => s.includes(num) ? s.filter(n => n !== num) : [...s, num])

  const totalISS = notas.reduce((t, n) => t + (n.iss || 0), 0)
  const totalServicos = notas.reduce((t, n) => t + (n.valor || 0), 0)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1B2A4A' }}>🏙️ NFS-e Goiânia</h1>
        <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>Portal ISS.net — Prefeitura de Goiânia</p>
      </div>

      {msg && <div style={{ padding: '10px 16px', background: '#f0fdf4', borderRadius: 8, fontSize: 13, marginBottom: 14, color: '#16a34a' }}>{msg}</div>}

      {/* Login */}
      {!logado ? (
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏙️</div>
              <div style={{ fontWeight: 700, fontSize: 20, color: '#1B2A4A' }}>Portal ISS.net</div>
              <div style={{ color: '#888', fontSize: 13, marginTop: 6 }}>Prefeitura de Goiânia — NFS-e</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>CNPJ da Empresa</label>
              <input value={credenciais.cnpj} onChange={e => setCredenciais(c => ({ ...c, cnpj: mascaraCNPJ(e.target.value) }))}
                placeholder="00.000.000/0001-00"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'monospace', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Usuário / CPF</label>
              <input value={credenciais.usuario} onChange={e => setCredenciais(c => ({ ...c, usuario: e.target.value }))}
                placeholder="CPF ou usuário do portal"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 24, position: 'relative' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Senha</label>
              <input type={mostrarSenha ? 'text' : 'password'} value={credenciais.senha} onChange={e => setCredenciais(c => ({ ...c, senha: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && salvarCredenciais()}
                placeholder="Senha do portal ISS.net"
                style={{ width: '100%', padding: '10px 40px 10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              <button onClick={() => setMostrarSenha(s => !s)} style={{ position: 'absolute', right: 12, top: 30, background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 0 }}>
                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {erro && <div style={{ padding: '10px 14px', background: '#fef2f2', borderRadius: 7, color: '#dc2626', fontSize: 13, marginBottom: 16, display: 'flex', gap: 6 }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {erro}
            </div>}

            <button onClick={salvarCredenciais} disabled={salvando} style={{
              width: '100%', padding: '12px', background: '#1B2A4A', color: '#C5A55A', border: 'none',
              borderRadius: 9, cursor: salvando ? 'default' : 'pointer', fontSize: 15, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: salvando ? .7 : 1,
            }}>
              {salvando ? <><Loader size={17} style={{ animation: 'spin 1s linear infinite' }} /> Conectando...</> : <><LogIn size={17} /> Entrar</>}
            </button>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>

            <div style={{ marginTop: 16, padding: '12px', background: '#f0f9ff', borderRadius: 8, fontSize: 12, color: '#0369a1' }}>
              🔒 Suas credenciais ficam salvas localmente com criptografia e são usadas apenas para consulta ao portal da Prefeitura de Goiânia.
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Header logado */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle size={18} color="#22c55e" />
              <div>
                <div style={{ fontWeight: 600, color: '#1B2A4A', fontSize: 14 }}>Conectado ao Portal ISS.net</div>
                <div style={{ fontSize: 12, color: '#888' }}>{credenciais.cnpj} · {credenciais.usuario}</div>
              </div>
            </div>
            <button onClick={() => setLogado(false)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 12, color: '#64748b' }}>
              <X size={13} /> Sair
            </button>
          </div>

          {/* Filtros */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 220 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Cliente</label>
                <ClienteSelector value={cliente} onChange={setCliente} placeholder="Selecione o cliente..." />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Data Início</label>
                <input type="date" value={periodo.inicio} onChange={e => setPeriodo(p => ({ ...p, inicio: e.target.value }))}
                  style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Data Fim</label>
                <input type="date" value={periodo.fim} onChange={e => setPeriodo(p => ({ ...p, fim: e.target.value }))}
                  style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13 }} />
              </div>
              <button onClick={buscarNotas} disabled={loading} style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px',
                background: '#1B2A4A', color: '#C5A55A', border: 'none', borderRadius: 8,
                cursor: loading ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, opacity: loading ? .7 : 1,
              }}>
                {loading ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={15} />}
                {loading ? 'Buscando...' : 'Buscar NFS-e'}
              </button>
              {selecionadas.length > 0 && (
                <button onClick={baixarSelecionadas} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                  <Download size={14} /> Baixar {selecionadas.length} selecionada(s)
                </button>
              )}
            </div>
          </div>

          {erro && <div style={{ padding: '10px 16px', background: '#fef2f2', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 14, display: 'flex', gap: 6 }}>
            <AlertCircle size={15} /> {erro}
          </div>}

          {/* Totalizadores */}
          {notas.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Notas encontradas', valor: notas.length, formato: 'numero', cor: '#1B2A4A' },
                { label: 'Total de Serviços', valor: totalServicos, formato: 'moeda', cor: '#22c55e' },
                { label: 'Total ISS Retido', valor: totalISS, formato: 'moeda', cor: '#f59e0b' },
              ].map(({ label, valor, formato, cor }) => (
                <div key={label} style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,.08)', borderLeft: `3px solid ${cor}` }}>
                  <div style={{ fontSize: 12, color: '#888' }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: cor, marginTop: 4 }}>
                    {formato === 'moeda' ? `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : valor}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tabela */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '11px 12px', textAlign: 'center', width: 36 }}>
                    <input type="checkbox" onChange={e => setSelecionadas(e.target.checked ? notas.map(n => n.numero) : [])} />
                  </th>
                  {['Número', 'Data', 'Tomador', 'CNPJ Tomador', 'Valor Serv.', 'ISS', 'Situação', 'Ações'].map(h => (
                    <th key={h} style={{ padding: '11px 12px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {notas.length === 0 && !loading ? (
                  <tr><td colSpan={9} style={{ padding: 48, textAlign: 'center', color: '#aaa' }}>
                    <FileText size={36} style={{ margin: '0 auto 12px', display: 'block', color: '#e2e8f0' }} />
                    Selecione o período e clique em "Buscar NFS-e"
                  </td></tr>
                ) : notas.map(n => (
                  <tr key={n.numero} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <input type="checkbox" checked={selecionadas.includes(n.numero)} onChange={() => toggleSel(n.numero)} />
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#1B2A4A' }}>{n.numero}</td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>{n.data_emissao}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 500, color: '#334155', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.tomador}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{n.cnpj_tomador}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#22c55e' }}>R$ {n.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '10px 12px', color: '#f59e0b' }}>R$ {n.iss?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: n.situacao === 'normal' ? '#f0fdf4' : '#fef2f2', color: n.situacao === 'normal' ? '#16a34a' : '#dc2626', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
                        {n.situacao === 'normal' ? '✓ Normal' : '✗ ' + n.situacao}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => baixarNota(n)} disabled={baixando === n.numero}
                          style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '5px 9px', border: 'none', background: '#16a34a', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>
                          {baixando === n.numero ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={11} />} PDF
                        </button>
                        <button style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '5px 9px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>
                          <Download size={11} /> XML
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
