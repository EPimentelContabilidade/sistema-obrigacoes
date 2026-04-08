import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://sistema-obrigacoes-production.up.railway.app";
const NAVY = "#1B2A4A";
const GOLD = "#C5A55A";

const DEPARTAMENTOS_PADRAO = [
  { id: 1, nome: "Fiscal", cor: "#2196F3", responsavel: "" },
  { id: 2, nome: "Contábil", cor: "#4CAF50", responsavel: "" },
  { id: 3, nome: "Pessoal", cor: "#FF9800", responsavel: "" },
  { id: 4, nome: "Societário", cor: "#9C27B0", responsavel: "" },
  { id: 5, nome: "Legalização", cor: "#E91E63", responsavel: "" },
];

const REGIMES = ["MEI","Simples Nacional","Lucro Presumido","Lucro Real","RET/Imobiliário","Produtor Rural"];

const OBRIGACOES_CATALOGO = {
  "MEI": [
    { codigo:"DASN-SIMEI", nome:"DASN-SIMEI (Declaração Anual)", periodicidade:"Anual", ativo:true },
    { codigo:"DAS-MEI", nome:"DAS Mensal", periodicidade:"Mensal", ativo:true },
    { codigo:"RAIS-MEI", nome:"RAIS (se tiver empregado)", periodicidade:"Anual", ativo:false },
  ],
  "Simples Nacional": [
    { codigo:"DAS", nome:"DAS Mensal", periodicidade:"Mensal", ativo:true },
    { codigo:"DEFIS", nome:"DEFIS", periodicidade:"Anual", ativo:true },
    { codigo:"PGDAS-D", nome:"PGDAS-D", periodicidade:"Mensal", ativo:true },
    { codigo:"RAIS", nome:"RAIS", periodicidade:"Anual", ativo:true },
    { codigo:"CAGED", nome:"CAGED", periodicidade:"Mensal", ativo:true },
    { codigo:"SPED-CONT", nome:"SPED Contábil", periodicidade:"Anual", ativo:true },
    { codigo:"ECF", nome:"ECF", periodicidade:"Anual", ativo:true },
    { codigo:"EFD-REINF", nome:"EFD-REINF", periodicidade:"Mensal", ativo:false },
    { codigo:"ESOCIAL", nome:"eSocial", periodicidade:"Mensal", ativo:true },
    { codigo:"DCTFWEB", nome:"DCTFWeb", periodicidade:"Mensal", ativo:true },
  ],
  "Lucro Presumido": [
    { codigo:"DARF-IRPJ", nome:"DARF IRPJ (Trimestral)", periodicidade:"Trimestral", ativo:true },
    { codigo:"DARF-CSLL", nome:"DARF CSLL", periodicidade:"Trimestral", ativo:true },
    { codigo:"PIS-LP", nome:"PIS Cumulativo", periodicidade:"Mensal", ativo:true },
    { codigo:"COFINS-LP", nome:"COFINS Cumulativa", periodicidade:"Mensal", ativo:true },
    { codigo:"DCTF", nome:"DCTF Mensal", periodicidade:"Mensal", ativo:true },
    { codigo:"ECF-LP", nome:"ECF", periodicidade:"Anual", ativo:true },
    { codigo:"SPED-CONT-LP", nome:"SPED Contábil", periodicidade:"Anual", ativo:true },
    { codigo:"EFD-CONTRIBUICOES", nome:"EFD Contribuições", periodicidade:"Mensal", ativo:true },
    { codigo:"RAIS-LP", nome:"RAIS", periodicidade:"Anual", ativo:true },
    { codigo:"CAGED-LP", nome:"CAGED", periodicidade:"Mensal", ativo:true },
    { codigo:"ESOCIAL-LP", nome:"eSocial", periodicidade:"Mensal", ativo:true },
    { codigo:"DCTFWEB-LP", nome:"DCTFWeb", periodicidade:"Mensal", ativo:true },
    { codigo:"EFD-REINF-LP", nome:"EFD-REINF", periodicidade:"Mensal", ativo:true },
    { codigo:"SPED-FISCAL-LP", nome:"SPED Fiscal (ICMS/IPI)", periodicidade:"Mensal", ativo:false },
  ],
  "Lucro Real": [
    { codigo:"DARF-IRPJ-LR", nome:"DARF IRPJ (Estimativa Mensal)", periodicidade:"Mensal", ativo:true },
    { codigo:"DARF-CSLL-LR", nome:"DARF CSLL", periodicidade:"Mensal", ativo:true },
    { codigo:"PIS-NC", nome:"PIS Não Cumulativo", periodicidade:"Mensal", ativo:true },
    { codigo:"COFINS-NC", nome:"COFINS Não Cumulativa", periodicidade:"Mensal", ativo:true },
    { codigo:"DCTF-LR", nome:"DCTF Mensal", periodicidade:"Mensal", ativo:true },
    { codigo:"ECF-LR", nome:"ECF", periodicidade:"Anual", ativo:true },
    { codigo:"SPED-CONT-LR", nome:"SPED Contábil", periodicidade:"Anual", ativo:true },
    { codigo:"LALUR", nome:"LALUR/LACS", periodicidade:"Anual", ativo:true },
    { codigo:"EFD-CONTRIBUICOES-LR", nome:"EFD Contribuições", periodicidade:"Mensal", ativo:true },
    { codigo:"SPED-FISCAL-LR", nome:"SPED Fiscal", periodicidade:"Mensal", ativo:false },
    { codigo:"RAIS-LR", nome:"RAIS", periodicidade:"Anual", ativo:true },
    { codigo:"CAGED-LR", nome:"CAGED", periodicidade:"Mensal", ativo:true },
    { codigo:"ESOCIAL-LR", nome:"eSocial", periodicidade:"Mensal", ativo:true },
    { codigo:"DCTFWEB-LR", nome:"DCTFWeb", periodicidade:"Mensal", ativo:true },
    { codigo:"EFD-REINF-LR", nome:"EFD-REINF", periodicidade:"Mensal", ativo:true },
  ],
  "RET/Imobiliário": [
    { codigo:"RET-DARF", nome:"DARF RET (4%)", periodicidade:"Mensal", ativo:true },
    { codigo:"DIMOB", nome:"DIMOB", periodicidade:"Anual", ativo:true },
    { codigo:"SPED-CONT-RET", nome:"SPED Contábil", periodicidade:"Anual", ativo:true },
    { codigo:"ECF-RET", nome:"ECF", periodicidade:"Anual", ativo:true },
    { codigo:"CPC47", nome:"Apuração CPC 47 / POC", periodicidade:"Mensal", ativo:true },
    { codigo:"ESOCIAL-RET", nome:"eSocial", periodicidade:"Mensal", ativo:false },
    { codigo:"DCTFWEB-RET", nome:"DCTFWeb", periodicidade:"Mensal", ativo:true },
  ],
  "Produtor Rural": [
    { codigo:"FUNRURAL", nome:"Funrural (2,1%)", periodicidade:"Mensal", ativo:true },
    { codigo:"DAR-ITR", nome:"ITR", periodicidade:"Anual", ativo:true },
    { codigo:"DITR", nome:"DITR", periodicidade:"Anual", ativo:true },
    { codigo:"IRPF-RURAL", nome:"IRPF (Atividade Rural)", periodicidade:"Anual", ativo:true },
    { codigo:"BLOCO-B", nome:"Bloco B - Livro Caixa", periodicidade:"Mensal", ativo:true },
    { codigo:"CAR", nome:"CAR (Cadastro Ambiental Rural)", periodicidade:"Eventual", ativo:false },
  ],
};

