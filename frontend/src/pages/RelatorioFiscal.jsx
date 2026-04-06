import { useState } from 'react'
import { FileText, Search, Download, Loader, AlertCircle, Shield, RefreshCw, Eye } from 'lucide-react'
import ClienteSelector from '../components/ClienteSelector'

const API = '/api/v1'

const RELATORIOS = [
  { id: 'situacao_fiscal',  label: 'Situação Fiscal Completa',      icon: '🏛️', desc: 'Consulta completa na Receita Federal — débitos, pendências e situação cadastral' },
  { id: 'comprovante_cnpj', label: 'Comprovante de Inscrição CNPJ', icon: '📄', desc: 'Comprovante oficial de inscrição no CNPJ (Receita Federal)' },
]

const PORTAIS_URL = {
  situacao_fiscal:    'https://www.ecac.receita.fazenda.gov.br/',
  comprovante_cnpj:   'https://www.receita.fazenda.gov.br/pessoajuridica/cnpj/cnpjreva/cnpjreva_solicitacao2.asp',
  pendencias_simples: 'https://www8.receita.fazenda.gov.br/SimplesNacional/',
  debitos_federal:    'https://www.ecac.receita.fazenda.gov.br/',
  cnd:                'https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir',
  parcelamentos:      'https://www.regularize.pgfn.gov.br/',
  declaracoes:        'https://www.ecac.receita.fazenda.gov.br/',
  nfe_emitidas:       'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx',
}

