import { Route, Routes, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ToolPage from './pages/ToolPage'

export default function App() {
  const location = useLocation()

  return (
    <div key={location.pathname} className="page-enter">
      <Routes location={location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/tool/:toolId" element={<ToolPage />} />
      </Routes>
    </div>
  )
}
