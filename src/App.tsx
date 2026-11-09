import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router'
import { Suspense, lazy, useEffect, type ComponentType } from 'react'
import { AuthProvider } from './auth/AuthProvider'
import LandingPage from './pages/LandingPage'
import AuthCallback from './pages/AuthCallback'

// On a stale GitHub Pages deploy, old content-hashed chunk names 404. Reload once to
// pick up the fresh index.html + chunk names instead of hanging on Suspense. (forge-web)
function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  const key = 'chunk-reload-attempted'
  return lazy(() =>
    factory().then(mod => {
      sessionStorage.removeItem(key)
      return mod
    }, () => {
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

// The WoW section is a Tailwind app with its own chrome; lazy-load it so the
// landing page ships a small bundle.
const WowfLayout = lazyWithReload(() => import('./games/wowf/WowfLayout'))

function TitleSync() {
  const { pathname } = useLocation()
  useEffect(() => {
    const wowf = pathname.startsWith('/wow-forever')
    document.title = wowf ? 'WoW: Forever | Running Dawn' : 'Running Dawn'
    // The WoW section installs as its own app: swap the manifest and the iOS home-screen name.
    document.querySelector('link[rel="manifest"]')
      ?.setAttribute('href', wowf ? '/manifest-wowf.json' : '/manifest.json')
    document.querySelector('meta[name="apple-mobile-web-app-title"]')
      ?.setAttribute('content', wowf ? 'DAWN WOW:F' : 'Running Dawn')
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
            <Route path="/wow-forever/*" element={<WowfLayout />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
