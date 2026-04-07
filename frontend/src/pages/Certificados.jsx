import { useState, useEffect } from 'react'
import { Search, Plus, X, Upload, Download, AlertTriangle, CheckCircle, Clock, Shield, User, Building2, Filter } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'
const API  = '/api/v1'
const inp  = { padding:'7px 10px', borderRadius:6, border:'1px solid #ddd', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', color:'#333' }

const statusCert = (validade) => {
  if (!validade) return { label:'Sem data', cor:'#aaa', bg:'#f5f5f5', icon:'—', dias: null }
  const hoje = new Date()
  const venc  = new Date(validade)
  const dias  = Math.ceil((venc - hoje) / (1000*60*60*24))
  if (dias < 0)   return { label:'Vencido',      cor:'#dc2626', bg:'#FEF2F2', icon:'✗', dias }
  if (dias <= 30) return { label:`${dias}d`,      cor:'#f59e0b', bg:'#FEF9C3', icon:'⚠', dias }
  if (dias <= 90) return { label:`${dias}d`,      cor:'#3b82f6', bg:'#EFF6FF', icon:'⏳', dias }
  return             { label:'OK',               cor:'#16a34a', bg:'#F0FDF4', icon:'✓', dias }
}

const fmtData = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('pt-BR') } catch { return d }
}

const CERT_VAZIO = {
  tipo:'PJ', cliente_id:'', cliente_nome:'', responsavel_nome:'', responsavel_cpf:'',
  numero_serie:'', validade:'', emissao:'', arquivo_nome:'', observacoes:'',
  senha:'', autoridade_cert:'ICP-Brasil', tipo_cert:'A1',
}

