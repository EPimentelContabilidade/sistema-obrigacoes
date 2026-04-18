import React, { useState, useEffect, useRef } from 'react'
import { epSet, epGet } from '../utils/storage'
import { aplicarTema, TEMA_PADRAO } from './ThemeCustomizer'

// Paletas com modo claro e escuro
const PALETAS = [
  { id:'ep',    nome:'EPimentel',     light:{ navy:'#1F4A33', gold:'#C5A55A', bg:'#f8f9fa', card:'#ffffff', text:'#1a1a1a', textSub:'#6b7280', border:'#e5e7eb' }, dark:{ navy:'#2D6B4A', gold:'#D4B06A', bg:'#0f1923', card:'#1a2530', text:'#f0f0f0', textSub:'#9ca3af', border:'#2d3748' } },
  { id:'azul',  nome:'Azul Corp',     light:{ navy:'#1D3461', gold:'#F5A623', bg:'#f0f4ff', card:'#ffffff', text:'#1a1a1a', textSub:'#6b7280', border:'#dbeafe' }, dark:{ navy:'#2563EB', gold:'#F59E0B', bg:'#0c1a2e', card:'#1e293b', text:'#f1f5f9', textSub:'#94a3b8', border:'#1e3a5f' } },
  { id:'roxo',  nome:'Roxo',          light:{ navy:'#4A1FA8', gold:'#FFB800', bg:'#faf5ff', card:'#ffffff', text:'#1a1a1a', textSub:'#6b7280', border:'#e9d5ff' }, dark:{ navy:'#7C3AED', gold:'#FCD34D', bg:'#13001f', card:'#1e0a35', text:'#f5f3ff', textSub:'#a78bfa', border:'#3b1a6b' } },
  { id:'verde', nome:'Verde',         light:{ navy:'#1B5E20', gold:'#F9A825', bg:'#f0fdf4', card:'#ffffff', text:'#1a1a1a', textSub:'#6b7280', border:'#bbf7d0' }, dark:{ navy:'#16A34A', gold:'#FDE047', bg:'#071a0e', card:'#0d2918', text:'#f0fdf4', textSub:'#86efac', border:'#14532d' } },
  { id:'slate', nome:'Grafite',       light:{ navy:'#1e293b', gold:'#F59E0B', bg:'#f8fafc', card:'#ffffff', text:'#1a1a1a', textSub:'#64748b', border:'#e2e8f0' }, dark:{ navy:'#475569', gold:'#FBBF24', bg:'#0f172a', card:'#1e293b', text:'#f8fafc', textSub:'#94a3b8', border:'#334155' } },
  { id:'rose',  nome:'Rosa',          light:{ navy:'#881337', gold:'#F97316', bg:'#fff1f2', card:'#ffffff', text:'#1a1a1a', textSub:'#6b7280', border:'#fecdd3' }, dark:{ navy:'#E11D48', gold:'#FB923C', bg:'#1a0010', card:'#2d0020', text:'#fff1f2', textSub:'#fda4af', border:'#4c0020' } },
  { id:'teal',  nome:'Teal',          light:{ navy:'#0F766E', gold:'#F59E0B', bg:'#f0fdfa', card:'#ffffff', text:'#1a1a1a', textSub:'#6b7280', border:'#99f6e4' }, dark:{ navy:'#14B8A6', gold:'#FCD34D', bg:'#001a18', card:'#002d28', text:'#f0fdfa', textSub:'#5eead4', border:'#134e4a' } },
  { id:'cafe',  nome:'Café',          light:{ navy:'#4E342E', gold:'#D4A96A', bg:'#fdf8f5', card:'#ffffff', text:'#1a1a1a', textSub:'#78716c', border:'#e7d5c9' }, dark:{ navy:'#92400E', gold:'#FCD34D', bg:'#1a0d08', card:'#2d1810', text:'#fdf8f5', textSub:'#d6bcae', border:'#4e2412' } },
]

function aplicarPaletaCompleta(paleta, modo) {
  const cores = modo === 'dark' ? paleta.dark : paleta.light
  const root = document.documentElement
  // Cores do tema
  root.style.setProperty('--ep-navy',   cores.navy)
  root.style.setProperty('--ep-gold',   cores.gold)
  root.style.setProperty('--ep-bg',     cores.bg)
  root.style.setProperty('--ep-card',   cores.card)
  root.style.setProperty('--ep-text',   cores.text)
  root.style.setProperty('--ep-textsub',cores.textSub)
  root.style.setProperty('--ep-border', cores.border)
  // Aplicar via CSS global
  let style = document.getElementById('ep-tema-style')
  if (!style) { style = document.createElement('style'); style.id = 'ep-tema-style'; document.head.appendChild(style) }
  const savedTema = epGet('ep_tema', TEMA_PADRAO)
  const fonte = savedTema.fonte || 'Inter, system-ui, sans-serif'
  const peso  = savedTema.negrito || '400'
  style.textContent = [
    '* { font-family: ' + fonte + ' !important; }',
    'body { background: ' + cores.bg + ' !important; color: ' + cores.text + ' !important; }',
    modo === 'dark' ? [
      '[style*="background: #fff"], [style*="background:#fff"], [style*="background: white"] { background: ' + cores.card + ' !important; }',
      '[style*="color: #1"], [style*="color:#1"], [style*="color: #2"], [style*="color:#2"] { color: ' + cores.text + ' !important; }',
      'input, select, textarea { background: ' + cores.card + ' !important; color: ' + cores.text + ' !important; border-color: ' + cores.border + ' !important; }',
      'table td, table th { border-color: ' + cores.border + ' !important; }',
    ].join(' ') : '',
    'b, strong { font-weight: ' + (peso === '700' ? '800' : '700') + ' !important; }',
  ].join(' ')
}

