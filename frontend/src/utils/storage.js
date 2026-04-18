/**
 * EPimentel Storage — Persistencia Universal
 * Substitui localStorage com sync automatico para PostgreSQL.
 * SET: salva no localStorage (instantaneo) + PostgreSQL em background
 * GET: retorna localStorage imediatamente
 * SYNC (pull): PostgreSQL → localStorage (restaurar apos limpar cache)
 * UPLOAD (push): localStorage → PostgreSQL (migracao inicial / backup)
 */

const API_BASE = window.location.hostname === 'localhost'
  ? '/api/v1'
  : 'https://sistema-obrigacoes-production.up.railway.app/api/v1'

export const STORAGE_KEYS = [
  'ep_clientes', 'ep_cliente_counter',
  'ep_tarefas_entregas', 'ep_tarefas_excluidas',
  'ep_processos', 'ep_comunicados',
  'ep_obrigacoes_catalogo_v2', 'ep_config_tarefas',
  'ep_departamentos', 'ep_departamentos_admin',
  'ep_usuarios', 'epimentel_usuarios',
  'ep_perfis_custom', 'ep_certificados',
  'ep_cert_escritorio', 'ep_monitor_cnpj',
  'ep_notificacoes', 'ep_notif_rules',
  'ep_lgpd_log', 'ep_grupos_cadastrados',
]

// Salva localStorage + PostgreSQL (nao-bloqueante)
export async function epSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch(e) {}
  try {
    await fetch(API_BASE + '/storage/' + encodeURIComponent(key), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({data: value}),
      signal: AbortSignal.timeout(10000),
    })
  } catch(e) {}
}

// Le do localStorage (imediato)
export function epGet(key, defaultValue = null) {
  try {
    const local = localStorage.getItem(key)
    if (local !== null) return JSON.parse(local)
  } catch(e) {}
  return defaultValue
}

// Pull: PostgreSQL → localStorage (restaurar apos limpar cache)
export async function epSync(key) {
  try {
    const r = await fetch(API_BASE + '/storage/' + encodeURIComponent(key), {signal: AbortSignal.timeout(8000)})
    if (!r.ok) return false
    const {data, exists} = await r.json()
    if (exists && data !== null) { localStorage.setItem(key, JSON.stringify(data)); return true }
  } catch(e) {}
  return false
}

// Pull todos: PostgreSQL → localStorage
export async function epSyncAll(onProgress = null) {
  const results = {synced: 0, failed: 0, total: STORAGE_KEYS.length}
  for (const key of STORAGE_KEYS) {
    const ok = await epSync(key)
    if (ok) results.synced++; else results.failed++
    if (onProgress) onProgress({...results, currentKey: key})
  }
  localStorage.setItem('ep_last_sync', new Date().toISOString())
  return results
}

// Push: localStorage → PostgreSQL (migracao inicial ou backup manual)
export async function epUploadAll(onProgress = null) {
  const results = {uploaded: 0, skipped: 0, failed: 0, total: STORAGE_KEYS.length}
  for (const key of STORAGE_KEYS) {
    const local = localStorage.getItem(key)
    if (!local) { results.skipped++; if (onProgress) onProgress({...results, currentKey: key}); continue }
    try {
      let value
      try { value = JSON.parse(local) } catch { value = local }
      const r = await fetch(API_BASE + '/storage/' + encodeURIComponent(key), {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({data: value}),
        signal: AbortSignal.timeout(10000),
      })
      if (r.ok) results.uploaded++; else results.failed++
    } catch(e) { results.failed++ }
    if (onProgress) onProgress({...results, currentKey: key})
  }
  localStorage.setItem('ep_last_upload', new Date().toISOString())
  return results
}

// Exportar backup completo do PostgreSQL
export async function epExportBackup() {
  const r = await fetch(API_BASE + '/storage/export')
  if (!r.ok) throw new Error('Falha ao exportar backup')
  return await r.json()
}

// Importar backup para o PostgreSQL
export async function epImportBackup(backupData) {
  const r = await fetch(API_BASE + '/storage/import', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(backupData),
  })
  if (!r.ok) throw new Error('Falha ao importar backup')
  await epSyncAll()
  return await r.json()
}

// Verificar se backend esta online
export async function epCheckBackend() {
  try {
    const r = await fetch(API_BASE + '/storage/', {signal: AbortSignal.timeout(5000)})
    return r.ok
  } catch { return false }
}

export const epStorage = {
  set: epSet, get: epGet,
  sync: epSync, syncAll: epSyncAll,
  uploadAll: epUploadAll,
  exportBackup: epExportBackup, importBackup: epImportBackup,
  checkBackend: epCheckBackend, KEYS: STORAGE_KEYS,
}

export default epStorage
