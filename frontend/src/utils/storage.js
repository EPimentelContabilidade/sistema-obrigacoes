/**
 * EPimentel Storage — Persistencia Universal
 * Substitui localStorage com sync automatico para PostgreSQL.
 * SET: salva no localStorage (instantaneo) + PostgreSQL em background
 * GET: retorna localStorage imediatamente
 * SYNC: ao iniciar o app, restaura todos os dados do PostgreSQL
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

export async function epSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch(e) {}
  try {
    await fetch(API_BASE + '/storage/' + key, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({data: value}),
      signal: AbortSignal.timeout(10000),
    })
  } catch(e) {}
}

export function epGet(key, defaultValue = null) {
  try {
    const local = localStorage.getItem(key)
    if (local !== null) return JSON.parse(local)
  } catch(e) {}
  return defaultValue
}

export async function epSync(key) {
  try {
    const r = await fetch(API_BASE + '/storage/' + key, {signal: AbortSignal.timeout(8000)})
    if (!r.ok) return false
    const {data, exists} = await r.json()
    if (exists && data !== null) { localStorage.setItem(key, JSON.stringify(data)); return true }
  } catch(e) {}
  return false
}

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

export async function epExportBackup() {
  const r = await fetch(API_BASE + '/storage/export')
  if (!r.ok) throw new Error('Falha ao exportar backup')
  return await r.json()
}

export async function epImportBackup(backupData) {
  const r = await fetch(API_BASE + '/storage/import', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(backupData),
  })
  if (!r.ok) throw new Error('Falha ao importar backup')
  await epSyncAll()
  return await r.json()
}

export async function epCheckBackend() {
  try {
    const r = await fetch(API_BASE + '/storage/', {signal: AbortSignal.timeout(5000)})
    return r.ok
  } catch { return false }
}

export const epStorage = {
  set: epSet, get: epGet, sync: epSync, syncAll: epSyncAll,
  exportBackup: epExportBackup, importBackup: epImportBackup,
  checkBackend: epCheckBackend, KEYS: STORAGE_KEYS,
}

export default epStorage
