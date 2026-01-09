import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Binary, Braces, Clock, Crop, FileImage, FileJson, FileText, ImageDown, QrCode, SearchX, Video } from 'lucide-react'
import Header from '../components/Header'
import EmptyState from '../components/EmptyState'
import { tools } from '../features/tools/data'

function getToolIcon(toolId: string) {
  // 说明：首页只需要展示图标，不强制把 icon 字段塞进 shared 的 ToolDefinition，避免跨进程类型膨胀
  if (toolId === 'video-to-gif') return Video
  if (toolId === 'image-convert') return ImageDown
  if (toolId === 'image-compress') return FileImage
  if (toolId === 'image-crop') return Crop
  if (toolId === 'svg-tool') return FileImage
  if (toolId === 'timestamp-convert') return Clock
  if (toolId === 'base64-tool') return Binary
  if (toolId === 'qr-tool') return QrCode
  if (toolId === 'pdf-tool') return FileText
  if (toolId === 'json-formatter') return Braces
  return FileJson
}

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
    <div className="app-gradient-bg flex h-full min-h-0 flex-col">
      <Header title="工具列表" onSearchChange={setQuery} />

      <div className="page-enter min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-6">
          {query.trim() && list.length === 0 ? (
            <EmptyState
              title="没有匹配的工具"
              description={`试试换个关键词，比如“图片 / JSON / 时间戳”。当前搜索：${query.trim()}`}
              icon={<SearchX className="h-5 w-5" />}
            />
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {list.map((t) => (
                (() => {
                  const Icon = getToolIcon(t.id)
                  return (
                <Link
                  key={t.id}
                  to={t.route}
                  className="group relative overflow-hidden rounded-2xl border border-app-border/70 bg-app-surface/70 p-5 shadow-sm backdrop-blur transition hover:-translate-y-[1px] hover:border-brand-300 hover:shadow"
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                    <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-brand-500/10 blur-2xl" />
                    <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-brand-300/10 blur-2xl" />
                  </div>

                  <div className="relative flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-700 ring-1 ring-brand-300/40 transition group-hover:bg-brand-500/20 dark:text-brand-200">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold text-app-text">{t.title}</div>
                      <div className="mt-1 text-sm leading-relaxed text-app-muted">{t.description}</div>

                      <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-brand-600">
                        点击进入
                        <span className="transition group-hover:translate-x-0.5">→</span>
                      </div>
                    </div>
                  </div>
                </Link>
                  )
                })()
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
