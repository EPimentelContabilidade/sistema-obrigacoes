import { useState, useEffect } from 'react'
import { Search, AlertTriangle, CheckCircle, Clock, Shield, ExternalLink, RefreshCw, FileText } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'

function getClientes() {
  try { return JSON.parse(localStorage.getItem('ep_clientes') || '[]') } catch { return [] }
}

function diasParaVencer(dataStr) {
  if (!dataStr) return null
  try {
    const d = new Date(dataStr + 'T12:00:00')
    const hoje = new Date()
    return Math.ceil((d - hoje) / (1000 * 60 * 60 * 24))
  } catch { return null }
}

function statusCert(dias) {
  if (dias === null) return { cor:'#ccc', bg:'#f5f5f5', label:'Sem data', icon:'—' }
  if (dias < 0)   return { cor:'#dc2626', bg:'#FEF2F2', label:'Vencido', icon:'⛔' }
  if (dias <= 30) return { cor:'#f59e0b', bg:'#FEF9C3', label:`Vence em ${dias}d`, icon:'⚠️' }
  if (dias <= 90) return { cor:'#3b82f6', bg:'#EFF6FF', label:`Vence em ${dias}d`, icon:'ℹ️' }
  return { cor:'#22c55e', bg:'#F0FDF4', label:`Válido (${dias}d)`, icon:'✅' }
}

