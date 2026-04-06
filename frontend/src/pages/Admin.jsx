import { useState } from 'react'
import { Shield, Plus, Trash2, Save, X, Check, Eye, EyeOff, Lock, Unlock, Key, Users, Settings, Activity } from 'lucide-react'

const ABAS_SISTEMA = [
  { id:'dashboard',    label:'Dashboard',       icon:'📊', grupo:'Geral' },
  { id:'clientes',     label:'Clientes',        icon:'👥', grupo:'Cadastros' },
  { id:'tarefas',      label:'Tarefas',         icon:'📋', grupo:'Operacional' },
  { id:'obrigacoes',   label:'Obrigações',      icon:'📋', grupo:'Operacional' },
  { id:'entregas',     label:'Entregas',        icon:'📤', grupo:'Operacional' },
  { id:'notas',        label:'NF-e / NFS-e',    icon:'📄', grupo:'Fiscal' },
  { id:'goiania',      label:'NFS-e Goiânia',   icon:'🏙️', grupo:'Fiscal' },
  { id:'certidoes',    label:'Certidões',       icon:'📜', grupo:'Fiscal' },
  { id:'parcelamentos',label:'Parcelamentos',   icon:'💰', grupo:'Fiscal' },
  { id:'financeiro',   label:'Financeiro',      icon:'💼', grupo:'Financeiro' },
  { id:'balanco',      label:'An. Balanço',     icon:'📈', grupo:'Financeiro' },
  { id:'relatorio',    label:'Rel. Fiscal',     icon:'📊', grupo:'Fiscal' },
  { id:'certificados', label:'Certificados',    icon:'🔑', grupo:'Cadastros' },
  { id:'contratos',    label:'Contratos',       icon:'📝', grupo:'Cadastros' },
  { id:'robo_obrig',   label:'Robô Obrigações', icon:'⚡', grupo:'Automação' },
  { id:'comunicacao',  label:'Equipe Interna',  icon:'💬', grupo:'Comunicação' },
  { id:'conversas',    label:'WhatsApp',        icon:'📱', grupo:'Comunicação' },
  { id:'robo',         label:'Robô IA',         icon:'🤖', grupo:'Automação' },
  { id:'admin',        label:'Admin',           icon:'🛡️', grupo:'Sistema' },
]

const PERMISSOES_DETALHADAS = [
  { id:'criar_cliente',   label:'Criar clientes',           grupo:'Clientes'  },
  { id:'editar_cliente',  label:'Editar clientes',          grupo:'Clientes'  },
  { id:'excluir_cliente', label:'Excluir clientes',         grupo:'Clientes'  },
  { id:'ver_financeiro',  label:'Ver dados financeiros',    grupo:'Financeiro'},
  { id:'lancar_financeiro',label:'Lançar financeiro',       grupo:'Financeiro'},
  { id:'ver_honorarios',  label:'Ver honorários/valores',   grupo:'Financeiro'},
  { id:'marcar_tarefa',   label:'Marcar tarefas entregues', grupo:'Tarefas'   },
  { id:'enviar_cliente',  label:'Enviar documentos',        grupo:'Comunicação'},
  { id:'gerenciar_usuarios',label:'Gerenciar usuários',     grupo:'Sistema'   },
  { id:'excluir_qualquer',label:'Excluir qualquer registro',grupo:'Sistema'   },
  { id:'ver_logs',        label:'Ver logs do sistema',      grupo:'Sistema'   },
  { id:'configurar_api',  label:'Configurar integrações',   grupo:'Sistema'   },
]

const PERFIS_PADRAO = {
  admin:      { abas: ABAS_SISTEMA.map(a=>a.id), perms: PERMISSOES_DETALHADAS.map(p=>p.id) },
  contador:   { abas: ['dashboard','clientes','tarefas','obrigacoes','entregas','notas','goiania','certidoes','parcelamentos','financeiro','balanco','relatorio','certificados','contratos','robo_obrig','conversas','robo'], perms: ['criar_cliente','editar_cliente','ver_financeiro','lancar_financeiro','ver_honorarios','marcar_tarefa','enviar_cliente'] },
  assistente: { abas: ['dashboard','clientes','tarefas','obrigacoes','entregas','notas','certidoes','conversas'], perms: ['editar_cliente','marcar_tarefa','enviar_cliente'] },
  estagiario: { abas: ['dashboard','clientes','tarefas','obrigacoes'], perms: ['marcar_tarefa'] },
}

