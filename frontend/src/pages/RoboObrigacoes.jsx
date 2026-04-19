import React, { useState, useRef, useCallback, useEffect } from 'react'
import { epSet, epGet } from '../utils/storage'

const NAVY = '#1F4A33'
const GOLD = '#C5A55A'
const API  = window.location.hostname === 'localhost'
  ? '/api/v1' : 'https://sistema-obrigacoes-production.up.railway.app/api/v1'

const ls = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }
const lss = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

// Tipos de documento com padrões de detecção
const TIPOS = [
  { id:'das',       nome:'DAS / Simples Nacional',   icon:'🟢', cor:'#16a34a', padroes:['das','pgdas','simples'] },
  { id:'darf',      nome:'DARF',                     icon:'🔵', cor:'#2563eb', padroes:['darf'] },
  { id:'dctf',      nome:'DCTFWeb',                  icon:'🟣', cor:'#7c3aed', padroes:['dctf','dctfweb'] },
  { id:'nfe',       nome:'NF-e / NFS-e',             icon:'🟡', cor:'#d97706', padroes:['nf','nfs','nota fiscal','nfe'] },
  { id:'esocial',   nome:'eSocial',                  icon:'🟠', cor:'#ea580c', padroes:['esocial','e-social'] },
  { id:'caged',     nome:'CAGED',                    icon:'🔴', cor:'#dc2626', padroes:['caged'] },
  { id:'fgts',      nome:'FGTS',                     icon:'⚫', cor:'#374151', padroes:['fgts'] },
  { id:'gps',       nome:'GPS / INSS',               icon:'🔷', cor:'#0891b2', padroes:['gps','inss'] },
  { id:'folha',     nome:'Folha de Pagamento',       icon:'👥', cor:'#7c3aed', padroes:['folha','payroll','holerite'] },
  { id:'sped',      nome:'SPED / EFD',               icon:'📁', cor:'#374151', padroes:['sped','efd'] },
  { id:'balancete', nome:'Balancete / Balanço',      icon:'📊', cor:'#0284c7', padroes:['balanc','balancete'] },
  { id:'certidao',  nome:'Certidão',                 icon:'🏛️', cor:'#b45309', padroes:['certid','cnd','cpd'] },
  { id:'dirf',      nome:'DIRF / RAIS',              icon:'📋', cor:'#be185d', padroes:['dirf','rais'] },
  { id:'outro',     nome:'Outro Documento',          icon:'📄', cor:'#6b7280', padroes:[] },
]

function detectarTipoPorNome(nome) {
  const n = nome.toLowerCase()
  for (const t of TIPOS) {
    if (t.id === 'outro') continue
    if (t.padroes.some(p => n.includes(p))) return { tipo: t, confianca: 0.80 }
  }
  return { tipo: TIPOS.find(t => t.id === 'outro'), confianca: 0.30 }
}

function extrairCompetencia(nome) {
  const n = nome.toLowerCase()
  const meses = {jan:'01',fev:'02',mar:'03',abr:'04',mai:'05',jun:'06',jul:'07',ago:'08',set:'09',out:'10',nov:'11',dez:'12'}
  let m = n.match(/(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[_\-\s]*(\d{4})/)
  if (m) return meses[m[1]] + '/' + m[2]
  m = n.match(/(\d{4})[_\-\.](\d{2})/)
  if (m) return m[2] + '/' + m[1]
  return ''
}

function BarraConfianca({ valor, label }) {
  const pct = Math.round((valor || 0) * 100)
  const cor = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:6, background:'#e5e7eb', borderRadius:4, overflow:'hidden' }}>
        <div style={{ width:pct+'%', height:'100%', background:cor, borderRadius:4, transition:'width 0.8s ease' }}/>
      </div>
      <span style={{ fontSize:11, fontWeight:700, color:cor, minWidth:32 }}>{pct}%</span>
      {label && <span style={{ fontSize:10, color:'#888' }}>{label}</span>}
    </div>
  )
}

function CampoIA({ label, valor, confianca, editavel, onChange }) {
  const cor = !valor ? '#9ca3af' : confianca >= 0.8 ? '#16a34a' : confianca >= 0.5 ? '#d97706' : '#dc2626'
  return (
    <div style={{ padding:'8px 10px', borderRadius:8, background: valor ? '#f9fafb' : '#fef2f2', border:'1px solid '+(valor?'#e5e7eb':'#fca5a5') }}>
      <div style={{ fontSize:10, color:'#6b7280', fontWeight:700, textTransform:'uppercase', marginBottom:3 }}>{label}</div>
      {editavel && onChange
        ? <input value={valor||''} onChange={e=>onChange(e.target.value)}
            style={{ width:'100%', border:'none', background:'transparent', fontSize:13, fontWeight:600, color:cor, outline:'none', fontFamily:'inherit' }}/>
        : <div style={{ fontSize:13, fontWeight:600, color:cor }}>{valor || '—'}</div>
      }
      {valor && <BarraConfianca valor={confianca}/>}
    </div>
  )
}


