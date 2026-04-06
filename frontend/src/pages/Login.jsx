import { useState } from 'react'
import { Lock, Eye, EyeOff, LogIn, Mail, ArrowLeft } from 'lucide-react'

function getUsuarios() {
  try {
    const s = localStorage.getItem('epimentel_usuarios')
    return s ? JSON.parse(s) : [
      { id:1, nome:'Eduardo Pimentel', usuario:'eduardo', senha:'epimentel2026', email:'eduardo@epimentel.com.br', cargo:'Contador Responsável', perfil:'admin', ativo:true },
      { id:2, nome:'Administrador',    usuario:'admin',   senha:'admin123',      email:'admin@epimentel.com.br',   cargo:'Administrador',        perfil:'admin', ativo:true },
    ]
  } catch { return [] }
}

export default function Login({ onLogin }) {
  const [tela, setTela] = useState('login') // login | esqueci | enviado
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [email, setEmail] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const entrar = async (e) => {
    e?.preventDefault()
    if (!usuario || !senha) return setErro('Preencha usuário e senha.')
    setLoading(true); setErro('')
    await new Promise(r => setTimeout(r, 500))
    const users = getUsuarios()
    const user = users.find(u => (u.usuario === usuario.toLowerCase() || u.email === usuario.toLowerCase()) && u.senha === senha && u.ativo !== false)
    if (user) {
      localStorage.setItem('epimentel_user', JSON.stringify(user))
      onLogin(user)
    } else {
      setErro('Usuário ou senha incorretos.')
    }
    setLoading(false)
  }

  const recuperarSenha = async (e) => {
    e?.preventDefault()
    if (!email) return setErro('Informe o e-mail cadastrado.')
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setLoading(false)
    setTela('enviado')
  }

  const fundo = { minHeight:'100vh', background:'#1B2A4A', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif' }
  const card = { background:'rgba(255,255,255,0.05)', borderRadius:16, padding:32, border:'1px solid rgba(197,165,90,0.2)' }
  const inp = { width:'100%', padding:'12px 14px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:10, fontSize:14, color:'#fff', outline:'none', boxSizing:'border-box' }
  const lbl = { fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.7)', display:'block', marginBottom:8 }
  const btn = { width:'100%', padding:'13px', background:'linear-gradient(135deg,#C5A55A,#a88840)', color:'#1B2A4A', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 4px 16px rgba(197,165,90,0.4)' }

  return (
    <div style={fundo}>
      <div style={{ position:'fixed', inset:0, overflow:'hidden', pointerEvents:'none' }}>
        <div style={{ position:'absolute', top:-100, right:-100, width:400, height:400, borderRadius:'50%', background:'rgba(197,165,90,0.06)' }}/>
        <div style={{ position:'absolute', bottom:-150, left:-100, width:500, height:500, borderRadius:'50%', background:'rgba(197,165,90,0.04)' }}/>
      </div>
      <div style={{ width:'100%', maxWidth:420, padding:'0 24px', position:'relative' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,#C5A55A,#a88840)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', boxShadow:'0 8px 24px rgba(197,165,90,0.3)' }}>
            <Lock size={30} color="#fff"/>
          </div>
          <h1 style={{ fontSize:26, fontWeight:700, color:'#C5A55A', margin:0 }}>EPimentel</h1>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:14, marginTop:6 }}>Auditoria & Contabilidade Ltda</p>
          <p style={{ color:'rgba(255,255,255,0.3)', fontSize:12, marginTop:4 }}>CRC/GO 026.994/O-8 · Goiânia-GO</p>
        </div>

        {/* LOGIN */}
        {tela === 'login' && (
          <div style={card}>
            <h2 style={{ fontSize:18, fontWeight:600, color:'#fff', marginBottom:24, textAlign:'center' }}>Acesso ao Sistema</h2>
            <form onSubmit={entrar}>
              <div style={{ marginBottom:16 }}>
                <label style={lbl}>Usuário ou E-mail</label>
                <input value={usuario} onChange={e => { setUsuario(e.target.value); setErro('') }} placeholder="usuario ou email@dominio.com" autoComplete="username" style={inp}/>
              </div>
              <div style={{ marginBottom:8 }}>
                <label style={lbl}>Senha</label>
                <div style={{ position:'relative' }}>
                  <input type={mostrarSenha?'text':'password'} value={senha} onChange={e => { setSenha(e.target.value); setErro('') }} placeholder="••••••••" style={{ ...inp, paddingRight:44 }}/>
                  <button type="button" onClick={() => setMostrarSenha(s => !s)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', padding:0 }}>
                    {mostrarSenha?<EyeOff size={18}/>:<Eye size={18}/>}
                  </button>
                </div>
              </div>
              <div style={{ textAlign:'right', marginBottom:20 }}>
                <button type="button" onClick={() => { setTela('esqueci'); setErro('') }} style={{ background:'none', border:'none', color:'rgba(197,165,90,0.8)', fontSize:12, cursor:'pointer', padding:0 }}>
                  Esqueci minha senha
                </button>
              </div>
              {erro && <div style={{ padding:'10px 14px', background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, color:'#fca5a5', fontSize:13, marginBottom:16, textAlign:'center' }}>{erro}</div>}
              <button type="submit" disabled={loading} style={{ ...btn, opacity:loading?.7:1 }}>
                {loading ? '⟳ Entrando...' : <><LogIn size={18}/> Entrar</>}
              </button>
            </form>
          </div>
        )}

        {/* ESQUECI */}
        {tela === 'esqueci' && (
          <div style={card}>
            <button onClick={() => { setTela('login'); setErro('') }} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, marginBottom:20, padding:0 }}>
              <ArrowLeft size={16}/> Voltar
            </button>
            <h2 style={{ fontSize:18, fontWeight:600, color:'#fff', marginBottom:8, textAlign:'center' }}>Recuperar Senha</h2>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:13, textAlign:'center', marginBottom:24 }}>Informe seu e-mail para receber as instruções</p>
            <form onSubmit={recuperarSenha}>
              <div style={{ marginBottom:20 }}>
                <label style={lbl}>E-mail cadastrado</label>
                <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErro('') }} placeholder="seu@email.com" style={inp}/>
              </div>
              {erro && <div style={{ padding:'10px 14px', background:'rgba(239,68,68,0.15)', borderRadius:8, color:'#fca5a5', fontSize:13, marginBottom:16, textAlign:'center' }}>{erro}</div>}
              <button type="submit" disabled={loading} style={{ ...btn, background:'rgba(197,165,90,0.3)', color:'#C5A55A' }}>
                {loading ? '⟳ Enviando...' : <><Mail size={16}/> Enviar instruções</>}
              </button>
            </form>
          </div>
        )}

        {/* ENVIADO */}
        {tela === 'enviado' && (
          <div style={{ ...card, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📧</div>
            <h2 style={{ fontSize:18, fontWeight:600, color:'#C5A55A', marginBottom:10 }}>E-mail enviado!</h2>
            <p style={{ color:'rgba(255,255,255,0.6)', fontSize:13, marginBottom:24 }}>Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.</p>
            <button onClick={() => setTela('login')} style={btn}><LogIn size={16}/> Voltar ao login</button>
          </div>
        )}

        <p style={{ textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:12, marginTop:24 }}>Sistema Interno · Acesso Restrito</p>
      </div>
      <style>{`input::placeholder{color:rgba(255,255,255,0.25)!important} input:focus{border-color:rgba(197,165,90,0.5)!important}`}</style>
    </div>
  )
}
