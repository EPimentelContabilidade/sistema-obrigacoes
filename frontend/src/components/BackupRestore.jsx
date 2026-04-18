import React, { useState, useEffect } from 'react'
import { epStorage } from '../utils/storage'
const NAVY='#1F4A33', GOLD='#C5A55A'
export default function BackupRestore() {
  const [status,setStatus]=useState(null)
  const [msg,setMsg]=useState('')
  const [lastSync,setLastSync]=useState(null)
  const [backendOk,setBackendOk]=useState(null)
  const [prog,setProg]=useState(null)
  useEffect(()=>{setLastSync(localStorage.getItem('ep_last_sync'));epStorage.checkBackend().then(ok=>setBackendOk(ok))},[])
  const sincronizar=async()=>{
    setStatus('syncing');setMsg('Sincronizando...')
    try{const r=await epStorage.syncAll(p=>setProg(p));setMsg('✅ Sincronizado! '+r.synced+' modulos restaurados.');setStatus('ok');setLastSync(localStorage.getItem('ep_last_sync'))}
    catch(e){setMsg('❌ Erro: '+e.message);setStatus('error')}
    setProg(null)
  }
  const exportar=async()=>{
    setStatus('syncing');setMsg('Gerando backup...')
    try{const b=await epStorage.exportBackup();const blob=new Blob([JSON.stringify(b,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='epimentel_backup_'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(url);setMsg('✅ Backup exportado! '+b.total_modulos+' modulos.');setStatus('ok')}
    catch(e){setMsg('❌ Erro: '+e.message);setStatus('error')}
  }
  const importar=async(e)=>{
    const file=e.target.files[0];if(!file)return
    if(!window.confirm('⚠️ Isso vai SUBSTITUIR todos os dados pelo backup. Confirma?'))return
    setStatus('syncing');setMsg('Importando...')
    try{const text=await file.text();const backup=JSON.parse(text);const r=await epStorage.importBackup(backup);setMsg('✅ Importado! '+r.modulos_importados+' modulos.');setStatus('ok');setTimeout(()=>window.location.reload(),1500)}
    catch(e){setMsg('❌ Erro: '+e.message);setStatus('error')}
    e.target.value=''
  }
  const cor={ok:'#22c55e',error:'#dc2626',syncing:'#f59e0b'}[status]||'#888'
  return(
    <div style={{padding:20,maxWidth:600}}>
      <div style={{fontWeight:700,color:NAVY,fontSize:15,marginBottom:4}}>🗄️ Banco de Dados — PostgreSQL</div>
      <div style={{fontSize:12,color:'#888',marginBottom:16}}>Todos os modulos sincronizam automaticamente. Atualizacoes de layout nunca afetam os dados.</div>
      <div style={{padding:'8px 14px',borderRadius:9,background:backendOk===null?'#f5f5f5':backendOk?'#F0FDF4':'#FEF2F2',border:'1px solid '+(backendOk===null?'#e0e0e0':backendOk?'#bbf7d0':'#fca5a5'),marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:10,height:10,borderRadius:'50%',background:backendOk===null?'#aaa':backendOk?'#22c55e':'#dc2626'}}/>
        <div>
          <div style={{fontSize:12,fontWeight:700,color:backendOk===null?'#888':backendOk?'#166534':'#dc2626'}}>{backendOk===null?'Verificando...':backendOk?'PostgreSQL Online ✅':'PostgreSQL Offline ❌'}</div>
          {lastSync&&<div style={{fontSize:11,color:'#888'}}>Ultima sync: {new Date(lastSync).toLocaleString('pt-BR')}</div>}
        </div>
      </div>
      {prog&&<div style={{marginBottom:12,padding:'8px 12px',borderRadius:8,background:'#FFF8E1',border:'1px solid #FFCC02'}}>
        <div style={{fontSize:12,color:'#854D0E',marginBottom:4}}>🔄 {prog.currentKey} ({prog.synced+prog.failed}/{prog.total})</div>
        <div style={{height:6,background:'#f0f0f0',borderRadius:4,overflow:'hidden'}}><div style={{height:'100%',background:GOLD,borderRadius:4,width:Math.round(((prog.synced+prog.failed)/prog.total)*100)+'%'}}/></div>
      </div>}
      {msg&&<div style={{padding:'8px 12px',borderRadius:8,background:cor+'15',border:'1px solid '+cor+'44',fontSize:12,color:cor,fontWeight:600,marginBottom:14}}>{msg}</div>}
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <button onClick={sincronizar} disabled={status==='syncing'} style={{padding:'9px 18px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer'}}>🔄 Sincronizar</button>
        <button onClick={exportar} disabled={status==='syncing'} style={{padding:'9px 18px',borderRadius:8,background:'#22c55e',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer'}}>💾 Exportar Backup</button>
        <label style={{padding:'9px 18px',borderRadius:8,background:'#f59e0b',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',display:'inline-flex',alignItems:'center'}}>📂 Importar<input type="file" accept=".json" onChange={importar} style={{display:'none'}}/></label>
      </div>
      <div style={{marginTop:16,padding:'10px 14px',borderRadius:8,background:'#F0FDF4',border:'1px solid #bbf7d0',fontSize:11,color:'#166534'}}><b>✅ Protecao automatica:</b> cada modulo salva no PostgreSQL ao ser alterado. Limpar cache, trocar computador ou atualizar o sistema nao perde dados.</div>
    </div>
  )
}
