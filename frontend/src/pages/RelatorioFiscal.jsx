import { useState, useEffect } from 'react'
import { Search, Shield, ExternalLink, CheckCircle, AlertTriangle, Clock, FileText, Building2, RefreshCw, ChevronDown, ChevronUp, X, Loader, Zap } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD  = '#C5A55A'
const API   = '/api/v1'
const inp   = { padding:'7px 10px', borderRadius:6, border:'1px solid #ddd', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', color:'#333' }

const fmtData = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('pt-BR') } catch { return d } }
const hoje = () => new Date().toISOString().split('T')[0]
const limparCNPJ = (c) => (c||'').replace(/\D/g,'')

const STATUS_OPTS = ['Sem pendências','Pendências regularizadas','Pendente — débitos','Pendente — cadastral','Irregular','Não consultado']

const stCor = (st) => {
  if (!st) return { cor:'#aaa', bg:'#f5f5f5', ic:'—' }
  if (st.includes('Pendente')||st==='Irregular') return { cor:'#dc2626', bg:'#FEF2F2', ic:'⚠' }
  if (st==='Sem pendências'||st==='Pendências regularizadas'||st==='Regular') return { cor:'#16a34a', bg:'#F0FDF4', ic:'✓' }
  return { cor:'#888', bg:'#f5f5f5', ic:'?' }
}

const PORTAIS = [
  { id:'cnpj_dados',  label:'Dados Cadastrais CNPJ',     icon:'🏢', cor:'#1D6FA4', bg:'#EBF5FF', auto:true,  endpoint: (cnpj) => `/cnpj/${cnpj}`,     desc:'Situação cadastral, sócios, endereço' },
  { id:'simples',     label:'Simples Nacional',           icon:'💼', cor:'#1A7A3C', bg:'#EDFBF1', auto:true,  endpoint: (cnpj) => `/simples/${cnpj}`,  desc:'Situação de optante, DAS em aberto' },
  { id:'pgfn',        label:'PGFN — Dívida Ativa',        icon:'⚠️', cor:'#dc2626', bg:'#FEF2F2', auto:true,  endpoint: (cnpj) => `/pgfn/${cnpj}`,     desc:'Inscrições em dívida ativa da União' },
  { id:'completo',    label:'Consulta Completa (todos)',   icon:'🔍', cor:NAVY,      bg:'#f0f4ff', auto:true,  endpoint: (cnpj) => `/completo/${cnpj}`, desc:'CNPJ + Simples + PGFN de uma vez' },
  { id:'certidao',    label:'CND / Certidão Negativa',     icon:'✅', cor:'#16a34a', bg:'#F0FDF4', auto:false, url: 'https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir', desc:'Emissão na Receita Federal' },
  { id:'ecac_sit',    label:'e-CAC — Situação Fiscal',     icon:'🏛️', cor:'#6B3EC9', bg:'#F3EEFF', auto:false, url: 'https://cav.receita.fazenda.gov.br/autenticacao/login', desc:'Requer certificado + procuração', requerCert:true },
  { id:'ecac_decl',   label:'e-CAC — Declarações',         icon:'📋', cor:'#6B3EC9', bg:'#F3EEFF', auto:false, url: 'https://cav.receita.fazenda.gov.br/autenticacao/login', desc:'DCTF, ECF, ECD — requer certificado', requerCert:true },
  { id:'ecac_parc',   label:'e-CAC — Parcelamentos',       icon:'💳', cor:'#f59e0b', bg:'#FEF9C3', auto:false, url: 'https://cav.receita.fazenda.gov.br/autenticacao/login', desc:'PERT, REFIS — requer certificado', requerCert:true },
  { id:'nfe',         label:'NF-e Destinadas',             icon:'🧾', cor:'#854D0E', bg:'#FEF9C3', auto:false, url: 'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=completa&tipoConteudo=XbSeqxE8pl8=', desc:'Manifestação de NF-e' },
]

