import { useMemo, useState } from 'react'
import { Download, FileImage, Loader2, Sparkles } from 'lucide-react'
import { toLocalfileUrl } from '../videoToGif/utils'
import ImagePreviewModal from '../../components/ImagePreviewModal'
import LoadingOverlay from '../../components/LoadingOverlay'
import Toast from '../../components/Toast'
import { getBasenameNoExt, getDirname } from '../../utils/filePath'

function collectTempDirsFromItems(items: Array<{ outputPath?: string }>): string[] {
  // 说明：临时输出文件是主进程生成并落盘的：outputPath 位于 toolsx-imgc-* 目录下。
  // renderer 侧只做“收集线索”，真正是否可删除由主进程做安全校验。
  const dirs = new Set<string>()
  for (const it of items) {
    if (!it.outputPath) continue
    const dir = getDirname(it.outputPath)
    if (dir) dirs.add(dir)
  }
  return Array.from(dirs)
}

export default function ImageCompressPage() {
  const [toastOpen, setToastOpen] = useState(false)
  const [toastText, setToastText] = useState('')
  const showToast = (text: string) => {
    setToastText(text)
    setToastOpen(true)
  }

  const [items, setItems] = useState<
    Array<{
      id: string
      inputPath: string
      inputSizeBytes?: number
      outputPath?: string
      outputMeta?: { format: string; sizeBytes: number; quality?: number }
      errorText?: string
    }>
  >([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [targetKb, setTargetKb] = useState(300)
  const [busy, setBusy] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState<string | undefined>(undefined)

  const activeItem = useMemo(() => items.find((x) => x.id === activeId) ?? null, [items, activeId])

  const outputs = useMemo(
    () => items.filter((x) => Boolean(x.outputPath && x.outputMeta)).map((x) => x as Required<Pick<(typeof items)[number], 'id' | 'inputPath' | 'outputPath' | 'outputMeta'>> & (typeof items)[number]),
    [items]
  )

  const inputUrl = useMemo(() => (activeItem?.inputPath ? toLocalfileUrl(activeItem.inputPath) : null), [activeItem])
  const outputUrl = useMemo(() => (activeItem?.outputPath ? toLocalfileUrl(activeItem.outputPath) : null), [activeItem])

  const openImages = async () => {
    setErrorText(null)
    const res = await window.toolsx.files.openImages()
    if (res.canceled || !res.filePaths || res.filePaths.length === 0) return

    const now = Date.now()
    const next = res.filePaths.map((p, idx) => ({ id: `${now}-${idx}-${p}`, inputPath: p }))
    setItems(next)
    setActiveId(next[0]?.id ?? null)

    for (const it of next) {
      try {
        const info = await window.toolsx.files.getFileInfo({ filePath: it.inputPath })
        setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, inputSizeBytes: info.sizeBytes } : x)))
      } catch {
        // ignore
      }
    }
  }

  const clearFiles = async () => {
    // 说明：清除文件时，我们同时清理 renderer 内存状态和（尽可能）清理本次产生的临时输出文件。
    // 临时目录的删除由主进程做严格安全校验，避免误删系统文件。
    const tempDirs = collectTempDirsFromItems(items)

    setItems([])
    setActiveId(null)
    setErrorText(null)
    setBusy(false)
    setPreviewOpen(false)
    setPreviewSrc(null)
    setPreviewTitle(undefined)

    if (tempDirs.length > 0) {
      try {
        await window.toolsx.files.cleanupTempImages({ tempDirs })
      } catch {
        // ignore
      }
    }
  }

  const compressOne = async (id: string) => {
    const it = items.find((x) => x.id === id)
    if (!it) return
    const res = await window.toolsx.imageConvert.convert({
      inputPath: it.inputPath,
      mode: 'targetSize',
      targetKb,
      prefer: 'auto-small'
    })
    setItems((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              outputPath: res.outputPath,
              outputMeta: { format: res.format, sizeBytes: res.sizeBytes, quality: res.quality },
              errorText: undefined
            }
          : x
      )
    )
  }

  const compressActive = async () => {
    if (!activeId) return
    setBusy(true)
    try {
      await compressOne(activeId)
      setErrorText(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setErrorText(msg)
      setItems((prev) => prev.map((x) => (x.id === activeId ? { ...x, errorText: msg } : x)))
    } finally {
      setBusy(false)
    }
  }

  const compressAll = async () => {
    if (items.length === 0) return
    setBusy(true)
    try {
      for (const it of items) {
        setActiveId(it.id)
        await compressOne(it.id)
      }
      setErrorText(null)
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const saveOutput = async () => {
    if (!activeItem?.outputPath) return
    setBusy(true)
    try {
      const ext = activeItem.outputMeta?.format ?? 'jpg'
      const res = await window.toolsx.files.saveImage({
        sourcePath: activeItem.outputPath,
        defaultName: `output.${ext === 'jpeg' ? 'jpg' : ext}`
      })
      if (!res.canceled && res.savedPath) {
        setErrorText(null)
        showToast(`已保存：${res.savedPath}`)
      }
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const saveZip = async () => {
    if (outputs.length <= 1) return
    setBusy(true)
    try {
      const entries = outputs.map((it, idx) => {
        const ext = it.outputMeta?.format === 'jpeg' ? 'jpg' : it.outputMeta?.format
        // 说明：renderer 侧不能用 Node 的 path，这里用纯字符串方式生成文件名
        const base = getBasenameNoExt(it.inputPath)
        const name = `${String(idx + 1).padStart(2, '0')}_${base}.${ext}`
        return { sourcePath: it.outputPath, name }
      })

      const readmeText =
        'ToolsX 批量图片压缩结果\n\n' +
        `数量：${outputs.length}\n` +
        `时间：${new Date().toLocaleString()}\n\n` +
        '说明：\n' +
        '1）压缩时会先在系统临时目录生成输出文件（已落盘）。\n' +
        '2）点击“保存/保存压缩包”只是把临时文件复制/打包到你选择的位置。\n' +
        '3）如果你关闭应用，系统可能会清理临时目录，因此建议及时保存。\n'

      const res = await window.toolsx.files.saveZip({
        entries,
        defaultName: 'compressed.zip',
        readmeText
      })
      if (!res.canceled && res.savedPath) {
        setErrorText(null)
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
      <ImagePreviewModal
        open={previewOpen}
        src={previewSrc}
        title={previewTitle}
        onClose={() => setPreviewOpen(false)}
      />
      <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-app-text">图片压缩</div>
            <div className="mt-1 text-sm text-app-muted">输入目标体积，自动选择更小的输出策略（优先 WebP/AVIF）</div>
          </div>

          <button
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            onClick={openImages}
          >
            <FileImage className="h-4 w-4" />
            选择图片（多选）
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-1">
            <div className="text-sm font-semibold text-app-text">压缩设置</div>

            <div className="mt-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-app-text">文件列表</div>
                <div className="text-xs text-app-muted">{items.length} 个</div>
              </div>
              <div className="mt-2 max-h-44 space-y-2 overflow-auto rounded-xl border border-app-border bg-app-surface p-2">
                {items.length === 0 ? (
                  <div className="px-2 py-2 text-xs text-app-muted">尚未选择图片</div>
                ) : (
                  items.map((it, idx) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => setActiveId(it.id)}
                      className={
                        'w-full rounded-lg border px-2 py-2 text-left text-xs ' +
                        (it.id === activeId
                          ? 'border-brand-300 bg-brand-500/10 text-app-text'
                          : 'border-app-border bg-app-surface text-app-muted hover:bg-app-surface2')
                      }
                    >
                      <div className="truncate">{idx + 1}. {it.inputPath}</div>
                      {it.outputMeta ? (
                        <div className="mt-1 text-[11px] text-app-muted">
                          输出：{String(it.outputMeta.format).toUpperCase()} / {(it.outputMeta.sizeBytes / 1024).toFixed(1)}KB
                        </div>
                      ) : it.errorText ? (
                        <div className="mt-1 text-[11px] text-red-600">{it.errorText}</div>
                      ) : (
                        <div className="mt-1 text-[11px] text-app-muted">未压缩</div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            <label className="mt-3 block text-xs text-app-muted">
              目标体积（KB）
              <input
                type="number"
                min={10}
                step={10}
                value={targetKb}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  setTargetKb(Number.isFinite(n) ? Math.max(10, Math.round(n)) : 300)
                }}
                className="mt-1 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:border-brand-300"
              />
            </label>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                disabled={!activeItem?.inputPath || busy}
                onClick={compressActive}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                压缩当前
              </button>

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2 disabled:opacity-60"
                disabled={items.length === 0 || busy}
                onClick={compressAll}
                type="button"
              >
                <Sparkles className="h-4 w-4" />
                全部压缩
              </button>

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2 disabled:opacity-60"
                disabled={items.length === 0 && !errorText}
                onClick={clearFiles}
                type="button"
              >
                清除文件
              </button>

              {activeItem?.outputPath ? (
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
                  onClick={saveOutput}
                >
                  <Download className="h-4 w-4" />
                  保存
                </button>
              ) : null}

              {outputs.length > 1 ? (
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
                  onClick={saveZip}
                  type="button"
                >
                  <Download className="h-4 w-4" />
                  保存压缩包
                </button>
              ) : null}
            </div>

            {activeItem?.inputPath ? <div className="mt-2 break-all text-xs text-app-muted">{activeItem.inputPath}</div> : null}

            {errorText ? (
              <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-red-600">
                {errorText}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-2">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <div className="text-sm font-semibold text-app-text">原图预览</div>
                <div className="mt-2 overflow-hidden rounded-xl border border-app-border bg-app-surface">
                  {inputUrl ? (
                    <button
                      className="block h-[360px] w-full cursor-zoom-in"
                      onClick={() => {
                        setPreviewSrc(inputUrl)
                        setPreviewTitle('原图预览')
                        setPreviewOpen(true)
                      }}
                      type="button"
                    >
                      <img src={inputUrl} className="block h-[360px] w-full object-contain" />
                    </button>
                  ) : (
                    <div className="flex h-[360px] items-center justify-center text-sm text-app-muted">尚未选择</div>
                  )}
                </div>
                {activeItem?.inputPath ? <div className="mt-2 break-all text-xs text-app-muted">{activeItem.inputPath}</div> : null}
                {activeItem?.inputSizeBytes != null ? (
                  <div className="mt-2 text-xs text-app-muted">原图：{(activeItem.inputSizeBytes / 1024).toFixed(1)}KB</div>
                ) : null}
              </div>

              <div>
                <div className="text-sm font-semibold text-app-text">压缩结果</div>
                <div className="mt-2 overflow-hidden rounded-xl border border-app-border bg-app-surface">
                  {outputUrl ? (
                    <button
                      className="block h-[360px] w-full cursor-zoom-in"
                      onClick={() => {
                        setPreviewSrc(outputUrl)
                        setPreviewTitle('压缩结果预览')
                        setPreviewOpen(true)
                      }}
                      type="button"
                    >
                      <img src={outputUrl} className="block h-[360px] w-full object-contain" />
                    </button>
                  ) : (
                    <div className="flex h-[360px] items-center justify-center text-sm text-app-muted">尚未压缩</div>
                  )}
                </div>
                {activeItem?.outputPath ? <div className="mt-2 break-all text-xs text-app-muted">{activeItem.outputPath}</div> : null}
                {activeItem?.outputMeta ? (
                  <div className="mt-2 text-xs text-app-muted">
                    {activeItem.inputSizeBytes != null ? (
                      <div>原图：{(activeItem.inputSizeBytes / 1024).toFixed(1)}KB</div>
                    ) : null}
                    输出：{String(activeItem.outputMeta.format).toUpperCase()} / {(activeItem.outputMeta.sizeBytes / 1024).toFixed(1)}KB
                    {activeItem.outputMeta.quality ? ` / 质量 ${activeItem.outputMeta.quality}` : ''}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
