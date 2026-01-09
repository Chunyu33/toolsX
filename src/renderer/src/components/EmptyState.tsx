import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  icon?: ReactNode
}

export default function EmptyState({ title, description, icon }: Props) {
  return (
    <div className="flex min-h-[280px] w-full items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-app-border/70 bg-app-surface/70 p-8 text-center shadow-sm backdrop-blur">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-700 ring-1 ring-brand-300/40 dark:text-brand-200">
          {icon}
        </div>
        <div className="mt-4 text-base font-semibold text-app-text">{title}</div>
        {description ? <div className="mt-2 text-sm leading-relaxed text-app-muted">{description}</div> : null}
      </div>
    </div>
  )
}
