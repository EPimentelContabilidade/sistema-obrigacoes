import { epSet, epGet } from '../utils/storage'
// MonitorCNPJ.jsx — Verificação Automática de Alterações Cadastrais + IA
import { useState, useEffect } from 'react'

const NAVY = '#1F4A33'
const GOLD = '#C5A55A'
const LS_KEY = 'ep_monitor_cnpj'
const LS_LAST = 'ep_monitor_cnpj_last'

function diffCampos(antes, depois) {
  const campos = [
    { k:'razao_social', label:'Razão Social' },
    { k:'nome_fantasia', label:'Nome Fantasia' },
    { k:'descricao_situacao_cadastral', label:'Situação Cadastral' },
    { k:'descricao_motivo_situacao_cadastral', label:'Motivo Situação' },
    { k:'logradouro', label:'Logradouro' },
    { k:'municipio', label:'Município' },
    { k:'uf', label:'UF' },
    { k:'cnae_fiscal', label:'CNAE Principal' },
    { k:'cnae_fiscal_descricao', label:'Desc. CNAE' },
    { k:'porte', label:'Porte' },
    { k:'capital_social', label:'Capital Social' },
    { k:'natureza_juridica', label:'Natureza Jurídica' },
  ]
  const diffs = []
  for (const { k, label } of campos) {
    const a = String(antes?.[k] ?? '').trim()
    const b = String(depois?.[k] ?? '').trim()
    if (a && b && a !== b) diffs.push({ campo: label, antes: a, depois: b })
  }
  const qa = (antes?.qsa||[]).map(s=>s.nome_socio).sort().join(', ')
  const qb = (depois?.qsa||[]).map(s=>s.nome_socio).sort().join(', ')
  if (qa !== qb) diffs.push({ campo:'Quadro Societário (QSA)', antes:qa||'—', depois:qb||'—' })
  return diffs
}

async function analisarComIA(cliente, diffs) {
  if (!diffs.length) return ''
  const prompt = `Você é um assistente contábil analisando alterações cadastrais de um cliente.

Cliente: ${cliente.nome}
CNPJ: ${cliente.cnpj}
Regime Tributário: ${cliente.tributacao || cliente.regime}

Alterações detectadas na Receita Federal:
${diffs.map(d => `- ${d.campo}: "${d.antes}" → "${d.depois}"`).join('\n')}

Analise brevemente (máx 3 parágrafos) o impacto contábil/fiscal e quais ações o escritório deve tomar. Seja objetivo e prático.`
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1000, messages:[{role:'user',content:prompt}] })
    })
    const data = await res.json()
    return data.content?.[0]?.text || ''
  } catch { return '' }
}