function StatusIA({ api }) {
  const [status, setStatus] = React.useState(null)
  React.useEffect(function() {
    fetch(api + '/ai/status').then(r=>r.json()).then(d=>setStatus(d)).catch(()=>{})
  }, [api])
  if(!status) return null
  return (
    <div style={{ padding:12, borderRadius:10, background: status.gemini_configurado?'#f0fdf4':status.anthropic_configurado?'#eff6ff':'#f9fafb',
      border:'1px solid '+(status.gemini_configurado?'#bbf7d0':status.anthropic_configurado?'#bfdbfe':'#e5e7eb') }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#666', marginBottom:4 }}>Status atual do servidor:</div>
      <div style={{ fontWeight:700, fontSize:13, color:status.gemini_configurado?'#16a34a':status.anthropic_configurado?'#1d4ed8':'#6b7280' }}>
        {status.gemini_configurado?'🆓':'status.anthropic_configurado'?'💰':'⚡'} {status.provedor}
      </div>
      <div style={{ fontSize:11, color:'#888' }}>{status.plano}</div>
    </div>
  )
}


// ── VinculoObrigacao: seletor de obrigação do catálogo ──────────────────────
function VinculoObrigacao({ resultado, obrigacaoVinculada, setObrigacaoVinculada }) {
  const NAVY = '#1F4A33'
  const todasObrig = React.useMemo(() => {
    try {
      const cat = JSON.parse(localStorage.getItem('ep_obrigacoes_catalogo_v2')||'{}')
      return Object.values(cat).flat().filter(Boolean).sort((a,b)=>(a.nome||'').localeCompare(b.nome||''))
    } catch(e){ return [] }
  }, [])
  const sugestaoIA = resultado?.obrigacao_match || null
  const sugestaoObj = React.useMemo(() => {
    if (!sugestaoIA || !todasObrig.length) return null
    return todasObrig.find(o =>
      (o.nome||'').toLowerCase().includes(sugestaoIA.toLowerCase().slice(0,10)) ||
      sugestaoIA.toLowerCase().includes((o.nome||'').toLowerCase().slice(0,10))
    ) || null
  }, [sugestaoIA, todasObrig])
  React.useEffect(() => {
    if (sugestaoObj && !obrigacaoVinculada) setObrigacaoVinculada(sugestaoObj)
  }, [sugestaoObj])
  const sel = obrigacaoVinculada
  if (todasObrig.length === 0) return (
    <div style={{ marginBottom:16,padding:12,borderRadius:10,background:'#fffbeb',border:'1px solid #fde68a' }}>
      <div style={{ fontSize:12,color:'#92400e' }}>⚠️ Catálogo vazio — configure em <b>Config. Tarefas</b> para vincular.</div>
    </div>
  )
  return (
    <div style={{ marginBottom:20,padding:16,borderRadius:12,background:'#fff',border:'2px solid '+(sel?NAVY:'#e5e7eb') }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
        <div style={{ fontWeight:700,color:NAVY,fontSize:13 }}>🔗 Vincular à Obrigação do Catálogo</div>
        {sel && <span style={{ fontSize:10,padding:'2px 8px',borderRadius:10,background:'#f0fdf4',color:'#16a34a',fontWeight:700 }}>✅ Vinculado</span>}
      </div>
      {sugestaoIA && sugestaoObj && (
        <div style={{ fontSize:11,color:'#888',marginBottom:8 }}>
          🤖 Sugestão: <b style={{color:NAVY}}>{sugestaoIA}</b>
          {sel?.nome !== sugestaoObj?.nome && (
            <button onClick={()=>setObrigacaoVinculada(sugestaoObj)}
              style={{marginLeft:8,padding:'1px 8px',borderRadius:6,background:'#eff6ff',color:'#1e40af',border:'none',cursor:'pointer',fontSize:10,fontWeight:600}}>
              usar sugestão
            </button>
          )}
        </div>
      )}
      <select value={sel?.nome||''} onChange={e=>setObrigacaoVinculada(todasObrig.find(o=>o.nome===e.target.value)||null)}
        style={{ width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid '+(sel?NAVY:'#ddd'),fontSize:13,background:'#fff',color:sel?NAVY:'#888',fontWeight:sel?600:400,cursor:'pointer' }}>
        <option value=''>— Selecione a obrigação —</option>
        {todasObrig.map(o=>(
          <option key={o.codigo||o.nome} value={o.nome}>
            {o.codigo?'['+o.codigo+'] ':''}{o.nome} ({o.periodicidade||'Mensal'})
          </option>
        ))}
      </select>
      {sel && (
        <div style={{ marginTop:10,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8 }}>
          {[['Departamento',sel.departamento||'—'],['Periodicidade',sel.periodicidade||'—'],['Venc. Jan',sel.dias_entrega?.Janeiro||'Dia 20']].map(([lb,vl])=>(
            <div key={lb} style={{ padding:'6px 10px',borderRadius:6,background:'#f9fafb',border:'1px solid #e5e7eb' }}>
              <div style={{ fontSize:9,color:'#888',fontWeight:700,textTransform:'uppercase' }}>{lb}</div>
              <div style={{ fontSize:11,fontWeight:600,color:NAVY }}>{vl}</div>
            </div>
          ))}
        </div>
      )}
      {!sel && <div style={{ marginTop:8,fontSize:11,color:'#f59e0b' }}>⚠️ Sem vínculo — salvo sem associação à obrigação.</div>}
    </div>
  )
}

// ── ModalCriarTarefa: cria tarefa real em ep_tarefas_entregas ────────────────
function calcVenc(comp, obrig) {
  try {
    const [mm,aaaa]=comp.split('/'); const mes=parseInt(mm),ano=parseInt(aaaa)
    const mesNome=['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][mes-1]
    const diaConf=obrig?.dias_entrega?.[mesNome]||'Todo dia 20'
    if(diaConf==='Nao tem'||diaConf==='Não tem') return null
    let dia=20; if(diaConf.startsWith('Todo dia ')) dia=parseInt(diaConf.replace('Todo dia ',''))||20
    const mesV=obrig?.competencia_ref==='Mes atual'?mes:mes+1; const anoV=mesV>12?ano+1:ano; const mV=mesV>12?1:mesV
    return String(anoV)+'-'+String(mV).padStart(2,'0')+'-'+String(Math.min(dia,new Date(anoV,mV,0).getDate())).padStart(2,'0')
  } catch(e){ return null }
}
function ModalCriarTarefa({ dados, onClose }) {
  const [criando,setCriando]=React.useState(false); const [criado,setCriado]=React.useState(null); const [clienteSel,setClienteSel]=React.useState('')
  const NAVY='#1F4A33'
  const catalogo=React.useMemo(()=>{try{const c=JSON.parse(localStorage.getItem('ep_obrigacoes_catalogo_v2')||'{}');return Object.values(c).flat().filter(Boolean)}catch(e){return[]}},[])
  const clientes=React.useMemo(()=>{try{return JSON.parse(localStorage.getItem('ep_clientes')||'[]')}catch(e){return[]}},[])
  const obrigEncontrada=React.useMemo(()=>{
    const src=dados.obrigacao_obj||null; if(src) return src
    if(!dados.obrigacao) return null; const nm=dados.obrigacao.toLowerCase()
    return catalogo.find(o=>(o.nome||'').toLowerCase().includes(nm.slice(0,12))||nm.includes((o.nome||'').toLowerCase().slice(0,12)))||null
  },[catalogo,dados])
  const clienteMatchObj=React.useMemo(()=>{if(!dados.cliente) return clientes[0]||null; const nm=(dados.cliente||'').toLowerCase(); return clientes.find(c=>(c.nome||'').toLowerCase().includes(nm.slice(0,10)))||clientes[0]||null},[clientes,dados.cliente])
  React.useEffect(()=>{ if(clienteMatchObj) setClienteSel(clienteMatchObj.id||clienteMatchObj.nome||'') },[clienteMatchObj])
  const clienteFinal=clientes.find(c=>(c.id||c.nome)===clienteSel)||clienteMatchObj
  function criarTarefa(){
    if(!clienteFinal){alert('Selecione um cliente');return}; setCriando(true)
    const obrig=obrigEncontrada||{nome:dados.obrigacao,codigo:dados.obrigacao?.slice(0,6).toUpperCase(),periodicidade:'Mensal',passivel_multa:'Nao',dias_entrega:{},competencia_ref:'Mes anterior'}
    const [mm,aaaa]=(dados.competencia||'01/2026').split('/'); const mes=parseInt(mm),ano=parseInt(aaaa)
    const venc=calcVenc(dados.competencia,obrig)
    const idT=(clienteFinal.id||'cli')+'_'+(obrig.codigo||'OBR')+'_'+ano+'_'+String(mes).padStart(2,'0')
    const t={id:idT,cliente_id:clienteFinal.id,cliente:clienteFinal.nome_razao||clienteFinal.nome,cnpj:clienteFinal.cnpj||'',regime:clienteFinal.tributacao||clienteFinal.regime||'',obrigacao:obrig.nome||dados.obrigacao,codigo:obrig.codigo||dados.obrigacao?.slice(0,6).toUpperCase(),periodicidade:obrig.periodicidade||'Mensal',competencia:dados.competencia,vencimento:venc,status:'Pendente',passivel_multa:obrig.passivel_multa==='Sim',notif_whatsapp:false,notif_email:false,exigir_robo:true,documento_robo:dados.arquivo_nome||'',gerado_em:new Date().toISOString(),origem:'robo'}
    try{const ex=JSON.parse(localStorage.getItem('ep_tarefas_entregas')||'[]');localStorage.setItem('ep_tarefas_entregas',JSON.stringify([t,...ex.filter(x=>x.id!==idT)]));setCriado(t)}catch(e){alert('Erro: '+e.message)}
    setCriando(false)
  }
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:'#fff',borderRadius:16,padding:28,maxWidth:480,width:'92%',boxShadow:'0 24px 70px rgba(0,0,0,0.28)' }}>
        {!criado?(<>
          <div style={{ fontSize:36,textAlign:'center',marginBottom:8 }}>📋</div>
          <div style={{ fontWeight:800,color:NAVY,fontSize:16,textAlign:'center',marginBottom:6 }}>Nenhuma tarefa encontrada!</div>
          <div style={{ fontSize:12,color:'#666',textAlign:'center',lineHeight:1.6,marginBottom:14 }}>
            Documento <b>{dados.tipo}</b> vinculado à obrigação <b>{dados.obrigacao}</b>, mas sem tarefa para <b>{dados.competencia}</b>.
          </div>
          <div style={{ padding:12,borderRadius:10,background:obrigEncontrada?'#f0fdf4':'#fffbeb',border:'1px solid '+(obrigEncontrada?'#bbf7d0':'#fde68a'),marginBottom:12 }}>
            <div style={{ fontSize:11,fontWeight:700,color:obrigEncontrada?'#166534':'#92400e',marginBottom:4 }}>{obrigEncontrada?'✅ Obrigação encontrada':'⚠️ Obrigação não encontrada'}</div>
            <div style={{ fontSize:13,fontWeight:700,color:NAVY }}>{obrigEncontrada?.nome||dados.obrigacao}</div>
            {!obrigEncontrada&&<div style={{ fontSize:11,color:'#b45309' }}>Configure o catálogo para melhores resultados.</div>}
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11,fontWeight:700,color:'#555',display:'block',marginBottom:4 }}>🏢 Cliente</label>
            <select value={clienteSel} onChange={e=>setClienteSel(e.target.value)} style={{ width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid #ddd',fontSize:13 }}>
              <option value=''>— Selecione —</option>
              {clientes.map(c=><option key={c.id||c.nome} value={c.id||c.nome}>{c.nome_razao||c.nome} ({c.cnpj||'—'})</option>)}
            </select>
          </div>
          <div style={{ display:'flex',gap:10 }}>
            <button onClick={onClose} style={{ flex:1,padding:'11px 0',borderRadius:8,background:'#f3f4f6',color:'#555',border:'none',cursor:'pointer',fontWeight:600,fontSize:13 }}>Agora não</button>
            <button onClick={criarTarefa} disabled={criando||!clienteFinal} style={{ flex:2,padding:'11px 0',borderRadius:8,background:criando?'#aaa':NAVY,color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:13 }}>
              {criando?'⏳ Criando...':'✅ Criar tarefa agora'}
            </button>
          </div>
        </>):(
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:56,marginBottom:12 }}>✅</div>
            <div style={{ fontWeight:800,color:NAVY,fontSize:16,marginBottom:8 }}>Tarefa criada!</div>
            <div style={{ fontSize:13,color:'#555',marginBottom:16 }}><b>{criado.obrigacao}</b> · <b>{criado.competencia}</b>{criado.vencimento&&<span> · Venc: <b>{new Date(criado.vencimento+'T12:00:00').toLocaleDateString('pt-BR')}</b></span>}</div>
            <div style={{ padding:10,borderRadius:8,background:'#f0fdf4',border:'1px solid #bbf7d0',marginBottom:16,fontSize:12,color:'#166534' }}>📍 Veja em <b>Entregas/Tarefas</b>.</div>
            <button onClick={onClose} style={{ width:'100%',padding:'11px 0',borderRadius:8,background:NAVY,color:'#fff',border:'none',cursor:'pointer',fontWeight:700 }}>Fechar</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function RoboObrigacoes() {
  const [aba, setAba]             = useState('analisar')
  const [arquivo, setArquivo]     = useState(null)
  const [arrastando, setArrastando] = useState(false)
  const [analisando, setAnalisando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [faseMSG, setFaseMSG]     = useState('')
  const [camposEdit, setCamposEdit] = useState({})
  const [historico, setHistorico] = useState(() => ls('ep_robo_hist_v2', []))
  const [biblioteca, setBiblioteca] = useState(() => ls('ep_robo_bib_v2', []))
  const [modalCriarTarefa, setModalCriarTarefa] = useState(null)
  const [obrigacaoVinculada, setObrigacaoVinculada] = useState(null) // obrigação selecionada manualmente // {obrigacao, competencia, tipo}
  const [apiKey, setApiKey]       = useState(() => ls('ep_robo_api_key', ''))
  const [modoIA, setModoIA]       = useState('backend') // backend | local
  const dropRef = useRef(null)
  const fileRef = useRef(null)

  const catalogo = (() => {
    try { return JSON.parse(localStorage.getItem('ep_obrigacoes_catalogo_v2')||'{}') } catch { return {} }
  })()
  const clientes = epGet('ep_clientes', [])

  // Obrigações como lista plana
  const obrigacoesFlat = Object.values(catalogo).flat().filter(Boolean)

  const FASES = [
    '🔍 Lendo o documento...',
    '🧠 IA identificando o tipo...',
    '📋 Extraindo campos fiscais...',
    '🔗 Matching com catálogo...',
    '✅ Análise concluída!'
  ]

  async function lerArquivoBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function analisarDocumento(file) {
    if (!file) return
    setAnalisando(true)
    setResultado(null)
    setCamposEdit({})

    // Animação de fases
    for (let i = 0; i < FASES.length - 1; i++) {
      setFaseMSG(FASES[i])
      await new Promise(r => setTimeout(r, 700))
    }

    try {
      let res = null

      // 1. Tentar backend com IA Claude
      try {
        const b64 = await lerArquivoBase64(file)
        const body = {
          arquivo_b64:  b64,
          arquivo_nome: file.name,
          arquivo_tipo: file.type || 'application/pdf',
          obrigacoes_catalogo: obrigacoesFlat.slice(0, 30).map(o => ({ nome: o.nome || o.codigo, codigo: o.codigo })),
          clientes: clientes.slice(0, 20).map(c => ({ nome: c.nome, cnpj: c.cnpj })),
        }

        // Adicionar API key no header se configurada
        const headers = { 'Content-Type': 'application/json' }
        if (apiKey) headers['x-anthropic-key'] = apiKey

        const r = await fetch(API + '/ai/analisar-documento', {
          method: 'POST', headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(60000),
        })

        if (r.ok) {
          const data = await r.json()
          res = data
        }
      } catch (e) {
        console.warn('[Robô] Backend IA indisponível:', e.message)
      }

      // 2. Fallback: análise heurística local
      if (!res) {
        const { tipo, confianca } = detectarTipoPorNome(file.name)
        const comp = extrairCompetencia(file.name)
        const obrigMatch = obrigacoesFlat.find(o =>
          (o.nome||'').toLowerCase().includes(tipo.id) ||
          (o.codigo||'').toLowerCase().includes(tipo.id)
        )
        res = {
          tipo_documento:      tipo.nome,
          tipo_confianca:      confianca,
          campos:              { nome_documento: file.name, competencia: comp },
          obrigacao_match:     obrigMatch?.nome || null,
          obrigacao_confianca: obrigMatch ? 0.6 : 0,
          cliente_match:       null,
          resumo_ia:           'Análise por padrão do nome. Configure a API Claude para extração completa.',
          modo:                'heuristica',
        }
      }

      setFaseMSG(FASES[FASES.length - 1])
      await new Promise(r => setTimeout(r, 400))
      setResultado({ ...res, arquivo_nome: file.name, arquivo_tipo: file.type, ts: new Date().toLocaleString('pt-BR') })
      setCamposEdit(res.campos || {})

    } catch (e) {
      setResultado({ erro: e.message })
    }

    setAnalisando(false)
  }

  function onDrop(e) {
    e.preventDefault()
    setArrastando(false)
    const f = e.dataTransfer.files[0]
    if (f) { setArquivo(f); analisarDocumento(f) }
  }

  function onFileChange(e) {
    const f = e.target.files[0]
    if (f) { setArquivo(f); analisarDocumento(f) }
  }

  function salvarNaBiblioteca() {
    if (!resultado) return
    const campos = { ...camposEdit }
    const item = {
      id: Date.now(),
      arquivo_nome: resultado.arquivo_nome,
      tipo: resultado.tipo_documento,
      tipo_confianca: resultado.tipo_confianca,
      campos,
      obrigacao: obrigacaoVinculada?.nome || resultado.obrigacao_match,
      obrigacao_obj: obrigacaoVinculada || null,
      cliente: resultado.cliente_match,
      resumo: resultado.resumo_ia,
      modo: resultado.modo,
      ts: resultado.ts,
      status: 'na_biblioteca',
    }

    // 1. Salvar na biblioteca
    const novaBib = [item, ...biblioteca]
    setBiblioteca(novaBib)
    lss('ep_robo_bib_v2', novaBib)

    // 2. Salvar no histórico
    const novH = [{ ...item, status: 'concluido' }, ...historico]
    setHistorico(novH)
    lss('ep_robo_hist_v2', novH)

    // 3. Vincular documento à obrigação permanentemente
    if (resultado.obrigacao_match) {
      const vinculo = ls('ep_robo_vinculo', {})
      const key = obrigacaoVinculada?.nome || resultado.obrigacao_match
      vinculo[key] = [item, ...(vinculo[key]||[]).slice(0, 49)]
      lss('ep_robo_vinculo', vinculo)
    }

    // 4. Verificar se existe tarefa para este período
    const comp = campos.competencia || ''
    const obrig = resultado.obrigacao_match
    if (obrig && comp) {
      const tarefas = ls('ep_tarefas_entregas', [])
      const clienteMatch = resultado.cliente_match || clientes[0]?.nome || ''
      const temTarefa = tarefas.some(t =>
        (t.obrigacao||'').toLowerCase().includes(obrig.toLowerCase().slice(0,8)) &&
        (t.competencia||'') === comp
      )
      if (!temTarefa) {
        setModalCriarTarefa({ obrigacao: obrig, competencia: comp, tipo: resultado.tipo_documento, cliente: clienteMatch, arquivo_nome: resultado.arquivo_nome, obrigacao_obj: obrigacaoVinculada })
        setResultado(null)
        setArquivo(null)
        return
      }
    }

    setResultado(null)
    setArquivo(null)
    alert('✅ Documento salvo e vinculado à obrigação permanentemente!')
  }

  function marcarEntregue() {
    if (!resultado) return
    const novH = [{ id: Date.now(), arquivo_nome: resultado.arquivo_nome, tipo: resultado.tipo_documento, campos: camposEdit, obrigacao: resultado.obrigacao_match, ts: resultado.ts, status: 'entregue', modo: resultado.modo }, ...historico]
    setHistorico(novH)
    lss('ep_robo_hist_v2', novH)
    setResultado(null)
    setArquivo(null)
  }

  function novaAnalise() { setResultado(null); setArquivo(null); setAnalisando(false); setObrigacaoVinculada(null) }

  const tipoInfo = resultado ? TIPOS.find(t => t.nome === resultado.tipo_documento) || TIPOS.find(t=>t.id==='outro') : null

  return (
    <div style={{ fontFamily:'Inter, system-ui, sans-serif', height:'calc(100vh - 44px)', display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <div style={{ background: NAVY, padding:'14px 24px', display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
        <div style={{ width:42, height:42, borderRadius:12, background:GOLD, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🤖</div>
        <div>
          <div style={{ color:'#fff', fontWeight:800, fontSize:15 }}>Robô de Obrigações — IA</div>
          <div style={{ color:GOLD, fontSize:11 }}>Detecção automática · Extração de campos · Matching inteligente</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          {[{n:biblioteca.length,l:'Biblioteca'},{n:historico.filter(h=>h.status==='entregue').length,l:'Entregues'},{n:historico.filter(h=>h.modo==='claude').length,l:'Analisados IA'}].map(s=>(
            <div key={s.l} style={{ textAlign:'center', padding:'6px 14px', borderRadius:10, background:'rgba(255,255,255,0.08)' }}>
              <div style={{ color:GOLD, fontWeight:800, fontSize:16 }}>{s.n}</div>
              <div style={{ color:'rgba(255,255,255,0.5)', fontSize:10 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Abas */}
      <div style={{ background:'#fff', borderBottom:'2px solid #f0f0f0', display:'flex', paddingLeft:16, flexShrink:0 }}>
        {[['analisar','🔍 Analisar'],['biblioteca','📚 Biblioteca'],['historico','🕐 Histórico'],['config','⚙️ Config IA']].map(([id,lb])=>(
          <button key={id} onClick={()=>setAba(id)}
            style={{ padding:'10px 16px', border:'none', background:'none', cursor:'pointer', fontSize:13, fontWeight:aba===id?700:400,
              color:aba===id?NAVY:'#888', borderBottom:aba===id?'2px solid '+NAVY:'none', marginBottom:-2 }}>
            {lb}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflow:'auto', padding:24 }}>

        {/* ── ABA ANALISAR ────────────────────────────────────────────────── */}
        {aba==='analisar' && (
          <div style={{ maxWidth:800, margin:'0 auto' }}>

            {/* Estado: aguardando arquivo */}
            {!arquivo && !analisando && !resultado && (
              <div>
                {/* Zona de drop */}
                <div ref={dropRef}
                  onDragOver={e=>{e.preventDefault();setArrastando(true)}}
                  onDragLeave={()=>setArrastando(false)}
                  onDrop={onDrop}
                  onClick={()=>fileRef.current?.click()}
                  style={{ border:'2px dashed '+(arrastando?GOLD:NAVY+'60'), borderRadius:20, padding:'60px 40px',
                    textAlign:'center', cursor:'pointer', transition:'all 0.3s',
                    background:arrastando?GOLD+'08':NAVY+'04',
                    transform:arrastando?'scale(1.02)':'scale(1)' }}>
                  <div style={{ fontSize:64, marginBottom:16 }}>{arrastando?'📂':'🤖'}</div>
                  <div style={{ fontSize:20, fontWeight:800, color:NAVY, marginBottom:8 }}>
                    {arrastando ? 'Solte o documento aqui!' : 'Arraste o documento ou clique para selecionar'}
                  </div>
                  <div style={{ fontSize:13, color:'#888', marginBottom:20 }}>PDF · XML · Imagem · TXT · XLSX</div>
                  <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                    {TIPOS.slice(0,8).map(t=>(
                      <span key={t.id} style={{ padding:'4px 12px', borderRadius:20, background:t.cor+'15', color:t.cor, fontSize:11, fontWeight:600 }}>
                        {t.icon} {t.nome}
                      </span>
                    ))}
                  </div>
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.xml,.txt,.xlsx,.png,.jpg,.jpeg" style={{ display:'none' }} onChange={onFileChange}/>

                {/* Como funciona */}
                <div style={{ marginTop:24, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
                  {[
                    { icon:'🔍', titulo:'Detecção automática', desc:'IA identifica o tipo do documento sem você precisar selecionar nada — DAS, DARF, NF-e, CAGED, eSocial...' },
                    { icon:'📋', titulo:'Extração de campos', desc:'Claude lê o conteúdo do PDF e extrai vencimento, valor, CNPJ, competência, código de barras e muito mais.' },
                    { icon:'🔗', titulo:'Matching inteligente', desc:'Vincula automaticamente ao cliente e à obrigação correspondente no catálogo do sistema.' },
                  ].map(c=>(
                    <div key={c.titulo} style={{ padding:16, borderRadius:12, background:'#f9fafb', border:'1px solid #e5e7eb' }}>
                      <div style={{ fontSize:28, marginBottom:8 }}>{c.icon}</div>
                      <div style={{ fontWeight:700, color:NAVY, fontSize:13, marginBottom:6 }}>{c.titulo}</div>
                      <div style={{ fontSize:11, color:'#666', lineHeight:1.6 }}>{c.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estado: analisando */}
            {analisando && (
              <div style={{ textAlign:'center', padding:'60px 40px' }}>
                <div style={{ fontSize:72, marginBottom:24, animation:'none' }}>🤖</div>
                <div style={{ fontSize:20, fontWeight:800, color:NAVY, marginBottom:12 }}>Analisando documento...</div>
                <div style={{ fontSize:14, color:GOLD, fontWeight:600, marginBottom:24 }}>{faseMSG}</div>
                <div style={{ maxWidth:320, margin:'0 auto' }}>
                  <div style={{ height:8, background:'#e5e7eb', borderRadius:8, overflow:'hidden' }}>
                    <div style={{ height:'100%', background:'linear-gradient(90deg,'+NAVY+','+GOLD+')', borderRadius:8, width:'100%',
                      animation:'progress 2s ease-in-out infinite' }}/>
                  </div>
                </div>
                <div style={{ marginTop:20, fontSize:12, color:'#888' }}>Arquivo: {arquivo?.name}</div>
                <style>{' @keyframes progress { 0%{width:0%} 50%{width:100%} 100%{width:0%} } '}</style>
              </div>
            )}

            {/* Estado: resultado */}
            {resultado && !analisando && (
              <div>
                {resultado.erro ? (
                  <div style={{ padding:24, borderRadius:12, background:'#fef2f2', border:'1px solid #fca5a5', textAlign:'center' }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>❌</div>
                    <div style={{ fontWeight:700, color:'#dc2626' }}>Erro na análise</div>
                    <div style={{ color:'#666', fontSize:13, marginTop:8 }}>{resultado.erro}</div>
                    <button onClick={novaAnalise} style={{ marginTop:16, padding:'8px 20px', borderRadius:8, background:NAVY, color:'#fff', border:'none', cursor:'pointer', fontWeight:600 }}>Tentar novamente</button>
                  </div>
                ) : (
                  <div>
                    {/* Cabeçalho do resultado */}
                    <div style={{ padding:20, borderRadius:16, background:'linear-gradient(135deg,'+NAVY+','+NAVY+'cc)', color:'#fff', marginBottom:20, display:'flex', alignItems:'center', gap:16 }}>
                      <div style={{ width:56, height:56, borderRadius:14, background:tipoInfo?.cor+'33', border:'2px solid '+(tipoInfo?.cor||GOLD), display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>{tipoInfo?.icon||'📄'}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:18, fontWeight:800 }}>{resultado.tipo_documento}</div>
                        <div style={{ fontSize:12, color:GOLD, marginTop:2 }}>{resultado.arquivo_nome}</div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginTop:4 }}>{resultado.resumo_ia}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', marginBottom:4 }}>Confiança do tipo</div>
                        <div style={{ fontSize:28, fontWeight:800, color:GOLD }}>{Math.round((resultado.tipo_confianca||0)*100)}%</div>
                        <div style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:resultado.modo==='claude'?GOLD+'33':'rgba(255,255,255,0.1)', color:resultado.modo==='claude'?GOLD:'rgba(255,255,255,0.5)', marginTop:4 }}>
                          {resultado.modo==='claude'?'🧠 Claude AI':'⚡ Heurística'}
                        </div>
                      </div>
                    </div>

                    {/* ── Vínculo manual com Obrigação do Catálogo ─────────────── */}
                    <VinculoObrigacao
                      resultado={resultado}
                      obrigacaoVinculada={obrigacaoVinculada}
                      setObrigacaoVinculada={setObrigacaoVinculada}
                    />

                    {/* Matching */}
                    {(resultado.obrigacao_match||resultado.cliente_match) && (
                      <div style={{ display:'grid', gridTemplateColumns:resultado.obrigacao_match&&resultado.cliente_match?'1fr 1fr':'1fr', gap:12, marginBottom:20 }}>
                        {resultado.obrigacao_match && (
                          <div style={{ padding:14, borderRadius:12, background:'#f0fdf4', border:'1px solid #bbf7d0' }}>
                            <div style={{ fontSize:10, fontWeight:700, color:'#166534', textTransform:'uppercase', marginBottom:6 }}>🔗 Obrigação vinculada</div>
                            <div style={{ fontWeight:700, color:'#166534', fontSize:14 }}>{resultado.obrigacao_match}</div>
                            <BarraConfianca valor={resultado.obrigacao_confianca} label="matching"/>
                          </div>
                        )}
                        {resultado.cliente_match && (
                          <div style={{ padding:14, borderRadius:12, background:'#eff6ff', border:'1px solid #bfdbfe' }}>
                            <div style={{ fontSize:10, fontWeight:700, color:'#1e40af', textTransform:'uppercase', marginBottom:6 }}>🏢 Cliente identificado</div>
                            <div style={{ fontWeight:700, color:'#1e40af', fontSize:14 }}>{resultado.cliente_match}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Campos extraídos */}
                    <div style={{ marginBottom:20 }}>
                      <div style={{ fontWeight:700, color:NAVY, fontSize:13, marginBottom:12 }}>📋 Campos extraídos pela IA <span style={{ fontSize:11, fontWeight:400, color:'#888' }}>(editáveis)</span></div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                        {Object.entries({
                          competencia:'Competência', vencimento:'Vencimento', valor:'Valor',
                          cnpj:'CNPJ', razao_social:'Razão Social', tipo_tributo:'Tipo Tributo',
                          codigo_barras:'Cód. Barras', numero_doc:'Nº Documento', codigo_receita:'Cód. Receita',
                          valor_multa:'Multa', valor_juros:'Juros', responsavel:'Responsável',
                        }).map(([k,lb]) => (camposEdit[k] !== undefined || resultado.campos?.[k]) && (
                          <CampoIA key={k} label={lb} valor={camposEdit[k]??resultado.campos?.[k]??''}
                            confianca={0.85} editavel={true}
                            onChange={v => setCamposEdit(p => ({...p,[k]:v}))}/>
                        ))}
                      </div>
                    </div>

                    {/* Ações */}
                    <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                      <button onClick={salvarNaBiblioteca} style={{ flex:1, padding:'12px 20px', borderRadius:10, background:NAVY, color:'#fff', border:'none', cursor:'pointer', fontWeight:700, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                        📚 Salvar na Biblioteca
                      </button>
                      <button onClick={marcarEntregue} style={{ flex:1, padding:'12px 20px', borderRadius:10, background:'#22c55e', color:'#fff', border:'none', cursor:'pointer', fontWeight:700, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                        ✅ Marcar como Entregue
                      </button>
                      <button onClick={novaAnalise} style={{ padding:'12px 20px', borderRadius:10, background:'#f0f0f0', color:'#555', border:'none', cursor:'pointer', fontWeight:600, fontSize:14 }}>
                        🔄 Nova Análise
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── MODAL CRIAR TAREFA ─────────────────────────────────────────── */}
        {modalCriarTarefa && (
          <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center' }}>
            <div style={{ background:'#fff',borderRadius:16,padding:28,maxWidth:440,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
              <div style={{ fontSize:36,textAlign:'center',marginBottom:12 }}>⚠️</div>
              <div style={{ fontWeight:800,color:NAVY,fontSize:16,textAlign:'center',marginBottom:8 }}>
                Nenhuma tarefa encontrada!
              </div>
              <div style={{ fontSize:13,color:'#555',textAlign:'center',lineHeight:1.6,marginBottom:20 }}>
                O documento <b>{modalCriarTarefa.tipo}</b> foi salvo na biblioteca e vinculado à obrigação <b>{modalCriarTarefa.obrigacao}</b>,
                mas não existe tarefa para o período <b>{modalCriarTarefa.competencia}</b>.
              </div>
              <div style={{ padding:14,borderRadius:10,background:'#f0fdf4',border:'1px solid #bbf7d0',marginBottom:20 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'#166534',marginBottom:6 }}>📋 Detalhes</div>
                <div style={{ fontSize:12,color:'#333' }}>Obrigação: <b>{modalCriarTarefa.obrigacao}</b></div>
                <div style={{ fontSize:12,color:'#333' }}>Competência: <b>{modalCriarTarefa.competencia}</b></div>
                {modalCriarTarefa.cliente && <div style={{ fontSize:12,color:'#333' }}>Cliente: <b>{modalCriarTarefa.cliente}</b></div>}
              </div>
              <div style={{ display:'flex',gap:10 }}>
                <button onClick={()=>setModalCriarTarefa(null)}
                  style={{ flex:1,padding:'10px 0',borderRadius:8,background:'#f3f4f6',color:'#555',border:'none',cursor:'pointer',fontWeight:600,fontSize:13 }}>
                  Agora não
                </button>
                <button onClick={()=>{
                  setModalCriarTarefa(null)
                  // Salvar pendência para GerarObrigacoes usar como sugestão
                  const pendentes = ls('ep_robo_pendentes_tarefa', [])
                  pendentes.unshift(modalCriarTarefa)
                  lss('ep_robo_pendentes_tarefa', pendentes.slice(0,20))
                  alert('✅ Pendência registrada! Acesse Gerar Obrigações para criar a tarefa.')
                }}
                  style={{ flex:1,padding:'10px 0',borderRadius:8,background:'#22c55e',color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:13 }}>
                  ✅ Registrar e criar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ABA BIBLIOTECA ──────────────────────────────────────────────── */}
        {aba==='biblioteca' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontWeight:800, color:NAVY, fontSize:16 }}>📚 Biblioteca Permanente</div>
              <div style={{ fontSize:12, color:'#888' }}>Documentos salvos não são solicitados novamente</div>
            </div>
            {biblioteca.length === 0 ? (
              <div style={{ textAlign:'center', padding:60, color:'#aaa' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>📚</div>
                <div>Nenhum documento na biblioteca ainda.</div>
                <div style={{ fontSize:12, marginTop:8 }}>Analise um documento e clique em "Salvar na Biblioteca".</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {biblioteca.map(item => {
                  const t = TIPOS.find(t=>t.nome===item.tipo)||TIPOS.find(t=>t.id==='outro')
                  return (
                    <div key={item.id} style={{ padding:16, borderRadius:12, background:'#fff', border:'1px solid #e5e7eb', display:'flex', gap:14, alignItems:'center' }}>
                      <div style={{ width:44, height:44, borderRadius:10, background:t.cor+'15', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{t.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, color:NAVY, fontSize:13 }}>{item.arquivo_nome}</div>
                        <div style={{ fontSize:11, color:'#888', marginTop:2 }}>
                          {item.tipo} · {item.campos?.competencia||'—'} · {item.ts}
                          {item.obrigacao && <span style={{ marginLeft:8, color:'#16a34a' }}>🔗 {item.obrigacao}</span>}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        <span style={{ padding:'3px 10px', borderRadius:6, background:'#f0fdf4', color:'#16a34a', fontSize:11, fontWeight:600 }}>✅ Biblioteca</span>
                        <button onClick={()=>{const n=biblioteca.filter(b=>b.id!==item.id);setBiblioteca(n);lss('ep_robo_bib_v2',n)}}
                          style={{ padding:'3px 8px', borderRadius:6, background:'#fef2f2', color:'#dc2626', border:'none', cursor:'pointer', fontSize:11 }}>✕</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ABA HISTÓRICO ───────────────────────────────────────────────── */}
        {aba==='historico' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontWeight:800, color:NAVY, fontSize:16 }}>🕐 Histórico de Análises</div>
              <button onClick={()=>{if(confirm('Limpar histórico?')){setHistorico([]);lss('ep_robo_hist_v2',[])}}}
                style={{ padding:'6px 14px', borderRadius:8, background:'#fef2f2', color:'#dc2626', border:'1px solid #fca5a5', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                🗑️ Limpar histórico
              </button>
            </div>
            {historico.length === 0 ? (
              <div style={{ textAlign:'center', padding:60, color:'#aaa' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🕐</div>
                <div>Nenhuma análise realizada ainda.</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {historico.map(h=>{
                  const t = TIPOS.find(t=>t.nome===h.tipo)||TIPOS.find(t=>t.id==='outro')
                  return (
                    <div key={h.id} style={{ padding:14, borderRadius:10, background:'#fff', border:'1px solid #e5e7eb', display:'flex', gap:12, alignItems:'center' }}>
                      <span style={{ fontSize:20 }}>{t?.icon||'📄'}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, color:NAVY, fontSize:13 }}>{h.arquivo_nome}</div>
                        <div style={{ fontSize:11, color:'#888' }}>{h.tipo} · {h.campos?.competencia||'—'} · {h.ts}</div>
                      </div>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <span style={{ padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:600,
                          background:h.modo==='claude'?GOLD+'20':'#f3f4f6',
                          color:h.modo==='claude'?'#92400e':'#666' }}>
                          {h.modo==='claude'?'🧠 Claude':'⚡ Padrão'}
                        </span>
                        <span style={{ padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:600,
                          background:h.status==='entregue'?'#f0fdf4':h.status==='na_biblioteca'?'#eff6ff':'#f9fafb',
                          color:h.status==='entregue'?'#16a34a':h.status==='na_biblioteca'?'#1e40af':'#666' }}>
                          {h.status==='entregue'?'✅ Entregue':h.status==='na_biblioteca'?'📚 Biblioteca':'📄'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ABA CONFIG ──────────────────────────────────────────────────── */}
        {aba==='config' && (
          <div style={{ maxWidth:660 }}>
            <div style={{ fontWeight:800, color:NAVY, fontSize:16, marginBottom:20 }}>⚙️ Configuração da IA</div>

            {/* Cards de opções */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:20 }}>
              {[
                { icon:'🆓', titulo:'Gemini Flash', subtitulo:'GRATUITO', desc:'1.500 req/dia sem custo. Lê PDF e imagens. Recomendado!', cor:'#16a34a', bg:'#f0fdf4', brd:'#bbf7d0', var:'GOOGLE_AI_KEY', url:'aistudio.google.com' },
                { icon:'💰', titulo:'Claude Haiku', subtitulo:'~$0,25/1M tokens', desc:'Mais barato da Anthropic. Excelente qualidade. Suporte a PDF nativo.', cor:'#1d4ed8', bg:'#eff6ff', brd:'#bfdbfe', var:'ANTHROPIC_API_KEY', url:'console.anthropic.com' },
                { icon:'⚡', titulo:'Heurística', subtitulo:'100% Gratuito', desc:'Sem IA. Detecta pelo nome do arquivo. Funciona offline, sem API key.', cor:'#6b7280', bg:'#f9fafb', brd:'#e5e7eb', var:'—', url:'' },
              ].map(o=>(
                <div key={o.titulo} style={{ padding:16, borderRadius:12, background:o.bg, border:'2px solid '+o.brd }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>{o.icon}</div>
                  <div style={{ fontWeight:800, color:o.cor, fontSize:14 }}>{o.titulo}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:o.cor+'bb', marginBottom:8 }}>{o.subtitulo}</div>
                  <div style={{ fontSize:11, color:'#555', lineHeight:1.5, marginBottom:10 }}>{o.desc}</div>
                  {o.url && <a href={'https://'+o.url} target="_blank" rel="noreferrer"
                    style={{ fontSize:10, color:o.cor, textDecoration:'underline' }}>{o.url}</a>}
                </div>
              ))}
            </div>

            {/* Prioridade */}
            <div style={{ padding:14, borderRadius:10, background:'#f0fdf4', border:'1px solid #bbf7d0', marginBottom:20 }}>
              <div style={{ fontWeight:700, color:'#166534', fontSize:12, marginBottom:8 }}>🔄 Prioridade automática</div>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#555' }}>
                <span style={{ padding:'3px 10px', borderRadius:20, background:'#16a34a', color:'#fff', fontWeight:700, fontSize:11 }}>1° Gemini Flash</span>
                <span>→ se GOOGLE_AI_KEY configurado</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#555', marginTop:6 }}>
                <span style={{ padding:'3px 10px', borderRadius:20, background:'#1d4ed8', color:'#fff', fontWeight:700, fontSize:11 }}>2° Claude Haiku</span>
                <span>→ se ANTHROPIC_API_KEY configurado</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#555', marginTop:6 }}>
                <span style={{ padding:'3px 10px', borderRadius:20, background:'#6b7280', color:'#fff', fontWeight:700, fontSize:11 }}>3° Heurística</span>
                <span>→ sempre disponível, sem configuração</span>
              </div>
            </div>

            {/* Instrução configuração */}
            <div style={{ padding:14, borderRadius:10, background:'#fffbeb', border:'1px solid #fde68a', marginBottom:20 }}>
              <div style={{ fontWeight:700, color:'#92400e', fontSize:13, marginBottom:10 }}>🔑 Como configurar (Railway → Variables)</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:11, color:'#16a34a', marginBottom:4 }}>🆓 Gemini Flash (RECOMENDADO)</div>
                  <ol style={{ fontSize:11, color:'#555', lineHeight:1.9, paddingLeft:16, margin:0 }}>
                    <li>Acesse <b>aistudio.google.com</b></li>
                    <li>Clique em <b>Get API Key</b> → grátis</li>
                    <li>No Railway → Variables → adicione:</li>
                    <li><code style={{ background:'#fff', padding:'1px 6px', borderRadius:4, fontSize:10 }}>GOOGLE_AI_KEY = AIza...</code></li>
                  </ol>
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:11, color:'#1d4ed8', marginBottom:4 }}>💰 Claude Haiku (alternativa)</div>
                  <ol style={{ fontSize:11, color:'#555', lineHeight:1.9, paddingLeft:16, margin:0 }}>
                    <li>Acesse <b>console.anthropic.com</b></li>
                    <li>Crie uma API Key</li>
                    <li>No Railway → Variables → adicione:</li>
                    <li><code style={{ background:'#fff', padding:'1px 6px', borderRadius:4, fontSize:10 }}>ANTHROPIC_API_KEY = sk-ant-...</code></li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Status atual */}
            <StatusIA api={API}/>

            {/* Tipos */}
            <div style={{ padding:14, borderRadius:10, background:'#f9fafb', border:'1px solid #e5e7eb', marginTop:20 }}>
              <div style={{ fontWeight:700, color:NAVY, fontSize:13, marginBottom:10 }}>🗂️ Tipos detectados automaticamente</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                {TIPOS.filter(t=>t.id!=='outro').map(t=>(
                  <div key={t.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 8px', borderRadius:6, background:'#fff', border:'1px solid #e5e7eb' }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:t.cor, flexShrink:0 }}/>
                    <span style={{ fontSize:11, color:'#333' }}>{t.nome}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
