import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Pins Albion item icons in the Cache API forever (see public/icon-sw.js).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/icon-sw.js').catch(() => {})
}
