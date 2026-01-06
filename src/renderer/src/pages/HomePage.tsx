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
    <div className="min-h-screen bg-slate-50">
      <Header title="工具列表" onSearchChange={setQuery} />

      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <div className="font-medium text-slate-900">IPC 测试</div>
          <div className="mt-2 flex items-center gap-2">
            <button
              className="rounded-lg bg-slate-900 px-3 py-2 text-white hover:bg-slate-800"
              onClick={async () => {
                const msg = await window.toolsx.system.ping()
                alert(msg)
              }}
            >
              Ping 主进程
            </button>
            <div className="text-slate-500">通过 preload 暴露的安全 API 调用</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {list.map((t) => (
            <Link
              key={t.id}
              to={t.route}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-[1px] hover:border-slate-300 hover:shadow"
            >
              <div className="text-base font-semibold text-slate-900 group-hover:text-slate-950">
                {t.title}
              </div>
              <div className="mt-2 text-sm leading-relaxed text-slate-600">{t.description}</div>
              <div className="mt-4 text-xs font-medium text-slate-500">点击进入</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