export default function RelatorioFiscal() {
  const [cliente, setCliente] = useState(null)
  const [relSel, setRelSel] = useState([])
  const [periodo, setPeriodo] = useState({ inicio: '', fim: '' })
  const [resultados, setResultados] = useState([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [certConfig, setCertConfig] = useState({ path: '', senha: '' })
  const [mostrarConfig, setMostrarConfig] = useState(false)

  const toggleRel = (id) => setRelSel(s => s.includes(id) ? s.filter(r => r !== id) : [...s, id])

  const consultar = async () => {
    if (!cliente) return setErro('Selecione um cliente.')
    if (relSel.length === 0) return setErro('Selecione pelo menos um relatório.')
    setLoading(true); setErro(''); setResultados([])

    const novos = relSel.map(id => {
      const rel = RELATORIOS.find(r => r.id === id)
      return {
        id,
        label: rel.label,
        icon: rel.icon,
        status: 'pendente',
        url: PORTAIS_URL[id] || '#',
        mensagem: 'Clique em "Abrir Portal" para consultar com seu certificado digital',
      }
    })

    // Tentar consultas que não precisam de certificado
    const resultFinal = await Promise.all(novos.map(async (r) => {
      if (r.id === 'comprovante_cnpj' && cliente?.cnpj) {
        try {
          const cnpj = cliente.cnpj.replace(/\D/g,'')
          const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
          if (resp.ok) {
            return { ...r, status: 'disponivel', dados: await resp.json(), mensagem: '✅ Dados disponíveis via API pública' }
          }
        } catch {}
      }
      return r
    }))

    setResultados(resultFinal)
    setLoading(false)
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#1B2A4A', display:'flex', alignItems:'center', gap:8 }}>
            <FileText size={22}/> Relatório Fiscal — Receita Federal
          </h1>
          <p style={{ color:'#888', fontSize:13, marginTop:4 }}>Consulte situação fiscal dos clientes com certificado digital da contabilidade</p>
        </div>
        <button onClick={() => setMostrarConfig(s => !s)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', border:'1px solid #e2e8f0', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:13, color:'#475569' }}>
          <Shield size={14}/> Certificado Digital
        </button>
      </div>

      {/* Configuração do certificado */}
      {mostrarConfig && (
        <div style={{ background:'#fff', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)', marginBottom:16, border:'2px solid #C5A55A20' }}>
          <div style={{ fontWeight:600, color:'#1B2A4A', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
            <Shield size={16} color="#C5A55A"/> Certificado Digital A1 da Contabilidade
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:5 }}>Caminho do Certificado (.pfx)</label>
              <input value={certConfig.path} onChange={e => setCertConfig(c => ({...c, path:e.target.value}))}
                placeholder="C:\EPimentel\certificado_escritorio.pfx"
                style={{ width:'100%', padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:12, fontFamily:'monospace', boxSizing:'border-box' }}/>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:5 }}>Senha do Certificado</label>
              <input type="password" value={certConfig.senha} onChange={e => setCertConfig(c => ({...c, senha:e.target.value}))}
                placeholder="••••••••" style={{ width:'100%', padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:13, boxSizing:'border-box' }}/>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <button onClick={async () => {
              const r = await fetch(`${API}/relatorio-fiscal/configurar-certificado`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(certConfig) })
              const d = await r.json()
              alert(r.ok ? '✅ ' + d.mensagem : '❌ ' + d.detail)
            }} style={{ padding:'8px 16px', background:'#1B2A4A', color:'#C5A55A', border:'none', borderRadius:7, cursor:'pointer', fontSize:13, fontWeight:500 }}>
              💾 Salvar Certificado
            </button>
            <span style={{ fontSize:12, color:'#888' }}>Configure uma vez — o certificado será usado em todas as consultas</span>
          </div>
          <div style={{ marginTop:12, padding:'10px 14px', background:'#f0f9ff', borderRadius:8, fontSize:12, color:'#0369a1' }}>
            ℹ️ O certificado digital A1 do escritório permite consultar dados de todos os clientes no e-CAC, SPED e demais portais da Receita Federal. Configure em <code style={{ background:'#e0f2fe', padding:'1px 4px', borderRadius:3 }}>.env</code> as variáveis <code style={{ background:'#e0f2fe', padding:'1px 4px', borderRadius:3 }}>SEFAZ_CERT_PATH</code> e <code style={{ background:'#e0f2fe', padding:'1px 4px', borderRadius:3 }}>SEFAZ_CERT_PASS</code>.
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:20 }}>
        {/* Painel esquerdo */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ background:'#fff', borderRadius:12, padding:16, boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ fontWeight:600, color:'#1B2A4A', fontSize:13, marginBottom:10 }}>Cliente</div>
            <ClienteSelector value={cliente} onChange={setCliente} placeholder="Selecione o cliente..."/>
          </div>

          <div style={{ background:'#fff', borderRadius:12, padding:16, boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ fontWeight:600, color:'#1B2A4A', fontSize:13 }}>Relatórios</div>
              <button onClick={() => setRelSel(relSel.length === RELATORIOS.length ? [] : RELATORIOS.map(r => r.id))} style={{ fontSize:11, color:'#2563eb', background:'none', border:'none', cursor:'pointer' }}>
                {relSel.length === RELATORIOS.length ? 'Desmarcar' : 'Selecionar'} todos
              </button>
            </div>
            {RELATORIOS.map(r => (
              <label key={r.id} onClick={() => toggleRel(r.id)} style={{
                display:'flex', alignItems:'flex-start', gap:10, padding:'9px 0',
                borderBottom:'1px solid #f8fafc', cursor:'pointer',
              }}>
                <input type="checkbox" checked={relSel.includes(r.id)} onChange={() => {}} style={{ marginTop:2 }}/>
                <div>
                  <div style={{ fontWeight:500, color:'#334155', fontSize:13 }}>{r.icon} {r.label}</div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{r.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>Data início</label>
              <input type="date" value={periodo.inicio} onChange={e => setPeriodo(p => ({...p, inicio:e.target.value}))}
                style={{ width:'100%', padding:'7px 8px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:12, boxSizing:'border-box' }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>Data fim</label>
              <input type="date" value={periodo.fim} onChange={e => setPeriodo(p => ({...p, fim:e.target.value}))}
                style={{ width:'100%', padding:'7px 8px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:12, boxSizing:'border-box' }}/>
            </div>
          </div>

          {erro && <div style={{ padding:'10px 14px', background:'#fef2f2', borderRadius:8, color:'#dc2626', fontSize:13, display:'flex', gap:6 }}><AlertCircle size={14}/> {erro}</div>}

          <button onClick={consultar} disabled={loading} style={{
            padding:'12px', background:loading?'#94a3b8':'#1B2A4A', color:'#fff', border:'none',
            borderRadius:9, cursor:loading?'default':'pointer', fontSize:14, fontWeight:600,
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}>
            {loading?<><Loader size={16} style={{animation:'spin 1s linear infinite'}}/> Consultando...</>:<><Search size={16}/> Consultar</>}
          </button>
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>

        {/* Resultados */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {resultados.length === 0 && !loading && (
            <div style={{ background:'#fff', borderRadius:12, padding:56, textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,.08)', color:'#aaa' }}>
              <FileText size={48} style={{ margin:'0 auto 16px', display:'block', color:'#e2e8f0' }}/>
              <div style={{ fontSize:14 }}>Selecione um cliente e os relatórios desejados</div>
              <div style={{ fontSize:12, marginTop:8 }}>Os relatórios serão buscados diretamente nos portais da Receita Federal</div>
            </div>
          )}

          {resultados.map(r => (
            <div key={r.id} style={{ background:'#fff', borderRadius:12, padding:'18px 20px', boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:600, color:'#1B2A4A', fontSize:15 }}>{r.icon} {r.label}</div>
                  <div style={{ fontSize:12, color: r.status==='disponivel'?'#16a34a':'#94a3b8', marginTop:4 }}>{r.mensagem}</div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {r.url && (
                    <button onClick={() => window.open(r.url, '_blank')} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', background:'#2563eb', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:500 }}>
                      🌐 Abrir Portal
                    </button>
                  )}
                </div>
              </div>

              {/* Dados disponíveis via API */}
              {r.dados && r.id === 'comprovante_cnpj' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:12, background:'#f8fafc', borderRadius:8, padding:14 }}>
                  {[
                    ['Razão Social', r.dados.razao_social],
                    ['Nome Fantasia', r.dados.nome_fantasia || '—'],
                    ['Situação', r.dados.descricao_situacao_cadastral],
                    ['Data Abertura', r.dados.data_inicio_atividade],
                    ['Natureza Jurídica', r.dados.natureza_juridica],
                    ['Capital Social', r.dados.capital_social ? `R$ ${Number(r.dados.capital_social).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—'],
                    ['Município', `${r.dados.municipio||'—'}/${r.dados.uf||'—'}`],
                    ['CNAE Principal', r.dados.cnae_fiscal_descricao || '—'],
                  ].map(([k,v]) => (
                    <div key={k} style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      <span style={{ fontSize:11, color:'#888' }}>{k}</span>
                      <span style={{ fontSize:13, fontWeight:500, color:'#1B2A4A' }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
