import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // loadEnv reads .env* files (incl .env.local) for local dev; process.env overrides for CI.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  // Production builds ignore non-https API URLs so a dev .env.local
  // (localhost:5002) can never leak into a deployed bundle.
  const apiUrl =
    mode === 'production' && !(env.FORGE_API_URL ?? '').startsWith('https://')
      ? 'https://api.forgehaven.io'
      : env.FORGE_API_URL || 'https://api.forgehaven.io'
  return {
    plugins: [react(), tailwindcss()],
    define: {
      __API_URL__: JSON.stringify(apiUrl),
    },
    build: {
      outDir: 'dist',
    },
    base: '/',
    server: {
      watch: {
        usePolling: true
      }
    }
  }
})
