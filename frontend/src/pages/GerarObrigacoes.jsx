// ══════════════════════════════════════════════════════════════════════════════
// GerarObrigacoes.jsx — Modal reutilizável
// Uso: import GerarObrigacoes from './GerarObrigacoes'
// <GerarObrigacoes cliente={cli} onClose={()=>...} onGerado={(qtd)=>...} />
// ══════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'

const MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// Calcula vencimento baseado nos dias_entrega configurados
function calcularVencimento(obrig, mes, ano) {
  const mesNome = MESES_NOMES[mes - 1]
  const diaConf = obrig.dias_entrega?.[mesNome] || 'Todo dia 20'
  let dia = 20
  if (diaConf.startsWith('Todo dia ')) dia = parseInt(diaConf.replace('Todo dia ','')) || 20
  if (diaConf === 'Último dia útil' || diaConf === 'Último dia do mês') {
    const ultimo = new Date(ano, mes, 0).getDate()
    dia = ultimo
  }
  // Avança para próximo mês se periodicidade indica isso
  const mesVenc = obrig.competencia_ref === 'Mês atual' ? mes : mes + 1
  const anoVenc = mesVenc > 12 ? ano + 1 : ano
  const mesVencFinal = mesVenc > 12 ? 1 : mesVenc
  return `${anoVenc}-${String(mesVencFinal).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
}

// Formata competência como "03/2026"
function fmtComp(mes, ano) {
  return `${String(mes).padStart(2,'0')}/${ano}`
}

export default function GerarObrigacoes({ cliente, onClose, onGerado }) {
  const anoAtual = new Date().getFullYear()
  const mesAtual = new Date().getMonth() + 1

  const [mesInicio, setMesInicio] = useState(1)
  const [anoInicio, setAnoInicio] = useState(anoAtual)
  const [mesFim, setMesFim] = useState(mesAtual)
  const [anoFim, setAnoFim] = useState(anoAtual)
  const [apenasAtivas, setApenasAtivas] = useState(true)
  const [substituirExistentes, setSubstituirExistentes] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [preview, setPreview] = useState(null)
  const [gerado, setGerado] = useState(false)
  const [qtdGerada, setQtdGerada] = useState(0)

  // Catálogo via Config. Tarefas (lê ep_obrigacoes_catalogo_v2 com fallback padrão)
  const getCatalogo = () => {
    try {
      const regime = cliente.tributacao || cliente.regime || ''
      const mapa = {
        'Simples Nacional':'Simples Nacional','MEI':'MEI',
        'Lucro Presumido':'Lucro Presumido','Lucro Real':'Lucro Real',
        'RET':'RET/Imobiliário','RET/Imobiliário':'RET/Imobiliário',
        'Imune/Isento':'Imune/Isento','Produtor Rural':'Produtor Rural',
        'Social/IRH':'Social/IRH','Social/RH':'Social/IRH','Social':'Social/IRH',
        'Condomínio':'Condomínio','Autônomo':'Autônomo',
      }
      const chave = mapa[regime] || regime
      // 1. Catálogo personalizado (Config. Tarefas)
      const catV2 = JSON.parse(localStorage.getItem('ep_obrigacoes_catalogo_v2') || 'null')
      if (catV2?.[chave]) {
        const lista = catV2[chave].filter(o => !apenasAtivas || o.ativo !== false)
        if (lista.length > 0) return lista
      }
      // 2. Catálogo padrão embutido por regime
      const PADRAO = {
        'MEI': [{codigo:'DAS-MEI',nome:'DAS Mensal',periodicidade:'Mensal',passivel_multa:'Sim'},{codigo:'DASN-SIMEI',nome:'DASN-SIMEI',periodicidade:'Anual'}],
        'Simples Nacional': [{codigo:'DAS',nome:'DAS Mensal',periodicidade:'Mensal',passivel_multa:'Sim'},{codigo:'PGDAS-D',nome:'PGDAS-D',periodicidade:'Mensal'},{codigo:'DEFIS',nome:'DEFIS',periodicidade:'Anual'},{codigo:'SPED-CONT',nome:'SPED Contábil',periodicidade:'Anual'},{codigo:'ESOCIAL',nome:'eSocial',periodicidade:'Mensal'},{codigo:'DCTFWEB',nome:'DCTFWeb',periodicidade:'Mensal'}],
        'Lucro Presumido': [{codigo:'DARF-IRPJ',nome:'DARF IRPJ',periodicidade:'Trimestral',passivel_multa:'Sim'},{codigo:'DARF-CSLL',nome:'DARF CSLL',periodicidade:'Trimestral',passivel_multa:'Sim'},{codigo:'PIS',nome:'PIS',periodicidade:'Mensal'},{codigo:'COFINS',nome:'COFINS',periodicidade:'Mensal'},{codigo:'DCTF',nome:'DCTF Mensal',periodicidade:'Mensal'},{codigo:'ESOCIAL',nome:'eSocial',periodicidade:'Mensal'},{codigo:'DCTFWEB',nome:'DCTFWeb',periodicidade:'Mensal'},{codigo:'SPED-CONT',nome:'SPED Contábil',periodicidade:'Anual'}],
        'Lucro Real': [{codigo:'DARF-IRPJ-LR',nome:'DARF IRPJ Mensal',periodicidade:'Mensal',passivel_multa:'Sim'},{codigo:'DARF-CSLL-LR',nome:'DARF CSLL',periodicidade:'Mensal',passivel_multa:'Sim'},{codigo:'PIS-NC',nome:'PIS Não Cumulativo',periodicidade:'Mensal'},{codigo:'COFINS-NC',nome:'COFINS Não Cumulativa',periodicidade:'Mensal'},{codigo:'DCTF',nome:'DCTF',periodicidade:'Mensal'},{codigo:'ESOCIAL',nome:'eSocial',periodicidade:'Mensal'},{codigo:'LALUR',nome:'LALUR/LACS',periodicidade:'Anual'}],
        'RET/Imobiliário': [{codigo:'RET-DARF',nome:'DARF RET (4%)',periodicidade:'Mensal',passivel_multa:'Sim'},{codigo:'DIMOB',nome:'DIMOB',periodicidade:'Anual'},{codigo:'SPED-CONT-RET',nome:'SPED Contábil',periodicidade:'Anual'}],
        'Social/IRH': [{codigo:'FOLHA-PAG',nome:'Folha de Pagamento',periodicidade:'Mensal'},{codigo:'FGTS-SOCIAL',nome:'FGTS Mensal',periodicidade:'Mensal',passivel_multa:'Sim'},{codigo:'INSS-GPS',nome:'INSS / GPS',periodicidade:'Mensal',passivel_multa:'Sim'},{codigo:'ESOCIAL-RH',nome:'eSocial',periodicidade:'Mensal'},{codigo:'DCTFWEB-RH',nome:'DCTFWeb',periodicidade:'Mensal'},{codigo:'CAGED-RH',nome:'CAGED',periodicidade:'Mensal'},{codigo:'RAIS-RH',nome:'RAIS Anual',periodicidade:'Anual'}],
        'Imune/Isento': [{codigo:'DCTF-IMUNE',nome:'DCTF',periodicidade:'Mensal'},{codigo:'SPED-IMUNE',nome:'SPED Contábil',periodicidade:'Anual'},{codigo:'RAIS-IMUNE',nome:'RAIS',periodicidade:'Anual'}],
        'Condomínio': [{codigo:'BALANCETE',nome:'Balancete Mensal',periodicidade:'Mensal'},{codigo:'IRRF-COND',nome:'IRRF (prestadores)',periodicidade:'Mensal'}],
        'Autônomo': [{codigo:'CARNE-LEAO',nome:'Carnê Leão',periodicidade:'Mensal',passivel_multa:'Sim'},{codigo:'IRPF-AUT',nome:'IRPF Anual',periodicidade:'Anual'},{codigo:'INSS-AUT',nome:'INSS Autônomo',periodicidade:'Mensal',passivel_multa:'Sim'}],
        'Produtor Rural': [{codigo:'FUNRURAL',nome:'Funrural',periodicidade:'Mensal',passivel_multa:'Sim'},{codigo:'DITR',nome:'DITR',periodicidade:'Anual'}],
      }
      if (PADRAO[chave]) return PADRAO[chave]
      // 3. Fallback: obrigações salvas diretamente no cliente
      if (cliente.obrigacoes_catalogo?.length) return cliente.obrigacoes_catalogo
      return []
    } catch { return [] }
  }
  const getFonteInfo = () => {
    const regime = cliente.tributacao || cliente.regime || ''
    const catV2 = (() => { try { return JSON.parse(localStorage.getItem('ep_obrigacoes_catalogo_v2')||'null') } catch { return null } })()
    const chave = regime
    return { personalizada: !!catV2?.[chave]?.length, total: getCatalogo().length, regime }
  }

  const gerarPreview = () => {
    const catalogo = getCatalogo()
    if (!catalogo.length) { setPreview([]); return }

    const periodos = []
    let a = anoInicio, m = mesInicio
    while (a < anoFim || (a === anoFim && m <= mesFim)) {
      periodos.push({ mes: m, ano: a })
      m++; if (m > 12) { m = 1; a++ }
    }

    const itens = []
    for (const { mes, ano } of periodos) {
      for (const obrig of catalogo) {
        if (obrig.periodicidade === 'Anual' && mes !== 1) continue
        if (obrig.periodicidade === 'Trimestral' && ![3,6,9,12].includes(mes)) continue
        if (obrig.periodicidade === 'Semestral' && ![6,12].includes(mes)) continue
        if (obrig.periodicidade === 'Eventual') continue
        itens.push({
          cliente_id: cliente.id,
          cliente: cliente.nome_razao || cliente.nome,
          cnpj: cliente.cnpj,
          regime: cliente.tributacao || cliente.regime,
          obrigacao: obrig.nome,
          codigo: obrig.codigo,
          periodicidade: obrig.periodicidade,
          competencia: fmtComp(mes, ano),
          vencimento: calcularVencimento(obrig, mes, ano),
          status: 'Pendente',
          passivel_multa: obrig.passivel_multa === 'Sim',
          notif_whatsapp: obrig.notif_whatsapp || false,
          notif_email: obrig.notif_email || false,
          exigir_robo: obrig.exigir_robo === 'Sim',
          caminho_arquivo: (obrig.caminho_arquivo || '{empresa}/{obrigacao}/{ano}/{mes}')
            .replace('{empresa}', cliente.nome_razao || cliente.nome || '')
            .replace('{cnpj}', cliente.cnpj || '')
            .replace('{obrigacao}', obrig.codigo || '')
            .replace('{ano}', String(ano))
            .replace('{mes}', String(mes).padStart(2,'0'))
            .replace('{competencia}', fmtComp(mes, ano))
            .replace('{regime}', cliente.tributacao || ''),
          id: `${cliente.id}_${obrig.codigo}_${ano}_${String(mes).padStart(2,'0')}`,
        })
      }
    }
    setPreview(itens)
  }

  const confirmarGeracao = async () => {
    if (!preview?.length) return
    setGerando(true)
    try {
      const existentes = JSON.parse(localStorage.getItem('ep_tarefas_entregas') || '[]')
      let lista = [...existentes]

      for (const item of preview) {
        if (substituirExistentes) {
          lista = lista.filter(t => t.id !== item.id)
          lista.push({ ...item, gerado_em: new Date().toISOString() })
        } else {
          if (!lista.find(t => t.id === item.id)) {
            lista.push({ ...item, gerado_em: new Date().toISOString() })
          }
        }
      }

      localStorage.setItem('ep_tarefas_entregas', JSON.stringify(lista))
      setQtdGerada(preview.length)
      setGerado(true)
      onGerado?.(preview.length)
    } catch(e) {
      alert('Erro ao gerar: ' + e.message)
    }
    setGerando(false)
  }

  const inp = { width:'100%',padding:'8px 11px',borderRadius:8,border:'1px solid #ddd',fontSize:13,boxSizing:'border-box',outline:'none' }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:680,maxHeight:'90vh',overflow:'auto',boxShadow:'0 8px 40px rgba(0,0,0,.2)' }}>
        <div style={{ padding:'16px 22px',borderBottom:'1px solid #eee',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'#fff',zIndex:1 }}>
          <div>
            <div style={{ fontWeight:700,color:NAVY,fontSize:16 }}>📅 Gerar Obrigações</div>
            <div style={{ fontSize:12,color:'#888',marginTop:2 }}>
              {cliente.nome_razao||cliente.nome} · {cliente.tributacao||cliente.regime||'—'}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',fontSize:22,color:'#999' }}>×</button>
        </div>

        <div style={{ padding:24 }}>
          {gerado ? (
            <div style={{ textAlign:'center',padding:32 }}>
              <div style={{ fontSize:48,marginBottom:12 }}>✅</div>
              <div style={{ fontWeight:700,color:NAVY,fontSize:18,marginBottom:6 }}>{qtdGerada} obrigações geradas!</div>
              <div style={{ color:'#666',fontSize:13,marginBottom:20 }}>
                As obrigações foram adicionadas à aba <b>Entregas / Tarefas</b>.
              </div>
              <button onClick={onClose} style={{ background:NAVY,color:'#fff',border:'none',borderRadius:8,padding:'10px 28px',cursor:'pointer',fontWeight:700,fontSize:14 }}>
                Fechar
              </button>
            </div>
          ) : (
            <>
              {/* Período */}
              <div style={{ background:'#F8F9FA',borderRadius:10,padding:16,marginBottom:16 }}>
                <div style={{ fontWeight:700,color:NAVY,fontSize:13,marginBottom:12 }}>📆 Período</div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
                  <div>
                    <label style={{ fontSize:12,color:'#666',fontWeight:600,display:'block',marginBottom:6 }}>De (mês/ano)</label>
                    <div style={{ display:'flex',gap:8 }}>
                      <select style={{ ...inp,flex:1 }} value={mesInicio} onChange={e=>setMesInicio(Number(e.target.value))}>
                        {MESES_NOMES.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                      </select>
                      <select style={{ ...inp,width:90 }} value={anoInicio} onChange={e=>setAnoInicio(Number(e.target.value))}>
                        {[2023,2024,2025,2026,2027].map(a=><option key={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize:12,color:'#666',fontWeight:600,display:'block',marginBottom:6 }}>Até (mês/ano)</label>
                    <div style={{ display:'flex',gap:8 }}>
                      <select style={{ ...inp,flex:1 }} value={mesFim} onChange={e=>setMesFim(Number(e.target.value))}>
                        {MESES_NOMES.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                      </select>
                      <select style={{ ...inp,width:90 }} value={anoFim} onChange={e=>setAnoFim(Number(e.target.value))}>
                        {[2023,2024,2025,2026,2027].map(a=><option key={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Opções */}
              <div style={{ display:'flex',gap:16,marginBottom:16 }}>
                <label style={{ display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer' }}>
                  <input type="checkbox" checked={apenasAtivas} onChange={e=>setApenasAtivas(e.target.checked)} style={{ width:15,height:15,accentColor:NAVY }} />
                  Apenas obrigações ativas
                </label>
                <label style={{ display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer' }}>
                  <input type="checkbox" checked={substituirExistentes} onChange={e=>setSubstituirExistentes(e.target.checked)} style={{ width:15,height:15,accentColor:'#e53935' }} />
                  <span>Substituir se já existir <span style={{ fontSize:11,color:'#e53935' }}>(retroativo)</span></span>
                </label>
              </div>

              {/* Fonte das obrigações */}
              {!preview && (()=>{
                const {personalizada,total,regime} = getFonteInfo()
                return (
                  <div style={{marginBottom:14,padding:'10px 14px',borderRadius:8,background:personalizada?'#F0FDF4':'#FFF3E0',border:'1px solid '+(personalizada?'#86efac':'#FFB74D')}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:6}}>
                      <div style={{fontSize:12,color:personalizada?'#166534':'#E65100'}}>
                        {personalizada
                          ? <><b>⚙️ Config. Tarefas personalizada</b> — {total} obrigações · regime: <b>{regime}</b></>
                          : <><b>📋 Catálogo padrão</b> — {total > 0 ? `${total} obrigações para ${regime}` : `Nenhuma para "${regime}"`}</>}
                      </div>
                      <a href="/configuracoes-tarefas" target="_blank" rel="noreferrer" style={{fontSize:11,color:'#1976D2',fontWeight:700,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:3}} title="Abre em nova aba">✏️ Editar Config. Tarefas → <span style={{fontSize:9,opacity:.6}}>↗</span></a>
                    </div>
                    {total===0&&<div style={{fontSize:11,color:'#e53935',marginTop:4}}>⚠️ Configure em <b>Config. Tarefas → Obrigações por Regime</b></div>}
                  </div>
                )
              })()}

              {/* Botão gerar preview */}
              {!preview && (
                <button onClick={gerarPreview} style={{ width:'100%',padding:12,background:NAVY,color:'#fff',border:'none',borderRadius:10,cursor:'pointer',fontWeight:700,fontSize:14,marginBottom:16 }}>
                  🔍 Visualizar Obrigações a Gerar
                </button>
              )}

              {/* Preview */}
              {preview && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
                    <div style={{ fontWeight:700,color:NAVY,fontSize:13 }}>
                      Preview — <span style={{ color:GOLD }}>{preview.length} obrigações</span>
                    </div>
                    <button onClick={()=>setPreview(null)} style={{ background:'none',border:'1px solid #ddd',borderRadius:6,padding:'3px 10px',cursor:'pointer',fontSize:12 }}>← Alterar</button>
                  </div>

                  {preview.length === 0 ? (
                    <div style={{ padding:20,textAlign:'center',color:'#999',background:'#F8F9FA',borderRadius:8 }}>
                      Nenhuma obrigação encontrada para este cliente/período.<br/>
                      <span style={{ fontSize:12 }}>Configure as obrigações em <b>Config. Tarefas → Obrigações por Regime</b></span>
                    </div>
                  ) : (
                    <>
                      <div style={{ maxHeight:280,overflowY:'auto',border:'1px solid #eee',borderRadius:8,overflow:'hidden' }}>
                        <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
                          <thead>
                            <tr style={{ background:NAVY }}>
                              {['Código','Obrigação','Competência','Vencimento','Periodicidade'].map(h=>(
                                <th key={h} style={{ color:'#fff',padding:'8px 10px',textAlign:'left',fontSize:11 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {preview.map((item,i)=>(
                              <tr key={i} style={{ background:i%2===0?'#FAFAFA':'#fff',borderBottom:'1px solid #f0f0f0' }}>
                                <td style={{ padding:'7px 10px',fontFamily:'monospace',fontWeight:700,color:NAVY,fontSize:11 }}>{item.codigo}</td>
                                <td style={{ padding:'7px 10px',fontSize:12 }}>{item.obrigacao}</td>
                                <td style={{ padding:'7px 10px',fontWeight:600,color:'#555' }}>{item.competencia}</td>
                                <td style={{ padding:'7px 10px',color:item.passivel_multa?'#e53935':'#555' }}>
                                  {new Date(item.vencimento+'T12:00:00').toLocaleDateString('pt-BR')}
                                  {item.passivel_multa&&' ⚠️'}
                                </td>
                                <td style={{ padding:'7px 10px' }}>
                                  <span style={{ background:'#EEF2FF',color:'#3730A3',borderRadius:8,padding:'1px 7px',fontSize:11 }}>{item.periodicidade}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Resumo */}
                      <div style={{ marginTop:10,padding:'10px 14px',background:'#F0F4FF',borderRadius:8,display:'flex',gap:16,flexWrap:'wrap' }}>
                        <span style={{ fontSize:12,color:NAVY }}>📋 <b>{preview.length}</b> obrigações</span>
                        <span style={{ fontSize:12,color:'#e53935' }}>⚠️ <b>{preview.filter(p=>p.passivel_multa).length}</b> passíveis de multa</span>
                        <span style={{ fontSize:12,color:'#25D366' }}>💬 <b>{preview.filter(p=>p.notif_whatsapp).length}</b> com notif. WhatsApp</span>
                        <span style={{ fontSize:12,color:'#1976D2' }}>✉️ <b>{preview.filter(p=>p.notif_email).length}</b> com notif. E-mail</span>
                        <span style={{ fontSize:12,color:GOLD }}>🤖 <b>{preview.filter(p=>p.exigir_robo).length}</b> exigem Robô</span>
                      </div>

                      <button onClick={confirmarGeracao} disabled={gerando}
                        style={{ width:'100%',marginTop:14,padding:13,background:'#22c55e',color:'#fff',border:'none',borderRadius:10,cursor:'pointer',fontWeight:700,fontSize:14,opacity:gerando?0.6:1 }}>
                        {gerando ? 'Gerando...' : `✅ Confirmar — Gerar ${preview.length} obrigações em Entregas/Tarefas`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
