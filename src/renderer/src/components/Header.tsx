import type { ChangeEvent } from 'react'
import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Info, Search } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

type Props = {
  title: string
  onSearchChange?: (value: string) => void
}

export default function Header({ title, onSearchChange }: Props) {
  const location = useLocation()
  const [search, setSearch] = useState('')

  const showBack = useMemo(() => location.pathname !== '/', [location.pathname])

  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
        {showBack ? (
          <Link
            to="/"
            className="rounded-md px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            返回
          </Link>
        ) : (
          <div className="w-[44px]" />
        )}

        <div className="flex-1">
          <div className="text-lg font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-slate-500">ToolsX · 全能工具箱</div>
        </div>

        <div className="relative hidden w-[320px] sm:block">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const v = e.currentTarget.value
              setSearch(v)
              onSearchChange?.(v)
            }}
            placeholder="搜索工具..."
            className="w-full rounded-lg border border-slate-200 bg-white px-9 py-2 text-sm outline-none focus:border-slate-300"
          />
        </div>

        <Dialog.Root>
          <Dialog.Trigger asChild>
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <Info className="h-4 w-4" />
              关于
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/30" />
            <Dialog.Content className="fixed left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-xl">
              <Dialog.Title className="text-base font-semibold text-slate-900">关于 ToolsX</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-slate-600">
                这是一个 Electron + React + Vite + Tailwind 的生产级骨架。
              </Dialog.Description>
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                你可以在这里逐步添加「视频转 GIF / 图片格式转换 / 压缩」等工具功能。
              </div>
              <div className="mt-4 flex justify-end">
                <Dialog.Close asChild>
                  <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                    知道了
                  </button>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  )
}