const CERT_EMISSORAS = ['Serasa','Certisign','Soluti','Valid','Safeweb','ICP-Brasil','Outro']
const ORGAOS_PROC = ['e-CAC (Receita Federal)','SEFAZ Estadual','Prefeitura / NFS-e','Portal Simples Nacional','Junta Comercial','INSS / eSocial','FGTS / Caixa','Outro']
const inp = { padding:'7px 10px', borderRadius:6, border:'1px solid #ddd', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', color:'#333' }
const sel = { ...inp, cursor:'pointer', background:'#fff' }

// Certificado do escritório (fixo)
const CERT_ESCRITORIO = {
  titular: 'EPimentel Auditoria & Contabilidade Ltda',
  cnpj: '22.939.803/0001-49',
  tipo: 'e-CNPJ',
  emissora: 'Serasa',
  validade: '', // preenchido pelo usuário
  arquivo: '',
  senha: '',
}

export default function Certificados() {
  const [clientes, setClientes] = useState([])
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroProcuracao, setFiltroProcuracao] = useState(false)
  const [certEscritorio, setCertEscritorio] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ep_cert_escritorio') || 'null') || { ...CERT_ESCRITORIO } } catch { return { ...CERT_ESCRITORIO } }
  })
  const [editEscritorio, setEditEscritorio] = useState(false)
  const [modalCliente, setModalCliente] = useState(null)
  const [sortBy, setSortBy] = useState('validade')

  useEffect(() => { setClientes(getClientes()) }, [])

  const salvarEscritorio = () => {
    localStorage.setItem('ep_cert_escritorio', JSON.stringify(certEscritorio))
    setEditEscritorio(false)
  }

  // Certificados de todos os clientes
  const certClientes = clientes
    .filter(c => c.credenciais)
    .map(c => ({
      cliente: c,
      cert: c.credenciais,
      diasCert: diasParaVencer(c.credenciais?.cert_validade),
      diasProc: diasParaVencer(c.credenciais?.proc_validade),
      temProc: !!c.credenciais?.proc_ativa,
    }))
    .filter(x => {
      if (busca && !(x.cliente.nome||'').toLowerCase().includes(busca.toLowerCase()) && !(x.cliente.cnpj||'').includes(busca)) return false
      if (filtroProcuracao && !x.temProc) return false
      if (filtroStatus === 'vencido' && x.diasCert !== null && x.diasCert >= 0) return false
      if (filtroStatus === 'vencido' && x.diasCert === null) return false
      if (filtroStatus === 'alerta' && (x.diasCert === null || x.diasCert < 0 || x.diasCert > 30)) return false
      if (filtroStatus === 'ok' && (x.diasCert === null || x.diasCert < 0 || x.diasCert <= 30)) return false
      if (filtroStatus === 'sem' && x.diasCert !== null) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'validade') {
        if (a.diasCert === null) return 1
        if (b.diasCert === null) return -1
        return a.diasCert - b.diasCert
      }
      if (sortBy === 'nome') return (a.cliente.nome||'').localeCompare(b.cliente.nome||'')
      return 0
    })

  const total = certClientes.length
  const vencidos = certClientes.filter(x => x.diasCert !== null && x.diasCert < 0).length
  const alertas = certClientes.filter(x => x.diasCert !== null && x.diasCert >= 0 && x.diasCert <= 30).length
  const comProcuracao = certClientes.filter(x => x.temProc).length
  const semCert = certClientes.filter(x => x.diasCert === null).length

  const diasEscritorio = diasParaVencer(certEscritorio.validade)
  const stEsc = statusCert(diasEscritorio)

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 44px)', fontFamily:'Inter, system-ui, sans-serif', background:'#F8F9FA' }}>
      {/* Header */}
      <div style={{ background:NAVY, padding:'14px 22px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Shield size={22} style={{ color:GOLD }} />
          <div>
            <span style={{ color:'#fff', fontWeight:700, fontSize:17 }}>Certificados</span>
            <span style={{ color:GOLD, fontWeight:700, fontSize:17 }}> Digitais</span>
          </div>
        </div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.6)' }}>
          Controle de vencimentos e procurações
        </div>
      </div>

      <div style={{ flex:1, overflow:'auto', padding:20 }}>

        {/* ── CERTIFICADO DO ESCRITÓRIO ── */}
        <div style={{ marginBottom:20, background:'#fff', borderRadius:12, border:`2px solid ${GOLD}50`, overflow:'hidden' }}>
          <div style={{ padding:'12px 18px', background:NAVY, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:20 }}>🏢</span>
              <div>
                <div style={{ color:'#fff', fontWeight:700, fontSize:14 }}>Certificado do Escritório (EPimentel)</div>
                <div style={{ color:GOLD, fontSize:11 }}>Usado para acesso via procuração dos clientes</div>
              </div>
            </div>
            <button onClick={()=>setEditEscritorio(e=>!e)} style={{ padding:'5px 14px', borderRadius:7, background:'rgba(255,255,255,.1)', color:'#fff', border:'1px solid rgba(255,255,255,.2)', cursor:'pointer', fontSize:12 }}>
              {editEscritorio ? '× Fechar' : '✏️ Editar'}
            </button>
          </div>

          {!editEscritorio ? (
            <div style={{ padding:'14px 18px', display:'flex', gap:24, alignItems:'center', flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:10, color:'#aaa', fontWeight:600, textTransform:'uppercase' }}>Tipo</div>
                <div style={{ fontWeight:700, color:NAVY }}>{certEscritorio.tipo||'e-CNPJ'}</div>
              </div>
              <div>
                <div style={{ fontSize:10, color:'#aaa', fontWeight:600, textTransform:'uppercase' }}>CNPJ</div>
                <div style={{ fontWeight:600, color:'#555' }}>{certEscritorio.cnpj||'22.939.803/0001-49'}</div>
              </div>
              <div>
                <div style={{ fontSize:10, color:'#aaa', fontWeight:600, textTransform:'uppercase' }}>Emissora</div>
                <div style={{ fontWeight:600, color:'#555' }}>{certEscritorio.emissora||'—'}</div>
              </div>
              <div>
                <div style={{ fontSize:10, color:'#aaa', fontWeight:600, textTransform:'uppercase' }}>Arquivo</div>
                <div style={{ fontWeight:600, color:'#555', fontSize:12 }}>{certEscritorio.arquivo||'—'}</div>
              </div>
              <div style={{ marginLeft:'auto' }}>
                <div style={{ fontSize:10, color:'#aaa', fontWeight:600, textTransform:'uppercase', marginBottom:3 }}>Validade</div>
                {certEscritorio.validade ? (
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:14, fontWeight:700, color:stEsc.cor }}>{stEsc.icon} {stEsc.label}</span>
                    <span style={{ fontSize:12, color:'#888' }}>{new Date(certEscritorio.validade+'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                ) : (
                  <span style={{ fontSize:13, color:'#aaa' }}>Não informado</span>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding:'16px 18px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr', gap:12, marginBottom:12 }}>
                {[
                  ['Tipo', 'tipo', 'select', ['e-CNPJ','e-CPF']],
                  ['CNPJ do Escritório', 'cnpj', 'text', null],
                  ['Emissora AC', 'emissora', 'select', CERT_EMISSORAS],
                  ['Arquivo .pfx', 'arquivo', 'file', null],
                  ['Validade', 'validade', 'date', null],
                ].map(([l, k, t, opts]) => (
                  <div key={k}>
                    <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>{l}</label>
                    {t === 'select' ? (
                      <select value={certEscritorio[k]||''} onChange={e=>setCertEscritorio(c=>({...c,[k]:e.target.value}))} style={sel}>
                        {opts.map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : t === 'file' ? (
                      <div style={{ display:'flex', gap:6 }}>
                        <input type="text" value={certEscritorio[k]||''} readOnly placeholder="Nenhum arquivo..." style={{ ...inp, flex:1, background:'#f9f9f9', cursor:'default' }}/>
                        <label style={{ padding:'7px 10px', borderRadius:6, background:'#555', color:'#fff', fontSize:12, cursor:'pointer', whiteSpace:'nowrap' }}>
                          Browse
                          <input type="file" accept=".pfx,.p12" style={{ display:'none' }} onChange={e=>{ if(e.target.files[0]) setCertEscritorio(c=>({...c,arquivo:e.target.files[0].name})) }}/>
                        </label>
                      </div>
                    ) : (
                      <input type={t} value={certEscritorio[k]||''} onChange={e=>setCertEscritorio(c=>({...c,[k]:e.target.value}))} style={inp}/>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                <button onClick={()=>setEditEscritorio(false)} style={{ padding:'7px 14px', borderRadius:7, background:'#f5f5f5', color:'#555', border:'none', cursor:'pointer', fontSize:12 }}>Cancelar</button>
                <button onClick={salvarEscritorio} style={{ padding:'7px 16px', borderRadius:7, background:NAVY, color:'#fff', fontWeight:700, border:'none', cursor:'pointer', fontSize:12 }}>💾 Salvar</button>
              </div>
            </div>
          )}
        </div>

        {/* ── RESUMO CARDS ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Total',           valor:total,          cor:NAVY,      bg:'#EBF5FF', icon:'📋' },
            { label:'Vencidos',         valor:vencidos,       cor:'#dc2626', bg:'#FEF2F2', icon:'⛔' },
            { label:'Vencem em 30 dias',valor:alertas,        cor:'#f59e0b', bg:'#FEF9C3', icon:'⚠️' },
            { label:'Sem certificado',  valor:semCert,        cor:'#888',    bg:'#F5F5F5', icon:'—' },
            { label:'Com Procuração',   valor:comProcuracao,  cor:'#22c55e', bg:'#F0FDF4', icon:'📜' },
          ].map(c=>(
            <div key={c.label} style={{ background:c.bg, borderRadius:12, padding:'14px 16px', border:`1px solid ${c.cor}20`, cursor:'pointer' }} onClick={()=>setFiltroStatus(c.label==='Vencidos'?'vencido':c.label.includes('30')?'alerta':c.label.includes('Sem')?'sem':c.label==='Com Procuração'?'':filtroStatus)}>
              <div style={{ fontSize:28, marginBottom:6 }}>{c.icon}</div>
              <div style={{ fontSize:22, fontWeight:800, color:c.cor }}>{c.valor}</div>
              <div style={{ fontSize:11, color:'#666', marginTop:2 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* ── FILTROS ── */}
        <div style={{ background:'#fff', borderRadius:10, padding:'10px 16px', marginBottom:16, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', border:'1px solid #eee' }}>
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <Search size={12} style={{ position:'absolute', left:8, top:8, color:'#bbb' }}/>
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar cliente ou CNPJ..." style={{ ...inp, paddingLeft:26 }}/>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {[['','Todos'],['vencido','⛔ Vencidos'],['alerta','⚠️ Alerta 30d'],['ok','✅ OK'],['sem','— Sem cert']].map(([v,l])=>(
              <button key={v} onClick={()=>setFiltroStatus(v)} style={{ padding:'5px 12px', borderRadius:20, fontSize:11, cursor:'pointer', border:`1px solid ${filtroStatus===v?NAVY:'#ddd'}`, background:filtroStatus===v?NAVY:'#fff', color:filtroStatus===v?'#fff':'#666', fontWeight:filtroStatus===v?700:400 }}>{l}</button>
            ))}
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12 }}>
            <input type="checkbox" checked={filtroProcuracao} onChange={e=>setFiltroProcuracao(e.target.checked)} style={{ accentColor:NAVY, width:14, height:14 }}/>
            📜 Só com procuração
          </label>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ ...sel, width:160, fontSize:12 }}>
            <option value="validade">Ordenar: Vencimento</option>
            <option value="nome">Ordenar: Nome</option>
          </select>
          <button onClick={()=>setClientes(getClientes())} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:7, background:'#f5f5f5', color:'#555', border:'1px solid #ddd', cursor:'pointer', fontSize:12 }}>
            <RefreshCw size={12}/> Atualizar
          </button>
          <span style={{ fontSize:11, color:'#aaa' }}>{certClientes.length} resultado(s)</span>
        </div>

        {/* ── TABELA ── */}
        <div style={{ background:'#fff', borderRadius:10, border:'1px solid #eee', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:NAVY }}>
                {['Cliente','CNPJ','Regime','Tipo Cert.','Titular','Emissora','Validade','Procuração','Ações'].map(h=>(
                  <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:'#fff', fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {certClientes.length === 0 && (
                <tr><td colSpan={9} style={{ padding:40, textAlign:'center', color:'#ccc' }}>
                  Nenhum cliente encontrado. Os dados de certificados são preenchidos na aba <b>Credenciais</b> de cada cliente.
                </td></tr>
              )}
              {certClientes.map(({ cliente:c, cert, diasCert, diasProc, temProc }, i) => {
                const stC = statusCert(diasCert)
                const stP = statusCert(diasProc)
                return (
                  <tr key={c.id} style={{ background:i%2===0?'#fff':'#FAFAFA', borderBottom:'1px solid #f0f0f0' }}>
                    <td style={{ padding:'9px 12px', fontWeight:600, color:NAVY }}>
                      {c.nome}
                      {c.nome_fantasia && <div style={{ fontSize:10, color:'#aaa' }}>{c.nome_fantasia}</div>}
                    </td>
                    <td style={{ padding:'9px 12px', fontFamily:'monospace', fontSize:11, color:'#555' }}>{c.cnpj}</td>
                    <td style={{ padding:'9px 12px' }}>
                      <span style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:'#EBF5FF', color:'#1D6FA4', fontWeight:600 }}>{c.tributacao||c.regime||'—'}</span>
                    </td>
                    <td style={{ padding:'9px 12px', fontSize:11 }}>
                      {cert?.cert_tipo ? (
                        <span style={{ padding:'2px 7px', borderRadius:6, background:cert.cert_tipo==='e-CNPJ'?'#EBF5FF':'#F3EEFF', color:cert.cert_tipo==='e-CNPJ'?'#1D6FA4':'#6B3EC9', fontWeight:600 }}>{cert.cert_tipo}</span>
                      ) : <span style={{ color:'#ccc' }}>—</span>}
                    </td>
                    <td style={{ padding:'9px 12px', fontSize:11, color:'#555', maxWidth:160 }}>
                      <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cert?.cert_titular||'—'}</div>
                      {cert?.cert_cnpj_cpf && <div style={{ fontSize:10, color:'#aaa' }}>{cert.cert_cnpj_cpf}</div>}
                    </td>
                    <td style={{ padding:'9px 12px', fontSize:11, color:'#555' }}>{cert?.cert_emissora||'—'}</td>
                    <td style={{ padding:'9px 12px' }}>
                      {cert?.cert_validade ? (
                        <div>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:8, background:stC.bg, color:stC.cor, fontWeight:700 }}>{stC.icon} {stC.label}</span>
                          <div style={{ fontSize:10, color:'#aaa', marginTop:2 }}>{new Date(cert.cert_validade+'T12:00:00').toLocaleDateString('pt-BR')}</div>
                        </div>
                      ) : <span style={{ color:'#ccc', fontSize:11 }}>Não informado</span>}
                    </td>
                    <td style={{ padding:'9px 12px' }}>
                      {temProc ? (
                        <div>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:8, background:stP.bg, color:stP.cor, fontWeight:700 }}>📜 {stP.icon} {stP.label}</span>
                          {(cert?.proc_orgaos||[]).length > 0 && (
                            <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginTop:3 }}>
                              {cert.proc_orgaos.slice(0,2).map(o=><span key={o} style={{ fontSize:9, padding:'1px 5px', borderRadius:5, background:'#E8F5E9', color:'#2E7D32' }}>{o.split('(')[0].trim()}</span>)}
                              {cert.proc_orgaos.length > 2 && <span style={{ fontSize:9, color:'#aaa' }}>+{cert.proc_orgaos.length-2}</span>}
                            </div>
                          )}
                        </div>
                      ) : <span style={{ color:'#ccc', fontSize:11 }}>—</span>}
                    </td>
                    <td style={{ padding:'9px 12px' }}>
                      <button onClick={()=>setModalCliente(c)} style={{ padding:'4px 9px', borderRadius:6, background:'#EBF5FF', color:'#1D6FA4', border:'none', cursor:'pointer', fontSize:11 }}>👁 Ver</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal detalhe */}
      {modalCliente && (() => {
        const cert = modalCliente.credenciais || {}
        const diasC = diasParaVencer(cert.cert_validade)
        const diasP = diasParaVencer(cert.proc_validade)
        const stC = statusCert(diasC)
        const stP = statusCert(diasP)
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
            <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:640, maxHeight:'85vh', overflow:'auto', boxShadow:'0 8px 40px rgba(0,0,0,.2)' }}>
              <div style={{ padding:'14px 22px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'#fff', zIndex:1 }}>
                <div>
                  <div style={{ fontWeight:700, color:NAVY, fontSize:15 }}>🔐 {modalCliente.nome}</div>
                  <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{modalCliente.cnpj} · {modalCliente.tributacao||modalCliente.regime}</div>
                </div>
                <button onClick={()=>setModalCliente(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'#999' }}>×</button>
              </div>
              <div style={{ padding:22 }}>
                {/* Certificado */}
                <div style={{ marginBottom:16, padding:'14px 16px', borderRadius:10, border:'1px solid #e8e8e8', background:stC.bg }}>
                  <div style={{ fontWeight:700, color:NAVY, fontSize:13, marginBottom:10 }}>🔏 Certificado Digital</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                    {[
                      ['Tipo', cert.cert_tipo||'—'],
                      ['Titular', cert.cert_titular||'—'],
                      ['CPF/CNPJ', cert.cert_cnpj_cpf||'—'],
                      ['Emissora', cert.cert_emissora||'—'],
                      ['Arquivo', cert.cert_arquivo||'—'],
                      ['Validade', cert.cert_validade?new Date(cert.cert_validade+'T12:00:00').toLocaleDateString('pt-BR'):'—'],
                    ].map(([k,v])=>(
                      <div key={k}>
                        <div style={{ fontSize:10, color:'#888', fontWeight:600 }}>{k}</div>
                        <div style={{ fontSize:12, color:NAVY, fontWeight:600 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:10 }}>
                    <span style={{ fontSize:12, padding:'3px 10px', borderRadius:8, background:'#fff', border:`1px solid ${stC.cor}`, color:stC.cor, fontWeight:700 }}>{stC.icon} {stC.label}</span>
                  </div>
                </div>

                {/* Procuração */}
                {cert.proc_ativa && (
                  <div style={{ marginBottom:16, padding:'14px 16px', borderRadius:10, border:'1px solid #A5D6A7', background:'#E8F5E9' }}>
                    <div style={{ fontWeight:700, color:'#2E7D32', fontSize:13, marginBottom:10 }}>📜 Procuração</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
                      {[
                        ['Arquivo', cert.proc_arquivo||'—'],
                        ['Data', cert.proc_data?new Date(cert.proc_data+'T12:00:00').toLocaleDateString('pt-BR'):'—'],
                        ['Validade', cert.proc_validade?new Date(cert.proc_validade+'T12:00:00').toLocaleDateString('pt-BR'):'—'],
                      ].map(([k,v])=>(
                        <div key={k}>
                          <div style={{ fontSize:10, color:'#888', fontWeight:600 }}>{k}</div>
                          <div style={{ fontSize:12, color:'#2E7D32', fontWeight:600 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {(cert.proc_orgaos||[]).length > 0 && (
                      <div>
                        <div style={{ fontSize:10, color:'#888', fontWeight:600, marginBottom:5 }}>Órgãos autorizados:</div>
                        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                          {cert.proc_orgaos.map(o=><span key={o} style={{ fontSize:11, padding:'2px 9px', borderRadius:8, background:'#fff', color:'#2E7D32', border:'1px solid #A5D6A7', fontWeight:600 }}>{o}</span>)}
                        </div>
                      </div>
                    )}
                    {cert.proc_obs && <div style={{ marginTop:10, fontSize:12, color:'#555', fontStyle:'italic' }}>{cert.proc_obs}</div>}
                    <div style={{ marginTop:8 }}>
                      <span style={{ fontSize:12, padding:'3px 10px', borderRadius:8, background:'#fff', border:`1px solid ${stP.cor}`, color:stP.cor, fontWeight:700 }}>{stP.icon} {stP.label}</span>
                    </div>
                  </div>
                )}

                {/* Credenciais resumo */}
                <div style={{ padding:'12px 14px', borderRadius:10, border:'1px solid #eee', background:'#F8F9FA' }}>
                  <div style={{ fontWeight:700, color:NAVY, fontSize:13, marginBottom:8 }}>🔑 Credenciais cadastradas</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {[
                      cert.pref_login && '🏛️ Prefeitura',
                      cert.en_cpfcnpj && '🧾 Emissor Nacional',
                      cert.sn_codigo && '📊 Simples Nacional',
                      cert.ecac_cpfcnpj && '🏦 e-CAC',
                      cert.dominio_empresa && '💻 Domínio',
                    ].filter(Boolean).map(l=><span key={l} style={{ fontSize:11, padding:'2px 9px', borderRadius:8, background:'#EBF5FF', color:'#1D6FA4', fontWeight:600 }}>{l}</span>)}
                    {!cert.pref_login && !cert.en_cpfcnpj && !cert.sn_codigo && !cert.ecac_cpfcnpj && <span style={{ color:'#aaa', fontSize:12 }}>Nenhuma credencial cadastrada</span>}
                  </div>
                </div>
              </div>
              <div style={{ padding:'12px 22px', borderTop:'1px solid #eee', display:'flex', justifyContent:'flex-end', gap:10 }}>
                <button onClick={()=>setModalCliente(null)} style={{ padding:'8px 18px', borderRadius:8, background:NAVY, color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>Fechar</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
