import { useMemo, useState } from 'react'
import { Copy, Eraser, Scissors, Wand2 } from 'lucide-react'
import Toast from '../../components/Toast'
import JsonCodeBlock from '../../components/JsonCodeBlock'

export default function JsonFormatterPage() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [errorText, setErrorText] = useState<string | null>(null)
  const [indent, setIndent] = useState(2)
  const [toastOpen, setToastOpen] = useState(false)
  const [toastText, setToastText] = useState('')

  const showToast = (text: string) => {
    setToastText(text)
    setToastOpen(true)
  }

  const stats = useMemo(() => {
    return {
      inputLen: input.length,
      outputLen: output.length
    }
  }, [input, output])

  const validate = () => {
    try {
      JSON.parse(input)
      setErrorText(null)
      showToast('JSON 有效')
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    }
  }

  const formatJson = () => {
    try {
      const v = JSON.parse(input)
      const out = JSON.stringify(v, null, indent)
      setOutput(out)
      setErrorText(null)
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    }
  }

  const minify = () => {
    try {
      const v = JSON.parse(input)
      const out = JSON.stringify(v)
      setOutput(out)
      setErrorText(null)
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e))
    }
  }

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output || '')
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
            <div className="text-lg font-semibold text-app-text">JSON 格式化</div>
            <div className="mt-1 text-sm text-app-muted">格式化 / 压缩 / 校验 JSON，一键复制结果</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
              onClick={() => {
                setInput('')
                setOutput('')
                setErrorText(null)
              }}
              type="button"
            >
              <Eraser className="h-4 w-4" />
              清空
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-1">
            <div className="text-sm font-semibold text-app-text">操作</div>

            <label className="mt-3 block text-xs text-app-muted">
              缩进
              <input
                type="number"
                min={0}
                max={8}
                step={1}
                value={indent}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  setIndent(Number.isFinite(n) ? Math.max(0, Math.min(8, Math.round(n))) : 2)
                }}
                className="mt-1 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:border-brand-300"
              />
            </label>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                onClick={formatJson}
                type="button"
              >
                <Wand2 className="h-4 w-4" />
                格式化
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
                onClick={minify}
                type="button"
              >
                <Scissors className="h-4 w-4" />
                压缩
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
                onClick={validate}
                type="button"
              >
                校验
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface2"
                onClick={copyOutput}
                type="button"
              >
                <Copy className="h-4 w-4" />
                复制
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-muted">
              输入 {stats.inputLen} 字符，输出 {stats.outputLen} 字符
            </div>

            {errorText ? (
              <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-red-600">
                {errorText}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-app-border bg-app-surface2 p-4 lg:col-span-2">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <div className="text-sm font-semibold text-app-text">输入</div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  spellCheck={false}
                  className="mt-2 h-[420px] w-full resize-none rounded-xl border border-app-border bg-app-surface px-3 py-2 font-mono text-xs text-app-text outline-none focus:border-brand-300"
                  placeholder="粘贴 JSON..."
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-app-text">输出</div>
                  <div className="text-xs text-app-muted">高亮预览（只读）</div>
                </div>
                <div className="mt-2 h-[420px]">
                  <JsonCodeBlock value={output || ''} className="h-full w-full" />
                </div>
                <div className="mt-3 text-xs text-app-muted">如需编辑输出，可在下方文本框修改：</div>
                <textarea
                  value={output}
                  onChange={(e) => setOutput(e.target.value)}
                  spellCheck={false}
                  className="mt-2 h-[180px] w-full resize-none rounded-xl border border-app-border bg-app-surface px-3 py-2 font-mono text-xs text-app-text outline-none focus:border-brand-300"
                  placeholder="格式化/压缩结果..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
