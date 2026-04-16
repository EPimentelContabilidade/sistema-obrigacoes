import React, { useState, useEffect } from 'react'
import { Shield, Plus, Trash2, Save, X, Check, Eye, EyeOff, Lock, Unlock, Key, Users, Settings, Activity, Mail, Send, AlertTriangle } from 'lucide-react'

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
  { id:'criar_cliente',    label:'Criar clientes',           grupo:'Clientes'   },
  { id:'editar_cliente',   label:'Editar clientes',          grupo:'Clientes'   },
  { id:'excluir_cliente',  label:'Excluir clientes',         grupo:'Clientes'   },
  { id:'ver_financeiro',   label:'Ver dados financeiros',    grupo:'Financeiro' },
  { id:'lancar_financeiro',label:'Lançar financeiro',        grupo:'Financeiro' },
  { id:'ver_honorarios',   label:'Ver honorários/valores',   grupo:'Financeiro' },
  { id:'marcar_tarefa',    label:'Marcar tarefas entregues', grupo:'Tarefas'    },
  { id:'enviar_cliente',   label:'Enviar documentos',        grupo:'Comunicação'},
  { id:'gerenciar_usuarios',label:'Gerenciar usuários',      grupo:'Sistema'    },
  { id:'excluir_qualquer', label:'Excluir qualquer registro',grupo:'Sistema'    },
  { id:'ver_logs',         label:'Ver logs do sistema',      grupo:'Sistema'    },
  { id:'configurar_api',   label:'Configurar integrações',   grupo:'Sistema'    },
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

const DEPARTAMENTOS_PADRAO_ADMIN = ['Geral','Fiscal','Contábil','Pessoal','Financeiro','Jurídico','Diretoria','TI','Comercial']
const getDepartamentos = () => { try{return JSON.parse(localStorage.getItem('ep_departamentos_admin')||'null')||DEPARTAMENTOS_PADRAO_ADMIN}catch{return DEPARTAMENTOS_PADRAO_ADMIN} }

const STORAGE_KEY = 'epimentel_usuarios'

const USUARIOS_PADRAO = [
  { id:1, nome:'Eduardo Pimentel', usuario:'eduardo', senha:'epimentel2026', email:'eduardo@epimentel.com.br', cargo:'Contador Responsável', perfil:'admin', ativo:true, abas:ABAS_SISTEMA.map(a=>a.id), perms:PERMISSOES_DETALHADAS.map(p=>p.id), clientes_permitidos:null },
  { id:2, nome:'Administrador',    usuario:'admin',   senha:'admin123',      email:'admin@epimentel.com.br',   cargo:'Administrador',        perfil:'admin', ativo:true, abas:ABAS_SISTEMA.map(a=>a.id), perms:PERMISSOES_DETALHADAS.map(p=>p.id), clientes_permitidos:null },
]

function carregarUsuarios() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : USUARIOS_PADRAO } catch { return USUARIOS_PADRAO }
}
function salvarStorage(users) { localStorage.setItem(STORAGE_KEY, JSON.stringify(users)) }

function carregarClientes() {
  try {
    // Tenta carregar da API cache ou localStorage
    const s = localStorage.getItem('ep_clientes')
    return s ? JSON.parse(s) : []
  } catch { return [] }
}

// Verifica vínculos de um cliente em todas as entidades
async function verificarVinculosCliente(clienteId) {
  const vinculos = []
  try {
    const BACKEND = window.location.hostname.includes('railway.app')
      ? 'https://sistema-obrigacoes-production.up.railway.app/api/v1'
      : '/api/v1'

    const checks = [
      { rota: `/processos?cliente_id=${clienteId}`, label: 'Processos' },
      { rota: `/obrigacoes?cliente_id=${clienteId}`, label: 'Obrigações' },
      { rota: `/certificados?cliente_id=${clienteId}`, label: 'Certificados' },
      { rota: `/contratos?cliente_id=${clienteId}`, label: 'Contratos' },
      { rota: `/financeiro?cliente_id=${clienteId}`, label: 'Lançamentos Financeiros' },
      { rota: `/certidoes?cliente_id=${clienteId}`, label: 'Certidões' },
    ]
    for (const c of checks) {
      try {
        const r = await fetch(BACKEND + c.rota)
        if (r.ok) {
          const d = await r.json()
          const lista = d.items || d.data || d || []
          if (Array.isArray(lista) && lista.length > 0) vinculos.push(`${c.label} (${lista.length})`)
        }
      } catch {}
    }
  } catch {}
  return vinculos
}

