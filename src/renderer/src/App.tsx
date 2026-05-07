import { Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'

export default function App() {
  return (
    <div className="h-full min-h-0">
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </div>
  )
}
