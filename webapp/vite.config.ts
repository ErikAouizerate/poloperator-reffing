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
      // Absolute asset paths requested by the poloperator overlay page when it
      // is framed from /overlay. Regex keys so /icons.svg (our own favicon) is
      // NOT captured by the /icons/ rule.
      '^/_next/': { target: 'https://poloperator.com', changeOrigin: true },
      '^/icons/': { target: 'https://poloperator.com', changeOrigin: true },
      '^/icon\\.png(\\?|$)': { target: 'https://poloperator.com', changeOrigin: true },
      '^/apple-icon\\.png(\\?|$)': {
        target: 'https://poloperator.com',
        changeOrigin: true,
      },
      '^/manifest\\.json$': {
        target: 'https://poloperator.com',
        changeOrigin: true,
      },
    },
  },
})
