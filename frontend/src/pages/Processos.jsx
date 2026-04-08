import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "https://sistema-obrigacoes-production.up.railway.app";
const NAVY = "#1B2A4A";
const GOLD = "#C5A55A";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtData = d => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const hoje = () => new Date().toISOString().split("T")[0];

function Badge({ cor, texto }) {
  return <span style={{ background:cor+"22", color:cor, border:`1px solid ${cor}44`, borderRadius:12, padding:"2px 10px", fontSize:11, fontWeight:700 }}>{texto}</span>;
}

function Modal({ titulo, onClose, children, largura=600 }) {
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

const inputStyle = { width:"100%", padding:"9px 12px", borderRadius:8, border:"1px solid #ddd", fontSize:13, boxSizing:"border-box", outline:"none" };

function Campo({ label, children, obrigatorio }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block",fontWeight:600,color:NAVY,marginBottom:5,fontSize:13 }}>
        {label}{obrigatorio && <span style={{ color:"#e53935",marginLeft:2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ── TEMPLATES ─────────────────────────────────────────────────────────────────
const TEMPLATES_PRONTOS = [
  {
    id:"abertura", nome:"Abertura de Empresa", icone:"🏢", cor:"#2196F3",
    descricao:"Constituição de nova empresa no CNPJ, Junta e Prefeitura",
    etapas: [
      "Coleta de documentos dos sócios",
      "Elaboração do Contrato Social",
      "Registro na Junta Comercial",
      "Inscrição no CNPJ / RFB",
      "Inscrição Estadual (se aplicável)",
      "Inscrição Municipal / Alvará",
      "Abertura de conta bancária PJ",
      "Configuração no sistema contábil",
    ]
  },
  {
    id:"baixa", nome:"Baixa de Empresa", icone:"📴", cor:"#F44336",
    descricao:"Encerramento e dissolução da empresa",
    etapas: [
      "Verificação de pendências fiscais e trabalhistas",
      "Elaboração da Distrato / Ata de dissolução",
      "Apuração final de resultados",
      "Quitação de tributos pendentes",
      "Baixa na Junta Comercial",
      "Baixa no CNPJ / RFB",
      "Baixa na Inscrição Estadual",
      "Baixa na Inscrição Municipal",
    ]
  },
  {
    id:"alteracao", nome:"Alteração Contratual", icone:"📝", cor:"#FF9800",
    descricao:"Alteração de sócios, endereço, atividade ou capital",
    etapas: [
      "Recebimento da solicitação e documentação",
      "Elaboração da Alteração Contratual",
      "Assinatura do documento",
      "Registro na Junta Comercial",
      "Atualização no CNPJ / RFB",
      "Atualização na Inscrição Estadual",
      "Atualização na Inscrição Municipal",
    ]
  },
  {
    id:"parcelamento", nome:"Parcelamento / PERT", icone:"💰", cor:"#9C27B0",
    descricao:"Parcelamento de débitos fiscais — PERT, Refis, Parcelamento Ordinário",
    etapas: [
      "Levantamento de débitos (Certidões e PG-DAS)",
      "Cálculo das modalidades de parcelamento",
      "Apresentação das opções ao cliente",
      "Adesão ao programa escolhido",
      "Inclusão de todas as dívidas no parcelamento",
      "Emissão do DAS de adesão",
      "Confirmação da adesão no portal",
      "Controle mensal das parcelas",
    ]
  },
  {
    id:"regularizacao", nome:"Regularização Fiscal", icone:"✅", cor:"#4CAF50",
    descricao:"Regularização de pendências fiscais diversas",
    etapas: [
      "Diagnóstico das pendências",
      "Retificação de declarações (se necessário)",
      "Quitação / parcelamento dos débitos",
      "Obtenção de Certidão Negativa",
      "Regularização junto à SEFAZ (se aplicável)",
      "Relatório final ao cliente",
    ]
  },
  {
    id:"spe", nome:"SPE Imobiliária", icone:"🏗️", cor:"#00BCD4",
    descricao:"Constituição e operação de SPE com RET e Patrimônio de Afetação",
    etapas: [
      "Constituição da SPE na Junta Comercial",
      "Inscrição no CNPJ",
      "Opção pelo RET (4%)",
      "Registro do Patrimônio de Afetação",
      "Abertura de conta bancária segregada",
      "Configuração CPC 47 / POC no sistema",
      "Elaboração do primeiro DRE parcial",
      "Entrega dos documentos ao cliente",
    ]
  },
  {
    id:"admissao", nome:"Admissão de Empregado", icone:"👤", cor:"#1B2A4A",
    descricao:"Contratação e integração de novo colaborador",
    etapas: [
      "Recebimento dos documentos do empregado",
      "Elaboração do Contrato de Trabalho",
      "Registro no eSocial (S-2200)",
      "Emissão da CTPS digital",
      "Inclusão no ponto eletrônico",
      "Configuração no sistema de folha",
      "Entrega de documentos ao empregado",
    ]
  },
  {
    id:"demissao", nome:"Demissão de Empregado", icone:"🚪", cor:"#795548",
    descricao:"Rescisão contratual e homologação",
    etapas: [
      "Recebimento do aviso ou decisão",
      "Cálculo das verbas rescisórias",
      "Elaboração do TRCT",
      "Geração da guia de FGTS (GRRF)",
      "Comunicação ao eSocial (S-2299)",
      "Homologação (se aplicável)",
      "Entrega das guias e documentos",
      "Arquivamento do processo",
    ]
  },
];

const STATUS_CORES = {
  "Em Andamento": "#2196F3",
  "Aguardando Cliente": "#FF9800",
  "Concluído": "#4CAF50",
  "Cancelado": "#F44336",
  "Pendente": "#9C27B0",
};

// ── ABA PROCESSOS ─────────────────────────────────────────────────────────────
function TabProcessos() {
  const [processos, setProcessos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ep_processos") || "[]"); } catch { return []; }
  });
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [selecionado, setSelecionado] = useState(null);
  const [modal, setModal] = useState(false);
  const [modalEtapa, setModalEtapa] = useState(null);
  const [form, setForm] = useState({ titulo:"", cliente:"", responsavel:"", status:"Em Andamento", prioridade:"Normal", template:"", dataAbertura: hoje(), etapas:[] });
  const [clientes, setClientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [aiAnalisando, setAiAnalisando] = useState(false);
  const [aiResultado, setAiResultado] = useState("");
  const fileRef = useRef();

  useEffect(() => {
    try { setClientes(JSON.parse(localStorage.getItem("ep_clientes") || "[]")); } catch {}
    try { setUsuarios(JSON.parse(localStorage.getItem("ep_usuarios") || "[]")); } catch {}
  }, []);

  const salvarProcessos = (lista) => {
    setProcessos(lista);
    localStorage.setItem("ep_processos", JSON.stringify(lista));
  };

  const abrirNovo = () => {
    setForm({ titulo:"", cliente:"", responsavel:"", status:"Em Andamento", prioridade:"Normal", template:"", dataAbertura: hoje(), etapas:[] });
    setModal(true);
  };

  const salvarProcesso = () => {
    if (!form.titulo || !form.cliente) return;
    const etapas = form.etapas.length ? form.etapas : (form.template ?
      (TEMPLATES_PRONTOS.find(t => t.id === form.template)?.etapas || []).map((e, i) => ({ id: i+1, descricao:e, concluida:false, anexos:[], dataConclusao:null }))
      : []
    );
    const novo = { ...form, id: Date.now(), etapas, historico: [{ data: hoje(), acao: "Processo criado", usuario: "Sistema" }] };
    salvarProcessos([...processos, novo]);
    setModal(false);
  };

  const concluirEtapa = (proc, etapaId) => {
    const lista = processos.map(p => {
      if (p.id !== proc.id) return p;
      const etapas = p.etapas.map(e => e.id === etapaId ? { ...e, concluida: !e.concluida, dataConclusao: !e.concluida ? hoje() : null } : e);
      const concluidas = etapas.filter(e => e.concluida).length;
      const status = concluidas === etapas.length ? "Concluído" : p.status;
      const historico = [...(p.historico || []), { data: hoje(), acao: `Etapa "${etapas.find(e => e.id === etapaId)?.descricao}" ${!proc.etapas.find(e=>e.id===etapaId)?.concluida ? "concluída" : "reaberta"}`, usuario: "Usuário" }];
      return { ...p, etapas, status, historico };
    });
    salvarProcessos(lista);
    setSelecionado(lista.find(p => p.id === proc.id));
  };

  const enviarWhatsApp = (proc, etapa) => {
    const templates = JSON.parse(localStorage.getItem("ep_templates_envio") || "[]");
    const tpl = templates.find(t => t.tipo === "whatsapp" && t.ativo);
    if (!tpl) { alert("Nenhum template de WhatsApp ativo encontrado em Configurações."); return; }
    const msg = tpl.corpo
      .replace("{cliente_nome}", proc.cliente)
      .replace("{processo_titulo}", proc.titulo)
      .replace("{etapa_atual}", etapa.descricao)
      .replace("{responsavel}", proc.responsavel || "Equipe EPimentel");
    const tel = "55" + (proc.telefone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const analisarComIA = async (arquivo) => {
    setAiAnalisando(true);
    setAiResultado("");
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result.split(",")[1];
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({
            model:"claude-sonnet-4-20250514", max_tokens:800,
            messages:[{ role:"user", content:[
              { type:"document", source:{ type:"base64", media_type:"application/pdf", data:base64 }},
              { type:"text", text:"Analise este documento contábil/fiscal e identifique: 1) Tipo de documento 2) Empresa/CNPJ 3) Competência/período 4) Valores principais 5) Etapa do processo a que este documento pertence. Seja conciso." }
            ]}]
          })
        });
        const data = await resp.json();
        setAiResultado(data.content?.[0]?.text || "Não foi possível analisar.");
      };
      reader.readAsDataURL(arquivo);
    } catch { setAiResultado("Erro ao analisar com IA."); }
    setAiAnalisando(false);
  };

  const filtrados = processos.filter(p => {
    const textoOk = !filtroTexto || p.titulo.toLowerCase().includes(filtroTexto.toLowerCase()) || p.cliente.toLowerCase().includes(filtroTexto.toLowerCase());
    const statusOk = !filtroStatus || p.status === filtroStatus;
    return textoOk && statusOk;
  });

  const progresso = (p) => {
    if (!p.etapas?.length) return 0;
    return Math.round((p.etapas.filter(e => e.concluida).length / p.etapas.length) * 100);
  };

  return (
    <div style={{ display:"flex", gap:0, height:"calc(100vh - 140px)" }}>
      {/* Lista */}
      <div style={{ width: selecionado ? 360 : "100%", borderRight:"1px solid #E0E0E0", display:"flex", flexDirection:"column", background:"#fff", transition:"width .2s" }}>
        <div style={{ padding:"14px 16px", borderBottom:"1px solid #eee" }}>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <input value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} placeholder="Buscar processo ou cliente..." style={{ ...inputStyle, flex:1 }} />
            <button onClick={abrirNovo} style={{ background:NAVY, color:"#fff", border:"none", borderRadius:8, padding:"0 16px", cursor:"pointer", fontWeight:700, fontSize:13, whiteSpace:"nowrap" }}>+ Novo</button>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            <button onClick={() => setFiltroStatus("")} style={{ padding:"4px 12px", borderRadius:12, border:"1px solid #ddd", background: !filtroStatus ? NAVY : "#fff", color: !filtroStatus ? "#fff" : "#555", cursor:"pointer", fontSize:11 }}>Todos ({processos.length})</button>
            {Object.keys(STATUS_CORES).map(s => (
              <button key={s} onClick={() => setFiltroStatus(s === filtroStatus ? "" : s)} style={{
                padding:"4px 12px", borderRadius:12, border:`1px solid ${STATUS_CORES[s]}44`,
                background: filtroStatus === s ? STATUS_CORES[s] : STATUS_CORES[s]+"11",
                color: filtroStatus === s ? "#fff" : STATUS_CORES[s],
                cursor:"pointer", fontSize:11, fontWeight:600
              }}>{s} ({processos.filter(p => p.status === s).length})</button>
            ))}
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto" }}>
          {filtrados.length === 0 && <div style={{ padding:32, textAlign:"center", color:"#999", fontSize:13 }}>Nenhum processo encontrado.</div>}
          {filtrados.map(p => (
            <div key={p.id} onClick={() => setSelecionado(selecionado?.id === p.id ? null : p)}
              style={{ padding:"14px 16px", borderBottom:"1px solid #F0F0F0", cursor:"pointer", background: selecionado?.id === p.id ? "#EEF2FF" : "transparent" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontWeight:700, color:NAVY, fontSize:13 }}>{p.titulo}</span>
                <Badge cor={STATUS_CORES[p.status] || "#999"} texto={p.status} />
              </div>
              <div style={{ fontSize:12, color:"#666", marginBottom:6 }}>👤 {p.cliente}</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ flex:1, height:4, background:"#eee", borderRadius:4 }}>
                  <div style={{ width:`${progresso(p)}%`, height:"100%", background:GOLD, borderRadius:4, transition:"width .3s" }} />
                </div>
                <span style={{ fontSize:11, color:"#888" }}>{progresso(p)}%</span>
              </div>
              <div style={{ fontSize:11, color:"#aaa", marginTop:4 }}>📅 {fmtData(p.dataAbertura)} · {p.etapas?.filter(e=>e.concluida).length}/{p.etapas?.length} etapas</div>
            </div>
          ))}
        </div>
      </div>

      {/* Detalhe */}
      {selecionado && (
        <div style={{ flex:1, overflowY:"auto", padding:24, background:"#F8F9FA" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
            <div>
              <h2 style={{ color:NAVY, margin:"0 0 4px" }}>{selecionado.titulo}</h2>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <Badge cor={STATUS_CORES[selecionado.status]} texto={selecionado.status} />
                <span style={{ fontSize:13, color:"#666" }}>👤 {selecionado.cliente}</span>
                <span style={{ fontSize:13, color:"#666" }}>📅 {fmtData(selecionado.dataAbertura)}</span>
              </div>
            </div>
            <button onClick={() => setSelecionado(null)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:22, color:"#999" }}>×</button>
          </div>

          {/* Progresso */}
          <div style={{ background:"#fff", borderRadius:10, padding:16, marginBottom:16, border:"1px solid #eee" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontWeight:700, color:NAVY, fontSize:13 }}>Progresso Geral</span>
              <span style={{ fontWeight:700, color:GOLD }}>{progresso(selecionado)}%</span>
            </div>
            <div style={{ height:8, background:"#eee", borderRadius:4 }}>
              <div style={{ width:`${progresso(selecionado)}%`, height:"100%", background:GOLD, borderRadius:4, transition:"width .3s" }} />
            </div>
          </div>

          {/* Etapas */}
          <div style={{ background:"#fff", borderRadius:10, padding:16, marginBottom:16, border:"1px solid #eee" }}>
            <h4 style={{ color:NAVY, margin:"0 0 14px" }}>📋 Etapas do Processo</h4>
            {(!selecionado.etapas || selecionado.etapas.length === 0) && (
              <div style={{ color:"#999", fontSize:13 }}>Nenhuma etapa definida.</div>
            )}
            {selecionado.etapas?.map((e, i) => (
              <div key={e.id} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 0", borderBottom: i < selecionado.etapas.length - 1 ? "1px solid #F5F5F5" : "none" }}>
                <div onClick={() => concluirEtapa(selecionado, e.id)}
                  style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${e.concluida ? GOLD : "#CCC"}`, background: e.concluida ? GOLD : "transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1, transition:"all .2s" }}>
                  {e.concluida && <span style={{ color:"#fff", fontSize:12, fontWeight:700 }}>✓</span>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, color: e.concluida ? "#999" : "#333", textDecoration: e.concluida ? "line-through" : "none", fontWeight: e.concluida ? 400 : 600 }}>
                    {i+1}. {e.descricao}
                  </div>
                  {e.dataConclusao && <div style={{ fontSize:11, color:"#aaa" }}>✅ Concluído em {fmtData(e.dataConclusao)}</div>}
                  {e.anexos?.length > 0 && (
                    <div style={{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap" }}>
                      {e.anexos.map((a, ai) => (
                        <span key={ai} style={{ background:"#EEF2FF", color:NAVY, borderRadius:6, padding:"2px 8px", fontSize:11 }}>📎 {a.nome}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <button onClick={() => setModalEtapa({ proc:selecionado, etapa:e })} style={{ background:"none", border:`1px solid ${GOLD}`, color:GOLD, borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:11 }}>📎</button>
                  <button onClick={() => enviarWhatsApp(selecionado, e)} style={{ background:"none", border:"1px solid #25D366", color:"#25D366", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:11 }}>💬</button>
                </div>
              </div>
            ))}
          </div>

          {/* Histórico */}
          {selecionado.historico?.length > 0 && (
            <div style={{ background:"#fff", borderRadius:10, padding:16, border:"1px solid #eee" }}>
              <h4 style={{ color:NAVY, margin:"0 0 12px" }}>📜 Histórico</h4>
              {selecionado.historico.slice().reverse().map((h, i) => (
                <div key={i} style={{ display:"flex", gap:10, padding:"6px 0", borderBottom: i < selecionado.historico.length - 1 ? "1px solid #F5F5F5" : "none" }}>
                  <span style={{ fontSize:11, color:"#aaa", flexShrink:0 }}>{fmtData(h.data)}</span>
                  <span style={{ fontSize:12, color:"#555" }}>{h.acao}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal novo processo */}
      {modal && (
        <Modal titulo="Novo Processo" onClose={() => setModal(false)} largura={580}>
          <Campo label="Título do Processo" obrigatorio>
            <input style={inputStyle} value={form.titulo} onChange={e => setForm({...form, titulo:e.target.value})} placeholder="Ex: Abertura de Empresa - João Silva" />
          </Campo>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Campo label="Cliente" obrigatorio>
              <select style={inputStyle} value={form.cliente} onChange={e => setForm({...form, cliente:e.target.value})}>
                <option value="">Selecione...</option>
                {clientes.map(c => <option key={c.id} value={c.nome_razao}>{c.nome_razao}</option>)}
                <option value="__outro">Outro (digitar)</option>
              </select>
            </Campo>
            <Campo label="Responsável">
              <select style={inputStyle} value={form.responsavel} onChange={e => setForm({...form, responsavel:e.target.value})}>
                <option value="">Selecione...</option>
                {usuarios.map(u => <option key={u.id} value={u.nome}>{u.nome}</option>)}
              </select>
            </Campo>
          </div>
          {form.cliente === "__outro" && (
            <Campo label="Nome do Cliente" obrigatorio>
              <input style={inputStyle} placeholder="Nome do cliente" onChange={e => setForm({...form, cliente: e.target.value})} />
            </Campo>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Campo label="Status">
              <select style={inputStyle} value={form.status} onChange={e => setForm({...form, status:e.target.value})}>
                {Object.keys(STATUS_CORES).map(s => <option key={s}>{s}</option>)}
              </select>
            </Campo>
            <Campo label="Prioridade">
              <select style={inputStyle} value={form.prioridade} onChange={e => setForm({...form, prioridade:e.target.value})}>
                {["Baixa","Normal","Alta","Urgente"].map(p => <option key={p}>{p}</option>)}
              </select>
            </Campo>
          </div>
          <Campo label="Template de Etapas (opcional)">
            <select style={inputStyle} value={form.template} onChange={e => setForm({...form, template:e.target.value})}>
              <option value="">Nenhum (definir etapas manualmente)</option>
              {TEMPLATES_PRONTOS.map(t => <option key={t.id} value={t.id}>{t.icone} {t.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Data de Abertura">
            <input style={inputStyle} type="date" value={form.dataAbertura} onChange={e => setForm({...form, dataAbertura:e.target.value})} />
          </Campo>
          <div style={{ display:"flex", gap:12, justifyContent:"flex-end", marginTop:8 }}>
            <button onClick={() => setModal(false)} style={{ background:"none", border:"1px solid #ddd", borderRadius:8, padding:"9px 20px", cursor:"pointer", fontSize:13 }}>Cancelar</button>
            <button onClick={salvarProcesso} disabled={!form.titulo || !form.cliente} style={{ background:NAVY, color:"#fff", border:"none", borderRadius:8, padding:"9px 20px", cursor:"pointer", fontWeight:700, fontSize:13, opacity:(!form.titulo||!form.cliente)?0.5:1 }}>Criar Processo</button>
          </div>
        </Modal>
      )}

      {/* Modal etapa - anexo + IA */}
      {modalEtapa && (
        <Modal titulo={`Etapa: ${modalEtapa.etapa.descricao}`} onClose={() => { setModalEtapa(null); setAiResultado(""); }} largura={520}>
          <div style={{ marginBottom:20 }}>
            <h4 style={{ color:NAVY, margin:"0 0 12px", fontSize:14 }}>📎 Anexar Documento</h4>
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" style={{ display:"none" }}
              onChange={async e => {
                const f = e.target.files[0];
                if (!f) return;
                if (f.type === "application/pdf" || f.type.startsWith("image/")) await analisarComIA(f);
                const lista = processos.map(p => {
                  if (p.id !== modalEtapa.proc.id) return p;
                  const etapas = p.etapas.map(et => et.id !== modalEtapa.etapa.id ? et : {
                    ...et, anexos: [...(et.anexos||[]), { nome:f.name, tamanho:f.size, data:hoje() }]
                  });
                  return { ...p, etapas };
                });
                salvarProcessos(lista);
                setSelecionado(lista.find(p => p.id === modalEtapa.proc.id));
              }} />
            <button onClick={() => fileRef.current.click()} style={{ background:NAVY, color:"#fff", border:"none", borderRadius:8, padding:"9px 20px", cursor:"pointer", fontWeight:700, fontSize:13 }}>
              📎 Selecionar Arquivo
            </button>
            <div style={{ fontSize:12, color:"#888", marginTop:6 }}>PDF e imagens serão analisados pela IA automaticamente.</div>
          </div>

          {aiAnalisando && (
            <div style={{ padding:16, background:"#F0F4FF", borderRadius:8, display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:20 }}>🤖</span>
              <span style={{ color:NAVY, fontSize:13 }}>Claude está analisando o documento...</span>
            </div>
          )}

          {aiResultado && (
            <div style={{ padding:16, background:"#F0F4FF", borderRadius:8, border:`1px solid ${NAVY}22` }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <span style={{ fontSize:16 }}>🤖</span>
                <span style={{ fontWeight:700, color:NAVY, fontSize:13 }}>Análise da IA</span>
              </div>
              <pre style={{ fontSize:12, color:"#333", whiteSpace:"pre-wrap", margin:0, fontFamily:"inherit" }}>{aiResultado}</pre>
            </div>
          )}

          {modalEtapa.etapa.anexos?.length > 0 && (
            <div style={{ marginTop:16 }}>
              <h4 style={{ color:NAVY, margin:"0 0 10px", fontSize:14 }}>Documentos Anexados</h4>
              {modalEtapa.etapa.anexos.map((a, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:"#F8F9FA", borderRadius:8, marginBottom:6 }}>
                  <span>📄</span>
                  <span style={{ flex:1, fontSize:13 }}>{a.nome}</span>
                  <span style={{ fontSize:11, color:"#aaa" }}>{fmtData(a.data)}</span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ── ABA TEMPLATES ─────────────────────────────────────────────────────────────
function TabTemplates() {
  return (
    <div style={{ padding:24 }}>
      <h3 style={{ color:NAVY, margin:"0 0 20px" }}>Templates de Processos</h3>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
        {TEMPLATES_PRONTOS.map(t => (
          <div key={t.id} style={{ background:"#fff", borderRadius:12, padding:20, border:`2px solid ${t.cor}22`, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <span style={{ fontSize:28 }}>{t.icone}</span>
              <div>
                <div style={{ fontWeight:700, color:NAVY, fontSize:14 }}>{t.nome}</div>
                <Badge cor={t.cor} texto={`${t.etapas.length} etapas`} />
              </div>
            </div>
            <p style={{ fontSize:12, color:"#666", margin:"0 0 14px", lineHeight:1.5 }}>{t.descricao}</p>
            <div style={{ borderTop:"1px solid #F0F0F0", paddingTop:12 }}>
              {t.etapas.map((e, i) => (
                <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:4 }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", background:t.cor+"22", color:t.cor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, flexShrink:0, marginTop:1 }}>{i+1}</div>
                  <span style={{ fontSize:12, color:"#555" }}>{e}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ABA RELATÓRIO ─────────────────────────────────────────────────────────────
function TabRelatorio() {
  const [processos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ep_processos") || "[]"); } catch { return []; }
  });

  const total = processos.length;
  const concluidos = processos.filter(p => p.status === "Concluído").length;
  const andamento = processos.filter(p => p.status === "Em Andamento").length;
  const aguardando = processos.filter(p => p.status === "Aguardando Cliente").length;
  const urgentes = processos.filter(p => p.prioridade === "Urgente" && p.status !== "Concluído").length;
  const progMedio = total ? Math.round(processos.reduce((acc, p) => {
    if (!p.etapas?.length) return acc;
    return acc + (p.etapas.filter(e=>e.concluida).length / p.etapas.length * 100);
  }, 0) / total) : 0;

  const CARDS = [
    { label:"Total de Processos", valor:total, cor:NAVY, icone:"📋" },
    { label:"Em Andamento", valor:andamento, cor:"#2196F3", icone:"⏳" },
    { label:"Aguardando Cliente", valor:aguardando, cor:"#FF9800", icone:"🕐" },
    { label:"Concluídos", valor:concluidos, cor:"#4CAF50", icone:"✅" },
    { label:"Urgentes", valor:urgentes, cor:"#F44336", icone:"🚨" },
    { label:"Progresso Médio", valor:`${progMedio}%`, cor:GOLD, icone:"📈" },
  ];

  return (
    <div style={{ padding:24 }}>
      <h3 style={{ color:NAVY, margin:"0 0 20px" }}>Relatório de Processos</h3>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:14, marginBottom:28 }}>
        {CARDS.map(c => (
          <div key={c.label} style={{ background:"#fff", borderRadius:12, padding:18, border:`2px solid ${c.cor}22`, textAlign:"center" }}>
            <div style={{ fontSize:28 }}>{c.icone}</div>
            <div style={{ fontSize:28, fontWeight:700, color:c.cor, margin:"4px 0" }}>{c.valor}</div>
            <div style={{ fontSize:12, color:"#666" }}>{c.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background:"#fff", borderRadius:10, border:"1px solid #eee", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:NAVY }}>
              {["Processo","Cliente","Status","Prioridade","Progresso","Abertura"].map(h => (
                <th key={h} style={{ color:"#fff", padding:"10px 14px", textAlign:"left", fontSize:12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processos.length === 0 && (
              <tr><td colSpan={6} style={{ padding:24, textAlign:"center", color:"#999" }}>Nenhum processo cadastrado.</td></tr>
            )}
            {processos.map((p, i) => {
              const prog = p.etapas?.length ? Math.round(p.etapas.filter(e=>e.concluida).length/p.etapas.length*100) : 0;
              return (
                <tr key={p.id} style={{ background: i%2===0?"#FAFAFA":"#fff", borderBottom:"1px solid #f0f0f0" }}>
                  <td style={{ padding:"10px 14px", fontSize:13, fontWeight:600, color:NAVY }}>{p.titulo}</td>
                  <td style={{ padding:"10px 14px", fontSize:13, color:"#555" }}>{p.cliente}</td>
                  <td style={{ padding:"10px 14px" }}><Badge cor={STATUS_CORES[p.status]||"#999"} texto={p.status} /></td>
                  <td style={{ padding:"10px 14px", fontSize:12, color:"#666" }}>{p.prioridade}</td>
                  <td style={{ padding:"10px 14px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:80, height:6, background:"#eee", borderRadius:3 }}>
                        <div style={{ width:`${prog}%`, height:"100%", background:GOLD, borderRadius:3 }} />
                      </div>
                      <span style={{ fontSize:11, color:"#888" }}>{prog}%</span>
                    </div>
                  </td>
                  <td style={{ padding:"10px 14px", fontSize:12, color:"#888" }}>{fmtData(p.dataAbertura)}</td>
                </tr>
              );
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

  const ABAS = [
    { id:"processos", label:"📋 Processos" },
    { id:"templates", label:"📁 Templates" },
    { id:"relatorio", label:"📊 Relatório" },
  ];

  return (
    <div style={{ fontFamily:"Arial, sans-serif", minHeight:"100vh", background:"#F0F2F5", display:"flex", flexDirection:"column" }}>
      <div style={{ background:NAVY, padding:"16px 24px" }}>
        <h2 style={{ color:"#fff", margin:0, fontSize:18 }}>
          ⚖️ Gestão de <span style={{ color:GOLD }}>Processos</span>
        </h2>
      </div>
      <div style={{ background:"#fff", display:"flex", borderBottom:"2px solid #E0E0E0" }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{
            padding:"13px 28px", border:"none", background:"none", cursor:"pointer",
            fontWeight: aba===a.id ? 700 : 400, color: aba===a.id ? NAVY : "#666", fontSize:13,
            borderBottom: aba===a.id ? `3px solid ${GOLD}` : "3px solid transparent"
          }}>{a.label}</button>
        ))}
      </div>
      <div style={{ flex:1, overflow:"hidden" }}>
        {aba === "processos" && <TabProcessos />}
        {aba === "templates" && <TabTemplates />}
        {aba === "relatorio" && <TabRelatorio />}
      </div>
    </div>
  );
}
