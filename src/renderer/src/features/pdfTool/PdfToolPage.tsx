import { useMemo, useRef, useState } from 'react'
import { Download, Eraser, FilePlus2, Files, Image as ImageIcon, Merge, Scissors } from 'lucide-react'
import Toast from '../../components/Toast'
import { getBasenameNoExt, getDirname } from '../../utils/filePath'
import { toLocalfileUrl } from '../videoToGif/utils'

import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

type TabKey = 'merge' | 'split' | 'images'

function parseRanges(text: string): Array<{ start: number; end: number }> {
  // 说明：支持 "1-3,5,7-9" 这种输入；页码为 1-based。
  const raw = text
    .split(/[,，\s]+/g)
    .map((x) => x.trim())
    .filter(Boolean)

  const ranges: Array<{ start: number; end: number }> = []
  for (const token of raw) {
    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token)
    if (!m) continue
    const a = Number(m[1])
    const b = m[2] ? Number(m[2]) : a
    if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) continue
    ranges.push({ start: Math.min(a, b), end: Math.max(a, b) })
  }

  return ranges
}

function uniq(list: string[]): string[] {
  const set = new Set<string>()
  for (const x of list) set.add(x)
  return Array.from(set)
}

export default function PdfToolPage() {
  const [tab, setTab] = useState<TabKey>('merge')

  const [toastOpen, setToastOpen] = useState(false)
  const [toastText, setToastText] = useState('')
  const showToast = (text: string) => {
    setToastText(text)
    setToastOpen(true)
  }

  const [busy, setBusy] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)

  // 合并
  const [mergeInputs, setMergeInputs] = useState<string[]>([])
  const [mergeOutputPath, setMergeOutputPath] = useState<string | null>(null)
  const [mergeTempDir, setMergeTempDir] = useState<string | null>(null)

  // 拆分
  const [splitInput, setSplitInput] = useState<string | null>(null)
  const [splitMode, setSplitMode] = useState<'splitAll' | 'range'>('splitAll')
  const [splitRangesText, setSplitRangesText] = useState('1-1')
  const [splitOutputPaths, setSplitOutputPaths] = useState<string[]>([])
  const [splitTempDir, setSplitTempDir] = useState<string | null>(null)

  // 导出图片
  const [imgInput, setImgInput] = useState<string | null>(null)
  const [imgScale, setImgScale] = useState(2)
  const [imgOutputs, setImgOutputs] = useState<string[]>([])
  const [imgTempDirs, setImgTempDirs] = useState<string[]>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const canCleanup = useMemo(() => {
    return Boolean(mergeTempDir || splitTempDir || imgTempDirs.length > 0)
  }, [mergeTempDir, splitTempDir, imgTempDirs.length])

  const clearAll = async () => {
    // 说明：尽可能清理本次产生的临时目录（由主进程做严格白名单校验）。
    const dirs = uniq([
      ...(mergeTempDir ? [mergeTempDir] : []),
      ...(splitTempDir ? [splitTempDir] : []),
      ...imgTempDirs
    ])

    setBusy(false)
    setErrorText(null)

    setMergeInputs([])
    setMergeOutputPath(null)
    setMergeTempDir(null)

    setSplitInput(null)
    setSplitOutputPaths([])
    setSplitTempDir(null)

    setImgInput(null)
    setImgOutputs([])
    setImgTempDirs([])

    if (dirs.length > 0) {
      try {
        await window.toolsx.files.cleanupTempImages({ tempDirs: dirs })
      } catch {
        // ignore
      }
    }
  }

  const pickMergePdfs = async () => {
    setErrorText(null)
    const res = await window.toolsx.files.openPdfs()
    if (res.canceled || !res.filePaths || res.filePaths.length === 0) return
    setMergeInputs(res.filePaths)
    setMergeOutputPath(null)
    setMergeTempDir(null)
  }

  const doMerge = async () => {
    setErrorText(null)
    setBusy(true)
    try {
      if (mergeInputs.length < 2) throw new Error('请至少选择 2 个 PDF 文件')
      const res = await window.toolsx.pdf.merge({ inputPaths: mergeInputs })
      setMergeOutputPath(res.outputPath)
      setMergeTempDir(res.tempDir)
      showToast('合并完成（已生成临时文件）')
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const saveMerged = async () => {
    setErrorText(null)
    try {
      if (!mergeOutputPath) throw new Error('请先合并生成结果')
      const base = mergeInputs.length > 0 ? `${getBasenameNoExt(mergeInputs[0])}_merged.pdf` : 'merged.pdf'
      const res = await window.toolsx.files.savePdf({ sourcePath: mergeOutputPath, defaultName: base })
      if (!res.canceled && res.savedPath) showToast(`已保存：${res.savedPath}`)
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    }
  }

  const pickSplitPdf = async () => {
    setErrorText(null)
    const res = await window.toolsx.files.openPdf()
    if (res.canceled || !res.filePath) return
    setSplitInput(res.filePath)
    setSplitOutputPaths([])
    setSplitTempDir(null)
  }

  const doSplit = async () => {
    setErrorText(null)
    setBusy(true)
    try {
      if (!splitInput) throw new Error('请先选择 PDF 文件')

      const res =
        splitMode === 'splitAll'
          ? await window.toolsx.pdf.split({ inputPath: splitInput, mode: 'splitAll' })
          : await window.toolsx.pdf.split({
              inputPath: splitInput,
              mode: 'range',
              ranges: parseRanges(splitRangesText)
            })

      setSplitOutputPaths(res.outputPaths)
      setSplitTempDir(res.tempDir)
      showToast('拆分完成（已生成临时文件）')
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const saveSplit = async () => {
    setErrorText(null)
    try {
      if (splitOutputPaths.length === 0) throw new Error('请先拆分生成结果')

      if (splitOutputPaths.length === 1) {
        const src = splitOutputPaths[0]
        const base = splitInput ? `${getBasenameNoExt(splitInput)}_split.pdf` : 'split.pdf'
        const res = await window.toolsx.files.savePdf({ sourcePath: src, defaultName: base })
        if (!res.canceled && res.savedPath) showToast(`已保存：${res.savedPath}`)
        return
      }

      const entries = splitOutputPaths.map((p) => ({ sourcePath: p, name: p.split(/[/\\]/).pop() ?? 'part.pdf' }))
      const base = splitInput ? `${getBasenameNoExt(splitInput)}_split.zip` : 'split.zip'
      const readmeText =
        'ToolsX PDF 拆分结果\n\n' +
        `数量：${splitOutputPaths.length}\n` +
        `时间：${new Date().toLocaleString()}\n\n` +
        '说明：\n' +
        '1）拆分时会先在系统临时目录生成输出文件（已落盘）。\n' +
        '2）点击“保存”会将临时文件打包到你选择的位置。\n'

      const res = await window.toolsx.files.saveZip({ entries, defaultName: base, readmeText })
      if (!res.canceled && res.savedPath) showToast(`已保存：${res.savedPath}`)
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    }
  }

  const pickPdfForImages = async () => {
    setErrorText(null)
    const res = await window.toolsx.files.openPdf()
    if (res.canceled || !res.filePath) return
    setImgInput(res.filePath)
    setImgOutputs([])
    setImgTempDirs([])
  }

  const doExportImages = async () => {
    setErrorText(null)
    setBusy(true)

    const tempPrefix = `toolsx-pdf-${Date.now()}`
    const tempDirs: string[] = []

    try {
      if (!imgInput) throw new Error('请先选择 PDF 文件')

      const url = toLocalfileUrl(imgInput)
      const ab = await fetch(url).then((r) => r.arrayBuffer())
      const doc = await pdfjsLib.getDocument({ data: ab }).promise

      const outPaths: string[] = []
      const canvas = canvasRef.current
      if (!canvas) throw new Error('Canvas 初始化失败')

      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 不支持 2D 上下文')

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const viewport = page.getViewport({ scale: Math.max(0.5, Math.min(4, imgScale)) })

        canvas.width = Math.max(1, Math.floor(viewport.width))
        canvas.height = Math.max(1, Math.floor(viewport.height))

        await page.render({ canvasContext: ctx, viewport }).promise

        const blob: Blob = await new Promise((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('图片编码失败'))), 'image/png')
        })

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const s = String(reader.result)
            const idx = s.indexOf('base64,')
            resolve(idx >= 0 ? s.slice(idx + 'base64,'.length) : s)
          }
          reader.onerror = () => reject(new Error('读取图片失败'))
          reader.readAsDataURL(blob)
        })

        const name = `page_${String(i).padStart(3, '0')}.png`
        const saved = await window.toolsx.files.writeTempFile({ dirPrefix: tempPrefix, name, base64 })
        outPaths.push(saved.filePath)
        tempDirs.push(getDirname(saved.filePath))
      }

      setImgOutputs(outPaths)
      setImgTempDirs(uniq(tempDirs))
      showToast('图片导出完成（已生成临时文件）')
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
      // 说明：失败时也尝试清理已产生的临时目录
      const dirs = uniq(tempDirs)
      if (dirs.length > 0) {
        try {
          await window.toolsx.files.cleanupTempImages({ tempDirs: dirs })
        } catch {
          // ignore
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const saveImagesZip = async () => {
    setErrorText(null)
    try {
      if (imgOutputs.length === 0) throw new Error('请先导出图片')

      const entries = imgOutputs.map((p) => ({ sourcePath: p, name: p.split(/[/\\]/).pop() ?? 'page.png' }))
      const base = imgInput ? `${getBasenameNoExt(imgInput)}_images.zip` : 'pdf_images.zip'

      const readmeText =
        'ToolsX PDF 图片导出结果\n\n' +
        `数量：${imgOutputs.length}\n` +
        `时间：${new Date().toLocaleString()}\n\n` +
        '说明：\n' +
        '1）图片导出时会先在系统临时目录生成 PNG 文件（已落盘）。\n' +
        '2）点击“保存 ZIP”会将临时文件打包到你选择的位置。\n'

      const res = await window.toolsx.files.saveZip({ entries, defaultName: base, readmeText })
      if (!res.canceled && res.savedPath) showToast(`已保存：${res.savedPath}`)
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <Toast open={toastOpen} message={toastText} onClose={() => setToastOpen(false)} />

      <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-app-text">PDF 助手</div>
            <div className="mt-1 text-sm text-app-muted">PDF 合并、拆分、按页导出图片（本地离线）</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className={
                'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ' +
                (tab === 'merge'
                  ? 'border-brand-300 bg-brand-500/10 text-app-text'
                  : 'border-app-border bg-app-surface text-app-muted hover:bg-app-surface2')
              }
              onClick={() => setTab('merge')}
              type="button"
            >
              合并
            </button>
            <button
              className={
                'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ' +
                (tab === 'split'
                  ? 'border-brand-300 bg-brand-500/10 text-app-text'
                  : 'border-app-border bg-app-surface text-app-muted hover:bg-app-surface2')
              }
              onClick={() => setTab('split')}
              type="button"
            >
              拆分
            </button>
            <button
              className={
                'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ' +
                (tab === 'images'
                  ? 'border-brand-300 bg-brand-500/10 text-app-text'
                  : 'border-app-border bg-app-surface text-app-muted hover:bg-app-surface2')
              }
              onClick={() => setTab('images')}
              type="button"
            >
              导出图片
            </button>

            <button
              className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2 disabled:opacity-60"
              onClick={() => void clearAll()}
              disabled={!canCleanup}
              type="button"
              title="清空状态并尝试清理临时目录"
            >
              <Eraser className="h-4 w-4" />
              清空
            </button>
          </div>
        </div>

        {errorText ? (
          <div className="mt-4 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-red-600">{errorText}</div>
        ) : null}

        {tab === 'merge' ? (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-1">
              <div className="text-sm font-semibold text-app-text">输入</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
                  onClick={() => void pickMergePdfs()}
                  disabled={busy}
                  type="button"
                >
                  <Files className="h-4 w-4" />
                  选择 PDF
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                  onClick={() => void doMerge()}
                  disabled={busy || mergeInputs.length < 2}
                  type="button"
                >
                  <Merge className="h-4 w-4" />
                  合并
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2 disabled:opacity-60"
                  onClick={() => void saveMerged()}
                  disabled={!mergeOutputPath}
                  type="button"
                >
                  <Download className="h-4 w-4" />
                  保存
                </button>
              </div>

              <div className="mt-4 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-muted">
                已选 {mergeInputs.length} 个文件（按选择顺序合并）。
              </div>

              {mergeInputs.length > 0 ? (
                <div className="mt-3 max-h-[260px] overflow-auto rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text">
                  {mergeInputs.map((p) => (
                    <div key={p} className="truncate" title={p}>
                      {p}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-2">
              <div className="text-sm font-semibold text-app-text">输出</div>
              <div className="mt-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text">
                {mergeOutputPath ? (
                  <div className="truncate" title={mergeOutputPath}>
                    已生成：{mergeOutputPath}
                  </div>
                ) : (
                  <div className="text-app-muted">尚未合并</div>
                )}
              </div>

              <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-muted">
                说明：合并结果先写入系统临时目录；点击“保存”只是把临时文件复制到你选择的位置。
              </div>
            </div>
          </div>
        ) : tab === 'split' ? (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-1">
              <div className="text-sm font-semibold text-app-text">输入</div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
                  onClick={() => void pickSplitPdf()}
                  disabled={busy}
                  type="button"
                >
                  <FilePlus2 className="h-4 w-4" />
                  选择 PDF
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                  onClick={() => void doSplit()}
                  disabled={busy || !splitInput}
                  type="button"
                >
                  <Scissors className="h-4 w-4" />
                  拆分
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2 disabled:opacity-60"
                  onClick={() => void saveSplit()}
                  disabled={splitOutputPaths.length === 0}
                  type="button"
                >
                  <Download className="h-4 w-4" />
                  保存
                </button>
              </div>

              <div className="mt-4 rounded-lg border border-app-border bg-app-surface p-3">
                <div className="text-xs font-semibold text-app-text">模式</div>
                <div className="mt-2 flex flex-col gap-2 text-sm text-app-text">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" checked={splitMode === 'splitAll'} onChange={() => setSplitMode('splitAll')} />
                    拆成单页（每页一个 PDF）
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" checked={splitMode === 'range'} onChange={() => setSplitMode('range')} />
                    按页码范围
                  </label>
                </div>

                {splitMode === 'range' ? (
                  <label className="mt-3 block text-xs text-app-muted">
                    页码范围（例如：1-3,5,7-9）
                    <input
                      value={splitRangesText}
                      onChange={(e) => setSplitRangesText(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:border-brand-300"
                    />
                  </label>
                ) : null}
              </div>

              <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-muted">
                {splitInput ? (
                  <div className="truncate" title={splitInput}>
                    当前：{splitInput}
                  </div>
                ) : (
                  '尚未选择文件'
                )}
              </div>
            </div>

            <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-2">
              <div className="text-sm font-semibold text-app-text">输出</div>
              <div className="mt-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text">
                {splitOutputPaths.length > 0 ? (
                  <div className="max-h-[360px] overflow-auto">
                    {splitOutputPaths.map((p) => (
                      <div key={p} className="truncate" title={p}>
                        {p}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-app-muted">尚未拆分</div>
                )}
              </div>

              <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-muted">
                说明：若拆分结果超过 1 个文件，会自动走 ZIP 打包保存。
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-1">
              <div className="text-sm font-semibold text-app-text">输入</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
                  onClick={() => void pickPdfForImages()}
                  disabled={busy}
                  type="button"
                >
                  <FilePlus2 className="h-4 w-4" />
                  选择 PDF
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                  onClick={() => void doExportImages()}
                  disabled={busy || !imgInput}
                  type="button"
                >
                  <ImageIcon className="h-4 w-4" />
                  导出
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2 disabled:opacity-60"
                  onClick={() => void saveImagesZip()}
                  disabled={imgOutputs.length === 0}
                  type="button"
                >
                  <Download className="h-4 w-4" />
                  保存 ZIP
                </button>
              </div>

              <label className="mt-4 block text-xs text-app-muted">
                渲染倍率（越大越清晰，但更慢）
                <input
                  type="number"
                  min={0.5}
                  max={4}
                  step={0.5}
                  value={imgScale}
                  onChange={(e) => setImgScale(Number(e.target.value))}
                  className="mt-2 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:border-brand-300"
                />
              </label>

              <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-muted">
                {imgInput ? (
                  <div className="truncate" title={imgInput}>
                    当前：{imgInput}
                  </div>
                ) : (
                  '尚未选择文件'
                )}
              </div>

              <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-muted">
                说明：这里采用“按页渲染”为 PNG 的方式导出，稳定但不等同于提取 PDF 内嵌原图。
              </div>
            </div>

            <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-2">
              <div className="text-sm font-semibold text-app-text">输出</div>
              <div className="mt-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text">
                {imgOutputs.length > 0 ? (
                  <div className="max-h-[360px] overflow-auto">
                    {imgOutputs.map((p) => (
                      <div key={p} className="truncate" title={p}>
                        {p}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-app-muted">尚未导出</div>
                )}
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        <div className="mt-5 rounded-lg border border-app-border bg-app-surface2 p-4 text-sm text-app-text">
          <div className="font-semibold">PDF↔Word 互转（规划）</div>
          <div className="mt-1 text-app-muted">
            说明：高质量的 PDF/Word 互转通常需要本机 LibreOffice（soffice）或在线服务。当前版本先完成 PDF 合并/拆分/导出图片，后续可在检测到
            LibreOffice 后开启互转功能。
          </div>
        </div>
      </div>
    </div>
  )
}
