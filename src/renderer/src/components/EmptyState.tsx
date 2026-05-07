import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  icon?: ReactNode
}

export default function EmptyState({ title, description, icon }: Props) {
  return (
    <div className="flex min-h-[200px] w-full items-center justify-center">
      <div className="text-center">
        {icon ? (
          <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-sm bg-app-surface2 text-app-muted">
            {icon}
          </div>
        ) : null}
        <div className="text-sm text-app-text">{title}</div>
        {description ? (
          <div className="mt-1 text-xs text-app-muted">{description}</div>
        ) : null}
      </div>
    </div>
  )
}
