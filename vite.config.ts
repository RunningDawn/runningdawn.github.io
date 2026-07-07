import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
  // loadEnv reads .env* files (incl .env.local) for local dev; process.env overrides for CI.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  return {
    plugins: [react(), tailwindcss(), tsconfigPaths()],
    define: {
      // Local dev sets FORGE_API_URL=http://localhost:5002 (.env.local); prod falls back.
      __API_URL__: JSON.stringify(env.FORGE_API_URL || 'https://api.forgehaven.io'),
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
