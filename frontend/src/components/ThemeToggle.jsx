import React, { useState, useEffect, useRef } from 'react'
import { epSet, epGet } from '../utils/storage'

const PALETAS = [
  { id:'ep',    nome:'EPimentel',   light:{ navy:'#1F4A33', gold:'#C5A55A', bg:'#f4f6f4', card:'#ffffff', text:'#1a1a1a', sub:'#6b7280', brd:'#e5e7eb', sidebar:'#1F4A33', input:'#ffffff' }, dark:{ navy:'#2D6B4A', gold:'#D4B06A', bg:'#0d1f17', card:'#162b1e', text:'#e8f5ee', sub:'#86b89a', brd:'#2d4a38', sidebar:'#0d1f17', input:'#1a3325' } },
  { id:'azul',  nome:'Azul Corp',  light:{ navy:'#1D3461', gold:'#F5A623', bg:'#f0f4ff', card:'#ffffff', text:'#1a1a1a', sub:'#6b7280', brd:'#dbeafe', sidebar:'#1D3461', input:'#ffffff' }, dark:{ navy:'#1E40AF', gold:'#F59E0B', bg:'#0a0f1e', card:'#111827', text:'#e8eeff', sub:'#93c5fd', brd:'#1e3a5f', sidebar:'#0a0f1e', input:'#1e293b' } },
  { id:'roxo',  nome:'Roxo',       light:{ navy:'#4A1FA8', gold:'#FFB800', bg:'#faf5ff', card:'#ffffff', text:'#1a1a1a', sub:'#6b7280', brd:'#e9d5ff', sidebar:'#4A1FA8', input:'#ffffff' }, dark:{ navy:'#6D28D9', gold:'#FCD34D', bg:'#0c0014', card:'#160a2b', text:'#f5f0ff', sub:'#a78bfa', brd:'#3b1a6b', sidebar:'#0c0014', input:'#1e0a35' } },
  { id:'verde', nome:'Verde',      light:{ navy:'#1B5E20', gold:'#F9A825', bg:'#f0fdf4', card:'#ffffff', text:'#1a1a1a', sub:'#6b7280', brd:'#bbf7d0', sidebar:'#1B5E20', input:'#ffffff' }, dark:{ navy:'#15803D', gold:'#FDE047', bg:'#051a0a', card:'#0a2e12', text:'#f0fdf4', sub:'#86efac', brd:'#14532d', sidebar:'#051a0a', input:'#0d3818' } },
  { id:'slate', nome:'Grafite',    light:{ navy:'#1e293b', gold:'#F59E0B', bg:'#f8fafc', card:'#ffffff', text:'#1a1a1a', sub:'#64748b', brd:'#e2e8f0', sidebar:'#1e293b', input:'#ffffff' }, dark:{ navy:'#334155', gold:'#FBBF24', bg:'#080d14', card:'#0f172a', text:'#f1f5f9', sub:'#94a3b8', brd:'#1e293b', sidebar:'#080d14', input:'#1e293b' } },
  { id:'rose',  nome:'Rosa',       light:{ navy:'#9F1239', gold:'#F97316', bg:'#fff1f2', card:'#ffffff', text:'#1a1a1a', sub:'#6b7280', brd:'#fecdd3', sidebar:'#9F1239', input:'#ffffff' }, dark:{ navy:'#BE123C', gold:'#FB923C', bg:'#130008', card:'#200012', text:'#fff1f2', sub:'#fda4af', brd:'#4c0020', sidebar:'#130008', input:'#2d0020' } },
  { id:'teal',  nome:'Teal',       light:{ navy:'#0F766E', gold:'#F59E0B', bg:'#f0fdfa', card:'#ffffff', text:'#1a1a1a', sub:'#6b7280', brd:'#99f6e4', sidebar:'#0F766E', input:'#ffffff' }, dark:{ navy:'#0D9488', gold:'#FCD34D', bg:'#001612', card:'#00241e', text:'#f0fdfa', sub:'#5eead4', brd:'#134e4a', sidebar:'#001612', input:'#002e26' } },
  { id:'cafe',  nome:'Cafe',       light:{ navy:'#4E342E', gold:'#D4A96A', bg:'#fdf8f5', card:'#ffffff', text:'#1a1a1a', sub:'#78716c', brd:'#e7d5c9', sidebar:'#4E342E', input:'#ffffff' }, dark:{ navy:'#7C2D12', gold:'#FCD34D', bg:'#0d0800', card:'#1a0e05', text:'#fdf8f5', sub:'#d6bcae', brd:'#4e2412', sidebar:'#0d0800', input:'#2d1508' } },
]

