import { useState, useEffect, useRef } from "react";

const NAVY = "#1B2A4A";
const GOLD = "#C5A55A";
const fmtData = d => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const hoje = () => new Date().toISOString().split("T")[0];

const CATEGORIAS = ["Contábil","Fiscal","RH / Departamento Pessoal","Paralegal / Societário","Financeiro","Imobiliário / SPE","Outros"];
const STATUS_CORES = { "Em Andamento":"#2196F3","Aguardando Cliente":"#FF9800","Concluído":"#4CAF50","Cancelado":"#F44336","Pendente":"#9C27B0" };
const PRIORIDADES = ["Baixa","Normal","Alta","Urgente"];

// ── Templates padrão por categoria ───────────────────────────────────────────
const TEMPLATES_PADRAO = [
  // CONTÁBIL
  { id:"balanco",       categoria:"Contábil",           icone:"📊", cor:"#4CAF50", nome:"Elaboração de Balanço Patrimonial",  descricao:"Fechamento contábil e elaboração das demonstrações financeiras", etapas:["Conferência dos lançamentos do período","Conciliação bancária","Apuração de estoques","Cálculo de depreciação","Elaboração do Balanço Patrimonial","Elaboração da DRE","Elaboração das Notas Explicativas","Entrega ao cliente"] },
  { id:"dre",           categoria:"Contábil",           icone:"📈", cor:"#2196F3", nome:"DRE e Análise de Resultados",         descricao:"Demonstração do Resultado do Exercício com análise de indicadores", etapas:["Fechamento das contas de resultado","Apuração do lucro/prejuízo","Cálculo de IRPJ e CSLL","Elaboração da DRE","Cálculo de índices financeiros","Relatório de análise","Entrega ao cliente"] },
  { id:"sped_cont",     categoria:"Contábil",           icone:"🗂️", cor:"#607D8B", nome:"SPED Contábil",                       descricao:"Escrituração Contábil Digital — ECD", etapas:["Conferência dos lançamentos","Geração do arquivo ECD","Validação no PVA","Assinatura digital","Transmissão à RFB","Conferência do recibo","Arquivamento"] },
  { id:"ecf",           categoria:"Contábil",           icone:"📋", cor:"#795548", nome:"ECF — Escrituração Contábil Fiscal",   descricao:"Escrituração Contábil Fiscal anual", etapas:["Levantamento de dados fiscais e contábeis","Preenchimento do ECF","Conferência do LALUR/LACS","Validação no PVA","Assinatura digital","Transmissão à RFB","Arquivamento do recibo"] },
  // FISCAL
  { id:"abertura",      categoria:"Paralegal / Societário", icone:"🏢", cor:"#2196F3", nome:"Abertura de Empresa",             descricao:"Constituição de nova empresa no CNPJ, Junta e Prefeitura", etapas:["Coleta de documentos dos sócios","Elaboração do Contrato Social","Registro na Junta Comercial","Inscrição no CNPJ / RFB","Inscrição Estadual (se aplicável)","Inscrição Municipal / Alvará","Abertura de conta bancária PJ","Configuração no sistema contábil"] },
  { id:"baixa",         categoria:"Paralegal / Societário", icone:"📴", cor:"#F44336", nome:"Baixa de Empresa",                descricao:"Encerramento e dissolução da empresa", etapas:["Verificação de pendências fiscais e trabalhistas","Elaboração da Distrato / Ata de dissolução","Apuração final de resultados","Quitação de tributos pendentes","Baixa na Junta Comercial","Baixa no CNPJ / RFB","Baixa na Inscrição Estadual","Baixa na Inscrição Municipal"] },
  { id:"alteracao",     categoria:"Paralegal / Societário", icone:"📝", cor:"#FF9800", nome:"Alteração Contratual",            descricao:"Alteração de sócios, endereço, atividade ou capital", etapas:["Recebimento da solicitação e documentação","Elaboração da Alteração Contratual","Assinatura do documento","Registro na Junta Comercial","Atualização no CNPJ / RFB","Atualização na Inscrição Estadual","Atualização na Inscrição Municipal"] },
  { id:"parcelamento",  categoria:"Fiscal",             icone:"💰", cor:"#9C27B0", nome:"Parcelamento / PERT",                  descricao:"Parcelamento de débitos fiscais — PERT, Refis, Parcelamento Ordinário", etapas:["Levantamento de débitos (Certidões e PGDAS)","Cálculo das modalidades de parcelamento","Apresentação das opções ao cliente","Adesão ao programa escolhido","Inclusão de todas as dívidas","Emissão do DAS de adesão","Confirmação da adesão no portal","Controle mensal das parcelas"] },
  { id:"regularizacao", categoria:"Fiscal",             icone:"✅", cor:"#4CAF50", nome:"Regularização Fiscal",                 descricao:"Regularização de pendências fiscais diversas", etapas:["Diagnóstico das pendências","Retificação de declarações (se necessário)","Quitação / parcelamento dos débitos","Obtenção de Certidão Negativa","Regularização junto à SEFAZ (se aplicável)","Relatório final ao cliente"] },
  { id:"defis",         categoria:"Fiscal",             icone:"📑", cor:"#00BCD4", nome:"DEFIS — Declaração Anual Simples",     descricao:"Entrega da DEFIS para empresas do Simples Nacional", etapas:["Levantamento do faturamento anual","Conferência do PGDAS-D","Preenchimento da DEFIS","Validação dos dados","Transmissão","Arquivamento do recibo"] },
  { id:"irpf",          categoria:"Fiscal",             icone:"🧾", cor:"#FF5722", nome:"IRPF — Imposto de Renda Pessoa Física", descricao:"Declaração de Ajuste Anual da Pessoa Física", etapas:["Coleta de informes de rendimentos","Coleta de documentos de despesas dedutíveis","Análise de bens e direitos","Preenchimento da declaração","Revisão e conferência","Transmissão","Entrega do recibo ao cliente"] },
  { id:"pgdas",         categoria:"Fiscal",             icone:"📊", cor:"#3F51B5", nome:"PGDAS-D Mensal",                       descricao:"Apuração e pagamento do Simples Nacional", etapas:["Conferência do faturamento mensal","Classificação das receitas por atividade","Cálculo das alíquotas efetivas","Geração do DAS","Conferência com o cliente","Pagamento / Arquivamento"] },
  // RH / PESSOAL
  { id:"admissao",      categoria:"RH / Departamento Pessoal", icone:"👤", cor:"#1B2A4A", nome:"Admissão de Empregado",         descricao:"Contratação e integração de novo colaborador", etapas:["Recebimento dos documentos do empregado","Elaboração do Contrato de Trabalho","Registro no eSocial (S-2200)","Emissão da CTPS digital","Inclusão no ponto eletrônico","Configuração no sistema de folha","Entrega de documentos ao empregado"] },
  { id:"demissao",      categoria:"RH / Departamento Pessoal", icone:"🚪", cor:"#795548", nome:"Demissão de Empregado",          descricao:"Rescisão contratual e homologação", etapas:["Recebimento do aviso ou decisão","Cálculo das verbas rescisórias","Elaboração do TRCT","Geração da guia de FGTS (GRRF)","Comunicação ao eSocial (S-2299)","Homologação (se aplicável)","Entrega das guias e documentos","Arquivamento do processo"] },
  { id:"ferias",        categoria:"RH / Departamento Pessoal", icone:"🏖️", cor:"#00BCD4", nome:"Férias de Empregado",            descricao:"Programação, aviso e pagamento de férias", etapas:["Verificação do período aquisitivo","Comunicação de férias ao empregado (30 dias antes)","Emissão do recibo de férias","Cálculo do pagamento","Pagamento (2 dias antes)","Registro no eSocial","Arquivamento"] },
  { id:"folha",         categoria:"RH / Departamento Pessoal", icone:"💼", cor:"#607D8B", nome:"Folha de Pagamento Mensal",       descricao:"Processamento da folha, FGTS e contribuições", etapas:["Conferência de ponto e horas extras","Lançamento de eventos variáveis","Cálculo da folha","Emissão do holerite","Geração da GRRF/FGTS","Geração do DCTFWeb","Pagamento do INSS","Fechamento e arquivamento"] },
  { id:"esocial",       categoria:"RH / Departamento Pessoal", icone:"🖥️", cor:"#4CAF50", nome:"eSocial — Envios Mensais",        descricao:"Envio dos eventos mensais ao eSocial", etapas:["Conferência de admissões e demissões do período","Envio S-1200 (Remunerações)","Envio S-1210 (Pagamentos)","Conferência de pendências","Fechamento do período no eSocial","Arquivamento dos recibos"] },
  // FINANCEIRO
  { id:"fluxo",         categoria:"Financeiro",         icone:"💹", cor:"#4CAF50", nome:"Fluxo de Caixa e Projeção",            descricao:"Elaboração do fluxo de caixa e projeção financeira", etapas:["Levantamento de receitas e despesas do período","Conciliação bancária","Elaboração do fluxo de caixa realizado","Projeção para os próximos meses","Análise de indicadores (liquidez, endividamento)","Apresentação ao cliente"] },
  { id:"planejamento",  categoria:"Financeiro",         icone:"🎯", cor:"#FF9800", nome:"Planejamento Tributário",               descricao:"Comparativo de regimes e planejamento tributário", etapas:["Levantamento do faturamento e folha dos últimos 12 meses","Simulação Simples Nacional","Simulação Lucro Presumido","Simulação Lucro Real","Elaboração do relatório comparativo","Apresentação das opções ao cliente","Decisão e implementação"] },
  { id:"cert_neg",      categoria:"Financeiro",         icone:"📜", cor:"#9C27B0", nome:"Obtenção de Certidões Negativas",       descricao:"Certidões federal, estadual, municipal e trabalhista", etapas:["Verificação de pendências na RFB","Emissão da CND Federal (PGFN+RFB)","Emissão da CND Estadual (SEFAZ)","Emissão da CND Municipal","Emissão da CNDT (trabalhista)","Entrega das certidões ao cliente"] },
  // IMOBILIÁRIO
  { id:"spe",           categoria:"Imobiliário / SPE",  icone:"🏗️", cor:"#00BCD4", nome:"SPE Imobiliária",                       descricao:"Constituição e operação de SPE com RET e Patrimônio de Afetação", etapas:["Constituição da SPE na Junta Comercial","Inscrição no CNPJ","Opção pelo RET (4%)","Registro do Patrimônio de Afetação","Abertura de conta bancária segregada","Configuração CPC 47 / POC no sistema","Elaboração do primeiro DRE parcial","Entrega dos documentos ao cliente"] },
  { id:"ret",           categoria:"Imobiliário / SPE",  icone:"🏠", cor:"#E91E63", nome:"Apuração RET Mensal",                   descricao:"Apuração e pagamento do Regime Especial de Tributação", etapas:["Levantamento das receitas do empreendimento","Aplicação da alíquota RET (4%)","Cálculo individualizado (IRPJ 1,26% + CSLL 0,66% + PIS 0,37% + COFINS 1,71%)","Geração do DARF","Pagamento","Arquivamento"] },
  { id:"poc",           categoria:"Imobiliário / SPE",  icone:"📐", cor:"#607D8B", nome:"Reconhecimento de Receita CPC 47 / POC", descricao:"Apuração pelo Percentual de Obra Concluído", etapas:["Levantamento do percentual de obra concluído","Cálculo da receita a reconhecer (POC)","Atualização das contas do balanço","Elaboração da DRE parcial","Notas explicativas","Entrega ao cliente"] },
];

