import { useState, useEffect } from "react";

const NAVY = "#1B2A4A";
const GOLD = "#C5A55A";

const DEPARTAMENTOS_PADRAO = [
  { id:1, nome:"Fiscal",      cor:"#2196F3", responsavel:"" },
  { id:2, nome:"Contábil",    cor:"#4CAF50", responsavel:"" },
  { id:3, nome:"Pessoal",     cor:"#FF9800", responsavel:"" },
  { id:4, nome:"Societário",  cor:"#9C27B0", responsavel:"" },
  { id:5, nome:"Legalização", cor:"#E91E63", responsavel:"" },
];

const REGIMES = ["MEI","Simples Nacional","Lucro Presumido","Lucro Real","RET/Imobiliário","Produtor Rural","Social/IRH","Imune/Isento","Condomínio","Autônomo"];
const TODOS_REGIMES = REGIMES;

const DIAS_MES = ["Todo dia 1","Todo dia 2","Todo dia 3","Todo dia 4","Todo dia 5","Todo dia 6","Todo dia 7","Todo dia 8","Todo dia 9","Todo dia 10","Todo dia 11","Todo dia 12","Todo dia 13","Todo dia 14","Todo dia 15","Todo dia 16","Todo dia 17","Todo dia 18","Todo dia 19","Todo dia 20","Todo dia 21","Todo dia 22","Todo dia 23","Todo dia 24","Todo dia 25","Todo dia 26","Todo dia 27","Todo dia 28","Último dia útil","Último dia do mês"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_ANTES = ["1 dia antes","2 dias antes","3 dias antes","4 dias antes","5 dias antes","7 dias antes","10 dias antes","15 dias antes","30 dias antes"];
const COR_OPTIONS = ["#1B2A4A","#C5A55A","#2196F3","#4CAF50","#FF9800","#E91E63","#9C27B0","#00BCD4"];
const VARS_DISPONIVEIS = ["{cliente_nome}","{empresa_nome}","{cnpj}","{vencimento}","{competencia}","{obrigacao}","{responsavel}","{link_portal}","{processo_titulo}","{etapa_atual}"];

// Obrigação padrão expandida
function obrigacaoPadrao(overrides = {}) {
  const diasMes = {};
  MESES.forEach(m => { diasMes[m] = "Todo dia 20"; });
  return {
    codigo: "", nome: "", periodicidade: "Mensal", ativo: true,
    dias_entrega: diasMes,
    lembrar_dias_antes: "5 dias antes",
    tipo_dias_antes: "Dias Corridos",
    prazo_nao_util: "Antecipar para o dia útil anterior",
    sabado_util: "Não",
    competencia_ref: "Mês anterior",
    exigir_robo: "Não",
    passivel_multa: "Não",
    alerta_guia: "Sim",
    notif_whatsapp: false,
    notif_email: false,
    caminho_arquivo: "{empresa}/{obrigacao}/{ano}/{mes}",
    regimes_vinculados: [],
    ...overrides
  };
}


// ── Clientes por regime ──────────────────────────────────────────────────────
function getClientesRegime(regime) {
  try {
    const mapa = {'Simples Nacional':'Simples Nacional','MEI':'MEI','Lucro Presumido':'Lucro Presumido','Lucro Real':'Lucro Real','RET/Imobiliário':'RET','Produtor Rural':'Produtor Rural'}
    const chave = Object.entries(mapa).find(([k])=>k===regime)?.[1] || regime
    return JSON.parse(localStorage.getItem('ep_clientes')||'[]').filter(c=>{
      const trib=c.tributacao||c.regime||''
      return trib===regime||trib===chave||(regime==='Social/IRH'&&(trib==='Social/RH'||trib==='Social'))
    })
  } catch { return [] }
}

const OBRIGACOES_CATALOGO_INICIAL = {
  "MEI": [
    obrigacaoPadrao({ codigo:"DASN-SIMEI", nome:"DASN-SIMEI (Declaração Anual)", periodicidade:"Anual", regimes_vinculados:["MEI"] }),
    obrigacaoPadrao({ codigo:"DAS-MEI", nome:"DAS Mensal", periodicidade:"Mensal", regimes_vinculados:["MEI"], passivel_multa:"Sim" }),
    obrigacaoPadrao({ codigo:"RAIS-MEI", nome:"RAIS (se tiver empregado)", periodicidade:"Anual", ativo:false, regimes_vinculados:["MEI"] }),
  ],
  "Simples Nacional": [
    obrigacaoPadrao({ codigo:"DAS", nome:"DAS Mensal", periodicidade:"Mensal", passivel_multa:"Sim", alerta_guia:"Sim", regimes_vinculados:["Simples Nacional"] }),
    obrigacaoPadrao({ codigo:"DEFIS", nome:"DEFIS", periodicidade:"Anual", regimes_vinculados:["Simples Nacional"] }),
    obrigacaoPadrao({ codigo:"PGDAS-D", nome:"PGDAS-D", periodicidade:"Mensal", regimes_vinculados:["Simples Nacional"] }),
    obrigacaoPadrao({ codigo:"RAIS", nome:"RAIS", periodicidade:"Anual", regimes_vinculados:["Simples Nacional","Lucro Presumido","Lucro Real"] }),
    obrigacaoPadrao({ codigo:"CAGED", nome:"CAGED", periodicidade:"Mensal", regimes_vinculados:["Simples Nacional","Lucro Presumido","Lucro Real"] }),
    obrigacaoPadrao({ codigo:"SPED-CONT", nome:"SPED Contábil", periodicidade:"Anual", regimes_vinculados:["Simples Nacional"] }),
    obrigacaoPadrao({ codigo:"ECF", nome:"ECF", periodicidade:"Anual", regimes_vinculados:["Simples Nacional"] }),
    obrigacaoPadrao({ codigo:"EFD-REINF", nome:"EFD-REINF", periodicidade:"Mensal", ativo:false, regimes_vinculados:["Simples Nacional"] }),
    obrigacaoPadrao({ codigo:"ESOCIAL", nome:"eSocial", periodicidade:"Mensal", regimes_vinculados:["Simples Nacional","Lucro Presumido","Lucro Real"] }),
    obrigacaoPadrao({ codigo:"DCTFWEB", nome:"DCTFWeb", periodicidade:"Mensal", regimes_vinculados:["Simples Nacional","Lucro Presumido","Lucro Real"] }),
  ],
  "Lucro Presumido": [
    obrigacaoPadrao({ codigo:"DARF-IRPJ", nome:"DARF IRPJ (Trimestral)", periodicidade:"Trimestral", passivel_multa:"Sim", regimes_vinculados:["Lucro Presumido"] }),
    obrigacaoPadrao({ codigo:"DARF-CSLL", nome:"DARF CSLL", periodicidade:"Trimestral", passivel_multa:"Sim", regimes_vinculados:["Lucro Presumido"] }),
    obrigacaoPadrao({ codigo:"PIS-LP", nome:"PIS Cumulativo", periodicidade:"Mensal", regimes_vinculados:["Lucro Presumido"] }),
    obrigacaoPadrao({ codigo:"COFINS-LP", nome:"COFINS Cumulativa", periodicidade:"Mensal", regimes_vinculados:["Lucro Presumido"] }),
    obrigacaoPadrao({ codigo:"DCTF", nome:"DCTF Mensal", periodicidade:"Mensal", regimes_vinculados:["Lucro Presumido","Lucro Real"] }),
    obrigacaoPadrao({ codigo:"ECF-LP", nome:"ECF", periodicidade:"Anual", regimes_vinculados:["Lucro Presumido"] }),
    obrigacaoPadrao({ codigo:"SPED-CONT-LP", nome:"SPED Contábil", periodicidade:"Anual", regimes_vinculados:["Lucro Presumido"] }),
    obrigacaoPadrao({ codigo:"EFD-CONTRIBUICOES", nome:"EFD Contribuições", periodicidade:"Mensal", regimes_vinculados:["Lucro Presumido","Lucro Real"] }),
    obrigacaoPadrao({ codigo:"SPED-FISCAL-LP", nome:"SPED Fiscal (ICMS/IPI)", periodicidade:"Mensal", ativo:false, regimes_vinculados:["Lucro Presumido","Lucro Real"] }),
  ],
  "Lucro Real": [
    obrigacaoPadrao({ codigo:"DARF-IRPJ-LR", nome:"DARF IRPJ (Estimativa Mensal)", periodicidade:"Mensal", passivel_multa:"Sim", regimes_vinculados:["Lucro Real"] }),
    obrigacaoPadrao({ codigo:"DARF-CSLL-LR", nome:"DARF CSLL", periodicidade:"Mensal", passivel_multa:"Sim", regimes_vinculados:["Lucro Real"] }),
    obrigacaoPadrao({ codigo:"PIS-NC", nome:"PIS Não Cumulativo", periodicidade:"Mensal", regimes_vinculados:["Lucro Real"] }),
    obrigacaoPadrao({ codigo:"COFINS-NC", nome:"COFINS Não Cumulativa", periodicidade:"Mensal", regimes_vinculados:["Lucro Real"] }),
    obrigacaoPadrao({ codigo:"LALUR", nome:"LALUR/LACS", periodicidade:"Anual", regimes_vinculados:["Lucro Real"] }),
  ],
  "RET/Imobiliário": [
    obrigacaoPadrao({ codigo:"RET-DARF", nome:"DARF RET (4%)", periodicidade:"Mensal", passivel_multa:"Sim", regimes_vinculados:["RET/Imobiliário"] }),
    obrigacaoPadrao({ codigo:"DIMOB", nome:"DIMOB", periodicidade:"Anual", regimes_vinculados:["RET/Imobiliário"] }),
    obrigacaoPadrao({ codigo:"CPC47", nome:"Apuração CPC 47 / POC", periodicidade:"Mensal", regimes_vinculados:["RET/Imobiliário"] }),
    obrigacaoPadrao({ codigo:"SPED-CONT-RET", nome:"SPED Contábil", periodicidade:"Anual", regimes_vinculados:["RET/Imobiliário"] }),
  ],
  "Social/IRH": [
    obrigacaoPadrao({ codigo:"FOLHA-PAG", nome:"Folha de Pagamento", periodicidade:"Mensal", regimes_vinculados:["Social/IRH"] }),
    obrigacaoPadrao({ codigo:"HOLERITE", nome:"Holerite / Recibo de Salário", periodicidade:"Mensal", regimes_vinculados:["Social/IRH"] }),
    obrigacaoPadrao({ codigo:"FGTS-SOCIAL", nome:"FGTS Mensal", periodicidade:"Mensal", passivel_multa:"Sim", regimes_vinculados:["Social/IRH"] }),
    obrigacaoPadrao({ codigo:"INSS-GPS", nome:"INSS / GPS", periodicidade:"Mensal", passivel_multa:"Sim", regimes_vinculados:["Social/IRH"] }),
    obrigacaoPadrao({ codigo:"ESOCIAL-RH", nome:"eSocial Mensal", periodicidade:"Mensal", regimes_vinculados:["Social/IRH"] }),
    obrigacaoPadrao({ codigo:"DCTFWEB-RH", nome:"DCTFWeb", periodicidade:"Mensal", regimes_vinculados:["Social/IRH"] }),
    obrigacaoPadrao({ codigo:"CAGED-RH", nome:"CAGED (admissão/demissão)", periodicidade:"Mensal", regimes_vinculados:["Social/IRH"] }),
    obrigacaoPadrao({ codigo:"RAIS-RH", nome:"RAIS Anual", periodicidade:"Anual", regimes_vinculados:["Social/IRH"] }),
    obrigacaoPadrao({ codigo:"IRRF-FUNC", nome:"IRRF / DIRF", periodicidade:"Mensal", passivel_multa:"Sim", regimes_vinculados:["Social/IRH"] }),
    obrigacaoPadrao({ codigo:"13-SAL", nome:"13º Salário (1ª e 2ª parcela)", periodicidade:"Anual", regimes_vinculados:["Social/IRH"] }),
    obrigacaoPadrao({ codigo:"FERIAS", nome:"Controle de Férias", periodicidade:"Mensal", regimes_vinculados:["Social/IRH"] }),
    obrigacaoPadrao({ codigo:"EFD-REINF-RH", nome:"EFD-REINF", periodicidade:"Mensal", ativo:false, regimes_vinculados:["Social/IRH"] }),
  ],
  "Imune/Isento": [
    obrigacaoPadrao({ codigo:"DCTF-IMUNE", nome:"DCTF", periodicidade:"Mensal", regimes_vinculados:["Imune/Isento"] }),
    obrigacaoPadrao({ codigo:"SPED-IMUNE", nome:"SPED Contábil", periodicidade:"Anual", regimes_vinculados:["Imune/Isento"] }),
    obrigacaoPadrao({ codigo:"RAIS-IMUNE", nome:"RAIS", periodicidade:"Anual", regimes_vinculados:["Imune/Isento"] }),
  ],
  "Condomínio": [
    obrigacaoPadrao({ codigo:"BALANCETE-COND", nome:"Balancete Mensal", periodicidade:"Mensal", regimes_vinculados:["Condomínio"] }),
    obrigacaoPadrao({ codigo:"IRRF-COND", nome:"IRRF (prestadores)", periodicidade:"Mensal", regimes_vinculados:["Condomínio"] }),
    obrigacaoPadrao({ codigo:"DCTF-COND", nome:"DCTF", periodicidade:"Mensal", regimes_vinculados:["Condomínio"] }),
  ],
  "Autônomo": [
    obrigacaoPadrao({ codigo:"CARNE-LEAO", nome:"Carnê Leão Mensal", periodicidade:"Mensal", passivel_multa:"Sim", regimes_vinculados:["Autônomo"] }),
    obrigacaoPadrao({ codigo:"IRPF-AUT", nome:"IRPF Anual", periodicidade:"Anual", regimes_vinculados:["Autônomo"] }),
    obrigacaoPadrao({ codigo:"INSS-AUT", nome:"GPS / INSS Autônomo", periodicidade:"Mensal", passivel_multa:"Sim", regimes_vinculados:["Autônomo"] }),
  ],
  "Produtor Rural": [
    obrigacaoPadrao({ codigo:"FUNRURAL", nome:"Funrural (2,1%)", periodicidade:"Mensal", passivel_multa:"Sim", regimes_vinculados:["Produtor Rural"] }),
    obrigacaoPadrao({ codigo:"DAR-ITR", nome:"ITR", periodicidade:"Anual", regimes_vinculados:["Produtor Rural"] }),
    obrigacaoPadrao({ codigo:"DITR", nome:"DITR", periodicidade:"Anual", regimes_vinculados:["Produtor Rural"] }),
    obrigacaoPadrao({ codigo:"IRPF-RURAL", nome:"IRPF (Atividade Rural)", periodicidade:"Anual", regimes_vinculados:["Produtor Rural"] }),
    obrigacaoPadrao({ codigo:"BLOCO-B", nome:"Bloco B — Livro Caixa", periodicidade:"Mensal", regimes_vinculados:["Produtor Rural"] }),
  ],
};

// Função exportável para outros módulos (Clientes.jsx)
export function gerarObrigacoesCliente(regime) {
  try {
    const catalogo = JSON.parse(localStorage.getItem("ep_obrigacoes_catalogo_v2") || "null") || OBRIGACOES_CATALOGO_INICIAL;
    const lista = catalogo[regime] || [];
    return lista.filter(o => o.ativo).map(o => ({
      ...o,
      id: Date.now() + Math.random(),
      regime,
      status: "Pendente",
    }));
  } catch { return []; }
}

// ── UI helpers ────────────────────────────────────────────────────────────────
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

function Badge({ cor, texto }) {
  return <span style={{ background:cor+"22",color:cor,border:`1px solid ${cor}44`,borderRadius:12,padding:"2px 10px",fontSize:11,fontWeight:700 }}>{texto}</span>;
}

const inputStyle = { width:"100%",padding:"8px 11px",borderRadius:8,border:"1px solid #ddd",fontSize:13,boxSizing:"border-box",outline:"none" };
const selectStyle = { ...inputStyle };

function Campo({ label, children, dica }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:"block",fontWeight:600,color:NAVY,marginBottom:5,fontSize:12 }}>
        {label}{dica && <span style={{ fontWeight:400,color:"#aaa",marginLeft:4,fontSize:11 }}>({dica})</span>}
      </label>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width:40,height:22,borderRadius:11,background:value?GOLD:"#DDD",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0 }}>
      <div style={{ position:"absolute",top:3,left:value?21:3,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left .2s" }} />
    </div>
  );
}