const emptyUser = { nome:'', usuario:'', senha:'', email:'', whatsapp:'', cargo:'', departamento:'', perfil:'assistente', perfis_extras:[], ativo:true, abas:PERFIS_PADRAO.assistente.abas, perms:PERFIS_PADRAO.assistente.perms, clientes_permitidos:null }

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'

export default function Admin() {
  const [aba, setAba] = useState('usuarios')
  const [deptsAdmin, setDeptsAdmin] = useState(getDepartamentos)
  const [novoDepto, setNovoDepto] = useState('')
  const [perfisCustom, setPerfisCustom] = useState(()=>{ try{return JSON.parse(localStorage.getItem('ep_perfis_custom')||'null')||[]}catch{return []} })
  const [formPerfil, setFormPerfil] = useState({nome:'',cor:'#2563eb'})
  const [notifRules, setNotifRules] = useState(()=>{ try{return JSON.parse(localStorage.getItem('ep_notif_rules')||'null')||[]}catch{return []} })
  const [notifForm, setNotifForm] = useState({dep:'',gatilho:'vencimento_7d',popup:true,email:true,whatsapp:true})
  const [usuarios, setUsuarios] = useState(carregarUsuarios)
  const [clientes, setClientes] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyUser)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [msg, setMsg] = useState('')
  const [abaModal, setAbaModal] = useState('dados')
  const [userAtual] = useState(() => { try { return JSON.parse(localStorage.getItem('epimentel_user')) } catch { return null } })
  const [modalConvite, setModalConvite] = useState(null)
  const [enviandoConvite, setEnviandoConvite] = useState(false)
  const [buscaCliente, setBuscaCliente] = useState('')
  const [verificandoVinculos, setVerificandoVinculos] = useState(false)

  useEffect(() => {
    // Garantir que usuários padrão estejam no localStorage no primeiro acesso
    if (!localStorage.getItem('epimentel_usuarios')) {
      salvarStorage(USUARIOS_PADRAO);
    }
    // Carrega clientes do localStorage e também tenta da API
    const clientesLocal = carregarClientes()
    setClientes(clientesLocal)

    const BACKEND = window.location.hostname.includes('railway.app')
      ? 'https://sistema-obrigacoes-production.up.railway.app/api/v1'
      : '/api/v1'

    fetch(BACKEND + '/clientes')
      .then(r => r.json())
      .then(d => {
        const lista = d.clientes || d.items || d || []
        if (Array.isArray(lista) && lista.length > 0) {
          setClientes(lista)
          localStorage.setItem('ep_clientes', JSON.stringify(lista))
        }
      })
      .catch(() => {})
  }, [])

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

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

  const toggleClientePermitido = (clienteId) => {
    setForm(f => {
      const atual = f.clientes_permitidos
      if (atual === null) return { ...f, clientes_permitidos: clientes.map(c=>c.id).filter(id=>id!==clienteId) }
      const novo = atual.includes(clienteId) ? atual.filter(id=>id!==clienteId) : [...atual, clienteId]
      return { ...f, clientes_permitidos: novo }
    })
  }

  const setTodosClientes = (todos) => {
    setForm(f => ({ ...f, clientes_permitidos: todos ? null : [] }))
  }

  // Envio de convite por e-mail
  const enviarConvite = async (usuario) => {
    if (!usuario.email) return showMsg('❌ Usuário sem e-mail cadastrado.')
    setEnviandoConvite(true)
    const BACKEND = window.location.hostname.includes('railway.app')
      ? 'https://sistema-obrigacoes-production.up.railway.app/api/v1'
      : '/api/v1'
    const sistemaUrl = window.location.hostname.includes('railway.app')
      ? 'https://adventurous-generosity-production.up.railway.app'
      : window.location.origin

    try {
      const r = await fetch(BACKEND + '/admin/enviar-convite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: usuario.email,
          nome: usuario.nome,
          usuario: usuario.usuario,
          senha: usuario.senha,
          sistema_url: sistemaUrl,
        })
      })
      const d = await r.json()
      if (r.ok) {
        showMsg(`✅ Convite enviado para ${usuario.email}`)
        setModalConvite(null)
      } else {
        showMsg(`❌ Erro: ${d.detail || d.mensagem || 'Falha no envio'}`)
      }
    } catch (e) {
      showMsg(`❌ Erro de conexão: ${e.message}`)
    }
    setEnviandoConvite(false)
  }

  const PERFIL_MAP = Object.fromEntries(PERFIS.map(p => [p.id, p]))
  const GRUPOS_ABAS = [...new Set(ABAS_SISTEMA.map(a => a.grupo))]
  const GRUPOS_PERMS = [...new Set(PERMISSOES_DETALHADAS.map(p => p.grupo))]

  const clientesFiltrados = clientes.filter(c =>
    !buscaCliente || c.nome?.toLowerCase().includes(buscaCliente.toLowerCase()) || c.cnpj?.includes(buscaCliente)
  )

  const qtdClientesPermitidos = (form.clientes_permitidos === null || form.clientes_permitidos === undefined)
    ? 'Todos'
    : `${form.clientes_permitidos?.length || 0}`




  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
        <Shield size={24} color={NAVY}/>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:NAVY }}>Painel Administrador</h1>
          <p style={{ color:'#888', fontSize:13 }}>Usuários, permissões detalhadas e configurações</p>
        </div>
      </div>

      {msg && <div style={{ padding:'10px 16px', background:msg.includes('✅')?'#f0fdf4':'#fef2f2', borderRadius:8, fontSize:13, marginBottom:16, color:msg.includes('✅')?'#16a34a':'#dc2626', fontWeight:500 }}>{msg}</div>}

      <div style={{ display:'flex', gap:4, marginBottom:20, background:'#f1f5f9', borderRadius:10, padding:4 }}>
        {[{id:'usuarios',label:'👥 Usuários'},{id:'departamentos',label:'🏢 Departamentos'},{id:'perfis',label:'👔 Perfis'},{id:'notificacoes',label:'🔔 Notificações'},{id:'permissoes',label:'🔐 Permissões'},{id:'config',label:'⚙️ Sistema'}].map(({id,label}) => (
          <button key={id} onClick={() => setAba(id)} style={{
            flex:1, padding:'9px 12px', borderRadius:8, border:'none',
            background:aba===id?'#fff':'transparent', color:aba===id?NAVY:'#888',
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
              style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', background:NAVY, color:GOLD, border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 }}>
              <Plus size={14}/> Novo Usuário
            </button>
          </div>
          {usuarios.map(u => {
            const p = PERFIL_MAP[u.perfil]
            const qtdCli = u.clientes_permitidos === null ? 'Todos' : u.clientes_permitidos?.length || 0
            return (
              <div key={u.id} style={{ background:'#fff', borderRadius:12, padding:'16px 20px', boxShadow:'0 1px 4px rgba(0,0,0,.08)', marginBottom:10, display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ width:46, height:46, borderRadius:'50%', background:u.ativo?NAVY:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', color:u.ativo?GOLD:'#aaa', fontWeight:700, fontSize:18, flexShrink:0 }}>
                  {u.nome.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, color:u.ativo?NAVY:'#aaa', fontSize:15 }}>{u.nome}</div>
                  <div style={{ fontSize:12, color:'#888', marginTop:2 }}>@{u.usuario} · {u.email||'—'} · {u.cargo||'—'}</div>
                  <div style={{ display:'flex', gap:8, marginTop:6, flexWrap:'wrap' }}>
                    <span style={{ background:(p?.cor||'#aaa')+'15', color:p?.cor||'#aaa', padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:600 }}>{p?.label||u.perfil}</span>
                    <span style={{ background:'#f1f5f9', color:'#64748b', padding:'2px 10px', borderRadius:20, fontSize:11 }}>{u.abas?.length||0} abas</span>
                    <span style={{ background:'#f1f5f9', color:'#64748b', padding:'2px 10px', borderRadius:20, fontSize:11 }}>{u.perms?.length||0} permissões</span>
                    <span style={{ background:'#f0f9ff', color:'#0369a1', padding:'2px 10px', borderRadius:20, fontSize:11 }}>
                      👥 Clientes: {qtdCli}
                    </span>
                    {!u.ativo && <span style={{ background:'#fef2f2', color:'#dc2626', padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:600 }}>Inativo</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
                  {u.email && (
                    <button onClick={() => setModalConvite(u)}
                      style={{ padding:'7px 10px', border:'1px solid #0ea5e9', borderRadius:7, background:'#f0f9ff', cursor:'pointer', color:'#0369a1', display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
                      <Mail size={13}/> Convidar
                    </button>
                  )}
                  <button onClick={() => toggleAtivo(u.id)} style={{ padding:'7px 10px', border:'1px solid #e2e8f0', borderRadius:7, background:'#fff', cursor:'pointer', color:u.ativo?'#f59e0b':'#22c55e', display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
                    {u.ativo?<Lock size={13}/>:<Unlock size={13}/>} {u.ativo?'Desativar':'Ativar'}
                  </button>
                  <button onClick={() => { setForm({...u, clientes_permitidos: u.clientes_permitidos !== undefined ? u.clientes_permitidos : null, abas: u.abas||[], perms: u.perms||[]}); setAbaModal('dados'); setModal(u.id) }} style={{ padding:'7px 12px', border:`1px solid ${NAVY}`, borderRadius:7, background:'#fff', cursor:'pointer', color:NAVY, fontSize:11, fontWeight:500 }}>✏️ Editar</button>
                  {u.id!==1 && <button onClick={() => excluir(u.id)} style={{ padding:'7px 10px', border:'1px solid #fecaca', borderRadius:7, background:'#fef2f2', cursor:'pointer', color:'#dc2626', display:'flex', alignItems:'center' }}><Trash2 size={13}/></button>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* PERMISSÕES POR PERFIL */}
      {aba==='departamentos'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <h3 style={{color:NAVY,margin:0,fontSize:16}}>🏢 Gerenciar Departamentos</h3>
          </div>
          <div style={{background:'#fff',borderRadius:12,padding:20,border:'1px solid #e2e8f0',marginBottom:16}}>
            <label style={{fontSize:12,fontWeight:600,color:'#555',display:'block',marginBottom:6}}>Adicionar Departamento</label>
            <div style={{display:'flex',gap:8}}>
              <input value={novoDepto} onChange={e=>setNovoDepto(e.target.value)} placeholder="Nome do departamento..." style={{flex:1,padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13}}/>
              <button type="button" onClick={()=>{if(!novoDepto.trim()) return;const d=[...deptsAdmin,novoDepto.trim()];setDeptsAdmin(d);localStorage.setItem('ep_departamentos_admin',JSON.stringify(d));localStorage.setItem('ep_departamentos',JSON.stringify(d.map((n,i)=>({id:i+1,nome:n,cor:'#2563eb'}))));setNovoDepto('');}} style={{padding:'8px 18px',borderRadius:8,background:NAVY,color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:13}}>+ Adicionar</button>
            </div>
          </div>
          <div style={{display:'grid',gap:8}}>
            {deptsAdmin.map((d,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'#fff',borderRadius:10,border:'1px solid #e2e8f0'}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:'#2563eb',flexShrink:0}}/>
                <span style={{flex:1,fontWeight:600,color:NAVY,fontSize:14}}>{d}</span>
                <button type="button" onClick={()=>{if(!confirm('Excluir "'+d+'"?')) return;const nd=deptsAdmin.filter((_,j)=>j!==i);setDeptsAdmin(nd);localStorage.setItem('ep_departamentos_admin',JSON.stringify(nd));localStorage.setItem('ep_departamentos',JSON.stringify(nd.map((n,k)=>({id:k+1,nome:n,cor:'#2563eb'}))));}} style={{padding:'4px 10px',borderRadius:6,background:'#FEF2F2',color:'#dc2626',border:'none',cursor:'pointer',fontSize:12}}>🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {aba==='perfis'&&(
        <div>
          <h3 style={{color:NAVY,margin:'0 0 20px',fontSize:16}}>👔 Perfis do Sistema</h3>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:12,fontWeight:700,color:'#888',textTransform:'uppercase',marginBottom:10}}>Perfis Padrão</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
              {PERFIS.map(p=>(<div key={p.id} style={{padding:'12px 16px',background:'#fff',borderRadius:10,border:`2px solid ${p.cor}33`,display:'flex',alignItems:'center',gap:10}}><div style={{width:12,height:12,borderRadius:'50%',background:p.cor}}/><div style={{flex:1}}><div style={{fontWeight:700,color:p.cor,fontSize:13}}>{p.label}</div><div style={{fontSize:11,color:'#888'}}>{PERFIS_PADRAO[p.id]?.abas?.length||0} abas</div></div></div>))}
            </div>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:'#888',textTransform:'uppercase',marginBottom:10}}>Perfis Customizados</div>
            <div style={{background:'#fff',borderRadius:12,padding:16,border:'1px solid #e2e8f0',marginBottom:12}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10,alignItems:'end'}}>
                <input value={formPerfil.nome} onChange={e=>setFormPerfil(f=>({...f,nome:e.target.value}))} placeholder="Nome do novo perfil..." style={{width:'100%',padding:'8px 10px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,boxSizing:'border-box'}}/>
                <button type="button" onClick={()=>{if(!formPerfil.nome.trim()) return;const np={id:'custom_'+Date.now(),label:formPerfil.nome,cor:formPerfil.cor||'#2563eb',custom:true};const lista=[...perfisCustom,np];setPerfisCustom(lista);localStorage.setItem('ep_perfis_custom',JSON.stringify(lista));setFormPerfil({nome:'',cor:'#2563eb'});alert('✅ Perfil criado!');}} style={{padding:'8px 16px',borderRadius:8,background:NAVY,color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:13}}>+ Criar</button>
              </div>
              <div style={{display:'flex',gap:6,marginTop:10}}>{['#dc2626','#2563eb','#16a34a','#f59e0b','#7c3aed','#0891b2'].map(cor=>(<div key={cor} onClick={()=>setFormPerfil(f=>({...f,cor}))} style={{width:24,height:24,borderRadius:'50%',background:cor,cursor:'pointer',border:formPerfil.cor===cor?'3px solid #000':'2px solid transparent'}}/>))}</div>
            </div>
            {perfisCustom.length===0?<div style={{textAlign:'center',padding:20,color:'#aaa',fontSize:13}}>Nenhum perfil customizado.</div>:<div style={{display:'grid',gap:8}}>{perfisCustom.map((p,i)=>(<div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'#fff',borderRadius:10,border:`2px solid ${p.cor}33`}}><div style={{width:12,height:12,borderRadius:'50%',background:p.cor,flexShrink:0}}/><span style={{flex:1,fontWeight:700,color:p.cor,fontSize:13}}>{p.label}</span><button type="button" onClick={()=>{const nl=perfisCustom.filter((_,j)=>j!==i);setPerfisCustom(nl);localStorage.setItem('ep_perfis_custom',JSON.stringify(nl));}} style={{padding:'4px 10px',borderRadius:6,background:'#FEF2F2',color:'#dc2626',border:'none',cursor:'pointer',fontSize:12}}>🗑️</button></div>))}</div>}
          </div>
        </div>
      )}
      {aba==='notificacoes'&&(
        <div>
          <h3 style={{color:NAVY,margin:'0 0 6px',fontSize:16}}>🔔 Notificações Automáticas</h3>
          <p style={{color:'#888',fontSize:12,marginBottom:16}}>Quando obrigações vencem ou a IA detecta atraso, notifica o responsável via popup, e-mail e WhatsApp.</p>
          <div style={{background:'#fff',borderRadius:12,padding:18,border:'1px solid #e2e8f0',marginBottom:16}}>
            <div style={{fontWeight:700,color:NAVY,fontSize:13,marginBottom:12}}>➕ Nova Regra</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:10}}>
              <div><label style={{fontSize:11,fontWeight:600,color:'#555',display:'block',marginBottom:4}}>Departamento</label><select value={notifForm.dep} onChange={e=>setNotifForm(f=>({...f,dep:e.target.value}))} style={{width:'100%',padding:'8px 10px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,background:'#fff'}}><option value=''>— Todos —</option>{deptsAdmin.map(d=><option key={d}>{d}</option>)}</select></div>
              <div><label style={{fontSize:11,fontWeight:600,color:'#555',display:'block',marginBottom:4}}>Gatilho</label><select value={notifForm.gatilho} onChange={e=>setNotifForm(f=>({...f,gatilho:e.target.value}))} style={{width:'100%',padding:'8px 10px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,background:'#fff'}}><option value='vencimento_7d'>7 dias antes do vencimento</option><option value='vencimento_3d'>3 dias antes do vencimento</option><option value='vencimento_hoje'>Vence hoje (urgente)</option><option value='vencimento_passou'>Obrigação vencida</option><option value='ia_detecta'>IA Claude detecta atraso</option><option value='entregue'>Obrigação entregue</option></select></div>
            </div>
            <div style={{display:'flex',gap:16,marginBottom:12}}>{[['popup','🔔 Popup'],['email','📧 E-mail'],['whatsapp','💬 WhatsApp']].map(([k,l])=>(<label key={k} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:13}}><input type="checkbox" checked={notifForm[k]!==false} onChange={e=>setNotifForm(f=>({...f,[k]:e.target.checked}))} style={{accentColor:NAVY}}/>{l}</label>))}</div>
            <button type="button" onClick={()=>{const nova={id:Date.now(),...notifForm};const lista=[...notifRules,nova];setNotifRules(lista);localStorage.setItem('ep_notif_rules',JSON.stringify(lista));alert('✅ Regra salva!');}} style={{padding:'8px 20px',borderRadius:8,background:NAVY,color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:13}}>Salvar Regra</button>
          </div>
          {notifRules.length===0?<div style={{textAlign:'center',padding:24,color:'#aaa',fontSize:13,background:'#f8f9fb',borderRadius:10}}>Nenhuma regra configurada.</div>:<div style={{display:'grid',gap:8}}>{notifRules.map((r,i)=>{const GL={vencimento_7d:'7d antes',vencimento_3d:'3d antes',vencimento_hoje:'Hoje',vencimento_passou:'Vencida',ia_detecta:'IA Claude',entregue:'Entregue'};return <div key={r.id} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',background:'#fff',borderRadius:10,border:'1px solid #e2e8f0'}}><div style={{flex:1}}><div style={{fontWeight:700,color:NAVY,fontSize:13}}>{r.dep||'Todos os departamentos'}</div><div style={{fontSize:11,color:'#888',marginTop:2}}>Gatilho: {GL[r.gatilho]||r.gatilho}{r.popup?' 🔔':''}{r.email?' 📧':''}{r.whatsapp?' 💬':''}</div></div><button type="button" onClick={()=>{const nl=notifRules.filter((_,j)=>j!==i);setNotifRules(nl);localStorage.setItem('ep_notif_rules',JSON.stringify(nl));}} style={{padding:'4px 10px',borderRadius:6,background:'#FEF2F2',color:'#dc2626',border:'none',cursor:'pointer',fontSize:12}}>🗑️</button></div>})}</div>}
        </div>
      )}
            {aba==='permissoes' && (
        <div>
          <div style={{ background:'#fff', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)', marginBottom:16 }}>
            <div style={{ fontWeight:700, color:NAVY, marginBottom:16, fontSize:15 }}>🔐 Matriz de Permissões por Perfil</div>
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
                    <React.Fragment key={grupo}>
                      <tr style={{ background:'#f1f5f9' }}>
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
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ background:'#fff', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ fontWeight:700, color:NAVY, marginBottom:16, fontSize:15 }}>📋 Acesso às Abas por Perfil</div>
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
                    <React.Fragment key={grupo}>
                      <tr style={{ background:'#f1f5f9' }}>
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
                    </React.Fragment>
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
            <div style={{ fontWeight:700, color:NAVY, marginBottom:16 }}>ℹ️ Informações do Sistema</div>
            {[
              ['Escritório','EPimentel Auditoria & Contabilidade Ltda'],
              ['CRC','CRC/GO 026.994/O-8'],
              ['Responsável','Eduardo Pimentel'],
              ['Cidade','Goiânia - GO'],
              ['Backend','Python 3.13 / FastAPI'],
              ['Frontend','React 18 / Vite'],
              ['Logado como',userAtual?.nome||'—'],
              ['Módulos',ABAS_SISTEMA.length+' abas'],
              ['Usuários cadastrados', usuarios.length],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', padding:'8px 0', borderBottom:'1px solid #f8fafc' }}>
                <span style={{ color:'#888', fontSize:13, width:200 }}>{k}</span>
                <span style={{ fontSize:13, fontWeight:500, color:NAVY }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Config e-mail */}
          <div style={{ background:'#fff', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ fontWeight:700, color:NAVY, marginBottom:8 }}>📧 Configuração de E-mail (Convites)</div>
            <p style={{ fontSize:12, color:'#888', marginBottom:12 }}>
              Para o envio de convites funcionar, configure as variáveis no Railway → Variables:
            </p>
            {[
              ['EMAIL_HOST', 'smtp.gmail.com'],
              ['EMAIL_PORT', '587'],
              ['EMAIL_USER', 'seu@gmail.com'],
              ['EMAIL_PASSWORD', 'senha-de-app-google'],
              ['EMAIL_FROM_NAME', 'EPimentel Sistema'],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid #f8fafc' }}>
                <code style={{ background:'#f1f5f9', padding:'2px 8px', borderRadius:4, fontSize:12, color:NAVY, minWidth:180 }}>{k}</code>
                <span style={{ fontSize:11, color:'#aaa' }}>ex: {v}</span>
              </div>
            ))}
            <div style={{ marginTop:12, padding:'10px 14px', background:'#fffbeb', borderRadius:8, border:'1px solid #fde68a', fontSize:12, color:'#92400e' }}>
              ⚠️ Para Gmail: ative "Verificação em duas etapas" e gere uma <strong>Senha de App</strong> em myaccount.google.com → Segurança → Senhas de App
            </div>
          </div>

          <div style={{ background:'#fffbeb', borderRadius:12, padding:16, border:'1px solid #fde68a', fontSize:13, color:'#92400e' }}>
            ⚙️ Configurações locais: <code style={{ background:'#fef3c7', padding:'1px 6px', borderRadius:3 }}>C:\sistema_obrigacoes\backend\.env</code>
          </div>
        </div>
      )}

      {/* MODAL DE USUÁRIO */}
      {modal!==null && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div style={{ background:'#fff', borderRadius:14, width:660, maxHeight:'93vh', display:'flex', flexDirection:'column', boxShadow:'0 8px 32px rgba(0,0,0,.2)' }}>
            <div style={{ padding:'16px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:700, fontSize:16, color:NAVY }}>{modal==='novo'?'➕ Novo Usuário':'✏️ Editar Usuário'}</div>
              <button onClick={() => setModal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#888' }}><X size={20}/></button>
            </div>

            {/* Sub-abas */}
            <div style={{ display:'flex', background:'#f8fafc', borderBottom:'1px solid #f1f5f9' }}>
              {[
                {id:'dados',    label:'👤 Dados'},
                {id:'abas',     label:'📋 Abas'},
                {id:'perms',    label:'🔐 Permissões'},
                {id:'clientes', label:`👥 Clientes (${qtdClientesPermitidos})`},
              ].map(({id,label}) => (
                <button key={id} onClick={() => setAbaModal(id)} style={{
                  padding:'10px 14px', border:'none', background:'transparent',
                  color:abaModal===id?NAVY:'#888', fontSize:12, fontWeight:abaModal===id?600:400,
                  cursor:'pointer', borderBottom:abaModal===id?`2px solid ${GOLD}`:'2px solid transparent',
                  whiteSpace:'nowrap',
                }}>{label}</button>
              ))}
            </div>

            <div style={{ padding:'20px 24px', overflowY:'auto', flex:1 }}>

              {/* DADOS */}
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
                    <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>WhatsApp</label>
                    <input value={form.whatsapp||''} onChange={e=>setForm(f=>({...f,whatsapp:e.target.value}))} placeholder="(62) 99999-9999"
                      style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:13, boxSizing:'border-box' }}/>
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>Departamento</label>
                    <select value={form.departamento||''} onChange={e=>setForm(f=>({...f,departamento:e.target.value}))}
                      style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:13, boxSizing:'border-box', background:'#fff' }}>
                      <option value=''>— Selecionar —</option>
                      {getDepartamentos().map(d=><option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:8 }}>Perfil base</label>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {PERFIS.map(p => (
                        <button key={p.id} onClick={() => aplicarPerfil(p.id)} style={{
                          flex:1, padding:'9px', border:`2px solid ${form.perfil===p.id?p.cor:'#e2e8f0'}`,
                          borderRadius:8, background:form.perfil===p.id?p.cor+'15':'#fff',
                          color:form.perfil===p.id?p.cor:'#64748b', cursor:'pointer', fontSize:12, fontWeight:form.perfil===p.id?600:400, minWidth:80,
                        }}>{p.label}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:6 }}>
                      Perfis adicionais <span style={{fontWeight:400,color:'#aaa',fontSize:11}}>(opcional)</span>
                    </label>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {PERFIS.filter(p=>p.id!==form.perfil).map(p => {
                        const ativo = (form.perfis_extras||[]).includes(p.id)
                        return (
                          <label key={p.id} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
                            border:`1px solid ${ativo?p.cor:'#e2e8f0'}`, borderRadius:20,
                            background:ativo?p.cor+'15':'#f8fafc', cursor:'pointer', fontSize:12, color:ativo?p.cor:'#64748b' }}>
                            <input type="checkbox" checked={ativo} style={{margin:0}}
                              onChange={e=>setForm(f=>({...f,perfis_extras:e.target.checked
                                ?[...(f.perfis_extras||[]),p.id]
                                :(f.perfis_extras||[]).filter(x=>x!==p.id)}))}/>
                            {p.label}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                  <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
                    <input type="checkbox" checked={form.ativo!==false} onChange={e => setForm(f=>({...f,ativo:e.target.checked}))}/>
                    Usuário ativo (pode fazer login)
                  </label>
                </div>
              )}

              {/* ABAS */}
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

              {/* PERMISSÕES */}
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

              {/* CLIENTES */}
              {abaModal==='clientes' && (
                <div>
                  <div style={{ padding:'10px 14px', background:'#f0f9ff', borderRadius:8, border:'1px solid #bae6fd', fontSize:12, color:'#0369a1', marginBottom:14 }}>
                    💡 Defina quais clientes este usuário pode visualizar em Processos, Tarefas, Certidões e outros módulos.
                    <strong> "Todos"</strong> = acesso irrestrito.
                  </div>

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <span style={{ fontSize:13, color:'#888' }}>
                      {form.clientes_permitidos === null
                        ? `Acesso a todos os clientes (${clientes.length})`
                        : `${form.clientes_permitidos?.length || 0} de ${clientes.length} clientes`}
                    </span>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => setTodosClientes(true)} style={{ fontSize:11, padding:'4px 10px', borderRadius:6, background:form.clientes_permitidos===null?NAVY:'#f1f5f9', color:form.clientes_permitidos===null?'#fff':'#555', border:'none', cursor:'pointer', fontWeight:form.clientes_permitidos===null?600:400 }}>
                        Todos
                      </button>
                      <button onClick={() => setTodosClientes(false)} style={{ fontSize:11, padding:'4px 10px', borderRadius:6, background:form.clientes_permitidos!==null?'#fef2f2':'#f1f5f9', color:form.clientes_permitidos!==null?'#dc2626':'#555', border:'none', cursor:'pointer', fontWeight:form.clientes_permitidos!==null?600:400 }}>
                        Personalizado
                      </button>
                    </div>
                  </div>

                  {form.clientes_permitidos !== null && (
                    <>
                      <input
                        value={buscaCliente}
                        onChange={e => setBuscaCliente(e.target.value)}
                        placeholder="🔍 Buscar cliente..."
                        style={{ width:'100%', padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, marginBottom:10, boxSizing:'border-box' }}
                      />
                      {clientes.length === 0 && (
                        <div style={{ textAlign:'center', color:'#aaa', padding:20, fontSize:13 }}>
                          Nenhum cliente carregado. Verifique a conexão com o backend.
                        </div>
                      )}
                      <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:320, overflowY:'auto' }}>
                        {clientesFiltrados.map(cli => {
                          const permitido = form.clientes_permitidos?.includes(cli.id)
                          return (
                            <label key={cli.id} onClick={() => toggleClientePermitido(cli.id)} style={{
                              display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, cursor:'pointer',
                              background:permitido?'#f0fdf4':'#f8fafc',
                              border:`1px solid ${permitido?'#86efac':'#e2e8f0'}`,
                            }}>
                              <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${permitido?'#22c55e':'#cbd5e1'}`, background:permitido?'#22c55e':'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                {permitido && <Check size={12} color="#fff"/>}
                              </div>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:13, fontWeight:500, color:'#334155' }}>{cli.nome}</div>
                                {cli.cnpj && <div style={{ fontSize:10, color:'#aaa' }}>{cli.cnpj}</div>}
                              </div>
                              {cli.regime && <span style={{ fontSize:10, background:'#f1f5f9', color:'#64748b', padding:'1px 7px', borderRadius:10 }}>{cli.regime}</span>}
                            </label>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {msg && <div style={{ padding:'8px 24px', background:msg.includes('✅')?'#f0fdf4':'#fef2f2', fontSize:13, color:msg.includes('✅')?'#16a34a':'#dc2626' }}>{msg}</div>}

            <div style={{ padding:'14px 24px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'flex-end', gap:10, background:'#fafafa' }}>
              <button onClick={() => setModal(null)} style={{ padding:'9px 18px', border:'1px solid #e2e8f0', borderRadius:7, background:'#fff', cursor:'pointer', fontSize:13 }}>Cancelar</button>
              <button onClick={salvar} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 20px', background:NAVY, color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontSize:13, fontWeight:500 }}>
                <Save size={14}/> Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONVITE POR E-MAIL */}
      {modalConvite && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:400 }}>
          <div style={{ background:'#fff', borderRadius:14, width:440, padding:28, boxShadow:'0 8px 32px rgba(0,0,0,.2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <div style={{ fontWeight:700, fontSize:16, color:NAVY }}>📧 Enviar Convite de Acesso</div>
              <button onClick={() => setModalConvite(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#aaa' }}><X size={18}/></button>
            </div>

            <div style={{ padding:'12px 16px', background:'#f8fafc', borderRadius:10, marginBottom:16 }}>
              <div style={{ fontWeight:600, color:NAVY, fontSize:14 }}>{modalConvite.nome}</div>
              <div style={{ fontSize:12, color:'#888', marginTop:2 }}>{modalConvite.email}</div>
            </div>

            <div style={{ fontSize:13, color:'#555', marginBottom:16, lineHeight:1.6 }}>
              Será enviado um e-mail para <strong>{modalConvite.email}</strong> com:
              <ul style={{ marginTop:8, paddingLeft:18 }}>
                <li>URL de acesso ao sistema</li>
                <li>Login: <strong>{modalConvite.usuario}</strong></li>
                <li>Senha (inicial)</li>
              </ul>
            </div>

            <div style={{ padding:'10px 14px', background:'#fffbeb', borderRadius:8, border:'1px solid #fde68a', fontSize:12, color:'#92400e', marginBottom:18 }}>
              ⚠️ Para funcionar, configure as variáveis de e-mail no Railway (veja aba ⚙️ Sistema).
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setModalConvite(null)} style={{ padding:'9px 16px', border:'1px solid #e2e8f0', borderRadius:7, background:'#fff', cursor:'pointer', fontSize:13 }}>Cancelar</button>
              <button onClick={() => enviarConvite(modalConvite)} disabled={enviandoConvite}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 20px', background:enviandoConvite?'#94a3b8':'#0ea5e9', color:'#fff', border:'none', borderRadius:7, cursor:enviandoConvite?'default':'pointer', fontSize:13, fontWeight:600 }}>
                {enviandoConvite ? '⏳ Enviando...' : <><Send size={14}/> Enviar Convite</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
