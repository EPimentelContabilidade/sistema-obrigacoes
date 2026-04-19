import { useState, useEffect } from 'react'
import { epGet } from '../utils/storage'

const NAVY = '#1F4A33'
const GOLD = '#C5A55A'
const API  = window.location.hostname === 'localhost'
  ? '/api/v1' : 'https://sistema-obrigacoes-production.up.railway.app/api/v1'

const fmtR = v => 'R$ ' + Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})

const STATUS_INFO = {
  aguardando_aprovacao: { cor:'#f59e0b', bg:'#fffbeb', icon:'\u23F3', label:'Aguardando Aprovação' },
  aprovado:             { cor:'#16a34a', bg:'#f0fdf4', icon:'\u2705', label:'Aprovado' },
  reprovado:            { cor:'#dc2626', bg:'#fef2f2', icon:'\u274C', label:'Reprovado' },
  transmitindo:         { cor:'#2563eb', bg:'#eff6ff', icon:'\uD83D\uDCE4', label:'Transmitindo...' },
  transmitido:          { cor:'#7c3aed', bg:'#f5f3ff', icon:'\uD83C\uDFAF', label:'Transmitido ao eSocial' },
  erro_transmissao:     { cor:'#dc2626', bg:'#fef2f2', icon:'\u26A0\uFE0F', label:'Erro na Transmissão' },
}

function Badge({ status }) {
  const s = STATUS_INFO[status] || { cor:'#888', bg:'#f9fafb', icon:'\uD83D\uDCC4', label: status }
  return <span style={{ padding:'3px 12px', borderRadius:20, background:s.bg, color:s.cor, fontWeight:700, fontSize:11 }}>{s.icon} {s.label}</span>
}

