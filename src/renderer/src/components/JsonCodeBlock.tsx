import { useMemo } from 'react'

type Token = { type: 'punct' | 'string' | 'number' | 'keyword' | 'whitespace' | 'other'; value: string }

function tokenizeJson(src: string): Token[] {
  const out: Token[] = []
  let i = 0

  const push = (type: Token['type'], value: string) => {
    if (!value) return
    out.push({ type, value })
  }

  while (i < src.length) {
    const ch = src[i]

    if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') {
      let j = i + 1
      while (j < src.length && (src[j] === ' ' || src[j] === '\n' || src[j] === '\t' || src[j] === '\r')) j++
      push('whitespace', src.slice(i, j))
      i = j
      continue
    }

    if (ch === '"') {
      let j = i + 1
      let escaped = false
      while (j < src.length) {
        const c = src[j]
        if (escaped) {
          escaped = false
          j++
          continue
        }
        if (c === '\\') {
          escaped = true
          j++
          continue
        }
        if (c === '"') {
          j++
          break
        }
        j++
      }
      push('string', src.slice(i, j))
      i = j
      continue
    }

    if ((ch >= '0' && ch <= '9') || ch === '-') {
      let j = i + 1
      while (j < src.length) {
        const c = src[j]
        if ((c >= '0' && c <= '9') || c === '.' || c === 'e' || c === 'E' || c === '+' || c === '-') {
          j++
          continue
        }
        break
      }
      push('number', src.slice(i, j))
      i = j
      continue
    }

    const punct = '{}[],:'.includes(ch)
    if (punct) {
      push('punct', ch)
      i++
      continue
    }

    if (src.startsWith('true', i) || src.startsWith('false', i) || src.startsWith('null', i)) {
      const kw = src.startsWith('true', i) ? 'true' : src.startsWith('false', i) ? 'false' : 'null'
      push('keyword', kw)
      i += kw.length
      continue
    }

    push('other', ch)
    i++
  }

  return out
}

function classFor(t: Token['type']): string {
  if (t === 'string') return 'text-emerald-600 dark:text-emerald-400'
  if (t === 'number') return 'text-sky-700 dark:text-sky-400'
  if (t === 'keyword') return 'text-violet-700 dark:text-violet-400'
  if (t === 'punct') return 'text-app-muted'
  if (t === 'other') return 'text-red-600'
  return ''
}

export default function JsonCodeBlock(props: { value: string; className?: string }) {
  const tokens = useMemo(() => tokenizeJson(props.value), [props.value])

  const baseClassName =
    'w-full overflow-auto rounded-xl border border-app-border bg-app-surface px-3 py-2 font-mono text-xs text-app-text'
  const className = props.className ? `${baseClassName} ${props.className}` : baseClassName

  return (
    <pre className={className}>
      <code>
        {tokens.map((t, idx) =>
          t.type === 'whitespace' ? (
            <span key={idx}>{t.value}</span>
          ) : (
            <span key={idx} className={classFor(t.type)}>
              {t.value}
            </span>
          )
        )}
      </code>
    </pre>
  )
}