// Paletas de cores comuns nos components (para substituição no DOM)
const CORES_LIGHT_BRANCAS = ['#ffffff','#fff','rgb(255,255,255)','#f8f9fb','#f8f9fa','#fafafa','#f5f5f5','#f0f0f0']
const CORES_DARK_TEXTO    = ['#1a1a1a','#222','#333','#444','#111','#212121']
const CORES_LIGHT_BG      = ['#f8f9fb','#f8f9fa','#fafafa','#f5f5f5','#f0f0f0','#f4f4f4','#eff1f3']

let _observer = null

function aplicarEstiloGlobal(c, modo) {
  let style = document.getElementById('ep-global-style')
  if (!style) { style = document.createElement('style'); style.id = 'ep-global-style'; document.head.appendChild(style) }

  if (modo === 'dark') {
    style.textContent = [
      'body, #root { background: ' + c.bg + ' !important; color: ' + c.text + ' !important; }',
      // Cards / containers brancos
      'div[style*="background: rgb(255"], div[style*="background:#fff"], div[style*="background: #fff"], div[style*="background:white"], div[style*="background: white"] { background: ' + c.card + ' !important; }',
      // Backgrounds claros
      'div[style*="background: #f8"], div[style*="background: #f5"], div[style*="background: #fa"], div[style*="background: #f0"], div[style*="background: #f4"] { background: ' + c.card + ' !important; }',
      // Textos escuros -> claros
      'span[style*="color: #1"], span[style*="color: #2"], span[style*="color: #3"], span[style*="color: #4"], div[style*="color: #1"], div[style*="color: #2"], div[style*="color: #3"] { color: ' + c.text + ' !important; }',
      // Inputs / selects
      'input:not([type="color"]), select, textarea { background: ' + c.input + ' !important; color: ' + c.text + ' !important; border-color: ' + c.brd + ' !important; }',
      // Tabelas
      'table, th, td { border-color: ' + c.brd + ' !important; }',
      'tr:nth-child(even) { background: ' + c.card + '99 !important; }',
      // Modais / popups
      'div[style*="position: fixed"], div[style*="position:fixed"] { background: ' + c.card + ' !important; }',
      // Bordas
      'div[style*="border: 1px solid #"], div[style*="border:1px solid #"] { border-color: ' + c.brd + ' !important; }',
      // Labels e textos gerais cinza
      'label { color: ' + c.sub + ' !important; }',
    ].join(' ')
  } else {
    style.textContent = [
      'body, #root { background: ' + c.bg + ' !important; }',
    ].join(' ')
  }
}

function aplicarPaletaCompleta(paleta, modo) {
  const c = modo === 'dark' ? paleta.dark : paleta.light
  const root = document.documentElement
  root.style.setProperty('--ep-navy',   c.navy)
  root.style.setProperty('--ep-gold',   c.gold)
  root.style.setProperty('--ep-bg',     c.bg)
  root.style.setProperty('--ep-card',   c.card)
  root.style.setProperty('--ep-text',   c.text)
  root.style.setProperty('--ep-brd',    c.brd)
  root.style.setProperty('--ep-sub',    c.sub)

  // Estilo global CSS
  aplicarEstiloGlobal(c, modo)

  // Salvar no window para acesso global
  window._EP_TEMA = { paleta, modo, cores: c }

  // Recolorir DOM imediatamente
  recolorirDOM(c, modo)

  // Observer para novos elementos
  if (_observer) _observer.disconnect()
  _observer = new MutationObserver(function() { recolorirDOM(c, modo) })
  _observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
}

function recolorirDOM(c, modo) {
  if (modo !== 'dark') {
    // Modo claro: remover overrides de cor
    document.querySelectorAll('[data-ep-dark]').forEach(function(el) {
      el.removeAttribute('data-ep-dark')
      if (el._epOrigStyle) { el.style.cssText = el._epOrigStyle; delete el._epOrigStyle }
    })
    return
  }

  // Modo escuro: recolorir todos elementos com bg branco/claro
  const todos = document.querySelectorAll('div, section, main, aside, nav, article, p, span, td, th, li')
  todos.forEach(function(el) {
    if (el.dataset.epDark) return
    const bg = el.style.backgroundColor || el.style.background
    if (!bg) return
    const bgLower = bg.toLowerCase().replace(/\s/g,'')
    const ehBranco = bgLower.includes('255,255,255') || bgLower === '#fff' || bgLower === '#ffffff' || bgLower === 'white' || bgLower.startsWith('#f8') || bgLower.startsWith('#f9') || bgLower.startsWith('#fa') || bgLower.startsWith('#f5')
    if (ehBranco) {
      el._epOrigStyle = el.style.cssText
      el.style.backgroundColor = c.card
      if (el.style.background && !el.style.background.includes('gradient')) el.style.background = c.card
      el.style.color = c.text
      el.style.borderColor = c.brd
      el.dataset.epDark = '1'
    }
  })
}

