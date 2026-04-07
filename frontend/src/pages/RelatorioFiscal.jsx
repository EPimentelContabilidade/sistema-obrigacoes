import { useState, useEffect } from 'react'
import { Search, Shield, ExternalLink, CheckCircle, AlertTriangle, Clock, FileText, User, Building2, RefreshCw, Download, ChevronDown, ChevronUp, X, Plus, BarChart2 } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD  = '#C5A55A'
const inp   = { padding:'7px 10px', borderRadius:6, border:'1px solid #ddd', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', color:'#333' }

const fmtData = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('pt-BR') } catch { return d } }
const hoje = () => new Date().toISOString().split('T')[0]

// ── Links e-CAC / Receita Federal ─────────────────────────────────────────────
const RELATORIOS = [
  {
    id:'sit_fiscal', label:'Situação Fiscal Completa', icon:'🏛️',
    desc:'Débitos, pendências e situação cadastral na Receita Federal',
    url: (cnpj) => `https://cav.receita.fazenda.gov.br/autenticacao/login?service=ecac`,
    urlDirect: (cnpj) => `https://cav.receita.fazenda.gov.br/autenticacao/login`,
    categoria:'Receita Federal', cor:'#1D6FA4', bg:'#EBF5FF', requerCert:true,
  },
  {
    id:'comprov_cnpj', label:'Comprovante de Inscrição CNPJ', icon:'📄',
    desc:'Comprovante oficial de inscrição no CNPJ — Receita Federal',
    url: (cnpj) => `https://www.receita.fazenda.gov.br/pessoajuridica/cnpj/cnpjreva/cnpjrevaListResult.asp?contador=0&nire=&nireError=0&cnpj=${cnpj?.replace(/\D/g,'')}`,
    urlDirect: (cnpj) => `https://www.receita.fazenda.gov.br/pessoajuridica/cnpj/cnpjreva/cnpjrevaListResult.asp?contador=0&nire=&nireError=0&cnpj=${cnpj?.replace(/\D/g,'')}`,
    categoria:'Receita Federal', cor:'#1D6FA4', bg:'#EBF5FF', requerCert:false,
  },
  {
    id:'certidao_neg', label:'Certidão Negativa de Débitos (CND)', icon:'✅',
    desc:'Certidão Negativa ou Positiva com Efeito de Negativa — federal',
    url: (cnpj) => `https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir`,
    urlDirect: (cnpj) => `https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir`,
    categoria:'Receita Federal', cor:'#16a34a', bg:'#F0FDF4', requerCert:false,
  },
  {
    id:'declaracoes', label:'Declarações e Demonstrativos', icon:'📋',
    desc:'DCTF, ECF, ECD, SPED — histórico de entrega via e-CAC',
    url: (cnpj) => `https://cav.receita.fazenda.gov.br/autenticacao/login`,
    urlDirect: (cnpj) => `https://cav.receita.fazenda.gov.br/autenticacao/login`,
    categoria:'e-CAC', cor:'#6B3EC9', bg:'#F3EEFF', requerCert:true,
  },
  {
    id:'parcelamentos', label:'Parcelamentos e REFIS', icon:'💳',
    desc:'Consulta de parcelamentos ativos (PERT, REFIS, Simples etc.)',
    url: (cnpj) => `https://cav.receita.fazenda.gov.br/autenticacao/login`,
    urlDirect: (cnpj) => `https://cav.receita.fazenda.gov.br/autenticacao/login`,
    categoria:'e-CAC', cor:'#f59e0b', bg:'#FEF9C3', requerCert:true,
  },
  {
    id:'simples_nac', label:'Simples Nacional — Situação', icon:'🏢',
    desc:'Situação no Simples Nacional, DAS em aberto, exclusões',
    url: (cnpj) => `https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATBHE/ConsultaOptantes.app/ConsultarOpcao`,
    urlDirect: (cnpj) => `https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATBHE/ConsultaOptantes.app/ConsultarOpcao`,
    categoria:'Simples Nacional', cor:'#1A7A3C', bg:'#EDFBF1', requerCert:false,
  },
  {
    id:'pgfn', label:'PGFN — Dívida Ativa', icon:'⚠️',
    desc:'Consulta de inscrições em dívida ativa da União (PGFN)',
    url: (cnpj) => `https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir`,
    urlDirect: (cnpj) => `https://www.regularize.pgfn.gov.br/`,
    categoria:'PGFN', cor:'#dc2626', bg:'#FEF2F2', requerCert:false,
  },
  {
    id:'nfe_destinadas', label:'NF-e Destinadas (Manifestação)', icon:'🧾',
    desc:'Consulta e manifestação de NF-e destinadas ao CNPJ',
    url: (cnpj) => `https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=completa&tipoConteudo=XbSeqxE8pl8=`,
    urlDirect: (cnpj) => `https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=completa&tipoConteudo=XbSeqxE8pl8=`,
    categoria:'NF-e', cor:'#854D0E', bg:'#FEF9C3', requerCert:false,
  },
  {
    id:'procuracao', label:'Procuração Eletrônica — e-CAC', icon:'📜',
    desc:'Gerenciar procurações outorgadas/recebidas no e-CAC',
    url: (cnpj) => `https://cav.receita.fazenda.gov.br/autenticacao/login`,
    urlDirect: (cnpj) => `https://cav.receita.fazenda.gov.br/autenticacao/login`,
    categoria:'e-CAC', cor:'#5b21b6', bg:'#EDE9FF', requerCert:true,
  },
]