const PERFIS = [
  { id:'admin',      label:'Administrador', cor:'#dc2626' },
  { id:'contador',   label:'Contador',      cor:'#2563eb' },
  { id:'assistente', label:'Assistente',    cor:'#16a34a' },
  { id:'estagiario', label:'Estagiário',    cor:'#f59e0b' },
]

const STORAGE_KEY = 'epimentel_usuarios'

const USUARIOS_PADRAO = [
  { id:1, nome:'Eduardo Pimentel', usuario:'eduardo', senha:'epimentel2026', email:'eduardo@epimentel.com.br', cargo:'Contador Responsável', perfil:'admin', ativo:true, abas:ABAS_SISTEMA.map(a=>a.id), perms:PERMISSOES_DETALHADAS.map(p=>p.id) },
  { id:2, nome:'Administrador',    usuario:'admin',   senha:'admin123',      email:'admin@epimentel.com.br',   cargo:'Administrador',        perfil:'admin', ativo:true, abas:ABAS_SISTEMA.map(a=>a.id), perms:PERMISSOES_DETALHADAS.map(p=>p.id) },
]

function carregarUsuarios() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : USUARIOS_PADRAO } catch { return USUARIOS_PADRAO }
}

function salvarStorage(users) { localStorage.setItem(STORAGE_KEY, JSON.stringify(users)) }

const emptyUser = { nome:'', usuario:'', senha:'', email:'', cargo:'', perfil:'assistente', ativo:true, abas:PERFIS_PADRAO.assistente.abas, perms:PERFIS_PADRAO.assistente.perms }

