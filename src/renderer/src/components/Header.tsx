import { useEffect, useState } from 'react'
import SettingsModal from './SettingsModal'
import appLogo from '../../../assets/app.png'

export default function Header() {
  const [isMax, setIsMax] = useState(false)

  useEffect(() => {
    let cancelled = false

    window.toolsx.windowControls
      .isMaximized()
      .then((v) => {
        if (!cancelled) setIsMax(v)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="sticky top-0 z-20 border-b border-app-border bg-app-surface">
      <div className="titlebar flex h-9 items-center">
        {/* Logo + 标题 */}
        <div className="flex items-center gap-2 pl-3 pr-2">
          <img src={appLogo} className="h-4 w-4 rounded-sm" draggable={false} />
          <div className="text-[13px] font-medium text-app-text">ToolsX</div>
        </div>

        <div className="flex-1" />

        {/* 设置 */}
        <div className="flex items-center gap-1 pr-1">
          <SettingsModal />
        </div>

        {/* 窗口控制 — 统一字号和宽度的文字图标 */}
        <div className="flex h-9 items-stretch justify-end">
          <button
            className="flex w-[34px] items-center justify-center text-[13px] text-app-muted leading-none hover:bg-app-surface2 hover:text-app-text"
            onClick={() => window.toolsx.windowControls.minimize()}
            title="最小化"
            type="button"
          >
            &#x2500;
          </button>
          <button
            className="flex w-[34px] items-center justify-center text-[13px] text-app-muted leading-none hover:bg-app-surface2 hover:text-app-text"
            onClick={async () => {
              await window.toolsx.windowControls.toggleMaximize()
              const v = await window.toolsx.windowControls.isMaximized()
              setIsMax(v)
            }}
            title={isMax ? '还原' : '最大化'}
            type="button"
          >
            {isMax ? '⧉' : '□'}
          </button>
          <button
            className="flex w-[34px] items-center justify-center text-[13px] text-app-muted leading-none hover:bg-[#FA5151] hover:text-white"
            onClick={() => window.toolsx.windowControls.close()}
            title="关闭"
            type="button"
          >
            &times;
          </button>
        </div>
      </div>
    </div>
  )
}