const STATUS_OPTS = ['Sem pendências','Pendências regularizadas','Pendente — débitos','Pendente — cadastral','Irregular','Não consultado']

export default function RelatorioFiscal() {
  const [aba,          setAba]          = useState('consulta') // 'consulta' | 'dashboard' | 'historico'
  const [clientes,     setClientes]     = useState([])
  const [certs,        setCerts]        = useState([])
  const [cliSel,       setCliSel]       = useState(null)
  const [certSel,      setCertSel]      = useState(null)
  const [relSel,       setRelSel]       = useState([])
  const [historico,    setHistorico]    = useState([]) // consultas registradas
  const [busca,        setBusca]        = useState('')
  const [resultado,    setResultado]    = useState(null) // consulta atual
  const [modalLog,     setModalLog]     = useState(null) // registrar resultado manual
  const [logForm,      setLogForm]      = useState({ status:'Sem pendências', obs:'', data:hoje() })
  const [procuracao,   setProcuracao]   = useState({}) // { cli_id: true/false }
  const [expandidos,   setExpandidos]   = useState({})
  const [filtroCliDash,setFiltroCliDash]= useState('')

  useEffect(() => {
    try { setClientes(JSON.parse(localStorage.getItem('ep_clientes')||'[]')) } catch {}
    try { setCerts(JSON.parse(localStorage.getItem('ep_certificados')||'[]')) } catch {}
    try { setHistorico(JSON.parse(localStorage.getItem('ep_hist_fiscal')||'[]')) } catch {}
    try { setProcuracao(JSON.parse(localStorage.getItem('ep_procuracao')||'{}')) } catch {}
  }, [])

  const salvarHistorico = (nova) => {
    setHistorico(nova)
    localStorage.setItem('ep_hist_fiscal', JSON.stringify(nova))
  }

  const certsCli = certs.filter(c => String(c.cliente_id) === String(cliSel?.id))

  const toggleRel = (id) => setRelSel(v => v.includes(id) ? v.filter(x=>x!==id) : [...v,id])

  const abrirRelatorio = (rel) => {
    if (!cliSel) return
    const cnpj = cliSel.cnpj?.replace(/\D/g,'')
    window.open(rel.urlDirect(cnpj), '_blank')
  }

  const registrarConsulta = () => {
    if (!cliSel || !modalLog) return
    const nova = [{
      id: Date.now(),
      cliente_id:   cliSel.id,
      cliente_nome: cliSel.nome,
      cnpj:         cliSel.cnpj,
      relatorio_id: modalLog.id,
      relatorio:    modalLog.label,
      status:       logForm.status,
      obs:          logForm.obs,
      data:         logForm.data,
      cert_nome:    certSel?.arquivo_nome||certSel?.tipo_cert||'Sem certificado',
      usuario:      'Eduardo Pimentel',
    }, ...historico]
    salvarHistorico(nova)
    setModalLog(null)
    setLogForm({ status:'Sem pendências', obs:'', data:hoje() })
  }

  const toggleProcuracao = (cliId) => {
    const nova = { ...procuracao, [cliId]: !procuracao[cliId] }
    setProcuracao(nova)
    localStorage.setItem('ep_procuracao', JSON.stringify(nova))
  }

  const ultimaConsulta = (cliId, relId) => historico.find(h=>String(h.cliente_id)===String(cliId)&&h.relatorio_id===relId)

  // ── Dashboard — situação fiscal por cliente ──
  const clientesDash = clientes.filter(c=>
    !filtroCliDash || c.nome?.toLowerCase().includes(filtroCliDash.toLowerCase())
  ).map(c=>{
    const histCli  = historico.filter(h=>String(h.cliente_id)===String(c.id))
    const certsCl  = certs.filter(x=>String(x.cliente_id)===String(c.id))
    const temCert  = certsCl.length > 0
    const temProc  = procuracao[c.id] || false
    const pendente = histCli.some(h=>h.status?.includes('Pendente')||h.status==='Irregular')
    const ok       = histCli.some(h=>h.status==='Sem pendências')&&!pendente
    const semConsult = histCli.length === 0
    return { ...c, histCli, temCert, temProc, pendente, ok, semConsult, totalConsultas: histCli.length }
  })

  const stCor = (st) => {
    if (!st) return { cor:'#aaa', bg:'#f5f5f5', ic:'—' }
    if (st.includes('Pendente')||st==='Irregular') return { cor:'#dc2626', bg:'#FEF2F2', ic:'⚠' }
    if (st==='Sem pendências'||st==='Pendências regularizadas') return { cor:'#16a34a', bg:'#F0FDF4', ic:'✓' }
    return { cor:'#888', bg:'#f5f5f5', ic:'?' }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 44px)', fontFamily:'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', display:'flex', alignItems:'center', padding:'0 16px' }}>
        {[['consulta','🔍 Consulta'],['dashboard','📊 Dashboard'],['historico','📋 Histórico']].map(([id,label])=>(
          <button key={id} onClick={()=>setAba(id)} style={{ padding:'11px 16px', fontSize:13, fontWeight:aba===id?700:400, color:aba===id?NAVY:'#999', background:'none', border:'none', borderBottom:aba===id?`2px solid ${GOLD}`:'2px solid transparent', cursor:'pointer' }}>
            {label}
          </button>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
          <a href="https://cav.receita.fazenda.gov.br/autenticacao/login" target="_blank" rel="noreferrer"
            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, background:'#EBF5FF', color:'#1D6FA4', fontSize:12, fontWeight:600, border:'1px solid #1D6FA430', textDecoration:'none' }}>
            <ExternalLink size={12}/> Abrir e-CAC
          </a>
        </div>
      </div>

      {/* ── ABA CONSULTA ── */}
      {aba==='consulta' && (
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

          {/* Painel esquerdo */}
          <div style={{ width:300, background:'#fff', borderRight:'1px solid #e8e8e8', display:'flex', flexDirection:'column', flexShrink:0, overflowY:'auto' }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid #f0f0f0' }}>
              <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:8 }}>Cliente</div>
              <div style={{ position:'relative', marginBottom:10 }}>
                <Search size={12} style={{ position:'absolute', left:8, top:8, color:'#bbb' }}/>
                <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar cliente..." style={{ ...inp, paddingLeft:26, fontSize:12 }}/>
              </div>
              <select value={cliSel?.id||''} onChange={e=>{ const c=clientes.find(x=>String(x.id)===e.target.value); setCliSel(c||null); setCertSel(null); setRelSel([]) }} style={{ ...inp, cursor:'pointer', fontSize:12 }}>
                <option value="">Selecione o cliente...</option>
                {clientes.filter(c=>!busca||c.nome?.toLowerCase().includes(busca.toLowerCase())).map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            {cliSel && (
              <>
                {/* Info cliente */}
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #f0f0f0', background:'#f8f9fb' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:4 }}>{cliSel.nome}</div>
                  <div style={{ fontSize:11, color:'#888', fontFamily:'monospace' }}>{cliSel.cnpj}</div>
                  <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{cliSel.tributacao||cliSel.regime||'—'}</div>

                  {/* Procuração */}
                  <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8 }}>
                    <input type="checkbox" checked={procuracao[cliSel.id]||false} onChange={()=>toggleProcuracao(cliSel.id)} style={{ accentColor:NAVY, width:14, height:14 }}/>
                    <span style={{ fontSize:11, color:NAVY, fontWeight:600 }}>📜 Procuração e-CAC ativa</span>
                  </div>
                  {!procuracao[cliSel.id]&&(
                    <div style={{ marginTop:6, fontSize:10, color:'#f59e0b', padding:'4px 8px', borderRadius:6, background:'#FEF9C3', border:'1px solid #fde68a' }}>
                      ⚠ Sem procuração — acesso e-CAC limitado
                    </div>
                  )}
                </div>

                {/* Certificado */}
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #f0f0f0' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#888', marginBottom:6, textTransform:'uppercase' }}>Certificado Digital</div>
                  {certsCli.length===0
                    ? <div style={{ fontSize:11, color:'#ccc', fontStyle:'italic' }}>Nenhum certificado cadastrado</div>
                    : <select value={certSel?.id||''} onChange={e=>setCertSel(certsCli.find(x=>String(x.id)===e.target.value)||null)} style={{ ...inp, cursor:'pointer', fontSize:11 }}>
                        <option value="">Selecione o certificado...</option>
                        {certsCli.map(c=>(
                          <option key={c.id} value={c.id}>{c.tipo} — {c.tipo_cert} {c.tipo==='PF'?`(${c.responsavel_nome})`:''}</option>
                        ))}
                      </select>
                  }
                  {certSel&&<div style={{ fontSize:10, color:'#16a34a', marginTop:5 }}>✓ Válido até {fmtData(certSel.validade)}</div>}
                </div>

                {/* Relatórios */}
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #f0f0f0' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#888', textTransform:'uppercase' }}>Relatórios</div>
                    <button onClick={()=>setRelSel(relSel.length===RELATORIOS.length?[]:RELATORIOS.map(r=>r.id))} style={{ fontSize:10, color:NAVY, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
                      {relSel.length===RELATORIOS.length?'Nenhum':'Todos'}
                    </button>
                  </div>
                  {['Receita Federal','e-CAC','Simples Nacional','PGFN','NF-e'].map(cat=>(
                    <div key={cat} style={{ marginBottom:10 }}>
                      <div style={{ fontSize:9, color:'#aaa', fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>{cat}</div>
                      {RELATORIOS.filter(r=>r.categoria===cat).map(r=>{
                        const uc = ultimaConsulta(cliSel.id, r.id)
                        const bloq = r.requerCert && !certSel && !procuracao[cliSel.id]
                        return (
                          <label key={r.id} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'5px 0', cursor:bloq?'not-allowed':'pointer', opacity:bloq?.6:1 }}>
                            <input type="checkbox" checked={relSel.includes(r.id)} onChange={()=>!bloq&&toggleRel(r.id)} disabled={bloq} style={{ accentColor:NAVY, width:13, height:13, marginTop:2 }}/>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:11, fontWeight:600, color:NAVY }}>{r.icon} {r.label}</div>
                              {bloq&&<div style={{ fontSize:9, color:'#f59e0b' }}>⚠ Requer certificado/procuração</div>}
                              {uc&&<div style={{ fontSize:9, color:stCor(uc.status).cor }}>{stCor(uc.status).ic} {uc.status} · {fmtData(uc.data)}</div>}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Painel direito */}
          <div style={{ flex:1, overflowY:'auto', background:'#f8f9fb', padding:20 }}>
            {!cliSel ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#ccc' }}>
                <FileText size={48} style={{ marginBottom:12, opacity:.3 }}/>
                <div style={{ fontSize:14, fontWeight:700 }}>Selecione um cliente</div>
                <div style={{ fontSize:12, marginTop:4 }}>para consultar os relatórios fiscais</div>
              </div>
            ) : relSel.length===0 ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#ccc' }}>
                <CheckCircle size={48} style={{ marginBottom:12, opacity:.3 }}/>
                <div style={{ fontSize:14, fontWeight:700 }}>Selecione os relatórios</div>
                <div style={{ fontSize:12, marginTop:4 }}>na lista à esquerda para consultar</div>
              </div>
            ) : (
              <>
                {/* Cabeçalho cliente */}
                <div style={{ background:'#fff', borderRadius:12, padding:'14px 18px', marginBottom:16, border:'1px solid #e8e8e8', display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:44, height:44, borderRadius:10, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:18, fontWeight:800 }}>{(cliSel.nome||'?')[0]}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:NAVY }}>{cliSel.nome}</div>
                    <div style={{ fontSize:11, color:'#888', marginTop:1 }}>{cliSel.cnpj} · {cliSel.tributacao||cliSel.regime||'—'}</div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    {procuracao[cliSel.id]&&<span style={{ fontSize:11, padding:'3px 9px', borderRadius:8, background:'#F0FDF4', color:'#16a34a', fontWeight:700 }}>📜 Procuração ativa</span>}
                    {certSel&&<span style={{ fontSize:11, padding:'3px 9px', borderRadius:8, background:'#EBF5FF', color:'#1D6FA4', fontWeight:700 }}>🔐 {certSel.tipo} — {certSel.tipo_cert}</span>}
                  </div>
                </div>

                {/* Cards de relatórios */}
                {RELATORIOS.filter(r=>relSel.includes(r.id)).map(r=>{
                  const uc   = ultimaConsulta(cliSel.id, r.id)
                  const stUC = stCor(uc?.status)
                  const exp  = expandidos[r.id]
                  const histRel = historico.filter(h=>String(h.cliente_id)===String(cliSel.id)&&h.relatorio_id===r.id)
                  return (
                    <div key={r.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #e8e8e8', marginBottom:12, overflow:'hidden' }}>
                      <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:42, height:42, borderRadius:10, background:r.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{r.icon}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:NAVY }}>{r.label}</div>
                          <div style={{ fontSize:11, color:'#888', marginTop:1 }}>{r.desc}</div>
                          {uc&&<div style={{ fontSize:11, marginTop:4, color:stUC.cor, fontWeight:600 }}>{stUC.ic} Última consulta: {uc.status} · {fmtData(uc.data)}</div>}
                        </div>
                        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                          <button onClick={()=>setModalLog(r)} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, background:'#f0f4ff', color:NAVY, fontWeight:600, fontSize:12, border:`1px solid ${NAVY}30`, cursor:'pointer' }}>
                            📝 Registrar
                          </button>
                          <button onClick={()=>abrirRelatorio(r)} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, background:r.bg, color:r.cor, fontWeight:700, fontSize:12, border:`1px solid ${r.cor}30`, cursor:'pointer' }}>
                            <ExternalLink size={12}/> Acessar
                          </button>
                          {histRel.length>0&&(
                            <button onClick={()=>setExpandidos(e=>({...e,[r.id]:!e[r.id]}))} style={{ padding:'6px 8px', borderRadius:8, background:'#f5f5f5', color:'#888', border:'none', cursor:'pointer' }}>
                              {exp?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Histórico expandido */}
                      {exp&&histRel.length>0&&(
                        <div style={{ borderTop:'1px solid #f0f0f0', padding:'8px 18px 12px' }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'#aaa', textTransform:'uppercase', marginBottom:8 }}>Histórico de consultas</div>
                          {histRel.slice(0,5).map((h,i)=>{
                            const st2 = stCor(h.status)
                            return (
                              <div key={h.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 10px', borderRadius:8, background:i%2===0?'#fafafa':'#fff', marginBottom:3 }}>
                                <span style={{ fontSize:11, padding:'2px 7px', borderRadius:6, background:st2.bg, color:st2.cor, fontWeight:700, whiteSpace:'nowrap' }}>{st2.ic} {h.status}</span>
                                <span style={{ fontSize:11, color:'#555', flex:1 }}>{h.obs||'—'}</span>
                                <span style={{ fontSize:10, color:'#aaa', whiteSpace:'nowrap' }}>{fmtData(h.data)}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── ABA DASHBOARD ── */}
      {aba==='dashboard' && (
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', background:'#f8f9fb' }}>

          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
            {[
              { n:clientes.filter(c=>c.ativo!==false).length, l:'Clientes Ativos', cor:'#1D6FA4', bg:'#EBF5FF', ic:Building2 },
              { n:Object.values(procuracao).filter(Boolean).length, l:'Com Procuração e-CAC', cor:'#16a34a', bg:'#F0FDF4', ic:CheckCircle },
              { n:clientes.filter(c=>!procuracao[c.id]&&c.ativo!==false).length, l:'Sem Procuração', cor:'#f59e0b', bg:'#FEF9C3', ic:AlertTriangle },
              { n:clientesDash.filter(c=>c.pendente).length, l:'Com Pendências Fiscais', cor:'#dc2626', bg:'#FEF2F2', ic:AlertTriangle },
            ].map(s=>{ const Ic=s.ic; return (
              <div key={s.l} style={{ background:'#fff', borderRadius:12, padding:'14px 18px', border:`1px solid ${s.cor}20`, display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:42, height:42, borderRadius:10, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center' }}><Ic size={20} style={{ color:s.cor }}/></div>
                <div><div style={{ fontSize:22, fontWeight:800, color:s.cor }}>{s.n}</div><div style={{ fontSize:11, color:'#888' }}>{s.l}</div></div>
              </div>
            )})}
          </div>

          {/* Filtro dashboard */}
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            <div style={{ position:'relative', flex:1, maxWidth:320 }}>
              <Search size={12} style={{ position:'absolute', left:8, top:8, color:'#bbb' }}/>
              <input value={filtroCliDash} onChange={e=>setFiltroCliDash(e.target.value)} placeholder="Filtrar cliente..." style={{ ...inp, paddingLeft:26, fontSize:12 }}/>
            </div>
          </div>

          {/* Tabela situação fiscal por cliente */}
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e8e8e8', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:NAVY }}>
                  {['Cliente','CNPJ','Regime','Procuração','Certificado','Última Consulta','Situação','Ações'].map(h=>(
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#fff', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientesDash.filter(c=>c.ativo!==false).map((c,i)=>{
                  const certsCl = certs.filter(x=>String(x.cliente_id)===String(c.id))
                  const uc      = c.histCli[0]
                  const stUC    = stCor(uc?.status)
                  return (
                    <tr key={c.id} style={{ background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f5f5f5' }}>
                      <td style={{ padding:'10px 14px', fontWeight:600, color:NAVY }}>{c.nome}</td>
                      <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:11, color:'#555' }}>{c.cnpj}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:'#EBF5FF', color:'#1D6FA4', fontWeight:600 }}>{(c.tributacao||c.regime||'—').replace(' Nacional','').replace(' Presumido','')}</span>
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <button onClick={()=>toggleProcuracao(c.id)} style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:7, fontSize:11, fontWeight:700, border:'none', cursor:'pointer', background:procuracao[c.id]?'#F0FDF4':'#FEF2F2', color:procuracao[c.id]?'#16a34a':'#dc2626' }}>
                          {procuracao[c.id]?'✓ Ativa':'✗ Inativa'}
                        </button>
                      </td>
                      <td style={{ padding:'10px 14px', fontSize:11, color:'#555' }}>
                        {certsCl.length>0
                          ? <span style={{ color:'#16a34a', fontWeight:600 }}>🔐 {certsCl.length} cert.</span>
                          : <span style={{ color:'#ccc' }}>—</span>
                        }
                      </td>
                      <td style={{ padding:'10px 14px', fontSize:11, color:'#888' }}>
                        {uc ? <><b style={{ color:'#555' }}>{uc.relatorio?.split('—')[0]}</b><br/>{fmtData(uc.data)}</> : <span style={{ color:'#ccc', fontStyle:'italic' }}>Não consultado</span>}
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        {uc
                          ? <span style={{ fontSize:11, padding:'3px 9px', borderRadius:8, fontWeight:700, background:stUC.bg, color:stUC.cor }}>{stUC.ic} {uc.status}</span>
                          : <span style={{ fontSize:11, padding:'3px 9px', borderRadius:8, background:'#f5f5f5', color:'#aaa', fontWeight:600 }}>⭕ Não consultado</span>
                        }
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <button onClick={()=>{ setCliSel(c); setRelSel(['sit_fiscal','certidao_neg']); setAba('consulta') }}
                          style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:7, background:'#EBF5FF', color:'#1D6FA4', border:'none', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                          <Search size={11}/> Consultar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ABA HISTÓRICO ── */}
      {aba==='historico' && (
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', background:'#f8f9fb' }}>
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e8e8e8', overflow:'hidden' }}>
            <div style={{ padding:'12px 18px', borderBottom:'1px solid #f0f0f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:700, color:NAVY, fontSize:13 }}>📋 Histórico de Consultas Fiscais</div>
              <span style={{ fontSize:12, color:'#aaa' }}>{historico.length} registro(s)</span>
            </div>
            {historico.length===0
              ? <div style={{ padding:40, textAlign:'center', color:'#ccc' }}>Nenhuma consulta registrada ainda.</div>
              : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:'#f8f9fb', borderBottom:'2px solid #e8e8e8' }}>
                      {['Data','Cliente','CNPJ','Relatório','Status','Obs.','Usuário'].map(h=>(
                        <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((h,i)=>{
                      const st = stCor(h.status)
                      return (
                        <tr key={h.id} style={{ background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0' }}>
                          <td style={{ padding:'9px 14px', color:'#555', whiteSpace:'nowrap' }}>{fmtData(h.data)}</td>
                          <td style={{ padding:'9px 14px', fontWeight:600, color:NAVY }}>{h.cliente_nome}</td>
                          <td style={{ padding:'9px 14px', fontFamily:'monospace', fontSize:11, color:'#888' }}>{h.cnpj}</td>
                          <td style={{ padding:'9px 14px', fontSize:11, color:'#555' }}>{h.relatorio}</td>
                          <td style={{ padding:'9px 14px' }}>
                            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:7, fontWeight:700, background:st.bg, color:st.cor }}>{st.ic} {h.status}</span>
                          </td>
                          <td style={{ padding:'9px 14px', fontSize:11, color:'#888', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h.obs||'—'}</td>
                          <td style={{ padding:'9px 14px', fontSize:11, color:'#888' }}>{h.usuario}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            }
          </div>
        </div>
      )}

      {/* ── Modal Registrar Resultado ── */}
      {modalLog && cliSel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:480, padding:26 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:700, color:NAVY, fontSize:14 }}>📝 Registrar Resultado</div>
                <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{modalLog.icon} {modalLog.label} · {cliSel.nome}</div>
              </div>
              <button onClick={()=>setModalLog(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#aaa' }}><X size={18}/></button>
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Data da Consulta</label>
              <input type="date" value={logForm.data} onChange={e=>setLogForm(f=>({...f,data:e.target.value}))} style={inp}/>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Situação Encontrada</label>
              <select value={logForm.status} onChange={e=>setLogForm(f=>({...f,status:e.target.value}))} style={{ ...inp, cursor:'pointer' }}>
                {STATUS_OPTS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Observações</label>
              <textarea value={logForm.obs} onChange={e=>setLogForm(f=>({...f,obs:e.target.value}))} placeholder="Detalhes, valores, prazos..." style={{ ...inp, height:80, resize:'vertical', fontFamily:'inherit' }}/>
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>setModalLog(null)} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #ddd', background:'#fff', cursor:'pointer', fontSize:13 }}>Cancelar</button>
              <button onClick={registrarConsulta} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 22px', borderRadius:8, background:'#22c55e', color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
                <CheckCircle size={14}/> Salvar Resultado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
