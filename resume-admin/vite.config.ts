import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: process.env.VITE_BASE || '/admin/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    host: true,
  },
})