// ── MODAL EDITAR OBRIGAÇÃO ────────────────────────────────────────────────────
function ModalObrigacao({ obrigacao, onSave, onClose }) {
  const [form, setForm] = useState({ ...obrigacaoPadrao(), ...obrigacao });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setDia = (mes, val) => setForm(f => ({ ...f, dias_entrega: { ...f.dias_entrega, [mes]: val } }));

  return (
    <Modal titulo={form.codigo ? `Editar: ${form.codigo}` : "Nova Obrigação"} onClose={onClose} largura={780}>
      {/* Identificação */}
      <div style={{ background:"#F8F9FA",borderRadius:8,padding:14,marginBottom:16 }}>
        <div style={{ fontWeight:700,color:NAVY,fontSize:13,marginBottom:10 }}>📋 Identificação</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 2fr 1fr",gap:12 }}>
          <Campo label="Código *"><input style={inputStyle} value={form.codigo} onChange={e => set("codigo",e.target.value.toUpperCase())} placeholder="DAS" /></Campo>
          <Campo label="Nome da Obrigação *"><input style={inputStyle} value={form.nome} onChange={e => set("nome",e.target.value)} placeholder="Ex: DAS Mensal" /></Campo>
          <Campo label="Periodicidade">
            <select style={selectStyle} value={form.periodicidade} onChange={e => set("periodicidade",e.target.value)}>
              {["Mensal","Trimestral","Semestral","Anual","Eventual"].map(p=><option key={p}>{p}</option>)}
            </select>
          </Campo>
        </div>
      </div>

      {/* Dias de entrega por mês */}
      <div style={{ background:"#F8F9FA",borderRadius:8,padding:14,marginBottom:16 }}>
        <div style={{ fontWeight:700,color:NAVY,fontSize:13,marginBottom:10 }}>📅 Dias de Entrega por Mês</div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8 }}>
          {MESES.map(mes => (
            <div key={mes}>
              <div style={{ fontSize:11,color:"#666",marginBottom:3,fontWeight:600 }}>{mes.substring(0,3)}</div>
              <select style={{ ...selectStyle,fontSize:11,padding:"5px 6px" }} value={form.dias_entrega?.[mes]||"Todo dia 20"} onChange={e => setDia(mes,e.target.value)}>
                {DIAS_MES.map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Configurações de prazo */}
      <div style={{ background:"#F8F9FA",borderRadius:8,padding:14,marginBottom:16 }}>
        <div style={{ fontWeight:700,color:NAVY,fontSize:13,marginBottom:10 }}>⏰ Configurações de Prazo</div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
          <Campo label="Lembrar responsável">
            <select style={selectStyle} value={form.lembrar_dias_antes} onChange={e => set("lembrar_dias_antes",e.target.value)}>
              {DIAS_ANTES.map(d=><option key={d}>{d}</option>)}
            </select>
          </Campo>
          <Campo label="Tipo dos dias antes">
            <select style={selectStyle} value={form.tipo_dias_antes} onChange={e => set("tipo_dias_antes",e.target.value)}>
              <option>Dias Corridos</option>
              <option>Dias Úteis</option>
            </select>
          </Campo>
          <Campo label="Prazos em dias não-úteis">
            <select style={selectStyle} value={form.prazo_nao_util} onChange={e => set("prazo_nao_util",e.target.value)}>
              <option>Antecipar para o dia útil anterior</option>
              <option>Postergar para o próximo dia útil</option>
              <option>Manter na data original</option>
            </select>
          </Campo>
          <Campo label="Sábado é útil?">
            <select style={selectStyle} value={form.sabado_util} onChange={e => set("sabado_util",e.target.value)}>
              <option>Não</option>
              <option>Sim</option>
            </select>
          </Campo>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginTop:4 }}>
          <Campo label="Competências ref.">
            <select style={selectStyle} value={form.competencia_ref} onChange={e => set("competencia_ref",e.target.value)}>
              <option>Mês anterior</option>
              <option>Mês atual</option>
              <option>Trimestre anterior</option>
              <option>Ano anterior</option>
            </select>
          </Campo>
          <Campo label="Exigir Robô?">
            <select style={selectStyle} value={form.exigir_robo} onChange={e => set("exigir_robo",e.target.value)}>
              <option>Não</option>
              <option>Sim</option>
            </select>
          </Campo>
          <Campo label="Passível de multa?">
            <select style={selectStyle} value={form.passivel_multa} onChange={e => set("passivel_multa",e.target.value)}>
              <option>Não</option>
              <option>Sim</option>
            </select>
          </Campo>
          <Campo label="Alerta guia não-lida?">
            <select style={selectStyle} value={form.alerta_guia} onChange={e => set("alerta_guia",e.target.value)}>
              <option>Sim</option>
              <option>Não</option>
            </select>
          </Campo>
          <Campo label="Ativa?">
            <select style={selectStyle} value={form.ativo?"Sim":"Não"} onChange={e => set("ativo",e.target.value==="Sim")}>
              <option>Sim</option>
              <option>Não</option>
            </select>
          </Campo>
        </div>
      </div>

      {/* Notificações */}
      <div style={{ background:"#F8F9FA",borderRadius:8,padding:14,marginBottom:16 }}>
        <div style={{ fontWeight:700,color:NAVY,fontSize:13,marginBottom:10 }}>🔔 Notificações</div>
        <div style={{ display:"flex",gap:24 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:"#fff",borderRadius:8,border:"1px solid #E0E0E0",flex:1 }}>
            <span style={{ fontSize:20 }}>💬</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600,color:NAVY,fontSize:13 }}>Notificação WhatsApp</div>
              <div style={{ fontSize:11,color:"#888" }}>Ao marcar como entregue, notifica o cliente via WhatsApp</div>
            </div>
            <Toggle value={form.notif_whatsapp} onChange={v => set("notif_whatsapp",v)} />
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:"#fff",borderRadius:8,border:"1px solid #E0E0E0",flex:1 }}>
            <span style={{ fontSize:20 }}>✉️</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600,color:NAVY,fontSize:13 }}>Notificação E-mail</div>
              <div style={{ fontSize:11,color:"#888" }}>Envia e-mail automático ao cliente ao entregar</div>
            </div>
            <Toggle value={form.notif_email} onChange={v => set("notif_email",v)} />
          </div>
        </div>
      </div>

      {/* Caminho do arquivo */}
      <div style={{ background:"#F8F9FA",borderRadius:8,padding:14,marginBottom:16 }}>
        <div style={{ fontWeight:700,color:NAVY,fontSize:13,marginBottom:10 }}>📁 Caminho de Salvamento</div>
        <Campo label="Estrutura de pasta" dica="Variáveis disponíveis: {empresa}, {cnpj}, {obrigacao}, {ano}, {mes}, {competencia}">
          <input style={inputStyle} value={form.caminho_arquivo} onChange={e => set("caminho_arquivo",e.target.value)} placeholder="{empresa}/{obrigacao}/{ano}/{mes}" />
        </Campo>
        <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginTop:6 }}>
          {["{empresa}","{cnpj}","{obrigacao}","{ano}","{mes}","{competencia}","{regime}"].map(v=>(
            <span key={v} onClick={() => set("caminho_arquivo",(form.caminho_arquivo||"")+v)} style={{ background:"#EEF2FF",color:"#3730A3",borderRadius:6,padding:"2px 8px",fontSize:11,cursor:"pointer",fontFamily:"monospace" }}>{v}</span>
          ))}
        </div>
        <div style={{ marginTop:8,padding:"8px 12px",background:"#fff",borderRadius:6,border:"1px solid #E0E0E0" }}>
          <span style={{ fontSize:11,color:"#888" }}>Exemplo: </span>
          <span style={{ fontSize:11,fontFamily:"monospace",color:NAVY }}>
            {(form.caminho_arquivo||"{empresa}/{obrigacao}/{ano}/{mes}")
              .replace("{empresa}","Empresa Ltda")
              .replace("{cnpj}","12.345.678/0001-90")
              .replace("{obrigacao}",form.codigo||"DAS")
              .replace("{ano}","2026")
              .replace("{mes}","04")
              .replace("{competencia}","03-2026")
              .replace("{regime}","Simples Nacional")}
          </span>
        </div>
      </div>

      {/* Robô Obrigações */}
      <div style={{ background:"#F8F9FA",borderRadius:8,padding:14,marginBottom:16 }}>
        <div style={{ fontWeight:700,color:NAVY,fontSize:13,marginBottom:10 }}>🤖 Vinculação ao Robô Obrigações</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          <Campo label="Termos de reconhecimento" dica="palavras-chave que o robô usa para identificar este documento">
            <input style={inputStyle} value={form.robo_termos||""} onChange={e => set("robo_termos",e.target.value)} placeholder={`Ex: ${form.codigo||"DAS"}, ${form.nome?.split(" ")[0]||"Guia"}, PGDAS`} />
          </Campo>
          <Campo label="Tipo de arquivo esperado">
            <select style={selectStyle} value={form.robo_tipo||"PDF"} onChange={e => set("robo_tipo",e.target.value)}>
              {["PDF","XML","TXT","XLSX","Qualquer"].map(t=><option key={t}>{t}</option>)}
            </select>
          </Campo>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:"#fff",borderRadius:8,border:"1px solid #E0E0E0",marginTop:4 }}>
          <span style={{ fontSize:20 }}>🤖</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600,color:NAVY,fontSize:13 }}>Reconhecimento Automático</div>
            <div style={{ fontSize:11,color:"#888" }}>O Robô identifica e vincula documentos automaticamente ao detectar os termos acima</div>
          </div>
          <Toggle value={form.robo_ativo!==false} onChange={v => set("robo_ativo",v)} />
        </div>
      </div>

      {/* Tributação / Regimes */}
      <div style={{ background:"#F8F9FA",borderRadius:8,padding:14,marginBottom:20 }}>
        <div style={{ fontWeight:700,color:NAVY,fontSize:13,marginBottom:10 }}>⚖️ Tributação (Regimes que usam esta obrigação)</div>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
          {TODOS_REGIMES.map(r => (
            <label key={r} style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,border:`1px solid ${(form.regimes_vinculados||[]).includes(r)?NAVY:"#ddd"}`,background:(form.regimes_vinculados||[]).includes(r)?NAVY+"11":"#fff",cursor:"pointer",fontSize:12 }}>
              <input type="checkbox" checked={(form.regimes_vinculados||[]).includes(r)}
                onChange={e => {
                  const lista = form.regimes_vinculados||[];
                  set("regimes_vinculados", e.target.checked ? [...lista,r] : lista.filter(x=>x!==r));
                }} style={{ cursor:"pointer" }} />
              {r}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display:"flex",gap:12,justifyContent:"flex-end" }}>
        <button onClick={onClose} style={{ background:"none",border:"1px solid #ddd",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13 }}>Cancelar</button>
        <button onClick={() => { if(form.codigo&&form.nome) onSave(form); }} disabled={!form.codigo||!form.nome}
          style={{ background:NAVY,color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontWeight:700,fontSize:13,opacity:(!form.codigo||!form.nome)?0.5:1 }}>
          Salvar Obrigação
        </button>
      </div>
    </Modal>
  );
}

