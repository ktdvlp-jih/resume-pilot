import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function stripCrossorigin(): Plugin {
  return {
    name: 'strip-crossorigin',
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin/g, '')
    },
  }
}

export default defineConfig({
  base: process.env.VITE_BASE || '/admin/',
  plugins: [react(), tailwindcss(), stripCrossorigin()],
  server: {
    port: 5174,
    host: true,
  },
})
