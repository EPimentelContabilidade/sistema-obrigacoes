import React, { useState, useRef } from 'react'

import { FileText, Upload, Download, X } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'
const API = import.meta.env.VITE_API_URL || ''

function getClientes() { try { return JSON.parse(localStorage.getItem('ep_clientes')||'[]') } catch(e) { return [] } }
function getHist() { try { return JSON.parse(localStorage.getItem('ep_ar')||'[]') } catch(e) { return [] } }
function saveHist(l) { try { localStorage.setItem('ep_ar', JSON.stringify(l)) } catch(e) {} }
function fmtR(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }
function fmtD(iso) { try { return new Date(iso).toLocaleDateString('pt-BR') } catch(e) { return '-' } }

const F0 = {tipo:'Servicos Tomados',num:'',prestador:'',cnpj:'',valor:'',emissao:'',descricao:'',cnae:'',lc116:'',municipio:'',aliq_iss:'',regime:''}

const lbl = {display:'block',fontSize:11,fontWeight:700,color:'#666',marginBottom:4}
const inp = {width:'100%',boxSizing:'border-box',border:'1px solid #ddd',borderRadius:6,padding:'8px 10px',fontSize:13,color:'#333'}
const sel = {width:'100%',boxSizing:'border-box',border:'1px solid #ddd',borderRadius:6,padding:'8px 10px',fontSize:13,color:'#333',cursor:'pointer'}

async function analisarIA(f) {
  const prompt = 'Voce e contador BR. Analise a NF e determine as retencoes obrigatorias. ' +
    'Prestador: ' + f.prestador + ' CNPJ: ' + f.cnpj + ' Regime: ' + (f.regime||'verificar') + ' ' +
    'Valor: R$' + f.valor + ' Descricao: ' + f.descricao + ' CNAE: ' + f.cnae + ' LC116: ' + f.lc116 + ' ' +
    'REGRAS: INSS 11% em cessao de mao de obra; Simples Nacional: ISS/PIS/COFINS/CSLL NAO retidos; ' +
    'IRRF 1% vigilancia; Responda APENAS JSON: {tipo_prestador:"PJ",regime_tributario:"Simples Nacional",' +
    'retencoes:[{codigo:"INSS",label:"INSS",aliquota:11,base_calculo:1000,valor:110,fundamentacao:"Lei 9711",' +
    'aplicavel:true,vencimento:"dia 20 mes seguinte",observacao:""}],' +
    'total_retencoes:110,valor_liquido:890,alertas:[],recomendacoes:"",competencias_obrigacoes:{}}'
  const r = await fetch(API+'/api/v1/retencoes/proxy',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:3000,messages:[{role:'user',content:prompt}]})
  })
  const d = await r.json()
  const txt = d.content && d.content[0] ? d.content[0].text : ''
  try { const m = txt.match(/\{[\s\S]*\}/); if(m) return JSON.parse(m[0]) } catch(e) {}
  return {erro:txt,retencoes:[]}
}

