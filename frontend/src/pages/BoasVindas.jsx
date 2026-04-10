import { useState, useEffect } from 'react'
import { Heart, Send, MessageSquare, Mail, Plus, Edit2, Trash2, Save, X,
         CheckCircle, Eye, Copy, Zap, Users } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'
const WPP  = '#25D366'

const inp = { padding:'8px 12px', borderRadius:8, border:'1px solid #e0e0e0', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', color:'#333', fontFamily:'inherit' }

const VARIAVEIS = [
  { v:'{cliente_nome}',     desc:'Nome / Razão Social do cliente' },
  { v:'{cnpj}',             desc:'CNPJ do cliente' },
  { v:'{tributacao}',       desc:'Regime tributário' },
  { v:'{responsavel_nome}', desc:'Nome do responsável' },
  { v:'{contador}',         desc:'Carlos Eduardo A. M. Pimentel' },
  { v:'{crc}',              desc:'CRC/GO 026.994/O-8' },
  { v:'{data}',             desc:'Data de hoje' },
  { v:'{mes_ano}',          desc:'Mês e ano atual' },
]

const TEMPLATES_PADRAO = [
  {
    id: 'bv_whatsapp_simples',
    nome: 'Boas-vindas WhatsApp — Simples Nacional',
    canal: 'whatsapp',
    ativo: true,
    regimes: ['Simples Nacional', 'MEI'],
    assunto: '',
    corpo: `Olá, {cliente_nome}! 🎉

Seja muito bem-vindo(a) à família *EPimentel Auditoria & Contabilidade*!

É um prazer tê-lo(a) como cliente. A partir de agora, cuidaremos de toda a parte contábil e fiscal do seu negócio com dedicação e profissionalismo.

📋 *Próximos passos:*
• Enviaremos o cronograma de obrigações mensais
• Nossa equipe entrará em contato para alinhar as informações necessárias
• Você receberá as guias e documentos diretamente por aqui

Qualquer dúvida, estamos à disposição! 👊

_Carlos Eduardo A. M. Pimentel_
_CRC/GO 026.994/O-8_
_EPimentel Auditoria & Contabilidade_`,
  },
  {
    id: 'bv_whatsapp_lucro',
    nome: 'Boas-vindas WhatsApp — Lucro Presumido/Real',
    canal: 'whatsapp',
    ativo: true,
    regimes: ['Lucro Presumido', 'Lucro Real'],
    assunto: '',
    corpo: `Olá, {cliente_nome}! 🤝

Bem-vindo(a) à *EPimentel Auditoria & Contabilidade*!

Fico honrado com a confiança depositada em nosso escritório para cuidar da contabilidade de {cliente_nome}.

📊 *Serviços incluídos no seu plano:*
• Escrituração contábil e fiscal completa
• Apuração de impostos (IRPJ, CSLL, PIS, COFINS)
• Entrega de obrigações acessórias (SPED, ECF, DCTF)
• Balanços e demonstrativos financeiros
• Consultoria tributária contínua

Em breve nossa equipe entrará em contato para dar início ao processo de transição.

_Carlos Eduardo A. M. Pimentel — CRC/GO 026.994/O-8_`,
  },
  {
    id: 'bv_email',
    nome: 'Boas-vindas E-mail — Formal',
    canal: 'email',
    ativo: true,
    regimes: [],
    assunto: 'Bem-vindo(a) à EPimentel Auditoria & Contabilidade — {cliente_nome}',
    corpo: `Prezado(a) {responsavel_nome},

É com grande satisfação que damos as boas-vindas a {cliente_nome} à EPimentel Auditoria & Contabilidade.

A partir desta data, assumimos a responsabilidade pela escrituração contábil, fiscal e pelo cumprimento de todas as obrigações acessórias da empresa.

DOCUMENTAÇÃO NECESSÁRIA (primeiros dias):
• Contrato Social / Estatuto e alterações
• Certidões negativas atualizadas
• Últimas declarações entregues (IRPJ, ECF, ECD)
• Notas fiscais e extratos bancários dos últimos 12 meses
• Folha de pagamento e registros de funcionários

Nosso time entrará em contato nos próximos dias úteis para orientá-lo(a) sobre os procedimentos.

Atenciosamente,

Carlos Eduardo de Araújo Marques Pimentel
CRC/GO 026.994/O-8
EPimentel Auditoria & Contabilidade Ltda
Goiânia — GO`,
  },
  {
    id: 'bv_construcao',
    nome: 'Boas-vindas — Construção Civil / SPE',
    canal: 'whatsapp',
    ativo: true,
    regimes: ['RET', 'Lucro Real', 'Lucro Presumido'],
    assunto: '',
    corpo: `Olá, {cliente_nome}! 🏗️

Seja bem-vindo(a) à *EPimentel Auditoria & Contabilidade*!

Temos ampla experiência em contabilidade para incorporadoras, construtoras e SPEs imobiliárias, e estamos prontos para cuidar do seu empreendimento.

📋 *Nossa especialidade no setor:*
• RET — Regime Especial de Tributação
• Patrimônio de Afetação
• CNO — Cadastro Nacional de Obras
• eSocial para obras e canteiros
• DRF / e-Social / SPED para construção civil
• Reconciliação de obras e empreendimentos

Em breve enviaremos o cronograma de obrigações do setor.

_Carlos Eduardo A. M. Pimentel — CRC/GO 026.994/O-8_`,
  },
]

const LS_KEY = 'ep_boas_vindas_templates'

export default function BoasVindas() {
  const [templates, setTemplates] = useState(() => {
    try {
      const s = localStorage.getItem(LS_KEY)
      if (s) { const p = JSON.parse(s); if (p.length > 0) return p }
    } catch {}
    return TEMPLATES_PADRAO
  })
  const [clientes, setClientes] = useState([])
  const [editando, setEditando] = useState(null)     // null = lista | 'novo' | id do template
  const [form, setForm] = useState(null)
  const [preview, setPreview] = useState(null)       // id do template em preview
  const [enviandoPara, setEnviandoPara] = useState(null) // id do template para envio
  const [clienteSel, setClienteSel] = useState('')
  const [buscaCli, setBuscaCli] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultadoEnvio, setResultadoEnvio] = useState(null)
  const [copiadoId, setCopiadoId] = useState(null)

  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem('ep_clientes') || '[]')
      setClientes(c)
    } catch {}
    // Também tenta buscar novos clientes cadastrados recentemente
    fetch('/api/v1/clientes/')
      .then(r => r.ok ? r.json() : [])
      .then(d => { if ((d.clientes||d||[]).length > 0) setClientes(d.clientes||d) })
      .catch(() => {})
  }, [])

  const salvarLS = (lista) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(lista)) } catch {}
  }

  const novoTemplate = () => {
    setForm({ id: 'tpl_' + Date.now(), nome: '', canal: 'whatsapp', ativo: true, regimes: [], assunto: '', corpo: '' })
    setEditando('novo')
  }

  const editarTemplate = (tpl) => {
    setForm({ ...tpl })
    setEditando(tpl.id)
  }

  const salvarForm = () => {
    if (!form.nome || !form.corpo) return
    let nova
    if (editando === 'novo') {
      nova = [...templates, form]
    } else {
      nova = templates.map(t => t.id === editando ? form : t)
    }
    setTemplates(nova); salvarLS(nova)
    setEditando(null); setForm(null)
  }

  const excluir = (id) => {
    if (confirm('Excluir este template?')) {
      const nova = templates.filter(t => t.id !== id)
      setTemplates(nova); salvarLS(nova)
    }
  }

  const toggleAtivo = (id) => {
    const nova = templates.map(t => t.id === id ? { ...t, ativo: !t.ativo } : t)
    setTemplates(nova); salvarLS(nova)
  }

  const interpolate = (texto, cliente) => {
    if (!texto || !cliente) return texto || ''
    const agora = new Date()
    const mes = agora.toLocaleString('pt-BR', { month: 'long' })
    const ano = agora.getFullYear()
    return texto
      .replace(/\{cliente_nome\}/g, cliente.nome || cliente.razao_social || '')
      .replace(/\{cnpj\}/g, cliente.cnpj || '')
      .replace(/\{tributacao\}/g, cliente.tributacao || cliente.regime || '')
      .replace(/\{responsavel_nome\}/g, cliente.responsavel_nome || cliente.nome || '')
      .replace(/\{contador\}/g, 'Carlos Eduardo A. M. Pimentel')
      .replace(/\{crc\}/g, 'CRC/GO 026.994/O-8')
      .replace(/\{data\}/g, agora.toLocaleDateString('pt-BR'))
      .replace(/\{mes_ano\}/g, `${mes}/${ano}`)
  }

  const copiar = (texto) => {
    navigator.clipboard.writeText(texto).catch(() => {})
  }

  const enviarBoasVindas = async () => {
    if (!clienteSel || !enviandoPara) return
    const tpl = templates.find(t => t.id === enviandoPara)
    const cli = clientes.find(c => String(c.id) === String(clienteSel))
    if (!tpl || !cli) return

    const msgFinal = interpolate(tpl.corpo, cli)
    const assuntoFinal = interpolate(tpl.assunto, cli)

    setEnviando(true); setResultadoEnvio(null)
    try {
      const r = await fetch('/api/v1/disparos/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id:    cli.id,
          telefone:      cli.whatsapp || cli.telefone || '',
          mensagem:      msgFinal,
          obrigacao_nome: 'Boas-vindas',
          template_id:   tpl.id,
        }),
      })
      const data = await r.json()
      setResultadoEnvio({ ok: r.ok, msg: r.ok ? `Mensagem enviada para ${cli.nome}! 🎉` : data.detail || 'Erro ao enviar' })
    } catch (e) {
      setResultadoEnvio({ ok: false, msg: e.message })
    }
    setEnviando(false)
  }

  const clisFiltrados = clientes.filter(c => {
    const q = buscaCli.toLowerCase()
    return !q || (c.nome||'').toLowerCase().includes(q) || (c.cnpj||'').includes(q)
  })

  const cliPreview = clientes.find(c => String(c.id) === String(clienteSel)) || {
    nome: 'Empresa Exemplo Ltda',
    cnpj: '00.000.000/0001-00',
    tributacao: 'Simples Nacional',
    responsavel_nome: 'João da Silva',
  }

  // ── Editor ────────────────────────────────────────────────────────────────
  if (editando !== null) {
    return (
      <div style={{ padding:24, maxWidth:900, margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:NAVY }}>
              {editando === 'novo' ? '➕ Novo Template' : '✏️ Editar Template'}
            </div>
            <div style={{ fontSize:12, color:'#888', marginTop:2 }}>Use as variáveis abaixo para personalizar automaticamente</div>
          </div>
          <button onClick={() => { setEditando(null); setForm(null) }}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, background:'#f5f5f5', border:'none', cursor:'pointer', color:'#555', fontSize:12 }}>
            <X size={13}/> Cancelar
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          {/* Formulário */}
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e8e8e8', padding:20 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.7 }}>Nome do Template *</label>
                <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Boas-vindas WhatsApp — Simples" style={inp}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.7 }}>Canal</label>
                  <select value={form.canal} onChange={e=>setForm(f=>({...f,canal:e.target.value}))} style={{ ...inp, cursor:'pointer' }}>
                    <option value="whatsapp">💬 WhatsApp</option>
                    <option value="email">📧 E-mail</option>
                    <option value="ambos">📲 Ambos</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.7 }}>Status</label>
                  <select value={form.ativo ? 'ativo' : 'inativo'} onChange={e=>setForm(f=>({...f,ativo:e.target.value==='ativo'}))} style={{ ...inp, cursor:'pointer' }}>
                    <option value="ativo">● Ativo</option>
                    <option value="inativo">○ Inativo</option>
                  </select>
                </div>
              </div>
              {(form.canal === 'email' || form.canal === 'ambos') && (
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.7 }}>Assunto do E-mail</label>
                  <input value={form.assunto} onChange={e=>setForm(f=>({...f,assunto:e.target.value}))} placeholder="Bem-vindo(a) à EPimentel — {cliente_nome}" style={inp}/>
                </div>
              )}
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.7 }}>Mensagem *</label>
                <textarea value={form.corpo} onChange={e=>setForm(f=>({...f,corpo:e.target.value}))} rows={14}
                  style={{ ...inp, resize:'vertical', lineHeight:1.6, fontFamily:'monospace', fontSize:12 }}/>
              </div>
              <button onClick={salvarForm} disabled={!form.nome||!form.corpo}
                style={{ padding:11, borderRadius:9, background:NAVY, color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <Save size={14}/> Salvar Template
              </button>
            </div>
          </div>

          {/* Variáveis + Preview */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e8e8e8', padding:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:10 }}>📌 Variáveis disponíveis</div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {VARIAVEIS.map(v => (
                  <div key={v.v} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', borderRadius:7, background:'#f8f9fb' }}>
                    <code style={{ fontSize:11, color:NAVY, fontWeight:700, background:GOLD+'20', padding:'1px 6px', borderRadius:5 }}>{v.v}</code>
                    <span style={{ fontSize:11, color:'#888' }}>{v.desc}</span>
                    <button onClick={() => { copiar(v.v); setCopiadoId(v.v); setTimeout(()=>setCopiadoId(null),1500) }}
                      style={{ marginLeft:'auto', padding:'2px 7px', borderRadius:5, background:'#f5f5f5', border:'1px solid #e0e0e0', cursor:'pointer', fontSize:10, color:'#777', flexShrink:0 }}>
                      {copiadoId===v.v ? '✓' : 'Copiar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {form.corpo && (
              <div style={{ background:'#ECE5DD', borderRadius:14, padding:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#555', marginBottom:10 }}>👁️ Preview (cliente de exemplo)</div>
                <div style={{ background:NAVY, borderRadius:'12px 2px 12px 12px', padding:'10px 14px', color:'#fff', fontSize:12, lineHeight:1.6, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                  {interpolate(form.corpo, cliPreview)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Lista de templates ────────────────────────────────────────────────────
  return (
    <div style={{ padding:24, maxWidth:1000, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:`linear-gradient(135deg, ${NAVY}, #2d4a7a)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Heart size={20} style={{ color:GOLD }}/>
            </div>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:NAVY }}>Templates de Boas-vindas</div>
              <div style={{ fontSize:12, color:'#888' }}>Mensagens automáticas para novos clientes cadastrados</div>
            </div>
          </div>
        </div>
        <button onClick={novoTemplate}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:9, background:NAVY, color:'#fff', fontWeight:700, fontSize:12, border:'none', cursor:'pointer', boxShadow:`0 4px 14px ${NAVY}40` }}>
          <Plus size={14}/> Novo Template
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
        {[
          { l:'Total de Templates', n:templates.length,                    c:NAVY, bg:'#EBF5FF' },
          { l:'Ativos',             n:templates.filter(t=>t.ativo).length,  c:'#1A7A3C', bg:'#EDFBF1' },
          { l:'WhatsApp',           n:templates.filter(t=>t.canal==='whatsapp'||t.canal==='ambos').length, c:'#1A7A3C', bg:'#F0FDF4' },
          { l:'E-mail',             n:templates.filter(t=>t.canal==='email'||t.canal==='ambos').length, c:'#1D6FA4', bg:'#EBF5FF' },
        ].map(s => (
          <div key={s.l} style={{ background:s.bg, borderRadius:12, padding:'14px 16px', border:`1px solid ${s.c}20` }}>
            <div style={{ fontSize:22, fontWeight:800, color:s.c }}>{s.n}</div>
            <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Painel de envio */}
      {enviandoPara && (
        <div style={{ background:'#fff', borderRadius:14, border:`2px solid ${WPP}`, padding:20, marginBottom:20, boxShadow:`0 4px 20px ${WPP}20` }}>
          <div style={{ fontSize:14, fontWeight:700, color:NAVY, marginBottom:14 }}>
            📤 Enviar: {templates.find(t=>t.id===enviandoPara)?.nome}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#888', display:'block', marginBottom:5 }}>SELECIONAR CLIENTE</label>
              <input value={buscaCli} onChange={e=>setBuscaCli(e.target.value)} placeholder="Buscar cliente..." style={inp}/>
              <div style={{ marginTop:6, maxHeight:180, overflowY:'auto', background:'#f8f9fb', borderRadius:8, border:'1px solid #e8e8e8' }}>
                {clisFiltrados.slice(0,10).map(c => (
                  <div key={c.id} onClick={()=>{setClienteSel(c.id);setBuscaCli('')}}
                    style={{ padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid #f0f0f0', background:String(c.id)===String(clienteSel)?'#EBF5FF':'transparent', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:NAVY }}>{c.nome||c.razao_social}</div>
                      <div style={{ fontSize:10, color:'#888' }}>{c.cnpj} · {c.tributacao||'—'}</div>
                    </div>
                    {String(c.id)===String(clienteSel) && <CheckCircle size={14} style={{ color:WPP }}/>}
                  </div>
                ))}
                {clisFiltrados.length === 0 && <div style={{ padding:12, textAlign:'center', color:'#bbb', fontSize:12 }}>Nenhum cliente encontrado</div>}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ background:'#ECE5DD', borderRadius:10, padding:14, flex:1, overflowY:'auto', maxHeight:200 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#888', marginBottom:8 }}>PREVIEW</div>
                <div style={{ background:NAVY, borderRadius:'10px 2px 10px 10px', padding:'9px 13px', color:'#fff', fontSize:11, lineHeight:1.55, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                  {interpolate(templates.find(t=>t.id===enviandoPara)?.corpo||'', cliPreview)}
                </div>
              </div>
              {resultadoEnvio && (
                <div style={{ padding:'9px 12px', borderRadius:8, background:resultadoEnvio.ok?'#EDFBF1':'#FEF2F2', border:`1px solid ${resultadoEnvio.ok?'#86efac':'#fca5a5'}`, fontSize:12, fontWeight:700, color:resultadoEnvio.ok?'#166534':'#991B1B' }}>
                  {resultadoEnvio.msg}
                </div>
              )}
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={enviarBoasVindas} disabled={!clienteSel||enviando}
                  style={{ flex:1, padding:'10px', borderRadius:9, background:!clienteSel||enviando?'#ccc':WPP, color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                  <Send size={14}/> {enviando ? 'Enviando...' : 'Enviar Agora'}
                </button>
                <button onClick={()=>{setEnviandoPara(null);setClienteSel('');setResultadoEnvio(null)}}
                  style={{ padding:'10px 14px', borderRadius:9, background:'#f5f5f5', color:'#555', fontSize:13, border:'none', cursor:'pointer' }}>
                  <X size={14}/>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cards dos templates */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(420px,1fr))', gap:14 }}>
        {templates.map(tpl => (
          <div key={tpl.id} style={{ background:'#fff', borderRadius:14, border:`1px solid ${tpl.ativo?'#e8e8e8':'#f0f0f0'}`, overflow:'hidden', opacity:tpl.ativo?1:0.65, boxShadow:'0 2px 8px rgba(0,0,0,.05)', transition:'box-shadow .2s' }}>
            {/* Header */}
            <div style={{ padding:'14px 16px', borderBottom:'1px solid #f5f5f5', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:NAVY }}>{tpl.nome}</span>
                </div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:tpl.canal==='whatsapp'?'#F0FDF4':tpl.canal==='email'?'#EBF5FF':'#F3EEFF', color:tpl.canal==='whatsapp'?WPP:tpl.canal==='email'?'#1D6FA4':'#6B3EC9', fontWeight:700 }}>
                    {tpl.canal==='whatsapp'?'💬 WhatsApp':tpl.canal==='email'?'📧 E-mail':'📲 Ambos'}
                  </span>
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:tpl.ativo?'#EDFBF1':'#f5f5f5', color:tpl.ativo?'#1A7A3C':'#aaa', fontWeight:700 }}>
                    {tpl.ativo ? '● Ativo' : '○ Inativo'}
                  </span>
                  {tpl.regimes?.length > 0 && tpl.regimes.slice(0,2).map(r => (
                    <span key={r} style={{ fontSize:10, padding:'2px 7px', borderRadius:10, background:GOLD+'20', color:GOLD, fontWeight:600 }}>{r}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview do corpo */}
            <div style={{ padding:'12px 16px', background:'#fafbfc', borderBottom:'1px solid #f5f5f5' }}>
              <div style={{ fontSize:11, color:'#888', lineHeight:1.5, whiteSpace:'pre-wrap', wordBreak:'break-word', maxHeight:80, overflow:'hidden', maskImage:'linear-gradient(to bottom, black 60%, transparent)' }}>
                {tpl.corpo.substring(0, 200)}
              </div>
            </div>

            {/* Ações */}
            <div style={{ padding:'10px 14px', display:'flex', gap:7 }}>
              <button onClick={() => setPreview(preview === tpl.id ? null : tpl.id)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:7, background:'#f5f5f5', color:'#555', border:'none', cursor:'pointer', fontSize:11 }}>
                <Eye size={12}/> {preview===tpl.id ? 'Fechar' : 'Preview'}
              </button>
              <button onClick={() => editarTemplate(tpl)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:7, background:'#EBF5FF', color:NAVY, border:'none', cursor:'pointer', fontSize:11 }}>
                <Edit2 size={12}/> Editar
              </button>
              <button onClick={() => { setEnviandoPara(tpl.id); setResultadoEnvio(null) }}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:7, background:WPP+'15', color:WPP, border:'none', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                <Send size={12}/> Enviar
              </button>
              <button onClick={() => toggleAtivo(tpl.id)}
                style={{ padding:'6px 10px', borderRadius:7, background:tpl.ativo?'#FEF9C3':'#EDFBF1', color:tpl.ativo?'#854D0E':'#1A7A3C', border:'none', cursor:'pointer', fontSize:11 }}>
                {tpl.ativo ? 'Desativar' : 'Ativar'}
              </button>
              <button onClick={() => excluir(tpl.id)}
                style={{ marginLeft:'auto', padding:'6px 8px', borderRadius:7, background:'#FEF2F2', color:'#dc2626', border:'none', cursor:'pointer' }}>
                <Trash2 size={12}/>
              </button>
            </div>

            {/* Preview expandido */}
            {preview === tpl.id && (
              <div style={{ padding:'12px 16px 16px', borderTop:'1px solid #f0f0f0', background:'#ECE5DD' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#555' }}>Preview da mensagem</span>
                  <button onClick={() => copiar(tpl.corpo)}
                    style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:6, background:'rgba(255,255,255,.5)', border:'1px solid rgba(0,0,0,.1)', cursor:'pointer', fontSize:10, color:'#555' }}>
                    <Copy size={10}/> Copiar
                  </button>
                </div>
                <div style={{ background:NAVY, borderRadius:'12px 2px 12px 12px', padding:'12px 15px', color:'#fff', fontSize:12, lineHeight:1.6, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                  {interpolate(tpl.corpo, cliPreview)}
                </div>
                {tpl.assunto && (
                  <div style={{ marginTop:10, padding:'7px 12px', borderRadius:8, background:'rgba(255,255,255,.5)', fontSize:11, color:'#555' }}>
                    <span style={{ fontWeight:700 }}>Assunto: </span>{interpolate(tpl.assunto, cliPreview)}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dica de integração */}
      <div style={{ marginTop:20, padding:'14px 18px', borderRadius:12, background:`${NAVY}08`, border:`1px dashed ${NAVY}30`, display:'flex', alignItems:'flex-start', gap:12 }}>
        <Zap size={18} style={{ color:GOLD, flexShrink:0, marginTop:2 }}/>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:NAVY, marginBottom:4 }}>💡 Integração automática</div>
          <div style={{ fontSize:12, color:'#666', lineHeight:1.6 }}>
            Quando um novo cliente é cadastrado no módulo <strong>Clientes</strong>, o sistema identifica o regime tributário e sugere o template de boas-vindas correspondente.
            Use o botão <strong>"Enviar"</strong> acima para disparar manualmente via WhatsApp ou e-mail.
          </div>
        </div>
      </div>
    </div>
  )
}
