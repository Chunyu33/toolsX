import { useMemo, useState } from 'react'
import { Download, FileImage, Loader2, Wand2 } from 'lucide-react'
import { toLocalfileUrl } from '../videoToGif/utils'
import StandardToolWrapper from '../../components/StandardToolWrapper'
import ImagePreviewModal from '../../components/ImagePreviewModal'
import LoadingOverlay from '../../components/LoadingOverlay'
import Toast from '../../components/Toast'
import { getBasenameNoExt, getDirname } from '../../utils/filePath'

import type { ToolsXApi } from '../../../../preload/bridge'

type SelectFormat = Exclude<Parameters<ToolsXApi['imageConvert']['convert']>[0]['format'], undefined>
type OutputFormat = Awaited<ReturnType<ToolsXApi['imageConvert']['convert']>>['format']

type ConvertItem = {
  id: string
  inputPath: string
  outputPath?: string
  outputMeta?: { format: OutputFormat; sizeBytes: number; quality?: number }
  errorText?: string
}

function isIcoPath(p: string): boolean {
  return p.toLowerCase().endsWith('.ico')
}

function collectTempDirsFromItems(items: ConvertItem[]): string[] {
  const dirs = new Set<string>()
  for (const it of items) {
    if (!it.outputPath) continue
    const dir = getDirname(it.outputPath)
    if (dir) dirs.add(dir)
  }
  return Array.from(dirs)
}

