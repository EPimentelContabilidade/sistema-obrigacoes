import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Save, Bot, Trash2, Eye, RefreshCw, DollarSign, TrendingUp,
         TrendingDown, AlertTriangle, CheckCircle, Clock, Building2, Users,
         BarChart2, Filter, Search, Download, CreditCard, Settings, Send,
         FileText, ChevronDown } from 'lucide-react'
import { BarChart,Bar,LineChart,Line,PieChart,Pie,Cell,AreaChart,Area,
         XAxis,YAxis,CartesianGrid,Tooltip,Legend,ResponsiveContainer } from 'recharts'

const NAVY='#1B2A4A',GOLD='#C5A55A',API='/api/v1'
const fmtBRL=v=>`R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`
const fmtPct=(a,b)=>b>0?`${((a/b)*100).toFixed(1)}%`:'0%'
const inp={padding:'9px 12px',borderRadius:8,border:'1px solid #e0e0e0',fontSize:12,outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit',color:'#333'}
const sel={...inp,cursor:'pointer'}

const ABAS=[
  {id:'dashboard',label:'📊 Dashboard'},
  {id:'pagar',label:'📤 A Pagar'},
  {id:'receber',label:'📥 A Receber'},
  {id:'pagas',label:'✅ Pagas'},
  {id:'recebidas',label:'💚 Recebidas'},
  {id:'bancos',label:'🏦 Bancos'},
  {id:'fornecedores',label:'🏢 Fornecedores'},
  {id:'centros',label:'📂 Centro de Custos'},
  {id:'relatorios',label:'📋 Relatórios'},
]

const COR_STATUS_PAGAR={pendente:'#f59e0b',pago:'#22c55e',vencido:'#ef4444',cancelado:'#94a3b8'}
const COR_STATUS_RECEBER={pendente:'#3b82f6',recebido:'#22c55e',vencido:'#ef4444',cancelado:'#94a3b8'}

function Badge({texto,cor,bg}){return <span style={{background:bg||cor+'20',color:cor,padding:'2px 9px',borderRadius:10,fontSize:10,fontWeight:700}}>{texto}</span>}

function KPICard({titulo,valor,cor,bg,icon:Icon,sub}){
  return(
    <div style={{background:'#fff',borderRadius:12,padding:'16px 18px',border:`1px solid ${cor}25`,boxShadow:'0 1px 6px rgba(0,0,0,.05)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
        <div style={{width:38,height:38,borderRadius:9,background:bg||cor+'15',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Icon size={18} style={{color:cor}}/>
        </div>
        <div style={{fontSize:11,color:'#888',fontWeight:600}}>{titulo}</div>
      </div>
      <div style={{fontSize:22,fontWeight:800,color:cor}}>{valor}</div>
      {sub&&<div style={{fontSize:11,color:'#aaa',marginTop:4}}>{sub}</div>}
    </div>
  )
}

function ContaRow({item,tipo,onPagar,onExcluir,onAlerta}){
  const coresStatus=tipo==='pagar'?COR_STATUS_PAGAR:COR_STATUS_RECEBER
  const cor=coresStatus[item.status]||'#888'
  const urgente=item.status==='vencido'||(item.dias_vencimento!==null&&item.dias_vencimento<=3)
  return(
    <div style={{background:'#fff',borderRadius:10,border:`1px solid ${urgente?'#fca5a5':'#e8e8e8'}`,padding:'12px 16px',marginBottom:8,display:'flex',gap:12,alignItems:'flex-start'}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5,flexWrap:'wrap'}}>
          <span style={{fontSize:13,fontWeight:700,color:NAVY}}>{item.descricao}</span>
          <Badge texto={item.status.charAt(0).toUpperCase()+item.status.slice(1)} cor={cor}/>
          {item.categoria&&<Badge texto={item.categoria} cor='#6B7280'/>}
          {item.alerta_ia&&<Badge texto='🤖 IA' cor='#6B3EC9'/>}
          {item.dias_vencimento!==null&&item.dias_vencimento<=3&&item.status!=='vencido'&&item.status!=='pago'&&item.status!=='recebido'&&(
            <Badge texto={`⏰ ${item.dias_vencimento}d`} cor='#854D0E'/>
          )}
        </div>
        <div style={{fontSize:11,color:'#888',display:'flex',gap:12,flexWrap:'wrap',marginBottom:6}}>
          {(item.fornecedor_nome||item.cliente_nome)&&<span>👤 {item.fornecedor_nome||item.cliente_nome}</span>}
          <span>📅 Vence: <strong style={{color:item.status==='vencido'?'#dc2626':'#333'}}>{item.data_vencimento||'—'}</strong></span>
          {item.numero_documento&&<span>📄 {item.numero_documento}</span>}
        </div>
        {item.alerta_ia&&<div style={{padding:'6px 10px',borderRadius:7,background:'#F3EEFF',fontSize:11,color:'#6B3EC9',lineHeight:1.5}}>{item.alerta_ia.slice(0,150)}{item.alerta_ia.length>150?'…':''}</div>}
      </div>
      <div style={{flexShrink:0,textAlign:'right'}}>
        <div style={{fontSize:16,fontWeight:800,color:tipo==='pagar'?'#dc2626':'#1A7A3C'}}>{fmtBRL(item.valor)}</div>
        {item.total_parcelas>1&&<div style={{fontSize:10,color:'#aaa'}}>{item.parcela_atual}/{item.total_parcelas}x</div>}
        <div style={{display:'flex',gap:5,marginTop:8,justifyContent:'flex-end'}}>
          <button onClick={()=>onAlerta(item.id)} title="Alerta IA" style={{padding:'5px 8px',borderRadius:6,background:'#F3EEFF',border:'none',cursor:'pointer',color:'#6B3EC9'}}><Bot size={12}/></button>
          {item.status!=='pago'&&item.status!=='recebido'&&<button onClick={()=>onPagar(item)} title={tipo==='pagar'?'Pagar':'Receber'} style={{padding:'5px 8px',borderRadius:6,background:'#EDFBF1',border:'none',cursor:'pointer',color:'#1A7A3C'}}><CheckCircle size={12}/></button>}
          <button onClick={()=>onExcluir(item.id)} title="Excluir" style={{padding:'5px 8px',borderRadius:6,background:'#FEF2F2',border:'none',cursor:'pointer',color:'#dc2626'}}><Trash2 size={12}/></button>
        </div>
      </div>
    </div>
  )
}

export default function Financeiro(){
  const [aba,setAba]=useState('dashboard')
  const [clientes,setClientes]=useState([])
  const [categorias,setCategorias]=useState({pagar:{},receber:{},formas_pagamento:[]})
  const [resumo,setResumo]=useState(null)
  const [fluxo,setFluxo]=useState([])
  const [dre,setDre]=useState(null)
  const [pagar,setPagar]=useState([])
  const [receber,setReceber]=useState([])
  const [bancos,setBancos]=useState([])
  const [fornecedores,setFornecedores]=useState([])
  const [centros,setCentros]=useState([])
  const [modal,setModal]=useState(null)
  const [form,setForm]=useState({})
  const [buscaCNPJ,setBuscaCNPJ]=useState('')
  const [carregando,setCarregando]=useState(false)
  const [enviando,setEnviando]=useState(false)
  const [sucesso,setSucesso]=useState('')
  const [filtroStatus,setFiltroStatus]=useState('')
  const [filtroMes,setFiltroMes]=useState(new Date().getMonth()+1)
  const [filtroAno,setFiltroAno]=useState(new Date().getFullYear())
  const [pagamentoModal,setPagamentoModal]=useState(null)
  const [pagForm,setPagForm]=useState({valor_pago:0,data_pagamento:'',forma_pagamento:'PIX',banco_id:''})
  const [inadimplencia,setInadimplencia]=useState({a_pagar:[],a_receber:[]})
  const [catRelatorio,setCatRelatorio]=useState([])

  const carregarDados=useCallback(async()=>{
    setCarregando(true)
    try{
      const [resResumo,resFluxo,resDre,resPagar,resReceber,resBancos,resForn,resCentros,resCat]=await Promise.all([
        fetch(`${API}/financeiro/relatorios/resumo?mes=${filtroMes}&ano=${filtroAno}`).then(r=>r.ok?r.json():null),
        fetch(`${API}/financeiro/relatorios/fluxo-caixa`).then(r=>r.ok?r.json():[]),
        fetch(`${API}/financeiro/relatorios/dre?mes=${filtroMes}&ano=${filtroAno}`).then(r=>r.ok?r.json():null),
        fetch(`${API}/financeiro/contas-pagar?mes=${filtroMes}&ano=${filtroAno}${filtroStatus?'&status='+filtroStatus:''}`).then(r=>r.ok?r.json():[]),
        fetch(`${API}/financeiro/contas-receber?mes=${filtroMes}&ano=${filtroAno}${filtroStatus?'&status='+filtroStatus:''}`).then(r=>r.ok?r.json():[]),
        fetch(`${API}/financeiro/bancos`).then(r=>r.ok?r.json():[]),
        fetch(`${API}/financeiro/fornecedores`).then(r=>r.ok?r.json():[]),
        fetch(`${API}/financeiro/centros-custo`).then(r=>r.ok?r.json():[]),
        fetch(`${API}/financeiro/categorias`).then(r=>r.ok?r.json():{pagar:{},receber:{},formas_pagamento:[]}),
      ])
      if(resResumo)setResumo(resResumo)
      setFluxo(resFluxo||[]);if(resDre)setDre(resDre)
      setPagar(resPagar||[]);setReceber(resReceber||[])
      setBancos(resBancos||[]);setFornecedores(resForn||[]);setCentros(resCentros||[])
      setCategorias(resCat||{pagar:{},receber:{},formas_pagamento:[]})
    }catch(e){console.error(e)}finally{setCarregando(false)}
  },[filtroMes,filtroAno,filtroStatus])

  useEffect(()=>{
    try{setClientes(JSON.parse(localStorage.getItem('ep_clientes')||'[]'))}catch{}
    fetch(`${API}/clientes/`).then(r=>r.json()).then(d=>setClientes(d.clientes||d||[])).catch(()=>{})
  },[])
  useEffect(()=>{carregarDados()},[carregarDados])

  const setF=useCallback((k,v)=>setForm(f=>({...f,[k]:v})),[])

  const buscarCNPJ=async()=>{
    if(!buscaCNPJ||buscaCNPJ.replace(/\D/g,'').length!==14){alert('CNPJ inválido');return}
    try{
      const r=await fetch(`${API}/financeiro/fornecedores/cnpj/${buscaCNPJ.replace(/\D/g,'')}`)
      if(r.ok){const d=await r.json();setForm(f=>({...f,...d}))}
      else alert('CNPJ não encontrado na Receita Federal')
    }catch{alert('Erro ao consultar CNPJ')}
  }

  const salvarConta=async(tipo)=>{
    if(!form.descricao||!form.valor){alert('Preencha descrição e valor');return}
    setEnviando(true)
    try{
      const endpoint=tipo==='pagar'?'contas-pagar':'contas-receber'
      const r=await fetch(`${API}/financeiro/${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,valor:Number(form.valor)})})
      if(r.ok){setSucesso('✅ Conta salva!');await carregarDados();setTimeout(()=>{setModal(null);setSucesso('')},1500)}
    }catch{}finally{setEnviando(false)}
  }

  const salvarBanco=async()=>{
    if(!form.nome){alert('Informe o nome');return}
    setEnviando(true)
    try{
      const r=await fetch(`${API}/financeiro/bancos`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,saldo_inicial:Number(form.saldo_inicial||0)})})
      if(r.ok){setSucesso('✅ Banco salvo!');await carregarDados();setTimeout(()=>{setModal(null);setSucesso('')},1500)}
    }catch{}finally{setEnviando(false)}
  }

  const salvarFornecedor=async()=>{
    if(!form.nome){alert('Informe o nome');return}
    setEnviando(true)
    try{
      const r=await fetch(`${API}/financeiro/fornecedores`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
      if(r.ok){setSucesso('✅ Fornecedor salvo!');await carregarDados();setTimeout(()=>{setModal(null);setSucesso('')},1500)}
    }catch{}finally{setEnviando(false)}
  }

  const salvarCentro=async()=>{
    if(!form.nome){alert('Informe o nome');return}
    await fetch(`${API}/financeiro/centros-custo`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
    setSucesso('✅ Centro de custo salvo!');await carregarDados();setTimeout(()=>{setModal(null);setSucesso('')},1500)
  }

  const excluir=async(id,tipo)=>{
    if(!confirm('Excluir?'))return
    await fetch(`${API}/financeiro/${tipo}/${id}`,{method:'DELETE'})
    await carregarDados()
  }

  const gerarAlerta=async(id,tipo)=>{
    await fetch(`${API}/financeiro/contas-${tipo}/${id}/alerta`,{method:'POST'}).catch(()=>{})
    // fallback: POST verificar-alertas
    await fetch(`${API}/financeiro/verificar-alertas`,{method:'POST'})
    setSucesso('🤖 Alerta IA gerado!');setTimeout(()=>setSucesso(''),3000);await carregarDados()
  }

  const registrarPagamento=async()=>{
    if(!pagamentoModal||!pagForm.valor_pago){alert('Informe o valor');return}
    setEnviando(true)
    try{
      const r=await fetch(`${API}/financeiro/registrar-pagamento`,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({conta_id:pagamentoModal.id,tipo:pagamentoModal.tipo,...pagForm,valor_pago:Number(pagForm.valor_pago),banco_id:pagForm.banco_id?Number(pagForm.banco_id):null})})
      if(r.ok){setSucesso('✅ Pagamento registrado!');setPagamentoModal(null);await carregarDados();setTimeout(()=>setSucesso(''),2000)}
    }catch{}finally{setEnviando(false)}
  }

  const verificarAlertas=async()=>{
    setCarregando(true)
    const r=await fetch(`${API}/financeiro/verificar-alertas`,{method:'POST'})
    const d=await r.json()
    alert(`✅ ${d.verificados} contas verificadas — alertas enviados via e-mail/WA`)
    setCarregando(false)
  }

  // Dados para gráficos
  const chartFluxo=fluxo.map(f=>({...f,name:f.mes.slice(0,5)}))
  const chartDREReceitas=dre?dre.receitas.map(x=>({name:x.categoria||'Outros',value:x.total})):[]
  const chartDREDespesas=dre?dre.despesas.map(x=>({name:x.categoria||'Outros',value:x.total})):[]
  const CORES=['#1D6FA4','#1A7A3C','#6B3EC9','#854D0E','#dc2626','#C5A55A','#22c55e','#3b82f6']

  const pagas=pagar.filter(x=>x.status==='pago')
  const recebidas=receber.filter(x=>x.status==='recebido')
  const pagarPendentes=pagar.filter(x=>['pendente','vencido'].includes(x.status))
  const receberPendentes=receber.filter(x=>['pendente','vencido'].includes(x.status))

  const meses=Array.from({length:12},(_,i)=>({v:i+1,l:new Date(2000,i).toLocaleString('pt-BR',{month:'long'})}))
  const anos=[2024,2025,2026,2027]

  return(
    <div style={{padding:20,maxWidth:1200,margin:'0 auto'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:42,height:42,borderRadius:10,background:`linear-gradient(135deg,${NAVY},#2d4a7a)`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <DollarSign size={20} style={{color:GOLD}}/>
          </div>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:NAVY}}>Financeiro</div>
            <div style={{fontSize:12,color:'#888'}}>Contas · Bancos · Fornecedores · Centros de Custo · Relatórios</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select value={filtroMes} onChange={e=>setFiltroMes(Number(e.target.value))} style={{...sel,width:'auto',padding:'6px 10px',fontSize:12}}>
            {meses.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
          <select value={filtroAno} onChange={e=>setFiltroAno(Number(e.target.value))} style={{...sel,width:80,padding:'6px 10px',fontSize:12}}>
            {anos.map(a=><option key={a}>{a}</option>)}
          </select>
          <button onClick={verificarAlertas} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 12px',borderRadius:8,background:'#FEF9C3',color:'#854D0E',border:'1px solid #fcd34d',fontWeight:700,fontSize:12,cursor:'pointer'}}>
            <Bot size={12}/> IA Alertas
          </button>
          <button onClick={carregarDados} style={{padding:'7px 10px',borderRadius:8,background:'#f5f5f5',border:'none',cursor:'pointer',color:'#888'}}><RefreshCw size={13}/></button>
        </div>
      </div>

      {sucesso&&<div style={{padding:'9px 14px',borderRadius:8,background:'#EDFBF1',border:'1px solid #86efac',color:'#166534',fontWeight:700,fontSize:12,marginBottom:14}}>{sucesso}</div>}

      {/* Abas */}
      <div style={{display:'flex',gap:4,marginBottom:20,overflowX:'auto',paddingBottom:4}}>
        {ABAS.map(a=>(
          <button key={a.id} onClick={()=>setAba(a.id)}
            style={{padding:'8px 14px',borderRadius:9,border:`2px solid ${aba===a.id?NAVY:'transparent'}`,background:aba===a.id?NAVY:'#fff',color:aba===a.id?'#fff':'#555',fontWeight:700,fontSize:12,cursor:'pointer',whiteSpace:'nowrap',boxShadow:aba===a.id?`0 4px 12px ${NAVY}30`:none}}>
            {a.label}
          </button>
        ))}
      </div>

      {/* ─────────────── DASHBOARD ─────────────────────────────────────── */}
      {aba==='dashboard'&&<div>
        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          <KPICard titulo="Saldo Total" valor={fmtBRL(resumo?.saldo_total||0)} cor={NAVY} icon={DollarSign}/>
          <KPICard titulo="A Receber" valor={fmtBRL(resumo?.a_receber?.total||0)} cor='#1A7A3C' icon={TrendingUp}
            sub={`${fmtBRL(resumo?.a_receber?.recebido||0)} recebido`}/>
          <KPICard titulo="A Pagar" valor={fmtBRL(resumo?.a_pagar?.total||0)} cor='#dc2626' icon={TrendingDown}
            sub={`${fmtBRL(resumo?.a_pagar?.pago||0)} pago`}/>
          <KPICard titulo="Inadimplência" valor={fmtBRL((resumo?.inadimplencia_receber||0)+(resumo?.inadimplencia_pagar||0))} cor='#f59e0b' icon={AlertTriangle}/>
        </div>
        {/* Saldos por banco */}
        {bancos.length>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10,marginBottom:20}}>
          {bancos.map(b=>(
            <div key={b.id} style={{background:'#fff',borderRadius:10,padding:'12px 14px',border:`2px solid ${b.cor||NAVY}30`,boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>
              <div style={{fontSize:10,color:'#888',marginBottom:4}}>{b.nome}</div>
              <div style={{fontSize:18,fontWeight:800,color:b.cor||NAVY}}>{fmtBRL(b.saldo_atual)}</div>
              <div style={{fontSize:10,color:'#aaa'}}>{b.banco} · {b.tipo||'Corrente'}</div>
            </div>
          ))}
        </div>}
        {/* Gráficos */}
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginBottom:16}}>
          {/* Fluxo de Caixa */}
          <div style={{background:'#fff',borderRadius:12,padding:'16px',border:'1px solid #e8e8e8'}}>
            <div style={{fontWeight:700,color:NAVY,fontSize:13,marginBottom:12}}>💧 Fluxo de Caixa — 6 meses</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartFluxo} margin={{top:4,right:10,left:-20,bottom:0}}>
                <defs>
                  <linearGradient id="gradE" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1A7A3C" stopOpacity={0.3}/><stop offset="95%" stopColor="#1A7A3C" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gradS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/><stop offset="95%" stopColor="#dc2626" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false}/>
                <XAxis dataKey="name" tick={{fontSize:10,fill:'#aaa'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:9,fill:'#aaa'}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                <Tooltip contentStyle={{fontSize:11,borderRadius:8}} formatter={v=>fmtBRL(v)}/>
                <Legend iconSize={10} wrapperStyle={{fontSize:11}}/>
                <Area type="monotone" dataKey="entradas" name="Entradas" stroke="#1A7A3C" strokeWidth={2} fill="url(#gradE)"/>
                <Area type="monotone" dataKey="saidas" name="Saídas" stroke="#dc2626" strokeWidth={2} fill="url(#gradS)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* DRE Receitas */}
          <div style={{background:'#fff',borderRadius:12,padding:'16px',border:'1px solid #e8e8e8'}}>
            <div style={{fontWeight:700,color:NAVY,fontSize:13,marginBottom:8}}>📋 DRE — {new Date(filtroAno,filtroMes-1).toLocaleString('pt-BR',{month:'long'})} {filtroAno}</div>
            {dre&&<>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:8,color:'#333'}}>
                <span>Receitas: <strong style={{color:'#1A7A3C'}}>{fmtBRL(dre.total_receitas)}</strong></span>
                <span>Despesas: <strong style={{color:'#dc2626'}}>{fmtBRL(dre.total_despesas)}</strong></span>
              </div>
              <div style={{padding:'8px 12px',borderRadius:8,background:dre.lucro_liquido>=0?'#EDFBF1':'#FEF2F2',marginBottom:12}}>
                <div style={{fontSize:11,color:'#888'}}>Resultado</div>
                <div style={{fontSize:18,fontWeight:800,color:dre.lucro_liquido>=0?'#1A7A3C':'#dc2626'}}>{fmtBRL(dre.lucro_liquido)}</div>
              </div>
              {chartDREReceitas.length>0&&<ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={chartDREReceitas} cx="50%" cy="50%" innerRadius={28} outerRadius={50} paddingAngle={2} dataKey="value">
                    {chartDREReceitas.map((_,i)=><Cell key={i} fill={CORES[i%CORES.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{fontSize:10}} formatter={v=>fmtBRL(v)}/>
                </PieChart>
              </ResponsiveContainer>}
            </>}
          </div>
        </div>
        {/* Vencimentos próximos */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          {[{titulo:'📤 A Pagar — Próximos',items:pagarPendentes.slice(0,5),tipo:'pagar'},{titulo:'📥 A Receber — Próximos',items:receberPendentes.slice(0,5),tipo:'receber'}].map(sec=>(
            <div key={sec.tipo} style={{background:'#fff',borderRadius:12,border:'1px solid #e8e8e8',overflow:'hidden'}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid #f5f5f5',fontWeight:700,color:NAVY,fontSize:12}}>{sec.titulo}</div>
              {sec.items.length===0?<div style={{padding:20,textAlign:'center',color:'#ccc',fontSize:12}}>Nenhum lançamento</div>:
              sec.items.map(item=>{
                const coresStatus=sec.tipo==='pagar'?COR_STATUS_PAGAR:COR_STATUS_RECEBER
                const cor=coresStatus[item.status]||'#888'
                return(
                  <div key={item.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 16px',borderBottom:'1px solid #f9f9f9'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:NAVY,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.descricao}</div>
                      <div style={{fontSize:10,color:'#aaa'}}>{item.data_vencimento} · <span style={{color:cor}}>{item.status}</span></div>
                    </div>
                    <div style={{fontWeight:800,fontSize:12,color:sec.tipo==='pagar'?'#dc2626':'#1A7A3C',flexShrink:0,marginLeft:8}}>{fmtBRL(item.valor)}</div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>}

      {/* ─────────────── A PAGAR / A RECEBER / PAGAS / RECEBIDAS ──────── */}
      {['pagar','receber','pagas','recebidas'].includes(aba)&&<div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {['','pendente','vencido','pago','recebido','cancelado'].map(s=>(
              <button key={s} onClick={()=>setFiltroStatus(s)}
                style={{padding:'4px 12px',borderRadius:16,border:`1px solid ${filtroStatus===s?NAVY:'#e0e0e0'}`,background:filtroStatus===s?NAVY:'#fff',color:filtroStatus===s?'#fff':'#888',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                {s||'Todos'}
              </button>
            ))}
          </div>
          <div style={{display:'flex',gap:8}}>
            {aba==='pagar'&&<button onClick={()=>{setForm({descricao:'',valor:'',data_vencimento:'',categoria:'',subcategoria:'',forma_pagamento:'PIX',total_parcelas:1,parcela_atual:1,dias_antecedencia:3});setModal('nova_pagar')}} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}><Plus size={13}/> Nova Conta</button>}
            {aba==='receber'&&<button onClick={()=>{setForm({descricao:'',valor:'',data_vencimento:'',categoria:'',subcategoria:'',forma_recebimento:'PIX',total_parcelas:1,parcela_atual:1,dias_antecedencia:3});setModal('nova_receber')}} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,background:'#1A7A3C',color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}><Plus size={13}/> Nova Conta</button>}
          </div>
        </div>
        {/* Lista */}
        {(aba==='pagar'?pagarPendentes:aba==='receber'?receberPendentes:aba==='pagas'?pagas:recebidas).map(item=>(
          <ContaRow key={item.id} item={item} tipo={['pagar','pagas'].includes(aba)?'pagar':'receber'}
            onPagar={x=>{ setPagamentoModal({...x,tipo:['pagar','pagas'].includes(aba)?'pagar':'receber'}); setPagForm({valor_pago:x.valor,data_pagamento:'',forma_pagamento:x.forma_pagamento||'PIX',banco_id:''}) }}
            onExcluir={id=>excluir(id,['pagar','pagas'].includes(aba)?'contas-pagar':'contas-receber')}
            onAlerta={id=>gerarAlerta(id,['pagar','pagas'].includes(aba)?'pagar':'receber')}
          />
        ))}
        {(aba==='pagar'?pagarPendentes:aba==='receber'?receberPendentes:aba==='pagas'?pagas:recebidas).length===0&&(
          <div style={{textAlign:'center',padding:48,color:'#ccc'}}>
            <DollarSign size={40} style={{opacity:.3,marginBottom:12}}/>
            <div style={{fontSize:14}}>Nenhum lançamento encontrado</div>
          </div>
        )}
      </div>}

      {/* ─────────────── BANCOS ─────────────────────────────────────────── */}
      {aba==='bancos'&&<div>
        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
          <button onClick={()=>{setForm({nome:'',banco:'',agencia:'',conta:'',tipo:'Conta Corrente',saldo_inicial:0,cor:'#1D6FA4'});setModal('novo_banco')}} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}><Plus size={13}/> Novo Banco</button>
        </div>
        {bancos.length===0?<div style={{textAlign:'center',padding:48,color:'#ccc'}}><Building2 size={40} style={{opacity:.3,marginBottom:12}}/><div>Nenhum banco cadastrado</div></div>:
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
          {bancos.map(b=>(
            <div key={b.id} style={{background:'#fff',borderRadius:14,border:`2px solid ${b.cor||NAVY}30`,padding:18,boxShadow:'0 2px 10px rgba(0,0,0,.06)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                <div>
                  <div style={{fontWeight:800,color:NAVY,fontSize:14}}>{b.nome}</div>
                  <div style={{fontSize:11,color:'#888'}}>{b.banco} · Ag {b.agencia} · Cc {b.conta}</div>
                </div>
                <button onClick={()=>excluir(b.id,'bancos')} style={{background:'#FEF2F2',border:'none',cursor:'pointer',padding:'4px 8px',borderRadius:7,color:'#dc2626'}}><Trash2 size={12}/></button>
              </div>
              <div style={{fontSize:11,color:'#888',marginBottom:8}}>{b.tipo}</div>
              <div style={{fontSize:22,fontWeight:800,color:b.cor||NAVY}}>{fmtBRL(b.saldo_atual)}</div>
              <div style={{fontSize:10,color:'#aaa'}}>Saldo inicial: {fmtBRL(b.saldo_inicial)}</div>
            </div>
          ))}
        </div>}
      </div>}

      {/* ─────────────── FORNECEDORES ───────────────────────────────────── */}
      {aba==='fornecedores'&&<div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input value={buscaCNPJ} onChange={e=>setBuscaCNPJ(e.target.value)} placeholder="00.000.000/0001-00 — buscar CNPJ na Receita Federal" style={{...inp,width:320,fontSize:12}}/>
            <button onClick={buscarCNPJ} style={{padding:'9px 14px',borderRadius:8,background:'#1D6FA4',color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',whiteSpace:'nowrap'}}>🔍 Buscar CNPJ</button>
          </div>
          <button onClick={()=>{setForm({nome:'',cnpj:'',email:'',telefone:'',cidade:'',uf:'GO',pix:'',categoria:''});setModal('novo_fornecedor')}} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}><Plus size={13}/> Novo Fornecedor</button>
        </div>
        {fornecedores.length===0?<div style={{textAlign:'center',padding:48,color:'#ccc'}}><Users size={40} style={{opacity:.3,marginBottom:12}}/><div>Nenhum fornecedor cadastrado</div></div>:
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {fornecedores.map(f=>(
            <div key={f.id} style={{background:'#fff',borderRadius:10,border:'1px solid #e8e8e8',padding:'12px 16px',display:'flex',gap:12,alignItems:'center'}}>
              <div style={{width:36,height:36,borderRadius:8,background:'#EBF5FF',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Building2 size={16} style={{color:'#1D6FA4'}}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,color:NAVY,fontSize:13}}>{f.nome}</div>
                <div style={{fontSize:11,color:'#888',display:'flex',gap:12,flexWrap:'wrap'}}>
                  {f.cnpj&&<span>CNPJ: {f.cnpj}</span>}
                  {f.email&&<span>✉️ {f.email}</span>}
                  {f.telefone&&<span>📞 {f.telefone}</span>}
                  {f.cidade&&<span>📍 {f.cidade}/{f.uf}</span>}
                  {f.pix&&<span>PIX: {f.pix}</span>}
                </div>
              </div>
              <button onClick={()=>excluir(f.id,'fornecedores')} style={{background:'#FEF2F2',border:'none',cursor:'pointer',padding:'6px 10px',borderRadius:7,color:'#dc2626',flexShrink:0}}><Trash2 size={13}/></button>
            </div>
          ))}
        </div>}
      </div>}

      {/* ─────────────── CENTROS DE CUSTO ──────────────────────────────── */}
      {aba==='centros'&&<div>
        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
          <button onClick={()=>{setForm({nome:'',codigo:'',descricao:'',tipo:'Despesa'});setModal('novo_centro')}} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}><Plus size={13}/> Novo Centro</button>
        </div>
        {centros.length===0?<div style={{textAlign:'center',padding:48,color:'#ccc'}}><BarChart2 size={40} style={{opacity:.3,marginBottom:12}}/><div>Nenhum centro de custo</div></div>:
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
          {centros.map(c=>(
            <div key={c.id} style={{background:'#fff',borderRadius:10,border:'1px solid #e8e8e8',padding:'14px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:700,color:NAVY,fontSize:13}}>{c.nome}</div>
                {c.codigo&&<div style={{fontSize:10,color:GOLD,fontFamily:'monospace'}}>{c.codigo}</div>}
                <div style={{fontSize:11,color:'#888'}}>{c.tipo} · {c.descricao||'—'}</div>
              </div>
              <button onClick={()=>excluir(c.id,'centros-custo')} style={{background:'#FEF2F2',border:'none',cursor:'pointer',padding:'6px 10px',borderRadius:7,color:'#dc2626'}}><Trash2 size={13}/></button>
            </div>
          ))}
        </div>}
      </div>}

      {/* ─────────────── RELATÓRIOS ─────────────────────────────────────── */}
      {aba==='relatorios'&&<div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
          {/* Despesas por categoria */}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #e8e8e8',padding:16}}>
            <div style={{fontWeight:700,color:NAVY,fontSize:13,marginBottom:12}}>📤 Despesas por Categoria</div>
            {chartDREDespesas.length===0?<div style={{textAlign:'center',color:'#ccc',padding:24,fontSize:12}}>Sem dados</div>:
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartDREDespesas.slice(0,8)} margin={{top:4,right:8,left:-20,bottom:0}} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false}/>
                <XAxis dataKey="name" tick={{fontSize:9,fill:'#aaa'}} axisLine={false} tickLine={false} tickFormatter={v=>v.slice(0,10)}/>
                <YAxis tick={{fontSize:9,fill:'#aaa'}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                <Tooltip contentStyle={{fontSize:11,borderRadius:8}} formatter={v=>fmtBRL(v)}/>
                <Bar dataKey="value" name="Valor" radius={[5,5,0,0]}>
                  {chartDREDespesas.slice(0,8).map((_,i)=><Cell key={i} fill={CORES[i%CORES.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>}
          </div>
          {/* Receitas por categoria */}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #e8e8e8',padding:16}}>
            <div style={{fontWeight:700,color:NAVY,fontSize:13,marginBottom:12}}>📥 Receitas por Categoria</div>
            {chartDREReceitas.length===0?<div style={{textAlign:'center',color:'#ccc',padding:24,fontSize:12}}>Sem dados</div>:
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartDREReceitas} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {chartDREReceitas.map((_,i)=><Cell key={i} fill={CORES[i%CORES.length]}/>)}
                </Pie>
                <Tooltip contentStyle={{fontSize:11,borderRadius:8}} formatter={v=>fmtBRL(v)}/>
                <Legend iconSize={10} wrapperStyle={{fontSize:11}}/>
              </PieChart>
            </ResponsiveContainer>}
          </div>
        </div>
        {/* DRE completo */}
        {dre&&<div style={{background:'#fff',borderRadius:12,border:'1px solid #e8e8e8',padding:20,marginBottom:16}}>
          <div style={{fontWeight:700,color:NAVY,fontSize:14,marginBottom:14}}>📋 DRE — {new Date(filtroAno,filtroMes-1).toLocaleString('pt-BR',{month:'long'})} {filtroAno}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:'#1A7A3C',marginBottom:8}}>RECEITAS</div>
              {dre.receitas.map((x,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f5f5f5',fontSize:12}}>
                  <span style={{color:'#555'}}>{x.categoria||'Outros'}</span>
                  <span style={{fontWeight:700,color:'#1A7A3C'}}>{fmtBRL(x.total)}</span>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',marginTop:4,borderTop:'2px solid #1A7A3C',fontWeight:800}}>
                <span style={{color:NAVY}}>TOTAL RECEITAS</span>
                <span style={{color:'#1A7A3C'}}>{fmtBRL(dre.total_receitas)}</span>
              </div>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:'#dc2626',marginBottom:8}}>DESPESAS</div>
              {dre.despesas.map((x,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f5f5f5',fontSize:12}}>
                  <span style={{color:'#555'}}>{x.categoria||'Outros'}</span>
                  <span style={{fontWeight:700,color:'#dc2626'}}>{fmtBRL(x.total)}</span>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',marginTop:4,borderTop:'2px solid #dc2626',fontWeight:800}}>
                <span style={{color:NAVY}}>TOTAL DESPESAS</span>
                <span style={{color:'#dc2626'}}>{fmtBRL(dre.total_despesas)}</span>
              </div>
            </div>
          </div>
          <div style={{marginTop:16,padding:'14px 18px',borderRadius:10,background:dre.lucro_liquido>=0?'#EDFBF1':'#FEF2F2',display:'flex',justifyContent:'space-between'}}>
            <span style={{fontWeight:800,fontSize:14,color:NAVY}}>RESULTADO LÍQUIDO</span>
            <span style={{fontWeight:800,fontSize:20,color:dre.lucro_liquido>=0?'#1A7A3C':'#dc2626'}}>{fmtBRL(dre.lucro_liquido)}</span>
          </div>
        </div>}
      </div>}

      {/* ── MODAL NOVA CONTA A PAGAR ───────────────────────────────────── */}
      {modal==='nova_pagar'&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:300,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'20px 16px',overflowY:'auto'}}>
        <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:620,boxShadow:'0 24px 64px rgba(0,0,0,.3)',marginBottom:40}}>
          <div style={{padding:'16px 22px',background:NAVY,borderRadius:'16px 16px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{color:'#fff',fontWeight:800}}>📤 Nova Conta a Pagar</div>
            <button onClick={()=>setModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.7)'}}><X size={18}/></button>
          </div>
          <div style={{padding:22,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{gridColumn:'1/-1'}}><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Descrição *</label><input value={form.descricao||''} onChange={e=>setF('descricao',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Valor (R$) *</label><input type="number" step="0.01" value={form.valor||''} onChange={e=>setF('valor',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Vencimento</label><input value={form.data_vencimento||''} onChange={e=>setF('data_vencimento',e.target.value)} placeholder="dd/mm/aaaa" style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Categoria</label>
              <select value={form.categoria||''} onChange={e=>setF('categoria',e.target.value)} style={sel}>
                <option value="">— Categoria —</option>{Object.keys(categorias.pagar||{}).map(c=><option key={c}>{c}</option>)}
              </select></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Subcategoria</label>
              <select value={form.subcategoria||''} onChange={e=>setF('subcategoria',e.target.value)} style={sel}>
                <option value="">— Subcategoria —</option>{(categorias.pagar?.[form.categoria]||[]).map(s=><option key={s}>{s}</option>)}
              </select></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Forma de Pagamento</label>
              <select value={form.forma_pagamento||'PIX'} onChange={e=>setF('forma_pagamento',e.target.value)} style={sel}>
                {(categorias.formas_pagamento||['PIX','Boleto','TED']).map(f=><option key={f}>{f}</option>)}
              </select></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Banco</label>
              <select value={form.banco_id||''} onChange={e=>setF('banco_id',e.target.value)} style={sel}>
                <option value="">— Banco —</option>{bancos.map(b=><option key={b.id} value={b.id}>{b.nome}</option>)}
              </select></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Centro de Custo</label>
              <select value={form.centro_custo_id||''} onChange={e=>setF('centro_custo_id',e.target.value)} style={sel}>
                <option value="">— Centro de Custo —</option>{centros.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
              </select></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Fornecedor</label>
              <select value={form.fornecedor_id||''} onChange={e=>{setF('fornecedor_id',e.target.value);const f=fornecedores.find(x=>x.id===Number(e.target.value));if(f)setF('fornecedor_nome',f.nome)}} style={sel}>
                <option value="">— Fornecedor —</option>{fornecedores.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}
              </select></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Nº Documento / Boleto</label><input value={form.numero_documento||''} onChange={e=>setF('numero_documento',e.target.value)} style={inp}/></div>
            <div style={{gridColumn:'1/-1',display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>E-mail de Alerta</label><input value={form.email_aviso||''} onChange={e=>setF('email_aviso',e.target.value)} placeholder="email@..." style={inp}/></div>
              <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>WhatsApp de Alerta</label><input value={form.whatsapp_aviso||''} onChange={e=>setF('whatsapp_aviso',e.target.value)} placeholder="(62) 9..." style={inp}/></div>
            </div>
            <div style={{gridColumn:'1/-1'}}><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>PIX Copia e Cola</label><input value={form.pix_copia_cola||''} onChange={e=>setF('pix_copia_cola',e.target.value)} style={inp}/></div>
            <div style={{gridColumn:'1/-1'}}><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Observações</label><textarea value={form.observacoes||''} onChange={e=>setF('observacoes',e.target.value)} rows={2} style={{...inp,resize:'vertical'}}/></div>
          </div>
          <div style={{padding:'0 22px 22px',display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button onClick={()=>setModal(null)} style={{padding:'9px 16px',borderRadius:8,background:'#f5f5f5',color:'#555',fontSize:12,fontWeight:700,border:'none',cursor:'pointer'}}>Cancelar</button>
            <button onClick={()=>salvarConta('pagar')} disabled={enviando} style={{padding:'9px 18px',borderRadius:8,background:enviando?'#aaa':NAVY,color:'#fff',fontSize:12,fontWeight:800,border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
              <Save size={13}/> {enviando?'Salvando...':'Salvar'}
            </button>
          </div>
        </div>
      </div>}

      {/* ── MODAL NOVA CONTA A RECEBER ──────────────────────────────────── */}
      {modal==='nova_receber'&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:300,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'20px 16px',overflowY:'auto'}}>
        <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:620,boxShadow:'0 24px 64px rgba(0,0,0,.3)',marginBottom:40}}>
          <div style={{padding:'16px 22px',background:'#1A7A3C',borderRadius:'16px 16px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{color:'#fff',fontWeight:800}}>📥 Nova Conta a Receber</div>
            <button onClick={()=>setModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.7)'}}><X size={18}/></button>
          </div>
          <div style={{padding:22,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{gridColumn:'1/-1'}}><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Descrição *</label><input value={form.descricao||''} onChange={e=>setF('descricao',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Valor (R$) *</label><input type="number" step="0.01" value={form.valor||''} onChange={e=>setF('valor',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Vencimento</label><input value={form.data_vencimento||''} onChange={e=>setF('data_vencimento',e.target.value)} placeholder="dd/mm/aaaa" style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Cliente</label>
              <select value={form.cliente_id||''} onChange={e=>{setF('cliente_id',e.target.value);const c=clientes.find(x=>x.id===Number(e.target.value));if(c)setF('cliente_nome',c.nome)}} style={sel}>
                <option value="">— Selecionar cliente —</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
              </select></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Categoria</label>
              <select value={form.categoria||''} onChange={e=>setF('categoria',e.target.value)} style={sel}>
                <option value="">— Categoria —</option>{Object.keys(categorias.receber||{}).map(c=><option key={c}>{c}</option>)}
              </select></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Subcategoria</label>
              <select value={form.subcategoria||''} onChange={e=>setF('subcategoria',e.target.value)} style={sel}>
                <option value="">— Subcategoria —</option>{(categorias.receber?.[form.categoria]||[]).map(s=><option key={s}>{s}</option>)}
              </select></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Forma de Recebimento</label>
              <select value={form.forma_recebimento||'PIX'} onChange={e=>setF('forma_recebimento',e.target.value)} style={sel}>
                {(categorias.formas_pagamento||['PIX','Boleto','TED']).map(f=><option key={f}>{f}</option>)}
              </select></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Banco Destino</label>
              <select value={form.banco_id||''} onChange={e=>setF('banco_id',e.target.value)} style={sel}>
                <option value="">— Banco —</option>{bancos.map(b=><option key={b.id} value={b.id}>{b.nome}</option>)}
              </select></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Chave PIX</label><input value={form.chave_pix||''} onChange={e=>setF('chave_pix',e.target.value)} style={inp}/></div>
            <div style={{gridColumn:'1/-1',display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>E-mail de Alerta</label><input value={form.email_aviso||''} onChange={e=>setF('email_aviso',e.target.value)} style={inp}/></div>
              <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>WhatsApp de Alerta</label><input value={form.whatsapp_aviso||''} onChange={e=>setF('whatsapp_aviso',e.target.value)} style={inp}/></div>
            </div>
            <div style={{gridColumn:'1/-1'}}><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Observações</label><textarea value={form.observacoes||''} onChange={e=>setF('observacoes',e.target.value)} rows={2} style={{...inp,resize:'vertical'}}/></div>
          </div>
          <div style={{padding:'0 22px 22px',display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button onClick={()=>setModal(null)} style={{padding:'9px 16px',borderRadius:8,background:'#f5f5f5',color:'#555',fontSize:12,fontWeight:700,border:'none',cursor:'pointer'}}>Cancelar</button>
            <button onClick={()=>salvarConta('receber')} disabled={enviando} style={{padding:'9px 18px',borderRadius:8,background:enviando?'#aaa':'#1A7A3C',color:'#fff',fontSize:12,fontWeight:800,border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
              <Save size={13}/> {enviando?'Salvando...':'Salvar'}
            </button>
          </div>
        </div>
      </div>}

      {/* ── MODAL BANCO ─────────────────────────────────────────────────── */}
      {modal==='novo_banco'&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
        <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:480,boxShadow:'0 24px 64px rgba(0,0,0,.3)'}}>
          <div style={{padding:'16px 22px',background:NAVY,borderRadius:'16px 16px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{color:'#fff',fontWeight:800}}>🏦 Novo Banco / Conta</div>
            <button onClick={()=>setModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.7)'}}><X size={18}/></button>
          </div>
          <div style={{padding:22,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{gridColumn:'1/-1'}}><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Nome *</label><input value={form.nome||''} onChange={e=>setF('nome',e.target.value)} placeholder="Ex: Conta Principal Bradesco" style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Banco</label><input value={form.banco||''} onChange={e=>setF('banco',e.target.value)} placeholder="Bradesco, Itaú, Inter..." style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Tipo</label><select value={form.tipo||'Conta Corrente'} onChange={e=>setF('tipo',e.target.value)} style={sel}><option>Conta Corrente</option><option>Conta Poupança</option><option>Conta Digital</option><option>Caixa</option></select></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Agência</label><input value={form.agencia||''} onChange={e=>setF('agencia',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Conta</label><input value={form.conta||''} onChange={e=>setF('conta',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Saldo Inicial (R$)</label><input type="number" step="0.01" value={form.saldo_inicial||0} onChange={e=>setF('saldo_inicial',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Cor</label><input type="color" value={form.cor||'#1D6FA4'} onChange={e=>setF('cor',e.target.value)} style={{...inp,height:38,padding:'4px 8px',cursor:'pointer'}}/></div>
          </div>
          <div style={{padding:'0 22px 22px',display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button onClick={()=>setModal(null)} style={{padding:'9px 16px',borderRadius:8,background:'#f5f5f5',color:'#555',fontSize:12,fontWeight:700,border:'none',cursor:'pointer'}}>Cancelar</button>
            <button onClick={salvarBanco} disabled={enviando} style={{padding:'9px 18px',borderRadius:8,background:enviando?'#aaa':NAVY,color:'#fff',fontSize:12,fontWeight:800,border:'none',cursor:'pointer'}}><Save size={13} style={{display:'inline',marginRight:6}}/>{enviando?'Salvando...':'Salvar'}</button>
          </div>
        </div>
      </div>}

      {/* ── MODAL FORNECEDOR ────────────────────────────────────────────── */}
      {modal==='novo_fornecedor'&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:300,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'20px 16px',overflowY:'auto'}}>
        <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:620,boxShadow:'0 24px 64px rgba(0,0,0,.3)',marginBottom:40}}>
          <div style={{padding:'16px 22px',background:NAVY,borderRadius:'16px 16px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{color:'#fff',fontWeight:800}}>🏢 Novo Fornecedor</div>
            <button onClick={()=>setModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.7)'}}><X size={18}/></button>
          </div>
          <div style={{padding:22,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{gridColumn:'1/-1',display:'flex',gap:8}}>
              <input value={buscaCNPJ} onChange={e=>setBuscaCNPJ(e.target.value)} placeholder="00.000.000/0001-00 — buscar CNPJ" style={{...inp,flex:1}}/>
              <button onClick={()=>buscarCNPJ().then(()=>setForm(f=>({...f,...JSON.parse(localStorage.getItem('_cnpjtemp')||'{}')})))} style={{padding:'9px 14px',borderRadius:8,background:'#1D6FA4',color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',whiteSpace:'nowrap'}}>🔍 Buscar CNPJ</button>
            </div>
            <div style={{gridColumn:'1/-1'}}><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Nome / Razão Social *</label><input value={form.nome||''} onChange={e=>setF('nome',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>CNPJ</label><input value={form.cnpj||''} onChange={e=>setF('cnpj',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>E-mail</label><input value={form.email||''} onChange={e=>setF('email',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Telefone</label><input value={form.telefone||''} onChange={e=>setF('telefone',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>WhatsApp</label><input value={form.whatsapp||''} onChange={e=>setF('whatsapp',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Cidade</label><input value={form.cidade||''} onChange={e=>setF('cidade',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>UF</label><input value={form.uf||'GO'} onChange={e=>setF('uf',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Chave PIX</label><input value={form.pix||''} onChange={e=>setF('pix',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Categoria</label><input value={form.categoria||''} onChange={e=>setF('categoria',e.target.value)} placeholder="Serviços, Produtos..." style={inp}/></div>
          </div>
          <div style={{padding:'0 22px 22px',display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button onClick={()=>setModal(null)} style={{padding:'9px 16px',borderRadius:8,background:'#f5f5f5',color:'#555',fontSize:12,fontWeight:700,border:'none',cursor:'pointer'}}>Cancelar</button>
            <button onClick={salvarFornecedor} disabled={enviando} style={{padding:'9px 18px',borderRadius:8,background:enviando?'#aaa':NAVY,color:'#fff',fontSize:12,fontWeight:800,border:'none',cursor:'pointer'}}><Save size={13} style={{display:'inline',marginRight:6}}/>{enviando?'Salvando...':'Salvar'}</button>
          </div>
        </div>
      </div>}

      {/* ── MODAL CENTRO DE CUSTO ───────────────────────────────────────── */}
      {modal==='novo_centro'&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
        <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:440,boxShadow:'0 24px 64px rgba(0,0,0,.3)'}}>
          <div style={{padding:'16px 22px',background:NAVY,borderRadius:'16px 16px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{color:'#fff',fontWeight:800}}>📂 Novo Centro de Custo</div>
            <button onClick={()=>setModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.7)'}}><X size={18}/></button>
          </div>
          <div style={{padding:22,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{gridColumn:'1/-1'}}><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Nome *</label><input value={form.nome||''} onChange={e=>setF('nome',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Código</label><input value={form.codigo||''} onChange={e=>setF('codigo',e.target.value)} placeholder="CC-001" style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Tipo</label><select value={form.tipo||'Despesa'} onChange={e=>setF('tipo',e.target.value)} style={sel}><option>Despesa</option><option>Receita</option><option>Investimento</option></select></div>
            <div style={{gridColumn:'1/-1'}}><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Descrição</label><input value={form.descricao||''} onChange={e=>setF('descricao',e.target.value)} style={inp}/></div>
          </div>
          <div style={{padding:'0 22px 22px',display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button onClick={()=>setModal(null)} style={{padding:'9px 16px',borderRadius:8,background:'#f5f5f5',color:'#555',fontSize:12,fontWeight:700,border:'none',cursor:'pointer'}}>Cancelar</button>
            <button onClick={salvarCentro} style={{padding:'9px 18px',borderRadius:8,background:NAVY,color:'#fff',fontSize:12,fontWeight:800,border:'none',cursor:'pointer'}}><Save size={13} style={{display:'inline',marginRight:6}}/>Salvar</button>
          </div>
        </div>
      </div>}

      {/* ── MODAL REGISTRAR PAGAMENTO ────────────────────────────────────── */}
      {pagamentoModal&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
        <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:420,boxShadow:'0 24px 64px rgba(0,0,0,.3)'}}>
          <div style={{padding:'16px 22px',background:pagamentoModal.tipo==='pagar'?NAVY:'#1A7A3C',borderRadius:'16px 16px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{color:'#fff',fontWeight:800}}>{pagamentoModal.tipo==='pagar'?'💳 Registrar Pagamento':'💚 Registrar Recebimento'}</div>
            <button onClick={()=>setPagamentoModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.7)'}}><X size={18}/></button>
          </div>
          <div style={{padding:22,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{gridColumn:'1/-1',padding:'10px 14px',borderRadius:8,background:'#f8f9fb',fontSize:12,color:'#333'}}><strong>{pagamentoModal.descricao}</strong><br/>Valor original: {fmtBRL(pagamentoModal.valor)}</div>
            <div style={{gridColumn:'1/-1'}}><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Valor {pagamentoModal.tipo==='pagar'?'Pago':'Recebido'} *</label><input type="number" step="0.01" value={pagForm.valor_pago} onChange={e=>setPagForm(f=>({...f,valor_pago:e.target.value}))} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Data</label><input value={pagForm.data_pagamento} onChange={e=>setPagForm(f=>({...f,data_pagamento:e.target.value}))} placeholder="dd/mm/aaaa" style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Forma</label><select value={pagForm.forma_pagamento} onChange={e=>setPagForm(f=>({...f,forma_pagamento:e.target.value}))} style={sel}><option>PIX</option><option>Boleto</option><option>TED/DOC</option><option>Cartão de Crédito</option><option>Dinheiro</option></select></div>
            <div style={{gridColumn:'1/-1'}}><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Banco</label><select value={pagForm.banco_id} onChange={e=>setPagForm(f=>({...f,banco_id:e.target.value}))} style={sel}><option value="">— Banco (opcional) —</option>{bancos.map(b=><option key={b.id} value={b.id}>{b.nome}</option>)}</select></div>
          </div>
          <div style={{padding:'0 22px 22px',display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button onClick={()=>setPagamentoModal(null)} style={{padding:'9px 16px',borderRadius:8,background:'#f5f5f5',color:'#555',fontSize:12,fontWeight:700,border:'none',cursor:'pointer'}}>Cancelar</button>
            <button onClick={registrarPagamento} disabled={enviando} style={{padding:'9px 18px',borderRadius:8,background:enviando?'#aaa':pagamentoModal.tipo==='pagar'?NAVY:'#1A7A3C',color:'#fff',fontSize:12,fontWeight:800,border:'none',cursor:'pointer'}}>{enviando?'Salvando...':'Confirmar'}</button>
          </div>
        </div>
      </div>}
    </div>
  )
}
