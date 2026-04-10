import { useState, useEffect } from 'react'
import { Save, Plus, X, Search, Building2, MessageSquare, Info, Check } from 'lucide-react'
import { OBRIGACOES_SISTEMA } from './obrigacoes_data'

const NAVY = '#1B2A4A', GOLD = '#C5A55A'
const inp = { padding:'6px 10px', borderRadius:7, border:'1px solid #e0e0e0', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', color:'#333' }
const sel = { ...inp, cursor:'pointer', background:'#fff' }
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_OPTS = ['Não Tem','1º dia útil','2º dia útil','3º dia útil','5º dia útil','7º dia útil','10º dia útil','15º dia útil','20º dia útil','Todo dia 01','Todo dia 03','Todo dia 05','Todo dia 07','Todo dia 10','Todo dia 15','Todo dia 20','Todo dia 25','Todo dia 28','Todo dia 30','Todo dia 31','Último dia útil','Último dia mês']
const TRIBUTACOES = ['Simples Nacional','Lucro Presumido','Lucro Real','MEI','Imune/Isento','Produtor Rural','RET','Condomínio','Autônomo','Outro']
const DEPT_CORES = { Fiscal:{bg:'#EBF5FF',color:'#1D6FA4'}, Pessoal:{bg:'#EDFBF1',color:'#1A7A3C'}, Contábil:{bg:'#F3EEFF',color:'#6B3EC9'}, Bancos:{bg:'#FEF9C3',color:'#854D0E'} }
const FORM0 = { nome:'', mininome:'', departamento:'Fiscal', responsavel:'Eduardo Pimentel', tempo_previsto:0, meses:Array(12).fill('Todo dia 20'), lembrar_dias:'5', tipo_dias:'corridos', prazo_fixo:'antecipar', sabado_util:false, competencia:'mes_anterior', exigir_robo:false, passivel_multa:false, alerta_guia:true, ativa:true, comentario_padrao:'', tributacoes:[], whatsapp:false, empresas:[] }
const API = '/api/v1'
const LS_KEY = 'ep_obrigacoes_catalogo_custom'

export default function Obrigacoes() {
  const [obrigacoes, setObrigacoes] = useState(() => {
    try {
      const salvo = localStorage.getItem(LS_KEY)
      if (salvo) {
        const parsed = JSON.parse(salvo)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return OBRIGACOES_SISTEMA
  })
  const [clientes, setClientes]     = useState([])
  const [modalCadastro, setModalCadastro] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm]             = useState(FORM0)
  const [busca, setBusca]           = useState('')
  const [filtroDept, setFiltroDept] = useState('')
  const [filtroTrib, setFiltroTrib] = useState('')
  const [filtroAtiva, setFiltroAtiva] = useState('')
  const [filtroDia, setFiltroDia]   = useState('')
  // Novos filtros multi-select
  const [filtroCNPJs, setFiltroCNPJs]   = useState([])   // CNPJs selecionados
  const [filtroGrupo, setFiltroGrupo]   = useState('')
  const [filtroObrig, setFiltroObrig]   = useState([])   // IDs de obrigações selecionadas
  const [dropCNPJ, setDropCNPJ]         = useState(false)
  const [dropObrig, setDropObrig]       = useState(false)
  const [buscaCNPJ, setBuscaCNPJ]       = useState('')
  const [buscaObrigFiltro, setBuscaObrigFiltro] = useState('')

  const [modalEmp, setModalEmp]     = useState(null)
  const [buscaEmp, setBuscaEmp]     = useState('')
  const [empSel, setEmpSel]         = useState([])

  // Salvar no localStorage sempre que obrigacoes mudar
  const salvarLS = (lista) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(lista)) } catch {}
  }

  const setF = (k,v) => setForm(f=>({...f,[k]:v}))
  const setDia = (i,v) => setForm(f=>{ const m=[...f.meses]; m[i]=v; return {...f,meses:m} })
  const toggleTrib = (t) => setF('tributacoes', form.tributacoes.includes(t)?form.tributacoes.filter(x=>x!==t):[...form.tributacoes,t])

  useEffect(()=>{
    try { const local=localStorage.getItem('ep_clientes'); if(local){const p=JSON.parse(local);if(p?.length>0)setClientes(p)} } catch {}
    fetch(`${API}/clientes/`).then(r=>r.ok?r.json():{}).then(d=>{ const lista=d.clientes||d||[]; if(lista.length>0)setClientes(lista) }).catch(()=>{})
  },[])

  const nova = () => { setForm(FORM0); setEditandoId(null); setModalCadastro(true) }
  const editar = (o) => {
    setForm({ nome:o.nome, mininome:o.mininome||'', departamento:o.departamento, responsavel:o.responsavel||'Eduardo Pimentel', tempo_previsto:0, meses:o.meses||Array(12).fill('Todo dia 20'), lembrar_dias:'5', tipo_dias:'corridos', prazo_fixo:'antecipar', sabado_util:false, competencia:o.competencia||'mes_anterior', exigir_robo:!!o.exigir_robo, passivel_multa:!!o.passivel_multa, alerta_guia:o.alerta_guia!==false, ativa:o.ativa!==false, comentario_padrao:'', tributacoes:o.tributacoes||[], whatsapp:!!o.whatsapp, empresas:o.empresas||[] })
    setEditandoId(o.id); setModalCadastro(true)
  }
  const salvar = () => {
    let nova
    if(editandoId) {
      nova = obrigacoes.map(o=>o.id===editandoId?{...o,...form}:o)
    } else {
      nova = [...obrigacoes, {...form, id:Date.now()}]
    }
    setObrigacoes(nova); salvarLS(nova)
    setForm(FORM0); setEditandoId(null); setModalCadastro(false)
  }
  const excluir = (id) => {
    if(confirm('Excluir esta obrigação? Esta ação não pode ser desfeita.')) {
      const nova = obrigacoes.filter(o=>o.id!==id)
      setObrigacoes(nova); salvarLS(nova)
    }
  }
  const abrirEmp = (o) => { setModalEmp(o); setEmpSel(o.empresas||[]); setBuscaEmp('') }
  const salvarEmp = () => {
    const nova = obrigacoes.map(o=>o.id===modalEmp.id?{...o,empresas:empSel}:o)
    setObrigacoes(nova); salvarLS(nova)
    if(editandoId===modalEmp.id) setF('empresas', empSel)
    setModalEmp(null)
  }

  // ── Dados derivados de clientes ─────────────────────────────────────────
  const grupos = [...new Set(clientes.map(c=>c.grupo).filter(Boolean))].sort()
  const clientesFiltradosCNPJ = clientes.filter(c => {
    const nome = (c.nome||c.razao_social||'').toLowerCase()
    const cnpj = (c.cnpj||'').replace(/\D/g,'')
    const q = buscaCNPJ.toLowerCase()
    return !q || nome.includes(q) || cnpj.includes(q)
  })
  // CNPJs/empresas dos clientes do grupo selecionado
  const empresasDoGrupo = filtroGrupo
    ? clientes.filter(c=>c.grupo===filtroGrupo).map(c=>c.cnpj||c.nome||String(c.id))
    : []

  const filtradas = obrigacoes.filter(o => {
    if(busca && !o.nome.toLowerCase().includes(busca.toLowerCase()) && !(o.mininome||'').toLowerCase().includes(busca.toLowerCase())) return false
    if(filtroDept && o.departamento!==filtroDept) return false
    if(filtroTrib && !(o.tributacoes||[]).includes(filtroTrib)) return false
    if(filtroAtiva==='ativa' && !o.ativa) return false
    if(filtroAtiva==='inativa' && o.ativa) return false
    if(filtroDia && o.dia_vencimento !== Number(filtroDia)) return false
    // Filtro multi CNPJ
    if(filtroCNPJs.length > 0) {
      const empresasObrig = o.empresas || []
      if(!filtroCNPJs.some(cnpj => empresasObrig.includes(cnpj))) return false
    }
    // Filtro grupo
    if(filtroGrupo && empresasDoGrupo.length > 0) {
      const empresasObrig = o.empresas || []
      if(!empresasDoGrupo.some(e => empresasObrig.includes(e))) return false
    }
    // Filtro multi obrigações
    if(filtroObrig.length > 0 && !filtroObrig.includes(o.id)) return false
    return true
  })

  const temFiltro = busca||filtroDept||filtroTrib||filtroAtiva||filtroDia||filtroCNPJs.length||filtroGrupo||filtroObrig.length
  const limparTudo = () => {
    setBusca(''); setFiltroDept(''); setFiltroTrib(''); setFiltroAtiva(''); setFiltroDia('')
    setFiltroCNPJs([]); setFiltroGrupo(''); setFiltroObrig([])
  }
  const toggleCNPJ = (cnpj) => setFiltroCNPJs(p => p.includes(cnpj) ? p.filter(x=>x!==cnpj) : [...p, cnpj])
  const toggleObrigFiltro = (id) => setFiltroObrig(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])

  const L = ({children,tip}) => <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#777', marginBottom:4, fontWeight:600 }}>{children}{tip&&<Info size={11} style={{ color:'#ccc' }} title={tip} />}</label>
  const SO = (opts) => opts.map(([v,l])=><option key={v} value={v}>{l}</option>)

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 44px)', fontFamily:'Inter, system-ui, sans-serif' }}>

      {/* Header — só aba lista */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', display:'flex', alignItems:'center', padding:'0 14px' }}>
        <button style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:NAVY, background:'none', border:'none', borderBottom:`2px solid ${GOLD}`, cursor:'default' }}>
          Obrigações ({obrigacoes.filter(o=>o.ativa).length} ativas)
        </button>
        <div style={{ marginLeft:'auto' }}>
          <button onClick={nova} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:8, background:NAVY, color:'#fff', fontWeight:600, fontSize:12, border:'none', cursor:'pointer' }}>
            <Plus size={13} /> Nova Obrigação
          </button>
        </div>
      </div>

      {/* Lista */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', padding:'8px 14px', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {/* Busca texto */}
          <div style={{ position:'relative', minWidth:200, flex:1 }}>
            <Search size={12} style={{ position:'absolute', left:8, top:8, color:'#bbb' }} />
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome ou mininome..." style={{ ...inp, paddingLeft:26, fontSize:12 }} />
          </div>

          {/* Dept */}
          <select value={filtroDept} onChange={e=>setFiltroDept(e.target.value)} style={{ ...sel, width:130, fontSize:12 }}>
            <option value="">Todos depts</option>
            <option>Fiscal</option><option>Pessoal</option><option>Contábil</option><option>Bancos</option>
          </select>

          {/* Tributação */}
          <select value={filtroTrib} onChange={e=>setFiltroTrib(e.target.value)} style={{ ...sel, width:155, fontSize:12 }}>
            <option value="">Todas tributações</option>
            {TRIBUTACOES.map(t=><option key={t} value={t}>{t}</option>)}
          </select>

          {/* Ativo */}
          <select value={filtroAtiva} onChange={e=>setFiltroAtiva(e.target.value)} style={{ ...sel, width:100, fontSize:12 }}>
            <option value="">Todas</option><option value="ativa">Ativas</option><option value="inativa">Inativas</option>
          </select>

          {/* Dia Venc */}
          <select value={filtroDia} onChange={e=>setFiltroDia(e.target.value)} style={{ ...sel, width:105, fontSize:12 }}>
            <option value="">📅 Dia Venc.</option>
            {[5,7,10,15,20,25,28,30,31].map(d=><option key={d} value={d}>Dia {d}</option>)}
          </select>

          {/* Grupo */}
          {grupos.length > 0 && (
            <select value={filtroGrupo} onChange={e=>setFiltroGrupo(e.target.value)} style={{ ...sel, width:130, fontSize:12 }}>
              <option value="">🏷️ Grupo</option>
              {grupos.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
          )}

          {/* Multi-CNPJ dropdown */}
          <div style={{ position:'relative' }}>
            <button type="button" onClick={()=>{setDropCNPJ(v=>!v);setDropObrig(false)}}
              style={{ ...sel, width:140, fontSize:12, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 10px', cursor:'pointer', background: filtroCNPJs.length?'#EBF5FF':'#fff', color:filtroCNPJs.length?NAVY:'#555', border:`1px solid ${filtroCNPJs.length?NAVY:'#e0e0e0'}`, fontWeight:filtroCNPJs.length?700:400 }}>
              🏢 {filtroCNPJs.length ? `${filtroCNPJs.length} CNPJ(s)` : 'CNPJ / Empresa'}
              <span style={{fontSize:9}}>▼</span>
            </button>
            {dropCNPJ && (
              <div style={{ position:'absolute', top:'100%', left:0, zIndex:50, background:'#fff', border:'1px solid #ddd', borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,.12)', padding:8, minWidth:260, maxHeight:280, overflowY:'auto' }}>
                <input value={buscaCNPJ} onChange={e=>setBuscaCNPJ(e.target.value)} placeholder="Buscar empresa ou CNPJ..." style={{...inp, marginBottom:6, fontSize:11}} autoFocus/>
                {filtroCNPJs.length > 0 && (
                  <button onClick={()=>setFiltroCNPJs([])} style={{width:'100%',marginBottom:6,padding:'4px',borderRadius:6,background:'#fee2e2',color:'#dc2626',border:'none',cursor:'pointer',fontSize:11}}>
                    ✕ Limpar seleção ({filtroCNPJs.length})
                  </button>
                )}
                {clientesFiltradosCNPJ.length === 0
                  ? <div style={{padding:'8px',color:'#aaa',fontSize:11,textAlign:'center'}}>Nenhum cliente encontrado</div>
                  : clientesFiltradosCNPJ.map(c => {
                    const cnpjKey = c.cnpj || c.nome || String(c.id)
                    const sel2 = filtroCNPJs.includes(cnpjKey)
                    return (
                      <label key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 4px',cursor:'pointer',borderRadius:5,background:sel2?'#EBF5FF':'transparent',marginBottom:2}}>
                        <input type="checkbox" checked={sel2} onChange={()=>toggleCNPJ(cnpjKey)} style={{accentColor:NAVY}}/>
                        <div>
                          <div style={{fontSize:12,fontWeight:sel2?700:400,color:NAVY}}>{c.nome||c.razao_social}</div>
                          <div style={{fontSize:10,color:'#888'}}>{c.cnpj}{c.grupo?` · ${c.grupo}`:''}</div>
                        </div>
                      </label>
                    )
                  })
                }
              </div>
            )}
          </div>

          {/* Multi-Obrigações dropdown */}
          <div style={{ position:'relative' }}>
            <button type="button" onClick={()=>{setDropObrig(v=>!v);setDropCNPJ(false)}}
              style={{ ...sel, width:150, fontSize:12, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 10px', cursor:'pointer', background:filtroObrig.length?'#F3EEFF':'#fff', color:filtroObrig.length?'#6B3EC9':'#555', border:`1px solid ${filtroObrig.length?'#6B3EC9':'#e0e0e0'}`, fontWeight:filtroObrig.length?700:400 }}>
              📋 {filtroObrig.length ? `${filtroObrig.length} Obrig.` : 'Obrigações'}
              <span style={{fontSize:9}}>▼</span>
            </button>
            {dropObrig && (
              <div style={{ position:'absolute', top:'100%', left:0, zIndex:50, background:'#fff', border:'1px solid #ddd', borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,.12)', padding:8, minWidth:280, maxHeight:280, overflowY:'auto' }}>
                <input value={buscaObrigFiltro} onChange={e=>setBuscaObrigFiltro(e.target.value)} placeholder="Buscar obrigação..." style={{...inp, marginBottom:6, fontSize:11}} autoFocus/>
                {filtroObrig.length > 0 && (
                  <button onClick={()=>setFiltroObrig([])} style={{width:'100%',marginBottom:6,padding:'4px',borderRadius:6,background:'#fee2e2',color:'#dc2626',border:'none',cursor:'pointer',fontSize:11}}>
                    ✕ Limpar seleção ({filtroObrig.length})
                  </button>
                )}
                {obrigacoes
                  .filter(o => !buscaObrigFiltro || o.nome.toLowerCase().includes(buscaObrigFiltro.toLowerCase()) || (o.mininome||'').toLowerCase().includes(buscaObrigFiltro.toLowerCase()))
                  .map(o => {
                    const isSel = filtroObrig.includes(o.id)
                    const dc = DEPT_CORES[o.departamento]||{bg:'#f5f5f5',color:'#666'}
                    return (
                      <label key={o.id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 4px',cursor:'pointer',borderRadius:5,background:isSel?'#F3EEFF':'transparent',marginBottom:2}}>
                        <input type="checkbox" checked={isSel} onChange={()=>toggleObrigFiltro(o.id)} style={{accentColor:'#6B3EC9'}}/>
                        <div>
                          <div style={{fontSize:12,fontWeight:isSel?700:400,color:NAVY}}>{o.nome}</div>
                          <div style={{fontSize:10}}>
                            <span style={{background:dc.bg,color:dc.color,borderRadius:4,padding:'1px 5px'}}>{o.departamento}</span>
                            {' · '}{o.mininome}
                          </div>
                        </div>
                      </label>
                    )
                  })}
              </div>
            )}
          </div>

          {/* Limpar */}
          {temFiltro && (
            <button onClick={limparTudo}
              style={{ display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:7,background:'#fee2e2',color:'#dc2626',border:'1px solid #fca5a5',fontSize:11,fontWeight:600,cursor:'pointer' }}>
              <X size={11}/> Limpar
            </button>
          )}
          <span style={{ fontSize:11, color:'#aaa', whiteSpace:'nowrap' }}>{filtradas.length} resultado(s)</span>

          {/* Fechar dropdowns ao clicar fora */}
          {(dropCNPJ||dropObrig) && <div style={{position:'fixed',inset:0,zIndex:49}} onClick={()=>{setDropCNPJ(false);setDropObrig(false)}}/>}
        </div>
        <div style={{ flex:1, overflowY:'auto', background:'#f8f9fb' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#fff', borderBottom:'2px solid #e8e8e8', position:'sticky', top:0, zIndex:1 }}>
                {['Obrigação','Mini','Departamento','Tributação','Dia Venc.','Empresas','WhatsApp','Status','Ações'].map(h=>(
                  <th key={h} style={{ padding:'7px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((o,i) => {
                const dc = DEPT_CORES[o.departamento]||{bg:'#f5f5f5',color:'#666'}
                return (
                  <tr key={o.id} style={{ background:o.ativa?(i%2===0?'#fff':'#fafafa'):'#f5f5f5', borderBottom:'1px solid #f0f0f0', opacity:o.ativa?1:0.6 }}>
                    <td style={{ padding:'8px 10px' }}>
                      <div style={{ fontWeight:600, color:NAVY, fontSize:12 }}>{o.nome}</div>
                      <div style={{ display:'flex', gap:4, marginTop:2 }}>
                        {o.exigir_robo && <span style={{ fontSize:9, padding:'1px 5px', borderRadius:5, background:'#EDE9FF', color:'#6366f1' }}>🤖 Robô</span>}
                        {o.passivel_multa && <span style={{ fontSize:9, padding:'1px 5px', borderRadius:5, background:'#FEF2F2', color:'#dc2626' }}>⚠ Multa</span>}
                        {o.whatsapp && <span style={{ fontSize:9, padding:'1px 5px', borderRadius:5, background:'#EDFBF1', color:'#1A7A3C' }}>💬 WA</span>}
                      </div>
                    </td>
                    <td style={{ padding:'8px 10px', color:'#888', fontFamily:'monospace', fontSize:11 }}>{o.mininome}</td>
                    <td style={{ padding:'8px 10px' }}>
                      <span style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:dc.bg, color:dc.color, fontWeight:600 }}>{o.departamento}</span>
                      <div style={{ fontSize:10, color:'#aaa', marginTop:2 }}>{o.responsavel}</div>
                    </td>
                    <td style={{ padding:'8px 10px' }}>
                      {(o.tributacoes||[]).length===0
                        ? <span style={{ fontSize:10, color:'#ccc', fontStyle:'italic' }}>Todas</span>
                        : <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>{(o.tributacoes||[]).map(t=><span key={t} style={{ fontSize:9, padding:'1px 5px', borderRadius:5, background:GOLD+'20', color:GOLD, fontWeight:600 }}>{t}</span>)}</div>
                      }
                    </td>
                    <td style={{ padding:'8px 10px', color:'#555', fontSize:11 }}>Dia {o.dia_vencimento}</td>
                    <td style={{ padding:'8px 10px' }}>
                      <button onClick={()=>abrirEmp(o)} style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:6, background:(o.empresas||[]).length>0?'#EBF5FF':'#f5f5f5', color:(o.empresas||[]).length>0?'#1D6FA4':'#aaa', border:'none', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                        <Building2 size={11} /> {(o.empresas||[]).length}
                      </button>
                    </td>
                    <td style={{ padding:'8px 10px' }}>
                      {o.whatsapp ? <span style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:'#EDFBF1', color:'#1A7A3C', fontWeight:600 }}>✓</span> : <span style={{ fontSize:10, color:'#ddd' }}>—</span>}
                    </td>
                    <td style={{ padding:'8px 10px' }}>
                      <span style={{ fontSize:10, padding:'2px 8px', borderRadius:7, background:o.ativa?'#F0FDF4':'#f5f5f5', color:o.ativa?'#166534':'#888', fontWeight:600 }}>{o.ativa?'● Ativa':'○ Inativa'}</span>
                    </td>
                    <td style={{ padding:'8px 10px' }}>
                      <div style={{ display:'flex', gap:4 }}>
                        <button onClick={()=>editar(o)} style={{ padding:'4px 8px', borderRadius:6, background:'#EBF5FF', color:'#1D6FA4', border:'none', cursor:'pointer', fontSize:11 }}>✏️</button>
                        <button onClick={()=>abrirEmp(o)} title="Vincular empresa" style={{ padding:'4px 8px', borderRadius:6, background:GOLD+'20', color:GOLD, border:'none', cursor:'pointer', fontSize:11 }}>🏢</button>
                        <button onClick={()=>excluir(o.id)} style={{ padding:'4px 8px', borderRadius:6, background:'#FEF2F2', color:'#dc2626', border:'none', cursor:'pointer', fontSize:11 }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtradas.length===0 && <div style={{ textAlign:'center', padding:40, color:'#bbb' }}>Nenhuma obrigação encontrada</div>}
        </div>
      </div>

      {/* ── MODAL CADASTRO / EDIÇÃO ── */}
      {modalCadastro && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'16px', overflowY:'auto' }}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:1100, boxShadow:'0 8px 40px rgba(0,0,0,0.2)', marginBottom:16 }}>
            {/* Header modal */}
            <div style={{ padding:'14px 22px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'#fff', zIndex:1, borderRadius:'14px 14px 0 0' }}>
              <div style={{ fontWeight:700, color:NAVY, fontSize:16 }}>{editandoId ? '✏️ Editar Obrigação' : '➕ Nova Obrigação'}</div>
              <button onClick={()=>setModalCadastro(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'#999' }}>×</button>
            </div>

            <div style={{ padding:22 }}>
              {/* Linha 1: Nome + Mini + Dept + Tempo */}
              <div style={{ display:'grid', gridTemplateColumns:'3fr 1fr 2fr 1fr', gap:10, marginBottom:14 }}>
                <div>
                  <L tip="Nome completo da obrigação">Nome da obrigação *</L>
                  <div style={{ display:'flex', gap:5 }}>
                    <input value={form.nome} onChange={e=>setF('nome',e.target.value)} placeholder="Nome da obrigação" style={inp} />
                    <button onClick={()=>setF('mininome',form.nome.slice(0,12))} style={{ padding:'0 8px', borderRadius:7, border:'1px solid #e0e0e0', background:'#f5f5f5', cursor:'pointer', fontSize:11 }}>📋</button>
                  </div>
                </div>
                <div>
                  <L>Mininome</L>
                  <input value={form.mininome} onChange={e=>setF('mininome',e.target.value.slice(0,12))} placeholder="Ex: ADMTOSAL" style={inp} maxLength={12} />
                </div>
                <div>
                  <L>Departamento e Responsável *</L>
                  <select value={`${form.departamento} - ${form.responsavel}`} onChange={e=>{ const [d,...r]=e.target.value.split(' - '); setF('departamento',d); setF('responsavel',r.join(' - ')) }} style={sel}>
                    {['Fiscal - Eduardo Pimentel','Fiscal - Gleidson Tavares','Pessoal - Luciene Alves','Pessoal - Eduardo Pimentel','Contábil - Carlos Eduardo Araújo Marques Pimentel','Contábil 2 - Yasmin Larissa','Bancos - Indefinido'].map(op=><option key={op} value={op}>{op}</option>)}
                  </select>
                </div>
                <div>
                  <L>Tempo previsto (min)</L>
                  <input type="number" value={form.tempo_previsto} onChange={e=>setF('tempo_previsto',e.target.value)} style={inp} min={0} />
                </div>
              </div>

              {/* Entregas por mês */}
              <div style={{ marginBottom:14 }}>
                <L>Dias de entrega por mês ↓</L>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:7 }}>
                  {MESES.map((m,i)=>(
                    <div key={m}>
                      <div style={{ fontSize:10, color:'#aaa', marginBottom:3 }}>Entrega {m} ↓</div>
                      <select value={form.meses[i]} onChange={e=>setDia(i,e.target.value)} style={{ ...sel, fontSize:11, padding:'5px 6px' }}>
                        {DIAS_OPTS.map(d=><option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Config prazos */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom:14 }}>
                <div><L>Lembrar responsável quantos dias antes?</L>
                  <select value={form.lembrar_dias} onChange={e=>setF('lembrar_dias',e.target.value)} style={sel}>{SO([['0','0 dia antes'],['3','3 dias antes'],['5','5 dias antes'],['7','7 dias antes'],['10','10 dias antes'],['15','15 dias antes']])}</select></div>
                <div><L>Tipo do dias antes</L>
                  <select value={form.tipo_dias} onChange={e=>setF('tipo_dias',e.target.value)} style={sel}>{SO([['corridos','Dias Corridos'],['uteis','Dias Úteis']])}</select></div>
                <div><L>Prazos fixos em dias não-úteis</L>
                  <select value={form.prazo_fixo} onChange={e=>setF('prazo_fixo',e.target.value)} style={sel}>{SO([['antecipar','Antecipar para o dia útil anterior'],['postergar','Postergar para próximo dia útil']])}</select></div>
                <div><L>Sábado é útil?</L>
                  <select value={form.sabado_util?'sim':'nao'} onChange={e=>setF('sabado_util',e.target.value==='sim')} style={sel}>{SO([['nao','Não'],['sim','Sim']])}</select></div>
              </div>

              {/* Config obrigação */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:10, marginBottom:14 }}>
                <div><L>Competências referentes a</L>
                  <select value={form.competencia} onChange={e=>setF('competencia',e.target.value)} style={sel}>{SO([['mes_atual','Mês atual'],['mes_anterior','Mês anterior'],['2_meses_anterior','2 meses anteriores'],['ano_anterior','Ano anterior']])}</select></div>
                <div><L>Exigir Robô?</L>
                  <select value={form.exigir_robo?'sim':'nao'} onChange={e=>setF('exigir_robo',e.target.value==='sim')} style={sel}>{SO([['nao','Não'],['sim','Sim']])}</select></div>
                <div><L>Passível de multa?</L>
                  <select value={form.passivel_multa?'sim':'nao'} onChange={e=>setF('passivel_multa',e.target.value==='sim')} style={sel}>{SO([['nao','Não'],['sim','Sim']])}</select></div>
                <div><L>Alerta guia ñ-lida?</L>
                  <select value={form.alerta_guia?'sim':'nao'} onChange={e=>setF('alerta_guia',e.target.value==='sim')} style={sel}>{SO([['sim','Sim'],['nao','Não']])}</select></div>
                <div><L>Ativa?</L>
                  <select value={form.ativa?'sim':'nao'} onChange={e=>setF('ativa',e.target.value==='sim')} style={sel}>{SO([['sim','Sim'],['nao','Não']])}</select></div>
              </div>

              {/* WhatsApp */}
              <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:8, border:'1px solid #e8e8e8', background:'#fafafa', display:'flex', alignItems:'center', gap:14 }}>
                <MessageSquare size={18} style={{ color:'#22c55e' }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:NAVY }}>Notificação WhatsApp</div>
                  <div style={{ fontSize:11, color:'#aaa' }}>Ao marcar como entregue, notifica automaticamente o cliente</div>
                </div>
                <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer' }}>
                  <input type="checkbox" checked={form.whatsapp} onChange={e=>setF('whatsapp',e.target.checked)} style={{ width:16, height:16, accentColor:'#22c55e' }} />
                  <span style={{ fontSize:13, fontWeight:700, color:form.whatsapp?'#22c55e':'#aaa' }}>{form.whatsapp?'Ativo':'Inativo'}</span>
                </label>
              </div>

              {/* Tributação */}
              <div style={{ marginBottom:14 }}>
                <L>Tributação (Regimes que usam esta obrigação)</L>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap', padding:'10px 12px', borderRadius:8, border:'1px solid #e8e8e8', background:'#fafafa' }}>
                  {TRIBUTACOES.map(t => {
                    const s=form.tributacoes.includes(t)
                    return (
                      <button key={t} onClick={()=>toggleTrib(t)} style={{ padding:'5px 12px', borderRadius:20, fontSize:12, cursor:'pointer', border:`1px solid ${s?NAVY:'#ddd'}`, background:s?NAVY:'#fff', color:s?'#fff':'#666', fontWeight:s?700:400 }}>
                        {s?'✓ ':''}{t}
                      </button>
                    )
                  })}
                </div>
                <div style={{ fontSize:10, color:'#aaa', marginTop:4 }}>💡 Se nenhum regime selecionado, disponível para todos os clientes.</div>
              </div>

              {/* Comentário */}
              <div style={{ marginBottom:14 }}>
                <L>Comentário Padrão</L>
                <textarea value={form.comentario_padrao} onChange={e=>setF('comentario_padrao',e.target.value)} placeholder="Comentário padrão..." style={{ ...inp, height:60, resize:'vertical', fontFamily:'inherit' }} />
              </div>

              {/* Empresas vinculadas */}
              <div style={{ marginBottom:16, padding:'12px 14px', borderRadius:9, border:`2px dashed ${GOLD}60`, background:GOLD+'06' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:NAVY }}>Empresas vinculadas [{(form.empresas||[]).length}]</div>
                  </div>
                  <button onClick={()=>abrirEmp({id:editandoId||'_novo',...form})} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:8, background:GOLD, color:NAVY, fontSize:12, fontWeight:700, border:'none', cursor:'pointer' }}>
                    <Plus size={12} /> Adicionar empresa
                  </button>
                </div>
                {(form.empresas||[]).length>0 && (
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:6 }}>
                    {form.empresas.map(e=><span key={e} style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:'#EBF5FF', color:'#1D6FA4' }}>{e}</span>)}
                  </div>
                )}
              </div>

              {/* Botões */}
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:14, borderTop:'1px solid #f0f0f0' }}>
                <button onClick={()=>setModalCadastro(false)} style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 16px', borderRadius:8, background:'#f5f5f5', color:'#555', fontSize:13, border:'none', cursor:'pointer' }}><X size={13}/> Cancelar</button>
                <button onClick={salvar} disabled={!form.nome} style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 22px', borderRadius:8, background:form.nome?'#22c55e':'#ccc', color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:form.nome?'pointer':'default' }}><Save size={13}/> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Empresas ── */}
      {modalEmp && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:520, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #f0f0f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700, color:NAVY, fontSize:14 }}>Vincular Empresa à Obrigação</div>
                <div style={{ fontSize:11, color:'#999', marginTop:2 }}>{modalEmp.nome}</div>
              </div>
              <button onClick={()=>setModalEmp(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#aaa' }}><X size={18}/></button>
            </div>
            <div style={{ padding:'10px 20px', borderBottom:'1px solid #f0f0f0' }}>
              <div style={{ position:'relative' }}>
                <Search size={12} style={{ position:'absolute', left:8, top:8, color:'#bbb' }} />
                <input value={buscaEmp} onChange={e=>setBuscaEmp(e.target.value)} placeholder="Buscar empresa..." style={{ ...inp, paddingLeft:26, fontSize:12 }} />
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'8px 20px' }}>
              {clientes.length===0 ? (
                <div style={{ padding:20, textAlign:'center', color:'#ccc', fontSize:13 }}>
                  Nenhum cliente cadastrado.<br/>
                  <span style={{ fontSize:11 }}>Cadastre clientes na aba "Clientes".</span>
                </div>
              ) : clientes.filter(c=>(c.nome||c.nome_razao||'').toLowerCase().includes(buscaEmp.toLowerCase())||(c.cnpj||'').includes(buscaEmp)).map(c=>{
                const nome=c.nome_razao||c.nome||''
                const s=empSel.includes(nome)
                return (
                  <label key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', cursor:'pointer', borderBottom:'1px solid #f5f5f5' }}>
                    <input type="checkbox" checked={s} onChange={()=>setEmpSel(v=>s?v.filter(x=>x!==nome):[...v,nome])} style={{ width:15, height:15, accentColor:NAVY }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:NAVY }}>{nome}</div>
                      <div style={{ fontSize:11, color:'#aaa', marginTop:1 }}>{c.cnpj} · {c.regime||c.tributacao||'—'}</div>
                    </div>
                    {s && <Check size={14} style={{ color:'#22c55e' }} />}
                  </label>
                )
              })}
            </div>
            <div style={{ padding:'12px 20px', borderTop:'1px solid #f0f0f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:11, color:'#aaa' }}>{empSel.length} empresa(s)</span>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>setModalEmp(null)} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #ddd', background:'#fff', cursor:'pointer', fontSize:12 }}>Cancelar</button>
                <button onClick={salvarEmp} style={{ padding:'7px 16px', borderRadius:8, background:NAVY, color:'#fff', fontWeight:700, cursor:'pointer', fontSize:12, border:'none' }}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
