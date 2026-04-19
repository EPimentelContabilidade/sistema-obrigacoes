import { useState, useRef, useCallback, useEffect } from 'react'
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
    const item = {
      id: Date.now(),
      arquivo_nome: resultado.arquivo_nome,
      tipo: resultado.tipo_documento,
      tipo_confianca: resultado.tipo_confianca,
      campos: { ...camposEdit },
      obrigacao: resultado.obrigacao_match,
      cliente: resultado.cliente_match,
      resumo: resultado.resumo_ia,
      modo: resultado.modo,
      ts: resultado.ts,
      status: 'na_biblioteca',
    }
    const nova = [item, ...biblioteca]
    setBiblioteca(nova)
    lss('ep_robo_bib_v2', nova)
    // Salvar no histórico também
    const novH = [{ ...item, status: 'concluido' }, ...historico]
    setHistorico(novH)
    lss('ep_robo_hist_v2', novH)
    alert('✅ Documento salvo na biblioteca! Não será mais solicitado para este período.')
    setResultado(null)
    setArquivo(null)
  }

  function marcarEntregue() {
    if (!resultado) return
    const novH = [{ id: Date.now(), arquivo_nome: resultado.arquivo_nome, tipo: resultado.tipo_documento, campos: camposEdit, obrigacao: resultado.obrigacao_match, ts: resultado.ts, status: 'entregue', modo: resultado.modo }, ...historico]
    setHistorico(novH)
    lss('ep_robo_hist_v2', novH)
    setResultado(null)
    setArquivo(null)
  }

  function novaAnalise() { setResultado(null); setArquivo(null); setAnalisando(false) }

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
          <div style={{ maxWidth:600 }}>
            <div style={{ fontWeight:800, color:NAVY, fontSize:16, marginBottom:20 }}>⚙️ Configuração da IA</div>

            {/* Status do backend */}
            <div style={{ padding:16, borderRadius:12, background:'#f9fafb', border:'1px solid #e5e7eb', marginBottom:20 }}>
              <div style={{ fontWeight:700, color:NAVY, fontSize:13, marginBottom:12 }}>🌐 Endpoint do Robô</div>
              <div style={{ fontSize:12, color:'#555', fontFamily:'monospace', background:'#fff', padding:'8px 12px', borderRadius:8, border:'1px solid #e5e7eb' }}>
                {API}/ai/analisar-documento
              </div>
              <div style={{ fontSize:11, color:'#888', marginTop:8 }}>
                O backend chama a API Claude usando a variável ANTHROPIC_API_KEY configurada no Railway.
              </div>
            </div>

            {/* Modelo e Custos */}
            <div style={{ padding:16, borderRadius:12, background:'#f0fdf4', border:'1px solid #bbf7d0', marginBottom:16 }}>
              <div style={{ fontWeight:700, color:'#166534', fontSize:13, marginBottom:10 }}>💡 Modelo usado: Claude Haiku (mais barato)</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
                {[
                  { modelo:'Haiku ✅ (atual)', input:'$0.80', output:'$4.00', note:'USADO', cor:'#16a34a' },
                  { modelo:'Sonnet',           input:'$3.00', output:'$15.00', note:'3.7x mais caro', cor:'#d97706' },
                  { modelo:'Opus',             input:'$15.00', output:'$75.00', note:'18x mais caro', cor:'#dc2626' },
                ].map(m=>(
                  <div key={m.modelo} style={{ padding:'10px 12px', borderRadius:8, background:'#fff', border:'2px solid '+(m.cor+'40') }}>
                    <div style={{ fontWeight:700, color:m.cor, fontSize:12, marginBottom:4 }}>{m.modelo}</div>
                    <div style={{ fontSize:11, color:'#555' }}>Input: <b>{m.input}</b>/1M tokens</div>
                    <div style={{ fontSize:11, color:'#555' }}>Output: <b>{m.output}</b>/1M tokens</div>
                    <div style={{ fontSize:10, color:m.cor, marginTop:4, fontWeight:600 }}>{m.note}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:11, color:'#166534', background:'#dcfce7', padding:'6px 10px', borderRadius:6 }}>
                💰 Custo estimado: ~R$ 0,003 por documento analisado (Haiku). 1.000 docs/mês ≈ R$ 3,00
              </div>
            </div>

            {/* Instrução Railway */}
            <div style={{ padding:16, borderRadius:12, background:'#fffbeb', border:'1px solid #fde68a', marginBottom:20 }}>
              <div style={{ fontWeight:700, color:'#92400e', fontSize:13, marginBottom:10 }}>🔑 Como ativar:</div>
              <ol style={{ fontSize:12, color:'#555', lineHeight:2, paddingLeft:20, margin:0 }}>
                <li>Acesse <b>railway.com</b> → projeto <b>sistema-obrigacoes</b> → serviço backend</li>
                <li>Clique em <b>Variables</b> e adicione:</li>
              </ol>
              <div style={{ fontFamily:'monospace', fontSize:12, background:'#1e293b', color:'#86efac', padding:'8px 12px', borderRadius:8, margin:'8px 0' }}>
                ANTHROPIC_API_KEY=sk-ant-api03-...
              </div>
              <div style={{ fontSize:11, color:'#b45309' }}>
                Sem a chave: análise gratuita por padrão do nome do arquivo (funciona para DAS, DARF, NF-e etc.)
              </div>
            </div>

            {/* Tipos de documento */}
            <div style={{ padding:16, borderRadius:12, background:'#f9fafb', border:'1px solid #e5e7eb' }}>
              <div style={{ fontWeight:700, color:NAVY, fontSize:13, marginBottom:12 }}>🗂️ Tipos detectados automaticamente</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {TIPOS.filter(t=>t.id!=='outro').map(t=>(
                  <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:8, background:'#fff', border:'1px solid #e5e7eb' }}>
                    <span style={{ width:10, height:10, borderRadius:'50%', background:t.cor, display:'inline-block', flexShrink:0 }}/>
                    <span style={{ fontSize:12, color:'#333' }}>{t.nome}</span>
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
