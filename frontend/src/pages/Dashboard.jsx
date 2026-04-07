import { useState, useEffect } from 'react'
import { Plus, X, Edit2, Save, Trash2, LayoutDashboard, Users, Shield, FileText, AlertTriangle, CheckCircle, Clock, TrendingUp, Building2, User, RefreshCw, ChevronDown, ChevronUp, GripVertical } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'

const statusCert = (v) => {
  if (!v) return null
  return Math.ceil((new Date(v) - new Date()) / (1000*60*60*24))
}

const fmtData = (d) => { try { return new Date(d).toLocaleDateString('pt-BR') } catch { return d||'—' } }

// ── Tipos de widgets disponíveis ─────────────────────────────────────────────
const WIDGETS_DISPONIVEIS = [
  { tipo:'kpi_clientes',     label:'KPIs — Clientes',             icon:Users,          desc:'Total, ativos, inativos' },
  { tipo:'kpi_certificados', label:'KPIs — Certificados',         icon:Shield,         desc:'Válidos, vencidos, alertas' },
  { tipo:'kpi_obrigacoes',   label:'KPIs — Obrigações',           icon:FileText,       desc:'Vinculadas por regime' },
  { tipo:'grafico_regime',   label:'Gráfico — Clientes por Regime',icon:TrendingUp,    desc:'Barras por tributação' },
  { tipo:'grafico_certs',    label:'Gráfico — Certificados PJ/PF', icon:Shield,        desc:'Distribuição por tipo' },
  { tipo:'top_obrigacoes',   label:'Ranking — Top Obrigações',    icon:FileText,       desc:'Clientes com mais obrigações' },
  { tipo:'alertas_cert',     label:'Alertas — Certificados',      icon:AlertTriangle,  desc:'Próximos vencimentos' },
  { tipo:'sem_obrigacoes',   label:'Lista — Sem Obrigações',      icon:AlertTriangle,  desc:'Clientes sem vínculo' },
  { tipo:'clientes_inativos',label:'Lista — Clientes Inativos',   icon:Users,          desc:'Clientes com status inativo' },
  { tipo:'resumo_geral',     label:'Resumo Geral',                icon:LayoutDashboard,desc:'Visão consolidada do escritório' },
]

const DASHBOARD_PADRAO = {
  id: 1,
  nome: 'Visão Geral',
  cor: NAVY,
  widgets: ['kpi_clientes','kpi_certificados','alertas_cert','grafico_regime','top_obrigacoes','sem_obrigacoes'],
}

