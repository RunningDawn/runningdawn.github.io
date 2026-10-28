import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
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
