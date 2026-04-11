import { useState, useEffect } from 'react'
import { Plus, X, Save, Send, Bot, Trash2, Eye, RefreshCw,
         DollarSign, Bell, Mail, Phone, Settings } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'
const API  = '/api/v1'

const ORGAOS = {
  receita:  { label:'Receita Federal',    icon:'🏛️', cor:'#1D6FA4', bg:'#EBF5FF',
    tipos:['PERT','RELP','REFIS','PAES','Parcelamento Ordinário (60x)','Parcelamento Simplificado',
           'Transação Tributária (PGDAU)','Parcelamento Simples Nacional','Parcelamento de IRPF',
           'Parcelamento Previdenciário','FGTS — Parcelamento'] },
  pgfn:     { label:'PGFN / Dívida Ativa', icon:'⚖️', cor:'#6B3EC9', bg:'#F3EEFF',
    tipos:['PERT PGFN','Transação por Adesão','Transação Individual PGFN',
           'PRORELIT','Parcelamento Regularize','Negociação de Dívida Ativa'] },
  sefaz:    { label:'SEFAZ Estadual',      icon:'🗺️', cor:'#854D0E', bg:'#FEF9C3',
    tipos:['REFIS Goiás — ICMS','Parcelamento Ordinário ICMS','Parcelamento IPVA',
           'Parcelamento ITCD','PROFIS','Parcelamento de DIFAL','Parcelamento de ST'] },
  municipal:{ label:'Municipal / ISS',     icon:'🏙️', cor:'#1A7A3C', bg:'#EDFBF1',
    tipos:['Parcelamento de ISS','Parcelamento de IPTU','Parcelamento de ITBI',
           'REFIS Municipal','Parcelamento Débitos de Alvará','Taxa de Limpeza (TLP)'] },
}

const STATUS_CFG = {
  ativo:    { label:'Em dia',   cor:'#1A7A3C', bg:'#EDFBF1', emoji:'✅' },
  atrasado: { label:'Atrasado', cor:'#dc2626', bg:'#FEF2F2', emoji:'🔴' },
  quitado:  { label:'Quitado',  cor:'#1D6FA4', bg:'#EBF5FF', emoji:'✔️' },
  cancelado:{ label:'Cancelado',cor:'#6B7280', bg:'#f5f5f5', emoji:'⛔' },
  suspenso: { label:'Suspenso', cor:'#854D0E', bg:'#FEF9C3', emoji:'⏸️' },
}

const FORM0 = {
  cliente_id:0, orgao:'receita', tipo:'', numero_processo:'', descricao:'',
  valor_original:0, saldo_devedor:0, valor_parcela:0, total_parcelas:0, parcelas_pagas:0,
  data_inicio:'', proximo_vencimento:'', dia_vencimento:20, status:'ativo',
  portal_url:'', portal_usuario:'', portal_senha:'',
  email_aviso:'', whatsapp_aviso:'', dias_antecedencia:5, usar_ia:true, observacoes:'',
}

