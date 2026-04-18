import { useState, useCallback } from 'react'
import { epSet, epGet } from './storage'

/**
 * useStorage — Hook React para persistencia universal
 * Qualquer modulo usa este hook e automaticamente persiste no PostgreSQL.
 * const [processos, setProcessos] = useStorage('ep_processos', [])
 */
export function useStorage(key, defaultValue = null) {
  const [value, setValue] = useState(() => epGet(key, defaultValue))
  const set = useCallback(async (newValue) => {
    const resolved = typeof newValue === 'function' ? newValue(value) : newValue
    setValue(resolved)
    await epSet(key, resolved)
  }, [key, value])
  return [value, set]
}

export default useStorage
