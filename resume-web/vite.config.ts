import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

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
  plugins: [
    react(),
    tailwindcss(),
    stripCrossorigin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'ResumePilot',
        short_name: 'ResumePilot',
        description: 'RAG 기반 기업 맞춤 자기소개서 작성·첨삭',
        theme_color: '#7c3aed',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/admin(?:\/|$)/,
          /^\/api(?:\/|$)/,
          /^\/swagger-ui(?:\/|$)/,
          /^\/api-docs(?:\/|$)/,
          /^\/actuator(?:\/|$)/,
        ],
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        /* Pretendard 동적 서브셋(92개 woff2)은 unicode-range 기반 온디맨드 로딩 — 프리캐시 제외 */
        globIgnores: ['**/PretendardVariable.subset*'],
      },
    }),
  ],
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
