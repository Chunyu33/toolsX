import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/Header'
import { tools } from '../features/tools/data'

export default function ToolPage() {
  const { toolId } = useParams()

  const tool = useMemo(() => tools.find((t) => t.id === toolId), [toolId])

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title={tool?.title ?? '工具'} />

      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="text-lg font-semibold text-slate-900">
            {tool?.title ?? '未找到该工具'}
          </div>
          <div className="mt-2 text-sm text-slate-600">{tool?.description ?? '请返回首页选择工具。'}</div>

          <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
            这里是占位页面：后续你可以把每个工具拆成独立的 feature 模块（页面 + hooks + ipc + 业务逻辑）。
          </div>
        </div>
      </div>
    </div>
  )
}
