import React, { useState } from 'react'
import { epSet, epGet } from '../utils/storage'

export const TEMA_PADRAO = {
  navy: '#1F4A33', gold: '#C5A55A',
  fonte: 'Inter, system-ui, sans-serif',
  negrito: '400', radius: '8',
}

export function aplicarTema(tema) {
  const t = Object.assign({}, TEMA_PADRAO, tema)
  let style = document.getElementById('ep-tema-style')
  if (!style) {
    style = document.createElement('style')
    style.id = 'ep-tema-style'
    document.head.appendChild(style)
  }
  const fontWeight = t.negrito || '400'
  style.textContent = [
    '* { font-family: ' + t.fonte + ' !important; }',
    'body, p, span, div, td, th, label, input, button, select, textarea { font-weight: ' + fontWeight + '; }',
    'b, strong, h1, h2, h3, h4, h5, h6, [style*="font-weight: 700"], [style*="fontWeight:700"] { font-weight: ' + (fontWeight === '700' ? '800' : '700') + ' !important; }',
    ':root { --ep-navy: ' + t.navy + '; --ep-gold: ' + t.gold + '; }',
  ].join(' ')
}

export function carregarTema() {
  try {
    const saved = epGet('ep_tema', null)
    aplicarTema(saved || TEMA_PADRAO)
    return saved || TEMA_PADRAO
  } catch(e) { return TEMA_PADRAO }
}

const PALETAS = [
  { label: 'EPimentel',      navy: '#1F4A33', gold: '#C5A55A' },
  { label: 'Azul Corporativo', navy: '#1D3461', gold: '#F5A623' },
  { label: 'Roxo Moderno',   navy: '#4A1FA8', gold: '#FFB800' },
  { label: 'Vermelho',       navy: '#7B1E1E', gold: '#D4A853' },
  { label: 'Azul Royal',     navy: '#1A237E', gold: '#FFD54F' },
  { label: 'Verde Escuro',   navy: '#1B5E20', gold: '#F9A825' },
  { label: 'Cinza Pro',      navy: '#37474F', gold: '#FFA726' },
  { label: 'Marinho',        navy: '#0D2137', gold: '#E8B84B' },
  { label: 'Teal Moderno',   navy: '#00695C', gold: '#FFD740' },
  { label: 'Índigo',         navy: '#283593', gold: '#FF8F00' },
  { label: 'Café Elegante',  navy: '#4E342E', gold: '#BCAAA4' },
  { label: 'Grafite',        navy: '#212121', gold: '#FDD835' },
  { label: 'Bordo',          navy: '#880E4F', gold: '#F8BBD0' },
  { label: 'Petróleo',       navy: '#006064', gold: '#F4D03F' },
  { label: 'Laranja Corp',   navy: '#BF360C', gold: '#FFE082' },
  { label: 'Azul Petróleo',  navy: '#01579B', gold: '#B3E5FC' },
]

const FONTES = [
  { label: 'Inter',          value: 'Inter, system-ui, sans-serif' },
  { label: 'Roboto',         value: 'Roboto, sans-serif' },
  { label: 'Open Sans',      value: 'Open Sans, sans-serif' },
  { label: 'Poppins',        value: 'Poppins, sans-serif' },
  { label: 'Nunito',         value: 'Nunito, sans-serif' },
  { label: 'Montserrat',     value: 'Montserrat, sans-serif' },
  { label: 'Lato',           value: 'Lato, sans-serif' },
  { label: 'Raleway',        value: 'Raleway, sans-serif' },
  { label: 'Source Sans',    value: 'Source Sans 3, sans-serif' },
  { label: 'DM Sans',        value: 'DM Sans, sans-serif' },
  { label: 'Figtree',        value: 'Figtree, sans-serif' },
  { label: 'Plus Jakarta',   value: 'Plus Jakarta Sans, sans-serif' },
]

const PESOS = [
  { label: 'Fino (300)',     value: '300' },
  { label: 'Normal (400)',   value: '400' },
  { label: 'Médio (500)',    value: '500' },
  { label: 'Semi-negrito (600)', value: '600' },
  { label: 'Negrito (700)',  value: '700' },
]

