import { useEffect, useMemo, useState } from 'react'
import { Copy, RefreshCcw } from 'lucide-react'
import Toast from '../../components/Toast'

function isFiniteNumberString(s: string): boolean {
  const v = Number(s)
  return Number.isFinite(v)
}

function tryParseTimestamp(input: string): { value: number; unit: 'ms' | 's' } | null {
  const s = input.trim()
  if (!s) return null
  if (!isFiniteNumberString(s)) return null

  const n = Number(s)

  // 说明：常见时间戳位数判断
  // - 10 位左右通常是“秒”
  // - 13 位左右通常是“毫秒”
  // 这里不做过度复杂的 heuristics，避免误判；以 12 位作为分界线比较稳。
  const digits = s.replace(/^[-+]?/, '').replace(/^0+/, '').length
  const unit: 'ms' | 's' = digits >= 12 ? 'ms' : 's'
  return { value: n, unit }
}

function formatDateTime(tsMs: number): string {
  const d = new Date(tsMs)
  if (Number.isNaN(d.getTime())) return '-'
  const pad = (v: number, len = 2) => String(v).padStart(len, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.` +
    `${pad(d.getMilliseconds(), 3)}`
  )
}

export default function TimestampConvertPage() {
  const [input, setInput] = useState('')
  const [toastOpen, setToastOpen] = useState(false)
  const [toastText, setToastText] = useState('')
  const [nowMs, setNowMs] = useState(() => Date.now())

  const showToast = (text: string) => {
    setToastText(text)
    setToastOpen(true)
  }

  useEffect(() => {
    // 说明：实时刷新“当前系统时间”，默认 1s 一次即可（避免不必要的重渲染）
    const t = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const parsed = useMemo(() => tryParseTimestamp(input), [input])

  const output = useMemo(() => {
    if (!parsed) return null

    const ms = parsed.unit === 'ms' ? parsed.value : parsed.value * 1000
    const s = parsed.unit === 's' ? parsed.value : Math.floor(parsed.value / 1000)

    return {
      ms: String(Math.round(ms)),
      s: String(Math.round(s)),
      timeText: formatDateTime(ms)
    }
  }, [parsed])

  const fillNow = (unit: 'ms' | 's') => {
    const ms = Date.now()
    setInput(unit === 'ms' ? String(ms) : String(Math.floor(ms / 1000)))
  }

  const copyText = async (text: string) => {
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
            <div className="text-lg font-semibold text-app-text">时间戳转换</div>
            <div className="mt-1 text-sm text-app-muted">支持秒/毫秒互转，自动识别输入类型</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
              onClick={() => {
                setInput('')
              }}
              type="button"
            >
              清空
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-1">
            <div className="text-sm font-semibold text-app-text">输入</div>

            <label className="mt-3 block text-xs text-app-muted">
              时间戳（秒/毫秒）
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:border-brand-300"
                placeholder="例如：1700000000 或 1700000000000"
              />
            </label>

            <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-muted">
              当前系统时间：{formatDateTime(nowMs)}
              <div className="mt-1">毫秒：{nowMs}</div>
              <div>秒：{Math.floor(nowMs / 1000)}</div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 whitespace-nowrap"
                onClick={() => fillNow('ms')}
                type="button"
              >
                <RefreshCcw className="h-4 w-4" />
                填入当前（毫秒）
              </button>
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2 whitespace-nowrap"
                onClick={() => fillNow('s')}
                type="button"
              >
                <RefreshCcw className="h-4 w-4" />
                填入当前（秒）
              </button>
            </div>

            <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-muted">
              说明：输入位数 ≥ 12 位时按“毫秒”识别，否则按“秒”识别。
            </div>
          </div>

          <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-2">
            <div className="text-sm font-semibold text-app-text">输出</div>

            {!output ? (
              <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-10 text-center text-sm text-app-muted">请输入时间戳</div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-app-border bg-app-surface p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-app-text">毫秒（ms）</div>
                    <button
                      className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-2 py-1 text-xs text-app-text hover:bg-app-surface2"
                      onClick={() => copyText(output.ms)}
                      type="button"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      复制
                    </button>
                  </div>
                  <div className="mt-2 break-all font-mono text-sm text-app-text">{output.ms}</div>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-app-text">秒（s）</div>
                    <button
                      className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-2 py-1 text-xs text-app-text hover:bg-app-surface2"
                      onClick={() => copyText(output.s)}
                      type="button"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      复制
                    </button>
                  </div>
                  <div className="mt-2 break-all font-mono text-sm text-app-text">{output.s}</div>
                </div>

                <div className="md:col-span-2 rounded-xl border border-app-border bg-app-surface p-4">
                  <div className="text-xs font-semibold text-app-text">对应时间</div>
                  <div className="mt-2 font-mono text-sm text-app-text">{output.timeText}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
