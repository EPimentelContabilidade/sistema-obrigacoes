import { useState, useEffect, useRef } from "react";

const NAVY = "#1B2A4A";
const GOLD = "#C5A55A";
const fmtData = d => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const hoje = () => new Date().toISOString().split("T")[0];

const CATEGORIAS = ["Contábil","Fiscal","RH / Departamento Pessoal","Paralegal / Societário","Financeiro","Imobiliário / SPE","Outros"];
const STATUS_CORES = { "Em Andamento":"#2196F3","Aguardando Cliente":"#FF9800","Concluído":"#4CAF50","Cancelado":"#F44336","Pendente":"#9C27B0" };
const PRIORIDADES = ["Baixa","Normal","Alta","Urgente"];
const TIPOS_DOC = ["Contrato Social","Alteração Contratual","Distrato","RG/CNH","CPF","Comprovante de Endereço","Procuração","Nota Fiscal","Guia de Tributo","Holerite","Extrato Bancário","Certidão","Balanço Patrimonial","Foto","Imagem","Outro"];

const TEMPLATES_PADRAO = [
  { id:"balanco", categoria:"Contábil", icone:"📊", cor:"#4CAF50", nome:"Elaboração de Balanço Patrimonial", descricao:"Fechamento contábil e demonstrações financeiras",
    etapas:[
      { desc:"Conferência dos lançamentos do período", docs_necessarios:["Extratos bancários","Notas fiscais do período"] },
      { desc:"Conciliação bancária", docs_necessarios:["Extrato bancário"] },
      { desc:"Apuração de estoques", docs_necessarios:["Inventário físico"] },
      { desc:"Cálculo de depreciação", docs_necessarios:[] },
      { desc:"Elaboração do Balanço Patrimonial", docs_necessarios:[] },
      { desc:"Elaboração da DRE", docs_necessarios:[] },
      { desc:"Elaboração das Notas Explicativas", docs_necessarios:[] },
      { desc:"Entrega ao cliente", docs_necessarios:[] },
    ]},
  { id:"sped_cont", categoria:"Contábil", icone:"🗂️", cor:"#607D8B", nome:"SPED Contábil", descricao:"Escrituração Contábil Digital — ECD",
    etapas:[
      { desc:"Conferência dos lançamentos", docs_necessarios:["Balancetes do período"] },
      { desc:"Geração do arquivo ECD", docs_necessarios:[] },
      { desc:"Validação no PVA", docs_necessarios:[] },
      { desc:"Assinatura digital", docs_necessarios:["Certificado Digital A1/A3"] },
      { desc:"Transmissão à RFB", docs_necessarios:[] },
      { desc:"Arquivamento do recibo", docs_necessarios:[] },
    ]},
  { id:"ecf", categoria:"Contábil", icone:"📋", cor:"#795548", nome:"ECF — Escrituração Contábil Fiscal", descricao:"ECF anual",
    etapas:[
      { desc:"Levantamento de dados fiscais e contábeis", docs_necessarios:["Balanço Patrimonial","DRE"] },
      { desc:"Preenchimento do ECF", docs_necessarios:[] },
      { desc:"Conferência do LALUR/LACS", docs_necessarios:[] },
      { desc:"Validação e transmissão à RFB", docs_necessarios:["Certificado Digital"] },
      { desc:"Arquivamento do recibo", docs_necessarios:[] },
    ]},
  { id:"dre", categoria:"Contábil", icone:"📈", cor:"#2196F3", nome:"DRE e Análise de Resultados", descricao:"Demonstração do Resultado com análise de indicadores",
    etapas:[
      { desc:"Fechamento das contas de resultado", docs_necessarios:[] },
      { desc:"Apuração do lucro/prejuízo", docs_necessarios:[] },
      { desc:"Cálculo de IRPJ e CSLL", docs_necessarios:[] },
      { desc:"Elaboração da DRE", docs_necessarios:[] },
      { desc:"Relatório de análise financeira", docs_necessarios:[] },
      { desc:"Entrega ao cliente", docs_necessarios:[] },
    ]},
  { id:"abertura", categoria:"Paralegal / Societário", icone:"🏢", cor:"#2196F3", nome:"Abertura de Empresa", descricao:"Constituição de nova empresa",
    etapas:[
      { desc:"Coleta de documentos dos sócios", docs_necessarios:["RG/CNH dos sócios","CPF dos sócios","Comprovante de endereço","Comprovante de residência dos sócios"] },
      { desc:"Elaboração do Contrato Social", docs_necessarios:[] },
      { desc:"Registro na Junta Comercial", docs_necessarios:["Contrato Social assinado","DARE/taxa Junta"] },
      { desc:"Inscrição no CNPJ / RFB", docs_necessarios:["DBE assinado","Contrato registrado"] },
      { desc:"Inscrição Estadual (se aplicável)", docs_necessarios:[] },
      { desc:"Inscrição Municipal / Alvará", docs_necessarios:["CNPJ","Contrato Social"] },
      { desc:"Abertura de conta bancária PJ", docs_necessarios:["CNPJ","Contrato Social","RG dos sócios"] },
      { desc:"Configuração no sistema contábil", docs_necessarios:[] },
    ]},
  { id:"baixa", categoria:"Paralegal / Societário", icone:"📴", cor:"#F44336", nome:"Baixa de Empresa", descricao:"Encerramento e dissolução da empresa",
    etapas:[
      { desc:"Verificação de pendências fiscais e trabalhistas", docs_necessarios:["Certidões negativas","Guias quitadas"] },
      { desc:"Elaboração da Distrato / Ata de dissolução", docs_necessarios:[] },
      { desc:"Apuração final de resultados", docs_necessarios:[] },
      { desc:"Quitação de tributos pendentes", docs_necessarios:["DARFs","DAS"] },
      { desc:"Baixa na Junta Comercial", docs_necessarios:["Distrato assinado"] },
      { desc:"Baixa no CNPJ / RFB", docs_necessarios:[] },
      { desc:"Baixa na Inscrição Estadual", docs_necessarios:[] },
      { desc:"Baixa na Inscrição Municipal", docs_necessarios:[] },
    ]},
  { id:"alteracao", categoria:"Paralegal / Societário", icone:"📝", cor:"#FF9800", nome:"Alteração Contratual", descricao:"Alteração de sócios, endereço, atividade ou capital",
    etapas:[
      { desc:"Recebimento da solicitação e documentação", docs_necessarios:["RG/CNH dos sócios","Comprovante do novo endereço (se aplicável)"] },
      { desc:"Elaboração da Alteração Contratual", docs_necessarios:[] },
      { desc:"Assinatura do documento", docs_necessarios:["Alteração assinada por todos os sócios"] },
      { desc:"Registro na Junta Comercial", docs_necessarios:["Alteração assinada","DARE/taxa"] },
      { desc:"Atualização no CNPJ / RFB", docs_necessarios:[] },
      { desc:"Atualização na Inscrição Estadual", docs_necessarios:[] },
      { desc:"Atualização na Inscrição Municipal", docs_necessarios:[] },
    ]},
  { id:"parcelamento", categoria:"Fiscal", icone:"💰", cor:"#9C27B0", nome:"Parcelamento / PERT", descricao:"Parcelamento de débitos fiscais",
    etapas:[
      { desc:"Levantamento de débitos (Certidões e PGDAS)", docs_necessarios:["Certidão de débitos RFB","Extrato PGDAS"] },
      { desc:"Cálculo das modalidades de parcelamento", docs_necessarios:[] },
      { desc:"Apresentação das opções ao cliente", docs_necessarios:[] },
      { desc:"Adesão ao programa escolhido", docs_necessarios:["Procuração (se necessário)"] },
      { desc:"Emissão do DAS de adesão", docs_necessarios:[] },
      { desc:"Confirmação da adesão no portal", docs_necessarios:[] },
      { desc:"Controle mensal das parcelas", docs_necessarios:[] },
    ]},
  { id:"regularizacao", categoria:"Fiscal", icone:"✅", cor:"#4CAF50", nome:"Regularização Fiscal", descricao:"Regularização de pendências fiscais",
    etapas:[
      { desc:"Diagnóstico das pendências", docs_necessarios:["Certidão de débitos","Extrato PGDAS"] },
      { desc:"Retificação de declarações (se necessário)", docs_necessarios:[] },
      { desc:"Quitação / parcelamento dos débitos", docs_necessarios:["DARFs pagos"] },
      { desc:"Obtenção de Certidão Negativa", docs_necessarios:[] },
      { desc:"Regularização junto à SEFAZ (se aplicável)", docs_necessarios:[] },
      { desc:"Relatório final ao cliente", docs_necessarios:[] },
    ]},
  { id:"admissao", categoria:"RH / Departamento Pessoal", icone:"👤", cor:"#1B2A4A", nome:"Admissão de Empregado", descricao:"Contratação de novo colaborador",
    etapas:[
      { desc:"Recebimento dos documentos do empregado", docs_necessarios:["RG","CPF","Carteira de Trabalho","Comprovante de endereço","PIS/PASEP","Certidão de nascimento filhos","Foto 3x4"] },
      { desc:"Elaboração do Contrato de Trabalho", docs_necessarios:[] },
      { desc:"Registro no eSocial (S-2200)", docs_necessarios:[] },
      { desc:"Emissão da CTPS digital", docs_necessarios:[] },
      { desc:"Inclusão no ponto eletrônico", docs_necessarios:[] },
      { desc:"Configuração no sistema de folha", docs_necessarios:[] },
      { desc:"Entrega de documentos ao empregado", docs_necessarios:["Contrato assinado","Ficha de registro"] },
    ]},
  { id:"demissao", categoria:"RH / Departamento Pessoal", icone:"🚪", cor:"#795548", nome:"Demissão de Empregado", descricao:"Rescisão contratual e homologação",
    etapas:[
      { desc:"Recebimento do aviso ou decisão", docs_necessarios:["Aviso prévio assinado"] },
      { desc:"Cálculo das verbas rescisórias", docs_necessarios:[] },
      { desc:"Elaboração do TRCT", docs_necessarios:[] },
      { desc:"Geração da guia de FGTS (GRRF)", docs_necessarios:[] },
      { desc:"Comunicação ao eSocial (S-2299)", docs_necessarios:[] },
      { desc:"Homologação (se aplicável)", docs_necessarios:["TRCT assinado","Documentos pessoais"] },
      { desc:"Entrega das guias e documentos", docs_necessarios:[] },
      { desc:"Arquivamento do processo", docs_necessarios:[] },
    ]},
  { id:"folha", categoria:"RH / Departamento Pessoal", icone:"💼", cor:"#607D8B", nome:"Folha de Pagamento Mensal", descricao:"Processamento mensal da folha",
    etapas:[
      { desc:"Conferência de ponto e horas extras", docs_necessarios:["Espelho de ponto"] },
      { desc:"Lançamento de eventos variáveis", docs_necessarios:[] },
      { desc:"Cálculo da folha", docs_necessarios:[] },
      { desc:"Emissão do holerite", docs_necessarios:[] },
      { desc:"Geração da GRRF/FGTS", docs_necessarios:[] },
      { desc:"Geração do DCTFWeb", docs_necessarios:[] },
      { desc:"Pagamento do INSS", docs_necessarios:["GPS/DARF pago"] },
      { desc:"Fechamento e arquivamento", docs_necessarios:[] },
    ]},
  { id:"fluxo", categoria:"Financeiro", icone:"💹", cor:"#4CAF50", nome:"Fluxo de Caixa e Projeção", descricao:"Elaboração do fluxo de caixa",
    etapas:[
      { desc:"Levantamento de receitas e despesas", docs_necessarios:["Extratos bancários","Notas fiscais"] },
      { desc:"Conciliação bancária", docs_necessarios:[] },
      { desc:"Elaboração do fluxo realizado", docs_necessarios:[] },
      { desc:"Projeção para os próximos meses", docs_necessarios:[] },
      { desc:"Análise de indicadores", docs_necessarios:[] },
      { desc:"Apresentação ao cliente", docs_necessarios:[] },
    ]},
  { id:"planejamento", categoria:"Financeiro", icone:"🎯", cor:"#FF9800", nome:"Planejamento Tributário", descricao:"Comparativo de regimes tributários",
    etapas:[
      { desc:"Levantamento do faturamento e folha dos últimos 12 meses", docs_necessarios:["DAS últimos 12 meses","Folha de pagamento"] },
      { desc:"Simulação Simples Nacional", docs_necessarios:[] },
      { desc:"Simulação Lucro Presumido", docs_necessarios:[] },
      { desc:"Simulação Lucro Real", docs_necessarios:[] },
      { desc:"Elaboração do relatório comparativo", docs_necessarios:[] },
      { desc:"Apresentação e decisão com cliente", docs_necessarios:[] },
    ]},
  { id:"spe", categoria:"Imobiliário / SPE", icone:"🏗️", cor:"#00BCD4", nome:"SPE Imobiliária", descricao:"Constituição e operação de SPE com RET",
    etapas:[
      { desc:"Constituição da SPE na Junta Comercial", docs_necessarios:["RG/CPF dos sócios","Comprovante endereço"] },
      { desc:"Inscrição no CNPJ", docs_necessarios:["Contrato Social registrado"] },
      { desc:"Opção pelo RET (4%)", docs_necessarios:["Memorial descritivo do empreendimento"] },
      { desc:"Registro do Patrimônio de Afetação", docs_necessarios:["Matrícula do imóvel"] },
      { desc:"Abertura de conta bancária segregada", docs_necessarios:["CNPJ","Contrato Social"] },
      { desc:"Configuração CPC 47 / POC no sistema", docs_necessarios:["Cronograma físico-financeiro"] },
      { desc:"Elaboração do primeiro DRE parcial", docs_necessarios:[] },
      { desc:"Entrega dos documentos ao cliente", docs_necessarios:[] },
    ]},
];

