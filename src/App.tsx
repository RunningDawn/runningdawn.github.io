import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router'
import { Suspense, lazy, useInsertionEffect, type ComponentType } from 'react'
import { AuthProvider } from './auth/AuthProvider'
import LandingPage from './pages/LandingPage'
import AuthCallback from './pages/AuthCallback'

// On a stale GitHub Pages deploy, old content-hashed chunk names 404. Reload once to
// pick up the fresh index.html + chunk names instead of hanging on Suspense. (forge-web)
function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(() =>
    factory().catch(() => {
      const key = 'chunk-reload-attempted'
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        window.location.reload()
        return new Promise<{ default: T }>(() => {})
      }
      sessionStorage.removeItem(key)
      throw new Error('Chunk failed to load after reload.')
    }),
  )
}

// The whole Albion section (splash + Market Manager) is a large Tailwind app —
// lazy-load it so the landing page ships a small bundle.
const AlbionLayout = lazyWithReload(() => import('./games/albion/AlbionLayout'))

function TitleSync() {
  const { pathname } = useLocation()
  useInsertionEffect(() => {
    document.title = pathname.startsWith('/albion/market-manager')
      ? 'Market Manager | Running Dawn'
      : pathname.startsWith('/albion')
        ? 'Albion | Running Dawn'
        : 'Running Dawn'
  }, [pathname])
  return null
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TitleSync />
        <Suspense
          fallback={
            <div className="flex items-center justify-center w-full h-full">
              <div className="w-8 h-8 border-2 border-[#c4af64] border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/albion/*" element={<AlbionLayout />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