export default function ImageConvertPage() {
  const [toastOpen, setToastOpen] = useState(false)
  const [toastText, setToastText] = useState('')
  const showToast = (text: string) => { setToastText(text); setToastOpen(true) }

  const [items, setItems] = useState<ConvertItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [format, setFormat] = useState<SelectFormat>('png')
  const [quality, setQuality] = useState(80)
  const [useTargetSize, setUseTargetSize] = useState(false)
  const [targetKb, setTargetKb] = useState(300)
  const [prefer, setPrefer] = useState<'auto-small' | 'keep-format'>('auto-small')
  const [busy, setBusy] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState<string | undefined>(undefined)

  const activeItem = useMemo(() => items.find((x) => x.id === activeId) ?? null, [items, activeId])
  const outputs = useMemo(
    () => items.filter((x) => Boolean(x.outputPath && x.outputMeta)).map((x) => x as Required<Pick<ConvertItem, 'id' | 'inputPath' | 'outputPath' | 'outputMeta'>> & ConvertItem),
    [items]
  )

  const inputUrl = useMemo(() => (activeItem?.inputPath ? toLocalfileUrl(activeItem.inputPath) : null), [activeItem])
  const outputUrl = useMemo(() => (activeItem?.outputPath ? toLocalfileUrl(activeItem.outputPath) : null), [activeItem])
  const icoInputUnsupported = useMemo(() => Boolean(activeItem?.inputPath && isIcoPath(activeItem.inputPath) && format !== 'ico'), [activeItem?.inputPath, format])
  const showQuality = format === 'jpeg' || format === 'webp' || format === 'avif'

  const openImages = async () => {
    setErrorText(null)
    const res = await window.toolsx.files.openImages()
    if (res.canceled || !res.filePaths || res.filePaths.length === 0) return
    const now = Date.now()
    const next = res.filePaths.map((p, idx) => ({ id: `${now}-${idx}-${p}`, inputPath: p } as ConvertItem))
    setItems(next)
    setActiveId(next[0]?.id ?? null)
  }

  const clearFiles = async () => {
    const tempDirs = collectTempDirsFromItems(items)
    setItems([])
    setActiveId(null)
    setErrorText(null)
    setBusy(false)
    setPreviewOpen(false)
    setPreviewSrc(null)
    setPreviewTitle(undefined)

    if (tempDirs.length > 0) {
      try { await window.toolsx.files.cleanupTempImages({ tempDirs }) } catch { /* ignore */ }
    }
  }

  const convertOne = async (id: string) => {
    const it = items.find((x) => x.id === id)
    if (!it) return

    const res = useTargetSize
      ? await window.toolsx.imageConvert.convert({
          mode: 'targetSize', inputPath: it.inputPath, targetKb, prefer,
          format: prefer === 'keep-format' ? format : undefined
        })
      : await window.toolsx.imageConvert.convert({
          mode: 'convert', inputPath: it.inputPath, format,
          quality: showQuality ? quality : undefined
        })

    setItems((prev) => prev.map((x) =>
      x.id === id ? { ...x, outputPath: res.outputPath, outputMeta: { format: res.format, sizeBytes: res.sizeBytes, quality: res.quality }, errorText: undefined } : x
    ))
  }

  const saveZip = async () => {
    if (outputs.length <= 1) return
    setBusy(true)
    try {
      const entries = outputs.map((it, idx) => {
        const ext = it.outputMeta?.format === 'jpeg' ? 'jpg' : it.outputMeta?.format
        const base = getBasenameNoExt(it.inputPath)
        const name = `${String(idx + 1).padStart(2, '0')}_${base}.${ext}`
        return { sourcePath: it.outputPath, name }
      })
      const readmeText = `ToolsX 批量图片转换结果\n\n数量：${outputs.length}\n时间：${new Date().toLocaleString()}\n`
      const res = await window.toolsx.files.saveZip({ entries, defaultName: 'converted.zip', readmeText })
      if (!res.canceled && res.savedPath) {
        setErrorText(null)
        alert(`压缩包已保存到：${res.savedPath}`)
      }
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  const convertActive = async () => {
    if (!activeId) return
    setBusy(true)
    try {
      if (icoInputUnsupported) throw new Error('暂不支持将 ICO 作为输入转换为其它格式（当前仅支持输出 ICO）。')
      await convertOne(activeId)
      setErrorText(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setErrorText(msg)
      setItems((prev) => prev.map((x) => (x.id === activeId ? { ...x, errorText: msg } : x)))
    } finally { setBusy(false) }
  }

  const convertAll = async () => {
    if (items.length === 0) return
    setBusy(true)
    try {
      for (const it of items) {
        setActiveId(it.id)
        if (isIcoPath(it.inputPath) && format !== 'ico') {
          throw new Error('批量转换已终止：检测到 ICO 输入文件。当前仅支持输出 ICO，不支持 ICO 作为输入转换为其它格式。')
        }
        await convertOne(it.id)
      }
      setErrorText(null)
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  const saveOutput = async () => {
    if (!activeItem?.outputPath) return
    setBusy(true)
    try {
      const ext = activeItem.outputMeta?.format ?? format
      const res = await window.toolsx.files.saveImage({ sourcePath: activeItem.outputPath, defaultName: `output.${ext === 'jpeg' ? 'jpg' : ext}` })
      if (!res.canceled && res.savedPath) {
        setErrorText(null)
        showToast(`已保存：${res.savedPath}`)
      }
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  // ============== 左侧设置区 ==============
  const settingsPanel = (
    <div className="flex flex-col gap-3">
      {/* 文件选择 */}
      <button className="btn-primary w-full" onClick={openImages}>
        <FileImage className="h-4 w-4" />选择图片（多选）
      </button>

      {/* ICO 警告 */}
      {icoInputUnsupported ? (
        <div className="hint-box">
          当前不支持 ICO 作为输入转换为其它格式。可先导出为 PNG 后再转换。
        </div>
      ) : null}

      {/* 文件列表 */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs font-medium text-app-text">文件列表</div>
          <div className="text-xs text-app-muted">{items.length} 个</div>
        </div>
        <div className="max-h-36 space-y-1 overflow-auto">
          {items.length === 0 ? (
            <div className="hint-box">尚未选择图片</div>
          ) : (
            items.map((it, idx) => (
              <button
                key={it.id}
                type="button"
                onClick={() => setActiveId(it.id)}
                className={`w-full rounded-sm border px-2 py-1.5 text-left text-xs ${
                  it.id === activeId ? 'file-item-active' : 'file-item'
                }`}
              >
                <div className="truncate">{idx + 1}. {it.inputPath}</div>
                {it.outputMeta ? (
                  <div className="mt-0.5 text-[11px] text-brand-500">
                    输出：{it.outputMeta.format.toUpperCase()} / {(it.outputMeta.sizeBytes / 1024).toFixed(1)}KB
                  </div>
                ) : it.errorText ? (
                  <div className="mt-0.5 text-[11px] text-red-500">{it.errorText}</div>
                ) : (
                  <div className="mt-0.5 text-[11px] text-app-muted">未转换</div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* 输出格式 */}
      <label className="block">
        <div className="text-xs font-medium text-app-text mb-1">输出格式</div>
        <select
          className="select-wechat"
          value={format}
          onChange={(e) => setFormat(e.target.value as SelectFormat)}
        >
          <option value="png">PNG</option>
          <option value="jpeg">JPG</option>
          <option value="webp">WebP</option>
          <option value="avif">AVIF</option>
          <option value="gif">GIF</option>
          <option value="ico">ICO</option>
        </select>
      </label>

      {/* 目标体积开关 */}
      <label className="flex items-center gap-2 text-xs text-app-text cursor-pointer">
        <input type="checkbox" checked={useTargetSize} onChange={(e) => setUseTargetSize(e.target.checked)} />
        按目标体积优化
      </label>

      {useTargetSize ? (
        <>
          <label className="block">
            <div className="text-xs font-medium text-app-text mb-1">目标体积（KB）</div>
            <input
              type="number" min={10} step={10} value={targetKb}
              onChange={(e) => { const n = Number(e.target.value); setTargetKb(Number.isFinite(n) ? Math.max(10, Math.round(n)) : 300) }}
              className="input-wechat"
            />
          </label>

          <label className="block">
            <div className="text-xs font-medium text-app-text mb-1">策略</div>
            <select className="select-wechat" value={prefer} onChange={(e) => setPrefer(e.target.value as 'auto-small' | 'keep-format')}>
              <option value="auto-small">自动选择更小格式</option>
              <option value="keep-format">保持当前格式</option>
            </select>
          </label>
        </>
      ) : null}

      {/* 质量滑块 */}
      {!useTargetSize && showQuality ? (
        <label className="block">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-medium text-app-text">质量</div>
            <div className="text-xs text-app-muted">{quality}</div>
          </div>
          <input className="w-full" type="range" min={1} max={100} step={1} value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
        </label>
      ) : null}

      {/* 操作按钮 */}
      <div className="flex flex-col gap-1.5">
        <button className="btn-primary" disabled={!activeItem?.inputPath || busy} onClick={convertActive}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}转换当前
        </button>

        <button className="btn-secondary" disabled={items.length === 0 || busy} onClick={convertAll}>
          全部转换
        </button>

        <button className="btn-secondary" disabled={items.length === 0} onClick={clearFiles}>
          清除文件
        </button>

        {activeItem?.outputPath ? (
          <button className="btn-secondary" onClick={saveOutput}>
            <Download className="h-4 w-4" />保存
          </button>
        ) : null}

        {outputs.length > 1 ? (
          <button className="btn-secondary" onClick={saveZip}>
            保存压缩包
          </button>
        ) : null}
      </div>

      {/* 错误 */}
      {errorText ? (
        <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{errorText}</div>
      ) : null}
    </div>
  )

  // ============== 右侧预览区 ==============
  const previewPanel = (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div>
        <div className="text-xs font-medium text-app-text mb-2">原图预览</div>
        <div className="preview-area">
          {inputUrl ? (
            <button
              className="block h-[340px] w-full cursor-zoom-in"
              onClick={() => { setPreviewSrc(inputUrl); setPreviewTitle('原图预览'); setPreviewOpen(true) }}
              type="button"
            >
              <img src={inputUrl} className="block h-[340px] w-full object-contain" alt="原图" />
            </button>
          ) : (
            <div className="flex h-[340px] items-center justify-center text-xs text-app-muted">尚未选择</div>
          )}
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-app-text mb-2">输出预览</div>
        <div className="preview-area">
          {outputUrl ? (
            <button
              className="block h-[340px] w-full cursor-zoom-in"
              onClick={() => { setPreviewSrc(outputUrl); setPreviewTitle('输出预览'); setPreviewOpen(true) }}
              type="button"
            >
              <img src={outputUrl} className="block h-[340px] w-full object-contain" alt="输出" />
            </button>
          ) : (
            <div className="flex h-[340px] items-center justify-center text-xs text-app-muted">尚未转换</div>
          )}
        </div>
        {activeItem?.outputMeta ? (
          <div className="mt-2 text-xs text-app-muted">
            输出：{activeItem.outputMeta.format.toUpperCase()} / {(activeItem.outputMeta.sizeBytes / 1024).toFixed(1)}KB
            {activeItem.outputMeta.quality ? ` / 质量 ${activeItem.outputMeta.quality}` : ''}
          </div>
        ) : null}
      </div>
    </div>
  )

  return (
    <>
      <Toast open={toastOpen} message={toastText} onClose={() => setToastOpen(false)} />
      <LoadingOverlay open={busy} text="处理中..." />
      <ImagePreviewModal open={previewOpen} src={previewSrc} title={previewTitle} onClose={() => setPreviewOpen(false)} />

      <StandardToolWrapper
        title="图片格式转换"
        description="PNG / JPG / WebP / AVIF / GIF / ICO 格式互转"
        settings={settingsPanel}
      >
        {previewPanel}
      </StandardToolWrapper>
    </>
  )
}