export default function Admin() {
  const [aba, setAba] = useState('usuarios')
  const [usuarios, setUsuarios] = useState(carregarUsuarios)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyUser)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [msg, setMsg] = useState('')
  const [abaModal, setAbaModal] = useState('dados')
  const [userAtual] = useState(() => { try { return JSON.parse(localStorage.getItem('epimentel_user')) } catch { return null } })

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const aplicarPerfil = (perfilId) => {
    const p = PERFIS_PADRAO[perfilId] || PERFIS_PADRAO.assistente
    setForm(f => ({ ...f, perfil:perfilId, abas:[...p.abas], perms:[...p.perms] }))
  }

  const salvar = () => {
    if (!form.nome || !form.usuario || !form.senha) return showMsg('❌ Preencha nome, usuário e senha.')
    if (usuarios.find(u => u.usuario === form.usuario && u.id !== modal)) return showMsg('❌ Usuário já existe.')
    const novos = modal === 'novo'
      ? [...usuarios, { ...form, id: Date.now() }]
      : usuarios.map(u => u.id === modal ? { ...form, id: modal } : u)
    setUsuarios(novos); salvarStorage(novos); setModal(null); showMsg('✅ Usuário salvo!')
  }

  const excluir = (id) => {
    if (id === 1) return showMsg('❌ Não é possível excluir o administrador principal.')
    if (!confirm('Excluir este usuário?')) return
    const novos = usuarios.filter(u => u.id !== id)
    setUsuarios(novos); salvarStorage(novos); showMsg('✅ Removido.')
  }

  const toggleAtivo = (id) => {
    if (id === 1) return showMsg('❌ Não é possível desativar o administrador principal.')
    const novos = usuarios.map(u => u.id === id ? { ...u, ativo: !u.ativo } : u)
    setUsuarios(novos); salvarStorage(novos)
  }

  const toggleAba = (id) => setForm(f => ({ ...f, abas: f.abas.includes(id) ? f.abas.filter(a=>a!==id) : [...f.abas,id] }))
  const togglePerm = (id) => setForm(f => ({ ...f, perms: f.perms?.includes(id) ? f.perms.filter(p=>p!==id) : [...(f.perms||[]),id] }))

  const PERFIL_MAP = Object.fromEntries(PERFIS.map(p => [p.id, p]))
  const GRUPOS_ABAS = [...new Set(ABAS_SISTEMA.map(a => a.grupo))]
  const GRUPOS_PERMS = [...new Set(PERMISSOES_DETALHADAS.map(p => p.grupo))]

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
        <Shield size={24} color="#1B2A4A"/>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#1B2A4A' }}>Painel Administrador</h1>
          <p style={{ color:'#888', fontSize:13 }}>Usuários, permissões detalhadas e configurações</p>
        </div>
      </div>

      {msg && <div style={{ padding:'10px 16px', background:msg.includes('✅')?'#f0fdf4':'#fef2f2', borderRadius:8, fontSize:13, marginBottom:16, color:msg.includes('✅')?'#16a34a':'#dc2626', fontWeight:500 }}>{msg}</div>}

      <div style={{ display:'flex', gap:4, marginBottom:20, background:'#f1f5f9', borderRadius:10, padding:4 }}>
        {[{id:'usuarios',label:'👥 Usuários'},{id:'permissoes',label:'🔐 Permissões por Perfil'},{id:'config',label:'⚙️ Sistema'}].map(({id,label}) => (
          <button key={id} onClick={() => setAba(id)} style={{
            flex:1, padding:'9px 12px', borderRadius:8, border:'none',
            background:aba===id?'#fff':'transparent', color:aba===id?'#1B2A4A':'#888',
            cursor:'pointer', fontSize:13, fontWeight:aba===id?600:400,
            boxShadow:aba===id?'0 1px 3px rgba(0,0,0,.1)':'none',
          }}>{label}</button>
        ))}
      </div>

      {/* USUÁRIOS */}
      {aba==='usuarios' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
            <span style={{ fontSize:13, color:'#888' }}>{usuarios.length} usuário(s)</span>
            <button onClick={() => { setForm(emptyUser); setAbaModal('dados'); setModal('novo') }}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', background:'#1B2A4A', color:'#C5A55A', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 }}>
              <Plus size={14}/> Novo Usuário
            </button>
          </div>
          {usuarios.map(u => {
            const p = PERFIL_MAP[u.perfil]
            return (
              <div key={u.id} style={{ background:'#fff', borderRadius:12, padding:'16px 20px', boxShadow:'0 1px 4px rgba(0,0,0,.08)', marginBottom:10, display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ width:46, height:46, borderRadius:'50%', background:u.ativo?'#1B2A4A':'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', color:u.ativo?'#C5A55A':'#aaa', fontWeight:700, fontSize:18, flexShrink:0 }}>
                  {u.nome.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, color:u.ativo?'#1B2A4A':'#aaa', fontSize:15 }}>{u.nome}</div>
                  <div style={{ fontSize:12, color:'#888', marginTop:2 }}>@{u.usuario} · {u.email||'—'} · {u.cargo||'—'}</div>
                  <div style={{ display:'flex', gap:8, marginTop:6, flexWrap:'wrap' }}>
                    <span style={{ background:(p?.cor||'#aaa')+'15', color:p?.cor||'#aaa', padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:600 }}>{p?.label||u.perfil}</span>
                    <span style={{ background:'#f1f5f9', color:'#64748b', padding:'2px 10px', borderRadius:20, fontSize:11 }}>{u.abas?.length||0} abas</span>
                    <span style={{ background:'#f1f5f9', color:'#64748b', padding:'2px 10px', borderRadius:20, fontSize:11 }}>{u.perms?.length||0} permissões</span>
                    {!u.ativo && <span style={{ background:'#fef2f2', color:'#dc2626', padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:600 }}>Inativo</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => toggleAtivo(u.id)} style={{ padding:'7px 10px', border:'1px solid #e2e8f0', borderRadius:7, background:'#fff', cursor:'pointer', color:u.ativo?'#f59e0b':'#22c55e', display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
                    {u.ativo?<Lock size={13}/>:<Unlock size={13}/>} {u.ativo?'Desativar':'Ativar'}
                  </button>
                  <button onClick={() => { setForm({...u}); setAbaModal('dados'); setModal(u.id) }} style={{ padding:'7px 12px', border:'1px solid #1B2A4A', borderRadius:7, background:'#fff', cursor:'pointer', color:'#1B2A4A', fontSize:11, fontWeight:500 }}>✏️ Editar</button>
                  {u.id!==1 && <button onClick={() => excluir(u.id)} style={{ padding:'7px 10px', border:'1px solid #fecaca', borderRadius:7, background:'#fef2f2', cursor:'pointer', color:'#dc2626', display:'flex', alignItems:'center' }}><Trash2 size={13}/></button>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* PERMISSÕES POR PERFIL */}
      {aba==='permissoes' && (
        <div>
          <div style={{ background:'#fff', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)', marginBottom:16 }}>
            <div style={{ fontWeight:700, color:'#1B2A4A', marginBottom:16, fontSize:15 }}>🔐 Matriz de Permissões por Perfil</div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    <th style={{ padding:'10px 14px', textAlign:'left', color:'#64748b', fontWeight:500, minWidth:200 }}>Permissão</th>
                    {PERFIS.map(p => <th key={p.id} style={{ padding:'10px 14px', textAlign:'center', color:p.cor, fontWeight:600 }}>{p.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {GRUPOS_PERMS.map(grupo => (
                    <>
                      <tr key={grupo} style={{ background:'#f1f5f9' }}>
                        <td colSpan={5} style={{ padding:'6px 14px', fontWeight:700, color:'#475569', fontSize:11, textTransform:'uppercase', letterSpacing:1 }}>{grupo}</td>
                      </tr>
                      {PERMISSOES_DETALHADAS.filter(p => p.grupo===grupo).map(perm => (
                        <tr key={perm.id} style={{ borderTop:'1px solid #f8fafc' }}>
                          <td style={{ padding:'9px 14px', color:'#334155', fontSize:13 }}>{perm.label}</td>
                          {PERFIS.map(perfil => {
                            const tem = PERFIS_PADRAO[perfil.id]?.perms?.includes(perm.id)
                            return <td key={perfil.id} style={{ padding:'9px 14px', textAlign:'center' }}>
                              {tem ? <span style={{ color:'#22c55e', fontSize:16 }}>✓</span> : <span style={{ color:'#e2e8f0', fontSize:16 }}>—</span>}
                            </td>
                          })}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ background:'#fff', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ fontWeight:700, color:'#1B2A4A', marginBottom:16, fontSize:15 }}>📋 Acesso às Abas por Perfil</div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    <th style={{ padding:'10px 14px', textAlign:'left', color:'#64748b', fontWeight:500, minWidth:160 }}>Aba</th>
                    {PERFIS.map(p => <th key={p.id} style={{ padding:'10px 14px', textAlign:'center', color:p.cor, fontWeight:600 }}>{p.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {GRUPOS_ABAS.map(grupo => (
                    <>
                      <tr key={grupo} style={{ background:'#f1f5f9' }}>
                        <td colSpan={5} style={{ padding:'6px 14px', fontWeight:700, color:'#475569', fontSize:11, textTransform:'uppercase', letterSpacing:1 }}>{grupo}</td>
                      </tr>
                      {ABAS_SISTEMA.filter(a => a.grupo===grupo).map(aba2 => (
                        <tr key={aba2.id} style={{ borderTop:'1px solid #f8fafc' }}>
                          <td style={{ padding:'8px 14px', fontSize:13, color:'#334155' }}>{aba2.icon} {aba2.label}</td>
                          {PERFIS.map(perfil => {
                            const tem = PERFIS_PADRAO[perfil.id]?.abas?.includes(aba2.id)
                            return <td key={perfil.id} style={{ padding:'8px 14px', textAlign:'center' }}>
                              {tem ? <span style={{ color:'#22c55e', fontSize:16 }}>✓</span> : <span style={{ color:'#e2e8f0', fontSize:16 }}>—</span>}
                            </td>
                          })}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONFIG */}
      {aba==='config' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ background:'#fff', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ fontWeight:700, color:'#1B2A4A', marginBottom:16 }}>ℹ️ Informações do Sistema</div>
            {[['Escritório','EPimentel Auditoria & Contabilidade Ltda'],['CRC','CRC/GO 026.994/O-8'],['Responsável','Eduardo Pimentel'],['Cidade','Goiânia - GO'],['Backend','Python 3.13 / FastAPI'],['Frontend','React 18 / Vite'],['Logado como',userAtual?.nome||'—'],['Módulos',ABAS_SISTEMA.length+' abas']].map(([k,v]) => (
              <div key={k} style={{ display:'flex', padding:'8px 0', borderBottom:'1px solid #f8fafc' }}>
                <span style={{ color:'#888', fontSize:13, width:160 }}>{k}</span>
                <span style={{ fontSize:13, fontWeight:500, color:'#1B2A4A' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ background:'#fffbeb', borderRadius:12, padding:16, border:'1px solid #fde68a', fontSize:13, color:'#92400e' }}>
            ⚙️ Para configurar integrações, edite <code style={{ background:'#fef3c7', padding:'1px 6px', borderRadius:3 }}>C:\sistema_obrigacoes\backend\.env</code>
          </div>
        </div>
      )}

      {/* MODAL DE USUÁRIO */}
      {modal!==null && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div style={{ background:'#fff', borderRadius:14, width:620, maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 8px 32px rgba(0,0,0,.2)' }}>
            <div style={{ padding:'16px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:700, fontSize:16, color:'#1B2A4A' }}>{modal==='novo'?'➕ Novo Usuário':'✏️ Editar Usuário'}</div>
              <button onClick={() => setModal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#888' }}><X size={20}/></button>
            </div>

            {/* Sub-abas do modal */}
            <div style={{ display:'flex', background:'#f8fafc', borderBottom:'1px solid #f1f5f9' }}>
              {[{id:'dados',label:'👤 Dados'},{id:'abas',label:'📋 Abas'},{id:'perms',label:'🔐 Permissões'}].map(({id,label}) => (
                <button key={id} onClick={() => setAbaModal(id)} style={{
                  padding:'10px 16px', border:'none', background:'transparent',
                  color:abaModal===id?'#1B2A4A':'#888', fontSize:12, fontWeight:abaModal===id?600:400,
                  cursor:'pointer', borderBottom:abaModal===id?'2px solid #C5A55A':'2px solid transparent',
                }}>{label}</button>
              ))}
            </div>

            <div style={{ padding:'20px 24px', overflowY:'auto', flex:1 }}>

              {abaModal==='dados' && (
                <div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                    {[{l:'Nome completo *',f:'nome',ph:''},{l:'E-mail',f:'email',ph:'email@escritorio.com.br'},{l:'Cargo',f:'cargo',ph:'Ex: Auxiliar Contábil'},{l:'Usuário (login) *',f:'usuario',ph:''},].map(({l,f,ph}) => (
                      <div key={f}>
                        <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>{l}</label>
                        <input value={form[f]||''} onChange={e => setForm(fv=>({...fv,[f]:f==='usuario'?e.target.value.toLowerCase().replace(/\s/g,''):e.target.value}))} placeholder={ph}
                          style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:13, boxSizing:'border-box' }}/>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>Senha *</label>
                    <div style={{ position:'relative' }}>
                      <input type={mostrarSenha?'text':'password'} value={form.senha||''} onChange={e => setForm(f=>({...f,senha:e.target.value}))}
                        style={{ width:'100%', padding:'8px 36px 8px 10px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:13, boxSizing:'border-box' }}/>
                      <button onClick={() => setMostrarSenha(s=>!s)} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#aaa' }}>
                        {mostrarSenha?<EyeOff size={15}/>:<Eye size={15}/>}
                      </button>
                    </div>
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:8 }}>Perfil base (define abas e permissões automaticamente)</label>
                    <div style={{ display:'flex', gap:8 }}>
                      {PERFIS.map(p => (
                        <button key={p.id} onClick={() => aplicarPerfil(p.id)} style={{
                          flex:1, padding:'9px', border:`2px solid ${form.perfil===p.id?p.cor:'#e2e8f0'}`,
                          borderRadius:8, background:form.perfil===p.id?p.cor+'15':'#fff',
                          color:form.perfil===p.id?p.cor:'#64748b', cursor:'pointer', fontSize:12, fontWeight:form.perfil===p.id?600:400,
                        }}>{p.label}</button>
                      ))}
                    </div>
                  </div>
                  <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
                    <input type="checkbox" checked={form.ativo!==false} onChange={e => setForm(f=>({...f,ativo:e.target.checked}))}/>
                    Usuário ativo (pode fazer login)
                  </label>
                </div>
              )}

              {abaModal==='abas' && (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                    <span style={{ fontSize:13, color:'#888' }}>{form.abas?.length||0} de {ABAS_SISTEMA.length} abas liberadas</span>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => setForm(f=>({...f,abas:ABAS_SISTEMA.map(a=>a.id)}))} style={{ fontSize:11, color:'#2563eb', background:'none', border:'none', cursor:'pointer' }}>Todas</button>
                      <button onClick={() => setForm(f=>({...f,abas:[]}))} style={{ fontSize:11, color:'#dc2626', background:'none', border:'none', cursor:'pointer' }}>Nenhuma</button>
                    </div>
                  </div>
                  {GRUPOS_ABAS.map(grupo => (
                    <div key={grupo} style={{ marginBottom:14 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>{grupo}</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                        {ABAS_SISTEMA.filter(a => a.grupo===grupo).map(a => (
                          <label key={a.id} onClick={() => toggleAba(a.id)} style={{
                            display:'flex', alignItems:'center', gap:7, padding:'7px 10px', borderRadius:7, cursor:'pointer', fontSize:12,
                            background:form.abas?.includes(a.id)?'#eff6ff':'#f8fafc',
                            border:`1px solid ${form.abas?.includes(a.id)?'#93c5fd':'#e2e8f0'}`,
                            color:form.abas?.includes(a.id)?'#1d4ed8':'#64748b',
                          }}>
                            <span style={{ fontSize:14 }}>{a.icon}</span>
                            <span style={{ flex:1 }}>{a.label}</span>
                            {form.abas?.includes(a.id) && <Check size={11}/>}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {abaModal==='perms' && (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                    <span style={{ fontSize:13, color:'#888' }}>{form.perms?.length||0} de {PERMISSOES_DETALHADAS.length} permissões</span>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => setForm(f=>({...f,perms:PERMISSOES_DETALHADAS.map(p=>p.id)}))} style={{ fontSize:11, color:'#2563eb', background:'none', border:'none', cursor:'pointer' }}>Todas</button>
                      <button onClick={() => setForm(f=>({...f,perms:[]}))} style={{ fontSize:11, color:'#dc2626', background:'none', border:'none', cursor:'pointer' }}>Nenhuma</button>
                    </div>
                  </div>
                  {GRUPOS_PERMS.map(grupo => (
                    <div key={grupo} style={{ marginBottom:14 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>{grupo}</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {PERMISSOES_DETALHADAS.filter(p => p.grupo===grupo).map(perm => (
                          <label key={perm.id} onClick={() => togglePerm(perm.id)} style={{
                            display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, cursor:'pointer',
                            background:form.perms?.includes(perm.id)?'#f0fdf4':'#f8fafc',
                            border:`1px solid ${form.perms?.includes(perm.id)?'#86efac':'#e2e8f0'}`,
                          }}>
                            <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${form.perms?.includes(perm.id)?'#22c55e':'#cbd5e1'}`, background:form.perms?.includes(perm.id)?'#22c55e':'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              {form.perms?.includes(perm.id) && <Check size={12} color="#fff"/>}
                            </div>
                            <span style={{ fontSize:13, color:'#334155' }}>{perm.label}</span>
                            {['excluir_qualquer','gerenciar_usuarios','configurar_api'].includes(perm.id) &&
                              <span style={{ fontSize:10, background:'#fef2f2', color:'#dc2626', padding:'1px 6px', borderRadius:10, marginLeft:'auto' }}>Sensível</span>}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {msg && <div style={{ padding:'8px 24px', background:msg.includes('✅')?'#f0fdf4':'#fef2f2', fontSize:13, color:msg.includes('✅')?'#16a34a':'#dc2626' }}>{msg}</div>}

            <div style={{ padding:'14px 24px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'flex-end', gap:10, background:'#fafafa' }}>
              <button onClick={() => setModal(null)} style={{ padding:'9px 18px', border:'1px solid #e2e8f0', borderRadius:7, background:'#fff', cursor:'pointer', fontSize:13 }}>Cancelar</button>
              <button onClick={salvar} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 20px', background:'#1B2A4A', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontSize:13, fontWeight:500 }}>
                <Save size={14}/> Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
