import { useState } from 'react'
import { Binary, Braces, Clock, Crop, FileImage, FileJson, FileText, ImageDown, QrCode, Video } from 'lucide-react'
import type { ToolDefinition } from '../../../shared/types'

/* 工具 ID → 图标映射，与 HomePage 保持一致 */
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

type Props = {
  tools: ToolDefinition[]
  activeToolId: string
  onSelect: (id: string) => void
}

export default function Sidebar({ tools, activeToolId, onSelect }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="sidebar shrink-0 overflow-hidden border-r border-app-border bg-app-surface2"
      style={{ width: expanded ? 180 : 48 }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="flex flex-col gap-0.5 p-1.5" style={{ width: 180 }}>
        {tools.map((t) => {
          const Icon = getToolIcon(t.id)
          const active = t.id === activeToolId

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              title={expanded ? undefined : t.title}
              className={
                active
                  ? 'sidebar-item flex items-center gap-2.5 rounded-sm border border-brand-500 bg-brand-50 px-2 py-1.5 text-left text-brand-500'
                  : 'sidebar-item flex items-center gap-2.5 rounded-sm border border-transparent px-2 py-1.5 text-left text-app-muted hover:bg-app-surface hover:text-app-text'
              }
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
              <span className="sidebar-label truncate text-xs whitespace-nowrap">{t.title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
