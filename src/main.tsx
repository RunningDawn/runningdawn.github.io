import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Drop the retired icon cache worker for returning visitors.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()))
  caches?.delete('albion-icons-v1')
}
