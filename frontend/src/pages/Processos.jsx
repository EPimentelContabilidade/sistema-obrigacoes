// ══════════════════════════════════════════════════════════════════════════════
// PATCH Clientes.jsx — Integração com ConfiguracoesTarefas (catálogo v2)
// Aplicar as 3 alterações abaixo no Clientes.jsx existente
// ══════════════════════════════════════════════════════════════════════════════

// ── ALTERAÇÃO 1 ───────────────────────────────────────────────────────────────
// Adicionar APÓS a linha: import { TRIBUTACOES, obrigacoesPorTributacao } from './obrigacoesData'
// ─────────────────────────────────────────────────────────────────────────────

// Lê obrigações do catálogo ConfiguracoesTarefas para o regime selecionado
function obrigsCatalogo(regime) {
  try {
    const mapa = {
      'Simples Nacional': 'Simples Nacional',
      'MEI': 'MEI',
      'Lucro Presumido': 'Lucro Presumido',
      'Lucro Real': 'Lucro Real',
      'RET': 'RET/Imobiliário',
      'Imune/Isento': 'Simples Nacional',
    };
    const chave = mapa[regime] || regime;
    const cat = JSON.parse(localStorage.getItem('ep_obrigacoes_catalogo_v2') || 'null');
    if (!cat) return [];
    return (cat[chave] || []).filter(o => o.ativo);
  } catch { return []; }
}


// ── ALTERAÇÃO 2 ───────────────────────────────────────────────────────────────
// Substituir a função onTributacaoChange existente pela versão abaixo
// (adiciona geração do catálogo v2 junto com o sistema antigo)
// ─────────────────────────────────────────────────────────────────────────────

const onTributacaoChange = (novoRegime) => {
  setF('tributacao', novoRegime);
  setF('regime', novoRegime);
  // Sistema antigo (IDs numéricos)
  const obrigEspecificas = REGIME_OBRIG_AUTO[novoRegime] || [];
  const todas = [...new Set([...OBRIGAS_COMUNS, ...obrigEspecificas])];
  setObrigSugeridas(todas);
  setF('obrigacoes_vinculadas', todas);
  setConfirmObrig(true);
  // Novo catálogo (ConfiguracoesTarefas)
  const catalogoV2 = obrigsCatalogo(novoRegime);
  setF('obrigacoes_catalogo', catalogoV2);
};


// ── ALTERAÇÃO 3 ───────────────────────────────────────────────────────────────
// Adicionar DENTRO da aba 'dados', logo APÓS o bloco {confirmObrig && (...)}
// (exibe as obrigações do catálogo ConfiguracoesTarefas)
// ─────────────────────────────────────────────────────────────────────────────

{form.tributacao && (form.obrigacoes_catalogo || obrigsCatalogo(form.tributacao)).length > 0 && (
  <div style={{ marginBottom: 14, padding: '12px 16px', borderRadius: 10, border: '1px solid #C5A55A33', background: '#FFFBF0' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>📋</span>
        <span style={{ fontWeight: 700, color: '#1B2A4A', fontSize: 13 }}>
          Obrigações do Catálogo (Config. Tarefas)
        </span>
        <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 10, background: '#1B2A4A', color: '#fff', fontWeight: 700 }}>
          {(form.obrigacoes_catalogo || obrigsCatalogo(form.tributacao)).length} ativas
        </span>
      </div>
      <button
        onClick={() => {
          const lista = form.obrigacoes_catalogo || obrigsCatalogo(form.tributacao);
          setF('obrigacoes_catalogo', lista);
          // Salva no cliente se estiver editando
          if (editId) {
            const local = JSON.parse(localStorage.getItem('ep_clientes') || '[]');
            const updated = local.map(c =>
              String(c.id) === String(editId) ? { ...c, obrigacoes_catalogo: lista, tributacao: form.tributacao } : c
            );
            localStorage.setItem('ep_clientes', JSON.stringify(updated));
            setClientes(updated);
          }
        }}
        style={{ fontSize: 11, padding: '4px 12px', borderRadius: 7, background: '#1B2A4A', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}
      >
        ✅ Vincular ao Cliente
      </button>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {(form.obrigacoes_catalogo || obrigsCatalogo(form.tributacao)).map(o => (
        <span key={o.codigo} style={{
          fontSize: 11, padding: '3px 9px', borderRadius: 8,
          background: o.passivel_multa === 'Sim' ? '#FEF2F2' : '#F0F4FF',
          color: o.passivel_multa === 'Sim' ? '#DC2626' : '#1B2A4A',
          border: `1px solid ${o.passivel_multa === 'Sim' ? '#FCA5A5' : '#C7D7FD'}`,
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4
        }}>
          {o.passivel_multa === 'Sim' && '⚠️'}
          {o.exigir_robo === 'Sim' && '🤖'}
          {o.notif_whatsapp && '💬'}
          {o.codigo}
          <span style={{ fontWeight: 400, color: '#888' }}>· {o.periodicidade}</span>
        </span>
      ))}
    </div>
    <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
      💡 Configure detalhes (dias de entrega, notificações, robô) em <b>Config. Tarefas → Obrigações por Regime</b>
    </div>
  </div>
)}


// ── ALTERAÇÃO 4 (FORM_VAZIO) ──────────────────────────────────────────────────
// Adicionar campo obrigacoes_catalogo ao FORM_VAZIO:
// obrigacoes_catalogo: [],
// ─────────────────────────────────────────────────────────────────────────────

// ── ALTERAÇÃO 5 (salvar) ──────────────────────────────────────────────────────
// No objeto novoCliente dentro da função salvar(), adicionar:
// obrigacoes_catalogo: form.obrigacoes_catalogo || [],
// ─────────────────────────────────────────────────────────────────────────────
