import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Tokens from './pages/Tokens.jsx'
import Typography from './pages/Typography.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tokens" element={<Tokens />} />
        <Route path="/typography" element={<Typography />} />
      </Routes>
    </BrowserRouter>
  )
}