// ── UI helpers ────────────────────────────────────────────────────────────────
function Badge({ cor, texto }) {
  return <span style={{ background:cor+"22",color:cor,border:`1px solid ${cor}44`,borderRadius:12,padding:"2px 10px",fontSize:11,fontWeight:700 }}>{texto}</span>;
}
function Modal({ titulo, onClose, children, largura=620 }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
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
  const [form, setForm] = useState({
    ...template,
    etapas: (template.etapas||[]).map(e =>
      typeof e === "string" ? { desc:e, docs_necessarios:[] } : { desc:e.desc||e, docs_necessarios:e.docs_necessarios||[] }
    )
  });
  const [novaEtapa, setNovaEtapa] = useState("");
  const [etapaExpandida, setEtapaExpandida] = useState(null);
  const [novoDoc, setNovoDoc] = useState("");
  const COR_OPTIONS = ["#1B2A4A","#C5A55A","#2196F3","#4CAF50","#FF9800","#E91E63","#9C27B0","#00BCD4","#F44336","#607D8B","#795548","#FF5722"];

  const addEtapa = () => {
    if(!novaEtapa.trim()) return;
    setForm(f=>({...f, etapas:[...f.etapas,{desc:novaEtapa.trim(),docs_necessarios:[]}]}));
    setNovaEtapa("");
  };
  const removeEtapa = i => setForm(f=>({...f,etapas:f.etapas.filter((_,idx)=>idx!==i)}));
  const moveEtapa = (i,dir) => {
    const arr=[...form.etapas]; const j=i+dir;
    if(j<0||j>=arr.length) return;
    [arr[i],arr[j]]=[arr[j],arr[i]]; setForm(f=>({...f,etapas:arr}));
  };
  const updateEtapaDesc = (i,v) => {
    const arr=[...form.etapas]; arr[i]={...arr[i],desc:v}; setForm(f=>({...f,etapas:arr}));
  };
  const addDoc = (i) => {
    if(!novoDoc.trim()) return;
    const arr=[...form.etapas]; arr[i]={...arr[i],docs_necessarios:[...(arr[i].docs_necessarios||[]),novoDoc.trim()]};
    setForm(f=>({...f,etapas:arr})); setNovoDoc("");
  };
  const removeDoc = (ei,di) => {
    const arr=[...form.etapas]; arr[ei]={...arr[ei],docs_necessarios:arr[ei].docs_necessarios.filter((_,idx)=>idx!==di)};
    setForm(f=>({...f,etapas:arr}));
  };

  return (
    <Modal titulo={form.id?"Editar Template":"Novo Template"} onClose={onClose} largura={720}>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
        <Campo label="Nome *"><input style={inputStyle} value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} /></Campo>
        <Campo label="Categoria">
          <select style={inputStyle} value={form.categoria||"Outros"} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>
            {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
          </select>
        </Campo>
      </div>
      <Campo label="Descrição"><textarea style={{ ...inputStyle,height:56,resize:"none",fontFamily:"inherit" }} value={form.descricao||""} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} /></Campo>
      <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:14 }}>
        <Campo label="Ícone (emoji)"><input style={inputStyle} value={form.icone||""} onChange={e=>setForm(f=>({...f,icone:e.target.value}))} /></Campo>
        <Campo label="Cor">
          <div style={{ display:"flex",gap:5,flexWrap:"wrap",paddingTop:4 }}>
            {COR_OPTIONS.map(c=><div key={c} onClick={()=>setForm(f=>({...f,cor:c}))} style={{ width:22,height:22,borderRadius:"50%",background:c,cursor:"pointer",border:form.cor===c?"3px solid #333":"3px solid transparent" }} />)}
          </div>
        </Campo>
      </div>

      <Campo label="Etapas e Documentos Necessários">
        <div style={{ border:"1px solid #eee",borderRadius:8,overflow:"hidden",marginBottom:8 }}>
          {(form.etapas||[]).length===0 && <div style={{ padding:12,color:"#aaa",fontSize:13,textAlign:"center" }}>Nenhuma etapa</div>}
          {(form.etapas||[]).map((e,i)=>(
            <div key={i} style={{ borderBottom:"1px solid #f0f0f0" }}>
              {/* Linha da etapa */}
              <div style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:i%2===0?"#FAFAFA":"#fff" }}>
                <div style={{ width:22,height:22,borderRadius:"50%",background:form.cor||NAVY,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>{i+1}</div>
                <input style={{ ...inputStyle,flex:1,padding:"5px 8px",border:"none",background:"transparent",fontWeight:600 }} value={e.desc||""}
                  onChange={ev=>updateEtapaDesc(i,ev.target.value)} />
                <div style={{ display:"flex",gap:4,alignItems:"center" }}>
                  <button onClick={()=>setEtapaExpandida(etapaExpandida===i?null:i)} title="Documentos necessários"
                    style={{ background:(e.docs_necessarios||[]).length>0?"#EEF2FF":"none",border:"1px solid #ddd",borderRadius:6,cursor:"pointer",fontSize:12,padding:"2px 7px",color:NAVY }}>
                    📎 {(e.docs_necessarios||[]).length>0?`${e.docs_necessarios.length} docs`:"+ docs"}
                  </button>
                  <button onClick={()=>moveEtapa(i,-1)} style={{ background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:14 }}>↑</button>
                  <button onClick={()=>moveEtapa(i,1)} style={{ background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:14 }}>↓</button>
                  <button onClick={()=>removeEtapa(i)} style={{ background:"none",border:"none",cursor:"pointer",color:"#e53935",fontSize:14 }}>✕</button>
                </div>
              </div>
              {/* Painel de documentos necessários */}
              {etapaExpandida===i && (
                <div style={{ padding:"10px 14px 12px 52px",background:"#F8F9FA",borderTop:"1px dashed #E0E0E0" }}>
                  <div style={{ fontSize:12,fontWeight:700,color:NAVY,marginBottom:8 }}>📋 Documentos necessários para esta etapa:</div>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:5,marginBottom:8 }}>
                    {(e.docs_necessarios||[]).length===0 && <span style={{ fontSize:11,color:"#aaa" }}>Nenhum documento configurado</span>}
                    {(e.docs_necessarios||[]).map((d,di)=>(
                      <span key={di} style={{ display:"inline-flex",alignItems:"center",gap:4,background:"#EEF2FF",color:NAVY,borderRadius:7,padding:"3px 9px",fontSize:11,fontWeight:600 }}>
                        📄 {d}
                        <button onClick={()=>removeDoc(i,di)} style={{ background:"none",border:"none",cursor:"pointer",color:"#e53935",fontSize:11,padding:0,marginLeft:2 }}>✕</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display:"flex",gap:8 }}>
                    <select style={{ ...inputStyle,flex:1,fontSize:12,padding:"5px 8px" }} value={novoDoc} onChange={e=>setNovoDoc(e.target.value)}>
                      <option value="">Selecionar tipo de documento...</option>
                      {TIPOS_DOC.map(t=><option key={t}>{t}</option>)}
                    </select>
                    <input style={{ ...inputStyle,flex:1,fontSize:12,padding:"5px 8px" }} value={novoDoc} onChange={e=>setNovoDoc(e.target.value)} placeholder="Ou digitar nome do documento..." onKeyDown={ev=>ev.key==="Enter"&&addDoc(i)} />
                    <button onClick={()=>addDoc(i)} style={{ background:NAVY,color:"#fff",border:"none",borderRadius:7,padding:"0 14px",cursor:"pointer",fontSize:13,fontWeight:700 }}>+</button>
                  </div>
                </div>
              )}
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
  const TIPOS = ["auto",...TIPOS_DOC];

  const analisar = async (file) => {
    if(!file) return;
    setArquivo(file); setAnalisando(true); setResultado(null);
    const reader = new FileReader();
    reader.onload = async ev => {
      const base64=ev.target.result.split(",")[1];
      const isPDF=file.type==="application/pdf";
      const isImg=file.type.startsWith("image/");
      if(!isPDF&&!isImg){ setResultado({erro:"Envie PDF ou imagem."}); setAnalisando(false); return; }
      try {
        const prompt = tipoDoc==="auto"
          ? `Analise este documento e identifique:\n1. Tipo de documento\n2. Empresa(s) / CNPJ(s)\n3. Partes envolvidas\n4. Objeto/finalidade\n5. Data\n6. Valores\n7. Pendências ou próximas ações necessárias\n8. Categoria sugerida (Contábil/Fiscal/RH/Paralegal/Financeiro)\n9. Template de processo recomendado\n\nSeja objetivo e estruturado.`
          : `Analise este documento do tipo "${tipoDoc}" e identifique:\n1. Empresa(s)/CNPJ(s)\n2. Partes envolvidas\n3. Objeto principal\n4. Data\n5. Valores\n6. Pendências e próximas ações no escritório contábil\n\nSeja objetivo.`;
        const content = isPDF
          ? [{type:"document",source:{type:"base64",media_type:"application/pdf",data:base64}},{type:"text",text:prompt}]
          : [{type:"image",source:{type:"base64",media_type:file.type,data:base64}},{type:"text",text:prompt}];
        const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1200,messages:[{role:"user",content}]})});
        const d=await r.json();
        setResultado({texto:d.content?.[0]?.text||"Não analisado.",arquivo:file.name});
      } catch(e){setResultado({erro:"Erro: "+e.message});}
      setAnalisando(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Modal titulo="🤖 Análise de Documentos com IA" onClose={onClose} largura={700}>
      <Campo label="Tipo de documento">
        <select style={inputStyle} value={tipoDoc} onChange={e=>setTipoDoc(e.target.value)}>
          {TIPOS.map(t=><option key={t} value={t}>{t==="auto"?"🔍 Detectar automaticamente":t}</option>)}
        </select>
      </Campo>
      <div onClick={()=>fileRef.current.click()} style={{ border:"2px dashed #C0C0C0",borderRadius:12,padding:"28px 20px",textAlign:"center",cursor:"pointer",background:"#FAFAFA",marginBottom:16 }}
        onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)analisar(f);}}>
        <div style={{ fontSize:36,marginBottom:8 }}>📄</div>
        <div style={{ fontWeight:700,color:NAVY,marginBottom:4 }}>Arraste o documento aqui ou clique para selecionar</div>
        <div style={{ fontSize:12,color:"#aaa" }}>PDF, PNG, JPG — Contrato Social, Alteração, NF, Holerite, Certidão…</div>
        <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display:"none" }} onChange={e=>{const f=e.target.files[0];if(f)analisar(f);}} />
      </div>
      {analisando&&<div style={{ padding:20,background:"#F0F4FF",borderRadius:10,textAlign:"center" }}><div style={{ fontSize:32,marginBottom:8 }}>🤖</div><div style={{ color:NAVY,fontWeight:600 }}>Claude analisando…</div></div>}
      {resultado&&(resultado.erro
        ? <div style={{ padding:14,background:"#FFEBEE",borderRadius:8,color:"#C62828",fontSize:13 }}>{resultado.erro}</div>
        : <div style={{ padding:16,background:"#F0F4FF",borderRadius:10,border:`1px solid ${NAVY}22` }}>
            <div style={{ fontWeight:700,color:NAVY,marginBottom:10 }}>🤖 Análise: {resultado.arquivo}</div>
            <pre style={{ fontSize:12,color:"#333",whiteSpace:"pre-wrap",margin:"0 0 14px",fontFamily:"inherit",lineHeight:1.6 }}>{resultado.texto}</pre>
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>onVincular(resultado)} style={{ flex:1,background:NAVY,color:"#fff",border:"none",borderRadius:8,padding:"9px 0",cursor:"pointer",fontWeight:700,fontSize:13 }}>
                📋 Criar Processo a partir desta Análise
              </button>
              <button onClick={()=>{setResultado(null);setArquivo(null);}} style={{ background:"none",border:"1px solid #ddd",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13 }}>
                Analisar outro
              </button>
            </div>
          </div>
      )}
    </Modal>
  );
}

