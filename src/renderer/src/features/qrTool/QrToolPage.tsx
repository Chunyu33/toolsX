import { useMemo, useRef, useState } from 'react'
import { Copy, Download, Eraser, Image as ImageIcon, Wand2 } from 'lucide-react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import Toast from '../../components/Toast'

function stripDataUrlPrefix(maybeDataUrl: string): { base64: string; mime?: string } {
  const s = maybeDataUrl.trim()
  if (s.startsWith('data:')) {
    const m = /^data:([^;]+);base64,/i.exec(s)
    const mime = m?.[1]
    const idx = s.indexOf('base64,')
    return { base64: idx >= 0 ? s.slice(idx + 'base64,'.length) : s, mime }
  }
  return { base64: s }
}

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  // 说明：TypeScript 在某些 lib 定义下会把 Uint8Array.buffer 推导为 ArrayBufferLike。
  // 这里显式拷贝到 ArrayBuffer，避免 BlobPart 类型不兼容。
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

function guessFileExtFromMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  if (mime === 'image/svg+xml') return 'svg'
  return 'png'
}

async function fileToDataUrl(file: File): Promise<string> {
  // 说明：完全离线读取本地图片为 DataURL（data:image/...;base64,...）
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  // 说明：通过 Image 解码 DataURL/Blob URL，再绘制到 Canvas 做像素级解析
  return await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = src
  })
}

