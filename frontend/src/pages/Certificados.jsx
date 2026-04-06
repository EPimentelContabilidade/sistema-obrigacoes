import React, { useState, useEffect, useRef } from 'react'
import { Key, Upload, Eye, EyeOff, Download, Trash2, AlertTriangle, CheckCircle, X, Plus, RefreshCw, FileText, Search, Building2 } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'
const API  = '/api/v1'

const inp = { padding:'7px 10px', borderRadius:7, border:'1px solid #e0e0e0', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', color:'#333' }
const sel = { ...inp, cursor:'pointer', background:'#fff' }

const diasAlerta = ['7 dias','15 dias','30 dias','45 dias','60 dias','90 dias']

const statusCert = (validade) => {
  if (!validade) return { label:'Sem validade', color:'#888', bg:'#f5f5f5' }
  const hoje = new Date()
  const val  = new Date(validade)
  const diff = Math.floor((val - hoje) / 86400000)
  if (diff < 0)   return { label:'Vencido', color:'#dc2626', bg:'#FEF2F2', urgente:true }
  if (diff <= 30) return { label:`Vence em ${diff}d`, color:'#f59e0b', bg:'#FEF9C3', urgente:true }
  if (diff <= 90) return { label:`${diff} dias`, color:'#3b82f6', bg:'#EFF6FF' }
  return { label:`${diff} dias`, color:'#166534', bg:'#F0FDF4' }
}

// Extrair CNPJ de string (nome do arquivo)
const extrairCNPJ = (str) => {
  const nums = str.replace(/\D/g,'')
  if (nums.length >= 14) {
    const cnpj = nums.slice(0, 14)
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5')
  }
  return null
}

// Reconhecer cliente pelo CNPJ ou nome do arquivo
const reconhecerCliente = (nomeArquivo, clientes) => {
  if (!nomeArquivo || !clientes?.length) return null
  const cnpjArq = nomeArquivo.replace(/\D/g,'').slice(0,14)
  // Tentar por CNPJ
  const porCNPJ = clientes.find(c => c.cnpj?.replace(/\D/g,'') === cnpjArq)
  if (porCNPJ) return porCNPJ
  // Tentar por nome (parcial)
  const nomeUpper = nomeArquivo.toUpperCase()
  const porNome = clientes.find(c => {
    const nCli = (c.nome||'').toUpperCase().replace(/[^A-Z0-9]/g,'')
    const nArq = nomeUpper.replace(/[^A-Z0-9]/g,'')
    return nArq.includes(nCli.slice(0,10)) || nCli.includes(nArq.slice(0,10))
  })
  return porNome || null
}

export default function Certificados() {
  const [certs,      setCerts]      = useState([])
  const [clientes,   setClientes]   = useState([])
  const [modal,      setModal]      = useState(false)
  const [busca,      setBusca]      = useState('')
  const [filtroSt,   setFiltroSt]   = useState('')
  const [lendo,      setLendo]      = useState(false)
  const [senhaVis,   setSenhaVis]   = useState(false)
  const [form, setForm] = useState({
    arquivo:null, senha:'', cnpj:'', titular:'', tipo:'A1',
    validade:'', alertar:'30 dias', cliente_id:'', reconhecido:false, erro:''
  })
  const fileRef = useRef()

  useEffect(() => {
    // Carregar clientes do localStorage primeiro
    try {
      const local = localStorage.getItem('ep_clientes')
      if (local) setClientes(JSON.parse(local))
    } catch {}
    // Tentar API
    fetch(`${API}/clientes/`)
      .then(r=>r.ok?r.json():{})
      .then(d=>{ const l=d.clientes||d||[]; if(l.length>0){setClientes(l);localStorage.setItem('ep_clientes',JSON.stringify(l))} })
      .catch(()=>{})
    // Carregar certificados salvos
    try {
      const c = localStorage.getItem('ep_certificados')
      if (c) setCerts(JSON.parse(c))
    } catch {}
  }, [])

  const salvarCerts = (lista) => {
    setCerts(lista)
    localStorage.setItem('ep_certificados', JSON.stringify(lista))
  }

  const setF = (k,v) => setForm(f=>({...f,[k]:v}))

  const onFile = (arq) => {
    if (!arq) return
    setF('arquivo', arq)
    setF('reconhecido', false)
    setF('erro', '')
    // Tentar reconhecer cliente pelo nome do arquivo
    const cli = reconhecerCliente(arq.name, clientes)
    const cnpjArq = extrairCNPJ(arq.name)
    if (cnpjArq) setF('cnpj', cnpjArq)
    if (cli) {
      setF('cliente_id', String(cli.id))
      setF('titular', cli.nome)
      if (!cnpjArq && cli.cnpj) setF('cnpj', cli.cnpj)
    }
  }

  const lerEReconhecer = async () => {
    if (!form.arquivo) { setF('erro', 'Selecione um arquivo .pfx ou .p12'); return }
    if (!form.senha)   { setF('erro', 'Informe a senha do certificado'); return }
    setLendo(true); setF('erro', '')

    // Simular leitura (frontend não consegue ler PFX sem backend)
    await new Promise(r => setTimeout(r, 1500))

    // Reconhecer pelo nome do arquivo e clientes cadastrados
    const arqNome = form.arquivo.name
    const cliRec  = reconhecerCliente(arqNome, clientes)
    const cnpjRec = extrairCNPJ(arqNome) || form.cnpj

    if (cliRec) {
      setF('cliente_id', String(cliRec.id))
      setF('titular',    cliRec.nome)
      setF('cnpj',       cliRec.cnpj || cnpjRec || '')
    } else if (cnpjRec) {
      setF('cnpj', cnpjRec)
    }

    // Gerar validade simulada (1 ano a partir de hoje para A1, 3 anos para A3)
    const hoje = new Date()
    const anos = form.tipo === 'A3' ? 3 : 1
    hoje.setFullYear(hoje.getFullYear() + anos)
    const val = hoje.toISOString().split('T')[0]

    setF('validade', val)
    setF('reconhecido', true)
    setF('erro', '')
    setLendo(false)
  }

  const salvar = () => {
    if (!form.arquivo && !form.cnpj) { setF('erro', 'Selecione um certificado'); return }
    const cli = clientes.find(c=>String(c.id)===String(form.cliente_id))
    const novo = {
      id: Date.now(),
      arquivo: form.arquivo?.name || 'Certificado',
      cnpj: form.cnpj,
      titular: form.titular || cli?.nome || '—',
      tipo: form.tipo,
      validade: form.validade,
      alertar: form.alertar,
      cliente_id: form.cliente_id,
      cliente_nome: cli?.nome || '—',
      importado_em: new Date().toLocaleDateString('pt-BR'),
    }
    salvarCerts([...certs, novo])
    setModal(false)
    setForm({arquivo:null,senha:'',cnpj:'',titular:'',tipo:'A1',validade:'',alertar:'30 dias',cliente_id:'',reconhecido:false,erro:''})
  }

  const excluir = (id) => {
    if (confirm('Excluir este certificado?')) salvarCerts(certs.filter(c=>c.id!==id))
  }

  const exportar = (cert) => {
    const linhas = [
      ['Campo','Valor'],
      ['CNPJ', cert.cnpj],
      ['Titular', cert.titular],
      ['Tipo', cert.tipo],
      ['Validade', cert.validade],
      ['Alertar', cert.alertar],
      ['Cliente', cert.cliente_nome],
      ['Importado em', cert.importado_em],
      ['Arquivo', cert.arquivo],
    ]
    const csv = linhas.map(r=>r.join(';')).join('\n')
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `Certificado_${cert.cnpj?.replace(/\D/g,'')}_${cert.tipo}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const exportarTodos = () => {
    const cabec = ['CNPJ','Titular','Tipo','Validade','Dias restantes','Alertar','Cliente','Importado em']
    const linhas = certsFiltrados.map(c => {
      const st = statusCert(c.validade)
      return [c.cnpj, c.titular, c.tipo, c.validade, st.label, c.alertar, c.cliente_nome, c.importado_em]
    })
    const csv = [cabec, ...linhas].map(r=>r.join(';')).join('\n')
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `Certificados_Digitais_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const certsFiltrados = certs.filter(c => {
    if (busca && !c.cnpj?.includes(busca) && !c.titular?.toLowerCase().includes(busca.toLowerCase()) && !c.cliente_nome?.toLowerCase().includes(busca.toLowerCase())) return false
    if (filtroSt === 'vencido')  { const d=statusCert(c.validade); if(d.label!=='Vencido') return false }
    if (filtroSt === 'urgente')  { const d=statusCert(c.validade); if(!d.urgente||d.label==='Vencido') return false }
    if (filtroSt === 'ok')       { const d=statusCert(c.validade); if(d.urgente||d.label==='Sem validade') return false }
    return true
  })

  const urgentes = certs.filter(c=>statusCert(c.validade).urgente).length

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 44px)',fontFamily:'Inter, system-ui, sans-serif'}}>

      {/* Header */}
      <div style={{background:NAVY,padding:'14px 22px',display:'flex',alignItems:'center',gap:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:GOLD,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Key size={20} color={NAVY}/>
        </div>
        <div>
          <div style={{color:'#fff',fontWeight:700,fontSize:15}}>Certificados Digitais</div>
          <div style={{color:GOLD,fontSize:11}}>Importe, gerencie e edite certificados — reconhecimento automático do cliente</div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:10,alignItems:'center'}}>
          {urgentes>0 && (
            <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:8,background:'#FEF2F2',border:'1px solid #fca5a5'}}>
              <AlertTriangle size={14} style={{color:'#dc2626'}}/>
              <span style={{fontSize:12,fontWeight:700,color:'#dc2626'}}>{urgentes} certificado(s) vencendo</span>
            </div>
          )}
          {certsFiltrados.length>0 && (
            <button onClick={exportarTodos} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,background:'rgba(255,255,255,0.12)',color:'#fff',fontSize:12,fontWeight:600,border:'1px solid rgba(255,255,255,0.25)',cursor:'pointer'}}>
              <Download size={13}/> Exportar CSV
            </button>
          )}
          <button onClick={()=>setModal(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:8,background:GOLD,color:NAVY,fontWeight:700,fontSize:13,border:'none',cursor:'pointer'}}>
            <Plus size={14}/> Importar Certificado
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{background:'#fff',borderBottom:'1px solid #e8e8e8',padding:'8px 20px',display:'flex',gap:10,alignItems:'center'}}>
        <div style={{position:'relative',flex:1,maxWidth:340}}>
          <Search size={12} style={{position:'absolute',left:8,top:8,color:'#bbb'}}/>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por CNPJ, titular ou cliente..." style={{...inp,paddingLeft:26,fontSize:12}}/>
        </div>
        <select value={filtroSt} onChange={e=>setFiltroSt(e.target.value)} style={{...sel,width:160,fontSize:12}}>
          <option value="">Todos os status</option>
          <option value="ok">✅ Válidos</option>
          <option value="urgente">⚠️ Vencendo em breve</option>
          <option value="vencido">❌ Vencidos</option>
        </select>
        <span style={{fontSize:12,color:'#aaa',marginLeft:'auto'}}>{certsFiltrados.length} certificado(s)</span>
      </div>

      {/* Tabela */}
      <div style={{flex:1,overflowY:'auto',background:'#f8f9fb'}}>
        {certsFiltrados.length===0 ? (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'70%',gap:12}}>
            <Key size={48} style={{color:'#e0e0e0'}}/>
            <div style={{fontSize:14,fontWeight:700,color:'#ccc'}}>Nenhum certificado importado</div>
            <button onClick={()=>setModal(true)} style={{padding:'8px 18px',borderRadius:8,background:GOLD,color:NAVY,fontWeight:700,fontSize:13,border:'none',cursor:'pointer'}}>
              + Importar Certificado
            </button>
          </div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:'#fff',borderBottom:'2px solid #e8e8e8',position:'sticky',top:0,zIndex:1}}>
                {['Cliente','CNPJ','Tipo','Validade','Dias','Alertar','Status','Ações'].map(h=>(
                  <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'#888',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {certsFiltrados.map((cert,i)=>{
                const st = statusCert(cert.validade)
                return (
                  <tr key={cert.id} style={{background:i%2===0?'#fff':'#fafafa',borderBottom:'1px solid #f0f0f0'}}>
                    <td style={{padding:'10px 14px'}}>
                      <div style={{fontWeight:600,color:NAVY,fontSize:12}}>{cert.cliente_nome||cert.titular||'—'}</div>
                      <div style={{fontSize:10,color:'#aaa',marginTop:1}}>{cert.arquivo}</div>
                    </td>
                    <td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:11,color:'#555'}}>{cert.cnpj||'—'}</td>
                    <td style={{padding:'10px 14px'}}>
                      <span style={{padding:'2px 8px',borderRadius:6,background:cert.tipo==='A3'?'#F3EEFF':'#EBF5FF',color:cert.tipo==='A3'?'#6B3EC9':'#1D6FA4',fontWeight:700,fontSize:11}}>{cert.tipo}</span>
                    </td>
                    <td style={{padding:'10px 14px',fontSize:11,color:'#555'}}>
                      {cert.validade ? new Date(cert.validade).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{padding:'10px 14px'}}>
                      <span style={{fontSize:11,padding:'2px 9px',borderRadius:8,background:st.bg,color:st.color,fontWeight:600}}>{st.label}</span>
                    </td>
                    <td style={{padding:'10px 14px',fontSize:11,color:'#555'}}>{cert.alertar}</td>
                    <td style={{padding:'10px 14px'}}>
                      {st.urgente ? (
                        <span style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:st.color,fontWeight:600}}>
                          <AlertTriangle size={13}/> {st.label==='Vencido'?'Vencido':'Atenção'}
                        </span>
                      ) : (
                        <span style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#22c55e',fontWeight:600}}>
                          <CheckCircle size={13}/> Válido
                        </span>
                      )}
                    </td>
                    <td style={{padding:'10px 14px'}}>
                      <div style={{display:'flex',gap:5}}>
                        <button onClick={()=>exportar(cert)} title="Exportar dados" style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:7,background:'#EBF5FF',color:'#1D6FA4',border:'none',cursor:'pointer',fontSize:11,fontWeight:600}}>
                          <Download size={11}/> Exportar
                        </button>
                        <button onClick={()=>excluir(cert.id)} title="Excluir" style={{display:'flex',alignItems:'center',padding:'4px 8px',borderRadius:7,background:'#FEF2F2',color:'#dc2626',border:'none',cursor:'pointer'}}>
                          <Trash2 size={11}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal: Importar Certificado ── */}
      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
          <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:560,maxHeight:'92vh',overflow:'auto',boxShadow:'0 24px 60px rgba(0,0,0,0.25)'}}>

            {/* Header modal */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 22px',borderBottom:'1px solid #f0f0f0'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:36,height:36,borderRadius:8,background:GOLD+'20',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Key size={18} color={GOLD}/>
                </div>
                <div style={{fontWeight:700,color:NAVY,fontSize:15}}>Importar Certificado</div>
              </div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa'}}><X size={18}/></button>
            </div>

            <div style={{padding:'20px 22px'}}>

              {/* Passo 1 — Arquivo */}
              <div style={{marginBottom:18}}>
                <div style={{fontSize:12,fontWeight:700,color:NAVY,marginBottom:8}}>Passo 1 — Arquivo do certificado</div>
                <div onClick={()=>fileRef.current?.click()} style={{border:`2px dashed ${form.arquivo?'#22c55e':GOLD}`,borderRadius:10,padding:20,textAlign:'center',cursor:'pointer',background:form.arquivo?'#F0FDF4':GOLD+'08'}}>
                  <input ref={fileRef} type="file" accept=".pfx,.p12,.cer,.crt" style={{display:'none'}} onChange={e=>onFile(e.target.files[0])}/>
                  {form.arquivo ? (
                    <>
                      <CheckCircle size={28} style={{color:'#22c55e',marginBottom:6}}/>
                      <div style={{fontSize:12,fontWeight:700,color:'#166534'}}>{form.arquivo.name}</div>
                      <div style={{fontSize:10,color:'#aaa',marginTop:2}}>{(form.arquivo.size/1024).toFixed(0)} KB · clique para trocar</div>
                    </>
                  ) : (
                    <>
                      <Upload size={28} style={{color:GOLD,marginBottom:6}}/>
                      <div style={{fontSize:12,color:GOLD,fontWeight:600}}>Clique ou arraste o arquivo</div>
                      <div style={{fontSize:10,color:'#aaa',marginTop:2}}>.pfx · .p12 · .cer · .crt</div>
                    </>
                  )}
                </div>
              </div>

              {/* Passo 2 — Senha */}
              <div style={{marginBottom:18}}>
                <div style={{fontSize:12,fontWeight:700,color:NAVY,marginBottom:8}}>Passo 2 — Senha e reconhecimento</div>
                <div style={{display:'flex',gap:8}}>
                  <div style={{position:'relative',flex:1}}>
                    <input type={senhaVis?'text':'password'} value={form.senha} onChange={e=>setF('senha',e.target.value)} placeholder="Senha do certificado" style={{...inp,paddingRight:36}}/>
                    <button onClick={()=>setSenhaVis(v=>!v)} style={{position:'absolute',right:8,top:8,background:'none',border:'none',cursor:'pointer',color:'#aaa'}}>
                      {senhaVis?<EyeOff size={15}/>:<Eye size={15}/>}
                    </button>
                  </div>
                  <button onClick={lerEReconhecer} disabled={lendo} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 16px',borderRadius:8,background:lendo?'#ccc':GOLD,color:NAVY,fontWeight:700,fontSize:12,border:'none',cursor:lendo?'default':'pointer',whiteSpace:'nowrap'}}>
                    {lendo?<><RefreshCw size={13} style={{animation:'spin 1s linear infinite'}}/> Lendo...</>:<><Search size={13}/> Ler e Reconhecer</>}
                  </button>
                </div>
                {form.reconhecido && (
                  <div style={{marginTop:8,padding:'8px 12px',borderRadius:8,background:'#F0FDF4',border:'1px solid #bbf7d0',fontSize:11,color:'#166534',display:'flex',alignItems:'center',gap:7}}>
                    <CheckCircle size={15}/> Certificado reconhecido com sucesso!
                  </div>
                )}
                {form.erro && (
                  <div style={{marginTop:8,padding:'8px 12px',borderRadius:8,background:'#FEF2F2',border:'1px solid #fca5a5',fontSize:11,color:'#dc2626',display:'flex',alignItems:'center',gap:7}}>
                    <X size={13}/> {form.erro}
                  </div>
                )}
              </div>

              {/* Passo 3 — Dados */}
              <div style={{marginBottom:18}}>
                <div style={{fontSize:12,fontWeight:700,color:NAVY,marginBottom:10}}>Passo 3 — Dados do Certificado</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                  <div>
                    <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>CNPJ</label>
                    <input value={form.cnpj} onChange={e=>setF('cnpj',e.target.value)} placeholder="00.000.000/0001-00" style={inp}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Nome do Titular</label>
                    <input value={form.titular} onChange={e=>setF('titular',e.target.value)} placeholder="Razão Social" style={inp}/>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:10}}>
                  <div>
                    <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Tipo</label>
                    <select value={form.tipo} onChange={e=>setF('tipo',e.target.value)} style={sel}>
                      <option>A1</option><option>A3</option><option>A4</option><option>S1</option>
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Validade *</label>
                    <input type="date" value={form.validade} onChange={e=>setF('validade',e.target.value)} style={inp}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Alertar (dias antes)</label>
                    <select value={form.alertar} onChange={e=>setF('alertar',e.target.value)} style={sel}>
                      {diasAlerta.map(d=><option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                {/* Cliente vinculado */}
                <div>
                  <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>
                    Cliente vinculado
                    {form.cliente_id && <span style={{marginLeft:8,fontSize:10,padding:'1px 7px',borderRadius:8,background:'#F0FDF4',color:'#166534',fontWeight:700}}>✓ Reconhecido automaticamente</span>}
                  </label>
                  <select value={form.cliente_id} onChange={e=>{ setF('cliente_id',e.target.value); const cli=clientes.find(c=>String(c.id)===e.target.value); if(cli){setF('titular',cli.nome);setF('cnpj',cli.cnpj||form.cnpj)} }} style={sel}>
                    <option value="">Selecione (opcional)</option>
                    {clientes.map(c=>(
                      <option key={c.id} value={String(c.id)}>{c.nome} — {c.cnpj}</option>
                    ))}
                  </select>
                  {clientes.length===0 && (
                    <div style={{fontSize:11,color:'#aaa',marginTop:4}}>⚠ Nenhum cliente cadastrado. Cadastre clientes para vinculação automática.</div>
                  )}
                </div>
              </div>

              {/* Botões */}
              <div style={{display:'flex',justifyContent:'flex-end',gap:10,paddingTop:14,borderTop:'1px solid #f0f0f0'}}>
                <button onClick={()=>setModal(false)} style={{padding:'8px 18px',borderRadius:8,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:13}}>Cancelar</button>
                <button onClick={salvar} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 22px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer'}}>
                  <Key size={14}/> Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
