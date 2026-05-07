import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function ImagePreviewModal(props: {
  open: boolean
  src: string | null
  title?: string
  onClose: () => void
}) {
  const { open, src, title, onClose } = props

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !src) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="relative max-h-full w-full max-w-5xl overflow-hidden rounded-sm border border-app-border bg-app-surface">
          <div className="flex items-center justify-between border-b border-app-border bg-app-surface2 px-4 py-2">
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-app-text">{title ?? '预览'}</div>
              <div className="truncate text-[11px] text-app-muted">点击遮罩或按 ESC 关闭</div>
            </div>

            <button
              className="flex h-6 w-6 items-center justify-center rounded-sm text-app-muted hover:bg-app-surface hover:text-app-text"
              onClick={onClose}
              title="关闭"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex max-h-[calc(100vh-140px)] items-center justify-center bg-app-bg p-4">
            <img src={src} className="max-h-full max-w-full select-none object-contain" draggable={false} alt="" />
          </div>
        </div>
      </div>
    </div>
  )
}