// ── Renderizar cada widget ────────────────────────────────────────────────────
function Widget({ tipo, clientes, certs, onRemover, editando }) {
  const vencidos  = certs.filter(c=>{ const d=statusCert(c.validade); return d!==null&&d<0 }).length
  const alerta30  = certs.filter(c=>{ const d=statusCert(c.validade); return d!==null&&d>=0&&d<=30 }).length
  const alerta90  = certs.filter(c=>{ const d=statusCert(c.validade); return d!==null&&d>30&&d<=90 }).length
  const certOk    = certs.filter(c=>{ const d=statusCert(c.validade); return d!==null&&d>90 }).length
  const certPF    = certs.filter(c=>c.tipo==='PF').length
  const certPJ    = certs.filter(c=>c.tipo==='PJ').length
  const totalCli  = clientes.length
  const ativos    = clientes.filter(c=>c.ativo!==false).length
  const inativos  = totalCli - ativos
  const semObrig  = clientes.filter(c=>!(c.obrigacoes_vinculadas||[]).length&&c.ativo!==false).length
  const regimes   = ['Simples Nacional','MEI','Lucro Presumido','Lucro Real','RET','Imune/Isento']
  const distReg   = regimes.map(r=>({ label:r, n:clientes.filter(c=>(c.tributacao||c.regime)===r).length })).filter(x=>x.n>0)
  const topCli    = [...clientes].sort((a,b)=>(b.obrigacoes_vinculadas||[]).length-(a.obrigacoes_vinculadas||[]).length).slice(0,5)
  const maxObrig  = Math.max(...topCli.map(c=>(c.obrigacoes_vinculadas||[]).length),1)
  const certAlert = certs.filter(c=>{ const d=statusCert(c.validade); return d!==null&&d>=0&&d<=90 }).sort((a,b)=>new Date(a.validade)-new Date(b.validade)).slice(0,5)
  const coresReg  = {'Simples Nacional':'#1D6FA4','MEI':'#854D0E','Lucro Real':'#6B3EC9','Lucro Presumido':'#5b21b6','RET':'#1A7A3C','Imune/Isento':'#6B7280'}

  const wrap = (conteudo) => (
    <div style={{ position:'relative', background:'#fff', borderRadius:12, border:'1px solid #e8e8e8', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
      {editando && (
        <button onClick={onRemover} style={{ position:'absolute', top:8, right:8, zIndex:10, width:22, height:22, borderRadius:'50%', background:'#dc2626', color:'#fff', border:'none', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <X size={12}/>
        </button>
      )}
      {conteudo}
    </div>
  )

  const kpiRow = (items) => (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${items.length},1fr)`, gap:0 }}>
      {items.map((it,i)=>{ const Ic=it.ic; return (
        <div key={i} style={{ padding:'14px 16px', borderRight:i<items.length-1?'1px solid #f0f0f0':'none', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:8, background:it.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Ic size={18} style={{ color:it.cor }}/>
          </div>
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:it.cor, lineHeight:1 }}>{it.n}</div>
            <div style={{ fontSize:10, color:'#888', marginTop:2 }}>{it.l}</div>
            {it.sub&&<div style={{ fontSize:9, color:'#aaa' }}>{it.sub}</div>}
          </div>
        </div>
      )})}
    </div>
  )

  if (tipo==='kpi_clientes') return wrap(<>
    <div style={{ padding:'10px 16px 6px', fontWeight:700, color:NAVY, fontSize:12, borderBottom:'1px solid #f5f5f5' }}>👥 Clientes</div>
    {kpiRow([
      { n:totalCli, l:'Total',   cor:'#1D6FA4', bg:'#EBF5FF', ic:Users },
      { n:ativos,   l:'Ativos',  cor:'#16a34a', bg:'#F0FDF4', ic:CheckCircle, sub:`${Math.round(ativos/Math.max(totalCli,1)*100)}%` },
      { n:inativos, l:'Inativos',cor:'#888',    bg:'#f5f5f5', ic:Users },
      { n:semObrig, l:'Sem obrig.',cor:'#f59e0b',bg:'#FEF9C3',ic:AlertTriangle },
    ])}
  </>)

  if (tipo==='kpi_certificados') return wrap(<>
    <div style={{ padding:'10px 16px 6px', fontWeight:700, color:NAVY, fontSize:12, borderBottom:'1px solid #f5f5f5' }}>🔐 Certificados</div>
    {kpiRow([
      { n:certs.length,l:'Total',   cor:'#1D6FA4',bg:'#EBF5FF',ic:Shield },
      { n:certOk,      l:'Válidos', cor:'#16a34a',bg:'#F0FDF4',ic:CheckCircle },
      { n:alerta30,    l:'30 dias', cor:'#f59e0b',bg:'#FEF9C3',ic:Clock },
      { n:vencidos,    l:'Vencidos',cor:'#dc2626',bg:'#FEF2F2',ic:AlertTriangle },
    ])}
  </>)

  if (tipo==='kpi_obrigacoes') return wrap(<>
    <div style={{ padding:'10px 16px 6px', fontWeight:700, color:NAVY, fontSize:12, borderBottom:'1px solid #f5f5f5' }}>📋 Obrigações</div>
    {kpiRow(regimes.slice(0,4).map(r=>({
      n: clientes.filter(c=>(c.tributacao||c.regime)===r).length,
      l: r.replace(' Nacional','').replace(' Presumido','').replace(' Real',''),
      cor: coresReg[r]||'#888', bg: coresReg[r]+'20'||'#f5f5f5', ic: FileText,
    })))}
  </>)

  if (tipo==='grafico_regime') return wrap(<>
    <div style={{ padding:'12px 16px 8px', fontWeight:700, color:NAVY, fontSize:12, borderBottom:'1px solid #f5f5f5' }}>📊 Clientes por Regime</div>
    <div style={{ padding:'12px 16px' }}>
      {distReg.length===0
        ? <div style={{ textAlign:'center', color:'#ccc', padding:16, fontSize:12 }}>Nenhum cliente</div>
        : distReg.map(r=>{
          const pct = Math.round(r.n/Math.max(totalCli,1)*100)
          const cor = coresReg[r.label]||'#888'
          return (
            <div key={r.label} style={{ marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ fontSize:11, fontWeight:600, color:NAVY }}>{r.label}</span>
                <span style={{ fontSize:11, color:'#888' }}>{r.n} ({pct}%)</span>
              </div>
              <div style={{ height:7, background:'#f0f0f0', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, background:cor, borderRadius:4 }}/>
              </div>
            </div>
          )
        })
      }
    </div>
  </>)

  if (tipo==='grafico_certs') return wrap(<>
    <div style={{ padding:'12px 16px 8px', fontWeight:700, color:NAVY, fontSize:12, borderBottom:'1px solid #f5f5f5' }}>🔐 Certificados PJ vs PF</div>
    <div style={{ padding:'12px 16px' }}>
      {[{label:'PJ — Empresa', n:certPJ, cor:NAVY, ic:Building2},{label:'PF — Pessoa Física', n:certPF, cor:'#854D0E', ic:User}].map(t=>{ const Ic=t.ic; const pct=Math.round(t.n/Math.max(certs.length,1)*100); return (
        <div key={t.label} style={{ marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <Ic size={12} style={{ color:t.cor }}/><span style={{ fontSize:11, fontWeight:600, color:NAVY, flex:1 }}>{t.label}</span>
            <span style={{ fontSize:13, fontWeight:800, color:t.cor }}>{t.n}</span>
          </div>
          <div style={{ height:8, background:'#f0f0f0', borderRadius:4, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:t.cor, borderRadius:4 }}/>
          </div>
          <div style={{ fontSize:9, color:'#aaa', marginTop:1 }}>{pct}% do total</div>
        </div>
      )})}
    </div>
  </>)

  if (tipo==='top_obrigacoes') return wrap(<>
    <div style={{ padding:'12px 16px 8px', fontWeight:700, color:NAVY, fontSize:12, borderBottom:'1px solid #f5f5f5' }}>📋 Mais Obrigações</div>
    <div style={{ padding:'8px 16px 12px' }}>
      {topCli.length===0
        ? <div style={{ textAlign:'center', color:'#ccc', padding:12, fontSize:12 }}>Nenhum cliente</div>
        : topCli.map((c,i)=>{
          const n = (c.obrigacoes_vinculadas||[]).length
          return (
            <div key={c.id} style={{ marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                <span style={{ fontSize:11, fontWeight:600, color:NAVY, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'78%' }}>{i+1}. {c.nome}</span>
                <span style={{ fontSize:11, color:GOLD, fontWeight:700 }}>{n}</span>
              </div>
              <div style={{ height:5, background:'#f0f0f0', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${Math.round(n/maxObrig*100)}%`, background:GOLD, borderRadius:4 }}/>
              </div>
            </div>
          )
        })
      }
    </div>
  </>)

  if (tipo==='alertas_cert') return wrap(<>
    <div style={{ padding:'12px 16px 8px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #f5f5f5' }}>
      <span style={{ fontWeight:700, color:NAVY, fontSize:12 }}>⚠ Certificados — Vencimentos</span>
      {certAlert.length>0&&<span style={{ fontSize:10, padding:'2px 7px', borderRadius:8, background:'#FEF9C3', color:'#854D0E', fontWeight:700 }}>{certAlert.length}</span>}
    </div>
    <div style={{ padding:'8px 12px' }}>
      {certAlert.length===0
        ? <div style={{ textAlign:'center', color:'#16a34a', padding:16, fontSize:12 }}>✓ Nenhum próximo do vencimento</div>
        : certAlert.map((c,i)=>{
          const dias = statusCert(c.validade)
          const cor  = dias<=30?'#f59e0b':'#3b82f6'
          return (
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 8px', borderRadius:8, background:i%2===0?'#fafafa':'#fff', marginBottom:3 }}>
              <div style={{ width:32, height:32, borderRadius:7, background:dias<=30?'#FEF9C3':'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:10, fontWeight:800, color:cor }}>{dias}d</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:600, color:NAVY, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.cliente_nome}</div>
                {c.tipo==='PF'&&c.responsavel_nome&&<div style={{ fontSize:9, color:'#888' }}>👤 {c.responsavel_nome}</div>}
                <div style={{ fontSize:9, color:'#aaa' }}>{fmtData(c.validade)}</div>
              </div>
              <span style={{ fontSize:9, padding:'1px 6px', borderRadius:5, background:c.tipo==='PF'?GOLD+'20':NAVY+'15', color:c.tipo==='PF'?'#854D0E':NAVY, fontWeight:700 }}>{c.tipo}</span>
            </div>
          )
        })
      }
    </div>
  </>)

  if (tipo==='sem_obrigacoes') return wrap(<>
    <div style={{ padding:'12px 16px 8px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #f5f5f5' }}>
      <span style={{ fontWeight:700, color:NAVY, fontSize:12 }}>📌 Sem Obrigações Vinculadas</span>
      {semObrig>0&&<span style={{ fontSize:10, padding:'2px 7px', borderRadius:8, background:'#FEF9C3', color:'#854D0E', fontWeight:700 }}>{semObrig}</span>}
    </div>
    <div style={{ padding:'8px 12px' }}>
      {semObrig===0
        ? <div style={{ textAlign:'center', color:'#16a34a', padding:16, fontSize:12 }}>✓ Todos têm obrigações</div>
        : clientes.filter(c=>!(c.obrigacoes_vinculadas||[]).length&&c.ativo!==false).slice(0,6).map((c,i)=>(
          <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 8px', borderRadius:8, background:i%2===0?'#fafafa':'#fff', marginBottom:3 }}>
            <div style={{ width:28, height:28, borderRadius:7, background:NAVY+'15', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:NAVY, flexShrink:0 }}>{(c.nome||'?')[0]}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:600, color:NAVY, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nome}</div>
              <div style={{ fontSize:9, color:'#aaa' }}>{c.tributacao||c.regime||'—'}</div>
            </div>
          </div>
        ))
      }
    </div>
  </>)

  if (tipo==='clientes_inativos') return wrap(<>
    <div style={{ padding:'12px 16px 8px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #f5f5f5' }}>
      <span style={{ fontWeight:700, color:NAVY, fontSize:12 }}>⭕ Clientes Inativos</span>
      <span style={{ fontSize:10, padding:'2px 7px', borderRadius:8, background:'#f5f5f5', color:'#888', fontWeight:700 }}>{inativos}</span>
    </div>
    <div style={{ padding:'8px 12px' }}>
      {inativos===0
        ? <div style={{ textAlign:'center', color:'#16a34a', padding:16, fontSize:12 }}>✓ Todos os clientes ativos</div>
        : clientes.filter(c=>c.ativo===false).slice(0,6).map((c,i)=>(
          <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 8px', borderRadius:8, background:i%2===0?'#fafafa':'#fff', marginBottom:3 }}>
            <div style={{ width:28, height:28, borderRadius:7, background:'#f5f5f5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#888', flexShrink:0 }}>{(c.nome||'?')[0]}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#888', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nome}</div>
              <div style={{ fontSize:9, color:'#aaa' }}>{c.cnpj}</div>
            </div>
          </div>
        ))
      }
    </div>
  </>)

  if (tipo==='resumo_geral') return wrap(<>
    <div style={{ padding:'12px 16px 8px', fontWeight:700, color:NAVY, fontSize:12, borderBottom:'1px solid #f5f5f5' }}>📊 Resumo Geral — EPimentel</div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0 }}>
      {[
        { n:totalCli,      l:'Clientes',     cor:'#1D6FA4', bg:'#EBF5FF' },
        { n:ativos,        l:'Ativos',       cor:'#16a34a', bg:'#F0FDF4' },
        { n:certs.length,  l:'Certificados', cor:'#6B3EC9', bg:'#F3EEFF' },
        { n:vencidos,      l:'Cert Vencidos',cor:'#dc2626', bg:'#FEF2F2' },
        { n:alerta30,      l:'Vencem 30d',   cor:'#f59e0b', bg:'#FEF9C3' },
        { n:semObrig,      l:'Sem Obrig.',   cor:'#f59e0b', bg:'#FEF9C3' },
      ].map((it,i)=>(
        <div key={i} style={{ padding:'12px 14px', borderRight:i%3<2?'1px solid #f5f5f5':'none', borderBottom:i<3?'1px solid #f5f5f5':'none' }}>
          <div style={{ fontSize:20, fontWeight:800, color:it.cor }}>{it.n}</div>
          <div style={{ fontSize:10, color:'#888' }}>{it.l}</div>
        </div>
      ))}
    </div>
  </>)

  return null
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Dashboard() {
  const [dashboards,   setDashboards]   = useState([DASHBOARD_PADRAO])
  const [dashAtual,    setDashAtual]    = useState(0) // índice
  const [editando,     setEditando]     = useState(false)
  const [modalNovo,    setModalNovo]    = useState(false)
  const [modalWidget,  setModalWidget]  = useState(false)
  const [modalRenomear,setModalRenomear]= useState(false)
  const [nomeNovo,     setNomeNovo]     = useState('')
  const [corNova,      setCorNova]      = useState(NAVY)
  const [clientes,     setClientes]     = useState([])
  const [certs,        setCerts]        = useState([])
  const [atualizado,   setAtualizado]   = useState(new Date())

  useEffect(() => {
    // Carregar dashboards salvos
    try {
      const saved = localStorage.getItem('ep_dashboards')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.length > 0) setDashboards(parsed)
      }
    } catch {}
    carregar()
  }, [])

  const carregar = () => {
    try { setClientes(JSON.parse(localStorage.getItem('ep_clientes')||'[]')) } catch {}
    try { setCerts(JSON.parse(localStorage.getItem('ep_certificados')||'[]')) } catch {}
    setAtualizado(new Date())
  }

  const salvarDashboards = (nova) => {
    setDashboards(nova)
    localStorage.setItem('ep_dashboards', JSON.stringify(nova))
  }

  const criarDashboard = () => {
    if (!nomeNovo.trim()) return
    const novo = { id: Date.now(), nome: nomeNovo.trim(), cor: corNova, widgets: ['resumo_geral'] }
    const nova = [...dashboards, novo]
    salvarDashboards(nova)
    setDashAtual(nova.length - 1)
    setNomeNovo(''); setCorNova(NAVY); setModalNovo(false)
    setEditando(true)
  }

  const excluirDashboard = (idx) => {
    if (dashboards.length === 1) return // manter pelo menos 1
    const nova = dashboards.filter((_,i)=>i!==idx)
    salvarDashboards(nova)
    setDashAtual(Math.min(dashAtual, nova.length-1))
  }

  const renomearDashboard = () => {
    if (!nomeNovo.trim()) return
    const nova = dashboards.map((d,i)=>i===dashAtual?{...d,nome:nomeNovo.trim(),cor:corNova}:d)
    salvarDashboards(nova)
    setNomeNovo(''); setModalRenomear(false)
  }

  const adicionarWidget = (tipo) => {
    const dash = dashboards[dashAtual]
    if (dash.widgets.includes(tipo)) return // já existe
    const nova = dashboards.map((d,i)=>i===dashAtual?{...d,widgets:[...d.widgets,tipo]}:d)
    salvarDashboards(nova)
  }

  const removerWidget = (tipo) => {
    const nova = dashboards.map((d,i)=>i===dashAtual?{...d,widgets:d.widgets.filter(w=>w!==tipo)}:d)
    salvarDashboards(nova)
  }

  const moverWidget = (idx, dir) => {
    const dash = dashboards[dashAtual]
    const nova_w = [...dash.widgets]
    const dest = idx + dir
    if (dest < 0 || dest >= nova_w.length) return
    ;[nova_w[idx], nova_w[dest]] = [nova_w[dest], nova_w[idx]]
    const nova = dashboards.map((d,i)=>i===dashAtual?{...d,widgets:nova_w}:d)
    salvarDashboards(nova)
  }

  const dash = dashboards[dashAtual] || dashboards[0]
  const CORES = [NAVY,'#1A7A3C','#6B3EC9','#854D0E','#dc2626','#1D6FA4','#374151']

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 44px)', fontFamily:'Inter, system-ui, sans-serif' }}>

      {/* ── Barra de dashboards ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', display:'flex', alignItems:'center', padding:'0 16px', overflowX:'auto', flexShrink:0 }}>
        {dashboards.map((d,i)=>(
          <div key={d.id} style={{ display:'flex', alignItems:'center', gap:0, flexShrink:0 }}>
            <button onClick={()=>{ setDashAtual(i); setEditando(false) }}
              style={{ padding:'10px 16px', fontSize:13, fontWeight:dashAtual===i?700:400, color:dashAtual===i?d.cor:'#999', background:'none', border:'none', borderBottom:dashAtual===i?`2px solid ${d.cor}`:'2px solid transparent', cursor:'pointer', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:d.cor, display:'inline-block' }}/>
              {d.nome}
            </button>
            {dashAtual===i && dashboards.length>1 && !editando && (
              <button onClick={()=>excluirDashboard(i)} title="Excluir dashboard" style={{ padding:'2px 4px', background:'none', border:'none', cursor:'pointer', color:'#ccc', fontSize:11 }}>
                <X size={12}/>
              </button>
            )}
          </div>
        ))}
        <button onClick={()=>{ setNomeNovo(''); setCorNova(NAVY); setModalNovo(true) }}
          style={{ display:'flex', alignItems:'center', gap:4, padding:'8px 12px', margin:'0 8px', borderRadius:7, background:'#f0f4ff', color:NAVY, fontWeight:600, fontSize:12, border:`1px solid ${NAVY}30`, cursor:'pointer', flexShrink:0, whiteSpace:'nowrap' }}>
          <Plus size={12}/> Novo Dashboard
        </button>
        <div style={{ marginLeft:'auto', display:'flex', gap:8, flexShrink:0 }}>
          <button onClick={carregar} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 11px', borderRadius:7, background:'#f5f5f5', color:'#555', fontSize:12, border:'none', cursor:'pointer' }}>
            <RefreshCw size={12}/>
          </button>
          {!editando
            ? <button onClick={()=>setEditando(true)} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, background:'#f0f4ff', color:NAVY, fontWeight:600, fontSize:12, border:`1px solid ${NAVY}30`, cursor:'pointer' }}>
                <Edit2 size={12}/> Editar
              </button>
            : <>
                <button onClick={()=>{ setNomeNovo(dash.nome); setCorNova(dash.cor); setModalRenomear(true) }} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, background:'#f5f5f5', color:'#555', fontWeight:600, fontSize:12, border:'none', cursor:'pointer' }}>
                  <Edit2 size={12}/> Renomear
                </button>
                <button onClick={()=>setModalWidget(true)} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, background:GOLD, color:NAVY, fontWeight:700, fontSize:12, border:'none', cursor:'pointer' }}>
                  <Plus size={12}/> Widgets
                </button>
                <button onClick={()=>setEditando(false)} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, background:'#22c55e', color:'#fff', fontWeight:700, fontSize:12, border:'none', cursor:'pointer' }}>
                  <Save size={12}/> Salvar
                </button>
              </>
          }
        </div>
      </div>

      {/* ── Conteúdo do dashboard ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', background:'#f8f9fb' }}>

        {/* Cabeçalho */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:dash.cor }}/>
            <div style={{ fontSize:16, fontWeight:800, color:NAVY }}>{dash.nome}</div>
            {editando && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:'#FEF9C3', color:'#854D0E', fontWeight:600 }}>✏️ Modo edição</span>}
          </div>
          <div style={{ fontSize:11, color:'#aaa' }}>Atualizado {atualizado.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>

        {/* Widgets em modo edição — lista reordenável */}
        {editando && (
          <div style={{ marginBottom:16, padding:'12px 16px', borderRadius:10, background:'#fff', border:`2px dashed ${GOLD}`, fontSize:12, color:'#888' }}>
            <div style={{ fontWeight:700, color:NAVY, marginBottom:10 }}>⬆⬇ Reordenar · ✕ Remover widgets</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {dash.widgets.map((w,idx)=>{
                const def = WIDGETS_DISPONIVEIS.find(x=>x.tipo===w)
                const Ic  = def?.icon||LayoutDashboard
                return (
                  <div key={w} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:8, background:'#f0f4ff', border:`1px solid ${NAVY}30` }}>
                    <Ic size={12} style={{ color:NAVY }}/>
                    <span style={{ fontSize:11, fontWeight:600, color:NAVY }}>{def?.label||w}</span>
                    <button onClick={()=>moverWidget(idx,-1)} disabled={idx===0} style={{ padding:'1px 4px', background:'none', border:'none', cursor:idx===0?'not-allowed':'pointer', color:idx===0?'#ccc':'#888' }}><ChevronUp size={11}/></button>
                    <button onClick={()=>moverWidget(idx,1)} disabled={idx===dash.widgets.length-1} style={{ padding:'1px 4px', background:'none', border:'none', cursor:idx===dash.widgets.length-1?'not-allowed':'pointer', color:idx===dash.widgets.length-1?'#ccc':'#888' }}><ChevronDown size={11}/></button>
                    <button onClick={()=>removerWidget(w)} style={{ padding:'1px 4px', background:'none', border:'none', cursor:'pointer', color:'#dc2626' }}><X size={11}/></button>
                  </div>
                )
              })}
              {dash.widgets.length===0 && <span style={{ color:'#ccc', fontStyle:'italic' }}>Nenhum widget. Clique em "+ Widgets" para adicionar.</span>}
            </div>
          </div>
        )}

        {/* Grid de widgets */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
          {dash.widgets.map(w=>(
            <Widget key={w} tipo={w} clientes={clientes} certs={certs} editando={editando} onRemover={()=>removerWidget(w)}/>
          ))}
        </div>

        {dash.widgets.length===0&&!editando&&(
          <div style={{ textAlign:'center', padding:60, color:'#ccc' }}>
            <LayoutDashboard size={48} style={{ marginBottom:12, opacity:.3 }}/>
            <div style={{ fontSize:14, fontWeight:700 }}>Dashboard vazio</div>
            <div style={{ fontSize:12, marginTop:4 }}>Clique em "Editar" → "+ Widgets" para adicionar painéis.</div>
          </div>
        )}
      </div>

      {/* ── Modal Novo Dashboard ── */}
      {modalNovo && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, maxWidth:420, width:'90%' }}>
            <div style={{ fontWeight:700, color:NAVY, fontSize:15, marginBottom:16 }}>➕ Novo Dashboard</div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:5 }}>Nome</label>
              <input value={nomeNovo} onChange={e=>setNomeNovo(e.target.value)} onKeyDown={e=>e.key==='Enter'&&criarDashboard()} placeholder="Ex: Certificados, Clientes VIP..." autoFocus
                style={{ padding:'9px 12px', borderRadius:8, border:'1px solid #ddd', fontSize:14, outline:'none', width:'100%', boxSizing:'border-box' }}/>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:8 }}>Cor de identificação</label>
              <div style={{ display:'flex', gap:8 }}>
                {CORES.map(c=>(
                  <button key={c} onClick={()=>setCorNova(c)} style={{ width:28, height:28, borderRadius:'50%', background:c, border:`3px solid ${corNova===c?'#333':'transparent'}`, cursor:'pointer' }}/>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>setModalNovo(false)} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #ddd', background:'#fff', cursor:'pointer', fontSize:13 }}>Cancelar</button>
              <button onClick={criarDashboard} disabled={!nomeNovo.trim()} style={{ padding:'8px 20px', borderRadius:8, background:nomeNovo.trim()?NAVY:'#ccc', color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:nomeNovo.trim()?'pointer':'default' }}>Criar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Renomear ── */}
      {modalRenomear && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, maxWidth:420, width:'90%' }}>
            <div style={{ fontWeight:700, color:NAVY, fontSize:15, marginBottom:16 }}>✏️ Renomear Dashboard</div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:5 }}>Nome</label>
              <input value={nomeNovo} onChange={e=>setNomeNovo(e.target.value)} onKeyDown={e=>e.key==='Enter'&&renomearDashboard()} autoFocus
                style={{ padding:'9px 12px', borderRadius:8, border:'1px solid #ddd', fontSize:14, outline:'none', width:'100%', boxSizing:'border-box' }}/>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:8 }}>Cor</label>
              <div style={{ display:'flex', gap:8 }}>
                {CORES.map(c=>(
                  <button key={c} onClick={()=>setCorNova(c)} style={{ width:28, height:28, borderRadius:'50%', background:c, border:`3px solid ${corNova===c?'#333':'transparent'}`, cursor:'pointer' }}/>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>setModalRenomear(false)} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #ddd', background:'#fff', cursor:'pointer', fontSize:13 }}>Cancelar</button>
              <button onClick={renomearDashboard} style={{ padding:'8px 20px', borderRadius:8, background:NAVY, color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Adicionar Widgets ── */}
      {modalWidget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:520, maxHeight:'80vh', display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', borderBottom:'1px solid #f0f0f0' }}>
              <div style={{ fontWeight:700, color:NAVY, fontSize:14 }}>Adicionar Widgets</div>
              <button onClick={()=>setModalWidget(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#aaa' }}><X size={18}/></button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'12px 20px' }}>
              {WIDGETS_DISPONIVEIS.map(w=>{
                const Ic      = w.icon
                const jatem   = dash.widgets.includes(w.tipo)
                return (
                  <div key={w.tipo} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10, marginBottom:8, border:`1px solid ${jatem?'#bbf7d0':'#e8e8e8'}`, background:jatem?'#F0FDF4':'#fff' }}>
                    <div style={{ width:36, height:36, borderRadius:8, background:jatem?'#F0FDF4':'#f0f4ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Ic size={18} style={{ color:jatem?'#16a34a':NAVY }}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:NAVY }}>{w.label}</div>
                      <div style={{ fontSize:11, color:'#aaa' }}>{w.desc}</div>
                    </div>
                    <button onClick={()=>jatem?removerWidget(w.tipo):adicionarWidget(w.tipo)}
                      style={{ padding:'5px 12px', borderRadius:8, fontSize:12, fontWeight:600, border:'none', cursor:'pointer', background:jatem?'#FEF2F2':'#22c55e', color:jatem?'#dc2626':'#fff', whiteSpace:'nowrap' }}>
                      {jatem?'Remover':'+ Adicionar'}
                    </button>
                  </div>
                )
              })}
            </div>
            <div style={{ padding:'12px 20px', borderTop:'1px solid #f0f0f0' }}>
              <button onClick={()=>setModalWidget(false)} style={{ width:'100%', padding:'9px', borderRadius:8, background:NAVY, color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>Concluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
