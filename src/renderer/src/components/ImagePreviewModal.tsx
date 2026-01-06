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
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="relative max-h-full w-full max-w-5xl overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-app-border bg-app-surface/80 px-4 py-3 backdrop-blur">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-app-text">{title ?? '预览'}</div>
              <div className="truncate text-xs text-app-muted">点击遮罩或按 ESC 关闭</div>
            </div>

            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-app-border bg-app-surface text-app-muted hover:bg-app-surface2 hover:text-app-text"
              onClick={onClose}
              title="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex max-h-[calc(100vh-160px)] items-center justify-center bg-black/10 p-4">
            <img src={src} className="max-h-full max-w-full select-none object-contain" draggable={false} />
          </div>
        </div>
      </div>
    </div>
  )
}
