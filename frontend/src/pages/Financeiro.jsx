import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Plus, RefreshCw, Download, AlertCircle, X, Save, Loader } from 'lucide-react'

const API = '/api/v1'

const ABAS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'pagar',     label: '📤 Contas a Pagar' },
  { id: 'receber',   label: '📥 Contas a Receber' },
  { id: 'dre',       label: '📋 DRE' },
  { id: 'fluxo',     label: '💧 Fluxo de Caixa' },
  { id: 'banco_inter', label: '🏦 Banco Inter' },
]

const SUBGRUPOS_PAGAR = {
  'Impostos e Tributos': ['DAS','GPS/INSS','FGTS','DARF','ISS','ICMS','IRPJ','CSLL','PIS','COFINS'],
  'Pessoal':             ['Salários','Pró-labore','Férias','13º Salário','INSS Patronal','FGTS Folha'],
  'Fornecedores':        ['Contabilidade','Advocacia','TI / Tecnologia','Aluguel','Água','Luz','Internet','Telefone'],
  'Administrativo':      ['Material de Escritório','Manutenção','Seguro','Outros'],
}

const SUBGRUPOS_RECEBER = {
  'Honorários':          ['Honorários Mensais','Declaração IR','Assessoria Avulsa','Consultoria'],
  'Serviços Extras':     ['Abertura de Empresa','Alteração Contratual','Certidões','Parcelamentos'],
  'Outros':              ['Reembolsos','Juros Recebidos','Outros Recebimentos'],
}

const STATUS_PAGAR   = { pendente:'#f59e0b', pago:'#22c55e', vencido:'#ef4444', cancelado:'#94a3b8' }
const STATUS_RECEBER = { pendente:'#3b82f6', recebido:'#22c55e', vencido:'#ef4444', cancelado:'#94a3b8' }

const emptyLancamento = { descricao:'', valor:'', vencimento:'', categoria:'', subgrupo:'', grupo:'', cliente_fornecedor:'', status:'pendente', observacoes:'' }

