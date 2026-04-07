import { useState, useEffect, useRef } from 'react'
import { Search, Plus, X, Upload, Download, AlertTriangle, CheckCircle, Clock, Shield, User, Building2, Key, Loader } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'
const API  = '/api/v1'
const inp  = { padding:'7px 10px', borderRadius:6, border:'1px solid #ddd', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', color:'#333' }

const statusCert = (validade) => {
  if (!validade) return { label:'Sem data', cor:'#aaa', bg:'#f5f5f5', icon:'—', dias: null }
  const hoje = new Date()
  const venc  = new Date(validade)
  const dias  = Math.ceil((venc - hoje) / (1000*60*60*24))
  if (dias < 0)   return { label:'Vencido',  cor:'#dc2626', bg:'#FEF2F2', icon:'✗', dias }
  if (dias <= 30) return { label:`${dias}d`, cor:'#f59e0b', bg:'#FEF9C3', icon:'⚠', dias }
  if (dias <= 90) return { label:`${dias}d`, cor:'#3b82f6', bg:'#EFF6FF', icon:'⏳', dias }
  return             { label:'OK',          cor:'#16a34a', bg:'#F0FDF4', icon:'✓', dias }
}

const fmtData = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('pt-BR') } catch { return d }
}

// ── Leitura automática do certificado via node-forge ──────────────────────────
const lerCertificado = async (arquivo, senha = '') => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const forge = window.forge
        if (!forge) { reject(new Error('Biblioteca não carregada')); return }

        const ext = arquivo.name.toLowerCase().split('.').pop()
        let cert = null
        let info = {}

        if (ext === 'pfx' || ext === 'p12') {
          // PFX/P12 — precisa de senha
          const arrayBuffer = e.target.result
          const bytes = new Uint8Array(arrayBuffer)
          let binary = ''
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
          const asn1 = forge.asn1.fromDer(binary)
          const pfx  = forge.pkcs12.pkcs12FromAsn1(asn1, senha)
          const bags  = pfx.getBags({ bagType: forge.pki.oids.certBag })
          const bag   = bags[forge.pki.oids.certBag]?.[0]
          if (bag?.cert) cert = bag.cert

        } else if (ext === 'cer' || ext === 'crt') {
          // CER/CRT — sem senha
          const text = e.target.result
          if (text.includes('-----BEGIN')) {
            cert = forge.pki.certificateFromPem(text)
          } else {
            const bytes = new Uint8Array(e.target.result)
            let bin = ''
            for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
            const asn1 = forge.asn1.fromDer(bin)
            cert = forge.pki.certificateFromAsn1(asn1)
          }
        }

        if (!cert) { reject(new Error('Não foi possível ler o certificado')); return }

        // Extrair dados
        const subject = cert.subject.attributes
        const issuer  = cert.issuer.attributes

        const getAttr = (attrs, type) => attrs.find(a => a.shortName === type || a.type === type)?.value || ''

        const cn   = getAttr(subject, 'CN')
        const ou   = getAttr(subject, 'OU')
        const issuerO = getAttr(issuer, 'O') || getAttr(issuer, 'CN')

        // Detectar CNPJ/CPF no CN (ex: "EMPRESA LTDA:12345678000100" ou "NOME:12345678900")
        let cnpjCpf = ''
        let nomeExt = cn
        const match = cn.match(/:(\d+)$/)
        if (match) {
          cnpjCpf = match[1]
          nomeExt = cn.replace(/:(\d+)$/, '').trim()
        }

        // Detectar tipo (PF = CPF 11 dígitos, PJ = CNPJ 14 dígitos)
        const isPF = cnpjCpf.length === 11 || ou?.includes('PF') || cn.includes('CPF')

        // Serial
        const serial = cert.serialNumber

        // Validade
        const validade = cert.validity.notAfter
        const emissao  = cert.validity.notBefore

        // Formatar data para input date (YYYY-MM-DD)
        const fmtDateInput = (d) => {
          const dt = new Date(d)
          return dt.toISOString().split('T')[0]
        }

        // Detectar autoridade
        let autoridade = 'ICP-Brasil'
        const issuerStr = issuerO.toLowerCase()
        if (issuerStr.includes('serasa'))    autoridade = 'Serasa'
        else if (issuerStr.includes('valid')) autoridade = 'Valid'
        else if (issuerStr.includes('certi')) autoridade = 'Certisign'
        else if (issuerStr.includes('soluti'))autoridade = 'Soluti'
        else if (issuerStr.includes('safe'))  autoridade = 'Safeweb'
        else if (issuerStr.includes('caixa')) autoridade = 'AC Caixa'

        info = {
          nome:          nomeExt,
          cnpj_cpf:      cnpjCpf,
          tipo_pessoa:   isPF ? 'PF' : 'PJ',
          validade:      fmtDateInput(validade),
          emissao:       fmtDateInput(emissao),
          numero_serie:  serial,
          autoridade_cert: autoridade,
          arquivo_nome:  arquivo.name,
          issuer_raw:    issuerO,
        }

        resolve(info)
      } catch (err) {
        reject(err)
      }
    }
    const ext = arquivo.name.toLowerCase().split('.').pop()
    if (ext === 'cer') {
      reader.readAsText(arquivo)
    } else {
      reader.readAsArrayBuffer(arquivo)
    }
  })
}

