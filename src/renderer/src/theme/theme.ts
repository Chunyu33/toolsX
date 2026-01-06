export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'toolsx-theme-mode'

export function getStoredThemeMode(): ThemeMode {
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === 'light' || v === 'dark' || v === 'system') return v
  return 'system'
}

export function setStoredThemeMode(mode: ThemeMode): void {
  localStorage.setItem(STORAGE_KEY, mode)
}

export function getSystemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
}

export function applyThemeClass(mode: ThemeMode): void {
  const root = document.documentElement
  const isDark = mode === 'dark' || (mode === 'system' && getSystemPrefersDark())
  root.classList.toggle('dark', isDark)
}

export function nextThemeMode(mode: ThemeMode): ThemeMode {
  if (mode === 'system') return 'light'
  if (mode === 'light') return 'dark'
  return 'system'
}
