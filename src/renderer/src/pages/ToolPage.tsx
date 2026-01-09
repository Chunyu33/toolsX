import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import Header from '../components/Header'
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

export default function ToolPage() {
  const { toolId } = useParams()
  const navigate = useNavigate()

  const [backBtnXPct, setBackBtnXPct] = useState(0.03)
  const [backBtnYPct, setBackBtnYPct] = useState(0.2)
  const dragRef = useRef<{
    dragging: boolean
    startClientX: number
    startClientY: number
    startXPct: number
    startYPct: number
    moved: boolean
  } | null>(null)

  const tool = useMemo(() => tools.find((t) => t.id === toolId), [toolId])

  useEffect(() => {
    let cancelled = false
    window.toolsx.uiPrefs
      .getBackButtonPos()
      .then((res) => {
        if (cancelled) return
        const xPct = Number.isFinite(res?.xPct) ? Math.max(0, Math.min(1, res.xPct)) : 0.03
        const yPct = Number.isFinite(res?.yPct) ? Math.max(0, Math.min(1, res.yPct)) : 0.2
        setBackBtnXPct(xPct)
        setBackBtnYPct(yPct)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return

      const t = e.target as HTMLElement | null
      const tag = t?.tagName?.toLowerCase()
      const isTypingTarget =
        tag === 'input' || tag === 'textarea' || tag === 'select' || Boolean((t as HTMLElement | null)?.isContentEditable)
      if (isTypingTarget) return

      e.preventDefault()
      if (window.history.length > 1) navigate(-1)
      else navigate('/')
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  const backBtnLeft = `${Math.max(0, Math.min(1, backBtnXPct)) * 100}%`
  const backBtnTop = `${Math.max(0, Math.min(1, backBtnYPct)) * 100}%`

  return (
    <div className="app-gradient-bg flex h-full min-h-0 flex-col">
      <Header title={tool?.title ?? '工具'} />

      <button
        className="fixed z-30 touch-none select-none rounded-full bg-brand-600 p-3 text-white shadow-lg shadow-brand-900/10 hover:bg-brand-700"
        style={{ left: backBtnLeft, top: backBtnTop, transform: 'translate(-50%, -50%)' }}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          ;(e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId)
          dragRef.current = {
            dragging: true,
            startClientX: e.clientX,
            startClientY: e.clientY,
            startXPct: backBtnXPct,
            startYPct: backBtnYPct,
            moved: false
          }
        }}
        onPointerMove={(e) => {
          const st = dragRef.current
          if (!st?.dragging) return
          const dx = e.clientX - st.startClientX
          const dy = e.clientY - st.startClientY
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) st.moved = true

          const nextXPct = st.startXPct + dx / window.innerWidth
          const nextYPct = st.startYPct + dy / window.innerHeight
          setBackBtnXPct(Math.max(0, Math.min(1, nextXPct)))
          setBackBtnYPct(Math.max(0, Math.min(1, nextYPct)))
        }}
        onPointerUp={async (e) => {
          const st = dragRef.current
          dragRef.current = null

          try {
            ;(e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId)
          } catch {
            // ignore
          }

          // 轻微点击不算拖拽：保持原有“返回首页”行为
          if (!st?.moved) {
            navigate('/')
            return
          }

          // 拖拽结束后持久化位置
          try {
            await window.toolsx.uiPrefs.setBackButtonPos({ xPct: backBtnXPct, yPct: backBtnYPct })
          } catch {
            // ignore
          }
        }}
        onPointerCancel={(e) => {
          dragRef.current = null
          try {
            ;(e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId)
          } catch {
            // ignore
          }
        }}
        title="返回首页"
        type="button"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div key={toolId} className="page-enter min-h-0 flex-1 overflow-y-auto">
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

              <div className="mt-6 rounded-lg border border-app-border bg-app-surface2 p-4 text-sm text-app-text">
                这里是占位页面：后续你可以把每个工具拆成独立的 feature 模块（页面 + hooks + ipc + 业务逻辑）。
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
