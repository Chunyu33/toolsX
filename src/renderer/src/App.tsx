import { Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ToolPage from './pages/ToolPage'

export default function App() {
  return (
    <div className="h-full min-h-0">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tool/:toolId" element={<ToolPage />} />
      </Routes>
    </div>
  )
}
