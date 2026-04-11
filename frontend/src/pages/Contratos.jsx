import { useState, useEffect } from 'react'
import { Plus, X, Save, Bot, Trash2, Eye, RefreshCw, FileText, CheckCircle,
         AlertTriangle, Clock, Send, Settings, Edit2, Calendar } from 'lucide-react'

const NAVY='#1B2A4A',GOLD='#C5A55A',API='/api/v1'
const fmtBRL=v=>`R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`
const inp={padding:'9px 12px',borderRadius:8,border:'1px solid #e0e0e0',fontSize:12,outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit',color:'#333'}
const sel={...inp,cursor:'pointer'}

const TIPOS=['Prestação de Serviços Contábeis','Assessoria Tributária','Consultoria Fiscal','Auditoria','Holding/Estruturação','Abertura de Empresa','Terceirização de RH','Contrato de Confidencialidade','Termo de Cessão','Locação','Fornecimento','Parceria','Outro']
const STATUS_CFG={
  aguardando:{label:'Aguardando Assinatura',cor:'#854D0E',bg:'#FEF9C3',emoji:'✏️'},
  ativo:     {label:'Ativo',cor:'#1A7A3C',bg:'#EDFBF1',emoji:'✅'},
  vencendo:  {label:'Vencendo',cor:'#f59e0b',bg:'#FEF9C3',emoji:'⏰'},
  vencido:   {label:'Vencido',cor:'#dc2626',bg:'#FEF2F2',emoji:'🔴'},
  suspenso:  {label:'Suspenso',cor:'#6B7280',bg:'#f5f5f5',emoji:'⏸️'},
  encerrado: {label:'Encerrado',cor:'#6B7280',bg:'#f5f5f5',emoji:'⛔'},
}
const TEMPLATES_LABEL={assinatura:'✍️ Pronto para Assinatura',renovacao:'🔄 Renovação',vencimento:'⚠️ Vencimento',boas_vindas:'👋 Boas-vindas',reajuste:'📊 Reajuste'}
const FORM0={numero:'',tipo:'Prestação de Serviços Contábeis',titulo:'',cliente_id:null,cliente_nome:'',parte_a:'EPimentel Auditoria & Contabilidade Ltda',valor_mensal:0,valor_total:0,forma_pagamento:'PIX',dia_vencimento:10,data_inicio:'',data_vencimento:'',vigencia_meses:12,renovacao_automatica:true,indice_reajuste:'IPCA',status:'aguardando',objeto:'',clausulas:'',observacoes:'',email_contato:'',whatsapp_contato:'',dias_alerta:30}

export default function Contratos(){
  const [contratos,setContratos]=useState([])
  const [clientes,setClientes]=useState([])
  const [carregando,setCarregando]=useState(false)
  const [modal,setModal]=useState(null)
  const [form,setForm]=useState({...FORM0})
  const [detalhe,setDetalhe]=useState(null)
  const [enviando,setEnviando]=useState(false)
  const [sucesso,setSucesso]=useState('')
  const [filtroStatus,setFiltroStatus]=useState('')
  const [resumo,setResumo]=useState(null)
  const [buscaCli,setBuscaCli]=useState('')
  const [templateId,setTemplateId]=useState('boas_vindas')
  const [aditivo,setAditivo]=useState({descricao:'',valor_novo:0,motivo:''})
  const [assModal,setAssModal]=useState(null)
  const [assForm,setAssForm]=useState({provider:'autentique',enviar_por_whatsapp:false,mensagem:'',signatarios:[]})
  const [assResultado,setAssResultado]=useState(null)
  const [providers,setProviders]=useState({providers:[],configurados:[]})

  useEffect(()=>{
    try{setClientes(JSON.parse(localStorage.getItem('ep_clientes')||'[]'))}catch{}
    fetch(`${API}/clientes/`).then(r=>r.json()).then(d=>setClientes(d.clientes||d||[])).catch(()=>{})
    carregarDados()
  },[])

  const carregarDados=async()=>{
    setCarregando(true)
    try{
      const [r1,r2]=await Promise.all([
        fetch(`${API}/contratos/listar${filtroStatus?'?status='+filtroStatus:''}`).then(r=>r.ok?r.json():[]),
        fetch(`${API}/contratos/resumo`).then(r=>r.ok?r.json():null)
      ])
      setContratos(r1);if(r2)setResumo(r2)
    }catch{}finally{setCarregando(false)}
  }

  const setF=useCallback=>((k,v)=>setForm(f=>({...f,[k]:v})))
  const setFF=(k,v)=>setForm(f=>({...f,[k]:v}))

  const salvar=async()=>{
    if(!form.tipo){alert('Selecione o tipo');return}
    setEnviando(true)
    try{
      const r=await fetch(`${API}/contratos/criar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,valor_mensal:Number(form.valor_mensal),valor_total:Number(form.valor_total),vigencia_meses:Number(form.vigencia_meses),dia_vencimento:Number(form.dia_vencimento),dias_alerta:Number(form.dias_alerta)})})
      if(r.ok){setSucesso('✅ Contrato salvo!');await carregarDados();setTimeout(()=>{setModal(null);setSucesso('')},1500)}
    }catch{}finally{setEnviando(false)}
  }

  const excluir=async(id)=>{
    if(!confirm('Excluir este contrato?'))return
    await fetch(`${API}/contratos/${id}`,{method:'DELETE'})
    await carregarDados();setDetalhe(null)
  }

  const gerarAlerta=async(id)=>{
    await fetch(`${API}/contratos/gerar-alerta/${id}`,{method:'POST'})
    setSucesso('🤖 Alerta IA gerado!');setTimeout(()=>setSucesso(''),3000);await carregarDados()
  }

  const enviarTemplate=async(id)=>{
    await fetch(`${API}/contratos/enviar-template/${id}?template_id=${templateId}`,{method:'POST'})
    setSucesso('📲 Template enviado!');setTimeout(()=>setSucesso(''),3000)
  }

  const verificarTodos=async()=>{
    setCarregando(true)
    const r=await fetch(`${API}/contratos/verificar-vencimentos`,{method:'POST'})
    const d=await r.json()
    alert(`✅ ${d.verificados} contratos verificados`)
    await carregarDados();setCarregando(false)
  }

  const atualizarStatus=async(id,status)=>{
    await fetch(`${API}/contratos/atualizar/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})})
    await carregarDados()
  }

  const enviarAssinatura=async()=>{
    if(!assModal)return
    setEnviando(true);setAssResultado(null)
    try{
      const r=await fetch(`${API}/contratos/assinar`,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({contrato_id:assModal.id,...assForm})})
      const d=await r.json()
      if(d.erro){setAssResultado({erro:true,msg:d.erro})}
      else{setAssResultado({ok:true,url:d.url,doc_id:d.documento_id,provider:d.provider,msg:'✅ Enviado para assinatura!'})}
      await carregarDados()
    }catch(e){setAssResultado({erro:true,msg:e.message})}finally{setEnviando(false)}
  }

  const salvarAditivo=async(contId)=>{
    await fetch(`${API}/contratos/aditivos`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...aditivo,contrato_id:contId,valor_novo:Number(aditivo.valor_novo),valor_anterior:detalhe?.valor_mensal||0,data_aditivo:new Date().toLocaleDateString('pt-BR')})})
    setSucesso('✅ Aditivo registrado!');await carregarDados();setTimeout(()=>setSucesso(''),2000)
  }

  const contsFiltrados=contratos.filter(c=>!filtroStatus||c.status===filtroStatus)
  const cliFilt=clientes.filter(c=>{const q=buscaCli.toLowerCase();return !q||(c.nome||'').toLowerCase().includes(q)})

  if(detalhe){
    const s=STATUS_CFG[detalhe.status]||STATUS_CFG.aguardando
    return(
      <div style={{padding:24,maxWidth:900,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
          <button onClick={()=>setDetalhe(null)} style={{padding:'7px 12px',borderRadius:8,background:'#f5f5f5',border:'none',cursor:'pointer',color:'#555',display:'flex',alignItems:'center',gap:6,fontSize:12}}><X size={13}/> Voltar</button>
          <span style={{fontSize:13,fontWeight:700,color:NAVY}}>{detalhe.numero} — {detalhe.tipo}</span>
        </div>
        {sucesso&&<div style={{padding:'9px 14px',borderRadius:8,background:'#EDFBF1',border:'1px solid #86efac',color:'#166534',fontWeight:700,fontSize:12,marginBottom:14}}>{sucesso}</div>}
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e8e8e8',overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
          <div style={{background:`linear-gradient(135deg,${NAVY},#2d4a7a)`,padding:'18px 24px',display:'flex',gap:10,alignItems:'flex-start'}}>
            <div style={{flex:1}}>
              <div style={{color:'#fff',fontWeight:800,fontSize:16}}>{detalhe.tipo}</div>
              <div style={{color:GOLD,fontSize:12,marginTop:4}}>{detalhe.cliente_nome} · {detalhe.numero}</div>
            </div>
            <span style={{background:s.bg,color:s.cor,padding:'5px 14px',borderRadius:12,fontSize:12,fontWeight:800}}>{s.emoji} {s.label}</span>
          </div>
          <div style={{padding:24}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
              {[{l:'Valor Mensal',v:fmtBRL(detalhe.valor_mensal),c:'#1A7A3C'},{l:'Vigência',v:`${detalhe.vigencia_meses} meses`,c:NAVY},{l:'Vencimento',v:detalhe.data_vencimento||'—',c:detalhe.status==='vencido'?'#dc2626':'#333'}].map(k=>(
                <div key={k.l} style={{background:'#f8f9fb',borderRadius:10,padding:'12px 14px',textAlign:'center'}}>
                  <div style={{fontSize:16,fontWeight:800,color:k.c}}>{k.v}</div>
                  <div style={{fontSize:10,color:'#888',marginTop:2}}>{k.l}</div>
                </div>
              ))}
            </div>
            <div style={{background:'#f8f9fb',borderRadius:8,padding:'12px 14px',marginBottom:14,fontSize:12}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div><span style={{color:'#888'}}>Início: </span><strong>{detalhe.data_inicio||'—'}</strong></div>
                <div><span style={{color:'#888'}}>Renovação auto: </span><strong>{detalhe.renovacao_automatica?'Sim':'Não'}</strong></div>
                <div><span style={{color:'#888'}}>Índice: </span><strong>{detalhe.indice_reajuste}</strong></div>
                <div><span style={{color:'#888'}}>Responsável: </span><strong>{detalhe.responsavel}</strong></div>
                {detalhe.email_contato&&<div>✉️ {detalhe.email_contato}</div>}
                {detalhe.whatsapp_contato&&<div>📱 {detalhe.whatsapp_contato}</div>}
              </div>
            </div>
            {detalhe.objeto&&<div style={{background:'#EBF5FF',borderRadius:8,padding:'12px 14px',marginBottom:14,fontSize:12,color:'#1D6FA4'}}><strong>Objeto: </strong>{detalhe.objeto}</div>}
            {detalhe.alerta_ia&&<div style={{background:'#F3EEFF',borderRadius:8,padding:'12px 14px',marginBottom:14,fontSize:12,color:'#6B3EC9',lineHeight:1.6}}><strong>🤖 IA: </strong>{detalhe.alerta_ia}</div>}
            {detalhe.observacoes&&<div style={{background:'#FEF9C3',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:12}}>{detalhe.observacoes}</div>}

            {/* Alterar status */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:NAVY,marginBottom:8}}>Alterar Status</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {Object.entries(STATUS_CFG).map(([k,v])=>(
                  <button key={k} onClick={()=>atualizarStatus(detalhe.id,k)}
                    style={{padding:'5px 12px',borderRadius:10,border:`1px solid ${detalhe.status===k?v.cor:'#e0e0e0'}`,background:detalhe.status===k?v.bg:'#fff',color:v.cor,fontSize:11,fontWeight:700,cursor:'pointer'}}>
                    {v.emoji} {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Enviar template WA */}
            <div style={{marginBottom:14,padding:'12px 14px',borderRadius:8,background:'#f8f9fb',border:'1px solid #e8e8e8'}}>
              <div style={{fontSize:12,fontWeight:700,color:NAVY,marginBottom:8}}>📲 Enviar Template WhatsApp</div>
              <div style={{display:'flex',gap:8}}>
                <select value={templateId} onChange={e=>setTemplateId(e.target.value)} style={{...sel,flex:1}}>
                  {Object.entries(TEMPLATES_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
                <button onClick={()=>enviarTemplate(detalhe.id)} style={{padding:'9px 14px',borderRadius:8,background:'#25D366',color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                  <Send size={13}/> Enviar
                </button>
              </div>
            </div>

            {/* Aditivo */}
            <div style={{marginBottom:14,padding:'12px 14px',borderRadius:8,background:'#f8f9fb',border:'1px solid #e8e8e8'}}>
              <div style={{fontSize:12,fontWeight:700,color:NAVY,marginBottom:8}}>📝 Registrar Aditivo</div>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:8}}>
                <input value={aditivo.descricao} onChange={e=>setAditivo(a=>({...a,descricao:e.target.value}))} placeholder="Descrição do aditivo" style={inp}/>
                <input type="number" step="0.01" value={aditivo.valor_novo} onChange={e=>setAditivo(a=>({...a,valor_novo:e.target.value}))} placeholder="Novo valor mensal" style={inp}/>
                <input value={aditivo.motivo} onChange={e=>setAditivo(a=>({...a,motivo:e.target.value}))} placeholder="Motivo" style={{...inp,gridColumn:'1/-1'}}/>
                <button onClick={()=>salvarAditivo(detalhe.id)} style={{gridColumn:'1/-1',padding:'9px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}>Salvar Aditivo</button>
              </div>
            </div>

            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{setAssModal(detalhe);setAssResultado(null);setAssForm({provider:providers.configurados[0]||'autentique',enviar_por_whatsapp:false,mensagem:'Por favor, assine o contrato.',signatarios:[{nome:detalhe.cliente_nome,email:detalhe.email_contato,telefone:detalhe.whatsapp_contato}]})}} style={{flex:1,padding:'9px',borderRadius:8,background:'#EBF5FF',color:'#1D6FA4',fontWeight:700,fontSize:12,border:'1px solid #93c5fd',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>✍️ Assinar Digitalmente</button>
              <button onClick={()=>gerarAlerta(detalhe.id)} style={{padding:'9px',borderRadius:8,background:'#F3EEFF',color:'#6B3EC9',fontWeight:700,fontSize:12,border:'1px solid #c4b5fd',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Bot size={13}/></button>
              <button onClick={()=>excluir(detalhe.id)} style={{padding:'9px 14px',borderRadius:8,background:'#FEF2F2',color:'#dc2626',fontWeight:700,fontSize:12,border:'1px solid #fca5a5',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}><Trash2 size={13}/> Excluir</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return(
    <div style={{padding:20,maxWidth:1100,margin:'0 auto'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:42,height:42,borderRadius:10,background:`linear-gradient(135deg,${NAVY},#2d4a7a)`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <FileText size={20} style={{color:GOLD}}/>
          </div>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:NAVY}}>Contratos</div>
            <div style={{fontSize:12,color:'#888'}}>Gestão completa · IA Claude · Templates WA · Aditivos · Alertas</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={verificarTodos} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,background:'#FEF9C3',color:'#854D0E',border:'1px solid #fcd34d',fontWeight:700,fontSize:12,cursor:'pointer'}}><Bot size={12}/> Verificar Vencimentos</button>
          <button onClick={()=>{setForm({...FORM0});setModal('novo')}} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}><Plus size={13}/> Novo Contrato</button>
        </div>
      </div>

      {sucesso&&<div style={{padding:'9px 14px',borderRadius:8,background:'#EDFBF1',border:'1px solid #86efac',color:'#166534',fontWeight:700,fontSize:12,marginBottom:14}}>{sucesso}</div>}

      {/* KPIs */}
      {resumo&&<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {l:'Total Contratos',n:resumo.total,c:NAVY},
          {l:'Ativos',n:(resumo.por_status.find(x=>x.status==='ativo')||{}).qtd||0,c:'#1A7A3C'},
          {l:'Vencendo',n:(resumo.por_status.find(x=>x.status==='vencendo')||{}).qtd||0,c:'#f59e0b'},
          {l:'Receita Mensal',n:fmtBRL(resumo.valor_mensal_total),c:'#1A7A3C',big:true},
        ].map(k=>(
          <div key={k.l} style={{background:'#fff',borderRadius:12,padding:'14px 16px',border:`1px solid ${k.c}20`,boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>
            <div style={{fontSize:k.big?16:22,fontWeight:800,color:k.c}}>{k.n}</div>
            <div style={{fontSize:11,color:'#888',marginTop:2}}>{k.l}</div>
          </div>
        ))}
      </div>}

      {/* Filtros status */}
      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        <button onClick={()=>setFiltroStatus('')} style={{padding:'5px 14px',borderRadius:16,border:`1px solid ${!filtroStatus?NAVY:'#e0e0e0'}`,background:!filtroStatus?NAVY:'#fff',color:!filtroStatus?'#fff':'#888',fontSize:11,fontWeight:700,cursor:'pointer'}}>Todos</button>
        {Object.entries(STATUS_CFG).map(([k,v])=>(
          <button key={k} onClick={()=>setFiltroStatus(filtroStatus===k?'':k)}
            style={{padding:'5px 14px',borderRadius:16,border:`1px solid ${filtroStatus===k?v.cor:'#e0e0e0'}`,background:filtroStatus===k?v.bg:'#fff',color:filtroStatus===k?v.cor:'#888',fontSize:11,fontWeight:700,cursor:'pointer'}}>
            {v.emoji} {v.label}
          </button>
        ))}
        <button onClick={carregarDados} style={{marginLeft:'auto',padding:'5px 10px',borderRadius:7,background:'#f5f5f5',border:'none',cursor:'pointer',color:'#888'}}><RefreshCw size={13}/></button>
      </div>

      {/* Lista */}
      {carregando?<div style={{textAlign:'center',padding:40,color:'#aaa'}}>Carregando...</div>:
      contsFiltrados.length===0?
        <div style={{textAlign:'center',padding:48,color:'#ccc'}}>
          <FileText size={40} style={{opacity:.3,marginBottom:12}}/>
          <div style={{fontSize:14,marginBottom:12}}>Nenhum contrato encontrado</div>
          <button onClick={()=>{setForm({...FORM0});setModal('novo')}} style={{padding:'9px 18px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}>+ Novo Contrato</button>
        </div>:
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {contsFiltrados.map(cont=>{
          const s=STATUS_CFG[cont.status]||STATUS_CFG.aguardando
          const urgente=cont.status==='vencido'||cont.status==='vencendo'
          return(
            <div key={cont.id} style={{background:'#fff',borderRadius:12,border:`1px solid ${urgente?'#fca5a5':'#e8e8e8'}`,padding:'14px 18px',boxShadow:urgente?'0 0 0 2px #fca5a530':'0 1px 6px rgba(0,0,0,.04)'}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                    <span style={{fontSize:13,fontWeight:800,color:NAVY}}>{cont.tipo}</span>
                    <span style={{background:s.bg,color:s.cor,padding:'2px 10px',borderRadius:10,fontSize:11,fontWeight:700}}>{s.emoji} {s.label}</span>
                    {cont.alerta_ia&&<span style={{background:'#F3EEFF',color:'#6B3EC9',padding:'2px 10px',borderRadius:10,fontSize:11,fontWeight:700}}>🤖 IA</span>}
                    {cont.dias_vencimento!==null&&cont.dias_vencimento<=30&&cont.dias_vencimento>0&&(
                      <span style={{background:'#FEF9C3',color:'#854D0E',padding:'2px 10px',borderRadius:10,fontSize:11,fontWeight:800}}>⏰ {cont.dias_vencimento}d</span>
                    )}
                  </div>
                  <div style={{fontSize:11,color:'#888',display:'flex',gap:14,flexWrap:'wrap',marginBottom:6}}>
                    <span>👤 {cont.cliente_nome||'—'}</span>
                    <span>📄 {cont.numero||'—'}</span>
                    <span>📅 Vence: <strong style={{color:cont.status==='vencido'?'#dc2626':'#333'}}>{cont.data_vencimento||'—'}</strong></span>
                    {cont.renovacao_automatica&&<span style={{color:'#1A7A3C'}}>🔄 Renovação auto</span>}
                  </div>
                  {cont.alerta_ia&&<div style={{padding:'6px 10px',borderRadius:7,background:'#F3EEFF',fontSize:11,color:'#6B3EC9',lineHeight:1.5}}>{cont.alerta_ia.slice(0,150)}{cont.alerta_ia.length>150?'…':''}</div>}
                </div>
                <div style={{flexShrink:0,textAlign:'right'}}>
                  <div style={{fontSize:16,fontWeight:800,color:'#1A7A3C'}}>{fmtBRL(cont.valor_mensal)}<span style={{fontSize:10,color:'#aaa',fontWeight:400}}>/mês</span></div>
                  {cont.vigencia_meses&&<div style={{fontSize:10,color:'#aaa'}}>{cont.vigencia_meses} meses</div>}
                  <div style={{display:'flex',gap:5,marginTop:8,justifyContent:'flex-end'}}>
                    <button onClick={()=>setDetalhe(cont)} title="Detalhes" style={{padding:'5px 8px',borderRadius:6,background:'#f5f5f5',border:'none',cursor:'pointer',color:NAVY}}><Eye size={12}/></button>
                    <button onClick={()=>{setAssModal(cont);setAssResultado(null);setAssForm({provider:providers.configurados[0]||'autentique',enviar_por_whatsapp:false,mensagem:'',signatarios:[{nome:cont.cliente_nome,email:cont.email_contato,telefone:cont.whatsapp_contato}]})}} title='Assinar digitalmente' style={{padding:'5px 8px',borderRadius:6,background:'#EBF5FF',border:'none',cursor:'pointer',color:'#1D6FA4'}}>✍️</button>
                    <button onClick={()=>gerarAlerta(cont.id)} title="Alerta IA" style={{padding:'5px 8px',borderRadius:6,background:'#F3EEFF',border:'none',cursor:'pointer',color:'#6B3EC9'}}><Bot size={12}/></button>
                    <button onClick={()=>excluir(cont.id)} title="Excluir" style={{padding:'5px 8px',borderRadius:6,background:'#FEF2F2',border:'none',cursor:'pointer',color:'#dc2626'}}><Trash2 size={12}/></button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>}

      {/* ── MODAL ASSINATURA DIGITAL ──────────────────────────────── */}
      {assModal&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:400,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'20px 16px',overflowY:'auto'}}>
        <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:580,boxShadow:'0 24px 64px rgba(0,0,0,.3)',marginBottom:40}}>
          <div style={{padding:'16px 22px',background:'#1D6FA4',borderRadius:'16px 16px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{color:'#fff',fontWeight:800}}>✍️ Assinatura Digital — {assModal.tipo}</div>
            <button onClick={()=>setAssModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.7)'}}><X size={18}/></button>
          </div>
          <div style={{padding:22}}>
            {/* Status dos providers */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              {(providers.providers||[]).map(p=>(
                <div key={p.id} onClick={()=>setAssForm(f=>({...f,provider:p.id}))}
                  style={{padding:'12px 14px',borderRadius:10,border:`2px solid ${assForm.provider===p.id?'#1D6FA4':'#e0e0e0'}`,background:assForm.provider===p.id?'#EBF5FF':'#fff',cursor:p.configurado?'pointer':'not-allowed',opacity:p.configurado?1:0.5}}>
                  <div style={{fontWeight:700,color:'#1B2A4A',fontSize:13}}>{p.nome}{p.configurado&&' ✅'}</div>
                  <div style={{fontSize:10,color:'#888',marginTop:4,lineHeight:1.4}}>{p.descricao}</div>
                  {!p.configurado&&<div style={{fontSize:9,color:'#dc2626',marginTop:4}}>Configurar: {p.variaveis.join(', ')}</div>}
                </div>
              ))}
            </div>
            {assResultado&&<div style={{padding:'10px 14px',borderRadius:8,background:assResultado.erro?'#FEF2F2':'#EDFBF1',border:`1px solid ${assResultado.erro?'#fca5a5':'#86efac'}`,color:assResultado.erro?'#991B1B':'#166534',fontSize:12,fontWeight:700,marginBottom:14}}>
              {assResultado.msg}{assResultado.url&&<><br/><a href={assResultado.url} target="_blank" rel="noreferrer" style={{color:'#1D6FA4'}}>🔗 Ver documento no {assResultado.provider}</a></>}
            </div>}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:.7}}>Signatários</label>
              {(assForm.signatarios||[]).map((s,i)=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 2fr 1fr auto',gap:6,marginBottom:6}}>
                  <input value={s.nome||''} onChange={e=>{const sl=[...assForm.signatarios];sl[i]={...sl[i],nome:e.target.value};setAssForm(f=>({...f,signatarios:sl}))}} placeholder="Nome" style={{...inp}}/>
                  <input value={s.email||''} onChange={e=>{const sl=[...assForm.signatarios];sl[i]={...sl[i],email:e.target.value};setAssForm(f=>({...f,signatarios:sl}))}} placeholder="E-mail" style={{...inp}}/>
                  <input value={s.telefone||''} onChange={e=>{const sl=[...assForm.signatarios];sl[i]={...sl[i],telefone:e.target.value};setAssForm(f=>({...f,signatarios:sl}))}} placeholder="Telefone" style={{...inp}}/>
                  <button onClick={()=>setAssForm(f=>({...f,signatarios:f.signatarios.filter((_,j)=>j!==i)}))} style={{padding:'8px',borderRadius:7,background:'#FEF2F2',border:'none',cursor:'pointer',color:'#dc2626'}}><X size={12}/></button>
                </div>
              ))}
              <button onClick={()=>setAssForm(f=>({...f,signatarios:[...(f.signatarios||[]),{nome:'',email:'',telefone:''}]}))} style={{padding:'6px 12px',borderRadius:7,background:'#f5f5f5',border:'1px dashed #e0e0e0',cursor:'pointer',fontSize:11,color:'#555'}}>+ Adicionar signatário</button>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:.7}}>Mensagem</label>
              <textarea value={assForm.mensagem||''} onChange={e=>setAssForm(f=>({...f,mensagem:e.target.value}))} rows={2} placeholder="Mensagem aos signatários..." style={{...inp,resize:'vertical'}}/>
            </div>
            <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',marginBottom:16}}>
              <input type="checkbox" checked={!!assForm.enviar_por_whatsapp} onChange={e=>setAssForm(f=>({...f,enviar_por_whatsapp:e.target.checked}))}/>
              <span style={{fontSize:12,color:'#555'}}>💬 Enviar link de assinatura também pelo WhatsApp (ZapSign)</span>
            </label>
            <div style={{padding:'10px 14px',borderRadius:8,background:'#EBF5FF',fontSize:11,color:'#1D6FA4',lineHeight:1.6}}>
              📋 <strong>Como funciona:</strong> O documento será enviado para os signatários via e-mail{assForm.enviar_por_whatsapp?' e WhatsApp':''}. 
              Cada um receberá um link para assinar eletronicamente. Após todas as assinaturas, o contrato é marcado como <strong>Ativo</strong> automaticamente via webhook.
            </div>
          </div>
          <div style={{padding:'0 22px 22px',display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button onClick={()=>setAssModal(null)} style={{padding:'9px 16px',borderRadius:8,background:'#f5f5f5',color:'#555',fontSize:12,fontWeight:700,border:'none',cursor:'pointer'}}>Fechar</button>
            <button onClick={enviarAssinatura} disabled={enviando||!providers.configurados?.length} style={{padding:'9px 18px',borderRadius:8,background:enviando||!providers.configurados?.length?'#aaa':'#1D6FA4',color:'#fff',fontSize:12,fontWeight:800,border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
              ✍️ {enviando?'Enviando...':'Enviar para Assinatura'}
            </button>
          </div>
        </div>
      </div>}

      {/* MODAL NOVO CONTRATO */}
      {modal==='novo'&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:300,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'20px 16px',overflowY:'auto'}}>
        <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:680,boxShadow:'0 24px 64px rgba(0,0,0,.3)',marginBottom:40}}>
          <div style={{padding:'16px 22px',background:NAVY,borderRadius:'16px 16px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{color:'#fff',fontWeight:800}}>📄 Novo Contrato</div>
            <button onClick={()=>setModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.7)'}}><X size={18}/></button>
          </div>
          <div style={{padding:22,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Número</label><input value={form.numero||''} onChange={e=>setFF('numero',e.target.value)} placeholder="EP-2026-001" style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Status</label><select value={form.status||'aguardando'} onChange={e=>setFF('status',e.target.value)} style={sel}>{Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.emoji} {v.label}</option>)}</select></div>
            <div style={{gridColumn:'1/-1'}}><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Tipo *</label><select value={form.tipo||''} onChange={e=>setFF('tipo',e.target.value)} style={sel}>{TIPOS.map(t=><option key={t}>{t}</option>)}</select></div>
            <div style={{gridColumn:'1/-1'}}>
              <label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Cliente</label>
              <input value={buscaCli} onChange={e=>setBuscaCli(e.target.value)} placeholder="Buscar cliente..." style={{...inp,marginBottom:4}}/>
              <select value={form.cliente_id||''} onChange={e=>{setFF('cliente_id',Number(e.target.value));const c=clientes.find(x=>x.id===Number(e.target.value));if(c)setFF('cliente_nome',c.nome)}} style={sel}>
                <option value="">— Selecionar —</option>{cliFilt.map(c=><option key={c.id} value={c.id}>{c.nome} · {c.cnpj}</option>)}
              </select>
            </div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Valor Mensal (R$)</label><input type="number" step="0.01" value={form.valor_mensal||0} onChange={e=>setFF('valor_mensal',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Vigência (meses)</label><input type="number" value={form.vigencia_meses||12} onChange={e=>setFF('vigencia_meses',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Início</label><input value={form.data_inicio||''} onChange={e=>setFF('data_inicio',e.target.value)} placeholder="dd/mm/aaaa" style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Vencimento</label><input value={form.data_vencimento||''} onChange={e=>setFF('data_vencimento',e.target.value)} placeholder="dd/mm/aaaa" style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Forma de Pagamento</label><select value={form.forma_pagamento||'PIX'} onChange={e=>setFF('forma_pagamento',e.target.value)} style={sel}><option>PIX</option><option>Boleto</option><option>TED/DOC</option><option>Cartão</option></select></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Dia de Vencimento</label><input type="number" min="1" max="31" value={form.dia_vencimento||10} onChange={e=>setFF('dia_vencimento',e.target.value)} style={inp}/></div>
            <div style={{display:'flex',alignItems:'center',gap:10,paddingTop:20}}>
              <input type="checkbox" id="renov" checked={!!form.renovacao_automatica} onChange={e=>setFF('renovacao_automatica',e.target.checked)}/>
              <label htmlFor="renov" style={{fontSize:12,color:'#555',cursor:'pointer'}}>🔄 Renovação automática</label>
            </div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Índice de Reajuste</label><select value={form.indice_reajuste||'IPCA'} onChange={e=>setFF('indice_reajuste',e.target.value)} style={sel}><option>IPCA</option><option>IGPM</option><option>INPC</option><option>Fixo</option></select></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Alertar com (dias)</label><input type="number" value={form.dias_alerta||30} onChange={e=>setFF('dias_alerta',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>E-mail Contato</label><input value={form.email_contato||''} onChange={e=>setFF('email_contato',e.target.value)} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>WhatsApp Contato</label><input value={form.whatsapp_contato||''} onChange={e=>setFF('whatsapp_contato',e.target.value)} style={inp}/></div>
            <div style={{gridColumn:'1/-1'}}><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Objeto do Contrato</label><textarea value={form.objeto||''} onChange={e=>setFF('objeto',e.target.value)} rows={3} placeholder="Descreva o objeto do contrato..." style={{...inp,resize:'vertical'}}/></div>
            <div style={{gridColumn:'1/-1'}}><label style={{fontSize:10,fontWeight:700,color:'#888',display:'block',marginBottom:5,textTransform:'uppercase'}}>Observações</label><textarea value={form.observacoes||''} onChange={e=>setFF('observacoes',e.target.value)} rows={2} style={{...inp,resize:'vertical'}}/></div>
          </div>
          <div style={{padding:'0 22px 22px',display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button onClick={()=>setModal(null)} style={{padding:'9px 16px',borderRadius:8,background:'#f5f5f5',color:'#555',fontSize:12,fontWeight:700,border:'none',cursor:'pointer'}}>Cancelar</button>
            <button onClick={salvar} disabled={enviando} style={{padding:'9px 18px',borderRadius:8,background:enviando?'#aaa':NAVY,color:'#fff',fontSize:12,fontWeight:800,border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
              <Save size={13}/> {enviando?'Salvando...':'Salvar Contrato'}
            </button>
          </div>
        </div>
      </div>}
    </div>
  )
}
