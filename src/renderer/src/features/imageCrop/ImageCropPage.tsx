import { useEffect, useMemo, useRef, useState } from 'react'
import { Crop, Download, Eraser, Image as ImageIcon, Lock, Unlock } from 'lucide-react'
import LoadingOverlay from '../../components/LoadingOverlay'
import Toast from '../../components/Toast'
import { toLocalfileUrl } from '../videoToGif/utils'

type CropRect = { x: number; y: number; w: number; h: number }

type CornerFlags = { tl: boolean; tr: boolean; br: boolean; bl: boolean }

type CropMode = 'custom' | 'round'

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function normRect(r: CropRect): CropRect {
  const x1 = Math.min(r.x, r.x + r.w)
  const y1 = Math.min(r.y, r.y + r.h)
  const x2 = Math.max(r.x, r.x + r.w)
  const y2 = Math.max(r.y, r.y + r.h)
  return { x: x1, y: y1, w: Math.max(1, x2 - x1), h: Math.max(1, y2 - y1) }
}

export default function ImageCropPage() {
  const [toastOpen, setToastOpen] = useState(false)
  const [toastText, setToastText] = useState('')
  const showToast = (text: string) => {
    setToastText(text)
    setToastOpen(true)
  }

  const [busy, setBusy] = useState(false)
  const [picking, setPicking] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)

  const [inputPath, setInputPath] = useState<string>('')
  const imgRef = useRef<HTMLImageElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  // 说明：cropRect 是基于“图片展示区域”的坐标（CSS 像素），最终会换算成原图像素发给主进程
  const [cropRect, setCropRect] = useState<CropRect | null>(null)
  const [dragging, setDragging] = useState<
    | null
    | {
        mode: 'new' | 'move' | 'resize'
        startX: number
        startY: number
        base?: CropRect
        handle?: 'nw' | 'ne' | 'se' | 'sw'
      }
  >(null)

  const [mode, setMode] = useState<CropMode>('custom')
  const [lockSquare, setLockSquare] = useState(false)

  const [hoverCursor, setHoverCursor] = useState<
    'crosshair' | 'move' | 'nwse-resize' | 'nesw-resize'
  >('crosshair')

  // 圆角参数（主要用于 app icon）
  const [roundRadius, setRoundRadius] = useState(120)
  const [corners, setCorners] = useState<CornerFlags>({ tl: true, tr: true, br: true, bl: true })

  const [outputPath, setOutputPath] = useState<string>('')
  const [tempDirs, setTempDirs] = useState<string[]>([])

  const previewUrl = useMemo(() => {
    if (!inputPath) return ''
    return toLocalfileUrl(inputPath)
  }, [inputPath])

  const outputUrl = useMemo(() => {
    if (!outputPath) return ''
    return toLocalfileUrl(outputPath)
  }, [outputPath])

  useEffect(() => {
    // 说明：页面卸载时尽量清理临时目录
    return () => {
      if (tempDirs.length > 0) {
        void window.toolsx.files.cleanupTempImages({ tempDirs })
      }
    }
  }, [tempDirs])

  const pickImage = async () => {
    setErrorText(null)
    try {
      // 说明：打开系统文件选择对话框不应显示 loading（避免挡住系统对话框/视觉干扰）
      setPicking(true)
      const res = await window.toolsx.files.openImage()
      if (res.canceled || !res.filePath) return

      // 说明：切换输入时先清理旧的输出临时目录
      if (tempDirs.length > 0) {
        try {
          await window.toolsx.files.cleanupTempImages({ tempDirs })
        } catch {
          // ignore
        }
      }

      setInputPath(res.filePath)
      setCropRect(null)
      setOutputPath('')
      setTempDirs([])
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    } finally {
      setPicking(false)
    }
  }

  const clearAll = async () => {
    setErrorText(null)
    setInputPath('')
    setCropRect(null)
    setOutputPath('')

    if (tempDirs.length > 0) {
      try {
        await window.toolsx.files.cleanupTempImages({ tempDirs })
      } catch {
        // ignore
      }
    }
    setTempDirs([])
  }

  function getImageBox(): { left: number; top: number; width: number; height: number } {
    const wrap = wrapRef.current
    if (!wrap) throw new Error('预览区域未就绪')
    const rect = wrap.getBoundingClientRect()
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  }

  function getNaturalSize(): { w: number; h: number } {
    const img = imgRef.current
    if (!img) throw new Error('图片未加载')
    const w = img.naturalWidth
    const h = img.naturalHeight
    if (!w || !h) throw new Error('无法读取图片尺寸')
    return { w, h }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!inputPath) return
    if (busy) return

    const target = e.target as HTMLElement
    // 说明：
    // - 点在裁剪框角点上 => 缩放
    // - 点在裁剪框上 => 移动
    // - 其它位置 => 新建裁剪框
    const handle = (target?.dataset?.cropHandle as 'nw' | 'ne' | 'se' | 'sw' | undefined) ?? undefined
    const isOnBox = target?.dataset?.crop === 'box'

    const box = getImageBox()
    const x = clamp(e.clientX - box.left, 0, box.width)
    const y = clamp(e.clientY - box.top, 0, box.height)

    if (handle && cropRect) {
      setDragging({ mode: 'resize', handle, startX: x, startY: y, base: cropRect })
    } else if (isOnBox && cropRect) {
      setDragging({ mode: 'move', startX: x, startY: y, base: cropRect })
    } else {
      setDragging({ mode: 'new', startX: x, startY: y })
      setCropRect({ x, y, w: 1, h: 1 })
    }

    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    // 说明：未在拖拽时，鼠标指针给出“可操作性反馈”
    if (!dragging) {
      const target = e.target as HTMLElement
      const handle = (target?.dataset?.cropHandle as 'nw' | 'ne' | 'se' | 'sw' | undefined) ?? undefined
      const isOnBox = target?.dataset?.crop === 'box'
      if (handle === 'nw' || handle === 'se') setHoverCursor('nwse-resize')
      else if (handle === 'ne' || handle === 'sw') setHoverCursor('nesw-resize')
      else if (isOnBox) setHoverCursor('move')
      else setHoverCursor('crosshair')
      return
    }

    const box = getImageBox()
    const x = clamp(e.clientX - box.left, 0, box.width)
    const y = clamp(e.clientY - box.top, 0, box.height)

    if (dragging.mode === 'new') {
      const dx = x - dragging.startX
      const dy = y - dragging.startY

      if (lockSquare || mode === 'round') {
        const s = Math.max(Math.abs(dx), Math.abs(dy))
        const w = dx >= 0 ? s : -s
        const h = dy >= 0 ? s : -s
        setCropRect(normRect({ x: dragging.startX, y: dragging.startY, w, h }))
      } else {
        setCropRect(normRect({ x: dragging.startX, y: dragging.startY, w: dx, h: dy }))
      }
      return
    }

    if (dragging.mode === 'move' && dragging.base) {
      // 说明：移动裁剪框时，保持裁剪框尺寸不变，并限制在图片边界内
      const base = dragging.base
      const nx = clamp(base.x + (x - dragging.startX), 0, box.width - base.w)
      const ny = clamp(base.y + (y - dragging.startY), 0, box.height - base.h)
      setCropRect({ x: nx, y: ny, w: base.w, h: base.h })
    }

    if (dragging.mode === 'resize' && dragging.base && dragging.handle) {
      const base = dragging.base

      // 说明：四角缩放：以对角为锚点重新计算矩形。
      // 基于 base（上一次确定的矩形）做增量计算，避免累计误差。
      const left = base.x
      const top = base.y
      const right = base.x + base.w
      const bottom = base.y + base.h

      // 说明：根据拖拽角点决定锚点（anchor）和当前移动点（moving）
      const anchor =
        dragging.handle === 'nw'
          ? { ax: right, ay: bottom }
          : dragging.handle === 'ne'
            ? { ax: left, ay: bottom }
            : dragging.handle === 'se'
              ? { ax: left, ay: top }
              : { ax: right, ay: top }

      let mx = x
      let my = y

      // 说明：锁 1:1 时，让拖拽点保持正方形（取更大的边长）
      if (lockSquare || mode === 'round') {
        const dx = mx - anchor.ax
        const dy = my - anchor.ay
        const s = Math.max(Math.abs(dx), Math.abs(dy))
        mx = anchor.ax + (dx >= 0 ? s : -s)
        my = anchor.ay + (dy >= 0 ? s : -s)
      }

      const nx1 = clamp(Math.min(anchor.ax, mx), 0, box.width - 1)
      const ny1 = clamp(Math.min(anchor.ay, my), 0, box.height - 1)
      const nx2 = clamp(Math.max(anchor.ax, mx), 1, box.width)
      const ny2 = clamp(Math.max(anchor.ay, my), 1, box.height)

      setCropRect({ x: nx1, y: ny1, w: Math.max(1, nx2 - nx1), h: Math.max(1, ny2 - ny1) })
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return
    setDragging(null)
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }

  const runCrop = async () => {
    setErrorText(null)
    setBusy(true)
    try {
      if (!inputPath) throw new Error('请先选择图片')
      if (!cropRect) throw new Error('请在预览图上拖拽选择裁剪区域')

      const imgBox = getImageBox()
      const nat = getNaturalSize()

      // 说明：将 CSS 像素坐标换算到原图像素坐标，交给主进程 sharp 做真实裁剪
      const sx = nat.w / imgBox.width
      const sy = nat.h / imgBox.height

      const r = normRect(cropRect)
      const px = Math.round(r.x * sx)
      const py = Math.round(r.y * sy)
      const pw = Math.round(r.w * sx)
      const ph = Math.round(r.h * sy)

      // 说明：两种模式：
      // - 自定义：仅做矩形裁剪（round.radius=0）
      // - 圆角：矩形裁剪 + 透明圆角（可选四角）
      const res = await window.toolsx.imageCrop.process({
        inputPath,
        rect: { x: px, y: py, width: pw, height: ph },
        round: mode === 'round' ? { radius: Math.max(0, Math.round(roundRadius)), corners } : { radius: 0, corners }
      })

      // 说明：新结果产出前先清理旧临时目录
      if (tempDirs.length > 0) {
        try {
          await window.toolsx.files.cleanupTempImages({ tempDirs })
        } catch {
          // ignore
        }
      }

      setOutputPath(res.outputPath)
      setTempDirs([res.tempDir])
      showToast('裁剪完成（已生成临时文件）')
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const saveOutput = async () => {
    setErrorText(null)
    setBusy(true)
    try {
      if (!outputPath) throw new Error('请先裁剪生成结果')
      const res = await window.toolsx.files.saveImage({ sourcePath: outputPath, defaultName: 'cropped.png' })
      if (!res.canceled && res.savedPath) {
        showToast(`已保存：${res.savedPath}`)
      }
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative mx-auto max-w-6xl px-6 py-6">
      <Toast open={toastOpen} message={toastText} onClose={() => setToastOpen(false)} />
      <LoadingOverlay open={busy} text="处理中..." />

      <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-app-text">图片裁剪</div>
            <div className="mt-1 text-sm text-app-muted">矩形裁剪 + 圆角裁剪。</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              onClick={pickImage}
              disabled={busy || picking}
              type="button"
            >
              <ImageIcon className="h-4 w-4" />
              选择图片
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2 disabled:opacity-60"
              onClick={clearAll}
              disabled={busy || picking}
              type="button"
            >
              <Eraser className="h-4 w-4" />
              清空
            </button>
          </div>
        </div>

        {errorText ? (
          <div className="mt-4 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-red-600">{errorText}</div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-1">
            <div className="text-sm font-semibold text-app-text">参数</div>

            <div className="mt-3 flex items-center gap-2">
              <button
                className={
                  'inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ' +
                  (mode === 'custom'
                    ? 'border-brand-300 bg-brand-500/10 text-app-text'
                    : 'border-app-border bg-app-surface text-app-muted hover:bg-app-surface2')
                }
                onClick={() => {
                  setMode('custom')
                  setLockSquare(false)
                }}
                disabled={busy || picking}
                type="button"
              >
                自定义
              </button>
              <button
                className={
                  'inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ' +
                  (mode === 'round'
                    ? 'border-brand-300 bg-brand-500/10 text-app-text'
                    : 'border-app-border bg-app-surface text-app-muted hover:bg-app-surface2')
                }
                onClick={() => {
                  // 说明：进入“圆角模式”后，默认以 1:1 方式裁剪（更符合 Icon 场景）
                  setMode('round')
                  setLockSquare(true)
                }}
                disabled={busy || picking}
                type="button"
              >
                圆角
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-lg border border-app-border bg-app-surface px-3 py-2">
              <div className="text-xs text-app-muted">锁定 1:1</div>
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface2 px-2 py-1 text-xs text-app-text hover:bg-app-surface disabled:opacity-60"
                onClick={() => setLockSquare((v) => !v)}
                disabled={busy || picking || mode === 'round'}
                type="button"
              >
                {lockSquare ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                {lockSquare ? '已锁定' : '未锁定'}
              </button>
            </div>

            {mode === 'round' ? (
              <>
                <label className="mt-3 block text-xs text-app-muted">
                  圆角大小（像素）
                  <input
                    value={roundRadius}
                    onChange={(e) => setRoundRadius(Math.max(0, Number(e.target.value) || 0))}
                    type="number"
                    className="mt-2 w-full rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:border-brand-300"
                    disabled={busy || picking}
                  />
                </label>

                <div className="mt-3 rounded-xl border border-app-border bg-app-surface px-3 py-2">
                  <div className="text-xs text-app-muted">圆角位置</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-app-text">
                    {(
                      [
                        ['tl', '左上'],
                        ['tr', '右上'],
                        ['bl', '左下'],
                        ['br', '右下']
                      ] as const
                    ).map(([k, label]) => (
                      <label key={k} className="flex items-center gap-2">
                        <input
                          checked={corners[k]}
                          onChange={(e) => setCorners((c) => ({ ...c, [k]: e.target.checked }))}
                          type="checkbox"
                          disabled={busy || picking}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                onClick={runCrop}
                disabled={busy || !inputPath}
                type="button"
              >
                <Crop className="h-4 w-4" />
                裁剪
              </button>

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2 disabled:opacity-60"
                onClick={saveOutput}
                disabled={busy || !outputPath}
                type="button"
              >
                <Download className="h-4 w-4" />
                保存
              </button>
            </div>

            <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-muted">
              说明：
              <p>1）在右侧预览图上拖拽选区（可移动）。</p>
              <p>2）“裁剪”会在系统临时目录生成 PNG（带透明圆角）。</p>
              <p>3）点击“保存”只是把临时文件复制到你选择的位置。</p>
            </div>
          </div>

          <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-2">
            <div className="text-sm font-semibold text-app-text">预览</div>

            <div
              className="relative mt-3 overflow-hidden rounded-xl border border-app-border bg-app-surface"
              style={{ aspectRatio: '16 / 10' }}
            >
              {previewUrl ? (
                <div
                  ref={wrapRef}
                  className={
                    'relative h-full w-full select-none ' +
                    (hoverCursor === 'move'
                      ? 'cursor-move'
                      : hoverCursor === 'nwse-resize'
                        ? 'cursor-nwse-resize'
                        : hoverCursor === 'nesw-resize'
                          ? 'cursor-nesw-resize'
                          : 'cursor-crosshair')
                  }
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                >
                  <img ref={imgRef} src={previewUrl} className="h-full w-full object-contain" draggable={false} />

                  {cropRect ? (
                    <div
                      data-crop="box"
                      className="absolute border-2 border-brand-500 bg-brand-500/10"
                      style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h }}
                    >
                      <div
                        data-crop-handle="nw"
                        className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded bg-brand-600 cursor-nwse-resize"
                      />
                      <div
                        data-crop-handle="ne"
                        className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded bg-brand-600 cursor-nesw-resize"
                      />
                      <div
                        data-crop-handle="sw"
                        className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded bg-brand-600 cursor-nesw-resize"
                      />
                      <div
                        data-crop-handle="se"
                        className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded bg-brand-600 cursor-nwse-resize"
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-app-muted">请先选择图片，然后在这里拖拽选择裁剪区域</div>
              )}
            </div>

            <div className="mt-4">
              <div className="text-sm font-semibold text-app-text">输出预览</div>
              <div className="mt-2 overflow-hidden rounded-xl border border-app-border bg-app-surface">
                {outputUrl ? (
                  <div className="flex items-center justify-center p-6">
                    <img src={outputUrl} className="max-h-[280px] max-w-full" />
                  </div>
                ) : (
                  <div className="p-6 text-sm text-app-muted">裁剪完成后会在这里显示结果</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