// ── Helpers UI ────────────────────────────────────────────────────────────────
function Badge({ cor, texto }) {
  return <span style={{ background:cor+"22",color:cor,border:`1px solid ${cor}44`,borderRadius:12,padding:"2px 10px",fontSize:11,fontWeight:700 }}>{texto}</span>;
}

function Modal({ titulo, onClose, children, largura=620 }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"#fff",borderRadius:14,width:"100%",maxWidth:largura,maxHeight:"92vh",overflow:"auto",boxShadow:"0 8px 40px rgba(0,0,0,.2)" }}>
        <div style={{ padding:"16px 22px",borderBottom:"1px solid #eee",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff",zIndex:1 }}>
          <span style={{ fontWeight:700,color:NAVY,fontSize:16 }}>{titulo}</span>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#999" }}>×</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

const inputStyle = { width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid #ddd",fontSize:13,boxSizing:"border-box",outline:"none" };
function Campo({ label, children }) {
  return <div style={{ marginBottom:14 }}><label style={{ display:"block",fontWeight:600,color:NAVY,marginBottom:5,fontSize:13 }}>{label}</label>{children}</div>;
}

// ── MODAL EDITAR TEMPLATE ─────────────────────────────────────────────────────
function ModalTemplate({ template, onSave, onClose }) {
  const [form, setForm] = useState({ ...template });
  const [novaEtapa, setNovaEtapa] = useState("");
  const COR_OPTIONS = ["#1B2A4A","#C5A55A","#2196F3","#4CAF50","#FF9800","#E91E63","#9C27B0","#00BCD4","#F44336","#607D8B","#795548","#FF5722"];

  const addEtapa = () => { if(novaEtapa.trim()){ setForm(f=>({...f,etapas:[...f.etapas,novaEtapa.trim()]})); setNovaEtapa(""); } };
  const removeEtapa = i => setForm(f=>({...f,etapas:f.etapas.filter((_,idx)=>idx!==i)}));
  const moveEtapa = (i,dir) => {
    const arr=[...form.etapas]; const j=i+dir;
    if(j<0||j>=arr.length) return;
    [arr[i],arr[j]]=[arr[j],arr[i]]; setForm(f=>({...f,etapas:arr}));
  };

  return (
    <Modal titulo={form.id?"Editar Template":"Novo Template"} onClose={onClose} largura={680}>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
        <Campo label="Nome do Template *"><input style={inputStyle} value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} /></Campo>
        <Campo label="Categoria">
          <select style={inputStyle} value={form.categoria||"Outros"} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>
            {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
          </select>
        </Campo>
      </div>
      <Campo label="Descrição"><textarea style={{ ...inputStyle,height:60,resize:"none",fontFamily:"inherit" }} value={form.descricao||""} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} /></Campo>
      <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:14 }}>
        <Campo label="Ícone (emoji)"><input style={inputStyle} value={form.icone||""} onChange={e=>setForm(f=>({...f,icone:e.target.value}))} placeholder="🏢" /></Campo>
        <Campo label="Cor">
          <div style={{ display:"flex",gap:6,flexWrap:"wrap",paddingTop:2 }}>
            {COR_OPTIONS.map(c=><div key={c} onClick={()=>setForm(f=>({...f,cor:c}))} style={{ width:24,height:24,borderRadius:"50%",background:c,cursor:"pointer",border:form.cor===c?"3px solid #333":"3px solid transparent" }} />)}
          </div>
        </Campo>
      </div>
      <Campo label="Etapas">
        <div style={{ border:"1px solid #eee",borderRadius:8,overflow:"hidden",marginBottom:8 }}>
          {(form.etapas||[]).length===0 && <div style={{ padding:12,color:"#aaa",fontSize:13,textAlign:"center" }}>Nenhuma etapa</div>}
          {(form.etapas||[]).map((e,i)=>(
            <div key={i} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:"1px solid #f5f5f5",background:i%2===0?"#FAFAFA":"#fff" }}>
              <div style={{ width:22,height:22,borderRadius:"50%",background:form.cor||NAVY,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>{i+1}</div>
              <input style={{ ...inputStyle,flex:1,padding:"4px 8px",border:"none",background:"transparent" }} value={e}
                onChange={ev=>{ const arr=[...form.etapas]; arr[i]=ev.target.value; setForm(f=>({...f,etapas:arr})); }} />
              <div style={{ display:"flex",gap:3 }}>
                <button onClick={()=>moveEtapa(i,-1)} style={{ background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:14,padding:"0 2px" }}>↑</button>
                <button onClick={()=>moveEtapa(i,1)} style={{ background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:14,padding:"0 2px" }}>↓</button>
                <button onClick={()=>removeEtapa(i)} style={{ background:"none",border:"none",cursor:"pointer",color:"#e53935",fontSize:14,padding:"0 2px" }}>✕</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <input style={{ ...inputStyle,flex:1 }} value={novaEtapa} onChange={e=>setNovaEtapa(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addEtapa()} placeholder="Descrição da nova etapa..." />
          <button onClick={addEtapa} style={{ background:NAVY,color:"#fff",border:"none",borderRadius:8,padding:"0 16px",cursor:"pointer",fontSize:13,fontWeight:700 }}>+</button>
        </div>
      </Campo>
      <div style={{ display:"flex",gap:12,justifyContent:"flex-end",marginTop:8 }}>
        <button onClick={onClose} style={{ background:"none",border:"1px solid #ddd",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13 }}>Cancelar</button>
        <button onClick={()=>{ if(form.nome) onSave(form); }} disabled={!form.nome}
          style={{ background:NAVY,color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontWeight:700,fontSize:13,opacity:!form.nome?0.5:1 }}>
          Salvar Template
        </button>
      </div>
    </Modal>
  );
}

// ── MODAL ANÁLISE IA ─────────────────────────────────────────────────────────
function ModalIA({ onClose, onVincular }) {
  const [arquivo, setArquivo] = useState(null);
  const [analisando, setAnalisando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [tipoDoc, setTipoDoc] = useState("auto");
  const fileRef = useRef();

  const TIPOS = ["auto","Contrato Social","Alteração Contratual","Distrato","Procuração","Nota Fiscal","Guia de Tributo","Holerite","Folha de Pagamento","Certidão","Balanço Patrimonial","Outro"];

  const analisar = async (file) => {
    if(!file) return;
    setArquivo(file); setAnalisando(true); setResultado(null);
    const reader = new FileReader();
    reader.onload = async ev => {
      const base64 = ev.target.result.split(",")[1];
      const isPDF = file.type==="application/pdf";
      const isImage = file.type.startsWith("image/");
      if(!isPDF && !isImage) { setResultado({ erro:"Envie um PDF ou imagem." }); setAnalisando(false); return; }
      try {
        const prompt = tipoDoc==="auto"
          ? `Analise este documento e identifique:\n1. Tipo de documento\n2. Empresa(s) / CNPJ(s) envolvidos\n3. Partes (sócios, procuradores, etc.)\n4. Objeto/finalidade\n5. Data do documento\n6. Valores mencionados (se houver)\n7. Pendências ou ações necessárias\n8. Categoria sugerida (Contábil/Fiscal/RH/Paralegal/Financeiro)\n9. Template de processo recomendado\n\nSeja objetivo e estruturado.`
          : `Analise este documento do tipo "${tipoDoc}" e identifique:\n1. Empresa(s) / CNPJ(s)\n2. Partes envolvidas\n3. Objeto principal\n4. Data\n5. Valores\n6. Pendências ou próximas ações necessárias no escritório contábil\n\nSeja objetivo e estruturado.`;
        const content = isPDF
          ? [{ type:"document",source:{ type:"base64",media_type:"application/pdf",data:base64 }},{ type:"text",text:prompt }]
          : [{ type:"image",source:{ type:"base64",media_type:file.type,data:base64 }},{ type:"text",text:prompt }];
        const r = await fetch("https://api.anthropic.com/v1/messages",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({ model:"claude-sonnet-4-20250514",max_tokens:1200,messages:[{role:"user",content}] })
        });
        const d = await r.json();
        setResultado({ texto: d.content?.[0]?.text||"Não foi possível analisar.", arquivo:file.name });
      } catch(e) { setResultado({ erro:"Erro ao conectar com a IA: "+e.message }); }
      setAnalisando(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Modal titulo="🤖 Análise de Documentos com IA" onClose={onClose} largura={680}>
      <div style={{ marginBottom:16 }}>
        <Campo label="Tipo de documento (opcional — melhora a análise)">
          <select style={inputStyle} value={tipoDoc} onChange={e=>setTipoDoc(e.target.value)}>
            {TIPOS.map(t=><option key={t} value={t}>{t==="auto"?"🔍 Detectar automaticamente":t}</option>)}
          </select>
        </Campo>
      </div>
      <div onClick={()=>fileRef.current.click()} style={{ border:"2px dashed #C0C0C0",borderRadius:12,padding:"28px 20px",textAlign:"center",cursor:"pointer",background:"#FAFAFA",marginBottom:16,transition:"border-color .2s" }}
        onDragOver={e=>{e.preventDefault();}} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)analisar(f);}}>
        <div style={{ fontSize:36,marginBottom:8 }}>📄</div>
        <div style={{ fontWeight:700,color:NAVY,marginBottom:4 }}>Arraste o documento aqui ou clique para selecionar</div>
        <div style={{ fontSize:12,color:"#aaa" }}>PDF, PNG, JPG — Contrato Social, Alteração, Certidão, NF, Holerite…</div>
        <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display:"none" }} onChange={e=>{const f=e.target.files[0];if(f)analisar(f);}} />
      </div>
      {arquivo && !analisando && !resultado && <div style={{ padding:10,background:"#F0F4FF",borderRadius:8,fontSize:13,color:NAVY }}>📎 {arquivo.name}</div>}
      {analisando && (
        <div style={{ padding:20,background:"#F0F4FF",borderRadius:10,textAlign:"center" }}>
          <div style={{ fontSize:32,marginBottom:8 }}>🤖</div>
          <div style={{ color:NAVY,fontWeight:600 }}>Claude está analisando o documento…</div>
          <div style={{ color:"#888",fontSize:12,marginTop:4 }}>Identificando tipo, partes, valores e próximas ações</div>
        </div>
      )}
      {resultado && (
        <div>
          {resultado.erro ? (
            <div style={{ padding:16,background:"#FFEBEE",borderRadius:8,color:"#C62828",fontSize:13 }}>{resultado.erro}</div>
          ) : (
            <div style={{ padding:16,background:"#F0F4FF",borderRadius:10,border:`1px solid ${NAVY}22` }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
                <span style={{ fontSize:20 }}>🤖</span>
                <span style={{ fontWeight:700,color:NAVY }}>Análise de: {resultado.arquivo}</span>
              </div>
              <pre style={{ fontSize:12,color:"#333",whiteSpace:"pre-wrap",margin:0,fontFamily:"inherit",lineHeight:1.6 }}>{resultado.texto}</pre>
              <div style={{ marginTop:16,display:"flex",gap:10 }}>
                <button onClick={()=>onVincular(resultado)} style={{ flex:1,background:NAVY,color:"#fff",border:"none",borderRadius:8,padding:"9px 0",cursor:"pointer",fontWeight:700,fontSize:13 }}>
                  📋 Criar Processo a partir desta Análise
                </button>
                <button onClick={()=>{setResultado(null);setArquivo(null);}} style={{ background:"none",border:"1px solid #ddd",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13 }}>
                  Analisar outro
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── TAB PROCESSOS ─────────────────────────────────────────────────────────────
function TabProcessos({ templates }) {
  const [processos, setProcessos] = useState(() => { try { return JSON.parse(localStorage.getItem("ep_processos")||"[]"); } catch { return []; } });
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [selecionado, setSelecionado] = useState(null);
  const [modal, setModal] = useState(false);
  const [modalIA, setModalIA] = useState(false);
  const [modalEtapa, setModalEtapa] = useState(null);
  const [form, setForm] = useState({ titulo:"",cliente:"",clienteId:"",responsavel:"",status:"Em Andamento",prioridade:"Normal",categoria:"",template:"",dataAbertura:hoje(),etapas:[] });
  const [clientes, setClientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [aiAnalisando, setAiAnalisando] = useState(false);
  const [aiResultado, setAiResultado] = useState("");
  const fileRef = useRef();

  useEffect(() => {
    try { setClientes(JSON.parse(localStorage.getItem("ep_clientes")||"[]")); } catch {}
    try { setUsuarios(JSON.parse(localStorage.getItem("ep_usuarios")||"[]")); } catch {}
  }, []);

  const salvarProcessos = lista => { setProcessos(lista); localStorage.setItem("ep_processos",JSON.stringify(lista)); };

  const abrirNovo = (dadosIA=null) => {
    setForm({
      titulo: dadosIA?.titulo||"", cliente:"", clienteId:"", responsavel:"", status:"Em Andamento",
      prioridade:"Normal", categoria:"", template:"", dataAbertura:hoje(), etapas:[],
      obs: dadosIA?.texto||""
    });
    setModal(true);
  };

  const salvarProcesso = () => {
    if(!form.titulo||!form.cliente) return;
    const tpl = templates.find(t=>t.id===form.template);
    const etapas = form.etapas.length ? form.etapas
      : (tpl?.etapas||[]).map((e,i)=>({ id:i+1,descricao:e,concluida:false,anexos:[],dataConclusao:null }));
    const novo = { ...form, id:Date.now(), etapas, historico:[{data:hoje(),acao:"Processo criado",usuario:"Sistema"}] };
    salvarProcessos([...processos,novo]);
    setModal(false);
  };

  const concluirEtapa = (proc,etapaId) => {
    const lista = processos.map(p => {
      if(p.id!==proc.id) return p;
      const etapas=p.etapas.map(e=>e.id===etapaId?{...e,concluida:!e.concluida,dataConclusao:!e.concluida?hoje():null}:e);
      const status=etapas.every(e=>e.concluida)?"Concluído":p.status;
      return {...p,etapas,status,historico:[...(p.historico||[]),{data:hoje(),acao:`Etapa "${etapas.find(e=>e.id===etapaId)?.descricao}" ${!proc.etapas.find(e=>e.id===etapaId)?.concluida?"concluída":"reaberta"}`,usuario:"Usuário"}]};
    });
    salvarProcessos(lista); setSelecionado(lista.find(p=>p.id===proc.id));
  };

  const enviarWhatsApp = (proc,etapa) => {
    const tpls=JSON.parse(localStorage.getItem("ep_templates_envio")||"[]");
    const tpl=tpls.find(t=>t.tipo==="whatsapp"&&t.ativo);
    if(!tpl){alert("Nenhum template WhatsApp ativo.");return;}
    const msg=tpl.corpo.replace("{cliente_nome}",proc.cliente).replace("{processo_titulo}",proc.titulo).replace("{etapa_atual}",etapa.descricao);
    const tel="55"+(proc.telefone||"").replace(/\D/g,"");
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`,"_blank");
  };

  const analisarEtapa = async (file,proc,etapa) => {
    if(!file) return;
    setAiAnalisando(true); setAiResultado("");
    const reader=new FileReader();
    reader.onload=async ev=>{
      const base64=ev.target.result.split(",")[1];
      try {
        const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content:[
          {type:"document",source:{type:"base64",media_type:"application/pdf",data:base64}},
          {type:"text",text:`Analise este documento no contexto do processo "${proc.titulo}" (etapa: "${etapa.descricao}"). Identifique: tipo, empresa/CNPJ, data, valores, e se o documento está correto para esta etapa. Seja conciso.`}
        ]}]})});
        const d=await r.json(); setAiResultado(d.content?.[0]?.text||"Não analisado.");
      } catch { setAiResultado("Erro ao analisar."); }
      setAiAnalisando(false);
      const lista=processos.map(p=>{
        if(p.id!==proc.id) return p;
        const etapas=p.etapas.map(et=>et.id!==etapa.id?et:{...et,anexos:[...(et.anexos||[]),{nome:file.name,data:hoje()}]});
        return {...p,etapas};
      });
      salvarProcessos(lista); setSelecionado(lista.find(p=>p.id===proc.id));
    };
    reader.readAsDataURL(file);
  };

  const progresso = p => !p.etapas?.length?0:Math.round(p.etapas.filter(e=>e.concluida).length/p.etapas.length*100);
  const filtrados = processos.filter(p=>(!filtroTexto||(p.titulo+p.cliente).toLowerCase().includes(filtroTexto.toLowerCase()))&&(!filtroStatus||p.status===filtroStatus));

  return (
    <div style={{ display:"flex",height:"calc(100vh-140px)",overflow:"hidden" }}>
      {/* Lista */}
      <div style={{ width:selecionado?360:"100%",borderRight:"1px solid #E0E0E0",display:"flex",flexDirection:"column",background:"#fff" }}>
        <div style={{ padding:"12px 14px",borderBottom:"1px solid #eee" }}>
          <div style={{ display:"flex",gap:8,marginBottom:10 }}>
            <input value={filtroTexto} onChange={e=>setFiltroTexto(e.target.value)} placeholder="Buscar..." style={{ ...inputStyle,flex:1 }} />
            <button onClick={()=>setModalIA(true)} style={{ background:GOLD,color:NAVY,border:"none",borderRadius:8,padding:"0 12px",cursor:"pointer",fontWeight:700,fontSize:12,whiteSpace:"nowrap" }}>🤖 IA</button>
            <button onClick={()=>abrirNovo()} style={{ background:NAVY,color:"#fff",border:"none",borderRadius:8,padding:"0 14px",cursor:"pointer",fontWeight:700,fontSize:13 }}>+ Novo</button>
          </div>
          <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
            <button onClick={()=>setFiltroStatus("")} style={{ padding:"3px 10px",borderRadius:10,border:"1px solid #ddd",background:!filtroStatus?NAVY:"#fff",color:!filtroStatus?"#fff":"#555",cursor:"pointer",fontSize:11 }}>Todos ({processos.length})</button>
            {Object.entries(STATUS_CORES).map(([s,c])=>(
              <button key={s} onClick={()=>setFiltroStatus(s===filtroStatus?"":s)} style={{ padding:"3px 10px",borderRadius:10,border:`1px solid ${c}44`,background:filtroStatus===s?c:c+"11",color:filtroStatus===s?"#fff":c,cursor:"pointer",fontSize:11,fontWeight:600 }}>
                {s.split(" ")[0]} ({processos.filter(p=>p.status===s).length})
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex:1,overflowY:"auto" }}>
          {filtrados.length===0&&<div style={{ padding:32,textAlign:"center",color:"#999",fontSize:13 }}>Nenhum processo.</div>}
          {filtrados.map(p=>(
            <div key={p.id} onClick={()=>setSelecionado(selecionado?.id===p.id?null:p)} style={{ padding:"12px 14px",borderBottom:"1px solid #F0F0F0",cursor:"pointer",background:selecionado?.id===p.id?"#EEF2FF":"transparent" }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:3 }}>
                <span style={{ fontWeight:700,color:NAVY,fontSize:13 }}>{p.titulo}</span>
                <Badge cor={STATUS_CORES[p.status]||"#999"} texto={p.status} />
              </div>
              <div style={{ fontSize:12,color:"#666",marginBottom:5 }}>👤 {p.cliente}{p.categoria?` · ${p.categoria}`:""}</div>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <div style={{ flex:1,height:4,background:"#eee",borderRadius:4 }}><div style={{ width:`${progresso(p)}%`,height:"100%",background:GOLD,borderRadius:4 }} /></div>
                <span style={{ fontSize:11,color:"#888" }}>{progresso(p)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detalhe */}
      {selecionado && (
        <div style={{ flex:1,overflowY:"auto",padding:20,background:"#F8F9FA" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16 }}>
            <div>
              <h2 style={{ color:NAVY,margin:"0 0 6px" }}>{selecionado.titulo}</h2>
              <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                <Badge cor={STATUS_CORES[selecionado.status]} texto={selecionado.status} />
                <span style={{ fontSize:13,color:"#666" }}>👤 {selecionado.cliente}</span>
                {selecionado.categoria && <span style={{ fontSize:13,color:"#666" }}>📂 {selecionado.categoria}</span>}
                <span style={{ fontSize:13,color:"#666" }}>📅 {fmtData(selecionado.dataAbertura)}</span>
              </div>
            </div>
            <button onClick={()=>setSelecionado(null)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#999" }}>×</button>
          </div>
          {/* Progresso */}
          <div style={{ background:"#fff",borderRadius:10,padding:14,marginBottom:14,border:"1px solid #eee" }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}><span style={{ fontWeight:700,color:NAVY,fontSize:13 }}>Progresso</span><span style={{ fontWeight:700,color:GOLD }}>{progresso(selecionado)}%</span></div>
            <div style={{ height:8,background:"#eee",borderRadius:4 }}><div style={{ width:`${progresso(selecionado)}%`,height:"100%",background:GOLD,borderRadius:4,transition:"width .3s" }} /></div>
          </div>
          {/* Etapas */}
          <div style={{ background:"#fff",borderRadius:10,padding:16,marginBottom:14,border:"1px solid #eee" }}>
            <h4 style={{ color:NAVY,margin:"0 0 12px" }}>📋 Etapas</h4>
            {(!selecionado.etapas||selecionado.etapas.length===0)&&<div style={{ color:"#999",fontSize:13 }}>Nenhuma etapa.</div>}
            {selecionado.etapas?.map((e,i)=>(
              <div key={e.id} style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"9px 0",borderBottom:i<selecionado.etapas.length-1?"1px solid #F5F5F5":"none" }}>
                <div onClick={()=>concluirEtapa(selecionado,e.id)} style={{ width:22,height:22,borderRadius:"50%",border:`2px solid ${e.concluida?GOLD:"#CCC"}`,background:e.concluida?GOLD:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1 }}>
                  {e.concluida&&<span style={{ color:"#fff",fontSize:11,fontWeight:700 }}>✓</span>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,color:e.concluida?"#aaa":"#333",textDecoration:e.concluida?"line-through":"none",fontWeight:e.concluida?400:600 }}>{i+1}. {e.descricao}</div>
                  {e.dataConclusao&&<div style={{ fontSize:11,color:"#aaa" }}>✅ {fmtData(e.dataConclusao)}</div>}
                  {e.anexos?.length>0&&<div style={{ display:"flex",gap:4,marginTop:4,flexWrap:"wrap" }}>{e.anexos.map((a,ai)=><span key={ai} style={{ background:"#EEF2FF",color:NAVY,borderRadius:5,padding:"1px 7px",fontSize:11 }}>📎 {a.nome}</span>)}</div>}
                </div>
                <div style={{ display:"flex",gap:5 }}>
                  <button onClick={()=>setModalEtapa({proc:selecionado,etapa:e})} style={{ background:"none",border:`1px solid ${GOLD}`,color:GOLD,borderRadius:6,padding:"2px 7px",cursor:"pointer",fontSize:11 }}>📎</button>
                  <button onClick={()=>enviarWhatsApp(selecionado,e)} style={{ background:"none",border:"1px solid #25D366",color:"#25D366",borderRadius:6,padding:"2px 7px",cursor:"pointer",fontSize:11 }}>💬</button>
                </div>
              </div>
            ))}
          </div>
          {/* Histórico */}
          {selecionado.historico?.length>0&&(
            <div style={{ background:"#fff",borderRadius:10,padding:14,border:"1px solid #eee" }}>
              <h4 style={{ color:NAVY,margin:"0 0 10px" }}>📜 Histórico</h4>
              {selecionado.historico.slice().reverse().map((h,i)=>(
                <div key={i} style={{ display:"flex",gap:10,padding:"5px 0",borderBottom:i<selecionado.historico.length-1?"1px solid #F5F5F5":"none" }}>
                  <span style={{ fontSize:11,color:"#aaa",flexShrink:0 }}>{fmtData(h.data)}</span>
                  <span style={{ fontSize:12,color:"#555" }}>{h.acao}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal novo processo */}
      {modal&&(
        <Modal titulo="Novo Processo" onClose={()=>setModal(false)} largura={600}>
          <Campo label="Título *"><input style={inputStyle} value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} /></Campo>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            <Campo label="Cliente *">
              <select style={inputStyle} value={form.clienteId||"__outro"} onChange={e=>{
                const c=clientes.find(x=>String(x.id)===e.target.value);
                setForm({...form,clienteId:e.target.value,cliente:c?c.nome_razao||c.nome:"",telefone:c?.whatsapp||c?.telefone||""});
              }}>
                <option value="">Selecione...</option>
                {clientes.map(c=><option key={c.id} value={c.id}>{c.nome_razao||c.nome}</option>)}
                <option value="__outro">+ Outro (digitar)</option>
              </select>
            </Campo>
            <Campo label="Responsável">
              <select style={inputStyle} value={form.responsavel} onChange={e=>setForm({...form,responsavel:e.target.value})}>
                <option value="">Selecione...</option>
                {usuarios.map(u=><option key={u.id} value={u.nome}>{u.nome}</option>)}
              </select>
            </Campo>
          </div>
          {form.clienteId==="__outro"&&<Campo label="Nome do cliente *"><input style={inputStyle} value={form.cliente} onChange={e=>setForm({...form,cliente:e.target.value})} /></Campo>}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            <Campo label="Categoria">
              <select style={inputStyle} value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})}>
                <option value="">Selecione...</option>
                {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
              </select>
            </Campo>
            <Campo label="Template de Etapas">
              <select style={inputStyle} value={form.template} onChange={e=>setForm({...form,template:e.target.value})}>
                <option value="">Nenhum</option>
                {templates.filter(t=>!form.categoria||t.categoria===form.categoria).map(t=><option key={t.id} value={t.id}>{t.icone} {t.nome}</option>)}
              </select>
            </Campo>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14 }}>
            <Campo label="Status"><select style={inputStyle} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{Object.keys(STATUS_CORES).map(s=><option key={s}>{s}</option>)}</select></Campo>
            <Campo label="Prioridade"><select style={inputStyle} value={form.prioridade} onChange={e=>setForm({...form,prioridade:e.target.value})}>{PRIORIDADES.map(p=><option key={p}>{p}</option>)}</select></Campo>
            <Campo label="Data de Abertura"><input style={inputStyle} type="date" value={form.dataAbertura} onChange={e=>setForm({...form,dataAbertura:e.target.value})} /></Campo>
          </div>
          {form.obs&&<div style={{ padding:10,background:"#F0F4FF",borderRadius:8,fontSize:12,color:"#333",marginBottom:8,whiteSpace:"pre-wrap" }}><b>Análise IA:</b><br/>{form.obs.substring(0,300)}{form.obs.length>300?"…":""}</div>}
          <div style={{ display:"flex",gap:12,justifyContent:"flex-end",marginTop:8 }}>
            <button onClick={()=>setModal(false)} style={{ background:"none",border:"1px solid #ddd",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13 }}>Cancelar</button>
            <button onClick={salvarProcesso} disabled={!form.titulo||!form.cliente} style={{ background:NAVY,color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontWeight:700,fontSize:13,opacity:(!form.titulo||!form.cliente)?0.5:1 }}>Criar Processo</button>
          </div>
        </Modal>
      )}

      {/* Modal Etapa - Anexo + IA */}
      {modalEtapa&&(
        <Modal titulo={`📎 ${modalEtapa.etapa.descricao}`} onClose={()=>{setModalEtapa(null);setAiResultado("");}} largura={520}>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display:"none" }}
            onChange={e=>{const f=e.target.files[0];if(f)analisarEtapa(f,modalEtapa.proc,modalEtapa.etapa);}} />
          <button onClick={()=>fileRef.current.click()} style={{ background:NAVY,color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontWeight:700,fontSize:13,marginBottom:12 }}>
            📎 Anexar e Analisar com IA
          </button>
          <div style={{ fontSize:12,color:"#888",marginBottom:16 }}>PDF e imagens são analisados automaticamente pelo Claude.</div>
          {aiAnalisando&&<div style={{ padding:14,background:"#F0F4FF",borderRadius:8,display:"flex",alignItems:"center",gap:10 }}><span style={{ fontSize:20 }}>🤖</span><span style={{ color:NAVY,fontSize:13 }}>Analisando…</span></div>}
          {aiResultado&&<div style={{ padding:14,background:"#F0F4FF",borderRadius:8,border:`1px solid ${NAVY}22` }}><div style={{ fontWeight:700,color:NAVY,marginBottom:6 }}>🤖 Análise Claude</div><pre style={{ fontSize:12,margin:0,whiteSpace:"pre-wrap",fontFamily:"inherit" }}>{aiResultado}</pre></div>}
          {modalEtapa.etapa.anexos?.length>0&&(
            <div style={{ marginTop:14 }}>
              <div style={{ fontWeight:700,color:NAVY,fontSize:13,marginBottom:8 }}>Anexos</div>
              {modalEtapa.etapa.anexos.map((a,i)=><div key={i} style={{ display:"flex",gap:10,padding:"7px 10px",background:"#F8F9FA",borderRadius:7,marginBottom:5 }}><span>📄</span><span style={{ flex:1,fontSize:13 }}>{a.nome}</span><span style={{ fontSize:11,color:"#aaa" }}>{fmtData(a.data)}</span></div>)}
            </div>
          )}
        </Modal>
      )}

      {/* Modal IA principal */}
      {modalIA&&<ModalIA onClose={()=>setModalIA(false)} onVincular={dados=>{ setModalIA(false); abrirNovo({titulo:"Processo — "+dados.arquivo?.split(".")[0],texto:dados.texto}); }} />}
    </div>
  );
}

// ── TAB TEMPLATES ─────────────────────────────────────────────────────────────
function TabTemplates() {
  const [templates, setTemplates] = useState(() => { try { return JSON.parse(localStorage.getItem("ep_templates_processos")||"null")||TEMPLATES_PADRAO; } catch { return TEMPLATES_PADRAO; } });
  const [catFiltro, setCatFiltro] = useState("Todos");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");

  const salvar = (form) => {
    const lista = editando
      ? templates.map(t=>t.id===editando.id?{...form,id:t.id}:t)
      : [...templates,{...form,id:"custom_"+Date.now()}];
    setTemplates(lista); localStorage.setItem("ep_templates_processos",JSON.stringify(lista));
    setModal(false); setEditando(null);
  };

  const excluir = id => { if(!confirm("Excluir template?"))return; const l=templates.filter(t=>t.id!==id); setTemplates(l); localStorage.setItem("ep_templates_processos",JSON.stringify(l)); };
  const abrir = (t=null) => { setEditando(t); setModal(true); };

  const filtrados = templates.filter(t=>(catFiltro==="Todos"||t.categoria===catFiltro)&&(!busca||(t.nome+t.descricao).toLowerCase().includes(busca.toLowerCase())));

  return (
    <div style={{ padding:20 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <h3 style={{ color:NAVY,margin:0 }}>Templates de Processos</h3>
        <button onClick={()=>abrir()} style={{ background:NAVY,color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:700,fontSize:13 }}>+ Novo Template</button>
      </div>
      <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:14 }}>
        {["Todos",...CATEGORIAS].map(c=>(
          <button key={c} onClick={()=>setCatFiltro(c)} style={{ padding:"6px 14px",borderRadius:16,border:catFiltro===c?"none":"1px solid #ddd",background:catFiltro===c?NAVY:"#fff",color:catFiltro===c?"#fff":"#555",cursor:"pointer",fontSize:12,fontWeight:catFiltro===c?700:400 }}>{c} {c!=="Todos"&&`(${templates.filter(t=>t.categoria===c).length})`}</button>
        ))}
      </div>
      <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar template..." style={{ ...inputStyle,maxWidth:320,marginBottom:16 }} />
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14 }}>
        {filtrados.map(t=>(
          <div key={t.id} style={{ background:"#fff",borderRadius:12,padding:18,border:`2px solid ${t.cor||NAVY}22`,boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
            <div style={{ display:"flex",alignItems:"flex-start",gap:10,marginBottom:8 }}>
              <span style={{ fontSize:26,lineHeight:1 }}>{t.icone||"📋"}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700,color:NAVY,fontSize:14,marginBottom:3 }}>{t.nome}</div>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                  <Badge cor={t.cor||NAVY} texto={`${t.etapas?.length||0} etapas`} />
                  <Badge cor="#607D8B" texto={t.categoria||"Outros"} />
                </div>
              </div>
            </div>
            <p style={{ fontSize:12,color:"#666",margin:"0 0 12px",lineHeight:1.5 }}>{t.descricao}</p>
            <div style={{ borderTop:"1px solid #F0F0F0",paddingTop:10,marginBottom:12 }}>
              {(t.etapas||[]).slice(0,4).map((e,i)=>(
                <div key={i} style={{ display:"flex",gap:7,alignItems:"flex-start",marginBottom:3 }}>
                  <div style={{ width:16,height:16,borderRadius:"50%",background:(t.cor||NAVY)+"22",color:(t.cor||NAVY),display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,flexShrink:0,marginTop:1 }}>{i+1}</div>
                  <span style={{ fontSize:11,color:"#555" }}>{e}</span>
                </div>
              ))}
              {(t.etapas||[]).length>4&&<div style={{ fontSize:11,color:"#aaa",marginTop:2 }}>+{t.etapas.length-4} etapas…</div>}
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={()=>abrir(t)} style={{ flex:1,background:"none",border:`1px solid ${NAVY}`,color:NAVY,borderRadius:6,padding:"5px 0",cursor:"pointer",fontSize:12,fontWeight:600 }}>✏️ Editar</button>
              <button onClick={()=>excluir(t.id)} style={{ background:"none",border:"1px solid #e53935",color:"#e53935",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:12 }}>✕</button>
            </div>
          </div>
        ))}
      </div>
      {modal&&<ModalTemplate template={editando||{icone:"📋",cor:NAVY,categoria:"Outros",etapas:[]}} onSave={salvar} onClose={()=>{setModal(false);setEditando(null);}} />}
    </div>
  );
}

// ── TAB RELATÓRIO ─────────────────────────────────────────────────────────────
function TabRelatorio() {
  const [processos] = useState(()=>{ try{return JSON.parse(localStorage.getItem("ep_processos")||"[]");}catch{return [];} });
  const total=processos.length, conc=processos.filter(p=>p.status==="Concluído").length;
  const and=processos.filter(p=>p.status==="Em Andamento").length, urg=processos.filter(p=>p.prioridade==="Urgente"&&p.status!=="Concluído").length;
  const progMedio=total?Math.round(processos.reduce((acc,p)=>{if(!p.etapas?.length)return acc;return acc+(p.etapas.filter(e=>e.concluida).length/p.etapas.length*100);},0)/total):0;
  const CARDS=[{label:"Total",valor:total,cor:NAVY,icone:"📋"},{label:"Em Andamento",valor:and,cor:"#2196F3",icone:"⏳"},{label:"Concluídos",valor:conc,cor:"#4CAF50",icone:"✅"},{label:"Urgentes",valor:urg,cor:"#F44336",icone:"🚨"},{label:"Progresso Médio",valor:`${progMedio}%`,cor:GOLD,icone:"📈"}];
  return (
    <div style={{ padding:20 }}>
      <h3 style={{ color:NAVY,margin:"0 0 18px" }}>Relatório de Processos</h3>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:24 }}>
        {CARDS.map(c=><div key={c.label} style={{ background:"#fff",borderRadius:12,padding:16,textAlign:"center",border:`2px solid ${c.cor}22` }}><div style={{ fontSize:26 }}>{c.icone}</div><div style={{ fontSize:26,fontWeight:700,color:c.cor,margin:"4px 0" }}>{c.valor}</div><div style={{ fontSize:12,color:"#666" }}>{c.label}</div></div>)}
      </div>
      <div style={{ background:"#fff",borderRadius:10,border:"1px solid #eee",overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead><tr style={{ background:NAVY }}>{["Processo","Cliente","Categoria","Status","Prioridade","Progresso","Abertura"].map(h=><th key={h} style={{ color:"#fff",padding:"10px 12px",textAlign:"left",fontSize:12 }}>{h}</th>)}</tr></thead>
          <tbody>
            {processos.length===0&&<tr><td colSpan={7} style={{ padding:24,textAlign:"center",color:"#999" }}>Nenhum processo.</td></tr>}
            {processos.map((p,i)=>{const prog=p.etapas?.length?Math.round(p.etapas.filter(e=>e.concluida).length/p.etapas.length*100):0;return(
              <tr key={p.id} style={{ background:i%2===0?"#FAFAFA":"#fff",borderBottom:"1px solid #f0f0f0" }}>
                <td style={{ padding:"9px 12px",fontSize:13,fontWeight:600,color:NAVY }}>{p.titulo}</td>
                <td style={{ padding:"9px 12px",fontSize:13,color:"#555" }}>{p.cliente}</td>
                <td style={{ padding:"9px 12px",fontSize:12,color:"#666" }}>{p.categoria||"—"}</td>
                <td style={{ padding:"9px 12px" }}><Badge cor={STATUS_CORES[p.status]||"#999"} texto={p.status} /></td>
                <td style={{ padding:"9px 12px",fontSize:12 }}>{p.prioridade}</td>
                <td style={{ padding:"9px 12px" }}><div style={{ display:"flex",alignItems:"center",gap:7 }}><div style={{ width:70,height:5,background:"#eee",borderRadius:3 }}><div style={{ width:`${prog}%`,height:"100%",background:GOLD,borderRadius:3 }} /></div><span style={{ fontSize:11,color:"#888" }}>{prog}%</span></div></td>
                <td style={{ padding:"9px 12px",fontSize:12,color:"#888" }}>{fmtData(p.dataAbertura)}</td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function Processos() {
  const [aba, setAba] = useState("processos");
  const [templates] = useState(()=>{ try{return JSON.parse(localStorage.getItem("ep_templates_processos")||"null")||TEMPLATES_PADRAO;}catch{return TEMPLATES_PADRAO;} });
  const ABAS=[{id:"processos",label:"📋 Processos"},{id:"templates",label:"📁 Templates"},{id:"relatorio",label:"📊 Relatório"}];
  return (
    <div style={{ fontFamily:"Arial, sans-serif",minHeight:"100vh",background:"#F0F2F5",display:"flex",flexDirection:"column" }}>
      <div style={{ background:NAVY,padding:"14px 22px" }}><h2 style={{ color:"#fff",margin:0,fontSize:18 }}>⚖️ Gestão de <span style={{ color:GOLD }}>Processos</span></h2></div>
      <div style={{ background:"#fff",display:"flex",borderBottom:"2px solid #E0E0E0" }}>
        {ABAS.map(a=><button key={a.id} onClick={()=>setAba(a.id)} style={{ padding:"13px 26px",border:"none",background:"none",cursor:"pointer",fontWeight:aba===a.id?700:400,color:aba===a.id?NAVY:"#666",fontSize:13,borderBottom:aba===a.id?`3px solid ${GOLD}`:"3px solid transparent" }}>{a.label}</button>)}
      </div>
      <div style={{ flex:1,overflow:"hidden" }}>
        {aba==="processos"&&<TabProcessos templates={templates} />}
        {aba==="templates"&&<TabTemplates />}
        {aba==="relatorio"&&<TabRelatorio />}
      </div>
    </div>
  );
}
