import { useMemo, useRef, useState } from 'react'
import { Film, Loader2, Play, Wand2 } from 'lucide-react'
import { toLocalfileUrl } from './utils'

type Segment = {
  startSeconds: number
  endSeconds: number
}

// Minimal first version: user chooses a file, sets segment, preview video in that range, then generate GIF.
export default function VideoToGifPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoPath, setVideoPath] = useState<string | null>(null)
  const [segment, setSegment] = useState<Segment>({ startSeconds: 0, endSeconds: 3 })
  const [gifPath, setGifPath] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [videoPlayable, setVideoPlayable] = useState(true)
  const [errorText, setErrorText] = useState<string | null>(null)

  const videoUrl = useMemo(() => (videoPath ? toLocalfileUrl(videoPath) : null), [videoPath])
  const gifUrl = useMemo(() => (gifPath ? toLocalfileUrl(gifPath) : null), [gifPath])

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
        endSeconds: segment.endSeconds
      })
      setGifPath(result.gifPath)
      setErrorText(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('ffmpeg-static')) {
        setErrorText('缺少依赖 ffmpeg-static：请在项目根目录执行 npm install（安装后重启 npm run dev）。')
      } else {
        setErrorText(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
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

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-app-border bg-app-surface2 p-4">
            <div className="text-sm font-semibold text-app-text">片段设置</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-xs text-app-muted">
                开始（秒）
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={segment.startSeconds}
                  onChange={(e) => setSegment((s) => ({ ...s, startSeconds: Number(e.currentTarget.value) }))}
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
                  onChange={(e) => setSegment((s) => ({ ...s, endSeconds: Number(e.currentTarget.value) }))}
                  className="mt-1 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:border-brand-300"
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

              {videoPath ? <div className="truncate text-xs text-app-muted">{videoPath}</div> : null}
            </div>

            {errorText ? (
              <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-red-600">
                {errorText}
              </div>
            ) : null}

            <div className="mt-4">
              <div className="text-xs font-semibold text-app-text">视频预览</div>
              <div className="mt-2 overflow-hidden rounded-xl border border-app-border bg-black">
                {videoUrl ? (
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    className="h-[260px] w-full"
                    onError={() => {
                      setVideoPlayable(false)
                      setErrorText('该视频格式/编码无法在应用内预览。你仍可尝试直接生成 GIF。')
                    }}
                    onCanPlay={() => setVideoPlayable(true)}
                  />
                ) : (
                  <div className="flex h-[260px] items-center justify-center text-sm text-app-muted">未选择视频</div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-app-border bg-app-surface2 p-4">
            <div className="text-sm font-semibold text-app-text">GIF 预览</div>
            <div className="mt-2 overflow-hidden rounded-xl border border-app-border bg-app-surface">
              {gifUrl ? (
                <img src={gifUrl} className="block h-[320px] w-full object-contain" />
              ) : (
                <div className="flex h-[320px] items-center justify-center text-sm text-app-muted">尚未生成</div>
              )}
            </div>
            <div className="mt-2 text-xs text-app-muted">首次版本：默认 12fps / 720px 宽度，后续可在设置中加入质量参数</div>
          </div>
        </div>
      </div>
    </div>
  )
}
