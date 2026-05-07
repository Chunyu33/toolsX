import { Loader2 } from 'lucide-react'

type Props = {
  open: boolean
  text?: string
}

export default function LoadingOverlay({ open, text }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="flex items-center gap-2 rounded-sm bg-app-surface px-4 py-2.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-500" />
        <div className="text-xs text-app-text">{text ?? '处理中...'}</div>
      </div>
    </div>
  )
}
