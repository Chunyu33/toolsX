import { useMemo, useState } from 'react'
import { Binary, Braces, Clock, Crop, FileImage, FileJson, FileText, ImageDown, QrCode, SearchX, Video } from 'lucide-react'
import Header from '../components/Header'
import EmptyState from '../components/EmptyState'
import ToolModal from '../components/ToolModal'
import { tools } from '../features/tools/data'

function getToolIcon(toolId: string) {
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
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null)

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
              description={`试试换个关键词，比如"图片 / JSON / 时间戳"。当前搜索：${query.trim()}`}
              icon={<SearchX className="h-5 w-5" />}
            />
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {list.map((t) => (
                (() => {
                  const Icon = getToolIcon(t.id)
                  return (
                <button
                  key={t.id}
                  className="group relative overflow-hidden rounded-2xl border border-app-border/50 bg-app-surface/80 p-4 text-left shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300/60 hover:shadow-lg hover:shadow-brand-500/5"
                  onClick={() => setSelectedToolId(t.id)}
                  type="button"
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-gradient-to-br from-brand-400/15 to-brand-500/10 blur-2xl" />
                    <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-gradient-to-tr from-brand-300/10 to-brand-200/5 blur-2xl" />
                  </div>

                  <div className="relative flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600 shadow-sm ring-1 ring-brand-200/50 transition-all duration-200 group-hover:shadow-md group-hover:ring-brand-300/60 dark:from-brand-200/20 dark:to-brand-100/10 dark:text-brand-400">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold text-app-text">{t.title}</div>
                      <div className="mt-0.5 text-[13px] leading-relaxed text-app-muted/80">{t.description}</div>

                      <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600/90 transition-colors group-hover:text-brand-600">
                        打开工具
                        <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                      </div>
                    </div>
                  </div>
                </button>
                  )
                })()
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 工具弹窗：始终渲染以保证出场动画可播放 */}
      <ToolModal
        toolId={selectedToolId || ''}
        open={Boolean(selectedToolId)}
        onClose={() => setSelectedToolId(null)}
      />
    </div>
  )
}