// ── MODAL ETAPA — Anexos ──────────────────────────────────────────────────────
function ModalEtapa({ proc, etapa, processos, salvarProcessos, onClose }) {
  const [aiAnalisando, setAiAnalisando] = useState(false);
  const [aiResultado, setAiResultado] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const docsNecessarios = etapa.docs_necessarios || [];
  const docsAnexados = etapa.anexos || [];
  const docsOK = docsNecessarios.filter(d => docsAnexados.some(a => a.nome.toLowerCase().includes(d.toLowerCase().split(" ")[0])));

  const processarArquivo = async (file) => {
    setAiAnalisando(true); setAiResultado("");
    const reader = new FileReader();
    reader.onload = async ev => {
      const base64=ev.target.result.split(",")[1];
      const isPDF=file.type==="application/pdf";
      const isImg=file.type.startsWith("image/");
      if(isPDF||isImg){
        try {
          const content = isPDF
            ? [{type:"document",source:{type:"base64",media_type:"application/pdf",data:base64}},{type:"text",text:`Analise este documento no contexto do processo "${proc.titulo}" (etapa: "${etapa.descricao||etapa.desc}"). Identifique: tipo, empresa/CNPJ, data, valores e se está correto para esta etapa. Seja conciso.`}]
            : [{type:"image",source:{type:"base64",media_type:file.type,data:base64}},{type:"text",text:`Descreva esta imagem no contexto do processo "${proc.titulo}", etapa "${etapa.descricao||etapa.desc}". Identifique o conteúdo e se é adequado para esta etapa.`}];
          const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,messages:[{role:"user",content}]})});
          const d=await r.json(); setAiResultado(d.content?.[0]?.text||"Não analisado.");
        } catch{setAiResultado("Erro ao analisar.");}
      }
      const lista=processos.map(p=>{
        if(p.id!==proc.id) return p;
        const etapas=p.etapas.map(et=>et.id!==etapa.id?et:{...et,anexos:[...(et.anexos||[]),{nome:file.name,tamanho:file.size,data:hoje(),tipo:file.type}]});
        return {...p,etapas};
      });
      salvarProcessos(lista);
      setAiAnalisando(false);
    };
    reader.readAsDataURL(file);
  };

  const removerAnexo = (idx) => {
    const lista=processos.map(p=>{
      if(p.id!==proc.id) return p;
      const etapas=p.etapas.map(et=>et.id!==etapa.id?et:{...et,anexos:(et.anexos||[]).filter((_,i)=>i!==idx)});
      return {...p,etapas};
    });
    salvarProcessos(lista);
  };

  const iconeArquivo = (tipo) => {
    if(tipo?.startsWith("image/")) return "🖼️";
    if(tipo==="application/pdf") return "📄";
    return "📎";
  };

  return (
    <Modal titulo={`📎 ${etapa.descricao||etapa.desc}`} onClose={onClose} largura={580}>

      {/* Documentos necessários */}
      {docsNecessarios.length>0 && (
        <div style={{ marginBottom:16,padding:"12px 14px",borderRadius:10,background:"#FFFBF0",border:"1px solid #C5A55A33" }}>
          <div style={{ fontWeight:700,color:NAVY,fontSize:13,marginBottom:8 }}>📋 Documentos necessários para esta etapa:</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
            {docsNecessarios.map((d,i)=>{
              const ok=docsAnexados.some(a=>a.nome.toLowerCase().includes(d.toLowerCase().split(" ")[0]));
              return <span key={i} style={{ background:ok?"#E8F5E9":"#FFF3E0",color:ok?"#2E7D32":"#E65100",borderRadius:7,padding:"3px 9px",fontSize:11,fontWeight:600,display:"inline-flex",alignItems:"center",gap:4 }}>
                {ok?"✅":"⏳"} {d}
              </span>;
            })}
          </div>
          {docsNecessarios.length>0 && <div style={{ fontSize:11,color:"#888",marginTop:6 }}>{docsOK.length}/{docsNecessarios.length} documentos recebidos</div>}
        </div>
      )}

      {/* Área de upload */}
      <div
        onClick={()=>fileRef.current.click()}
        onDragOver={e=>{e.preventDefault();setDragOver(true);}}
        onDragLeave={()=>setDragOver(false)}
        onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)processarArquivo(f);}}
        style={{ border:`2px dashed ${dragOver?GOLD:"#C0C0C0"}`,borderRadius:12,padding:"22px 20px",textAlign:"center",cursor:"pointer",background:dragOver?"#FFFBF0":"#FAFAFA",marginBottom:14,transition:"all .2s" }}>
        <div style={{ fontSize:32,marginBottom:6 }}>📁</div>
        <div style={{ fontWeight:700,color:NAVY,fontSize:13,marginBottom:3 }}>Arraste documentos/imagens ou clique para selecionar</div>
        <div style={{ fontSize:11,color:"#aaa" }}>PDF, PNG, JPG, JPEG — PDFs e imagens são analisados pela IA automaticamente</div>
        <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx" multiple style={{ display:"none" }}
          onChange={e=>{Array.from(e.target.files).forEach(processarArquivo);}} />
      </div>

      {/* IA analisando */}
      {aiAnalisando&&<div style={{ padding:14,background:"#F0F4FF",borderRadius:8,display:"flex",alignItems:"center",gap:10,marginBottom:12 }}><span style={{ fontSize:20 }}>🤖</span><div><div style={{ fontWeight:600,color:NAVY,fontSize:13 }}>Claude analisando o documento…</div><div style={{ fontSize:11,color:"#888" }}>Identificando tipo, empresa, data e adequação</div></div></div>}
      {aiResultado&&(
        <div style={{ padding:14,background:"#F0F4FF",borderRadius:8,border:`1px solid ${NAVY}22`,marginBottom:12 }}>
          <div style={{ fontWeight:700,color:NAVY,marginBottom:6 }}>🤖 Análise Claude</div>
          <pre style={{ fontSize:12,margin:0,whiteSpace:"pre-wrap",fontFamily:"inherit",lineHeight:1.5 }}>{aiResultado}</pre>
        </div>
      )}

      {/* Arquivos anexados */}
      {docsAnexados.length>0&&(
        <div>
          <div style={{ fontWeight:700,color:NAVY,fontSize:13,marginBottom:8 }}>Arquivos Anexados ({docsAnexados.length})</div>
          <div style={{ display:"grid",gap:6 }}>
            {docsAnexados.map((a,i)=>(
              <div key={i} style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:a.tipo?.startsWith("image/")?"#F0F8FF":"#F8F9FA",borderRadius:8,border:"1px solid #E0E0E0" }}>
                <span style={{ fontSize:22,flexShrink:0 }}>{iconeArquivo(a.tipo)}</span>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:13,fontWeight:600,color:NAVY,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{a.nome}</div>
                  <div style={{ fontSize:11,color:"#aaa" }}>{fmtData(a.data)}{a.tamanho?` · ${(a.tamanho/1024).toFixed(1)}KB`:""}</div>
                </div>
                <button onClick={()=>removerAnexo(i)} style={{ background:"none",border:"1px solid #e53935",color:"#e53935",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11,flexShrink:0 }}>Remover</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── TAB PROCESSOS ─────────────────────────────────────────────────────────────
function TabProcessos({ templates }) {
  const [processos, setProcessos] = useState(()=>{ try{return JSON.parse(localStorage.getItem("ep_processos")||"[]");}catch{return [];} });
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [selecionado, setSelecionado] = useState(null);
  const [modal, setModal] = useState(false);
  const [modalIA, setModalIA] = useState(false);
  const [modalEtapa, setModalEtapa] = useState(null);
  const [form, setForm] = useState({ titulo:"",cliente:"",clienteId:"",responsavel:"",status:"Em Andamento",prioridade:"Normal",categoria:"",template:"",dataAbertura:hoje(),etapas:[],obs:"" });
  const [clientes, setClientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [mostrarBuscaCliente, setMostrarBuscaCliente] = useState(false);

  useEffect(()=>{
    try{setClientes(JSON.parse(localStorage.getItem("ep_clientes")||"[]"));}catch{}
    try{setUsuarios(JSON.parse(localStorage.getItem("ep_usuarios")||"[]"));}catch{}
  },[]);

  const salvarProcessos = lista => { setProcessos(lista); localStorage.setItem("ep_processos",JSON.stringify(lista)); };

  const abrirNovo = (dadosIA=null) => {
    setForm({ titulo:dadosIA?.titulo||"",cliente:"",clienteId:"",responsavel:"",status:"Em Andamento",prioridade:"Normal",categoria:"",template:"",dataAbertura:hoje(),etapas:[],obs:dadosIA?.texto||"" });
    setBuscaCliente(""); setMostrarBuscaCliente(false); setModal(true);
  };

  const salvarProcesso = () => {
    if(!form.titulo||!form.cliente) return;
    const tpl = templates.find(t=>t.id===form.template);
    const etapas = form.etapas.length ? form.etapas
      : (tpl?.etapas||[]).map((e,i)=>({
          id:i+1,
          descricao: typeof e==="string"?e:e.desc,
          docs_necessarios: typeof e==="string"?[]:e.docs_necessarios||[],
          concluida:false, anexos:[], dataConclusao:null
        }));
    const novo={ ...form,id:Date.now(),etapas,historico:[{data:hoje(),acao:"Processo criado",usuario:"Sistema"}] };
    salvarProcessos([...processos,novo]); setModal(false);
  };

  const concluirEtapa = (proc,etapaId) => {
    const lista=processos.map(p=>{
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
    const msg=tpl.corpo.replace("{cliente_nome}",proc.cliente).replace("{processo_titulo}",proc.titulo).replace("{etapa_atual}",etapa.descricao||etapa.desc||"");
    const tel="55"+(proc.telefone||"").replace(/\D/g,"");
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`,"_blank");
  };

  const progresso = p=>!p.etapas?.length?0:Math.round(p.etapas.filter(e=>e.concluida).length/p.etapas.length*100);
  const clientesFiltrados = clientes.filter(c=>(c.nome_razao||c.nome||"").toLowerCase().includes(buscaCliente.toLowerCase())).slice(0,8);

  const filtrados = processos.filter(p=>{
    if(filtroTexto&&!(p.titulo+p.cliente).toLowerCase().includes(filtroTexto.toLowerCase())) return false;
    if(filtroStatus&&p.status!==filtroStatus) return false;
    if(filtroCategoria&&p.categoria!==filtroCategoria) return false;
    return true;
  });

  return (
    <div style={{ display:"flex",height:"calc(100vh - 140px)",overflow:"hidden" }}>
      {/* Lista */}
      <div style={{ width:selecionado?360:"100%",borderRight:"1px solid #E0E0E0",display:"flex",flexDirection:"column",background:"#fff" }}>
        <div style={{ padding:"12px 14px",borderBottom:"1px solid #eee" }}>
          <div style={{ display:"flex",gap:8,marginBottom:10 }}>
            <input value={filtroTexto} onChange={e=>setFiltroTexto(e.target.value)} placeholder="Buscar..." style={{ ...inputStyle,flex:1 }} />
            <button onClick={()=>setModalIA(true)} style={{ background:GOLD,color:NAVY,border:"none",borderRadius:8,padding:"0 12px",cursor:"pointer",fontWeight:700,fontSize:12 }}>🤖 IA</button>
            <button onClick={()=>abrirNovo()} style={{ background:NAVY,color:"#fff",border:"none",borderRadius:8,padding:"0 14px",cursor:"pointer",fontWeight:700,fontSize:13 }}>+ Novo</button>
          </div>
          <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginBottom:6 }}>
            <button onClick={()=>setFiltroStatus("")} style={{ padding:"3px 10px",borderRadius:10,border:"1px solid #ddd",background:!filtroStatus?NAVY:"#fff",color:!filtroStatus?"#fff":"#555",cursor:"pointer",fontSize:11 }}>Todos ({processos.length})</button>
            {Object.entries(STATUS_CORES).map(([s,c])=>(
              <button key={s} onClick={()=>setFiltroStatus(s===filtroStatus?"":s)} style={{ padding:"3px 8px",borderRadius:10,border:`1px solid ${c}44`,background:filtroStatus===s?c:c+"11",color:filtroStatus===s?"#fff":c,cursor:"pointer",fontSize:10,fontWeight:600 }}>
                {s.split(" ")[0]} ({processos.filter(p=>p.status===s).length})
              </button>
            ))}
          </div>
          <select style={{ ...inputStyle,fontSize:12 }} value={filtroCategoria} onChange={e=>setFiltroCategoria(e.target.value)}>
            <option value="">Todas as categorias</option>
            {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
          </select>
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
                {p.etapas?.some(e=>(e.docs_necessarios||[]).length>0&&(e.anexos||[]).length===0&&!e.concluida)&&<span title="Etapas com documentos pendentes" style={{ fontSize:14 }}>📋</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detalhe */}
      {selecionado&&(
        <div style={{ flex:1,overflowY:"auto",padding:20,background:"#F8F9FA" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}>
            <div>
              <h2 style={{ color:NAVY,margin:"0 0 6px" }}>{selecionado.titulo}</h2>
              <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                <Badge cor={STATUS_CORES[selecionado.status]} texto={selecionado.status} />
                <span style={{ fontSize:13,color:"#666" }}>👤 {selecionado.cliente}</span>
                {selecionado.categoria&&<span style={{ fontSize:13,color:"#666" }}>📂 {selecionado.categoria}</span>}
                <span style={{ fontSize:13,color:"#666" }}>📅 {fmtData(selecionado.dataAbertura)}</span>
              </div>
            </div>
            <button onClick={()=>setSelecionado(null)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#999" }}>×</button>
          </div>
          <div style={{ background:"#fff",borderRadius:10,padding:14,marginBottom:14,border:"1px solid #eee" }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}><span style={{ fontWeight:700,color:NAVY,fontSize:13 }}>Progresso</span><span style={{ fontWeight:700,color:GOLD }}>{progresso(selecionado)}%</span></div>
            <div style={{ height:8,background:"#eee",borderRadius:4 }}><div style={{ width:`${progresso(selecionado)}%`,height:"100%",background:GOLD,borderRadius:4,transition:"width .3s" }} /></div>
          </div>
          <div style={{ background:"#fff",borderRadius:10,padding:16,marginBottom:14,border:"1px solid #eee" }}>
            <h4 style={{ color:NAVY,margin:"0 0 12px" }}>📋 Etapas</h4>
            {(!selecionado.etapas||selecionado.etapas.length===0)&&<div style={{ color:"#999",fontSize:13 }}>Nenhuma etapa.</div>}
            {selecionado.etapas?.map((e,i)=>{
              const docsNec=e.docs_necessarios||[];
              const docsAnex=e.anexos||[];
              const docsPendentes=docsNec.filter(d=>!docsAnex.some(a=>a.nome.toLowerCase().includes(d.toLowerCase().split(" ")[0])));
              return (
                <div key={e.id} style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"9px 0",borderBottom:i<selecionado.etapas.length-1?"1px solid #F5F5F5":"none" }}>
                  <div onClick={()=>concluirEtapa(selecionado,e.id)} style={{ width:22,height:22,borderRadius:"50%",border:`2px solid ${e.concluida?GOLD:"#CCC"}`,background:e.concluida?GOLD:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1 }}>
                    {e.concluida&&<span style={{ color:"#fff",fontSize:11,fontWeight:700 }}>✓</span>}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,color:e.concluida?"#aaa":"#333",textDecoration:e.concluida?"line-through":"none",fontWeight:e.concluida?400:600 }}>{i+1}. {e.descricao}</div>
                    {e.dataConclusao&&<div style={{ fontSize:11,color:"#aaa" }}>✅ {fmtData(e.dataConclusao)}</div>}
                    {/* Docs necessários */}
                    {docsNec.length>0&&(
                      <div style={{ display:"flex",gap:4,marginTop:4,flexWrap:"wrap" }}>
                        {docsNec.map((d,di)=>{
                          const ok=docsAnex.some(a=>a.nome.toLowerCase().includes(d.toLowerCase().split(" ")[0]));
                          return <span key={di} style={{ fontSize:10,padding:"1px 6px",borderRadius:6,background:ok?"#E8F5E9":"#FFF3E0",color:ok?"#2E7D32":"#E65100",fontWeight:600 }}>{ok?"✅":"⏳"} {d}</span>;
                        })}
                      </div>
                    )}
                    {docsAnex.length>0&&(
                      <div style={{ display:"flex",gap:4,marginTop:4,flexWrap:"wrap" }}>
                        {docsAnex.map((a,ai)=><span key={ai} style={{ fontSize:10,background:"#EEF2FF",color:NAVY,borderRadius:5,padding:"1px 7px" }}>{a.tipo?.startsWith("image/")?"🖼️":"📎"} {a.nome}</span>)}
                      </div>
                    )}
                  </div>
                  <div style={{ display:"flex",gap:5 }}>
                    <button onClick={()=>setModalEtapa({proc:selecionado,etapa:e})} style={{ background:docsAnex.length>0||docsPendentes.length===0?"none":`${GOLD}22`,border:`1px solid ${docsAnex.length>0?GOLD:"#ddd"}`,color:GOLD,borderRadius:6,padding:"2px 7px",cursor:"pointer",fontSize:11 }} title={docsPendentes.length>0?`${docsPendentes.length} docs pendentes`:""}>
                      📎{docsAnex.length>0?` ${docsAnex.length}`:""}
                    </button>
                    <button onClick={()=>enviarWhatsApp(selecionado,e)} style={{ background:"none",border:"1px solid #25D366",color:"#25D366",borderRadius:6,padding:"2px 7px",cursor:"pointer",fontSize:11 }}>💬</button>
                  </div>
                </div>
              );
            })}
          </div>
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
        <Modal titulo="Novo Processo" onClose={()=>setModal(false)} largura={620}>
          <Campo label="Título *"><input style={inputStyle} value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} /></Campo>

          {/* Busca de cliente */}
          <Campo label="Cliente *">
            <div style={{ position:"relative" }}>
              <input style={inputStyle} value={form.cliente||buscaCliente} placeholder="Buscar cliente cadastrado..."
                onChange={e=>{setBuscaCliente(e.target.value);setForm({...form,cliente:e.target.value,clienteId:""});setMostrarBuscaCliente(true);}}
                onFocus={()=>setMostrarBuscaCliente(true)} />
              {mostrarBuscaCliente&&clientesFiltrados.length>0&&(
                <div style={{ position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1px solid #ddd",borderRadius:8,boxShadow:"0 4px 12px rgba(0,0,0,.12)",zIndex:100,maxHeight:200,overflowY:"auto" }}>
                  {clientesFiltrados.map(c=>(
                    <div key={c.id} onClick={()=>{setForm({...form,cliente:c.nome_razao||c.nome,clienteId:c.id,telefone:c.whatsapp||c.telefone||""});setBuscaCliente("");setMostrarBuscaCliente(false);}}
                      style={{ padding:"9px 14px",cursor:"pointer",borderBottom:"1px solid #f5f5f5" }}
                      onMouseOver={e=>e.currentTarget.style.background="#F0F4FF"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{ fontWeight:600,color:NAVY,fontSize:13 }}>{c.nome_razao||c.nome}</div>
                      <div style={{ fontSize:11,color:"#888" }}>{c.cnpj} · {c.tributacao||c.regime}</div>
                    </div>
                  ))}
                  <div onClick={()=>{setMostrarBuscaCliente(false);}} style={{ padding:"8px 14px",fontSize:11,color:"#888",cursor:"pointer",textAlign:"center" }}>Usar nome digitado: "{buscaCliente}"</div>
                </div>
              )}
            </div>
            {form.clienteId&&<div style={{ fontSize:11,color:"#4CAF50",marginTop:4 }}>✅ Cliente vinculado ao cadastro</div>}
          </Campo>

          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            <Campo label="Responsável">
              <select style={inputStyle} value={form.responsavel} onChange={e=>setForm({...form,responsavel:e.target.value})}>
                <option value="">Selecione...</option>
                {usuarios.map(u=><option key={u.id} value={u.nome}>{u.nome}</option>)}
              </select>
            </Campo>
            <Campo label="Categoria">
              <select style={inputStyle} value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})}>
                <option value="">Selecione...</option>
                {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
              </select>
            </Campo>
          </div>
          <Campo label="Template de Etapas">
            <select style={inputStyle} value={form.template} onChange={e=>setForm({...form,template:e.target.value})}>
              <option value="">Nenhum — definir manualmente</option>
              {templates.filter(t=>!form.categoria||t.categoria===form.categoria).map(t=>(
                <option key={t.id} value={t.id}>{t.icone} {t.nome} ({(t.etapas||[]).length} etapas)</option>
              ))}
            </select>
            {form.template&&(()=>{
              const tpl=templates.find(t=>t.id===form.template);
              const docsTotal=(tpl?.etapas||[]).reduce((acc,e)=>acc+(typeof e==="string"?0:(e.docs_necessarios||[]).length),0);
              return docsTotal>0?<div style={{ fontSize:11,color:NAVY,marginTop:4 }}>📋 Este template requer {docsTotal} documentos no total</div>:null;
            })()}
          </Campo>
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

      {/* Modal etapa */}
      {modalEtapa&&(
        <ModalEtapa
          proc={modalEtapa.proc}
          etapa={modalEtapa.etapa}
          processos={processos}
          salvarProcessos={(lista)=>{ salvarProcessos(lista); setSelecionado(lista.find(p=>p.id===modalEtapa.proc.id)); setModalEtapa(null); }}
          onClose={()=>setModalEtapa(null)}
        />
      )}

      {modalIA&&<ModalIA onClose={()=>setModalIA(false)} onVincular={dados=>{setModalIA(false);abrirNovo({titulo:"Processo — "+(dados.arquivo?.split(".")[0]||"IA"),texto:dados.texto});}} />}
    </div>
  );
}

// ── TAB TEMPLATES ─────────────────────────────────────────────────────────────
function TabTemplates() {
  const [templates, setTemplates] = useState(()=>{ try{return JSON.parse(localStorage.getItem("ep_templates_processos")||"null")||TEMPLATES_PADRAO;}catch{return TEMPLATES_PADRAO;} });
  const [catFiltro, setCatFiltro] = useState("Todos");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");

  const salvar = (form) => {
    const lista = editando ? templates.map(t=>t.id===editando.id?{...form,id:t.id}:t) : [...templates,{...form,id:"custom_"+Date.now()}];
    setTemplates(lista); localStorage.setItem("ep_templates_processos",JSON.stringify(lista));
    setModal(false); setEditando(null);
  };
  const excluir = id => { if(!confirm("Excluir template?"))return; const l=templates.filter(t=>t.id!==id); setTemplates(l); localStorage.setItem("ep_templates_processos",JSON.stringify(l)); };
  const abrir = (t=null) => { setEditando(t); setModal(true); };

  const filtrados = templates.filter(t=>(catFiltro==="Todos"||t.categoria===catFiltro)&&(!busca||(t.nome+t.descricao).toLowerCase().includes(busca.toLowerCase())));

  return (
    <div style={{ padding:20 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
        <h3 style={{ color:NAVY,margin:0 }}>Templates de Processos</h3>
        <button onClick={()=>abrir()} style={{ background:NAVY,color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:700,fontSize:13 }}>+ Novo Template</button>
      </div>
      <div style={{ display:"flex",gap:7,flexWrap:"wrap",marginBottom:12 }}>
        {["Todos",...CATEGORIAS].map(c=>(
          <button key={c} onClick={()=>setCatFiltro(c)} style={{ padding:"6px 13px",borderRadius:16,border:catFiltro===c?"none":"1px solid #ddd",background:catFiltro===c?NAVY:"#fff",color:catFiltro===c?"#fff":"#555",cursor:"pointer",fontSize:12,fontWeight:catFiltro===c?700:400 }}>
            {c} {c!=="Todos"&&`(${templates.filter(t=>t.categoria===c).length})`}
          </button>
        ))}
      </div>
      <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar template..." style={{ ...inputStyle,maxWidth:300,marginBottom:14 }} />
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14 }}>
        {filtrados.map(t=>{
          const docsTotal=(t.etapas||[]).reduce((acc,e)=>acc+(typeof e==="string"?0:(e.docs_necessarios||[]).length),0);
          return (
            <div key={t.id} style={{ background:"#fff",borderRadius:12,padding:16,border:`2px solid ${t.cor||NAVY}22`,boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
              <div style={{ display:"flex",alignItems:"flex-start",gap:10,marginBottom:8 }}>
                <span style={{ fontSize:24,lineHeight:1 }}>{t.icone||"📋"}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700,color:NAVY,fontSize:14,marginBottom:4 }}>{t.nome}</div>
                  <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
                    <Badge cor={t.cor||NAVY} texto={`${(t.etapas||[]).length} etapas`} />
                    <Badge cor="#607D8B" texto={t.categoria||"Outros"} />
                    {docsTotal>0&&<Badge cor="#FF9800" texto={`${docsTotal} docs`} />}
                  </div>
                </div>
              </div>
              <p style={{ fontSize:12,color:"#666",margin:"0 0 10px",lineHeight:1.5 }}>{t.descricao}</p>
              <div style={{ borderTop:"1px solid #F0F0F0",paddingTop:10,marginBottom:10 }}>
                {(t.etapas||[]).slice(0,4).map((e,i)=>{
                  const desc=typeof e==="string"?e:e.desc;
                  const docs=typeof e==="string"?[]:e.docs_necessarios||[];
                  return (
                    <div key={i} style={{ display:"flex",gap:7,alignItems:"flex-start",marginBottom:4 }}>
                      <div style={{ width:16,height:16,borderRadius:"50%",background:(t.cor||NAVY)+"22",color:(t.cor||NAVY),display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,flexShrink:0,marginTop:1 }}>{i+1}</div>
                      <div style={{ flex:1 }}>
                        <span style={{ fontSize:11,color:"#555" }}>{desc}</span>
                        {docs.length>0&&<span style={{ fontSize:10,color:"#FF9800",marginLeft:5 }}>📎 {docs.length} doc{docs.length>1?"s":""}</span>}
                      </div>
                    </div>
                  );
                })}
                {(t.etapas||[]).length>4&&<div style={{ fontSize:11,color:"#aaa",marginTop:2 }}>+{(t.etapas||[]).length-4} etapas…</div>}
              </div>
              <div style={{ display:"flex",gap:8 }}>
                <button onClick={()=>abrir(t)} style={{ flex:1,background:"none",border:`1px solid ${NAVY}`,color:NAVY,borderRadius:6,padding:"5px 0",cursor:"pointer",fontSize:12,fontWeight:600 }}>✏️ Editar</button>
                <button onClick={()=>excluir(t.id)} style={{ background:"none",border:"1px solid #e53935",color:"#e53935",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:12 }}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
      {modal&&<ModalTemplate template={editando||{icone:"📋",cor:NAVY,categoria:"Outros",etapas:[]}} onSave={salvar} onClose={()=>{setModal(false);setEditando(null);}} />}
    </div>
  );
}

// ── TAB RELATÓRIO ─────────────────────────────────────────────────────────────
function TabRelatorio() {
  const [processos] = useState(()=>{ try{return JSON.parse(localStorage.getItem("ep_processos")||"[]");}catch{return [];} });
  const total=processos.length,conc=processos.filter(p=>p.status==="Concluído").length,and=processos.filter(p=>p.status==="Em Andamento").length;
  const urg=processos.filter(p=>p.prioridade==="Urgente"&&p.status!=="Concluído").length;
  const docsPendentes=processos.filter(p=>p.etapas?.some(e=>(e.docs_necessarios||[]).length>0&&(e.anexos||[]).length===0&&!e.concluida)).length;
  const prog=total?Math.round(processos.reduce((acc,p)=>{ if(!p.etapas?.length)return acc; return acc+p.etapas.filter(e=>e.concluida).length/p.etapas.length*100; },0)/total):0;
  const CARDS=[{label:"Total",valor:total,cor:NAVY,icone:"📋"},{label:"Em Andamento",valor:and,cor:"#2196F3",icone:"⏳"},{label:"Concluídos",valor:conc,cor:"#4CAF50",icone:"✅"},{label:"Urgentes",valor:urg,cor:"#F44336",icone:"🚨"},{label:"Docs Pendentes",valor:docsPendentes,cor:"#FF9800",icone:"📎"},{label:"Progresso Médio",valor:`${prog}%`,cor:GOLD,icone:"📈"}];
  return (
    <div style={{ padding:20 }}>
      <h3 style={{ color:NAVY,margin:"0 0 16px" }}>Relatório de Processos</h3>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12,marginBottom:24 }}>
        {CARDS.map(c=><div key={c.label} style={{ background:"#fff",borderRadius:12,padding:14,textAlign:"center",border:`2px solid ${c.cor}22` }}><div style={{ fontSize:24 }}>{c.icone}</div><div style={{ fontSize:24,fontWeight:700,color:c.cor,margin:"4px 0" }}>{c.valor}</div><div style={{ fontSize:11,color:"#666" }}>{c.label}</div></div>)}
      </div>
      <div style={{ background:"#fff",borderRadius:10,border:"1px solid #eee",overflow:"auto" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead><tr style={{ background:NAVY }}>{["Processo","Cliente","Categoria","Status","Progresso","Docs","Abertura"].map(h=><th key={h} style={{ color:"#fff",padding:"10px 12px",textAlign:"left",fontSize:12 }}>{h}</th>)}</tr></thead>
          <tbody>
            {processos.length===0&&<tr><td colSpan={7} style={{ padding:24,textAlign:"center",color:"#999" }}>Nenhum processo.</td></tr>}
            {processos.map((p,i)=>{
              const pr=p.etapas?.length?Math.round(p.etapas.filter(e=>e.concluida).length/p.etapas.length*100):0;
              const docsAnex=p.etapas?.reduce((acc,e)=>acc+(e.anexos||[]).length,0)||0;
              const docsNec=p.etapas?.reduce((acc,e)=>acc+(e.docs_necessarios||[]).length,0)||0;
              return <tr key={p.id} style={{ background:i%2===0?"#FAFAFA":"#fff",borderBottom:"1px solid #f0f0f0" }}>
                <td style={{ padding:"9px 12px",fontSize:13,fontWeight:600,color:NAVY }}>{p.titulo}</td>
                <td style={{ padding:"9px 12px",fontSize:13,color:"#555" }}>{p.cliente}</td>
                <td style={{ padding:"9px 12px",fontSize:12,color:"#666" }}>{p.categoria||"—"}</td>
                <td style={{ padding:"9px 12px" }}><Badge cor={STATUS_CORES[p.status]||"#999"} texto={p.status} /></td>
                <td style={{ padding:"9px 12px" }}><div style={{ display:"flex",alignItems:"center",gap:7 }}><div style={{ width:70,height:5,background:"#eee",borderRadius:3 }}><div style={{ width:`${pr}%`,height:"100%",background:GOLD,borderRadius:3 }} /></div><span style={{ fontSize:11,color:"#888" }}>{pr}%</span></div></td>
                <td style={{ padding:"9px 12px",fontSize:12 }}>{docsNec>0?<span style={{ color:docsAnex>=docsNec?"#4CAF50":"#FF9800" }}>{docsAnex}/{docsNec}</span>:<span style={{ color:"#aaa" }}>—</span>}</td>
                <td style={{ padding:"9px 12px",fontSize:12,color:"#888" }}>{fmtData(p.dataAbertura)}</td>
              </tr>;
            })}
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
