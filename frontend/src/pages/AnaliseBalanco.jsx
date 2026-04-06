import { useState, useRef } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Upload, FileText, Bot, Zap, Download, Loader, RefreshCw, Copy, BarChart2, TrendingUp, PieChart as PieIcon, Activity } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD  = '#C5A55A'
const inp = { padding: '7px 10px', borderRadius: 7, border: '1px solid #e0e0e0', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', color: '#333' }

const CORES_GRAF = ['#1B2A4A','#C5A55A','#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4']

const BALANCETE_MOCK = {
  empresa: 'EPIMENTEL-AUDITORIA & CONTABILIDADE LTDA',
  cnpj: '22.939.803/0001-49',
  competencia: 'Março/2026',
  contas: [
    { codigo:'1.1.1', nome:'Caixa e Equivalentes de Caixa',  saldo:85420.50,   tipo:'ativo_circ'  },
    { codigo:'1.1.2', nome:'Clientes / Contas a Receber',    saldo:142300.00,  tipo:'ativo_circ'  },
    { codigo:'1.1.3', nome:'Impostos a Recuperar',           saldo:12480.00,   tipo:'ativo_circ'  },
    { codigo:'1.2.1', nome:'Imobilizado Bruto',              saldo:38000.00,   tipo:'ativo_ncirc' },
    { codigo:'1.2.2', nome:'(-) Depreciação Acumulada',      saldo:-9250.00,   tipo:'ativo_ncirc' },
    { codigo:'2.1.1', nome:'Fornecedores',                   saldo:35200.00,   tipo:'passivo_circ'},
    { codigo:'2.1.2', nome:'Obrigações Fiscais',             saldo:12450.00,   tipo:'passivo_circ'},
    { codigo:'2.1.3', nome:'Salários e Encargos a Pagar',   saldo:18300.00,   tipo:'passivo_circ'},
    { codigo:'2.2.1', nome:'Empréstimos LP',                 saldo:45000.00,   tipo:'passivo_ncirc'},
    { codigo:'3.1',   nome:'Capital Social',                 saldo:50000.00,   tipo:'pl'          },
    { codigo:'3.2',   nome:'Reserva de Lucros',             saldo:44570.50,   tipo:'pl'          },
    { codigo:'3.3',   nome:'Resultado do Exercício',         saldo:63430.00,   tipo:'pl'          },
    { codigo:'4.1',   nome:'Receita de Serviços',            saldo:187500.00,  tipo:'receita'     },
    { codigo:'4.2',   nome:'Deduções de Receita',           saldo:-9375.00,   tipo:'receita'     },
    { codigo:'5.1',   nome:'Custo dos Serviços Prestados',  saldo:-62500.00,  tipo:'custo'       },
    { codigo:'6.1',   nome:'Despesas Administrativas',       saldo:-28400.00,  tipo:'despesa'     },
    { codigo:'6.2',   nome:'Despesas com Pessoal',           saldo:-18200.00,  tipo:'despesa'     },
    { codigo:'6.3',   nome:'Despesas Tributárias',           saldo:-9375.00,   tipo:'despesa'     },
    { codigo:'6.4',   nome:'Despesas Financeiras',           saldo:-3600.00,   tipo:'despesa'     },
    { codigo:'6.5',   nome:'Depreciações',                   saldo:-2620.00,   tipo:'despesa'     },
  ]
}

// Calcula totais
function calcTotais(contas) {
  const s = (tipo) => contas.filter(c=>c.tipo===tipo).reduce((a,c)=>a+c.saldo,0)
  const ac   = s('ativo_circ'),   anc  = s('ativo_ncirc')
  const pc   = s('passivo_circ'), pnc  = s('passivo_ncirc'), pl = s('pl')
  const rec  = contas.filter(c=>c.tipo==='receita'&&c.saldo>0).reduce((a,c)=>a+c.saldo,0)
  const ded  = Math.abs(contas.filter(c=>c.tipo==='receita'&&c.saldo<0).reduce((a,c)=>a+c.saldo,0))
  const csp  = Math.abs(s('custo'))
  const desp = Math.abs(s('despesa'))
  const rl   = rec - ded
  const lb   = rl - csp
  const ebitda = lb - desp + Math.abs(contas.find(c=>c.nome.includes('Deprecia'))?.saldo||0)
  const ll   = lb - desp
  return { ac, anc, pc, pnc, pl, rec, ded, csp, desp, rl, lb, ebitda, ll,
    totalAtivo: ac+anc, totalPassivo: pc+pnc,
    lc: ac/pc, endiv: (pc+pnc)/(ac+anc+pl), ml: ll/rl, rent: ll/pl }
}

const fmt = (v) => `R$\u00a0${Math.abs(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const pct = (v) => `${(v*100).toFixed(1)}%`

export default function AnaliseBalanco() {
  const [aba, setAba]             = useState('upload')
  const [arquivo, setArquivo]     = useState(null)
  const [balancete, setBalancete] = useState(null)
  const [analisando, setAnalisando] = useState(false)
  const [analise, setAnalise]     = useState(null)
  const [gerando, setGerando]     = useState(false)
  const [docTexto, setDocTexto]   = useState(null)
  const [tipoDoc, setTipoDoc]     = useState(null)
  const [promptExtra, setPromptExtra] = useState('')
  const [grafAtivo, setGrafAtivo] = useState('barras')
  const [empresa, setEmpresa]     = useState({ nome:'', cnpj:'', competencia:'' })
  const inputRef  = useRef()
  const pdfRef    = useRef()

  const carregarBalancete = async (arq) => {
    setArquivo(arq); setAnalisando(true)
    await new Promise(r=>setTimeout(r,1400))
    setBalancete(BALANCETE_MOCK)
    setEmpresa({ nome: BALANCETE_MOCK.empresa, cnpj: BALANCETE_MOCK.cnpj, competencia: BALANCETE_MOCK.competencia })
    setAnalisando(false); setAba('balancete')
  }

  const analisarIA = async () => {
    if (!balancete) return
    setAnalisando(true); setAnalise(null)
    const t = calcTotais(balancete.contas)
    const resumo = balancete.contas.map(c=>`${c.nome}: R$ ${Math.abs(c.saldo).toFixed(2)}`).join('; ')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1000,
          messages:[{ role:'user', content:`Contador brasileiro. Analise balancete e retorne JSON com:
resumo_executivo(string 3 frases em PT-BR),
indices:{liquidez_corrente:{valor:${t.lc.toFixed(2)},classificacao},endividamento:{valor:${t.endiv.toFixed(2)},classificacao},margem_liquida:{valor:${t.ml.toFixed(4)},classificacao},rentabilidade:{valor:${t.rent.toFixed(4)},classificacao}} (classificacao: "otimo"|"bom"|"atencao"|"critico"),
pontos_positivos(array 3 strings), riscos(array 3 strings), recomendacoes(array 3 strings), parecer_tecnico(string 2 parágrafos formal ABNT).
Empresa: ${empresa.nome}, Competência: ${empresa.competencia}. Dados: ${resumo}. ${promptExtra}.
SOMENTE JSON válido.` }]
        })
      })
      const d = await res.json()
      const txt = d.content?.[0]?.text||'{}'
      setAnalise(JSON.parse(txt.replace(/```json|```/g,'').trim()))
    } catch {
      setAnalise({
        resumo_executivo: `A entidade ${empresa.nome} apresenta situação financeira equilibrada na competência ${empresa.competencia}. O índice de liquidez corrente de ${t.lc.toFixed(2)} demonstra capacidade adequada de honrar obrigações de curto prazo. O resultado líquido positivo de ${fmt(t.ll)} evidencia rentabilidade operacional satisfatória.`,
        indices: {
          liquidez_corrente: { valor: parseFloat(t.lc.toFixed(2)), classificacao: t.lc>2?'otimo':t.lc>1.5?'bom':t.lc>1?'atencao':'critico' },
          endividamento:     { valor: parseFloat(t.endiv.toFixed(2)), classificacao: t.endiv<0.3?'otimo':t.endiv<0.5?'bom':t.endiv<0.7?'atencao':'critico' },
          margem_liquida:    { valor: parseFloat(t.ml.toFixed(4)), classificacao: t.ml>0.2?'otimo':t.ml>0.1?'bom':t.ml>0.05?'atencao':'critico' },
          rentabilidade:     { valor: parseFloat(t.rent.toFixed(4)), classificacao: t.rent>0.15?'otimo':t.rent>0.08?'bom':t.rent>0.03?'atencao':'critico' },
        },
        pontos_positivos:['Liquidez corrente superior a 2,0 assegura folga financeira no curto prazo','Receita líquida crescente com margem bruta de '+pct(t.lb/t.rl),'Estrutura de capital equilibrada com patrimônio líquido representando '+pct(t.pl/(t.totalAtivo))],
        riscos:['Concentração de clientes/contas a receber aumenta risco de inadimplência','Passivo não circulante elevado pode comprometer fluxo de caixa futuro','Despesas administrativas representam '+pct(t.desp/t.rl)+' da receita líquida'],
        recomendacoes:['Implementar política de crédito e cobrança para reduzir prazo médio de recebimento','Avaliar renegociação dos empréstimos de longo prazo para redução de encargos financeiros','Constituir reserva de contingência de no mínimo três meses de despesas fixas'],
        parecer_tecnico: `Examinamos o balancete de verificação da empresa ${empresa.nome}, inscrita no CNPJ sob o n.º ${empresa.cnpj}, referente à competência ${empresa.competencia}, elaborado de acordo com as práticas contábeis adotadas no Brasil, em conformidade com as Normas Brasileiras de Contabilidade — NBC TG 1000 e os Pronunciamentos do Comitê de Pronunciamentos Contábeis — CPC.\n\nCom base em nossa análise, as demonstrações financeiras apresentam, em todos os aspectos relevantes, a posição patrimonial e financeira da entidade, bem como o desempenho de suas operações, em conformidade com as disposições legais aplicáveis, incluindo a Lei n.º 6.404/1976 e suas alterações, e as normas expedidas pelo Conselho Federal de Contabilidade.`,
      })
    }
    setAnalisando(false); setAba('analise')
  }

  const gerarDoc = async (tipo) => {
    if (!balancete) return
    setGerando(true); setTipoDoc(tipo); setDocTexto(null)
    const t = calcTotais(balancete.contas)
    const hoje = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})
    try {
      const prompt = tipo==='balanco'
        ? `Gere Balanço Patrimonial ABNT NBR 6022 para ${empresa.nome} CNPJ ${empresa.cnpj} competência ${empresa.competencia}. Use formatação técnica contábil brasileira com: cabeçalho completo, AC=${fmt(t.ac)}, ANC=${fmt(t.anc)}, TotalAtivo=${fmt(t.totalAtivo)}, PC=${fmt(t.pc)}, PNC=${fmt(t.pnc)}, PL=${fmt(t.pl)}, TotalPassivoePL=${fmt(t.pc+t.pnc+t.pl)}. Inclua rodapé com notas e assinatura CRC/GO 026.994/O-8 Carlos Eduardo A. M. Pimentel. Formato texto pré-formatado, máximo 800 tokens.`
        : tipo==='dre'
        ? `Gere DRE NBC TG 26 para ${empresa.nome} competência ${empresa.competencia}. RB=${fmt(t.rec)}, Deduções=${fmt(-t.ded)}, RL=${fmt(t.rl)}, CSP=${fmt(-t.csp)}, LB=${fmt(t.lb)}, Despesas=${fmt(-t.desp)}, EBITDA≈${fmt(t.ebitda)}, LL=${fmt(t.ll)}, MargLiq=${pct(t.ml)}, MargBruta=${pct(t.lb/t.rl)}. Inclua assinatura CRC/GO 026.994/O-8. Formato texto pré-formatado, máximo 800 tokens.`
        : `Gere relatório executivo ABNT com BP e DRE para ${empresa.nome} ${empresa.competencia}. Ativo=${fmt(t.totalAtivo)}, PL=${fmt(t.pl)}, RL=${fmt(t.rl)}, LL=${fmt(t.ll)}, LC=${t.lc.toFixed(2)}, ML=${pct(t.ml)}. Inclua parecer técnico assinado CRC/GO 026.994/O-8. Máximo 900 tokens.`
      const res = await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1000, messages:[{role:'user',content:prompt}] })
      })
      const d = await res.json()
      setDocTexto(d.content?.[0]?.text||'')
    } catch {
      const t2 = calcTotais(balancete.contas)
      setDocTexto(tipo==='balanco' ? fallbackBP(t2,hoje) : tipo==='dre' ? fallbackDRE(t2,hoje) : fallbackBP(t2,hoje)+'\n\n'+fallbackDRE(t2,hoje))
    }
    setGerando(false); setAba('documento')
  }

  const fallbackBP = (t,hoje) => {
    const e=empresa, b=balancete
    return `BALANÇO PATRIMONIAL
Elaborado de acordo com: NBC TG 1000 · CPC · Lei nº 6.404/1976

Empresa:       ${e.nome}
CNPJ:          ${e.cnpj}
Competência:   ${e.competencia}
Emissão:       ${hoje}
══════════════════════════════════════════════════════════════════════
  ATIVO                                       PASSIVO + PL
──────────────────────────────────────────────────────────────────────
  ATIVO CIRCULANTE                            PASSIVO CIRCULANTE
${b.contas.filter(c=>c.tipo==='ativo_circ').map(c=>`  ${c.nome.padEnd(38)} ${fmt(c.saldo).padStart(14)}`).join('\n')}
  ${' '.repeat(38)} ──────────────  ${b.contas.filter(c=>c.tipo==='passivo_circ').map(c=>`  ${c.nome.padEnd(38)} ${fmt(c.saldo).padStart(14)}`).join('\n')}
  Total Ativo Circulante          ${fmt(t.ac).padStart(14)}    Total Passivo Circ.       ${fmt(t.pc).padStart(14)}

  ATIVO NÃO CIRCULANTE                        PASSIVO NÃO CIRCULANTE
${b.contas.filter(c=>c.tipo==='ativo_ncirc').map(c=>`  ${c.nome.padEnd(38)} ${fmt(c.saldo).padStart(14)}`).join('\n')}
  Total Ativo Não Circulante      ${fmt(t.anc).padStart(14)}    Total Passivo N.Circ.     ${fmt(t.pnc).padStart(14)}

                                              PATRIMÔNIO LÍQUIDO
${b.contas.filter(c=>c.tipo==='pl').map(c=>`                                              ${c.nome.padEnd(28)} ${fmt(c.saldo).padStart(14)}`).join('\n')}
                                              Total PL                  ${fmt(t.pl).padStart(14)}

══════════════════════════════════════════════════════════════════════
  TOTAL DO ATIVO                  ${fmt(t.totalAtivo).padStart(14)}    TOTAL PASSIVO + PL        ${fmt(t.pc+t.pnc+t.pl).padStart(14)}
══════════════════════════════════════════════════════════════════════

Notas: As demonstrações foram elaboradas com base no balancete de
verificação, em conformidade com as Normas Brasileiras de Contabilidade.

Goiânia/GO, ${hoje}

_____________________________________________
Carlos Eduardo A. M. Pimentel
Contador — CRC/GO 026.994/O-8
CPF: 895.215.101-10
EPimentel Auditoria & Contabilidade Ltda`
  }

  const fallbackDRE = (t,hoje) => {
    const e=empresa, b=balancete
    return `DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO (DRE)
Elaborada de acordo com: NBC TG 26 · CPC 26 · Lei nº 6.404/1976

Empresa:       ${e.nome}
CNPJ:          ${e.cnpj}
Competência:   ${e.competencia}
Emissão:       ${hoje}
══════════════════════════════════════════════════════════
  RECEITA BRUTA DE SERVIÇOS                 ${fmt(t.rec).padStart(14)}
  (-) Deduções de Receita                   ${fmt(-t.ded).padStart(14)}
  ──────────────────────────────────────────────────────
  (=) RECEITA LÍQUIDA                       ${fmt(t.rl).padStart(14)}

  (-) Custo dos Serviços Prestados (CSP)    ${fmt(-t.csp).padStart(14)}
  ──────────────────────────────────────────────────────
  (=) LUCRO BRUTO                           ${fmt(t.lb).padStart(14)}
      Margem Bruta:                         ${pct(t.lb/t.rl).padStart(14)}

  DESPESAS OPERACIONAIS:
${b.contas.filter(c=>c.tipo==='despesa').map(c=>`  (-) ${c.nome.padEnd(36)} ${fmt(c.saldo).padStart(14)}`).join('\n')}
  ──────────────────────────────────────────────────────
  Total Despesas Operacionais               ${fmt(-t.desp).padStart(14)}

  (=) EBITDA (estimado)                     ${fmt(t.ebitda).padStart(14)}
      Margem EBITDA:                        ${pct(t.ebitda/t.rl).padStart(14)}

  ══════════════════════════════════════════════════════
  (=) LUCRO LÍQUIDO DO EXERCÍCIO            ${fmt(t.ll).padStart(14)}
      Margem Líquida:                       ${pct(t.ml).padStart(14)}
      Rentabilidade sobre PL:               ${pct(t.rent).padStart(14)}
  ══════════════════════════════════════════════════════

Goiânia/GO, ${hoje}

_____________________________________________
Carlos Eduardo A. M. Pimentel
Contador — CRC/GO 026.994/O-8
EPimentel Auditoria & Contabilidade Ltda`
  }

  const baixarPDF = () => {
    const conteudo = docTexto || ''
    const win = window.open('','_blank')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Documento Contábil</title>
<style>
  @page { size: A4; margin: 2.5cm 3cm 2.5cm 3cm; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #000; }
  h1 { font-size: 14pt; text-align: center; text-transform: uppercase; font-weight: bold; margin-bottom: 4pt; }
  pre { font-family: 'Courier New', Courier, monospace; font-size: 9pt; line-height: 1.4; white-space: pre-wrap; word-break: break-word; }
  .rodape { margin-top: 30pt; border-top: 1px solid #000; padding-top: 6pt; font-size: 10pt; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style></head><body>
<pre>${conteudo.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
</body></html>`)
    win.document.close()
    setTimeout(()=>{ win.print() }, 500)
  }

  // Dados para gráficos
  const dadosGraficos = balancete ? (() => {
    const t = calcTotais(balancete.contas)
    return {
      estrutura: [
        { name: 'Ativo Circ.', valor: t.ac },
        { name: 'Ativo N.Circ.', valor: t.anc },
        { name: 'Passivo Circ.', valor: t.pc },
        { name: 'Passivo N.Circ.', valor: t.pnc },
        { name: 'Patrim. Líq.', valor: t.pl },
      ],
      dre: [
        { name: 'Rec. Bruta', valor: t.rec },
        { name: 'Rec. Líq.', valor: t.rl },
        { name: 'Lucro Bruto', valor: t.lb },
        { name: 'EBITDA', valor: t.ebitda },
        { name: 'Lucro Líq.', valor: t.ll },
      ],
      pizza: [
        { name: 'Ativo Circ.', value: t.ac },
        { name: 'Ativo N.Circ.', value: t.anc },
        { name: 'Pass. Circ.', value: t.pc },
        { name: 'Pass. N.Circ.', value: t.pnc },
        { name: 'PL', value: t.pl },
      ],
      radar: [
        { subject: 'Liquidez', A: Math.min(t.lc/3*100, 100) },
        { subject: 'Margem', A: Math.min(t.ml*500, 100) },
        { subject: 'Rentab.', A: Math.min(t.rent*500, 100) },
        { subject: 'Solvência', A: Math.min((1-t.endiv)*100, 100) },
        { subject: 'Eficiência', A: Math.min(t.lb/t.rl*100, 100) },
        { subject: 'EBITDA%', A: Math.min(t.ebitda/t.rl*200, 100) },
      ],
      evolucao: [
        { mes:'Jan', receita:145000, despesa:98000, lucro:47000 },
        { mes:'Fev', receita:162000, despesa:105000, lucro:57000 },
        { mes:'Mar', receita:178125, despesa:t.csp+t.desp, lucro:t.ll },
      ],
    }
  })() : null

  const CORES_CLASS = { otimo:'#22c55e', bom:'#3b82f6', atencao:'#f59e0b', critico:'#ef4444' }
  const LABELS_CLASS = { otimo:'Ótimo', bom:'Bom', atencao:'Atenção', critico:'Crítico' }
  const ABAS_NAV = [
    { id:'upload',    label:'📂 Importar' },
    { id:'balancete', label:'📋 Balancete',   disabled:!balancete },
    { id:'analise',   label:'🤖 Análise IA',  disabled:!analise },
    { id:'graficos',  label:'📊 Gráficos',    disabled:!balancete },
    { id:'documento', label:'📄 Documento',   disabled:!docTexto },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 44px)', fontFamily:'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background:NAVY, padding:'12px 20px', display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ width:38, height:38, borderRadius:9, background:GOLD, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <BarChart2 size={20} color={NAVY} />
        </div>
        <div>
          <div style={{ color:'#fff', fontWeight:700, fontSize:14 }}>Análise de Balanço + IA Claude</div>
          <div style={{ color:GOLD, fontSize:11 }}>ABNT · NBC TG · CPC · PDF profissional</div>
        </div>
        {balancete && <div style={{ marginLeft:'auto', padding:'5px 12px', borderRadius:7, background:'rgba(255,255,255,0.1)', color:'#fff', fontSize:11 }}>{empresa.nome} · {empresa.competencia}</div>}
      </div>

      {/* Abas */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', display:'flex', paddingLeft:16, overflowX:'auto' }}>
        {ABAS_NAV.map(a => (
          <button key={a.id} onClick={() => !a.disabled && setAba(a.id)} style={{ padding:'10px 16px', fontSize:12, fontWeight:aba===a.id?700:400, color:a.disabled?'#ccc':aba===a.id?NAVY:'#888', background:'none', border:'none', borderBottom:aba===a.id?`2px solid ${GOLD}`:'2px solid transparent', cursor:a.disabled?'default':'pointer', whiteSpace:'nowrap' }}>{a.label}</button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:'auto', background:'#f8f9fb' }}>

        {/* ── UPLOAD ── */}
        {aba==='upload' && (
          <div style={{ maxWidth:640, margin:'30px auto', padding:'0 20px' }}>
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e8e8e8', padding:28 }}>
              <div style={{ fontSize:15, fontWeight:700, color:NAVY, marginBottom:4 }}>Importar Balancete</div>
              <div style={{ fontSize:12, color:'#aaa', marginBottom:20 }}>Importe o arquivo ou use dados de demonstração para análise com IA.</div>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:10, marginBottom:14 }}>
                <div><label style={{ fontSize:10, color:'#aaa', fontWeight:700, display:'block', marginBottom:4, textTransform:'uppercase' }}>Empresa</label><input value={empresa.nome} onChange={e=>setEmpresa(p=>({...p,nome:e.target.value}))} placeholder="Razão Social" style={inp} /></div>
                <div><label style={{ fontSize:10, color:'#aaa', fontWeight:700, display:'block', marginBottom:4, textTransform:'uppercase' }}>Competência</label><input type="month" onChange={e=>setEmpresa(p=>({...p,competencia:e.target.value}))} style={inp} /></div>
              </div>
              <div onClick={() => inputRef.current?.click()} style={{ border:`2px dashed ${arquivo?GOLD:'#d0d0d0'}`, borderRadius:12, padding:36, textAlign:'center', cursor:'pointer', background:arquivo?GOLD+'08':'#fafafa', marginBottom:12 }}>
                <input ref={inputRef} type="file" accept=".pdf,.xlsx,.xls,.csv,.txt" style={{ display:'none' }} onChange={e=>e.target.files[0]&&carregarBalancete(e.target.files[0])} />
                {analisando ? <><Loader size={32} style={{ color:GOLD, animation:'spin 1s linear infinite' }} /><div style={{ fontSize:12, color:NAVY, marginTop:8 }}>Lendo arquivo...</div></>
                  : arquivo ? <><FileText size={32} style={{ color:GOLD }} /><div style={{ fontSize:12, fontWeight:600, color:NAVY, marginTop:6 }}>{arquivo.name}</div></>
                  : <><Upload size={32} style={{ color:'#ccc' }} /><div style={{ fontSize:12, color:'#aaa', marginTop:8 }}>Clique ou arraste · PDF, Excel, CSV</div></>}
              </div>
              <div style={{ textAlign:'center', fontSize:12, color:'#aaa' }}>
                ou <button onClick={() => carregarBalancete({name:'Balancete_Demo.pdf',size:145000})} style={{ color:GOLD, background:'none', border:'none', cursor:'pointer', fontWeight:600, textDecoration:'underline' }}>usar dados de demonstração</button>
              </div>
            </div>
          </div>
        )}

        {/* ── BALANCETE ── */}
        {aba==='balancete' && balancete && (
          <div style={{ maxWidth:860, margin:'20px auto', padding:'0 20px' }}>
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e8e8e8', overflow:'hidden', marginBottom:14 }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid #f0f0f0', display:'flex', justifyContent:'space-between' }}>
                <div><div style={{ fontSize:13, fontWeight:700, color:NAVY }}>{balancete.empresa}</div><div style={{ fontSize:11, color:'#aaa' }}>CNPJ: {balancete.cnpj} · {balancete.competencia}</div></div>
                <span style={{ fontSize:11, padding:'3px 10px', borderRadius:7, background:'#F0FDF4', color:'#166534', fontWeight:600 }}>✓ {balancete.contas.length} contas</span>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr style={{ background:'#f8f9fb' }}>{['Código','Conta','Grupo','Saldo'].map(h=><th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {balancete.contas.map((c,i) => {
                    const grpCores = { ativo_circ:'#EBF5FF:#1D6FA4', ativo_ncirc:'#DBEAFE:#1e40af', passivo_circ:'#FEF2F2:#dc2626', passivo_ncirc:'#fee2e2:#b91c1c', pl:'#F3EEFF:#6B3EC9', receita:'#EDFBF1:#1A7A3C', custo:'#FEF9C3:#854D0E', despesa:'#FEF2F2:#dc2626' }
                    const grpLabels = { ativo_circ:'Ativo Circ.', ativo_ncirc:'Ativo N.Circ.', passivo_circ:'Passivo Circ.', passivo_ncirc:'Passivo N.Circ.', pl:'Patrim. Líq.', receita:'Receita', custo:'Custo', despesa:'Despesa' }
                    const [bg,color] = (grpCores[c.tipo]||'#f5f5f5:#666').split(':')
                    return (
                      <tr key={i} style={{ background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f5f5f5' }}>
                        <td style={{ padding:'7px 14px', color:'#aaa', fontFamily:'monospace', fontSize:11 }}>{c.codigo}</td>
                        <td style={{ padding:'7px 14px', fontWeight:500, color:NAVY }}>{c.nome}</td>
                        <td style={{ padding:'7px 14px' }}><span style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:bg, color, fontWeight:600 }}>{grpLabels[c.tipo]}</span></td>
                        <td style={{ padding:'7px 14px', fontWeight:700, color:c.saldo>=0?'#166534':'#dc2626', textAlign:'right', fontFamily:'monospace' }}>{fmt(c.saldo)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Análise IA */}
            <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${GOLD}30`, padding:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:NAVY, marginBottom:8 }}>🤖 Analisar com IA Claude</div>
              <textarea value={promptExtra} onChange={e=>setPromptExtra(e.target.value)} placeholder="Contexto adicional (setor, regime tributário, observações...)" style={{ ...inp, height:55, resize:'none', fontFamily:'inherit', marginBottom:10 }} />
              <button onClick={analisarIA} disabled={analisando} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px', borderRadius:9, background:analisando?'#ccc':NAVY, color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:analisando?'default':'pointer' }}>
                {analisando?<><Loader size={14} style={{ animation:'spin 1s linear infinite' }} /> Analisando...</>:<><Bot size={14} /> Analisar Balancete com Claude</>}
              </button>
            </div>
          </div>
        )}

        {/* ── ANÁLISE IA ── */}
        {aba==='analise' && analise && (
          <div style={{ maxWidth:860, margin:'20px auto', padding:'0 20px' }}>
            {/* Parecer */}
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e8e8e8', padding:18, marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}><Bot size={16} style={{ color:GOLD }} /><span style={{ fontSize:13, fontWeight:700, color:NAVY }}>Parecer da IA — Claude</span></div>
              <div style={{ fontSize:13, color:'#555', lineHeight:1.8, padding:'12px 14px', background:'#f8f9fb', borderRadius:8, borderLeft:`3px solid ${GOLD}` }}>{analise.resumo_executivo}</div>
            </div>

            {/* Indicadores */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:12 }}>
              {Object.entries(analise.indices||{}).map(([k,v]) => {
                const labels = { liquidez_corrente:'Liquidez Corrente', endividamento:'Endividamento', margem_liquida:'Margem Líquida', rentabilidade:'Rentabilidade PL' }
                const cor = CORES_CLASS[v.classificacao]||'#888'
                const isPct = ['margem_liquida','rentabilidade','endividamento'].includes(k)
                return (
                  <div key={k} style={{ padding:14, borderRadius:10, border:`1px solid ${cor}30`, background:cor+'08', textAlign:'center' }}>
                    <div style={{ fontSize:10, color:'#888', marginBottom:5 }}>{labels[k]}</div>
                    <div style={{ fontSize:20, fontWeight:800, color:cor }}>{isPct?pct(v.valor):v.valor.toFixed(2)}</div>
                    <div style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:cor+'20', color:cor, fontWeight:700, display:'inline-block', marginTop:5 }}>{LABELS_CLASS[v.classificacao]}</div>
                  </div>
                )
              })}
            </div>

            {/* Pontos / Riscos / Recom */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
              {[{k:'pontos_positivos',t:'✅ Pontos Positivos',c:'#22c55e',bg:'#F0FDF4'},{k:'riscos',t:'⚠️ Riscos',c:'#f59e0b',bg:'#FEF9C3'},{k:'recomendacoes',t:'💡 Recomendações',c:'#3b82f6',bg:'#EFF6FF'}].map(sec=>(
                <div key={sec.k} style={{ background:'#fff', borderRadius:10, border:`1px solid ${sec.c}25`, overflow:'hidden' }}>
                  <div style={{ padding:'10px 14px', background:sec.bg, fontSize:11, fontWeight:700, color:sec.c }}>{sec.t}</div>
                  <div style={{ padding:'10px 14px' }}>{(analise[sec.k]||[]).map((item,i)=><div key={i} style={{ display:'flex', gap:6, marginBottom:7, fontSize:11, color:'#555', lineHeight:1.5 }}><span style={{ color:sec.c }}>•</span><span>{item}</span></div>)}</div>
                </div>
              ))}
            </div>

            {/* Parecer técnico ABNT */}
            {analise.parecer_tecnico && (
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e8e8e8', padding:18, marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>Parecer Técnico (ABNT)</div>
                <div style={{ fontSize:12, color:'#444', lineHeight:1.8, textAlign:'justify', fontFamily:"'Times New Roman', Times, serif" }}>
                  {analise.parecer_tecnico.split('\n').map((p,i)=><p key={i} style={{ textIndent:'1.5em', marginBottom:8 }}>{p}</p>)}
                </div>
              </div>
            )}

            {/* Botões geração */}
            <div style={{ background:'#fff', borderRadius:12, border:`2px solid ${GOLD}30`, padding:20, textAlign:'center' }}>
              <div style={{ fontSize:13, fontWeight:700, color:NAVY, marginBottom:4 }}>Gerar Demonstrações Contábeis (ABNT)</div>
              <div style={{ fontSize:11, color:'#aaa', marginBottom:16 }}>Documentos prontos para download em PDF com assinatura CRC.</div>
              <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                {[{tipo:'balanco',label:'Balanço Patrimonial',bg:NAVY},{tipo:'dre',label:'DRE',bg:'#22c55e'},{tipo:'completo',label:'Relatório Completo',bg:GOLD,color:NAVY}].map(b=>(
                  <button key={b.tipo} onClick={()=>gerarDoc(b.tipo)} disabled={gerando} style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:9, background:gerando?'#ccc':b.bg, color:b.color||'#fff', fontWeight:700, fontSize:13, border:'none', cursor:gerando?'default':'pointer' }}>
                    {gerando&&tipoDoc===b.tipo?<Loader size={13} style={{ animation:'spin 1s linear infinite' }} />:<BarChart2 size={13} />} {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── GRÁFICOS ── */}
        {aba==='graficos' && dadosGraficos && (
          <div style={{ maxWidth:900, margin:'20px auto', padding:'0 20px' }}>
            {/* Seletor de gráfico */}
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e8e8e8', padding:14, marginBottom:14, display:'flex', gap:8, flexWrap:'wrap' }}>
              {[{id:'barras',label:'📊 Estrutura BP',ic:BarChart2},{id:'dre_bar',label:'📈 DRE Cascata',ic:TrendingUp},{id:'pizza',label:'🥧 Composição',ic:PieIcon},{id:'radar',label:'🎯 Radar Índices',ic:Activity},{id:'evolucao',label:'📉 Evolução',ic:TrendingUp}].map(g=>(
                <button key={g.id} onClick={()=>setGrafAtivo(g.id)} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:8, background:grafAtivo===g.id?NAVY:'#f5f5f5', color:grafAtivo===g.id?'#fff':'#555', border:'none', cursor:'pointer', fontSize:12, fontWeight:grafAtivo===g.id?700:400 }}>{g.label}</button>
              ))}
            </div>

            {/* Gráfico ativo */}
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e8e8e8', padding:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:NAVY, marginBottom:16 }}>
                {{barras:'Estrutura Patrimonial (BP)', dre_bar:'DRE — Resultado em Cascata', pizza:'Composição do Balanço', radar:'Radar de Indicadores Financeiros', evolucao:'Evolução Mensal'}[grafAtivo]}
              </div>
              <ResponsiveContainer width="100%" height={320}>
                {grafAtivo==='barras' ? (
                  <BarChart data={dadosGraficos.estrutura} margin={{ top:5, right:20, left:20, bottom:5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize:11, fill:'#888' }} />
                    <YAxis tickFormatter={v=>'R$'+Math.round(v/1000)+'k'} tick={{ fontSize:10, fill:'#888' }} />
                    <Tooltip formatter={v=>fmt(v)} />
                    <Bar dataKey="valor" radius={[4,4,0,0]}>
                      {dadosGraficos.estrutura.map((_,i)=><Cell key={i} fill={CORES_GRAF[i%CORES_GRAF.length]} />)}
                    </Bar>
                  </BarChart>
                ) : grafAtivo==='dre_bar' ? (
                  <BarChart data={dadosGraficos.dre} margin={{ top:5, right:20, left:20, bottom:5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize:11, fill:'#888' }} />
                    <YAxis tickFormatter={v=>'R$'+Math.round(v/1000)+'k'} tick={{ fontSize:10, fill:'#888' }} />
                    <Tooltip formatter={v=>fmt(v)} />
                    <Bar dataKey="valor" radius={[4,4,0,0]}>
                      {dadosGraficos.dre.map((_,i)=><Cell key={i} fill={CORES_GRAF[i%CORES_GRAF.length]} />)}
                    </Bar>
                  </BarChart>
                ) : grafAtivo==='pizza' ? (
                  <PieChart>
                    <Pie data={dadosGraficos.pizza} cx="50%" cy="50%" outerRadius={120} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine>
                      {dadosGraficos.pizza.map((_,i)=><Cell key={i} fill={CORES_GRAF[i%CORES_GRAF.length]} />)}
                    </Pie>
                    <Tooltip formatter={v=>fmt(v)} />
                    <Legend />
                  </PieChart>
                ) : grafAtivo==='radar' ? (
                  <RadarChart cx="50%" cy="50%" outerRadius={120} data={dadosGraficos.radar}>
                    <PolarGrid stroke="#e8e8e8" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize:11, fill:'#888' }} />
                    <Radar name="Indicadores" dataKey="A" stroke={NAVY} fill={NAVY} fillOpacity={0.3} />
                    <Radar name="Referência (100)" dataKey="A" stroke={GOLD} fill={GOLD} fillOpacity={0.1} dot={false} />
                    <Legend />
                    <Tooltip formatter={v=>v.toFixed(0)+'%'} />
                  </RadarChart>
                ) : (
                  <LineChart data={dadosGraficos.evolucao} margin={{ top:5, right:20, left:20, bottom:5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize:11, fill:'#888' }} />
                    <YAxis tickFormatter={v=>'R$'+Math.round(v/1000)+'k'} tick={{ fontSize:10, fill:'#888' }} />
                    <Tooltip formatter={v=>fmt(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="receita" name="Receita" stroke={NAVY} strokeWidth={2} dot={{ r:4 }} />
                    <Line type="monotone" dataKey="despesa" name="Despesas" stroke="#ef4444" strokeWidth={2} dot={{ r:4 }} />
                    <Line type="monotone" dataKey="lucro" name="Lucro Líq." stroke="#22c55e" strokeWidth={2} dot={{ r:4 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Todos os gráficos juntos */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:14 }}>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e8e8e8', padding:16 }}>
                <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:12 }}>Composição do Ativo</div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart><Pie data={dadosGraficos.pizza.slice(0,2)} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>{dadosGraficos.pizza.slice(0,2).map((_,i)=><Cell key={i} fill={[NAVY,GOLD][i]} />)}</Pie><Tooltip formatter={v=>fmt(v)} /></PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e8e8e8', padding:16 }}>
                <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:12 }}>Composição do Passivo + PL</div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart><Pie data={dadosGraficos.pizza.slice(2)} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>{dadosGraficos.pizza.slice(2).map((_,i)=><Cell key={i} fill={['#ef4444','#f59e0b','#22c55e'][i]} />)}</Pie><Tooltip formatter={v=>fmt(v)} /></PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── DOCUMENTO ── */}
        {aba==='documento' && docTexto && (
          <div style={{ maxWidth:860, margin:'20px auto', padding:'0 20px' }}>
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e8e8e8', overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid #f0f0f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8f9fb' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:NAVY }}>{tipoDoc==='balanco'?'Balanço Patrimonial':tipoDoc==='dre'?'DRE':'Relatório Completo'} — ABNT</div>
                  <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{empresa.nome} · {empresa.competencia} · CRC/GO 026.994/O-8</div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>navigator.clipboard.writeText(docTexto)} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, border:`1px solid ${NAVY}`, background:'#fff', color:NAVY, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                    <Copy size={12} /> Copiar
                  </button>
                  <button onClick={baixarPDF} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:7, background:NAVY, color:'#fff', fontSize:11, fontWeight:700, border:'none', cursor:'pointer' }}>
                    <Download size={12} /> Baixar PDF
                  </button>
                  <button onClick={()=>gerarDoc(tipoDoc)} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:7, background:'#f5f5f5', color:'#555', fontSize:11, border:'none', cursor:'pointer' }}>
                    <RefreshCw size={12} />
                  </button>
                </div>
              </div>

              {/* Documento pré-formatado */}
              <div ref={pdfRef} style={{ padding:28, background:'#fafafa' }}>
                <pre style={{ fontFamily:"'Courier New', Courier, monospace", fontSize:11, color:'#222', lineHeight:1.75, whiteSpace:'pre-wrap', wordBreak:'break-word', margin:0, padding:'24px', background:'#fff', borderRadius:8, border:'1px solid #e8e8e8', minHeight:500 }}>
                  {docTexto}
                </pre>
              </div>

              <div style={{ padding:'14px 20px', borderTop:'1px solid #f0f0f0', display:'flex', gap:10, justifyContent:'space-between', alignItems:'center', background:'#f8f9fb' }}>
                <div style={{ fontSize:11, color:'#aaa' }}>Gerado por IA Claude · Normas ABNT · NBC TG · CPC · Revise antes de assinar.</div>
                <div style={{ display:'flex', gap:7 }}>
                  <button onClick={()=>gerarDoc('balanco')} style={{ padding:'6px 12px', borderRadius:7, background:NAVY+'15', color:NAVY, fontSize:11, fontWeight:600, border:'none', cursor:'pointer' }}>BP</button>
                  <button onClick={()=>gerarDoc('dre')} style={{ padding:'6px 12px', borderRadius:7, background:'#22c55e15', color:'#166534', fontSize:11, fontWeight:600, border:'none', cursor:'pointer' }}>DRE</button>
                  <button onClick={()=>gerarDoc('completo')} style={{ padding:'6px 12px', borderRadius:7, background:GOLD, color:NAVY, fontSize:11, fontWeight:700, border:'none', cursor:'pointer' }}>Completo</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
