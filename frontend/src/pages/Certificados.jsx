import { useState, useEffect, useRef } from 'react'
import { Search, Shield, RefreshCw, Edit2, Download, Trash2, Eye, EyeOff, Lock, AlertTriangle } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'
const inp = { padding:'7px 10px', borderRadius:6, border:'1px solid #ddd', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', color:'#333' }
const sel = { ...inp, cursor:'pointer', background:'#fff' }

const CERT_EMISSORAS = ['Serasa','Certisign','Soluti','Valid','Safeweb','ICP-Brasil','Outro']
const ORGAOS_PROC = ['e-CAC (Receita Federal)','SEFAZ Estadual','Prefeitura / NFS-e','Portal Simples Nacional','Junta Comercial','INSS / eSocial','FGTS / Caixa','Outro']

function getClientes() { try { return JSON.parse(localStorage.getItem('ep_clientes')||'[]') } catch { return [] } }
function salvarClientes(l) { try { localStorage.setItem('ep_clientes',JSON.stringify(l)) } catch {} }
function diasParaVencer(d) { if(!d) return null; try { return Math.ceil((new Date(d+'T12:00:00')-new Date())/864e5) } catch { return null } }
function statusCert(dias) {
  if(dias===null) return {cor:'#aaa',bg:'#F5F5F5',label:'Sem data',icon:'—'}
  if(dias<0)      return {cor:'#dc2626',bg:'#FEF2F2',label:'Vencido',icon:'⛔'}
  if(dias<=30)    return {cor:'#f59e0b',bg:'#FEF9C3',label:dias+'d',icon:'⚠️'}
  if(dias<=90)    return {cor:'#3b82f6',bg:'#EFF6FF',label:dias+'d',icon:'ℹ️'}
  return {cor:'#22c55e',bg:'#F0FDF4',label:dias+'d',icon:'✅'}
}

async function parseCertificado(file) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const bytes = new Uint8Array(ev.target.result)
        const nome = file.name.toLowerCase()
        let tipo = 'e-CNPJ'
        if(nome.includes('cpf')||nome.includes('ecpf')||nome.includes('e-cpf')) tipo='e-CPF'
        else if(nome.includes('cnpj')||nome.includes('ecnpj')||nome.includes('e-cnpj')) tipo='e-CNPJ'
        const strings=[]
        let cur=''
        for(let i=0;i<Math.min(bytes.length,8000);i++){
          const c=bytes[i]
          if(c>=32&&c<127) cur+=String.fromCharCode(c)
          else { if(cur.length>=4) strings.push(cur); cur='' }
        }
        let cnpj_cpf='', titular='', emissora='', validade=''
        for(const s of strings){
          const m14=s.match(/\d{14}/)
          if(m14&&!cnpj_cpf) cnpj_cpf=m14[0]
          const m11=s.match(/\d{11}/)
          if(m11&&tipo==='e-CPF'&&!cnpj_cpf) cnpj_cpf=m11[0]
          for(const em of CERT_EMISSORAS){ if(s.toLowerCase().includes(em.toLowerCase())&&!emissora) emissora=em }
          const cn=s.match(/CN=([^,/]+)/)
          if(cn&&!titular) titular=cn[1].trim()
          const dt=s.match(/(\d{4})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/)
          if(dt&&!validade){ const a=parseInt(dt[1]); if(a>=2024&&a<=2040) validade=`${dt[1]}-${dt[2]}-${dt[3]}` }
        }
        if(cnpj_cpf.length===14){ cnpj_cpf=cnpj_cpf.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5'); tipo='e-CNPJ' }
        else if(cnpj_cpf.length===11){ cnpj_cpf=cnpj_cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4'); tipo='e-CPF' }
        const clientes=getClientes()
        const limpo=cnpj_cpf.replace(/\D/g,'')
        const cli=clientes.find(c=>{
          if((c.cnpj||'').replace(/\D/g,'')===limpo&&limpo) return true
          return (c.socios||[]).some(s=>(s.cpf||'').replace(/\D/g,'')===limpo&&limpo)
        })||null
        resolve({arquivo:file.name,tipo,cnpj_cpf,titular,emissora:emissora||'',validade,cliente:cli,eh_socio:cli&&limpo.length===11,tamanho:file.size})
      } catch { resolve({arquivo:file.name,tipo:'e-CNPJ',cnpj_cpf:'',titular:'',emissora:'',validade:'',cliente:null}) }
    }
    reader.readAsArrayBuffer(file)
  })
}

function SenhaInput({value,onChange}) {
  const [show,setShow]=useState(false)
  return <div style={{position:'relative'}}><input type={show?'text':'password'} value={value} onChange={onChange} placeholder="••••••••" style={{...inp,paddingRight:36}}/><button type="button" onClick={()=>setShow(s=>!s)} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#aaa'}}>{show?<EyeOff size={14}/>:<Eye size={14}/>}</button></div>
}

