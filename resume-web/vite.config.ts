import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/** SPA-in-JAR(same-origin) — crossorigin 태그는 프록시/별도 오리진에서 CORS 403 유발 */
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
      includeAssets: ['favicon.svg', 'favicon.png', 'favicon-32.png', 'apple-touch-icon.png', 'logo-mark.png'],
      manifest: {
        name: 'ResumePilot',
        short_name: 'ResumePilot',
        description: '기업 맞춤 자기소개서 작성·첨삭',
        theme_color: '#7c3aed',
        background_color: '#fcfcfd',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon-32.png', sizes: '32x32', type: 'image/png', purpose: 'any' },
          { src: '/favicon.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/logo-mark.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/logo-mark.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/admin(?:\/|$)/,
          /^\/api(?:\/|$)/,
          /* `/swagger-ui.html`는 `/swagger-ui/`와 다름 — PWA navigateFallback이 SPA로 가로채지 않게 */
          /^\/swagger-ui(\.html(?:\?|$)|\/|$)/,
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
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
    proxy: {
      // dev에서 API를 same-origin으로 프록시 → HttpOnly 쿠키(게스트 체험)가 cross-origin 문제 없이 동작
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
