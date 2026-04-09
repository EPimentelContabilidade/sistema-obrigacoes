import { useState } from 'react'
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react'

const NAVY = '#1B2A4A'

export default function PDFPreview({ url, nome, onClose }) {
  const [zoom, setZoom] = useState(100)
  if (!url) return null
  const isPDF = (nome||'').toLowerCase().endsWith('.pdf') || url.includes('.pdf')
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(nome||url)

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:9999,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}} onClick={e => e.target===e.currentTarget&&onClose()}>
      <div style={{width:'90%',maxWidth:1000,background:NAVY,borderRadius:'10px 10px 0 0',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:18}}>📄</span>
          <span style={{color:'#fff',fontWeight:600,fontSize:14,maxWidth:400,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nome||'Visualizar Documento'}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {isPDF&&(<><button onClick={()=>setZoom(z=>Math.max(50,z-25))} style={bs}><ZoomOut size={14}/></button><span style={{color:'#fff',fontSize:12,minWidth:40,textAlign:'center'}}>{zoom}%</span><button onClick={()=>setZoom(z=>Math.min(200,z+25))} style={bs}><ZoomIn size={14}/></button></>)}
          <a href={url} download={nome} style={{...bs,textDecoration:'none',display:'flex',alignItems:'center',gap:4}}><Download size={14}/><span style={{fontSize:12}}>Baixar</span></a>
          <button onClick={onClose} style={{...bs,background:'rgba(255,255,255,0.2)'}}><X size={16}/></button>
        </div>
      </div>
      <div style={{width:'90%',maxWidth:1000,height:'75vh',background:'#525659',borderRadius:'0 0 10px 10px',overflow:'auto',display:'flex',alignItems:isPDF?'flex-start':'center',justifyContent:'center',padding:16}}>
        {isPDF?(<iframe src={url+'#toolbar=0&navpanes=0'} style={{width:zoom+'%',minWidth:'100%',height:'100%',border:'none',borderRadius:4,background:'#fff'}} title={nome}/>)
        :isImage?(<img src={url} alt={nome} style={{maxWidth:zoom+'%',maxHeight:'100%',objectFit:'contain',borderRadius:4}}/>)
        :(<div style={{textAlign:'center',color:'#fff'}}><div style={{fontSize:48,marginBottom:12}}>📎</div><div style={{fontSize:14,marginBottom:16}}>{nome}</div><a href={url} download={nome} style={{padding:'10px 20px',background:NAVY,color:'#fff',borderRadius:8,textDecoration:'none',fontWeight:600,fontSize:13}}>Baixar arquivo</a></div>)}
      </div>
    </div>
  )
}
const bs = {padding:'6px 10px',borderRadius:6,border:'1px solid rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.1)',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:4}