const inp = { padding:'9px 12px', borderRadius:8, border:'1px solid #e0e0e0', fontSize:12, outline:'none', width:'100%', boxSizing:'border-box', fontFamily:'inherit', color:'#333' }
const sel = { ...inp, cursor:'pointer' }
const fmtBRL = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`
const fmtPct = (p,t) => t > 0 ? Math.round(p/t*100) : 0

export default function Parcelamentos() {
  const [orgaoAtivo, setOrgaoAtivo]   = useState('receita')
  const [clientes, setClientes]       = useState([])
  const [todos, setTodos]             = useState([])
  const [carregando, setCarregando]   = useState(false)
  const [modal, setModal]             = useState(null)
  const [form, setForm]               = useState({...FORM0})
  const [detalhe, setDetalhe]         = useState(null)
  const [pagamentos, setPagamentos]   = useState([])
  const [enviando, setEnviando]       = useState(false)
  const [sucesso, setSucesso]         = useState('')
  const [erro, setErro]               = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [buscaCli, setBuscaCli]       = useState('')

  useEffect(() => {
    try { setClientes(JSON.parse(localStorage.getItem('ep_clientes')||'[]')) } catch {}
    fetch(`${API}/clientes/`).then(r=>r.json()).then(d=>setClientes(d.clientes||d||[])).catch(()=>{})
    carregarTodos()
  }, [])

  const carregarTodos = async () => {
    setCarregando(true)
    try {
      const r = await fetch(`${API}/parcelamentos/listar`)
      if (r.ok) setTodos(await r.json())
    } catch {} finally { setCarregando(false) }
  }

  const parcs = todos.filter(p => p.orgao===orgaoAtivo && (!filtroStatus||p.status===filtroStatus))
  const setF = (k,v) => setForm(f=>({...f,[k]:v}))

  const abrirNovo = () => { setForm({...FORM0,orgao:orgaoAtivo}); setModal('novo'); setErro(''); setSucesso('') }

  const salvar = async () => {
    if (!form.cliente_id) { setErro('Selecione o cliente.'); return }
    if (!form.tipo)       { setErro('Selecione o tipo.'); return }
    setEnviando(true); setErro('')
    try {
      const r = await fetch(`${API}/parcelamentos/cadastrar`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({...form, cliente_id:Number(form.cliente_id),
          valor_original:Number(form.valor_original), saldo_devedor:Number(form.saldo_devedor),
          valor_parcela:Number(form.valor_parcela), total_parcelas:Number(form.total_parcelas),
          parcelas_pagas:Number(form.parcelas_pagas), dia_vencimento:Number(form.dia_vencimento),
          dias_antecedencia:Number(form.dias_antecedencia)})
      })
      if (r.ok) {
        setSucesso('✅ Parcelamento cadastrado!')
        await carregarTodos()
        setTimeout(()=>{ setModal(null); setSucesso('') },1500)
      } else setErro('Erro ao salvar.')
    } catch { setErro('Erro de conexão.') } finally { setEnviando(false) }
  }

  const abrirDetalhe = async (p) => {
    setDetalhe(p); setModal('detalhe')
    try { const r=await fetch(`${API}/parcelamentos/pagamentos/${p.id}`); if(r.ok) setPagamentos(await r.json()); else setPagamentos([]) } catch { setPagamentos([]) }
  }

  const gerarAlerta = async (id) => {
    setEnviando(true)
    try {
      const r = await fetch(`${API}/parcelamentos/gerar-alerta/${id}`, {method:'POST'})
      if (r.ok) { setSucesso('🤖 Alerta IA enviado!'); await carregarTodos() }
    } catch {} finally { setEnviando(false); setTimeout(()=>setSucesso(''),3000) }
  }

  const verificarTodos = async () => {
    setCarregando(true)
    const r = await fetch(`${API}/parcelamentos/verificar-vencimentos`,{method:'POST'})
    const d = await r.json()
    alert(`✅ ${d.verificados} verificados · ${d.alertas_enviados} alertas enviados`)
    await carregarTodos(); setCarregando(false)
  }

  const excluir = async (id) => {
    if (!confirm('Excluir este parcelamento?')) return
    await fetch(`${API}/parcelamentos/${id}`,{method:'DELETE'})
    await carregarTodos(); setModal(null)
  }

  const statsOrgao = (org) => {
    const lst = todos.filter(p=>p.orgao===org)
    return { total:lst.length, atrasado:lst.filter(p=>p.status==='atrasado').length, saldo:lst.reduce((a,p)=>a+(p.saldo_devedor||0),0) }
  }

  const orgaoInfo = ORGAOS[orgaoAtivo]
  const cliFilt = clientes.filter(c=>{ const q=buscaCli.toLowerCase(); return !q||(c.nome||'').toLowerCase().includes(q)||(c.cnpj||'').includes(q) })

  return (
    <div style={{padding:20,maxWidth:1100,margin:'0 auto'}}>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:42,height:42,borderRadius:10,background:`linear-gradient(135deg,${NAVY},#2d4a7a)`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <DollarSign size={20} style={{color:GOLD}}/>
          </div>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:NAVY}}>Parcelamentos por Órgão</div>
            <div style={{fontSize:12,color:'#888'}}>Receita Federal · PGFN · SEFAZ · Municipal · Alertas automáticos IA</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={verificarTodos} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,background:'#FEF9C3',color:'#854D0E',border:'1px solid #fcd34d',fontWeight:700,fontSize:12,cursor:'pointer'}}>
            <Bot size={13}/> Verificar Vencimentos
          </button>
          <button onClick={abrirNovo} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}>
            <Plus size={14}/> Novo Parcelamento
          </button>
        </div>
      </div>

      {sucesso && <div style={{padding:'9px 14px',borderRadius:8,background:'#EDFBF1',border:'1px solid #86efac',color:'#166534',fontWeight:700,fontSize:12,marginBottom:14}}>{sucesso}</div>}

      {/* Abas por órgão */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
        {Object.entries(ORGAOS).map(([key,org])=>{
          const s=statsOrgao(key); const ativo=orgaoAtivo===key
          return (
            <div key={key} onClick={()=>{setOrgaoAtivo(key);setFiltroStatus('')}}
              style={{padding:'14px 16px',borderRadius:12,border:`2px solid ${ativo?org.cor:'#e8e8e8'}`,background:ativo?org.bg:'#fff',cursor:'pointer',transition:'all .15s',boxShadow:ativo?`0 4px 14px ${org.cor}30`:'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <span style={{fontSize:20}}>{org.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:800,color:ativo?org.cor:NAVY,lineHeight:1.2}}>{org.label}</div>
                </div>
                {s.atrasado>0 && <span style={{background:'#FEF2F2',color:'#dc2626',fontSize:10,padding:'1px 6px',borderRadius:8,fontWeight:800}}>{s.atrasado}⚠</span>}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
                <span style={{color:'#888'}}>{s.total} processo(s)</span>
                <span style={{fontWeight:700,color:org.cor}}>{fmtBRL(s.saldo)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filtros */}
      <div style={{background:'#fff',borderRadius:10,border:'1px solid #e8e8e8',padding:'10px 16px',marginBottom:14,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{fontSize:12,color:orgaoInfo.cor,fontWeight:800}}>{orgaoInfo.icon} {orgaoInfo.label}</span>
        <div style={{width:1,height:16,background:'#eee'}}/>
        {Object.entries(STATUS_CFG).map(([k,s])=>(
          <button key={k} onClick={()=>setFiltroStatus(filtroStatus===k?'':k)}
            style={{padding:'4px 12px',borderRadius:16,border:`1px solid ${filtroStatus===k?s.cor:'#e0e0e0'}`,background:filtroStatus===k?s.bg:'#fff',color:filtroStatus===k?s.cor:'#888',fontSize:11,fontWeight:700,cursor:'pointer'}}>
            {s.emoji} {s.label}
          </button>
        ))}
        <button onClick={carregarTodos} style={{marginLeft:'auto',padding:'5px 10px',borderRadius:7,background:'#f5f5f5',border:'none',cursor:'pointer',color:'#888'}}><RefreshCw size={13}/></button>
      </div>

      {/* Lista */}
      {carregando ? (
        <div style={{textAlign:'center',padding:40,color:'#aaa'}}>Carregando...</div>
      ) : parcs.length===0 ? (
        <div style={{textAlign:'center',padding:48,color:'#ccc'}}>
          <DollarSign size={40} style={{opacity:.3,marginBottom:12}}/>
          <div style={{fontSize:14,marginBottom:12}}>Nenhum parcelamento {orgaoInfo.icon} {orgaoInfo.label}</div>
          <button onClick={abrirNovo} style={{padding:'9px 18px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}>+ Cadastrar primeiro</button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {parcs.map(p=>{
            const sts=STATUS_CFG[p.status]||STATUS_CFG.ativo
            const pct=fmtPct(p.parcelas_pagas,p.total_parcelas)
            const urgente=p.status==='atrasado'||(p.dias_vencimento!==null&&p.dias_vencimento<=5)
            return (
              <div key={p.id} style={{background:'#fff',borderRadius:12,border:`1px solid ${urgente?'#fca5a5':'#e8e8e8'}`,padding:'14px 18px',boxShadow:urgente?'0 0 0 2px #fca5a530':'0 1px 6px rgba(0,0,0,.04)'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                      <span style={{fontSize:13,fontWeight:800,color:NAVY}}>{p.tipo}</span>
                      <span style={{background:sts.bg,color:sts.cor,padding:'2px 10px',borderRadius:10,fontSize:11,fontWeight:700}}>{sts.emoji} {sts.label}</span>
                      {p.alerta_ia && <span style={{background:'#F3EEFF',color:'#6B3EC9',padding:'2px 10px',borderRadius:10,fontSize:11,fontWeight:700}}>🤖 IA</span>}
                      {p.dias_vencimento!==null&&p.dias_vencimento<=5&&p.status!=='atrasado'&&(
                        <span style={{background:'#FEF9C3',color:'#854D0E',padding:'2px 10px',borderRadius:10,fontSize:11,fontWeight:800}}>⏰ {p.dias_vencimento}d</span>
                      )}
                    </div>
                    <div style={{fontSize:11,color:'#888',marginBottom:8,display:'flex',gap:14,flexWrap:'wrap'}}>
                      <span>👤 {p.cliente_nome||'—'}</span>
                      <span>📄 {p.numero_processo||'—'}</span>
                      <span>📅 Vence: <strong style={{color:p.status==='atrasado'?'#dc2626':'#333'}}>{p.proximo_vencimento||'—'}</strong></span>
                    </div>
                    <div style={{display:'flex',gap:16,fontSize:12,marginBottom:10}}>
                      <div><span style={{color:'#888'}}>Parcela: </span><strong style={{color:orgaoInfo.cor}}>{fmtBRL(p.valor_parcela)}</strong></div>
                      <div><span style={{color:'#888'}}>Saldo: </span><strong style={{color:'#dc2626'}}>{fmtBRL(p.saldo_devedor)}</strong></div>
                      <div><span style={{color:'#888'}}>Original: </span><span>{fmtBRL(p.valor_original)}</span></div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{flex:1,height:6,background:'#f0f0f0',borderRadius:4,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${pct}%`,background:orgaoInfo.cor,borderRadius:4}}/>
                      </div>
                      <span style={{fontSize:10,color:'#888',whiteSpace:'nowrap'}}>{p.parcelas_pagas}/{p.total_parcelas} ({pct}%)</span>
                    </div>
                    {p.alerta_ia&&<div style={{marginTop:8,padding:'8px 12px',borderRadius:8,background:'#F3EEFF',fontSize:11,color:'#6B3EC9',lineHeight:1.5}}>🤖 {p.alerta_ia.slice(0,200)}{p.alerta_ia.length>200?'…':''}</div>}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6,flexShrink:0}}>
                    <button onClick={()=>abrirDetalhe(p)} title="Detalhes" style={{padding:'6px 10px',borderRadius:7,background:'#f5f5f5',border:'none',cursor:'pointer',color:NAVY}}><Eye size={13}/></button>
                    <button onClick={()=>gerarAlerta(p.id)} disabled={enviando} title="Alerta IA" style={{padding:'6px 10px',borderRadius:7,background:'#F3EEFF',border:'none',cursor:'pointer',color:'#6B3EC9'}}><Bot size={13}/></button>
                    <button onClick={()=>excluir(p.id)} title="Excluir" style={{padding:'6px 10px',borderRadius:7,background:'#FEF2F2',border:'none',cursor:'pointer',color:'#dc2626'}}><Trash2 size={13}/></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL NOVO */}
      {modal==='novo'&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'20px 16px',overflowY:'auto'}}>
          <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:680,boxShadow:'0 24px 64px rgba(0,0,0,.3)',marginBottom:40}}>
            <div style={{padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',background:NAVY,borderRadius:'16px 16px 0 0'}}>
              <div style={{color:'#fff',fontWeight:800}}>{orgaoInfo.icon} Novo — {orgaoInfo.label}</div>
              <button onClick={()=>setModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.7)'}}><X size={18}/></button>
            </div>
            <div style={{padding:22}}>
              {erro&&<div style={{padding:'9px 12px',borderRadius:8,background:'#FEF2F2',border:'1px solid #fca5a5',color:'#991B1B',fontSize:12,marginBottom:14,fontWeight:700}}>⚠️ {erro}</div>}
              {sucesso&&<div style={{padding:'9px 12px',borderRadius:8,background:'#EDFBF1',color:'#166534',fontSize:12,marginBottom:14,fontWeight:700}}>{sucesso}</div>}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>

                <div style={{gridColumn:'1/-1'}}>
                  <label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Cliente *</label>
                  <input value={buscaCli} onChange={e=>setBuscaCli(e.target.value)} placeholder="Buscar cliente..." style={{...inp,marginBottom:4}}/>
                  <select value={form.cliente_id} onChange={e=>setF('cliente_id',e.target.value)} style={sel}>
                    <option value={0}>— Selecionar —</option>
                    {cliFilt.map(c=><option key={c.id} value={c.id}>{c.nome} · {c.cnpj}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Órgão</label>
                  <select value={form.orgao} onChange={e=>setF('orgao',e.target.value)} style={sel}>
                    {Object.entries(ORGAOS).map(([k,o])=><option key={k} value={k}>{o.icon} {o.label}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Tipo *</label>
                  <select value={form.tipo} onChange={e=>setF('tipo',e.target.value)} style={sel}>
                    <option value="">— Selecionar —</option>
                    {(ORGAOS[form.orgao]?.tipos||[]).map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Nº do Processo</label><input value={form.numero_processo} onChange={e=>setF('numero_processo',e.target.value)} placeholder="000000/2026-00" style={inp}/></div>
                <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Status</label><select value={form.status} onChange={e=>setF('status',e.target.value)} style={sel}>{Object.entries(STATUS_CFG).map(([k,s])=><option key={k} value={k}>{s.emoji} {s.label}</option>)}</select></div>
                <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Valor Original (R$)</label><input type="number" step="0.01" value={form.valor_original} onChange={e=>setF('valor_original',e.target.value)} style={inp}/></div>
                <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Saldo Devedor (R$)</label><input type="number" step="0.01" value={form.saldo_devedor} onChange={e=>setF('saldo_devedor',e.target.value)} style={inp}/></div>
                <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Valor da Parcela (R$)</label><input type="number" step="0.01" value={form.valor_parcela} onChange={e=>setF('valor_parcela',e.target.value)} style={inp}/></div>
                <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Dia de Vencimento</label><input type="number" min="1" max="31" value={form.dia_vencimento} onChange={e=>setF('dia_vencimento',e.target.value)} style={inp}/></div>
                <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Total de Parcelas</label><input type="number" value={form.total_parcelas} onChange={e=>setF('total_parcelas',e.target.value)} style={inp}/></div>
                <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Parcelas Pagas</label><input type="number" value={form.parcelas_pagas} onChange={e=>setF('parcelas_pagas',e.target.value)} style={inp}/></div>
                <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Próximo Vencimento</label><input value={form.proximo_vencimento} onChange={e=>setF('proximo_vencimento',e.target.value)} placeholder="dd/mm/aaaa" style={inp}/></div>
                <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Data de Início</label><input value={form.data_inicio} onChange={e=>setF('data_inicio',e.target.value)} placeholder="dd/mm/aaaa" style={inp}/></div>

                <div style={{gridColumn:'1/-1',borderTop:'2px dashed #f0f0f0',paddingTop:12,marginTop:4}}>
                  <div style={{fontSize:11,fontWeight:800,color:NAVY,marginBottom:10,display:'flex',alignItems:'center',gap:6}}><Bell size={12}/> Notificações Automáticas</div>
                </div>
                <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>E-mail de Aviso</label><input value={form.email_aviso} onChange={e=>setF('email_aviso',e.target.value)} placeholder="cliente@email.com.br" style={inp}/></div>
                <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>WhatsApp de Aviso</label><input value={form.whatsapp_aviso} onChange={e=>setF('whatsapp_aviso',e.target.value)} placeholder="(62) 99999-9999" style={inp}/></div>
                <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Avisar com quantos dias de antecedência</label><input type="number" min="1" max="30" value={form.dias_antecedencia} onChange={e=>setF('dias_antecedencia',e.target.value)} style={inp}/></div>
                <div style={{display:'flex',alignItems:'center',gap:10,paddingTop:20}}>
                  <input type="checkbox" id="usar_ia" checked={form.usar_ia} onChange={e=>setF('usar_ia',e.target.checked)}/>
                  <label htmlFor="usar_ia" style={{fontSize:12,color:'#555',cursor:'pointer'}}>🤖 Usar IA Claude para gerar alertas personalizados</label>
                </div>

                <div style={{gridColumn:'1/-1',borderTop:'2px dashed #f0f0f0',paddingTop:12,marginTop:4}}>
                  <div style={{fontSize:11,fontWeight:800,color:NAVY,marginBottom:10,display:'flex',alignItems:'center',gap:6}}><Settings size={12}/> Credenciais do Portal (download automático)</div>
                </div>
                <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>URL do Portal</label><input value={form.portal_url} onChange={e=>setF('portal_url',e.target.value)} placeholder="https://cav.receita.fazenda.gov.br" style={inp}/></div>
                <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Usuário / CPF / CNPJ</label><input value={form.portal_usuario} onChange={e=>setF('portal_usuario',e.target.value)} placeholder="login do portal" style={inp}/></div>

                <div style={{gridColumn:'1/-1'}}><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Observações</label><textarea value={form.observacoes} onChange={e=>setF('observacoes',e.target.value)} rows={2} style={{...inp,resize:'vertical'}}/></div>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:18,borderTop:'1px solid #f0f0f0',paddingTop:16}}>
                <button onClick={()=>setModal(null)} style={{padding:'9px 16px',borderRadius:8,background:'#f5f5f5',color:'#555',fontSize:12,fontWeight:700,border:'none',cursor:'pointer'}}>Cancelar</button>
                <button onClick={salvar} disabled={enviando} style={{padding:'9px 18px',borderRadius:8,background:enviando?'#aaa':NAVY,color:'#fff',fontSize:12,fontWeight:800,border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                  <Save size={13}/> {enviando?'Salvando...':'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHE */}
      {modal==='detalhe'&&detalhe&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'20px 16px',overflowY:'auto'}}>
          <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:600,boxShadow:'0 24px 64px rgba(0,0,0,.3)'}}>
            <div style={{padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',background:NAVY,borderRadius:'16px 16px 0 0'}}>
              <div style={{color:'#fff',fontWeight:800}}>{ORGAOS[detalhe.orgao]?.icon} {detalhe.tipo}</div>
              <button onClick={()=>setModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.7)'}}><X size={18}/></button>
            </div>
            <div style={{padding:22}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
                {[{l:'Saldo Devedor',v:fmtBRL(detalhe.saldo_devedor),c:'#dc2626'},{l:'Parcela',v:fmtBRL(detalhe.valor_parcela),c:ORGAOS[detalhe.orgao]?.cor||NAVY},{l:'Progresso',v:`${fmtPct(detalhe.parcelas_pagas,detalhe.total_parcelas)}%`,c:'#1A7A3C'}].map(k=>(
                  <div key={k.l} style={{background:'#f8f9fb',borderRadius:10,padding:'12px 14px',textAlign:'center'}}>
                    <div style={{fontSize:18,fontWeight:800,color:k.c}}>{k.v}</div>
                    <div style={{fontSize:10,color:'#888',marginTop:2}}>{k.l}</div>
                  </div>
                ))}
              </div>
              <div style={{background:'#f8f9fb',borderRadius:8,padding:'12px 14px',marginBottom:14,fontSize:12}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div><span style={{color:'#888'}}>Processo: </span><strong>{detalhe.numero_processo||'—'}</strong></div>
                  <div><span style={{color:'#888'}}>Vencimento: </span><strong style={{color:detalhe.status==='atrasado'?'#dc2626':'#333'}}>{detalhe.proximo_vencimento||'—'}</strong></div>
                  <div><span style={{color:'#888'}}>Cliente: </span><strong>{detalhe.cliente_nome||'—'}</strong></div>
                  <div><span style={{color:'#888'}}>Parcelas: </span><strong>{detalhe.parcelas_pagas}/{detalhe.total_parcelas}</strong></div>
                  {detalhe.email_aviso&&<div><Mail size={10} style={{display:'inline',marginRight:3}}/>{detalhe.email_aviso}</div>}
                  {detalhe.whatsapp_aviso&&<div><Phone size={10} style={{display:'inline',marginRight:3}}/>{detalhe.whatsapp_aviso}</div>}
                </div>
              </div>
              {detalhe.alerta_ia&&<div style={{background:'#F3EEFF',borderRadius:8,padding:'12px 14px',marginBottom:14,fontSize:12,color:'#6B3EC9',lineHeight:1.6}}><strong>🤖 Análise IA Claude:</strong><br/>{detalhe.alerta_ia}</div>}
              {detalhe.observacoes&&<div style={{background:'#FEF9C3',borderRadius:8,padding:'10px 14px',fontSize:12,marginBottom:14}}>{detalhe.observacoes}</div>}
              {pagamentos.length>0&&(
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:800,color:NAVY,marginBottom:8}}>Pagamentos Registrados</div>
                  {pagamentos.map((pg,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 12px',borderRadius:7,background:i%2===0?'#f8f9fb':'#fff',fontSize:12,marginBottom:3}}>
                      <span>Parcela #{pg.numero_parcela}</span>
                      <span style={{fontWeight:700,color:'#1A7A3C'}}>{fmtBRL(pg.valor_pago)}</span>
                      <span style={{color:'#888'}}>{pg.data_pagamento}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>gerarAlerta(detalhe.id)} disabled={enviando} style={{flex:1,padding:'9px',borderRadius:8,background:'#F3EEFF',color:'#6B3EC9',fontWeight:700,fontSize:12,border:'1px solid #c4b5fd',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                  <Bot size={13}/> Gerar Alerta IA
                </button>
                <button onClick={()=>excluir(detalhe.id)} style={{padding:'9px 14px',borderRadius:8,background:'#FEF2F2',color:'#dc2626',fontWeight:700,fontSize:12,border:'1px solid #fca5a5',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                  <Trash2 size={13}/> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
