import { useEffect, useMemo, useState } from 'react'
import { Download, Eraser, FileImage, FileText, Wand2 } from 'lucide-react'
import LoadingOverlay from '../../components/LoadingOverlay'
import Toast from '../../components/Toast'
import { toLocalfileUrl } from '../videoToGif/utils'

type RenderFormat = 'png' | 'jpeg' | 'webp'

function svgToDataUrl(svg: string): string {
  // 说明：使用 encodeURIComponent 生成 data URL，用于安全地做“预览”，避免 innerHTML 注入。
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function clampInt(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, Math.round(v)))
}

export default function SvgToolPage() {
  const [toastOpen, setToastOpen] = useState(false)
  const [toastText, setToastText] = useState('')
  const showToast = (text: string) => {
    setToastText(text)
    setToastOpen(true)
  }

  const [busy, setBusy] = useState(false)
  const [picking, setPicking] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)

  const [svgText, setSvgText] = useState<string>(
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">\n' +
      '  <rect x="64" y="64" width="384" height="384" rx="96" fill="#0ea5e9"/>\n' +
      '  <text x="256" y="290" font-size="120" text-anchor="middle" fill="#ffffff" font-family="ui-sans-serif, system-ui">SVG</text>\n' +
      '</svg>'
  )

  const [format, setFormat] = useState<RenderFormat>('png')
  const [lockRatio, setLockRatio] = useState(true)
  const [width, setWidth] = useState(512)
  const [height, setHeight] = useState(512)
  const [density, setDensity] = useState(144)
  const [jpegBg, setJpegBg] = useState('#ffffff')

  const [outputPath, setOutputPath] = useState<string>('')
  const [tempDirs, setTempDirs] = useState<string[]>([])

  const previewUrl = useMemo(() => {
    const s = svgText.trim()
    if (!s) return ''
    if (!s.includes('<svg')) return ''
    return svgToDataUrl(s)
  }, [svgText])

  const outputUrl = useMemo(() => (outputPath ? toLocalfileUrl(outputPath) : ''), [outputPath])

  useEffect(() => {
    // 说明：页面卸载时尽量清理临时目录
    return () => {
      if (tempDirs.length > 0) void window.toolsx.files.cleanupTempImages({ tempDirs })
    }
  }, [tempDirs])

  const openSvgFile = async () => {
    setErrorText(null)
    try {
      // 说明：打开系统对话框不显示 loading，避免遮挡。
      setPicking(true)
      const res = await window.toolsx.svgTool.openSvg()
      if (res.canceled || !res.text) return

      setSvgText(res.text)
      setOutputPath('')

      // 说明：切换输入时清理旧输出
      if (tempDirs.length > 0) {
        try {
          await window.toolsx.files.cleanupTempImages({ tempDirs })
        } catch {
          // ignore
        }
      }
      setTempDirs([])
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    } finally {
      setPicking(false)
    }
  }

  const saveSvgFile = async () => {
    setErrorText(null)
    try {
      setPicking(true)
      const res = await window.toolsx.svgTool.saveSvg({ text: svgText, defaultName: 'image.svg' })
      if (!res.canceled && res.savedPath) showToast(`已保存：${res.savedPath}`)
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    } finally {
      setPicking(false)
    }
  }

  const clearAll = async () => {
    setErrorText(null)
    setOutputPath('')
    setSvgText('')

    if (tempDirs.length > 0) {
      try {
        await window.toolsx.files.cleanupTempImages({ tempDirs })
      } catch {
        // ignore
      }
    }
    setTempDirs([])
  }

  const renderAndExport = async () => {
    setErrorText(null)
    setBusy(true)
    try {
      const s = svgText.trim()
      if (!s) throw new Error('请先输入 SVG 代码')

      const w = clampInt(width, 1, 10000)
      const h = clampInt(height, 1, 10000)
      const d = clampInt(density, 72, 600)

      // 说明：JPEG 需要背景色；PNG/WebP 可保留透明。
      const bg =
        format === 'jpeg'
          ? {
              r: parseInt(jpegBg.slice(1, 3), 16),
              g: parseInt(jpegBg.slice(3, 5), 16),
              b: parseInt(jpegBg.slice(5, 7), 16)
            }
          : undefined

      const res = await window.toolsx.svgTool.render({
        svgText: s,
        format,
        width: w,
        height: h,
        density: d,
        background: bg
      })

      // 说明：新结果生成前清理旧临时目录，避免堆积
      if (tempDirs.length > 0) {
        try {
          await window.toolsx.files.cleanupTempImages({ tempDirs })
        } catch {
          // ignore
        }
      }

      setOutputPath(res.outputPath)
      setTempDirs([res.tempDir])

      // 说明：调用系统保存对话框把临时文件复制到用户选择的位置
      const ext = format === 'jpeg' ? 'jpg' : format
      const saved = await window.toolsx.files.saveImage({ sourcePath: res.outputPath, defaultName: `output.${ext}` })
      if (!saved.canceled && saved.savedPath) showToast(`已保存：${saved.savedPath}`)
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative mx-auto max-w-6xl px-6 py-6">
      <Toast open={toastOpen} message={toastText} onClose={() => setToastOpen(false)} />
      <LoadingOverlay open={busy} text="渲染中..." />

      <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-app-text">SVG 转换</div>
            <div className="mt-1 text-sm text-app-muted">编辑 SVG 代码并预览，导出为 PNG/JPG/WebP（本地离线）</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              onClick={openSvgFile}
              disabled={busy || picking}
              type="button"
            >
              <FileText className="h-4 w-4" />
              打开 SVG
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2 disabled:opacity-60"
              onClick={saveSvgFile}
              disabled={busy || picking || !svgText.trim()}
              type="button"
            >
              <Download className="h-4 w-4" />
              保存 SVG
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
            <div className="text-sm font-semibold text-app-text">导出设置</div>

            <div className="mt-3">
              <div className="text-xs font-semibold text-app-text">格式</div>
              <select
                className="mt-1 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:border-brand-300"
                value={format}
                onChange={(e) => setFormat(e.target.value as RenderFormat)}
                disabled={busy || picking}
              >
                <option value="png">PNG（透明）</option>
                <option value="webp">WebP</option>
                <option value="jpeg">JPG（可选背景）</option>
              </select>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block text-xs text-app-muted">
                宽度
                <input
                  type="number"
                  value={width}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 0
                    setWidth(v)
                    if (lockRatio) setHeight(v)
                  }}
                  className="mt-1 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:border-brand-300"
                  disabled={busy || picking}
                />
              </label>
              <label className="block text-xs text-app-muted">
                高度
                <input
                  type="number"
                  value={height}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 0
                    setHeight(v)
                    if (lockRatio) setWidth(v)
                  }}
                  className="mt-1 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:border-brand-300"
                  disabled={busy || picking}
                />
              </label>
            </div>

            <label className="mt-3 flex items-center gap-2 text-xs text-app-muted">
              <input checked={lockRatio} onChange={(e) => setLockRatio(e.target.checked)} type="checkbox" disabled={busy || picking} />
              锁定宽高（1:1）
            </label>

            <label className="mt-3 block text-xs text-app-muted">
              清晰度（DPI）
              <input
                type="number"
                value={density}
                onChange={(e) => setDensity(Number(e.target.value) || 0)}
                className="mt-1 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:border-brand-300"
                disabled={busy || picking}
              />
            </label>

            {format === 'jpeg' ? (
              <label className="mt-3 block text-xs text-app-muted">
                JPG 背景
                <input
                  type="color"
                  value={jpegBg}
                  onChange={(e) => setJpegBg(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-app-border bg-app-surface px-2 py-1"
                  disabled={busy || picking}
                />
              </label>
            ) : null}

            <button
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              onClick={renderAndExport}
              disabled={busy || picking || !svgText.trim()}
              type="button"
            >
              <Wand2 className="h-4 w-4" />
              导出图片
            </button>

            <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-muted">
              <p>说明：</p>
              <p>1）左侧输入 SVG 代码，右侧实时预览。</p>
              <p>2）导出时主进程用 sharp 渲染 SVG 并写入临时目录。</p>
              <p>3）随后弹出保存对话框，将临时文件复制到你选择的位置。</p>
            </div>
          </div>

          <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-2">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <div className="text-sm font-semibold text-app-text">SVG 代码</div>
                <textarea
                  value={svgText}
                  onChange={(e) => setSvgText(e.target.value)}
                  spellCheck={false}
                  className="mt-2 h-[420px] w-full resize-none rounded-xl border border-app-border bg-app-surface px-3 py-2 font-mono text-xs text-app-text outline-none focus:border-brand-300"
                  placeholder="粘贴或输入 SVG 代码..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-app-text">预览</div>
                  {outputPath ? (
                    <div className="inline-flex items-center gap-2 text-xs text-app-muted">
                      <FileImage className="h-4 w-4" />
                      已生成输出
                    </div>
                  ) : null}
                </div>

                <div className="mt-2 overflow-hidden rounded-xl border border-app-border bg-app-surface">
                  {previewUrl ? (
                    <div className="flex items-center justify-center p-4">
                      <img src={previewUrl} className="max-h-[240px] max-w-full" />
                    </div>
                  ) : (
                    <div className="p-6 text-sm text-app-muted">请输入有效的 SVG（包含 &lt;svg&gt; 标签）</div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="text-sm font-semibold text-app-text">导出结果预览</div>
                  <div className="mt-2 overflow-hidden rounded-xl border border-app-border bg-app-surface">
                    {outputUrl ? (
                      <div className="flex items-center justify-center p-4">
                        <img src={outputUrl} className="max-h-[240px] max-w-full" />
                      </div>
                    ) : (
                      <div className="p-6 text-sm text-app-muted">导出后会在这里展示位图预览</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