function CardSocio({ s }) {
  return (
    <div style={{ border:'1px solid #e5e7eb', borderRadius:12, overflow:'hidden', marginBottom:14 }}>
      <div style={{ background:NAVY, padding:'10px 16px' }}>
        <div style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{s.nome}</div>
        <div style={{ color:GOLD, fontSize:11 }}>{s.cargo} · CPF: {s.cpf}</div>
      </div>
      <div style={{ padding:14 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          <div style={{ padding:12, borderRadius:8, background:'#fffbeb', border:'1px solid #fde68a' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#92400e', marginBottom:2 }}>INSS (GPS) 11%</div>
            <div style={{ fontSize:18, fontWeight:800, color:'#92400e' }}>{fmtR(s.inss?.valor)}</div>
            <div style={{ fontSize:10, color:'#888' }}>Base: {fmtR(s.inss?.base)} {s.inss?.teto_atingido?'· TETO':''}</div>
          </div>
          <div style={{ padding:12, borderRadius:8, background:'#fef2f2', border:'1px solid #fecaca' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#991b1b', marginBottom:2 }}>IRRF {Number(s.irrf?.aliquota||0).toFixed(1)}%</div>
            <div style={{ fontSize:18, fontWeight:800, color:'#991b1b' }}>{fmtR(s.irrf?.valor)}</div>
            <div style={{ fontSize:10, color:'#888' }}>Base: {fmtR(s.irrf?.base_irrf)} · Dep: {s.dependentes||0}</div>
          </div>
        </div>
        {[['Pró-labore Bruto',s.valor_bruto,false,'#f9fafb'],['(-) INSS 11%',s.inss?.valor,true,'#fef2f2'],['(-) IRRF',s.irrf?.valor,true,'#fef2f2'],['(=) Líquido',s.liquido,false,NAVY]].map(([lb,vl,neg,bg])=>(
          <div key={lb} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', borderRadius:7, background:bg, marginBottom:3 }}>
            <span style={{ fontSize:13, color:bg===NAVY?'#fff':neg?'#dc2626':'#555', fontWeight:bg===NAVY?700:400 }}>{lb}</span>
            <span style={{ fontSize:13, fontWeight:700, color:bg===NAVY?GOLD:neg?'#dc2626':NAVY }}>{fmtR(vl)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProLabore() {
  const [aba, setAba]                 = useState('calcular')
  const [empresa, setEmpresa]         = useState(null)
  const [socios, setSocios]           = useState([])
  const [competencia, setCompetencia] = useState(() => { const d=new Date(); return String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear() })
  const [calculando, setCalculando]   = useState(false)
  const [resultado, setResultado]     = useState(null)
  const [historico, setHistorico]     = useState([])
  const [pdfB64, setPdfB64]           = useState(null)
  const [gerandoPDF, setGerandoPDF]   = useState(false)
  const [aprovador, setAprovador]     = useState('')
  const [obs, setObs]                 = useState('')
  const [aprovando, setAprovando]     = useState(false)
  const [transmitindo, setTransmit]   = useState(false)
  const [polling, setPolling]         = useState(false)
  const [certPath, setCertPath]       = useState('')
  const [certSenha, setCertSenha]     = useState('')
  const [alertaIA, setAlertaIA]       = useState(null)

  useEffect(() => {
    const clientes = epGet('ep_clientes', [])
    if(clientes.length > 0) {
      const c = clientes[0]
      setEmpresa(c)
      const resp = c.responsaveis || []
      setSocios(resp.length > 0
        ? resp.map(r=>({ nome:r.nome||'Sócio', cpf:r.cpf||'', cargo:r.qualificacao_socio||'Sócio-Administrador', valor_bruto:r.pro_labore||1518, dependentes:r.dependentes||0 }))
        : [{ nome:c.nome_razao||c.nome||'Sócio', cpf:'', cargo:'Sócio-Administrador', valor_bruto:1518, dependentes:0 }])
      carregarHistorico(c.cnpj)
    }
  }, [])

  async function carregarHistorico(cnpj) {
    if(!cnpj) return
    try { const r=await fetch(API+'/prolabore/listar/'+cnpj.replace(/\D/g,''),{signal:AbortSignal.timeout(8000)}); if(r.ok) setHistorico(await r.json()) } catch(e) {}
  }

  async function calcular() {
    if(!empresa) { alert('Nenhum cliente configurado'); return }
    setCalculando(true); setResultado(null); setPdfB64(null); setAlertaIA(null)
    try {
      const r = await fetch(API+'/prolabore/calcular', { method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ empresa_nome:empresa.nome_razao||empresa.nome, empresa_cnpj:empresa.cnpj||'', competencia, socios, usar_ia:true }), signal:AbortSignal.timeout(30000) })
      if(!r.ok) throw new Error(await r.text())
      const data = await r.json()
      setResultado(data)
      if(data.ia?.sugestao_valor) setAlertaIA(data.ia)
      setAba('resultado')
    } catch(e) { alert('Erro: '+e.message) }
    setCalculando(false)
  }

  async function gerarPDF() {
    setGerandoPDF(true)
    try { const r=await fetch(API+'/prolabore/gerar-pdf/'+resultado.id,{method:'POST',signal:AbortSignal.timeout(30000)}); if(!r.ok) throw new Error(await r.text()); const d=await r.json(); setPdfB64(d.pdf_base64) } catch(e){alert('Erro PDF: '+e.message)}
    setGerandoPDF(false)
  }

  async function aprovar(ok) {
    setAprovando(true)
    try {
      const r=await fetch(API+'/prolabore/aprovar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({calculo_id:resultado.id,aprovado:ok,observacao:obs,aprovador})})
      if(!r.ok) throw new Error(await r.text())
      const d=await r.json(); setResultado(prev=>({...prev,status:d.status}))
    } catch(e){alert('Erro: '+e.message)}
    setAprovando(false)
  }

  async function transmitir() {
    if(resultado?.status!=='aprovado'){alert('Aprove primeiro');return}
    setTransmit(true)
    try {
      const r=await fetch(API+'/prolabore/transmitir-esocial/'+resultado.id+'?cert_path='+encodeURIComponent(certPath)+'&cert_senha='+encodeURIComponent(certSenha),{method:'POST'})
      if(!r.ok) throw new Error(await r.text())
      setResultado(prev=>({...prev,status:'transmitindo'}))
      setPolling(true)
      let tries=0
      const poll=setInterval(async()=>{
        tries++
        try { const sr=await fetch(API+'/prolabore/status/'+resultado.id); if(sr.ok){const sd=await sr.json(); if(['transmitido','erro_transmissao'].includes(sd.status)){setResultado(prev=>({...prev,status:sd.status,protocolo:sd.protocolo,erro:sd.erro}));clearInterval(poll);setPolling(false);if(sd.status==='transmitido') carregarHistorico(empresa?.cnpj)}}} catch(e){}
        if(tries>30){clearInterval(poll);setPolling(false)}
      },3000)
    } catch(e){alert('Erro: '+e.message)}
    setTransmit(false)
  }

  const tot = resultado?.totais || {}

  return (
    <div style={{ fontFamily:'Inter,system-ui,sans-serif', height:'calc(100vh - 44px)', display:'flex', flexDirection:'column' }}>
      <div style={{ background:NAVY, padding:'12px 24px', display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:GOLD, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>\uD83D\uDCBC</div>
        <div>
          <div style={{ color:'#fff', fontWeight:800, fontSize:15 }}>Pró-labore — IA Automatizado</div>
          <div style={{ color:GOLD, fontSize:11 }}>Cálculo INSS/IRRF · Aprovação · GPS · XML S-1200 · eSocial</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          {[{n:historico.filter(h=>h.status==='transmitido').length,l:'Transmitidos'},{n:historico.filter(h=>h.status==='aprovado').length,l:'Aprovados'},{n:historico.length,l:'Total'}].map(s=>(
            <div key={s.l} style={{ textAlign:'center', padding:'4px 14px', borderRadius:10, background:'rgba(255,255,255,0.08)' }}>
              <div style={{ color:GOLD, fontWeight:800, fontSize:16 }}>{s.n}</div>
              <div style={{ color:'rgba(255,255,255,0.5)', fontSize:10 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:'#fff', borderBottom:'2px solid #f0f0f0', display:'flex', paddingLeft:16, flexShrink:0 }}>
        {[['calcular','\uD83D\uDCCA Calcular'],['resultado','\uD83D\uDCCB Resultado & Aprovação'],['esocial','\uD83D\uDCE4 eSocial & GPS'],['historico','\uD83D\uDD50 Histórico']].map(([id,lb])=>(
          <button key={id} onClick={()=>setAba(id)} style={{ padding:'10px 16px', border:'none', background:'none', cursor:'pointer', fontSize:13, fontWeight:aba===id?700:400, color:aba===id?NAVY:'#888', borderBottom:aba===id?'3px solid '+NAVY:'none', marginBottom:-2 }}>{lb}</button>
        ))}
      </div>

      <div style={{ flex:1, overflow:'auto', padding:24, maxWidth:880, margin:'0 auto', width:'100%' }}>

        {aba==='calcular' && (
          <div>
            {empresa
              ? <div style={{ padding:14, borderRadius:12, background:'#f0fdf4', border:'1px solid #bbf7d0', marginBottom:20 }}><div style={{ fontWeight:700,color:NAVY,fontSize:14 }}>{empresa.nome_razao||empresa.nome}</div><div style={{ fontSize:12,color:'#555' }}>CNPJ: {empresa.cnpj} · {empresa.tributacao}</div></div>
              : <div style={{ padding:14, borderRadius:12, background:'#fffbeb', border:'1px solid #fde68a', marginBottom:20 }}><div style={{ fontSize:13,color:'#92400e' }}>\u26A0\uFE0F Nenhum cliente configurado.</div></div>
            }
            <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:16, marginBottom:24 }}>
              <div>
                <label style={{ fontSize:11,fontWeight:700,color:'#555',display:'block',marginBottom:4 }}>\uD83D\uDCC5 Competência (MM/AAAA)</label>
                <input value={competencia} onChange={e=>setCompetencia(e.target.value)} style={{ width:'100%',padding:'9px 12px',borderRadius:8,border:'2px solid '+NAVY,fontSize:14,fontWeight:700,color:NAVY,boxSizing:'border-box' }}/>
              </div>
              <div style={{ display:'flex',alignItems:'flex-end',paddingBottom:2 }}>
                <div style={{ padding:12,borderRadius:8,background:'#eff6ff',border:'1px solid #bfdbfe',fontSize:11,color:'#1e40af' }}>\uD83E\uDD16 <b>IA ativa</b> — analisa histórico e sugere ajustes automáticos de pró-labore.</div>
              </div>
            </div>

            <div style={{ fontWeight:700,color:NAVY,fontSize:14,marginBottom:12 }}>\uD83D\uDC65 Sócios / Administradores</div>
            {socios.map((s,i)=>(
              <div key={i} style={{ padding:16,borderRadius:12,background:'#fff',border:'1px solid #e5e7eb',marginBottom:12 }}>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 140px 140px 70px auto',gap:10,alignItems:'end' }}>
                  {[['Nome',s.nome,'nome','text'],['CPF',s.cpf,'cpf','text'],['Bruto R$',s.valor_bruto,'valor_bruto','number'],['Dep.',s.dependentes||0,'dependentes','number']].map(([lb,vl,key,tp])=>(
                    <div key={key}>
                      <label style={{ fontSize:11,fontWeight:700,color:'#555',display:'block',marginBottom:3 }}>{lb}</label>
                      <input type={tp} value={vl} onChange={e=>setSocios(p=>p.map((x,j)=>j===i?{...x,[key]:tp==='number'?(parseFloat(e.target.value)||0):e.target.value}:x))}
                        style={{ width:'100%',padding:'8px 10px',borderRadius:8,border:key==='valor_bruto'?'2px solid '+NAVY:'1px solid #ddd',fontSize:key==='valor_bruto'?14:13,fontWeight:key==='valor_bruto'?700:400,boxSizing:'border-box' }}/>
                    </div>
                  ))}
                  {socios.length>1 && <button onClick={()=>setSocios(p=>p.filter((_,j)=>j!==i))} style={{ padding:'8px',borderRadius:8,background:'#fef2f2',color:'#dc2626',border:'1px solid #fca5a5',cursor:'pointer',alignSelf:'flex-end' }}>\u2715</button>}
                </div>
              </div>
            ))}
            <div style={{ display:'flex',gap:12,marginBottom:24 }}>
              <button onClick={()=>setSocios(p=>[...p,{nome:'',cpf:'',cargo:'Sócio',valor_bruto:1518,dependentes:0}])} style={{ padding:'8px 16px',borderRadius:8,background:'#f3f4f6',color:NAVY,border:'1px solid #ddd',cursor:'pointer',fontSize:12,fontWeight:600 }}>+ Adicionar sócio</button>
            </div>
            <button onClick={calcular} disabled={calculando||!empresa}
              style={{ width:'100%',padding:14,borderRadius:12,background:calculando?'#9ca3af':NAVY,color:'#fff',border:'none',cursor:calculando?'not-allowed':'pointer',fontWeight:800,fontSize:16 }}>
              {calculando ? '\u23F3 Calculando com IA...' : '\uD83E\uDDEE Calcular Pró-labore com IA'}
            </button>
          </div>
        )}

        {aba==='resultado' && resultado && (
          <div>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
              <div><div style={{ fontWeight:800,color:NAVY,fontSize:16 }}>Competência {resultado.competencia}</div><div style={{ fontSize:12,color:'#888' }}>{resultado.empresa_nome}</div></div>
              <Badge status={resultado.status}/>
            </div>
            {alertaIA?.sugestao_valor>0 && <div style={{ padding:14,borderRadius:10,background:'#eff6ff',border:'1px solid #bfdbfe',marginBottom:16 }}><div style={{ fontWeight:700,color:'#1e40af',fontSize:13,marginBottom:4 }}>\uD83E\uDD16 Sugestão da IA</div><div style={{ fontSize:12,color:'#555' }}>{alertaIA.motivo}</div></div>}
            {resultado.socios.map((s,i)=><CardSocio key={i} s={s}/>)}
            <div style={{ padding:20,borderRadius:12,background:NAVY,marginBottom:20 }}>
              <div style={{ fontWeight:800,color:'#fff',fontSize:14,marginBottom:12 }}>\uD83D\uDCCA Totais da Competência</div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10 }}>
                {[['Bruto',tot.bruto,'#fff'],['GPS/INSS',tot.inss,GOLD],['IRRF',tot.irrf,'#fca5a5'],['Líquido',tot.liquido,'#86efac']].map(([lb,vl,cor])=>(
                  <div key={lb} style={{ textAlign:'center',padding:12,borderRadius:10,background:'rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize:10,color:'rgba(255,255,255,0.5)',marginBottom:4 }}>{lb}</div>
                    <div style={{ fontSize:17,fontWeight:800,color:cor }}>{fmtR(vl)}</div>
                  </div>
                ))}
              </div>
            </div>
            {resultado.status==='aguardando_aprovacao' && (
              <div style={{ padding:20,borderRadius:12,background:'#f9fafb',border:'2px solid #e5e7eb',marginBottom:20 }}>
                <div style={{ fontWeight:700,color:NAVY,fontSize:14,marginBottom:14 }}>\uD83D\uDD10 Aprovação antes do envio</div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14 }}>
                  <div>
                    <label style={{ fontSize:11,fontWeight:700,color:'#555',display:'block',marginBottom:4 }}>\uD83D\uDC64 Aprovador *</label>
                    <input value={aprovador} onChange={e=>setAprovador(e.target.value)} placeholder="Nome do responsável" style={{ width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid '+(aprovador?NAVY:'#ddd'),fontSize:13,boxSizing:'border-box' }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:11,fontWeight:700,color:'#555',display:'block',marginBottom:4 }}>\uD83D\uDCDD Observação</label>
                    <input value={obs} onChange={e=>setObs(e.target.value)} placeholder="Opcional" style={{ width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid #ddd',fontSize:13,boxSizing:'border-box' }}/>
                  </div>
                </div>
                <div style={{ display:'flex',gap:10 }}>
                  <button onClick={gerarPDF} disabled={gerandoPDF} style={{ padding:'10px 16px',borderRadius:8,background:'#f3f4f6',color:NAVY,border:'1px solid #ddd',cursor:'pointer',fontWeight:600,fontSize:12 }}>{gerandoPDF?'\u23F3...':'\uD83D\uDCC4 Gerar PDF'}</button>
                  {pdfB64 && <button onClick={()=>{const l=document.createElement('a');l.href='data:application/pdf;base64,'+pdfB64;l.download='prolabore_'+resultado.competencia.replace('/','_')+'.pdf';l.click()}} style={{ padding:'10px 16px',borderRadius:8,background:'#eff6ff',color:'#1e40af',border:'1px solid #bfdbfe',cursor:'pointer',fontWeight:700,fontSize:12 }}>\u2B07\uFE0F Baixar PDF</button>}
                  <div style={{ flex:1 }}/>
                  <button onClick={()=>aprovar(false)} disabled={aprovando} style={{ padding:'11px 20px',borderRadius:8,background:'#fef2f2',color:'#dc2626',border:'1px solid #fca5a5',cursor:'pointer',fontWeight:700,fontSize:13 }}>\u274C Reprovar</button>
                  <button onClick={()=>aprovar(true)} disabled={aprovando||!aprovador} style={{ padding:'11px 28px',borderRadius:8,background:aprovador?NAVY:'#9ca3af',color:'#fff',border:'none',cursor:aprovador?'pointer':'not-allowed',fontWeight:800,fontSize:14 }}>{aprovando?'\u23F3...':'\u2705 Aprovar e Liberar'}</button>
                </div>
                {!aprovador && <div style={{ fontSize:11,color:'#f59e0b',marginTop:8 }}>\u26A0\uFE0F Informe o nome do aprovador</div>}
              </div>
            )}
            {resultado.status==='aprovado' && <div style={{ padding:16,borderRadius:12,background:'#f0fdf4',border:'2px solid #86efac',textAlign:'center' }}><div style={{ fontSize:28,marginBottom:6 }}>\u2705</div><div style={{ fontWeight:800,color:NAVY,fontSize:15,marginBottom:4 }}>Aprovado! Pronto para eSocial.</div><button onClick={()=>setAba('esocial')} style={{ padding:'10px 24px',borderRadius:10,background:NAVY,color:'#fff',border:'none',cursor:'pointer',fontWeight:700 }}>Ir para eSocial & GPS \u2192</button></div>}
            {['transmitindo','transmitido','erro_transmissao'].includes(resultado.status) && <div style={{ padding:16,borderRadius:12,background:STATUS_INFO[resultado.status]?.bg,border:'1px solid #e5e7eb',textAlign:'center' }}><div style={{ fontSize:28,marginBottom:6 }}>{STATUS_INFO[resultado.status]?.icon}</div><div style={{ fontWeight:800,color:NAVY,fontSize:15 }}>{STATUS_INFO[resultado.status]?.label}</div>{resultado.protocolo&&<div style={{ fontSize:12,color:'#555',marginTop:4 }}>Protocolo: <b>{resultado.protocolo}</b></div>}{polling&&<div style={{ fontSize:11,color:'#888',marginTop:6 }}>\uD83D\uDD04 Aguardando confirmação...</div>}</div>}
          </div>
        )}

        {aba==='resultado' && !resultado && <div style={{ textAlign:'center',padding:60,color:'#aaa' }}><div style={{ fontSize:48,marginBottom:12 }}>\uD83D\uDCCA</div><div>Calcule na aba <b>\uD83D\uDCCA Calcular</b> primeiro.</div></div>}

        {aba==='esocial' && resultado && (
          <div>
            <div style={{ padding:20,borderRadius:12,background:'#fffbeb',border:'2px solid #fde68a',marginBottom:20 }}>
              <div style={{ fontWeight:800,color:'#92400e',fontSize:15,marginBottom:12 }}>\uD83C\uDFDB\uFE0F GPS — Guia da Previdência Social</div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10 }}>
                {[['Código Receita','1406'],['Competência',resultado.competencia],['Valor INSS',fmtR(resultado.gps?.valor)],['Vencimento','20/'+resultado.competencia?.split('/')?.[0]+'/'+resultado.competencia?.split('/')?.[1]],['Cód. Barras',resultado.gps?.linha_digitavel||'—']].map(([lb,vl])=>(
                  <div key={lb} style={{ padding:'8px 12px',borderRadius:8,background:'#fff',border:'1px solid #fde68a' }}>
                    <div style={{ fontSize:10,fontWeight:700,color:'#92400e' }}>{lb}</div>
                    <div style={{ fontSize:12,fontWeight:700,color:NAVY,fontFamily:lb==='Cód. Barras'?'monospace':'inherit' }}>{vl}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding:20,borderRadius:12,background:'#f5f3ff',border:'2px solid #c4b5fd',marginBottom:20 }}>
              <div style={{ fontWeight:800,color:'#4c1d95',fontSize:15,marginBottom:12 }}>\uD83D\uDCCB Eventos eSocial S-1200</div>
              {resultado.socios.map((s,i)=>(
                <div key={i} style={{ padding:12,borderRadius:8,background:'#fff',border:'1px solid #c4b5fd',marginBottom:8 }}>
                  <div style={{ fontWeight:700,color:NAVY,fontSize:13 }}>{s.nome} — S-1200 Remuneração</div>
                  <div style={{ fontSize:11,color:'#888' }}>Competência {resultado.competencia} · {fmtR(s.valor_bruto)}</div>
                  <details style={{ marginTop:6 }}><summary style={{ cursor:'pointer',fontSize:11,color:'#7c3aed',fontWeight:600 }}>Ver XML</summary><pre style={{ fontSize:9,background:'#f9fafb',padding:8,borderRadius:6,overflow:'auto',maxHeight:180,marginTop:4 }}>{s.xml_s1200}</pre></details>
                </div>
              ))}
            </div>
            <div style={{ padding:20,borderRadius:12,background:'#f9fafb',border:'1px solid #e5e7eb' }}>
              <div style={{ fontWeight:700,color:NAVY,fontSize:14,marginBottom:12 }}>\uD83D\uDD10 Certificado Digital</div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12 }}>
                <div><label style={{ fontSize:11,fontWeight:700,color:'#555',display:'block',marginBottom:4 }}>Certificado (.pfx)</label><input value={certPath} onChange={e=>setCertPath(e.target.value)} placeholder="empresa.pfx" style={{ width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid #ddd',fontSize:13,boxSizing:'border-box' }}/></div>
                <div><label style={{ fontSize:11,fontWeight:700,color:'#555',display:'block',marginBottom:4 }}>Senha</label><input type="password" value={certSenha} onChange={e=>setCertSenha(e.target.value)} style={{ width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid #ddd',fontSize:13,boxSizing:'border-box' }}/></div>
              </div>
              <div style={{ fontSize:11,color:'#888',marginBottom:14,padding:'8px 12px',borderRadius:8,background:'#fff',border:'1px solid #e5e7eb' }}>\uD83D\uDCA1 Certificado em /app/certificados_servidor/ no Railway. Sem certificado: XMLs gerados para envio manual.</div>
              <button onClick={transmitir} disabled={transmitindo||resultado?.status!=='aprovado'||polling}
                style={{ width:'100%',padding:14,borderRadius:12,background:resultado?.status==='aprovado'&&!polling?'#7c3aed':'#9ca3af',color:'#fff',border:'none',cursor:resultado?.status==='aprovado'&&!polling?'pointer':'not-allowed',fontWeight:800,fontSize:15 }}>
                {polling?'\uD83D\uDD04 Aguardando...':transmitindo?'\u23F3 Iniciando...':resultado?.status!=='aprovado'?'\u26A0\uFE0F Aprove primeiro':'\uD83D\uDCE4 Transmitir ao eSocial'}
              </button>
            </div>
          </div>
        )}

        {aba==='esocial' && !resultado && <div style={{ textAlign:'center',padding:60,color:'#aaa' }}><div style={{ fontSize:48,marginBottom:12 }}>\uD83D\uDCE4</div><div>Calcule e aprove primeiro.</div></div>}

        {aba==='historico' && (
          <div>
            <div style={{ fontWeight:800,color:NAVY,fontSize:16,marginBottom:16 }}>\uD83D\uDD50 Histórico de Pró-labore</div>
            {historico.length===0
              ? <div style={{ textAlign:'center',padding:60,color:'#aaa' }}><div style={{ fontSize:48,marginBottom:12 }}>\uD83D\uDCBC</div><div>Nenhum cálculo realizado.</div></div>
              : [...historico].reverse().map((h,i)=>(
                <div key={h.id||i} style={{ padding:16,borderRadius:12,background:'#fff',border:'1px solid #e5e7eb',marginBottom:10 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6 }}>
                    <div style={{ fontWeight:700,color:NAVY,fontSize:14 }}>Competência {h.competencia}</div>
                    <Badge status={h.status}/>
                  </div>
                  <div style={{ display:'flex',gap:16,fontSize:12,color:'#555' }}>
                    <span>Bruto: <b>{fmtR(h.totais?.bruto)}</b></span>
                    <span>GPS: <b>{fmtR(h.totais?.inss)}</b></span>
                    <span>Líquido: <b>{fmtR(h.totais?.liquido)}</b></span>
                    {h.protocolo&&<span>Protocolo: <b>{h.protocolo}</b></span>}
                  </div>
                  {h.aprovador&&<div style={{ fontSize:11,color:'#888',marginTop:3 }}>Aprovado por: {h.aprovador}</div>}
                  <button onClick={()=>{setResultado(h);setAba('resultado')}} style={{ marginTop:10,padding:'4px 14px',borderRadius:7,background:'#f0fdf4',color:NAVY,border:'1px solid #bbf7d0',cursor:'pointer',fontSize:11,fontWeight:600 }}>Ver detalhes</button>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}
