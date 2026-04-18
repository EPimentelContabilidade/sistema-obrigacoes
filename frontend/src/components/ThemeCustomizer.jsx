import React, { useState, useEffect } from 'react'
import { epSet, epGet } from '../utils/storage'

// Tema padrão EPimentel
export const TEMA_PADRAO = {
  navy:   '#1F4A33',
  gold:   '#C5A55A',
  fonte:  'Inter, system-ui, sans-serif',
  sidebar_bg: '#1B2A38',
  header_bg: '#1F4A33',
  radius: '8',
}

// Aplicar tema nas CSS variables do documento
export function aplicarTema(tema = TEMA_PADRAO) {
  const t = { ...TEMA_PADRAO, ...tema }
  const root = document.documentElement
  root.style.setProperty('--ep-navy',      t.navy)
  root.style.setProperty('--ep-gold',      t.gold)
  root.style.setProperty('--ep-font',      t.fonte)
  root.style.setProperty('--ep-sidebar-bg',t.sidebar_bg)
  root.style.setProperty('--ep-header-bg', t.header_bg)
  root.style.setProperty('--ep-radius',    t.radius + 'px')
  // Injetar estilo global
  let style = document.getElementById('ep-tema-style')
  if (!style) { style = document.createElement('style'); style.id = 'ep-tema-style'; document.head.appendChild(style) }
  style.textContent = `
    * { font-family: ${t.fonte} !important; }
    :root {
      --ep-navy: ${t.navy};
      --ep-gold: ${t.gold};
      --ep-radius: ${t.radius}px;
    }
  `
}

// Carregar e aplicar tema salvo
export function carregarTema() {
  try {
    const saved = epGet('ep_tema', null)
    if (saved) aplicarTema(saved)
    else aplicarTema(TEMA_PADRAO)
    return saved || TEMA_PADRAO
  } catch { return TEMA_PADRAO }
}

const FONTES = [
  { label: 'Inter (padrão)',  value: 'Inter, system-ui, sans-serif' },
  { label: 'Roboto',          value: 'Roboto, sans-serif' },
  { label: 'Open Sans',       value: '"Open Sans", sans-serif' },
  { label: 'Poppins',         value: 'Poppins, sans-serif' },
  { label: 'Nunito',          value: 'Nunito, sans-serif' },
  { label: 'Montserrat',      value: 'Montserrat, sans-serif' },
  { label: 'Source Sans 3',   value: '"Source Sans 3", sans-serif' },
  { label: 'DM Sans',         value: '"DM Sans", sans-serif' },
]

const PALETAS = [
  { label: 'EPimentel (padrão)', navy: '#1F4A33', gold: '#C5A55A' },
  { label: 'Azul Corporativo',   navy: '#1D3461', gold: '#F5A623' },
  { label: 'Roxo Moderno',       navy: '#4A1FA8', gold: '#FFB800' },
  { label: 'Vermelho Elegante',  navy: '#7B1E1E', gold: '#D4A853' },
  { label: 'Azul Royal',         navy: '#1A237E', gold: '#FFD54F' },
  { label: 'Verde Escuro',       navy: '#1B5E20', gold: '#F9A825' },
  { label: 'Cinza Profissional', navy: '#37474F', gold: '#FFA726' },
  { label: 'Marinho Clássico',   navy: '#0D2137', gold: '#E8B84B' },
]

export default function ThemeCustomizer() {
  const [tema, setTema] = useState(() => ({ ...TEMA_PADRAO, ...epGet('ep_tema', TEMA_PADRAO) }))
  const [salvo, setSalvo] = useState(false)

  const upd = (k, v) => {
    const novo = { ...tema, [k]: v }
    setTema(novo)
    aplicarTema(novo)
  }

  const salvar = async () => {
    await epSet('ep_tema', tema)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
  }

  const resetar = async () => {
    setTema(TEMA_PADRAO)
    aplicarTema(TEMA_PADRAO)
    await epSet('ep_tema', TEMA_PADRAO)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
  }

  const NAVY = tema.navy
  const GOLD = tema.gold

  return (
    <div style={{ padding: 20, maxWidth: 640 }}>
      <div style={{ fontWeight: 700, color: NAVY, fontSize: 15, marginBottom: 4 }}>🎨 Personalização — Cores e Tipografia</div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>Altere as cores e fontes do sistema. As mudanças são aplicadas em tempo real.</div>

      {/* Paletas rápidas */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>Paletas Prontas</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PALETAS.map(p => (
            <button key={p.label} onClick={() => { upd('navy', p.navy); setTimeout(() => upd('gold', p.gold), 10) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
                border: tema.navy === p.navy ? '2px solid #333' : '1px solid #ddd',
                background: '#fff', cursor: 'pointer', fontSize: 12 }}>
              <div style={{ display: 'flex', gap: 2 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: p.navy }} />
                <div style={{ width: 14, height: 14, borderRadius: 3, background: p.gold }} />
              </div>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cores personalizadas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>Cor Principal</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={tema.navy} onChange={e => upd('navy', e.target.value)}
              style={{ width: 48, height: 40, borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer', padding: 2 }} />
            <input value={tema.navy} onChange={e => upd('navy', e.target.value)}
              style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontFamily: 'monospace', fontSize: 13 }} />
          </div>
          <div style={{ marginTop: 6, padding: '10px 14px', borderRadius: 8, background: tema.navy, color: '#fff', fontSize: 12, fontWeight: 700 }}>
            Preview do menu lateral
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>Cor de Destaque (Dourado)</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={tema.gold} onChange={e => upd('gold', e.target.value)}
              style={{ width: 48, height: 40, borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer', padding: 2 }} />
            <input value={tema.gold} onChange={e => upd('gold', e.target.value)}
              style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontFamily: 'monospace', fontSize: 13 }} />
          </div>
          <div style={{ marginTop: 6, padding: '10px 14px', borderRadius: 8, background: tema.gold, color: '#fff', fontSize: 12, fontWeight: 700 }}>
            Preview dos destaques
          </div>
        </div>
      </div>

      {/* Fonte */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>Tipografia</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FONTES.map(f => (
            <button key={f.value} onClick={() => upd('fonte', f.value)}
              style={{ padding: '6px 14px', borderRadius: 8, border: tema.fonte === f.value ? `2px solid ${NAVY}` : '1px solid #ddd',
                background: tema.fonte === f.value ? NAVY + '15' : '#fff', color: tema.fonte === f.value ? NAVY : '#555',
                fontFamily: f.value, fontSize: 13, cursor: 'pointer', fontWeight: tema.fonte === f.value ? 700 : 400 }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, border: '1px solid #e8e8e8', fontFamily: tema.fonte, fontSize: 14, color: NAVY }}>
          Visualização: <b>EPimentel Auditoria & Contabilidade</b> — Obrigações acessórias, gestão fiscal e tributária.
        </div>
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={salvar} style={{ padding: '9px 22px', borderRadius: 8, background: NAVY, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          {salvo ? '✅ Salvo!' : '💾 Salvar Tema'}
        </button>
        <button onClick={resetar} style={{ padding: '9px 18px', borderRadius: 8, background: '#f5f5f5', color: '#555', fontWeight: 600, fontSize: 13, border: '1px solid #ddd', cursor: 'pointer' }}>
          ↺ Restaurar Padrão
        </button>
      </div>
    </div>
  )
}
