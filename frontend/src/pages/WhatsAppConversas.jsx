import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "https://sistema-obrigacoes-production.up.railway.app";
const EVOLUTION_URL = "https://evolution-api-production-1e92.up.railway.app";
const EVOLUTION_KEY = "epimentel-secret";
const INSTANCE = "epimentel";

const NAVY = "#1B2A4A";
const GOLD = "#C5A55A";

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function Avatar({ name, size = 40 }) {
  const initials = name ? name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() : "?";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: NAVY, color: GOLD, display: "flex",
      alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.38, flexShrink: 0
    }}>{initials}</div>
  );
}

export default function WhatsAppConversas() {
  const [tab, setTab] = useState("conversas"); // conversas | qrcode | envio
  const [instancia, setInstancia] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [conversas, setConversas] = useState([]);
  const [convLoading, setConvLoading] = useState(false);
  const [selecionada, setSelecionada] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [envioNumero, setEnvioNumero] = useState("");
  const [envioTexto, setEnvioTexto] = useState("");
  const [feedback, setFeedback] = useState(null);
  const msgFimRef = useRef(null);

  // ── Verifica status da instância
  async function verificarInstancia() {
    try {
      const r = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, {
        headers: { apikey: EVOLUTION_KEY }
      });
      const data = await r.json();
      const inst = Array.isArray(data) ? data.find(i => i.instance?.instanceName === INSTANCE) : null;
      setInstancia(inst?.instance || null);
    } catch {
      setInstancia(null);
    }
  }

  // ── Cria instância se não existir
  async function criarInstancia() {
    try {
      await fetch(`${EVOLUTION_URL}/instance/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
        body: JSON.stringify({ instanceName: INSTANCE, qrcode: true })
      });
      await verificarInstancia();
    } catch (e) {
      console.error(e);
    }
  }

  // ── Busca QR Code
  async function buscarQR() {
    setQrLoading(true);
    setQrCode(null);
    try {
      const r = await fetch(`${EVOLUTION_URL}/instance/connect/${INSTANCE}`, {
        headers: { apikey: EVOLUTION_KEY }
      });
      const data = await r.json();
      setQrCode(data.base64 || data.qrcode?.base64 || null);
    } catch {
      setQrCode(null);
    } finally {
      setQrLoading(false);
    }
  }

  // ── Busca conversas
  async function buscarConversas() {
    setConvLoading(true);
    try {
      const r = await fetch(`${EVOLUTION_URL}/chat/findChats/${INSTANCE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
        body: JSON.stringify({})
      });
      const data = await r.json();
      setConversas(Array.isArray(data) ? data : []);
    } catch {
      setConversas([]);
    } finally {
      setConvLoading(false);
    }
  }

  // ── Busca mensagens de uma conversa
  async function buscarMensagens(remoteJid) {
    setMsgLoading(true);
    setMensagens([]);
    try {
      const r = await fetch(`${EVOLUTION_URL}/chat/findMessages/${INSTANCE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
        body: JSON.stringify({ where: { key: { remoteJid } }, limit: 50 })
      });
      const data = await r.json();
      const msgs = Array.isArray(data?.messages?.records) ? data.messages.records : [];
      setMensagens(msgs.sort((a, b) => a.messageTimestamp - b.messageTimestamp));
    } catch {
      setMensagens([]);
    } finally {
      setMsgLoading(false);
    }
  }

  // ── Envia mensagem na conversa aberta
  async function enviarMensagem() {
    if (!texto.trim() || !selecionada) return;
    setEnviando(true);
    try {
      await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
        body: JSON.stringify({ number: selecionada.id, text: texto })
      });
      setTexto("");
      await buscarMensagens(selecionada.id);
    } finally {
      setEnviando(false);
    }
  }

  // ── Envio avulso
  async function enviarAvulso() {
    if (!envioNumero.trim() || !envioTexto.trim()) return;
    setEnviando(true);
    setFeedback(null);
    try {
      const numero = envioNumero.replace(/\D/g, "") + "@s.whatsapp.net";
      const r = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
        body: JSON.stringify({ number: numero, text: envioTexto })
      });
      if (r.ok) {
        setFeedback({ tipo: "ok", msg: "Mensagem enviada com sucesso!" });
        setEnvioTexto("");
      } else {
        setFeedback({ tipo: "erro", msg: "Erro ao enviar. Verifique o número." });
      }
    } catch {
      setFeedback({ tipo: "erro", msg: "Falha de conexão com a Evolution API." });
    } finally {
      setEnviando(false);
    }
  }

  useEffect(() => { verificarInstancia(); }, []);

  useEffect(() => {
    if (tab === "conversas") buscarConversas();
    if (tab === "qrcode") buscarQR();
  }, [tab]);

  useEffect(() => {
    if (selecionada) buscarMensagens(selecionada.id);
  }, [selecionada]);

  useEffect(() => {
    msgFimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const conectado = instancia?.connectionStatus === "open";

  // ────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "Arial, sans-serif", height: "100vh", display: "flex", flexDirection: "column", background: "#F0F2F5" }}>

      {/* Header */}
      <div style={{ background: NAVY, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>💬</span>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>WhatsApp</span>
          <span style={{ color: GOLD, fontWeight: 700, fontSize: 18 }}>EPimentel</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: conectado ? "#4CAF50" : "#F44336"
          }} />
          <span style={{ color: "#ccc", fontSize: 13 }}>
            {conectado ? "Conectado" : "Desconectado"}
          </span>
          {!conectado && (
            <button onClick={async () => { await criarInstancia(); setTab("qrcode"); }}
              style={{ marginLeft: 8, background: GOLD, color: NAVY, border: "none", borderRadius: 6, padding: "5px 12px", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
              Conectar
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#fff", display: "flex", borderBottom: "2px solid #E0E0E0" }}>
        {[
          { id: "conversas", label: "💬 Conversas" },
          { id: "qrcode", label: "📱 QR Code" },
          { id: "envio", label: "✉️ Enviar Mensagem" }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "12px 24px", border: "none", background: "none", cursor: "pointer",
            fontWeight: tab === t.id ? 700 : 400,
            color: tab === t.id ? NAVY : "#666",
            borderBottom: tab === t.id ? `3px solid ${GOLD}` : "3px solid transparent",
            fontSize: 14
          }}>{t.label}</button>
        ))}
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>

        {/* ── ABA CONVERSAS ── */}
        {tab === "conversas" && (
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            {/* Lista */}
            <div style={{ width: 320, background: "#fff", borderRight: "1px solid #E0E0E0", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #E0E0E0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: NAVY }}>Conversas</span>
                <button onClick={buscarConversas} style={{ background: "none", border: "none", cursor: "pointer", color: GOLD, fontSize: 18 }}>↻</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {convLoading && <div style={{ padding: 20, textAlign: "center", color: "#999" }}>Carregando...</div>}
                {!convLoading && conversas.length === 0 && (
                  <div style={{ padding: 20, textAlign: "center", color: "#999", fontSize: 13 }}>
                    {conectado ? "Nenhuma conversa encontrada." : "Conecte o WhatsApp primeiro."}
                  </div>
                )}
                {conversas.map(c => (
                  <div key={c.id} onClick={() => setSelecionada(c)}
                    style={{
                      padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
                      cursor: "pointer", borderBottom: "1px solid #F0F0F0",
                      background: selecionada?.id === c.id ? "#EEF2FF" : "transparent"
                    }}>
                    <Avatar name={c.pushName || c.id} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 600, color: NAVY, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.pushName || c.id?.split("@")[0]}
                        </span>
                        <span style={{ fontSize: 11, color: "#999", flexShrink: 0 }}>{formatTime(c.updatedAt)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.lastMessage?.message?.conversation || ""}
                      </div>
                    </div>
                    {c.unreadCount > 0 && (
                      <div style={{ background: "#25D366", color: "#fff", borderRadius: 10, padding: "2px 7px", fontSize: 11, fontWeight: 700 }}>
                        {c.unreadCount}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {!selecionada ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48 }}>💬</div>
                    <div style={{ marginTop: 8 }}>Selecione uma conversa</div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header chat */}
                  <div style={{ background: "#fff", padding: "12px 20px", borderBottom: "1px solid #E0E0E0", display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar name={selecionada.pushName || selecionada.id} />
                    <div>
                      <div style={{ fontWeight: 700, color: NAVY }}>{selecionada.pushName || selecionada.id?.split("@")[0]}</div>
                      <div style={{ fontSize: 12, color: "#888" }}>{selecionada.id?.split("@")[0]}</div>
                    </div>
                  </div>
                  {/* Mensagens */}
                  <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 6, background: "#E5DDD5" }}>
                    {msgLoading && <div style={{ textAlign: "center", color: "#999" }}>Carregando mensagens...</div>}
                    {mensagens.map((m, i) => {
                      const minha = m.key?.fromMe;
                      const texto = m.message?.conversation || m.message?.extendedTextMessage?.text || "[mídia]";
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: minha ? "flex-end" : "flex-start" }}>
                          <div style={{
                            maxWidth: "70%", padding: "8px 12px", borderRadius: minha ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
                            background: minha ? "#DCF8C6" : "#fff",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.1)", fontSize: 14
                          }}>
                            <div>{texto}</div>
                            <div style={{ fontSize: 10, color: "#999", textAlign: "right", marginTop: 2 }}>
                              {formatTime(m.messageTimestamp)} {minha && "✓✓"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={msgFimRef} />
                  </div>
                  {/* Input */}
                  <div style={{ background: "#F0F2F5", padding: "10px 16px", display: "flex", gap: 8, alignItems: "center" }}>
                    <input value={texto} onChange={e => setTexto(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && enviarMensagem()}
                      placeholder="Digite uma mensagem..."
                      style={{ flex: 1, padding: "10px 14px", borderRadius: 20, border: "1px solid #E0E0E0", fontSize: 14, outline: "none" }} />
                    <button onClick={enviarMensagem} disabled={enviando || !texto.trim()}
                      style={{
                        background: NAVY, color: "#fff", border: "none", borderRadius: "50%",
                        width: 42, height: 42, cursor: "pointer", fontSize: 18,
                        opacity: (!texto.trim() || enviando) ? 0.5 : 1
                      }}>➤</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── ABA QR CODE ── */}
        {tab === "qrcode" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 40, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", textAlign: "center", maxWidth: 400 }}>
              <div style={{ fontSize: 40 }}>📱</div>
              <h2 style={{ color: NAVY, margin: "12px 0 4px" }}>Conectar WhatsApp</h2>
              <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>
                Abra o WhatsApp no celular → Menu → Dispositivos conectados → Conectar dispositivo
              </p>
              {conectado ? (
                <div style={{ background: "#E8F5E9", borderRadius: 10, padding: 20 }}>
                  <div style={{ fontSize: 32 }}>✅</div>
                  <div style={{ color: "#2E7D32", fontWeight: 700, marginTop: 8 }}>WhatsApp Conectado!</div>
                  <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>Instância: {INSTANCE}</div>
                </div>
              ) : qrLoading ? (
                <div style={{ color: "#999", padding: 20 }}>Gerando QR Code...</div>
              ) : qrCode ? (
                <div>
                  <img src={qrCode} alt="QR Code WhatsApp" style={{ width: 250, height: 250, border: "4px solid " + NAVY, borderRadius: 12 }} />
                  <div style={{ marginTop: 12, fontSize: 12, color: "#999" }}>QR Code expira em 60 segundos</div>
                  <button onClick={buscarQR} style={{
                    marginTop: 12, background: NAVY, color: "#fff", border: "none",
                    borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontWeight: 700
                  }}>🔄 Atualizar QR Code</button>
                </div>
              ) : (
                <button onClick={buscarQR} style={{
                  background: NAVY, color: "#fff", border: "none",
                  borderRadius: 10, padding: "12px 28px", cursor: "pointer", fontWeight: 700, fontSize: 15
                }}>📱 Gerar QR Code</button>
              )}
              <button onClick={verificarInstancia} style={{
                marginTop: 16, background: "none", border: "1px solid " + NAVY,
                color: NAVY, borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 13
              }}>🔍 Verificar Status</button>
            </div>
          </div>
        )}

        {/* ── ABA ENVIO AVULSO ── */}
        {tab === "envio" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 40, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", width: "100%", maxWidth: 500 }}>
              <h2 style={{ color: NAVY, margin: "0 0 24px", display: "flex", alignItems: "center", gap: 8 }}>
                ✉️ Enviar Mensagem
              </h2>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontWeight: 700, color: NAVY, marginBottom: 6, fontSize: 14 }}>
                  Número WhatsApp
                </label>
                <input value={envioNumero} onChange={e => setEnvioNumero(e.target.value)}
                  placeholder="Ex: 62999887766 (com DDD, sem +55)"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #E0E0E0", fontSize: 14, boxSizing: "border-box" }} />
                <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>Informe o número com DDD, sem espaços ou caracteres especiais.</div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontWeight: 700, color: NAVY, marginBottom: 6, fontSize: 14 }}>
                  Mensagem
                </label>
                <textarea value={envioTexto} onChange={e => setEnvioTexto(e.target.value)}
                  placeholder="Digite a mensagem..."
                  rows={5}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #E0E0E0", fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "Arial" }} />
              </div>
              {feedback && (
                <div style={{
                  padding: "10px 16px", borderRadius: 8, marginBottom: 16,
                  background: feedback.tipo === "ok" ? "#E8F5E9" : "#FFEBEE",
                  color: feedback.tipo === "ok" ? "#2E7D32" : "#C62828",
                  fontWeight: 600, fontSize: 14
                }}>{feedback.msg}</div>
              )}
              <button onClick={enviarAvulso} disabled={enviando || !envioNumero.trim() || !envioTexto.trim()}
                style={{
                  width: "100%", padding: "12px", background: NAVY, color: "#fff",
                  border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15,
                  cursor: "pointer", opacity: (enviando || !envioNumero.trim() || !envioTexto.trim()) ? 0.5 : 1
                }}>
                {enviando ? "Enviando..." : "📤 Enviar Mensagem"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
