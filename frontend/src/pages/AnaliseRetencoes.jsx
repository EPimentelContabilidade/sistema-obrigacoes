import { useState, useEffect, useRef } from 'react'
import { Search, Plus, FileText, Upload, Trash2, CheckCircle, Clock, Download } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'
const inp = { padding:'8px 11px', borderRadius:7, border:'1px solid #ddd', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', color:'#333' }
const sel = { ...inp, cursor:'pointer', background:'#fff' }

// ── Helpers ───────────────────────────────────────────────────────────────────
function getClientes() { try { return JSON.parse(localStorage.getItem('ep_clientes')||'[]') } catch { return [] } }
function fmtMoeda(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }
function fmtData(iso) { try { return new Date(iso).toLocaleDateString('pt-BR') } catch { return '—' } }

const RETENCOES_TIPO = [
  { codigo:'INSS',    label:'INSS',              aliquota_padrao:11,  cor:'#1D6FA4', bg:'#EBF5FF' },
  { codigo:'ISS',     label:'ISS',               aliquota_padrao:5,   cor:'#1A7A3C', bg:'#EDFBF1' },
  { codigo:'IRRF',    label:'IRRF',              aliquota_padrao:1.5, cor:'#6B3EC9', bg:'#F3EEFF' },
  { codigo:'PIS',     label:'PIS',               aliquota_padrao:0.65,cor:'#854D0E', bg:'#FEF9C3' },
  { codigo:'COFINS',  label:'COFINS',            aliquota_padrao:3,   cor:'#C2410C', bg:'#FFF7ED' },
  { codigo:'CSLL',    label:'CSLL',              aliquota_padrao:1,   cor:'#7C3AED', bg:'#EDE9FF' },
]

const FORM_VAZIO = {
  cliente_id:'', cliente_nome:'', fornecedor:'', numero_nf:'', data_emissao:'',
  competencia:'', valor_bruto:'', descricao:'', tipo_servico:'',
  retencoes:[], obs:'',
}

// ── Análise IA ────────────────────────────────────────────────────────────────
async function analisarComIA(dados, textoExtraido='') {
  const prompt = `Você é um especialista em tributação brasileira da EPimentel Auditoria & Contabilidade.

Analise esta Nota Fiscal/Documento e identifique TODAS as retenções tributárias aplicáveis:

DADOS DA NF:
${textoExtraido ? `Texto extraído do documento:\n${textoExtraido}\n` : ''}
Cliente/Tomador: ${dados.cliente_nome || 'Não informado'}
Fornecedor/Prestador: ${dados.fornecedor || 'Não informado'}
Número NF: ${dados.numero_nf || 'Não informado'}
Descrição do Serviço: ${dados.descricao || 'Não informado'}
Tipo de Serviço: ${dados.tipo_servico || 'Não informado'}
Valor Bruto: R$ ${dados.valor_bruto || '0'}
Competência: ${dados.competencia || 'Não informado'}

INSTRUÇÕES:
1. Identifique quais tributos devem ser retidos: INSS, ISS, IRRF, PIS, COFINS, CSLL
2. Para cada retenção, informe: alíquota aplicável, base de cálculo, valor calculado e fundamentação legal
3. Indique se o prestador é PF ou PJ e como isso afeta as retenções
4. Alerte sobre qualquer irregularidade ou ponto de atenção
5. Sugira a competência para cada obrigação

Responda em JSON com esta estrutura exata:
{
  "tipo_prestador": "PF" ou "PJ",
  "regime_tributario": "Simples Nacional" ou "Lucro Presumido" ou "Lucro Real" ou "desconhecido",
  "retencoes": [
    {
      "codigo": "INSS",
      "label": "INSS sobre Serviços",
      "aliquota": 11,
      "base_calculo": 1000.00,
      "valor": 110.00,
      "fundamentacao": "Lei 9.711/1998 - Art. 31",
      "aplicavel": true,
      "observacao": "..."
    }
  ],
  "total_retencoes": 0.00,
  "valor_liquido": 0.00,
  "alertas": ["alerta 1", "alerta 2"],
  "recomendacoes": "texto",
  "competencias_obrigacoes": {
    "INSS": "DCTF Web - dia 15 mês seguinte",
    "ISS": "NOTA FISCAL - dia 10 mês seguinte"
  }
}`

  const r = await fetch((import.meta.env.VITE_API_URL || '') + '/api/v1/retencoes/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  const d = await r.json()
  const texto = d.content?.[0]?.text || ''
  try {
    const jsonMatch = texto.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch {}
  return { erro: texto, retencoes: [] }
}

// ── Componente Principal ──────────────────────────────────────────────────────
export default function AnaliseRetencoes() {
  const [analises, setAnalises] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ep_analises_retencoes')||'[]') } catch { return [] }
  })
  const [form, setForm] = useState({...FORM_VAZIO})
  const [clientes] = useState(getClientes)
  const [analisando, setAnalisando] = useState(false)
  const [resultadoIA, setResultadoIA] = useState(null)
  const [abaAtiva, setAbaAtiva] = useState('nova')
  const [analiseSel, setAnaliseSel] = useState(null)
  const [busca, setBusca] = useState('')
  const [textoExtraido, setTextoExtraido] = useState('')
  const [arquivoNome, setArquivoNome] = useState('')
  const [modalCriarObrig, setModalCriarObrig] = useState(null)
  const [retencoesSel, setRetencoesSel] = useState([])
  const fileRef = useRef()

  const setF = (k, v) => setForm(f => ({...f, [k]: v}))

  const salvarAnalises = lista => {
    setAnalises(lista)
    localStorage.setItem('ep_analises_retencoes', JSON.stringify(lista))
  }

  // ── Upload de arquivo ─────────────────────────────────────────────────────
  const handleArquivo = async (file) => {
    setArquivoNome(file.name)
    if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = async ev => {
        const base64 = ev.target.result.split(',')[1]
        const isPDF = file.type === 'application/pdf'
        try {
          const content = isPDF
            ? [{ type:'document', source:{ type:'base64', media_type:'application/pdf', data:base64 } }, { type:'text', text:'Extraia todos os dados desta Nota Fiscal: número, fornecedor, tomador, descrição do serviço, valor bruto, data, e quaisquer tributos mencionados. Retorne em texto estruturado.' }]
            : [{ type:'image', source:{ type:'base64', media_type:file.type, data:base64 } }, { type:'text', text:'Extraia todos os dados desta Nota Fiscal: número, fornecedor, tomador, descrição do serviço, valor bruto, data, e quaisquer tributos mencionados.' }]
          const r = await fetch((import.meta.env.VITE_API_URL || '') + '/api/v1/retencoes/proxy', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1500, messages:[{ role:'user', content }] })
          })
          const d = await r.json()
          const texto = d.content?.[0]?.text || ''
          setTextoExtraido(texto)
          // Auto-preencher campos se possível
          const numMatch = texto.match(/(?:NF|Nota|Número)[^\d]*(\d{3,})/i)
          const valorMatch = texto.match(/(?:valor|total)[^\d]*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i)
          if (numMatch) setF('numero_nf', numMatch[1])
          if (valorMatch) setF('valor_bruto', valorMatch[1].replace(/\./g,'').replace(',','.'))
        } catch(e) { setTextoExtraido('Erro ao extrair: ' + e.message) }
      }
      reader.readAsDataURL(file)
    } else if (file.name.endsWith('.xml')) {
      const reader = new FileReader()
      reader.onload = ev => {
        const xml = ev.target.result
        setTextoExtraido(xml.substring(0, 3000))
        // Extrair valor do XML de NF-e
        const valMatch = xml.match(/<vNF>([\d.]+)<\/vNF>/)
        const numMatch = xml.match(/<nNF>(\d+)<\/nNF>/)
        const fornMatch = xml.match(/<xNome>(.*?)<\/xNome>/)
        if (valMatch) setF('valor_bruto', valMatch[1])
        if (numMatch) setF('numero_nf', numMatch[1])
        if (fornMatch) setF('fornecedor', fornMatch[1])
      }
      reader.readAsText(file)
    }
  }

  // ── Executar análise IA ───────────────────────────────────────────────────
  const executarAnalise = async () => {
    if (!form.valor_bruto || (!form.descricao && !textoExtraido)) {
      alert('Preencha pelo menos o valor bruto e a descrição do serviço.')
      return
    }
    setAnalisando(true)
    setResultadoIA(null)
    try {
      const resultado = await analisarComIA(form, textoExtraido)
      setResultadoIA(resultado)
      if (!resultado.erro) {
        const retsAplicaveis = (resultado.retencoes || []).filter(r => r.aplicavel)
        setRetencoesSel(retsAplicaveis.map(r => r.codigo))
      }
    } catch(e) {
      setResultadoIA({ erro: e.message, retencoes: [] })
    }
    setAnalisando(false)
  }

  // ── Salvar análise ────────────────────────────────────────────────────────
  const salvarAnalise = () => {
    if (!resultadoIA || resultadoIA.erro) return
    const nova = {
      id: Date.now(),
      ...form,
      resultado_ia: resultadoIA,
      arquivo: arquivoNome,
      data_analise: new Date().toISOString(),
      status: 'analisada',
      obrigacoes_criadas: [],
    }
    salvarAnalises([nova, ...analises])
    setForm({...FORM_VAZIO})
    setResultadoIA(null)
    setTextoExtraido('')
    setArquivoNome('')
    setAbaAtiva('historico')
    setAnaliseSel(nova)
  }

  // ── Criar obrigação no ep_tarefas_entregas ────────────────────────────────
  const criarObrigacao = (retencao) => {
    if (!analiseSel?.cliente_id) { alert('Selecione um cliente para criar a obrigação.'); return }
    const competencia = analiseSel.competencia || new Date().toISOString().slice(0,7)
    const [ano, mes] = competencia.split('-')
    const mesComp = `${mes}/${ano}`

    // Calcular vencimento (dia 15 do mês seguinte para maioria)
    const vencMap = { INSS:'15', ISS:'10', IRRF:'20', PIS:'20', COFINS:'20', CSLL:'20' }
    const diaVenc = vencMap[retencao.codigo] || '20'
    const mesVenc = parseInt(mes) === 12 ? `${parseInt(ano)+1}-01` : `${ano}-${String(parseInt(mes)+1).padStart(2,'0')}`
    const vencimento = `${mesVenc}-${diaVenc}`

    const novaObrig = {
      id: `ret_${analiseSel.id}_${retencao.codigo}_${ano}_${mes.padStart(2,'0')}`,
      cliente_id: analiseSel.cliente_id,
      cliente: analiseSel.cliente_nome,
      obrigacao: `${retencao.label || retencao.codigo} s/ NF ${analiseSel.numero_nf}`,
      codigo: retencao.codigo,
      competencia: mesComp,
      vencimento,
      valor: retencao.valor,
      aliquota: retencao.aliquota,
      base_calculo: retencao.base_calculo,
      fundamentacao: retencao.fundamentacao,
      status: 'Pendente',
      passivel_multa: true,
      origem: 'analise_retencoes',
      analise_id: analiseSel.id,
      gerado_em: new Date().toISOString(),
    }

    const todas = JSON.parse(localStorage.getItem('ep_tarefas_entregas')||'[]')
    if (todas.find(t => t.id === novaObrig.id)) {
      alert(`Obrigação ${retencao.codigo} já foi criada para esta NF/competência.`)
      return
    }
    todas.push(novaObrig)
    localStorage.setItem('ep_tarefas_entregas', JSON.stringify(todas))

    // Atualizar analise com obrigação criada
    const updated = analises.map(a => a.id === analiseSel.id
      ? {...a, obrigacoes_criadas: [...(a.obrigacoes_criadas||[]), retencao.codigo]}
      : a
    )
    salvarAnalises(updated)
    setAnaliseSel(updated.find(a => a.id === analiseSel.id))
    alert(`✅ Obrigação ${retencao.codigo} criada em Entregas/Tarefas!\nVencimento: ${new Date(vencimento+'T12:00:00').toLocaleDateString('pt-BR')} | Valor: ${fmtMoeda(retencao.valor)}`)
  }

  // ── Exportar análise ──────────────────────────────────────────────────────
  const exportarAnalise = (analise) => {
    const res = analise.resultado_ia || {}
    const linhas = (res.retencoes||[]).filter(r=>r.aplicavel).map(r =>
      `${r.codigo};${r.label};${r.aliquota}%;${fmtMoeda(r.base_calculo)};${fmtMoeda(r.valor)};${r.fundamentacao}`
    )
    const csv = `ANÁLISE DE RETENÇÕES - EPimentel Auditoria & Contabilidade\nCliente;${analise.cliente_nome}\nFornecedor;${analise.fornecedor}\nNF Nº;${analise.numero_nf}\nData;${fmtData(analise.data_analise)}\nValor Bruto;${fmtMoeda(analise.valor_bruto)}\n\nTributo;Descrição;Alíquota;Base;Valor;Fundamentação\n${linhas.join('\n')}\n\nTOTAL RETENÇÕES;${fmtMoeda(res.total_retencoes)}\nVALOR LÍQUIDO;${fmtMoeda(res.valor_liquido)}`
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`retencoes_NF${analise.numero_nf}_${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const analisesFiltradas = analises.filter(a =>
    !busca || (a.cliente_nome||'').toLowerCase().includes(busca.toLowerCase()) ||
    (a.numero_nf||'').includes(busca) || (a.fornecedor||'').toLowerCase().includes(busca.toLowerCase())
  )

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 44px)',fontFamily:'Inter, system-ui, sans-serif',background:'#F8F9FA',overflow:'hidden'}}>
      {/* Header */}
      <div style={{background:NAVY,padding:'12px 22px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:22}}>🧾</span>
          <div>
            <span style={{color:'#fff',fontWeight:700,fontSize:16}}>Análise de</span>
            <span style={{color:GOLD,fontWeight:700,fontSize:16}}> Retenções</span>
          </div>
          <span style={{fontSize:11,color:'rgba(255,255,255,.5)',padding:'2px 8px',borderRadius:8,background:'rgba(255,255,255,.08)'}}>🤖 Claude IA</span>
        </div>
        <div style={{display:'flex',gap:8}}>
          <span style={{fontSize:12,color:'rgba(255,255,255,.6)'}}>{analises.length} análises realizadas</span>
        </div>
      </div>

      {/* Abas */}
      <div style={{background:'#fff',display:'flex',borderBottom:'2px solid #E0E0E0',flexShrink:0}}>
        {[['nova','➕ Nova Análise'],['historico',`📋 Histórico (${analises.length})`]].map(([id,label])=>(
          <button key={id} onClick={()=>setAbaAtiva(id)} style={{padding:'11px 22px',border:'none',background:'none',cursor:'pointer',fontWeight:abaAtiva===id?700:400,color:abaAtiva===id?NAVY:'#666',fontSize:13,borderBottom:abaAtiva===id?`3px solid ${GOLD}`:'3px solid transparent'}}>
            {label}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflow:'auto',display:'flex',gap:0}}>

        {/* ── ABA NOVA ANÁLISE ── */}
        {abaAtiva==='nova' && (
          <div style={{flex:1,overflow:'auto',padding:20}}>
            <div style={{maxWidth:900,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>

              {/* Formulário */}
              <div style={{background:'#fff',borderRadius:12,padding:20,border:'1px solid #eee'}}>
                <div style={{fontWeight:700,color:NAVY,fontSize:15,marginBottom:16}}>📋 Dados da Nota Fiscal</div>

                {/* Upload */}
                <div onClick={()=>fileRef.current.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleArquivo(f)}}
                  style={{border:`2px dashed ${arquivoNome?GOLD:'#C0C0C0'}`,borderRadius:10,padding:'16px 14px',textAlign:'center',cursor:'pointer',background:arquivoNome?GOLD+'08':'#FAFAFA',marginBottom:14}}>
                  <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.xml" style={{display:'none'}} onChange={e=>{if(e.target.files[0])handleArquivo(e.target.files[0])}}/>
                  <div style={{fontSize:28,marginBottom:4}}>📎</div>
                  {arquivoNome
                    ? <div style={{fontWeight:700,color:GOLD,fontSize:13}}>✅ {arquivoNome}</div>
                    : <div style={{fontSize:12,color:'#888'}}>Arraste PDF, XML (NF-e) ou imagem da NF<br/><span style={{fontSize:11,color:'#aaa'}}>Claude extrai os dados automaticamente</span></div>
                  }
                </div>
                {textoExtraido && (
                  <div style={{marginBottom:12,padding:'8px 12px',borderRadius:8,background:'#F0FDF4',border:'1px solid #bbf7d0',fontSize:11,color:'#166534',maxHeight:80,overflow:'auto'}}>
                    ✅ Dados extraídos pelo Claude IA
                  </div>
                )}

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                  <div>
                    <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Cliente (Tomador) *</label>
                    <select value={form.cliente_id} onChange={e=>{const c=clientes.find(x=>String(x.id)===e.target.value);setForm(f=>({...f,cliente_id:e.target.value,cliente_nome:c?.nome_razao||c?.nome||''}))}} style={sel}>
                      <option value="">Selecione...</option>
                      {clientes.map(c=><option key={c.id} value={c.id}>{c.nome_razao||c.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Fornecedor / Prestador *</label>
                    <input value={form.fornecedor} onChange={e=>setF('fornecedor',e.target.value)} placeholder="Nome do prestador" style={inp}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Número da NF</label>
                    <input value={form.numero_nf} onChange={e=>setF('numero_nf',e.target.value)} placeholder="Ex: 001234" style={inp}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Data de Emissão</label>
                    <input type="date" value={form.data_emissao} onChange={e=>setF('data_emissao',e.target.value)} style={inp}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Competência (mês/ano)</label>
                    <input type="month" value={form.competencia} onChange={e=>setF('competencia',e.target.value)} style={inp}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Valor Bruto (R$) *</label>
                    <input type="number" value={form.valor_bruto} onChange={e=>setF('valor_bruto',e.target.value)} placeholder="0,00" style={inp}/>
                  </div>
                </div>
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Descrição do Serviço *</label>
                  <textarea value={form.descricao} onChange={e=>setF('descricao',e.target.value)} placeholder="Ex: Prestação de serviços contábeis mensais..." style={{...inp,height:60,resize:'none',fontFamily:'inherit'}}/>
                </div>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Tipo de Serviço</label>
                  <select value={form.tipo_servico} onChange={e=>setF('tipo_servico',e.target.value)} style={sel}>
                    <option value="">Selecione o tipo...</option>
                    {['Serviços Contábeis','Serviços de TI/Software','Consultoria','Limpeza/Conservação','Construção Civil','Mão de obra','Locação de mão de obra','Transportes','Assessoria Jurídica','Serviços Médicos','Publicidade','Locação de bens móveis','Outros serviços'].map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <button onClick={executarAnalise} disabled={analisando||(!form.valor_bruto&&!textoExtraido)}
                  style={{width:'100%',padding:'13px 0',background:analisando?'#6366f1':NAVY,color:'#fff',border:'none',borderRadius:10,fontWeight:700,fontSize:14,cursor:'pointer',opacity:(!form.valor_bruto&&!textoExtraido)?0.5:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  {analisando?<>⏳ Claude analisando retenções...</>:<>🤖 Analisar Retenções com IA</>}
                </button>
              </div>

              {/* Resultado IA */}
              <div style={{background:'#fff',borderRadius:12,padding:20,border:'1px solid #eee'}}>
                <div style={{fontWeight:700,color:NAVY,fontSize:15,marginBottom:16}}>🤖 Resultado da Análise</div>

                {!resultadoIA && !analisando && (
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:300,color:'#aaa',gap:12}}>
                    <div style={{fontSize:48}}>🧾</div>
                    <div style={{fontSize:14}}>Preencha os dados e clique em Analisar</div>
                    <div style={{fontSize:12,textAlign:'center',maxWidth:260}}>O Claude IA vai identificar automaticamente INSS, ISS, IRRF, PIS, COFINS e CSLL</div>
                  </div>
                )}

                {analisando && (
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:300,gap:16}}>
                    <div style={{fontSize:48}}>🤖</div>
                    <div style={{fontWeight:700,color:'#6366f1',fontSize:15}}>Claude analisando...</div>
                    <div style={{fontSize:12,color:'#888',textAlign:'center'}}>Verificando legislação tributária<br/>e calculando retenções</div>
                    <div style={{display:'flex',gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:'50%',background:'#6366f1',animation:`pulse${i} .8s ease-in-out infinite`,animationDelay:`${i*0.2}s`}}/>)}</div>
                  </div>
                )}

                {resultadoIA && !resultadoIA.erro && (
                  <div>
                    {/* Header resultado */}
                    <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
                      <span style={{fontSize:12,padding:'3px 10px',borderRadius:8,background:'#EBF5FF',color:'#1D6FA4',fontWeight:700}}>
                        {resultadoIA.tipo_prestador==='PF'?'👤 Pessoa Física':'🏢 Pessoa Jurídica'}
                      </span>
                      <span style={{fontSize:12,padding:'3px 10px',borderRadius:8,background:'#F3EEFF',color:'#6B3EC9',fontWeight:700}}>
                        {resultadoIA.regime_tributario}
                      </span>
                    </div>

                    {/* Retenções */}
                    <div style={{marginBottom:14}}>
                      {(resultadoIA.retencoes||[]).map((ret,i)=>{
                        const tipo = RETENCOES_TIPO.find(t=>t.codigo===ret.codigo)||{cor:'#666',bg:'#f5f5f5'}
                        return (
                          <div key={i} style={{marginBottom:8,padding:'10px 12px',borderRadius:9,background:ret.aplicavel?tipo.bg:'#F5F5F5',border:`1px solid ${ret.aplicavel?tipo.cor+'33':'#e0e0e0'}`,opacity:ret.aplicavel?1:0.6}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                              <div style={{display:'flex',alignItems:'center',gap:8}}>
                                <span style={{fontSize:11,padding:'2px 8px',borderRadius:6,background:tipo.bg,color:tipo.cor,fontWeight:700,border:`1px solid ${tipo.cor}33`}}>{ret.codigo}</span>
                                <span style={{fontSize:12,fontWeight:600,color:'#333'}}>{ret.label}</span>
                                {!ret.aplicavel&&<span style={{fontSize:10,color:'#aaa',fontStyle:'italic'}}>Não aplicável</span>}
                              </div>
                              {ret.aplicavel&&<span style={{fontSize:14,fontWeight:800,color:tipo.cor}}>{fmtMoeda(ret.valor)}</span>}
                            </div>
                            {ret.aplicavel&&(
                              <div style={{fontSize:11,color:'#666',display:'flex',gap:12,flexWrap:'wrap'}}>
                                <span>Alíquota: <b>{ret.aliquota}%</b></span>
                                <span>Base: <b>{fmtMoeda(ret.base_calculo)}</b></span>
                                <span style={{flex:1,color:'#888'}}>{ret.fundamentacao}</span>
                              </div>
                            )}
                            {ret.observacao&&<div style={{fontSize:11,color:'#777',marginTop:4,fontStyle:'italic'}}>{ret.observacao}</div>}
                          </div>
                        )
                      })}
                    </div>

                    {/* Totais */}
                    <div style={{padding:'12px 14px',borderRadius:10,background:'#F8F9FA',border:'1px solid #e8e8e8',marginBottom:12}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                        <span style={{fontSize:13,color:'#555'}}>Valor Bruto</span>
                        <span style={{fontWeight:700,color:NAVY,fontSize:13}}>{fmtMoeda(form.valor_bruto)}</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                        <span style={{fontSize:13,color:'#dc2626'}}>(-) Total Retenções</span>
                        <span style={{fontWeight:700,color:'#dc2626',fontSize:13}}>{fmtMoeda(resultadoIA.total_retencoes)}</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',paddingTop:8,borderTop:'1px solid #ddd'}}>
                        <span style={{fontSize:14,fontWeight:700,color:NAVY}}>Valor Líquido a Pagar</span>
                        <span style={{fontWeight:800,color:'#22c55e',fontSize:15}}>{fmtMoeda(resultadoIA.valor_liquido)}</span>
                      </div>
                    </div>

                    {/* Alertas */}
                    {(resultadoIA.alertas||[]).length>0&&(
                      <div style={{marginBottom:12,padding:'10px 12px',borderRadius:8,background:'#FEF9C3',border:'1px solid #fde68a'}}>
                        <div style={{fontWeight:700,color:'#854D0E',fontSize:12,marginBottom:6}}>⚠️ Alertas</div>
                        {resultadoIA.alertas.map((a,i)=><div key={i} style={{fontSize:12,color:'#92400e',marginBottom:2}}>• {a}</div>)}
                      </div>
                    )}

                    {/* Botões */}
                    <div style={{display:'flex',gap:10}}>
                      <button onClick={salvarAnalise} style={{flex:1,padding:'10px 0',background:'#22c55e',color:'#fff',border:'none',borderRadius:9,fontWeight:700,fontSize:13,cursor:'pointer'}}>
                        💾 Salvar Análise
                      </button>
                    </div>
                  </div>
                )}

                {resultadoIA?.erro && (
                  <div style={{padding:16,background:'#FFEBEE',borderRadius:10,border:'1px solid #FFCDD2'}}>
                    <div style={{fontWeight:700,color:'#C62828',marginBottom:8}}>❌ Erro na análise</div>
                    <pre style={{fontSize:12,color:'#333',whiteSpace:'pre-wrap',fontFamily:'inherit'}}>{resultadoIA.erro}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── ABA HISTÓRICO ── */}
        {abaAtiva==='historico' && (
          <div style={{flex:1,display:'flex',overflow:'hidden'}}>
            {/* Lista */}
            <div style={{width:320,borderRight:'1px solid #E0E0E0',background:'#fff',display:'flex',flexDirection:'column'}}>
              <div style={{padding:'10px 14px',borderBottom:'1px solid #eee'}}>
                <div style={{position:'relative'}}>
                  <Search size={12} style={{position:'absolute',left:8,top:9,color:'#bbb'}}/>
                  <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar análises..." style={{...inp,paddingLeft:26,fontSize:12}}/>
                </div>
              </div>
              <div style={{flex:1,overflowY:'auto'}}>
                {analisesFiltradas.length===0&&<div style={{padding:24,textAlign:'center',color:'#aaa',fontSize:13}}>Nenhuma análise salva ainda.</div>}
                {analisesFiltradas.map(a=>{
                  const res = a.resultado_ia||{}
                  const totalRet = res.total_retencoes||0
                  return (
                    <div key={a.id} onClick={()=>setAnaliseSel(a)} style={{padding:'11px 14px',cursor:'pointer',borderBottom:'1px solid #F5F5F5',background:analiseSel?.id===a.id?'#F0F4FF':'transparent'}}>
                      <div style={{fontWeight:600,color:NAVY,fontSize:13,marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        NF {a.numero_nf||'s/n'} — {a.fornecedor||'—'}
                      </div>
                      <div style={{fontSize:11,color:'#888',marginBottom:3}}>{a.cliente_nome} · {a.competencia}</div>
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <span style={{fontSize:11,fontWeight:700,color:'#dc2626'}}>Ret: {fmtMoeda(totalRet)}</span>
                        <span style={{fontSize:11,color:'#aaa'}}>{fmtData(a.data_analise)}</span>
                        {(a.obrigacoes_criadas||[]).length>0&&<span style={{fontSize:10,padding:'1px 6px',borderRadius:5,background:'#F0FDF4',color:'#166534',fontWeight:700}}>✅ {a.obrigacoes_criadas.length} obrig.</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Detalhe */}
            <div style={{flex:1,overflowY:'auto',padding:20,background:'#F8F9FA'}}>
              {!analiseSel?(
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'#aaa',gap:10}}>
                  <div style={{fontSize:48}}>📋</div>
                  <div>Selecione uma análise</div>
                </div>
              ):(
                <div style={{maxWidth:720,margin:'0 auto'}}>
                  {/* Header */}
                  <div style={{background:'#fff',borderRadius:12,padding:'14px 18px',marginBottom:16,border:'1px solid #eee',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div>
                      <div style={{fontWeight:700,color:NAVY,fontSize:16}}>NF {analiseSel.numero_nf||'s/n'}</div>
                      <div style={{fontSize:12,color:'#666',marginTop:2}}>{analiseSel.fornecedor} → {analiseSel.cliente_nome}</div>
                      <div style={{fontSize:11,color:'#aaa',marginTop:2}}>Competência: {analiseSel.competencia} · Analisado em {fmtData(analiseSel.data_analise)}</div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>exportarAnalise(analiseSel)} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:7,background:'#22c55e',color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:700}}>
                        <Download size={12}/> CSV
                      </button>
                    </div>
                  </div>

                  {/* Retenções + Criar Obrigações */}
                  <div style={{background:'#fff',borderRadius:12,padding:'14px 18px',marginBottom:16,border:'1px solid #eee'}}>
                    <div style={{fontWeight:700,color:NAVY,fontSize:14,marginBottom:12}}>💰 Retenções Identificadas</div>
                    {(analiseSel.resultado_ia?.retencoes||[]).filter(r=>r.aplicavel).map((ret,i)=>{
                      const tipo = RETENCOES_TIPO.find(t=>t.codigo===ret.codigo)||{cor:'#666',bg:'#f5f5f5'}
                      const jaCriada = (analiseSel.obrigacoes_criadas||[]).includes(ret.codigo)
                      return (
                        <div key={i} style={{marginBottom:10,padding:'12px 14px',borderRadius:10,background:tipo.bg,border:`1px solid ${tipo.cor}33`}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <span style={{fontSize:12,padding:'2px 9px',borderRadius:6,background:'#fff',color:tipo.cor,fontWeight:800,border:`1px solid ${tipo.cor}44`}}>{ret.codigo}</span>
                              <span style={{fontSize:13,fontWeight:600,color:'#333'}}>{ret.label}</span>
                            </div>
                            <div style={{display:'flex',alignItems:'center',gap:10}}>
                              <span style={{fontSize:15,fontWeight:800,color:tipo.cor}}>{fmtMoeda(ret.valor)}</span>
                              {jaCriada
                                ? <span style={{fontSize:11,padding:'4px 10px',borderRadius:7,background:'#F0FDF4',color:'#166534',fontWeight:700}}>✅ Criada</span>
                                : <button onClick={()=>criarObrigacao(ret)} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:7,background:NAVY,color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:700}}>
                                    <Plus size={12}/> Criar Obrigação
                                  </button>
                              }
                            </div>
                          </div>
                          <div style={{fontSize:11,color:'#666',display:'flex',gap:14,flexWrap:'wrap'}}>
                            <span>Alíquota: <b>{ret.aliquota}%</b></span>
                            <span>Base: <b>{fmtMoeda(ret.base_calculo)}</b></span>
                            <span style={{color:'#888'}}>{ret.fundamentacao}</span>
                          </div>
                          {analiseSel.resultado_ia?.competencias_obrigacoes?.[ret.codigo]&&(
                            <div style={{fontSize:10,color:'#666',marginTop:4,background:'rgba(255,255,255,.6)',borderRadius:5,padding:'2px 8px',display:'inline-block'}}>
                              📅 {analiseSel.resultado_ia.competencias_obrigacoes[ret.codigo]}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Totais */}
                    <div style={{padding:'12px 14px',borderRadius:10,background:'#F8F9FA',border:'1px solid #e8e8e8',marginTop:12}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                        <span style={{fontSize:13,color:'#555'}}>Valor Bruto</span>
                        <span style={{fontWeight:700,color:NAVY}}>{fmtMoeda(analiseSel.valor_bruto)}</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                        <span style={{fontSize:13,color:'#dc2626'}}>Total Retenções</span>
                        <span style={{fontWeight:700,color:'#dc2626'}}>{fmtMoeda(analiseSel.resultado_ia?.total_retencoes)}</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',paddingTop:8,borderTop:'1px solid #ddd'}}>
                        <span style={{fontSize:14,fontWeight:700,color:NAVY}}>Valor Líquido</span>
                        <span style={{fontWeight:800,color:'#22c55e',fontSize:15}}>{fmtMoeda(analiseSel.resultado_ia?.valor_liquido)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Alertas e recomendações */}
                  {(analiseSel.resultado_ia?.alertas||[]).length>0&&(
                    <div style={{background:'#FEF9C3',borderRadius:10,padding:'12px 16px',marginBottom:12,border:'1px solid #fde68a'}}>
                      <div style={{fontWeight:700,color:'#854D0E',fontSize:13,marginBottom:8}}>⚠️ Alertas</div>
                      {analiseSel.resultado_ia.alertas.map((a,i)=><div key={i} style={{fontSize:12,color:'#92400e',marginBottom:3}}>• {a}</div>)}
                    </div>
                  )}
                  {analiseSel.resultado_ia?.recomendacoes&&(
                    <div style={{background:'#F0F4FF',borderRadius:10,padding:'12px 16px',border:'1px solid #c7d7fd'}}>
                      <div style={{fontWeight:700,color:NAVY,fontSize:13,marginBottom:6}}>💡 Recomendações do Claude</div>
                      <div style={{fontSize:12,color:'#555',lineHeight:1.6}}>{analiseSel.resultado_ia.recomendacoes}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