export default function RelatorioFiscal() {
  const [aba,         setAba]         = useState('consulta')
  const [clientes,    setClientes]    = useState([])
  const [certs,       setCerts]       = useState([])
  const [cliSel,      setCliSel]      = useState(null)
  const [certSel,     setCertSel]     = useState(null)
  const [portalSel,   setPortalSel]   = useState([])
  const [historico,   setHistorico]   = useState([])
  const [procuracao,  setProcuracao]  = useState({})
  const [busca,       setBusca]       = useState('')
  const [resultados,  setResultados]  = useState({})
  const [carregando,  setCarregando]  = useState({})
  const [modalLog,    setModalLog]    = useState(null)
  const [logForm,     setLogForm]     = useState({ status:'Sem pendências', obs:'', data:hoje() })
  const [expandidos,  setExpandidos]  = useState({})
  const [filtroCliDash,setFiltroCliDash]=useState('')

  useEffect(() => {
    try { setClientes(JSON.parse(localStorage.getItem('ep_clientes')||'[]')) } catch {}
    try { setCerts(JSON.parse(localStorage.getItem('ep_certificados')||'[]')) } catch {}
    try { setHistorico(JSON.parse(localStorage.getItem('ep_hist_fiscal')||'[]')) } catch {}
    try { setProcuracao(JSON.parse(localStorage.getItem('ep_procuracao')||'{}')) } catch {}
  }, [])

  const salvarHistorico = (nova) => { setHistorico(nova); localStorage.setItem('ep_hist_fiscal', JSON.stringify(nova)) }
  const toggleProcuracao = (id) => { const n={...procuracao,[id]:!procuracao[id]}; setProcuracao(n); localStorage.setItem('ep_procuracao',JSON.stringify(n)) }

  const certsCli = certs.filter(c=>String(c.cliente_id)===String(cliSel?.id))
  const togglePortal = (id) => setPortalSel(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])

  // ── Busca automática no backend ──────────────────────────────────────────
  const consultarAuto = async (portal) => {
    if (!cliSel) return
    const cnpj = limparCNPJ(cliSel.cnpj)
    setCarregando(c=>({...c,[portal.id]:true}))
    try {
      const r = await fetch(`${API}/consulta-fiscal${portal.endpoint(cnpj)}`)
      if (r.ok) {
        const dados = await r.json()
        setResultados(prev=>({...prev,[portal.id]:dados}))

        // Auto-registrar no histórico
        const st = dados.resumo?.situacao_geral || dados.situacao || (dados.situacao_cadastral?.toLowerCase().includes('ativa')?'Sem pendências':'Verificar')
        const nova = [{
          id: Date.now(), cliente_id: cliSel.id, cliente_nome: cliSel.nome, cnpj: cliSel.cnpj,
          relatorio_id: portal.id, relatorio: portal.label,
          status: st.includes('Regular')||st.includes('Sem')?'Sem pendências':st.includes('Irregular')||st.includes('Pendente')?'Pendente — débitos':'Não consultado',
          obs: dados.resumo?.pendencias?.join(', ') || dados.mensagem || '',
          data: hoje(), usuario: 'Sistema (automático)',
        }, ...historico]
        salvarHistorico(nova)
      } else {
        setResultados(prev=>({...prev,[portal.id]:{ erro:true, mensagem:`Erro ${r.status}` }}))
      }
    } catch (e) {
      setResultados(prev=>({...prev,[portal.id]:{ erro:true, mensagem:'Backend indisponível — use acesso manual' }}))
    }
    setCarregando(c=>({...c,[portal.id]:false}))
  }

  const consultarTodosAuto = async () => {
    const portaisAuto = PORTAIS.filter(p=>p.auto&&portalSel.includes(p.id))
    await Promise.all(portaisAuto.map(p=>consultarAuto(p)))
  }

  const registrarConsulta = () => {
    if (!cliSel||!modalLog) return
    const nova = [{ id:Date.now(), cliente_id:cliSel.id, cliente_nome:cliSel.nome, cnpj:cliSel.cnpj, relatorio_id:modalLog.id, relatorio:modalLog.label, status:logForm.status, obs:logForm.obs, data:logForm.data, usuario:'Eduardo Pimentel' }, ...historico]
    salvarHistorico(nova); setModalLog(null); setLogForm({status:'Sem pendências',obs:'',data:hoje()})
  }

  const ultimaConsulta = (cliId, relId) => historico.find(h=>String(h.cliente_id)===String(cliId)&&h.relatorio_id===relId)

  const clientesDash = clientes.filter(c=>!filtroCliDash||c.nome?.toLowerCase().includes(filtroCliDash.toLowerCase())).map(c=>{
    const histCli = historico.filter(h=>String(h.cliente_id)===String(c.id))
    const certsCl = certs.filter(x=>String(x.cliente_id)===String(c.id))
    const pendente = histCli.some(h=>h.status?.includes('Pendente')||h.status==='Irregular')
    const ok = histCli.some(h=>h.status==='Sem pendências')&&!pendente
    return { ...c, histCli, temCert:certsCl.length>0, temProc:procuracao[c.id]||false, pendente, ok, semConsult:histCli.length===0, totalConsultas:histCli.length }
  })

  // ── Renderizar resultado da consulta ──────────────────────────────────────
  const RenderResultado = ({ portalId }) => {
    const r = resultados[portalId]
    if (!r) return null
    if (r.erro) return <div style={{ marginTop:8, padding:'8px 12px', borderRadius:7, background:'#FEF9C3', border:'1px solid #fde68a', fontSize:11, color:'#854D0E' }}>⚠ {r.mensagem}</div>

    const campos = []
    if (r.razao_social)         campos.push(['Razão Social', r.razao_social])
    if (r.situacao_cadastral)   campos.push(['Situação', r.situacao_cadastral])
    if (r.natureza_juridica)    campos.push(['Natureza Jurídica', r.natureza_juridica])
    if (r.atividade_principal)  campos.push(['Atividade Principal', r.atividade_principal])
    if (r.capital_social)       campos.push(['Capital Social', `R$ ${Number(r.capital_social).toLocaleString('pt-BR',{minimumFractionDigits:2})}`])
    if (r.regime)               campos.push(['Regime', r.regime])
    if (r.optante_simples!==undefined) campos.push(['Optante Simples', r.optante_simples?'Sim':'Não'])
    if (r.possui_debito!==undefined)   campos.push(['Dívida Ativa PGFN', r.possui_debito?'SIM — possui débito':'Não consta'])
    if (r.situacao)             campos.push(['Situação PGFN', r.situacao])
    if (r.resumo)               campos.push(['Situação Geral', r.resumo.situacao_geral])
    if (r.resumo?.pendencias?.length) campos.push(['Pendências', r.resumo.pendencias.join(', ')])

    const cor = r.resumo?.situacao_geral==='Regular'||r.situacao_cadastral?.toLowerCase().includes('ativa')?'#F0FDF4':'#FEF2F2'

    return (
      <div style={{ marginTop:8, padding:'10px 12px', borderRadius:8, background:cor, border:'1px solid #e8e8e8', fontSize:11 }}>
        {campos.map(([k,v])=>(
          <div key={k} style={{ display:'flex', gap:8, marginBottom:3 }}>
            <span style={{ color:'#888', minWidth:140, fontWeight:600 }}>{k}:</span>
            <span style={{ color:NAVY, fontWeight:500 }}>{v}</span>
          </div>
        ))}
        {r.socios?.length>0&&(
          <div style={{ marginTop:6 }}>
            <span style={{ color:'#888', fontWeight:600 }}>Sócios: </span>
            {r.socios.map(s=><span key={s.nome_socio} style={{ marginRight:8, color:NAVY }}>{s.nome_socio} ({s.qualificacao_socio})</span>)}
          </div>
        )}
        {r.endereco?.municipio&&<div style={{ marginTop:3, color:'#888' }}>📍 {r.endereco.logradouro}, {r.endereco.numero} — {r.endereco.municipio}/{r.endereco.uf}</div>}
        <div style={{ marginTop:4, color:'#aaa', fontSize:10 }}>Consultado em: {new Date(r.consultado_em).toLocaleString('pt-BR')}</div>
      </div>
    )
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
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <a href="https://cav.receita.fazenda.gov.br" target="_blank" rel="noreferrer"
            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, background:'#EBF5FF', color:'#1D6FA4', fontSize:12, fontWeight:600, border:'1px solid #1D6FA430', textDecoration:'none' }}>
            <ExternalLink size={12}/> Abrir e-CAC
          </a>
        </div>
      </div>

      {/* ── ABA CONSULTA ── */}
      {aba==='consulta' && (
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

          {/* Sidebar */}
          <div style={{ width:290, background:'#fff', borderRight:'1px solid #e8e8e8', display:'flex', flexDirection:'column', flexShrink:0, overflowY:'auto' }}>

            {/* Busca cliente */}
            <div style={{ padding:'14px 16px', borderBottom:'1px solid #f0f0f0' }}>
              <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:8 }}>Cliente</div>
              <div style={{ position:'relative', marginBottom:8 }}>
                <Search size={12} style={{ position:'absolute', left:8, top:8, color:'#bbb' }}/>
                <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar..." style={{ ...inp, paddingLeft:26, fontSize:12 }}/>
              </div>
              <select value={cliSel?.id||''} onChange={e=>{ const c=clientes.find(x=>String(x.id)===e.target.value); setCliSel(c||null); setCertSel(null); setPortalSel([]); setResultados({}) }} style={{ ...inp, cursor:'pointer', fontSize:12 }}>
                <option value="">Selecione o cliente...</option>
                {clientes.filter(c=>!busca||c.nome?.toLowerCase().includes(busca.toLowerCase())).map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            {cliSel&&<>
              {/* Info + Procuração */}
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #f0f0f0', background:'#f8f9fb' }}>
                <div style={{ fontSize:12, fontWeight:700, color:NAVY }}>{cliSel.nome}</div>
                <div style={{ fontSize:11, color:'#888', fontFamily:'monospace', marginTop:2 }}>{cliSel.cnpj}</div>
                <div style={{ fontSize:11, color:'#aaa' }}>{cliSel.tributacao||cliSel.regime}</div>
                <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8 }}>
                  <input type="checkbox" checked={procuracao[cliSel.id]||false} onChange={()=>toggleProcuracao(cliSel.id)} style={{ accentColor:NAVY, width:14, height:14 }}/>
                  <span style={{ fontSize:11, color:NAVY, fontWeight:600 }}>📜 Procuração e-CAC ativa</span>
                </div>
                {!procuracao[cliSel.id]&&<div style={{ marginTop:5, fontSize:10, color:'#f59e0b', padding:'4px 8px', borderRadius:6, background:'#FEF9C3' }}>⚠ e-CAC limitado sem procuração</div>}
              </div>

              {/* Certificado */}
              {certsCli.length>0&&(
                <div style={{ padding:'10px 16px', borderBottom:'1px solid #f0f0f0' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#aaa', textTransform:'uppercase', marginBottom:5 }}>Certificado</div>
                  <select value={certSel?.id||''} onChange={e=>setCertSel(certsCli.find(x=>String(x.id)===e.target.value)||null)} style={{ ...inp, cursor:'pointer', fontSize:11 }}>
                    <option value="">Selecionar...</option>
                    {certsCli.map(c=><option key={c.id} value={c.id}>{c.tipo} — {c.tipo_cert}{c.tipo==='PF'?` (${c.responsavel_nome})`:''}</option>)}
                  </select>
                  {certSel&&<div style={{ fontSize:10, color:'#16a34a', marginTop:4 }}>✓ Válido até {fmtData(certSel.validade)}</div>}
                </div>
              )}

              {/* Portais */}
              <div style={{ padding:'12px 16px', flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#aaa', textTransform:'uppercase' }}>Relatórios</div>
                  <button onClick={()=>setPortalSel(portalSel.length===PORTAIS.length?[]:PORTAIS.map(p=>p.id))} style={{ fontSize:10, color:NAVY, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
                    {portalSel.length===PORTAIS.length?'Nenhum':'Todos'}
                  </button>
                </div>

                {/* Automáticos */}
                <div style={{ fontSize:9, color:NAVY, fontWeight:700, textTransform:'uppercase', marginBottom:5, padding:'3px 6px', background:'#EBF5FF', borderRadius:5 }}>⚡ Automáticos (sem login)</div>
                {PORTAIS.filter(p=>p.auto).map(p=>{
                  const uc = ultimaConsulta(cliSel.id, p.id)
                  const chk = portalSel.includes(p.id)
                  return (
                    <label key={p.id} style={{ display:'flex', alignItems:'flex-start', gap:7, padding:'5px 0', cursor:'pointer' }}>
                      <input type="checkbox" checked={chk} onChange={()=>togglePortal(p.id)} style={{ accentColor:NAVY, width:13, height:13, marginTop:2 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:NAVY }}>{p.icon} {p.label}</div>
                        {uc&&<div style={{ fontSize:9, color:stCor(uc.status).cor }}>{stCor(uc.status).ic} {uc.status} · {fmtData(uc.data)}</div>}
                      </div>
                    </label>
                  )
                })}

                {/* Manuais */}
                <div style={{ fontSize:9, color:'#6B3EC9', fontWeight:700, textTransform:'uppercase', marginBottom:5, marginTop:10, padding:'3px 6px', background:'#F3EEFF', borderRadius:5 }}>🔐 Requerem login (e-CAC)</div>
                {PORTAIS.filter(p=>!p.auto).map(p=>{
                  const uc   = ultimaConsulta(cliSel.id, p.id)
                  const bloq = p.requerCert&&!certSel&&!procuracao[cliSel.id]
                  return (
                    <label key={p.id} style={{ display:'flex', alignItems:'flex-start', gap:7, padding:'5px 0', cursor:bloq?'not-allowed':'pointer', opacity:bloq?.55:1 }}>
                      <input type="checkbox" checked={portalSel.includes(p.id)} onChange={()=>!bloq&&togglePortal(p.id)} disabled={bloq} style={{ accentColor:NAVY, width:13, height:13, marginTop:2 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:NAVY }}>{p.icon} {p.label}</div>
                        {bloq&&<div style={{ fontSize:9, color:'#f59e0b' }}>⚠ Requer certificado</div>}
                        {uc&&<div style={{ fontSize:9, color:stCor(uc.status).cor }}>{stCor(uc.status).ic} {uc.status} · {fmtData(uc.data)}</div>}
                      </div>
                    </label>
                  )
                })}
              </div>
            </>}
          </div>

          {/* Conteúdo principal */}
          <div style={{ flex:1, overflowY:'auto', background:'#f8f9fb', padding:16 }}>
            {!cliSel ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#ccc' }}>
                <FileText size={48} style={{ marginBottom:12, opacity:.3 }}/>
                <div style={{ fontSize:14, fontWeight:700 }}>Selecione um cliente</div>
                <div style={{ fontSize:12, marginTop:4 }}>para consultar relatórios fiscais</div>
              </div>
            ) : portalSel.length===0 ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#ccc' }}>
                <CheckCircle size={48} style={{ marginBottom:12, opacity:.3 }}/>
                <div style={{ fontSize:14, fontWeight:700 }}>Selecione os relatórios</div>
              </div>
            ) : (
              <>
                {/* Barra de ação */}
                <div style={{ background:'#fff', borderRadius:10, padding:'12px 16px', marginBottom:14, border:'1px solid #e8e8e8', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:NAVY }}>{cliSel.nome}</div>
                    <div style={{ fontSize:11, color:'#888' }}>{cliSel.cnpj} · {portalSel.length} relatório(s) selecionado(s)</div>
                  </div>
                  <button onClick={consultarTodosAuto}
                    disabled={!portalSel.some(id=>PORTAIS.find(p=>p.id===id)?.auto)}
                    style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:9, background:NAVY, color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
                    <Zap size={14}/> Consultar Automaticamente
                  </button>
                </div>

                {/* Cards */}
                {PORTAIS.filter(p=>portalSel.includes(p.id)).map(p=>{
                  const uc       = ultimaConsulta(cliSel.id, p.id)
                  const stUC     = stCor(uc?.status)
                  const loading  = carregando[p.id]
                  const res      = resultados[p.id]
                  const exp      = expandidos[p.id]
                  const histRel  = historico.filter(h=>String(h.cliente_id)===String(cliSel.id)&&h.relatorio_id===p.id)

                  return (
                    <div key={p.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #e8e8e8', marginBottom:10, overflow:'hidden' }}>
                      <div style={{ padding:'14px 16px', display:'flex', alignItems:'flex-start', gap:12 }}>
                        <div style={{ width:42, height:42, borderRadius:10, background:p.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{p.icon}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                            <span style={{ fontSize:13, fontWeight:700, color:NAVY }}>{p.label}</span>
                            {p.auto&&<span style={{ fontSize:9, padding:'1px 6px', borderRadius:5, background:'#EBF5FF', color:'#1D6FA4', fontWeight:700 }}>⚡ AUTO</span>}
                            {!p.auto&&<span style={{ fontSize:9, padding:'1px 6px', borderRadius:5, background:'#F3EEFF', color:'#6B3EC9', fontWeight:700 }}>🔐 MANUAL</span>}
                          </div>
                          <div style={{ fontSize:11, color:'#888' }}>{p.desc}</div>
                          {uc&&<div style={{ fontSize:11, marginTop:4, color:stUC.cor, fontWeight:600 }}>{stUC.ic} {uc.status} · {fmtData(uc.data)}</div>}
                          {/* Resultado automático */}
                          {(res||loading)&&<RenderResultado portalId={p.id}/>}
                          {loading&&<div style={{ display:'flex', alignItems:'center', gap:7, marginTop:8, fontSize:12, color:'#888' }}><Loader size={13} style={{ animation:'spin 1s linear infinite' }}/> Consultando automaticamente...</div>}
                        </div>
                        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                          {p.auto
                            ? <button onClick={()=>consultarAuto(p)} disabled={loading} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, background:'#EBF5FF', color:'#1D6FA4', fontWeight:700, fontSize:12, border:'1px solid #1D6FA430', cursor:'pointer' }}>
                                {loading?<Loader size={11} style={{ animation:'spin 1s linear infinite' }}/>:<Zap size={11}/>} {loading?'Buscando...':'Buscar'}
                              </button>
                            : <button onClick={()=>window.open(p.url,'_blank')} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, background:p.bg, color:p.cor, fontWeight:700, fontSize:12, border:`1px solid ${p.cor}30`, cursor:'pointer' }}>
                                <ExternalLink size={11}/> Acessar
                              </button>
                          }
                          <button onClick={()=>setModalLog(p)} style={{ padding:'6px 10px', borderRadius:8, background:'#f0f4ff', color:NAVY, fontWeight:600, fontSize:12, border:`1px solid ${NAVY}30`, cursor:'pointer' }}>📝</button>
                          {histRel.length>0&&<button onClick={()=>setExpandidos(e=>({...e,[p.id]:!e[p.id]}))} style={{ padding:'6px 8px', borderRadius:8, background:'#f5f5f5', color:'#888', border:'none', cursor:'pointer' }}>
                            {exp?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
                          </button>}
                        </div>
                      </div>

                      {exp&&histRel.length>0&&(
                        <div style={{ borderTop:'1px solid #f0f0f0', padding:'8px 16px 12px' }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'#aaa', textTransform:'uppercase', marginBottom:6 }}>Histórico</div>
                          {histRel.slice(0,4).map((h,i)=>{ const s=stCor(h.status); return (
                            <div key={h.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', borderRadius:7, background:i%2===0?'#fafafa':'#fff', marginBottom:2 }}>
                              <span style={{ fontSize:10, padding:'1px 6px', borderRadius:5, background:s.bg, color:s.cor, fontWeight:700 }}>{s.ic} {h.status}</span>
                              <span style={{ fontSize:11, color:'#555', flex:1 }}>{h.obs||'—'}</span>
                              <span style={{ fontSize:10, color:'#aaa' }}>{fmtData(h.data)} · {h.usuario}</span>
                            </div>
                          )})}
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
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
            {[
              { n:clientes.filter(c=>c.ativo!==false).length,              l:'Clientes Ativos',       cor:'#1D6FA4', bg:'#EBF5FF', ic:Building2 },
              { n:Object.values(procuracao).filter(Boolean).length,         l:'Com Procuração e-CAC', cor:'#16a34a', bg:'#F0FDF4', ic:CheckCircle },
              { n:clientes.filter(c=>!procuracao[c.id]&&c.ativo!==false).length, l:'Sem Procuração', cor:'#f59e0b', bg:'#FEF9C3', ic:AlertTriangle },
              { n:clientesDash.filter(c=>c.pendente).length,                l:'Com Pendências',        cor:'#dc2626', bg:'#FEF2F2', ic:AlertTriangle },
            ].map(s=>{ const Ic=s.ic; return (
              <div key={s.l} style={{ background:'#fff', borderRadius:12, padding:'14px 18px', border:`1px solid ${s.cor}20`, display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:42, height:42, borderRadius:10, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center' }}><Ic size={20} style={{ color:s.cor }}/></div>
                <div><div style={{ fontSize:22, fontWeight:800, color:s.cor }}>{s.n}</div><div style={{ fontSize:11, color:'#888' }}>{s.l}</div></div>
              </div>
            )})}
          </div>

          <div style={{ marginBottom:12 }}>
            <div style={{ position:'relative', maxWidth:300 }}>
              <Search size={12} style={{ position:'absolute', left:8, top:8, color:'#bbb' }}/>
              <input value={filtroCliDash} onChange={e=>setFiltroCliDash(e.target.value)} placeholder="Filtrar cliente..." style={{ ...inp, paddingLeft:26, fontSize:12 }}/>
            </div>
          </div>

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
                  const uc=c.histCli[0]; const st=stCor(uc?.status)
                  return (
                    <tr key={c.id} style={{ background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f5f5f5' }}>
                      <td style={{ padding:'10px 14px', fontWeight:600, color:NAVY, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nome}</td>
                      <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:11, color:'#555' }}>{c.cnpj}</td>
                      <td style={{ padding:'10px 14px' }}><span style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:'#EBF5FF', color:'#1D6FA4', fontWeight:600 }}>{(c.tributacao||c.regime||'—').replace(' Nacional','').replace(' Presumido','')}</span></td>
                      <td style={{ padding:'10px 14px' }}>
                        <button onClick={()=>toggleProcuracao(c.id)} style={{ padding:'3px 9px', borderRadius:7, fontSize:11, fontWeight:700, border:'none', cursor:'pointer', background:procuracao[c.id]?'#F0FDF4':'#FEF2F2', color:procuracao[c.id]?'#16a34a':'#dc2626' }}>
                          {procuracao[c.id]?'✓ Ativa':'✗ Inativa'}
                        </button>
                      </td>
                      <td style={{ padding:'10px 14px', fontSize:11 }}>{c.temCert?<span style={{ color:'#16a34a', fontWeight:600 }}>🔐 Sim</span>:<span style={{ color:'#ccc' }}>—</span>}</td>
                      <td style={{ padding:'10px 14px', fontSize:11, color:'#888' }}>{uc?<><b style={{ color:'#555', display:'block' }}>{uc.relatorio?.split(' —')[0]}</b>{fmtData(uc.data)}</>:<span style={{ color:'#ccc', fontStyle:'italic' }}>Não consultado</span>}</td>
                      <td style={{ padding:'10px 14px' }}>
                        {uc?<span style={{ fontSize:11, padding:'3px 8px', borderRadius:8, fontWeight:700, background:st.bg, color:st.cor }}>{st.ic} {uc.status}</span>:<span style={{ fontSize:11, padding:'3px 8px', borderRadius:8, background:'#f5f5f5', color:'#aaa', fontWeight:600 }}>⭕ Não consultado</span>}
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <button onClick={()=>{ setCliSel(c); setPortalSel(['cnpj_dados','simples','pgfn']); setAba('consulta') }}
                          style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:7, background:'#EBF5FF', color:'#1D6FA4', border:'none', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                          <Zap size={10}/> Consultar
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
            <div style={{ padding:'12px 18px', borderBottom:'1px solid #f0f0f0', display:'flex', justifyContent:'space-between' }}>
              <div style={{ fontWeight:700, color:NAVY, fontSize:13 }}>📋 Histórico de Consultas</div>
              <span style={{ fontSize:12, color:'#aaa' }}>{historico.length} registro(s)</span>
            </div>
            {historico.length===0
              ? <div style={{ padding:40, textAlign:'center', color:'#ccc' }}>Nenhuma consulta registrada.</div>
              : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:'#f8f9fb', borderBottom:'2px solid #e8e8e8' }}>
                      {['Data','Cliente','Relatório','Status','Observações','Usuário'].map(h=>(
                        <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((h,i)=>{ const s=stCor(h.status); return (
                      <tr key={h.id} style={{ background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0' }}>
                        <td style={{ padding:'9px 14px', color:'#555', whiteSpace:'nowrap' }}>{fmtData(h.data)}</td>
                        <td style={{ padding:'9px 14px', fontWeight:600, color:NAVY }}>{h.cliente_nome}</td>
                        <td style={{ padding:'9px 14px', fontSize:11, color:'#555' }}>{h.relatorio}</td>
                        <td style={{ padding:'9px 14px' }}><span style={{ fontSize:11, padding:'2px 8px', borderRadius:7, fontWeight:700, background:s.bg, color:s.cor }}>{s.ic} {h.status}</span></td>
                        <td style={{ padding:'9px 14px', fontSize:11, color:'#888', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h.obs||'—'}</td>
                        <td style={{ padding:'9px 14px', fontSize:11, color:'#888' }}>{h.usuario}</td>
                      </tr>
                    )})}
                  </tbody>
                </table>
            }
          </div>
        </div>
      )}

      {/* Modal Registrar */}
      {modalLog&&cliSel&&(
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:460, padding:26 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <div><div style={{ fontWeight:700, color:NAVY, fontSize:14 }}>📝 Registrar Resultado</div><div style={{ fontSize:11, color:'#888', marginTop:2 }}>{modalLog.icon} {modalLog.label} · {cliSel.nome}</div></div>
              <button onClick={()=>setModalLog(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#aaa' }}><X size={18}/></button>
            </div>
            <div style={{ marginBottom:10 }}><label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Data</label><input type="date" value={logForm.data} onChange={e=>setLogForm(f=>({...f,data:e.target.value}))} style={inp}/></div>
            <div style={{ marginBottom:10 }}><label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Situação</label><select value={logForm.status} onChange={e=>setLogForm(f=>({...f,status:e.target.value}))} style={{ ...inp, cursor:'pointer' }}>{STATUS_OPTS.map(s=><option key={s}>{s}</option>)}</select></div>
            <div style={{ marginBottom:18 }}><label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Observações</label><textarea value={logForm.obs} onChange={e=>setLogForm(f=>({...f,obs:e.target.value}))} placeholder="Valores, prazos, detalhes..." style={{ ...inp, height:70, resize:'vertical', fontFamily:'inherit' }}/></div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>setModalLog(null)} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #ddd', background:'#fff', cursor:'pointer', fontSize:13 }}>Cancelar</button>
              <button onClick={registrarConsulta} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 22px', borderRadius:8, background:'#22c55e', color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}><CheckCircle size={14}/> Salvar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
