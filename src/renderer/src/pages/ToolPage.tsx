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

 function clamp01(v: number) {
   return Math.max(0, Math.min(1, v))
 }

export default function ToolPage() {
  const { toolId } = useParams()
  const navigate = useNavigate()

  const [backBtnXPct, setBackBtnXPct] = useState(0.03)
  const [backBtnYPct, setBackBtnYPct] = useState(0.2)
  const [backBtnReady, setBackBtnReady] = useState(false)
  const backBtnRef = useRef<HTMLButtonElement | null>(null)
  const dragRafRef = useRef<number | null>(null)
  const backBtnPosPxRef = useRef<{ x: number; y: number } | null>(null)
  const backBtnPosPctRef = useRef<{ xPct: number; yPct: number }>({ xPct: 0.03, yPct: 0.2 })
  const dragRef = useRef<{
    dragging: boolean
    startClientX: number
    startClientY: number
    startX: number
    startY: number
    moved: boolean
    latestClientX: number
    latestClientY: number
  } | null>(null)

  const tool = useMemo(() => tools.find((t) => t.id === toolId), [toolId])

  useEffect(() => {
    let cancelled = false
    window.toolsx.uiPrefs
      .getBackButtonPos()
      .then((res) => {
        if (cancelled) return
        const xPct = Number.isFinite(res?.xPct) ? res.xPct : 0.03
        const yPct = Number.isFinite(res?.yPct) ? res.yPct : 0.2
        setBackBtnXPct(clamp01(xPct))
        setBackBtnYPct(clamp01(yPct))
        backBtnPosPctRef.current = { xPct: clamp01(xPct), yPct: clamp01(yPct) }
        setBackBtnReady(true)
      })
      .catch(() => {
        if (!cancelled) setBackBtnReady(true)
      })

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

  const setBackBtnPosPx = (x: number, y: number) => {
    const el = backBtnRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const halfW = rect.width / 2
    const halfH = rect.height / 2
    const PADDING = 12

    const minX = PADDING + halfW
    const maxX = Math.max(minX, window.innerWidth - PADDING - halfW)
    const minY = PADDING + halfH
    const maxY = Math.max(minY, window.innerHeight - PADDING - halfH)

    const clampedX = Math.max(minX, Math.min(maxX, x))
    const clampedY = Math.max(minY, Math.min(maxY, y))

    backBtnPosPxRef.current = { x: clampedX, y: clampedY }
    el.style.left = `${clampedX}px`
    el.style.top = `${clampedY}px`
  }

  useEffect(() => {
    if (!backBtnReady) return
    // 初次渲染后把按钮位置校准到 px（考虑按钮尺寸 + 12px 边距）
    const x = backBtnPosPctRef.current.xPct * window.innerWidth
    const y = backBtnPosPctRef.current.yPct * window.innerHeight
    setBackBtnPosPx(x, y)
  }, [backBtnReady])

  useEffect(() => {
    if (!backBtnReady) return

    const onResize = () => {
      const x = backBtnPosPctRef.current.xPct * window.innerWidth
      const y = backBtnPosPctRef.current.yPct * window.innerHeight
      setBackBtnPosPx(x, y)
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [backBtnReady])

  return (
    <div className="app-gradient-bg flex h-full min-h-0 flex-col">
      <Header title={tool?.title ?? '工具'} />

      {backBtnReady ? (
        <button
          ref={backBtnRef}
          className="fixed z-30 touch-none select-none rounded-full bg-gradient-to-br from-brand-500 to-brand-600 p-3 text-white shadow-lg shadow-brand-600/20 ring-1 ring-brand-400/30 transition-all duration-150 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-600/25"
          style={{ left: backBtnLeft, top: backBtnTop, transform: 'translate(-50%, -50%)' }}
          onPointerDown={(e) => {
            if (e.button !== 0) return
            e.preventDefault()
            ;(e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId)

            const el = backBtnRef.current
            const rect = el?.getBoundingClientRect()
            const startX = backBtnPosPxRef.current?.x ?? (rect ? rect.left + rect.width / 2 : e.clientX)
            const startY = backBtnPosPxRef.current?.y ?? (rect ? rect.top + rect.height / 2 : e.clientY)

            dragRef.current = {
              dragging: true,
              startClientX: e.clientX,
              startClientY: e.clientY,
              startX,
              startY,
              moved: false,
              latestClientX: e.clientX,
              latestClientY: e.clientY
            }
          }}
          onPointerMove={(e) => {
            const st = dragRef.current
            if (!st?.dragging) return
            e.preventDefault()

            st.latestClientX = e.clientX
            st.latestClientY = e.clientY

            if (dragRafRef.current != null) return
            dragRafRef.current = window.requestAnimationFrame(() => {
              dragRafRef.current = null
              const st2 = dragRef.current
              if (!st2?.dragging) return

              const dx = st2.latestClientX - st2.startClientX
              const dy = st2.latestClientY - st2.startClientY
              if (Math.abs(dx) > 2 || Math.abs(dy) > 2) st2.moved = true

              const nextX = st2.startX + dx
              const nextY = st2.startY + dy
              setBackBtnPosPx(nextX, nextY)
            })
          }}
          onPointerUp={async (e) => {
            const st = dragRef.current
            dragRef.current = null

            if (dragRafRef.current != null) {
              window.cancelAnimationFrame(dragRafRef.current)
              dragRafRef.current = null
            }

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

            const posPx = backBtnPosPxRef.current
            if (!posPx) return

            const xPct = clamp01(posPx.x / window.innerWidth)
            const yPct = clamp01(posPx.y / window.innerHeight)

            backBtnPosPctRef.current = { xPct, yPct }
            setBackBtnXPct(xPct)
            setBackBtnYPct(yPct)

            // 拖拽结束后持久化位置
            try {
              const pos = { xPct, yPct }
              await window.toolsx.uiPrefs.setBackButtonPos(pos)
            } catch {
              // ignore
            }
          }}
          onPointerCancel={(e) => {
            dragRef.current = null

            if (dragRafRef.current != null) {
              window.cancelAnimationFrame(dragRafRef.current)
              dragRafRef.current = null
            }
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
      ) : null}

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
