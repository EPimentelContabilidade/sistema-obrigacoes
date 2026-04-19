import { useState, useRef, useCallback, useEffect } from 'react'

const NAVY = '#1F4A33'
const GOLD = '#C5A55A'

const API_BACKEND = window.location.hostname === 'localhost'
  ? 'http://localhost:8080/api/v1'
  : 'https://sistema-obrigacoes-production.up.railway.app/api/v1'

const LS_HIST     = 'ep_robo_historico'
const LS_LIB      = 'ep_robo_biblioteca'
const LS_CONFIG   = 'ep_robo_config'

const lsGet = (k, fb) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):fb } catch { return fb } }
const lsSet = (k, v) => { try { localStorage.setItem(k,JSON.stringify(v)) } catch {} }

const TIPOS_BR = [
  'DAS / Simples Nacional','PGDAS-D','DCTFWeb','DARF IRPJ','DARF CSLL','DARF PIS',
  'DARF COFINS','GPS / INSS','FGTS','CAGED','eSocial','Folha de Pagamento',
  'NF-e / NFS-e','SPED / EFD','Balancete','Extrato Bancário','Certidão / CND',
  'Contrato','DIRF','RAIS','DEFIS','REINF','IRPF','Comprovante Pagamento','Outro'
]

const CONFIANCA_COR = (c) => c >= 0.85 ? '#22c55e' : c >= 0.6 ? '#f59e0b' : '#ef4444'
const CONFIANCA_LABEL = (c) => c >= 0.85 ? 'Alta' : c >= 0.6 ? 'Média' : 'Baixa'

function BarraConfianca({ valor, label }) {
  const cor = CONFIANCA_COR(valor)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:6, background:'#e5e7eb', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:(valor*100)+'%', background:cor, borderRadius:3, transition:'width .5s' }} />
      </div>
      <span style={{ fontSize:10, fontWeight:700, color:cor, minWidth:32 }}>{Math.round(valor*100)}%</span>
      <span style={{ fontSize:10, color:'#888' }}>{CONFIANCA_LABEL(valor)}</span>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display:'inline-block', width:16, height:16, border:'2px solid #e5e7eb',
      borderTopColor:NAVY, borderRadius:'50%', animation:'ep-spin 0.8s linear infinite' }} />
  )
}

