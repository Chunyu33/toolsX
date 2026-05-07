import type { ReactNode } from 'react'
import { X } from 'lucide-react'

type Props = {
  title: string
  description?: string
  /** 左侧设置区内容 */
  settings: ReactNode
  /** 右侧主操作/预览区内容 */
  children: ReactNode
  /** 关闭回调 */
  onClose?: () => void
}

/**
 * 微信风格通用工具容器
 * 左栏 240px 浅灰设置区 + 右栏纯白主内容区，中间细线分隔
 */
export default function StandardToolWrapper({ title, description, settings, children, onClose }: Props) {
  return (
    <div className="flex h-full flex-col bg-app-bg">
      {/* 顶部标题栏 */}
      <div className="flex shrink-0 items-center justify-between border-b border-app-border bg-app-surface px-4 py-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-app-text truncate">{title}</div>
          {description ? (
            <div className="mt-0.5 text-xs text-app-muted truncate">{description}</div>
          ) : null}
        </div>

        {onClose ? (
          <button
            className="ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-app-muted hover:bg-app-surface2 hover:text-app-text"
            onClick={onClose}
            title="关闭"
            type="button"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        ) : null}
      </div>

      {/* 双栏主体 */}
      <div className="flex min-h-0 flex-1">
        {/* 左侧设置区 — 240px */}
        <div className="w-[240px] shrink-0 overflow-y-auto border-r border-app-border bg-app-surface2 p-3">
          {settings}
        </div>

        {/* 右侧主内容区 — 纯白 */}
        <div className="min-w-0 flex-1 overflow-y-auto bg-app-surface p-4">
          {children}
        </div>
      </div>
    </div>
  )
}
