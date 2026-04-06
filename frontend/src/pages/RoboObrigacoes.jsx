import { useState, useRef } from 'react'
import { Bot, Upload, FileText, CheckCircle, Loader, Eye, Download, Settings, Plus, Trash2, X, Save, Zap, Tag, Calendar, DollarSign, User, Hash, Edit2 } from 'lucide-react'

const NAVY = '#1B2A4A'
const GOLD = '#C5A55A'

const inp = { padding: '7px 10px', borderRadius: 7, border: '1px solid #e0e0e0', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box', color: '#333' }
const sel = { ...inp, cursor: 'pointer', background: '#fff' }

const TIPOS_DOC_PADRAO = [
  { id: 'guia',      label: 'Guia de Pagamento', icon: '🧾', custom: false },
  { id: 'nfe',       label: 'NF-e / NFS-e',      icon: '📄', custom: false },
  { id: 'folha',     label: 'Folha de Pagamento', icon: '👥', custom: false },
  { id: 'balancete', label: 'Balancete',          icon: '📊', custom: false },
  { id: 'extrato',   label: 'Extrato Bancário',   icon: '🏦', custom: false },
  { id: 'sped',      label: 'SPED / EFD',         icon: '📁', custom: false },
  { id: 'contrato',  label: 'Contrato',           icon: '📝', custom: false },
  { id: 'certidao',  label: 'Certidão',           icon: '🏛️', custom: false },
  { id: 'darf',      label: 'DARF',               icon: '📋', custom: false },
  { id: 'das',       label: 'DAS (Simples)',       icon: '📋', custom: false },
]

const CAMPOS_DISPONIVEIS = [
  { id: 'nome_documento',   label: 'Nome do Documento',   icon: Tag,         desc: 'Identificador ou título' },
  { id: 'vencimento',       label: 'Vencimento',          icon: Calendar,    desc: 'Data de vencimento' },
  { id: 'competencia',      label: 'Competência',         icon: Calendar,    desc: 'Mês/ano de referência' },
  { id: 'cliente',          label: 'Cliente / Empresa',   icon: User,        desc: 'CNPJ ou Razão Social' },
  { id: 'valor',            label: 'Valor Total',         icon: DollarSign,  desc: 'Valor principal' },
  { id: 'valor_multa',      label: 'Multa',               icon: DollarSign,  desc: 'Valor de multa' },
  { id: 'valor_juros',      label: 'Juros',               icon: DollarSign,  desc: 'Valor de juros' },
  { id: 'codigo_barras',    label: 'Código de Barras',    icon: Hash,        desc: 'Linha digitável' },
  { id: 'numero_doc',       label: 'Número do Documento', icon: Hash,        desc: 'Número ou protocolo' },
  { id: 'cnpj',             label: 'CNPJ',                icon: Hash,        desc: 'CNPJ do emitente' },
  { id: 'tipo_tributo',     label: 'Tipo de Tributo',     icon: Tag,         desc: 'IRPJ, CSLL, ISS...' },
  { id: 'codigo_receita',   label: 'Código de Receita',   icon: Hash,        desc: 'Código federal (DARF)' },
  { id: 'periodo_apuracao', label: 'Período de Apuração', icon: Calendar,    desc: 'Período do tributo' },
  { id: 'responsavel',      label: 'Responsável',         icon: User,        desc: 'Assinante ou responsável' },
]

const CRITERIOS_INICIAIS = [
  { id: 1, nome: 'Guia DARF Padrão',          tipo_doc: 'darf',      ativo: true, campos: ['nome_documento','vencimento','competencia','valor','codigo_barras','tipo_tributo'], obrigatorio: ['vencimento','valor'], regras: [], acao: 'registrar_entrega' },
  { id: 2, nome: 'NFS-e Goiânia',             tipo_doc: 'nfe',       ativo: true, campos: ['nome_documento','numero_doc','competencia','cliente','valor','cnpj'], obrigatorio: ['numero_doc','valor'], regras: [], acao: 'vincular_cliente' },
  { id: 3, nome: 'Folha de Pagamento Mensal', tipo_doc: 'folha',     ativo: true, campos: ['competencia','cliente','valor','responsavel','vencimento'], obrigatorio: ['competencia','valor'], regras: [], acao: 'registrar_entrega' },
]

const HISTORICO_INICIAL = [
  { id: 1, nome: 'DARF_abril_2026.pdf', tipo: 'DARF', criterio: 'Guia DARF Padrão', data: '03/04/2026 09:15', status: 'concluido', campos: { vencimento: '30/04/2026', valor: 'R$ 1.240,00', tipo_tributo: 'IRPJ', competencia: 'Mar/2026' } },
  { id: 2, nome: 'NFS_0045.pdf',        tipo: 'NF-e', criterio: 'NFS-e Goiânia',   data: '02/04/2026 14:30', status: 'concluido', campos: { numero_doc: '45', valor: 'R$ 3.500,00', cliente: 'EPimentel', competencia: 'Mar/2026' } },
]

const ICONES = ['📄','📋','🧾','📊','📁','📝','🏛️','🏦','👥','💼','🗂️','📑','🔖','📌','⚡','🔐','💰','🏢','📈','🗃️']

export default function RoboObrigacoes() {
  const [aba, setAba]               = useState('reconhecer')
  const [tiposDoc, setTiposDoc]     = useState(TIPOS_DOC_PADRAO)
  const [criterios, setCriterios]   = useState(CRITERIOS_INICIAIS)
  const [historico, setHistorico]   = useState(HISTORICO_INICIAL)
  const [tipoSel, setTipoSel]       = useState(null)
  const [arquivo, setArquivo]       = useState(null)
  const [prompt, setPrompt]         = useState('')
  const [processando, setProcessando] = useState(false)
  const [resultado, setResultado]   = useState(null)
  const [criterioEdit, setCriterioEdit] = useState(null)
  const [modalTipo, setModalTipo]   = useState(false)
  const [editTipo, setEditTipo]     = useState(null)
  const inputRef = useRef()

  // Form novo tipo de documento
  const [formTipo, setFormTipo] = useState({ label: '', icon: '📄', descricao: '' })

  // Form critério
  const [form, setForm] = useState({ nome: '', tipo_doc: 'darf', ativo: true, campos: ['nome_documento','vencimento','valor'], obrigatorio: ['vencimento','valor'], regras: [], acao: 'registrar_entrega' })
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const salvarTipo = () => {
    const id = 'custom_' + Date.now()
    if (editTipo) {
      setTiposDoc(p => p.map(t => t.id === editTipo.id ? { ...t, label: formTipo.label, icon: formTipo.icon, descricao: formTipo.descricao } : t))
    } else {
      setTiposDoc(p => [...p, { id, label: formTipo.label, icon: formTipo.icon, descricao: formTipo.descricao, custom: true }])
    }
    setFormTipo({ label: '', icon: '📄', descricao: '' })
    setEditTipo(null)
    setModalTipo(false)
  }

  const excluirTipo = (id) => {
    if (!tiposDoc.find(t => t.id === id)?.custom) return
    setTiposDoc(p => p.filter(t => t.id !== id))
  }

  const processarDocumento = async () => {
    if (!arquivo && !prompt) return
    setProcessando(true); setResultado(null)
    await new Promise(r => setTimeout(r, 2200))
    const criterioAtivo = criterios.find(c => c.tipo_doc === tipoSel && c.ativo)
    const campos = criterioAtivo?.campos || ['nome_documento','vencimento','valor']
    const mockDados = { nome_documento: arquivo?.name || 'Documento', vencimento: '30/04/2026', competencia: 'Mar/2026', cliente: 'EPimentel Auditoria & Contabilidade Ltda', valor: 'R$ 1.240,00', valor_multa: 'R$ 0,00', codigo_barras: '85800000001-2 40600001-5', numero_doc: '2026001245', cnpj: '22.939.803/0001-49', tipo_tributo: 'IRPJ', codigo_receita: '2089', responsavel: 'Carlos Eduardo A. M. Pimentel' }
    const extraidos = {}
    campos.forEach(c => { if (mockDados[c]) extraidos[c] = mockDados[c] })
    const faltando = (criterioAtivo?.obrigatorio || []).filter(c => !extraidos[c])
    setResultado({ criterio: criterioAtivo?.nome || '—', tipo_doc: tiposDoc.find(t => t.id === tipoSel)?.label || 'Documento', campos: extraidos, faltando, sucesso: faltando.length === 0 })
    setHistorico(p => [{ id: Date.now(), nome: arquivo?.name || 'Análise', tipo: tiposDoc.find(t => t.id === tipoSel)?.label || '—', criterio: criterioAtivo?.nome || '—', data: new Date().toLocaleString('pt-BR'), status: faltando.length === 0 ? 'concluido' : 'erro', campos: extraidos }, ...p])
    setProcessando(false)
  }

  const salvarCriterio = () => {
    if (criterioEdit) setCriterios(p => p.map(c => c.id === criterioEdit ? { ...form, id: criterioEdit } : c))
    else setCriterios(p => [...p, { ...form, id: Date.now() }])
    setCriterioEdit(null); setAba('criterios')
  }

  const ABAS_NAV = [
    { id: 'reconhecer',    label: '📄 Reconhecer' },
    { id: 'criterios',     label: '⚙️ Critérios' },
    { id: 'tipos_doc',     label: '🗂️ Tipos de Documento' },
    { id: 'novo_criterio', label: '➕ Novo Critério' },
    { id: 'historico',     label: '🕐 Histórico' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 44px)', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: NAVY, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 9, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bot size={20} color={NAVY} />
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Robô de Obrigações</div>
          <div style={{ color: GOLD, fontSize: 11 }}>Reconhecimento inteligente com critérios personalizados</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {[{ n: criterios.filter(c=>c.ativo).length, l:'Critérios ativos'}, { n: historico.length, l:'Processados'}, { n: historico.filter(h=>h.status==='concluido').length, l:'Concluídos'}, { n: tiposDoc.filter(t=>t.custom).length, l:'Tipos custom'}].map(s => (
            <div key={s.l} style={{ textAlign: 'center', padding: '4px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)' }}>
              <div style={{ color: GOLD, fontWeight: 700, fontSize: 15 }}>{s.n}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Abas */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', display: 'flex', paddingLeft: 16 }}>
        {ABAS_NAV.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{ padding: '10px 15px', fontSize: 12, fontWeight: aba===a.id ? 700 : 400, color: aba===a.id ? NAVY : '#999', background: 'none', border: 'none', borderBottom: aba===a.id ? `2px solid ${GOLD}` : '2px solid transparent', cursor: 'pointer' }}>{a.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: '#f8f9fb' }}>

        {/* ── RECONHECER ── */}
        {aba === 'reconhecer' && (
          <div style={{ maxWidth: 960, margin: '0 auto', padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Tipo de documento */}
              <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e8e8e8' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 12 }}>1. Tipo de Documento</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  {tiposDoc.map(t => (
                    <button key={t.id} onClick={() => setTipoSel(t.id)} style={{ padding: '8px 10px', borderRadius: 7, textAlign: 'left', cursor: 'pointer', border: `2px solid ${tipoSel===t.id ? NAVY : '#e8e8e8'}`, background: tipoSel===t.id ? '#F0F4FF' : '#fff' }}>
                      <span style={{ fontSize: 15 }}>{t.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: NAVY, marginLeft: 6 }}>{t.label}</span>
                      {t.custom && <span style={{ fontSize: 9, marginLeft: 4, padding: '1px 4px', borderRadius: 4, background: GOLD+'20', color: GOLD }}>custom</span>}
                    </button>
                  ))}
                </div>
                <button onClick={() => { setModalTipo(true); setEditTipo(null); setFormTipo({ label: '', icon: '📄', descricao: '' }) }}
                  style={{ width: '100%', marginTop: 10, padding: '7px', borderRadius: 7, border: `1px dashed ${GOLD}`, background: GOLD+'10', color: GOLD, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <Plus size={13} /> Criar novo tipo de documento
                </button>
                {tipoSel && (
                  <div style={{ marginTop: 8, padding: '7px 10px', borderRadius: 7, background: '#F0F4FF', border: '1px solid #c7d7fd', fontSize: 11, color: '#1D4ED8' }}>
                    Critério: <b>{criterios.find(c => c.tipo_doc===tipoSel && c.ativo)?.nome || 'Nenhum critério ativo'}</b>
                  </div>
                )}
              </div>

              {/* Upload */}
              <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e8e8e8' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 10 }}>2. Enviar Documento</div>
                <div onClick={() => inputRef.current?.click()} style={{ border: `2px dashed ${arquivo ? GOLD : '#d0d0d0'}`, borderRadius: 10, padding: '20px 14px', textAlign: 'center', cursor: 'pointer', background: arquivo ? '#FFFBF2' : '#fafafa' }}>
                  <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={e => setArquivo(e.target.files[0])} />
                  {arquivo ? (
                    <><FileText size={26} style={{ color: GOLD, marginBottom: 6 }} /><div style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>{arquivo.name}</div><div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{(arquivo.size/1024).toFixed(0)} KB</div></>
                  ) : (
                    <><Upload size={26} style={{ color: '#ccc', marginBottom: 6 }} /><div style={{ fontSize: 12, color: '#aaa' }}>Clique ou arraste o arquivo</div><div style={{ fontSize: 10, color: '#ccc', marginTop: 2 }}>PDF, PNG, JPG</div></>
                  )}
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e8e8e8' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8 }}>3. Instrução Adicional</div>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ex: Extraia apenas o valor principal, ignorando multa e juros..." style={{ ...inp, height: 70, resize: 'none', fontFamily: 'inherit' }} />
                <button onClick={processarDocumento} disabled={processando || (!arquivo && !prompt)}
                  style={{ width: '100%', marginTop: 10, padding: 11, borderRadius: 8, background: processando ? '#ccc' : NAVY, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: processando ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {processando ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Processando...</> : <><Zap size={15} /> Processar com IA</>}
                </button>
              </div>
            </div>

            {/* Resultado */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Resultado da Extração</div>
                {resultado && <button style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: `1px solid ${NAVY}`, color: NAVY, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Download size={11} /> Exportar</button>}
              </div>
              <div style={{ flex: 1, padding: 16 }}>
                {processando ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                    <Bot size={38} style={{ color: GOLD, marginBottom: 12 }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>Analisando critérios...</div>
                  </div>
                ) : resultado ? (
                  <>
                    <div style={{ padding: '9px 12px', borderRadius: 8, marginBottom: 12, background: resultado.sucesso ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${resultado.sucesso ? '#bbf7d0' : '#fca5a5'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {resultado.sucesso ? <CheckCircle size={17} style={{ color: '#22c55e' }} /> : <span>⚠️</span>}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: resultado.sucesso ? '#166534' : '#991B1B' }}>{resultado.sucesso ? 'Extração concluída com sucesso' : 'Campos obrigatórios faltando'}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>Critério: {resultado.criterio} · {resultado.tipo_doc}</div>
                      </div>
                    </div>
                    {Object.entries(resultado.campos).map(([k,v], i) => {
                      const campo = CAMPOS_DISPONIVEIS.find(c => c.id===k)
                      const Icon = campo?.icon || Tag
                      return (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 6, background: i%2===0 ? '#fafafa' : '#fff', marginBottom: 2 }}>
                          <Icon size={12} style={{ color: GOLD }} />
                          <span style={{ fontSize: 11, color: '#888', minWidth: 120 }}>{campo?.label || k}</span>
                          <span style={{ fontSize: 12, color: NAVY, fontWeight: 600 }}>{v}</span>
                        </div>
                      )
                    })}
                    {resultado.faltando.length > 0 && (
                      <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#FEF9C3', border: '1px solid #fde68a' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#854D0E', marginBottom: 3 }}>⚠ Campos não encontrados:</div>
                        {resultado.faltando.map(c => <div key={c} style={{ fontSize: 11, color: '#92400E' }}>• {CAMPOS_DISPONIVEIS.find(x=>x.id===c)?.label || c}</div>)}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      {resultado.sucesso && <button style={{ flex: 1, padding: '8px', borderRadius: 8, background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>✓ Confirmar e Registrar Entrega</button>}
                      <button onClick={() => { setResultado(null); setArquivo(null) }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontSize: 12, cursor: 'pointer' }}>Novo</button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                    <Eye size={38} style={{ color: '#ddd', marginBottom: 12 }} />
                    <div style={{ fontSize: 12, color: '#ccc' }}>O resultado aparecerá aqui</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TIPOS DE DOCUMENTO ── */}
        {aba === 'tipos_doc' && (
          <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Tipos de Documento</div>
              <button onClick={() => { setModalTipo(true); setEditTipo(null); setFormTipo({ label: '', icon: '📄', descricao: '' }) }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: NAVY, color: '#fff', fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer' }}>
                <Plus size={13} /> Novo Tipo
              </button>
            </div>

            {/* Padrões */}
            <div style={{ fontSize: 12, fontWeight: 700, color: '#aaa', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tipos Padrão (não editáveis)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
              {tiposDoc.filter(t => !t.custom).map(t => (
                <div key={t.id} style={{ background: '#fff', borderRadius: 9, padding: '10px 14px', border: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{t.label}</div>
                    <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>Tipo padrão do sistema</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Customizados */}
            <div style={{ fontSize: 12, fontWeight: 700, color: '#aaa', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tipos Personalizados</div>
            {tiposDoc.filter(t => t.custom).length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, border: `2px dashed ${GOLD}30`, padding: 40, textAlign: 'center', color: '#bbb' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🗂️</div>
                <div style={{ fontSize: 13 }}>Nenhum tipo personalizado criado ainda.</div>
                <button onClick={() => { setModalTipo(true); setEditTipo(null); setFormTipo({ label: '', icon: '📄', descricao: '' }) }}
                  style={{ marginTop: 10, padding: '7px 16px', borderRadius: 8, border: `1px solid ${GOLD}`, background: GOLD+'10', color: GOLD, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                  Criar primeiro tipo personalizado
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {tiposDoc.filter(t => t.custom).map(t => (
                  <div key={t.id} style={{ background: '#fff', borderRadius: 9, padding: '10px 14px', border: `1px solid ${GOLD}40`, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{t.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{t.label}</div>
                      {t.descricao && <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>{t.descricao}</div>}
                      <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: GOLD+'20', color: GOLD, fontWeight: 600 }}>personalizado</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button onClick={() => { setEditTipo(t); setFormTipo({ label: t.label, icon: t.icon, descricao: t.descricao || '' }); setModalTipo(true) }}
                        style={{ padding: '3px 7px', borderRadius: 5, background: '#EBF5FF', color: '#1D6FA4', border: 'none', cursor: 'pointer', fontSize: 11 }}>✏️</button>
                      <button onClick={() => excluirTipo(t.id)}
                        style={{ padding: '3px 7px', borderRadius: 5, background: '#FEF2F2', color: '#dc2626', border: 'none', cursor: 'pointer', fontSize: 11 }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CRITÉRIOS ── */}
        {aba === 'criterios' && (
          <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Critérios de Reconhecimento</div>
              <button onClick={() => { setForm({ nome: '', tipo_doc: 'darf', ativo: true, campos: ['nome_documento','vencimento','valor'], obrigatorio: ['vencimento','valor'], regras: [], acao: 'registrar_entrega' }); setCriterioEdit(null); setAba('novo_criterio') }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: NAVY, color: '#fff', fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer' }}>
                <Plus size={13} /> Novo Critério
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {criterios.map(c => {
                const tipoDoc = tiposDoc.find(t => t.id === c.tipo_doc)
                return (
                  <div key={c.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${c.ativo ? '#e8e8e8' : '#f0f0f0'}`, padding: '14px 16px', opacity: c.ativo ? 1 : 0.6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 18 }}>{tipoDoc?.icon || '📄'}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{c.nome}</span>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: c.ativo ? '#F0FDF4' : '#f5f5f5', color: c.ativo ? '#166534' : '#888', fontWeight: 600 }}>{c.ativo ? '● Ativo' : '○ Inativo'}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}><b>Tipo:</b> {tipoDoc?.label} &nbsp;|&nbsp; <b>Ação:</b> {c.acao === 'registrar_entrega' ? 'Registrar Entrega' : 'Vincular Cliente'}</div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {c.campos.map(campo => {
                            const cd = CAMPOS_DISPONIVEIS.find(x => x.id===campo)
                            const obrig = c.obrigatorio?.includes(campo)
                            return <span key={campo} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: obrig ? '#FEF9C3' : '#f5f5f5', color: obrig ? '#854D0E' : '#666', fontWeight: obrig ? 700 : 400, border: obrig ? '1px solid #fde68a' : '1px solid #e8e8e8' }}>{obrig ? '★ ' : ''}{cd?.label || campo}</span>
                          })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginLeft: 14 }}>
                        <button onClick={() => { setForm({ ...c }); setCriterioEdit(c.id); setAba('novo_criterio') }} style={{ padding: '5px 10px', borderRadius: 7, background: '#EBF5FF', color: '#1D6FA4', border: 'none', cursor: 'pointer', fontSize: 12 }}>✏️ Editar</button>
                        <button onClick={() => setCriterios(p => p.map(x => x.id===c.id ? { ...x, ativo: !x.ativo } : x))} style={{ padding: '5px 10px', borderRadius: 7, background: c.ativo ? '#FEF9C3' : '#F0FDF4', color: c.ativo ? '#854D0E' : '#166534', border: 'none', cursor: 'pointer', fontSize: 12 }}>{c.ativo ? 'Desativar' : 'Ativar'}</button>
                        <button onClick={() => setCriterios(p => p.filter(x => x.id!==c.id))} style={{ padding: '5px 10px', borderRadius: 7, background: '#FEF2F2', color: '#dc2626', border: 'none', cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── NOVO CRITÉRIO ── */}
        {aba === 'novo_criterio' && (
          <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', padding: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 18 }}>{criterioEdit ? 'Editar Critério' : 'Novo Critério de Reconhecimento'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
                <div><label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 4 }}>Nome do Critério</label><input value={form.nome} onChange={e => setF('nome', e.target.value)} placeholder="Ex: DARF IRPJ Mensal" style={inp} /></div>
                <div>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo de Documento</label>
                  <select value={form.tipo_doc} onChange={e => setF('tipo_doc', e.target.value)} style={sel}>
                    {tiposDoc.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}{t.custom ? ' (custom)' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 4 }}>Ação ao Reconhecer</label>
                  <select value={form.acao} onChange={e => setF('acao', e.target.value)} style={sel}>
                    <option value="registrar_entrega">Registrar Entrega</option>
                    <option value="vincular_cliente">Vincular ao Cliente</option>
                    <option value="alertar">Apenas Alertar</option>
                    <option value="arquivar">Arquivar Documento</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 8 }}>Campos a Extrair <span style={{ color: '#aaa', fontWeight: 400 }}>(★ = obrigatório)</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 7 }}>
                  {CAMPOS_DISPONIVEIS.map(c => {
                    const Icon = c.icon
                    const sel2 = form.campos.includes(c.id)
                    const obrig = form.obrigatorio.includes(c.id)
                    return (
                      <div key={c.id} style={{ border: `1px solid ${sel2 ? (obrig ? GOLD : NAVY) : '#e8e8e8'}`, borderRadius: 8, padding: '8px 10px', background: sel2 ? (obrig ? '#FFFBF2' : '#F0F4FF') : '#fafafa' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', flex: 1 }}>
                            <input type="checkbox" checked={sel2} onChange={() => setForm(f => ({ ...f, campos: sel2 ? f.campos.filter(x=>x!==c.id) : [...f.campos, c.id] }))} style={{ accentColor: NAVY }} />
                            <Icon size={11} style={{ color: sel2 ? NAVY : '#bbb' }} />
                            <span style={{ fontSize: 11, fontWeight: sel2 ? 600 : 400, color: sel2 ? NAVY : '#888' }}>{c.label}</span>
                          </label>
                          {sel2 && <span title="Marcar como obrigatório" onClick={() => setForm(f => ({ ...f, obrigatorio: obrig ? f.obrigatorio.filter(x=>x!==c.id) : [...f.obrigatorio, c.id] }))} style={{ cursor: 'pointer', fontSize: 13, color: obrig ? GOLD : '#ddd' }}>★</span>}
                        </div>
                        <div style={{ fontSize: 10, color: '#aaa', paddingLeft: 18 }}>{c.desc}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>Status:</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.ativo} onChange={e => setF('ativo', e.target.checked)} style={{ accentColor: NAVY, width: 14, height: 14 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>Critério ativo</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
                <button onClick={() => setAba('criterios')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 13 }}>↩ Voltar</button>
                <button onClick={salvarCriterio} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 8, background: NAVY, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}><Save size={14} /> Salvar Critério</button>
              </div>
            </div>
          </div>
        )}

        {/* ── HISTÓRICO ── */}
        {aba === 'historico' && (
          <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Histórico de Processamentos</div>
                <span style={{ fontSize: 12, color: '#aaa' }}>{historico.length} registros</span>
              </div>
              {historico.map((h, i) => (
                <div key={h.id} style={{ padding: '12px 18px', borderBottom: i < historico.length-1 ? '1px solid #f5f5f5' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: NAVY+'12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={15} color={NAVY} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{h.nome}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 6, background: '#f5f5f5', color: '#666' }}>{h.tipo}</span>
                      <span style={{ fontSize: 11, color: '#aaa' }}>Critério: {h.criterio}</span>
                      <span style={{ fontSize: 11, color: '#ccc' }}>{h.data}</span>
                    </div>
                    {h.campos && <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>{Object.entries(h.campos).slice(0,4).map(([k,v]) => <span key={k} style={{ fontSize: 10, padding: '1px 7px', borderRadius: 5, background: '#f0f4ff', color: NAVY }}>{CAMPOS_DISPONIVEIS.find(c=>c.id===k)?.label || k}: <b>{v}</b></span>)}</div>}
                  </div>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, background: h.status==='concluido' ? '#F0FDF4' : '#FEF2F2', color: h.status==='concluido' ? '#166534' : '#991B1B', fontWeight: 600 }}>{h.status==='concluido' ? '✓ Concluído' : '✗ Erro'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Novo Tipo de Documento ── */}
      {modalTipo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{editTipo ? 'Editar Tipo de Documento' : 'Novo Tipo de Documento'}</div>
              <button onClick={() => setModalTipo(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}><X size={18} /></button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>Nome do Tipo</label>
              <input value={formTipo.label} onChange={e => setFormTipo(f => ({ ...f, label: e.target.value }))} placeholder="Ex: Extrato PGFN, Comprovante ISS..." style={inp} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>Descrição (opcional)</label>
              <input value={formTipo.descricao} onChange={e => setFormTipo(f => ({ ...f, descricao: e.target.value }))} placeholder="Breve descrição do tipo de documento..." style={inp} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 8 }}>Ícone</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
                {ICONES.map(ic => (
                  <button key={ic} onClick={() => setFormTipo(f => ({ ...f, icon: ic }))} style={{ padding: '6px', borderRadius: 7, fontSize: 18, border: `2px solid ${formTipo.icon===ic ? NAVY : '#e8e8e8'}`, background: formTipo.icon===ic ? '#F0F4FF' : '#fff', cursor: 'pointer' }}>{ic}</button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ padding: '12px 14px', borderRadius: 9, border: `1px solid ${GOLD}40`, background: GOLD+'08', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>{formTipo.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{formTipo.label || 'Nome do tipo'}</div>
                {formTipo.descricao && <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{formTipo.descricao}</div>}
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: GOLD+'20', color: GOLD, fontWeight: 600 }}>personalizado</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalTipo(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={salvarTipo} disabled={!formTipo.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, background: formTipo.label ? NAVY : '#ccc', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: formTipo.label ? 'pointer' : 'default' }}>
                <Save size={13} /> Salvar Tipo
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