export function carregarThemeToggle() {
  const saved = epGet('ep_theme_toggle', null)
  if (saved) {
    const paleta = PALETAS.find(function(p) { return p.id === saved.paleta }) || PALETAS[0]
    aplicarPaletaCompleta(paleta, saved.modo)
  }
}

export default function ThemeToggle() {
  const saved = epGet('ep_theme_toggle', { paleta: 'ep', modo: 'light' })
  const [modo, setModo] = useState(saved.modo || 'light')
  const [paletaId, setPaletaId] = useState(saved.paleta || 'ep')
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)

  useEffect(function() {
    function fechar(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', fechar)
    return function() { document.removeEventListener('mousedown', fechar) }
  }, [])

  function aplicar(pId, m) {
    const paleta = PALETAS.find(function(p) { return p.id === pId }) || PALETAS[0]
    aplicarPaletaCompleta(paleta, m)
    epSet('ep_theme_toggle', { paleta: pId, modo: m })
  }

  function trocarModo() {
    const novo = modo === 'light' ? 'dark' : 'light'
    setModo(novo)
    aplicar(paletaId, novo)
  }

  function selecionarPaleta(id) {
    setPaletaId(id)
    aplicar(id, modo)
    setAberto(false)
  }

  const corAtual = (PALETAS.find(function(p) { return p.id === paletaId }) || PALETAS[0])
  const c = modo === 'dark' ? corAtual.dark : corAtual.light

  return (
    <div ref={ref} style={{ position:'relative', display:'inline-flex', alignItems:'center', gap:6 }}>
      <button onClick={function() { setAberto(function(v) { return !v }) }}
        title="Paleta de cores"
        style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:20,
          background: c.navy + '20', border:'1px solid ' + c.navy + '50',
          cursor:'pointer', fontSize:12, fontWeight:600, color: c.navy }}>
        <span style={{ width:10, height:10, borderRadius:'50%', background:c.navy, display:'inline-block' }}/>
        <span style={{ width:10, height:10, borderRadius:'50%', background:c.gold, display:'inline-block' }}/>
        <span style={{ marginLeft:2 }}>🎨</span>
      </button>

      <button onClick={trocarModo}
        title={modo === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        style={{ width:34, height:34, borderRadius:'50%', border:'2px solid ' + c.navy + '40',
          cursor:'pointer', fontSize:18, background: modo === 'dark' ? c.card : '#f0f0f0',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 2px 8px rgba(0,0,0,0.15)', transition:'all 0.3s' }}>
        {modo === 'dark' ? '☀️' : '🌙'}
      </button>

      {aberto && (
        <div style={{ position:'absolute', top:'calc(100% + 10px)', right:0, zIndex:99999,
          background: c.card, border:'1px solid ' + c.brd,
          borderRadius:14, padding:16, boxShadow:'0 12px 40px rgba(0,0,0,0.25)', minWidth:280 }}>
          <div style={{ fontSize:11, fontWeight:800, color:c.sub, textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
            Tema de Cores
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:14 }}>
            {PALETAS.map(function(p) {
              const pc = modo === 'dark' ? p.dark : p.light
              const ativo = paletaId === p.id
              return React.createElement('button', {
                key: p.id,
                onClick: function() { selecionarPaleta(p.id) },
                style: { display:'flex', alignItems:'center', gap:7, padding:'7px 10px', borderRadius:8,
                  cursor:'pointer', fontSize:12, fontWeight: ativo ? 700 : 400,
                  border: ativo ? '2px solid ' + pc.navy : '1px solid ' + c.brd,
                  background: ativo ? pc.navy + '18' : 'transparent',
                  color: ativo ? pc.navy : c.text }
              },
                React.createElement('span', { style:{display:'flex',gap:2} },
                  React.createElement('span',{style:{width:12,height:12,borderRadius:3,background:pc.navy,display:'inline-block'}}),
                  React.createElement('span',{style:{width:12,height:12,borderRadius:3,background:pc.gold,display:'inline-block'}})
                ),
                p.nome, ativo ? ' ✓' : ''
              )
            })}
          </div>
          <div style={{ borderTop:'1px solid '+c.brd, paddingTop:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, color:c.sub }}>Aparência:</span>
            <button onClick={function() { trocarModo(); setAberto(false) }}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:20,
                border:'1px solid '+c.brd, background:'transparent', cursor:'pointer',
                fontSize:12, fontWeight:700, color:c.text }}>
              {modo === 'dark' ? '☀️ Claro' : '🌙 Escuro'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