export default function MonitorCNPJ() {
  const [clientes, setClientes] = useState([])
  const [historico, setHistorico] = useState([])
  const [rodando, setRodando] = useState(false)
  const [progresso, setProgresso] = useState({ atual:0, total:0, nome:'' })
  const [ultimaRodada, setUltimaRodada] = useState(null)
  const [filtro, setFiltro] = useState('todos')
  const [selecionados, setSelecionados] = useState([])
  const [expandido, setExpandido] = useState(null)

  useEffect(() => {
    const cli = JSON.parse(localStorage.getItem('ep_clientes')||'[]')
    const comCNPJ = cli.filter(c => c.ativo!==false && (c.cnpj||'').replace(/\D/g,'').length===14)
    setClientes(comCNPJ)
    setSelecionados(comCNPJ.map(c=>c.id))
    const hist = JSON.parse(localStorage.getItem(LS_KEY)||'[]')
    setHistorico(hist)
    setUltimaRodada(localStorage.getItem(LS_LAST))
  }, [])

  const verificarCNPJ = async (cliente) => {
    const cnpj = (cliente.cnpj||'').replace(/\D/g,'')
    if (cnpj.length !== 14) return { status:'ignorado', cliente }
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
      if (!r.ok) return { status:'erro', cliente, erro:`HTTP ${r.status}` }
      const novo = await r.json()
      const antigo = (() => { try { return JSON.parse(localStorage.getItem(`ep_rf_${cnpj}`)||'null') } catch { return null } })()
      const diffs = antigo ? diffCampos(antigo, novo) : []
      localStorage.setItem(`ep_rf_${cnpj}`, JSON.stringify(novo))
      const todos = JSON.parse(localStorage.getItem('ep_clientes')||'[]')
      localStorage.setItem('ep_clientes', JSON.stringify(todos.map(c => String(c.id)===String(cliente.id) ? {...c, situacao_cadastral:novo.descricao_situacao_cadastral, porte:novo.porte} : c)))
      const analiseIA = diffs.length ? await analisarComIA(cliente, diffs) : ''
      return { status:diffs.length?'alterado':'ok', cliente, diffs, analiseIA }
    } catch(e) { return { status:'erro', cliente, erro:e.message } }
  }

  const executar = async () => {
    const alvo = clientes.filter(c=>selecionados.includes(c.id))
    if (!alvo.length) { alert('Selecione ao menos um cliente.'); return }
    setRodando(true)
    const resultados = []
    for (let i=0; i<alvo.length; i++) {
      setProgresso({ atual:i+1, total:alvo.length, nome:alvo[i].nome?.slice(0,35) })
      resultados.push({ ...await verificarCNPJ(alvo[i]), ts:new Date().toISOString() })
      if (i < alvo.length-1) await new Promise(r=>setTimeout(r,700))
    }
    const agora = new Date().toISOString()
    const hist = [{ id:Date.now(), ts:agora, resultados }, ...historico].slice(0,20)
    setHistorico(hist); localStorage.setItem(LS_KEY, JSON.stringify(hist))
    localStorage.setItem(LS_LAST, agora); setUltimaRodada(agora)
    setRodando(false); setProgresso({ atual:0, total:0, nome:'' })
  }

  const ultima = historico[0]
  const resFilt = (ultima?.resultados||[]).filter(r => filtro==='todos' || r.status===filtro)
  const nOk  = (ultima?.resultados||[]).filter(r=>r.status==='ok').length
  const nAlt = (ultima?.resultados||[]).filter(r=>r.status==='alterado').length
  const nErr = (ultima?.resultados||[]).filter(r=>r.status==='erro').length

  return (
    <div style={{padding:'0 0 40px'}}>
      <div style={{background:`linear-gradient(135deg,${NAVY},${NAVY}cc)`,color:'#fff',padding:'20px 28px',borderRadius:'0 0 16px 16px',marginBottom:24}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
          <div>
            <h2 style={{margin:0,fontSize:20,fontWeight:800}}>🔄 Monitor de CNPJ</h2>
            <div style={{fontSize:12,opacity:.8,marginTop:4}}>Verificação de alterações cadastrais na Receita Federal com análise IA</div>
            {ultimaRodada && <div style={{fontSize:11,opacity:.6,marginTop:3}}>Última verificação: {new Date(ultimaRodada).toLocaleString('pt-BR')}</div>}
          </div>
          <button onClick={executar} disabled={rodando} style={{padding:'10px 22px',background:GOLD,color:NAVY,border:'none',borderRadius:10,fontWeight:800,fontSize:13,cursor:'pointer',opacity:rodando?.6:1,whiteSpace:'nowrap'}}>
            {rodando ? `⏳ ${progresso.atual}/${progresso.total} — ${progresso.nome}` : '▶ Verificar Agora'}
          </button>
        </div>
        {rodando && <div style={{marginTop:12}}>
          <div style={{background:'rgba(255,255,255,.15)',borderRadius:20,height:6,marginTop:8}}>
            <div style={{background:GOLD,height:6,borderRadius:20,width:`${(progresso.atual/progresso.total)*100}%`,transition:'width .3s'}}/>
          </div>
        </div>}
      </div>

      <div style={{padding:'0 24px',display:'grid',gridTemplateColumns:'280px 1fr',gap:20}}>
        {/* Lista clientes */}
        <div style={{background:'#fff',borderRadius:12,border:'1px solid #e8e8e8',overflow:'hidden',height:'fit-content'}}>
          <div style={{padding:'12px 16px',background:'#f8f9fb',borderBottom:'1px solid #e8e8e8',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontWeight:700,color:NAVY,fontSize:13}}>📋 Clientes CNPJ ({clientes.length})</span>
            <div style={{display:'flex',gap:4}}>
              <button onClick={()=>setSelecionados(clientes.map(c=>c.id))} style={{fontSize:10,padding:'2px 7px',borderRadius:5,background:NAVY,color:'#fff',border:'none',cursor:'pointer'}}>Todos</button>
              <button onClick={()=>setSelecionados([])} style={{fontSize:10,padding:'2px 7px',borderRadius:5,background:'#f5f5f5',color:'#555',border:'none',cursor:'pointer'}}>Limpar</button>
            </div>
          </div>
          <div style={{maxHeight:480,overflowY:'auto'}}>
            {clientes.length===0 && <div style={{padding:20,textAlign:'center',color:'#bbb',fontSize:12}}>Nenhum cliente com CNPJ cadastrado</div>}
            {clientes.map(c=>{
              const sel = selecionados.includes(c.id)
              const ult = ultima?.resultados?.find(r=>String(r.cliente?.id)===String(c.id))
              const cor = ult?.status==='alterado'?'#dc2626':ult?.status==='erro'?'#d97706':'#16a34a'
              const bg  = ult?.status==='alterado'?'#FEF2F2':ult?.status==='erro'?'#FFF7ED':'#F0FDF4'
              return <label key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',cursor:'pointer',borderBottom:'1px solid #f5f5f5',background:sel?'#EBF5FF':'#fff'}}>
                <input type="checkbox" checked={sel} style={{accentColor:NAVY,width:14,height:14}} onChange={()=>setSelecionados(s=>sel?s.filter(x=>x!==c.id):[...s,c.id])}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:600,color:NAVY,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.nome}</div>
                  <div style={{fontSize:10,color:'#999'}}>{c.cnpj}</div>
                </div>
                {ult && <span style={{fontSize:9,padding:'1px 6px',borderRadius:8,fontWeight:700,background:bg,color:cor,flexShrink:0}}>
                  {ult.status==='alterado'?'✎ Alt':ult.status==='erro'?'⚠ Erro':'✓ OK'}
                </span>}
              </label>
            })}
          </div>
        </div>

        {/* Resultados */}
        <div>
          {!ultima ? (
            <div style={{background:'#fff',borderRadius:12,border:'2px dashed #e8e8e8',padding:50,textAlign:'center',color:'#bbb'}}>
              <div style={{fontSize:44,marginBottom:12}}>🔍</div>
              <div style={{fontWeight:700,fontSize:15,color:'#999',marginBottom:6}}>Nenhuma verificação realizada</div>
              <div style={{fontSize:12}}>Selecione os clientes e clique em "Verificar Agora"</div>
            </div>
          ) : (<>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
              {[{label:'✅ Sem alteração',val:nOk,bg:'#F0FDF4',c:'#16a34a',id:'ok'},
                {label:'✎ Com alteração',val:nAlt,bg:'#FEF2F2',c:'#dc2626',id:'alterado'},
                {label:'⚠ Com erro',val:nErr,bg:'#FFF7ED',c:'#d97706',id:'erro'}].map(s=>(
                <div key={s.id} onClick={()=>setFiltro(filtro===s.id?'todos':s.id)} style={{background:s.bg,borderRadius:10,padding:'12px 16px',cursor:'pointer',border:`2px solid ${filtro===s.id?s.c:'transparent'}`,transition:'border .15s'}}>
                  <div style={{fontSize:26,fontWeight:800,color:s.c}}>{s.val}</div>
                  <div style={{fontSize:11,color:s.c}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {resFilt.map((r,i)=>(
                <div key={i} style={{background:'#fff',borderRadius:10,border:`1px solid ${r.status==='alterado'?'#fca5a5':r.status==='erro'?'#fde68a':'#bbf7d0'}`,overflow:'hidden'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',cursor:'pointer'}} onClick={()=>setExpandido(expandido===i?null:i)}>
                    <span style={{fontSize:15}}>{r.status==='alterado'?'✎':r.status==='erro'?'⚠':'✅'}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,color:NAVY,fontSize:13}}>{r.cliente?.nome}</div>
                      <div style={{fontSize:10,color:'#888'}}>{r.cliente?.cnpj} · {r.cliente?.tributacao||r.cliente?.regime}</div>
                    </div>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:6,fontWeight:700,
                      background:r.status==='alterado'?'#FEF2F2':r.status==='erro'?'#FFF7ED':'#F0FDF4',
                      color:r.status==='alterado'?'#dc2626':r.status==='erro'?'#d97706':'#16a34a'}}>
                      {r.status==='alterado'?`${r.diffs?.length} alt.`:r.status==='erro'?'Erro':'OK'}
                    </span>
                    <span style={{color:'#ccc',fontSize:11,marginLeft:4}}>{expandido===i?'▲':'▼'}</span>
                  </div>
                  {expandido===i && <div style={{borderTop:'1px solid #f5f5f5',padding:'14px 16px'}}>
                    {r.status==='erro' && <div style={{color:'#dc2626',fontSize:12}}>❌ {r.erro}</div>}
                    {r.status==='ok'  && <div style={{color:'#16a34a',fontSize:12}}>✅ Nenhuma alteração cadastral detectada.</div>}
                    {r.status==='alterado' && <>
                      <div style={{fontWeight:700,color:NAVY,fontSize:12,marginBottom:8}}>📊 Alterações detectadas:</div>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,marginBottom:14}}>
                        <thead><tr style={{background:'#f8f9fb'}}>
                          {['Campo','Antes','Depois'].map(h=><th key={h} style={{padding:'6px 10px',textAlign:'left',color:'#888',fontWeight:600,borderBottom:'1px solid #eee'}}>{h}</th>)}
                        </tr></thead>
                        <tbody>{(r.diffs||[]).map((d,di)=>(
                          <tr key={di} style={{borderBottom:'1px solid #f5f5f5'}}>
                            <td style={{padding:'6px 10px',fontWeight:600,color:NAVY}}>{d.campo}</td>
                            <td style={{padding:'6px 10px',color:'#dc2626',textDecoration:'line-through'}}>{d.antes}</td>
                            <td style={{padding:'6px 10px',color:'#16a34a',fontWeight:600}}>{d.depois}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                      {r.analiseIA && <div style={{background:'#F0F4FF',borderRadius:8,padding:'12px 14px',border:'1px solid #c7d2fe'}}>
                        <div style={{fontWeight:700,color:NAVY,fontSize:12,marginBottom:6}}>🤖 Análise IA:</div>
                        <div style={{fontSize:12,color:'#444',lineHeight:1.65,whiteSpace:'pre-wrap'}}>{r.analiseIA}</div>
                      </div>}
                    </>}
                  </div>}
                </div>
              ))}
            </div>
          </>)}
        </div>
      </div>
    </div>
  )
}
