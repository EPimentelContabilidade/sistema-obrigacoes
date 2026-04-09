import { useState, useRef } from 'react'
import { FileText, Upload, Download, X } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'

function getClientes() { try { return JSON.parse(localStorage.getItem('ep_clientes')||'[]') } catch(e) { return [] } }
function getAnalises() { try { return JSON.parse(localStorage.getItem('ep_analises_ret')||'[]') } catch(e) { return [] } }
function saveAnalises(l) { localStorage.setItem('ep_analises_ret', JSON.stringify(l)) }
function fmtMoeda(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }
function fmtData(iso) { try { return new Date(iso).toLocaleDateString('pt-BR') } catch(e) { return '-' } }

const FORM0 = { tipo_operacao:'Servicos Tomados', numero_nota:'', prestador:'', cnpj_prestador:'', valor_total:'', data_emissao:'', descricao:'', cnae:'', codigo_lc116:'', municipio_prestador:'', aliquota_iss:'', regime_prestador:'' }
const API = import.meta.env.VITE_API_URL || ''

async function analisarIA(form) {
  const r = await fetch(API+'/api/v1/retencoes/proxy', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: `Voce e contador BR especialista em retencoes tributarias.
Analise a NF abaixo e determine TODAS as retencoes obrigatorias.

DADOS DA NOTA FISCAL:
- Tipo: ${form.tipo_operacao}
- NF: ${form.numero_nota}
- Prestador: ${form.prestador} (CNPJ: ${form.cnpj_prestador})
- Regime: ${form.regime_prestador || 'Nao informado - verificar'}
- Valor: R$ ${form.valor_total}
- Data: ${form.data_emissao}
- Descricao: ${form.descricao}
- CNAE: ${form.cnae}
- LC116: ${form.codigo_lc116}
- Municipio: ${form.municipio_prestador}
- Aliquota ISS: ${form.aliquota_iss}%

REGRAS CRITICAS:
1. INSS 11%: incide em cessao de mao de obra (vigilancia, limpeza, TI, construcao) - Lei 9.711/98
2. ISS: Simples Nacional = NAO retido (LC 123/2006). Lucro Presumido/Real = retido na aliquota declarada
3. IRRF: vigilancia 1%, limpeza 1%, TI 1.5%, consultoria 1.5% - verificar valor minimo
4. PIS/COFINS/CSLL: apenas se NAO Simples Nacional e valor >= R$ 215,05
5. Para vigilancia/portaria Simples Nacional: INSS INCIDE, ISS NAO incide, IRRF pode incidir

Responda APENAS JSON valido:
{"tipo_prestador":"PJ","regime_tributario":"Simples Nacional","retencoes":[{"codigo":"INSS","label":"INSS sobre Cessao de Mao de Obra","aliquota":11.0,"base_calculo":6968.10,"valor":766.49,"fundamentacao":"Lei 9.711/1998 art.31","aplicavel":true,"vencimento":"dia 20 mes seguinte - DCTF Web","observacao":"cessao mao de obra - vigilancia"},{"codigo":"ISS","label":"ISSQN Retido","aliquota":2.0,"base_calculo":null,"valor":null,"fundamentacao":"Simples Nacional LC 123/2006 - NAO retido","aplicavel":false,"vencimento":"","observacao":"Prestador Simples Nacional - isento"},{"codigo":"IRRF","label":"IRRF sobre Servicos","aliquota":1.0,"base_calculo":6968.10,"valor":69.68,"fundamentacao":"RIR art.714 - vigilancia 1%","aplicavel":true,"vencimento":"dia 20 mes seguinte - DARF","observacao":"Verificar valor minimo"},{"codigo":"PIS","label":"PIS Retido","aliquota":null,"base_calculo":null,"valor":null,"fundamentacao":"Simples Nacional - nao retido","aplicavel":false,"vencimento":"","observacao":""},{"codigo":"COFINS","label":"COFINS Retido","aliquota":null,"base_calculo":null,"valor":null,"fundamentacao":"Simples Nacional - nao retido","aplicavel":false,"vencimento":"","observacao":""},{"codigo":"CSLL","label":"CSLL Retido","aliquota":null,"base_calculo":null,"valor":null,"fundamentacao":"Simples Nacional - nao retido","aplicavel":false,"vencimento":"","observacao":""}],"total_retencoes":836.17,"valor_liquido":6131.93,"alertas":["Prestador Simples Nacional: ISS/PIS/COFINS/CSLL nao retidos","INSS retido por cessao de mao de obra - obrigatorio","IRRF 1% sobre servicos de vigilancia"],"recomendacoes":"texto","competencias_obrigacoes":{"INSS":"DCTF Web - dia 20","IRRF":"DARF - dia 20"}}` }]
    })
  })
  const d = await r.json()
  const txt = d.content?.[0]?.text || ''
  try { const m = txt.match(/\{[\s\S]*\}/); if(m) return JSON.parse(m[0]) } catch(e) {}
  return { erro: txt, retencoes: [] }
}

