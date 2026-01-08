import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Film, Loader2, Play, Wand2 } from 'lucide-react'
import { toLocalfileUrl } from './utils'
import LoadingOverlay from '../../components/LoadingOverlay'
import Toast from '../../components/Toast'

type Segment = {
  startSeconds: number
  endSeconds: number
}

type GifOptions = {
  preset: 'low' | 'medium' | 'high' | 'custom'
  fps: number
  width: number
  keepOriginalWidth: boolean
}

// Minimal first version: user chooses a file, sets segment, preview video in that range, then generate GIF.
export default function VideoToGifPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [toastOpen, setToastOpen] = useState(false)
  const [toastText, setToastText] = useState('')
  const showToast = (text: string) => {
    setToastText(text)
    setToastOpen(true)
  }

  const [videoPath, setVideoPath] = useState<string | null>(null)
  const [segment, setSegment] = useState<Segment>({ startSeconds: 0, endSeconds: 3 })
  const [gifOptions, setGifOptions] = useState<GifOptions>({ preset: 'medium', fps: 12, width: 720, keepOriginalWidth: false })
  const [gifPath, setGifPath] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [videoPlayable, setVideoPlayable] = useState(true)
  const [errorText, setErrorText] = useState<string | null>(null)

  const videoUrl = useMemo(() => (videoPath ? toLocalfileUrl(videoPath) : null), [videoPath])
  const gifUrl = useMemo(() => (gifPath ? toLocalfileUrl(gifPath) : null), [gifPath])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.volume = 0.3
  }, [videoUrl])

  const applyPreset = (preset: GifOptions['preset']) => {
    if (preset === 'low') {
      setGifOptions((s) => ({ ...s, preset, fps: 10, width: 480, keepOriginalWidth: false }))
    } else if (preset === 'medium') {
      setGifOptions((s) => ({ ...s, preset, fps: 12, width: 720, keepOriginalWidth: false }))
    } else if (preset === 'high') {
      setGifOptions((s) => ({ ...s, preset, fps: 15, width: 1080, keepOriginalWidth: false }))
    } else {
      setGifOptions((s) => ({ ...s, preset }))
    }
  }

  const playSegment = async () => {
    const el = videoRef.current
    if (!el) return

    // Some containers/codecs (common: MKV) are not supported by Chromium's media stack.
    // If the video can't be played, prevent throwing DOMException and guide user.
    if (!videoPlayable) {
      setErrorText('该视频格式/编码无法在应用内预览（Chromium 不支持）。建议使用 MP4(H.264/AAC) 作为预览源。')
      return
    }

    el.currentTime = Math.max(0, segment.startSeconds)
    await el.play()

    const stopAt = Math.max(segment.startSeconds, segment.endSeconds)
    const onTimeUpdate = () => {
      if (el.currentTime >= stopAt) {
        el.pause()
        el.removeEventListener('timeupdate', onTimeUpdate)
      }
    }

    el.addEventListener('timeupdate', onTimeUpdate)
  }

  const openVideo = async () => {
    setErrorText(null)
    const res = await window.toolsx.files.openVideo()
    if (res.canceled || !res.filePath) return
    setVideoPath(res.filePath)
    setGifPath(null)
    setVideoPlayable(true)
  }

  const generateGif = async () => {
    if (!videoPath) return

    setBusy(true)
    try {
      const result = await window.toolsx.videoToGif.convert({
        inputPath: videoPath,
        startSeconds: segment.startSeconds,
        endSeconds: segment.endSeconds,
        fps: gifOptions.fps,
        width: gifOptions.keepOriginalWidth ? undefined : gifOptions.width,
        keepOriginalWidth: gifOptions.keepOriginalWidth
      })
      setGifPath(result.gifPath)
      setErrorText(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('ffmpeg-static')) {
        if (window.location.protocol === 'file:') {
          setErrorText(msg)
        } else {
          setErrorText('缺少依赖 ffmpeg-static：请在项目根目录执行 npm install（安装后重启 npm run dev）。')
        }
      } else {
        setErrorText(msg)
      }
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
            <div className="text-lg font-semibold text-app-text">视频转 GIF</div>
            <div className="mt-1 text-sm text-app-muted">选择视频文件，设置起止秒，预览并生成 GIF</div>
          </div>

          <button
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            onClick={openVideo}
          >
            <Film className="h-4 w-4" />
            选择视频
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-1">
            <div className="text-sm font-semibold text-app-text">设置与操作</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-xs text-app-muted">
                开始（秒）
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={segment.startSeconds}
                  onChange={(e) => {
                    const raw = e.target.value
                    const n = raw === '' ? 0 : Number(raw)
                    setSegment((s) => ({ ...s, startSeconds: Number.isFinite(n) ? n : s.startSeconds }))
                  }}
                  className="mt-1 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:border-brand-300"
                />
              </label>
              <label className="text-xs text-app-muted">
                结束（秒）
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={segment.endSeconds}
                  onChange={(e) => {
                    const raw = e.target.value
                    const n = raw === '' ? 0 : Number(raw)
                    setSegment((s) => ({ ...s, endSeconds: Number.isFinite(n) ? n : s.endSeconds }))
                  }}
                  className="mt-1 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:border-brand-300"
                />
              </label>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-app-text">质量预设</div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                <button
                  className={
                    gifOptions.preset === 'low'
                      ? 'rounded-lg bg-brand-600 px-2 py-2 text-xs font-medium text-white'
                      : 'rounded-lg border border-app-border bg-app-surface px-2 py-2 text-xs text-app-text hover:bg-app-surface2'
                  }
                  onClick={() => applyPreset('low')}
                  type="button"
                >
                  低
                </button>
                <button
                  className={
                    gifOptions.preset === 'medium'
                      ? 'rounded-lg bg-brand-600 px-2 py-2 text-xs font-medium text-white'
                      : 'rounded-lg border border-app-border bg-app-surface px-2 py-2 text-xs text-app-text hover:bg-app-surface2'
                  }
                  onClick={() => applyPreset('medium')}
                  type="button"
                >
                  中
                </button>
                <button
                  className={
                    gifOptions.preset === 'high'
                      ? 'rounded-lg bg-brand-600 px-2 py-2 text-xs font-medium text-white'
                      : 'rounded-lg border border-app-border bg-app-surface px-2 py-2 text-xs text-app-text hover:bg-app-surface2'
                  }
                  onClick={() => applyPreset('high')}
                  type="button"
                >
                  高
                </button>
                <button
                  className={
                    gifOptions.preset === 'custom'
                      ? 'rounded-lg bg-brand-600 px-2 py-2 text-xs font-medium text-white'
                      : 'rounded-lg border border-app-border bg-app-surface px-2 py-2 text-xs text-app-text hover:bg-app-surface2'
                  }
                  onClick={() => applyPreset('custom')}
                  type="button"
                >
                  自定义
                </button>
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2 text-xs text-app-muted">
              <input
                type="checkbox"
                checked={gifOptions.keepOriginalWidth}
                onChange={(e) => {
                  const v = e.target.checked
                  setGifOptions((s) => ({ ...s, keepOriginalWidth: v, preset: 'custom' }))
                }}
              />
              保持原视频宽度（不缩放）
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs text-app-muted">
                FPS
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={gifOptions.fps}
                  onChange={(e) => {
                    const raw = e.target.value
                    const n = raw === '' ? 12 : Number(raw)
                    setGifOptions((s) => ({
                      ...s,
                      preset: 'custom',
                      fps: Number.isFinite(n) ? Math.max(1, Math.round(n)) : s.fps
                    }))
                  }}
                  className="mt-1 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:border-brand-300"
                />
              </label>
              <label className="text-xs text-app-muted">
                宽度（px）
                <input
                  type="number"
                  min={64}
                  step={16}
                  value={gifOptions.width}
                  disabled={gifOptions.keepOriginalWidth}
                  onChange={(e) => {
                    const raw = e.target.value
                    const n = raw === '' ? 720 : Number(raw)
                    setGifOptions((s) => ({
                      ...s,
                      preset: 'custom',
                      width: Number.isFinite(n) ? Math.max(64, Math.round(n)) : s.width
                    }))
                  }}
                  className="mt-1 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:border-brand-300 disabled:opacity-60"
                />
              </label>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface"
                disabled={!videoUrl || !videoPlayable}
                onClick={playSegment}
              >
                <Play className="h-4 w-4" />
                预览片段
              </button>

              <button
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                disabled={!videoPath || busy}
                onClick={generateGif}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                生成 GIF
              </button>
            </div>

            {videoPath ? (
              <div className="mt-2 break-all text-xs text-app-muted">{videoPath}</div>
            ) : null}

            {errorText ? (
              <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-red-600">
                {errorText}
              </div>
            ) : null}

          </div>

          <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-2">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <div className="text-sm font-semibold text-app-text">视频预览</div>
                <div className="mt-2 overflow-hidden rounded-xl border border-app-border bg-black">
                  {videoUrl ? (
                    <video
                      key={videoUrl}
                      ref={videoRef}
                      src={videoUrl}
                      controls
                      controlsList="nofullscreen noremoteplayback"
                      disablePictureInPicture
                      className="h-[360px] w-full"
                      onError={(e) => {
                        const mediaError = e.currentTarget.error
                        const code = mediaError?.code
                        setVideoPlayable(false)
                        setErrorText(
                          `该视频无法在应用内预览。你仍可尝试直接生成 GIF。${code ? `（错误码：${code}）` : ''}`
                        )
                      }}
                      onLoadedMetadata={() => {
                        setVideoPlayable(true)
                        setErrorText(null)
                      }}
                      onCanPlay={() => {
                        setVideoPlayable(true)
                        setErrorText(null)
                      }}
                    />
                  ) : (
                    <div className="flex h-[360px] items-center justify-center text-sm text-app-muted">未选择视频</div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-app-text">GIF 预览</div>
                  {gifPath ? (
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                      onClick={async () => {
                        setBusy(true)
                        try {
                          const res = await window.toolsx.files.saveGif({ sourcePath: gifPath })
                          if (!res.canceled && res.savedPath) {
                            setErrorText(null)
                            showToast(`已保存：${res.savedPath}`)
                          }
                        } catch (e) {
                          setErrorText(e instanceof Error ? e.message : String(e))
                        } finally {
                          setBusy(false)
                        }
                      }}
                      disabled={busy}
                    >
                      <Download className="h-3.5 w-3.5" />
                      保存 GIF
                    </button>
                  ) : null}
                </div>
                <div className="mt-2 overflow-hidden rounded-xl border border-app-border bg-app-surface">
                  {gifUrl ? (
                    <img src={gifUrl} className="block h-[360px] w-full object-contain" />
                  ) : (
                    <div className="flex h-[360px] items-center justify-center text-sm text-app-muted">尚未生成</div>
                  )}
                </div>
                <div className="mt-2 text-xs text-app-muted">
                  当前配置：{gifOptions.fps}fps / {gifOptions.keepOriginalWidth ? '原始宽度' : `${gifOptions.width}px`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
