import type { ChangeEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronLeft, Maximize2, Minus, Search, X } from 'lucide-react'
import SettingsModal from './SettingsModal'

type Props = {
  title: string
  onSearchChange?: (value: string) => void
}

export default function Header({ title, onSearchChange }: Props) {
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [isMax, setIsMax] = useState(false)

  const showBack = useMemo(() => location.pathname !== '/', [location.pathname])

  useEffect(() => {
    let cancelled = false

    window.toolsx.windowControls
      .isMaximized()
      .then((v) => {
        if (!cancelled) setIsMax(v)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="sticky top-0 z-20 border-b border-app-border bg-app-surface/80 backdrop-blur">
      <div className="titlebar flex h-12 items-center">
        <div className="flex items-center gap-2 pl-3 pr-2">
          <div className="h-7 w-7 rounded-lg bg-brand-500/20 ring-1 ring-brand-300/40" />
          <div className="text-sm font-semibold tracking-wide text-app-text">ToolsX</div>
        </div>

        {showBack ? (
          <Link
            to="/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-app-border bg-app-surface text-app-text hover:bg-app-surface2"
            title="返回"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : null}

        <div className="flex-1" title={title} />

        <div className="flex items-center gap-2 px-2">
          <div className="relative hidden w-[320px] sm:block">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-app-muted" />
            <input
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const v = e.currentTarget.value
                setSearch(v)
                onSearchChange?.(v)
              }}
              placeholder="搜索工具..."
              className="w-full rounded-lg border border-app-border bg-app-surface2 px-9 py-2 text-sm text-app-text outline-none focus:border-brand-300"
            />
          </div>

          <SettingsModal />
        </div>

        <div className="flex h-12 w-[150px] items-stretch justify-end">
          <button
            className="flex w-12 items-center justify-center text-app-muted hover:bg-app-surface2 hover:text-app-text"
            onClick={() => window.toolsx.windowControls.minimize()}
            title="最小化"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            className="flex w-12 items-center justify-center text-app-muted hover:bg-app-surface2 hover:text-app-text"
            onClick={async () => {
              await window.toolsx.windowControls.toggleMaximize()
              const v = await window.toolsx.windowControls.isMaximized()
              setIsMax(v)
            }}
            title={isMax ? '还原' : '最大化'}
          >
            <Maximize2 className={isMax ? 'h-4 w-4 text-brand-500' : 'h-4 w-4'} />
          </button>
          <button
            className="flex w-12 items-center justify-center text-app-muted hover:bg-red-600 hover:text-white"
            onClick={() => window.toolsx.windowControls.close()}
            title="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
