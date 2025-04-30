import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import ViteSSG from 'vite-plugin-ssr/plugin'

export default defineConfig({
  plugins: [react(), ViteSSG()],
  build: {
    outDir: 'dist',
  },
  base: '/',
})