const VARS_DISPONIVEIS = ["{cliente_nome}","{empresa_nome}","{cnpj}","{vencimento}","{competencia}","{obrigacao}","{responsavel}","{link_portal}","{processo_titulo}","{etapa_atual}"];

const COR_OPTIONS = ["#1B2A4A","#C5A55A","#2196F3","#4CAF50","#FF9800","#E91E63","#9C27B0","#00BCD4","#795548","#607D8B"];

function Badge({ cor, texto }) {
  return <span style={{ background: cor + "22", color: cor, border: `1px solid ${cor}44`, borderRadius: 12, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{texto}</span>;
}

function Modal({ titulo, onClose, children, largura = 540 }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"#fff",borderRadius:14,width:"100%",maxWidth:largura,maxHeight:"90vh",overflow:"auto",boxShadow:"0 8px 40px rgba(0,0,0,.18)" }}>
        <div style={{ padding:"18px 24px",borderBottom:"1px solid #eee",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff",zIndex:1 }}>
          <span style={{ fontWeight:700,color:NAVY,fontSize:16 }}>{titulo}</span>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#999" }}>×</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

function Campo({ label, children, obrigatorio }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block",fontWeight:600,color:NAVY,marginBottom:6,fontSize:13 }}>
        {label}{obrigatorio && <span style={{ color:"#e53935",marginLeft:2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = { width:"100%", padding:"9px 12px", borderRadius:8, border:"1px solid #ddd", fontSize:13, boxSizing:"border-box", outline:"none" };

// ── USUÁRIOS ─────────────────────────────────────────────────────────────────
function TabUsuarios({ departamentos }) {
  const [usuarios, setUsuarios] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ep_usuarios") || "[]"); } catch { return []; }
  });
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome:"", email:"", whatsapp:"", departamento:"", perfil:"operador", ativo:true, senha:"" });

  const salvar = () => {
    const lista = editando
      ? usuarios.map(u => u.id === editando.id ? { ...u, ...form } : u)
      : [...usuarios, { ...form, id: Date.now() }];
    setUsuarios(lista);
    localStorage.setItem("ep_usuarios", JSON.stringify(lista));
    setModal(false); setEditando(null);
  };

  const excluir = id => {
    if (!confirm("Excluir usuário?")) return;
    const lista = usuarios.filter(u => u.id !== id);
    setUsuarios(lista);
    localStorage.setItem("ep_usuarios", JSON.stringify(lista));
  };

  const abrir = (u = null) => {
    setEditando(u);
    setForm(u ? { nome:u.nome, email:u.email, whatsapp:u.whatsapp||"", departamento:u.departamento||"", perfil:u.perfil||"operador", ativo:u.ativo!==false, senha:"" }
                : { nome:"", email:"", whatsapp:"", departamento:"", perfil:"operador", ativo:true, senha:"" });
    setModal(true);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h3 style={{ color:NAVY, margin:0 }}>Usuários do Sistema</h3>
        <button onClick={() => abrir()} style={{ background:NAVY, color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontWeight:700, fontSize:13 }}>+ Novo Usuário</button>
      </div>
      <div style={{ background:"#fff", borderRadius:10, overflow:"hidden", border:"1px solid #eee" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:NAVY }}>
              {["Nome","E-mail","WhatsApp","Departamento","Perfil","Status",""].map(h => (
                <th key={h} style={{ color:"#fff", padding:"10px 14px", textAlign:"left", fontSize:12, fontWeight:700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 && (
              <tr><td colSpan={7} style={{ padding:24, textAlign:"center", color:"#999", fontSize:13 }}>Nenhum usuário cadastrado.</td></tr>
            )}
            {usuarios.map((u, i) => (
              <tr key={u.id} style={{ background: i % 2 === 0 ? "#FAFAFA" : "#fff", borderBottom:"1px solid #f0f0f0" }}>
                <td style={{ padding:"10px 14px", fontSize:13, fontWeight:600, color:NAVY }}>{u.nome}</td>
                <td style={{ padding:"10px 14px", fontSize:13, color:"#555" }}>{u.email}</td>
                <td style={{ padding:"10px 14px", fontSize:13, color:"#555" }}>{u.whatsapp}</td>
                <td style={{ padding:"10px 14px", fontSize:13 }}>
                  {departamentos.find(d => d.nome === u.departamento) && (
                    <Badge cor={departamentos.find(d => d.nome === u.departamento).cor} texto={u.departamento} />
                  )}
                </td>
                <td style={{ padding:"10px 14px", fontSize:13, color:"#555", textTransform:"capitalize" }}>{u.perfil}</td>
                <td style={{ padding:"10px 14px" }}>
                  <span style={{ background: u.ativo !== false ? "#E8F5E9" : "#FFEBEE", color: u.ativo !== false ? "#2E7D32" : "#C62828", padding:"2px 10px", borderRadius:10, fontSize:11, fontWeight:700 }}>
                    {u.ativo !== false ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td style={{ padding:"10px 14px" }}>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => abrir(u)} style={{ background:"none", border:`1px solid ${NAVY}`, color:NAVY, borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:12 }}>Editar</button>
                    <button onClick={() => excluir(u.id)} style={{ background:"none", border:"1px solid #e53935", color:"#e53935", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:12 }}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal titulo={editando ? "Editar Usuário" : "Novo Usuário"} onClose={() => setModal(false)}>
          <Campo label="Nome completo" obrigatorio><input style={inputStyle} value={form.nome} onChange={e => setForm({...form, nome:e.target.value})} placeholder="Ex: João da Silva" /></Campo>
          <Campo label="E-mail" obrigatorio><input style={inputStyle} type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} placeholder="joao@email.com" /></Campo>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <Campo label="WhatsApp"><input style={inputStyle} value={form.whatsapp} onChange={e => setForm({...form, whatsapp:e.target.value})} placeholder="62999887766" /></Campo>
            <Campo label="Departamento">
              <select style={inputStyle} value={form.departamento} onChange={e => setForm({...form, departamento:e.target.value})}>
                <option value="">Selecione...</option>
                {departamentos.map(d => <option key={d.id} value={d.nome}>{d.nome}</option>)}
              </select>
            </Campo>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <Campo label="Perfil">
              <select style={inputStyle} value={form.perfil} onChange={e => setForm({...form, perfil:e.target.value})}>
                <option value="admin">Administrador</option>
                <option value="gerente">Gerente</option>
                <option value="operador">Operador</option>
                <option value="visualizador">Visualizador</option>
              </select>
            </Campo>
            <Campo label="Status">
              <select style={inputStyle} value={form.ativo ? "1" : "0"} onChange={e => setForm({...form, ativo: e.target.value === "1"})}>
                <option value="1">Ativo</option>
                <option value="0">Inativo</option>
              </select>
            </Campo>
          </div>
          <Campo label={editando ? "Nova Senha (deixe em branco para manter)" : "Senha"}  obrigatorio={!editando}>
            <input style={inputStyle} type="password" value={form.senha} onChange={e => setForm({...form, senha:e.target.value})} placeholder="••••••••" />
          </Campo>
          <div style={{ display:"flex", gap:12, justifyContent:"flex-end", marginTop:8 }}>
            <button onClick={() => setModal(false)} style={{ background:"none", border:"1px solid #ddd", borderRadius:8, padding:"9px 20px", cursor:"pointer", fontSize:13 }}>Cancelar</button>
            <button onClick={salvar} style={{ background:NAVY, color:"#fff", border:"none", borderRadius:8, padding:"9px 20px", cursor:"pointer", fontWeight:700, fontSize:13 }}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── DEPARTAMENTOS ─────────────────────────────────────────────────────────────
function TabDepartamentos() {
  const [deps, setDeps] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ep_departamentos") || "null") || DEPARTAMENTOS_PADRAO; } catch { return DEPARTAMENTOS_PADRAO; }
  });
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome:"", cor:"#1B2A4A", responsavel:"" });

  const salvar = () => {
    const lista = editando
      ? deps.map(d => d.id === editando.id ? { ...d, ...form } : d)
      : [...deps, { ...form, id: Date.now() }];
    setDeps(lista);
    localStorage.setItem("ep_departamentos", JSON.stringify(lista));
    setModal(false); setEditando(null);
  };

  const excluir = id => {
    if (!confirm("Excluir departamento?")) return;
    const lista = deps.filter(d => d.id !== id);
    setDeps(lista); localStorage.setItem("ep_departamentos", JSON.stringify(lista));
  };

  const abrir = (d = null) => {
    setEditando(d);
    setForm(d ? { nome:d.nome, cor:d.cor, responsavel:d.responsavel||"" } : { nome:"", cor:"#1B2A4A", responsavel:"" });
    setModal(true);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h3 style={{ color:NAVY, margin:0 }}>Departamentos</h3>
        <button onClick={() => abrir()} style={{ background:NAVY, color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontWeight:700, fontSize:13 }}>+ Novo Departamento</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:16 }}>
        {deps.map(d => (
          <div key={d.id} style={{ background:"#fff", borderRadius:12, padding:20, border:`2px solid ${d.cor}33`, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <div style={{ width:14, height:14, borderRadius:"50%", background:d.cor, flexShrink:0 }} />
              <span style={{ fontWeight:700, color:NAVY, fontSize:15 }}>{d.nome}</span>
            </div>
            {d.responsavel && <div style={{ fontSize:12, color:"#666", marginBottom:12 }}>👤 {d.responsavel}</div>}
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => abrir(d)} style={{ flex:1, background:"none", border:`1px solid ${NAVY}`, color:NAVY, borderRadius:6, padding:"5px 0", cursor:"pointer", fontSize:12, fontWeight:600 }}>Editar</button>
              <button onClick={() => excluir(d.id)} style={{ flex:1, background:"none", border:"1px solid #e53935", color:"#e53935", borderRadius:6, padding:"5px 0", cursor:"pointer", fontSize:12 }}>Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal titulo={editando ? "Editar Departamento" : "Novo Departamento"} onClose={() => setModal(false)} largura={420}>
          <Campo label="Nome" obrigatorio><input style={inputStyle} value={form.nome} onChange={e => setForm({...form, nome:e.target.value})} placeholder="Ex: Fiscal" /></Campo>
          <Campo label="Responsável"><input style={inputStyle} value={form.responsavel} onChange={e => setForm({...form, responsavel:e.target.value})} placeholder="Nome do responsável" /></Campo>
          <Campo label="Cor">
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {COR_OPTIONS.map(c => (
                <div key={c} onClick={() => setForm({...form, cor:c})} style={{ width:28, height:28, borderRadius:"50%", background:c, cursor:"pointer", border: form.cor === c ? "3px solid #333" : "3px solid transparent", transition:"border .15s" }} />
              ))}
            </div>
          </Campo>
          <div style={{ display:"flex", gap:12, justifyContent:"flex-end", marginTop:8 }}>
            <button onClick={() => setModal(false)} style={{ background:"none", border:"1px solid #ddd", borderRadius:8, padding:"9px 20px", cursor:"pointer", fontSize:13 }}>Cancelar</button>
            <button onClick={salvar} style={{ background:NAVY, color:"#fff", border:"none", borderRadius:8, padding:"9px 20px", cursor:"pointer", fontWeight:700, fontSize:13 }}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── OBRIGAÇÕES POR REGIME ─────────────────────────────────────────────────────
function TabObrigacoes() {
  const [regime, setRegime] = useState("Simples Nacional");
  const [obrigacoes, setObrigacoes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ep_obrigacoes_catalogo") || "null") || OBRIGACOES_CATALOGO; } catch { return OBRIGACOES_CATALOGO; }
  });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ codigo:"", nome:"", periodicidade:"Mensal" });

  const toggle = (codigo) => {
    const novo = { ...obrigacoes, [regime]: obrigacoes[regime].map(o => o.codigo === codigo ? {...o, ativo: !o.ativo} : o) };
    setObrigacoes(novo);
    localStorage.setItem("ep_obrigacoes_catalogo", JSON.stringify(novo));
  };

  const adicionar = () => {
    if (!form.codigo || !form.nome) return;
    const nova = { ...form, ativo: true };
    const novo = { ...obrigacoes, [regime]: [...obrigacoes[regime], nova] };
    setObrigacoes(novo);
    localStorage.setItem("ep_obrigacoes_catalogo", JSON.stringify(novo));
    setModal(false); setForm({ codigo:"", nome:"", periodicidade:"Mensal" });
  };

  const remover = (codigo) => {
    if (!confirm("Remover obrigação?")) return;
    const novo = { ...obrigacoes, [regime]: obrigacoes[regime].filter(o => o.codigo !== codigo) };
    setObrigacoes(novo);
    localStorage.setItem("ep_obrigacoes_catalogo", JSON.stringify(novo));
  };

  const lista = obrigacoes[regime] || [];
  const ativas = lista.filter(o => o.ativo).length;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h3 style={{ color:NAVY, margin:0 }}>Obrigações por Regime</h3>
        <button onClick={() => setModal(true)} style={{ background:NAVY, color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontWeight:700, fontSize:13 }}>+ Adicionar Obrigação</button>
      </div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
        {REGIMES.map(r => (
          <button key={r} onClick={() => setRegime(r)} style={{
            padding:"7px 16px", borderRadius:20, border: regime === r ? "none" : "1px solid #ddd",
            background: regime === r ? NAVY : "#fff", color: regime === r ? "#fff" : "#555",
            cursor:"pointer", fontSize:12, fontWeight: regime === r ? 700 : 400
          }}>{r}</button>
        ))}
      </div>

      <div style={{ background:"#fff", borderRadius:10, border:"1px solid #eee", overflow:"hidden" }}>
        <div style={{ padding:"10px 16px", background:"#F8F9FA", borderBottom:"1px solid #eee", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontWeight:700, color:NAVY, fontSize:13 }}>{regime}</span>
          <span style={{ fontSize:12, color:"#666" }}>{ativas}/{lista.length} ativas</span>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#F8F9FA" }}>
              {["Código","Obrigação","Periodicidade","Ativo",""].map(h => (
                <th key={h} style={{ padding:"9px 14px", textAlign:"left", fontSize:11, fontWeight:700, color:"#666", borderBottom:"1px solid #eee" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((o, i) => (
              <tr key={o.codigo} style={{ background: i % 2 === 0 ? "#FAFAFA" : "#fff", borderBottom:"1px solid #f5f5f5" }}>
                <td style={{ padding:"9px 14px", fontSize:12, fontFamily:"monospace", color:NAVY, fontWeight:700 }}>{o.codigo}</td>
                <td style={{ padding:"9px 14px", fontSize:13, color:"#333" }}>{o.nome}</td>
                <td style={{ padding:"9px 14px" }}>
                  <span style={{ background:"#EEF2FF", color:"#3730A3", borderRadius:10, padding:"2px 8px", fontSize:11 }}>{o.periodicidade}</span>
                </td>
                <td style={{ padding:"9px 14px" }}>
                  <div onClick={() => toggle(o.codigo)} style={{
                    width:40, height:22, borderRadius:11, background: o.ativo ? GOLD : "#DDD",
                    cursor:"pointer", position:"relative", transition:"background .2s"
                  }}>
                    <div style={{ position:"absolute", top:3, left: o.ativo ? 21 : 3, width:16, height:16, borderRadius:"50%", background:"#fff", transition:"left .2s" }} />
                  </div>
                </td>
                <td style={{ padding:"9px 14px" }}>
                  <button onClick={() => remover(o.codigo)} style={{ background:"none", border:"none", cursor:"pointer", color:"#e53935", fontSize:13 }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal titulo="Adicionar Obrigação" onClose={() => setModal(false)} largura={440}>
          <Campo label="Código" obrigatorio><input style={inputStyle} value={form.codigo} onChange={e => setForm({...form, codigo:e.target.value.toUpperCase()})} placeholder="Ex: DARF-IRPJ-CUSTOM" /></Campo>
          <Campo label="Nome da Obrigação" obrigatorio><input style={inputStyle} value={form.nome} onChange={e => setForm({...form, nome:e.target.value})} placeholder="Ex: Guia ISS Municipal" /></Campo>
          <Campo label="Periodicidade">
            <select style={inputStyle} value={form.periodicidade} onChange={e => setForm({...form, periodicidade:e.target.value})}>
              {["Mensal","Trimestral","Semestral","Anual","Eventual"].map(p => <option key={p}>{p}</option>)}
            </select>
          </Campo>
          <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
            <button onClick={() => setModal(false)} style={{ background:"none", border:"1px solid #ddd", borderRadius:8, padding:"9px 20px", cursor:"pointer", fontSize:13 }}>Cancelar</button>
            <button onClick={adicionar} style={{ background:NAVY, color:"#fff", border:"none", borderRadius:8, padding:"9px 20px", cursor:"pointer", fontWeight:700, fontSize:13 }}>Adicionar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── CONFIGURAÇÕES DE ENVIO ────────────────────────────────────────────────────
function TabEnvio() {
  const [templates, setTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ep_templates_envio") || "null") || [
      { id:1, tipo:"whatsapp", nome:"Vencimento Próximo", assunto:"", corpo:"Olá {cliente_nome}! 👋\n\nPassando para lembrar que a obrigação *{obrigacao}* vence em *{vencimento}*.\n\nQualquer dúvida, estamos à disposição!\n\nEPimentel Auditoria & Contabilidade", ativo:true },
      { id:2, tipo:"whatsapp", nome:"Obrigação Entregue", assunto:"", corpo:"Olá {cliente_nome}! ✅\n\nA obrigação *{obrigacao}* referente à competência *{competencia}* foi entregue com sucesso.\n\nEPimentel Auditoria & Contabilidade", ativo:true },
      { id:3, tipo:"email", nome:"Envio de Documentos", assunto:"EPimentel | {obrigacao} - {competencia}", corpo:"Prezado(a) {cliente_nome},\n\nEncaminhamos em anexo os documentos referentes à obrigação {obrigacao}, competência {competencia}.\n\nEm caso de dúvidas, entre em contato.\n\nAtenciosamente,\nEPimentel Auditoria & Contabilidade", ativo:true },
      { id:4, tipo:"whatsapp", nome:"Processo Iniciado", assunto:"", corpo:"Olá {cliente_nome}! 🚀\n\nO processo *{processo_titulo}* foi iniciado em nosso escritório.\n\nAcompanhe pelo portal: {link_portal}\n\nEPimentel Auditoria & Contabilidade", ativo:true },
      { id:5, tipo:"email", nome:"Lembrete Pendência", assunto:"EPimentel | Pendência de Documentos", corpo:"Prezado(a) {cliente_nome},\n\nSolicitamos gentilmente o envio dos documentos pendentes para conclusão do processo {processo_titulo}.\n\nEtapa atual: {etapa_atual}\nResponsável: {responsavel}\n\nAtenciosamente,\nEPimentel Auditoria & Contabilidade", ativo:true },
    ]; } catch { return []; }
  });
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ tipo:"whatsapp", nome:"", assunto:"", corpo:"", ativo:true });
  const [varHint, setVarHint] = useState(false);

  const salvar = () => {
    const lista = editando
      ? templates.map(t => t.id === editando.id ? { ...t, ...form } : t)
      : [...templates, { ...form, id: Date.now() }];
    setTemplates(lista);
    localStorage.setItem("ep_templates_envio", JSON.stringify(lista));
    setModal(false); setEditando(null);
  };

  const abrir = (t = null) => {
    setEditando(t);
    setForm(t ? { tipo:t.tipo, nome:t.nome, assunto:t.assunto||"", corpo:t.corpo, ativo:t.ativo } : { tipo:"whatsapp", nome:"", assunto:"", corpo:"", ativo:true });
    setModal(true);
  };

  const inserirVar = (v) => setForm(f => ({ ...f, corpo: f.corpo + v }));

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h3 style={{ color:NAVY, margin:0 }}>Templates de Envio</h3>
        <button onClick={() => abrir()} style={{ background:NAVY, color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontWeight:700, fontSize:13 }}>+ Novo Template</button>
      </div>

      <div style={{ display:"grid", gap:14 }}>
        {templates.map(t => (
          <div key={t.id} style={{ background:"#fff", borderRadius:10, padding:18, border:"1px solid #eee", display:"flex", gap:16, alignItems:"flex-start" }}>
            <div style={{ fontSize:22 }}>{t.tipo === "whatsapp" ? "💬" : "✉️"}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <span style={{ fontWeight:700, color:NAVY, fontSize:14 }}>{t.nome}</span>
                <Badge cor={t.tipo === "whatsapp" ? "#25D366" : "#1976D2"} texto={t.tipo === "whatsapp" ? "WhatsApp" : "E-mail"} />
                {!t.ativo && <Badge cor="#999" texto="Inativo" />}
              </div>
              {t.assunto && <div style={{ fontSize:12, color:"#666", marginBottom:4 }}>Assunto: {t.assunto}</div>}
              <div style={{ fontSize:12, color:"#888", whiteSpace:"pre-line", maxHeight:60, overflow:"hidden", textOverflow:"ellipsis" }}>{t.corpo}</div>
            </div>
            <button onClick={() => abrir(t)} style={{ background:"none", border:`1px solid ${NAVY}`, color:NAVY, borderRadius:6, padding:"5px 14px", cursor:"pointer", fontSize:12, fontWeight:600, flexShrink:0 }}>Editar</button>
          </div>
        ))}
      </div>

      {modal && (
        <Modal titulo={editando ? "Editar Template" : "Novo Template"} onClose={() => setModal(false)} largura={600}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            <Campo label="Nome do Template" obrigatorio><input style={inputStyle} value={form.nome} onChange={e => setForm({...form, nome:e.target.value})} placeholder="Ex: Vencimento Próximo" /></Campo>
            <Campo label="Canal">
              <select style={inputStyle} value={form.tipo} onChange={e => setForm({...form, tipo:e.target.value})}>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-mail</option>
              </select>
            </Campo>
          </div>
          {form.tipo === "email" && (
            <Campo label="Assunto do E-mail"><input style={inputStyle} value={form.assunto} onChange={e => setForm({...form, assunto:e.target.value})} placeholder="Ex: EPimentel | {obrigacao} - {competencia}" /></Campo>
          )}
          <Campo label="Corpo da Mensagem" obrigatorio>
            <div style={{ marginBottom:6, display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontSize:12, color:"#666" }}>Variáveis disponíveis:</span>
              <button onClick={() => setVarHint(!varHint)} style={{ background:"none", border:"1px solid #ddd", borderRadius:6, padding:"2px 8px", cursor:"pointer", fontSize:11 }}>
                {varHint ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {varHint && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                {VARS_DISPONIVEIS.map(v => (
                  <span key={v} onClick={() => inserirVar(v)} style={{ background:"#EEF2FF", color:"#3730A3", borderRadius:6, padding:"2px 8px", fontSize:11, cursor:"pointer", fontFamily:"monospace" }}>{v}</span>
                ))}
              </div>
            )}
            <textarea style={{ ...inputStyle, minHeight:120, resize:"vertical", fontFamily:"inherit" }} value={form.corpo} onChange={e => setForm({...form, corpo:e.target.value})} placeholder="Digite o corpo da mensagem..." />
          </Campo>
          <Campo label="Status">
            <select style={inputStyle} value={form.ativo ? "1" : "0"} onChange={e => setForm({...form, ativo: e.target.value === "1"})}>
              <option value="1">Ativo</option>
              <option value="0">Inativo</option>
            </select>
          </Campo>
          <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
            <button onClick={() => setModal(false)} style={{ background:"none", border:"1px solid #ddd", borderRadius:8, padding:"9px 20px", cursor:"pointer", fontSize:13 }}>Cancelar</button>
            <button onClick={salvar} style={{ background:NAVY, color:"#fff", border:"none", borderRadius:8, padding:"9px 20px", cursor:"pointer", fontWeight:700, fontSize:13 }}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function ConfiguracoesTarefas() {
  const [aba, setAba] = useState("usuarios");
  const [departamentos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ep_departamentos") || "null") || DEPARTAMENTOS_PADRAO; } catch { return DEPARTAMENTOS_PADRAO; }
  });

  const ABAS = [
    { id:"usuarios", label:"👥 Usuários" },
    { id:"departamentos", label:"🏢 Departamentos" },
    { id:"obrigacoes", label:"📋 Obrigações por Regime" },
    { id:"envio", label:"📤 Configurações de Envio" },
  ];

  return (
    <div style={{ fontFamily:"Arial, sans-serif", minHeight:"100vh", background:"#F0F2F5" }}>
      {/* Header */}
      <div style={{ background:NAVY, padding:"16px 24px" }}>
        <h2 style={{ color:"#fff", margin:0, fontSize:18 }}>
          ⚙️ Configurações — <span style={{ color:GOLD }}>Tarefas & Processos</span>
        </h2>
      </div>

      {/* Tabs */}
      <div style={{ background:"#fff", display:"flex", borderBottom:"2px solid #E0E0E0", overflowX:"auto" }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{
            padding:"13px 24px", border:"none", background:"none", cursor:"pointer", whiteSpace:"nowrap",
            fontWeight: aba === a.id ? 700 : 400, color: aba === a.id ? NAVY : "#666", fontSize:13,
            borderBottom: aba === a.id ? `3px solid ${GOLD}` : "3px solid transparent"
          }}>{a.label}</button>
        ))}
      </div>

      {/* Conteúdo */}
      <div style={{ padding:24, maxWidth:1100, margin:"0 auto" }}>
        {aba === "usuarios" && <TabUsuarios departamentos={departamentos} />}
        {aba === "departamentos" && <TabDepartamentos />}
        {aba === "obrigacoes" && <TabObrigacoes />}
        {aba === "envio" && <TabEnvio />}
      </div>
    </div>
  );
}
