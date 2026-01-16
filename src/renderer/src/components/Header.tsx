import type { ChangeEvent } from 'react'
import { useEffect, useState } from 'react'
import { Maximize2, Minus, Search, X } from 'lucide-react'
import SettingsModal from './SettingsModal'
import appLogo from '../../../assets/app.png'

type Props = {
  title: string
  onSearchChange?: (value: string) => void
}

export default function Header({ title, onSearchChange }: Props) {
  const [search, setSearch] = useState('')
  const [isMax, setIsMax] = useState(false)

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
    <div className="sticky top-0 z-20 border-b border-app-border/50 bg-app-surface/70 backdrop-blur-xl">
      <div className="titlebar flex h-12 items-center">
        <div className="flex items-center gap-2.5 pl-4 pr-2">
          <img src={appLogo} className="h-7 w-7 rounded-lg shadow-sm ring-1 ring-brand-300/30" draggable={false} />
          <div className="text-sm font-semibold tracking-wide text-app-text">ToolsX</div>
        </div>

        <div className="flex-1" title={title} />

        <div className="flex items-center gap-3 px-3">
          <div className="relative hidden w-[280px] sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted/70" />
            <input
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const v = e.currentTarget.value
                setSearch(v)
                onSearchChange?.(v)
              }}
              placeholder="搜索工具..."
              className="w-full rounded-xl border border-app-border/60 bg-app-surface2/80 px-9 py-1.5 text-sm text-app-text shadow-sm outline-none transition-all duration-150 placeholder:text-app-muted/60 focus:border-brand-300 focus:bg-app-surface focus:shadow-md focus:ring-2 focus:ring-brand-200/30"
            />

            {search.trim() ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-app-muted/70 transition-colors hover:bg-app-surface hover:text-app-text"
                title="清除"
                onClick={() => {
                  setSearch('')
                  onSearchChange?.('')
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <SettingsModal />
        </div>

        <div className="flex h-12 w-[138px] items-stretch justify-end">
          <button
            className="flex w-[46px] items-center justify-center text-app-muted/80 transition-colors hover:bg-app-surface2/80 hover:text-app-text"
            onClick={() => window.toolsx.windowControls.minimize()}
            title="最小化"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            className="flex w-[46px] items-center justify-center text-app-muted/80 transition-colors hover:bg-app-surface2/80 hover:text-app-text"
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
            className="flex w-[46px] items-center justify-center text-app-muted/80 transition-colors hover:bg-red-500/90 hover:text-white"
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
