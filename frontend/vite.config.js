import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND = process.env.BACKEND_URL || 'https://sistema-obrigacoes-production.up.railway.app'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['epimentel', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  preview: {
    port: 8080,
    host: true,
    proxy: {
      '/api': {
        target: BACKEND,
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
