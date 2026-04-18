import React, { useState } from 'react'
import { epSet, epGet } from '../utils/storage'

export const TEMA_PADRAO = {
  navy: '#1F4A33', gold: '#C5A55A',
  fonte: 'Inter, system-ui, sans-serif',
  radius: '8',
}

export function aplicarTema(tema) {
  const t = Object.assign({}, TEMA_PADRAO, tema)
  const root = document.documentElement
  root.style.setProperty('--ep-navy', t.navy)
  root.style.setProperty('--ep-gold', t.gold)
  let style = document.getElementById('ep-tema-style')
  if (!style) {
    style = document.createElement('style')
    style.id = 'ep-tema-style'
    document.head.appendChild(style)
  }
  style.textContent = '* { font-family: ' + t.fonte + ' !important; }'
}

export function carregarTema() {
  try {
    const saved = epGet('ep_tema', null)
    aplicarTema(saved || TEMA_PADRAO)
    return saved || TEMA_PADRAO
  } catch { return TEMA_PADRAO }
}

const FONTES = [
  { label: 'Inter (padrão)', value: 'Inter, system-ui, sans-serif' },
  { label: 'Roboto',         value: 'Roboto, sans-serif' },
  { label: 'Open Sans',      value: 'Open Sans, sans-serif' },
  { label: 'Poppins',        value: 'Poppins, sans-serif' },
  { label: 'Nunito',         value: 'Nunito, sans-serif' },
  { label: 'Montserrat',     value: 'Montserrat, sans-serif' },
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
  const [tema, setTema] = useState(function() {
    return Object.assign({}, TEMA_PADRAO, epGet('ep_tema', TEMA_PADRAO))
  })
  const [salvo, setSalvo] = useState(false)

  function upd(k, v) {
    const novo = Object.assign({}, tema, { [k]: v })
    setTema(novo)
    aplicarTema(novo)
  }

  async function salvar() {
    await epSet('ep_tema', tema)
    setSalvo(true)
    setTimeout(function() { setSalvo(false) }, 2000)
  }

  async function resetar() {
    setTema(TEMA_PADRAO)
    aplicarTema(TEMA_PADRAO)
    await epSet('ep_tema', TEMA_PADRAO)
    setSalvo(true)
    setTimeout(function() { setSalvo(false) }, 2000)
  }

  const N = tema.navy
  const G = tema.gold
  const inp = { padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, width: '100%', boxSizing: 'border-box' }

  return (
    <div style={{ padding: 20, maxWidth: 640 }}>
      <div style={{ fontWeight: 700, color: N, fontSize: 15, marginBottom: 4 }}>🎨 Personalização — Cores e Tipografia</div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>Mude cores e fontes em tempo real. Salve para persistir.</div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>Paletas Prontas</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PALETAS.map(function(p) {
            const ativo = tema.navy === p.navy
            return (
              <button key={p.label}
                onClick={function() { upd('navy', p.navy); setTimeout(function() { upd('gold', p.gold) }, 10) }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
                  border: ativo ? '2px solid ' + p.navy : '1px solid #ddd',
                  background: ativo ? p.navy + '15' : '#fff', cursor: 'pointer', fontSize: 12 }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: p.navy }} />
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: p.gold }} />
                </div>
                <span>{p.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>Cor Principal</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <input type="color" value={tema.navy} onChange={function(e) { upd('navy', e.target.value) }}
              style={{ width: 48, height: 40, borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer', padding: 2 }} />
            <input value={tema.navy} onChange={function(e) { upd('navy', e.target.value) }} style={inp} />
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 8, background: N, color: '#fff', fontSize: 12, fontWeight: 700 }}>
            Preview menu lateral
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>Cor de Destaque</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <input type="color" value={tema.gold} onChange={function(e) { upd('gold', e.target.value) }}
              style={{ width: 48, height: 40, borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer', padding: 2 }} />
            <input value={tema.gold} onChange={function(e) { upd('gold', e.target.value) }} style={inp} />
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 8, background: G, color: '#fff', fontSize: 12, fontWeight: 700 }}>
            Preview destaques
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>Tipografia</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {FONTES.map(function(f) {
            const ativo = tema.fonte === f.value
            return (
              <button key={f.value} onClick={function() { upd('fonte', f.value) }}
                style={{ padding: '6px 14px', borderRadius: 8, fontFamily: f.value, fontSize: 13, cursor: 'pointer',
                  border: ativo ? '2px solid ' + N : '1px solid #ddd',
                  background: ativo ? N + '15' : '#fff', color: ativo ? N : '#555',
                  fontWeight: ativo ? 700 : 400 }}>
                {f.label}
              </button>
            )
          })}
        </div>
        <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e8e8e8', fontFamily: tema.fonte, fontSize: 14, color: N }}>
          Visualização: <b>EPimentel Auditoria</b> — Gestão fiscal e tributária.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={salvar}
          style={{ padding: '9px 22px', borderRadius: 8, background: N, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          {salvo ? '✅ Salvo!' : '💾 Salvar Tema'}
        </button>
        <button onClick={resetar}
          style={{ padding: '9px 18px', borderRadius: 8, background: '#f5f5f5', color: '#555', fontWeight: 600, fontSize: 13, border: '1px solid #ddd', cursor: 'pointer' }}>
          ↺ Restaurar Padrão
        </button>
      </div>
    </div>
  )
}
