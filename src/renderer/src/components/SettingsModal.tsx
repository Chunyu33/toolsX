import { useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Info, Laptop, Moon, Settings, Sun, X } from 'lucide-react'
import { getStoredThemeMode, setStoredThemeMode, type ThemeMode } from '../theme/theme'

type Props = {
  triggerClassName?: string
}

type NavKey = 'general' | 'about'

function ThemeChip({ value, current, onSelect }: { value: ThemeMode; current: ThemeMode; onSelect: (v: ThemeMode) => void }) {
  const active = value === current
  const label = value === 'system' ? '跟随系统' : value === 'dark' ? '暗色' : '亮色'
  const Icon = value === 'system' ? Laptop : value === 'dark' ? Moon : Sun

  return (
    <button
      className={
        active
          ? 'inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 text-sm text-app-text'
          : 'inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2'
      }
      onClick={() => onSelect(value)}
      type="button"
    >
      <Icon className={active ? 'h-4 w-4 text-brand-600' : 'h-4 w-4 text-app-muted'} />
      {label}
    </button>
  )
}

export default function SettingsModal({ triggerClassName }: Props) {
  const [open, setOpen] = useState(false)
  const [nav, setNav] = useState<NavKey>('general')
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredThemeMode())

  const title = useMemo(() => {
    return nav === 'general' ? '通用' : '关于'
  }, [nav])

  const setMode = (mode: ThemeMode) => {
    setThemeMode(mode)
    setStoredThemeMode(mode)
    document.documentElement.classList.toggle(
      'dark',
      mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className={
            triggerClassName ??
            'no-drag inline-flex h-9 w-9 items-center justify-center rounded-lg border border-app-border bg-app-surface text-app-text hover:bg-app-surface2'
          }
          title="设置"
        >
          <Settings className="h-4 w-4" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 h-[78vh] w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-app">
          <div className="flex h-full">
            <div className="w-[220px] border-r border-app-border bg-app-surface2 p-3">
              <div className="px-2 py-2 text-sm font-semibold text-app-text">设置</div>

              <div className="mt-2 space-y-1">
                <button
                  type="button"
                  onClick={() => setNav('general')}
                  className={
                    nav === 'general'
                      ? 'flex w-full items-center gap-2 rounded-lg bg-app-surface px-3 py-2 text-sm text-app-text ring-1 ring-brand-300/50'
                      : 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-app-text hover:bg-app-surface'
                  }
                >
                  <Settings className={nav === 'general' ? 'h-4 w-4 text-brand-600' : 'h-4 w-4 text-app-muted'} />
                  通用
                </button>

                <button
                  type="button"
                  onClick={() => setNav('about')}
                  className={
                    nav === 'about'
                      ? 'flex w-full items-center gap-2 rounded-lg bg-app-surface px-3 py-2 text-sm text-app-text ring-1 ring-brand-300/50'
                      : 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-app-text hover:bg-app-surface'
                  }
                >
                  <Info className={nav === 'about' ? 'h-4 w-4 text-brand-600' : 'h-4 w-4 text-app-muted'} />
                  关于
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-5">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-base font-semibold text-app-text">{title}</Dialog.Title>
                <Dialog.Close asChild>
                  <button className="rounded-lg border border-app-border bg-app-surface px-2 py-2 text-sm text-app-text hover:bg-app-surface2">
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>

              {nav === 'general' ? (
                <div key={nav} className="panel-enter mt-4 space-y-4">
                  <div className="rounded-xl border border-app-border bg-app-surface p-4">
                    <div className="text-sm font-semibold text-app-text">外观</div>
                    <div className="mt-1 text-xs text-app-muted">选择亮色/暗色或跟随系统</div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <ThemeChip value="system" current={themeMode} onSelect={setMode} />
                      <ThemeChip value="light" current={themeMode} onSelect={setMode} />
                      <ThemeChip value="dark" current={themeMode} onSelect={setMode} />
                    </div>
                  </div>

                  <div className="rounded-xl border border-app-border bg-app-surface p-4">
                    <div className="text-sm font-semibold text-app-text">预留区域</div>
                    <div className="mt-1 text-xs text-app-muted">后续可添加快捷键、语言、启动项等设置</div>
                  </div>
                </div>
              ) : (
                <div key={nav} className="panel-enter mt-4 space-y-4">
                  <div className="rounded-xl border border-app-border bg-app-surface p-4">
                    <div className="text-sm font-semibold text-app-text">ToolsX</div>
                    <div className="mt-1 text-xs text-app-muted">桌面全能工具箱</div>

                    <div className="mt-4 rounded-lg border border-app-border bg-app-surface2 p-3 text-sm text-app-text">
                      这是一个 Electron + React + Vite + Tailwind 的生产级骨架（自定义 Titlebar + IPC + 主题）。
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
