import { useState, useRef } from 'react'
import { Upload, FileText, Bot, X, Download, Copy, CheckCircle, AlertCircle, Loader } from 'lucide-react'

const TIPOS_ANALISE = [
  { id:'geral',      label:'📋 Análise Geral',          prompt:'Analise este documento contábil/fiscal e forneça um resumo completo: tipo do documento, período de referência, valores principais, obrigações identificadas, e pontos de atenção.' },
  { id:'guia',       label:'💰 Guia de Pagamento',       prompt:'Identifique neste documento: tipo da guia, CNPJ do contribuinte, competência, valor principal, multa, juros, total a pagar, data de vencimento, e código de barras ou QR Code se houver.' },
  { id:'nfe',        label:'🧾 Nota Fiscal',             prompt:'Extraia desta nota fiscal: número, data de emissão, emitente (nome e CNPJ), destinatário (nome e CNPJ), discriminação dos produtos/serviços, base de cálculo, alíquotas e valores dos impostos (ICMS, IPI, PIS, COFINS, ISS), valor total.' },
  { id:'folha',      label:'👥 Folha de Pagamento',      prompt:'Analise esta folha de pagamento e extraia: período, empresa, total de funcionários, total de salários brutos, total de descontos (INSS, IRRF, outros), total líquido a pagar, total de encargos do empregador (FGTS, INSS patronal).' },
  { id:'balancete',  label:'📊 Balancete/Balanço',       prompt:'Analise este balancete ou balanço patrimonial e forneça: data de referência, total do ativo, total do passivo, patrimônio líquido, principais contas e seus saldos, e indicadores relevantes como liquidez corrente e endividamento.' },
  { id:'sped',       label:'🗂️ Arquivo SPED/EFD',        prompt:'Identifique neste arquivo SPED/EFD: tipo de escrituração, CNPJ, período de apuração, registros presentes, totais de entradas e saídas, apuração de impostos (se houver), e eventuais inconsistências.' },
  { id:'contrato',   label:'📝 Contrato/Documento Legal',prompt:'Analise este contrato ou documento legal e forneça: tipo do documento, partes envolvidas, objeto, valor e condições de pagamento, prazo de vigência, cláusulas principais e pontos de atenção jurídica.' },
  { id:'extrato',    label:'🏦 Extrato Bancário',        prompt:'Analise este extrato bancário e forneça: banco, conta, período, saldo inicial, saldo final, total de créditos, total de débitos, principais movimentações e qualquer lançamento suspeito ou relevante.' },
]

