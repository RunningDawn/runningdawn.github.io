import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import LandingPage from './pages/LandingPage'
import AlbionPage from './pages/AlbionPage'
import AuthCallback from './pages/AuthCallback'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/albion" element={<AlbionPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
