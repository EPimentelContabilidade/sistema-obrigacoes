import React, { useState, useEffect, useRef } from 'react'
import { CheckCircle, Send, Settings, Search, X, AlertTriangle, Filter, Save, Eye, ChevronDown, ChevronUp, Edit2, Trash2, FileText, Upload, Download, Paperclip, Monitor, Smartphone, MapPin } from 'lucide-react'
import { OBRIGACOES_SISTEMA } from './obrigacoes_data'
import GerarObrigacoes from './GerarObrigacoes'

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


// ── Semáforo de prazo ─────────────────────────────────────────────────────────
function semaforo(vencimento, passivelMulta, status) {
  if (status === 'entregue') return { cor:'#22c55e', bg:'#F0FDF4', label:'Entregue', emoji:'✅' }
  if (!vencimento) return { cor:'#aaa', bg:'#F5F5F5', label:'Sem prazo', emoji:'—' }
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const venc = new Date(vencimento + 'T12:00:00')
  const dias = Math.ceil((venc - hoje) / 864e5)
  if (dias < 0)  return { cor:'#dc2626', bg:'#FEF2F2', label:'Atrasado '+(Math.abs(dias))+'d', emoji:'🔴', dias }
  if (passivelMulta && dias <= 3) return { cor:'#dc2626', bg:'#FEF2F2', label:'Risco multa', emoji:'🔴', dias }
  if (dias <= 5) return { cor:'#f59e0b', bg:'#FEF9C3', label:'Vence em '+dias+'d', emoji:'🟡', dias }
  return { cor:'#22c55e', bg:'#F0FDF4', label:'No prazo '+dias+'d', emoji:'🟢', dias }
}

