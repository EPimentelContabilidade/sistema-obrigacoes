import React, { useState, useEffect, useRef } from 'react'
import { CheckCircle, Send, Settings, Search, X, AlertTriangle, Filter, Save, Eye, ChevronDown, ChevronUp, Edit2, Trash2, FileText, Upload, Download, Paperclip, Monitor, Smartphone, MapPin } from 'lucide-react'
import { OBRIGACOES_SISTEMA } from './obrigacoes_data'

const API  = '/api/v1'
const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'
const inp  = { padding:'5px 8px', borderRadius:6, border:'1px solid #d0d0d0', fontSize:12, outline:'none', background:'#fff', color:'#333', boxSizing:'border-box' }

const PERFIS = {
  Administrador:{ editar:true,  excluir:true,  renomear:true,  entregar:true,  enviar:true,  anexar:true,  reverter:true  },
  Contador:     { editar:true,  excluir:false, renomear:true,  entregar:true,  enviar:true,  anexar:true,  reverter:true  },
  Assistente:   { editar:false, excluir:false, renomear:false, entregar:true,  enviar:false, anexar:true,  reverter:false },
  Visualizador: { editar:false, excluir:false, renomear:false, entregar:false, enviar:false, anexar:false, reverter:false },
}
const USUARIO = { nome:'Eduardo Pimentel', perfil:'Administrador' }
const PERM = PERFIS[USUARIO.perfil]

const DCORES = {
  Fiscal:  { bg:'#EBF5FF', color:'#1D6FA4' },
  Pessoal: { bg:'#EDFBF1', color:'#1A7A3C' },
  Contábil:{ bg:'#F3EEFF', color:'#6B3EC9' },
  Bancos:  { bg:'#FEF9C3', color:'#854D0E' },
}
const SB = {
  pendente:    { bg:'#FEF9C3', color:'#854D0E', borda:'#fde68a', icon:'⏳', label:'Pendente'    },
  entregue:    { bg:'#F0FDF4', color:'#166534', borda:'#bbf7d0', icon:'✓',  label:'Entregue'    },
  justificada: { bg:'#EFF6FF', color:'#1D4ED8', borda:'#bfdbfe', icon:'📋', label:'Justificada' },
  dispensada:  { bg:'#F9FAFB', color:'#6B7280', borda:'#e5e7eb', icon:'—',  label:'Dispensada'  },
  atrasada:    { bg:'#FEF2F2', color:'#991B1B', borda:'#fca5a5', icon:'⚠',  label:'Atrasada'    },
}

const gerarRastreio = (id) => {
  const us = [
    {nome:'Eduardo Pimentel',perfil:'Contador',avatar:'E'},
    {nome:'Maria Santos',    perfil:'Cliente', avatar:'M'},
    {nome:'João Silva',      perfil:'Cliente', avatar:'J'},
  ]
  const ac = ['Visualizou a tarefa','Abriu o documento','Confirmou recebimento','Baixou o arquivo']
  const dv = [
    {nome:'Chrome · Windows', icon:Monitor,    local:'Goiânia, GO'},
    {nome:'Safari · iPhone',  icon:Smartphone, local:'Goiânia, GO'},
    {nome:'Firefox · Windows',icon:Monitor,    local:'Goiânia, GO'},
  ]
  return Array.from({length:(id%3)+1}, (_,i) => ({
    id:i, usuario:us[i%3], dispositivo:dv[i%3],
    acao:ac[i%4], data:`0${i+1}/04/2026`,
    hora:`${9+i*3}:${i*15%60<10?'0':''}${i*15%60}`,
    ip:`191.${10+i}.${20+i}.${30+i}`,
  }))
}

const mpe = (mes) => {
  if (!mes) return ''
  const [ano,m] = mes.split('-')
  return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][parseInt(m)-1]+'/'+ano
}

const Btn = ({onClick,bg,color,title,children,disabled}) => (
  <button onClick={onClick} disabled={disabled} title={title} style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'5px 9px',borderRadius:7,background:disabled?'#f0f0f0':bg,color:disabled?'#ccc':color,border:'none',cursor:disabled?'not-allowed':'pointer',fontSize:12,fontWeight:600}}>
    {children}
  </button>
)

