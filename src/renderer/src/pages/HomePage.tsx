import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { tools } from '../features/tools/data'

export default function HomePage() {
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tools
    return tools.filter((t) => {
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      )
    })
  }, [query])

  return (
    <div className="flex h-full min-h-0 flex-col bg-app-bg">
      <Header title="工具列表" onSearchChange={setQuery} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="rounded-xl border border-app-border bg-app-surface p-4 text-sm text-app-text shadow-sm">
            <div className="font-medium">IPC 测试</div>
            <div className="mt-2 flex items-center gap-2">
              <button
                className="rounded-lg bg-brand-600 px-3 py-2 text-white hover:bg-brand-700"
                onClick={async () => {
                  const msg = await window.toolsx.system.ping()
                  alert(msg)
                }}
              >
                Ping 主进程
              </button>
              <div className="text-app-muted">通过 preload 暴露的安全 API 调用</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {list.map((t) => (
              <Link
                key={t.id}
                to={t.route}
                className="group rounded-xl border border-app-border bg-app-surface p-5 shadow-sm transition hover:-translate-y-[1px] hover:border-brand-300 hover:shadow"
              >
                <div className="text-base font-semibold text-app-text">{t.title}</div>
                <div className="mt-2 text-sm leading-relaxed text-app-muted">{t.description}</div>
                <div className="mt-4 text-xs font-medium text-brand-600">点击进入</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
