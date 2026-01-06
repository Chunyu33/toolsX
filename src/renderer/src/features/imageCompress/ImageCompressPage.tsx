import { useMemo, useState } from 'react'
import { Download, FileImage, Loader2, Sparkles } from 'lucide-react'
import { toLocalfileUrl } from '../videoToGif/utils'
import ImagePreviewModal from '../../components/ImagePreviewModal'

export default function ImageCompressPage() {
  const [inputPath, setInputPath] = useState<string | null>(null)
  const [outputPath, setOutputPath] = useState<string | null>(null)
  const [targetKb, setTargetKb] = useState(300)
  const [busy, setBusy] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [inputSizeBytes, setInputSizeBytes] = useState<number | null>(null)
  const [outputMeta, setOutputMeta] = useState<{ format: string; sizeBytes: number; quality?: number } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState<string | undefined>(undefined)

  const inputUrl = useMemo(() => (inputPath ? toLocalfileUrl(inputPath) : null), [inputPath])
  const outputUrl = useMemo(() => (outputPath ? toLocalfileUrl(outputPath) : null), [outputPath])

  const openImage = async () => {
    setErrorText(null)
    const res = await window.toolsx.files.openImage()
    if (res.canceled || !res.filePath) return
    setInputPath(res.filePath)
    setOutputPath(null)
    setInputSizeBytes(null)
    setOutputMeta(null)

    try {
      const info = await window.toolsx.files.getFileInfo({ filePath: res.filePath })
      setInputSizeBytes(info.sizeBytes)
    } catch {
      setInputSizeBytes(null)
    }
  }

  const compress = async () => {
    if (!inputPath) return
    setBusy(true)
    try {
      const res = await window.toolsx.imageConvert.convert({
        inputPath,
        mode: 'targetSize',
        targetKb,
        prefer: 'auto-small'
      })
      setOutputPath(res.outputPath)
      setOutputMeta({ format: res.format, sizeBytes: res.sizeBytes, quality: res.quality })
      setErrorText(null)
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const saveOutput = async () => {
    if (!outputPath) return
    try {
      const ext = outputMeta?.format ?? 'webp'
      const res = await window.toolsx.files.saveImage({
        sourcePath: outputPath,
        defaultName: `compressed.${ext === 'jpeg' ? 'jpg' : ext}`
      })
      if (!res.canceled && res.savedPath) {
        setErrorText(null)
        alert(`图片已保存到：${res.savedPath}`)
      }
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
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
            onClick={openImage}
          >
            <FileImage className="h-4 w-4" />
            选择图片
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-1">
            <div className="text-sm font-semibold text-app-text">压缩设置</div>

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

            <div className="mt-4 flex items-center gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                disabled={!inputPath || busy}
                onClick={compress}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                开始压缩
              </button>

              {outputPath ? (
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
                  onClick={saveOutput}
                >
                  <Download className="h-4 w-4" />
                  保存
                </button>
              ) : null}
            </div>

            {inputPath ? <div className="mt-2 break-all text-xs text-app-muted">{inputPath}</div> : null}

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
                {inputPath ? <div className="mt-2 break-all text-xs text-app-muted">{inputPath}</div> : null}
                {inputSizeBytes != null ? (
                  <div className="mt-2 text-xs text-app-muted">原图：{(inputSizeBytes / 1024).toFixed(1)}KB</div>
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
                {outputPath ? <div className="mt-2 break-all text-xs text-app-muted">{outputPath}</div> : null}
                {outputMeta ? (
                  <div className="mt-2 text-xs text-app-muted">
                    {inputSizeBytes != null ? (
                      <div>原图：{(inputSizeBytes / 1024).toFixed(1)}KB</div>
                    ) : null}
                    输出：{String(outputMeta.format).toUpperCase()} / {(outputMeta.sizeBytes / 1024).toFixed(1)}KB
                    {outputMeta.quality ? ` / 质量 ${outputMeta.quality}` : ''}
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