export default function Certificados() {
  const [certs,     setCerts]     = useState([])
  const [clientes,  setClientes]  = useState([])
  const [form,      setForm]      = useState(CERT_VAZIO)
  const [aba,       setAba]       = useState('lista')
  const [editId,    setEditId]    = useState(null)
  const [busca,     setBusca]     = useState('')
  const [filtroTipo,setFiltroTipo]= useState('')
  const [filtroSt,  setFiltroSt]  = useState('')
  const [modalExc,  setModalExc]  = useState(null)
  const [sociosSel, setSociosSel] = useState([])

  useEffect(() => {
    // Carregar clientes do localStorage
    try {
      const local = localStorage.getItem('ep_clientes')
      if (local) setClientes(JSON.parse(local)||[])
    } catch {}
    // Carregar certificados
    try {
      const local = localStorage.getItem('ep_certificados')
      if (local) setCerts(JSON.parse(local)||[])
    } catch {}
    fetch(`${API}/certificados/`)
      .then(r=>r.ok?r.json():{})
      .then(d=>{
        const lista = d.certificados||d||[]
        if (lista.length>0) {
          const local = JSON.parse(localStorage.getItem('ep_certificados')||'[]')
          const merged = lista.map(b=>{
            const l = local.find(x=>String(x.id)===String(b.id))
            return l?{...b,...l}:b
          })
          local.forEach(l=>{ if(!merged.find(m=>String(m.id)===String(l.id))) merged.push(l) })
          setCerts(merged)
          localStorage.setItem('ep_certificados', JSON.stringify(merged))
        }
      }).catch(()=>{})
  }, [])

  const setF = (k,v) => setForm(f=>({...f,[k]:v}))

  // Ao selecionar cliente, carrega sócios disponíveis
  const onClienteChange = (cliId) => {
    setF('cliente_id', cliId)
    const cli = clientes.find(c=>String(c.id)===String(cliId))
    setF('cliente_nome', cli?.nome||'')
    setSociosSel(cli?.responsaveis||[])
    // Se PJ, limpar campos PF
    if (form.tipo==='PJ') {
      setF('responsavel_nome','')
      setF('responsavel_cpf','')
    }
  }

  const onTipoChange = (tipo) => {
    setF('tipo', tipo)
    if (tipo==='PJ') {
      setF('responsavel_nome','')
      setF('responsavel_cpf','')
    }
  }

  const onSocioChange = (socio) => {
    if (!socio) { setF('responsavel_nome',''); setF('responsavel_cpf',''); return }
    const s = sociosSel.find(x=>x.nome===socio)
    if (s) { setF('responsavel_nome', s.nome); setF('responsavel_cpf', s.cpf_cnpj||'') }
  }

  const salvar = () => {
    const novoCert = { ...form, id: editId||Date.now() }
    const nova = editId
      ? certs.map(x=>x.id===editId?novoCert:x)
      : [...certs, novoCert]
    setCerts(nova)
    localStorage.setItem('ep_certificados', JSON.stringify(nova))
    // Tentar sincronizar backend
    try {
      const metodo = editId?'PUT':'POST'
      const url    = editId?`${API}/certificados/${editId}`:`${API}/certificados/`
      fetch(url, { method:metodo, headers:{'Content-Type':'application/json'}, body:JSON.stringify(novoCert) })
    } catch {}
    setForm(CERT_VAZIO); setEditId(null); setAba('lista')
  }

  const excluir = (id) => {
    const nova = certs.filter(x=>x.id!==id)
    setCerts(nova)
    localStorage.setItem('ep_certificados', JSON.stringify(nova))
    setModalExc(null)
  }

  const editar = (c) => { setForm({...CERT_VAZIO,...c}); setEditId(c.id); setAba('cadastro')
    const cli = clientes.find(x=>String(x.id)===String(c.cliente_id))
    setSociosSel(cli?.responsaveis||[])
  }

  const exportarCSV = () => {
    const header = 'Tipo,Cliente,Titular,CPF/CNPJ,Validade,Status,Número Série,Autoridade,Tipo Cert'
    const rows = certsFiltrados.map(c=>{
      const st = statusCert(c.validade)
      return [c.tipo,c.cliente_nome,c.responsavel_nome||c.cliente_nome,c.responsavel_cpf||'',fmtData(c.validade),st.label,c.numero_serie||'',c.autoridade_cert||'',c.tipo_cert||''].join(',')
    })
    const blob = new Blob([[header,...rows].join('\n')], {type:'text/csv'})
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='certificados.csv'; a.click()
  }

  const certsFiltrados = certs.filter(c=>{
    if (busca && !c.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) && !c.responsavel_nome?.toLowerCase().includes(busca.toLowerCase()) && !c.numero_serie?.includes(busca)) return false
    if (filtroTipo && c.tipo!==filtroTipo) return false
    if (filtroSt) {
      const st = statusCert(c.validade)
      if (filtroSt==='ok'      && st.dias!==null && st.dias<=90) return false
      if (filtroSt==='alerta'  && !(st.dias!==null && st.dias>0  && st.dias<=90)) return false
      if (filtroSt==='vencido' && !(st.dias!==null && st.dias<=0)) return false
    }
    return true
  })

  const vencidos  = certs.filter(c=>{ const s=statusCert(c.validade); return s.dias!==null&&s.dias<0 }).length
  const alerta30  = certs.filter(c=>{ const s=statusCert(c.validade); return s.dias!==null&&s.dias>=0&&s.dias<=30 }).length
  const alerta90  = certs.filter(c=>{ const s=statusCert(c.validade); return s.dias!==null&&s.dias>30&&s.dias<=90 }).length
  const ok        = certs.filter(c=>{ const s=statusCert(c.validade); return s.dias!==null&&s.dias>90 }).length

  const cliAtual = clientes.find(c=>String(c.id)===String(form.cliente_id))

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 44px)', fontFamily:'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', display:'flex', alignItems:'center', padding:'0 16px' }}>
        <button onClick={()=>setAba('lista')} style={{ padding:'11px 16px', fontSize:13, fontWeight:aba==='lista'?700:400, color:aba==='lista'?NAVY:'#999', background:'none', border:'none', borderBottom:aba==='lista'?`2px solid ${GOLD}`:'2px solid transparent', cursor:'pointer' }}>
          Certificados Digitais
        </button>
        {aba==='cadastro'&&<button style={{ padding:'11px 16px', fontSize:13, fontWeight:700, color:NAVY, background:'none', border:'none', borderBottom:`2px solid ${GOLD}`, cursor:'default' }}>{editId?'Editar':'Novo Certificado'}</button>}
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          {aba==='lista'&&<button onClick={exportarCSV} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, background:'#f0f4ff', color:NAVY, fontSize:12, fontWeight:600, border:`1px solid ${NAVY}30`, cursor:'pointer' }}><Download size={13}/> CSV</button>}
          <button onClick={()=>{setForm(CERT_VAZIO);setEditId(null);setAba('cadastro')}} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, background:NAVY, color:'#fff', fontWeight:600, fontSize:12, border:'none', cursor:'pointer' }}>
            <Plus size={13}/> Novo Certificado
          </button>
        </div>
      </div>

      {/* ── LISTA ── */}
      {aba==='lista' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Cards resumo */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, padding:'12px 16px', background:'#f8f9fb', borderBottom:'1px solid #e8e8e8' }}>
            {[
              { n:certs.length,  l:'Total',         c:'#1D6FA4', bg:'#EBF5FF', ic:Shield },
              { n:vencidos,      l:'Vencidos',       c:'#dc2626', bg:'#FEF2F2', ic:AlertTriangle },
              { n:alerta30,      l:'Vencem em 30d',  c:'#f59e0b', bg:'#FEF9C3', ic:Clock },
              { n:ok,            l:'Válidos',        c:'#16a34a', bg:'#F0FDF4', ic:CheckCircle },
            ].map(s=>{ const Ic=s.ic; return (
              <div key={s.l} style={{ background:'#fff', borderRadius:10, padding:'12px 16px', border:`1px solid ${s.c}20`, display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Ic size={20} style={{ color:s.c }}/>
                </div>
                <div>
                  <div style={{ fontSize:22, fontWeight:800, color:s.c }}>{s.n}</div>
                  <div style={{ fontSize:11, color:'#888', fontWeight:500 }}>{s.l}</div>
                </div>
              </div>
            )})}
          </div>

          {/* Filtros */}
          <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', padding:'8px 16px', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ position:'relative', flex:1, maxWidth:320 }}>
              <Search size={12} style={{ position:'absolute', left:8, top:8, color:'#bbb' }}/>
              <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar cliente, titular ou série..." style={{ ...inp, paddingLeft:26 }}/>
            </div>
            <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)} style={{ ...inp, width:140, cursor:'pointer' }}>
              <option value="">Todos os tipos</option>
              <option value="PJ">🏢 PJ — Empresa</option>
              <option value="PF">👤 PF — Sócio/Titular</option>
            </select>
            <select value={filtroSt} onChange={e=>setFiltroSt(e.target.value)} style={{ ...inp, width:150, cursor:'pointer' }}>
              <option value="">Todos os status</option>
              <option value="ok">✓ Válidos</option>
              <option value="alerta">⚠ A vencer (90d)</option>
              <option value="vencido">✗ Vencidos</option>
            </select>
            {(busca||filtroTipo||filtroSt)&&<button onClick={()=>{setBusca('');setFiltroTipo('');setFiltroSt('')}} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:7, background:'#fee2e2', color:'#dc2626', border:'1px solid #fca5a5', fontSize:11, fontWeight:600, cursor:'pointer' }}><X size={11}/> Limpar</button>}
            <span style={{ fontSize:12, color:'#aaa', marginLeft:'auto' }}>{certsFiltrados.length} certificado(s)</span>
          </div>

          {/* Tabela */}
          <div style={{ flex:1, overflowY:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#fff', borderBottom:'2px solid #e8e8e8', position:'sticky', top:0, zIndex:1 }}>
                  {['Tipo','Cliente / Titular','CPF/CNPJ Titular','Validade','Status','Tipo Cert','Autoridade','Ações'].map(h=>(
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {certsFiltrados.map((c,i)=>{
                  const st = statusCert(c.validade)
                  const isPF = c.tipo==='PF'
                  return (
                    <tr key={c.id} style={{ background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0' }}>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:8, fontSize:11, fontWeight:700, background:isPF?GOLD+'20':NAVY+'15', color:isPF?'#854D0E':NAVY }}>
                          {isPF?<User size={11}/>:<Building2 size={11}/>} {c.tipo}
                        </span>
                      </td>
                      <td style={{ padding:'9px 12px' }}>
                        <div style={{ fontWeight:600, color:NAVY, fontSize:12 }}>{c.cliente_nome||'—'}</div>
                        {isPF&&c.responsavel_nome&&<div style={{ fontSize:11, color:'#888', marginTop:1 }}>👤 {c.responsavel_nome}</div>}
                        {c.arquivo_nome&&<div style={{ fontSize:10, color:'#aaa', marginTop:1 }}>📎 {c.arquivo_nome}</div>}
                      </td>
                      <td style={{ padding:'9px 12px', fontFamily:'monospace', fontSize:11, color:'#555' }}>{c.responsavel_cpf||'—'}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:'#555' }}>{fmtData(c.validade)}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ padding:'3px 9px', borderRadius:8, fontSize:11, fontWeight:700, background:st.bg, color:st.cor }}>
                          {st.icon} {st.label}
                          {st.dias!==null&&st.dias>=0&&st.dias<=90&&<span style={{ fontSize:10, marginLeft:4 }}>dias</span>}
                        </span>
                      </td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:'#555' }}>{c.tipo_cert||'—'}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:'#555' }}>{c.autoridade_cert||'—'}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <div style={{ display:'flex', gap:5 }}>
                          <button onClick={()=>editar(c)} style={{ padding:'4px 9px', borderRadius:6, background:'#EBF5FF', color:'#1D6FA4', border:'none', cursor:'pointer', fontSize:11 }}>✏️</button>
                          <button onClick={()=>setModalExc(c)} style={{ padding:'4px 9px', borderRadius:6, background:'#FEF2F2', color:'#dc2626', border:'none', cursor:'pointer', fontSize:11 }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {certsFiltrados.length===0&&(
                  <tr><td colSpan={8} style={{ padding:40, textAlign:'center', color:'#ccc' }}>Nenhum certificado encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CADASTRO ── */}
      {aba==='cadastro' && (
        <div style={{ flex:1, overflowY:'auto', padding:20, background:'#f8f9fb' }}>
          <div style={{ maxWidth:780, margin:'0 auto', background:'#fff', borderRadius:12, padding:24, border:'1px solid #e8e8e8' }}>

            {/* Tipo PJ / PF */}
            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:11, color:'#888', fontWeight:700, display:'block', marginBottom:8, textTransform:'uppercase' }}>Tipo de Certificado</label>
              <div style={{ display:'flex', gap:10 }}>
                {[['PJ','🏢 PJ — Empresa (CNPJ)'],['PF','👤 PF — Pessoa Física (Sócio/Titular)']].map(([v,l])=>(
                  <button key={v} onClick={()=>onTipoChange(v)} style={{ flex:1, padding:'12px 16px', borderRadius:10, cursor:'pointer', border:`2px solid ${form.tipo===v?NAVY:'#ddd'}`, background:form.tipo===v?NAVY:'#fff', color:form.tipo===v?'#fff':'#888', fontWeight:form.tipo===v?700:400, fontSize:13, textAlign:'center' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Cliente */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Empresa / Cliente *</label>
                <select value={form.cliente_id} onChange={e=>onClienteChange(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  <option value="">Selecione o cliente...</option>
                  {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Tipo de Certificação</label>
                <select value={form.tipo_cert} onChange={e=>setF('tipo_cert',e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  <option value="A1">A1 — Software (sem token)</option>
                  <option value="A3">A3 — Token/Cartão</option>
                  <option value="A4">A4 — Cartão com leitor</option>
                </select>
              </div>
            </div>

            {/* Campos PF — sócio */}
            {form.tipo==='PF' && (
              <div style={{ marginBottom:14, padding:'14px 16px', borderRadius:10, background:GOLD+'08', border:`2px solid ${GOLD}40` }}>
                <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:10 }}>👤 Titular Pessoa Física</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>
                      Selecionar Sócio Cadastrado
                      {sociosSel.length===0&&form.cliente_id&&<span style={{ marginLeft:6, fontSize:10, color:'#f59e0b' }}>⚠ Cliente sem sócios cadastrados</span>}
                    </label>
                    <select value={form.responsavel_nome} onChange={e=>onSocioChange(e.target.value)} style={{ ...inp, cursor:'pointer' }} disabled={sociosSel.length===0}>
                      <option value="">— Selecione ou preencha manualmente —</option>
                      {sociosSel.map((s,i)=>(
                        <option key={i} value={s.nome}>{s.nome} {s.cargo?`(${s.cargo})`:''} {s.cpf_cnpj?`— ${s.cpf_cnpj}`:''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Nome Completo do Titular *</label>
                    <input value={form.responsavel_nome} onChange={e=>setF('responsavel_nome',e.target.value)} placeholder="Nome completo" style={inp}/>
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>CPF do Titular *</label>
                    <input value={form.responsavel_cpf} onChange={e=>setF('responsavel_cpf',e.target.value)} placeholder="000.000.000-00" style={inp}/>
                  </div>
                </div>
                {sociosSel.length===0&&form.cliente_id&&(
                  <div style={{ marginTop:10, padding:'8px 12px', borderRadius:7, background:'#FEF9C3', border:'1px solid #fde68a', fontSize:11, color:'#854D0E' }}>
                    ⚠ Nenhum sócio cadastrado para este cliente. Preencha os dados manualmente ou adicione responsáveis na aba <b>Clientes → Responsável</b>.
                  </div>
                )}
              </div>
            )}

            {/* Dados do certificado */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Data de Emissão</label>
                <input type="date" value={form.emissao} onChange={e=>setF('emissao',e.target.value)} style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Data de Validade *</label>
                <input type="date" value={form.validade} onChange={e=>setF('validade',e.target.value)} style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Autoridade Certificadora</label>
                <select value={form.autoridade_cert} onChange={e=>setF('autoridade_cert',e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  {['ICP-Brasil','Serasa','Valid','Certisign','Soluti','Safeweb','AC Caixa','Outro'].map(a=><option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Número de Série</label>
                <input value={form.numero_serie} onChange={e=>setF('numero_serie',e.target.value)} placeholder="Ex: 01A2B3C4..." style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Arquivo (.pfx / .p12)</label>
                <div style={{ display:'flex', gap:8 }}>
                  <input value={form.arquivo_nome} onChange={e=>setF('arquivo_nome',e.target.value)} placeholder="nome_certificado.pfx" style={{ ...inp, flex:1 }}/>
                  <label style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:7, background:'#f0f4ff', color:NAVY, fontWeight:600, fontSize:12, border:`1px solid ${NAVY}30`, cursor:'pointer', whiteSpace:'nowrap' }}>
                    <Upload size={12}/> Importar
                    <input type="file" accept=".pfx,.p12,.cer,.crt" style={{ display:'none' }} onChange={e=>{ if(e.target.files[0]) setF('arquivo_nome', e.target.files[0].name) }}/>
                  </label>
                </div>
              </div>
            </div>

            {/* Validade visual */}
            {form.validade && (()=>{
              const st = statusCert(form.validade)
              return (
                <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:9, background:st.bg, border:`1px solid ${st.cor}30`, display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:18 }}>{st.icon}</span>
                  <div style={{ fontSize:12, color:st.cor, fontWeight:600 }}>
                    {st.dias===null?'Data inválida':st.dias<0?`Vencido há ${Math.abs(st.dias)} dias`:st.dias===0?'Vence hoje':`Vence em ${st.dias} dias — ${fmtData(form.validade)}`}
                  </div>
                </div>
              )
            })()}

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Observações</label>
              <textarea value={form.observacoes} onChange={e=>setF('observacoes',e.target.value)} style={{ ...inp, height:60, resize:'vertical', fontFamily:'inherit' }}/>
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', paddingTop:14, borderTop:'1px solid #f0f0f0' }}>
              <button onClick={()=>{setForm(CERT_VAZIO);setEditId(null);setAba('lista')}} style={{ padding:'8px 16px', borderRadius:8, background:'#f5f5f5', color:'#555', fontSize:13, border:'none', cursor:'pointer' }}>Cancelar</button>
              <button onClick={salvar} disabled={!form.cliente_id||!form.validade} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 22px', borderRadius:8, background:form.cliente_id&&form.validade?'#22c55e':'#ccc', color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:form.cliente_id&&form.validade?'pointer':'default' }}>
                <Shield size={14}/> Salvar Certificado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Excluir */}
      {modalExc&&(
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, maxWidth:380, width:'90%', textAlign:'center' }}>
            <AlertTriangle size={36} style={{ color:'#dc2626', marginBottom:12 }}/>
            <div style={{ fontSize:15, fontWeight:700, color:NAVY, marginBottom:8 }}>Excluir Certificado</div>
            <div style={{ fontSize:13, color:'#666', marginBottom:6 }}>{modalExc.cliente_nome}</div>
            {modalExc.tipo==='PF'&&<div style={{ fontSize:12, color:'#888', marginBottom:16 }}>👤 {modalExc.responsavel_nome}</div>}
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={()=>setModalExc(null)} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid #ddd', background:'#fff', cursor:'pointer', fontSize:13 }}>Cancelar</button>
              <button onClick={()=>excluir(modalExc.id)} style={{ padding:'8px 20px', borderRadius:8, background:'#dc2626', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:13, border:'none' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
