import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 3003,
    strictPort: true,
    proxy: {
      '/poloperator': {
        target: 'https://poloperator.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/poloperator/, ''),
      },
    },
  },
})
