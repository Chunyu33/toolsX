import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { tools } from '../features/tools/data'
import VideoToGifPage from '../features/videoToGif/VideoToGifPage'
import ImageConvertPage from '../features/imageConvert/ImageConvertPage'
import ImageCompressPage from '../features/imageCompress/ImageCompressPage'
import ImageCropPage from '../features/imageCrop/ImageCropPage'
import SvgToolPage from '../features/svgTool/SvgToolPage'
import TimestampConvertPage from '../features/timestampConvert/TimestampConvertPage'
import Base64ToolPage from '../features/base64Tool/Base64ToolPage'
import QrToolPage from '../features/qrTool/QrToolPage'
import PdfToolPage from '../features/pdfTool/PdfToolPage'
import JsonFormatterPage from '../features/jsonFormatter/JsonFormatterPage'

type Props = {
  toolId: string
  open: boolean
  onClose: () => void
}

type Phase = 'closed' | 'enter' | 'idle' | 'exit'

export default function ToolModal({ toolId, open, onClose }: Props) {
  const tool = useMemo(() => tools.find((t) => t.id === toolId), [toolId])

  const [phase, setPhase] = useState<Phase>('closed')
  const contentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (open && phase === 'closed') setPhase('enter')
  }, [open, phase])

  const handleContentAnimEnd = useCallback(() => {
    if (phase === 'enter') setPhase('idle')
    if (phase === 'exit') { setPhase('closed'); onClose() }
  }, [phase, onClose])

  const handleClose = useCallback(() => {
    if (phase === 'closed' || phase === 'exit') return
    setPhase('exit')
  }, [phase])

  // ESC 关闭
  useEffect(() => {
    if (phase !== 'idle' && phase !== 'enter') return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const t = e.target as HTMLElement | null
      const tag = t?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || Boolean((t as HTMLElement | null)?.isContentEditable)) return

      e.preventDefault()
      handleClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [phase, handleClose])

  if (phase === 'closed') return null

  const overlayClass = phase === 'exit' ? 'modal-overlay-exit' : 'modal-overlay-enter'
  const contentClass = phase === 'exit' ? 'modal-content-exit' : 'modal-content-enter'

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div
        className={`absolute inset-0 bg-black/40 ${overlayClass}`}
        onClick={handleClose}
      />

      <div
        ref={contentRef}
        className={`relative z-10 flex h-[90vh] w-[96vw] max-w-6xl flex-col overflow-hidden rounded-sm border border-app-border bg-white ${contentClass}`}
        onAnimationEnd={handleContentAnimEnd}
      >
        {/* 关闭按钮 */}
        <button
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-sm text-app-muted hover:bg-app-surface2 hover:text-app-text"
          onClick={handleClose}
          title="关闭 (Esc)"
          type="button"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>

        {/* 工具内容 */}
        <div key={toolId} className="min-h-0 flex-1 overflow-y-auto">
          {toolId === 'video-to-gif' ? (
            <VideoToGifPage />
          ) : toolId === 'image-convert' ? (
            <ImageConvertPage />
          ) : toolId === 'image-compress' ? (
            <ImageCompressPage />
          ) : toolId === 'image-crop' ? (
            <ImageCropPage />
          ) : toolId === 'svg-tool' ? (
            <SvgToolPage />
          ) : toolId === 'timestamp-convert' ? (
            <TimestampConvertPage />
          ) : toolId === 'base64-tool' ? (
            <Base64ToolPage />
          ) : toolId === 'qr-tool' ? (
            <QrToolPage />
          ) : toolId === 'pdf-tool' ? (
            <PdfToolPage />
          ) : toolId === 'json-formatter' ? (
            <JsonFormatterPage />
          ) : (
            <div className="p-6">
              <div className="rounded-sm border border-app-border bg-white p-4">
                <div className="text-sm font-medium text-app-text">{tool?.title ?? '未找到该工具'}</div>
                <div className="mt-1 text-xs text-app-muted">{tool?.description ?? '请返回首页选择工具。'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
