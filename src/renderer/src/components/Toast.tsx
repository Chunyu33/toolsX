import { useEffect } from 'react'

export default function Toast(props: {
  open: boolean
  message: string
  onClose: () => void
  durationMs?: number
}) {
  const { open, message, onClose, durationMs } = props

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => onClose(), durationMs ?? 1600)
    return () => window.clearTimeout(t)
  }, [open, durationMs, onClose])

  if (!open) return null

  return (
    <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
      <div className="rounded-sm bg-[#1A1A1A] px-4 py-2 text-xs text-white">
        {message}
      </div>
    </div>
  )
}
