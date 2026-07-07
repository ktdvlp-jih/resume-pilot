import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** SPA-in-JAR(same-origin) — crossorigin 태그는 Quick Tunnel 등에서 CORS 403 유발 */
function stripCrossorigin(): Plugin {
  return {
    name: 'strip-crossorigin',
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin/g, '')
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), stripCrossorigin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@tanstack/react-query')) return 'query';
            if (id.includes('react-router')) return 'router';
            if (id.includes('@sentry')) return 'sentry';
            if (id.includes('react-dom') || id.includes('react/')) return 'react';
            if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
})