export default function RoboObrigacoes() {
  const [aba, setAba] = useState('analisar')
  const [dragging, setDragging] = useState(false)
  const [arquivos, setArquivos] = useState([])
  const [analisando, setAnalisando] = useState(false)
  const [etapaIA, setEtapaIA] = useState('')
  const [resultado, setResultado] = useState(null)
  const [historico, setHistorico] = useState(() => lsGet(LS_HIST, []))
  const [biblioteca, setBiblioteca] = useState(() => lsGet(LS_LIB, []))
  const [config, setConfig] = useState(() => lsGet(LS_CONFIG, { modo_auto: true, salvar_auto: true, notificar: false }))
  const [salvoSucesso, setSalvoSucesso] = useState(false)
  const inputRef = useRef()
  const dropRef = useRef()

  // Catálogo de obrigações e clientes
  const obrigacoes = (() => { try { const c=JSON.parse(localStorage.getItem('ep_obrigacoes_catalogo_v2')||'{}'); return Object.values(c).flat() } catch { return [] } })()
  const clientes = (() => { try { return JSON.parse(localStorage.getItem('ep_clientes')||'[]') } catch { return [] } })()

  useEffect(() => {
    const style = document.getElementById('ep-robo-style') || document.createElement('style')
    style.id = 'ep-robo-style'
    style.textContent = '@keyframes ep-spin{to{transform:rotate(360deg)}} @keyframes ep-pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes ep-slideup{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}'
    document.head.appendChild(style)
  }, [])

  const lerArquivoB64 = (file) => new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result.split(',')[1])
    r.onerror = rej
    r.readAsDataURL(file)
  })

  const processarArquivos = useCallback(async (files) => {
    if (!files.length) return
    setArquivos(Array.from(files).map(f => f.name))
    setResultado(null)
    setAnalisando(true)

    try {
      const file = files[0]
      setEtapaIA('📖 Lendo documento...')
      await new Promise(r => setTimeout(r, 400))

      let b64 = ''
      try { b64 = await lerArquivoB64(file) } catch(e) {}

      setEtapaIA('🧠 IA identificando tipo do documento...')
      await new Promise(r => setTimeout(r, 300))

      // Chamar backend AI
      const resp = await fetch(API_BACKEND + '/ai/analisar-documento', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          arquivo_b64: b64,
          arquivo_nome: file.name,
          arquivo_tipo: file.type || 'application/pdf',
          obrigacoes_catalogo: obrigacoes.map(o => ({ codigo: o.codigo, nome: o.nome })),
          clientes: clientes.map(c => ({ id: c.id, nome: c.nome, cnpj: c.cnpj })),
        })
      })

      setEtapaIA('📊 Extraindo campos e dados...')
      await new Promise(r => setTimeout(r, 300))

      const dados = await resp.json()

      setEtapaIA('🔗 Vinculando à obrigação no catálogo...')
      await new Promise(r => setTimeout(r, 400))

      const res = {
        arquivo_nome: file.name,
        arquivo_tamanho: (file.size/1024).toFixed(0) + ' KB',
        tipo_documento: dados.tipo_documento,
        tipo_confianca: dados.tipo_confianca,
        campos: dados.campos || {},
        obrigacao_match: dados.obrigacao_match,
        obrigacao_confianca: dados.obrigacao_confianca || 0,
        cliente_match: dados.cliente_match,
        resumo_ia: dados.resumo_ia,
        modo: dados.modo,
        tokens: dados.tokens_usados || 0,
        ts: new Date().toISOString(),
      }

      setResultado(res)
      setEtapaIA('')

      // Auto-salvar no histórico
      const novoHist = [{ id: Date.now(), ...res, status: 'analisado' }, ...historico].slice(0, 200)
      setHistorico(novoHist)
      lsSet(LS_HIST, novoHist)

      // Auto-salvar na biblioteca se configurado e confiança alta
      if (config.salvar_auto && res.tipo_confianca >= 0.7) {
        salvarNaBiblioteca(res)
      }

    } catch(e) {
      setEtapaIA('')
      setResultado({ erro: true, msg: e.message, arquivo_nome: files[0]?.name })
    } finally {
      setAnalisando(false)
    }
  }, [obrigacoes, clientes, historico, config])

  const salvarNaBiblioteca = (res) => {
    const chave = (res.tipo_documento + '_' + (res.campos?.competencia || '') + '_' + (res.campos?.cnpj || '')).replace(/\s/g,'_')
    const jaExiste = biblioteca.some(b => b.chave === chave)
    if (jaExiste) return
    const novaLib = [{ id:Date.now(), chave, ...res, salvo_em: new Date().toLocaleString('pt-BR') }, ...biblioteca].slice(0,500)
    setBiblioteca(novaLib)
    lsSet(LS_LIB, novaLib)
    setSalvoSucesso(true)
    setTimeout(() => setSalvoSucesso(false), 3000)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    processarArquivos(e.dataTransfer.files)
  }, [processarArquivos])

  const ABAS = [
    { id:'analisar',  label:'🤖 Analisar IA' },
    { id:'historico', label:'📋 Histórico' },
    { id:'biblioteca',label:'📚 Biblioteca' },
    { id:'config',    label:'⚙️ Configurar' },
  ]

  return (
    <div style={{ fontFamily:'Inter, system-ui, sans-serif', height:'calc(100vh - 44px)', display:'flex', flexDirection:'column', background:'#f8faf8' }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,'+NAVY+',#2d6b4a)', padding:'16px 24px', display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:GOLD, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🤖</div>
        <div style={{ flex:1 }}>
          <div style={{ color:'#fff', fontWeight:800, fontSize:16 }}>Robô de Obrigações — IA</div>
          <div style={{ color:GOLD, fontSize:11, marginTop:2 }}>
            Análise automática com Claude AI · Detecção de tipo, extração de campos e vinculação ao catálogo
          </div>
        </div>
        <div style={{ display:'flex', gap:12 }}>
          {[{ n:historico.length, l:'Analisados'}, { n:biblioteca.length, l:'Na Biblioteca'}, { n:historico.filter(h=>h.tipo_confianca>=0.85).length, l:'Alta confiança'}].map(s=>(
            <div key={s.l} style={{ textAlign:'center', padding:'6px 14px', borderRadius:10, background:'rgba(255,255,255,0.1)' }}>
              <div style={{ color:GOLD, fontWeight:800, fontSize:18 }}>{s.n}</div>
              <div style={{ color:'rgba(255,255,255,0.6)', fontSize:10 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Abas */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', display:'flex', paddingLeft:20 }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ padding:'10px 16px', border:'none', background:'transparent', cursor:'pointer', fontSize:13,
              fontWeight: aba===a.id ? 700 : 400,
              color: aba===a.id ? NAVY : '#888',
              borderBottom: aba===a.id ? '3px solid '+GOLD : '3px solid transparent' }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:24 }}>

        {/* ── ABA ANALISAR ─────────────────────────────────────────────────── */}
        {aba === 'analisar' && (
          <div style={{ maxWidth:860, margin:'0 auto' }}>

            {/* Zona de Drop */}
            <div ref={dropRef}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !analisando && inputRef.current?.click()}
              style={{ border:'2px dashed '+(dragging?GOLD:analisando?NAVY:'#cbd5e1'),
                borderRadius:16, padding:'48px 32px', textAlign:'center', cursor:analisando?'wait':'pointer',
                background: dragging ? GOLD+'10' : analisando ? NAVY+'06' : '#fff',
                transition:'all .2s', marginBottom:24, animation:'ep-slideup .4s ease' }}>

              {analisando ? (
                <div>
                  <div style={{ fontSize:48, marginBottom:12, animation:'ep-pulse 1.5s infinite' }}>🧠</div>
                  <div style={{ fontWeight:700, color:NAVY, fontSize:18, marginBottom:8 }}>IA Analisando...</div>
                  <div style={{ color:'#666', fontSize:14, marginBottom:16 }}>{etapaIA}</div>
                  <div style={{ display:'flex', justifyContent:'center' }}><Spinner /></div>
                  <div style={{ color:'#aaa', fontSize:12, marginTop:12 }}>{arquivos[0]}</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:56, marginBottom:16 }}>{dragging ? '🎯' : '📄'}</div>
                  <div style={{ fontWeight:700, color:NAVY, fontSize:20, marginBottom:8 }}>
                    {dragging ? 'Solte aqui!' : 'Arraste o documento aqui'}
                  </div>
                  <div style={{ color:'#888', fontSize:14, marginBottom:20 }}>
                    ou clique para selecionar · PDF, XML, imagem · IA identifica automaticamente
                  </div>
                  <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                    {['DAS','DARF','DCTF','NF-e','eSocial','FGTS','Folha','SPED','Certidão'].map(t => (
                      <span key={t} style={{ padding:'3px 10px', borderRadius:20, background:'#f0f4f0',
                        color:NAVY, fontSize:11, fontWeight:600 }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
              <input ref={inputRef} type="file" accept=".pdf,.xml,.txt,.xlsx,.xls,.png,.jpg,.jpeg"
                multiple style={{ display:'none' }}
                onChange={e => processarArquivos(e.target.files)} />
            </div>

            {/* Resultado da Análise */}
            {resultado && !resultado.erro && (
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e5e7eb',
                boxShadow:'0 4px 24px rgba(0,0,0,0.06)', animation:'ep-slideup .4s ease' }}>

                {/* Header resultado */}
                <div style={{ background:'linear-gradient(135deg,'+NAVY+'08,'+GOLD+'08)',
                  padding:'16px 20px', borderRadius:'14px 14px 0 0',
                  borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ fontSize:28 }}>✅</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, color:NAVY, fontSize:15 }}>{resultado.tipo_documento}</div>
                    <div style={{ fontSize:11, color:'#888', marginTop:2 }}>
                      {resultado.arquivo_nome} · {resultado.arquivo_tamanho} ·
                      {resultado.modo === 'claude' ? ' 🤖 Claude AI' : ' 📊 Análise de padrão'}
                      {resultado.tokens > 0 && ' · '+resultado.tokens+' tokens'}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11, color:'#888', marginBottom:4 }}>Confiança do Tipo</div>
                    <BarraConfianca valor={resultado.tipo_confianca} />
                  </div>
                </div>

                <div style={{ padding:20 }}>
                  {/* Resumo IA */}
                  <div style={{ background:'#f0f7f0', borderRadius:8, padding:'10px 14px',
                    marginBottom:20, fontSize:13, color:NAVY, lineHeight:1.5,
                    border:'1px solid '+GOLD+'40', display:'flex', gap:8 }}>
                    <span style={{ fontSize:16 }}>💡</span>
                    <span>{resultado.resumo_ia}</span>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                    {/* Campos extraídos */}
                    <div>
                      <div style={{ fontWeight:700, color:NAVY, fontSize:13, marginBottom:12 }}>📊 Campos Extraídos</div>
                      {Object.entries(resultado.campos).length === 0 ? (
                        <div style={{ color:'#aaa', fontSize:12 }}>Nenhum campo extraído.</div>
                      ) : (
                        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                          {Object.entries(resultado.campos).filter(([k,v])=>v).map(([k,v]) => (
                            <div key={k} style={{ display:'flex', justifyContent:'space-between',
                              padding:'7px 12px', background:'#f8f9fa', borderRadius:8,
                              border:'1px solid #f0f0f0' }}>
                              <span style={{ fontSize:11, color:'#888', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>
                                {k.replace(/_/g,' ')}
                              </span>
                              <span style={{ fontSize:12, fontWeight:700, color:NAVY, fontFamily:'monospace' }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Vínculos automáticos */}
                    <div>
                      <div style={{ fontWeight:700, color:NAVY, fontSize:13, marginBottom:12 }}>🔗 Vínculos Automáticos</div>

                      {/* Obrigação */}
                      <div style={{ padding:14, background: resultado.obrigacao_match ? '#f0f7f0' : '#fafafa',
                        borderRadius:10, border:'1px solid '+(resultado.obrigacao_match?GOLD+'50':'#e5e7eb'),
                        marginBottom:10 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase', marginBottom:6 }}>Obrigação no Catálogo</div>
                        {resultado.obrigacao_match ? (
                          <>
                            <div style={{ fontWeight:700, color:NAVY, fontSize:14, marginBottom:8 }}>
                              ✅ {resultado.obrigacao_match}
                            </div>
                            <BarraConfianca valor={resultado.obrigacao_confianca} />
                          </>
                        ) : (
                          <div style={{ color:'#aaa', fontSize:12 }}>Não vinculado automaticamente.<br/>Configure obrigações no catálogo.</div>
                        )}
                      </div>

                      {/* Cliente */}
                      <div style={{ padding:14, background: resultado.cliente_match ? '#f0f4ff' : '#fafafa',
                        borderRadius:10, border:'1px solid '+(resultado.cliente_match?'#c7d2fe':'#e5e7eb'),
                        marginBottom:16 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase', marginBottom:6 }}>Cliente Identificado</div>
                        {resultado.cliente_match ? (
                          <div style={{ fontWeight:700, color:'#3730A3', fontSize:14 }}>✅ {resultado.cliente_match}</div>
                        ) : (
                          <div style={{ color:'#aaa', fontSize:12 }}>Cliente não identificado pelo CNPJ.</div>
                        )}
                      </div>

                      {/* Ações */}
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        <button onClick={() => salvarNaBiblioteca(resultado)}
                          style={{ flex:1, padding:'10px', borderRadius:8, background:NAVY, color:'#fff',
                            border:'none', cursor:'pointer', fontWeight:700, fontSize:12, display:'flex',
                            alignItems:'center', justifyContent:'center', gap:6 }}>
                          📚 Salvar na Biblioteca
                        </button>
                        <button onClick={() => {
                            const novoHist = historico.map(h => h.ts === resultado.ts ? {...h, status:'entregue'} : h)
                            setHistorico(novoHist); lsSet(LS_HIST, novoHist)
                          }}
                          style={{ flex:1, padding:'10px', borderRadius:8, background:'#22c55e', color:'#fff',
                            border:'none', cursor:'pointer', fontWeight:700, fontSize:12, display:'flex',
                            alignItems:'center', justifyContent:'center', gap:6 }}>
                          ✅ Marcar Entregue
                        </button>
                      </div>
                      {salvoSucesso && (
                        <div style={{ marginTop:8, padding:'6px 12px', background:'#f0fdf4',
                          border:'1px solid #bbf7d0', borderRadius:6, fontSize:12, color:'#15803d', fontWeight:600 }}>
                          ✅ Salvo na biblioteca automaticamente!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {resultado?.erro && (
              <div style={{ background:'#fff1f2', border:'1px solid #fecdd3', borderRadius:12, padding:20, animation:'ep-slideup .4s' }}>
                <div style={{ fontWeight:700, color:'#be123c', marginBottom:8 }}>❌ Erro na análise</div>
                <div style={{ fontSize:12, color:'#666' }}>{resultado.msg}</div>
                <div style={{ fontSize:11, color:'#aaa', marginTop:4 }}>Arquivo: {resultado.arquivo_nome}</div>
              </div>
            )}
          </div>
        )}

        {/* ── ABA HISTÓRICO ─────────────────────────────────────────────────── */}
        {aba === 'historico' && (
          <div style={{ maxWidth:900, margin:'0 auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontWeight:700, color:NAVY, fontSize:15 }}>📋 Histórico de Análises ({historico.length})</div>
              <button onClick={() => { if(confirm('Limpar todo o histórico?')) { setHistorico([]); lsSet(LS_HIST,[]) } }}
                style={{ padding:'5px 12px', borderRadius:7, background:'#fee2e2', color:'#dc2626',
                  border:'1px solid #fca5a5', fontSize:11, cursor:'pointer', fontWeight:600 }}>
                🗑️ Limpar
              </button>
            </div>
            {historico.length === 0 ? (
              <div style={{ textAlign:'center', padding:60, color:'#aaa' }}>
                <div style={{ fontSize:40, marginBottom:8 }}>📭</div>
                <div>Nenhum documento analisado ainda.</div>
                <div style={{ fontSize:12, marginTop:4 }}>Arraste um arquivo na aba "Analisar IA"</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {historico.map((h, i) => (
                  <div key={h.id||i} style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb',
                    padding:'12px 16px', display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ fontSize:24 }}>
                      {h.tipo_confianca>=0.85?'✅':h.tipo_confianca>=0.6?'⚠️':'❓'}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, color:NAVY, fontSize:13 }}>{h.tipo_documento}</div>
                      <div style={{ fontSize:11, color:'#888' }}>{h.arquivo_nome} · {new Date(h.ts).toLocaleString('pt-BR')}</div>
                      {h.resumo_ia && <div style={{ fontSize:11, color:'#555', marginTop:3 }}>{h.resumo_ia}</div>}
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:10, color:'#aaa', marginBottom:4 }}>Confiança</div>
                      <div style={{ fontWeight:800, color:CONFIANCA_COR(h.tipo_confianca||0) }}>
                        {Math.round((h.tipo_confianca||0)*100)}%
                      </div>
                      <div style={{ fontSize:10, marginTop:2, padding:'2px 7px', borderRadius:10,
                        background: h.status==='entregue'?'#f0fdf4':'#f8f9fa',
                        color: h.status==='entregue'?'#15803d':'#888' }}>
                        {h.status==='entregue'?'Entregue':'Analisado'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ABA BIBLIOTECA ────────────────────────────────────────────────── */}
        {aba === 'biblioteca' && (
          <div style={{ maxWidth:900, margin:'0 auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:700, color:NAVY, fontSize:15 }}>📚 Biblioteca Permanente ({biblioteca.length})</div>
                <div style={{ fontSize:12, color:'#888' }}>Documentos salvos — o robô não solicitará novamente (mesma chave)</div>
              </div>
            </div>
            {biblioteca.length === 0 ? (
              <div style={{ textAlign:'center', padding:60, color:'#aaa' }}>
                <div style={{ fontSize:40, marginBottom:8 }}>📚</div>
                <div>Biblioteca vazia.</div>
                <div style={{ fontSize:12, marginTop:4 }}>Documentos com confiança ≥ 70% são salvos automaticamente.</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {biblioteca.map((b, i) => (
                  <div key={b.id||i} style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb',
                    padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ fontSize:20 }}>📄</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, color:NAVY, fontSize:13 }}>{b.tipo_documento}</div>
                      <div style={{ fontSize:11, color:'#888' }}>
                        {b.campos?.competencia && 'Competência: '+b.campos.competencia+' · '}
                        {b.campos?.cnpj && 'CNPJ: '+b.campos.cnpj+' · '}
                        Salvo: {b.salvo_em}
                      </div>
                      <div style={{ fontSize:10, color:'#aaa', fontFamily:'monospace', marginTop:2 }}>
                        Chave: {b.chave?.slice(0,50)}
                      </div>
                    </div>
                    <button onClick={() => { const nova=biblioteca.filter((_,j)=>j!==i); setBiblioteca(nova); lsSet(LS_LIB,nova) }}
                      style={{ padding:'4px 10px', borderRadius:6, background:'none', border:'1px solid #e5e7eb',
                        color:'#dc2626', cursor:'pointer', fontSize:11 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ABA CONFIG ────────────────────────────────────────────────────── */}
        {aba === 'config' && (
          <div style={{ maxWidth:640, margin:'0 auto' }}>
            <div style={{ fontWeight:700, color:NAVY, fontSize:15, marginBottom:20 }}>⚙️ Configurações do Robô IA</div>

            {/* API Key */}
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', padding:20, marginBottom:16 }}>
              <div style={{ fontWeight:700, color:NAVY, fontSize:13, marginBottom:4 }}>🔑 ANTHROPIC_API_KEY (Railway)</div>
              <div style={{ fontSize:12, color:'#888', marginBottom:12 }}>
                Configure no Railway → Variables → ANTHROPIC_API_KEY para ativar análise completa com Claude AI.
                Sem a chave, o robô usa análise heurística pelo nome do arquivo.
              </div>
              <div style={{ padding:'10px 14px', borderRadius:8, background:'#f0f7f0',
                border:'1px solid '+GOLD+'50', fontSize:12, color:NAVY }}>
                <b>Como configurar:</b><br/>
                1. Acesse <b>railway.com</b> → seu projeto → <b>sistema-obrigacoes</b> (backend)<br/>
                2. Clique em <b>Variables</b> → <b>New Variable</b><br/>
                3. Nome: <code>ANTHROPIC_API_KEY</code> · Valor: sua chave da API Anthropic<br/>
                4. Clique <b>Deploy</b> — o robô usará Claude AI para análise completa
              </div>
            </div>

            {/* Configurações */}
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', padding:20, marginBottom:16 }}>
              <div style={{ fontWeight:700, color:NAVY, fontSize:13, marginBottom:16 }}>🤖 Comportamento da IA</div>
              {[
                { k:'salvar_auto', label:'Salvar automaticamente na biblioteca', desc:'Documentos com confiança ≥ 70% são salvos sem confirmação' },
                { k:'modo_auto',   label:'Detectar tipo automaticamente', desc:'A IA escolhe o tipo de documento sem intervenção manual' },
                { k:'notificar',   label:'Notificar após análise', desc:'Exibir toast ao concluir análise' },
              ].map(opt => (
                <div key={opt.k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'12px 0', borderBottom:'1px solid #f5f5f5' }}>
                  <div>
                    <div style={{ fontWeight:600, color:NAVY, fontSize:13 }}>{opt.label}</div>
                    <div style={{ fontSize:11, color:'#888' }}>{opt.desc}</div>
                  </div>
                  <button onClick={() => { const novo={...config,[opt.k]:!config[opt.k]}; setConfig(novo); lsSet(LS_CONFIG,novo) }}
                    style={{ width:44, height:24, borderRadius:12, border:'none', cursor:'pointer',
                      background: config[opt.k] ? GOLD : '#e5e7eb', transition:'background .2s',
                      position:'relative' }}>
                    <div style={{ width:18, height:18, borderRadius:'50%', background:'#fff',
                      position:'absolute', top:3, transition:'left .2s',
                      left: config[opt.k] ? 23 : 3, boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>
              ))}
            </div>

            {/* Como funciona */}
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', padding:20 }}>
              <div style={{ fontWeight:700, color:NAVY, fontSize:13, marginBottom:14 }}>📖 Como o Robô detecta documentos</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { icon:'1️⃣', title:'Leitura', desc:'Lê o arquivo (PDF, XML, imagem) e extrai o conteúdo ou analisa o nome' },
                  { icon:'2️⃣', title:'Classificação', desc:'Claude AI ou padrão heurístico identifica o tipo (DAS, DARF, NF-e...)' },
                  { icon:'3️⃣', title:'Extração', desc:'Extrai campos: vencimento, valor, CNPJ, competência, código de barras...' },
                  { icon:'4️⃣', title:'Vinculação', desc:'Faz matching automático com obrigações do catálogo e clientes cadastrados' },
                  { icon:'5️⃣', title:'Biblioteca', desc:'Salva com chave única (tipo+competência+CNPJ) — não solicita novamente' },
                  { icon:'6️⃣', title:'Entrega', desc:'Marca a obrigação como entregue no módulo Entregas/Tarefas automaticamente' },
                ].map(s => (
                  <div key={s.title} style={{ background:'#f8f9fa', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
                    <div style={{ fontWeight:700, color:NAVY, fontSize:12, marginBottom:3 }}>{s.title}</div>
                    <div style={{ fontSize:11, color:'#666', lineHeight:1.5 }}>{s.desc}</div>
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