export default function AnaliseRetencoes() {
  const [aba, setAba] = useState('analise')
  const [form, setForm] = useState(Object.assign({},F0))
  const [analisando, setAnalisando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [historico, setHistorico] = useState(getHist())
  const [busca, setBusca] = useState('')
  const [obrigG, setObrigG] = useState({})
  const clientes = getClientes()
  const sf = function(k,v) { setForm(function(f) { var n=Object.assign({},f); n[k]=v; return n }) }

  const executar = async function() {
    if(!form.prestador||!form.valor||!form.descricao){alert('Preencha Prestador, Valor e Descricao.');return}
    setAnalisando(true); setResultado(null)
    try { setResultado(await analisarIA(form)) }
    catch(e) { setResultado({erro:e.message,retencoes:[]}) }
    finally { setAnalisando(false) }
  }

  const salvar = function() {
    if(!resultado) return
    var nova={id:Date.now()+'',data:new Date().toISOString().split('T')[0],empresa:form.prestador,nota:form.num||'-',valor:parseFloat(form.valor)||0,retencoes_tags:(resultado.retencoes||[]).filter(function(r){return r.aplicavel}).map(function(r){return r.codigo}),resultado:resultado,form:Object.assign({},form),obrig_geradas:0}
    var novo=[nova].concat(historico)
    setHistorico(novo); saveHist(novo)
    alert('Analise salva!')
  }

  const gerarObrig = async function(h) {
    var rets=(h.resultado&&h.resultado.retencoes||[]).filter(function(r){return r.aplicavel})
    if(!rets.length){alert('Nenhuma retencao aplicavel.');return}
    var n=0
    for(var i=0;i<rets.length;i++){
      try {
        var r=rets[i]
        await fetch(API+'/api/v1/entregas',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({titulo:r.codigo+' - NF '+h.nota+' - '+h.empresa,descricao:r.label+' | Valor: '+fmtR(r.valor),valor:r.valor,tipo:'retencao',status:'pendente',origem:'analise_retencoes'})})
        n++
      } catch(e) {}
    }
    var novo=historico.map(function(x){return x.id===h.id?Object.assign({},x,{obrig_geradas:n}):x})
    setHistorico(novo); saveHist(novo)
    var ng=Object.assign({},obrigG); ng[h.id]=n; setObrigG(ng)
    alert(n+' obrigacao(oes) gerada(s)!')
  }

  var total=(resultado&&resultado.retencoes||[]).filter(function(r){return r.aplicavel}).reduce(function(s,r){return s+(r.valor||0)},0)
  var liquido=(parseFloat(form.valor)||0)-total
  var hist=historico.filter(function(h){return !busca||h.empresa.toLowerCase().includes(busca.toLowerCase())||h.nota.includes(busca)})

  return (
    React.createElement('div',{style:{height:'100%',display:'flex',flexDirection:'column',background:'#f0f2f5',fontFamily:'Inter,system-ui,sans-serif'}},
      React.createElement('div',{style:{background:'#fff',borderBottom:'1px solid #e8e8e8',padding:'0 24px',flexShrink:0}},
        React.createElement('div',{style:{display:'flex'}},
          [{id:'analise',label:'Analise de Retencoes'},{id:'conciliacao',label:'Conciliacao'},{id:'indicadores',label:'Indicadores'}].map(function(t){
            return React.createElement('button',{key:t.id,onClick:function(){setAba(t.id)},style:{padding:'14px 20px',border:'none',background:'none',cursor:'pointer',fontSize:13,fontWeight:600,color:aba===t.id?NAVY:'#888',borderBottom:aba===t.id?'3px solid '+NAVY:'3px solid transparent'}},t.label)
          })
        )
      ),

      aba!=='analise'&&React.createElement('div',{style:{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'#999',fontSize:14}},'Em desenvolvimento'),

      aba==='analise'&&React.createElement('div',{style:{flex:1,overflowY:'auto',padding:'20px 24px',display:'flex',flexDirection:'column',gap:20}},

        React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}},

          React.createElement('div',{style:{background:'#fff',borderRadius:10,border:'1px solid #e8e8e8',padding:'20px 24px'}},
            React.createElement('div',{style:{fontWeight:700,fontSize:14,color:NAVY,marginBottom:16}},'\uD83D\uDCC4 Dados da Nota Fiscal'),

            React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}},
              React.createElement('div',null,React.createElement('label',{style:lbl},'TIPO DE OPERACAO'),React.createElement('select',{value:form.tipo,onChange:function(e){sf('tipo',e.target.value)},style:sel},React.createElement('option',null,'Servicos Tomados'),React.createElement('option',null,'Servicos Prestados'))),
              React.createElement('div',null,React.createElement('label',{style:lbl},'N\u00BA DA NOTA'),React.createElement('input',{value:form.num,onChange:function(e){sf('num',e.target.value)},placeholder:'001583',style:inp})),
              React.createElement('div',null,React.createElement('label',{style:lbl},'PRESTADOR'),React.createElement('input',{value:form.prestador,onChange:function(e){sf('prestador',e.target.value)},placeholder:'Razao Social',style:inp})),
              React.createElement('div',null,React.createElement('label',{style:lbl},'CNPJ PRESTADOR'),React.createElement('input',{value:form.cnpj,onChange:function(e){sf('cnpj',e.target.value)},placeholder:'00.000.000/0001-00',style:inp})),
              React.createElement('div',null,React.createElement('label',{style:lbl},'VALOR TOTAL (R$)'),React.createElement('input',{value:form.valor,onChange:function(e){sf('valor',e.target.value)},placeholder:'0,00',style:inp})),
              React.createElement('div',null,React.createElement('label',{style:lbl},'DATA EMISSAO'),React.createElement('input',{type:'date',value:form.emissao,onChange:function(e){sf('emissao',e.target.value)},style:inp})),
              React.createElement('div',{style:{gridColumn:'1/-1'}},React.createElement('label',{style:lbl},'DESCRICAO DO SERVICO'),React.createElement('textarea',{value:form.descricao,onChange:function(e){sf('descricao',e.target.value)},placeholder:'Descreva o servico...',rows:3,style:Object.assign({},inp,{resize:'vertical',height:68})})),
              React.createElement('div',null,React.createElement('label',{style:lbl},'CODIGO CNAE'),React.createElement('input',{value:form.cnae,onChange:function(e){sf('cnae',e.target.value)},placeholder:'8011-1/01',style:inp})),
              React.createElement('div',null,React.createElement('label',{style:lbl},'CODIGO LC116'),React.createElement('input',{value:form.lc116,onChange:function(e){sf('lc116',e.target.value)},placeholder:'11.02',style:inp})),
              React.createElement('div',null,React.createElement('label',{style:lbl},'MUNICIPIO PRESTADOR'),React.createElement('input',{value:form.municipio,onChange:function(e){sf('municipio',e.target.value)},placeholder:'Goiania/GO',style:inp})),
              React.createElement('div',null,React.createElement('label',{style:lbl},'ALIQUOTA ISS (%)'),React.createElement('input',{value:form.aliq_iss,onChange:function(e){sf('aliq_iss',e.target.value)},placeholder:'2',style:inp})),
              React.createElement('div',{style:{gridColumn:'1/-1'}},React.createElement('label',{style:lbl},'REGIME TRIBUTARIO'),React.createElement('select',{value:form.regime,onChange:function(e){sf('regime',e.target.value)},style:sel},React.createElement('option',{value:''},'Nao informado'),React.createElement('option',{value:'Simples Nacional'},'Simples Nacional'),React.createElement('option',{value:'Lucro Presumido'},'Lucro Presumido'),React.createElement('option',{value:'Lucro Real'},'Lucro Real')))
            ),

            React.createElement('button',{onClick:executar,disabled:analisando,style:{marginTop:14,width:'100%',padding:'11px 0',borderRadius:8,background:analisando?'#ccc':NAVY,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:analisando?'not-allowed':'pointer'}},
              analisando?'\uD83E\uDD16 Analisando...':'\uD83E\uDD16 Analisar Retencoes com IA Claude'
            )
          ),

          React.createElement('div',{style:{background:'#fff',borderRadius:10,border:'1px solid #e8e8e8',padding:'20px 24px',display:'flex',flexDirection:'column'}},
            React.createElement('div',{style:{fontWeight:700,fontSize:14,color:NAVY,marginBottom:16}},'\uD83D\uDD0D Resultado da Analise'),
            !resultado&&!analisando&&React.createElement('div',{style:{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,color:'#bbb'}},
              React.createElement('span',{style:{fontSize:38}},'\uD83E\uDD16'),
              React.createElement('span',{style:{fontSize:13}},React.createElement('span',null,'Preencha os dados e clique em '),React.createElement('b',{style:{color:NAVY}},'Analisar'))
            ),
            analisando&&React.createElement('div',{style:{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:NAVY,gap:10,fontSize:14}},'\u23F3 Consultando Claude IA...'),
            resultado&&!resultado.erro&&React.createElement('div',{style:{flex:1,display:'flex',flexDirection:'column',gap:10,overflowY:'auto'}},
              React.createElement('div',{style:{display:'flex',gap:8}},
                React.createElement('span',{style:{background:NAVY+'15',color:NAVY,padding:'3px 12px',borderRadius:20,fontSize:11,fontWeight:700}},resultado.tipo_prestador||'PJ'),
                React.createElement('span',{style:{background:'#E8F4FD',color:'#1a6fa8',padding:'3px 12px',borderRadius:20,fontSize:11,fontWeight:700}},resultado.regime_tributario||'Regime nao id.')
              ),
              (resultado.retencoes||[]).map(function(r,i){
                return React.createElement('div',{key:i,style:{border:r.aplicavel?'1px solid #d4edda':'1px solid #f0f0f0',borderRadius:8,padding:'10px 12px',background:r.aplicavel?'#f0fff4':'#fafafa'}},
                  React.createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}},
                    React.createElement('div',{style:{display:'flex',alignItems:'center',gap:7}},
                      React.createElement('span',{style:{background:r.aplicavel?'#28a745':'#aaa',color:'#fff',padding:'2px 8px',borderRadius:12,fontSize:11,fontWeight:700}},r.codigo),
                      React.createElement('span',{style:{fontSize:12,fontWeight:600,color:'#333'}},r.label)
                    ),
                    React.createElement('span',{style:{fontSize:13,fontWeight:700,color:r.aplicavel?'#28a745':'#aaa'}},r.aplicavel?fmtR(r.valor):'Nao incide')
                  ),
                  r.aplicavel&&React.createElement('div',{style:{fontSize:11,color:'#666',display:'flex',gap:12}},
                    React.createElement('span',null,'Base: '+fmtR(r.base_calculo)),
                    React.createElement('span',null,'Aliq: '+r.aliquota+'%'),
                    r.vencimento&&React.createElement('span',null,'\uD83D\uDCC5 '+r.vencimento)
                  ),
                  React.createElement('div',{style:{fontSize:11,color:'#888',marginTop:2}},r.fundamentacao),
                  r.observacao&&React.createElement('div',{style:{fontSize:11,color:'#666',fontStyle:'italic',marginTop:1}},r.observacao)
                )
              }),
              React.createElement('div',{style:{borderTop:'2px solid #e8e8e8',paddingTop:10,display:'flex',flexDirection:'column',gap:5}},
                React.createElement('div',{style:{display:'flex',justifyContent:'space-between',fontSize:13}},React.createElement('span',{style:{color:'#555'}},'Valor Bruto'),React.createElement('span',{style:{fontWeight:600}},fmtR(parseFloat(form.valor)||0))),
                React.createElement('div',{style:{display:'flex',justifyContent:'space-between',fontSize:13}},React.createElement('span',{style:{color:'#d63031'}},'(-) Total Retencoes'),React.createElement('span',{style:{fontWeight:700,color:'#d63031'}},fmtR(resultado.total_retencoes||total))),
                React.createElement('div',{style:{display:'flex',justifyContent:'space-between',fontSize:14,fontWeight:700,borderTop:'1px solid #e8e8e8',paddingTop:7}},React.createElement('span',{style:{color:NAVY}},'Valor Liquido'),React.createElement('span',{style:{color:'#00b894'}},fmtR(resultado.valor_liquido||liquido)))
              ),
              (resultado.alertas||[]).length>0&&React.createElement('div',{style:{background:'#FFF3CD',border:'1px solid #ffc107',borderRadius:8,padding:'8px 12px'}},
                React.createElement('div',{style:{fontWeight:700,color:'#856404',fontSize:11,marginBottom:3}},'\u26A0\uFE0F Alertas'),
                (resultado.alertas||[]).map(function(a,i){return React.createElement('div',{key:i,style:{fontSize:11,color:'#856404'}},'• '+a)})
              ),
              resultado.recomendacoes&&React.createElement('div',{style:{background:'#E8F4FD',border:'1px solid #bee5eb',borderRadius:8,padding:'8px 12px'}},
                React.createElement('div',{style:{fontWeight:700,color:NAVY,fontSize:11,marginBottom:3}},'\uD83D\uDCA1 Recomendacoes'),
                React.createElement('div',{style:{fontSize:11,color:'#555',lineHeight:1.6}},resultado.recomendacoes)
              ),
              React.createElement('button',{onClick:salvar,style:{padding:'9px 0',borderRadius:8,background:'#28a745',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer'}},
                '\uD83D\uDCBE Salvar Analise'
              )
            ),
            resultado&&resultado.erro&&React.createElement('div',{style:{background:'#FFF3CD',borderRadius:8,padding:14,fontSize:12,color:'#856404'}},'\u26A0\uFE0F Erro: '+resultado.erro)
          )
        ),

        React.createElement('div',{style:{background:'#fff',borderRadius:10,border:'1px solid #e8e8e8',padding:'20px 24px'}},
          React.createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}},
            React.createElement('div',{style:{fontWeight:700,fontSize:14,color:NAVY}},'\uD83D\uDCCB Historico de Analises'),
            React.createElement('input',{value:busca,onChange:function(e){setBusca(e.target.value)},placeholder:'Buscar empresa ou nota...',style:Object.assign({},inp,{width:200,padding:'6px 10px',fontSize:12})})
          ),
          hist.length===0?React.createElement('div',{style:{textAlign:'center',padding:28,color:'#bbb',fontSize:13}},'Nenhuma analise salva ainda'):
          React.createElement('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:13}},
            React.createElement('thead',null,
              React.createElement('tr',{style:{background:'#f8f9fa'}},
                ['DATA','EMPRESA','NOTA','VALOR','RETENCOES','OBRIG.','ACOES'].map(function(h){
                  return React.createElement('th',{key:h,style:{padding:'9px 12px',textAlign:'left',color:'#555',fontWeight:600,fontSize:11,borderBottom:'1px solid #e8e8e8'}},h)
                })
              )
            ),
            React.createElement('tbody',null,
              hist.map(function(h,i){
                return React.createElement('tr',{key:h.id,style:{borderBottom:'1px solid #f0f0f0',background:i%2===0?'#fff':'#fafafa'}},
                  React.createElement('td',{style:{padding:'9px 12px',color:'#555'}},fmtD(h.data)),
                  React.createElement('td',{style:{padding:'9px 12px',fontWeight:600,color:NAVY}},h.empresa),
                  React.createElement('td',{style:{padding:'9px 12px',color:'#555'}},h.nota!=='-'?'NFS '+h.nota:'-'),
                  React.createElement('td',{style:{padding:'9px 12px',fontWeight:600}},fmtR(h.valor)),
                  React.createElement('td',{style:{padding:'9px 12px'}},
                    React.createElement('div',{style:{display:'flex',gap:4,flexWrap:'wrap'}},
                      (h.retencoes_tags||[]).map(function(t){
                        return React.createElement('span',{key:t,style:{background:t==='INSS'?'#EBF5FF':t==='IRRF'?'#F3EEFF':t==='ISS'?'#EDFBF1':'#FFF3E0',color:t==='INSS'?'#1D6FA4':t==='IRRF'?'#6B3EC9':t==='ISS'?'#1A7A3C':'#E65100',padding:'2px 7px',borderRadius:12,fontSize:11,fontWeight:700}},t)
                      }),
                      (h.retencoes_tags||[]).length===0&&React.createElement('span',{style:{color:'#aaa',fontSize:11}},'-')
                    )
                  ),
                  React.createElement('td',{style:{padding:'9px 12px'}},
                    (obrigG[h.id]||h.obrig_geradas)>0
                      ?React.createElement('span',{style:{background:'#d4edda',color:'#155724',padding:'2px 9px',borderRadius:12,fontSize:11,fontWeight:700}},(obrigG[h.id]||h.obrig_geradas)+' criadas')
                      :React.createElement('span',{style:{color:'#aaa',fontSize:11}},'-')
                  ),
                  React.createElement('td',{style:{padding:'9px 12px'}},
                    React.createElement('div',{style:{display:'flex',gap:6}},
                      React.createElement('button',{onClick:function(){setForm(Object.assign({},F0,h.form));setResultado(h.resultado);window.scrollTo(0,0)},style:{padding:'4px 9px',borderRadius:6,border:'1px solid '+NAVY,background:'#fff',color:NAVY,fontSize:11,cursor:'pointer',fontWeight:600}},'Ver'),
                      (h.retencoes_tags||[]).length>0&&!(obrigG[h.id]||h.obrig_geradas)&&React.createElement('button',{onClick:function(){gerarObrig(h)},style:{padding:'4px 9px',borderRadius:6,border:'none',background:'#28a745',color:'#fff',fontSize:11,cursor:'pointer',fontWeight:600,whiteSpace:'nowrap'}},'+ Obrigacoes')
                    )
                  )
                )
              })
            )
          )
        )
      )
    )
  )
    }
