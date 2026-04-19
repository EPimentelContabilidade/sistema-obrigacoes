import { useState, useEffect } from 'react'
import { epGet, epSet } from '../utils/storage'

const NAVY = '#1F4A33'
const GOLD = '#C5A55A'
const API  = window.location.hostname === 'localhost'
  ? '/api/v1' : 'https://sistema-obrigacoes-production.up.railway.app/api/v1'

const fmtR  = v => 'R$ ' + Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
const fmtDt = d => { try { return new Date(d+'T12:00:00').toLocaleDateString('pt-BR') } catch { return d||'—' } }
const req   = async (url, opts={}) => { const r=await fetch(API+url,{...opts,signal:AbortSignal.timeout(20000)}); if(!r.ok){const t=await r.text();throw new Error(t)} return r.json() }
const post  = (url,body) => req(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
const put_  = (url,body) => req(url,{method:'PUT', headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})

const TIPOS_RESCISAO = [
  { id:'SEM_JUSTA',    label:'Demissão Sem Justa Causa', multa:true  },
  { id:'COM_JUSTA',    label:'Demissão Com Justa Causa',  multa:false },
  { id:'PEDIDO',       label:'Pedido de Demissão',         multa:false },
  { id:'ACORDO',       label:'Acordo Mútuo (§6°/6)',       multa:true  },
  { id:'APOSENTADORIA',label:'Aposentadoria',              multa:false },
]

function Card({ children, title, icon, cor, bg, style={} }) {
  return (
    <div style={{ padding:16,borderRadius:12,background:bg||'#fff',border:'1px solid '+(cor||'#e5e7eb'),...style }}>
      {title && <div style={{ fontWeight:700,color:NAVY,fontSize:13,marginBottom:12,display:'flex',alignItems:'center',gap:6 }}>{icon} {title}</div>}
      {children}
    </div>
  )
}

function StatBox({ label, valor, cor, icon }) {
  return (
    <div style={{ padding:'14px 16px',borderRadius:12,background:cor+'15',border:'1px solid '+cor+'30',textAlign:'center' }}>
      <div style={{ fontSize:22,marginBottom:4 }}>{icon}</div>
      <div style={{ fontSize:18,fontWeight:800,color:cor }}>{valor}</div>
      <div style={{ fontSize:11,color:'#666' }}>{label}</div>
    </div>
  )
}

function Campo({ label, required, children, span=1 }) {
  return (
    <div style={{ gridColumn:'span '+span }}>
      <label style={{ fontSize:11,fontWeight:700,color:'#555',display:'block',marginBottom:4 }}>
        {label}{required&&<span style={{color:'#dc2626'}}> *</span>}
      </label>
      {children}
    </div>
  )
}

const inp = { padding:'8px 10px',borderRadius:8,border:'1px solid #ddd',fontSize:13,outline:'none',width:'100%',boxSizing:'border-box',color:'#333',background:'#fff' }
const sel = { ...inp,cursor:'pointer' }

function LinhaHolerite({ label, valor, tipo='normal' }) {
  const st = { normal:{bg:'#f9fafb',cor:'#555'}, desconto:{bg:'#fef2f2',cor:'#dc2626'}, total:{bg:NAVY,cor:'#fff'}, liquido:{bg:NAVY,cor:'#fff'} }[tipo] || {bg:'#f9fafb',cor:'#555'}
  return (
    <div style={{ display:'flex',justifyContent:'space-between',padding:'7px 12px',borderRadius:7,background:st.bg,marginBottom:3 }}>
      <span style={{ fontSize:13,color:['total','liquido'].includes(tipo)?'rgba(255,255,255,0.8)':st.cor,fontWeight:['total','liquido'].includes(tipo)?700:400 }}>{label}</span>
      <span style={{ fontSize:13,fontWeight:700,color:tipo==='liquido'?GOLD:tipo==='total'?'#fff':tipo==='desconto'?'#dc2626':NAVY }}>{fmtR(valor)}</span>
    </div>
  )
}

export default function PessoalRH() {
  const [aba, setAba]       = useState('dashboard')
  const [empresa, setEmpresa] = useState(null)
  const [funcs, setFuncs]   = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]       = useState(null)

  // Sub-states para cada módulo
  const [formFunc, setFormFunc]   = useState(null)   // null = fechado
  const [calcFolha, setCalcFolha] = useState(null)
  const [calcFerias, setCalcFerias] = useState(null)
  const [calcRescisao, setCalcRescisao] = useState(null)
  const [calcDecimo, setCalcDecimo] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [provisoes, setProvisoes] = useState(null)
  const [sugestaoIA, setSugestaoIA] = useState(null)
  const [funcSelecionado, setFuncSelecionado] = useState(null)

  // Form estados
  const [competenciaFolha, setCompFolha] = useState(() => { const d=new Date(); return String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear() })
  const [anoDecimo, setAnoDecimo]     = useState(new Date().getFullYear())
  const [parcelaDecimo, setParcela]   = useState(1)
  const [dataInicioFerias, setDtFerias] = useState('')
  const [diasFerias, setDiasFerias]   = useState(30)
  const [abonoPec, setAbonoPec]       = useState(false)
  const [dtDemissao, setDtDemissao]   = useState('')
  const [tipoResc, setTipoResc]       = useState('SEM_JUSTA')
  const [avisoPrevTrab, setAvisoPrev] = useState(true)
  const [saldoFGTS, setSaldoFGTS]     = useState(0)

  useEffect(() => {
    const clientes = epGet('ep_clientes', [])
    if(clientes.length > 0) {
      const c = clientes[0]
      setEmpresa(c)
      carregarFuncionarios(c.cnpj)
      carregarDashboard(c.cnpj)
      carregarProvisoes(c.cnpj)
    }
  }, [])

  const ok = (text) => { setMsg({type:'ok',text}); setTimeout(()=>setMsg(null),3000) }
  const err = (text) => { setMsg({type:'err',text}); setTimeout(()=>setMsg(null),5000) }

  async function carregarFuncionarios(cnpj) {
    if(!cnpj) return
    try { const r=await req('/pessoal/funcionarios?empresa_cnpj='+encodeURIComponent(cnpj)); setFuncs(r) } catch(e){}
  }

  async function carregarDashboard(cnpj) {
    if(!cnpj) return
    try { const d=await req('/pessoal/dashboard/'+cnpj.replace(/\D/g,'')); setDashboard(d) } catch(e){}
  }

  async function carregarProvisoes(cnpj) {
    if(!cnpj) return
    try { const p=await req('/pessoal/provisoes/'+cnpj.replace(/\D/g,'')); setProvisoes(p) } catch(e){}
  }

  // ── CRUD Funcionário ────────────────────────────────────────────────────────
  const FORM_VAZIO = {
    nome:'',cpf:'',pis:'',rg:'',data_nascimento:'',data_admissao:'',cargo:'',
    departamento:'',salario_base:1518,dependentes:0,regime:'CLT',carga_horaria:220,
    adiantamento:0,vale_transporte:0,vale_refeicao:0,plano_saude:0,
    outros_descontos:0,outros_proventos:0,empresa_cnpj:empresa?.cnpj||'',empresa_nome:empresa?.nome_razao||empresa?.nome||'',ativo:true,observacoes:''
  }

  function abrirNovoFunc() { setFormFunc({...FORM_VAZIO,empresa_cnpj:empresa?.cnpj||'',empresa_nome:empresa?.nome_razao||empresa?.nome||''}) }
  function abrirEditFunc(f) { setFormFunc({...f}) }
  function setF(k,v) { setFormFunc(p=>({...p,[k]:v})) }

  async function salvarFuncionario() {
    if(!formFunc.nome||!formFunc.cpf||!formFunc.data_admissao||!formFunc.cargo) { err('Preencha nome, CPF, admissão e cargo'); return }
    setLoading(true)
    try {
      const payload = {...formFunc, empresa_cnpj:empresa?.cnpj||formFunc.empresa_cnpj, empresa_nome:empresa?.nome_razao||empresa?.nome||formFunc.empresa_nome}
      if(formFunc.id) { await put_('/pessoal/funcionarios/'+formFunc.id, payload) } else { await post('/pessoal/funcionarios', payload) }
      ok('Funcionário salvo!'); setFormFunc(null); carregarFuncionarios(empresa?.cnpj); carregarDashboard(empresa?.cnpj)
    } catch(e) { err('Erro: '+e.message) }
    setLoading(false)
  }

  async function desligarFuncionario(f) {
    if(!confirm('Desligar '+f.nome+'?')) return
    try { await req('/pessoal/funcionarios/'+f.id,{method:'DELETE'}); ok('Funcionário desligado!'); carregarFuncionarios(empresa?.cnpj) } catch(e) { err(e.message) }
  }

  // ── Folha ───────────────────────────────────────────────────────────────────
  async function calcularFolha() {
    setLoading(true)
    try { const r=await post('/pessoal/folha/calcular',{empresa_cnpj:empresa?.cnpj||'',competencia:competenciaFolha,funcionario_ids:[],horas_extras_50:{},horas_extras_100:{},faltas:{},afastamentos:{},bonificacoes:{},pensao_alimenticia:{}}); setCalcFolha(r); setAba('folha_resultado') } catch(e) { err(e.message) }
    setLoading(false)
  }

  // ── Férias ──────────────────────────────────────────────────────────────────
  async function calcularFerias() {
    if(!funcSelecionado||!dataInicioFerias) { err('Selecione funcionário e data de início'); return }
    setLoading(true)
    try { const r=await post('/pessoal/ferias/calcular',{funcionario_id:funcSelecionado,data_inicio:dataInicioFerias,dias:diasFerias,abono_pecuniario:abonoPec,adiantamento_13:false}); setCalcFerias(r); setAba('ferias_resultado') } catch(e) { err(e.message) }
    setLoading(false)
  }

  // ── Rescisão ─────────────────────────────────────────────────────────────────
  async function calcularRescisao() {
    if(!funcSelecionado||!dtDemissao) { err('Selecione funcionário e data de demissão'); return }
    setLoading(true)
    try { const r=await post('/pessoal/rescisao/calcular',{funcionario_id:funcSelecionado,data_demissao:dtDemissao,tipo:tipoResc,aviso_previo_trabalhado:avisoPrevTrab,dias_aviso:30,saldo_fgts:saldoFGTS}); setCalcRescisao(r); setAba('rescisao_resultado') } catch(e) { err(e.message) }
    setLoading(false)
  }

  // ── 13° ─────────────────────────────────────────────────────────────────────
  async function calcularDecimo() {
    setLoading(true)
    try { const r=await post('/pessoal/decimo-terceiro/calcular',{empresa_cnpj:empresa?.cnpj||'',competencia_ano:anoDecimo,parcela:parcelaDecimo,funcionario_ids:[]}); setCalcDecimo(r); setAba('decimo_resultado') } catch(e) { err(e.message) }
    setLoading(false)
  }

  // ── eSocial ──────────────────────────────────────────────────────────────────
  async function gerarS2200(fid) {
    try { const r=await req('/pessoal/esocial/gerar-s2200/'+fid,{method:'POST'}); alert('XML S-2200 gerado!\n'+r.arquivo); ok('S-2200 gerado com sucesso!') } catch(e){ err(e.message) }
  }

  async function gerarSugestaoIA() {
    try { const r=await req('/pessoal/ia/sugestao?empresa_cnpj='+encodeURIComponent(empresa?.cnpj||'')+'&tipo=folha'); setSugestaoIA(r) } catch(e){ err(e.message) }
  }

  // ── FGTS ─────────────────────────────────────────────────────────────────────
  async function calcularFGTS() {
    try { const r=await req('/pessoal/fgts/calcular/'+encodeURIComponent(empresa?.cnpj||'')+'/'+competenciaFolha.replace('/','%2F')); ok('FGTS calculado: '+r.funcionarios+' func. · Total: R$ '+r.total_fgts) } catch(e){ err(e.message) }
  }

  const funcsAtivos = funcs.filter(f=>f.ativo!==false)

  return (
    <div style={{ fontFamily:'Inter,system-ui,sans-serif', height:'calc(100vh - 44px)', display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <div style={{ background:NAVY, padding:'12px 24px', display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
        <div style={{ width:44,height:44,borderRadius:12,background:GOLD,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24 }}>\uD83D\uDC65</div>
        <div>
          <div style={{ color:'#fff',fontWeight:800,fontSize:15 }}>Pessoal / RH</div>
          <div style={{ color:GOLD,fontSize:11 }}>Folha · Férias · Rescisão · 13° · eSocial · FGTS Digital · Seguro Desemprego</div>
        </div>
        <div style={{ marginLeft:'auto',display:'flex',gap:8 }}>
          {[{n:funcsAtivos.length,l:'Ativos'},{n:funcs.filter(f=>f.ativo===false).length,l:'Inativos'},{n:dashboard?.provisoes_mensais?.total||0,l:'Provisões/mês',fmt:true}].map(s=>(
            <div key={s.l} style={{ textAlign:'center',padding:'4px 14px',borderRadius:10,background:'rgba(255,255,255,0.08)' }}>
              <div style={{ color:GOLD,fontWeight:800,fontSize:s.fmt?13:16 }}>{s.fmt?fmtR(s.n):s.n}</div>
              <div style={{ color:'rgba(255,255,255,0.5)',fontSize:10 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerta IA */}
      {sugestaoIA?.sugestoes?.length>0 && (
        <div style={{ background:'#eff6ff',borderBottom:'1px solid #bfdbfe',padding:'8px 24px',display:'flex',alignItems:'center',gap:10 }}>
          <span style={{ fontSize:16 }}>\uD83E\uDD16</span>
          <div style={{ flex:1 }}>
            {sugestaoIA.sugestoes.slice(0,2).map((s,i)=><div key={i} style={{ fontSize:12,color:'#1e40af' }}>• {s}</div>)}
          </div>
          <button onClick={()=>setSugestaoIA(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'#888' }}>\u2715</button>
        </div>
      )}

      {/* Mensagem */}
      {msg && <div style={{ padding:'10px 24px',background:msg.type==='ok'?'#f0fdf4':'#fef2f2',borderBottom:'1px solid '+(msg.type==='ok'?'#bbf7d0':'#fca5a5'),fontSize:13,color:msg.type==='ok'?'#166534':'#dc2626',fontWeight:600 }}>{msg.type==='ok'?'✅':'❌'} {msg.text}</div>}

      {/* Abas */}
      <div style={{ background:'#fff',borderBottom:'2px solid #f0f0f0',display:'flex',paddingLeft:16,flexShrink:0,overflowX:'auto' }}>
        {[['dashboard','\uD83D\uDCCA Dashboard'],['funcionarios','\uD83D\uDC65 Funcionários'],['folha','\uD83D\uDCB0 Folha'],['ferias','\uD83C\uDFD6\uFE0F Férias'],['rescisao','\uD83D\uDCCB Rescisão'],['decimo','\uD83C\uDF81 13° Salário'],['esocial','\uD83D\uDCE4 eSocial'],['fgts','\uD83C\uDFE6 FGTS']].map(([id,lb])=>(
          <button key={id} onClick={()=>setAba(id)} style={{ padding:'10px 14px',border:'none',background:'none',cursor:'pointer',fontSize:12,fontWeight:['dashboard','funcionarios','folha','ferias','rescisao','decimo','esocial','fgts'].includes(aba)&&aba===id?700:400,color:aba===id?NAVY:'#888',borderBottom:aba===id?'3px solid '+NAVY:'none',marginBottom:-2,whiteSpace:'nowrap' }}>{lb}</button>
        ))}
      </div>

      <div style={{ flex:1,overflow:'auto',padding:20 }}>
        {/* DASHBOARD */}
        {aba==='dashboard' && (
          <div>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
              <div style={{ fontWeight:800,color:NAVY,fontSize:16 }}>\uD83D\uDCCA Dashboard RH — {empresa?.nome_razao||empresa?.nome||'Empresa'}</div>
              <div style={{ display:'flex',gap:8 }}>
                <button onClick={gerarSugestaoIA} style={{ padding:'8px 14px',borderRadius:8,background:'#eff6ff',color:'#1e40af',border:'1px solid #bfdbfe',cursor:'pointer',fontSize:12,fontWeight:600 }}>\uD83E\uDD16 Sugestões IA</button>
                <button onClick={abrirNovoFunc} style={{ padding:'8px 16px',borderRadius:8,background:NAVY,color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:700 }}>+ Novo Funcionário</button>
              </div>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20 }}>
              <StatBox label="Funcionários Ativos" valor={dashboard?.totais?.funcionarios_ativos||funcsAtivos.length} cor="#16a34a" icon="\uD83D\uDC65"/>
              <StatBox label="Massa Salarial" valor={fmtR(dashboard?.totais?.massa_salarial||0)} cor="#1e40af" icon="\uD83D\uDCB0"/>
              <StatBox label="Custo Total Estimado" valor={fmtR(dashboard?.totais?.custo_total_estimado||0)} cor="#7c3aed" icon="\uD83D\uDCC8"/>
              <StatBox label="Provisão Mensal" valor={fmtR(provisoes?.provisoes_mensais?.total||0)} cor="#f59e0b" icon="\uD83C\uDFE6"/>
            </div>
            {provisoes && (
              <Card title="Provisões Mensais" icon="\uD83D\uDCCA" bg="#f9fafb" style={{ marginBottom:16 }}>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10 }}>
                  {[['13° Salário',provisoes.provisoes_mensais.decimo_terceiro,'#f59e0b'],['Férias',provisoes.provisoes_mensais.ferias,'#16a34a'],['FGTS',provisoes.provisoes_mensais.fgts,'#2563eb'],['INSS Patronal',provisoes.provisoes_mensais.inss_patronal,'#7c3aed']].map(([lb,vl,cor])=>(
                    <div key={lb} style={{ padding:12,borderRadius:8,background:'#fff',border:'1px solid #e5e7eb',textAlign:'center' }}>
                      <div style={{ fontSize:10,color:'#888',marginBottom:4 }}>{lb}</div>
                      <div style={{ fontWeight:800,color:cor,fontSize:15 }}>{fmtR(vl)}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {dashboard?.ferias_vencendo?.length>0 && (
              <Card title="\u26A0\uFE0F Férias Vencendo em 90 dias" icon="\uD83C\uDFD6\uFE0F" cor="#f59e0b" bg="#fffbeb">
                {dashboard.ferias_vencendo.map((f,i)=>(
                  <div key={i} style={{ display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #fde68a' }}>
                    <span style={{ fontWeight:600,color:NAVY }}>{f.nome}</span>
                    <span style={{ fontSize:12,color:'#92400e' }}>Vence: {fmtDt(f.vencimento)} ({f.dias_restantes} dias)</span>
                  </div>
                ))}
              </Card>
            )}
            {funcsAtivos.length===0 && <div style={{ textAlign:'center',padding:40,color:'#aaa' }}><div style={{ fontSize:48,marginBottom:12 }}>\uD83D\uDC65</div><div>Nenhum funcionário cadastrado.</div><button onClick={abrirNovoFunc} style={{ marginTop:12,padding:'10px 24px',borderRadius:10,background:NAVY,color:'#fff',border:'none',cursor:'pointer',fontWeight:700 }}>+ Cadastrar primeiro funcionário</button></div>}
          </div>
        )}

        {/* FUNCIONÁRIOS */}
        {aba==='funcionarios' && (
          <div>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
              <div style={{ fontWeight:800,color:NAVY,fontSize:16 }}>\uD83D\uDC65 Funcionários ({funcsAtivos.length} ativos)</div>
              <button onClick={abrirNovoFunc} style={{ padding:'9px 18px',borderRadius:8,background:NAVY,color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:700 }}>+ Novo Funcionário</button>
            </div>
            {funcsAtivos.length===0
              ? <div style={{ textAlign:'center',padding:60,color:'#aaa' }}><div style={{ fontSize:48,marginBottom:12 }}>\uD83D\uDC65</div><div>Nenhum funcionário ativo.</div></div>
              : <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                  {funcsAtivos.map(f=>(
                    <div key={f.id} style={{ padding:16,borderRadius:12,background:'#fff',border:'1px solid #e5e7eb',display:'flex',alignItems:'center',gap:14 }}>
                      <div style={{ width:44,height:44,borderRadius:22,background:NAVY+'20',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:NAVY,fontSize:16,flexShrink:0 }}>{(f.nome||'?')[0].toUpperCase()}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700,color:NAVY,fontSize:14 }}>{f.nome}</div>
                        <div style={{ fontSize:12,color:'#555' }}>{f.cargo} · {f.departamento||'—'} · Adm: {fmtDt(f.data_admissao)}</div>
                        <div style={{ fontSize:11,color:'#888' }}>CPF: {f.cpf} · {fmtR(f.salario_base)}/mês · {f.regime||'CLT'}</div>
                      </div>
                      <div style={{ display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end' }}>
                        <button onClick={()=>abrirEditFunc(f)} style={{ padding:'5px 12px',borderRadius:7,background:'#eff6ff',color:'#1e40af',border:'1px solid #bfdbfe',cursor:'pointer',fontSize:11,fontWeight:600 }}>\u270F\uFE0F Editar</button>
                        <button onClick={()=>{setFuncSelecionado(f.id);setAba('ferias')}} style={{ padding:'5px 12px',borderRadius:7,background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0',cursor:'pointer',fontSize:11,fontWeight:600 }}>\uD83C\uDFD6\uFE0F Férias</button>
                        <button onClick={()=>{setFuncSelecionado(f.id);setAba('rescisao')}} style={{ padding:'5px 12px',borderRadius:7,background:'#fef2f2',color:'#dc2626',border:'1px solid #fca5a5',cursor:'pointer',fontSize:11,fontWeight:600 }}>\uD83D\uDCCB Rescisão</button>
                        <button onClick={()=>gerarS2200(f.id)} style={{ padding:'5px 12px',borderRadius:7,background:'#f5f3ff',color:'#7c3aed',border:'1px solid #c4b5fd',cursor:'pointer',fontSize:11,fontWeight:600 }}>S-2200</button>
                        <button onClick={()=>desligarFuncionario(f)} style={{ padding:'5px 12px',borderRadius:7,background:'#fef2f2',color:'#dc2626',border:'1px solid #fca5a5',cursor:'pointer',fontSize:11 }}>\u274C</button>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* FOLHA */}
        {aba==='folha' && (
          <div style={{ maxWidth:700 }}>
            <div style={{ fontWeight:800,color:NAVY,fontSize:16,marginBottom:20 }}>\uD83D\uDCB0 Folha de Pagamento</div>
            <div style={{ display:'grid',gridTemplateColumns:'200px 1fr',gap:14,marginBottom:20 }}>
              <div>
                <label style={{ fontSize:11,fontWeight:700,color:'#555',display:'block',marginBottom:4 }}>Competência (MM/AAAA)</label>
                <input value={competenciaFolha} onChange={e=>setCompFolha(e.target.value)} style={{ ...inp,border:'2px solid '+NAVY,fontWeight:700,fontSize:14,color:NAVY }}/>
              </div>
              <div style={{ display:'flex',alignItems:'flex-end' }}>
                <div style={{ padding:12,borderRadius:8,background:'#eff6ff',border:'1px solid #bfdbfe',fontSize:11,color:'#1e40af' }}>\uD83E\uDD16 IA analisa variações e aponta anomalias na folha automaticamente.</div>
              </div>
            </div>
            <div style={{ display:'flex',gap:12 }}>
              <button onClick={calcularFolha} disabled={loading} style={{ flex:1,padding:14,borderRadius:12,background:loading?'#9ca3af':NAVY,color:'#fff',border:'none',cursor:'pointer',fontWeight:800,fontSize:15 }}>{loading?'\u23F3 Calculando...':'\uD83E\uDDEE Calcular Folha Completa'}</button>
              <button onClick={calcularFGTS} style={{ padding:14,borderRadius:12,background:'#1e40af',color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:13 }}>\uD83C\uDFE6 FGTS Digital</button>
            </div>
          </div>
        )}

        {aba==='folha_resultado' && calcFolha && (
          <div>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
              <div style={{ fontWeight:800,color:NAVY,fontSize:16 }}>Folha {calcFolha.competencia} — {calcFolha.totais.funcionarios} funcionário(s)</div>
              <button onClick={()=>setAba('folha')} style={{ padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#555',border:'1px solid #ddd',cursor:'pointer',fontSize:12 }}>\u2190 Voltar</button>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20 }}>
              {[['Total Bruto',calcFolha.totais.bruto,'#1e40af'],['INSS Total',calcFolha.totais.inss,'#f59e0b'],['IRRF Total',calcFolha.totais.irrf,'#dc2626'],['Total Líquido',calcFolha.totais.liquido,'#16a34a']].map(([lb,vl,cor])=>(
                <div key={lb} style={{ padding:14,borderRadius:10,background:cor+'10',border:'1px solid '+cor+'30',textAlign:'center' }}>
                  <div style={{ fontSize:10,color:'#888',marginBottom:4 }}>{lb}</div>
                  <div style={{ fontWeight:800,color:cor,fontSize:16 }}>{fmtR(vl)}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {calcFolha.holerites.map((h,i)=>(
                <div key={i} style={{ borderRadius:12,border:'1px solid #e5e7eb',overflow:'hidden' }}>
                  <div style={{ background:NAVY,padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                    <div><div style={{ color:'#fff',fontWeight:700,fontSize:13 }}>{h.nome}</div><div style={{ color:GOLD,fontSize:11 }}>{h.cargo}</div></div>
                    <div style={{ textAlign:'right' }}><div style={{ color:'#fff',fontSize:11 }}>Líquido</div><div style={{ color:GOLD,fontWeight:800,fontSize:16 }}>{fmtR(h.liquido)}</div></div>
                  </div>
                  <div style={{ padding:12 }}>
                    <LinhaHolerite label="Salário Base" valor={h.proventos.salario_base}/>
                    {h.proventos.horas_extras_50>0&&<LinhaHolerite label="H.E. 50%" valor={h.proventos.horas_extras_50}/>}
                    {h.proventos.horas_extras_100>0&&<LinhaHolerite label="H.E. 100%" valor={h.proventos.horas_extras_100}/>}
                    {h.proventos.outros>0&&<LinhaHolerite label="Outros Proventos" valor={h.proventos.outros}/>}
                    <LinhaHolerite label="(-) INSS" valor={h.descontos.inss} tipo="desconto"/>
                    <LinhaHolerite label="(-) IRRF" valor={h.descontos.irrf} tipo="desconto"/>
                    {h.descontos.faltas>0&&<LinhaHolerite label="(-) Faltas" valor={h.descontos.faltas} tipo="desconto"/>}
                    {h.descontos.adiantamento>0&&<LinhaHolerite label="(-) Adiantamento" valor={h.descontos.adiantamento} tipo="desconto"/>}
                    <LinhaHolerite label="(=) Líquido a Receber" valor={h.liquido} tipo="liquido"/>
                    <div style={{ marginTop:8,fontSize:11,color:'#888' }}>FGTS do mês: {fmtR(h.fgts)} · INSS: {h.inss_detalhes?.detalhes?.map(d=>d.aliquota+'%').join(', ')||'—'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FÉRIAS */}
        {aba==='ferias' && (
          <div style={{ maxWidth:600 }}>
            <div style={{ fontWeight:800,color:NAVY,fontSize:16,marginBottom:20 }}>\uD83C\uDFD6\uFE0F Cálculo de Férias</div>
            <div style={{ display:'flex',flexDirection:'column',gap:12,marginBottom:20 }}>
              <Campo label="Funcionário *">
                <select value={funcSelecionado||''} onChange={e=>setFuncSelecionado(e.target.value)} style={sel}>
                  <option value=''>— Selecione —</option>
                  {funcsAtivos.map(f=><option key={f.id} value={f.id}>{f.nome} — {fmtR(f.salario_base)}</option>)}
                </select>
              </Campo>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <Campo label="Data Início *"><input type="date" value={dataInicioFerias} onChange={e=>setDtFerias(e.target.value)} style={inp}/></Campo>
                <Campo label="Dias de Férias">
                  <select value={diasFerias} onChange={e=>setDiasFerias(parseInt(e.target.value))} style={sel}>
                    {[30,20,15,10].map(d=><option key={d} value={d}>{d} dias</option>)}
                  </select>
                </Campo>
              </div>
              <label style={{ display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer' }}>
                <input type="checkbox" checked={abonoPec} onChange={e=>setAbonoPec(e.target.checked)}/> Abono Pecuniário (vender 10 dias)
              </label>
            </div>
            <button onClick={calcularFerias} disabled={loading} style={{ width:'100%',padding:14,borderRadius:12,background:loading?'#9ca3af':NAVY,color:'#fff',border:'none',cursor:'pointer',fontWeight:800,fontSize:15 }}>{loading?'\u23F3...':'\uD83E\uDDEE Calcular Férias'}</button>
          </div>
        )}

        {aba==='ferias_resultado' && calcFerias && (
          <div style={{ maxWidth:600 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
              <div style={{ fontWeight:800,color:NAVY,fontSize:16 }}>Férias — {calcFerias.nome}</div>
              <button onClick={()=>setAba('ferias')} style={{ padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#555',border:'1px solid #ddd',cursor:'pointer',fontSize:12 }}>\u2190 Voltar</button>
            </div>
            <div style={{ padding:16,borderRadius:12,background:'#f0fdf4',border:'1px solid #bbf7d0',marginBottom:16 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                {[['Início',fmtDt(calcFerias.data_inicio)],['Retorno',fmtDt(calcFerias.data_retorno)],['Dias Férias',calcFerias.dias_ferias+' dias'],['Dias Abono',calcFerias.dias_abono+' dias']].map(([lb,vl])=>(
                  <div key={lb} style={{ padding:'8px 12px',borderRadius:8,background:'#fff',border:'1px solid #dcfce7' }}>
                    <div style={{ fontSize:10,fontWeight:700,color:'#166534' }}>{lb}</div>
                    <div style={{ fontSize:13,fontWeight:700,color:NAVY }}>{vl}</div>
                  </div>
                ))}
              </div>
            </div>
            <LinhaHolerite label="Férias" valor={calcFerias.valores.ferias}/>
            <LinhaHolerite label="1/3 Constitucional" valor={calcFerias.valores.um_terco}/>
            {calcFerias.valores.abono_pecuniario>0&&<LinhaHolerite label="Abono Pecuniário" valor={calcFerias.valores.abono_pecuniario}/>}
            <LinhaHolerite label="(-) INSS" valor={calcFerias.descontos.inss} tipo="desconto"/>
            <LinhaHolerite label="(-) IRRF" valor={calcFerias.descontos.irrf} tipo="desconto"/>
            <LinhaHolerite label="(=) Líquido" valor={calcFerias.liquido} tipo="liquido"/>
            <div style={{ marginTop:8,fontSize:11,color:'#888' }}>FGTS das férias: {fmtR(calcFerias.fgts)}</div>
          </div>
        )}

        {/* RESCISÃO */}
        {aba==='rescisao' && (
          <div style={{ maxWidth:600 }}>
            <div style={{ fontWeight:800,color:NAVY,fontSize:16,marginBottom:20 }}>\uD83D\uDCCB Cálculo de Rescisão (TRCT)</div>
            <div style={{ display:'flex',flexDirection:'column',gap:12,marginBottom:20 }}>
              <Campo label="Funcionário *">
                <select value={funcSelecionado||''} onChange={e=>setFuncSelecionado(e.target.value)} style={sel}>
                  <option value=''>— Selecione —</option>
                  {funcsAtivos.map(f=><option key={f.id} value={f.id}>{f.nome} — {fmtR(f.salario_base)}</option>)}
                </select>
              </Campo>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <Campo label="Data Demissão *"><input type="date" value={dtDemissao} onChange={e=>setDtDemissao(e.target.value)} style={inp}/></Campo>
                <Campo label="Tipo de Rescisão">
                  <select value={tipoResc} onChange={e=>setTipoResc(e.target.value)} style={sel}>
                    {TIPOS_RESCISAO.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </Campo>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <Campo label="Saldo FGTS (R$)"><input type="number" value={saldoFGTS} onChange={e=>setSaldoFGTS(parseFloat(e.target.value)||0)} style={inp}/></Campo>
                <Campo label="Aviso prévio">
                  <label style={{ display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',marginTop:8 }}>
                    <input type="checkbox" checked={avisoPrevTrab} onChange={e=>setAvisoPrev(e.target.checked)}/> Aviso trabalhado
                  </label>
                </Campo>
              </div>
            </div>
            <button onClick={calcularRescisao} disabled={loading} style={{ width:'100%',padding:14,borderRadius:12,background:loading?'#9ca3af':NAVY,color:'#fff',border:'none',cursor:'pointer',fontWeight:800,fontSize:15 }}>{loading?'\u23F3...':'\uD83E\uDDEE Calcular Rescisão'}</button>
          </div>
        )}

        {aba==='rescisao_resultado' && calcRescisao && (
          <div style={{ maxWidth:600 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
              <div style={{ fontWeight:800,color:NAVY,fontSize:16 }}>Rescisão — {calcRescisao.nome}</div>
              <button onClick={()=>setAba('rescisao')} style={{ padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#555',border:'1px solid #ddd',cursor:'pointer',fontSize:12 }}>\u2190 Voltar</button>
            </div>
            <div style={{ padding:12,borderRadius:8,background:'#fef2f2',border:'1px solid #fca5a5',marginBottom:12,fontSize:12 }}>
              <b>{TIPOS_RESCISAO.find(t=>t.id===calcRescisao.tipo_rescisao)?.label||calcRescisao.tipo_rescisao}</b> · Adm: {fmtDt(calcRescisao.data_admissao)} · Demissão: {fmtDt(calcRescisao.data_demissao)} · {calcRescisao.meses_trabalhados} meses
            </div>
            <LinhaHolerite label="Saldo de Salário" valor={calcRescisao.verbas.saldo_salario}/>
            {calcRescisao.verbas.aviso_previo_indenizado>0&&<LinhaHolerite label="Aviso Prévio Indenizado" valor={calcRescisao.verbas.aviso_previo_indenizado}/>}
            {calcRescisao.verbas.aviso_previo_trabalhado>0&&<LinhaHolerite label="Aviso Prévio Trabalhado" valor={calcRescisao.verbas.aviso_previo_trabalhado}/>}
            <LinhaHolerite label="13° Proporcional" valor={calcRescisao.verbas.decimo_terceiro_prop}/>
            <LinhaHolerite label="Férias Proporcionais" valor={calcRescisao.verbas.ferias_proporcionais}/>
            <LinhaHolerite label="1/3 sobre Férias" valor={calcRescisao.verbas.um_terco_ferias}/>
            <LinhaHolerite label="(-) INSS" valor={calcRescisao.descontos.inss} tipo="desconto"/>
            <LinhaHolerite label="(-) IRRF" valor={calcRescisao.descontos.irrf} tipo="desconto"/>
            <LinhaHolerite label="(=) Líquido TRCT" valor={calcRescisao.liquido} tipo="liquido"/>
            {calcRescisao.fgts.multa_40pct>0&&<div style={{ marginTop:8,padding:12,borderRadius:8,background:'#fffbeb',border:'1px solid #fde68a',fontSize:12 }}><b>FGTS:</b> Multa 40%: {fmtR(calcRescisao.fgts.multa_40pct)} · Contrib. Social 10%: {fmtR(calcRescisao.fgts.contribuicao_social_10pct)}</div>}
          </div>
        )}

        {/* 13° SALÁRIO */}
        {aba==='decimo' && (
          <div style={{ maxWidth:600 }}>
            <div style={{ fontWeight:800,color:NAVY,fontSize:16,marginBottom:20 }}>\uD83C\uDF81 13° Salário</div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20 }}>
              <Campo label="Ano"><input type="number" value={anoDecimo} onChange={e=>setAnoDecimo(parseInt(e.target.value)||2026)} style={{ ...inp,fontWeight:700,fontSize:14 }}/></Campo>
              <Campo label="Parcela">
                <select value={parcelaDecimo} onChange={e=>setParcela(parseInt(e.target.value))} style={sel}>
                  <option value={1}>1ª Parcela (nov) — sem desconto</option>
                  <option value={2}>2ª Parcela (dez) — com INSS/IRRF</option>
                </select>
              </Campo>
            </div>
            <button onClick={calcularDecimo} disabled={loading} style={{ width:'100%',padding:14,borderRadius:12,background:loading?'#9ca3af':NAVY,color:'#fff',border:'none',cursor:'pointer',fontWeight:800,fontSize:15 }}>{loading?'\u23F3...':'\uD83E\uDDEE Calcular 13° Salário'}</button>
          </div>
        )}

        {aba==='decimo_resultado' && calcDecimo && (
          <div>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
              <div style={{ fontWeight:800,color:NAVY,fontSize:16 }}>13° {calcDecimo.ano} — {calcDecimo.parcela}ª Parcela</div>
              <button onClick={()=>setAba('decimo')} style={{ padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#555',border:'1px solid #ddd',cursor:'pointer',fontSize:12 }}>\u2190 Voltar</button>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16 }}>
              <div style={{ padding:14,borderRadius:10,background:'#1e40af10',border:'1px solid #1e40af30',textAlign:'center' }}><div style={{ fontSize:10,color:'#888' }}>Total Bruto</div><div style={{ fontWeight:800,color:'#1e40af',fontSize:18 }}>{fmtR(calcDecimo.total_bruto)}</div></div>
              <div style={{ padding:14,borderRadius:10,background:'#16a34a10',border:'1px solid #16a34a30',textAlign:'center' }}><div style={{ fontSize:10,color:'#888' }}>Total Líquido</div><div style={{ fontWeight:800,color:'#16a34a',fontSize:18 }}>{fmtR(calcDecimo.total_liquido)}</div></div>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {calcDecimo.funcionarios.map((f,i)=>(
                <div key={i} style={{ padding:14,borderRadius:10,background:'#fff',border:'1px solid #e5e7eb',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <div><div style={{ fontWeight:700,color:NAVY }}>{f.nome}</div><div style={{ fontSize:11,color:'#888' }}>{f.avos}/12 avos · Bruto: {fmtR(f.valor_bruto)}</div></div>
                  <div style={{ textAlign:'right' }}>
                    {f.inss>0&&<div style={{ fontSize:11,color:'#dc2626' }}>INSS: {fmtR(f.inss)}</div>}
                    <div style={{ fontWeight:800,color:NAVY,fontSize:15 }}>{fmtR(f.liquido)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ESOCIAL */}
        {aba==='esocial' && (
          <div>
            <div style={{ fontWeight:800,color:NAVY,fontSize:16,marginBottom:16 }}>\uD83D\uDCE4 eSocial — Gestão de Eventos</div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:20 }}>
              {[['S-2200','Admissão do empregado','#16a34a'],['S-2299','Desligamento','#dc2626'],['S-1200','Remuneração (Pró-labore)','#7c3aed']].map(([ev,desc,cor])=>(
                <div key={ev} style={{ padding:16,borderRadius:12,background:cor+'08',border:'2px solid '+cor+'30' }}>
                  <div style={{ fontWeight:800,color:cor,fontSize:18,marginBottom:4 }}>{ev}</div>
                  <div style={{ fontSize:12,color:'#555',marginBottom:12 }}>{desc}</div>
                  <div style={{ fontSize:11,color:'#888' }}>Gere o XML e transmita ao eSocial via Portal ou certificado digital configurado.</div>
                </div>
              ))}
            </div>
            <div style={{ padding:14,borderRadius:12,background:'#fffbeb',border:'1px solid #fde68a' }}>
              <div style={{ fontWeight:700,color:'#92400e',fontSize:13,marginBottom:8 }}>\uD83D\uDCCB Gerar XMLs por funcionário</div>
              <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                {funcsAtivos.slice(0,5).map(f=>(
                  <div key={f.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderRadius:8,background:'#fff',border:'1px solid #fde68a' }}>
                    <span style={{ fontWeight:600,color:NAVY,fontSize:13 }}>{f.nome}</span>
                    <div style={{ display:'flex',gap:6 }}>
                      <button onClick={()=>gerarS2200(f.id)} style={{ padding:'4px 12px',borderRadius:6,background:'#16a34a',color:'#fff',border:'none',cursor:'pointer',fontSize:11,fontWeight:600 }}>S-2200</button>
                    </div>
                  </div>
                ))}
                {funcsAtivos.length===0&&<div style={{ color:'#888',fontSize:12,textAlign:'center',padding:12 }}>Nenhum funcionário ativo. Cadastre funcionários primeiro.</div>}
              </div>
            </div>
          </div>
        )}

        {/* FGTS */}
        {aba==='fgts' && (
          <div style={{ maxWidth:600 }}>
            <div style={{ fontWeight:800,color:NAVY,fontSize:16,marginBottom:20 }}>\uD83C\uDFE6 FGTS Digital</div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11,fontWeight:700,color:'#555',display:'block',marginBottom:4 }}>Competência (MM/AAAA)</label>
              <input value={competenciaFolha} onChange={e=>setCompFolha(e.target.value)} style={{ ...inp,border:'2px solid '+NAVY,fontWeight:700,fontSize:14,color:NAVY,maxWidth:200 }}/>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20 }}>
              <button onClick={calcularFGTS} style={{ padding:14,borderRadius:12,background:'#1e40af',color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:14 }}>\uD83E\uDDEE Calcular FGTS</button>
              <button onClick={calcularFolha} style={{ padding:14,borderRadius:12,background:NAVY,color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:14 }}>\uD83D\uDCB0 Gerar Guia FGTS</button>
            </div>
            <div style={{ padding:16,borderRadius:12,background:'#eff6ff',border:'1px solid #bfdbfe' }}>
              <div style={{ fontWeight:700,color:'#1e40af',fontSize:13,marginBottom:10 }}>\uD83D\uDCCB FGTS Digital — Como funciona:</div>
              <div style={{ fontSize:12,color:'#555',lineHeight:2 }}>
                \u2022 8% sobre salário bruto de cada funcionário<br/>
                \u2022 Recolhimento até dia 7 do mês seguinte<br/>
                \u2022 Multa rescisória: 40% do saldo FGTS (sem justa causa)<br/>
                \u2022 Integração com SEFIP/GFIP via eSocial (S-1200)<br/>
                \u2022 Configure o certificado digital para transmissão automática
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modal Funcionário */}
      {formFunc && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
          <div style={{ background:'#fff',borderRadius:16,padding:28,maxWidth:700,width:'100%',maxHeight:'90vh',overflow:'auto',boxShadow:'0 24px 70px rgba(0,0,0,0.25)' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
              <div style={{ fontWeight:800,color:NAVY,fontSize:16 }}>{formFunc.id?'\u270F\uFE0F Editar Funcionário':'\u2795 Novo Funcionário'}</div>
              <button onClick={()=>setFormFunc(null)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:20,color:'#888' }}>\u2715</button>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12 }}>
              <Campo label="Nome completo" required span={3}><input style={inp} value={formFunc.nome||''} onChange={e=>setF('nome',e.target.value)} placeholder="Nome Sobrenome"/></Campo>
              <Campo label="CPF" required><input style={inp} value={formFunc.cpf||''} onChange={e=>setF('cpf',e.target.value)} placeholder="000.000.000-00"/></Campo>
              <Campo label="PIS/PASEP"><input style={inp} value={formFunc.pis||''} onChange={e=>setF('pis',e.target.value)}/></Campo>
              <Campo label="Data Nascimento"><input type="date" style={inp} value={formFunc.data_nascimento||''} onChange={e=>setF('data_nascimento',e.target.value)}/></Campo>
              <Campo label="Data Admissão" required><input type="date" style={inp} value={formFunc.data_admissao||''} onChange={e=>setF('data_admissao',e.target.value)}/></Campo>
              <Campo label="Cargo" required><input style={inp} value={formFunc.cargo||''} onChange={e=>setF('cargo',e.target.value)} placeholder="Assistente, Analista..."/></Campo>
              <Campo label="Departamento"><input style={inp} value={formFunc.departamento||''} onChange={e=>setF('departamento',e.target.value)}/></Campo>
              <Campo label="Salário Base (R$)" required><input type="number" style={{...inp,fontWeight:700}} value={formFunc.salario_base||1518} onChange={e=>setF('salario_base',parseFloat(e.target.value)||0)}/></Campo>
              <Campo label="Dependentes"><input type="number" min={0} style={inp} value={formFunc.dependentes||0} onChange={e=>setF('dependentes',parseInt(e.target.value)||0)}/></Campo>
              <Campo label="Regime">
                <select style={sel} value={formFunc.regime||'CLT'} onChange={e=>setF('regime',e.target.value)}>
                  {['CLT','PJ','Horista','Aprendiz','Estágio'].map(r=><option key={r}>{r}</option>)}
                </select>
              </Campo>
              <Campo label="Carga Horária/mês"><input type="number" style={inp} value={formFunc.carga_horaria||220} onChange={e=>setF('carga_horaria',parseInt(e.target.value)||220)}/></Campo>
              <Campo label="Vale Transporte (R$)"><input type="number" style={inp} value={formFunc.vale_transporte||0} onChange={e=>setF('vale_transporte',parseFloat(e.target.value)||0)}/></Campo>
              <Campo label="Vale Refeição (R$)"><input type="number" style={inp} value={formFunc.vale_refeicao||0} onChange={e=>setF('vale_refeicao',parseFloat(e.target.value)||0)}/></Campo>
              <Campo label="Plano Saúde (R$)"><input type="number" style={inp} value={formFunc.plano_saude||0} onChange={e=>setF('plano_saude',parseFloat(e.target.value)||0)}/></Campo>
              <Campo label="Adiantamento (R$)"><input type="number" style={inp} value={formFunc.adiantamento||0} onChange={e=>setF('adiantamento',parseFloat(e.target.value)||0)}/></Campo>
            </div>
            <Campo label="Observações" span={3}><input style={inp} value={formFunc.observacoes||''} onChange={e=>setF('observacoes',e.target.value)} placeholder="Observações gerais..."/></Campo>
            <div style={{ display:'flex',gap:12,marginTop:20 }}>
              <button onClick={()=>setFormFunc(null)} style={{ flex:1,padding:12,borderRadius:8,background:'#f3f4f6',color:'#555',border:'none',cursor:'pointer',fontWeight:600 }}>Cancelar</button>
              <button onClick={salvarFuncionario} disabled={loading} style={{ flex:2,padding:12,borderRadius:8,background:loading?'#9ca3af':NAVY,color:'#fff',border:'none',cursor:'pointer',fontWeight:800,fontSize:14 }}>{loading?'\u23F3 Salvando...':'\uD83D\uDCBE Salvar Funcionário'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
