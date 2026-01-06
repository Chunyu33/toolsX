import { useMemo, useState } from 'react'
import { Download, FileImage, Loader2, Wand2 } from 'lucide-react'
import { toLocalfileUrl } from '../videoToGif/utils'
import ImagePreviewModal from '../../components/ImagePreviewModal'

import type { ToolsXApi } from '../../../../preload/bridge'

type SelectFormat = Exclude<Parameters<ToolsXApi['imageConvert']['convert']>[0]['format'], undefined>
type OutputFormat = Awaited<ReturnType<ToolsXApi['imageConvert']['convert']>>['format']

export default function ImageConvertPage() {
  const [inputPath, setInputPath] = useState<string | null>(null)
  const [outputPath, setOutputPath] = useState<string | null>(null)
  const [format, setFormat] = useState<SelectFormat>('png')
  const [quality, setQuality] = useState(80)
  const [useTargetSize, setUseTargetSize] = useState(false)
  const [targetKb, setTargetKb] = useState(300)
  const [prefer, setPrefer] = useState<'auto-small' | 'keep-format'>('auto-small')
  const [busy, setBusy] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [outputMeta, setOutputMeta] = useState<{ format: OutputFormat; sizeBytes: number; quality?: number } | null>(null)
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
    setOutputMeta(null)
  }

  const convert = async () => {
    if (!inputPath) return
    setBusy(true)
    try {
      const res = useTargetSize
        ? await window.toolsx.imageConvert.convert({
            mode: 'targetSize',
            inputPath,
            targetKb,
            prefer,
            format: prefer === 'keep-format' ? format : undefined
          })
        : await window.toolsx.imageConvert.convert({
            mode: 'convert',
            inputPath,
            format,
            quality: showQuality ? quality : undefined
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
      const ext = outputMeta?.format ?? format
      const res = await window.toolsx.files.saveImage({
        sourcePath: outputPath,
        defaultName: `output.${ext === 'jpeg' ? 'jpg' : ext}`
      })
      if (!res.canceled && res.savedPath) {
        setErrorText(null)
        alert(`图片已保存到：${res.savedPath}`)
      }
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    }
  }

  const showQuality = format === 'jpeg' || format === 'webp' || format === 'avif'

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
            <div className="text-lg font-semibold text-app-text">图片格式转换</div>
            <div className="mt-1 text-sm text-app-muted">PNG / JPG / WebP / AVIF / GIF / ICO 格式互转，支持质量设置</div>
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
            <div className="text-sm font-semibold text-app-text">设置与操作</div>

            <div className="mt-3">
              <div className="text-xs font-semibold text-app-text">输出格式</div>
              <select
                className="mt-1 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:border-brand-300"
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
            </div>

            <label className="mt-4 flex items-center gap-2 text-xs text-app-muted">
              <input
                type="checkbox"
                checked={useTargetSize}
                onChange={(e) => setUseTargetSize(e.target.checked)}
              />
              按目标体积优化（自动调质量，优先更小格式）
            </label>

            {useTargetSize ? (
              <div className="mt-3 space-y-3">
                <label className="block text-xs text-app-muted">
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

                <label className="block text-xs text-app-muted">
                  策略
                  <select
                    className="mt-1 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:border-brand-300"
                    value={prefer}
                    onChange={(e) => setPrefer(e.target.value as 'auto-small' | 'keep-format')}
                  >
                    <option value="auto-small">自动选择更小格式（AVIF/WebP/JPG）</option>
                    <option value="keep-format">保持当前选择的格式</option>
                  </select>
                </label>
              </div>
            ) : null}

            {!useTargetSize && showQuality ? (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-app-text">质量</div>
                  <div className="text-xs text-app-muted">{quality}</div>
                </div>
                <input
                  className="mt-2 w-full"
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                />
              </div>
            ) : null}

            <div className="mt-4 flex items-center gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                disabled={!inputPath || busy}
                onClick={convert}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                转换
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
              </div>

              <div>
                <div className="text-sm font-semibold text-app-text">输出预览</div>
                <div className="mt-2 overflow-hidden rounded-xl border border-app-border bg-app-surface">
                  {outputUrl ? (
                    <button
                      className="block h-[360px] w-full cursor-zoom-in"
                      onClick={() => {
                        setPreviewSrc(outputUrl)
                        setPreviewTitle('输出预览')
                        setPreviewOpen(true)
                      }}
                      type="button"
                    >
                      <img src={outputUrl} className="block h-[360px] w-full object-contain" />
                    </button>
                  ) : (
                    <div className="flex h-[360px] items-center justify-center text-sm text-app-muted">尚未转换</div>
                  )}
                </div>
                {outputPath ? <div className="mt-2 break-all text-xs text-app-muted">{outputPath}</div> : null}
                {outputMeta ? (
                  <div className="mt-2 text-xs text-app-muted">
                    输出：{outputMeta.format.toUpperCase()} / {(outputMeta.sizeBytes / 1024).toFixed(1)}KB
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
