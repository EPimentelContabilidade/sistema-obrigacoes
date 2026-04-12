import { useState } from 'react'
import { FileText, Plus, Search } from 'lucide-react'

const NAVY = '#1B2A4A'

export default function Alvaras() {
  const [alvaras, setAlvaras] = useState([])
  const [busca, setBusca] = useState('')

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:NAVY, margin:0 }}>Alvarás e Licenças</h1>
        <button style={{ padding:'8px 16px', background:NAVY, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>
          <Plus size={14}/> Novo Alvará
        </button>
      </div>
      <div style={{ textAlign:'center', padding:60, color:'#ccc' }}>
        <FileText size={48} style={{ margin:'0 auto 12px', display:'block' }}/>
        <div>Nenhum alvará cadastrado</div>
      </div>
    </div>
  )
}
