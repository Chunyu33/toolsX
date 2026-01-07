import { Loader2 } from 'lucide-react'

type Props = {
  open: boolean
  text?: string
}

export default function LoadingOverlay({ open, text }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="flex items-center gap-3 rounded-xl border border-app-border bg-app-surface px-4 py-3 shadow-app">
        <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
        <div className="text-sm text-app-text">{text ?? '处理中...'}</div>
      </div>
    </div>
  )
}