// ── TAB OBRIGAÇÕES ────────────────────────────────────────────────────────────
function TabObrigacoes() {
  const [regime, setRegime] = useState("Simples Nacional");
  const [catalogo, setCatalogo] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ep_obrigacoes_catalogo_v2")||"null") || OBRIGACOES_CATALOGO_INICIAL; } catch { return OBRIGACOES_CATALOGO_INICIAL; }
  });
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");

  const salvarCatalogo = (novo) => {
    setCatalogo(novo);
    localStorage.setItem("ep_obrigacoes_catalogo_v2", JSON.stringify(novo));
  };

  const salvarObrigacao = (form) => {
    const lista = catalogo[regime] || [];
    const existe = lista.find(o => o.codigo === editando?.codigo);
    const novaLista = existe
      ? lista.map(o => o.codigo === editando.codigo ? form : o)
      : [...lista, form];
    salvarCatalogo({ ...catalogo, [regime]: novaLista });
    setModal(false); setEditando(null);
  };

  const toggle = (codigo) => {
    const novo = { ...catalogo, [regime]: catalogo[regime].map(o => o.codigo===codigo ? {...o,ativo:!o.ativo} : o) };
    salvarCatalogo(novo);
  };

  const remover = (codigo) => {
    if (!confirm("Remover obrigação?")) return;
    salvarCatalogo({ ...catalogo, [regime]: catalogo[regime].filter(o => o.codigo!==codigo) });
  };

  const abrir = (o=null) => { setEditando(o); setModal(true); };

  const lista = (catalogo[regime]||[]).filter(o => !busca || o.codigo.toLowerCase().includes(busca.toLowerCase()) || o.nome.toLowerCase().includes(busca.toLowerCase()));
  const ativas = (catalogo[regime]||[]).filter(o=>o.ativo).length;

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <h3 style={{ color:NAVY,margin:0 }}>Obrigações por Regime</h3>
        <button onClick={() => abrir()} style={{ background:NAVY,color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:700,fontSize:13 }}>+ Adicionar Obrigação</button>
      </div>

      <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:14 }}>
        {REGIMES.map(r => (
          <button key={r} onClick={() => setRegime(r)} style={{
            padding:"7px 16px",borderRadius:20,border:regime===r?"none":"1px solid #ddd",
            background:regime===r?NAVY:"#fff",color:regime===r?"#fff":"#555",
            cursor:"pointer",fontSize:12,fontWeight:regime===r?700:400
          }}>{r}</button>
        ))}
      </div>

      <div style={{ background:"#fff",borderRadius:10,border:"1px solid #eee",overflow:"hidden" }}>
        <div style={{ padding:"10px 16px",background:"#F8F9FA",borderBottom:"1px solid #eee",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12 }}>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar obrigação..." style={{ ...inputStyle,maxWidth:260 }} />
          <span style={{ fontSize:12,color:"#666" }}>{ativas}/{(catalogo[regime]||[]).length} ativas</span>
        </div>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#F8F9FA" }}>
              {["Código","Obrigação","Periodicidade","Venc. Padrão","Multa","Robô","Notif.","Ativo",""].map(h=>(
                <th key={h} style={{ padding:"8px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#666",borderBottom:"1px solid #eee" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.length===0 && <tr><td colSpan={9} style={{ padding:24,textAlign:"center",color:"#999",fontSize:13 }}>Nenhuma obrigação.</td></tr>}
            {lista.map((o,i) => (
              <tr key={o.codigo} style={{ background:i%2===0?"#FAFAFA":"#fff",borderBottom:"1px solid #f5f5f5" }}>
                <td style={{ padding:"8px 12px",fontSize:12,fontFamily:"monospace",color:NAVY,fontWeight:700 }}>{o.codigo}</td>
                <td style={{ padding:"8px 12px",fontSize:13,color:"#333" }}>{o.nome}</td>
                <td style={{ padding:"8px 12px" }}><span style={{ background:"#EEF2FF",color:"#3730A3",borderRadius:10,padding:"2px 8px",fontSize:11 }}>{o.periodicidade}</span></td>
                <td style={{ padding:"8px 12px",fontSize:11,color:"#666" }}>{o.dias_entrega?.["Janeiro"]||"Dia 20"}</td>
                <td style={{ padding:"8px 12px",fontSize:12,color:o.passivel_multa==="Sim"?"#e53935":"#999" }}>{o.passivel_multa==="Sim"?"⚠️ Sim":"—"}</td>
                <td style={{ padding:"8px 12px",fontSize:12,color:o.exigir_robo==="Sim"?GOLD:"#999" }}>{o.exigir_robo==="Sim"?"🤖":"—"}</td>
                <td style={{ padding:"8px 12px",fontSize:12 }}>
                  {o.notif_whatsapp && <span title="WhatsApp">💬</span>}
                  {o.notif_email && <span title="E-mail" style={{ marginLeft:2 }}>✉️</span>}
                  {!o.notif_whatsapp&&!o.notif_email && <span style={{ color:"#ccc" }}>—</span>}
                </td>
                <td style={{ padding:"8px 12px" }}>
                  <Toggle value={o.ativo} onChange={()=>toggle(o.codigo)} />
                </td>
                <td style={{ padding:"8px 12px" }}>
                  <div style={{ display:"flex",gap:6 }}>
                    <button onClick={()=>abrir(o)} style={{ background:"none",border:`1px solid ${NAVY}`,color:NAVY,borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11 }}>✏️</button>
                    <button onClick={()=>remover(o.codigo)} style={{ background:"none",border:"1px solid #e53935",color:"#e53935",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11 }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <ModalObrigacao
          obrigacao={editando || obrigacaoPadrao({ regimes_vinculados:[regime] })}
          onSave={salvarObrigacao}
          onClose={() => { setModal(false); setEditando(null); }}
        />
      )}
    </div>
  );
}

// ── TAB USUÁRIOS ──────────────────────────────────────────────────────────────
function TabUsuarios({ departamentos }) {
  const [usuarios, setUsuarios] = useState(() => { try { return JSON.parse(localStorage.getItem("ep_usuarios")||"[]"); } catch { return []; } });
  const [buscaAdmin, setBuscaAdmin] = useState('');
  const [mostrarAdmin, setMostrarAdmin] = useState(false);
  const usuariosAdmin = (()=>{ try{ const u1=JSON.parse(localStorage.getItem('epimentel_usuarios')||'[]'); const ids=new Set(usuarios.map(u=>u.nome)); return u1.filter(u=>!ids.has(u.nome)&&u.ativo!==false); }catch{return []} })();
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome:"",email:"",whatsapp:"",departamento:"",perfil:"operador",ativo:true,senha:"" });

  const salvar = () => {
    const lista = editando ? usuarios.map(u=>u.id===editando.id?{...u,...form}:u) : [...usuarios,{...form,id:Date.now()}];
    setUsuarios(lista); localStorage.setItem("ep_usuarios",JSON.stringify(lista)); setModal(false); setEditando(null);
  };
  const excluir = id => { if(!confirm("Excluir?")) return; const l=usuarios.filter(u=>u.id!==id); setUsuarios(l); localStorage.setItem("ep_usuarios",JSON.stringify(l)); };
  const abrir = (u=null) => { setEditando(u); setForm(u?{nome:u.nome,email:u.email,whatsapp:u.whatsapp||"",departamento:u.departamento||"",perfil:u.perfil||"operador",ativo:u.ativo!==false,senha:""}:{nome:"",email:"",whatsapp:"",departamento:"",perfil:"operador",ativo:true,senha:""}); setModal(true); };

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
        <h3 style={{ color:NAVY,margin:0 }}>Usuários do Sistema</h3>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setMostrarAdmin(v=>!v)} style={{background:mostrarAdmin?'#EBF5FF':'#f5f5f5',color:mostrarAdmin?'#1D6FA4':'#555',border:'1px solid #ddd',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontWeight:600,fontSize:13}}>
            🔍 Importar do Admin{usuariosAdmin.length>0&&<span style={{marginLeft:4,background:'#1D6FA4',color:'#fff',borderRadius:10,fontSize:10,padding:'1px 6px'}}>{usuariosAdmin.length}</span>}
          </button>
          <button onClick={()=>abrir()} style={{ background:NAVY,color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:700,fontSize:13 }}>+ Novo Usuário</button>
        </div>
      </div>
      <div style={{ background:"#fff",borderRadius:10,overflow:"hidden",border:"1px solid #eee" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          {mostrarAdmin&&<div style={{marginBottom:12,padding:14,background:'#EBF5FF',borderRadius:10,border:'1px solid #c7d2fe'}}>
            <div style={{fontWeight:700,color:'#1D6FA4',fontSize:13,marginBottom:8}}>👥 Usuários do Admin para importar:</div>
            <input value={buscaAdmin} onChange={e=>setBuscaAdmin(e.target.value)} placeholder="Buscar..." style={{...inputStyle,marginBottom:8,maxWidth:280}}/>
            {usuariosAdmin.length===0?<div style={{color:'#888',fontSize:13}}>Todos já importados.</div>:
            usuariosAdmin.filter(u=>!buscaAdmin||u.nome.toLowerCase().includes(buscaAdmin.toLowerCase())).slice(0,8).map(u=>(
              <div key={u.id} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 10px',background:'#fff',borderRadius:7,border:'1px solid #ddd',marginBottom:5}}>
                <div style={{width:30,height:30,borderRadius:'50%',background:NAVY,color:GOLD,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>{u.nome[0]}</div>
                <div style={{flex:1}}><div style={{fontWeight:700,color:NAVY,fontSize:12}}>{u.nome}</div><div style={{fontSize:11,color:'#888'}}>{u.email||'—'}</div></div>
                <button onClick={()=>{const n={id:Date.now(),nome:u.nome,email:u.email||'',whatsapp:u.whatsapp||'',departamento:u.departamento||'',perfil:u.perfil==='admin'?'admin':'operador',ativo:true,senha:''};const l=[...usuarios,n];setUsuarios(l);localStorage.setItem('ep_usuarios',JSON.stringify(l));alert('✅ '+u.nome+' importado!');}} style={{padding:'4px 10px',borderRadius:7,background:NAVY,color:'#fff',border:'none',cursor:'pointer',fontSize:11,fontWeight:600}}>Importar</button>
              </div>
            ))}
          </div>}
          <thead><tr style={{ background:NAVY }}>{["Nome","E-mail","WhatsApp","Departamento","Perfil","Status",""].map(h=><th key={h} style={{ color:"#fff",padding:"10px 14px",textAlign:"left",fontSize:12 }}>{h}</th>)}</tr></thead>
          <tbody>
            {usuarios.length===0 && <tr><td colSpan={7} style={{ padding:24,textAlign:"center",color:"#999",fontSize:13 }}>Nenhum usuário.</td></tr>}
            {usuarios.map((u,i)=>(
              <tr key={u.id} style={{ background:i%2===0?"#FAFAFA":"#fff",borderBottom:"1px solid #f0f0f0" }}>
                <td style={{ padding:"10px 14px",fontSize:13,fontWeight:600,color:NAVY }}>{u.nome}</td>
                <td style={{ padding:"10px 14px",fontSize:13,color:"#555" }}>{u.email}</td>
                <td style={{ padding:"10px 14px",fontSize:13,color:"#555" }}>{u.whatsapp}</td>
                <td style={{ padding:"10px 14px" }}>{departamentos.find(d=>d.nome===u.departamento) && <Badge cor={departamentos.find(d=>d.nome===u.departamento).cor} texto={u.departamento} />}</td>
                <td style={{ padding:"10px 14px",fontSize:13,color:"#555",textTransform:"capitalize" }}>{u.perfil}</td>
                <td style={{ padding:"10px 14px" }}><span style={{ background:u.ativo!==false?"#E8F5E9":"#FFEBEE",color:u.ativo!==false?"#2E7D32":"#C62828",padding:"2px 10px",borderRadius:10,fontSize:11,fontWeight:700 }}>{u.ativo!==false?"Ativo":"Inativo"}</span></td>
                <td style={{ padding:"10px 14px" }}><div style={{ display:"flex",gap:8 }}><button onClick={()=>abrir(u)} style={{ background:"none",border:`1px solid ${NAVY}`,color:NAVY,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12 }}>Editar</button><button onClick={()=>excluir(u.id)} style={{ background:"none",border:"1px solid #e53935",color:"#e53935",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12 }}>Excluir</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal titulo={editando?"Editar Usuário":"Novo Usuário"} onClose={()=>setModal(false)}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            <Campo label="Nome *"><input style={inputStyle} value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} /></Campo>
            <Campo label="E-mail *"><input style={inputStyle} type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></Campo>
            <Campo label="WhatsApp"><input style={inputStyle} value={form.whatsapp} onChange={e=>setForm({...form,whatsapp:e.target.value})} /></Campo>
            <Campo label="Departamento"><select style={selectStyle} value={form.departamento} onChange={e=>setForm({...form,departamento:e.target.value})}><option value="">Selecione...</option>{departamentos.map(d=><option key={d.id} value={d.nome}>{d.nome}</option>)}</select></Campo>
            <Campo label="Perfil"><select style={selectStyle} value={form.perfil} onChange={e=>setForm({...form,perfil:e.target.value})}>{["admin","gerente","operador","visualizador"].map(p=><option key={p}>{p}</option>)}</select></Campo>
            <Campo label="Status"><select style={selectStyle} value={form.ativo?"1":"0"} onChange={e=>setForm({...form,ativo:e.target.value==="1"})}><option value="1">Ativo</option><option value="0">Inativo</option></select></Campo>
          </div>
          <Campo label={editando?"Nova Senha (em branco = manter)":"Senha *"}><input style={inputStyle} type="password" value={form.senha} onChange={e=>setForm({...form,senha:e.target.value})} /></Campo>
          <div style={{ display:"flex",gap:12,justifyContent:"flex-end",marginTop:8 }}>
            <button onClick={()=>setModal(false)} style={{ background:"none",border:"1px solid #ddd",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13 }}>Cancelar</button>
            <button onClick={salvar} style={{ background:NAVY,color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontWeight:700,fontSize:13 }}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── TAB DEPARTAMENTOS ─────────────────────────────────────────────────────────
function TabDepartamentos() {
  const carregarDeps = () => {
    try {
      const adminStr = JSON.parse(localStorage.getItem('ep_departamentos_admin')||'null');
      if(adminStr && adminStr.length>0){
        const saved = JSON.parse(localStorage.getItem('ep_departamentos')||'[]');
        const CORES=['#2196F3','#4CAF50','#FF9800','#9C27B0','#E91E63','#2563eb','#16a34a','#db2777'];
        return adminStr.map((nome,i)=>saved.find(d=>d.nome===nome)||{id:i+1,nome,cor:CORES[i%CORES.length],responsavel:''});
      }
      return JSON.parse(localStorage.getItem('ep_departamentos')||'null')||DEPARTAMENTOS_PADRAO;
    } catch{return DEPARTAMENTOS_PADRAO;}
  };
  const [deps, setDeps] = useState(carregarDeps);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome:"",cor:"#1B2A4A",responsavel:"" });

  const salvar = () => {
    const lista = editando ? deps.map(d=>d.id===editando.id?{...d,...form}:d) : [...deps,{...form,id:Date.now()}];
    setDeps(lista);
    localStorage.setItem('ep_departamentos', JSON.stringify(lista));
    localStorage.setItem('ep_departamentos_admin', JSON.stringify(lista.map(d=>d.nome)));
    setModal(false);
  };
  const excluir = id => {
    if(!confirm('Excluir?')) return;
    const l=deps.filter(d=>d.id!==id);
    setDeps(l);
    localStorage.setItem('ep_departamentos',JSON.stringify(l));
    localStorage.setItem('ep_departamentos_admin',JSON.stringify(l.map(d=>d.nome)));
  };
  const abrir = (d=null) => { setEditando(d); setForm(d?{nome:d.nome,cor:d.cor,responsavel:d.responsavel||""}:{nome:"",cor:"#1B2A4A",responsavel:""}); setModal(true); };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div>
          <h3 style={{color:NAVY,margin:0}}>Departamentos</h3>
          {(()=>{try{const a=JSON.parse(localStorage.getItem('ep_departamentos_admin')||'null');return a&&a.length>0&&<div style={{fontSize:11,color:'#2563eb',marginTop:3,fontWeight:600}}>🔗 Sincronizado com Painel Admin ({a.length})</div>;}catch{}return null;})()}
        </div>
        <button onClick={()=>abrir()} style={{background:NAVY,color:'#fff',border:'none',borderRadius:8,padding:'8px 18px',cursor:'pointer',fontWeight:700,fontSize:13}}>+ Novo</button>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14 }}>
        {deps.map(d=>(
          <div key={d.id} style={{ background:"#fff",borderRadius:12,padding:18,border:`2px solid ${d.cor}33`,boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
              <div style={{ width:14,height:14,borderRadius:"50%",background:d.cor }} />
              <span style={{ fontWeight:700,color:NAVY,fontSize:15 }}>{d.nome}</span>
            </div>
            {d.responsavel && <div style={{ fontSize:12,color:"#666",marginBottom:10 }}>👤 {d.responsavel}</div>}
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={()=>abrir(d)} style={{ flex:1,background:"none",border:`1px solid ${NAVY}`,color:NAVY,borderRadius:6,padding:"5px 0",cursor:"pointer",fontSize:12 }}>Editar</button>
              <button onClick={()=>excluir(d.id)} style={{ flex:1,background:"none",border:"1px solid #e53935",color:"#e53935",borderRadius:6,padding:"5px 0",cursor:"pointer",fontSize:12 }}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <Modal titulo={editando?"Editar Departamento":"Novo Departamento"} onClose={()=>setModal(false)} largura={420}>
          <Campo label="Nome *"><input style={inputStyle} value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} /></Campo>
          <Campo label="Responsável"><input style={inputStyle} value={form.responsavel} onChange={e=>setForm({...form,responsavel:e.target.value})} /></Campo>
          <Campo label="Cor"><div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>{COR_OPTIONS.map(c=><div key={c} onClick={()=>setForm({...form,cor:c})} style={{ width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:form.cor===c?"3px solid #333":"3px solid transparent" }} />)}</div></Campo>
          <div style={{ display:"flex",gap:12,justifyContent:"flex-end",marginTop:8 }}>
            <button onClick={()=>setModal(false)} style={{ background:"none",border:"1px solid #ddd",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13 }}>Cancelar</button>
            <button onClick={salvar} style={{ background:NAVY,color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontWeight:700,fontSize:13 }}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── TAB ENVIO ─────────────────────────────────────────────────────────────────
function TabEnvio() {
  const [templates, setTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ep_templates_envio")||"null") || [
      {id:1,tipo:"whatsapp",nome:"Vencimento Próximo (7 dias)",assunto:"",corpo:"Olá {cliente_nome}! 👋\n\nA obrigação *{obrigacao}* vence em *{vencimento}*.\n\nProvidencia os documentos necessários.\n\n_EPimentel Auditoria & Contabilidade_",ativo:true},
      {id:2,tipo:"whatsapp",nome:"Obrigação Entregue",assunto:"",corpo:"Olá {cliente_nome}! ✅\n\n*{obrigacao}* competência *{competencia}* processada e entregue.\n\n_EPimentel Auditoria & Contabilidade_",ativo:true},
      {id:3,tipo:"whatsapp",nome:"⚠️ URGENTE — Vence Hoje",assunto:"",corpo:"⚠️ *URGENTE* — {cliente_nome}\n\n*{obrigacao}* vence *HOJE* ({vencimento}).\n\nContato: (62) 9 9907-2483\n\n_EPimentel Auditoria & Contabilidade_",ativo:true},
      {id:4,tipo:"whatsapp",nome:"Solicitação de Documentos",assunto:"",corpo:"Olá {cliente_nome}! 📋\n\nPara *{obrigacao}* (competência {competencia}), precisamos:\n• Extrato bancário\n• Notas fiscais\n\nPrazo: {vencimento}\n\n_EPimentel Auditoria & Contabilidade_",ativo:true},
      {id:5,tipo:"email",nome:"Envio de Documentos",assunto:"EPimentel | {obrigacao} - {competencia}",corpo:"Prezado(a) {cliente_nome},\n\nEncaminhamos os documentos de {obrigacao}, competência {competencia}.\n\nAtenciosamente,\nEPimentel Auditoria & Contabilidade\n(62) 9 9907-2483",ativo:true},
      {id:6,tipo:"email",nome:"Alerta de Vencimento",assunto:"⚠️ {obrigacao} vence em {vencimento}",corpo:"Prezado(a) {cliente_nome},\n\n{obrigacao} (competência {competencia}) vence em {vencimento}.\n\nProvidencia os documentos para evitar multas.\n\nAtenciosamente,\nEPimentel Auditoria & Contabilidade",ativo:true},
      {id:7,tipo:"email",nome:"Relatório Mensal",assunto:"EPimentel | Resumo — {competencia}",corpo:"Prezado(a) {cliente_nome},\n\nResumo das obrigações de {competencia}:\n{obrigacao}\n\nQualquer dúvida, estamos à disposição.\n\nEPimentel Auditoria & Contabilidade",ativo:true},
    ]; } catch { return []; }
  });
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ tipo:"whatsapp",nome:"",assunto:"",corpo:"",ativo:true });
  const [varHint, setVarHint] = useState(false);

  const salvar = () => {
    const lista = editando ? templates.map(t=>t.id===editando.id?{...t,...form}:t) : [...templates,{...form,id:Date.now()}];
    setTemplates(lista); localStorage.setItem("ep_templates_envio",JSON.stringify(lista)); setModal(false);
  };
  const abrir = (t=null) => { setEditando(t); setForm(t?{tipo:t.tipo,nome:t.nome,assunto:t.assunto||"",corpo:t.corpo,ativo:t.ativo}:{tipo:"whatsapp",nome:"",assunto:"",corpo:"",ativo:true}); setModal(true); };

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
        <h3 style={{ color:NAVY,margin:0 }}>Templates de Envio</h3>
        <button onClick={()=>abrir()} style={{ background:NAVY,color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:700,fontSize:13 }}>+ Novo Template</button>
      </div>
      <div style={{ display:"grid",gap:12 }}>
        {templates.map(t=>(
          <div key={t.id} style={{ background:"#fff",borderRadius:10,padding:16,border:"1px solid #eee",display:"flex",gap:14,alignItems:"flex-start" }}>
            <div style={{ fontSize:22 }}>{t.tipo==="whatsapp"?"💬":"✉️"}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700,color:NAVY,fontSize:14,marginBottom:4 }}>{t.nome}</div>
              <div style={{ fontSize:12,color:"#888",whiteSpace:"pre-line",maxHeight:50,overflow:"hidden" }}>{t.corpo}</div>
            </div>
            <button onClick={()=>abrir(t)} style={{ background:"none",border:`1px solid ${NAVY}`,color:NAVY,borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:12,flexShrink:0 }}>Editar</button>
          </div>
        ))}
      </div>
      {modal && (
        <Modal titulo={editando?"Editar Template":"Novo Template"} onClose={()=>setModal(false)} largura={580}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14 }}>
            <Campo label="Nome *"><input style={inputStyle} value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} /></Campo>
            <Campo label="Canal"><select style={selectStyle} value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}><option value="whatsapp">WhatsApp</option><option value="email">E-mail</option></select></Campo>
          </div>
          {form.tipo==="email" && <Campo label="Assunto"><input style={inputStyle} value={form.assunto} onChange={e=>setForm({...form,assunto:e.target.value})} /></Campo>}
          <Campo label="Corpo">
            <div style={{ marginBottom:6 }}><button onClick={()=>setVarHint(!varHint)} style={{ background:"none",border:"1px solid #ddd",borderRadius:6,padding:"2px 8px",cursor:"pointer",fontSize:11 }}>Variáveis</button></div>
            {varHint && <div style={{ display:"flex",flexWrap:"wrap",gap:5,marginBottom:8 }}>{VARS_DISPONIVEIS.map(v=><span key={v} onClick={()=>setForm(f=>({...f,corpo:f.corpo+v}))} style={{ background:"#EEF2FF",color:"#3730A3",borderRadius:6,padding:"2px 7px",fontSize:11,cursor:"pointer",fontFamily:"monospace" }}>{v}</span>)}</div>}
            <textarea style={{ ...inputStyle,minHeight:100,resize:"vertical",fontFamily:"inherit" }} value={form.corpo} onChange={e=>setForm({...form,corpo:e.target.value})} />
          </Campo>
          <div style={{ display:"flex",gap:12,justifyContent:"flex-end" }}>
            <button onClick={()=>setModal(false)} style={{ background:"none",border:"1px solid #ddd",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13 }}>Cancelar</button>
            <button onClick={salvar} style={{ background:NAVY,color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontWeight:700,fontSize:13 }}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function ConfiguracoesTarefas() {
  const [aba, setAba] = useState("obrigacoes");
  const [departamentos] = useState(() => {
    try {
      const adminStr = JSON.parse(localStorage.getItem('ep_departamentos_admin')||'null');
      if(adminStr&&adminStr.length>0){
        const saved=JSON.parse(localStorage.getItem('ep_departamentos')||'[]');
        const CORES=['#2196F3','#4CAF50','#FF9800','#9C27B0','#E91E63','#2563eb','#16a34a','#db2777'];
        return adminStr.map((nome,i)=>saved.find(d=>d.nome===nome)||{id:i+1,nome,cor:CORES[i%CORES.length],responsavel:''});
      }
      return JSON.parse(localStorage.getItem('ep_departamentos')||'null')||DEPARTAMENTOS_PADRAO;
    }catch{return DEPARTAMENTOS_PADRAO;}
  });

  const ABAS = [
    { id:"obrigacoes", label:"📋 Obrigações por Regime" },
    { id:"usuarios",   label:"👥 Usuários" },
    { id:"deps",       label:"🏢 Departamentos" },
    { id:"envio",      label:"📤 Templates de Envio" },
  ];

  return (
    <div style={{ fontFamily:"Arial, sans-serif",minHeight:"100vh",background:"#F0F2F5" }}>
      <div style={{ background:NAVY,padding:"16px 24px" }}>
        <h2 style={{ color:"#fff",margin:0,fontSize:18 }}>⚙️ Configurações — <span style={{ color:GOLD }}>Tarefas & Processos</span></h2>
      </div>
      <div style={{ background:"#fff",display:"flex",borderBottom:"2px solid #E0E0E0",overflowX:"auto" }}>
        {ABAS.map(a=>(
          <button key={a.id} onClick={()=>setAba(a.id)} style={{ padding:"13px 24px",border:"none",background:"none",cursor:"pointer",whiteSpace:"nowrap",fontWeight:aba===a.id?700:400,color:aba===a.id?NAVY:"#666",fontSize:13,borderBottom:aba===a.id?`3px solid ${GOLD}`:"3px solid transparent" }}>{a.label}</button>
        ))}
      </div>
      <div style={{ padding:24,maxWidth:1200,margin:"0 auto" }}>
        {aba==="obrigacoes" && <TabObrigacoes />}
        {aba==="usuarios"   && <TabUsuarios departamentos={departamentos} />}
        {aba==="deps"       && <TabDepartamentos />}
        {aba==="envio"      && <TabEnvio />}
      </div>
    </div>
  );
}