export default function Robo() {
  const [arquivo, setArquivo]       = useState(null)
  const [base64, setBase64]         = useState(null)
  const [tipoArq, setTipoArq]       = useState(null)
  const [tipoAnalise, setTipoAnalise] = useState(TIPOS_ANALISE[0])
  const [resultado, setResultado]   = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro]             = useState('')
  const [copiado, setCopiado]       = useState(false)
  const [promptCustom, setPromptCustom] = useState('')
  const inputRef = useRef()

  const handleArquivo = (file) => {
    if (!file) return
    setArquivo(file)
    setResultado('')
    setErro('')
    const reader = new FileReader()
    reader.onload = (e) => {
      const b64 = e.target.result.split(',')[1]
      setBase64(b64)
      setTipoArq(file.type || 'application/pdf')
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleArquivo(e.dataTransfer.files[0])
  }

  const analisar = async () => {
    if (!arquivo || !base64) return setErro('Selecione um documento primeiro.')
    setCarregando(true)
    setErro('')
    setResultado('')

    const prompt = promptCustom.trim() || tipoAnalise.prompt + `\n\nResponda em português, de forma clara e estruturada, usando o contexto do escritório EPimentel Auditoria & Contabilidade Ltda, CRC/GO 026.994/O-8, Goiânia-GO.`

    try {
      let content
      if (tipoArq.includes('pdf') || tipoArq.includes('image')) {
        content = [
          {
            type: tipoArq.includes('image') ? 'image' : 'document',
            source: {
              type: 'base64',
              media_type: tipoArq.includes('image') ? tipoArq : 'application/pdf',
              data: base64,
            }
          },
          { type: 'text', text: prompt }
        ]
      } else {
        content = `${prompt}\n\nConteúdo do arquivo: [Arquivo ${arquivo.name} - formato não suportado para leitura direta, descreva com base no nome]`
      }

      const resp = await fetch('/api/v1/robo/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64_data: base64,
          media_type: tipoArq.includes('image') ? tipoArq : 'application/pdf',
          prompt,
        })
      })

      if (!resp.ok) {
        const err = await resp.json()
        setErro('Erro: ' + (err.detail || resp.status))
        return
      }

      const data = await resp.json()
      setResultado(data.resultado || '')
    } catch (e) {
      setErro('Erro de conexão: ' + e.message)
    } finally {
      setCarregando(false)
    }
  }

  const copiar = () => {
    navigator.clipboard.writeText(resultado)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const baixar = () => {
    const blob = new Blob([resultado], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analise_${arquivo?.name||'documento'}_${new Date().toISOString().slice(0,10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:24,fontWeight:700,color:'#1B2A4A'}}>🤖 Robô de Leitura de Documentos</h1>
        <p style={{color:'#888',fontSize:14,marginTop:4}}>Envie PDFs ou imagens de documentos contábeis e fiscais para análise automática com IA</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        {/* Painel esquerdo */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {/* Upload */}
          <div
            onDrop={handleDrop} onDragOver={e=>e.preventDefault()}
            onClick={()=>inputRef.current.click()}
            style={{
              border:`2px dashed ${arquivo?'#22c55e':'#cbd5e1'}`,
              borderRadius:12, padding:32, textAlign:'center',
              cursor:'pointer', background:arquivo?'#f0fdf4':'#f8fafc',
              transition:'all .2s',
            }}>
            <input ref={inputRef} type="file" accept=".pdf,image/*" hidden onChange={e=>handleArquivo(e.target.files[0])} />
            {arquivo ? (
              <>
                <CheckCircle size={40} color="#22c55e" style={{margin:'0 auto 12px'}}/>
                <div style={{fontWeight:600,color:'#16a34a',fontSize:15}}>{arquivo.name}</div>
                <div style={{color:'#86efac',fontSize:13,marginTop:4}}>{(arquivo.size/1024).toFixed(1)} KB</div>
                <button onClick={e=>{e.stopPropagation();setArquivo(null);setBase64(null);setResultado('')}}
                  style={{marginTop:12,background:'none',border:'1px solid #86efac',color:'#16a34a',padding:'4px 12px',borderRadius:6,cursor:'pointer',fontSize:12}}>
                  Trocar arquivo
                </button>
              </>
            ) : (
              <>
                <Upload size={40} color="#94a3b8" style={{margin:'0 auto 12px'}}/>
                <div style={{fontWeight:600,color:'#475569',fontSize:15}}>Arraste ou clique para selecionar</div>
                <div style={{color:'#94a3b8',fontSize:13,marginTop:6}}>PDF, PNG, JPG, JPEG</div>
                <div style={{color:'#cbd5e1',fontSize:12,marginTop:4}}>Guias, NF-e, Folhas, Balancetes, Extratos...</div>
              </>
            )}
          </div>

          {/* Tipo de análise */}
          <div style={{background:'#fff',borderRadius:10,padding:16,boxShadow:'0 1px 4px rgba(0,0,0,.08)'}}>
            <div style={{fontWeight:600,color:'#1B2A4A',fontSize:14,marginBottom:12}}>Tipo de Análise</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {TIPOS_ANALISE.map(t=>(
                <button key={t.id} onClick={()=>setTipoAnalise(t)}
                  style={{
                    padding:'9px 14px', borderRadius:8, border:'1px solid',
                    borderColor:tipoAnalise.id===t.id?'#1B2A4A':'#e2e8f0',
                    background:tipoAnalise.id===t.id?'#1B2A4A':'#fff',
                    color:tipoAnalise.id===t.id?'#C5A55A':'#475569',
                    cursor:'pointer', textAlign:'left', fontSize:13, fontWeight:tipoAnalise.id===t.id?600:400,
                    transition:'all .15s',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt custom */}
          <div style={{background:'#fff',borderRadius:10,padding:16,boxShadow:'0 1px 4px rgba(0,0,0,.08)'}}>
            <div style={{fontWeight:600,color:'#1B2A4A',fontSize:14,marginBottom:8}}>Instrução Personalizada (opcional)</div>
            <textarea value={promptCustom} onChange={e=>setPromptCustom(e.target.value)} rows={3}
              placeholder="Ex: Extraia apenas os valores de INSS e FGTS desta folha..."
              style={{width:'100%',padding:'8px 10px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}} />
            {promptCustom && <div style={{fontSize:12,color:'#f59e0b',marginTop:4}}>⚠️ Instrução personalizada substituirá o tipo de análise selecionado.</div>}
          </div>

          {/* Botão analisar */}
          <button onClick={analisar} disabled={!arquivo||carregando}
            style={{
              padding:'14px', borderRadius:10, border:'none',
              background:!arquivo||carregando?'#94a3b8':'#1B2A4A',
              color:'#fff', cursor:!arquivo||carregando?'default':'pointer',
              fontSize:15, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:10,
              transition:'all .2s',
            }}>
            {carregando ? <><Loader size={18} style={{animation:'spin 1s linear infinite'}}/> Analisando...</> : <><Bot size={18}/> Analisar com Claude IA</>}
          </button>

          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>

        {/* Painel direito - resultado */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,.08)',flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,fontWeight:600,color:'#1B2A4A',fontSize:14}}>
                <FileText size={16} color="#C5A55A"/>
                Resultado da Análise
                {resultado && <span style={{background:'#22c55e',color:'#fff',fontSize:11,padding:'2px 8px',borderRadius:10}}>✓ Concluído</span>}
              </div>
              {resultado && (
                <div style={{display:'flex',gap:8}}>
                  <button onClick={copiar} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 12px',border:'1px solid #e2e8f0',borderRadius:6,background:'#fff',cursor:'pointer',fontSize:12,color:'#475569'}}>
                    {copiado?<><CheckCircle size={13} color="#22c55e"/> Copiado!</>:<><Copy size={13}/> Copiar</>}
                  </button>
                  <button onClick={baixar} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 12px',border:'1px solid #e2e8f0',borderRadius:6,background:'#fff',cursor:'pointer',fontSize:12,color:'#475569'}}>
                    <Download size={13}/> Baixar
                  </button>
                </div>
              )}
            </div>

            <div style={{flex:1,padding:18,overflowY:'auto',minHeight:400}}>
              {erro && (
                <div style={{display:'flex',gap:10,padding:14,background:'#fef2f2',borderRadius:8,color:'#dc2626',fontSize:13,border:'1px solid #fecaca'}}>
                  <AlertCircle size={18} style={{flexShrink:0}}/> {erro}
                </div>
              )}
              {carregando && (
                <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}>
                  <Bot size={48} color="#C5A55A" style={{margin:'0 auto 16px',animation:'pulse 2s infinite'}}/>
                  <div style={{fontSize:15,fontWeight:500}}>Claude está lendo o documento...</div>
                  <div style={{fontSize:13,marginTop:8}}>Isso pode levar alguns segundos</div>
                  <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
                </div>
              )}
              {!resultado && !carregando && !erro && (
                <div style={{textAlign:'center',padding:48,color:'#cbd5e1'}}>
                  <Bot size={48} color="#e2e8f0" style={{margin:'0 auto 16px'}}/>
                  <div style={{fontSize:14}}>O resultado da análise aparecerá aqui</div>
                  <div style={{fontSize:12,marginTop:8}}>Selecione um documento e clique em "Analisar"</div>
                </div>
              )}
              {resultado && (
                <div style={{fontSize:14,lineHeight:1.7,color:'#334155',whiteSpace:'pre-wrap'}}>
                  {resultado}
                </div>
              )}
            </div>
          </div>

          {/* Dica */}
          <div style={{background:'#fffbeb',borderRadius:10,padding:14,border:'1px solid #fde68a',fontSize:13,color:'#92400e'}}>
            💡 <strong>Dica:</strong> Para ativar o robô, configure a chave <code style={{background:'#fef3c7',padding:'1px 4px',borderRadius:3}}>ANTHROPIC_API_KEY</code> no arquivo <code style={{background:'#fef3c7',padding:'1px 4px',borderRadius:3}}>backend\.env</code>. Obtenha em <strong>console.anthropic.com</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
