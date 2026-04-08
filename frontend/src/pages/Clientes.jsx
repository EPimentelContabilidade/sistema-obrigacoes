import { useState, useEffect } from 'react'
import { Search, Plus, X, Save, ChevronLeft, ChevronRight, User, MapPin, FileText, Phone, CheckCircle, AlertCircle, Zap } from 'lucide-react'
import { TRIBUTACOES, obrigacoesPorTributacao } from './obrigacoesData'

const NAVY = '#1B2A4A'
const GOLD  = '#C5A55A'
const API   = '/api/v1'

const inp = { padding:'7px 10px', borderRadius:6, border:'1px solid #ddd', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', color:'#333' }
const sel = { ...inp, cursor:'pointer', background:'#fff' }

// ── ALTERAÇÃO 1: helper catálogo v2 ──────────────────────────────────────────
function obrigsCatalogo(regime) {
  try {
    const mapa = {
      'Simples Nacional': 'Simples Nacional',
      'MEI': 'MEI',
      'Lucro Presumido': 'Lucro Presumido',
      'Lucro Real': 'Lucro Real',
      'RET': 'RET/Imobiliário',
      'Imune/Isento': 'Simples Nacional',
    };
    const chave = mapa[regime] || regime;
    const cat = JSON.parse(localStorage.getItem('ep_obrigacoes_catalogo_v2') || 'null');
    if (!cat) return [];
    return (cat[chave] || []).filter(o => o.ativo);
  } catch { return []; }
}

const REGIME_OBRIG_AUTO = {
  'Simples Nacional': [27,33,50,68,75,78,86],
  'MEI': [28,29,33],
  'Lucro Real': [18,19,20,21,22,23,43,44,45,47,48,86,87,88],
  'Lucro Presumido': [18,19,20,21,22,23,43,44,45,86,87],
  'RET': [26,41,42,73,96],
  'Imune/Isento': [30,31,38],
}

const OBRIGAS_COMUNS = [3,4,12,30,34,42,46,47,48,53,56,59,60,61,65,74,75,82,83,84,90]

const ABA_TABS = [
  { id:'dados',       label:'📋 Dados',       icon:User },
  { id:'endereco',    label:'📍 Endereço',    icon:MapPin },
  { id:'responsavel', label:'👤 Responsável', icon:User },
  { id:'comunicacao', label:'📱 Comunicação', icon:Phone },
]

// ── ALTERAÇÃO 2: obrigacoes_catalogo no FORM_VAZIO ───────────────────────────
const FORM_VAZIO = {
  nome:'', cnpj:'', email:'', whatsapp:'', telefone:'',
  regime:'Simples Nacional', tributacao:'Simples Nacional', grupo:'', nome_fantasia:'',
  data_abertura:'', inscricao_municipal:'', inscricao_estadual:'',
  cep:'', logradouro:'', numero:'', complemento:'', bairro:'', cidade:'', estado:'',
  responsaveis:[],
  contatos:[{nome:'',departamento:'',cargo:'',email:'',whatsapp:'',telefone:'',tipo:'principal'}],
  dia_vencimento:20, periodicidade:'Mensal', valor_honorario:0,
  email_nfe:'', email_folha:'', canal_padrao:'whatsapp',
  obrigacoes_vinculadas:[], obrigacoes_catalogo:[], observacoes:'', ativo:true,
}

export default function Clientes() {
  const [clientes, setClientes]     = useState([])
  const [form, setForm]             = useState(FORM_VAZIO)
  const [editId, setEditId]         = useState(null)
  const [aba, setAba]               = useState('lista')
  const [abaForm, setAbaForm]       = useState('dados')
  const [busca,       setBusca]       = useState('')
  const [filtroReg,   setFiltroReg]   = useState('')
  const [filtroStatus,setFiltroStatus]= useState('')
  const [filtroCanal, setFiltroCanal] = useState('')
  const [filtroObrig, setFiltroObrig] = useState('')
  const [buscandoCNPJ, setBuscandoCNPJ] = useState(false)
  const [modalObrig,    setModalObrig]    = useState(false)
  const [abaObrig,      setAbaObrig]      = useState('lista')
  const [buscaObrig,    setBuscaObrig]    = useState('')
  const [deptSel,       setDeptSel]       = useState('Todos')
  const [obrigSugeridas, setObrigSugeridas] = useState([])
  const [confirmObrig, setConfirmObrig] = useState(false)

  useEffect(() => { carregarClientes() }, [])

  const carregarClientes = async () => {
    try {
      const local = localStorage.getItem('ep_clientes')
      if (local) {
        const parsed = JSON.parse(local)
        if (parsed?.length > 0) setClientes(parsed)
      }
    } catch {}
    try {
      const r = await fetch(`${API}/clientes/`)
      if (r.ok) {
        const d   = await r.json()
        const back = d.clientes || d || []
        if (back.length > 0) {
          const local = JSON.parse(localStorage.getItem('ep_clientes')||'[]')
          const merged = back.map(bc => {
            const lc = local.find(x=>String(x.id)===String(bc.id))
            return lc ? { ...bc, ...lc } : bc
          })
          local.forEach(lc => {
            if (!merged.find(m=>String(m.id)===String(lc.id))) merged.push(lc)
          })
          setClientes(merged)
          localStorage.setItem('ep_clientes', JSON.stringify(merged))
        }
      }
    } catch {}
  }

  const setF = (k,v) => setForm(f => ({ ...f, [k]:v }))

  // ── ALTERAÇÃO 3: onTributacaoChange com catálogo v2 ───────────────────────
  const onTributacaoChange = (novoRegime) => {
    setF('tributacao', novoRegime)
    setF('regime', novoRegime)
    const obrigEspecificas = REGIME_OBRIG_AUTO[novoRegime] || []
    const todas = [...new Set([...OBRIGAS_COMUNS, ...obrigEspecificas])]
    setObrigSugeridas(todas)
    setF('obrigacoes_vinculadas', todas)
    setConfirmObrig(true)
    // Novo catálogo ConfiguracoesTarefas
    setF('obrigacoes_catalogo', obrigsCatalogo(novoRegime))
  }

  const gerarObrigacoes = () => {
    if (!form.tributacao) return
    const obrigEspecificas = REGIME_OBRIG_AUTO[form.tributacao] || []
    const todas = [...new Set([...OBRIGAS_COMUNS, ...obrigEspecificas])]
    setF('obrigacoes_vinculadas', todas)
    setF('obrigacoes_catalogo', obrigsCatalogo(form.tributacao))
    setConfirmObrig(true)
    if (editId) {
      const clisLocal = JSON.parse(localStorage.getItem('ep_clientes')||'[]')
      const updated = clisLocal.map(c =>
        String(c.id)===String(editId) ? {...c, obrigacoes_vinculadas: todas, obrigacoes_catalogo: obrigsCatalogo(form.tributacao), tributacao: form.tributacao, regime: form.tributacao} : c
      )
      localStorage.setItem('ep_clientes', JSON.stringify(updated))
      setClientes(updated)
    }
  }

  const confirmarObrigacoes = () => {
    setModalObrig(false)
    if (editId) {
      const clisLocal = JSON.parse(localStorage.getItem('ep_clientes')||'[]')
      const updated = clisLocal.map(c =>
        String(c.id)===String(editId) ? {...c, obrigacoes_vinculadas: form.obrigacoes_vinculadas} : c
      )
      localStorage.setItem('ep_clientes', JSON.stringify(updated))
      setClientes(updated)
    }
  }

  const buscarCNPJ = async () => {
    if (!form.cnpj || form.cnpj.replace(/\D/g,'').length < 14) return
    setBuscandoCNPJ(true)
    try {
      const cnpj = form.cnpj.replace(/\D/g,'')
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
      if (r.ok) {
        const d = await r.json()
        setForm(f => ({
          ...f,
          nome: d.razao_social || f.nome,
          nome_fantasia: d.nome_fantasia || f.nome_fantasia,
          logradouro: d.logradouro || f.logradouro,
          numero: d.numero || f.numero,
          complemento: d.complemento || f.complemento,
          bairro: d.bairro || f.bairro,
          cidade: d.municipio || f.cidade,
          estado: d.uf || f.estado,
          cep: d.cep || f.cep,
          data_abertura: d.data_inicio_atividade || f.data_abertura,
        }))
      }
    } catch {}
    setBuscandoCNPJ(false)
  }

  // ── ALTERAÇÃO 4: obrigacoes_catalogo no salvar ────────────────────────────
  const salvar = async () => {
    const novoCliente = {
      ...form,
      id:   editId || Date.now(),
      ativo: form.ativo !== false,
      obrigacoes_vinculadas: form.obrigacoes_vinculadas || [],
      obrigacoes_catalogo:   form.obrigacoes_catalogo   || [],
      responsaveis: form.responsaveis || [],
      contatos:     form.contatos     || [],
      tributacao:   form.tributacao   || '',
      regime:       form.regime       || form.tributacao || '',
    }

    let novaLista = []
    setClientes(p => {
      novaLista = editId
        ? p.map(x => x.id === editId ? novoCliente : x)
        : [...p, novoCliente]
      localStorage.setItem('ep_clientes', JSON.stringify(novaLista))
      return novaLista
    })

    setForm({...FORM_VAZIO, responsaveis:[], contatos:[{nome:'',departamento:'',cargo:'',email:'',whatsapp:'',telefone:'',tipo:'principal'}]})
    setEditId(null)
    setAba('lista')

    try {
      const metodo = editId ? 'PUT' : 'POST'
      const url    = editId ? `${API}/clientes/${editId}` : `${API}/clientes/`
      await fetch(url, { method:metodo, headers:{'Content-Type':'application/json'}, body:JSON.stringify(novoCliente) })
    } catch {}
  }

  const nova = () => { setForm({...FORM_VAZIO, responsaveis:[], contatos:[]}); setEditId(null); setAba('cadastro'); setAbaForm('dados') }
  const editar = (cli) => {
    setForm({
      ...FORM_VAZIO,
      ...cli,
      obrigacoes_vinculadas: cli.obrigacoes_vinculadas || [],
      obrigacoes_catalogo:   cli.obrigacoes_catalogo   || [],
      responsaveis: cli.responsaveis || [],
      contatos: cli.contatos?.length ? cli.contatos : [{nome:'',departamento:'',cargo:'',email:'',whatsapp:'',telefone:'',tipo:'principal'}],
      ativo: cli.ativo !== false,
      tributacao: cli.tributacao || cli.regime || '',
      regime:     cli.regime     || cli.tributacao || '',
    })
    setEditId(cli.id)
    setAba('cadastro')
    setAbaForm('dados')
  }

  const clientesFiltrados = clientes.filter(c => {
    if (busca && !c.nome?.toLowerCase().includes(busca.toLowerCase()) && !c.cnpj?.includes(busca)) return false
    if (filtroReg && (c.tributacao||c.regime) !== filtroReg) return false
    if (filtroStatus === 'ativo' && c.ativo === false) return false
    if (filtroStatus === 'inativo' && c.ativo !== false) return false
    if (filtroCanal && c.canal_padrao !== filtroCanal) return false
    if (filtroObrig === 'com' && !(c.obrigacoes_vinculadas||[]).length) return false
    if (filtroObrig === 'sem' && (c.obrigacoes_vinculadas||[]).length > 0) return false
    return true
  })

  const cores_trib = { 'Simples Nacional':'#EBF5FF:#1D6FA4', 'MEI':'#FEF9C3:#854D0E', 'Lucro Real':'#F3EEFF:#6B3EC9', 'Lucro Presumido':'#EDE9FF:#5b21b6', 'RET':'#EDFBF1:#1A7A3C', 'Imune/Isento':'#F9FAFB:#6B7280' }
  const cTrib = (t) => { const [bg,c]=(cores_trib[t]||'#f5f5f5:#666').split(':'); return {bg,c} }

  const obrigsPorTrib = obrigacoesPorTributacao(form.tributacao)

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 44px)', fontFamily:'Inter, system-ui, sans-serif' }}>

      {/* Abas */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', display:'flex', alignItems:'center', padding:'0 16px' }}>
        <button onClick={()=>setAba('lista')} style={{ padding:'11px 16px', fontSize:13, fontWeight:aba==='lista'?700:400, color:aba==='lista'?NAVY:'#999', background:'none', border:'none', borderBottom:aba==='lista'?`2px solid ${GOLD}`:'2px solid transparent', cursor:'pointer' }}>
          Clientes
        </button>
        {aba==='cadastro' && (
          <button style={{ padding:'11px 16px', fontSize:13, fontWeight:700, color:NAVY, background:'none', border:'none', borderBottom:`2px solid ${GOLD}`, cursor:'default' }}>
            {editId ? 'Editar Cliente' : 'Novo Cliente'}
          </button>
        )}
        <div style={{ marginLeft:'auto' }}>
          <button onClick={nova} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, background:NAVY, color:'#fff', fontWeight:600, fontSize:12, border:'none', cursor:'pointer' }}>
            <Plus size={13} /> Novo Cliente
          </button>
        </div>
      </div>

      {/* ── LISTA ── */}
      {aba==='lista' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', padding:'8px 16px' }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
              <div style={{ position:'relative', flex:1, maxWidth:380 }}>
                <Search size={12} style={{ position:'absolute', left:8, top:8, color:'#bbb' }} />
                <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome ou CNPJ..." style={{ ...inp, paddingLeft:26 }} />
              </div>
              {(filtroReg||filtroStatus||filtroCanal||filtroObrig||busca) && (
                <button onClick={()=>{setBusca('');setFiltroReg('');setFiltroStatus('');setFiltroCanal('');setFiltroObrig('')}} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:7, background:'#fee2e2', color:'#dc2626', border:'1px solid #fca5a5', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  <X size={11}/> Limpar filtros
                </button>
              )}
              <span style={{ fontSize:12, color:'#aaa', marginLeft:'auto' }}>{clientesFiltrados.length} cliente(s)</span>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <select value={filtroReg} onChange={e=>setFiltroReg(e.target.value)} style={{ ...sel, width:160, fontSize:12 }}>
                <option value="">Todos os regimes</option>
                {TRIBUTACOES.filter(t=>t!=='Todos').map(t=><option key={t} value={t}>{t}</option>)}
              </select>
              <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} style={{ ...sel, width:120, fontSize:12 }}>
                <option value="">Todos status</option>
                <option value="ativo">● Ativo</option>
                <option value="inativo">○ Inativo</option>
              </select>
              <select value={filtroCanal} onChange={e=>setFiltroCanal(e.target.value)} style={{ ...sel, width:140, fontSize:12 }}>
                <option value="">Todos canais</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="email">📧 E-mail</option>
                <option value="ambos">📲 Ambos</option>
              </select>
              <select value={filtroObrig} onChange={e=>setFiltroObrig(e.target.value)} style={{ ...sel, width:150, fontSize:12 }}>
                <option value="">Todas obrigações</option>
                <option value="com">Com obrigações</option>
                <option value="sem">Sem obrigações</option>
              </select>
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto', background:'#f8f9fb' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#fff', borderBottom:'2px solid #e8e8e8', position:'sticky', top:0, zIndex:1 }}>
                  {['Cliente','CNPJ','Regime / Tributação','Responsável','Canal','Obrig.','Catálogo','Status','Ações'].map(h=>(
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((c,i) => {
                  const ct = cTrib(c.tributacao||c.regime)
                  return (
                    <tr key={c.id} style={{ background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0' }}>
                      <td style={{ padding:'9px 12px', fontWeight:600, color:NAVY }}>
                        {c.nome}
                        {c.nome_fantasia && <div style={{ fontSize:10, color:'#aaa', marginTop:1 }}>{c.nome_fantasia}</div>}
                      </td>
                      <td style={{ padding:'9px 12px', color:'#555', fontFamily:'monospace', fontSize:11 }}>{c.cnpj}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:8, background:ct.bg, color:ct.c, fontWeight:600 }}>{c.tributacao||c.regime||'—'}</span>
                      </td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:'#555' }}>{c.responsavel||c.nome_responsavel||'—'}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, textAlign:'center' }}>{c.canal_padrao==='whatsapp'?'💬':'📧'}</td>
                      <td style={{ padding:'9px 12px', textAlign:'center' }}>
                        <span style={{ fontSize:11, padding:'2px 7px', borderRadius:6, background:'#EBF5FF', color:NAVY, fontWeight:600 }}>{(c.obrigacoes_vinculadas||[]).length}</span>
                      </td>
                      <td style={{ padding:'9px 12px', textAlign:'center' }}>
                        <span style={{ fontSize:11, padding:'2px 7px', borderRadius:6, background:'#FFFBF0', color:'#854D0E', fontWeight:600, border:'1px solid #C5A55A44' }}>
                          {(c.obrigacoes_catalogo||[]).length > 0 ? `📋 ${(c.obrigacoes_catalogo||[]).length}` : '—'}
                        </span>
                      </td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:8, background:c.ativo!==false?'#F0FDF4':'#f5f5f5', color:c.ativo!==false?'#166534':'#888', fontWeight:600 }}>
                          {c.ativo!==false?'● Ativo':'○ Inativo'}
                        </span>
                      </td>
                      <td style={{ padding:'9px 12px' }}>
                        <button onClick={()=>editar(c)} style={{ padding:'4px 9px', borderRadius:6, background:'#EBF5FF', color:'#1D6FA4', border:'none', cursor:'pointer', fontSize:11 }}>✏️ Editar</button>
                      </td>
                    </tr>
                  )
                })}
                {clientesFiltrados.length===0 && (
                  <tr><td colSpan={9} style={{ padding:40, textAlign:'center', color:'#ccc' }}>Nenhum cliente encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CADASTRO ── */}
      {aba==='cadastro' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', display:'flex', padding:'0 16px', overflowX:'auto' }}>
            {ABA_TABS.map(a => (
              <button key={a.id} onClick={()=>setAbaForm(a.id)} style={{ padding:'10px 16px', fontSize:12, fontWeight:abaForm===a.id?700:400, color:abaForm===a.id?NAVY:'#888', background:'none', border:'none', borderBottom:abaForm===a.id?`2px solid ${GOLD}`:'2px solid transparent', cursor:'pointer', whiteSpace:'nowrap' }}>
                {a.label}
              </button>
            ))}
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:20, background:'#f8f9fb' }}>
            <div style={{ maxWidth:900, margin:'0 auto', background:'#fff', borderRadius:12, padding:24, border:'1px solid #e8e8e8' }}>

              {/* ABA: DADOS */}
              {abaForm==='dados' && (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                    <div>
                      <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>CNPJ *</label>
                      <div style={{ display:'flex', gap:8 }}>
                        <input value={form.cnpj} onChange={e=>setF('cnpj',e.target.value)} placeholder="00.000.000/0001-00" style={{ ...inp, flex:1 }} />
                        <button onClick={buscarCNPJ} disabled={buscandoCNPJ} style={{ padding:'7px 14px', borderRadius:7, background:GOLD, color:NAVY, fontWeight:700, fontSize:12, border:'none', cursor:'pointer', whiteSpace:'nowrap' }}>
                          {buscandoCNPJ?'Buscando...':'🔍 Buscar Receita'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Razão Social *</label>
                      <input value={form.nome} onChange={e=>setF('nome',e.target.value)} placeholder="Razão Social" style={inp} />
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
                    <div>
                      <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Nome Fantasia</label>
                      <input value={form.nome_fantasia} onChange={e=>setF('nome_fantasia',e.target.value)} placeholder="Nome Fantasia" style={inp} />
                    </div>
                    <div>
                      <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Data de Abertura</label>
                      <input type="date" value={form.data_abertura} onChange={e=>setF('data_abertura',e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Grupo</label>
                      <input value={form.grupo} onChange={e=>setF('grupo',e.target.value)} placeholder="Sem grupo" style={inp} />
                    </div>
                  </div>

                  {/* TRIBUTAÇÃO */}
                  <div style={{ marginBottom:14, padding:'14px 16px', borderRadius:10, border:`2px solid ${GOLD}40`, background:GOLD+'06' }}>
                    <label style={{ fontSize:12, color:NAVY, fontWeight:700, display:'block', marginBottom:8 }}>
                      💼 Regime Tributário / Tributação *
                    </label>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8, marginBottom:10 }}>
                      {TRIBUTACOES.filter(t=>t!=='Todos').map(t => {
                        const ct = cTrib(t)
                        const isSelected = form.tributacao === t
                        return (
                          <button key={t} onClick={()=>onTributacaoChange(t)} style={{ padding:'8px 6px', borderRadius:8, cursor:'pointer', border:`2px solid ${isSelected?ct.c:'#ddd'}`, background:isSelected?ct.bg:'#fff', color:isSelected?ct.c:'#888', fontWeight:isSelected?700:400, fontSize:11, textAlign:'center', transition:'all 0.15s' }}>
                            {t}
                          </button>
                        )
                      })}
                    </div>
                    {form.tributacao && (
                      <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:NAVY, padding:'8px 12px', borderRadius:7, background:'#f0f4ff', border:'1px solid #c7d7fd' }}>
                        <span style={{ flex:1 }}>✓ Regime <b>{form.tributacao}</b> selecionado — <b>{obrigacoesPorTributacao(form.tributacao).length} obrigações</b> disponíveis.</span>
                        <button onClick={()=>setModalObrig(true)} style={{ color:NAVY, background:'none', border:'none', cursor:'pointer', fontWeight:700, textDecoration:'underline', fontSize:11, whiteSpace:'nowrap' }}>
                          Ver obrigações →
                        </button>
                        <button onClick={gerarObrigacoes} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:7, background:NAVY, color:'#fff', fontWeight:700, fontSize:11, border:'none', cursor:'pointer', whiteSpace:'nowrap' }}>
                          <Zap size={11}/> Gerar Obrigações
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Alerta obrigações geradas */}
                  {confirmObrig && (
                    <div style={{ marginBottom:12, padding:'12px 16px', borderRadius:9, background:'#F0FDF4', border:'1px solid #bbf7d0', display:'flex', alignItems:'center', gap:10 }}>
                      <CheckCircle size={18} style={{ color:'#22c55e', flexShrink:0 }} />
                      <div style={{ flex:1, fontSize:12, color:'#166534' }}>
                        <b>{form.obrigacoes_vinculadas.length} obrigações</b> vinculadas para o regime <b>{form.tributacao}</b>.
                        <button onClick={()=>setModalObrig(true)} style={{ marginLeft:8, color:NAVY, background:'none', border:'none', cursor:'pointer', fontWeight:700, textDecoration:'underline', fontSize:11 }}>
                          Personalizar →
                        </button>
                      </div>
                      <button onClick={()=>setConfirmObrig(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#aaa' }}><X size={14} /></button>
                    </div>
                  )}

                  {/* ── ALTERAÇÃO 5: painel catálogo ConfiguracoesTarefas ──────── */}
                  {form.tributacao && (form.obrigacoes_catalogo || obrigsCatalogo(form.tributacao)).length > 0 && (
                    <div style={{ marginBottom:14, padding:'12px 16px', borderRadius:10, border:'1px solid #C5A55A33', background:'#FFFBF0' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:16 }}>📋</span>
                          <span style={{ fontWeight:700, color:NAVY, fontSize:13 }}>
                            Obrigações do Catálogo (Config. Tarefas)
                          </span>
                          <span style={{ fontSize:11, padding:'1px 8px', borderRadius:10, background:NAVY, color:'#fff', fontWeight:700 }}>
                            {(form.obrigacoes_catalogo || obrigsCatalogo(form.tributacao)).length} ativas
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            const lista = form.obrigacoes_catalogo?.length ? form.obrigacoes_catalogo : obrigsCatalogo(form.tributacao)
                            setF('obrigacoes_catalogo', lista)
                            if (editId) {
                              const local = JSON.parse(localStorage.getItem('ep_clientes')||'[]')
                              const updated = local.map(c => String(c.id)===String(editId) ? {...c, obrigacoes_catalogo:lista, tributacao:form.tributacao} : c)
                              localStorage.setItem('ep_clientes', JSON.stringify(updated))
                              setClientes(updated)
                            }
                          }}
                          style={{ fontSize:11, padding:'4px 12px', borderRadius:7, background:NAVY, color:'#fff', border:'none', cursor:'pointer', fontWeight:700 }}
                        >
                          ✅ Vincular ao Cliente
                        </button>
                      </div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                        {(form.obrigacoes_catalogo?.length ? form.obrigacoes_catalogo : obrigsCatalogo(form.tributacao)).map(o => (
                          <span key={o.codigo} title={`${o.nome} · ${o.periodicidade} · Venc: ${o.dias_entrega?.Janeiro||'Dia 20'}`} style={{
                            fontSize:11, padding:'3px 9px', borderRadius:8,
                            background: o.passivel_multa==='Sim' ? '#FEF2F2' : '#F0F4FF',
                            color: o.passivel_multa==='Sim' ? '#DC2626' : NAVY,
                            border: `1px solid ${o.passivel_multa==='Sim' ? '#FCA5A5' : '#C7D7FD'}`,
                            fontWeight:600, display:'inline-flex', alignItems:'center', gap:3, cursor:'default'
                          }}>
                            {o.passivel_multa==='Sim' && <span title="Passível de multa">⚠️</span>}
                            {o.exigir_robo==='Sim' && <span title="Exige Robô">🤖</span>}
                            {o.notif_whatsapp && <span title="Notificação WhatsApp">💬</span>}
                            {o.notif_email && <span title="Notificação E-mail">✉️</span>}
                            {o.codigo}
                            <span style={{ fontWeight:400, color:'#888', fontSize:10 }}>· {o.periodicidade}</span>
                          </span>
                        ))}
                      </div>
                      <div style={{ marginTop:8, fontSize:11, color:'#888' }}>
                        💡 Passe o mouse nos badges para ver detalhes. Configure em <b>Config. Tarefas → Obrigações por Regime</b>
                      </div>
                    </div>
                  )}

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
                    <div>
                      <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Inscrição Municipal</label>
                      <input value={form.inscricao_municipal} onChange={e=>setF('inscricao_municipal',e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Inscrição Estadual</label>
                      <input value={form.inscricao_estadual} onChange={e=>setF('inscricao_estadual',e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Status do Cliente</label>
                      <div style={{ display:'flex', gap:8, marginTop:4 }}>
                        {[['ativo','● Ativo','#22c55e'],['inativo','○ Inativo','#dc2626']].map(([v,l,cor])=>(
                          <button key={v} onClick={()=>setF('ativo', v==='ativo')} style={{ flex:1, padding:'7px 8px', borderRadius:8, cursor:'pointer', border:`2px solid ${form.ativo!==false&&v==='ativo'||form.ativo===false&&v==='inativo'?cor:'#e8e8e8'}`, background:form.ativo!==false&&v==='ativo'||form.ativo===false&&v==='inativo'?cor+'15':'#fff', color:form.ativo!==false&&v==='ativo'||form.ativo===false&&v==='inativo'?cor:'#aaa', fontWeight:form.ativo!==false&&v==='ativo'||form.ativo===false&&v==='inativo'?700:400, fontSize:12 }}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Observações</label>
                    <textarea value={form.observacoes} onChange={e=>setF('observacoes',e.target.value)} style={{ ...inp, height:70, resize:'vertical', fontFamily:'inherit' }} />
                  </div>
                </>
              )}

              {/* ABA: ENDEREÇO */}
              {abaForm==='endereco' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12 }}>
                  {[
                    { k:'cep',         l:'CEP',         p:'00000-000', g:1 },
                    { k:'logradouro',  l:'Logradouro',  p:'Rua...',    g:2 },
                    { k:'numero',      l:'Número',      p:'',          g:1 },
                    { k:'complemento', l:'Complemento', p:'Apto...',   g:1 },
                    { k:'bairro',      l:'Bairro',      p:'',          g:1 },
                    { k:'cidade',      l:'Cidade',      p:'',          g:1 },
                    { k:'estado',      l:'Estado (UF)', p:'GO',        g:1 },
                  ].map(f2=>(
                    <div key={f2.k} style={{ gridColumn:`span ${f2.g}` }}>
                      <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>{f2.l}</label>
                      <input value={form[f2.k]} onChange={e=>setF(f2.k,e.target.value)} placeholder={f2.p} style={inp} />
                    </div>
                  ))}
                </div>
              )}

              {/* ABA: RESPONSÁVEL */}
              {abaForm==='responsavel' && (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:NAVY }}>Responsáveis vinculados</div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={()=>setF('responsaveis',[...(form.responsaveis||[]),{tipo:'PF',nome:'',cpf_cnpj:'',cargo:'',email:'',whatsapp:''}])} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, background:NAVY, color:'#fff', fontSize:12, fontWeight:600, border:'none', cursor:'pointer' }}>
                        + Pessoa Física (PF)
                      </button>
                      <button onClick={()=>setF('responsaveis',[...(form.responsaveis||[]),{tipo:'PJ',nome:'',cpf_cnpj:'',cargo:'',email:'',whatsapp:''}])} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, background:GOLD, color:NAVY, fontSize:12, fontWeight:600, border:'none', cursor:'pointer' }}>
                        + Pessoa Jurídica (PJ)
                      </button>
                    </div>
                  </div>
                  {(form.responsaveis||[]).length===0 && (
                    <div style={{ padding:30, textAlign:'center', color:'#ccc', background:'#fafafa', borderRadius:10, border:'2px dashed #e8e8e8' }}>
                      <div style={{ fontSize:28, marginBottom:8 }}>👤</div>
                      <div style={{ fontSize:13 }}>Nenhum responsável vinculado.</div>
                      <div style={{ fontSize:11, marginTop:4 }}>Clique em "+ Pessoa Física" ou "+ Pessoa Jurídica" para adicionar.</div>
                    </div>
                  )}
                  {(form.responsaveis||[]).map((resp,ri)=>(
                    <div key={ri} style={{ marginBottom:14, padding:'14px 16px', borderRadius:10, border:`1px solid ${resp.tipo==='PJ'?GOLD:'#3b82f6'}30`, background:resp.tipo==='PJ'?GOLD+'06':'#EBF5FF' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:11, padding:'2px 9px', borderRadius:12, fontWeight:700, background:resp.tipo==='PJ'?GOLD:NAVY, color:resp.tipo==='PJ'?NAVY:'#fff' }}>{resp.tipo}</span>
                          <span style={{ fontSize:12, fontWeight:600, color:NAVY }}>{resp.nome||`Responsável ${ri+1}`}</span>
                        </div>
                        <button onClick={()=>setF('responsaveis',form.responsaveis.filter((_,i)=>i!==ri))} style={{ padding:'3px 8px', borderRadius:6, background:'#FEF2F2', color:'#dc2626', border:'none', cursor:'pointer', fontSize:11 }}>🗑️</button>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:10, marginBottom:8 }}>
                        <div>
                          <label style={{ fontSize:10, color:'#888', fontWeight:600, display:'block', marginBottom:3 }}>Nome {resp.tipo==='PJ'?'da Empresa':'Completo'} *</label>
                          <input value={resp.nome} onChange={e=>{const r=[...form.responsaveis];r[ri]={...r[ri],nome:e.target.value};setF('responsaveis',r)}} placeholder={resp.tipo==='PJ'?'Razão Social':'Nome completo'} style={inp} />
                        </div>
                        <div>
                          <label style={{ fontSize:10, color:'#888', fontWeight:600, display:'block', marginBottom:3 }}>{resp.tipo==='PJ'?'CNPJ':'CPF'}</label>
                          <input value={resp.cpf_cnpj} onChange={e=>{const r=[...form.responsaveis];r[ri]={...r[ri],cpf_cnpj:e.target.value};setF('responsaveis',r)}} placeholder={resp.tipo==='PJ'?'00.000.000/0001-00':'000.000.000-00'} style={inp} />
                        </div>
                        <div>
                          <label style={{ fontSize:10, color:'#888', fontWeight:600, display:'block', marginBottom:3 }}>Cargo / Função</label>
                          <input value={resp.cargo} onChange={e=>{const r=[...form.responsaveis];r[ri]={...r[ri],cargo:e.target.value};setF('responsaveis',r)}} placeholder="Sócio, Diretor..." style={inp} />
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <div>
                          <label style={{ fontSize:10, color:'#888', fontWeight:600, display:'block', marginBottom:3 }}>E-mail</label>
                          <input type="email" value={resp.email} onChange={e=>{const r=[...form.responsaveis];r[ri]={...r[ri],email:e.target.value};setF('responsaveis',r)}} placeholder="email@empresa.com" style={inp} />
                        </div>
                        <div>
                          <label style={{ fontSize:10, color:'#888', fontWeight:600, display:'block', marginBottom:3 }}>WhatsApp</label>
                          <input value={resp.whatsapp} onChange={e=>{const r=[...form.responsaveis];r[ri]={...r[ri],whatsapp:e.target.value};setF('responsaveis',r)}} placeholder="+55 62 9 9999-9999" style={inp} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ABA: COMUNICAÇÃO */}
              {abaForm==='comunicacao' && (
                <div>
                  <div style={{ marginBottom:16, padding:'12px 14px', borderRadius:9, border:'1px solid #e8e8e8', background:'#fafafa' }}>
                    <label style={{ fontSize:10, color:'#888', fontWeight:700, display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>Canal Padrão de Entrega</label>
                    <div style={{ display:'flex', gap:8 }}>
                      {[['whatsapp','💬 WhatsApp','#22c55e'],['email','📧 E-mail','#3b82f6'],['ambos','📲 Ambos',NAVY]].map(([v,l,cor])=>(
                        <button key={v} onClick={()=>setF('canal_padrao',v)} style={{ padding:'7px 16px', borderRadius:8, cursor:'pointer', border:`2px solid ${form.canal_padrao===v?cor:'#e8e8e8'}`, background:form.canal_padrao===v?cor+'15':'#fff', color:form.canal_padrao===v?cor:'#888', fontWeight:form.canal_padrao===v?700:400, fontSize:12 }}>{l}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:NAVY }}>Contatos</div>
                    <button onClick={()=>setF('contatos',[...(form.contatos||[]),{nome:'',departamento:'',cargo:'',email:'',whatsapp:'',telefone:'',tipo:'geral'}])} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:7, background:NAVY, color:'#fff', fontSize:12, fontWeight:600, border:'none', cursor:'pointer' }}>
                      + Adicionar contato
                    </button>
                  </div>
                  {(form.contatos||[]).map((ct,ci)=>{
                    const isPrincipal = ct.tipo==='principal' || ci===0
                    return (
                      <div key={ci} style={{ marginBottom:10, padding:'14px 16px', borderRadius:10, border:`1px solid ${isPrincipal?NAVY+'30':'#e8e8e8'}`, background:isPrincipal?'#f8f9ff':'#fff' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            {isPrincipal && <span style={{ fontSize:11 }}>📌</span>}
                            <span style={{ fontSize:12, fontWeight:700, color:NAVY }}>{isPrincipal?'Contato Principal':ct.nome||`Contato ${ci+1}`}</span>
                            {!isPrincipal && (
                              <select value={ct.tipo} onChange={e=>{const cs=[...form.contatos];cs[ci]={...cs[ci],tipo:e.target.value};setF('contatos',cs)}} style={{ ...sel, width:130, fontSize:11, padding:'3px 7px' }}>
                                {['geral','financeiro','fiscal','pessoal','diretoria','ti','outro'].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                              </select>
                            )}
                            {ct.whatsapp && (
                              <a href={`https://wa.me/${ct.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 9px', borderRadius:8, background:'#EDFBF1', color:'#1A7A3C', fontSize:10, fontWeight:700, textDecoration:'none' }}>💬 WhatsApp</a>
                            )}
                            {ct.email && (
                              <a href={`mailto:${ct.email}`} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 9px', borderRadius:8, background:'#EFF6FF', color:'#1D4ED8', fontSize:10, fontWeight:700, textDecoration:'none' }}>📧 E-mail</a>
                            )}
                          </div>
                          {!isPrincipal && (
                            <button onClick={()=>setF('contatos',form.contatos.filter((_,i)=>i!==ci))} style={{ padding:'3px 8px', borderRadius:6, background:'#FEF2F2', color:'#dc2626', border:'none', cursor:'pointer', fontSize:11 }}>🗑️</button>
                          )}
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:10, marginBottom:8 }}>
                          <div>
                            <label style={{ fontSize:10, color:'#888', fontWeight:600, display:'block', marginBottom:3 }}>Nome</label>
                            <input value={ct.nome} onChange={e=>{const cs=[...form.contatos];cs[ci]={...cs[ci],nome:e.target.value};setF('contatos',cs)}} placeholder={isPrincipal?'Nome do contato principal':'Nome completo'} style={inp} />
                          </div>
                          <div>
                            <label style={{ fontSize:10, color:'#888', fontWeight:600, display:'block', marginBottom:3 }}>Departamento</label>
                            <select value={ct.departamento||''} onChange={e=>{const cs=[...form.contatos];cs[ci]={...cs[ci],departamento:e.target.value};setF('contatos',cs)}} style={sel}>
                              <option value="">Selecione...</option>
                              {['Financeiro','Fiscal','Contábil','Pessoal/RH','Diretoria','Compras','TI','Jurídico','Comercial','Outro'].map(d=><option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize:10, color:'#888', fontWeight:600, display:'block', marginBottom:3 }}>Cargo / Função</label>
                            <input value={ct.cargo||''} onChange={e=>{const cs=[...form.contatos];cs[ci]={...cs[ci],cargo:e.target.value};setF('contatos',cs)}} placeholder="Gerente, Sócio..." style={inp} />
                          </div>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                          <div>
                            <label style={{ fontSize:10, color:'#888', fontWeight:600, display:'block', marginBottom:3 }}>E-mail</label>
                            <input type="email" value={ct.email||''} onChange={e=>{const cs=[...form.contatos];cs[ci]={...cs[ci],email:e.target.value};setF('contatos',cs)}} placeholder="email@empresa.com" style={inp} />
                          </div>
                          <div>
                            <label style={{ fontSize:10, color:'#888', fontWeight:600, display:'block', marginBottom:3 }}>WhatsApp</label>
                            <div style={{ display:'flex', gap:5 }}>
                              <input value={ct.whatsapp||''} onChange={e=>{const cs=[...form.contatos];cs[ci]={...cs[ci],whatsapp:e.target.value};setF('contatos',cs)}} placeholder="+55 62 9 9999-9999" style={{ ...inp, flex:1 }} />
                              {ct.whatsapp && (
                                <a href={`https://wa.me/${ct.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', padding:'0 9px', borderRadius:7, background:'#22c55e', color:'#fff', fontSize:16, textDecoration:'none', flexShrink:0 }}>💬</a>
                              )}
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize:10, color:'#888', fontWeight:600, display:'block', marginBottom:3 }}>Telefone</label>
                            <input value={ct.telefone||''} onChange={e=>{const cs=[...form.contatos];cs[ci]={...cs[ci],telefone:e.target.value};setF('contatos',cs)}} placeholder="(62) 3333-4444" style={inp} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {(form.contatos||[]).length===0 && (
                    <div style={{ padding:20, textAlign:'center', color:'#ccc', background:'#fafafa', borderRadius:9, border:'2px dashed #e8e8e8' }}>
                      <div style={{ fontSize:11 }}>Clique em "+ Adicionar contato" para incluir.</div>
                    </div>
                  )}
                </div>
              )}

              {/* Botões */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:14, marginTop:14, borderTop:'1px solid #f0f0f0' }}>
                <button onClick={()=>{ const idx=ABA_TABS.findIndex(a=>a.id===abaForm); if(idx>0) setAbaForm(ABA_TABS[idx-1].id); else setAba('lista') }} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, background:'#f5f5f5', color:'#555', fontSize:13, border:'none', cursor:'pointer' }}>
                  <ChevronLeft size={14} /> {ABA_TABS.findIndex(a=>a.id===abaForm)>0?'Anterior':'Cancelar'}
                </button>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>setModalObrig(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, background:'#f0f4ff', color:NAVY, fontSize:12, fontWeight:600, border:`1px solid ${NAVY}30`, cursor:'pointer' }}>
                    📋 Obrigações ({form.obrigacoes_vinculadas.length})
                  </button>
                  <button onClick={salvar} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 20px', borderRadius:8, background:'#22c55e', color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
                    <Save size={14} /> Salvar
                  </button>
                  {ABA_TABS.findIndex(a=>a.id===abaForm)<ABA_TABS.length-1 && (
                    <button onClick={()=>setAbaForm(ABA_TABS[ABA_TABS.findIndex(a=>a.id===abaForm)+1].id)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, background:NAVY, color:'#fff', fontSize:12, fontWeight:600, border:'none', cursor:'pointer' }}>
                      Próximo <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Obrigações vinculadas */}
      {modalObrig && (() => {
        const DEPTS = ['Todos','Fiscal','Pessoal','Contábil','Bancos']
        const DEPT_RESP = {
          Fiscal:   { responsavel:'Gleidson Tavares',  cor:{bg:'#EBF5FF',color:'#1D6FA4'} },
          Pessoal:  { responsavel:'Luciene Alves',     cor:{bg:'#EDFBF1',color:'#1A7A3C'} },
          Contábil: { responsavel:'Carlos Eduardo A. M. Pimentel', cor:{bg:'#F3EEFF',color:'#6B3EC9'} },
          Bancos:   { responsavel:'Indefinido',        cor:{bg:'#FEF9C3',color:'#854D0E'} },
        }
        const filtObrig = obrigsPorTrib.filter(o => {
          if (buscaObrig && !o.nome?.toLowerCase().includes(buscaObrig.toLowerCase()) && !o.mininome?.toLowerCase().includes(buscaObrig.toLowerCase())) return false
          if (deptSel !== 'Todos' && o.departamento !== deptSel) return false
          return true
        })
        return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:660, maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', borderBottom:'1px solid #f0f0f0' }}>
              <div>
                <div style={{ fontWeight:700, color:NAVY, fontSize:14 }}>Obrigações Vinculadas</div>
                <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>
                  {form.tributacao} · <b style={{color:NAVY}}>{form.obrigacoes_vinculadas.length}</b> selecionadas de {obrigsPorTrib.length} disponíveis
                </div>
              </div>
              <button onClick={()=>setModalObrig(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#aaa' }}><X size={18} /></button>
            </div>
            <div style={{ display:'flex', borderBottom:'1px solid #e8e8e8', padding:'0 20px', background:'#fff' }}>
              {[['lista','📋 Lista'],['departamento','🏢 Por Departamento']].map(([id,label])=>(
                <button key={id} onClick={()=>setAbaObrig(id)} style={{ padding:'9px 14px', fontSize:12, fontWeight:abaObrig===id?700:400, color:abaObrig===id?NAVY:'#999', background:'none', border:'none', borderBottom:abaObrig===id?`2px solid ${GOLD}`:'2px solid transparent', cursor:'pointer' }}>{label}</button>
              ))}
            </div>
            <div style={{ padding:'8px 20px', borderBottom:'1px solid #f0f0f0', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <div style={{ position:'relative', flex:1, minWidth:180 }}>
                <Search size={11} style={{ position:'absolute', left:7, top:8, color:'#bbb' }} />
                <input value={buscaObrig} onChange={e=>setBuscaObrig(e.target.value)} placeholder="Buscar obrigação..." style={{ ...inp, paddingLeft:24, fontSize:12 }} />
              </div>
              {abaObrig==='lista' && (
                <div style={{ display:'flex', gap:5 }}>
                  {DEPTS.map(d=>(
                    <button key={d} onClick={()=>setDeptSel(d)} style={{ padding:'4px 10px', borderRadius:20, fontSize:11, cursor:'pointer', border:`1px solid ${deptSel===d?NAVY:'#ddd'}`, background:deptSel===d?NAVY:'#fff', color:deptSel===d?'#fff':'#666', fontWeight:deptSel===d?700:400 }}>{d}</button>
                  ))}
                </div>
              )}
              <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
                <button onClick={()=>setF('obrigacoes_vinculadas',filtObrig.map(o=>o.id))} style={{ padding:'4px 10px', borderRadius:7, background:NAVY, color:'#fff', fontSize:11, fontWeight:600, border:'none', cursor:'pointer' }}>Selec. ({filtObrig.length})</button>
                <button onClick={()=>setF('obrigacoes_vinculadas',[])} style={{ padding:'4px 10px', borderRadius:7, background:'#f5f5f5', color:'#555', fontSize:11, border:'none', cursor:'pointer' }}>Limpar</button>
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'8px 20px' }}>
              {abaObrig==='lista' && (
                filtObrig.length===0
                  ? <div style={{ textAlign:'center', padding:30, color:'#ccc', fontSize:13 }}>Nenhuma obrigação encontrada.</div>
                  : ['Fiscal','Pessoal','Contábil','Bancos'].map(dept => {
                    const lista = filtObrig.filter(o=>o.departamento===dept)
                    if (!lista.length) return null
                    const dr = DEPT_RESP[dept] || {}
                    return (
                      <div key={dept} style={{ marginBottom:16 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, paddingBottom:5, borderBottom:'1px solid #f0f0f0' }}>
                          <span style={{ fontSize:10, fontWeight:700, color:dr.cor?.color||'#666', textTransform:'uppercase', padding:'2px 8px', borderRadius:6, background:dr.cor?.bg||'#f5f5f5' }}>{dept}</span>
                          <span style={{ fontSize:11, color:'#aaa' }}>Responsável: <b style={{color:NAVY}}>{dr.responsavel||'—'}</b></span>
                          <span style={{ fontSize:10, color:'#bbb', marginLeft:'auto' }}>{lista.length} obrigações · {lista.filter(o=>form.obrigacoes_vinculadas.includes(o.id)).length} selecionadas</span>
                        </div>
                        {lista.map(o => {
                          const isSel = form.obrigacoes_vinculadas.includes(o.id)
                          return (
                            <label key={o.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 4px', cursor:'pointer', borderBottom:'1px solid #f8f8f8' }}>
                              <input type="checkbox" checked={isSel} onChange={()=>setF('obrigacoes_vinculadas', isSel ? form.obrigacoes_vinculadas.filter(id=>id!==o.id) : [...form.obrigacoes_vinculadas,o.id])} style={{ width:15, height:15, accentColor:NAVY }} />
                              <div style={{ flex:1 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                  <span style={{ fontSize:12, fontWeight:600, color:NAVY }}>{o.nome}</span>
                                  {o.exigir_robo && <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background:'#EDE9FF', color:'#6366f1' }}>🤖</span>}
                                  {o.passivel_multa && <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background:'#FEF2F2', color:'#dc2626' }}>⚠ multa</span>}
                                </div>
                                <div style={{ fontSize:10, color:'#aaa', marginTop:1 }}>{o.mininome} · {o.competencia} · Dia {o.dia_vencimento}</div>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    )
                  })
              )}
              {abaObrig==='departamento' && (
                <div>
                  {['Fiscal','Pessoal','Contábil','Bancos'].map(dept => {
                    const lista  = obrigsPorTrib.filter(o=>o.departamento===dept)
                    const selQtd = lista.filter(o=>form.obrigacoes_vinculadas.includes(o.id)).length
                    const dr     = DEPT_RESP[dept] || {}
                    if (!lista.length) return null
                    return (
                      <div key={dept} style={{ marginBottom:16, borderRadius:12, border:'1px solid #e8e8e8', overflow:'hidden' }}>
                        <div style={{ padding:'12px 16px', background: selQtd>0?dr.cor?.bg||'#f5f5f5':'#fafafa', borderBottom:'1px solid #f0f0f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                              <span style={{ fontSize:13, fontWeight:700, color:dr.cor?.color||NAVY }}>{dept}</span>
                              <span style={{ fontSize:10, padding:'2px 8px', borderRadius:8, background:dr.cor?.bg||'#f5f5f5', color:dr.cor?.color||'#666', fontWeight:600 }}>{lista.length} obrigações</span>
                            </div>
                            <div style={{ fontSize:11, color:'#777' }}>👤 Responsável: <b>{dr.responsavel||'—'}</b></div>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontSize:16, fontWeight:800, color:selQtd>0?dr.cor?.color||NAVY:'#ccc' }}>{selQtd}/{lista.length}</div>
                            <div style={{ fontSize:10, color:'#aaa' }}>selecionadas</div>
                            <div style={{ display:'flex', gap:5, marginTop:5 }}>
                              <button onClick={()=>{ const novos=[...form.obrigacoes_vinculadas,...lista.map(o=>o.id).filter(id=>!form.obrigacoes_vinculadas.includes(id))]; setF('obrigacoes_vinculadas',novos) }} style={{ padding:'3px 8px', borderRadius:6, background:NAVY, color:'#fff', fontSize:10, fontWeight:600, border:'none', cursor:'pointer' }}>Todos</button>
                              <button onClick={()=>{ setF('obrigacoes_vinculadas',form.obrigacoes_vinculadas.filter(id=>!lista.map(o=>o.id).includes(id))) }} style={{ padding:'3px 8px', borderRadius:6, background:'#f5f5f5', color:'#555', fontSize:10, border:'none', cursor:'pointer' }}>Nenhum</button>
                            </div>
                          </div>
                        </div>
                        <div>
                          {lista.filter(o=>buscaObrig?o.nome?.toLowerCase().includes(buscaObrig.toLowerCase()):true).map((o,oi)=>{
                            const isSel = form.obrigacoes_vinculadas.includes(o.id)
                            return (
                              <label key={o.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px', cursor:'pointer', background:oi%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f5f5f5' }}>
                                <input type="checkbox" checked={isSel} onChange={()=>setF('obrigacoes_vinculadas', isSel ? form.obrigacoes_vinculadas.filter(id=>id!==o.id) : [...form.obrigacoes_vinculadas,o.id])} style={{ width:15, height:15, accentColor:dr.cor?.color||NAVY }} />
                                <div style={{ flex:1 }}>
                                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                                    <span style={{ fontSize:12, fontWeight:isSel?600:400, color:isSel?NAVY:'#555' }}>{o.nome}</span>
                                    {o.exigir_robo && <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background:'#EDE9FF', color:'#6366f1' }}>🤖</span>}
                                    {o.passivel_multa && <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background:'#FEF2F2', color:'#dc2626' }}>⚠ multa</span>}
                                  </div>
                                  <div style={{ fontSize:10, color:'#aaa', marginTop:1 }}>{o.mininome} · {o.competencia} · Dia {o.dia_vencimento}</div>
                                </div>
                                {isSel && <span style={{ fontSize:10, color:dr.cor?.color||NAVY, fontWeight:700 }}>✓</span>}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div style={{ padding:'12px 20px', borderTop:'1px solid #f0f0f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8f9fb' }}>
              <div style={{ fontSize:12, color:NAVY }}>
                <b style={{ fontSize:16 }}>{form.obrigacoes_vinculadas.length}</b> obrigações selecionadas
                <span style={{ marginLeft:8, fontSize:11, color:'#aaa' }}>
                  ({['Fiscal','Pessoal','Contábil','Bancos'].map(d=>`${d}: ${obrigsPorTrib.filter(o=>o.departamento===d&&form.obrigacoes_vinculadas.includes(o.id)).length}`).join(' · ')})
                </span>
              </div>
              <button onClick={confirmarObrigacoes} style={{ padding:'8px 22px', borderRadius:8, background:NAVY, color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>Confirmar</button>
            </div>
          </div>
        </div>
        )
      })()}
    </div>
  )
}
