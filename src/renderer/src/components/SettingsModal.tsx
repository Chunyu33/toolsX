import { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Info, Laptop, Loader2, Moon, Settings, Sun, X } from 'lucide-react'
import { getStoredThemeMode, setStoredThemeMode, type ThemeMode } from '../theme/theme'
import Toast from './Toast'

type Props = {
  triggerClassName?: string
}

type NavKey = 'general' | 'about'

type UpdaterStatus =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; version: string; releaseNotes?: string }
  | { status: 'not-available' }
  | { status: 'downloading'; percent: number; transferred: number; total: number; bytesPerSecond: number }
  | { status: 'downloaded'; version: string; releaseNotes?: string }
  | { status: 'error'; message: string }

function fmtPercent(v: number) {
  if (!Number.isFinite(v)) return '0%'
  return `${Math.max(0, Math.min(100, Math.round(v)))}%`
}

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

  const [appVersion, setAppVersion] = useState<string>('')
  const [updaterStatus, setUpdaterStatus] = useState<UpdaterStatus>({ status: 'idle' })
  const [updateBusy, setUpdateBusy] = useState(false)

  const [toastOpen, setToastOpen] = useState(false)
  const [toastText, setToastText] = useState('')
  const [cleanupBusy, setCleanupBusy] = useState(false)

  const updateLoading = updateBusy || updaterStatus.status === 'checking' || updaterStatus.status === 'downloading'

  const showToast = (text: string) => {
    setToastText(text)
    setToastOpen(true)
  }

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

  useEffect(() => {
    if (!open) return

    let off: undefined | (() => void)
    let cancelled = false

    Promise.all([window.toolsx.updater.getVersion(), window.toolsx.updater.getStatus()])
      .then(([v, s]) => {
        if (cancelled) return
        setAppVersion(v?.version ?? '')
        setUpdaterStatus((s as UpdaterStatus) ?? { status: 'idle' })
      })
      .catch(() => undefined)

    off = window.toolsx.updater.onStatusChanged((s) => {
      setUpdaterStatus((s as UpdaterStatus) ?? { status: 'idle' })
      setUpdateBusy(false)
    })

    return () => {
      cancelled = true
      off?.()
    }
  }, [open])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Toast open={toastOpen} message={toastText} onClose={() => setToastOpen(false)} />
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

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between px-5 pt-5">
                <Dialog.Title className="text-base font-semibold text-app-text">{title}</Dialog.Title>
                <Dialog.Close asChild>
                  <button className="rounded-lg border border-app-border bg-app-surface px-2 py-2 text-sm text-app-text hover:bg-app-surface2">
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>

              <div className="min-h-0 flex-1 overflow-auto px-5 pb-5">
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
                      <div className="text-sm font-semibold text-app-text">临时文件</div>
                      <div className="mt-1 text-xs text-app-muted">
                        清理系统临时目录下由 ToolsX 生成的临时文件（仅清理 toolsx-imgc-* / toolsx-pdf-*，主进程会做严格白名单校验）。
                      </div>

                      <div className="mt-3">
                        <button
                          className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2 disabled:opacity-60"
                          disabled={cleanupBusy}
                          onClick={async () => {
                            setCleanupBusy(true)
                            try {
                              const res = await window.toolsx.files.cleanupTempImages({})
                              showToast(`已清理临时目录：${res.deletedCount} 个目录`)
                            } catch (e) {
                              showToast(e instanceof Error ? e.message : String(e))
                            } finally {
                              setCleanupBusy(false)
                            }
                          }}
                          type="button"
                        >
                          {cleanupBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          清除临时目录文件
                        </button>
                      </div>
                    </div>

                    {/* <div className="rounded-xl border border-app-border bg-app-surface p-4">
                      <div className="text-sm font-semibold text-app-text">预留区域</div>
                      <div className="mt-1 text-xs text-app-muted">后续可添加快捷键、语言、启动项等设置</div>
                    </div> */}
                  </div>
                ) : (
                  <div key={nav} className="panel-enter mt-4 space-y-4">
                    <div className="rounded-xl border border-app-border bg-app-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-app-text">版本信息</div>
                          <div className="mt-1 text-xs text-app-muted">{appVersion || '—'}</div>
                        </div>

                        <button
                          className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2 disabled:opacity-60"
                          disabled={updateLoading}
                          onClick={async () => {
                            setUpdateBusy(true)
                            try {
                              await window.toolsx.updater.checkForUpdates()
                            } catch (e) {
                              showToast(e instanceof Error ? e.message : String(e))
                              setUpdateBusy(false)
                            }
                          }}
                          type="button"
                        >
                          {updateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          检查更新
                        </button>
                      </div>

                      <div className="mt-3 text-xs text-app-muted">
                        {updaterStatus.status === 'idle'
                          ? '点击“检查更新”以获取最新版本。'
                          : updaterStatus.status === 'checking'
                            ? '正在检查更新…'
                            : updaterStatus.status === 'not-available'
                              ? '当前已是最新版本。'
                              : updaterStatus.status === 'available'
                                ? `发现新版本：${updaterStatus.version}`
                                : updaterStatus.status === 'downloading'
                                  ? `正在下载：${fmtPercent(updaterStatus.percent)}`
                                  : updaterStatus.status === 'downloaded'
                                    ? `下载完成：${updaterStatus.version}`
                                    : updaterStatus.status === 'error'
                                      ? `更新失败：${updaterStatus.message}`
                                      : ''}
                      </div>

                      {updaterStatus.status === 'available' ? (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-60"
                            disabled={updateLoading}
                            onClick={async () => {
                              setUpdateBusy(true)
                              try {
                                await window.toolsx.updater.downloadUpdate()
                              } catch (e) {
                                showToast(e instanceof Error ? e.message : String(e))
                                setUpdateBusy(false)
                              }
                            }}
                            type="button"
                          >
                            {updateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            立即下载
                          </button>
                        </div>
                      ) : null}

                      {updaterStatus.status === 'downloading' ? (
                        <div className="mt-3">
                          <div className="h-2 overflow-hidden rounded-full bg-app-surface2">
                            <div
                              className="h-2 rounded-full bg-brand-600"
                              style={{ width: `${Math.max(0, Math.min(100, updaterStatus.percent))}%` }}
                            />
                          </div>
                        </div>
                      ) : null}

                      {updaterStatus.status === 'downloaded' ? (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700"
                            onClick={() => window.toolsx.updater.quitAndInstall()}
                            type="button"
                          >
                            重启安装更新
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              {nav === 'about' ? (
                <div className="bg-app-surface px-5 py-3 text-center text-xs text-app-muted">
                  Copyright © 2026 ToolsX. All rights reserved.
                </div>
              ) : null}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
