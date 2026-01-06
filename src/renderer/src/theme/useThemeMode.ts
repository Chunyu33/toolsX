import { useEffect, useMemo, useState } from 'react'
import {
  applyThemeClass,
  getStoredThemeMode,
  nextThemeMode,
  setStoredThemeMode,
  type ThemeMode
} from './theme'

export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredThemeMode())

  useEffect(() => {
    applyThemeClass(mode)
    setStoredThemeMode(mode)
  }, [mode])

  useEffect(() => {
    if (mode !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyThemeClass('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  const cycle = useMemo(() => {
    return () => setMode((m) => nextThemeMode(m))
  }, [])

  return { mode, setMode, cycle }
}
