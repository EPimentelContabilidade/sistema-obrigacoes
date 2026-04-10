import { useState, useEffect, useRef } from 'react'
import { Upload, FileText, Image, Trash2, Eye, Download, FolderOpen, X, ZoomIn, ZoomOut } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'

const CATEGORIAS = [
  { id: 'cnpj',      label: '🏢 Cartão CNPJ' },
  { id: 'contrato',  label: '📄 Contrato Social / Estatuto' },
  { id: 'alteracao', label: '✏️ Alteração Contratual' },
  { id: 'certificado', label: '🔐 Certificado Digital' },
  { id: 'alvara',    label: '🏪 Alvará de Funcionamento' },
  { id: 'inscricao', label: '📋 Inscrição Municipal/Estadual' },
  { id: 'procuracao',label: '📝 Procuração' },
  { id: 'outros',    label: '📎 Outros' },
]

function formatBytes(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(2)+' MB'}
function formatData(iso){if(!iso)return '';return new Date(iso).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}

function PreviewModal({doc,onClose}){
  const[zoom,setZoom]=useState(1)
  if(!doc)return null
  const isImg=/\.(png|jpe?g|gif|webp|svg)$/i.test(doc.nome_arquivo)
  const isPdf=/\.pdf$/i.test(doc.nome_arquivo)
  return(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:9999,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}} onClick={onClose}><div style={{background:'#fff',borderRadius:12,overflow:'hidden',width:'90vw',maxWidth:900,maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,.4)'}} onClick={e=>e.stopPropagation()}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:NAVY,color:'#fff'}}><div style={{display:'flex',alignItems:'center',gap:8}}><FileText size={16}/><span style={{fontWeight:600,fontSize:13}}>{doc.nome_original||doc.nome_arquivo}</span><span style={{fontSize:11,opacity:.6}}>({formatBytes(doc.tamanho||0)})</span></div><div style={{display:'flex',gap:8,alignItems:'center'}}>{(isImg||isPdf)&&<><button onClick={()=>setZoom(z=>Math.max(.3,z-.2))} style={{background:'rgba(255,255,255,.2)',border:'none',borderRadius:6,padding:'4px 8px',cursor:'pointer',color:'#fff'}}><ZoomOut size={14}/></button><span style={{fontSize:12,minWidth:40,textAlign:'center'}}>{Math.round(zoom*100)}%</span><button onClick={()=>setZoom(z=>Math.min(3,z+.2))} style={{background:'rgba(255,255,255,.2)',border:'none',borderRadius:6,padding:'4px 8px',cursor:'pointer',color:'#fff'}}><ZoomIn size={14}/></button></>}<a href={doc.url} download={doc.nome_original||doc.nome_arquivo} style={{background:GOLD,border:'none',borderRadius:6,padding:'5px 10px',cursor:'pointer',color:NAVY,fontWeight:600,fontSize:12,textDecoration:'none',display:'flex',alignItems:'center',gap:4}}><Download size={13}/> Baixar</a><button onClick={onClose} style={{background:'rgba(255,255,255,.2)',border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer',color:'#fff'}}><X size={15}/></button></div></div><div style={{flex:1,overflow:'auto',padding:16,display:'flex',justifyContent:'center',background:'#f1f5f9'}}>{isImg?(<img src={doc.url} alt={doc.nome_original} style={{maxWidth:'100%',transform:`scale(${zoom})`,transformOrigin:'top center',transition:'transform .2s'}}/>):isPdf?(<iframe src={doc.url+'#toolbar=0'} style={{width:'100%',height:'70vh',transform:`scale(${zoom})`,transformOrigin:'top center',border:'none',borderRadius:8,background:'#fff'}} title={doc.nome_original}/>):(<div style={{textAlign:'center',padding:40,color:'#888'}}><FileText size={48} style={{marginBottom:12,opacity:.4}}/><p>Pré-visualização não disponível.</p><a href={doc.url} download style={{color:NAVY,fontWeight:600}}>Clique aqui para baixar</a></div>)}</div></div></div>)
}
export default function AbaDocumentos({clienteId,clienteNome,API}){
  const[docs,setDocs]=useState([])
  const[carregando,setCarregando]=useState(false)
  const[enviando,setEnviando]=useState(false)
  const[preview,setPreview]=useState(null)
  const[catFiltro,setCatFiltro]=useState('todos')
  const[novoDoc,setNovoDoc]=useState({categoria:'outros',descricao:''})
  const[dragOver,setDragOver]=useState(false)
  const fileRef=useRef()
  const base=API||(import.meta.env.VITE_API_URL||'')

  useEffect(()=>{if(!clienteId)return;carregarDocs()},[clienteId])

  const carregarDocs=async()=>{
    setCarregando(true)
    try{const r=await fetch(`${base}/clientes/${clienteId}/docs`);if(r.ok)setDocs(await r.json())}catch(e){console.error(e)}
    finally{setCarregando(false)}
  }

  const uploadArquivo=async(arquivo)=>{
    if(!arquivo||!clienteId)return
    if(arquivo.size>20*1024*1024){alert('Arquivo muito grande. Máximo: 20 MB');return}
    setEnviando(true)
    try{
      const fd=new FormData();fd.append('arquivo',arquivo);fd.append('categoria',novoDoc.categoria);fd.append('descricao',novoDoc.descricao)
      const r=await fetch(`${base}/clientes/${clienteId}/docs`,{method:'POST',body:fd})
      if(!r.ok)throw new Error('Falha no upload')
      const doc=await r.json();setDocs(prev=>[doc,...prev]);setNovoDoc({categoria:'outros',descricao:''})
    }catch(e){alert('Erro ao enviar arquivo: '+e.message)}
    finally{setEnviando(false)}
  }

  const handleFileInput=e=>{Array.from(e.target.files||[]).forEach(f=>uploadArquivo(f));e.target.value=''}
  const handleDrop=e=>{e.preventDefault();setDragOver(false);Array.from(e.dataTransfer.files||[]).forEach(f=>uploadArquivo(f))}

  const excluirDoc=async(doc)=>{
    if(!window.confirm(`Excluir "${doc.nome_original||doc.nome_arquivo}"?`))return
    try{await fetch(`${base}/clientes/${clienteId}/docs/${doc.id}`,{method:'DELETE'});setDocs(prev=>prev.filter(d=>d.id!==doc.id))}catch(e){alert('Erro ao excluir: '+e.message)}
  }

  const docsFiltrados=catFiltro==='todos'?docs:docs.filter(d=>d.categoria===catFiltro)
  const contagemPorCat=docs.reduce((acc,d)=>{acc[d.categoria]=(acc[d.categoria]||0)+1;return acc},{})
  const iconePorTipo=nome=>{const ext=(nome||'').split('.').pop().toLowerCase();if(['pdf'].includes(ext))return '📕';if(['png','jpg','jpeg','gif','webp'].includes(ext))return '🖼️';if(['docx','doc'].includes(ext))return '📝';if(['xlsx','xls'].includes(ext))return '📊';if(['pfx','p12','cer'].includes(ext))return '🔐';return '📎'}
  const catLabel=id=>CATEGORIAS.find(c=>c.id===id)?.label||id
  const inp={padding:'8px 10px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:12,outline:'none',background:'#fff',width:'100%',boxSizing:'border-box'}

  return(
    <div>
      {preview&&<PreviewModal doc={preview} onClose={()=>setPreview(null)}/>}
      <div onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop} style={{border:`2px dashed ${dragOver?GOLD:'#cbd5e1'}`,borderRadius:12,padding:'24px 16px',background:dragOver?'#fffbeb':'#f8fafc',textAlign:'center',cursor:'pointer',transition:'all .2s',marginBottom:16}} onClick={()=>fileRef.current?.click()}>
        <input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.pfx,.p12,.cer,.crt,.pem" style={{display:'none'}} onChange={handleFileInput}/>
        {enviando?(<div style={{color:NAVY}}><div style={{fontSize:13,fontWeight:600}}>Enviando…</div></div>):(<><Upload size={28} color={GOLD} style={{marginBottom:8}}/><div style={{fontWeight:600,color:NAVY,fontSize:13}}>Arraste arquivos ou clique para selecionar</div><div style={{fontSize:11,color:'#888',marginTop:4}}>PDF, PNG, JPG, DOCX, XLSX, PFX, P12, CER — máx 20 MB</div></>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:10,marginBottom:16}}>
        <div><label style={{fontSize:11,fontWeight:600,color:'#555',display:'block',marginBottom:4}}>Categoria</label><select value={novoDoc.categoria} onChange={e=>setNovoDoc(p=>({...p,categoria:e.target.value}))} style={inp}>{CATEGORIAS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
        <div><label style={{fontSize:11,fontWeight:600,color:'#555',display:'block',marginBottom:4}}>Descrição (opcional)</label><input value={novoDoc.descricao} onChange={e=>setNovoDoc(p=>({...p,descricao:e.target.value}))} placeholder="Ex: Contrato Social — Abertura 2019" style={inp}/></div>
      </div>
      {docs.length>0&&(<div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>{[{id:'todos',label:'📁 Todos'},...CATEGORIAS].map(c=>{const cnt=c.id==='todos'?docs.length:(contagemPorCat[c.id]||0);if(c.id!=='todos'&&cnt===0)return null;return(<button key={c.id} onClick={()=>setCatFiltro(c.id)} style={{padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',border:'none',background:catFiltro===c.id?NAVY:'#e2e8f0',color:catFiltro===c.id?'#fff':'#555'}}>{c.label}{cnt>0&&<span style={{opacity:.7}}> ({cnt})</span>}</button>)})}</div>)}
      {carregando?(<div style={{textAlign:'center',padding:32,color:'#888',fontSize:13}}>Carregando documentos…</div>):docsFiltrados.length===0?(<div style={{textAlign:'center',padding:40,color:'#aaa',border:'1px dashed #e2e8f0',borderRadius:12}}><FolderOpen size={36} style={{marginBottom:8,opacity:.4}}/><div style={{fontSize:13}}>Nenhum documento{catFiltro!=='todos'?' nesta categoria ':' '}ainda.</div><div style={{fontSize:11,marginTop:4}}>Arraste ou clique na área acima para anexar.</div></div>):(<div style={{display:'flex',flexDirection:'column',gap:8}}>{docsFiltrados.map(doc=>(<div key={doc.id} style={{display:'flex',alignItems:'center',gap:12,background:'#fff',borderRadius:10,padding:'10px 14px',border:'1px solid #e8edf2',boxShadow:'0 1px 3px rgba(0,0,0,.05)'}}><span style={{fontSize:22}}>{iconePorTipo(doc.nome_arquivo)}</span><div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:13,color:NAVY,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.nome_original||doc.nome_arquivo}</div><div style={{fontSize:11,color:'#888',marginTop:2}}>{catLabel(doc.categoria)} · {formatBytes(doc.tamanho||0)} · {formatData(doc.criado_em)}</div>{doc.descricao&&(<div style={{fontSize:11,color:'#64748b',marginTop:2}}>{doc.descricao}</div>)}</div><div style={{display:'flex',gap:6}}><button onClick={()=>setPreview(doc)} style={{background:'#eff6ff',border:'none',borderRadius:6,padding:'6px 8px',cursor:'pointer',color:'#2563eb'}}><Eye size={14}/></button><a href={doc.url} download={doc.nome_original||doc.nome_arquivo} style={{background:'#f0fdf4',border:'none',borderRadius:6,padding:'6px 8px',cursor:'pointer',color:'#16a34a',textDecoration:'none',display:'flex',alignItems:'center'}}><Download size={14}/></a><button onClick={()=>excluirDoc(doc)} style={{background:'#fff5f5',border:'none',borderRadius:6,padding:'6px 8px',cursor:'pointer',color:'#dc2626'}}><Trash2 size={14}/></button></div></div>))}</div>)}
    </div>
  )
}
