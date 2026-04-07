import { useState, useEffect } from 'react'
import { Users, FileText, CheckCircle, AlertTriangle, Shield, TrendingUp, Clock, Send, Building2, User, BarChart2, RefreshCw } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'

const statusCert = (validade) => {
  if (!validade) return null
  const dias = Math.ceil((new Date(validade) - new Date()) / (1000*60*60*24))
  return dias
}

const fmtData = (d) => { try { return new Date(d).toLocaleDateString('pt-BR') } catch { return d||'—' } }

export default function Dashboard() {
  const [clientes,  setClientes]  = useState([])
  const [certs,     setCerts]     = useState([])
  const [tarefas,   setTarefas]   = useState([])
  const [atualizado, setAtualizado] = useState(new Date())

  const carregar = () => {
    try { setClientes(JSON.parse(localStorage.getItem('ep_clientes')||'[]')) } catch {}
    try { setCerts(JSON.parse(localStorage.getItem('ep_certificados')||'[]')) } catch {}
    setAtualizado(new Date())
  }

  useEffect(() => { carregar() }, [])

  // KPIs clientes
  const totalCli    = clientes.length
  const ativos      = clientes.filter(c=>c.ativo!==false).length
  const inativos    = totalCli - ativos
  const semObrig    = clientes.filter(c=>!(c.obrigacoes_vinculadas||[]).length).length

  // KPIs certificados
  const certVencidos = certs.filter(c=>{ const d=statusCert(c.validade); return d!==null&&d<0 }).length
  const cert30       = certs.filter(c=>{ const d=statusCert(c.validade); return d!==null&&d>=0&&d<=30 }).length
  const cert90       = certs.filter(c=>{ const d=statusCert(c.validade); return d!==null&&d>30&&d<=90 }).length
  const certOk       = certs.filter(c=>{ const d=statusCert(c.validade); return d!==null&&d>90 }).length
  const certPF       = certs.filter(c=>c.tipo==='PF').length
  const certPJ       = certs.filter(c=>c.tipo==='PJ').length

  // Distribuição por regime
  const regimes = ['Simples Nacional','MEI','Lucro Presumido','Lucro Real','RET','Imune/Isento']
  const distRegime = regimes.map(r=>({
    label: r,
    n: clientes.filter(c=>(c.tributacao||c.regime)===r).length
  })).filter(x=>x.n>0)

  // Clientes com mais obrigações
  const topCli = [...clientes]
    .sort((a,b)=>(b.obrigacoes_vinculadas||[]).length-(a.obrigacoes_vinculadas||[]).length)
    .slice(0,5)

  // Certificados próximos do vencimento
  const certAlertas = certs
    .filter(c=>{ const d=statusCert(c.validade); return d!==null&&d>=0&&d<=90 })
    .sort((a,b)=>new Date(a.validade)-new Date(b.validade))
    .slice(0,6)

  const maxObrig = Math.max(...topCli.map(c=>(c.obrigacoes_vinculadas||[]).length), 1)

  const card = (icon, label, value, cor, bg, sub) => {
    const Ic = icon
    return (
      <div style={{ background:'#fff', borderRadius:12, padding:'16px 20px', border:`1px solid ${cor}20`, display:'flex', alignItems:'center', gap:14, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ width:48, height:48, borderRadius:12, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Ic size={22} style={{ color:cor }}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:26, fontWeight:800, color:cor, lineHeight:1 }}>{value}</div>
          <div style={{ fontSize:12, color:'#888', fontWeight:500, marginTop:3 }}>{label}</div>
          {sub&&<div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{sub}</div>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', background:'#f8f9fb', fontFamily:'Inter, system-ui, sans-serif' }}>

      {/* Cabeçalho */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, color:NAVY }}>Dashboard</div>
          <div style={{ fontSize:12, color:'#aaa', marginTop:2 }}>EPimentel Auditoria & Contabilidade · Atualizado {atualizado.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
        <button onClick={carregar} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, background:'#fff', color:NAVY, fontWeight:600, fontSize:12, border:`1px solid ${NAVY}30`, cursor:'pointer' }}>
          <RefreshCw size={13}/> Atualizar
        </button>
      </div>

      {/* Linha 1 — KPIs Clientes */}
      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#aaa', textTransform:'uppercase', marginBottom:10, letterSpacing:0.5 }}>Carteira de Clientes</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {card(Users,       'Total de Clientes',    totalCli, '#1D6FA4', '#EBF5FF', `${ativos} ativos · ${inativos} inativos`)}
          {card(CheckCircle, 'Clientes Ativos',      ativos,   '#16a34a', '#F0FDF4', `${Math.round(ativos/Math.max(totalCli,1)*100)}% da carteira`)}
          {card(FileText,    'Com Obrigações',        ativos-semObrig, NAVY, '#f0f4ff', `${semObrig} sem vínculo`)}
          {card(AlertTriangle,'Sem Obrigações',       semObrig, '#f59e0b', '#FEF9C3', 'Requer configuração')}
        </div>
      </div>

      {/* Linha 2 — KPIs Certificados */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#aaa', textTransform:'uppercase', marginBottom:10, letterSpacing:0.5 }}>Certificados Digitais</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12 }}>
          {card(Shield,       'Total',          certs.length, '#1D6FA4', '#EBF5FF', `${certPJ} PJ · ${certPF} PF`)}
          {card(CheckCircle,  'Válidos',         certOk,       '#16a34a', '#F0FDF4', 'Acima de 90 dias')}
          {card(Clock,        'Vencem em 90d',   cert90,       '#3b82f6', '#EFF6FF', 'Atenção recomendada')}
          {card(AlertTriangle,'Vencem em 30d',   cert30,       '#f59e0b', '#FEF9C3', 'Renovação urgente')}
          {card(AlertTriangle,'Vencidos',        certVencidos, '#dc2626', '#FEF2F2', 'Ação imediata')}
        </div>
      </div>

      {/* Linha 3 — Gráficos + Alertas */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:16 }}>

        {/* Distribuição por regime */}
        <div style={{ background:'#fff', borderRadius:12, padding:'18px 20px', border:'1px solid #e8e8e8', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontWeight:700, color:NAVY, fontSize:13, marginBottom:14 }}>📊 Clientes por Regime</div>
          {distRegime.length===0
            ? <div style={{ textAlign:'center', color:'#ccc', padding:20, fontSize:12 }}>Nenhum cliente cadastrado</div>
            : distRegime.map(r=>{
              const pct = Math.round(r.n/Math.max(totalCli,1)*100)
              const cores = {'Simples Nacional':'#1D6FA4','MEI':'#854D0E','Lucro Real':'#6B3EC9','Lucro Presumido':'#5b21b6','RET':'#1A7A3C','Imune/Isento':'#6B7280'}
              const cor = cores[r.label]||'#888'
              return (
                <div key={r.label} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ fontSize:11, fontWeight:600, color:NAVY }}>{r.label}</span>
                    <span style={{ fontSize:11, color:'#888' }}>{r.n} ({pct}%)</span>
                  </div>
                  <div style={{ height:7, background:'#f0f0f0', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:cor, borderRadius:4, transition:'width .4s' }}/>
                  </div>
                </div>
              )
            })
          }
        </div>

        {/* Top clientes por obrigações */}
        <div style={{ background:'#fff', borderRadius:12, padding:'18px 20px', border:'1px solid #e8e8e8', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontWeight:700, color:NAVY, fontSize:13, marginBottom:14 }}>📋 Mais Obrigações</div>
          {topCli.length===0
            ? <div style={{ textAlign:'center', color:'#ccc', padding:20, fontSize:12 }}>Nenhum cliente</div>
            : topCli.map((c,i)=>{
              const n = (c.obrigacoes_vinculadas||[]).length
              const pct = Math.round(n/maxObrig*100)
              return (
                <div key={c.id} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ fontSize:11, fontWeight:600, color:NAVY, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'75%' }} title={c.nome}>{i+1}. {c.nome}</span>
                    <span style={{ fontSize:11, color:GOLD, fontWeight:700 }}>{n}</span>
                  </div>
                  <div style={{ height:6, background:'#f0f0f0', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:GOLD, borderRadius:4 }}/>
                  </div>
                </div>
              )
            })
          }
        </div>

        {/* Certificados - Distribuição PJ vs PF */}
        <div style={{ background:'#fff', borderRadius:12, padding:'18px 20px', border:'1px solid #e8e8e8', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontWeight:700, color:NAVY, fontSize:13, marginBottom:14 }}>🔐 Certificados por Tipo</div>
          {certs.length===0
            ? <div style={{ textAlign:'center', color:'#ccc', padding:20, fontSize:12 }}>Nenhum certificado</div>
            : (
              <>
                {[
                  { label:'PJ — Empresa', n:certPJ, cor:NAVY, ic:Building2 },
                  { label:'PF — Pessoa Física', n:certPF, cor:'#854D0E', ic:User },
                ].map(t=>{ const Ic=t.ic; const pct=Math.round(t.n/Math.max(certs.length,1)*100); return (
                  <div key={t.label} style={{ marginBottom:14 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                      <Ic size={13} style={{ color:t.cor }}/>
                      <span style={{ fontSize:12, fontWeight:600, color:NAVY, flex:1 }}>{t.label}</span>
                      <span style={{ fontSize:13, fontWeight:800, color:t.cor }}>{t.n}</span>
                    </div>
                    <div style={{ height:8, background:'#f0f0f0', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:t.cor, borderRadius:4 }}/>
                    </div>
                    <div style={{ fontSize:10, color:'#aaa', marginTop:2 }}>{pct}% do total</div>
                  </div>
                )})}
                <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #f0f0f0' }}>
                  {[{l:'A1 — Software', c:'#3b82f6'},{l:'A3 — Token', c:'#8b5cf6'}].map(t=>(
                    <div key={t.l} style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#888', marginBottom:4 }}>
                      <span>{t.l}</span>
                      <span style={{ fontWeight:700, color:t.c }}>{certs.filter(c=>c.tipo_cert===t.l.split(' ')[0]).length}</span>
                    </div>
                  ))}
                </div>
              </>
            )
          }
        </div>
      </div>

      {/* Linha 4 — Alertas certificados + Clientes sem obrigações */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Alertas certificados */}
        <div style={{ background:'#fff', borderRadius:12, padding:'18px 20px', border:'1px solid #e8e8e8', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontWeight:700, color:NAVY, fontSize:13 }}>⚠ Certificados — Próximos Vencimentos</div>
            {certAlertas.length>0&&<span style={{ fontSize:11, padding:'2px 8px', borderRadius:8, background:'#FEF9C3', color:'#854D0E', fontWeight:700 }}>{certAlertas.length}</span>}
          </div>
          {certAlertas.length===0
            ? <div style={{ textAlign:'center', color:'#16a34a', padding:20, fontSize:12 }}>✓ Nenhum certificado próximo do vencimento</div>
            : certAlertas.map((c,i)=>{
              const dias = statusCert(c.validade)
              const cor  = dias<=30?'#f59e0b':'#3b82f6'
              const bg   = dias<=30?'#FEF9C3':'#EFF6FF'
              const isPF = c.tipo==='PF'
              return (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:9, background:i%2===0?'#fafafa':'#fff', marginBottom:4, border:`1px solid ${cor}20` }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:800, color:cor }}>{dias}d</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:NAVY, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.cliente_nome}</div>
                    {isPF&&<div style={{ fontSize:10, color:'#888' }}>👤 {c.responsavel_nome}</div>}
                    <div style={{ fontSize:10, color:'#aaa' }}>{c.tipo_cert} · Vence {fmtData(c.validade)}</div>
                  </div>
                  <span style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:isPF?GOLD+'20':NAVY+'15', color:isPF?'#854D0E':NAVY, fontWeight:700 }}>{c.tipo}</span>
                </div>
              )
            })
          }
        </div>

        {/* Clientes sem obrigações */}
        <div style={{ background:'#fff', borderRadius:12, padding:'18px 20px', border:'1px solid #e8e8e8', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontWeight:700, color:NAVY, fontSize:13 }}>📌 Clientes sem Obrigações Vinculadas</div>
            {semObrig>0&&<span style={{ fontSize:11, padding:'2px 8px', borderRadius:8, background:'#FEF9C3', color:'#854D0E', fontWeight:700 }}>{semObrig}</span>}
          </div>
          {semObrig===0
            ? <div style={{ textAlign:'center', color:'#16a34a', padding:20, fontSize:12 }}>✓ Todos os clientes têm obrigações vinculadas</div>
            : clientes.filter(c=>!(c.obrigacoes_vinculadas||[]).length&&c.ativo!==false).slice(0,8).map((c,i)=>{
              const ct = c.tributacao||c.regime||'—'
              const cores = {'Simples Nacional':'#1D6FA4','MEI':'#854D0E','Lucro Real':'#6B3EC9','Lucro Presumido':'#5b21b6','RET':'#1A7A3C'}
              const cor = cores[ct]||'#888'
              return (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:9, background:i%2===0?'#fafafa':'#fff', marginBottom:4 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:NAVY+'15', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:13, fontWeight:800, color:NAVY }}>
                    {(c.nome||'?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:NAVY, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nome}</div>
                    <div style={{ fontSize:10, color:'#aaa' }}>{c.cnpj}</div>
                  </div>
                  <span style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:cor+'15', color:cor, fontWeight:600, whiteSpace:'nowrap' }}>{ct}</span>
                </div>
              )
            })
          }
          {clientes.filter(c=>!(c.obrigacoes_vinculadas||[]).length&&c.ativo!==false).length>8&&(
            <div style={{ textAlign:'center', fontSize:11, color:'#aaa', marginTop:8 }}>
              + {clientes.filter(c=>!(c.obrigacoes_vinculadas||[]).length&&c.ativo!==false).length-8} outros
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
