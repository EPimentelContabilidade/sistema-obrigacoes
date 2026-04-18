import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, Plus, X, Save, ChevronLeft, ChevronRight, User, MapPin, Phone, CheckCircle, Zap, Trash2, Eye, EyeOff, ExternalLink, Shield, FileText } from 'lucide-react'
import GerarObrigacoes from './GerarObrigacoes'
import AbaDocumentos from '../components/AbaDocumentos'
import { OBRIGACOES_SISTEMA } from './obrigacoes_data'

const NAVY = '#1B2A4A'
const GOLD  = '#C5A55A'
const API   = window.location.hostname === 'localhost' ? '/api/v1' : 'https://sistema-obrigacoes-production.up.railway.app/api/v1'

const inp = { padding:'7px 10px', borderRadius:6, border:'1px solid #ddd', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', color:'#333' }
const sel = { ...inp, cursor:'pointer', background:'#fff' }

export const TRIBUTACOES = ['Simples Nacional','MEI','Lucro Real','Lucro Presumido','RET','Imune/Isento','Produtor Rural','Condomínio','Autônomo','Social/IRH']

// Obrigações obrigatórias por regime (IDs corretos do obrigacoes_data.js)
const REGIME_OBRIG_AUTO = {
  'Simples Nacional': [29, 35, 37, 57, 87, 47, 51, 32, 42, 60, 56, 68, 84, 86],
  'MEI':              [30, 31],
  'Lucro Real':       [18, 19, 20, 22, 23, 27, 48, 51, 97, 96, 42, 43, 47, 32, 60, 56, 68, 84, 86],
  'Lucro Presumido':  [18, 19, 20, 22, 23, 27, 48, 51, 42, 43, 47, 32, 60, 56, 68, 84, 86],
  'RET':              [28, 42, 40, 96],
  'Imune/Isento':     [47, 51, 32, 42, 60, 56, 68, 84, 86],
  'Produtor Rural':   [61, 47, 51, 42, 60, 56, 68, 84, 86],
  'Condomínio':       [46, 47, 51, 32, 42, 60, 56, 68, 84, 86],
  'Autônomo':         [9,  42, 68],
  // Social/IRH: todas as obrigações do Departamento Pessoal
  'Social/IRH':       [2, 4, 5, 8, 13, 14, 15, 17, 32, 36, 42, 43, 47, 51, 53, 54, 55, 56, 59, 60, 63, 67, 68, 71, 72, 83, 84, 85, 86, 88, 89, 90, 91, 92, 93, 94, 100],
}

// Retorna lista de objetos de obrigação filtrada pelo regime
export function obrigacoesPorTributacao(regime) {
  try {
    // 1. Tentar catálogo customizado no localStorage
    const mapa = {'Simples Nacional':'Simples Nacional','MEI':'MEI','Lucro Presumido':'Lucro Presumido','Lucro Real':'Lucro Real','RET':'RET/Imobiliário','Imune/Isento':'Simples Nacional'}
    const chave = mapa[regime] || regime
    const cat = JSON.parse(localStorage.getItem('ep_obrigacoes_catalogo_v2') || 'null')
    if (cat?.[chave]?.length > 0) return cat[chave].filter(o => o.ativo !== false)
  } catch {}
  // 2. Fallback: usar OBRIGACOES_SISTEMA filtrado pelo regime
  const ids = REGIME_OBRIG_AUTO[regime] || []
  if (ids.length > 0) return OBRIGACOES_SISTEMA.filter(o => ids.includes(o.id) && o.ativa !== false)
  // 3. Sem mapeamento: retornar todas as obrigações ativas
  return OBRIGACOES_SISTEMA.filter(o => o.ativa !== false)
}

function obrigsCatalogo(regime) {
  try {
    const mapa = {'Simples Nacional':'Simples Nacional','MEI':'MEI','Lucro Presumido':'Lucro Presumido','Lucro Real':'Lucro Real','RET':'RET/Imobiliário','Imune/Isento':'Simples Nacional'}
    const chave = mapa[regime] || regime
    const cat = JSON.parse(localStorage.getItem('ep_obrigacoes_catalogo_v2') || 'null')
    if (cat?.[chave]?.length > 0) return cat[chave].filter(o => o.ativo !== false)
  } catch {}
  // Retornar objetos do OBRIGACOES_SISTEMA para o regime
  const ids = REGIME_OBRIG_AUTO[regime] || []
  return OBRIGACOES_SISTEMA.filter(o => ids.includes(o.id) && o.ativa !== false)
}

const CREDS_VAZIO = {
  // Certificado Digital do cliente
  cert_arquivo:'', cert_senha:'', cert_tipo:'e-CNPJ', cert_titular:'', cert_cnpj_cpf:'',
  cert_validade:'', cert_emissora:'', cert_serie:'',
  // Acesso via procuração (usa cert. do escritório)
  proc_ativa:false,
  proc_arquivo:'', proc_data:'', proc_validade:'',
  proc_orgaos:[], // e-CAC, SEFAZ, Prefeitura, Simples Nacional, etc.
  proc_obs:'',
  // Prefeitura
  pref_login:'', pref_senha:'', pref_url:'',
  // Emissor Nacional
  en_cpfcnpj:'', en_senha:'',
  // Simples Nacional
  sn_codigo:'', sn_cpf_resp:'',
  // e-CAC / Receita Federal
  ecac_cpfcnpj:'', ecac_codigo_acesso:'', ecac_cert:false,
  // Domínio
  dominio_empresa:'', dominio_usuario:'', dominio_senha:'',
  outros:[]
}

const ORGAOS_PROC = ['e-CAC (Receita Federal)','SEFAZ Estadual','Prefeitura / NFS-e','Portal Simples Nacional','Junta Comercial','INSS / eSocial','FGTS / Caixa','Outro']
const CERT_EMISSORAS = ['Serasa','Certisign','Soluti','Valid','Safeweb','ICP-Brasil','Outro']

const ABA_TABS = [
  { id:'dados',        label:'📋 Dados',        icon:User },
  { id:'endereco',     label:'📍 Endereço',     icon:MapPin },
  { id:'responsavel',  label:'👤 Responsável',  icon:User },
  { id:'comunicacao',  label:'📱 Comunicação',  icon:Phone },
  { id:'credenciais',  label:'🔐 Credenciais',  icon:Shield },
  { id:'docs',          label:'📎 DOCs',          icon:FileText },
]

const FORM_VAZIO = {
  tipoCadastro:'CNPJ', nome:'', cnpj:'', email:'', whatsapp:'', telefone:'',
  regime:'Simples Nacional', tributacao:'Simples Nacional', grupo:'', nome_fantasia:'',
  data_abertura:'', inscricao_municipal:'', inscricao_estadual:'',
  cnaes:[], cnae_principal:'', cnae_secundarios:[],
  cep:'', logradouro:'', numero:'', complemento:'', bairro:'', cidade:'', estado:'',
  responsaveis:[], contatos:[],
  canal_padrao:'whatsapp', valor_honorario:0,
  email_nfe:'', email_folha:'', socios:[],
  obrigacoes_vinculadas:[], obrigacoes_catalogo:[], observacoes:'', ativo:true,
  credenciais:{ ...CREDS_VAZIO }
}

const cores_trib = { 'Simples Nacional':'#EBF5FF:#1D6FA4','MEI':'#FEF9C3:#854D0E','Lucro Real':'#F3EEFF:#6B3EC9','Lucro Presumido':'#EDE9FF:#5b21b6','RET':'#EDFBF1:#1A7A3C','Imune/Isento':'#F9FAFB:#6B7280' }
const cTrib = (t) => { const [bg,c]=(cores_trib[t]||'#f5f5f5:#666').split(':'); return {bg,c} }

function SenhaInput({ value, onChange, placeholder='••••••••', disabled, ...props }) {
  const [show, setShow] = useState(false)
  const ref = useRef(null)
  useEffect(()=>{
    if(ref.current&&ref.current.value&&!value){const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(ref.current,'');ref.current.dispatchEvent(new Event('input',{bubbles:true}))}
  },[])
  return (
    <div style={{ position:'relative' }}>
      <input
        ref={ref}
        type={show?'text':'password'}
        value={value||''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="new-password"
        readOnly={false}
        style={{ ...inp, paddingRight:36, ...props.style }}
      />
      <button type="button" onClick={()=>setShow(s=>!s)} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#aaa' }}>
        {show?<EyeOff size={15}/>:<Eye size={15}/>}
      </button>
    </div>
  )
}

export default function Clientes() {
  const [clientes, setClientes]     = useState([])
  const [form, setForm]             = useState({...FORM_VAZIO, responsaveis:[], contatos:[], credenciais:{...CREDS_VAZIO}})
  const certFileRef = useRef(null)
  const [editId, setEditId]         = useState(null)
  const [aba, setAba]               = useState('lista')
  const [abaForm, setAbaForm]       = useState('dados')
  const [busca,        setBusca]        = useState('')
  const [filtroRegimes, setFiltroRegimes] = useState([])   // multi
  const [filtroStatus,  setFiltroStatus]  = useState('')
  const [filtroGrupos,  setFiltroGrupos]  = useState([])   // multi
  const [buscandoCNPJ, setBuscandoCNPJ] = useState(false)
  const [cnpjDados,    setCnpjDados]    = useState(null)
  const [modalObrig,   setModalObrig]   = useState(false)
  const [modalGerar,   setModalGerar]   = useState(false)
  const [modalExcluir, setModalExcluir] = useState(null)
  const [abaObrig,     setAbaObrig]     = useState('lista')
  const [buscaObrig,   setBuscaObrig]   = useState('')
  const [deptSel,      setDeptSel]      = useState('Todos')
  const [mostrarSenhas, setMostrarSenhas] = useState({})
  // Obrigação avulsa
  const [modalAvulsa, setModalAvulsa] = useState(false)
  const AVULSA0 = { nome:'', descricao:'', data_vencimento:'', data_competencia:'', departamento:'Fiscal', responsavel:'Eduardo Pimentel', obs:'' }
  const [formAvulsa, setFormAvulsa] = useState(AVULSA0)

  useEffect(() => { carregarClientes() }, [])

  const carregarClientes = async () => {
    try {
      const local = localStorage.getItem('ep_clientes')
      if (local) { const p=JSON.parse(local); if(p?.length>0) setClientes(p) }
    } catch {}
    try {
      const r = await fetch(`${API}/clientes/`)
      if (r.ok) {
        const d = await r.json()
        const back = d.clientes||d||[]
        if (back.length>0) {
          const local = JSON.parse(localStorage.getItem('ep_clientes')||'[]')
          const merged = back.map(bc=>{ const lc=local.find(x=>String(x.id)===String(bc.id)); return lc?{...bc,...lc}:bc })
          local.forEach(lc=>{ if(!merged.find(m=>String(m.id)===String(lc.id))) merged.push(lc) })
          setClientes(merged); localStorage.setItem('ep_clientes',JSON.stringify(merged))
        }
      }
    } catch {}
  }

  const setF = (k,v) => setForm(f=>({...f,[k]:v}))
  const setC = (k,v) => setForm(f=>({...f, credenciais:{...(f.credenciais||{}), [k]:v}}))

  const handleCnpjChange = async (v) => {
    const digits = v.replace(/\D/g,'')
    setF('cnpj', v)
    if (digits.length === 14) {
      setF('tipoCadastro','CNPJ')
      try {
        setBuscandoCNPJ(true)
        const r = await fetch('https://brasilapi.com.br/api/cnpj/v1/'+digits)
        if (r.ok) {
          const d = await r.json()
          setCnpjDados(d)
          setForm(f => ({
            ...f, cnpj: v, tipoCadastro: 'CNPJ',
            nome: d.razao_social || f.nome,
            nome_fantasia: d.nome_fantasia || f.nome_fantasia,
            logradouro: d.logradouro || f.logradouro,
            numero: d.numero || f.numero,
            complemento: d.complemento || f.complemento,
            bairro: d.bairro || f.bairro,
            municipio: d.municipio || f.municipio,
            cidade: d.municipio || f.cidade,
            uf: d.uf || f.uf, estado: d.uf || f.estado,
            cep: (d.cep||'').replace(/\D/g,'') || f.cep,
            cnae: d.cnae_fiscal ? String(d.cnae_fiscal) : f.cnae,
            cnae_principal: d.cnae_fiscal_descricao || f.cnae_principal,
            cnaes_secundarios: d.cnaes_secundarias?.map(c=>c.codigo+' '+c.descricao).join('; ') || f.cnaes_secundarios,
            natureza_juridica: d.natureza_juridica || f.natureza_juridica,
            porte: d.porte || f.porte,
            capital_social: d.capital_social ? String(d.capital_social) : f.capital_social,
            situacao_receita: d.descricao_situacao_cadastral || f.situacao_receita,
            situacao_cadastral: d.descricao_situacao_cadastral || f.situacao_cadastral,
            data_inicio: d.data_inicio_atividade || f.data_inicio,
            data_abertura: d.data_inicio_atividade || f.data_abertura,
            email: d.email || f.email,
            telefone: d.ddd_telefone_1 ? '('+d.ddd_telefone_1+') '+(d.telefone_1||'') : f.telefone,
          }))
        }
      } catch(e) { console.warn('BrasilAPI CNPJ:', e) }
      finally { setBuscandoCNPJ(false) }
    }
    else if (digits.length === 11) setF('tipoCadastro','CPF')
    else if (digits.length === 20) setF('tipoCadastro','CAEPF')
  }
  const salvarGrupoLS = (nomeGrupo) => {
    if (!nomeGrupo?.trim()) return
    try {
      const grupos = JSON.parse(localStorage.getItem('ep_grupos_cadastrados')||'[]')
      if (!grupos.includes(nomeGrupo.trim())) { grupos.push(nomeGrupo.trim()); localStorage.setItem('ep_grupos_cadastrados', JSON.stringify(grupos)) }
    } catch {}
  }
  const listarGruposLS = () => { try { return JSON.parse(localStorage.getItem('ep_grupos_cadastrados')||'[]') } catch { return [] } }

  const onTributacaoChange = (novoRegime) => {
    setF('tributacao', novoRegime); setF('regime', novoRegime)
    // Buscar obrigações do catálogo (conf. tarefas) ou fallback REGIME_OBRIG_AUTO
    const obrigsCat = obrigacoesPorTributacao(novoRegime)
    const obrigIds  = obrigsCat.length > 0
      ? obrigsCat.map(o => o.id || o.codigo)
      : (REGIME_OBRIG_AUTO[novoRegime] || [])
    if (!editId) {
      // Cliente NOVO: auto-preencher com obrigações do regime
      if (obrigIds.length > 0) {
        setF('obrigacoes_vinculadas', obrigIds)
        setF('obrigacoes_catalogo', obrigsCat)
      }
    } else {
      // Cliente EXISTENTE: perguntar se quer sincronizar
      if (obrigIds.length > 0 && confirm(
        'Sincronizar obrigações com o regime "' + novoRegime + '"?\n\n' +
        obrigsCat.slice(0,5).map(o=>o.nome).join(', ') +
        (obrigsCat.length > 5 ? ' ...' : '') +
        '\n\nIsso substituirá as obrigações vinculadas atuais.'
      )) {
        setF('obrigacoes_vinculadas', obrigIds)
        setF('obrigacoes_catalogo', obrigsCat)
      }
    }
  }

  const gerarObrigacoes = () => {
    if (!form.tributacao) return
    // Prioridade 1: catálogo da conf. tarefas (ep_obrigacoes_catalogo_v2)
    const cat = obrigacoesPorTributacao(form.tributacao)
    const todas = cat.length > 0
      ? cat.map(o => o.id || o.codigo)
      : (REGIME_OBRIG_AUTO[form.tributacao] || [])
    const catalogo = cat.length > 0 ? cat : obrigsCatalogo(form.tributacao)
    setF('obrigacoes_vinculadas', todas)
    setF('obrigacoes_catalogo', catalogo)
    if (editId) {
      const updated = JSON.parse(localStorage.getItem('ep_clientes')||'[]').map(c =>
        String(c.id)===String(editId) ? {...c, obrigacoes_vinculadas:todas, obrigacoes_catalogo:catalogo} : c
      )
      localStorage.setItem('ep_clientes', JSON.stringify(updated))
      setClientes(updated)
    }
  }

  // ── BUSCA CNPJ COMPLETO na Receita Federal ────────────────────────────────
  const buscarCNPJ = async () => {
    if (!form.cnpj || form.cnpj.replace(/\D/g,'').length<14) return
    setBuscandoCNPJ(true); setCnpjDados(null)
    try {
      const cnpj = form.cnpj.replace(/\D/g,'')
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
      if (r.ok) {
        const d = await r.json()
        setCnpjDados(d)
        const cnaePrincipal = d.cnae_fiscal_descricao ? `${d.cnae_fiscal} - ${d.cnae_fiscal_descricao}` : ''
        const cnaesSecundarios = (d.cnaes_secundarios||[]).map(c=>`${c.codigo} - ${c.descricao}`)
        setForm(f=>({
          ...f,
          nome: d.razao_social||f.nome,
          nome_fantasia: d.nome_fantasia||f.nome_fantasia,
          logradouro: d.logradouro||f.logradouro,
          numero: d.numero||f.numero,
          complemento: d.complemento||f.complemento,
          bairro: d.bairro||f.bairro,
          cidade: d.municipio||f.cidade,
          estado: d.uf||f.estado,
          cep: d.cep||f.cep,
          data_abertura: d.data_inicio_atividade||f.data_abertura,
          cnae_principal: cnaePrincipal,
          cnae_secundarios: cnaesSecundarios,
          cnaes: [cnaePrincipal, ...cnaesSecundarios].filter(Boolean),
          email: d.email||f.email,
          telefone: d.ddd_telefone_1?`(${d.ddd_telefone_1})`:f.telefone,
          capital_social: d.capital_social,
          porte: d.porte,
          natureza_juridica: d.natureza_juridica,
          situacao_cadastral: d.descricao_situacao_cadastral,
          data_situacao: d.data_situacao_cadastral,
          socios: (d.qsa||[]).map(s=>({nome:s.nome_socio, qualificacao:s.qualificacao_socio})),
          tipoCadastro: 'CNPJ'
        }))
        try { localStorage.setItem('ep_rf_'+(form.cnpj||'').replace(/\D/g,''), JSON.stringify(d)); if(form.grupo) salvarGrupoLS(form.grupo) } catch {}
      }
    } catch (e) { console.error('CNPJ:', e) }
    setBuscandoCNPJ(false)
  }

  const salvar = async () => {
    // Validar CNPJ duplicado
    const cnpjLimpo = (form.cnpj||'').replace(/\D/g,'')
    if (cnpjLimpo.length >= 11) {
      const duplicado = clientes.find(c => {
        if (editId && String(c.id) === String(editId)) return false
        return (c.cnpj||'').replace(/\D/g,'') === cnpjLimpo
      })
      if (duplicado) {
        alert(`⚠️ CNPJ já cadastrado!\nCliente existente: ${duplicado.nome} (${duplicado.id})\nNão é possível cadastrar dois clientes com o mesmo CNPJ.`)
        return
      }
    }
    // Gerar ID sequencial EP-XXXX para novos clientes
    let novoId = editId
    let novoSeq
    if (!novoId) {
      // seq numérico simples: max(seq existentes) + 1
      const maxSeq = clientes.reduce((m,c) => Math.max(m, c.seq||0), 0)
      novoSeq = maxSeq + 1
      const counter = parseInt(localStorage.getItem('ep_cliente_counter') || '0') + 1
      localStorage.setItem('ep_cliente_counter', String(counter))
      novoId = String(counter)
    } else {
      novoSeq = clientes.find(c=>String(c.id)===String(editId))?.seq
    }
    // cert_b64 salvo em chave separada para não estourar localStorage
    if (form.grupo) salvarGrupoLS(form.grupo)
    const certB64 = form.credenciais?.cert_b64 || ''
    if (certB64 && novoId) {
      localStorage.setItem(`ep_cert_${novoId}`, certB64)
      if(form.credenciais?.cert_senha) localStorage.setItem(`ep_cert_senha_${novoId}`, form.credenciais.cert_senha)
    }
    const credsSemB64 = { ...(form.credenciais||{}), cert_b64: '' }
    const novoCliente = { ...form, id:novoId, seq:novoSeq, ativo:form.ativo!==false, obrigacoes_vinculadas:form.obrigacoes_vinculadas||[], credenciais:{...CREDS_VAZIO,...credsSemB64}, responsaveis:form.responsaveis||[], contatos:form.contatos||[] }
    let novaLista = []
    setClientes(p=>{ novaLista=editId?p.map(x=>x.id===editId?novoCliente:x):[...p,novoCliente]; localStorage.setItem('ep_clientes',JSON.stringify(novaLista)); return novaLista })
    setForm({...FORM_VAZIO,responsaveis:[],contatos:[],credenciais:{...CREDS_VAZIO}}); setEditId(null); setAba('lista')
    try { await fetch(editId?`${API}/clientes/${editId}`:`${API}/clientes/`,{method:editId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(novoCliente)}) } catch {}
  }

  const excluirCliente = async (id) => {
    try {
      const procs=JSON.parse(localStorage.getItem('ep_processos')||'[]')
      const cli=clientes.find(x=>String(x.id)===String(id))
      const pVinc=procs.filter(p=>String(p.clienteId||p.cliente_id||'')===String(id)||p.cliente===cli?.nome)
      if(pVinc.length>0){alert(`⛔ Não é possível excluir.\n• ${pVinc.length} processo(s) vinculado(s)\nRemova os vínculos antes de excluir.`);setModalExcluir(null);return}
    } catch {}
    try {
      const check = await fetch(`${API}/clientes/${id}/verificar-exclusao`)
      const res = await check.json()
      if (res.bloqueado) {
        alert(`Não é possível excluir este cliente.\nMotivo: ${res.motivo}`)
        setModalExcluir(null)
        return
      }
    } catch {}
    const novaLista = clientes.filter(c=>c.id!==id)
    setClientes(novaLista); localStorage.setItem('ep_clientes',JSON.stringify(novaLista))
    setModalExcluir(null)
    try { await fetch(`${API}/clientes/${id}`,{method:'DELETE'}) } catch {}
  }

  const nova = () => { setForm({...FORM_VAZIO,responsaveis:[],contatos:[],credenciais:{...CREDS_VAZIO}}); setEditId(null); setCnpjDados(null); setAba('cadastro'); setAbaForm('dados') }
  const editar = (cli) => {
    const certB64Salvo = localStorage.getItem(`ep_cert_${cli.id}`) || cli.credenciais?.cert_b64 || ''
    const certSenhaSalva = localStorage.getItem(`ep_cert_senha_${cli.id}`) || cli.credenciais?.cert_senha || ''
    const credsComB64 = { ...CREDS_VAZIO, ...(cli.credenciais||{}), cert_b64: certB64Salvo, cert_senha: certSenhaSalva }
    setForm({ ...FORM_VAZIO, ...cli, obrigacoes_vinculadas:cli.obrigacoes_vinculadas||[], credenciais:credsComB64, responsaveis:cli.responsaveis||[], contatos:cli.contatos?.length?cli.contatos:[{nome:'',email:'',whatsapp:'',tipo:'principal'}], ativo:cli.ativo!==false, tributacao:cli.tributacao||cli.regime||'' })
    setEditId(cli.id); setCnpjDados(null); setAba('cadastro'); setAbaForm('dados')
  }

  const clientesFiltrados = clientes.filter(c=>{
    if (busca && !c.nome?.toLowerCase().includes(busca.toLowerCase()) && !c.cnpj?.includes(busca) && !String(c.seq||'').includes(busca) && !String(c.id||'').toLowerCase().includes(busca.toLowerCase())) return false
    if (filtroRegimes.length > 0 && !filtroRegimes.includes(c.tributacao||c.regime)) return false
    if (filtroStatus==='ativo' && c.ativo===false) return false
    if (filtroStatus==='inativo' && c.ativo!==false) return false
    if (filtroGrupos.length > 0 && !filtroGrupos.includes(c.grupo||'')) return false
    return true
  }).sort((a,b)=>(a.seq||99999)-(b.seq||99999))

  const [regimeAdicionalSel, setRegimeAdicionalSel] = useState('')
  const todosRegimes = ['Simples Nacional','MEI','Lucro Real','Lucro Presumido','RET','Imune/Isento']
  const [mostrarOutros, setMostrarOutros] = useState(false)
  const obrigsPorTrib = obrigacoesPorTributacao(form.tributacao)
  const todasObrigacoesDisponiveis = useMemo(()=>{
    const vistas=new Set(); const lista=[]
    ;['Simples Nacional','MEI','Lucro Real','Lucro Presumido','RET','Imune/Isento'].forEach(reg=>{
      obrigacoesPorTributacao(reg).forEach(o=>{ if(!vistas.has(o.id)){vistas.add(o.id);lista.push({...o,_regime:reg})} })
    })
    try{JSON.parse(localStorage.getItem('ep_config_tarefas')||'[]').forEach(t=>{const id='custom_'+t.id;if(!vistas.has(id)){vistas.add(id);lista.push({id,nome:t.nome||t.titulo,mininome:t.codigo||'',departamento:t.departamento||'Fiscal',dia_vencimento:t.dia||0,_regime:'Custom',_custom:true})}})}catch{}
    return lista
  },[form.tributacao])
  const obrigsAdicionais = regimeAdicionalSel ? obrigacoesPorTributacao(regimeAdicionalSel).filter(o=>!obrigsPorTrib.find(x=>x.id===o.id)) : []
  const todasObrigsModal = [...obrigsPorTrib, ...obrigsAdicionais]

  // ── Seção Credenciais ────────────────────────────────────────────────────
  const creds = form.credenciais || {}
  const CredSection = ({ titulo, icone, children }) => (
    <div style={{ marginBottom:20, borderRadius:10, border:'1px solid #e8e8e8', overflow:'hidden' }}>
      <div style={{ padding:'10px 16px', background:'#F8F9FA', borderBottom:'1px solid #eee', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:16 }}>{icone}</span>
        <span style={{ fontWeight:700, color:NAVY, fontSize:13 }}>{titulo}</span>
      </div>
      <div style={{ padding:'14px 16px' }}>{children}</div>
    </div>
  )
  const CampoLabel = ({ label, children }) => (
    <div>
      <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:4 }}>{label}</label>
      {children}
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 44px)', fontFamily:'Inter, system-ui, sans-serif' }}>

      {/* Abas header */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', display:'flex', alignItems:'center', padding:'0 16px' }}>
        <button onClick={()=>setAba('lista')} style={{ padding:'11px 16px', fontSize:13, fontWeight:aba==='lista'?700:400, color:aba==='lista'?NAVY:'#999', background:'none', border:'none', borderBottom:aba==='lista'?`2px solid ${GOLD}`:'2px solid transparent', cursor:'pointer' }}>Clientes</button>
        {aba==='cadastro'&&<button style={{ padding:'11px 16px', fontSize:13, fontWeight:700, color:NAVY, background:'none', border:'none', borderBottom:`2px solid ${GOLD}`, cursor:'default' }}>
          {editId?'Editar Cliente':'Novo Cliente'}
          {editId && <span style={{ marginLeft:8, fontSize:11, fontWeight:400, color:'#aaa', fontFamily:'monospace' }}>#{editId}</span>}
        </button>}
        <div style={{ marginLeft:'auto' }}>
          <button onClick={nova} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, background:NAVY, color:'#fff', fontWeight:600, fontSize:12, border:'none', cursor:'pointer' }}>
            <Plus size={13}/> Novo Cliente
          </button>
        </div>
      </div>

      {/* ── LISTA ── */}
      {aba==='lista' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', padding:'8px 16px' }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
              <div style={{ position:'relative', flex:1, maxWidth:380 }}>
                <Search size={12} style={{ position:'absolute', left:8, top:8, color:'#bbb' }}/>
                <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome, CNPJ ou ID..." style={{ ...inp, paddingLeft:26 }}/>
              </div>
              {(filtroRegimes.length>0||filtroStatus||filtroGrupos.length>0||busca) && <button onClick={()=>{setBusca('');setFiltroRegimes([]);setFiltroStatus('');setFiltroGrupos([])}} style={{ display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:7,background:'#fee2e2',color:'#dc2626',border:'1px solid #fca5a5',fontSize:11,fontWeight:600,cursor:'pointer' }}><X size={11}/> Limpar</button>}
              <span style={{ fontSize:12, color:'#aaa', marginLeft:'auto' }}>{clientesFiltrados.length} cliente(s)</span>
            </div>
            {/* ── FILTROS MULTI-CHIP ── */}
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {/* Regime — chips múltiplos */}
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
                <span style={{ fontSize:10, color:'#aaa', fontWeight:700, textTransform:'uppercase', marginRight:2 }}>Regime</span>
                {TRIBUTACOES.map(t=>{
                  const on = filtroRegimes.includes(t)
                  const ct = cTrib(t)
                  return <button key={t} onClick={()=>setFiltroRegimes(prev=>on?prev.filter(x=>x!==t):[...prev,t])} style={{ padding:'3px 9px', borderRadius:20, fontSize:11, cursor:'pointer', border:`1px solid ${on?ct.c:'#ddd'}`, background:on?ct.bg:'#fff', color:on?ct.c:'#888', fontWeight:on?700:400, transition:'all .15s' }}>{on&&'✓ '}{t}</button>
                })}
              </div>
              {/* Status e Grupo */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                <span style={{ fontSize:10, color:'#aaa', fontWeight:700, textTransform:'uppercase', marginRight:2 }}>Status</span>
                {[['','Todos'],['ativo','● Ativo'],['inativo','○ Inativo']].map(([v,l])=>(
                  <button key={v} onClick={()=>setFiltroStatus(filtroStatus===v&&v?'':v)} style={{ padding:'3px 9px', borderRadius:20, fontSize:11, cursor:'pointer', border:`1px solid ${filtroStatus===v&&v?NAVY:'#ddd'}`, background:filtroStatus===v&&v?NAVY:'#fff', color:filtroStatus===v&&v?'#fff':'#888', fontWeight:filtroStatus===v&&v?700:400 }}>{l}</button>
                ))}
                {/* Grupos disponíveis */}
                {[...new Set(clientes.map(c=>c.grupo||'').filter(Boolean))].length > 0 && (
                  <>
                    <span style={{ fontSize:10, color:'#aaa', fontWeight:700, textTransform:'uppercase', marginLeft:8, marginRight:2 }}>Grupo</span>
                    {[...new Set(clientes.map(c=>c.grupo||'').filter(Boolean))].sort().map(g=>{
                      const on = filtroGrupos.includes(g)
                      return <button key={g} onClick={()=>setFiltroGrupos(prev=>on?prev.filter(x=>x!==g):[...prev,g])} style={{ padding:'3px 9px', borderRadius:20, fontSize:11, cursor:'pointer', border:`1px solid ${on?GOLD:'#ddd'}`, background:on?GOLD+'20':'#fff', color:on?'#7a5c00':'#888', fontWeight:on?700:400 }}>{on&&'✓ '}{g}</button>
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto', background:'#f8f9fb' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#fff', borderBottom:'2px solid #e8e8e8', position:'sticky', top:0, zIndex:1 }}>
                  {['#','ID','Cliente','CNPJ','Grupo','Regime','Obrig.','Status','Ações'].map(h=>(
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((c,i)=>{
                  const ct=cTrib(c.tributacao||c.regime)
                  return (
                    <tr key={c.id} style={{ background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0' }}>
                      <td style={{ padding:'9px 8px', textAlign:'center', width:32 }}>
                        <span style={{ fontSize:11, fontFamily:'monospace', color:'#bbb' }}>{c.seq||'—'}</span>
                      </td>
                      <td style={{ padding:'9px 8px', textAlign:'center', width:68 }}>
                        {c.id&&String(c.id).startsWith('EP-')
                          ? <span style={{ fontSize:10, fontFamily:'monospace', fontWeight:700, color:'#1B2A4A', background:'#f0f4ff', padding:'2px 5px', borderRadius:4 }}>{c.id}</span>
                          : <span style={{ color:'#ddd',fontSize:11 }}>—</span>}
                      </td>
                      <td style={{ padding:'9px 12px' }}>
                        <div style={{ fontWeight:600, color:NAVY }}>{c.nome}</div>
                        {c.nome_fantasia&&<div style={{ fontSize:10, color:'#aaa' }}>{c.nome_fantasia}</div>}
                      </td>
                      <td style={{ padding:'9px 12px', color:'#555', fontFamily:'monospace', fontSize:11 }}>{c.cnpj}</td>
                      <td style={{ padding:'9px 12px' }}>
                        {c.grupo
                          ? <span style={{ fontSize:11, padding:'2px 8px', borderRadius:8, background:GOLD+'22', color:'#7a5c00', fontWeight:600 }}>{c.grupo}</span>
                          : <span style={{ color:'#ddd' }}>—</span>}
                      </td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:8, background:ct.bg, color:ct.c, fontWeight:600 }}>{c.tributacao||c.regime||'—'}</span>
                      </td>
                      <td style={{ padding:'9px 12px', textAlign:'center' }}>
                        <span style={{ fontSize:11, padding:'2px 7px', borderRadius:6, background:'#EBF5FF', color:NAVY, fontWeight:600 }}>{(c.obrigacoes_vinculadas||[]).length}</span>
                      </td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:8, background:c.ativo!==false?'#F0FDF4':'#f5f5f5', color:c.ativo!==false?'#166534':'#888', fontWeight:600 }}>
                          {c.ativo!==false?'● Ativo':'○ Inativo'}
                        </span>
                      </td>
                      <td style={{ padding:'9px 12px' }}>
                        <div style={{ display:'flex', gap:5 }}>
                          <button onClick={()=>editar(c)} style={{ padding:'4px 9px', borderRadius:6, background:'#EBF5FF', color:'#1D6FA4', border:'none', cursor:'pointer', fontSize:11 }}>✏️ Editar</button>
                          <button onClick={()=>{editar(c);setTimeout(()=>setAbaForm('credenciais'),100)}} style={{ padding:'4px 9px', borderRadius:6, background:'#F0F4FF', color:NAVY, border:'none', cursor:'pointer', fontSize:11 }}>🔐</button>
                          <button onClick={()=>setModalExcluir(c)} style={{ padding:'4px 9px', borderRadius:6, background:'#FEF2F2', color:'#dc2626', border:'none', cursor:'pointer', fontSize:11 }}><Trash2 size={12}/></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {clientesFiltrados.length===0&&<tr><td colSpan={9} style={{ padding:40, textAlign:'center', color:'#ccc' }}>Nenhum cliente encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CADASTRO ── */}
      {aba==='cadastro' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', display:'flex', padding:'0 16px', overflowX:'auto' }}>
            {ABA_TABS.map(a=>(
              <button key={a.id} onClick={()=>setAbaForm(a.id)} style={{ padding:'10px 16px', fontSize:12, fontWeight:abaForm===a.id?700:400, color:abaForm===a.id?NAVY:'#888', background:'none', border:'none', borderBottom:abaForm===a.id?`2px solid ${GOLD}`:'2px solid transparent', cursor:'pointer', whiteSpace:'nowrap' }}>
                {a.label}
              </button>
            ))}
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:20, background:'#f8f9fb' }}>
            <div style={{ maxWidth:900, margin:'0 auto', background:'#fff', borderRadius:12, padding:24, border:'1px solid #e8e8e8' }}>

              {/* ABA DADOS */}
              {abaForm==='dados' && (
                <>
                  <div style={{marginBottom:12}}>
                    <label style={{fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:6}}>Tipo de Cadastro</label>
                    <div style={{display:'flex',gap:8}}>
                      {[['CNPJ','🏢 CNPJ'],['CPF','👤 CPF'],['CAEPF','🌾 CAEPF']].map(([v,l])=>{
                        const fixado=(form.tipoCadastro||'CNPJ')==='CNPJ'&&(form.cnpj||'').replace(/\D/g,'').length===14
                        return <button key={v} onClick={()=>!fixado&&setF('tipoCadastro',v)} disabled={fixado&&v!=='CNPJ'} style={{padding:'6px 16px',borderRadius:7,cursor:fixado&&v!=='CNPJ'?'not-allowed':'pointer',border:`2px solid ${(form.tipoCadastro||'CNPJ')===v?NAVY:'#ddd'}`,background:(form.tipoCadastro||'CNPJ')===v?NAVY+'15':'#fff',color:(form.tipoCadastro||'CNPJ')===v?NAVY:'#888',fontWeight:(form.tipoCadastro||'CNPJ')===v?700:400,fontSize:12,opacity:fixado&&v!=='CNPJ'?0.4:1}}>{l}</button>
                      })}
                      {(form.tipoCadastro||'CNPJ')==='CNPJ'&&(form.cnpj||'').replace(/\D/g,'').length===14&&(
                        <span style={{fontSize:10,color:'#16a34a',fontWeight:700,alignSelf:'center',marginLeft:4}}>🔒 Fixado</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                    <div>
                      <label style={{ fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4 }}>{form.tipoCadastro||'CNPJ'} *</label>
                      <div style={{ display:'flex', gap:8 }}>
                        <input value={form.cnpj} onChange={e=>handleCnpjChange(e.target.value)}
                          placeholder={(form.tipoCadastro||'CNPJ')==='CNPJ'?'00.000.000/0001-00':(form.tipoCadastro||'CNPJ')==='CPF'?'000.000.000-00':'00.000.00000/000-0'}
                          style={{ ...inp, flex:1 }}/>
                        {(form.tipoCadastro||'CNPJ')==='CNPJ'&&<button onClick={buscarCNPJ} disabled={buscandoCNPJ} style={{ padding:'7px 14px', borderRadius:7, background:GOLD, color:NAVY, fontWeight:700, fontSize:12, border:'none', cursor:'pointer', whiteSpace:'nowrap', opacity:buscandoCNPJ?0.6:1 }}>
                          {buscandoCNPJ?'Buscando...':'🔍 Buscar Receita'}
                        </button>}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4 }}>{(form.tipoCadastro||'CNPJ')==='CPF'?'Nome Completo *':'Razão Social *'}</label>
                      <input value={form.nome} onChange={e=>setF('nome',e.target.value)} style={inp}/>
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
                    <div>
                      <label style={{ fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4 }}>Nome Fantasia</label>
                      <input value={form.nome_fantasia} onChange={e=>setF('nome_fantasia',e.target.value)} style={inp}/>
                    </div>
                    <div>
                      <label style={{ fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4 }}>Data de Abertura</label>
                      <input type="date" value={form.data_abertura} onChange={e=>setF('data_abertura',e.target.value)} style={inp}/>
                    </div>
                    <div>
                      <label style={{ fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4 }}>Grupo</label>
                      <input value={form.grupo} onChange={e=>setF('grupo',e.target.value)} onBlur={e=>salvarGrupoLS(e.target.value)} list="ep-grupos-list" placeholder="Sem grupo" style={inp}/>
                      <datalist id="ep-grupos-list">
                        {[...new Set([...listarGruposLS(),...clientes.map(c=>c.grupo||'').filter(Boolean)])].sort().map(g=>(<option key={g} value={g}/>))}
                      </datalist>
                    </div>
                  </div>

                  {/* Dados da Receita */}
                  {cnpjDados && (
                    <div style={{ marginBottom:14, padding:'12px 16px', borderRadius:10, background:'#F0FDF4', border:'1px solid #bbf7d0' }}>
                      <div style={{ fontWeight:700, color:'#166534', fontSize:12, marginBottom:8 }}>✅ Dados obtidos da Receita Federal</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                        {[['Porte', cnpjDados.porte],['Natureza Jurídica', cnpjDados.natureza_juridica],['Situação', cnpjDados.descricao_situacao_cadastral],['Capital Social', cnpjDados.capital_social?`R$ ${Number(cnpjDados.capital_social).toLocaleString('pt-BR')}`:null],['Sócios', (cnpjDados.qsa||[]).length > 0 ? (cnpjDados.qsa||[]).map(s=>s.nome_socio).join(', ') : null]].filter(([,v])=>v).map(([k,v])=>(
                          <div key={k}>
                            <div style={{ fontSize:10, color:'#aaa', fontWeight:600 }}>{k}</div>
                            <div style={{ fontSize:12, color:'#166534', fontWeight:600 }}>{v}</div>
                          </div>
                        ))}
                      </div>

                    </div>
                  )}

                  {/* QSA — mostra sempre (busca recente ou dados salvos) */}
                  {(()=>{
                    const qsaItems = cnpjDados
                      ? (cnpjDados.qsa||[])
                      : (form.socios||[]).map(s=>({nome_socio:s.nome||s.nome_socio, qualificacao_socio:s.qualificacao||s.qualificacao_socio}))
                    if(!qsaItems.length) return null
                    return (
                      <div style={{ marginBottom:14, padding:'12px 16px', borderRadius:10, background:'#F0FDF4', border:'1px solid #bbf7d0' }}>
                        <div style={{ fontSize:11, color:'#166534', fontWeight:700, marginBottom:8 }}>👥 QSA — Quadro de Sócios e Administradores</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          {qsaItems.map((s,i)=>(
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:8, background:'rgba(255,255,255,.7)', border:'1px solid #bbf7d0' }}>
                              <div style={{ width:30, height:30, borderRadius:'50%', background:'#166534', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, flexShrink:0 }}>
                                {(s.nome_socio||'?').charAt(0)}
                              </div>
                              <div style={{ flex:1 }}>
                                <div style={{ fontWeight:700, color:'#166534', fontSize:13 }}>{s.nome_socio}</div>
                                <div style={{ fontSize:11, color:'#166534', opacity:.7 }}>{s.qualificacao_socio}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {/* CNAEs */}
                  {(form.cnae_principal || form.cnae_secundarios?.length > 0) && (
                    <div style={{ marginBottom:14, padding:'12px 16px', borderRadius:10, background:'#F8F9FA', border:'1px solid #e8e8e8' }}>
                      <div style={{ fontWeight:700, color:NAVY, fontSize:12, marginBottom:8 }}>📊 CNAEs</div>
                      {form.cnae_principal && (
                        <div style={{ marginBottom:6 }}>
                          <span style={{ fontSize:10, fontWeight:700, color:'#1D6FA4', textTransform:'uppercase' }}>Principal: </span>
                          <span style={{ fontSize:12, color:NAVY }}>{form.cnae_principal}</span>
                        </div>
                      )}
                      {form.cnae_secundarios?.length > 0 && (
                        <div>
                          <div style={{ fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase', marginBottom:4 }}>
                            Secundários ({form.cnae_secundarios.length}):
                          </div>
                          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                            {form.cnae_secundarios.map((c,i)=>(
                              <span key={i} style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:'#EEF2FF', color:'#3730A3', border:'1px solid #c7d2fe' }}>{c}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tributação */}
                  <div style={{ marginBottom:14, padding:'14px 16px', borderRadius:10, border:`2px solid ${GOLD}40`, background:GOLD+'06' }}>
                    <label style={{ fontSize:12, color:NAVY, fontWeight:700, display:'block', marginBottom:8 }}>💼 Regime Tributário *</label>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8, marginBottom:10 }}>
                      {TRIBUTACOES.filter(t=>t!=='Todos').map(t=>{
                        const ct=cTrib(t); const isSelected=form.tributacao===t
                        return (
                          <button key={t} onClick={()=>onTributacaoChange(t)} style={{ padding:'8px 6px', borderRadius:8, cursor:'pointer', border:`2px solid ${isSelected?ct.c:'#ddd'}`, background:isSelected?ct.bg:'#fff', color:isSelected?ct.c:'#888', fontWeight:isSelected?700:400, fontSize:11, textAlign:'center' }}>
                            {t}
                          </button>
                        )
                      })}
                    </div>

                  </div>


                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
                    <div>
                      <label style={{ fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4 }}>Inscrição Municipal</label>
                      <input value={form.inscricao_municipal} onChange={e=>setF('inscricao_municipal',e.target.value)} style={inp}/>
                    </div>
                    <div>
                      <label style={{ fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4 }}>Inscrição Estadual</label>
                      <input value={form.inscricao_estadual} onChange={e=>setF('inscricao_estadual',e.target.value)} style={inp}/>
                    </div>
                    <div>
                      <label style={{ fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4 }}>Status</label>
                      <div style={{ display:'flex', gap:8, marginTop:4 }}>
                        {[['ativo','● Ativo','#22c55e'],['inativo','○ Inativo','#dc2626']].map(([v,l,cor])=>(
                          <button key={v} onClick={()=>setF('ativo',v==='ativo')} style={{ flex:1, padding:'7px 8px', borderRadius:8, cursor:'pointer', border:`2px solid ${(form.ativo!==false&&v==='ativo')||(form.ativo===false&&v==='inativo')?cor:'#e8e8e8'}`, background:(form.ativo!==false&&v==='ativo')||(form.ativo===false&&v==='inativo')?cor+'15':'#fff', color:(form.ativo!==false&&v==='ativo')||(form.ativo===false&&v==='inativo')?cor:'#aaa', fontWeight:(form.ativo!==false&&v==='ativo')||(form.ativo===false&&v==='inativo')?700:400, fontSize:12 }}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4 }}>Observações</label>
                    <textarea value={form.observacoes} onChange={e=>setF('observacoes',e.target.value)} style={{ ...inp, height:70, resize:'vertical', fontFamily:'inherit' }}/>
                  </div>
                </>
              )}

              {/* ABA ENDEREÇO */}
              {abaForm==='endereco' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12 }}>
                  {[{k:'cep',l:'CEP',g:1},{k:'logradouro',l:'Logradouro',g:2},{k:'numero',l:'Número',g:1},{k:'complemento',l:'Complemento',g:1},{k:'bairro',l:'Bairro',g:1},{k:'cidade',l:'Cidade',g:1},{k:'estado',l:'UF',g:1}].map(f2=>(
                    <div key={f2.k} style={{ gridColumn:`span ${f2.g}` }}>
                      <label style={{ fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4 }}>{f2.l}</label>
                      <input value={form[f2.k]} onChange={e=>setF(f2.k,e.target.value)} style={inp}/>
                    </div>
                  ))}
                </div>
              )}

              {/* ABA RESPONSÁVEL */}
              {abaForm==='responsavel' && (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:NAVY }}>Responsáveis</div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={()=>setF('responsaveis',[...(form.responsaveis||[]),{tipo:'PF',nome:'',cpf_cnpj:'',cargo:'',email:'',whatsapp:''}])} style={{ padding:'6px 12px', borderRadius:7, background:NAVY, color:'#fff', fontSize:12, fontWeight:600, border:'none', cursor:'pointer' }}>+ PF</button>
                      <button onClick={()=>setF('responsaveis',[...(form.responsaveis||[]),{tipo:'PJ',nome:'',cpf_cnpj:'',cargo:'',email:'',whatsapp:''}])} style={{ padding:'6px 12px', borderRadius:7, background:GOLD, color:NAVY, fontSize:12, fontWeight:600, border:'none', cursor:'pointer' }}>+ PJ</button>
                    </div>
                  </div>
                  {(form.responsaveis||[]).length===0&&<div style={{ padding:30, textAlign:'center', color:'#ccc', background:'#fafafa', borderRadius:10, border:'2px dashed #e8e8e8' }}><div style={{ fontSize:28, marginBottom:8 }}>👤</div><div>Nenhum responsável vinculado.</div></div>}
                  {(form.responsaveis||[]).map((resp,ri)=>(
                    <div key={ri} style={{ marginBottom:14, padding:'14px 16px', borderRadius:10, border:`1px solid ${resp.tipo==='PJ'?GOLD:'#3b82f6'}30`, background:resp.tipo==='PJ'?GOLD+'06':'#EBF5FF' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                        <span style={{ fontSize:11, padding:'2px 9px', borderRadius:12, fontWeight:700, background:resp.tipo==='PJ'?GOLD:NAVY, color:resp.tipo==='PJ'?NAVY:'#fff' }}>{resp.tipo}</span>
                        <button onClick={()=>setF('responsaveis',form.responsaveis.filter((_,i)=>i!==ri))} style={{ padding:'3px 8px', borderRadius:6, background:'#FEF2F2', color:'#dc2626', border:'none', cursor:'pointer', fontSize:11 }}>🗑️</button>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:10, marginBottom:8 }}>
                        {[['Nome','nome'],['CPF/CNPJ','cpf_cnpj'],['Cargo','cargo']].map(([l,k])=>(
                          <div key={k}>
                            <label style={{ fontSize:10,color:'#888',fontWeight:600,display:'block',marginBottom:3 }}>{l}</label>
                            <input value={resp[k]||''} onChange={e=>{const r=[...form.responsaveis];r[ri]={...r[ri],[k]:e.target.value};setF('responsaveis',r)}} style={inp}/>
                          </div>
                        ))}
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        {[['E-mail','email'],['WhatsApp','whatsapp']].map(([l,k])=>(
                          <div key={k}>
                            <label style={{ fontSize:10,color:'#888',fontWeight:600,display:'block',marginBottom:3 }}>{l}</label>
                            <input value={resp[k]||''} onChange={e=>{const r=[...form.responsaveis];r[ri]={...r[ri],[k]:e.target.value};setF('responsaveis',r)}} style={inp}/>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ABA COMUNICAÇÃO */}
              {abaForm==='comunicacao' && (
                <div>
                  <div style={{ marginBottom:16, padding:'12px 14px', borderRadius:9, border:'1px solid #e8e8e8', background:'#fafafa' }}>
                    <label style={{ fontSize:10,color:'#888',fontWeight:700,display:'block',marginBottom:8,textTransform:'uppercase' }}>Canal Padrão</label>
                    <div style={{ display:'flex', gap:8 }}>
                      {[['whatsapp','💬 WhatsApp','#22c55e'],['email','📧 E-mail','#3b82f6'],['ambos','📲 Ambos',NAVY]].map(([v,l,cor])=>(
                        <button key={v} onClick={()=>setF('canal_padrao',v)} style={{ padding:'7px 16px', borderRadius:8, cursor:'pointer', border:`2px solid ${form.canal_padrao===v?cor:'#e8e8e8'}`, background:form.canal_padrao===v?cor+'15':'#fff', color:form.canal_padrao===v?cor:'#888', fontWeight:form.canal_padrao===v?700:400, fontSize:12 }}>{l}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                    {[['E-mail principal','email'],['WhatsApp','whatsapp'],['Telefone','telefone'],['E-mail NF-e','email_nfe'],['E-mail Folha','email_folha']].map(([l,k])=>(
                      <div key={k}>
                        <label style={{ fontSize:11,color:'#888',fontWeight:600,display:'block',marginBottom:4 }}>{l}</label>
                        <input value={form[k]||''} onChange={e=>setF(k,e.target.value)} style={inp}/>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                      <label style={{fontSize:11,color:'#888',fontWeight:700,textTransform:'uppercase',letterSpacing:.7}}>📋 Contatos Adicionais</label>
                      <button onClick={()=>setF('contatos',[...(form.contatos||[]),{nome:'',cargo:'',email:'',whatsapp:''}])} style={{padding:'5px 12px',borderRadius:7,background:NAVY,color:'#fff',fontSize:12,fontWeight:600,border:'none',cursor:'pointer'}}>+ Contato</button>
                    </div>
                    {(form.contatos||[]).length===0&&<div style={{padding:18,textAlign:'center',color:'#ccc',background:'#fafafa',borderRadius:10,border:'2px dashed #e8e8e8',fontSize:12}}>Clique em "+ Contato" para adicionar múltiplos contatos</div>}
                    {(form.contatos||[]).map((ct,ci)=>(
                      <div key={ci} style={{marginBottom:10,padding:'12px 14px',borderRadius:10,border:'1px solid #e0e0e0',background:'#fafafa',position:'relative'}}>
                        <button onClick={()=>setF('contatos',form.contatos.filter((_,i)=>i!==ci))} style={{position:'absolute',top:8,right:8,padding:'2px 7px',borderRadius:6,background:'#FEF2F2',color:'#dc2626',border:'none',cursor:'pointer',fontSize:11}}>🗑️</button>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:8}}>
                          {[['Nome','nome'],['Cargo','cargo']].map(([l,k])=>(
                            <div key={k}><label style={{fontSize:10,color:'#888',fontWeight:600,display:'block',marginBottom:3}}>{l}</label>
                            <input value={ct[k]||''} onChange={e=>{const r=[...form.contatos];r[ci]={...r[ci],[k]:e.target.value};setF('contatos',r)}} style={inp}/></div>
                          ))}
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                          {[['E-mail','email'],['WhatsApp','whatsapp']].map(([l,k])=>(
                            <div key={k}><label style={{fontSize:10,color:'#888',fontWeight:600,display:'block',marginBottom:3}}>{l}</label>
                            <input value={ct[k]||''} onChange={e=>{const r=[...form.contatos];r[ci]={...r[ci],[k]:e.target.value};setF('contatos',r)}} style={inp}/></div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── ABA CREDENCIAIS ── */}
              {abaForm==='credenciais' && (
                <div>
                  <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8, background:'#FFF3E0', border:'1px solid #FFB74D', display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:20 }}>🔒</span>
                    <div style={{ fontSize:12, color:'#E65100' }}>
                      <b>Dados sensíveis</b> — armazenados localmente no navegador. Não compartilhe esta tela. As credenciais são usadas automaticamente nos módulos <b>Relatório Fiscal</b>, <b>Parcelamentos</b> e <b>Notas Fiscais</b>.
                    </div>
                  </div>

                  {/* Certificado Digital */}
                  <CredSection titulo="Certificado Digital (e-CNPJ / e-CPF A1)" icone="🔏">
                    {/* Área de importação — única forma de vincular */}
                    <div style={{ background:'#F0FDF4', border:'2px dashed #86efac', borderRadius:12, padding:'18px 20px', marginBottom:14 }}>
                      <div style={{ fontWeight:700, color:'#166534', fontSize:13, marginBottom:4 }}>📥 Importar certificado (.pfx / .p12)</div>
                      <div style={{ fontSize:11, color:'#555', marginBottom:12 }}>Selecione o arquivo e informe a senha. O sistema identificará automaticamente o titular, CNPJ/CPF e validade.</div>
                      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12, alignItems:'flex-end' }}>
                        <CampoLabel label="Arquivo .pfx ou .p12">
                          <div style={{ display:'flex', gap:8 }}>
                            <input type="text" value={creds.cert_arquivo||''} readOnly
                              placeholder="Nenhum arquivo selecionado..."
                              style={{ ...inp, cursor:'default', background:'#f9f9f9', flex:1,
                                borderColor: creds.cert_arquivo ? '#86efac' : '#ddd',
                                color: creds.cert_arquivo ? '#166534' : '#999' }}/>
                            <input ref={certFileRef} type="file" accept=".pfx,.p12" style={{ display:'none' }}
                              onChange={e=>{
                                const f2=e.target.files[0]; if(!f2) return
                                setC('cert_arquivo',f2.name)
                                const nome=f2.name.toLowerCase()
                                if(nome.includes('cpf')||nome.includes('ecpf')) setC('cert_tipo','e-CPF')
                                else setC('cert_tipo','e-CNPJ')
                                const reader=new FileReader()
                                reader.onload=ev=>setC('cert_b64',(ev.target.result.split(',')[1])||'')
                                reader.readAsDataURL(f2); e.target.value=''
                              }}/>
                            <button type="button" onClick={()=>certFileRef.current?.click()}
                              style={{ padding:'7px 16px', borderRadius:7, background:NAVY, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', border:'none' }}>
                              📂 Selecionar
                            </button>
                          </div>
                        </CampoLabel>
                        <CampoLabel label="Senha do certificado">
                          <SenhaInput value={creds.cert_senha||''} onChange={e=>setC('cert_senha',e.target.value)}/>
                        </CampoLabel>
                      </div>
                      {creds.cert_arquivo && (
                        <button type="button" onClick={async()=>{
                            if(!creds.cert_b64){alert('Selecione o arquivo .pfx primeiro');return}
                            if(!creds.cert_senha){alert('Informe a senha do certificado');return}
                            try {
                              const r=await fetch(`${API}/clientes/certificado/info`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cert_base64:creds.cert_b64,senha:creds.cert_senha||''}),signal:AbortSignal.timeout(8000)})
                              if(r.ok){
                                const info=await r.json()
                                if(info.cnpj) setC('cert_cnpj_cpf',info.cnpj)
                                if(info.titular) setC('cert_titular',info.titular)
                                if(info.validade) setC('cert_validade',info.validade)
                                if(info.tipo) setC('cert_tipo',info.tipo)
                                if(info.emitente) setC('cert_emissora',info.emitente.substring(0,40))
                                if(info.serie) setC('cert_serie',info.serie)
                                alert('✅ Certificado reconhecido!\nTitular: '+(info.titular||'—')+'\nValidade: '+(info.validade||'—'))
                                return
                              }
                            } catch {}
                            alert('✅ Arquivo carregado!\n\nAPI de reconhecimento indisponível. Preencha manualmente os dados abaixo.')
                          }}
                          style={{ marginTop:10,width:'100%',padding:'9px',borderRadius:8,background:`linear-gradient(135deg,${NAVY},#2D7A4F)`,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
                          🔍 Reconhecer automaticamente (Titular · CNPJ/CPF · Validade)
                        </button>
                      )}
                    </div>
                    {/* Dados reconhecidos */}
                    {(creds.cert_titular||creds.cert_validade||creds.cert_cnpj_cpf) && (
                      <div style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
                        <div style={{ fontWeight:700, color:NAVY, fontSize:12, marginBottom:10 }}>📋 Dados do certificado</div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                          <CampoLabel label="Tipo">
                            <div style={{ display:'flex', gap:6 }}>
                              {['e-CNPJ','e-CPF'].map(t=>(<button key={t} onClick={()=>setC('cert_tipo',t)} style={{ flex:1,padding:'6px 0',borderRadius:7,cursor:'pointer',border:`2px solid ${(creds.cert_tipo||'e-CNPJ')===t?NAVY:'#ddd'}`,background:(creds.cert_tipo||'e-CNPJ')===t?NAVY+'15':'#fff',color:(creds.cert_tipo||'e-CNPJ')===t?NAVY:'#888',fontWeight:(creds.cert_tipo||'e-CNPJ')===t?700:400,fontSize:12 }}>{t}</button>))}
                            </div>
                          </CampoLabel>
                          <CampoLabel label="Titular"><input value={creds.cert_titular||''} onChange={e=>setC('cert_titular',e.target.value)} placeholder="Nome no certificado" style={inp}/></CampoLabel>
                          <CampoLabel label="CPF/CNPJ"><input value={creds.cert_cnpj_cpf||''} onChange={e=>setC('cert_cnpj_cpf',e.target.value)} placeholder={form.cnpj||'—'} style={inp}/></CampoLabel>
                          <CampoLabel label="Validade">
                            <input type="date" value={creds.cert_validade||''} onChange={e=>setC('cert_validade',e.target.value)} style={{ ...inp, borderColor:creds.cert_validade&&new Date(creds.cert_validade)<new Date()?'#e53935':creds.cert_validade&&new Date(creds.cert_validade)<new Date(Date.now()+30*864e5)?'#FF9800':'#ddd' }}/>
                            {creds.cert_validade&&new Date(creds.cert_validade)<new Date()&&<div style={{ fontSize:10,color:'#e53935',marginTop:2,fontWeight:700 }}>⚠ VENCIDO</div>}
                            {creds.cert_validade&&new Date(creds.cert_validade)>=new Date()&&new Date(creds.cert_validade)<new Date(Date.now()+30*864e5)&&<div style={{ fontSize:10,color:'#FF9800',marginTop:2,fontWeight:700 }}>⚠ Vence &lt;30 dias</div>}
                          </CampoLabel>
                          <CampoLabel label="Emissora AC">
                            <select value={creds.cert_emissora||''} onChange={e=>setC('cert_emissora',e.target.value)} style={sel}>
                              <option value="">Selecione...</option>
                              {CERT_EMISSORAS.map(e=><option key={e} value={e}>{e}</option>)}
                            </select>
                          </CampoLabel>
                          <CampoLabel label="Número de Série"><input value={creds.cert_serie||''} onChange={e=>setC('cert_serie',e.target.value)} placeholder="Ex: 1234567890" style={inp}/></CampoLabel>
                        </div>
                      </div>
                    )}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <button type="button" onClick={()=>{
                          if(!editId){alert('Salve o cliente primeiro.');return}
                          const b64=form.credenciais?.cert_b64||''
                          if(b64) localStorage.setItem(`ep_cert_${editId}`,b64)
                          if(form.credenciais?.cert_senha) localStorage.setItem(`ep_cert_senha_${editId}`,form.credenciais.cert_senha)
                          const upd={...clientes.find(x=>x.id===editId),credenciais:{...CREDS_VAZIO,...form.credenciais,cert_b64:''}}
                          const lista=clientes.map(x=>x.id===editId?upd:x)
                          localStorage.setItem('ep_clientes',JSON.stringify(lista));setClientes(lista)
                          alert('✅ Certificado salvo!')
                        }} style={{padding:'7px 16px',borderRadius:8,background:'#4CAF50',color:'#fff',fontSize:12,fontWeight:700,border:'none',cursor:'pointer'}}>💾 Salvar Certificado</button>
                      <button style={{ padding:'7px 16px',borderRadius:8,background:'#00BCD4',color:'#fff',fontSize:12,fontWeight:700,border:'none',cursor:'pointer' }}>🛒 Comprar / Renovar</button>
                    </div>
                  </CredSection>

                  {/* ── PROCURAÇÃO ── */}
                  <CredSection titulo="Acesso via Procuração (Certificado do Escritório)" icone="📜">
                    <div style={{ marginBottom:12, padding:'10px 14px', borderRadius:8, background:creds.proc_ativa?'#E8F5E9':'#F8F9FA', border:`1px solid ${creds.proc_ativa?'#A5D6A7':'#e8e8e8'}` }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <div>
                          <div style={{ fontWeight:700, color:NAVY, fontSize:13 }}>
                            {creds.proc_ativa?'✅ Procuração ativa':'○ Sem procuração'}
                          </div>
                          <div style={{ fontSize:11, color:'#666', marginTop:2 }}>
                            Quando ativado, os dados deste cliente podem ser acessados usando o <b>certificado digital do escritório EPimentel</b>, dispensando o certificado próprio do cliente.
                          </div>
                        </div>
                        <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginLeft:16 }}>
                          <div style={{ position:'relative', width:42, height:24 }}>
                            <input type="checkbox" checked={!!creds.proc_ativa} onChange={e=>setC('proc_ativa',e.target.checked)} style={{ opacity:0, width:0, height:0 }}/>
                            <div onClick={()=>setC('proc_ativa',!creds.proc_ativa)} style={{ position:'absolute', inset:0, borderRadius:24, background:creds.proc_ativa?'#22c55e':'#ccc', cursor:'pointer', transition:'background .2s' }}>
                              <div style={{ position:'absolute', top:2, left:creds.proc_ativa?18:2, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
                            </div>
                          </div>
                          <span style={{ fontSize:12, fontWeight:700, color:creds.proc_ativa?'#22c55e':'#aaa' }}>{creds.proc_ativa?'Ativo':'Inativo'}</span>
                        </label>
                      </div>
                    </div>

                    {creds.proc_ativa && (
                      <>
                        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:12, marginBottom:12 }}>
                          <CampoLabel label="Arquivo da Procuração (PDF)">
                            <div style={{ display:'flex', gap:8 }}>
                              <input type="text" value={creds.proc_arquivo||''} readOnly placeholder="Nenhum arquivo..." style={{ ...inp, cursor:'default', background:'#f9f9f9', flex:1 }}/>
                              <label style={{ padding:'7px 12px', borderRadius:7, background:'#555', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', display:'inline-flex', alignItems:'center' }}>
                                📎 Anexar
                                <input type="file" accept=".pdf,.jpg,.png" style={{ display:'none' }} onChange={e=>{if(e.target.files[0]) setC('proc_arquivo',e.target.files[0].name)}}/>
                              </label>
                            </div>
                          </CampoLabel>
                          <CampoLabel label="Data da Procuração">
                            <input type="date" value={creds.proc_data||''} onChange={e=>setC('proc_data',e.target.value)} style={inp}/>
                          </CampoLabel>
                          <CampoLabel label="Validade da Procuração">
                            <input type="date" value={creds.proc_validade||''} onChange={e=>setC('proc_validade',e.target.value)} style={{ ...inp, borderColor:creds.proc_validade&&new Date(creds.proc_validade)<new Date()?'#e53935':'#ddd' }}/>
                            {creds.proc_validade&&new Date(creds.proc_validade)<new Date()&&<div style={{ fontSize:10, color:'#e53935', marginTop:2, fontWeight:700 }}>⚠ Procuração VENCIDA</div>}
                          </CampoLabel>
                        </div>

                        <CampoLabel label="Órgãos autorizados pela procuração">
                          <div style={{ display:'flex', gap:6, flexWrap:'wrap', padding:'10px 12px', borderRadius:8, border:'1px solid #e8e8e8', background:'#fafafa', marginBottom:8 }}>
                            {ORGAOS_PROC.map(o=>{
                              const isSel=(creds.proc_orgaos||[]).includes(o)
                              return (
                                <button key={o} onClick={()=>{ const lista=creds.proc_orgaos||[]; setC('proc_orgaos',isSel?lista.filter(x=>x!==o):[...lista,o]) }} style={{ padding:'5px 12px', borderRadius:20, fontSize:11, cursor:'pointer', border:`1px solid ${isSel?NAVY:'#ddd'}`, background:isSel?NAVY:'#fff', color:isSel?'#fff':'#666', fontWeight:isSel?700:400 }}>
                                  {isSel?'✓ ':''}{o}
                                </button>
                              )
                            })}
                          </div>
                        </CampoLabel>

                        <CampoLabel label="Observações / Restrições da Procuração">
                          <textarea value={creds.proc_obs||''} onChange={e=>setC('proc_obs',e.target.value)} placeholder="Ex: Procuração com poderes para retificação de declarações, parcelamentos e emissão de certidões..." style={{ ...inp, height:60, resize:'none', fontFamily:'inherit' }}/>
                        </CampoLabel>

                        <div style={{ marginTop:10, padding:'10px 14px', borderRadius:8, background:'#F0F4FF', border:'1px solid #c7d7fd', fontSize:12, color:NAVY }}>
                          🔐 <b>Certificado do Escritório será usado:</b> EPimentel Auditoria & Contabilidade Ltda — e-CNPJ 22.939.803/0001-49. Para que o acesso funcione, a procuração deve estar registrada no portal do órgão correspondente.
                        </div>
                      </>
                    )}
                  </CredSection>

                  {/* Prefeitura */}
                  <CredSection titulo="Credenciais da Prefeitura (NFS-e)" icone="🏛️">
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                      <CampoLabel label="URL do portal"><input value={creds.pref_url||''} onChange={e=>setC('pref_url',e.target.value)} placeholder="https://nfse.goiania.go.gov.br" style={inp}/></CampoLabel>
                      <CampoLabel label="Login"><input value={creds.pref_login||''} onChange={e=>setC('pref_login',e.target.value)} placeholder="Login" style={inp}/></CampoLabel>
                      <CampoLabel label="Senha"><SenhaInput value={creds.pref_senha||''} onChange={e=>setC('pref_senha',e.target.value)}/></CampoLabel>
                    </div>
                  </CredSection>

                  {/* Emissor Nacional */}
                  <CredSection titulo="Credenciais do Emissor Nacional" icone="🧾">
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      <CampoLabel label="CPF/CNPJ"><input value={creds.en_cpfcnpj||''} onChange={e=>setC('en_cpfcnpj',e.target.value)} placeholder="CPF/CNPJ" style={inp}/></CampoLabel>
                      <CampoLabel label="Senha"><SenhaInput value={creds.en_senha||''} onChange={e=>setC('en_senha',e.target.value)}/></CampoLabel>
                    </div>
                  </CredSection>

                  {/* Simples Nacional */}
                  <CredSection titulo="Credenciais do Simples Nacional (PGDAS-D)" icone="📊">
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      <CampoLabel label="Código de Acesso"><input value={creds.sn_codigo||''} onChange={e=>setC('sn_codigo',e.target.value)} placeholder="000000000000" style={inp}/></CampoLabel>
                      <CampoLabel label="CPF do Responsável"><input value={creds.sn_cpf_resp||''} onChange={e=>setC('sn_cpf_resp',e.target.value)} placeholder="000.000.000-00" style={inp}/></CampoLabel>
                    </div>
                  </CredSection>

                  {/* e-CAC / Receita Federal */}
                  <CredSection titulo="e-CAC / Receita Federal" icone="🏦">
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:10 }}>
                      <CampoLabel label="CPF/CNPJ do representante"><input value={creds.ecac_cpfcnpj||''} onChange={e=>setC('ecac_cpfcnpj',e.target.value)} placeholder="000.000.000-00" style={inp}/></CampoLabel>
                      <CampoLabel label="Código de Acesso"><input value={creds.ecac_codigo_acesso||''} onChange={e=>setC('ecac_codigo_acesso',e.target.value)} placeholder="Código de acesso" style={inp}/></CampoLabel>
                    </div>
                    <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:12 }}>
                      <input type="checkbox" checked={!!creds.ecac_cert} onChange={e=>setC('ecac_cert',e.target.checked)} style={{ accentColor:NAVY, width:14, height:14 }}/>
                      Acesso via Certificado Digital A1/A3
                    </label>
                  </CredSection>

                  {/* Domínio (sistema contábil) */}
                  <CredSection titulo="Sistema Domínio (Thomson Reuters)" icone="💻">
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                      <CampoLabel label="Código da Empresa"><input value={creds.dominio_empresa||''} onChange={e=>setC('dominio_empresa',e.target.value)} placeholder="Ex: 001" style={inp}/></CampoLabel>
                      <CampoLabel label="Usuário"><input value={creds.dominio_usuario||''} onChange={e=>setC('dominio_usuario',e.target.value)} placeholder="Usuário" style={inp}/></CampoLabel>
                      <CampoLabel label="Senha"><SenhaInput value={creds.dominio_senha||''} onChange={e=>setC('dominio_senha',e.target.value)}/></CampoLabel>
                    </div>
                  </CredSection>
                </div>
              )}

              {/* ABA DOCs */}
              {abaForm==='docs' && (
                <AbaDocumentos clienteId={editId} clienteNome={form.nome} API={API}/>
              )}

              {/* Rodapé botões */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:14, marginTop:14, borderTop:'1px solid #f0f0f0' }}>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>{ const idx=ABA_TABS.findIndex(a=>a.id===abaForm); if(idx>0) setAbaForm(ABA_TABS[idx-1].id); else setAba('lista') }} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, background:'#f0f4ff', color:NAVY, fontSize:13, fontWeight:700, border:'1px solid #c7d2fe', cursor:'pointer' }}>
                    <ChevronLeft size={14}/> {ABA_TABS.findIndex(a=>a.id===abaForm)>0?'Anterior':'Cancelar'}
                  </button>
                  <button onClick={()=>setAba('lista')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, background:'#f5f5f5', color:'#555', fontSize:13, fontWeight:700, border:'1px solid #ddd', cursor:'pointer' }}>
                    ← Voltar à lista
                  </button>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>setModalGerar(true)} disabled={!form.tributacao} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, background:'#FFFBF0', color:'#854D0E', fontSize:12, fontWeight:700, border:`1px solid ${GOLD}`, cursor:'pointer', opacity:form.tributacao?1:0.4 }}>📅 Gerar Tarefas</button>
                  <button onClick={salvar} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 20px', borderRadius:8, background:'#22c55e', color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
                    <Save size={14}/> Salvar
                  </button>
                  {ABA_TABS.findIndex(a=>a.id===abaForm)<ABA_TABS.length-1&&(
                    <button onClick={()=>{ salvar(); setTimeout(()=>setAbaForm(ABA_TABS[ABA_TABS.findIndex(a=>a.id===abaForm)+1].id),100) }} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, background:NAVY, color:'#fff', fontSize:12, fontWeight:600, border:'none', cursor:'pointer' }}>
                      Próximo <ChevronRight size={14}/>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gerar */}
      {modalGerar&&editId&&<GerarObrigacoes cliente={{...form,id:editId}} onClose={()=>setModalGerar(false)} onGerado={(qtd)=>{setModalGerar(false);alert(`${qtd} obrigações geradas!`)}}/>}

      {/* Modal Excluir */}
      {modalExcluir&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300 }}>
          <div style={{ background:'#fff',borderRadius:14,padding:28,maxWidth:400,width:'90%',textAlign:'center' }}>
            <Trash2 size={40} style={{ color:'#dc2626',marginBottom:12 }}/>
            <div style={{ fontSize:15,fontWeight:700,color:NAVY,marginBottom:8 }}>Excluir Cliente</div>
            <div style={{ fontSize:13,color:'#666',marginBottom:6 }}>Tem certeza? Esta ação não pode ser desfeita.</div>
            <div style={{ fontSize:14,fontWeight:700,color:NAVY,marginBottom:16 }}>"{ modalExcluir.nome}"</div>
            <div style={{ display:'flex',gap:10,justifyContent:'center' }}>
              <button onClick={()=>setModalExcluir(null)} style={{ padding:'9px 20px',borderRadius:8,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:13 }}>Cancelar</button>
              <button onClick={()=>excluirCliente(modalExcluir.id)} style={{ padding:'9px 22px',borderRadius:8,background:'#dc2626',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13,border:'none' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Obrigações */}
      {modalObrig&&(()=>{
        const DEPTS=['Todos','Fiscal','Pessoal','Contábil','Bancos']
        const fonteModal=mostrarOutros?todasObrigacoesDisponiveis:obrigsPorTrib
        const filtObrig=fonteModal.filter(o=>{
          if(buscaObrig&&!o.nome?.toLowerCase().includes(buscaObrig.toLowerCase())&&!(o.mininome||'').toLowerCase().includes(buscaObrig.toLowerCase())) return false
          if(deptSel!=='Todos'&&o.departamento!==deptSel) return false
          return true
        })
        const DEPT_CORES2={'Fiscal':{bg:'#EBF5FF',color:'#1D6FA4'},'Pessoal':{bg:'#EDFBF1',color:'#1A7A3C'},'Contábil':{bg:'#F3EEFF',color:'#6B3EC9'},'Bancos':{bg:'#FEF9C3',color:'#854D0E'}}
        return (
          <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:680,maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px',borderBottom:'1px solid #f0f0f0' }}>
                <div>
                  <div style={{ fontWeight:700,color:NAVY,fontSize:15 }}>✏️ Editar Vínculos de Obrigações</div>
                  <div style={{ fontSize:11,color:'#aaa',marginTop:2 }}>{form.tributacao}{regimeAdicionalSel?' + '+regimeAdicionalSel:''} · <b style={{color:NAVY}}>{form.obrigacoes_vinculadas.length}</b> selecionadas de {todasObrigsModal.length}</div>
                </div>
                <button onClick={()=>setModalObrig(false)} style={{ background:'none',border:'none',cursor:'pointer',color:'#aaa' }}><X size={18}/></button>
              </div>
              <div style={{ padding:'8px 20px',borderBottom:'1px solid #f0f0f0',display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' }}>
                <div style={{ position:'relative',flex:1,minWidth:180 }}>
                  <Search size={11} style={{ position:'absolute',left:7,top:8,color:'#bbb' }}/>
                  <input value={buscaObrig} onChange={e=>setBuscaObrig(e.target.value)} placeholder="Buscar..." style={{ ...inp,paddingLeft:24,fontSize:12 }}/>
                </div>
                {DEPTS.map(d=><button key={d} onClick={()=>setDeptSel(d)} style={{ padding:'4px 10px',borderRadius:20,fontSize:11,cursor:'pointer',border:`1px solid ${deptSel===d?NAVY:'#ddd'}`,background:deptSel===d?NAVY:'#fff',color:deptSel===d?'#fff':'#666',fontWeight:deptSel===d?700:400 }}>{d}</button>)}
                <button onClick={()=>setF('obrigacoes_vinculadas',filtObrig.map(o=>o.id))} style={{ padding:'4px 10px',borderRadius:7,background:NAVY,color:'#fff',fontSize:11,fontWeight:600,border:'none',cursor:'pointer' }}>Todos</button>
                <button onClick={()=>setF('obrigacoes_vinculadas',[])} style={{ padding:'4px 10px',borderRadius:7,background:'#f5f5f5',color:'#555',fontSize:11,border:'none',cursor:'pointer' }}>Limpar</button>
              </div>
              <div style={{padding:'5px 20px',borderBottom:'1px solid #f0f0f0',display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontSize:11,color:'#888',fontWeight:600}}>➕ Outras obrigações:</span>
                <select value={regimeAdicionalSel} onChange={e=>setRegimeAdicionalSel(e.target.value)} style={{fontSize:11,padding:'3px 8px',borderRadius:6,border:'1px solid #ddd',flex:1}}>
                  <option value="">-- Incluir obrigações de outro regime --</option>
                  {todosRegimes.filter(r=>r!==form.tributacao).map(r=><option key={r} value={r}>{r} ({obrigacoesPorTributacao(r).filter(o=>!obrigsPorTrib.find(x=>x.id===o.id)).length} extras)</option>)}
                </select>
                {regimeAdicionalSel&&<button onClick={()=>setRegimeAdicionalSel('')} style={{fontSize:11,padding:'2px 8px',borderRadius:6,background:'#FEF2F2',color:'#dc2626',border:'none',cursor:'pointer'}}>×</button>}
              </div>
              <div style={{ flex:1,overflowY:'auto',padding:'8px 20px' }}>
                {['Fiscal','Pessoal','Contábil','Bancos'].map(dept=>{
                  const lista=filtObrig.filter(o=>o.departamento===dept); if(!lista.length) return null
                  const dc=DEPT_CORES2[dept]||{bg:'#f5f5f5',color:'#666'}
                  return <div key={dept} style={{ marginBottom:14 }}>
                    <div style={{ fontSize:10,fontWeight:700,color:dc.color,textTransform:'uppercase',marginBottom:6,padding:'2px 8px',borderRadius:6,background:dc.bg,display:'inline-block' }}>{dept}</div>
                    {lista.map(o=>{
                      const isSel=form.obrigacoes_vinculadas.includes(o.id)
                      return <label key={o.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'7px 4px',cursor:'pointer',borderBottom:'1px solid #f8f8f8' }}>
                        <input type="checkbox" checked={isSel} onChange={()=>setF('obrigacoes_vinculadas',isSel?form.obrigacoes_vinculadas.filter(id=>id!==o.id):[...form.obrigacoes_vinculadas,o.id])} style={{ width:15,height:15,accentColor:NAVY }}/>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                            <span style={{ fontSize:12,fontWeight:600,color:NAVY }}>{o.nome}</span>
                            {o.exigir_robo&&<span style={{ fontSize:9,padding:'1px 5px',borderRadius:4,background:'#EDE9FF',color:'#6366f1' }}>🤖</span>}
                            {o.passivel_multa&&<span style={{ fontSize:9,padding:'1px 5px',borderRadius:4,background:'#FEF2F2',color:'#dc2626' }}>⚠ multa</span>}
                          </div>
                          <div style={{ fontSize:10,color:'#aaa',marginTop:1 }}>{o.mininome} · Dia {o.dia_vencimento}</div>
                        </div>
                      </label>
                    })}
                  </div>
                })}
              </div>
              <div style={{ padding:'12px 20px',borderTop:'1px solid #f0f0f0',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#f8f9fb' }}>
                <span style={{ fontSize:12,color:NAVY }}><b style={{ fontSize:16 }}>{form.obrigacoes_vinculadas.length}</b> selecionadas</span>
                <button onClick={()=>{ setModalObrig(false); if(editId){const updated=JSON.parse(localStorage.getItem('ep_clientes')||'[]').map(c=>String(c.id)===String(editId)?{...c,obrigacoes_vinculadas:form.obrigacoes_vinculadas}:c);localStorage.setItem('ep_clientes',JSON.stringify(updated));setClientes(updated)} }} style={{ padding:'8px 22px',borderRadius:8,background:NAVY,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer' }}>✅ Confirmar</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