export function carregarThemeToggle() {
  const saved = epGet('ep_theme_toggle', null)
  if (saved) {
    const paleta = PALETAS.find(p => p.id === saved.paleta) || PALETAS[0]
    aplicarPaletaCompleta(paleta, saved.modo)
  }
}

export default function ThemeToggle() {
  const [aberto, setAberto] = useState(false)
  const saved = epGet('ep_theme_toggle', { paleta: 'ep', modo: 'light' })
  const [modo, setModo] = useState(saved.modo || 'light')
  const [paletaId, setPaletaId] = useState(saved.paleta || 'ep')
  const ref = useRef(null)

  useEffect(function() {
    function fechar(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', fechar)
    return function() { document.removeEventListener('mousedown', fechar) }
  }, [])

  function aplicar(novoPaletaId, novoModo) {
    const paleta = PALETAS.find(p => p.id === novoPaletaId) || PALETAS[0]
    aplicarPaletaCompleta(paleta, novoModo)
    const novo = { paleta: novoPaletaId, modo: novoModo }
    epSet('ep_theme_toggle', novo)
  }

  function trocarModo() {
    const novoModo = modo === 'light' ? 'dark' : 'light'
    setModo(novoModo)
    aplicar(paletaId, novoModo)
  }

  function selecionarPaleta(id) {
    setPaletaId(id)
    aplicar(id, modo)
    setAberto(false)
  }

  const paletaAtual = PALETAS.find(p => p.id === paletaId) || PALETAS[0]
  const cores = modo === 'dark' ? paletaAtual.dark : paletaAtual.light

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {/* Botão paleta */}
      <button onClick={function() { setAberto(function(v) { return !v }) }}
        title="Alterar tema de cores"
        style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:20,
          background: cores.navy + '20', border:'1px solid ' + cores.navy + '40',
          cursor:'pointer', fontSize:12, fontWeight:600, color: cores.navy }}>
        <span style={{ width:12, height:12, borderRadius:'50%', background: cores.navy, display:'inline-block' }}/>
        <span style={{ width:12, height:12, borderRadius:'50%', background: cores.gold, display:'inline-block' }}/>
        <span>🎨</span>
      </button>

      {/* Botão modo claro/escuro */}
      <button onClick={trocarModo}
        title={modo === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        style={{ width:36, height:36, borderRadius:'50%', border:'none', cursor:'pointer', fontSize:20,
          background: modo === 'dark' ? '#1a2530' : '#f0f0f0',
          boxShadow:'0 2px 8px rgba(0,0,0,0.15)', display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all 0.3s' }}>
        {modo === 'dark' ? '☀️' : '🌙'}
      </button>

      {/* Dropdown de paletas */}
      {aberto && (
        <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, zIndex:9999,
          background: cores.card || '#fff', border:'1px solid ' + (cores.border || '#e5e7eb'),
          borderRadius:14, padding:14, boxShadow:'0 8px 32px rgba(0,0,0,0.18)',
          minWidth:260 }}>
          <div style={{ fontSize:11, fontWeight:700, color: cores.textSub || '#888',
            textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
            Paleta de Cores
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {PALETAS.map(function(p) {
              const c = modo === 'dark' ? p.dark : p.light
              const ativo = paletaId === p.id
              return React.createElement('button', {
                key: p.id,
                onClick: function() { selecionarPaleta(p.id) },
                style: {
                  display:'flex', alignItems:'center', gap:8, padding:'7px 10px',
                  borderRadius:8, cursor:'pointer', fontSize:12, fontWeight: ativo ? 700 : 400,
                  border: ativo ? '2px solid ' + c.navy : '1px solid ' + (cores.border || '#e5e7eb'),
                  background: ativo ? c.navy + '15' : 'transparent',
                  color: ativo ? c.navy : (cores.text || '#333'),
                }
              },
                React.createElement('span', { style: {display:'flex',gap:2} },
                  React.createElement('span',{style:{width:11,height:11,borderRadius:3,background:c.navy,display:'inline-block'}}),
                  React.createElement('span',{style:{width:11,height:11,borderRadius:3,background:c.gold,display:'inline-block'}})
                ),
                p.nome,
                ativo ? ' ✓' : ''
              )
            })}
          </div>
          <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid '+(cores.border||'#e5e7eb'),
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, color: cores.textSub||'#888' }}>Modo atual:</span>
            <button onClick={function() { trocarModo(); setAberto(false) }}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20,
                border:'1px solid '+(cores.border||'#ddd'), background:'transparent',
                cursor:'pointer', fontSize:12, fontWeight:600, color: cores.text||'#333' }}>
              {modo === 'dark' ? '☀️ Claro' : '🌙 Escuro'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