export default function Financeiro() {
  const [aba, setAba] = useState('dashboard')
  const [pagar, setPagar] = useState([])
  const [receber, setReceber] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyLancamento)
  const [loading, setLoading] = useState(false)
  const [periodo, setPeriodo] = useState({ mes: new Date().getMonth()+1, ano: new Date().getFullYear() })
  const [msg, setMsg] = useState('')
  const [filtroPagar, setFiltroPagar] = useState('')
  const [filtroReceber, setFiltroReceber] = useState('')

  useEffect(() => { carregarDados() }, [aba, periodo])

  const carregarDados = async () => {
    setLoading(true)
    try {
      if (aba === 'pagar') {
        const r = await fetch(`${API}/financeiro/lancamentos?tipo=pagar&mes=${periodo.mes}&ano=${periodo.ano}`)
        if (r.ok) setPagar(await r.json())
      } else if (aba === 'receber') {
        const r = await fetch(`${API}/financeiro/lancamentos?tipo=receber&mes=${periodo.mes}&ano=${periodo.ano}`)
        if (r.ok) setReceber(await r.json())
      } else if (aba === 'dre') {
        const r = await fetch(`${API}/financeiro/dre?mes=${periodo.mes}&ano=${periodo.ano}`)
        if (r.ok) setDre(await r.json())
      } else if (aba === 'fluxo') {
        const r = await fetch(`${API}/financeiro/fluxo-caixa?mes=${periodo.mes}&ano=${periodo.ano}`)
        if (r.ok) setFluxo(await r.json())
      } else if (aba === 'banco_inter') {
        const r = await fetch(`${API}/financeiro/banco-inter/extrato?mes=${periodo.mes}&ano=${periodo.ano}`)
        if (r.ok) setExtratoInter(await r.json())
      } else if (aba === 'dashboard') {
        const [p, rec] = await Promise.all([
          fetch(`${API}/financeiro/lancamentos?tipo=pagar&mes=${periodo.mes}&ano=${periodo.ano}`),
          fetch(`${API}/financeiro/lancamentos?tipo=receber&mes=${periodo.mes}&ano=${periodo.ano}`)
        ])
        if (p.ok) setPagar(await p.json())
        if (rec.ok) setReceber(await rec.json())
      }
    } catch {}
    setLoading(false)
  }

  const salvarLancamento = async () => {
    if (!form.descricao || !form.valor || !form.vencimento) return setMsg('❌ Preencha todos os campos obrigatórios.')
    setLoading(true)
    try {
      const tipo = modal === 'pagar' ? 'pagar' : 'receber'
      const r = await fetch(`${API}/financeiro/lancamentos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tipo, valor: Number(form.valor) })
      })
      if (r.ok) { setModal(null); setForm(emptyLancamento); carregarDados(); setMsg('✅ Salvo!') }
      else setMsg('❌ Erro ao salvar')
    } catch { setMsg('❌ Erro de conexão') }
    setLoading(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const atualizarStatus = async (id, status, tipo) => {
    await fetch(`${API}/financeiro/lancamentos/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    carregarDados()
  }

  const totalPagar   = pagar.filter(p => p.status === 'pendente').reduce((s,p) => s + p.valor, 0)
  const totalReceber = receber.filter(p => p.status === 'pendente').reduce((s,p) => s + p.valor, 0)
  const totalVencidoPagar = pagar.filter(p => p.status === 'vencido').reduce((s,p) => s + p.valor, 0)
  const saldoLiquido = totalReceber - totalPagar
  const moeda = (v) => `R$ ${(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`

  const cardFinanceiro = (label, valor, icon, cor, sub) => (
    <div style={{ background:'#fff', borderRadius:12, padding:'18px 22px', boxShadow:'0 1px 4px rgba(0,0,0,.08)', borderLeft:`4px solid ${cor}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:12, color:'#888', marginBottom:6 }}>{label}</div>
          <div style={{ fontSize:22, fontWeight:700, color:cor }}>{moeda(valor)}</div>
          {sub && <div style={{ fontSize:11, color:'#aaa', marginTop:4 }}>{sub}</div>}
        </div>
        <div style={{ background:cor+'15', borderRadius:10, padding:10 }}>{icon}</div>
      </div>
    </div>
  )

  const tabelaLancamentos = (dados, tipo) => {
    const SUBGRUPOS = tipo === 'pagar' ? SUBGRUPOS_PAGAR : SUBGRUPOS_RECEBER
    const STATUS    = tipo === 'pagar' ? STATUS_PAGAR : STATUS_RECEBER
    const filtro    = tipo === 'pagar' ? filtroPagar : filtroReceber
    const setFiltro = tipo === 'pagar' ? setFiltroPagar : setFiltroReceber

    // Agrupar por grupo
    const dadosFiltrados = filtro ? dados.filter(l => l.grupo === filtro || l.subgrupo?.startsWith(filtro)) : dados
    const grupos = Object.keys(SUBGRUPOS)

    return (
      <div>
        {/* Resumo por grupo */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10, marginBottom:14 }}>
          {grupos.map(g => {
            const total = dados.filter(l => l.grupo === g || SUBGRUPOS[g].includes(l.subgrupo)).reduce((s,l) => s + (l.valor||0), 0)
            return (
              <button key={g} onClick={() => setFiltro(filtro===g?'':g)} style={{
                padding:'10px 12px', borderRadius:9, border:`2px solid ${filtro===g?'#1B2A4A':'#e2e8f0'}`,
                background:filtro===g?'#1B2A4A':'#fff', cursor:'pointer', textAlign:'left',
                color:filtro===g?'#C5A55A':'#1B2A4A',
              }}>
                <div style={{ fontSize:11, marginBottom:4 }}>{g}</div>
                <div style={{ fontSize:15, fontWeight:700 }}>{moeda(total)}</div>
                <div style={{ fontSize:10, opacity:.6, marginTop:2 }}>{dados.filter(l => l.grupo===g||SUBGRUPOS[g].includes(l.subgrupo)).length} lançamentos</div>
              </button>
            )
          })}
        </div>

        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,.08)', overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontWeight:600, color:'#1B2A4A' }}>
              {tipo==='pagar'?'Contas a Pagar':'Contas a Receber'} {filtro && <span style={{ fontSize:12, color:'#888' }}>— {filtro}</span>}
            </span>
            <div style={{ display:'flex', gap:8 }}>
              {filtro && <button onClick={() => setFiltro('')} style={{ padding:'5px 10px', border:'1px solid #e2e8f0', borderRadius:6, background:'#fff', cursor:'pointer', fontSize:11, color:'#888' }}>✕ Limpar</button>}
              <button onClick={() => { setModal(tipo); setForm({...emptyLancamento,status:'pendente'}) }}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:tipo==='pagar'?'#ef4444':'#22c55e', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontSize:13 }}>
                <Plus size={14}/> Novo
              </button>
            </div>
          </div>
          {dadosFiltrados.length === 0 ? (
            <div style={{ padding:32, textAlign:'center', color:'#aaa', fontSize:13 }}>Nenhum lançamento. {filtro?'Tente remover o filtro.':''}</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead><tr style={{ background:'#f8fafc' }}>
                {['Descrição','Grupo / Sub-grupo','Fornecedor/Cliente','Vencimento','Valor','Status','Ações'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', color:'#64748b', fontWeight:500, fontSize:12 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {dadosFiltrados.map(l => (
                  <tr key={l.id} style={{ borderTop:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'10px 14px', fontWeight:500, color:'#1B2A4A' }}>{l.descricao}</td>
                    <td style={{ padding:'10px 14px' }}>
                      {l.grupo && <span style={{ background:'#1B2A4A10', color:'#1B2A4A', padding:'2px 7px', borderRadius:12, fontSize:11, marginRight:4 }}>{l.grupo}</span>}
                      {l.subgrupo && <span style={{ background:'#f1f5f9', color:'#475569', padding:'2px 7px', borderRadius:12, fontSize:11 }}>{l.subgrupo}</span>}
                    </td>
                    <td style={{ padding:'10px 14px', color:'#64748b' }}>{l.cliente_fornecedor||'—'}</td>
                    <td style={{ padding:'10px 14px', color:'#64748b' }}>{l.vencimento}</td>
                    <td style={{ padding:'10px 14px', fontWeight:700, color:tipo==='pagar'?'#ef4444':'#22c55e' }}>{moeda(l.valor)}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ background:(STATUS[l.status]||'#aaa')+'20', color:STATUS[l.status]||'#aaa', padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:500 }}>{l.status}</span>
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      {l.status==='pendente' && (
                        <button onClick={() => atualizarStatus(l.id, tipo==='pagar'?'pago':'recebido', tipo)}
                          style={{ padding:'4px 10px', border:'none', background:'#22c55e', color:'#fff', borderRadius:6, cursor:'pointer', fontSize:11 }}>
                          ✓ {tipo==='pagar'?'Pagar':'Receber'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1B2A4A' }}>💼 Financeiro</h1>
        <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>Gestão financeira completa do escritório e clientes</p>
      </div>

      {/* Seletor de período */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <select value={periodo.mes} onChange={e => setPeriodo(p => ({ ...p, mes: Number(e.target.value) }))}
          style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, background: '#fff' }}>
          {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select value={periodo.ano} onChange={e => setPeriodo(p => ({ ...p, ano: Number(e.target.value) }))}
          style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, background: '#fff' }}>
          {[2023, 2024, 2025, 2026].map(a => <option key={a}>{a}</option>)}
        </select>
        <button onClick={carregarDados} style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {ABAS.map(({ id, label }) => (
          <button key={id} onClick={() => setAba(id)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', whiteSpace: 'nowrap',
            background: aba === id ? '#1B2A4A' : '#fff',
            color: aba === id ? '#C5A55A' : '#64748b',
            cursor: 'pointer', fontSize: 13, fontWeight: aba === id ? 600 : 400,
            boxShadow: '0 1px 3px rgba(0,0,0,.08)',
          }}>{label}</button>
        ))}
      </div>

      {/* Dashboard */}
      {aba === 'dashboard' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
            {cardFinanceiro('Total a Receber', totalReceber, <TrendingUp size={20} color="#22c55e" />, '#22c55e', `${receber.filter(r => r.status === 'pendente').length} lançamentos`)}
            {cardFinanceiro('Total a Pagar', totalPagar, <TrendingDown size={20} color="#ef4444" />, '#ef4444', `${pagar.filter(p => p.status === 'pendente').length} lançamentos`)}
            {cardFinanceiro('Saldo Líquido', saldoLiquido, <DollarSign size={20} color={saldoLiquido >= 0 ? '#22c55e' : '#ef4444'} />, saldoLiquido >= 0 ? '#22c55e' : '#ef4444', 'Receber - Pagar')}
            {cardFinanceiro('Vencidos a Pagar', totalVencidoPagar, <AlertCircle size={20} color="#f59e0b" />, '#f59e0b', 'Requer atenção')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {tabelaLancamentos(pagar.slice(0, 5), 'pagar')}
            {tabelaLancamentos(receber.slice(0, 5), 'receber')}
          </div>
        </div>
      )}

      {aba === 'pagar' && tabelaLancamentos(pagar, 'pagar')}
      {aba === 'receber' && tabelaLancamentos(receber, 'receber')}

      {/* DRE */}
      {aba === 'dre' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1B2A4A' }}>Demonstrativo do Resultado do Exercício — {String(periodo.mes).padStart(2, '0')}/{periodo.ano}</div>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#1B2A4A', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>
              <Download size={13} /> Exportar PDF
            </button>
          </div>
          {[
            { label: 'RECEITA BRUTA', valor: totalReceber, cor: '#22c55e', negrito: true },
            { label: 'Receita de Serviços Contábeis', valor: totalReceber * 0.8, cor: '#16a34a' },
            { label: 'Outras Receitas', valor: totalReceber * 0.2, cor: '#16a34a' },
            { label: 'DEDUÇÕES', valor: totalReceber * 0.06, cor: '#ef4444', negrito: true },
            { label: 'ISS', valor: totalReceber * 0.05, cor: '#dc2626' },
            { label: 'PIS/COFINS', valor: totalReceber * 0.01, cor: '#dc2626' },
            { label: 'RECEITA LÍQUIDA', valor: totalReceber * 0.94, cor: '#2563eb', negrito: true },
            { label: 'CUSTOS E DESPESAS', valor: totalPagar, cor: '#ef4444', negrito: true },
            { label: 'Despesas de Pessoal', valor: totalPagar * 0.5, cor: '#dc2626' },
            { label: 'Despesas Administrativas', valor: totalPagar * 0.3, cor: '#dc2626' },
            { label: 'Outras Despesas', valor: totalPagar * 0.2, cor: '#dc2626' },
            { label: 'RESULTADO LÍQUIDO', valor: (totalReceber * 0.94) - totalPagar, cor: saldoLiquido >= 0 ? '#22c55e' : '#ef4444', negrito: true, destaque: true },
          ].map(({ label, valor, cor, negrito, destaque }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: destaque ? '#f0fdf4' : 'transparent', borderRadius: destaque ? 8 : 0, borderBottom: '1px solid #f1f5f9', marginBottom: destaque ? 4 : 0 }}>
              <span style={{ fontWeight: negrito ? 700 : 400, color: '#334155', fontSize: negrito ? 14 : 13, paddingLeft: negrito ? 0 : 16 }}>{label}</span>
              <span style={{ fontWeight: negrito ? 700 : 500, color: cor, fontSize: negrito ? 14 : 13 }}>{moeda(Math.abs(valor))}</span>
            </div>
          ))}
        </div>
      )}

      {/* Fluxo de Caixa */}
      {aba === 'fluxo' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#1B2A4A', marginBottom: 20 }}>Fluxo de Caixa — {String(periodo.mes).padStart(2, '0')}/{periodo.ano}</div>
          {Array.from({ length: 4 }, (_, s) => {
            const entradas = receber.filter((_, i) => i % 4 === s).reduce((t, r) => t + r.valor, 0)
            const saidas = pagar.filter((_, i) => i % 4 === s).reduce((t, p) => t + p.valor, 0)
            const saldo = entradas - saidas
            return (
              <div key={s} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr', gap: 16, padding: '12px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                <div style={{ fontWeight: 500, color: '#64748b', fontSize: 13 }}>Semana {s + 1}</div>
                <div style={{ color: '#22c55e', fontWeight: 600 }}>+ {moeda(entradas)}</div>
                <div style={{ color: '#ef4444', fontWeight: 600 }}>- {moeda(saidas)}</div>
                <div style={{ color: saldo >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{moeda(saldo)}</div>
              </div>
            )
          })}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr', gap: 16, padding: '14px 0', background: '#f8fafc', borderRadius: 8, marginTop: 8 }}>
            <div style={{ fontWeight: 700, color: '#1B2A4A', paddingLeft: 12 }}>TOTAL</div>
            <div style={{ color: '#22c55e', fontWeight: 700 }}>+ {moeda(totalReceber)}</div>
            <div style={{ color: '#ef4444', fontWeight: 700 }}>- {moeda(totalPagar)}</div>
            <div style={{ color: saldoLiquido >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{moeda(saldoLiquido)}</div>
          </div>
        </div>
      )}

      {/* Banco Inter */}
      {aba === 'banco_inter' && (
        <div>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#ff6600' }}>🏦 Banco Inter</div>
                <div style={{ fontSize: 12, color: '#888' }}>Integração via API Open Banking</div>
              </div>
              <button onClick={() => fetch(`${API}/financeiro/banco-inter/sincronizar`, { method: 'POST' }).then(() => carregarDados())}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#ff6600', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                <RefreshCw size={14} /> Sincronizar
              </button>
            </div>
            <div style={{ background: '#fff7f0', borderRadius: 8, padding: 14, border: '1px solid #fed7aa', fontSize: 13, color: '#9a3412' }}>
              ⚙️ Configure as credenciais em <code style={{ background: '#fef3c7', padding: '1px 4px', borderRadius: 3 }}>.env</code>:
              <code style={{ display: 'block', marginTop: 6, background: '#1e293b', color: '#94a3b8', padding: 10, borderRadius: 6 }}>
                INTER_CLIENT_ID=seu_client_id{'\n'}
                INTER_CLIENT_SECRET=seu_secret{'\n'}
                INTER_ACCOUNT=sua_conta
              </code>
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, color: '#1B2A4A' }}>Extrato</div>
            {extratoInter.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Configure as credenciais do Banco Inter para visualizar o extrato.</div>
            ) : extratoInter.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f8fafc' }}>
                <div>
                  <div style={{ fontWeight: 500, color: '#1B2A4A', fontSize: 13 }}>{t.descricao}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{t.data}</div>
                </div>
                <div style={{ fontWeight: 700, color: t.tipo === 'credito' ? '#22c55e' : '#ef4444', fontSize: 14 }}>
                  {t.tipo === 'credito' ? '+' : '-'} {moeda(t.valor)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de lançamento */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, width:520, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 8px 32px rgba(0,0,0,.2)' }}>
            <div style={{ fontWeight:700, fontSize:16, color:'#1B2A4A', marginBottom:20 }}>
              {modal==='pagar'?'📤 Novo Lançamento a Pagar':'📥 Novo Lançamento a Receber'}
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>Descrição *</label>
              <input value={form.descricao} onChange={e => setForm(f=>({...f,descricao:e.target.value}))}
                style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:13, boxSizing:'border-box' }}/>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>Grupo</label>
                <select value={form.grupo||''} onChange={e => setForm(f=>({...f, grupo:e.target.value, subgrupo:''}))}
                  style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:13, background:'#fff' }}>
                  <option value="">Selecione...</option>
                  {Object.keys(modal==='pagar'?SUBGRUPOS_PAGAR:SUBGRUPOS_RECEBER).map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>Sub-grupo</label>
                <select value={form.subgrupo||''} onChange={e => setForm(f=>({...f,subgrupo:e.target.value}))}
                  style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:13, background:'#fff' }}>
                  <option value="">Selecione...</option>
                  {(form.grupo?(modal==='pagar'?SUBGRUPOS_PAGAR:SUBGRUPOS_RECEBER)[form.grupo]||[]:Object.values(modal==='pagar'?SUBGRUPOS_PAGAR:SUBGRUPOS_RECEBER).flat()).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>Fornecedor/Cliente</label>
              <input value={form.cliente_fornecedor} onChange={e => setForm(f=>({...f,cliente_fornecedor:e.target.value}))}
                style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:13, boxSizing:'border-box' }}/>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>Valor (R$) *</label>
                <input type="number" value={form.valor} onChange={e => setForm(f=>({...f,valor:e.target.value}))}
                  style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:13, boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>Vencimento *</label>
                <input type="date" value={form.vencimento} onChange={e => setForm(f=>({...f,vencimento:e.target.value}))}
                  style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:13, boxSizing:'border-box' }}/>
              </div>
            </div>

            {msg && <div style={{ padding:'8px 12px', background:msg.includes('✅')?'#f0fdf4':'#fef2f2', borderRadius:7, fontSize:13, marginBottom:12, color:msg.includes('✅')?'#16a34a':'#dc2626' }}>{msg}</div>}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding:'9px 18px', border:'1px solid #e2e8f0', borderRadius:7, background:'#fff', cursor:'pointer', fontSize:13 }}>Cancelar</button>
              <button onClick={salvarLancamento} style={{ padding:'9px 18px', background:'#1B2A4A', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontSize:13, fontWeight:500 }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
