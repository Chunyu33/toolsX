import { useMemo, useState } from 'react'
import { Copy, Download, Eraser, Image as ImageIcon, Wand2 } from 'lucide-react'
import Toast from '../../components/Toast'

function safeBase64EncodeText(text: string): string {
  // 说明：btoa 只接受 Latin1，需要先转 UTF-8
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function safeBase64DecodeText(base64: string): string {
  // 说明：atob 返回的是二进制字符串，再转回 UTF-8
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

function extractMimeFromDataUrl(dataUrl: string): string | null {
  const m = /^data:([^;]+);base64,/i.exec(dataUrl.trim())
  return m?.[1] ?? null
}

function stripDataUrlPrefix(maybeDataUrl: string): { base64: string; mime?: string } {
  const s = maybeDataUrl.trim()
  if (s.startsWith('data:')) {
    const mime = extractMimeFromDataUrl(s) ?? undefined
    const idx = s.indexOf('base64,')
    return { base64: idx >= 0 ? s.slice(idx + 'base64,'.length) : s, mime }
  }
  return { base64: s }
}

function base64ToBlob(base64: string, mime: string): Blob {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

function guessFileExtFromMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  if (mime === 'image/svg+xml') return 'svg'
  if (mime === 'image/bmp') return 'bmp'
  if (mime === 'image/x-icon' || mime === 'image/vnd.microsoft.icon') return 'ico'
  return 'bin'
}

export default function Base64ToolPage() {
  const [tab, setTab] = useState<'text' | 'image'>('text')

  const [toastOpen, setToastOpen] = useState(false)
  const [toastText, setToastText] = useState('')

  const showToast = (text: string) => {
    setToastText(text)
    setToastOpen(true)
  }

  // 文本
  const [textInput, setTextInput] = useState('')
  const [textBase64, setTextBase64] = useState('')
  const [textError, setTextError] = useState<string | null>(null)

  const encodeText = () => {
    try {
      setTextBase64(safeBase64EncodeText(textInput))
      setTextError(null)
    } catch (e) {
      setTextError(e instanceof Error ? e.message : String(e))
    }
  }

  const decodeText = () => {
    try {
      setTextInput(safeBase64DecodeText(textBase64.trim()))
      setTextError(null)
    } catch (e) {
      setTextError('Base64 解码失败：请确认输入为有效 Base64 文本')
    }
  }

  // 图片
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [imgDataUrl, setImgDataUrl] = useState<string>('')
  const [imgError, setImgError] = useState<string | null>(null)

  const imgInfo = useMemo(() => {
    if (!imgDataUrl.trim()) return null
    const { base64, mime } = stripDataUrlPrefix(imgDataUrl)
    const detectedMime = mime ?? 'image/png'
    return { base64, mime: detectedMime }
  }, [imgDataUrl])

  const onPickImage = async (file: File) => {
    setImgError(null)
    try {
      // 说明：完全离线：使用 FileReader 读取本地文件为 DataURL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('读取文件失败'))
        reader.readAsDataURL(file)
      })

      setImgPreview(dataUrl)
      setImgDataUrl(dataUrl)
    } catch (e) {
      setImgError(e instanceof Error ? e.message : String(e))
    }
  }

  const parseBase64ToPreview = () => {
    setImgError(null)
    try {
      if (!imgInfo) throw new Error('请输入 Base64 或 DataURL')
      const { base64, mime } = imgInfo
      const blob = base64ToBlob(base64, mime)
      const url = URL.createObjectURL(blob)
      setImgPreview(url)
    } catch (e) {
      setImgError(e instanceof Error ? e.message : String(e))
    }
  }

  const downloadImage = () => {
    setImgError(null)
    try {
      if (!imgInfo) throw new Error('没有可下载的内容')
      const { base64, mime } = imgInfo
      const blob = base64ToBlob(base64, mime)
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `output.${guessFileExtFromMime(mime)}`
      document.body.appendChild(a)
      a.click()
      a.remove()

      // 说明：下载完成后释放 URL
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      showToast('已开始下载')
    } catch (e) {
      setImgError(e instanceof Error ? e.message : String(e))
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast('已复制到剪贴板')
    } catch {
      showToast('复制失败')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <Toast open={toastOpen} message={toastText} onClose={() => setToastOpen(false)} />

      <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-app-text">Base64 工具</div>
            <div className="mt-1 text-sm text-app-muted">支持文本与图片的 Base64 互转（完全离线处理）</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className={
                'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ' +
                (tab === 'text'
                  ? 'border-brand-300 bg-brand-500/10 text-app-text'
                  : 'border-app-border bg-app-surface text-app-muted hover:bg-app-surface2')
              }
              onClick={() => setTab('text')}
              type="button"
            >
              文本
            </button>
            <button
              className={
                'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ' +
                (tab === 'image'
                  ? 'border-brand-300 bg-brand-500/10 text-app-text'
                  : 'border-app-border bg-app-surface text-app-muted hover:bg-app-surface2')
              }
              onClick={() => setTab('image')}
              type="button"
            >
              图片
            </button>
          </div>
        </div>

        {tab === 'text' ? (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-1">
              <div className="text-sm font-semibold text-app-text">操作</div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  onClick={encodeText}
                  type="button"
                >
                  <Wand2 className="h-4 w-4" />
                  编码
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
                  onClick={decodeText}
                  type="button"
                >
                  解码
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
                  onClick={() => {
                    setTextInput('')
                    setTextBase64('')
                    setTextError(null)
                  }}
                  type="button"
                >
                  <Eraser className="h-4 w-4" />
                  清空
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
                  onClick={() => copy(textBase64)}
                  type="button"
                >
                  <Copy className="h-4 w-4" />
                  复制 Base64
                </button>
              </div>

              {textError ? (
                <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-red-600">{textError}</div>
              ) : null}

              <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-muted">
                说明：文本编码/解码使用 UTF-8（避免中文乱码），完全离线运行。
              </div>
            </div>

            <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-2">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <div className="text-sm font-semibold text-app-text">文本</div>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    spellCheck={false}
                    className="mt-2 h-[420px] w-full resize-none rounded-xl border border-app-border bg-app-surface px-3 py-2 font-mono text-xs text-app-text outline-none focus:border-brand-300"
                    placeholder="输入原文..."
                  />
                </div>
                <div>
                  <div className="text-sm font-semibold text-app-text">Base64</div>
                  <textarea
                    value={textBase64}
                    onChange={(e) => setTextBase64(e.target.value)}
                    spellCheck={false}
                    className="mt-2 h-[420px] w-full resize-none rounded-xl border border-app-border bg-app-surface px-3 py-2 font-mono text-xs text-app-text outline-none focus:border-brand-300"
                    placeholder="输入/输出 Base64..."
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-1">
              <div className="text-sm font-semibold text-app-text">操作</div>

              <label className="mt-3 block text-xs text-app-muted">
                选择图片
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.currentTarget.files?.[0]
                    if (f) void onPickImage(f)
                    e.currentTarget.value = ''
                  }}
                  className="mt-2 block w-full text-sm"
                />
              </label>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
                  onClick={parseBase64ToPreview}
                  type="button"
                >
                  <ImageIcon className="h-4 w-4" />
                  解析预览
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
                  onClick={downloadImage}
                  type="button"
                >
                  <Download className="h-4 w-4" />
                  下载图片
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
                  onClick={() => copy(imgDataUrl)}
                  type="button"
                >
                  <Copy className="h-4 w-4" />
                  复制 Base64
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
                  onClick={() => {
                    setImgPreview(null)
                    setImgDataUrl('')
                    setImgError(null)
                  }}
                  type="button"
                >
                  <Eraser className="h-4 w-4" />
                  清空
                </button>
              </div>

              {imgError ? (
                <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-red-600">{imgError}</div>
              ) : null}

              <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-muted">
                说明：
                1）可粘贴 DataURL（data:image/png;base64,...）或纯 Base64；
                2）完全离线处理，不经过主进程。
              </div>
            </div>

            <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-2">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <div className="text-sm font-semibold text-app-text">图片预览</div>
                  <div className="mt-2 overflow-hidden rounded-xl border border-app-border bg-app-surface">
                    {imgPreview ? (
                      <img src={imgPreview} className="block h-[360px] w-full object-contain" />
                    ) : (
                      <div className="flex h-[360px] items-center justify-center text-sm text-app-muted">尚未选择/解析</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-app-text">Base64 / DataURL</div>
                  <textarea
                    value={imgDataUrl}
                    onChange={(e) => setImgDataUrl(e.target.value)}
                    spellCheck={false}
                    className="mt-2 h-[360px] w-full resize-none rounded-xl border border-app-border bg-app-surface px-3 py-2 font-mono text-xs text-app-text outline-none focus:border-brand-300"
                    placeholder="粘贴 Base64 或 DataURL..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