export default function Certificados() {
  const [clientes,setClientes]=useState([])
  const [busca,setBusca]=useState('')
  const [filtroStatus,setFiltroStatus]=useState('')
  const [filtroProcuracao,setFiltroProcuracao]=useState(false)
  const [sortBy,setSortBy]=useState('validade')
  const [certEsc,setCertEsc]=useState(()=>{ try{return JSON.parse(localStorage.getItem('ep_cert_escritorio')||'null')||{tipo:'e-CNPJ',cnpj:'22.939.803/0001-49',emissora:'Serasa',arquivo:'',validade:''}}catch{return{tipo:'e-CNPJ',cnpj:'22.939.803/0001-49',emissora:'',arquivo:'',validade:''}} })
  const [editEsc,setEditEsc]=useState(false)
  const [modalDetalhe,setModalDetalhe]=useState(null)
  const [modalEditar,setModalEditar]=useState(null)
  const [modalExcluir,setModalExcluir]=useState(null)
  const [modalImportar,setModalImportar]=useState(null)
  const [analisando,setAnalisando]=useState(false)
  const [lgpdConsent,setLgpdConsent]=useState(()=>!!localStorage.getItem('ep_lgpd_cert_consent'))
  const [showLgpd,setShowLgpd]=useState(false)
  const fileRef=useRef()

  useEffect(()=>{ setClientes(getClientes()) },[])
  const reload=()=>setClientes(getClientes())

  const log=(acao,extra={})=>{ const l=JSON.parse(localStorage.getItem('ep_lgpd_log')||'[]'); l.push({acao,...extra,data:new Date().toISOString(),usuario:JSON.parse(localStorage.getItem('usuario')||'{}').nome||'Sistema'}); localStorage.setItem('ep_lgpd_log',JSON.stringify(l.slice(-200))) }

  const handleArquivoCert=async(file)=>{ if(!lgpdConsent){setShowLgpd(true);return}; setAnalisando(true); const d=await parseCertificado(file); setAnalisando(false); setModalImportar({...d,senha:''}) }

  const confirmarImportacao=()=>{
    if(!modalImportar) return
    if(modalImportar.cliente){
      const lista=getClientes().map(c=>c.id!==modalImportar.cliente.id?c:{...c,credenciais:{...(c.credenciais||{}),cert_arquivo:modalImportar.arquivo,cert_tipo:modalImportar.tipo,cert_titular:modalImportar.titular,cert_cnpj_cpf:modalImportar.cnpj_cpf,cert_emissora:modalImportar.emissora,cert_validade:modalImportar.validade,cert_senha:modalImportar.senha}})
      salvarClientes(lista); setClientes(lista)
    }
    log('importacao_certificado',{arquivo:modalImportar.arquivo,cliente:modalImportar.cliente?.nome})
    setModalImportar(null); reload()
  }

  const excluirCert=(clienteId)=>{
    const lista=getClientes().map(c=>c.id!==clienteId?c:{...c,credenciais:{...(c.credenciais||{}),cert_arquivo:'',cert_tipo:'',cert_titular:'',cert_cnpj_cpf:'',cert_emissora:'',cert_validade:'',cert_senha:''}})
    salvarClientes(lista); log('exclusao_certificado',{cliente_id:clienteId}); setModalExcluir(null); reload()
  }

  const salvarEdicao=()=>{
    if(!modalEditar) return
    const lista=getClientes().map(c=>c.id!==modalEditar.id?c:{...c,credenciais:{...(c.credenciais||{}),cert_arquivo:modalEditar.cert_arquivo,cert_tipo:modalEditar.cert_tipo,cert_titular:modalEditar.cert_titular,cert_cnpj_cpf:modalEditar.cert_cnpj_cpf,cert_emissora:modalEditar.cert_emissora,cert_validade:modalEditar.cert_validade,proc_ativa:modalEditar.proc_ativa,proc_validade:modalEditar.proc_validade,proc_orgaos:modalEditar.proc_orgaos||[],proc_data:modalEditar.proc_data}})
    salvarClientes(lista); log('edicao_certificado',{cliente_id:modalEditar.id}); setModalEditar(null); reload()
  }

  const baixarResumo=(c)=>{
    const cert=c.credenciais||{}
    const dados={aviso_lgpd:'LGPD Lei 13.709/2018 - Uso restrito ao controlador autorizado.',cliente:c.nome,cnpj:c.cnpj,regime:c.tributacao||c.regime,certificado:{tipo:cert.cert_tipo||'—',titular:cert.cert_titular||'—',cpf_cnpj:cert.cert_cnpj_cpf||'—',emissora:cert.cert_emissora||'—',validade:cert.cert_validade?new Date(cert.cert_validade+'T12:00:00').toLocaleDateString('pt-BR'):'—',status:statusCert(diasParaVencer(cert.cert_validade)).label},procuracao:cert.proc_ativa?{ativa:true,data:cert.proc_data||'—',validade:cert.proc_validade?new Date(cert.proc_validade+'T12:00:00').toLocaleDateString('pt-BR'):'—',orgaos:cert.proc_orgaos||[]}:{ativa:false},gerado_em:new Date().toLocaleString('pt-BR')}
    const blob=new Blob([JSON.stringify(dados,null,2)],{type:'application/json'})
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`cert_${c.cnpj?.replace(/\D/g,'')}.json`; a.click(); URL.revokeObjectURL(url)
    log('download_resumo',{cliente:c.nome})
  }

  const certClientes=clientes.filter(c=>c.credenciais||c.obrigacoes_vinculadas?.length).map(c=>({c,cert:c.credenciais||{},diasCert:diasParaVencer(c.credenciais?.cert_validade),diasProc:diasParaVencer(c.credenciais?.proc_validade),temProc:!!c.credenciais?.proc_ativa})).filter(x=>{
    if(busca&&!(x.c.nome||'').toLowerCase().includes(busca.toLowerCase())&&!(x.c.cnpj||'').includes(busca)) return false
    if(filtroProcuracao&&!x.temProc) return false
    if(filtroStatus==='vencido'&&!(x.diasCert!==null&&x.diasCert<0)) return false
    if(filtroStatus==='alerta'&&!(x.diasCert!==null&&x.diasCert>=0&&x.diasCert<=30)) return false
    if(filtroStatus==='ok'&&!(x.diasCert!==null&&x.diasCert>30)) return false
    if(filtroStatus==='sem'&&x.diasCert!==null) return false
    return true
  }).sort((a,b)=>{ if(sortBy==='validade'){if(a.diasCert===null)return 1;if(b.diasCert===null)return -1;return a.diasCert-b.diasCert}; return(a.c.nome||'').localeCompare(b.c.nome||'') })

  const tots={total:certClientes.length,vencidos:certClientes.filter(x=>x.diasCert!==null&&x.diasCert<0).length,alertas:certClientes.filter(x=>x.diasCert!==null&&x.diasCert>=0&&x.diasCert<=30).length,sem:certClientes.filter(x=>x.diasCert===null).length,proc:certClientes.filter(x=>x.temProc).length}
  const diasEsc=diasParaVencer(certEsc.validade); const stEsc=statusCert(diasEsc)

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 44px)',fontFamily:'Inter, system-ui, sans-serif',background:'#F8F9FA',overflow:'hidden'}}>
      <div style={{background:NAVY,padding:'12px 22px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}><Shield size={20} style={{color:GOLD}}/><span style={{color:'#fff',fontWeight:700,fontSize:16}}>Certificados</span><span style={{color:GOLD,fontWeight:700,fontSize:16}}> Digitais</span></div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <button onClick={()=>setShowLgpd(true)} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:7,background:'rgba(255,255,255,.08)',color:'#ccc',border:'1px solid rgba(255,255,255,.15)',cursor:'pointer',fontSize:12}}><Lock size={12}/> LGPD</button>
          <button onClick={()=>{if(!lgpdConsent){setShowLgpd(true);return};fileRef.current?.click()}} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:7,background:GOLD,color:NAVY,fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}>📥 Importar Certificado</button>
          <input ref={fileRef} type="file" accept=".pfx,.p12" style={{display:'none'}} onChange={e=>{if(e.target.files[0])handleArquivoCert(e.target.files[0])}}/>
        </div>
      </div>

      <div style={{flex:1,overflow:'auto',padding:20}}>
        {!lgpdConsent&&<div style={{marginBottom:16,padding:'14px 18px',borderRadius:10,background:'#FFF3E0',border:'2px solid #FF9800',display:'flex',gap:12,alignItems:'flex-start'}}><Lock size={20} style={{color:'#E65100',flexShrink:0,marginTop:2}}/><div style={{flex:1}}><div style={{fontWeight:700,color:'#E65100',fontSize:13,marginBottom:4}}>⚖️ LGPD (Lei 13.709/2018)</div><div style={{fontSize:12,color:'#555',lineHeight:1.6}}>Este módulo armazena <b>dados pessoais sensíveis</b>. Uso autorizado como <b>obrigação legal</b> contábil/fiscal. Dados armazenados <b>localmente no navegador</b> e acessíveis apenas ao contador autorizado.</div></div><button onClick={()=>{localStorage.setItem('ep_lgpd_cert_consent',new Date().toISOString());setLgpdConsent(true)}} style={{padding:'8px 18px',borderRadius:8,background:'#E65100',color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',flexShrink:0}}>✅ Confirmar</button></div>}

        {/* Certificado do Escritório */}
        <div style={{marginBottom:20,background:'#fff',borderRadius:12,border:`2px solid ${GOLD}40`,overflow:'hidden'}}>
          <div style={{padding:'12px 18px',background:NAVY,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:18}}>🏢</span><div><div style={{color:'#fff',fontWeight:700,fontSize:13}}>Certificado do Escritório (EPimentel)</div><div style={{color:GOLD,fontSize:11}}>Usado para acesso via procuração dos clientes</div></div></div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {certEsc.validade&&<span style={{fontSize:12,padding:'2px 10px',borderRadius:8,background:stEsc.bg,color:stEsc.cor,fontWeight:700}}>{stEsc.icon} {stEsc.label}</span>}
              <button onClick={()=>setEditEsc(e=>!e)} style={{padding:'5px 12px',borderRadius:7,background:'rgba(255,255,255,.1)',color:'#fff',border:'1px solid rgba(255,255,255,.2)',cursor:'pointer',fontSize:12}}>{editEsc?'× Fechar':'✏️ Editar'}</button>
            </div>
          </div>
          {!editEsc?(
            <div style={{padding:'12px 18px',display:'flex',gap:24,flexWrap:'wrap',alignItems:'center'}}>
              {[['Tipo',certEsc.tipo||'e-CNPJ'],['CNPJ',certEsc.cnpj],['Emissora',certEsc.emissora||'—'],['Arquivo',certEsc.arquivo||'—'],['Validade',certEsc.validade?new Date(certEsc.validade+'T12:00:00').toLocaleDateString('pt-BR'):'Não informado']].map(([k,v])=>(
                <div key={k}><div style={{fontSize:10,color:'#aaa',fontWeight:600,textTransform:'uppercase'}}>{k}</div><div style={{fontWeight:600,color:NAVY,fontSize:13}}>{v}</div></div>
              ))}
            </div>
          ):(
            <div style={{padding:'14px 18px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',gap:12,marginBottom:12}}>
                {[['Tipo','tipo','select',['e-CNPJ','e-CPF']],['CNPJ','cnpj','text'],['Emissora','emissora','select',CERT_EMISSORAS],['Arquivo .pfx','arquivo','file'],['Validade','validade','date']].map(([l,k,t,opts])=>(
                  <div key={k}><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>{l}</label>
                  {t==='select'?<select value={certEsc[k]||''} onChange={e=>setCertEsc(c=>({...c,[k]:e.target.value}))} style={sel}>{(opts||[]).map(o=><option key={o}>{o}</option>)}</select>
                  :t==='file'?<div style={{display:'flex',gap:6}}><input type="text" value={certEsc[k]||''} readOnly style={{...inp,flex:1,background:'#f9f9f9',cursor:'default'}}/><label style={{padding:'7px 10px',borderRadius:6,background:'#555',color:'#fff',fontSize:12,cursor:'pointer'}}>Browse<input type="file" accept=".pfx,.p12" style={{display:'none'}} onChange={async e=>{if(e.target.files[0]){const d=await parseCertificado(e.target.files[0]);setCertEsc(c=>({...c,arquivo:d.arquivo,emissora:d.emissora||c.emissora,validade:d.validade||c.validade}))}}}/></label></div>
                  :<input type={t} value={certEsc[k]||''} onChange={e=>setCertEsc(c=>({...c,[k]:e.target.value}))} style={inp}/>}
                  </div>
                ))}
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                <button onClick={()=>setEditEsc(false)} style={{padding:'7px 14px',borderRadius:7,background:'#f5f5f5',color:'#555',border:'none',cursor:'pointer',fontSize:12}}>Cancelar</button>
                <button onClick={()=>{localStorage.setItem('ep_cert_escritorio',JSON.stringify(certEsc));setEditEsc(false)}} style={{padding:'7px 16px',borderRadius:7,background:NAVY,color:'#fff',fontWeight:700,border:'none',cursor:'pointer',fontSize:12}}>💾 Salvar</button>
              </div>
            </div>
          )}
        </div>

        {/* Cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
          {[['Total',tots.total,NAVY,'#EBF5FF','📋'],['Vencidos',tots.vencidos,'#dc2626','#FEF2F2','⛔'],['Alerta 30d',tots.alertas,'#f59e0b','#FEF9C3','⚠️'],['Sem Cert.',tots.sem,'#888','#F5F5F5','—'],['Procuração',tots.proc,'#22c55e','#F0FDF4','📜']].map(([l,v,cor,bg,icon])=>(
            <div key={l} style={{background:bg,borderRadius:12,padding:'14px 16px',border:`1px solid ${cor}20`}}><div style={{fontSize:26,marginBottom:4}}>{icon}</div><div style={{fontSize:24,fontWeight:800,color:cor}}>{v}</div><div style={{fontSize:11,color:'#666'}}>{l}</div></div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{background:'#fff',borderRadius:10,padding:'10px 16px',marginBottom:16,display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',border:'1px solid #eee'}}>
          <div style={{position:'relative',flex:1,minWidth:200}}><Search size={12} style={{position:'absolute',left:8,top:8,color:'#bbb'}}/><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar cliente ou CNPJ..." style={{...inp,paddingLeft:26}}/></div>
          <div style={{display:'flex',gap:5}}>
            {[[''  ,'Todos'],['vencido','⛔ Vencidos'],['alerta','⚠️ 30d'],['ok','✅ OK'],['sem','— Sem']].map(([v,l])=>(
              <button key={v} onClick={()=>setFiltroStatus(v)} style={{padding:'5px 10px',borderRadius:20,fontSize:11,cursor:'pointer',border:`1px solid ${filtroStatus===v?NAVY:'#ddd'}`,background:filtroStatus===v?NAVY:'#fff',color:filtroStatus===v?'#fff':'#666',fontWeight:filtroStatus===v?700:400}}>{l}</button>
            ))}
          </div>
          <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12}}><input type="checkbox" checked={filtroProcuracao} onChange={e=>setFiltroProcuracao(e.target.checked)} style={{accentColor:NAVY,width:14,height:14}}/> 📜 Procuração</label>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...sel,width:160,fontSize:12}}><option value="validade">Ordenar: Vencimento</option><option value="nome">Ordenar: Nome</option></select>
          <button onClick={reload} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:7,background:'#f5f5f5',color:'#555',border:'1px solid #ddd',cursor:'pointer',fontSize:12}}><RefreshCw size={12}/> Atualizar</button>
          <span style={{fontSize:11,color:'#aaa'}}>{certClientes.length} clientes</span>
        </div>

        {/* Tabela */}
        <div style={{background:'#fff',borderRadius:10,border:'1px solid #eee',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{background:NAVY}}>{['Cliente','CNPJ','Regime','Tipo','Titular / CPF-CNPJ','Emissora','Validade','Procuração','Ações'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',color:'#fff',fontSize:11,fontWeight:700,whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
            <tbody>
              {certClientes.length===0&&<tr><td colSpan={9} style={{padding:40,textAlign:'center',color:'#ccc'}}>Nenhum cliente. Use <b>📥 Importar Certificado</b> ou preencha as credenciais em <b>Clientes → Credenciais</b>.</td></tr>}
              {certClientes.map(({c,cert,diasCert,diasProc,temProc},i)=>{
                const stC=statusCert(diasCert); const stP=statusCert(diasProc)
                return <tr key={c.id} style={{background:i%2===0?'#fff':'#FAFAFA',borderBottom:'1px solid #f0f0f0'}}>
                  <td style={{padding:'9px 12px'}}><div style={{fontWeight:600,color:NAVY}}>{c.nome}</div>{c.nome_fantasia&&<div style={{fontSize:10,color:'#aaa'}}>{c.nome_fantasia}</div>}</td>
                  <td style={{padding:'9px 12px',fontFamily:'monospace',fontSize:11,color:'#555'}}>{c.cnpj}</td>
                  <td style={{padding:'9px 12px'}}><span style={{fontSize:10,padding:'2px 7px',borderRadius:6,background:'#EBF5FF',color:'#1D6FA4',fontWeight:600}}>{c.tributacao||c.regime||'—'}</span></td>
                  <td style={{padding:'9px 12px'}}>{cert.cert_tipo?<span style={{padding:'2px 8px',borderRadius:6,background:cert.cert_tipo==='e-CNPJ'?'#EBF5FF':'#F3EEFF',color:cert.cert_tipo==='e-CNPJ'?'#1D6FA4':'#6B3EC9',fontWeight:700,fontSize:11}}>{cert.cert_tipo==='e-CPF'?'👤':'🏢'} {cert.cert_tipo}</span>:<span style={{color:'#ccc'}}>—</span>}</td>
                  <td style={{padding:'9px 12px',maxWidth:160}}><div style={{fontWeight:600,color:NAVY,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:12}}>{cert.cert_titular||'—'}</div>{cert.cert_cnpj_cpf&&<div style={{fontSize:10,color:'#888',fontFamily:'monospace'}}>{cert.cert_cnpj_cpf}</div>}</td>
                  <td style={{padding:'9px 12px',fontSize:11,color:'#555'}}>{cert.cert_emissora||'—'}</td>
                  <td style={{padding:'9px 12px'}}>{cert.cert_validade?<div><span style={{fontSize:11,padding:'2px 8px',borderRadius:8,background:stC.bg,color:stC.cor,fontWeight:700}}>{stC.icon} {stC.label}</span><div style={{fontSize:10,color:'#aaa',marginTop:2}}>{new Date(cert.cert_validade+'T12:00:00').toLocaleDateString('pt-BR')}</div></div>:<span style={{color:'#ccc',fontSize:11}}>Não informado</span>}</td>
                  <td style={{padding:'9px 12px'}}>{temProc?<div><span style={{fontSize:11,padding:'2px 7px',borderRadius:8,background:stP.bg,color:stP.cor,fontWeight:700}}>📜 {stP.icon} {stP.label}</span>{(cert.proc_orgaos||[]).length>0&&<div style={{display:'flex',gap:3,marginTop:2,flexWrap:'wrap'}}>{cert.proc_orgaos.slice(0,2).map(o=><span key={o} style={{fontSize:9,padding:'1px 5px',borderRadius:5,background:'#E8F5E9',color:'#2E7D32'}}>{o.split('(')[0].trim()}</span>)}{cert.proc_orgaos.length>2&&<span style={{fontSize:9,color:'#aaa'}}>+{cert.proc_orgaos.length-2}</span>}</div>}</div>:<span style={{color:'#ccc',fontSize:11}}>—</span>}</td>
                  <td style={{padding:'9px 12px'}}><div style={{display:'flex',gap:5}}>
                    <button onClick={()=>setModalDetalhe(c)} title="Ver" style={{padding:'4px 8px',borderRadius:6,background:'#EBF5FF',color:'#1D6FA4',border:'none',cursor:'pointer'}}><Eye size={12}/></button>
                    <button onClick={()=>setModalEditar({id:c.id,nome:c.nome,...cert})} title="Editar" style={{padding:'4px 8px',borderRadius:6,background:'#F0F4FF',color:NAVY,border:'none',cursor:'pointer'}}><Edit2 size={12}/></button>
                    <button onClick={()=>baixarResumo(c)} title="Baixar (LGPD)" style={{padding:'4px 8px',borderRadius:6,background:'#EDFBF1',color:'#1A7A3C',border:'none',cursor:'pointer'}}><Download size={12}/></button>
                    <button onClick={()=>setModalExcluir(c)} title="Excluir" style={{padding:'4px 8px',borderRadius:6,background:'#FEF2F2',color:'#dc2626',border:'none',cursor:'pointer'}}><Trash2 size={12}/></button>
                  </div></td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Analisando */}
      {analisando&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:400}}><div style={{background:'#fff',borderRadius:14,padding:36,textAlign:'center'}}><div style={{fontSize:48,marginBottom:12}}>🔍</div><div style={{fontWeight:700,color:NAVY,fontSize:15}}>Analisando certificado...</div><div style={{fontSize:12,color:'#888',marginTop:6}}>Extraindo dados e cruzando com clientes cadastrados</div></div></div>}

      {/* Modal Importar */}
      {modalImportar&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
        <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:620,maxHeight:'90vh',overflow:'auto',boxShadow:'0 8px 40px rgba(0,0,0,.2)'}}>
          <div style={{padding:'14px 22px',borderBottom:'1px solid #eee',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontWeight:700,color:NAVY,fontSize:15}}>📥 Importar Certificado</div><button onClick={()=>setModalImportar(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:'#999'}}>×</button></div>
          <div style={{padding:22}}>
            <div style={{marginBottom:14,padding:'12px 14px',borderRadius:9,background:'#F0FDF4',border:'1px solid #bbf7d0'}}>
              <div style={{fontWeight:700,color:'#166534',fontSize:12,marginBottom:8}}>🤖 Dados detectados — confirme ou corrija:</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',fontSize:12,color:'#555'}}>
                <span>📄 <b>{modalImportar.arquivo}</b></span>
                {modalImportar.tamanho&&<span>({(modalImportar.tamanho/1024).toFixed(1)} KB)</span>}
                {modalImportar.cliente&&<span style={{color:'#22c55e',fontWeight:700}}>✅ Cliente: {modalImportar.cliente.nome}</span>}
                {!modalImportar.cliente&&<span style={{color:'#f59e0b',fontWeight:700}}>⚠️ Selecione o cliente abaixo</span>}
                {modalImportar.eh_socio&&<span style={{color:'#6B3EC9',fontWeight:700}}>👤 e-CPF de sócio/PF</span>}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Tipo</label><div style={{display:'flex',gap:6}}>{['e-CNPJ','e-CPF'].map(t=><button key={t} onClick={()=>setModalImportar(m=>({...m,tipo:t}))} style={{flex:1,padding:'7px 0',borderRadius:7,cursor:'pointer',border:`2px solid ${modalImportar.tipo===t?NAVY:'#ddd'}`,background:modalImportar.tipo===t?NAVY+'15':'#fff',color:modalImportar.tipo===t?NAVY:'#888',fontWeight:modalImportar.tipo===t?700:400,fontSize:12}}>{t==='e-CPF'?'👤 ':'🏢 '}{t}</button>)}</div></div>
              <div><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>CPF/CNPJ</label><input value={modalImportar.cnpj_cpf||''} onChange={e=>setModalImportar(m=>({...m,cnpj_cpf:e.target.value}))} placeholder="Detectado auto..." style={inp}/></div>
              <div><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Titular</label><input value={modalImportar.titular||''} onChange={e=>setModalImportar(m=>({...m,titular:e.target.value}))} style={inp}/></div>
              <div><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Emissora</label><select value={modalImportar.emissora||''} onChange={e=>setModalImportar(m=>({...m,emissora:e.target.value}))} style={sel}><option value="">Selecione...</option>{CERT_EMISSORAS.map(e=><option key={e}>{e}</option>)}</select></div>
              <div><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Validade</label><input type="date" value={modalImportar.validade||''} onChange={e=>setModalImportar(m=>({...m,validade:e.target.value}))} style={inp}/></div>
              <div><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Senha</label><SenhaInput value={modalImportar.senha||''} onChange={e=>setModalImportar(m=>({...m,senha:e.target.value}))}/></div>
            </div>
            <div style={{marginBottom:14}}><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Vincular ao Cliente *</label><select value={modalImportar.cliente?.id||''} onChange={e=>{const cli=clientes.find(c=>String(c.id)===e.target.value);setModalImportar(m=>({...m,cliente:cli||null}))}} style={sel}><option value="">Selecione...</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome} — {c.cnpj}</option>)}</select></div>
            <div style={{marginBottom:16,padding:'10px 14px',borderRadius:8,background:'#FFF3E0',border:'1px solid #FFB74D',fontSize:11,color:'#E65100'}}><Lock size={11} style={{marginRight:5}}/> <b>LGPD:</b> Dados armazenados com base no Art. 7º, II (obrigação legal). Finalidade: obrigações tributárias.</div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setModalImportar(null)} style={{padding:'8px 16px',borderRadius:8,background:'#f5f5f5',color:'#555',border:'none',cursor:'pointer',fontSize:13}}>Cancelar</button>
              <button onClick={confirmarImportacao} disabled={!modalImportar.cliente} style={{padding:'8px 20px',borderRadius:8,background:modalImportar.cliente?NAVY:'#ccc',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:modalImportar.cliente?'pointer':'default'}}>✅ Confirmar</button>
            </div>
          </div>
        </div>
      </div>}

      {/* Modal Editar */}
      {modalEditar&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
        <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:580,maxHeight:'90vh',overflow:'auto',boxShadow:'0 8px 40px rgba(0,0,0,.2)'}}>
          <div style={{padding:'14px 22px',borderBottom:'1px solid #eee',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontWeight:700,color:NAVY,fontSize:15}}>✏️ Editar — {modalEditar.nome}</div><button onClick={()=>setModalEditar(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:'#999'}}>×</button></div>
          <div style={{padding:22}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
              {[['Tipo','cert_tipo','select',['e-CNPJ','e-CPF']],['Titular','cert_titular','text'],['CPF/CNPJ','cert_cnpj_cpf','text'],['Emissora','cert_emissora','select',CERT_EMISSORAS],['Validade','cert_validade','date'],['Arquivo','cert_arquivo','text']].map(([l,k,t,opts])=>(
                <div key={k}><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>{l}</label>
                {t==='select'?<select value={modalEditar[k]||''} onChange={e=>setModalEditar(m=>({...m,[k]:e.target.value}))} style={sel}><option value="">—</option>{(opts||[]).map(o=><option key={o}>{o}</option>)}</select>
                :<input type={t} value={modalEditar[k]||''} onChange={e=>setModalEditar(m=>({...m,[k]:e.target.value}))} style={inp}/>}
                </div>
              ))}
            </div>
            <div style={{marginBottom:14,padding:'12px 14px',borderRadius:9,border:'1px solid #e8e8e8',background:'#f9f9f9'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',marginBottom:10}} onClick={()=>setModalEditar(m=>({...m,proc_ativa:!m.proc_ativa}))}>
                <div style={{position:'relative',width:36,height:20,flexShrink:0}}><div style={{position:'absolute',inset:0,borderRadius:20,background:modalEditar.proc_ativa?'#22c55e':'#ccc',cursor:'pointer'}}><div style={{position:'absolute',top:2,left:modalEditar.proc_ativa?16:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left .2s'}}/></div></div>
                <span style={{fontSize:13,fontWeight:700,color:modalEditar.proc_ativa?'#22c55e':'#888'}}>📜 Acesso via Procuração</span>
              </div>
              {modalEditar.proc_ativa&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:3}}>Data Proc.</label><input type="date" value={modalEditar.proc_data||''} onChange={e=>setModalEditar(m=>({...m,proc_data:e.target.value}))} style={inp}/></div>
                <div><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:3}}>Validade Proc.</label><input type="date" value={modalEditar.proc_validade||''} onChange={e=>setModalEditar(m=>({...m,proc_validade:e.target.value}))} style={inp}/></div>
                <div style={{gridColumn:'span 2'}}><label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:6}}>Órgãos autorizados</label><div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{ORGAOS_PROC.map(o=>{const s2=(modalEditar.proc_orgaos||[]).includes(o);return<button key={o} onClick={()=>{const l2=modalEditar.proc_orgaos||[];setModalEditar(m=>({...m,proc_orgaos:s2?l2.filter(x=>x!==o):[...l2,o]}))}} style={{padding:'4px 10px',borderRadius:20,fontSize:11,cursor:'pointer',border:`1px solid ${s2?NAVY:'#ddd'}`,background:s2?NAVY:'#fff',color:s2?'#fff':'#666',fontWeight:s2?700:400}}>{s2?'✓ ':''}{o}</button>})}</div></div>
              </div>}
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}><button onClick={()=>setModalEditar(null)} style={{padding:'8px 16px',borderRadius:8,background:'#f5f5f5',color:'#555',border:'none',cursor:'pointer',fontSize:13}}>Cancelar</button><button onClick={salvarEdicao} style={{padding:'8px 20px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer'}}>💾 Salvar</button></div>
          </div>
        </div>
      </div>}

      {/* Modal Excluir */}
      {modalExcluir&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
        <div style={{background:'#fff',borderRadius:14,padding:28,maxWidth:420,width:'90%',textAlign:'center'}}>
          <Trash2 size={40} style={{color:'#dc2626',marginBottom:12}}/>
          <div style={{fontSize:15,fontWeight:700,color:NAVY,marginBottom:8}}>Excluir dados do certificado</div>
          <div style={{fontSize:13,color:'#666',marginBottom:12}}>"{modalExcluir.nome}"</div>
          <div style={{padding:'10px 14px',borderRadius:8,background:'#FFF3E0',border:'1px solid #FFB74D',fontSize:12,color:'#E65100',marginBottom:16,textAlign:'left'}}><Lock size={12} style={{marginRight:4}}/> <b>LGPD:</b> A exclusão será registrada no log de auditoria (Art. 18, IV da Lei 13.709/2018).</div>
          <div style={{display:'flex',gap:10,justifyContent:'center'}}><button onClick={()=>setModalExcluir(null)} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:13}}>Cancelar</button><button onClick={()=>excluirCert(modalExcluir.id)} style={{padding:'9px 22px',borderRadius:8,background:'#dc2626',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13,border:'none'}}>Excluir</button></div>
        </div>
      </div>}

      {/* Modal LGPD */}
      {showLgpd&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:400}}>
        <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:560,maxHeight:'90vh',overflow:'auto',boxShadow:'0 8px 40px rgba(0,0,0,.2)'}}>
          <div style={{padding:'14px 22px',borderBottom:'1px solid #eee',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#FFF3E0'}}><div style={{fontWeight:700,color:'#E65100',fontSize:15}}>⚖️ LGPD — Lei 13.709/2018</div><button onClick={()=>setShowLgpd(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:'#999'}}>×</button></div>
          <div style={{padding:22}}>
            {[['Base Legal','Art. 7º, II — Cumprimento de obrigação legal tributária/contábil.'],['Finalidade','Gestão de acessos a sistemas governamentais para obrigações acessórias.'],['Dados Tratados','Certificados digitais (e-CNPJ/e-CPF), credenciais de acesso, procurações.'],['Armazenamento','localStorage do navegador do controlador. Não transmitido a terceiros.'],['Controlador','EPimentel Auditoria & Contabilidade Ltda — CNPJ 22.939.803/0001-49'],['Direitos do Titular','Acesso, correção, portabilidade, eliminação (Art. 18 LGPD).'],['Retenção','5 anos (prazo prescricional fiscal). Exclusão disponível pelo controlador.'],['Auditoria','Todas as operações registradas em log (ep_lgpd_log) — accountability.']].map(([t,v])=>(
              <div key={t} style={{marginBottom:10,padding:'10px 14px',borderRadius:8,background:'#F8F9FA',border:'1px solid #E0E0E0'}}><div style={{fontWeight:700,color:NAVY,fontSize:12,marginBottom:3}}>{t}</div><div style={{fontSize:12,color:'#555'}}>{v}</div></div>
            ))}
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
              <button onClick={()=>setShowLgpd(false)} style={{padding:'8px 16px',borderRadius:8,background:'#f5f5f5',color:'#555',border:'none',cursor:'pointer',fontSize:13}}>Fechar</button>
              {!lgpdConsent&&<button onClick={()=>{localStorage.setItem('ep_lgpd_cert_consent',new Date().toISOString());setLgpdConsent(true);setShowLgpd(false)}} style={{padding:'8px 20px',borderRadius:8,background:'#E65100',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer'}}>✅ Confirmar como Controlador de Dados</button>}
            </div>
          </div>
        </div>
      </div>}
    </div>
  )
}