export default function AnaliseRetencoes() {
  const [aba, setAba] = useState('analise')
  const [form, setForm] = useState({...FORM0})
  const [clientes] = useState(getClientes())
  const [analisando, setAnalisando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [historico, setHistorico] = useState(getAnalises())
  const [busca, setBusca] = useState('')
  const [obrigGeradas, setObrigGeradas] = useState({})
  const fileRef = useRef()

  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  const executar = async () => {
    if (!form.prestador || !form.valor_total || !form.descricao) { alert('Preencha Prestador, Valor e Descricao.'); return }
    setAnalisando(true); setResultado(null)
    try { setResultado(await analisarIA(form)) }
    catch(e) { setResultado({erro: e.message, retencoes:[]}) }
    finally { setAnalisando(false) }
  }

  const salvar = () => {
    if (!resultado) return
    const nova = { id: Date.now().toString(), data: new Date().toISOString().split('T')[0], empresa: form.prestador, nota: form.numero_nota||'-', valor: parseFloat(form.valor_total)||0, retencoes_tags: (resultado.retencoes||[]).filter(r=>r.aplicavel).map(r=>r.codigo), resultado, form:{...form}, obrig_geradas: 0 }
    const novo = [nova, ...historico]; setHistorico(novo); saveAnalises(novo)
    alert('Analise salva!')
  }

  const gerarObrig = async (h) => {
    const rets = (h.resultado?.retencoes||[]).filter(r=>r.aplicavel)
    if (!rets.length) { alert('Nenhuma retencao aplicavel.'); return }
    let n = 0
    for (const r of rets) {
      try {
        await fetch(API+'/api/v1/entregas', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ titulo: r.codigo+' - NF '+h.nota+' - '+h.empresa, descricao: r.label+' | Base: '+fmtMoeda(r.base_calculo)+' | Valor: '+fmtMoeda(r.valor), vencimento: r.vencimento, valor: r.valor, tipo:'retencao', status:'pendente', cliente_id:'', origem:'analise_retencoes' }) })
        n++
      } catch(e) {}
    }
    const novo = historico.map(x => x.id===h.id ? {...x, obrig_geradas: n} : x)
    setHistorico(novo); saveAnalises(novo)
    setObrigGeradas(p=>({...p,[h.id]:n}))
    alert(n+' obrigacao(oes) gerada(s) em Entregas/Tarefas!')
  }

  const total = (resultado?.retencoes||[]).filter(r=>r.aplicavel).reduce((s,r)=>s+(r.valor||0),0)
  const liquido = (parseFloat(form.valor_total)||0) - total
  const hist = historico.filter(h => !busca || h.empresa.toLowerCase().includes(busca.toLowerCase()) || h.nota.includes(busca))

  const inp = {width:'100%',boxSizing:'border-box',border:'1px solid #ddd',borderRadius:6,padding:'8px 10px',fontSize:13,outline:'none',color:'#333',background:'#fff'}
  const sel = {...inp,cursor:'pointer'}
  const lbl = {display:'block',fontSize:11,fontWeight:700,color:'#666',marginBottom:4,letterSpacing:0.3}

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#f0f2f5',fontFamily:'Inter,system-ui,sans-serif'}}>

      {/* Tabs header */}
      <div style={{background:'#fff',borderBottom:'1px solid #e8e8e8',padding:'0 24px',flexShrink:0}}>
        <div style={{display:'flex'}}>
          {[{id:'analise',label:'Analise de Retencoes'},{id:'conciliacao',label:'Conciliacao'},{id:'indicadores',label:'Indicadores'}].map(t=>(
            <button key={t.id} onClick={()=>setAba(t.id)} style={{padding:'14px 20px',border:'none',background:'none',cursor:'pointer',fontSize:13,fontWeight:600,color:aba===t.id?NAVY:'#888',borderBottom:aba===t.id?'3px solid '+NAVY:'3px solid transparent',transition:'all .2s'}}>{t.label}</button>
          ))}
        </div>
      </div>

      {aba!=='analise' && <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'#999',fontSize:14}}>Em desenvolvimento</div>}

      {aba==='analise' && (
        <div style={{flex:1,overflowY:'auto',padding:'20px 24px',display:'flex',flexDirection:'column',gap:20}}>

          {/* Grid principal */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>

            {/* Formulario */}
            <div style={{background:'#fff',borderRadius:10,border:'1px solid #e8e8e8',padding:'20px 24px'}}>
              <div style={{fontWeight:700,fontSize:14,color:NAVY,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                <FileText size={15}/> Dados da Nota Fiscal
              </div>

              <div style={{display:'flex',gap:8,marginBottom:14}}>
                <button style={{padding:'6px 14px',borderRadius:6,border:'2px solid '+NAVY,background:NAVY+'18',color:NAVY,fontWeight:600,fontSize:12,cursor:'pointer'}}>✏️ Preencher</button>
                <button onClick={()=>fileRef.current?.click()} style={{padding:'6px 14px',borderRadius:6,border:'1px solid #ddd',background:'#f9f9f9',color:'#555',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}><Upload size={12}/> Anexar PDF/XML</button>
                <input ref={fileRef} type="file" accept=".pdf,.xml" style={{display:'none'}}/>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div><label style={lbl}>TIPO DE OPERACAO</label>
                  <select value={form.tipo_operacao} onChange={e=>sf('tipo_operacao',e.target.value)} style={sel}>
                    <option>Servicos Tomados</option><option>Servicos Prestados</option><option>Compra de Materiais</option>
                  </select>
                </div>
                <div><label style={lbl}>No DA NOTA</label><input value={form.numero_nota} onChange={e=>sf('numero_nota',e.target.value)} placeholder="001583" style={inp}/></div>
                <div><label style={lbl}>PRESTADOR DE SERVICO</label><input value={form.prestador} onChange={e=>sf('prestador',e.target.value)} placeholder="Razao Social" style={inp}/></div>
                <div><label style={lbl}>CNPJ PRESTADOR</label><input value={form.cnpj_prestador} onChange={e=>sf('cnpj_prestador',e.target.value)} placeholder="00.000.000/0001-00" style={inp}/></div>
                <div><label style={lbl}>VALOR TOTAL (R$)</label><input value={form.valor_total} onChange={e=>sf('valor_total',e.target.value)} placeholder="0,00" style={inp}/></div>
                <div><label style={lbl}>DATA EMISSAO</label><input type="date" value={form.data_emissao} onChange={e=>sf('data_emissao',e.target.value)} style={inp}/></div>
                <div style={{gridColumn:'1/-1'}}><label style={lbl}>DESCRICAO DO SERVICO</label>
                  <textarea value={form.descricao} onChange={e=>sf('descricao',e.target.value)} placeholder="Descreva o servico..." rows={3} style={{...inp,resize:'vertical',height:68}}/>
                </div>
                <div><label style={lbl}>CODIGO CNAE</label><input value={form.cnae} onChange={e=>sf('cnae',e.target.value)} placeholder="6201-5/01" style={inp}/></div>
                <div><label style={lbl}>CODIGO DE SERVICO (LC116)</label><input value={form.codigo_lc116} onChange={e=>sf('codigo_lc116',e.target.value)} placeholder="1.04" style={inp}/></div>
                <div><label style={lbl}>MUNICIPIO DO PRESTADOR</label><input value={form.municipio_prestador} onChange={e=>sf('municipio_prestador',e.target.value)} placeholder="Goiania/GO" style={inp}/></div>
                <div><label style={lbl}>ALIQUOTA ISS DECLARADA (%)</label><input value={form.aliquota_iss} onChange={e=>sf('aliquota_iss',e.target.value)} placeholder="2" style={inp}/></div>
                <div style={{gridColumn:'1/-1'}}><label style={lbl}>REGIME TRIBUTARIO DO PRESTADOR</label>
                  <select value={form.regime_prestador} onChange={e=>sf('regime_prestador',e.target.value)} style={sel}>
                    <option value="">Nao informado / Verificar</option>
                    <option value="Simples Nacional">Simples Nacional</option>
                    <option value="Lucro Presumido">Lucro Presumido</option>
                    <option value="Lucro Real">Lucro Real</option>
                  </select>
                </div>
              </div>

              <button onClick={executar} disabled={analisando} style={{marginTop:14,width:'100%',padding:'11px 0',borderRadius:8,background:analisando?'#ccc':NAVY,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:analisando?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                {analisando?'🤖 Analisando...':'🤖 Analisar Retencoes com IA Claude'}
              </button>
            </div>

            {/* Resultado */}
            <div style={{background:'#fff',borderRadius:10,border:'1px solid #e8e8e8',padding:'20px 24px',display:'flex',flexDirection:'column'}}>
              <div style={{fontWeight:700,fontSize:14,color:NAVY,marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span>🔍 Resultado da Analise</span>
                {analisando&&<span style={{fontSize:12,color:'#888',fontWeight:400}}>Aguardando analise...</span>}
              </div>

              {!resultado&&!analisando&&(
                <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,color:'#bbb'}}>
                  <span style={{fontSize:38}}>🤖</span>
                  <span style={{fontSize:13}}>Preencha os dados da NF e clique em <b style={{color:NAVY}}>Analisar</b></span>
                </div>
              )}

              {analisando&&<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:NAVY,gap:10,fontSize:14}}>⏳ Consultando Claude IA...</div>}

              {resultado&&!resultado.erro&&(
                <div style={{flex:1,display:'flex',flexDirection:'column',gap:10,overflowY:'auto'}}>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <span style={{background:NAVY+'15',color:NAVY,padding:'3px 12px',borderRadius:20,fontSize:11,fontWeight:700}}>{resultado.tipo_prestador||'PJ'}</span>
                    <span style={{background:'#E8F4FD',color:'#1a6fa8',padding:'3px 12px',borderRadius:20,fontSize:11,fontWeight:700}}>{resultado.regime_tributario||'Regime nao identificado'}</span>
                  </div>

                  {(resultado.retencoes||[]).map((r,i)=>(
                    <div key={i} style={{border:r.aplicavel?'1px solid #d4edda':'1px solid #f0f0f0',borderRadius:8,padding:'10px 12px',background:r.aplicavel?'#f0fff4':'#fafafa'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}}>
                        <div style={{display:'flex',alignItems:'center',gap:7}}>
                          <span style={{background:r.aplicavel?'#28a745':'#aaa',color:'#fff',padding:'2px 8px',borderRadius:12,fontSize:11,fontWeight:700}}>{r.codigo}</span>
                          <span style={{fontSize:12,fontWeight:600,color:'#333'}}>{r.label}</span>
                        </div>
                        <span style={{fontSize:13,fontWeight:700,color:r.aplicavel?'#28a745':'#aaa'}}>{r.aplicavel?fmtMoeda(r.valor):'Nao incide'}</span>
                      </div>
                      {r.aplicavel&&<div style={{fontSize:11,color:'#666',display:'flex',gap:12}}>
                        <span>Base: {fmtMoeda(r.base_calculo)}</span><span>Aliq: {r.aliquota}%</span>{r.vencimento&&<span>📅 {r.vencimento}</span>}
                      </div>}
                      <div style={{fontSize:11,color:'#888',marginTop:2}}>{r.fundamentacao}</div>
                      {r.observacao&&<div style={{fontSize:11,color:'#666',fontStyle:'italic',marginTop:1}}>{r.observacao}</div>}
                    </div>
                  ))}

                  <div style={{borderTop:'2px solid #e8e8e8',paddingTop:10,display:'flex',flexDirection:'column',gap:5}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}><span style={{color:'#555'}}>Valor Bruto</span><span style={{fontWeight:600}}>{fmtMoeda(parseFloat(form.valor_total)||0)}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}><span style={{color:'#d63031'}}>(-) Total Retencoes</span><span style={{fontWeight:700,color:'#d63031'}}>{fmtMoeda(resultado.total_retencoes||total)}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:14,fontWeight:700,borderTop:'1px solid #e8e8e8',paddingTop:7}}><span style={{color:NAVY}}>Valor Liquido a Pagar</span><span style={{color:'#00b894'}}>{fmtMoeda(resultado.valor_liquido||liquido)}</span></div>
                  </div>

                  {(resultado.alertas||[]).length>0&&(
                    <div style={{background:'#FFF3CD',border:'1px solid #ffc107',borderRadius:8,padding:'8px 12px'}}>
                      <div style={{fontWeight:700,color:'#856404',fontSize:11,marginBottom:3}}>⚠️ Alertas</div>
                      {resultado.alertas.map((a,i)=><div key={i} style={{fontSize:11,color:'#856404'}}>• {a}</div>)}
                    </div>
                  )}

                  {resultado.recomendacoes&&(
                    <div style={{background:'#E8F4FD',border:'1px solid #bee5eb',borderRadius:8,padding:'8px 12px'}}>
                      <div style={{fontWeight:700,color:NAVY,fontSize:11,marginBottom:3}}>💡 Recomendacoes</div>
                      <div style={{fontSize:11,color:'#555',lineHeight:1.6}}>{resultado.recomendacoes}</div>
                    </div>
                  )}

                  <button onClick={salvar} style={{padding:'9px 0',borderRadius:8,background:'#28a745',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                    💾 Salvar Analise
                  </button>
                </div>
              )}

              {resultado?.erro&&<div style={{background:'#FFF3CD',borderRadius:8,padding:14,fontSize:12,color:'#856404'}}>⚠️ Erro: {resultado.erro}</div>}
            </div>
          </div>

          {/* Historico */}
          <div style={{background:'#fff',borderRadius:10,border:'1px solid #e8e8e8',padding:'20px 24px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:14,color:NAVY}}>📋 Historico de Analises</div>
              <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar empresa ou nota..." style={{...inp,width:200,padding:'6px 10px',fontSize:12}}/>
            </div>

            {hist.length===0?(
              <div style={{textAlign:'center',padding:28,color:'#bbb',fontSize:13}}>Nenhuma analise salva ainda</div>
            ):(
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead>
                  <tr style={{background:'#f8f9fa'}}>
                    {['DATA','EMPRESA','NOTA','VALOR','RETENCOES','OBRIG. GERADAS','ACOES'].map(h=>(
                      <th key={h} style={{padding:'9px 12px',textAlign:'left',color:'#555',fontWeight:600,fontSize:11,borderBottom:'1px solid #e8e8e8'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hist.map((h,i)=>(
                    <tr key={h.id} style={{borderBottom:'1px solid #f0f0f0',background:i%2===0?'#fff':'#fafafa'}}>
import { FileText, Upload, Download, X } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'

function getClientes() { try { return JSON.parse(localStorage.getItem('ep_clientes')||'[]') } catch(e) { return [] } }
function getAnalises() { try { return JSON.parse(localStorage.getItem('ep_analises_ret')||'[]') } catch(e) { return [] } }
function saveAnalises(l) { localStorage.setItem('ep_analises_ret', JSON.stringify(l)) }
function fmtMoeda(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }
function fmtData(iso) { try { return new Date(iso).toLocaleDateString('pt-BR') } catch(e) { return '-' } }

const FORM0 = { tipo_operacao:'Servicos Tomados', numero_nota:'', prestador:'', cnpj_prestador:'', valor_total:'', data_emissao:'', descricao:'', cnae:'', codigo_lc116:'', municipio_prestador:'', aliquota_iss:'', regime_prestador:'' }
const API = import.meta.env.VITE_API_URL || ''

async function analisarIA(form) {
  const r = await fetch(API+'/api/v1/retencoes/proxy', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: `Voce e contador BR especialista em retencoes tributarias.
Analise a NF abaixo e determine TODAS as retencoes obrigatorias.

DADOS DA NOTA FISCAL:
- Tipo: ${form.tipo_operacao}
- NF: ${form.numero_nota}
- Prestador: ${form.prestador} (CNPJ: ${form.cnpj_prestador})
- Regime: ${form.regime_prestador || 'Nao informado - verificar'}
- Valor: R$ ${form.valor_total}
- Data: ${form.data_emissao}
- Descricao: ${form.descricao}
- CNAE: ${form.cnae}
- LC116: ${form.codigo_lc116}
- Municipio: ${form.municipio_prestador}
- Aliquota ISS: ${form.aliquota_iss}%

REGRAS CRITICAS:
1. INSS 11%: incide em cessao de mao de obra (vigilancia, limpeza, TI, construcao) - Lei 9.711/98
2. ISS: Simples Nacional = NAO retido (LC 123/2006). Lucro Presumido/Real = retido na aliquota declarada
3. IRRF: vigilancia 1%, limpeza 1%, TI 1.5%, consultoria 1.5% - verificar valor minimo
4. PIS/COFINS/CSLL: apenas se NAO Simples Nacional e valor >= R$ 215,05
5. Para vigilancia/portaria Simples Nacional: INSS INCIDE, ISS NAO incide, IRRF pode incidir

Responda APENAS JSON valido:
{"tipo_prestador":"PJ","regime_tributario":"Simples Nacional","retencoes":[{"codigo":"INSS","label":"INSS sobre Cessao de Mao de Obra","aliquota":11.0,"base_calculo":6968.10,"valor":766.49,"fundamentacao":"Lei 9.711/1998 art.31","aplicavel":true,"vencimento":"dia 20 mes seguinte - DCTF Web","observacao":"cessao mao de obra - vigilancia"},{"codigo":"ISS","label":"ISSQN Retido","aliquota":2.0,"base_calculo":null,"valor":null,"fundamentacao":"Simples Nacional LC 123/2006 - NAO retido","aplicavel":false,"vencimento":"","observacao":"Prestador Simples Nacional - isento"},{"codigo":"IRRF","label":"IRRF sobre Servicos","aliquota":1.0,"base_calculo":6968.10,"valor":69.68,"fundamentacao":"RIR art.714 - vigilancia 1%","aplicavel":true,"vencimento":"dia 20 mes seguinte - DARF","observacao":"Verificar valor minimo"},{"codigo":"PIS","label":"PIS Retido","aliquota":null,"base_calculo":null,"valor":null,"fundamentacao":"Simples Nacional - nao retido","aplicavel":false,"vencimento":"","observacao":""},{"codigo":"COFINS","label":"COFINS Retido","aliquota":null,"base_calculo":null,"valor":null,"fundamentacao":"Simples Nacional - nao retido","aplicavel":false,"vencimento":"","observacao":""},{"codigo":"CSLL","label":"CSLL Retido","aliquota":null,"base_calculo":null,"valor":null,"fundamentacao":"Simples Nacional - nao retido","aplicavel":false,"vencimento":"","observacao":""}],"total_retencoes":836.17,"valor_liquido":6131.93,"alertas":["Prestador Simples Nacional: ISS/PIS/COFINS/CSLL nao retidos","INSS retido por cessao de mao de obra - obrigatorio","IRRF 1% sobre servicos de vigilancia"],"recomendacoes":"texto","competencias_obrigacoes":{"INSS":"DCTF Web - dia 20","IRRF":"DARF - dia 20"}}` }]
    })
  })
  const d = await r.json()
  const txt = d.content?.[0]?.text || ''
  try { const m = txt.match(/\{[\s\S]*\}/); if(m) return JSON.parse(m[0]) } catch(e) {}
  return { erro: txt, retencoes: [] }
                      }
