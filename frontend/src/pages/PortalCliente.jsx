import { useState, useEffect } from 'react'
import { Search, User, FileText, DollarSign, CheckCircle, Clock, Download, AlertCircle, Loader } from 'lucide-react'

const API = '/api/v1'

export default function PortalCliente() {
  const [cnpj, setCnpj] = useState('')
  const [dadosReceita, setDadosReceita] = useState(null)
  const [cliente, setCliente] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingReceita, setLoadingReceita] = useState(false)
  const [erro, setErro] = useState('')
  const [aba, setAba] = useState('dados')

  const mascaraCNPJ = (v) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18)

  const buscarReceita = async () => {
    const cnpjLimpo = cnpj.replace(/\D/g, '')
    if (cnpjLimpo.length !== 14) return setErro('CNPJ inválido — deve ter 14 dígitos.')
    setLoadingReceita(true); setErro(''); setDadosReceita(null)
    try {
      const r = await fetch(`${API}/clientes/consultar-receita?cnpj=${cnpjLimpo}`)
      const data = await r.json()
      if (!r.ok) setErro(data.detail || 'Erro na consulta')
      else { setDadosReceita(data); buscarCliente(cnpjLimpo) }
    } catch (e) { setErro('Erro de conexão: ' + e.message) }
    setLoadingReceita(false)
  }

  const buscarCliente = async (cnpjLimpo) => {
    try {
      const r = await fetch(`${API}/clientes/por-cnpj?cnpj=${cnpjLimpo}`)
      if (r.ok) setCliente(await r.json())
    } catch {}
  }

  const ABAS = [
    { id: 'dados', label: '🏢 Dados da Empresa' },
    { id: 'documentos', label: '📄 Documentos' },
    { id: 'obrigacoes', label: '📋 Obrigações' },
    { id: 'financeiro', label: '💰 Financeiro' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1B2A4A' }}>👤 Portal do Cliente</h1>
        <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>Acesso centralizado com consulta automática na Receita Federal</p>
      </div>

      {/* Busca por CNPJ */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 20 }}>
        <div style={{ fontWeight: 600, color: '#1B2A4A', marginBottom: 14, fontSize: 14 }}>🔍 Busca por CNPJ — Receita Federal</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={cnpj} onChange={e => setCnpj(mascaraCNPJ(e.target.value))}
            placeholder="00.000.000/0001-00" onKeyDown={e => e.key === 'Enter' && buscarReceita()}
            style={{ flex: 1, padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'monospace' }} />
          <button onClick={buscarReceita} disabled={loadingReceita} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px',
            background: '#1B2A4A', color: '#C5A55A', border: 'none', borderRadius: 8,
            cursor: loadingReceita ? 'default' : 'pointer', fontSize: 14, fontWeight: 600,
            opacity: loadingReceita ? .7 : 1,
          }}>
            {loadingReceita ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
            {loadingReceita ? 'Consultando...' : 'Consultar'}
          </button>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        {erro && <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef2f2', borderRadius: 7, color: '#dc2626', fontSize: 13, display: 'flex', gap: 6 }}><AlertCircle size={15} /> {erro}</div>}
        <div style={{ marginTop: 10, fontSize: 12, color: '#aaa' }}>
          Os dados são obtidos diretamente da API pública da Receita Federal (receitaws.com.br)
        </div>
      </div>

      {dadosReceita && (
        <>
          {/* Abas */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
            {ABAS.map(({ id, label }) => (
              <button key={id} onClick={() => setAba(id)} style={{
                flex: 1, padding: '9px 12px', borderRadius: 8, border: 'none',
                background: aba === id ? '#fff' : 'transparent',
                color: aba === id ? '#1B2A4A' : '#888',
                cursor: 'pointer', fontSize: 12, fontWeight: aba === id ? 600 : 400,
                boxShadow: aba === id ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
              }}>{label}</button>
            ))}
          </div>

          {/* Dados da Empresa */}
          {aba === 'dados' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
                <div style={{ fontWeight: 700, color: '#1B2A4A', marginBottom: 16, fontSize: 15 }}>📋 Dados Cadastrais</div>
                {[
                  ['Razão Social', dadosReceita.nome],
                  ['Nome Fantasia', dadosReceita.fantasia || '—'],
                  ['CNPJ', dadosReceita.cnpj],
                  ['Abertura', dadosReceita.abertura],
                  ['Situação', dadosReceita.situacao],
                  ['Atividade Principal', dadosReceita.atividade_principal?.[0]?.text],
                  ['Natureza Jurídica', dadosReceita.natureza_juridica],
                  ['Capital Social', dadosReceita.capital_social ? `R$ ${Number(dadosReceita.capital_social).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'],
                ].map(([k, v]) => v && (
                  <div key={k} style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', paddingBottom: 8, marginBottom: 8 }}>
                    <span style={{ color: '#888', fontSize: 12, width: 150, flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: 13, color: '#1B2A4A', fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
                <div style={{ fontWeight: 700, color: '#1B2A4A', marginBottom: 16, fontSize: 15 }}>📍 Endereço e Contato</div>
                {[
                  ['Logradouro', `${dadosReceita.logradouro}, ${dadosReceita.numero}`],
                  ['Complemento', dadosReceita.complemento || '—'],
                  ['Bairro', dadosReceita.bairro],
                  ['Município', dadosReceita.municipio],
                  ['UF', dadosReceita.uf],
                  ['CEP', dadosReceita.cep],
                  ['Telefone', dadosReceita.telefone || '—'],
                  ['E-mail', dadosReceita.email || '—'],
                ].map(([k, v]) => v && (
                  <div key={k} style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', paddingBottom: 8, marginBottom: 8 }}>
                    <span style={{ color: '#888', fontSize: 12, width: 120, flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: 13, color: '#1B2A4A', fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
                <div style={{ marginTop: 16, padding: '12px', background: dadosReceita.situacao === 'ATIVA' ? '#f0fdf4' : '#fef2f2', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                  {dadosReceita.situacao === 'ATIVA'
                    ? <CheckCircle size={16} color="#22c55e" />
                    : <AlertCircle size={16} color="#ef4444" />}
                  <span style={{ fontSize: 13, fontWeight: 600, color: dadosReceita.situacao === 'ATIVA' ? '#16a34a' : '#dc2626' }}>
                    Situação na Receita: {dadosReceita.situacao}
                  </span>
                </div>
                {!cliente && (
                  <button onClick={async () => {
                    const r = await fetch(`${API}/clientes/`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        nome: dadosReceita.nome, cnpj: dadosReceita.cnpj,
                        email: dadosReceita.email, whatsapp: dadosReceita.telefone,
                        regime: 'Simples Nacional', canal_preferido: 'ambos',
                      })
                    })
                    if (r.ok) { setCliente(await r.json()); setErro('') }
                  }} style={{ marginTop: 14, width: '100%', padding: '10px', background: '#C5A55A', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    ➕ Cadastrar como Cliente
                  </button>
                )}
                {cliente && (
                  <div style={{ marginTop: 14, padding: '10px', background: '#eff6ff', borderRadius: 8, fontSize: 12, color: '#1d4ed8', textAlign: 'center' }}>
                    ✅ Cliente cadastrado no sistema (ID: {cliente.id})
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documentos */}
          {aba === 'documentos' && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
              <div style={{ fontWeight: 700, color: '#1B2A4A', marginBottom: 16 }}>Documentos Disponíveis</div>
              {[
                { nome: 'Comprovante de Inscrição CNPJ', fonte: 'Receita Federal' },
                { nome: 'Certidão Negativa Federal', fonte: 'Receita Federal / PGFN' },
                { nome: 'Certidão FGTS', fonte: 'Caixa Econômica Federal' },
                { nome: 'Certidão Trabalhista', fonte: 'TST' },
                { nome: 'Certidão Estadual SEFAZ-GO', fonte: 'SEFAZ Goiás' },
                { nome: 'Certidão Municipal', fonte: 'Prefeitura de Goiânia' },
              ].map(({ nome, fonte }) => (
                <div key={nome} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontWeight: 500, color: '#1B2A4A', fontSize: 13 }}>{nome}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{fonte}</div>
                  </div>
                  <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid #1B2A4A', borderRadius: 6, background: '#fff', color: '#1B2A4A', cursor: 'pointer', fontSize: 12 }}>
                    <Download size={12} /> Baixar
                  </button>
                </div>
              ))}
            </div>
          )}

          {aba === 'obrigacoes' && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
              <div style={{ fontWeight: 700, color: '#1B2A4A', marginBottom: 16 }}>Obrigações do Cliente</div>
              <div style={{ color: '#888', fontSize: 13 }}>Vincule o cliente ao sistema para visualizar suas obrigações e entregas.</div>
            </div>
          )}

          {aba === 'financeiro' && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
              <div style={{ fontWeight: 700, color: '#1B2A4A', marginBottom: 16 }}>Financeiro do Cliente</div>
              <div style={{ color: '#888', fontSize: 13 }}>Aqui serão exibidos honorários, recebimentos e histórico financeiro do cliente.</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