export default function QrToolPage() {
  const [tab, setTab] = useState<'gen' | 'scan'>('gen')

  const [toastOpen, setToastOpen] = useState(false)
  const [toastText, setToastText] = useState('')

  const showToast = (text: string) => {
    setToastText(text)
    setToastOpen(true)
  }

  // 生成
  const [genInput, setGenInput] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [genError, setGenError] = useState<string | null>(null)

  // 识别
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [scanText, setScanText] = useState<string>('')
  const [scanError, setScanError] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const qrInfo = useMemo(() => {
    if (!qrDataUrl.trim()) return null
    const { base64, mime } = stripDataUrlPrefix(qrDataUrl)
    const m = mime ?? 'image/png'
    return { base64, mime: m }
  }, [qrDataUrl])

  const generateQr = async () => {
    // 说明：二维码生成使用 qrcode（纯前端），不会经过主进程
    setGenError(null)
    try {
      const text = genInput.trim()
      if (!text) throw new Error('请输入 URL 或文本')

      const url = await QRCode.toDataURL(text, {
        margin: 2,
        width: 420,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })

      setQrDataUrl(url)
    } catch (e) {
      setGenError(e instanceof Error ? e.message : String(e))
    }
  }

  const downloadQr = () => {
    setGenError(null)
    try {
      if (!qrInfo) throw new Error('请先生成二维码')
      const { base64, mime } = qrInfo
      const bytes = base64ToBytes(base64)
      const blob = new Blob([bytesToArrayBuffer(bytes)], { type: mime })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `qrcode.${guessFileExtFromMime(mime)}`
      document.body.appendChild(a)
      a.click()
      a.remove()

      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      showToast('已开始下载')
    } catch (e) {
      setGenError(e instanceof Error ? e.message : String(e))
    }
  }

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast('已复制到剪贴板')
    } catch {
      showToast('复制失败')
    }
  }

  const scanFromDataUrl = async (dataUrl: string) => {
    // 说明：二维码识别流程：
    // 1）Image 解码图片
    // 2）绘制到 Canvas
    // 3）读取像素数据（ImageData）
    // 4）交给 jsQR 解析
    setScanError(null)
    setScanText('')

    try {
      const img = await loadImage(dataUrl)
      const canvas = canvasRef.current
      if (!canvas) throw new Error('Canvas 初始化失败')

      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 不支持 2D 上下文')

      const maxSide = 900
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))

      canvas.width = w
      canvas.height = h
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)

      const imageData = ctx.getImageData(0, 0, w, h)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth'
      })

      if (!code?.data) throw new Error('未识别到二维码，请尝试更清晰的图片')
      setScanText(code.data)
    } catch (e) {
      setScanError(e instanceof Error ? e.message : String(e))
    }
  }

  const onPickQrImage = async (file: File) => {
    setScanError(null)
    try {
      const dataUrl = await fileToDataUrl(file)
      setScanPreview(dataUrl)
      await scanFromDataUrl(dataUrl)
    } catch (e) {
      setScanError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <Toast open={toastOpen} message={toastText} onClose={() => setToastOpen(false)} />

      <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-app-text">二维码生成与识别</div>
            <div className="mt-1 text-sm text-app-muted">输入 URL/文本生成二维码，或上传二维码图片进行解析</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className={
                'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ' +
                (tab === 'gen'
                  ? 'border-brand-300 bg-brand-500/10 text-app-text'
                  : 'border-app-border bg-app-surface text-app-muted hover:bg-app-surface2')
              }
              onClick={() => setTab('gen')}
              type="button"
            >
              生成
            </button>
            <button
              className={
                'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ' +
                (tab === 'scan'
                  ? 'border-brand-300 bg-brand-500/10 text-app-text'
                  : 'border-app-border bg-app-surface text-app-muted hover:bg-app-surface2')
              }
              onClick={() => setTab('scan')}
              type="button"
            >
              识别
            </button>
          </div>
        </div>

        {tab === 'gen' ? (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-1">
              <div className="text-sm font-semibold text-app-text">输入</div>

              <label className="mt-3 block text-xs text-app-muted">
                URL / 文本
                <textarea
                  value={genInput}
                  onChange={(e) => setGenInput(e.target.value)}
                  spellCheck={false}
                  className="mt-2 h-[240px] w-full resize-none rounded-xl border border-app-border bg-app-surface px-3 py-2 font-mono text-xs text-app-text outline-none focus:border-brand-300"
                  placeholder="输入 URL 或任意文本..."
                />
              </label>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  onClick={generateQr}
                  type="button"
                >
                  <Wand2 className="h-4 w-4" />
                  生成
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
                  onClick={() => {
                    setGenInput('')
                    setQrDataUrl('')
                    setGenError(null)
                  }}
                  type="button"
                >
                  <Eraser className="h-4 w-4" />
                  清空
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2 disabled:opacity-60"
                  onClick={downloadQr}
                  disabled={!qrDataUrl}
                  type="button"
                >
                  <Download className="h-4 w-4" />
                  下载
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2 disabled:opacity-60"
                  onClick={() => copyText(genInput)}
                  disabled={!genInput.trim()}
                  type="button"
                >
                  <Copy className="h-4 w-4" />
                  复制输入
                </button>
              </div>

              {genError ? (
                <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-red-600">{genError}</div>
              ) : null}

              <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-muted">
                说明：生成二维码不会联网；二维码图片以 PNG（DataURL）形式生成。
              </div>
            </div>

            <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-app-text">预览</div>
                {qrDataUrl ? (
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-2 py-1 text-xs text-app-text hover:bg-app-surface2"
                    onClick={() => copyText(qrDataUrl)}
                    type="button"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    复制 DataURL
                  </button>
                ) : null}
              </div>

              <div className="mt-2 overflow-hidden rounded-xl border border-app-border bg-app-surface">
                {qrDataUrl ? (
                  <div className="flex items-center justify-center p-6">
                    <img src={qrDataUrl} className="block h-[360px] w-[360px] object-contain" />
                  </div>
                ) : (
                  <div className="flex h-[420px] items-center justify-center text-sm text-app-muted">尚未生成</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-1">
              <div className="text-sm font-semibold text-app-text">上传二维码图片</div>

              <label className="mt-3 block text-xs text-app-muted">
                选择图片
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.currentTarget.files?.[0]
                    if (f) void onPickQrImage(f)
                    e.currentTarget.value = ''
                  }}
                  className="mt-2 block w-full text-sm"
                />
              </label>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2 disabled:opacity-60"
                  onClick={() => {
                    if (scanPreview) void scanFromDataUrl(scanPreview)
                  }}
                  disabled={!scanPreview}
                  type="button"
                >
                  <ImageIcon className="h-4 w-4" />
                  重新识别
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
                  onClick={() => {
                    setScanPreview(null)
                    setScanText('')
                    setScanError(null)
                  }}
                  type="button"
                >
                  <Eraser className="h-4 w-4" />
                  清空
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2 disabled:opacity-60"
                  onClick={() => copyText(scanText)}
                  disabled={!scanText}
                  type="button"
                >
                  <Copy className="h-4 w-4" />
                  复制结果
                </button>
              </div>

              {scanError ? (
                <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-red-600">{scanError}</div>
              ) : null}

              <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-muted">
                说明：识别过程完全离线。若识别失败，建议换更清晰/更正的二维码截图。
              </div>
            </div>

            <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-2">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <div className="text-sm font-semibold text-app-text">图片预览</div>
                  <div className="mt-2 overflow-hidden rounded-xl border border-app-border bg-app-surface">
                    {scanPreview ? (
                      <img src={scanPreview} className="block h-[360px] w-full object-contain" />
                    ) : (
                      <div className="flex h-[360px] items-center justify-center text-sm text-app-muted">尚未选择</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-app-text">识别结果</div>
                    {scanText ? (
                      <button
                        className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-2 py-1 text-xs text-app-text hover:bg-app-surface2"
                        onClick={() => copyText(scanText)}
                        type="button"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        复制
                      </button>
                    ) : null}
                  </div>
                  <textarea
                    value={scanText}
                    onChange={(e) => setScanText(e.target.value)}
                    spellCheck={false}
                    className="mt-2 h-[360px] w-full resize-none rounded-xl border border-app-border bg-app-surface px-3 py-2 font-mono text-xs text-app-text outline-none focus:border-brand-300"
                    placeholder="识别结果会显示在这里..."
                  />
                </div>
              </div>

              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