// Carregar node-forge via CDN se não estiver disponível
const carregarForge = () => new Promise((resolve) => {
  if (window.forge) { resolve(); return }
  const s = document.createElement('script')
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/forge/1.3.1/forge.min.js'
  s.onload = resolve
  s.onerror = () => resolve() // falha silenciosa
  document.head.appendChild(s)
})

const CERT_VAZIO = {
  tipo:'PJ', cliente_id:'', cliente_nome:'', responsavel_nome:'', responsavel_cpf:'',
  numero_serie:'', validade:'', emissao:'', arquivo_nome:'', observacoes:'',
  autoridade_cert:'ICP-Brasil', tipo_cert:'A1',
}

export default function Certificados() {
  const [certs,       setCerts]       = useState([])
  const [clientes,    setClientes]    = useState([])
  const [form,        setForm]        = useState(CERT_VAZIO)
  const [aba,         setAba]         = useState('lista')
  const [editId,      setEditId]      = useState(null)
  const [busca,       setBusca]       = useState('')
  const [filtroTipo,  setFiltroTipo]  = useState('')
  const [filtroSt,    setFiltroSt]    = useState('')
  const [modalExc,    setModalExc]    = useState(null)
  const [sociosSel,   setSociosSel]   = useState([])
  const [lendo,       setLendo]       = useState(false)
  const [modalSenha,  setModalSenha]  = useState(null) // arquivo aguardando senha
  const [senha,       setSenha]       = useState('')
  const [erroLeitura, setErroLeitura] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    carregarForge()
    try { setClientes(JSON.parse(localStorage.getItem('ep_clientes')||'[]')) } catch {}
    try { setCerts(JSON.parse(localStorage.getItem('ep_certificados')||'[]')) } catch {}
    fetch(`${API}/certificados/`)
      .then(r=>r.ok?r.json():{})
      .then(d=>{
        const lista = d.certificados||d||[]
        if (lista.length>0) {
          const local = JSON.parse(localStorage.getItem('ep_certificados')||'[]')
          const merged = lista.map(b=>{ const l=local.find(x=>String(x.id)===String(b.id)); return l?{...b,...l}:b })
          local.forEach(l=>{ if(!merged.find(m=>String(m.id)===String(l.id))) merged.push(l) })
          setCerts(merged)
          localStorage.setItem('ep_certificados', JSON.stringify(merged))
        }
      }).catch(()=>{})
  }, [])

  const setF = (k,v) => setForm(f=>({...f,[k]:v}))

  const onClienteChange = (cliId) => {
    setF('cliente_id', cliId)
    const cli = clientes.find(c=>String(c.id)===String(cliId))
    setF('cliente_nome', cli?.nome||'')
    setSociosSel(cli?.responsaveis||[])
  }

  const onTipoChange = (tipo) => {
    setF('tipo', tipo)
    if (tipo==='PJ') { setF('responsavel_nome',''); setF('responsavel_cpf','') }
  }

  const onSocioChange = (nome) => {
    if (!nome) { setF('responsavel_nome',''); setF('responsavel_cpf',''); return }
    const s = sociosSel.find(x=>x.nome===nome)
    if (s) { setF('responsavel_nome', s.nome); setF('responsavel_cpf', s.cpf_cnpj||'') }
  }

  // ── Importar certificado ──────────────────────────────────────────────────
  const onArquivoSelecionado = async (arquivo) => {
    if (!arquivo) return
    setErroLeitura('')
    const ext = arquivo.name.toLowerCase().split('.').pop()

    // PFX/P12 → pedir senha
    if (ext === 'pfx' || ext === 'p12') {
      setModalSenha(arquivo)
      setSenha('')
      return
    }
    // CER/CRT → ler sem senha
    await processarArquivo(arquivo, '')
  }

  const processarArquivo = async (arquivo, senhaArq) => {
    setLendo(true)
    setErroLeitura('')
    try {
      await carregarForge()
      const info = await lerCertificado(arquivo, senhaArq)
      aplicarDadosCert(info)
      setModalSenha(null)
      setSenha('')
    } catch (err) {
      if (err.message?.includes('password') || err.message?.includes('mac') || err.message?.includes('integrity')) {
        setErroLeitura('Senha incorreta. Tente novamente.')
      } else {
        setErroLeitura('Não foi possível ler o certificado automaticamente. Preencha manualmente.')
        setF('arquivo_nome', arquivo.name)
        setModalSenha(null)
      }
    }
    setLendo(false)
  }

  const aplicarDadosCert = (info) => {
    // Tipo automático
    const tipo = info.tipo_pessoa || form.tipo
    setF('tipo', tipo)
    setF('arquivo_nome',    info.arquivo_nome)
    setF('validade',        info.validade)
    setF('emissao',         info.emissao)
    setF('numero_serie',    info.numero_serie)
    setF('autoridade_cert', info.autoridade_cert)

    if (tipo === 'PF') {
      setF('responsavel_nome', info.nome)
      setF('responsavel_cpf',  info.cnpj_cpf)
      // Tentar encontrar o cliente pelo CNPJ do certificado ou pelo nome
      const cliMatch = clientes.find(c=>
        (info.cnpj_cpf && c.cnpj?.replace(/\D/g,'')===info.cnpj_cpf) ||
        info.nome?.toLowerCase().includes(c.nome?.toLowerCase().split(' ')[0])
      )
      if (cliMatch) {
        setF('cliente_id',   cliMatch.id)
        setF('cliente_nome', cliMatch.nome)
        setSociosSel(cliMatch.responsaveis||[])
      }
    } else {
      // PJ — tentar encontrar cliente pelo CNPJ
      const cnpjLimpo = info.cnpj_cpf?.replace(/\D/g,'')
      const cliMatch = clientes.find(c=>
        (cnpjLimpo && c.cnpj?.replace(/\D/g,'')===cnpjLimpo) ||
        c.nome?.toLowerCase().includes(info.nome?.toLowerCase().split(' ')[0])
      )
      if (cliMatch) {
        setF('cliente_id',   cliMatch.id)
        setF('cliente_nome', cliMatch.nome)
        setSociosSel(cliMatch.responsaveis||[])
      }
    }
  }

  const salvar = () => {
    const novoCert = { ...form, id: editId||Date.now() }
    const nova = editId ? certs.map(x=>x.id===editId?novoCert:x) : [...certs, novoCert]
    setCerts(nova)
    localStorage.setItem('ep_certificados', JSON.stringify(nova))
    try {
      const metodo = editId?'PUT':'POST'
      const url    = editId?`${API}/certificados/${editId}`:`${API}/certificados/`
      fetch(url, { method:metodo, headers:{'Content-Type':'application/json'}, body:JSON.stringify(novoCert) })
    } catch {}
    setForm(CERT_VAZIO); setEditId(null); setAba('lista')
  }

  const excluir = (id) => {
    const nova = certs.filter(x=>x.id!==id)
    setCerts(nova)
    localStorage.setItem('ep_certificados', JSON.stringify(nova))
    setModalExc(null)
  }

  const editar = (c) => {
    setForm({...CERT_VAZIO,...c})
    setEditId(c.id)
    setAba('cadastro')
    const cli = clientes.find(x=>String(x.id)===String(c.cliente_id))
    setSociosSel(cli?.responsaveis||[])
  }

  const exportarCSV = () => {
    const header = 'Tipo,Cliente,Titular,CPF/CNPJ,Validade,Status,Série,Autoridade,Tipo Cert'
    const rows = certsFiltrados.map(c=>{
      const st = statusCert(c.validade)
      return [c.tipo,c.cliente_nome,c.responsavel_nome||c.cliente_nome,c.responsavel_cpf||'',fmtData(c.validade),st.label,c.numero_serie||'',c.autoridade_cert||'',c.tipo_cert||''].join(',')
    })
    const blob = new Blob([[header,...rows].join('\n')], {type:'text/csv'})
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='certificados.csv'; a.click()
  }

  const certsFiltrados = certs.filter(c=>{
    if (busca && !c.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) && !c.responsavel_nome?.toLowerCase().includes(busca.toLowerCase()) && !c.numero_serie?.includes(busca)) return false
    if (filtroTipo && c.tipo!==filtroTipo) return false
    if (filtroSt) {
      const st = statusCert(c.validade)
      if (filtroSt==='ok'      && !(st.dias!==null&&st.dias>90)) return false
      if (filtroSt==='alerta'  && !(st.dias!==null&&st.dias>=0&&st.dias<=90)) return false
      if (filtroSt==='vencido' && !(st.dias!==null&&st.dias<0)) return false
    }
    return true
  })

  const vencidos = certs.filter(c=>{ const s=statusCert(c.validade); return s.dias!==null&&s.dias<0 }).length
  const alerta30 = certs.filter(c=>{ const s=statusCert(c.validade); return s.dias!==null&&s.dias>=0&&s.dias<=30 }).length
  const ok       = certs.filter(c=>{ const s=statusCert(c.validade); return s.dias!==null&&s.dias>90 }).length

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 44px)', fontFamily:'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', display:'flex', alignItems:'center', padding:'0 16px' }}>
        <button onClick={()=>setAba('lista')} style={{ padding:'11px 16px', fontSize:13, fontWeight:aba==='lista'?700:400, color:aba==='lista'?NAVY:'#999', background:'none', border:'none', borderBottom:aba==='lista'?`2px solid ${GOLD}`:'2px solid transparent', cursor:'pointer' }}>
          Certificados Digitais
        </button>
        {aba==='cadastro'&&<button style={{ padding:'11px 16px', fontSize:13, fontWeight:700, color:NAVY, background:'none', border:'none', borderBottom:`2px solid ${GOLD}`, cursor:'default' }}>{editId?'Editar':'Novo Certificado'}</button>}
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          {aba==='lista'&&<button onClick={exportarCSV} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, background:'#f0f4ff', color:NAVY, fontSize:12, fontWeight:600, border:`1px solid ${NAVY}30`, cursor:'pointer' }}><Download size={13}/> CSV</button>}
          <button onClick={()=>{setForm(CERT_VAZIO);setEditId(null);setAba('cadastro')}} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, background:NAVY, color:'#fff', fontWeight:600, fontSize:12, border:'none', cursor:'pointer' }}>
            <Plus size={13}/> Novo Certificado
          </button>
        </div>
      </div>

      {/* ── LISTA ── */}
      {aba==='lista' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, padding:'12px 16px', background:'#f8f9fb', borderBottom:'1px solid #e8e8e8' }}>
            {[
              { n:certs.length, l:'Total',        c:'#1D6FA4', bg:'#EBF5FF', ic:Shield },
              { n:vencidos,     l:'Vencidos',      c:'#dc2626', bg:'#FEF2F2', ic:AlertTriangle },
              { n:alerta30,     l:'Vencem em 30d', c:'#f59e0b', bg:'#FEF9C3', ic:Clock },
              { n:ok,           l:'Válidos',       c:'#16a34a', bg:'#F0FDF4', ic:CheckCircle },
            ].map(s=>{ const Ic=s.ic; return (
              <div key={s.l} style={{ background:'#fff', borderRadius:10, padding:'12px 16px', border:`1px solid ${s.c}20`, display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Ic size={20} style={{ color:s.c }}/>
                </div>
                <div>
                  <div style={{ fontSize:22, fontWeight:800, color:s.c }}>{s.n}</div>
                  <div style={{ fontSize:11, color:'#888' }}>{s.l}</div>
                </div>
              </div>
            )})}
          </div>

          <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', padding:'8px 16px', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ position:'relative', flex:1, maxWidth:320 }}>
              <Search size={12} style={{ position:'absolute', left:8, top:8, color:'#bbb' }}/>
              <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar cliente, titular ou série..." style={{ ...inp, paddingLeft:26 }}/>
            </div>
            <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)} style={{ ...inp, width:140, cursor:'pointer' }}>
              <option value="">Todos os tipos</option>
              <option value="PJ">🏢 PJ — Empresa</option>
              <option value="PF">👤 PF — Sócio/Titular</option>
            </select>
            <select value={filtroSt} onChange={e=>setFiltroSt(e.target.value)} style={{ ...inp, width:150, cursor:'pointer' }}>
              <option value="">Todos os status</option>
              <option value="ok">✓ Válidos</option>
              <option value="alerta">⚠ A vencer (90d)</option>
              <option value="vencido">✗ Vencidos</option>
            </select>
            {(busca||filtroTipo||filtroSt)&&<button onClick={()=>{setBusca('');setFiltroTipo('');setFiltroSt('')}} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:7, background:'#fee2e2', color:'#dc2626', border:'1px solid #fca5a5', fontSize:11, fontWeight:600, cursor:'pointer' }}><X size={11}/> Limpar</button>}
            <span style={{ fontSize:12, color:'#aaa', marginLeft:'auto' }}>{certsFiltrados.length} certificado(s)</span>
          </div>

          <div style={{ flex:1, overflowY:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#fff', borderBottom:'2px solid #e8e8e8', position:'sticky', top:0, zIndex:1 }}>
                  {['Tipo','Cliente / Titular','Validade','Status','Nº Série','Autoridade','Tipo Cert','Ações'].map(h=>(
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {certsFiltrados.map((c,i)=>{
                  const st  = statusCert(c.validade)
                  const isPF = c.tipo==='PF'
                  return (
                    <tr key={c.id} style={{ background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0' }}>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:8, fontSize:11, fontWeight:700, background:isPF?GOLD+'20':NAVY+'15', color:isPF?'#854D0E':NAVY }}>
                          {isPF?<User size={11}/>:<Building2 size={11}/>} {c.tipo}
                        </span>
                      </td>
                      <td style={{ padding:'9px 12px' }}>
                        <div style={{ fontWeight:600, color:NAVY, fontSize:12 }}>{c.cliente_nome||'—'}</div>
                        {isPF&&c.responsavel_nome&&<div style={{ fontSize:11, color:'#888', marginTop:1 }}>👤 {c.responsavel_nome} {c.responsavel_cpf?`· ${c.responsavel_cpf}`:''}</div>}
                        {c.arquivo_nome&&<div style={{ fontSize:10, color:'#aaa', marginTop:1 }}>📎 {c.arquivo_nome}</div>}
                      </td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:'#555' }}>{fmtData(c.validade)}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ padding:'3px 9px', borderRadius:8, fontSize:11, fontWeight:700, background:st.bg, color:st.cor }}>
                          {st.icon} {st.label}{st.dias!==null&&st.dias>=0&&st.dias<=90?' dias':''}
                        </span>
                      </td>
                      <td style={{ padding:'9px 12px', fontFamily:'monospace', fontSize:10, color:'#888' }}>{c.numero_serie?.slice(0,16)||'—'}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:'#555' }}>{c.autoridade_cert||'—'}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:'#555' }}>{c.tipo_cert||'—'}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <div style={{ display:'flex', gap:5 }}>
                          <button onClick={()=>editar(c)} style={{ padding:'4px 9px', borderRadius:6, background:'#EBF5FF', color:'#1D6FA4', border:'none', cursor:'pointer', fontSize:11 }}>✏️</button>
                          <button onClick={()=>setModalExc(c)} style={{ padding:'4px 9px', borderRadius:6, background:'#FEF2F2', color:'#dc2626', border:'none', cursor:'pointer', fontSize:11 }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {certsFiltrados.length===0&&<tr><td colSpan={8} style={{ padding:40, textAlign:'center', color:'#ccc' }}>Nenhum certificado encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CADASTRO ── */}
      {aba==='cadastro' && (
        <div style={{ flex:1, overflowY:'auto', padding:20, background:'#f8f9fb' }}>
          <div style={{ maxWidth:780, margin:'0 auto', background:'#fff', borderRadius:12, padding:24, border:'1px solid #e8e8e8' }}>

            {/* ── Importar certificado primeiro ── */}
            <div style={{ marginBottom:20, padding:'16px 18px', borderRadius:10, background: lendo?'#f0f4ff':GOLD+'06', border:`2px solid ${lendo?NAVY:GOLD}40` }}>
              <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
                <Key size={14}/> Importar Certificado Digital
                <span style={{ fontSize:10, fontWeight:400, color:'#888' }}>— Os dados serão preenchidos automaticamente</span>
              </div>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:9, background:NAVY, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', flexShrink:0 }}>
                  {lendo ? <><Loader size={14} style={{ animation:'spin 1s linear infinite' }}/> Lendo...</> : <><Upload size={14}/> Selecionar arquivo</>}
                  <input ref={fileRef} type="file" accept=".pfx,.p12,.cer,.crt" style={{ display:'none' }} disabled={lendo}
                    onChange={e=>{ if(e.target.files[0]) onArquivoSelecionado(e.target.files[0]) }}/>
                </label>
                {form.arquivo_nome && (
                  <div style={{ flex:1, padding:'9px 14px', borderRadius:8, background:'#F0FDF4', border:'1px solid #bbf7d0', fontSize:12, color:'#166534' }}>
                    ✓ <b>{form.arquivo_nome}</b>
                    {form.validade&&<span style={{ marginLeft:8, color:'#888' }}>· Válido até {fmtData(form.validade)}</span>}
                  </div>
                )}
                {erroLeitura && (
                  <div style={{ flex:1, padding:'9px 14px', borderRadius:8, background:'#FEF9C3', border:'1px solid #fde68a', fontSize:12, color:'#854D0E' }}>
                    ⚠ {erroLeitura}
                  </div>
                )}
                {!form.arquivo_nome&&!erroLeitura&&(
                  <div style={{ fontSize:11, color:'#aaa' }}>Suporta .pfx, .p12, .cer, .crt</div>
                )}
              </div>
            </div>

            {/* Tipo PJ / PF */}
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:'#888', fontWeight:700, display:'block', marginBottom:8, textTransform:'uppercase' }}>Tipo de Certificado</label>
              <div style={{ display:'flex', gap:10 }}>
                {[['PJ','🏢 PJ — Empresa (CNPJ)'],['PF','👤 PF — Pessoa Física (Sócio/Titular)']].map(([v,l])=>(
                  <button key={v} onClick={()=>onTipoChange(v)} style={{ flex:1, padding:'12px 16px', borderRadius:10, cursor:'pointer', border:`2px solid ${form.tipo===v?NAVY:'#ddd'}`, background:form.tipo===v?NAVY:'#fff', color:form.tipo===v?'#fff':'#888', fontWeight:form.tipo===v?700:400, fontSize:13 }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Cliente */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Empresa / Cliente *</label>
                <select value={form.cliente_id} onChange={e=>onClienteChange(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  <option value="">Selecione o cliente...</option>
                  {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Tipo de Certificação</label>
                <select value={form.tipo_cert} onChange={e=>setF('tipo_cert',e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  <option value="A1">A1 — Software (sem token)</option>
                  <option value="A3">A3 — Token/Cartão</option>
                  <option value="A4">A4 — Cartão com leitor</option>
                </select>
              </div>
            </div>

            {/* Campos PF */}
            {form.tipo==='PF' && (
              <div style={{ marginBottom:14, padding:'14px 16px', borderRadius:10, background:GOLD+'08', border:`2px solid ${GOLD}40` }}>
                <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:10 }}>👤 Titular Pessoa Física</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>
                      Selecionar Sócio Cadastrado
                      {sociosSel.length===0&&form.cliente_id&&<span style={{ marginLeft:6, fontSize:10, color:'#f59e0b' }}>⚠ sem sócios</span>}
                    </label>
                    <select value={form.responsavel_nome} onChange={e=>onSocioChange(e.target.value)} style={{ ...inp, cursor:'pointer' }} disabled={sociosSel.length===0}>
                      <option value="">— Selecione ou preencha manualmente —</option>
                      {sociosSel.map((s,i)=>(
                        <option key={i} value={s.nome}>{s.nome}{s.cargo?` (${s.cargo})`:''}{s.cpf_cnpj?` — ${s.cpf_cnpj}`:''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Nome Completo *</label>
                    <input value={form.responsavel_nome} onChange={e=>setF('responsavel_nome',e.target.value)} placeholder="Nome completo do titular" style={inp}/>
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>CPF *</label>
                    <input value={form.responsavel_cpf} onChange={e=>setF('responsavel_cpf',e.target.value)} placeholder="000.000.000-00" style={inp}/>
                  </div>
                </div>
              </div>
            )}

            {/* Dados */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Data de Emissão</label>
                <input type="date" value={form.emissao} onChange={e=>setF('emissao',e.target.value)} style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Data de Validade *</label>
                <input type="date" value={form.validade} onChange={e=>setF('validade',e.target.value)} style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Autoridade Certificadora</label>
                <select value={form.autoridade_cert} onChange={e=>setF('autoridade_cert',e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  {['ICP-Brasil','Serasa','Valid','Certisign','Soluti','Safeweb','AC Caixa','Outro'].map(a=><option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div>
                <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Número de Série</label>
                <input value={form.numero_serie} onChange={e=>setF('numero_serie',e.target.value)} placeholder="Preenchido automaticamente" style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Nome do Arquivo</label>
                <input value={form.arquivo_nome} onChange={e=>setF('arquivo_nome',e.target.value)} placeholder="certificado.pfx" style={inp}/>
              </div>
            </div>

            {/* Preview validade */}
            {form.validade && (()=>{ const st=statusCert(form.validade); return (
              <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:9, background:st.bg, border:`1px solid ${st.cor}30`, display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:18 }}>{st.icon}</span>
                <span style={{ fontSize:12, color:st.cor, fontWeight:600 }}>
                  {st.dias===null?'Data inválida':st.dias<0?`Vencido há ${Math.abs(st.dias)} dias`:st.dias===0?'Vence hoje':`Vence em ${st.dias} dias — ${fmtData(form.validade)}`}
                </span>
              </div>
            )})()}

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>Observações</label>
              <textarea value={form.observacoes} onChange={e=>setF('observacoes',e.target.value)} style={{ ...inp, height:60, resize:'vertical', fontFamily:'inherit' }}/>
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', paddingTop:14, borderTop:'1px solid #f0f0f0' }}>
              <button onClick={()=>{setForm(CERT_VAZIO);setEditId(null);setAba('lista')}} style={{ padding:'8px 16px', borderRadius:8, background:'#f5f5f5', color:'#555', fontSize:13, border:'none', cursor:'pointer' }}>Cancelar</button>
              <button onClick={salvar} disabled={!form.cliente_id||!form.validade} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 22px', borderRadius:8, background:form.cliente_id&&form.validade?'#22c55e':'#ccc', color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:form.cliente_id&&form.validade?'pointer':'default' }}>
                <Shield size={14}/> Salvar Certificado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal senha PFX */}
      {modalSenha && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:400 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, maxWidth:400, width:'90%' }}>
            <div style={{ fontWeight:700, color:NAVY, fontSize:14, marginBottom:6 }}>🔐 Senha do Certificado</div>
            <div style={{ fontSize:12, color:'#888', marginBottom:16 }}>
              <b>{modalSenha.name}</b><br/>Informe a senha para ler os dados automaticamente.
            </div>
            {erroLeitura && <div style={{ padding:'8px 12px', borderRadius:7, background:'#FEF2F2', border:'1px solid #fca5a5', fontSize:12, color:'#dc2626', marginBottom:12 }}>{erroLeitura}</div>}
            <input
              type="password" value={senha} onChange={e=>setSenha(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter') processarArquivo(modalSenha, senha) }}
              placeholder="Senha do certificado..." autoFocus
              style={{ ...inp, marginBottom:16, fontSize:14 }}
            />
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>{ setModalSenha(null); setF('arquivo_nome', modalSenha.name); setErroLeitura('') }} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #ddd', background:'#fff', cursor:'pointer', fontSize:13 }}>
                Preencher manualmente
              </button>
              <button onClick={()=>processarArquivo(modalSenha, senha)} disabled={lendo} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 20px', borderRadius:8, background:NAVY, color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
                {lendo?<><Loader size={13}/> Lendo...</>:<><Key size={13}/> Confirmar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Excluir */}
      {modalExc && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, maxWidth:380, width:'90%', textAlign:'center' }}>
            <AlertTriangle size={36} style={{ color:'#dc2626', marginBottom:12 }}/>
            <div style={{ fontSize:15, fontWeight:700, color:NAVY, marginBottom:8 }}>Excluir Certificado?</div>
            <div style={{ fontSize:13, color:'#666', marginBottom:16 }}>{modalExc.cliente_nome}{modalExc.tipo==='PF'&&modalExc.responsavel_nome?` · ${modalExc.responsavel_nome}`:''}</div>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={()=>setModalExc(null)} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid #ddd', background:'#fff', cursor:'pointer', fontSize:13 }}>Cancelar</button>
              <button onClick={()=>excluir(modalExc.id)} style={{ padding:'8px 20px', borderRadius:8, background:'#dc2626', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:13, border:'none' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
