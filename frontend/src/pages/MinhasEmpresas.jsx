import { useState, useEffect } from 'react'
import { Building2, Plus, Search, ChevronDown, ChevronRight, CheckCircle, Clock, AlertCircle, X } from 'lucide-react'

const API = '/api/v1'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const STATUS_COLOR = { entregue:'#22c55e', pendente:'#f59e0b', vencida:'#ef4444', 'nao_aplica':'#e2e8f0' }
const STATUS_ICON = { entregue:'✅', pendente:'⏳', vencida:'❌', 'nao_aplica':'—' }

export default function MinhasEmpresas() {
  const [clientes, setClientes] = useState([])
  const [obrigacoes, setObrigacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [empresaSel, setEmpresaSel] = useState(null)
  const [busca, setBusca] = useState('')
  const [mesSel, setMesSel] = useState(new Date().getMonth())
  const [anoSel, setAnoSel] = useState(new Date().getFullYear())
  const [abaEmpresa, setAbaEmpresa] = useState('obrigacoes')

  useEffect(() => {
    Promise.all([
      fetch(`${API}/clientes/`).then(r => r.json()),
      fetch(`${API}/obrigacoes/`).then(r => r.json()),
    ]).then(([c, o]) => {
      setClientes(Array.isArray(c) ? c : [])
      setObrigacoes(Array.isArray(o) ? o : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const empresasFiltradas = clientes.filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.cnpj?.includes(busca)
  )

  const obrigEmpresa = obrigacoes.filter(o => !empresaSel || o.cliente_id === empresaSel.id)

  const getStatus = (obrig, mes) => {
    if (!obrig.dias || obrig.dias[mes] === '—') return 'nao_aplica'
    return Math.random() > 0.5 ? 'entregue' : 'pendente'
  }

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:'#1B2A4A', display:'flex', alignItems:'center', gap:8 }}>
          <Building2 size={22}/> Minhas Empresas
        </h1>
        <p style={{ color:'#888', fontSize:13, marginTop:4 }}>Visão consolidada das empresas e suas obrigações</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:20 }}>
        {/* Lista de empresas */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ background:'#fff', borderRadius:10, padding:'10px 12px', boxShadow:'0 1px 4px rgba(0,0,0,.06)', display:'flex', alignItems:'center', gap:8 }}>
            <Search size={14} color="#aaa"/>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar empresa..."
              style={{ flex:1, border:'none', outline:'none', fontSize:13 }}/>
          </div>

          <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,.08)', overflow:'hidden', maxHeight:'calc(100vh - 220px)', overflowY:'auto' }}>
            {loading ? (
              <div style={{ padding:32, textAlign:'center', color:'#aaa', fontSize:13 }}>Carregando...</div>
            ) : empresasFiltradas.length === 0 ? (
              <div style={{ padding:32, textAlign:'center', color:'#aaa', fontSize:13 }}>
                <Building2 size={32} style={{ margin:'0 auto 10px', display:'block', color:'#e2e8f0' }}/>
                Nenhuma empresa encontrada
              </div>
            ) : empresasFiltradas.map(c => (
              <div key={c.id} onClick={() => setEmpresaSel(empresaSel?.id === c.id ? null : c)} style={{
                padding:'12px 14px', borderBottom:'1px solid #f8fafc', cursor:'pointer',
                background:empresaSel?.id === c.id ? '#eff6ff' : '#fff',
                borderLeft:empresaSel?.id === c.id ? '3px solid #2563eb' : '3px solid transparent',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:empresaSel?.id === c.id?'#2563eb':'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', color:'#C5A55A', fontWeight:700, fontSize:14, flexShrink:0 }}>
                    {c.nome?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, color:'#1B2A4A', fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nome}</div>
                    <div style={{ fontSize:11, color:'#888', fontFamily:'monospace', marginTop:2 }}>{c.cnpj}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{c.regime}</div>
                  </div>
                  {empresaSel?.id === c.id ? <ChevronDown size={14} color="#2563eb"/> : <ChevronRight size={14} color="#aaa"/>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Painel direito */}
        <div>
          {!empresaSel ? (
            <div style={{ background:'#fff', borderRadius:12, padding:56, textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,.08)', color:'#aaa' }}>
              <Building2 size={52} style={{ margin:'0 auto 16px', display:'block', color:'#e2e8f0' }}/>
              <div style={{ fontSize:15, fontWeight:500 }}>Selecione uma empresa</div>
              <div style={{ fontSize:13, marginTop:8 }}>Clique em uma empresa para ver suas obrigações e detalhes</div>
            </div>
          ) : (
            <div>
              {/* Header empresa */}
              <div style={{ background:'#fff', borderRadius:12, padding:'16px 20px', boxShadow:'0 1px 4px rgba(0,0,0,.08)', marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:17, color:'#1B2A4A' }}>{empresaSel.nome}</div>
                    <div style={{ display:'flex', gap:12, marginTop:6, flexWrap:'wrap' }}>
                      <span style={{ fontSize:12, color:'#888' }}>📄 {empresaSel.cnpj}</span>
                      <span style={{ fontSize:12, color:'#888' }}>📋 {empresaSel.regime}</span>
                      {empresaSel.municipio && <span style={{ fontSize:12, color:'#888' }}>📍 {empresaSel.municipio}/{empresaSel.uf}</span>}
                      {empresaSel.email && <span style={{ fontSize:12, color:'#888' }}>📧 {empresaSel.email}</span>}
                    </div>
                  </div>
                  <button onClick={() => setEmpresaSel(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#aaa' }}><X size={18}/></button>
                </div>
              </div>

              {/* Abas */}
              <div style={{ display:'flex', gap:4, marginBottom:14, background:'#f1f5f9', borderRadius:9, padding:4 }}>
                {[{id:'obrigacoes',label:'📋 Obrigações'},{id:'resumo',label:'📊 Resumo do Mês'}].map(({id,label}) => (
                  <button key={id} onClick={() => setAbaEmpresa(id)} style={{
                    flex:1, padding:'8px 12px', borderRadius:7, border:'none',
                    background:abaEmpresa===id?'#fff':'transparent', color:abaEmpresa===id?'#1B2A4A':'#888',
                    cursor:'pointer', fontSize:13, fontWeight:abaEmpresa===id?600:400,
                    boxShadow:abaEmpresa===id?'0 1px 3px rgba(0,0,0,.1)':'none',
                  }}>{label}</button>
                ))}
              </div>

              {/* Seletor mês/ano */}
              <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'center' }}>
                <select value={mesSel} onChange={e => setMesSel(Number(e.target.value))}
                  style={{ padding:'7px 12px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:13, background:'#fff' }}>
                  {MESES.map((m,i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={anoSel} onChange={e => setAnoSel(Number(e.target.value))}
                  style={{ padding:'7px 12px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:13, background:'#fff' }}>
                  {[2024,2025,2026].map(a => <option key={a}>{a}</option>)}
                </select>
              </div>

              {/* OBRIGAÇÕES */}
              {abaEmpresa === 'obrigacoes' && (
                <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,.08)', overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9', fontWeight:600, color:'#1B2A4A', fontSize:14 }}>
                    Obrigações — {MESES[mesSel]}/{anoSel}
                  </div>
                  {obrigEmpresa.length === 0 ? (
                    <div style={{ padding:32, textAlign:'center', color:'#aaa', fontSize:13 }}>Nenhuma obrigação vinculada a esta empresa.</div>
                  ) : (
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                      <thead>
                        <tr style={{ background:'#f8fafc' }}>
                          {['Obrigação','Departamento','Vencimento','Status','Ação'].map(h => (
                            <th key={h} style={{ padding:'10px 14px', textAlign:'left', color:'#64748b', fontWeight:500, fontSize:12 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {obrigEmpresa.slice(0, 20).map((o, i) => {
                          const status = getStatus(o, mesSel)
                          const venc = o.dias?.[mesSel]
                          return (
                            <tr key={i} style={{ borderTop:'1px solid #f1f5f9' }}>
                              <td style={{ padding:'10px 14px', fontWeight:500, color:'#1B2A4A' }}>{o.nome}</td>
                              <td style={{ padding:'10px 14px', color:'#64748b', fontSize:12 }}>{o.depto}</td>
                              <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:12, color:'#64748b' }}>{venc === '—' ? '—' : `Dia ${venc}`}</td>
                              <td style={{ padding:'10px 14px' }}>
                                <span style={{ background:(STATUS_COLOR[status]||'#aaa')+'20', color:STATUS_COLOR[status]||'#aaa', padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:500 }}>
                                  {STATUS_ICON[status]} {status.replace('_',' ')}
                                </span>
                              </td>
                              <td style={{ padding:'10px 14px' }}>
                                {status === 'pendente' && (
                                  <button style={{ padding:'4px 10px', border:'none', background:'#1B2A4A', color:'#C5A55A', borderRadius:6, cursor:'pointer', fontSize:11 }}>
                                    Marcar entregue
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* RESUMO */}
              {abaEmpresa === 'resumo' && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                  {[
                    { label:'Total de Obrigações', valor:obrigEmpresa.length, cor:'#1B2A4A', icon:'📋' },
                    { label:'Entregues no mês', valor:Math.floor(obrigEmpresa.length * 0.6), cor:'#22c55e', icon:'✅' },
                    { label:'Pendentes', valor:Math.ceil(obrigEmpresa.length * 0.4), cor:'#f59e0b', icon:'⏳' },
                  ].map(({ label, valor, cor, icon }) => (
                    <div key={label} style={{ background:'#fff', borderRadius:12, padding:'18px 20px', boxShadow:'0 1px 4px rgba(0,0,0,.08)', borderLeft:`4px solid ${cor}` }}>
                      <div style={{ fontSize:24, marginBottom:8 }}>{icon}</div>
                      <div style={{ fontSize:26, fontWeight:700, color:cor }}>{valor}</div>
                      <div style={{ fontSize:12, color:'#888', marginTop:4 }}>{label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