export default function EntregasTarefas() {
  const [clientes,   setClientes]   = useState([])
  const [cli,        setCli]        = useState(null)
  const [tarefas,    setTarefas]    = useState([])
  const [buscaCli,   setBuscaCli]   = useState('')
  const [showFilt,   setShowFilt]   = useState(true)
  const [vinc,       setVinc]       = useState([])
  const [mes,        setMes]        = useState(new Date().toISOString().slice(0,7))
  const [expanded,   setExpanded]   = useState(null)
  const [protos,     setProtos]     = useState({})
  const [coments,    setComents]    = useState({})
  const [mVinc,      setMVinc]      = useState(false)
  const [mReverter,  setMReverter]  = useState(null)
  const [motivoRev,  setMotivoRev]  = useState('')
  const [mRobo,      setMRobo]      = useState(null)
  const [mRastreio,  setMRastreio]  = useState(null)
  const [mAnexo,     setMAnexo]     = useState(null)
  const [mEditar,    setMEditar]    = useState(null)
  const [mExcluir,   setMExcluir]   = useState(null)
  const [mRenomear,  setMRenomear]  = useState(null)
  const [novoNome,   setNovoNome]   = useState('')
  const [fEdit,      setFEdit]      = useState({nome:'',departamento:'',exigir_robo:false})
  const [filt, setFilt] = useState({busca:'',empresa:'',departamento:'',responsavel:'',competencia_de:'',competencia_ate:'',prazo_tec_de:'',prazo_tec_ate:'',prazo_legal_de:'',prazo_legal_ate:'',entrega_de:'',entrega_ate:'',pendente:false,justificada:false,entregue:false,dispensada:false})
  const setF = (k,v) => setFilt(f=>({...f,[k]:v}))
  const limpar = () => setFilt({busca:'',empresa:'',departamento:'',responsavel:'',competencia_de:'',competencia_ate:'',prazo_tec_de:'',prazo_tec_ate:'',prazo_legal_de:'',prazo_legal_ate:'',entrega_de:'',entrega_ate:'',pendente:false,justificada:false,entregue:false,dispensada:false})
  const ref = useRef()

  // ✅ CORRIGIDO: mescla dados do backend com localStorage, preservando obrigacoes_vinculadas
  useEffect(()=>{
    try {
      const local = localStorage.getItem('ep_clientes')
      if (local) {
        const parsed = JSON.parse(local)
        if (parsed && parsed.length > 0) setClientes(parsed)
      }
    } catch {}
    fetch(`${API}/clientes/`)
      .then(r=>r.ok?r.json():{})
      .then(d=>{
        const lista = d.clientes||d||[]
        if (lista.length > 0) {
          const local = JSON.parse(localStorage.getItem('ep_clientes')||'[]')
          const merged = lista.map(bc => {
            const lc = local.find(x=>String(x.id)===String(bc.id))
            return lc ? { ...bc, ...lc } : bc
          })
          local.forEach(lc => {
            if (!merged.find(m=>String(m.id)===String(lc.id))) merged.push(lc)
          })
          setClientes(merged)
          localStorage.setItem('ep_clientes', JSON.stringify(merged))
        }
      })
      .catch(()=>{})
  },[])

  useEffect(()=>{ if(cli) gerar() },[cli,mes,vinc])

  const gerar = () => {
    try {
      const fresh = JSON.parse(localStorage.getItem('ep_clientes')||'[]')
      const cliAtual = fresh.find(c=>String(c.id)===String(cli?.id)) || clientes.find(c=>String(c.id)===String(cli?.id))
      const idsCliente = cliAtual?.obrigacoes_vinculadas || []
      const ids = vinc.length>0 ? vinc : idsCliente.length>0 ? idsCliente : OBRIGACOES_SISTEMA.filter(o=>o&&o.ativa).slice(0,8).map(o=>o.id)
      const lista = OBRIGACOES_SISTEMA.filter(o=>o&&ids.includes(o.id))
      if (lista.length === 0) {
        const fallback = OBRIGACOES_SISTEMA.filter(o=>o&&o.ativa).slice(0,8)
        setTarefas(fallback.map((o,i)=>({
          ...o,
          nome: o.nome||'Obrigação',
          departamento: o.departamento||'Fiscal',
          responsavel: o.responsavel||'Eduardo Pimentel',
          status:'pendente', data_entrega:null, entregue_por:null,
          enviado:false, robo_ok:false,
          visualizacoes:gerarRastreio(o.id||i),
          anexos:[],
        })))
        setVinc(fallback.map(o=>o.id))
        return
      }
      setTarefas(lista.map((o,i)=>({
        ...o,
        nome: o.nome||'Obrigação',
        departamento: o.departamento||'Fiscal',
        responsavel: o.responsavel||'Eduardo Pimentel',
        status: i===0?'entregue': i===2&&lista.length>3?'atrasada':'pendente',
        data_entrega: i===0?'01/04/2026 09:15':null,
        entregue_por: i===0?'Eduardo Pimentel':null,
        enviado:i===0, robo_ok:false,
        visualizacoes:gerarRastreio(o.id||i),
        anexos:i===0?[{nome:'Comprovante_Apr26.pdf',tamanho:'142 KB',data:'01/04/2026'}]:[],
        historico: i===0?[{tipo:'entrega',usuario:'Eduardo Pimentel',data:'01/04/2026 09:15',descricao:'Marcado como entregue'}]:[],
      })))
      if(vinc.length===0) setVinc(ids)
    } catch(err) {
      console.error('Erro ao gerar tarefas:', err)
    }
  }

  const marcar = (id) => {
    const t=tarefas.find(x=>x.id===id)
    if(t?.exigir_robo&&!t?.robo_ok){setMRobo(t);return}
    const agora = new Date().toLocaleString('pt-BR')
    const novoHist = {tipo:'entrega',usuario:USUARIO.nome,data:agora,descricao:'Marcado como entregue'}
    setTarefas(p=>p.map(x=>x.id===id?{...x,status:'entregue',data_entrega:agora,entregue_por:USUARIO.nome,historico:[...(x.historico||[]),novoHist]}:x))
  }
  const enviar = (id) => {
    const t=tarefas.find(x=>x.id===id)
    if(t?.exigir_robo&&!t?.robo_ok){setMRobo(t);return}
    const agora = new Date().toLocaleString('pt-BR')
    const novoHist = {tipo:'envio',usuario:USUARIO.nome,data:agora,descricao:'Enviado ao cliente via '+((t.canal_padrao||'e-mail'))}
    setTarefas(p=>p.map(x=>x.id===id?{...x,status:'entregue',enviado:true,data_entrega:agora,entregue_por:USUARIO.nome,historico:[...(x.historico||[]),novoHist]}:x))
  }
  const salvarEdit = () => { setTarefas(p=>p.map(x=>x.id===mEditar.id?{...x,...fEdit}:x)); setMEditar(null) }

  const reverterTarefa = (id, motivo) => {
    const agora = new Date().toLocaleString('pt-BR')
    const novoHist = {
      tipo:'reversao',
      usuario:USUARIO.nome,
      data:agora,
      descricao:`Revertido para Pendente${motivo?` — Motivo: ${motivo}`:''}`
    }
    setTarefas(p=>p.map(x=>x.id===id?{
      ...x,
      status:'pendente',
      data_entrega:null,
      enviado:false,
      historico:[...(x.historico||[]),novoHist]
    }:x))
    setMReverter(null)
    setMotivoRev('')
  }
  const salvarRen  = () => { setTarefas(p=>p.map(x=>x.id===mRenomear.id?{...x,nome:novoNome}:x)); setMRenomear(null) }
  const excluir    = (id) => { setTarefas(p=>p.filter(x=>x.id!==id)); setVinc(v=>v.filter(x=>x!==id)); setMExcluir(null) }
  const addAnexo   = (arq) => {
    if(!arq||!mAnexo) return
    setTarefas(p=>p.map(x=>x.id===mAnexo.id?{...x,anexos:[...(x.anexos||[]),{nome:arq.name,tamanho:(arq.size/1024).toFixed(0)+' KB',data:new Date().toLocaleDateString('pt-BR')}]}:x))
  }
  const enviarAnexo = (id) => { setTarefas(p=>p.map(x=>x.id===id?{...x,status:'entregue',enviado:true,data_entrega:new Date().toLocaleString('pt-BR'),entregue_por:USUARIO.nome}:x)); setMAnexo(null) }

  const algumStatusSel = filt.pendente||filt.justificada||filt.entregue||filt.dispensada
  const filtradas = tarefas.filter(t=>{
    if (!t||!t.id) return false
    if(filt.busca && !t.nome?.toLowerCase().includes(filt.busca.toLowerCase())) return false
    if(filt.departamento && t.departamento!==filt.departamento) return false
    if(filt.empresa) {
      const cliF = clientes.find(c=>String(c.id)===String(filt.empresa))
      if(cliF && cli?.id !== cliF.id) return false
    }
    if(algumStatusSel) {
      const statusOk = []
      if(filt.pendente)    statusOk.push('pendente','atrasada')
      if(filt.justificada) statusOk.push('justificada')
      if(filt.entregue)    statusOk.push('entregue')
      if(filt.dispensada)  statusOk.push('dispensada')
      if(!statusOk.includes(t.status)) return false
    }
    if(filt.prazo_tec_de || filt.prazo_tec_ate) {
      const diaV = t.dia_vencimento||20
      const mesA = parseInt(mes?.split('-')[1]||4)
      const anoA = parseInt(mes?.split('-')[0]||2026)
      const dStr = `${anoA}-${String(mesA).padStart(2,'0')}-${String(diaV).padStart(2,'0')}`
      if(filt.prazo_tec_de && dStr < filt.prazo_tec_de) return false
      if(filt.prazo_tec_ate && dStr > filt.prazo_tec_ate) return false
    }
    if(filt.competencia_de && mes < filt.competencia_de) return false
    if(filt.competencia_ate && mes > filt.competencia_ate) return false
    return true
  })

  const ent  = tarefas.filter(t=>t.status==='entregue').length
  const tot  = tarefas.length
  const pct  = tot>0?Math.round((ent/tot)*100):0
  const corB = pct===100?'#22c55e':pct>=50?'#f59e0b':'#ef4444'

  return (
    <div style={{display:'flex',height:'calc(100vh - 44px)',fontFamily:'Inter, system-ui, sans-serif'}}>

      {/* Sidebar */}
      <div style={{width:210,background:'#fff',borderRight:'1px solid #e8e8e8',display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'10px 12px 8px',borderBottom:'1px solid #f0f0f0'}}>
          <div style={{fontSize:12,fontWeight:700,color:NAVY,marginBottom:6}}>Clientes</div>
          <div style={{position:'relative'}}>
            <Search size={11} style={{position:'absolute',left:7,top:7,color:'#bbb'}}/>
            <input value={buscaCli} onChange={e=>setBuscaCli(e.target.value)} placeholder="Buscar..." style={{...inp,width:'100%',padding:'5px 8px 5px 22px'}}/>
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          {clientes.filter(c=>c.nome?.toLowerCase().includes(buscaCli.toLowerCase())).map(c=>(
            <div key={c.id} onClick={()=>{
              const fresh = JSON.parse(localStorage.getItem('ep_clientes')||'[]')
              const cFresh = fresh.find(x=>String(x.id)===String(c.id)) || c
              setCli(cFresh)
              setBuscaCli('')
              setVinc(cFresh.obrigacoes_vinculadas||[])
              setTarefas([])
            }} style={{padding:'8px 12px',cursor:'pointer',borderBottom:'1px solid #f5f5f5',borderLeft:cli?.id===c.id?`3px solid ${GOLD}`:'3px solid transparent',background:cli?.id===c.id?'#FFFBF2':'#fff'}}>
              <div style={{fontSize:12,fontWeight:600,color:NAVY,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.nome}</div>
              <div style={{fontSize:10,color:'#bbb',marginTop:1}}>{c.cnpj}</div>
            </div>
          ))}
          {clientes.length===0&&<div style={{padding:20,textAlign:'center',color:'#ccc',fontSize:12}}>Nenhum cliente</div>}
        </div>
        <div style={{padding:'8px 12px',borderTop:'1px solid #f0f0f0',background:'#fafafa'}}>
          <div style={{fontSize:10,color:'#aaa',fontWeight:600,textTransform:'uppercase',marginBottom:2}}>Usuário ativo</div>
          <div style={{fontSize:11,fontWeight:700,color:NAVY}}>{USUARIO.nome}</div>
          <div style={{fontSize:10,color:GOLD,fontWeight:600}}>{USUARIO.perfil}</div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'#f8f9fb'}}>
        {!cli ? (
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:10}}>
            <CheckCircle size={40} style={{color:'#e0e0e0'}}/>
            <div style={{fontSize:14,fontWeight:700,color:'#ccc'}}>Selecione um cliente</div>
            <div style={{fontSize:12,color:'#ddd'}}>para visualizar as entregas do mês</div>
          </div>
        ) : (
          <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            {/* Header */}
            <div style={{background:'#fff',borderBottom:'1px solid #e8e8e8',padding:'10px 16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:NAVY}}>{cli.nome}</div>
                  <div style={{fontSize:11,color:'#999',marginTop:1}}>{cli.cnpj} · Competência: <b>{mpe(mes)}</b></div>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  {[{n:tarefas.filter(t=>t.status==='pendente').length,c:'#f59e0b',l:'Pendentes'},{n:tarefas.filter(t=>t.status==='atrasada').length,c:'#ef4444',l:'Atrasadas'},{n:ent,c:'#22c55e',l:'Entregues'},{n:tarefas.filter(t=>t.exigir_robo&&t.status!=='entregue').length,c:'#6366f1',l:'Req. Robô'}].map(s=>(
                    <div key={s.l} style={{textAlign:'center',padding:'3px 8px',borderRadius:7,background:s.c+'15',border:`1px solid ${s.c}30`}}>
                      <div style={{fontWeight:700,color:s.c,fontSize:14}}>{s.n}</div>
                      <div style={{color:'#888',fontSize:9}}>{s.l}</div>
                    </div>
                  ))}
                  <input type="month" value={mes} onChange={e=>setMes(e.target.value)} style={{...inp,padding:'5px 9px'}}/>
                  <button onClick={()=>setMVinc(true)} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:7,border:`1px solid ${NAVY}`,background:'#fff',color:NAVY,fontSize:12,fontWeight:600,cursor:'pointer'}}>
                    <Settings size={12}/> Vincular
                  </button>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#888',marginBottom:4}}>
                <span>{ent}/{tot} entregues</span>
                <span style={{fontWeight:700,color:corB}}>{pct}%</span>
              </div>
              <div style={{height:6,background:'#f0f0f0',borderRadius:4,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${pct}%`,background:corB,borderRadius:4,transition:'width .4s'}}/>
              </div>
            </div>

            {/* Filtros */}
            <div style={{background:'#fff',borderBottom:'2px solid #e8e8e8'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'7px 14px',borderBottom:'1px solid #f0f0f0',flexWrap:'wrap'}}>
                <div style={{position:'relative',flex:1,minWidth:160}}>
                  <Search size={11} style={{position:'absolute',left:7,top:7,color:'#bbb'}}/>
                  <input value={filt.busca} onChange={e=>setF('busca',e.target.value)} placeholder="Buscar obrigação / tarefa..." style={{...inp,width:'100%',paddingLeft:22}}/>
                </div>
                <div style={{display:'flex',gap:6,padding:'4px 8px',borderRadius:7,background:'#f8f9fb',border:'1px solid #e8e8e8'}}>
                  <span style={{fontSize:10,color:'#aaa',alignSelf:'center',marginRight:2,fontWeight:600}}>FILTRAR:</span>
                  {[{k:'pendente',l:'Pendentes',c:'#f59e0b',bg:'#FEF9C3'},{k:'justificada',l:'Justificadas',c:'#3b82f6',bg:'#EFF6FF'},{k:'entregue',l:'Entregues',c:'#22c55e',bg:'#F0FDF4'},{k:'dispensada',l:'Dispensadas',c:'#6b7280',bg:'#f5f5f5'}].map(s=>(
                    <button key={s.k} onClick={()=>setF(s.k,!filt[s.k])} style={{padding:'3px 10px',borderRadius:20,cursor:'pointer',border:`1px solid ${filt[s.k]?s.c:'#ddd'}`,background:filt[s.k]?s.bg:'#fff',color:filt[s.k]?s.c:'#aaa',fontSize:11,fontWeight:filt[s.k]?700:400}}>
                      {s.l} ({tarefas.filter(t=>s.k==='pendente'?['pendente','atrasada'].includes(t.status):t.status===s.k).length})
                    </button>
                  ))}
                </div>
                <button onClick={()=>{}} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 12px',borderRadius:7,background:'#22c55e',color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}><Search size={11}/> Filtrar</button>
                {algumStatusSel && (
                  <div style={{fontSize:11,color:'#3b82f6',padding:'3px 8px',borderRadius:6,background:'#EFF6FF',border:'1px solid #bfdbfe'}}>
                    {filtradas.length}/{tarefas.length} exibidas
                  </div>
                )}
                <button onClick={limpar} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:7,background:'#fee2e2',color:'#dc2626',fontWeight:600,fontSize:12,border:'1px solid #fca5a5',cursor:'pointer'}}><X size={11}/> Limpar</button>
                <button onClick={()=>setShowFilt(e=>!e)} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:7,background:showFilt?NAVY:'#f5f5f5',color:showFilt?'#fff':'#555',fontSize:12,border:'none',cursor:'pointer'}}>
                  <Filter size={11}/> {showFilt?'Menos filtros':'+Filtros'}
                </button>
              </div>
              {showFilt && (
                <div style={{padding:'7px 14px 10px'}}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:7,marginBottom:7}}>
                    {[
                      {l:'Filtrar por Empresa',el:<select value={filt.empresa} onChange={e=>setF('empresa',e.target.value)} style={{...inp,width:'100%'}}><option value="">Todas</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>},
                      {l:'Departamento',el:<select value={filt.departamento} onChange={e=>setF('departamento',e.target.value)} style={{...inp,width:'100%'}}><option value="">Todos</option><option>Fiscal</option><option>Pessoal</option><option>Contábil</option><option>Bancos</option></select>},
                      {l:'Responsável',el:<select value={filt.responsavel||''} onChange={e=>setF('responsavel',e.target.value)} style={{...inp,width:'100%'}}><option value="">Todos</option>{[...new Set(tarefas.map(t=>t.responsavel).filter(Boolean))].map(r=><option key={r} value={r}>{r}</option>)}</select>},
                      {l:'Competência de',el:<input type="month" value={filt.competencia_de} onChange={e=>setF('competencia_de',e.target.value)} style={{...inp,width:'100%'}}/>},
                      {l:'Competência até',el:<input type="month" value={filt.competencia_ate} onChange={e=>setF('competencia_ate',e.target.value)} style={{...inp,width:'100%'}}/>},
                      {l:'Prazo téc. de',el:<input type="date" value={filt.prazo_tec_de} onChange={e=>setF('prazo_tec_de',e.target.value)} style={{...inp,width:'100%'}}/>},
                      {l:'Prazo téc. até',el:<input type="date" value={filt.prazo_tec_ate} onChange={e=>setF('prazo_tec_ate',e.target.value)} style={{...inp,width:'100%'}}/>},
                      {l:'Prazo legal de',el:<input type="date" value={filt.prazo_legal_de} onChange={e=>setF('prazo_legal_de',e.target.value)} style={{...inp,width:'100%'}}/>},
                      {l:'Prazo legal até',el:<input type="date" value={filt.prazo_legal_ate} onChange={e=>setF('prazo_legal_ate',e.target.value)} style={{...inp,width:'100%'}}/>},
                    ].map(f=><div key={f.l}><div style={{fontSize:9,color:'#aaa',fontWeight:700,marginBottom:3,textTransform:'uppercase'}}>{f.l}</div>{f.el}</div>)}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:7}}>
                    <div><div style={{fontSize:9,color:'#aaa',fontWeight:700,marginBottom:3,textTransform:'uppercase'}}>Entrega do dia</div><input type="date" value={filt.entrega_de} onChange={e=>setF('entrega_de',e.target.value)} style={{...inp,width:'100%'}}/></div>
                    <div><div style={{fontSize:9,color:'#aaa',fontWeight:700,marginBottom:3,textTransform:'uppercase'}}>Entrega até dia</div><input type="date" value={filt.entrega_ate} onChange={e=>setF('entrega_ate',e.target.value)} style={{...inp,width:'100%'}}/></div>
                  </div>
                </div>
              )}
            </div>

            {/* Tabela */}
            <div style={{flex:1,overflowY:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{background:'#fff',borderBottom:'2px solid #e8e8e8',position:'sticky',top:0,zIndex:1}}>
                    {['Obrigação / Tarefa','Prazo ↕ Status','Dpto — Resp.','Prazo legal','Competência','Protocolo','Rastreio','Ações'].map(h=>(
                      <th key={h} style={{padding:'8px 10px',textAlign:'left',fontSize:11,fontWeight:700,color:'#888',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtradas.filter(t=>t&&t.id).map((t,i)=>{
                    const sb  = SB[t.status]||SB.pendente
                    const dc  = DCORES[t.departamento]||{bg:'#f5f5f5',color:'#666'}
                    const ent2 = t.status==='entregue'
                    const isE  = expanded===t.id
                    const viN  = t.visualizacoes?.length||0
                    const anN  = t.anexos?.length||0
                    const dv   = `${String(t.dia_vencimento||20).padStart(2,'0')}/04/2026`
                    return (
                      <React.Fragment key={t.id}>
                        <tr style={{background:ent2?'#FAFFF8':i%2===0?'#fff':'#fafafa',borderBottom:isE?'none':'1px solid #f0f0f0'}}>
                          <td style={{padding:'9px 10px',cursor:'pointer'}} onClick={()=>setExpanded(isE?null:t.id)}>
                            <div style={{display:'flex',alignItems:'flex-start',gap:6}}>
                              {isE?<ChevronUp size={12} style={{color:'#aaa',marginTop:2,flexShrink:0}}/>:<ChevronDown size={12} style={{color:'#aaa',marginTop:2,flexShrink:0}}/>}
                              <div>
                                <div style={{fontWeight:600,color:NAVY}}>{t.nome}</div>
                                <div style={{display:'flex',gap:4,marginTop:2,flexWrap:'wrap'}}>
                                  {t.exigir_robo&&!ent2&&<span style={{fontSize:9,padding:'1px 5px',borderRadius:5,background:'#EDE9FF',color:'#6366f1'}}>🤖 Req. Robô</span>}
                                  {anN>0&&<span style={{fontSize:9,padding:'1px 5px',borderRadius:5,background:'#f0f0f0',color:'#666'}}>📎 {anN}</span>}
                                  {ent2&&<span style={{fontSize:9,color:'#22c55e'}}>✓ {t.entregue_por}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{padding:'9px 10px'}}>
                            <span style={{fontSize:11,padding:'2px 9px',borderRadius:8,background:sb.bg,color:sb.color,fontWeight:600,border:`1px solid ${sb.borda}`,display:'inline-flex',alignItems:'center',gap:4}}>
                              {sb.icon} {sb.label}
                            </span>
                            <div style={{fontSize:10,color:'#aaa',marginTop:2}}>{dv}</div>
                          </td>
                          <td style={{padding:'9px 10px',fontSize:11,color:'#555'}}>
                            <span style={{padding:'1px 6px',borderRadius:5,background:dc.bg,color:dc.color,fontWeight:500,marginRight:4,fontSize:10}}>{t.departamento}</span>
                            {t.responsavel||'Eduardo Pimentel'}
                          </td>
                          <td style={{padding:'9px 10px',fontSize:11,color:'#555'}}>{dv}</td>
                          <td style={{padding:'9px 10px',fontSize:11,color:'#555'}}>{mpe(mes)}</td>
                          <td style={{padding:'9px 10px'}} onClick={e=>e.stopPropagation()}>
                            {!ent2
                              ?<input value={protos[t.id]||''} onChange={e=>setProtos(p=>({...p,[t.id]:e.target.value}))} placeholder="Protocolo" style={{...inp,width:100,fontSize:11}}/>
                              :<span style={{fontSize:11,color:'#22c55e'}}>{t.protocolo||'✓ Ok'}</span>
                            }
                          </td>
                          <td style={{padding:'9px 10px'}} onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>setMRastreio(t)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:7,background:viN>0?'#EBF5FF':'#f5f5f5',color:viN>0?'#1D6FA4':'#aaa',border:'none',cursor:'pointer',fontSize:11,fontWeight:600}}>
                              <Eye size={12}/> {viN}
                            </button>
                          </td>
                          <td style={{padding:'9px 10px'}} onClick={e=>e.stopPropagation()}>
                            <div style={{display:'flex',gap:4,flexWrap:'nowrap'}}>
                              <Btn onClick={()=>marcar(t.id)} bg={t.exigir_robo?'#6366f1':'#22c55e'} color="#fff" title={t.exigir_robo?'Processar com Robô':'Marcar entregue'} disabled={!PERM.entregar||ent2}>
                                {t.exigir_robo?'🤖':'✓'}
                              </Btn>
                              <Btn onClick={()=>setMAnexo(t)} bg="#f59e0b" color="#fff" title="Anexar e enviar" disabled={!PERM.anexar}>
                                <Paperclip size={11}/>
                              </Btn>
                              <Btn onClick={()=>enviar(t.id)} bg={NAVY} color="#fff" title="Enviar ao cliente" disabled={!PERM.enviar}>
                                <Send size={11}/>
                              </Btn>
                              <Btn onClick={()=>{setMRenomear(t);setNovoNome(t.nome)}} bg="#EBF5FF" color="#1D6FA4" title="Renomear" disabled={!PERM.renomear}>
                                Aa
                              </Btn>
                              <Btn onClick={()=>{setFEdit({nome:t.nome,departamento:t.departamento,exigir_robo:t.exigir_robo});setMEditar(t)}} bg="#f0f4ff" color={NAVY} title="Editar" disabled={!PERM.editar}>
                                <Edit2 size={11}/>
                              </Btn>
                              {ent2 && (
                                <Btn
                                  onClick={()=>{setMReverter(t);setMotivoRev('')}}
                                  bg="#FEF9C3" color="#854D0E"
                                  title={PERM.reverter&&(t.responsavel===USUARIO.nome||USUARIO.perfil==='Administrador')?'Reverter para Pendente':'Somente o responsável pode reverter'}
                                  disabled={!PERM.reverter||(t.responsavel!==USUARIO.nome&&USUARIO.perfil!=='Administrador')}>
                                  ↩ Reverter
                                </Btn>
                              )}
                              <Btn onClick={()=>setMExcluir(t)} bg="#FEF2F2" color="#dc2626" title="Excluir" disabled={!PERM.excluir}>
                                <Trash2 size={11}/>
                              </Btn>
                            </div>
                          </td>
                        </tr>
                        {isE && (
                          <tr>
                            <td colSpan={8} style={{background:'#F8F9FF',borderBottom:'1px solid #e8e8e8',padding:0}}>
                              <div style={{padding:'12px 14px 14px 34px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
                                <div style={{gridColumn:'span 1'}}>
                                  <div style={{fontSize:10,fontWeight:700,color:'#aaa',marginBottom:8,textTransform:'uppercase'}}>Detalhes</div>
                                  {[['Tipo',t.tipo||'—'],['Mininome',t.mininome||'—'],['Responsável',t.responsavel||'—'],['Dia Venc.',`Dia ${t.dia_vencimento||20}`],['Exige Robô',t.exigir_robo?'Sim':'Não'],t.data_entrega?['Entregue em',t.data_entrega]:null,t.entregue_por?['Por',t.entregue_por]:null].filter(Boolean).map(([k,v])=>(
                                    <div key={k} style={{display:'flex',gap:8,fontSize:11,marginBottom:4}}>
                                      <span style={{color:'#aaa',minWidth:90}}>{k}:</span>
                                      <span style={{color:NAVY,fontWeight:500}}>{v}</span>
                                    </div>
                                  ))}
                                </div>
                                <div>
                                  <div style={{fontSize:10,fontWeight:700,color:'#aaa',marginBottom:8,textTransform:'uppercase'}}>Documentos</div>
                                  {(t.anexos||[]).length===0
                                    ?<div style={{fontSize:11,color:'#ccc',fontStyle:'italic'}}>Nenhum documento.</div>
                                    :(t.anexos||[]).map((a,ai)=>(
                                      <div key={ai} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 9px',borderRadius:7,background:'#fff',border:'1px solid #e8e8e8',marginBottom:5}}>
                                        <FileText size={13} style={{color:NAVY}}/>
                                        <div style={{flex:1}}>
                                          <div style={{fontSize:11,fontWeight:600,color:NAVY}}>{a.nome}</div>
                                          <div style={{fontSize:10,color:'#aaa'}}>{a.tamanho} · {a.data}</div>
                                        </div>
                                        <button style={{background:'none',border:'none',cursor:'pointer',color:NAVY}}><Download size={12}/></button>
                                      </div>
                                    ))
                                  }
                                  {PERM.anexar&&<button onClick={()=>setMAnexo(t)} style={{display:'flex',alignItems:'center',gap:4,marginTop:5,padding:'4px 10px',borderRadius:7,border:`1px dashed ${GOLD}`,background:GOLD+'10',color:GOLD,fontSize:11,fontWeight:600,cursor:'pointer'}}><Paperclip size={11}/> Anexar</button>}
                                </div>
                                <div>
                                  <div style={{fontSize:10,fontWeight:700,color:'#aaa',marginBottom:8,textTransform:'uppercase'}}>Comentário</div>
                                  <textarea value={coments[t.id]||''} onChange={e=>setComents(p=>({...p,[t.id]:e.target.value}))} placeholder="Adicionar comentário..." style={{...inp,height:50,resize:'none',fontFamily:'inherit',width:'100%'}}/>
                                  <button style={{marginTop:4,padding:'4px 10px',borderRadius:7,background:NAVY,color:'#fff',fontWeight:600,fontSize:11,border:'none',cursor:'pointer'}}>Salvar</button>
                                </div>
                                <div style={{gridColumn:'span 3',marginTop:10,paddingTop:10,borderTop:'1px solid #e8e8e8'}}>
                                  <div style={{fontSize:10,fontWeight:700,color:'#aaa',marginBottom:8,textTransform:'uppercase'}}>📋 Histórico desta obrigação</div>
                                  {(t.historico||[]).length===0
                                    ? <div style={{fontSize:11,color:'#ccc',fontStyle:'italic'}}>Sem histórico registrado.</div>
                                    : (
                                      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                                        {(t.historico||[]).map((h,hi)=>{
                                          const cores = { entrega:{bg:'#F0FDF4',color:'#166534',ic:'✓'}, envio:{bg:'#EFF6FF',color:'#1D4ED8',ic:'✈'}, reversao:{bg:'#FEF9C3',color:'#854D0E',ic:'↩'}, default:{bg:'#f5f5f5',color:'#666',ic:'●'} }
                                          const cor = cores[h.tipo]||cores.default
                                          return (
                                            <div key={hi} style={{padding:'7px 12px',borderRadius:8,background:cor.bg,border:`1px solid ${cor.color}25`,minWidth:180}}>
                                              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                                                <span style={{fontSize:13}}>{cor.ic}</span>
                                                <span style={{fontSize:11,fontWeight:700,color:cor.color}}>{h.tipo==='entrega'?'Entregue':h.tipo==='envio'?'Enviado':h.tipo==='reversao'?'Revertido':'Ação'}</span>
                                              </div>
                                              <div style={{fontSize:11,color:'#555',marginBottom:2}}>{h.descricao}</div>
                                              <div style={{fontSize:10,color:'#aaa'}}>{h.usuario} · {h.data}</div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )
                                  }
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
              {filtradas.length===0&&(
                <div style={{textAlign:'center',padding:40,color:'#bbb'}}>
                  Nenhuma tarefa. <button onClick={()=>setMVinc(true)} style={{color:GOLD,background:'none',border:'none',cursor:'pointer'}}>Vincular obrigações</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Rastreio */}
      {mRastreio&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
          <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:520,maxHeight:'85vh',display:'flex',flexDirection:'column',boxShadow:'0 24px 60px rgba(0,0,0,0.2)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px',borderBottom:'1px solid #f0f0f0'}}>
              <div><div style={{fontWeight:700,color:NAVY,fontSize:14}}>Rastreio de Acesso</div><div style={{fontSize:11,color:'#999',marginTop:2}}>{mRastreio.nome}</div></div>
              <button onClick={()=>setMRastreio(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa'}}><X size={18}/></button>
            </div>
            <div style={{padding:'10px 20px',background:'#f8f9fb',borderBottom:'1px solid #f0f0f0',display:'flex',gap:10}}>
              {[{n:mRastreio.visualizacoes?.length||0,l:'Interações',c:'#3b82f6'},{n:[...new Set(mRastreio.visualizacoes?.map(v=>v.usuario.nome)||[])].length,l:'Usuários',c:'#8b5cf6'},{n:[...new Set(mRastreio.visualizacoes?.map(v=>v.dispositivo.nome)||[])].length,l:'Dispositivos',c:'#f59e0b'},{n:mRastreio.visualizacoes?.filter(v=>v.acao.includes('Confirmou')||v.acao.includes('Baixou')).length||0,l:'Confirmações',c:'#22c55e'}].map(s=>(
                <div key={s.l} style={{flex:1,textAlign:'center',padding:'7px',borderRadius:8,background:'#fff',border:`1px solid ${s.c}20`}}>
                  <div style={{fontSize:18,fontWeight:700,color:s.c}}>{s.n}</div>
                  <div style={{fontSize:10,color:'#888'}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'14px 20px'}}>
              {(mRastreio.visualizacoes?.length||0)===0
                ?<div style={{textAlign:'center',padding:30,color:'#ccc'}}><Eye size={30} style={{marginBottom:8,opacity:.3}}/><div>Sem visualizações.</div></div>
                :(
                  <div style={{position:'relative'}}>
                    <div style={{position:'absolute',left:19,top:0,bottom:0,width:2,background:'#f0f0f0'}}/>
                    {mRastreio.visualizacoes.map(v=>{
                      const DI = v.dispositivo.icon||Monitor
                      const isCli = v.usuario.perfil==='Cliente'
                      return (
                        <div key={v.id} style={{display:'flex',gap:14,marginBottom:14,position:'relative'}}>
                          <div style={{width:40,height:40,borderRadius:'50%',background:isCli?GOLD:NAVY,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,zIndex:1,fontSize:14,fontWeight:700,color:'#fff'}}>{v.usuario.avatar}</div>
                          <div style={{flex:1,background:'#f8f9fb',borderRadius:10,padding:'10px 14px',border:'1px solid #f0f0f0'}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:5}}>
                              <div>
                                <span style={{fontSize:13,fontWeight:700,color:NAVY}}>{v.usuario.nome}</span>
                                <span style={{fontSize:10,padding:'1px 7px',borderRadius:6,background:isCli?GOLD+'20':'#f0f0f0',color:isCli?GOLD:'#666',marginLeft:7,fontWeight:600}}>{v.usuario.perfil}</span>
                              </div>
                              <div style={{textAlign:'right',fontSize:10,color:'#aaa'}}><div>{v.data}</div><div>{v.hora}</div></div>
                            </div>
                            <div style={{fontSize:12,color:'#555',marginBottom:7}}>{v.acao}</div>
                            <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                              <span style={{display:'flex',alignItems:'center',gap:4,fontSize:10,padding:'2px 8px',borderRadius:6,background:'#f0f0f0',color:'#666'}}><DI size={10}/> {v.dispositivo.nome}</span>
                              <span style={{display:'flex',alignItems:'center',gap:4,fontSize:10,padding:'2px 8px',borderRadius:6,background:'#f0f0f0',color:'#666'}}><MapPin size={10}/> {v.dispositivo.local}</span>
                              <span style={{fontSize:10,padding:'2px 8px',borderRadius:6,background:'#f0f0f0',color:'#999'}}>IP: {v.ip}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }
            </div>
            <div style={{padding:'12px 20px',borderTop:'1px solid #f0f0f0',display:'flex',justifyContent:'flex-end'}}>
              <button onClick={()=>setMRastreio(null)} style={{padding:'8px 18px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer'}}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Anexar */}
      {mAnexo&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
          <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:480,padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div><div style={{fontWeight:700,color:NAVY,fontSize:14}}>Anexar Documento</div><div style={{fontSize:11,color:'#999',marginTop:2}}>{mAnexo.nome}</div></div>
              <button onClick={()=>setMAnexo(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa'}}><X size={18}/></button>
            </div>
            {(tarefas.find(t=>t.id===mAnexo.id)?.anexos||[]).length>0&&(
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:'#aaa',marginBottom:6,textTransform:'uppercase'}}>Já anexados</div>
                {(tarefas.find(t=>t.id===mAnexo.id)?.anexos||[]).map((a,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',borderRadius:7,background:'#f8f9fb',border:'1px solid #e8e8e8',marginBottom:5}}>
                    <FileText size={13} style={{color:NAVY}}/><div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:NAVY}}>{a.nome}</div><div style={{fontSize:10,color:'#aaa'}}>{a.tamanho} · {a.data}</div></div>
                    <button style={{background:'none',border:'none',cursor:'pointer',color:NAVY}}><Download size={12}/></button>
                  </div>
                ))}
              </div>
            )}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:'#aaa',marginBottom:6,textTransform:'uppercase'}}>Adicionar documento</div>
              <div onClick={()=>ref.current?.click()} style={{border:`2px dashed ${GOLD}`,borderRadius:10,padding:20,textAlign:'center',cursor:'pointer',background:GOLD+'08'}}>
                <input ref={ref} type="file" accept=".pdf,.png,.jpg,.xlsx,.docx" style={{display:'none'}} onChange={e=>{if(e.target.files[0])addAnexo(e.target.files[0])}}/>
                <Upload size={22} style={{color:GOLD,marginBottom:5}}/><div style={{fontSize:12,color:GOLD,fontWeight:600}}>Clique ou arraste</div><div style={{fontSize:10,color:'#aaa',marginTop:2}}>PDF, Word, Excel, Imagens</div>
              </div>
            </div>
            <div style={{marginBottom:16,padding:'12px 14px',borderRadius:9,background:'#f8f9fb',border:'1px solid #e8e8e8'}}>
              <div style={{fontSize:12,fontWeight:700,color:NAVY,marginBottom:8}}>Enviar ao Cliente</div>
              <div style={{display:'flex',gap:8,marginBottom:8}}>
                {[['email','📧 E-mail'],['whatsapp','💬 WhatsApp'],['ambos','📲 Ambos']].map(([v,l])=>(
                  <label key={v} style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer',fontSize:12}}>
                    <input type="radio" name="canal" value={v} defaultChecked={v==='ambos'} style={{accentColor:NAVY}}/> {l}
                  </label>
                ))}
              </div>
              <textarea placeholder="Mensagem ao cliente (opcional)..." style={{...inp,height:55,resize:'none',fontFamily:'inherit',width:'100%'}}/>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>setMAnexo(null)} style={{padding:'8px 14px',borderRadius:8,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:12}}>Cancelar</button>
              <button onClick={()=>setMAnexo(null)} style={{padding:'8px 14px',borderRadius:8,border:`1px solid ${NAVY}`,background:'#fff',color:NAVY,fontWeight:700,fontSize:12,cursor:'pointer'}}>Salvar sem enviar</button>
              <button onClick={()=>enviarAnexo(mAnexo.id)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}><Send size={12}/> Enviar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Renomear */}
      {mRenomear&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
          <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:400,padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,color:NAVY}}>Renomear Tarefa</div>
              <button onClick={()=>setMRenomear(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa'}}><X size={18}/></button>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:5}}>Novo nome</label>
              <input value={novoNome} onChange={e=>setNovoNome(e.target.value)} autoFocus style={{padding:'9px 12px',borderRadius:8,border:'1px solid #e0e0e0',fontSize:14,outline:'none',width:'100%',boxSizing:'border-box'}}/>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>setMRenomear(null)} style={{padding:'8px 14px',borderRadius:8,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:12}}>Cancelar</button>
              <button onClick={salvarRen} disabled={!novoNome} style={{display:'flex',alignItems:'center',gap:5,padding:'8px 18px',borderRadius:8,background:novoNome?NAVY:'#ccc',color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:novoNome?'pointer':'default'}}><Save size={12}/> Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {mEditar&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
          <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:440,padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <div style={{fontSize:14,fontWeight:700,color:NAVY}}>Editar Tarefa</div>
              <button onClick={()=>setMEditar(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa'}}><X size={18}/></button>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Nome</label>
              <input value={fEdit.nome} onChange={e=>setFEdit(f=>({...f,nome:e.target.value}))} style={{padding:'8px 10px',borderRadius:7,border:'1px solid #e0e0e0',fontSize:13,outline:'none',width:'100%',boxSizing:'border-box'}}/>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Departamento</label>
              <select value={fEdit.departamento} onChange={e=>setFEdit(f=>({...f,departamento:e.target.value}))} style={{padding:'8px 10px',borderRadius:7,border:'1px solid #e0e0e0',fontSize:13,outline:'none',width:'100%',boxSizing:'border-box',cursor:'pointer'}}>
                <option>Fiscal</option><option>Pessoal</option><option>Contábil</option><option>Bancos</option>
              </select>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                <input type="checkbox" checked={fEdit.exigir_robo} onChange={e=>setFEdit(f=>({...f,exigir_robo:e.target.checked}))} style={{accentColor:'#6366f1',width:14,height:14}}/>
                <span style={{fontSize:12,fontWeight:600,color:NAVY}}>🤖 Exigir processamento pelo Robô</span>
              </label>
            </div>
            <div style={{padding:'9px 12px',borderRadius:8,background:'#FEF9C3',border:'1px solid #fde68a',marginBottom:16,fontSize:11,color:'#854D0E'}}>
              ⚠ Somente <b>Administrador</b> e <b>Contador</b> podem editar tarefas.
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>setMEditar(null)} style={{padding:'8px 14px',borderRadius:8,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:12}}>Cancelar</button>
              <button onClick={salvarEdit} style={{display:'flex',alignItems:'center',gap:5,padding:'8px 18px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}><Save size={12}/> Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Excluir */}
      {mExcluir&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
          <div style={{background:'#fff',borderRadius:14,padding:28,maxWidth:380,width:'90%',textAlign:'center'}}>
            <Trash2 size={36} style={{color:'#dc2626',marginBottom:12}}/>
            <div style={{fontSize:15,fontWeight:700,color:NAVY,marginBottom:8}}>Excluir Tarefa</div>
            <div style={{fontSize:13,color:'#666',marginBottom:6}}>Tem certeza que deseja excluir:</div>
            <div style={{fontSize:14,fontWeight:700,color:NAVY,marginBottom:16}}>"{mExcluir.nome}"</div>
            <div style={{padding:'8px 12px',borderRadius:8,background:'#FEF2F2',border:'1px solid #fca5a5',marginBottom:16,fontSize:11,color:'#dc2626'}}>⚠ Somente <b>Administradores</b> podem excluir tarefas.</div>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button onClick={()=>setMExcluir(null)} style={{padding:'8px 18px',borderRadius:8,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:13}}>Cancelar</button>
              <button onClick={()=>excluir(mExcluir.id)} style={{padding:'8px 20px',borderRadius:8,background:'#dc2626',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13,border:'none'}}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reverter */}
      {mReverter&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
          <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:460,padding:26,boxShadow:'0 24px 60px rgba(0,0,0,0.2)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:38,height:38,borderRadius:9,background:'#FEF9C3',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>↩</div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:NAVY}}>Reverter Obrigação</div>
                  <div style={{fontSize:11,color:'#999',marginTop:2}}>{mReverter.nome}</div>
                </div>
              </div>
              <button onClick={()=>setMReverter(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa'}}><X size={18}/></button>
            </div>
            <div style={{padding:'10px 14px',borderRadius:8,background:'#f8f9fb',border:'1px solid #e8e8e8',marginBottom:14}}>
              <div style={{fontSize:11,color:'#888',marginBottom:4,fontWeight:600}}>AUTORIZAÇÃO</div>
              <div style={{fontSize:12,color:NAVY}}>Somente o <b>responsável pela tarefa</b> pode reverter entregas.</div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:NAVY,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:12,fontWeight:700}}>{USUARIO.nome[0]}</div>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:NAVY}}>{USUARIO.nome}</div>
                  <div style={{fontSize:10,color:GOLD}}>{USUARIO.perfil}</div>
                </div>
                {(mReverter.responsavel===USUARIO.nome||USUARIO.perfil==='Administrador')
                  ? <span style={{marginLeft:'auto',fontSize:11,padding:'2px 9px',borderRadius:8,background:'#F0FDF4',color:'#166534',fontWeight:700}}>✓ Autorizado</span>
                  : <span style={{marginLeft:'auto',fontSize:11,padding:'2px 9px',borderRadius:8,background:'#FEF2F2',color:'#dc2626',fontWeight:700}}>✗ Não autorizado</span>
                }
              </div>
            </div>
            {(mReverter.historico||[]).length>0 && (
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:'#aaa',marginBottom:8,textTransform:'uppercase'}}>Histórico desta obrigação</div>
                <div style={{maxHeight:130,overflowY:'auto',display:'flex',flexDirection:'column',gap:5}}>
                  {(mReverter.historico||[]).map((h,i)=>{
                    const cores = {entrega:{bg:'#F0FDF4',color:'#166534',ic:'✓'},envio:{bg:'#EFF6FF',color:'#1D4ED8',ic:'✈'},reversao:{bg:'#FEF9C3',color:'#854D0E',ic:'↩'},default:{bg:'#f5f5f5',color:'#666',ic:'●'}}
                    const cor = cores[h.tipo]||cores.default
                    return (
                      <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,padding:'7px 10px',borderRadius:7,background:cor.bg,border:`1px solid ${cor.color}20`}}>
                        <span style={{fontSize:14,lineHeight:1}}>{cor.ic}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,fontWeight:600,color:cor.color}}>{h.descricao}</div>
                          <div style={{fontSize:10,color:'#aaa',marginTop:2}}>{h.usuario} · {h.data}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div style={{marginBottom:18}}>
              <label style={{fontSize:11,fontWeight:700,color:NAVY,display:'block',marginBottom:6}}>Motivo da reversão (obrigatório)</label>
              <textarea value={motivoRev} onChange={e=>setMotivoRev(e.target.value)} placeholder="Ex: Documento incorreto, requer correção..." style={{...inp,height:80,resize:'none',fontFamily:'inherit'}}/>
              {!motivoRev && <div style={{fontSize:10,color:'#dc2626',marginTop:3}}>Informe o motivo para reverter a obrigação.</div>}
            </div>
            <div style={{padding:'9px 12px',borderRadius:8,background:'#FEF9C3',border:'1px solid #fde68a',marginBottom:16,fontSize:11,color:'#854D0E'}}>
              ⚠ A obrigação voltará para <b>Pendente</b>. O histórico completo será mantido e registrará esta reversão.
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setMReverter(null)} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:13}}>Cancelar</button>
              <button
                onClick={()=>reverterTarefa(mReverter.id,motivoRev)}
                disabled={!motivoRev||(mReverter.responsavel!==USUARIO.nome&&USUARIO.perfil!=='Administrador')}
                style={{display:'flex',alignItems:'center',gap:6,padding:'8px 20px',borderRadius:8,background:motivoRev&&(mReverter.responsavel===USUARIO.nome||USUARIO.perfil==='Administrador')?'#f59e0b':'#ccc',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:motivoRev?'pointer':'default'}}>
                ↩ Confirmar Reversão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Robô */}
      {mRobo&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
          <div style={{background:'#fff',borderRadius:14,padding:28,maxWidth:380,width:'90%',textAlign:'center'}}>
            <AlertTriangle size={36} style={{color:'#f59e0b',marginBottom:10}}/>
            <div style={{fontSize:15,fontWeight:700,color:NAVY,marginBottom:8}}>Robô Obrigatório</div>
            <div style={{fontSize:13,color:'#666',marginBottom:20,lineHeight:1.6}}><b>{mRobo.nome}</b> exige o <b>Robô</b> antes de ser entregue.</div>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button onClick={()=>setMRobo(null)} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:13}}>Fechar</button>
              <button onClick={()=>setMRobo(null)} style={{padding:'8px 16px',borderRadius:8,background:'#6366f1',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13,border:'none'}}>🤖 Ir para Robô</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vincular — ✅ CORRIGIDO: Salvar persiste no localStorage */}
      {mVinc&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:560,maxHeight:'85vh',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 18px',borderBottom:'1px solid #f0f0f0'}}>
              <div><div style={{fontWeight:700,color:NAVY,fontSize:13}}>Vincular Obrigações</div><div style={{fontSize:11,color:'#999'}}>{cli?.nome}</div></div>
              <button onClick={()=>setMVinc(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa'}}><X size={16}/></button>
            </div>
            <div style={{padding:'8px 18px',borderBottom:'1px solid #f0f0f0',display:'flex',gap:8}}>
              <button onClick={()=>setVinc(OBRIGACOES_SISTEMA.filter(o=>o.ativa).map(o=>o.id))} style={{padding:'4px 10px',borderRadius:7,background:NAVY,color:'#fff',fontSize:11,fontWeight:600,border:'none',cursor:'pointer'}}>Todas ativas</button>
              <button onClick={()=>setVinc([])} style={{padding:'4px 10px',borderRadius:7,background:'#f5f5f5',color:'#555',fontSize:11,border:'none',cursor:'pointer'}}>Limpar</button>
              <span style={{fontSize:11,color:'#aaa',alignSelf:'center',marginLeft:'auto'}}>{vinc.length} selecionadas</span>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'8px 18px'}}>
              {['Fiscal','Pessoal','Contábil','Bancos'].map(dept=>{
                const lista=OBRIGACOES_SISTEMA.filter(o=>o.departamento===dept&&o.ativa)
                if(!lista.length) return null
                return (
                  <div key={dept} style={{marginBottom:14}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#aaa',textTransform:'uppercase',marginBottom:6,borderBottom:'1px solid #f0f0f0',paddingBottom:4}}>{dept}</div>
                    {lista.map(o=>{
                      const chk=vinc.includes(o.id)
                      return (
                        <label key={o.id} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',cursor:'pointer',borderBottom:'1px solid #f8f8f8'}}>
                          <input type="checkbox" checked={chk} onChange={()=>setVinc(v=>chk?v.filter(x=>x!==o.id):[...v,o.id])} style={{width:14,height:14,accentColor:NAVY}}/>
                          <div style={{flex:1}}>
                            <div style={{display:'flex',alignItems:'center',gap:5}}>
                              <span style={{fontSize:12,fontWeight:600,color:NAVY}}>{o.nome}</span>
                              {o.exigir_robo&&<span style={{fontSize:9,padding:'1px 5px',borderRadius:5,background:'#EDE9FF',color:'#6366f1'}}>🤖</span>}
                              {o.passivel_multa&&<span style={{fontSize:9,padding:'1px 5px',borderRadius:5,background:'#FEF2F2',color:'#dc2626'}}>⚠ multa</span>}
                            </div>
                            <div style={{fontSize:10,color:'#aaa',marginTop:1}}>{o.mininome} · Dia {o.dia_vencimento}</div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )
              })}
            </div>
            <div style={{padding:'12px 18px',borderTop:'1px solid #f0f0f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:11,color:'#aaa'}}>{vinc.length} obrigação(ões)</span>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>setMVinc(false)} style={{padding:'6px 14px',borderRadius:7,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:12}}>Cancelar</button>
                <button onClick={()=>{
                  // ✅ Persiste as obrigações vinculadas no localStorage do cliente
                  const clisLocal = JSON.parse(localStorage.getItem('ep_clientes')||'[]')
                  const updated = clisLocal.map(c =>
                    String(c.id)===String(cli?.id) ? {...c, obrigacoes_vinculadas: vinc} : c
                  )
                  localStorage.setItem('ep_clientes', JSON.stringify(updated))
                  setClientes(updated)
                  setMVinc(false)
                }} style={{padding:'6px 16px',borderRadius:7,background:NAVY,color:'#fff',fontWeight:700,cursor:'pointer',fontSize:12,border:'none'}}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