export default function ThemeCustomizer() {
  const init = Object.assign({}, TEMA_PADRAO, epGet('ep_tema', TEMA_PADRAO))
  const [tema, setTema] = useState(init)
  const [salvo, setSalvo] = useState(false)

  function updTema(updates) {
    const novo = Object.assign({}, tema, updates)
    setTema(novo)
    aplicarTema(novo)
  }

  function selecionarPaleta(p) {
    updTema({ navy: p.navy, gold: p.gold })
  }

  async function salvar() {
    await epSet('ep_tema', tema)
    setSalvo(true)
    setTimeout(function() { setSalvo(false) }, 2500)
  }

  async function resetar() {
    setTema(TEMA_PADRAO)
    aplicarTema(TEMA_PADRAO)
    await epSet('ep_tema', TEMA_PADRAO)
    setSalvo(true)
    setTimeout(function() { setSalvo(false) }, 2500)
  }

  const N = tema.navy
  const G = tema.gold
  const sec = { fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }
  const card = { background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }

  return (
    <div style={{ padding: 20, maxWidth: 700 }}>
      <div style={{ fontWeight: 800, color: N, fontSize: 16, marginBottom: 4 }}>🎨 Personalização — Cores e Tipografia</div>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 20 }}>Alterações aplicadas em tempo real. Clique em Salvar para persistir.</div>

      <div style={card}>
        <div style={sec}>Paletas Prontas</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PALETAS.map(function(p) {
            const ativo = tema.navy === p.navy && tema.gold === p.gold
            return React.createElement('button', {
              key: p.label,
              onClick: function() { selecionarPaleta(p) },
              style: {
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 11px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                border: ativo ? '2px solid ' + p.navy : '1px solid #ddd',
                background: ativo ? p.navy + '18' : '#fafafa',
                fontWeight: ativo ? 700 : 400,
                color: ativo ? p.navy : '#444',
              }
            },
              React.createElement('span', { style: { display: 'flex', gap: 2 } },
                React.createElement('span', { style: { width: 13, height: 13, borderRadius: 3, background: p.navy, display: 'inline-block' } }),
                React.createElement('span', { style: { width: 13, height: 13, borderRadius: 3, background: p.gold, display: 'inline-block' } })
              ),
              p.label
            )
          })}
        </div>
      </div>

      <div style={card}>
        <div style={sec}>Cores Personalizadas</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: '#777', marginBottom: 6 }}>Cor Principal (menu/botões)</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input type="color" value={tema.navy}
                onChange={function(e) { updTema({ navy: e.target.value }) }}
                style={{ width: 44, height: 38, borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer', padding: 2 }} />
              <input value={tema.navy}
                onChange={function(e) { updTema({ navy: e.target.value }) }}
                style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #ddd', fontFamily: 'monospace', fontSize: 13 }} />
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 8, background: N, color: '#fff', fontSize: 12, fontWeight: 700 }}>
              Preview — Menu Lateral
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#777', marginBottom: 6 }}>Cor de Destaque (botões/badges)</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input type="color" value={tema.gold}
                onChange={function(e) { updTema({ gold: e.target.value }) }}
                style={{ width: 44, height: 38, borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer', padding: 2 }} />
              <input value={tema.gold}
                onChange={function(e) { updTema({ gold: e.target.value }) }}
                style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #ddd', fontFamily: 'monospace', fontSize: 13 }} />
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 8, background: G, color: '#fff', fontSize: 12, fontWeight: 700 }}>
              Preview — Destaques / Badges
            </div>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={sec}>Tipografia</div>
        <div style={{ fontSize: 12, color: '#777', marginBottom: 8 }}>Família de Fonte</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {FONTES.map(function(f) {
            const ativo = tema.fonte === f.value
            return React.createElement('button', {
              key: f.value,
              onClick: function() { updTema({ fonte: f.value }) },
              style: {
                padding: '5px 13px', borderRadius: 8, fontFamily: f.value, fontSize: 13, cursor: 'pointer',
                border: ativo ? '2px solid ' + N : '1px solid #ddd',
                background: ativo ? N + '15' : '#fafafa',
                color: ativo ? N : '#444',
                fontWeight: ativo ? 700 : 400,
              }
            }, f.label)
          })}
        </div>

        <div style={{ fontSize: 12, color: '#777', marginBottom: 8 }}>Peso da Fonte (Negrito)</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {PESOS.map(function(p) {
            const ativo = (tema.negrito || '400') === p.value
            return React.createElement('button', {
              key: p.value,
              onClick: function() { updTema({ negrito: p.value }) },
              style: {
                padding: '5px 13px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                fontWeight: p.value,
                border: ativo ? '2px solid ' + N : '1px solid #ddd',
                background: ativo ? N + '15' : '#fafafa',
                color: ativo ? N : '#444',
              }
            }, p.label)
          })}
        </div>

        <div style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #e8e8e8', background: '#fafafa' }}>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 6 }}>Preview da tipografia selecionada</div>
          <div style={{ fontFamily: tema.fonte, fontWeight: tema.negrito || '400', fontSize: 14, color: N, lineHeight: 1.6 }}>
            EPimentel Auditoria e Contabilidade
          </div>
          <div style={{ fontFamily: tema.fonte, fontWeight: tema.negrito || '400', fontSize: 12, color: '#555', lineHeight: 1.6 }}>
            Obrigações acessórias, gestão fiscal, tributária e contábil para empresas e SPEs.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <span style={{ padding: '3px 10px', borderRadius: 6, background: N, color: '#fff', fontSize: 11, fontWeight: 700 }}>Ativo</span>
            <span style={{ padding: '3px 10px', borderRadius: 6, background: G, color: '#fff', fontSize: 11, fontWeight: 700 }}>Pendente</span>
            <span style={{ padding: '3px 10px', borderRadius: 6, background: '#f0f0f0', color: '#555', fontSize: 11 }}>Concluído</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={salvar}
          style={{ padding: '10px 24px', borderRadius: 9, background: N, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          {salvo ? '✅ Tema Salvo!' : '💾 Salvar Tema'}
        </button>
        <button onClick={resetar}
          style={{ padding: '10px 18px', borderRadius: 9, background: '#f0f0f0', color: '#555', fontWeight: 600, fontSize: 13, border: '1px solid #ddd', cursor: 'pointer' }}>
          ↺ Restaurar Padrão
        </button>
        {salvo && React.createElement('span', { style: { fontSize: 12, color: '#22c55e', fontWeight: 600 } }, 'Tema salvo com sucesso!')}
      </div>
    </div>
  )
}
