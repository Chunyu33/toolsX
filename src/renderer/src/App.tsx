import { useEffect, useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ToolPageContainer from './pages/HomePage'
import { tools } from './features/tools/data'
import { applyThemeClass, getStoredThemeMode } from './theme/theme'

export default function App() {
  const [activeToolId, setActiveToolId] = useState('video-to-gif')

  /* 监听系统主题变化，确保"跟随系统"模式实时生效 */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeClass(getStoredThemeMode())
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col bg-app-bg">
      <Header />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          tools={tools}
          activeToolId={activeToolId}
          onSelect={setActiveToolId}
        />

        {/* 右侧工具内容区 — key 驱动页面切换动画 */}
        <main className="min-w-0 flex-1 overflow-auto panel-enter" key={activeToolId}>
          <ToolPageContainer toolId={activeToolId} />
        </main>
      </div>
    </div>
  )
}
