import { useState } from 'react'
import { Brain, Sparkles } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'

export default function EPInteligencia() {
  const [pergunta, setPergunta] = useState('')
    const [resposta, setResposta] = useState('')
      const [loading, setLoading] = useState(false)

        const consultar = async () => {
            if (!pergunta.trim()) return
                setLoading(true)
                    try {
                          const r = await fetch('/api/v1/conversas/ia', {
                                  method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({ mensagem: pergunta })
                                                        })
                                                              const d = await r.json()
                                                                    setResposta(d.resposta || d.message || 'Sem resposta')
                                                                        } catch (e) {
                                                                              setResposta('Erro ao consultar IA: ' + e.message)
                                                                                  }
                                                                                      setLoading(false)
                                                                                        }

                                                                                          return (
                                                                                              <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
                                                                                                    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
                                                                                                            <div style={{ background:NAVY, borderRadius:12, padding:10 }}>
                                                                                                                      <Brain size={24} color={GOLD}/>
                                                                                                                              </div>
                                                                                                                                      <div>
                                                                                                                                                <h1 style={{ fontSize:22, fontWeight:700, color:NAVY, margin:0 }}>EP Inteligência</h1>
                                                                                                                                                          <p style={{ color:'#666', fontSize:13, margin:0 }}>Assistente IA para Contabilidade e Fiscal</p>
                                                                                                                                                                  </div>
                                                                                                                                                                        </div>
                                                                                                                                                                              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e8e8e8', padding:24 }}>
                                                                                                                                                                                      <textarea
                                                                                                                                                                                                value={pergunta}
                                                                                                                                                                                                          onChange={e=>setPergunta(e.target.value)}
                                                                                                                                                                                                                    placeholder="Digite sua pergunta sobre contabilidade, fiscal ou tributação..."
                                                                                                                                                                                                                              rows={4}
                                                                                                                                                                                                                                        style={{ width:'100%', padding:12, border:'1px solid #ddd', borderRadius:8, fontSize:13, resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }}
                                                                                                                                                                                                                                                />
                                                                                                                                                                                                                                                        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:12 }}>
                                                                                                                                                                                                                                                                  <button onClick={consultar} disabled={loading} style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 20px', background:NAVY, color:'#fff', border:'none', borderRadius:8, cursor:loading?'wait':'pointer', fontWeight:600, fontSize:13 }}>
                                                                                                                                                                                                                                                                              <Sparkles size={14}/> {loading ? 'Consultando...' : 'Consultar IA'}
                                                                                                                                                                                                                                                                                        </button>
                                                                                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                                                                                        {resposta && (
                                                                                                                                                                                                                                                                                                                  <div style={{ marginTop:20, padding:16, background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0' }}>
                                                                                                                                                                                                                                                                                                                              <div style={{ fontSize:12, fontWeight:600, color:GOLD, marginBottom:8 }}>RESPOSTA EP INTELIGÊNCIA</div>
                                                                                                                                                                                                                                                                                                                                          <div style={{ fontSize:13, color:'#333', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{resposta}</div>
                                                                                                                                                                                                                                                                                                                                                    </div>
                                                                                                                                                                                                                                                                                                                                                            )}
                                                                                                                                                                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                                                                                                                                                                      </div>
                                                                                                                                                                                                                                                                                                                                                                        )
                                                                                                                                                                                                                                                                                                                                                                        }
