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

  // 说明：内部状态机管理 modal 的挂载与动画阶段
  const [phase, setPhase] = useState<Phase>('closed')
  const contentRef = useRef<HTMLDivElement | null>(null)

  // 入场：open 变为 true 时挂载并播放入场动画
  useEffect(() => {
    if (open && phase === 'closed') {
      setPhase('enter')
    }
  }, [open, phase])

  // 入场动画结束后进入 idle
  const handleContentAnimEnd = useCallback(() => {
    if (phase === 'enter') {
      setPhase('idle')
    }
    // 出场动画结束后真正卸载并通知父组件
    if (phase === 'exit') {
      setPhase('closed')
      onClose()
    }
  }, [phase, onClose])

  // 关闭：先播放出场动画
  const handleClose = useCallback(() => {
    if (phase === 'closed' || phase === 'exit') return
    setPhase('exit')
  }, [phase])

  // ESC 关闭
  useEffect(() => {
    if (phase !== 'idle' && phase !== 'enter') return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // 说明：输入框内按 ESC 不关闭弹窗，避免误操作
      const t = e.target as HTMLElement | null
      const tag = t?.tagName?.toLowerCase()
      const isTypingTarget =
        tag === 'input' || tag === 'textarea' || tag === 'select' || Boolean((t as HTMLElement | null)?.isContentEditable)
      if (isTypingTarget) return

      e.preventDefault()
      handleClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [phase, handleClose])

  if (phase === 'closed') return null

  const overlayClass =
    phase === 'exit' ? 'modal-overlay-exit' : 'modal-overlay-enter'
  const contentClass =
    phase === 'exit' ? 'modal-content-exit' : 'modal-content-enter'

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      {/* 遮罩 */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${overlayClass}`}
        onClick={handleClose}
      />

      {/* 弹窗内容 */}
      <div
        ref={contentRef}
        className={`relative z-10 flex h-[92vh] w-[95vw] max-w-7xl flex-col overflow-hidden rounded-2xl border border-app-border/50 bg-app-surface shadow-2xl ${contentClass}`}
        onAnimationEnd={handleContentAnimEnd}
      >
        {/* 标题栏 */}
        <div className="flex shrink-0 items-center justify-between border-b border-app-border/40 px-5 py-3">
          <div>
            <div className="text-base font-semibold text-app-text">{tool?.title ?? '工具'}</div>
            {tool?.description ? (
              <div className="mt-0.5 text-xs text-app-muted/70">{tool.description}</div>
            ) : null}
          </div>

          <button
            className="rounded-lg p-2 text-app-muted/70 transition-colors hover:bg-app-surface2 hover:text-app-text"
            onClick={handleClose}
            title="关闭 (Esc)"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

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
            <div className="mx-auto max-w-5xl px-6 py-6">
              <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
                <div className="text-lg font-semibold text-app-text">{tool?.title ?? '未找到该工具'}</div>
                <div className="mt-2 text-sm text-app-muted">{tool?.description ?? '请返回首页选择工具。'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