// ── Exportar Excel/CSV ────────────────────────────────────────────────────────
function exportarExcel(cliente, mes, tarefas) {
  const mpe2 = (m) => { if(!m) return ''; const [a,mm]=m.split('-'); return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(mm)-1]+'/'+a }
  const cabecalho = ['Obrigacao','Codigo','Departamento','Responsavel','Status','Vencimento','Competencia','Passivel Multa','Protocolo','Entregue Em','Entregue Por']
  const linhas = tarefas.map(t => [
    t.nome, t.codigo||'', t.departamento||'', t.responsavel||'Eduardo Pimentel',
    t.status==='entregue'?'Entregue':'Pendente',
    t.vencimento?new Date(t.vencimento+'T12:00:00').toLocaleDateString('pt-BR'):'---',
    t.competencia||mpe2(mes),
    t.passivel_multa?'Sim':'Nao',
    t.protocolo||'',
    t.data_entrega||'', t.entregue_por||''
  ])
  const bom = '\uFEFF'
  const csv = [cabecalho,...linhas].map(l=>l.map(v=>'"'+String(v||'').replace(/"/g,'""')+'"').join(',')).join('\n')
  const blob = new Blob([bom+csv],{type:'text/csv;charset=utf-8'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href=url; a.download='entregas_'+(cliente?.cnpj||'').replace(/\D/g,'')+'_'+(mes||'geral')+'.csv'
  a.click(); URL.revokeObjectURL(url)
}

function exportarPDF(cliente, mes, tarefas) {
  const mpe2 = (m) => { if(!m) return ''; const [a,mm]=m.split('-'); return ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][parseInt(mm)-1]+'/'+a }
  const ent = tarefas.filter(t=>t.status==='entregue').length
  const pend = tarefas.filter(t=>t.status!=='entregue').length
  const multas = tarefas.filter(t=>t.passivel_multa&&t.status!=='entregue').length
  const linhasTabela = tarefas.map((t,i) => {
    const sm = semaforo(t.vencimento, t.passivel_multa, t.status)
    const venc = t.vencimento ? new Date(t.vencimento+'T12:00:00').toLocaleDateString('pt-BR') : '---'
    const status = t.status==='entregue' ? 'Entregue' : 'Pendente'
    return '<tr><td>'+(i+1)+'</td><td>'+t.nome+(t.passivel_multa?' (MULTA)':'')+'</td><td>'+sm.label+'</td><td>'+(t.departamento||'---')+'</td><td>'+(t.responsavel||'Eduardo Pimentel')+'</td><td>'+venc+'</td><td>'+status+'</td><td>'+(t.data_entrega||'---')+'</td></tr>'
  }).join('')
  const nomeCliente = cliente ? cliente.nome : '---'
  const cnpjCliente = cliente ? cliente.cnpj : '---'
  const regimeCliente = cliente ? (cliente.tributacao||cliente.regime||'---') : '---'
  const dataGeracao = new Date().toLocaleString('pt-BR')
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatorio Entregas</title>'
    + '<style>body{font-family:Arial,sans-serif;margin:24px;font-size:12px}'
    + 'h1{color:#1B2A4A;border-bottom:3px solid #C5A55A;padding-bottom:6px}'
    + 'table{width:100%;border-collapse:collapse;margin-top:10px}'
    + 'th{background:#1B2A4A;color:#fff;padding:8px 6px;text-align:left;font-size:10px}'
    + 'td{padding:6px;border-bottom:1px solid #f0f0f0;font-size:11px}'
    + '</style></head><body>'
    + '<h1>Relatorio de Entregas / Tarefas</h1>'
    + '<div><b>Cliente:</b> '+nomeCliente+' | <b>CNPJ:</b> '+cnpjCliente+' | <b>Competencia:</b> '+mpe2(mes)+' | <b>Regime:</b> '+regimeCliente+'</div>'
    + '<div><b>Gerado em:</b> '+dataGeracao+' | EPimentel Auditoria - CRC/GO 026.994/O-8</div>'
    + '<div style="display:flex;gap:16px;margin:12px 0">'
    + '<div style="border:1px solid #ddd;border-radius:8px;padding:10px 16px;text-align:center"><div style="font-size:24px;font-weight:800">'+tarefas.length+'</div><div>Total</div></div>'
    + '<div style="border:1px solid #ddd;border-radius:8px;padding:10px 16px;text-align:center"><div style="font-size:24px;font-weight:800;color:#22c55e">'+ent+'</div><div>Entregues</div></div>'
    + '<div style="border:1px solid #ddd;border-radius:8px;padding:10px 16px;text-align:center"><div style="font-size:24px;font-weight:800;color:#f59e0b">'+pend+'</div><div>Pendentes</div></div>'
    + '<div style="border:1px solid #ddd;border-radius:8px;padding:10px 16px;text-align:center"><div style="font-size:24px;font-weight:800;color:#dc2626">'+multas+'</div><div>Risco Multa</div></div>'
    + '</div>'
    + '<table><thead><tr><th>#</th><th>Obrigacao</th><th>Semaforo</th><th>Dpto</th><th>Responsavel</th><th>Vencimento</th><th>Status</th><th>Entregue Em</th></tr></thead>'
    + '<tbody>'+linhasTabela+'</tbody></table>'
    + '<div style="margin-top:18px;font-size:10px;color:#aaa;text-align:center">LGPD Lei 13.709/2018 | EPimentel Auditoria & Contabilidade</div>'
    + '</body></html>'
  const win = window.open('','_blank'); win.document.write(html); win.document.close(); setTimeout(()=>win.print(),500)
}

function gerarMensagemAlerta(cliente, tarefas, mes) {
  const mpe2 = (m) => { if(!m) return ''; const [a,mm]=m.split('-'); return ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][parseInt(mm)-1]+'/'+a }
  const pendentes = tarefas.filter(t=>t.status!=='entregue')
  const multas = pendentes.filter(t=>t.passivel_multa)
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const urgentes = pendentes.filter(t=>{ if(!t.vencimento) return false; const d=Math.ceil((new Date(t.vencimento+'T12:00:00')-hoje)/864e5); return d<=5 })
  const linhasUrgentes = urgentes.length > 0
    ? 'Obrigacoes urgentes:\n' + urgentes.map(t=>'- '+t.nome+' vence '+new Date(t.vencimento+'T12:00:00').toLocaleDateString('pt-BR')+(t.passivel_multa?' MULTA':'')).join('\n') + '\n'
    : ''
  return 'EPimentel Auditoria & Contabilidade\n'
    + 'Resumo de Obrigacoes - ' + mpe2(mes) + '\n'
    + 'Cliente: ' + (cliente?.nome||'') + '\n\n'
    + 'Situacao atual:\n'
    + 'Entregues: ' + tarefas.filter(t=>t.status==='entregue').length + '/' + tarefas.length + '\n'
    + 'Pendentes: ' + pendentes.length + '\n'
    + 'Vencem em 5 dias: ' + urgentes.length + '\n'
    + 'Risco de multa: ' + multas.length + '\n\n'
    + linhasUrgentes
    + 'Duvidas: (62) 9xxxx-xxxx\n'
    + 'EPimentel Auditoria & Contabilidade - CRC/GO 026.994/O-8'
}

const DEPT_MAP = {
  'DAS':'Fiscal','DEFIS':'Fiscal','PGDAS-D':'Fiscal','DAS-MEI':'Fiscal','DASN-SIMEI':'Fiscal',
  'DARF-IRPJ':'Fiscal','DARF-CSLL':'Fiscal','PIS-LP':'Fiscal','COFINS-LP':'Fiscal',
  'DCTF':'Fiscal','ECF-LP':'Fiscal','EFD-CONTRIBUICOES':'Fiscal','SPED-FISCAL-LP':'Fiscal',
  'RET-DARF':'Fiscal','DIMOB':'Fiscal','CPC47':'Fiscal','FUNRURAL':'Fiscal','DAR-ITR':'Fiscal',
  'DITR':'Fiscal','IRPF-RURAL':'Fiscal','PIS-NC':'Fiscal','COFINS-NC':'Fiscal',
  'RAIS':'Pessoal','CAGED':'Pessoal','ESOCIAL':'Pessoal','DCTFWEB':'Pessoal','EFD-REINF':'Pessoal',
  'SPED-CONT':'Contábil','ECF':'Contábil','LALUR':'Contábil','SPED-CONT-LP':'Contábil',
  'BLOCO-B':'Contábil','POC':'Contábil',
}

const gerarRastreio = (id) => {
  const us = [{nome:'Eduardo Pimentel',perfil:'Contador',avatar:'E'},{nome:'Maria Santos',perfil:'Cliente',avatar:'M'},{nome:'João Silva',perfil:'Cliente',avatar:'J'}]
  const ac = ['Visualizou a tarefa','Abriu o documento','Confirmou recebimento','Baixou o arquivo']
  const dv = [{nome:'Chrome · Windows',icon:Monitor,local:'Goiânia, GO'},{nome:'Safari · iPhone',icon:Smartphone,local:'Goiânia, GO'},{nome:'Firefox · Windows',icon:Monitor,local:'Goiânia, GO'}]
  return Array.from({length:(String(id).length%3)+1},(_,i)=>({id:i,usuario:us[i%3],dispositivo:dv[i%3],acao:ac[i%4],data:`0${i+1}/04/2026`,hora:`${9+i*3}:${i*15%60<10?'0':''}${i*15%60}`,ip:`191.${10+i}.${20+i}.${30+i}`}))
}

const mpe = (mes) => {
  if(!mes) return ''
  const [ano,m]=mes.split('-')
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
    const [empresasFiltro, setEmpresasFiltro]  = useState([])
  const [protos,     setProtos]     = useState({})
  const [coments,    setComents]    = useState({})
  const [mVinc,      setMVinc]      = useState(false)
  const [mGerar,     setMGerar]     = useState(false)
  const [mRelatorio, setMRelatorio] = useState(false)
  const [alertandoIA, setAlertandoIA] = useState(false)
  const [resultadoAlerta, setResultadoAlerta] = useState('')
  const [modalAlerta, setModalAlerta] = useState(false)
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
  const limpar = () => { setFilt({busca:'',empresa:'',departamento:'',responsavel:'',competencia_de:'',competencia_ate:'',prazo_tec_de:'',prazo_tec_ate:'',prazo_legal_de:'',prazo_legal_ate:'',entrega_de:'',entrega_ate:'',pendente:false,justificada:false,entregue:false,dispensada:false}); setFiltEmpresas([]); setFiltObrig([]) }

  // ── Multi-filtros: empresas e obrigações ──────────────────────────────────
  const [filtEmpresas,    setFiltEmpresas]    = useState([])   // IDs selecionados
  const [filtObrig,       setFiltObrig]       = useState([])   // nomes de obrigação selecionados
  const [dropEmpresas,    setDropEmpresas]    = useState(false)
  const [dropObrig,       setDropObrig]       = useState(false)
  const [buscaEmpDrop,    setBuscaEmpDrop]    = useState('')
  const [buscaObrigDrop,  setBuscaObrigDrop]  = useState('')
  // Modo multi-empresa: mostra tarefas de todos os clientes selecionados
  const [modoMulti, setModoMulti] = useState(false)
  const [todasTarefasMulti, setTodasTarefasMulti] = useState([]) // tarefas combinadas
  const ref = useRef()

  useEffect(()=>{
    try {
      const local = localStorage.getItem('ep_clientes')
      if(local){ const parsed=JSON.parse(local); if(parsed?.length>0) setClientes(parsed) }
    } catch {}
    fetch(`${API}/clientes/`).then(r=>r.ok?r.json():{}).then(d=>{
      const lista=d.clientes||d||[]
      if(lista.length>0){
        const local=JSON.parse(localStorage.getItem('ep_clientes')||'[]')
        const merged=lista.map(bc=>{ const lc=local.find(x=>String(x.id)===String(bc.id)); return lc?{...bc,...lc}:bc })
        local.forEach(lc=>{ if(!merged.find(m=>String(m.id)===String(lc.id))) merged.push(lc) })
        setClientes(merged); localStorage.setItem('ep_clientes',JSON.stringify(merged))
      }
    }).catch(()=>{})
  },[])

  useEffect(()=>{ if(cli) gerar() },[cli,mes,vinc])

  // ── Carrega obrigações do ep_tarefas_entregas (geradas via GerarObrigacoes) ─
  const gerar = () => {
    try {
      // Competência no formato "MM/YYYY"
      const mesComp = mes
        ? `${mes.split('-')[1].padStart(2,'0')}/${mes.split('-')[0]}`
        : `${String(new Date().getMonth()+1).padStart(2,'0')}/${new Date().getFullYear()}`

      // 1. Buscar tarefas geradas via catálogo (principal)
      const todas = JSON.parse(localStorage.getItem('ep_tarefas_entregas') || '[]')
      const tarefasGeradas = todas
        .filter(t => (empresasFiltro.length===0 || empresasFiltro.includes(t.cliente_id)) && String(t.cliente_id) === String(cli?.id) && t.competencia === mesComp)
        .map(t => ({
          id: t.id,
          _origem: 'catalogo',
          nome: t.obrigacao,
          codigo: t.codigo,
          departamento: DEPT_MAP[t.codigo] || 'Fiscal',
          responsavel: 'Eduardo Pimentel',
          status: t.status === 'Entregue' ? 'entregue' : 'pendente',
          data_entrega: t.data_entrega || null,
          entregue_por: t.entregue_por || null,
          enviado: t.enviado || false,
          robo_ok: false,
          exigir_robo: t.exigir_robo || false,
          passivel_multa: t.passivel_multa || false,
          vencimento: t.vencimento,
          dia_vencimento: t.vencimento ? parseInt(t.vencimento.split('-')[2]) : 20,
          competencia: t.competencia,
          visualizacoes: gerarRastreio(t.id || Math.random()),
          anexos: t.anexos || [],
          historico: t.historico || [],
        }))

      if (tarefasGeradas.length > 0) {
        setTarefas(tarefasGeradas)
        return
      }

      // 2. Fallback: obrigacoes_vinculadas do cliente (sistema antigo)
      const fresh = JSON.parse(localStorage.getItem('ep_clientes') || '[]')
      const cliAtual = fresh.find(c => String(c.id) === String(cli?.id))
      const ids = cliAtual?.obrigacoes_vinculadas || []
      if (ids.length > 0) {
        const lista = OBRIGACOES_SISTEMA.filter(o => o && ids.includes(o.id))
        if (lista.length > 0) {
          setTarefas(lista.map((o, i) => ({
            ...o, _origem: 'sistema',
            nome: o.nome || 'Obrigação',
            departamento: o.departamento || 'Fiscal',
            responsavel: o.responsavel || 'Eduardo Pimentel',
            status: 'pendente', data_entrega: null, entregue_por: null,
            enviado: false, robo_ok: false,
            visualizacoes: gerarRastreio(o.id || i), anexos: [],
          })))
          return
        }
      }

      // 3. Sem obrigações para este cliente/mês
      setTarefas([])
    } catch (err) {
      console.error('Erro ao carregar tarefas:', err)
      setTarefas([])
    }
  }

  // Atualiza ep_tarefas_entregas ao marcar como entregue
  const atualizarEntregaLS = (id, agora) => {
    try {
      const todas=JSON.parse(localStorage.getItem('ep_tarefas_entregas')||'[]')
      const updated=todas.map(t=>t.id===id?{...t,status:'Entregue',data_entrega:agora,entregue_por:USUARIO.nome}:t)
      localStorage.setItem('ep_tarefas_entregas',JSON.stringify(updated))
    } catch {}
  }

  const marcar = (id) => {
    const t=tarefas.find(x=>x.id===id)
    if(t?.exigir_robo&&!t?.robo_ok){setMRobo(t);return}
    const agora=new Date().toLocaleString('pt-BR')
    const novoHist={tipo:'entrega',usuario:USUARIO.nome,data:agora,descricao:'Marcado como entregue'}
    setTarefas(p=>p.map(x=>x.id===id?{...x,status:'entregue',data_entrega:agora,entregue_por:USUARIO.nome,historico:[...(x.historico||[]),novoHist]}:x))
    atualizarEntregaLS(id, agora)
  }

  const enviar = (id) => {
    const t=tarefas.find(x=>x.id===id)
    if(t?.exigir_robo&&!t?.robo_ok){setMRobo(t);return}
    const agora=new Date().toLocaleString('pt-BR')
    const novoHist={tipo:'envio',usuario:USUARIO.nome,data:agora,descricao:'Enviado ao cliente via '+((t.canal_padrao||'e-mail'))}
    setTarefas(p=>p.map(x=>x.id===id?{...x,status:'entregue',enviado:true,data_entrega:agora,entregue_por:USUARIO.nome,historico:[...(x.historico||[]),novoHist]}:x))
    atualizarEntregaLS(id, agora)
  }

  const salvarEdit = () => { setTarefas(p=>p.map(x=>x.id===mEditar.id?{...x,...fEdit}:x)); setMEditar(null) }

  const reverterTarefa = (id, motivo) => {
    const agora=new Date().toLocaleString('pt-BR')
    const novoHist={tipo:'reversao',usuario:USUARIO.nome,data:agora,descricao:`Revertido para Pendente${motivo?` — Motivo: ${motivo}`:''}`}
    setTarefas(p=>p.map(x=>x.id===id?{...x,status:'pendente',data_entrega:null,enviado:false,historico:[...(x.historico||[]),novoHist]}:x))
    // Reverter também no ep_tarefas_entregas
    try {
      const todas=JSON.parse(localStorage.getItem('ep_tarefas_entregas')||'[]')
      localStorage.setItem('ep_tarefas_entregas',JSON.stringify(todas.map(t=>t.id===id?{...t,status:'Pendente',data_entrega:null,entregue_por:null}:t)))
    } catch {}
    setMReverter(null); setMotivoRev('')
  }

  const salvarRen  = () => { setTarefas(p=>p.map(x=>x.id===mRenomear.id?{...x,nome:novoNome}:x)); setMRenomear(null) }
  const excluir    = (id) => { setTarefas(p=>p.filter(x=>x.id!==id)); setVinc(v=>v.filter(x=>x!==id)); setMExcluir(null) }
  const addAnexo   = (arq) => {
    if(!arq||!mAnexo) return
    setTarefas(p=>p.map(x=>x.id===mAnexo.id?{...x,anexos:[...(x.anexos||[]),{nome:arq.name,tamanho:(arq.size/1024).toFixed(0)+' KB',data:new Date().toLocaleDateString('pt-BR')}]}:x))
  }
  const enviarAnexo = (id) => { setTarefas(p=>p.map(x=>x.id===id?{...x,status:'entregue',enviado:true,data_entrega:new Date().toLocaleString('pt-BR'),entregue_por:USUARIO.nome}:x)); setMAnexo(null) }

    const algumStatusSel=filt.pendente||filt.justificada||filt.entregue||filt.dispensada

  // ── Modo multi: carregar tarefas de todas as empresas selecionadas ─────────
  const carregarMulti = () => {
    if (filtEmpresas.length === 0) { setTodasTarefasMulti([]); return }
    const mesComp = mes ? `${mes.split('-')[1].padStart(2,'0')}/${mes.split('-')[0]}` : ''
    const todas = JSON.parse(localStorage.getItem('ep_tarefas_entregas') || '[]')
    const fresh = JSON.parse(localStorage.getItem('ep_clientes') || '[]')
    const resultado = []
    filtEmpresas.forEach(clienteId => {
      const cliObj = fresh.find(c => String(c.id) === String(clienteId))
      const tCliente = todas.filter(t => String(t.cliente_id) === String(clienteId) && (!mesComp || t.competencia === mesComp))
      tCliente.forEach(t => resultado.push({
        ...t, id: t.id, _origem:'catalogo',
        nome: t.obrigacao, codigo: t.codigo,
        departamento: DEPT_MAP[t.codigo] || 'Fiscal',
        responsavel: 'Eduardo Pimentel',
        status: t.status === 'Entregue' ? 'entregue' : 'pendente',
        data_entrega: t.data_entrega || null,
        vencimento: t.vencimento,
        competencia: t.competencia,
        _cliente_nome: cliObj?.nome || String(clienteId),
        _cliente_id: clienteId,
      }))
    })
    setTodasTarefasMulti(resultado)
  }

  // Recarregar ao mudar seleção multi
  React.useEffect(() => { if (modoMulti) carregarMulti() }, [filtEmpresas, mes, modoMulti])

  // Fonte de tarefas
  const fonteBase = modoMulti ? todasTarefasMulti : tarefas

  // Lista de todas as obrigações disponíveis (para dropdown multi-obrig)
  const todasObrigDisponiveis = [...new Set(fonteBase.map(t => t.nome).filter(Boolean))].sort()

  const filtradas = fonteBase.filter(t => {
    if (!t || !t.id) return false
    if (filt.busca && !t.nome?.toLowerCase().includes(filt.busca.toLowerCase())) return false
    if (filt.departamento && t.departamento !== filt.departamento) return false
    // Multi-obrigação
    if (filtObrig.length > 0 && !filtObrig.includes(t.nome)) return false
    if (algumStatusSel) {
      const statusOk = []
      if (filt.pendente)    statusOk.push('pendente', 'atrasada')
      if (filt.justificada) statusOk.push('justificada')
      if (filt.entregue)    statusOk.push('entregue')
      if (filt.dispensada)  statusOk.push('dispensada')
      if (!statusOk.includes(t.status)) return false
    }
    return true
  })

  const fonteContagem = modoMulti ? todasTarefasMulti : tarefas
  const qtdCatalogo = fonteContagem.filter(t => t._origem === 'catalogo').length
  const ent = filtradas.filter(t => t.status === 'entregue').length
  const tot = filtradas.length
  const pct = tot > 0 ? Math.round((ent / tot) * 100) : 0
 const corB = pct === 100 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'

        return (
    <div style={{display:'flex',height:'calc(100vh - 44px)',fontFamily:'Inter, system-ui, sans-serif'}}>
          <div style={{position:'relative'}}>
            <Search size={11} style={{position:'absolute',left:7,top:7,color:'#bbb'}}/>
            <input value={buscaCli} onChange={e=>setBuscaCli(e.target.value)} placeholder="Buscar..." style={{...inp,width:'100%',padding:'5px 8px 5px 22px'}}/>
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          {clientes.filter(c=>c.nome?.toLowerCase().includes(buscaCli.toLowerCase())).map(c=>(
            <div key={c.id} onClick={()=>{
              const fresh=JSON.parse(localStorage.getItem('ep_clientes')||'[]')
              const cFresh=fresh.find(x=>String(x.id)===String(c.id))||c
              setCli(cFresh); setBuscaCli(''); setVinc(cFresh.obrigacoes_vinculadas||[]); setTarefas([])
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
                  <div style={{fontSize:11,color:'#999',marginTop:1}}>
                    {cli.cnpj} · Competência: <b>{mpe(mes)}</b>
                    {qtdCatalogo>0&&<span style={{marginLeft:8,fontSize:10,padding:'1px 6px',borderRadius:6,background:'#FFFBF0',color:'#854D0E',border:'1px solid #C5A55A44',fontWeight:700}}>📋 {qtdCatalogo} do catálogo</span>}
                  </div>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                  {[{n:tarefas.filter(t=>t.status==='pendente').length,c:'#f59e0b',l:'Pendentes'},{n:tarefas.filter(t=>t.status==='atrasada').length,c:'#ef4444',l:'Atrasadas'},{n:ent,c:'#22c55e',l:'Entregues'},{n:tarefas.filter(t=>t.exigir_robo&&t.status!=='entregue').length,c:'#6366f1',l:'Req. Robô'}].map(s=>(
                    <div key={s.l} style={{textAlign:'center',padding:'3px 8px',borderRadius:7,background:s.c+'15',border:`1px solid ${s.c}30`}}>
                      <div style={{fontWeight:700,color:s.c,fontSize:14}}>{s.n}</div>
                      <div style={{color:'#888',fontSize:9}}>{s.l}</div>
                    </div>
                  ))}
                  <input type="month" value={mes} onChange={e=>setMes(e.target.value)} style={{...inp,padding:'5px 9px'}}/>
                  {/* ── Botões ── */}
                  <button onClick={()=>setMGerar(true)} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:7,border:`1px solid ${GOLD}`,background:GOLD+'15',color:'#854D0E',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                    📅 Gerar
                  </button>
                  <button onClick={()=>exportarExcel(cli,mes,tarefas)} title="Exportar Excel" style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:7,border:'1px solid #22c55e',background:'#F0FDF4',color:'#166534',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                    📊 Excel
                  </button>
                  <button onClick={()=>exportarPDF(cli,mes,tarefas)} title="Exportar PDF" style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:7,border:'1px solid #e53935',background:'#FEF2F2',color:'#dc2626',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                    📄 PDF
                  </button>
                  <button onClick={()=>setModalAlerta(true)} title="Enviar alertas WhatsApp/Email" style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:7,border:'1px solid #6366f1',background:'#EDE9FF',color:'#6366f1',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                    🔔 Alertar
                  </button>
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

                        {/* ── Multi-filtros: Empresas + Obrigações ─────────────────────── */}
            <div style={{background:'#fff',borderBottom:'2px solid #e8e8e8'}}>

              {/* Linha 1: Busca + Status + Modo Multi */}
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'7px 14px',borderBottom:'1px solid #f0f0f0',flexWrap:'wrap'}}>
                <div style={{position:'relative',flex:'0 0 200px'}}>
                  <Search size={11} style={{position:'absolute',left:7,top:7,color:'#bbb'}}/>
                  <input value={filt.busca} onChange={e=>setF('busca',e.target.value)} placeholder="Buscar obrigação..." style={{...inp,width:'100%',paddingLeft:22}}/>
                </div>

                {/* ── Multi-Empresa Dropdown ── */}
                <div style={{position:'relative'}}>
                  <button onClick={()=>{ setDropEmpresas(v=>!v); setDropObrig(false) }}
                    style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:7,background:filtEmpresas.length>0?'#EBF5FF':'#f5f5f5',color:filtEmpresas.length>0?NAVY:'#555',border:`1px solid ${filtEmpresas.length>0?NAVY:'#ddd'}`,fontSize:12,fontWeight:filtEmpresas.length>0?700:400,cursor:'pointer',whiteSpace:'nowrap'}}>
                    🏢 {filtEmpresas.length>0?`${filtEmpresas.length} empresa(s)`:'Empresas'} <ChevronDown size={11}/>
                  </button>
                  {dropEmpresas&&(
                    <>
                      <div style={{position:'fixed',inset:0,zIndex:49}} onClick={()=>setDropEmpresas(false)}/>
                      <div style={{position:'absolute',top:'100%',left:0,zIndex:50,background:'#fff',border:'1px solid #ddd',borderRadius:10,boxShadow:'0 4px 20px rgba(0,0,0,.12)',padding:8,minWidth:280,maxHeight:320,overflowY:'auto',marginTop:4}}>
                        <input value={buscaEmpDrop} onChange={e=>setBuscaEmpDrop(e.target.value)} placeholder="Buscar empresa..." style={{...inp,width:'100%',marginBottom:6}}/>
                        {filtEmpresas.length>0&&<button onClick={()=>setFiltEmpresas([])} style={{width:'100%',marginBottom:6,padding:'3px 8px',borderRadius:6,background:'#fee2e2',color:'#dc2626',border:'none',cursor:'pointer',fontSize:11}}>✕ Limpar ({filtEmpresas.length})</button>}                        {clientes.filter(c=>{
                          const q=buscaEmpDrop.toLowerCase()
                          return !q||(c.nome||'').toLowerCase().includes(q)||(c.cnpj||'').includes(q)
                        }).map(c=>{
                          const sid=String(c.id)
                          const sel=filtEmpresas.includes(sid)
                          return (
                            <label key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 4px',cursor:'pointer',borderRadius:5,background:sel?'#EBF5FF':'transparent',marginBottom:2}}>
                              <input type="checkbox" checked={sel} onChange={()=>setFiltEmpresas(p=>sel?p.filter(x=>x!==sid):[...p,sid])} style={{accentColor:NAVY}}/>
                              <div>
                                <div style={{fontSize:12,fontWeight:sel?700:400,color:NAVY}}>{c.nome}</div>
                                <div style={{fontSize:10,color:'#aaa'}}>{c.cnpj}</div>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* ── Multi-Obrigação Dropdown ── */}
                <div style={{position:'relative'}}>
                  <button onClick={()=>{ setDropObrig(v=>!v); setDropEmpresas(false) }}
                    style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:7,background:filtObrig.length>0?'#F5F3FF':'#f5f5f5',color:filtObrig.length>0?'#7c3aed':'#555',border:`1px solid ${filtObrig.length>0?'#7c3aed':'#ddd'}`,fontSize:12,fontWeight:filtObrig.length>0?700:400,cursor:'pointer',whiteSpace:'nowrap'}}>
                    📋 {filtObrig.length>0?`${filtObrig.length} obrig.`:'Obrigações'} <ChevronDown size={11}/>
                  </button>
                  {dropObrig&&(
                    <>
                      <div style={{position:'fixed',inset:0,zIndex:49}} onClick={()=>setDropObrig(false)}/>
                      <div style={{position:'absolute',top:'100%',left:0,zIndex:50,background:'#fff',border:'1px solid #ddd',borderRadius:10,boxShadow:'0 4px 20px rgba(0,0,0,.12)',padding:8,minWidth:300,maxHeight:320,overflowY:'auto',marginTop:4}}>
                        <input value={buscaObrigDrop} onChange={e=>setBuscaObrigDrop(e.target.value)} placeholder="Buscar obrigação..." style={{...inp,width:'100%',marginBottom:6}}/>
                        {filtObrig.length>0&&<button onClick={()=>setFiltObrig([])} style={{width:'100%',marginBottom:6,padding:'3px 8px',borderRadius:6,background:'#f3e8ff',color:'#7c3aed',border:'none',cursor:'pointer',fontSize:11}}>✕ Limpar ({filtObrig.length})</button>}
                        {todasObrigDisponiveis.filter(n=>!buscaObrigDrop||n.toLowerCase().includes(buscaObrigDrop.toLowerCase())).map(nome=>{
                          const sel=filtObrig.includes(nome)
                          return (
                            <label key={nome} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 4px',cursor:'pointer',borderRadius:5,background:sel?'#F5F3FF':'transparent',marginBottom:2}}>
                              <input type="checkbox" checked={sel} onChange={()=>setFiltObrig(p=>sel?p.filter(x=>x!==nome):[...p,nome])} style={{accentColor:'#7c3aed'}}/>
                              <div style={{fontSize:12,fontWeight:sel?700:400,color:'#333'}}>{nome}</div>
                            </label>
                          )
                        })}
                        {todasObrigDisponiveis.length===0&&<div style={{fontSize:12,color:'#aaa',padding:'8px 4px'}}>Selecione empresas primeiro</div>}
                      </div>
                    </>
                  )}
                </div>

                {/* Modo multi-empresa toggle */}
                <button onClick={()=>{ setModoMulti(v=>!v); if(!modoMulti&&filtEmpresas.length===0){ const todos=clientes.slice(0,10).map(c=>String(c.id)); setFiltEmpresas(todos) } }}
                  style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:7,background:modoMulti?NAVY:'#f5f5f5',color:modoMulti?'#fff':'#555',fontSize:12,border:`1px solid ${modoMulti?NAVY:'#ddd'}`,cursor:'pointer',fontWeight:modoMulti?700:400}}>
                  {modoMulti?'👥 Multi-empresa':'👤 Empresa única'}
                </button>

                {/* Status pills */}
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                  {[{k:'pendente',l:'Pendentes',c:'#f59e0b',bg:'#FEF9C3'},{k:'justificada',l:'Justif.',c:'#3b82f6',bg:'#EFF6FF'},{k:'entregue',l:'Entregues',c:'#22c55e',bg:'#F0FDF4'},{k:'dispensada',l:'Dispen.',c:'#6b7280',bg:'#f5f5f5'}].map(s=>(
                    <button key={s.k} onClick={()=>setF(s.k,!filt[s.k])} style={{padding:'3px 8px',borderRadius:20,cursor:'pointer',border:`1px solid ${filt[s.k]?s.c:'#ddd'}`,background:filt[s.k]?s.bg:'#fff',color:filt[s.k]?s.c:'#aaa',fontSize:11,fontWeight:filt[s.k]?700:400}}>
                      {s.l}
                    </button>
                  ))}
                </div>

                {/* Contagem + limpar */}
                {(filtEmpresas.length>0||filtObrig.length>0||algumStatusSel||filt.busca||filt.departamento)&&(
                  <div style={{display:'flex',alignItems:'center',gap:6,marginLeft:'auto'}}>
                    <span style={{fontSize:11,color:'#3b82f6',padding:'3px 8px',borderRadius:6,background:'#EFF6FF',border:'1px solid #bfdbfe'}}>{filtradas.length} tarefa(s)</span>
                    <button onClick={limpar} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:7,background:'#fee2e2',color:'#dc2626',fontWeight:600,fontSize:12,border:'1px solid #fca5a5',cursor:'pointer'}}><X size={11}/> Limpar</button>
                  </div>
                )}
                <button onClick={()=>setShowFilt(e=>!e)} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:7,background:showFilt?NAVY:'#f5f5f5',color:showFilt?'#fff':'#555',fontSize:12,border:'none',cursor:'pointer'}}>
                  <Filter size={11}/> {showFilt?'Menos':'+ Filtros'}
                </button>
              </div>

              {/* Linha 2: Filtros avançados (colapsável) */}
              {showFilt&&(
                <div style={{padding:'7px 14px 10px'}}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:7}}>
                    {[
                      {l:'Departamento',el:<select value={filt.departamento} onChange={e=>setF('departamento',e.target.value)} style={{...inp,width:'100%'}}><option value="">Todos</option><option>Fiscal</option><option>Pessoal</option><option>Contábil</option><option>Bancos</option></select>},
                      {l:'Competência de',el:<input type="month" value={filt.competencia_de} onChange={e=>setF('competencia_de',e.target.value)} style={{...inp,width:'100%'}}/>},
                      {l:'Competência até',el:<input type="month" value={filt.competencia_ate} onChange={e=>setF('competencia_ate',e.target.value)} style={{...inp,width:'100%'}}/>},
                      {l:'Prazo téc. de',el:<input type="date" value={filt.prazo_tec_de} onChange={e=>setF('prazo_tec_de',e.target.value)} style={{...inp,width:'100%'}}/>},
                      {l:'Prazo téc. até',el:<input type="date" value={filt.prazo_tec_ate} onChange={e=>setF('prazo_tec_ate',e.target.value)} style={{...inp,width:'100%'}}/>},
                    ].map(f=><div key={f.l}><div style={{fontSize:9,color:'#aaa',fontWeight:700,marginBottom:3,textTransform:'uppercase'}}>{f.l}</div>{f.el}</div>)}
                  </div>
                </div>
              )}

              {/* Linha 3: Badge das empresas selecionadas no modo multi */}
              {modoMulti&&filtEmpresas.length>0&&(
                <div style={{padding:'4px 14px 6px',display:'flex',gap:5,flexWrap:'wrap',borderTop:'1px solid #f0f0f0'}}>
                  <span style={{fontSize:10,color:'#aaa',alignSelf:'center',fontWeight:700}}>EMPRESAS:</span>
                  {filtEmpresas.map(sid=>{
                    const c=clientes.find(x=>String(x.id)===sid)
                    return c?(<span key={sid} style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:'#EBF5FF',color:NAVY,border:'1px solid #bfdbfe',display:'flex',alignItems:'center',gap:4}}>
                      {c.nome} <button onClick={()=>setFiltEmpresas(p=>p.filter(x=>x!==sid))} style={{background:'none',border:'none',cursor:'pointer',padding:0,color:'#999',lineHeight:1}}><X size={10}/></button>
                    </span>):null
                  })}
                </div>
              )}
            </div>
{/* Tabela */}
            <div style={{flex:1,overflowY:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{background:'#fff',borderBottom:'2px solid #e8e8e8',position:'sticky',top:0,zIndex:1}}>
                    {['','Obrigação / Tarefa','Status · Prazo','Dpto — Resp.','Vencimento','Prazo Meta','Competência','Protocolo','Rastreio','Ações'].map(h=>(
                      <th key={h} style={{padding:'8px 10px',textAlign:'left',fontSize:11,fontWeight:700,color:'#888',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtradas.filter(t=>t&&t.id).map((t,i)=>{
                    const sb=SB[t.status]||SB.pendente
                    const dc=DCORES[t.departamento]||{bg:'#f5f5f5',color:'#666'}
                    const ent2=t.status==='entregue'
                    const isE=expanded===t.id
                    const viN=t.visualizacoes?.length||0
                    const anN=t.anexos?.length||0
                    const dv=t.vencimento
                      ? new Date(t.vencimento+'T12:00:00').toLocaleDateString('pt-BR')
                      : `${String(t.dia_vencimento||20).padStart(2,'0')}/04/2026`
                    return (
                      <React.Fragment key={t.id}>
                        <tr style={{background:ent2?'#FAFFF8':i%2===0?'#fff':'#fafafa',borderBottom:isE?'none':'1px solid #f0f0f0'}}>
                          {/* Semáforo */}
                        <td style={{padding:'6px 8px',textAlign:'center',width:36}} onClick={()=>setExpanded(isE?null:t.id)}>
                          {(()=>{
                            const sm=semaforo(t.vencimento,t.passivel_multa,t.status)
                            return <div title={sm.label} style={{width:18,height:18,borderRadius:'50%',background:sm.cor,margin:'0 auto',cursor:'pointer',boxShadow:`0 0 0 3px ${sm.cor}33`}}/>
                          })()}
                        </td>
                        <td style={{padding:'9px 10px',cursor:'pointer'}} onClick={()=>setExpanded(isE?null:t.id)}>
                            <div style={{display:'flex',alignItems:'flex-start',gap:6}}>
                              {isE?<ChevronUp size={12} style={{color:'#aaa',marginTop:2,flexShrink:0}}/>:<ChevronDown size={12} style={{color:'#aaa',marginTop:2,flexShrink:0}}/>}
                              <div>
                                <div style={{fontWeight:600,color:NAVY}}>{t.nome}</div>
                                <div style={{display:'flex',gap:4,marginTop:2,flexWrap:'wrap'}}>
                                  {t._origem==='catalogo'&&<span style={{fontSize:9,padding:'1px 5px',borderRadius:5,background:'#FFFBF0',color:'#854D0E',border:'1px solid #C5A55A44'}}>📋 catálogo</span>}
                                  {t.exigir_robo&&!ent2&&<span style={{fontSize:9,padding:'1px 5px',borderRadius:5,background:'#EDE9FF',color:'#6366f1'}}>🤖 Req. Robô</span>}
                                  {t.passivel_multa&&!ent2&&<span style={{fontSize:9,padding:'1px 5px',borderRadius:5,background:'#FEF2F2',color:'#dc2626'}}>⚠ multa</span>}
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
                          </td>
                          <td style={{padding:'9px 10px',fontSize:11,color:'#555'}}>
                            <span style={{padding:'1px 6px',borderRadius:5,background:dc.bg,color:dc.color,fontWeight:500,marginRight:4,fontSize:10}}>{t.departamento}</span>
                            {t.responsavel||'Eduardo Pimentel'}
                          </td>
                          <td style={{padding:'9px 10px',fontSize:11,fontWeight:700}}>
                            {(()=>{
                              const sm=semaforo(t.vencimento,t.passivel_multa,t.status)
                              return <span style={{color:sm.cor}}>{dv}{t.passivel_multa&&t.status!=='entregue'&&<span style={{marginLeft:5,fontSize:10}}>⚠️</span>}</span>
                            })()}
                          </td>
                          <td style={{padding:'9px 10px',fontSize:11}}>
                            {(()=>{
                              const sm=semaforo(t.vencimento,t.passivel_multa,t.status)
                              return <span style={{fontSize:11,padding:'2px 7px',borderRadius:8,background:sm.bg,color:sm.cor,fontWeight:700,display:'inline-flex',alignItems:'center',gap:4}}>
                                {sm.emoji} {sm.label}
                              </span>
                            })()}
                          </td>
                          <td style={{padding:'9px 10px',fontSize:11,color:'#555'}}>{t.competencia||mpe(mes)}</td>
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
                              <Btn onClick={()=>marcar(t.id)} bg={t.exigir_robo?'#6366f1':'#22c55e'} color="#fff" title={t.exigir_robo?'Processar com Robô':'Marcar entregue'} disabled={!PERM.entregar||ent2}>{t.exigir_robo?'🤖':'✓'}</Btn>
                              <Btn onClick={()=>setMAnexo(t)} bg="#f59e0b" color="#fff" title="Anexar e enviar" disabled={!PERM.anexar}><Paperclip size={11}/></Btn>
                              <Btn onClick={()=>enviar(t.id)} bg={NAVY} color="#fff" title="Enviar ao cliente" disabled={!PERM.enviar}><Send size={11}/></Btn>
                              <Btn onClick={()=>{setMRenomear(t);setNovoNome(t.nome)}} bg="#EBF5FF" color="#1D6FA4" title="Renomear" disabled={!PERM.renomear}>Aa</Btn>
                              <Btn onClick={()=>{setFEdit({nome:t.nome,departamento:t.departamento,exigir_robo:t.exigir_robo});setMEditar(t)}} bg="#f0f4ff" color={NAVY} title="Editar" disabled={!PERM.editar}><Edit2 size={11}/></Btn>
                              {ent2&&<Btn onClick={()=>{setMReverter(t);setMotivoRev('')}} bg="#FEF9C3" color="#854D0E" title="Reverter para Pendente" disabled={!PERM.reverter||(t.responsavel!==USUARIO.nome&&USUARIO.perfil!=='Administrador')}>↩</Btn>}
                              <Btn onClick={()=>setMExcluir(t)} bg="#FEF2F2" color="#dc2626" title="Excluir" disabled={!PERM.excluir}><Trash2 size={11}/></Btn>
                            </div>
                          </td>
                        </tr>
                        {isE&&(
                          <tr>
                            <td colSpan={8} style={{background:'#F8F9FF',borderBottom:'1px solid #e8e8e8',padding:0}}>
                              <div style={{padding:'12px 14px 14px 34px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
                                <div>
                                  <div style={{fontSize:10,fontWeight:700,color:'#aaa',marginBottom:8,textTransform:'uppercase'}}>Detalhes</div>
                                  {[['Código',t.codigo||'—'],['Departamento',t.departamento||'—'],['Responsável',t.responsavel||'—'],['Vencimento',dv],['Exige Robô',t.exigir_robo?'Sim':'Não'],['Passível Multa',t.passivel_multa?'Sim':'Não'],['Notif. WhatsApp',t.notif_whatsapp?'Sim':'Não'],['Notif. E-mail',t.notif_email?'Sim':'Não'],t.caminho_arquivo?['Caminho',t.caminho_arquivo]:null,t.data_entrega?['Entregue em',t.data_entrega]:null,t.entregue_por?['Por',t.entregue_por]:null].filter(Boolean).map(([k,v])=>(
                                    <div key={k} style={{display:'flex',gap:8,fontSize:11,marginBottom:4}}>
                                      <span style={{color:'#aaa',minWidth:90}}>{k}:</span>
                                      <span style={{color:NAVY,fontWeight:500,wordBreak:'break-all'}}>{v}</span>
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
                                        <div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:NAVY}}>{a.nome}</div><div style={{fontSize:10,color:'#aaa'}}>{a.tamanho} · {a.data}</div></div>
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
                                  <div style={{fontSize:10,fontWeight:700,color:'#aaa',marginBottom:8,textTransform:'uppercase'}}>📋 Histórico</div>
                                  {(t.historico||[]).length===0
                                    ?<div style={{fontSize:11,color:'#ccc',fontStyle:'italic'}}>Sem histórico.</div>
                                    :<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                                      {(t.historico||[]).map((h,hi)=>{
                                        const cores={entrega:{bg:'#F0FDF4',color:'#166534',ic:'✓'},envio:{bg:'#EFF6FF',color:'#1D4ED8',ic:'✈'},reversao:{bg:'#FEF9C3',color:'#854D0E',ic:'↩'},default:{bg:'#f5f5f5',color:'#666',ic:'●'}}
                                        const cor=cores[h.tipo]||cores.default
                                        return <div key={hi} style={{padding:'7px 12px',borderRadius:8,background:cor.bg,border:`1px solid ${cor.color}25`,minWidth:180}}>
                                          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}><span style={{fontSize:13}}>{cor.ic}</span><span style={{fontSize:11,fontWeight:700,color:cor.color}}>{h.tipo==='entrega'?'Entregue':h.tipo==='envio'?'Enviado':h.tipo==='reversao'?'Revertido':'Ação'}</span></div>
                                          <div style={{fontSize:11,color:'#555',marginBottom:2}}>{h.descricao}</div>
                                          <div style={{fontSize:10,color:'#aaa'}}>{h.usuario} · {h.data}</div>
                                        </div>
                                      })}
                                    </div>
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
                  Nenhuma obrigação para <b>{cli?.nome}</b> em <b>{mpe(mes)}</b>.{' '}
                  <button onClick={()=>setMGerar(true)} style={{color:GOLD,background:'none',border:'none',cursor:'pointer',fontWeight:700,textDecoration:'underline'}}>📅 Clique aqui para Gerar Obrigações</button>
                  {' — use também '}
                  <button onClick={()=>setMVinc(true)} style={{color:NAVY,background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Vincular manualmente</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Gerar Obrigações */}
      {mGerar&&cli&&(
        <GerarObrigacoes
          cliente={cli}
          onClose={()=>setMGerar(false)}
          onGerado={(qtd)=>{ setMGerar(false); setTimeout(()=>gerar(),300) }}
        />
      )}

      {/* Modal Rastreio */}
      {mRastreio&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
          <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:520,maxHeight:'85vh',display:'flex',flexDirection:'column',boxShadow:'0 24px 60px rgba(0,0,0,0.2)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px',borderBottom:'1px solid #f0f0f0'}}>
              <div><div style={{fontWeight:700,color:NAVY,fontSize:14}}>Rastreio de Acesso</div><div style={{fontSize:11,color:'#999',marginTop:2}}>{mRastreio.nome}</div></div>
              <button onClick={()=>setMRastreio(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa'}}><X size={18}/></button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'14px 20px'}}>
              {(mRastreio.visualizacoes||[]).map(v=>{
                const DI=v.dispositivo.icon||Monitor
                const isCli=v.usuario.perfil==='Cliente'
                return <div key={v.id} style={{display:'flex',gap:12,marginBottom:12}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:isCli?GOLD:NAVY,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:13,fontWeight:700,color:'#fff'}}>{v.usuario.avatar}</div>
                  <div style={{flex:1,background:'#f8f9fb',borderRadius:9,padding:'9px 12px',border:'1px solid #f0f0f0'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:700,color:NAVY}}>{v.usuario.nome}</span>
                      <span style={{fontSize:10,color:'#aaa'}}>{v.data} {v.hora}</span>
                    </div>
                    <div style={{fontSize:12,color:'#555',marginBottom:5}}>{v.acao}</div>
                    <div style={{display:'flex',gap:6}}>
                      <span style={{fontSize:10,padding:'1px 7px',borderRadius:5,background:'#f0f0f0',color:'#666'}}><DI size={10}/> {v.dispositivo.nome}</span>
                      <span style={{fontSize:10,padding:'1px 7px',borderRadius:5,background:'#f0f0f0',color:'#666'}}>{v.dispositivo.local}</span>
                    </div>
                  </div>
                </div>
              })}
            </div>
            <div style={{padding:'10px 20px',borderTop:'1px solid #f0f0f0',display:'flex',justifyContent:'flex-end'}}>
              <button onClick={()=>setMRastreio(null)} style={{padding:'7px 18px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer'}}>Fechar</button>
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
            <div onClick={()=>ref.current?.click()} style={{border:`2px dashed ${GOLD}`,borderRadius:10,padding:20,textAlign:'center',cursor:'pointer',background:GOLD+'08',marginBottom:14}}>
              <input ref={ref} type="file" accept=".pdf,.png,.jpg,.xlsx,.docx" style={{display:'none'}} onChange={e=>{if(e.target.files[0])addAnexo(e.target.files[0])}}/>
              <Upload size={22} style={{color:GOLD,marginBottom:5}}/><div style={{fontSize:12,color:GOLD,fontWeight:600}}>Clique ou arraste</div><div style={{fontSize:10,color:'#aaa',marginTop:2}}>PDF, Word, Excel, Imagens</div>
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
            <input value={novoNome} onChange={e=>setNovoNome(e.target.value)} autoFocus style={{padding:'9px 12px',borderRadius:8,border:'1px solid #e0e0e0',fontSize:14,outline:'none',width:'100%',boxSizing:'border-box',marginBottom:16}}/>
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
            <div style={{marginBottom:12}}><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Nome</label><input value={fEdit.nome} onChange={e=>setFEdit(f=>({...f,nome:e.target.value}))} style={{padding:'8px 10px',borderRadius:7,border:'1px solid #e0e0e0',fontSize:13,outline:'none',width:'100%',boxSizing:'border-box'}}/></div>
            <div style={{marginBottom:12}}><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Departamento</label><select value={fEdit.departamento} onChange={e=>setFEdit(f=>({...f,departamento:e.target.value}))} style={{padding:'8px 10px',borderRadius:7,border:'1px solid #e0e0e0',fontSize:13,outline:'none',width:'100%',boxSizing:'border-box',cursor:'pointer'}}><option>Fiscal</option><option>Pessoal</option><option>Contábil</option><option>Bancos</option></select></div>
            <div style={{marginBottom:16}}><label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}><input type="checkbox" checked={fEdit.exigir_robo} onChange={e=>setFEdit(f=>({...f,exigir_robo:e.target.checked}))} style={{accentColor:'#6366f1',width:14,height:14}}/><span style={{fontSize:12,fontWeight:600,color:NAVY}}>🤖 Exigir processamento pelo Robô</span></label></div>
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
            <div style={{fontSize:13,color:'#666',marginBottom:16}}>"{mExcluir.nome}"</div>
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
          <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:460,padding:26}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:700,color:NAVY}}>↩ Reverter Obrigação — {mReverter.nome}</div>
              <button onClick={()=>setMReverter(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa'}}><X size={18}/></button>
            </div>
            <div style={{marginBottom:14}}><label style={{fontSize:11,fontWeight:700,color:NAVY,display:'block',marginBottom:6}}>Motivo da reversão *</label><textarea value={motivoRev} onChange={e=>setMotivoRev(e.target.value)} placeholder="Ex: Documento incorreto..." style={{...inp,height:80,resize:'none',fontFamily:'inherit'}}/></div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setMReverter(null)} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:13}}>Cancelar</button>
              <button onClick={()=>reverterTarefa(mReverter.id,motivoRev)} disabled={!motivoRev} style={{padding:'8px 20px',borderRadius:8,background:motivoRev?'#f59e0b':'#ccc',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:motivoRev?'pointer':'default'}}>↩ Confirmar</button>
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
            <div style={{fontSize:13,color:'#666',marginBottom:20,lineHeight:1.6}}><b>{mRobo.nome}</b> exige o Robô antes de ser entregue.</div>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button onClick={()=>setMRobo(null)} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:13}}>Fechar</button>
              <button onClick={()=>setMRobo(null)} style={{padding:'8px 16px',borderRadius:8,background:'#6366f1',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13,border:'none'}}>🤖 Ir para Robô</button>
            </div>
          </div>
        </div>
      )}


      {/* ── Modal Alertas WhatsApp/Email ── */}
      {modalAlerta&&cli&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
          <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:620,maxHeight:'90vh',overflow:'auto',boxShadow:'0 8px 40px rgba(0,0,0,.2)'}}>
            <div style={{padding:'14px 22px',borderBottom:'1px solid #eee',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#EDE9FF'}}>
              <div style={{fontWeight:700,color:'#6366f1',fontSize:15}}>🔔 Enviar Alertas de Vencimento</div>
              <button onClick={()=>setModalAlerta(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:'#999'}}>×</button>
            </div>
            <div style={{padding:22}}>
              {/* Preview da mensagem */}
              <div style={{marginBottom:16}}>
                <div style={{fontWeight:700,color:NAVY,fontSize:13,marginBottom:8}}>📱 Mensagem WhatsApp (preview)</div>
                <pre style={{background:'#ECE5DD',borderRadius:10,padding:14,fontSize:12,whiteSpace:'pre-wrap',fontFamily:'inherit',lineHeight:1.6,color:'#333',maxHeight:220,overflow:'auto'}}>
                  {gerarMensagemAlerta(cli,tarefas,mes)}
                </pre>
              </div>
              {/* Resumo de urgentes */}
              <div style={{marginBottom:16,padding:'12px 14px',borderRadius:9,background:'#FEF9C3',border:'1px solid #fde68a'}}>
                <div style={{fontWeight:700,color:'#854D0E',fontSize:12,marginBottom:6}}>⚠️ Resumo do período {mpe(mes)}</div>
                <div style={{display:'flex',gap:16,flexWrap:'wrap',fontSize:12}}>
                  <span>📋 <b>{tarefas.length}</b> total</span>
                  <span style={{color:'#22c55e'}}>✅ <b>{tarefas.filter(t=>t.status==='entregue').length}</b> entregues</span>
                  <span style={{color:'#f59e0b'}}>⏳ <b>{tarefas.filter(t=>t.status!=='entregue').length}</b> pendentes</span>
                  <span style={{color:'#dc2626'}}>⚠️ <b>{tarefas.filter(t=>t.passivel_multa&&t.status!=='entregue').length}</b> risco multa</span>
                </div>
              </div>
              {/* Obrigações urgentes listadas */}
              {tarefas.filter(t=>{if(!t.vencimento||t.status==='entregue')return false;const d=Math.ceil((new Date(t.vencimento+'T12:00:00')-new Date())/864e5);return d<=5}).length>0&&(
                <div style={{marginBottom:16}}>
                  <div style={{fontWeight:700,color:NAVY,fontSize:12,marginBottom:8}}>🔴 Obrigações críticas (até 5 dias)</div>
                  {tarefas.filter(t=>{if(!t.vencimento||t.status==='entregue')return false;const d=Math.ceil((new Date(t.vencimento+'T12:00:00')-new Date())/864e5);return d<=5}).map((t,i)=>{
                    const sm=semaforo(t.vencimento,t.passivel_multa,t.status)
                    return <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 10px',background:sm.bg,borderRadius:7,marginBottom:4}}>
                      <div style={{width:12,height:12,borderRadius:'50%',background:sm.cor,flexShrink:0}}/>
                      <span style={{flex:1,fontSize:12,fontWeight:600,color:sm.cor}}>{t.nome}</span>
                      <span style={{fontSize:11,color:sm.cor,fontWeight:700}}>{new Date(t.vencimento+'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      {t.passivel_multa&&<span style={{fontSize:10,padding:'1px 6px',borderRadius:5,background:'#FEF2F2',color:'#dc2626',fontWeight:700}}>⚠ MULTA</span>}
                    </div>
                  })}
                </div>
              )}
              {/* Botões de envio */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                <button onClick={async()=>{
                  const tel=cli.whatsapp||cli.telefone||''
                  if(!tel){alert('Cliente sem WhatsApp cadastrado em Clientes → Comunicação.');return}
                  const msg=gerarMensagemAlerta(cli,tarefas,mes)
                  const ok=await enviarAlertaWhatsApp(tel,msg)
                  alert(ok?'✅ Alerta enviado via WhatsApp!':'❌ Erro ao enviar. Verifique a conexão WhatsApp.')
                }} style={{padding:'10px 0',borderRadius:9,background:'#25D366',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  💬 Enviar via WhatsApp
                </button>
                <button onClick={()=>{
                  const email=cli.email||''
                  if(!email){alert('Cliente sem e-mail cadastrado.');return}
                  window.open(`mailto:${email}?subject=Alertas de Vencimento - ${mpe(mes)} - EPimentel&body=${encodeURIComponent(gerarMensagemAlerta(cli,tarefas,mes).replace(/\*/g,''))}`)
                }} style={{padding:'10px 0',borderRadius:9,background:'#3b82f6',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  📧 Enviar por E-mail
                </button>
              </div>
              <div style={{padding:'10px 14px',borderRadius:8,background:'#EBF5FF',border:'1px solid #c7d7fd',fontSize:11,color:'#1D6FA4',marginBottom:14}}>
                💡 <b>Alerta semanal automático:</b> Configure os alertas semanais em <b>Config. Tarefas → Templates de Envio</b>. O sistema verificará todo domingo e enviará automaticamente.
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
                <button onClick={()=>exportarPDF(cli,mes,tarefas)} style={{padding:'8px 16px',borderRadius:8,background:'#e53935',color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}>📄 PDF</button>
                <button onClick={()=>setModalAlerta(false)} style={{padding:'8px 18px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer'}}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vincular */}
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
                return <div key={dept} style={{marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#aaa',textTransform:'uppercase',marginBottom:6,borderBottom:'1px solid #f0f0f0',paddingBottom:4}}>{dept}</div>
                  {lista.map(o=>{
                    const chk=vinc.includes(o.id)
                    return <label key={o.id} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',cursor:'pointer',borderBottom:'1px solid #f8f8f8'}}>
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
                  })}
                </div>
              })}
            </div>
            <div style={{padding:'12px 18px',borderTop:'1px solid #f0f0f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:11,color:'#aaa'}}>{vinc.length} obrigação(ões)</span>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>setMVinc(false)} style={{padding:'6px 14px',borderRadius:7,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:12}}>Cancelar</button>
                <button onClick={()=>{
                  const clisLocal=JSON.parse(localStorage.getItem('ep_clientes')||'[]')
                  const updated=clisLocal.map(c=>String(c.id)===String(cli?.id)?{...c,obrigacoes_vinculadas:vinc}:c)
                  localStorage.setItem('ep_clientes',JSON.stringify(updated)); setClientes(updated); setMVinc(false)
                }} style={{padding:'6px 16px',borderRadius:7,background:NAVY,color:'#fff',fontWeight:700,cursor:'pointer',fontSize:12,border:'none'}}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
