import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Les services de House API, que le serveur de développement relaie vers l'API (certificat de la maison accepté).
const API_PATHS = ['/auth', '/direct', '/image', '/events', '/clips', '/welcome']
const API_URL = process.env.HOUSE_API_URL ?? 'https://localhost:8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5180,
    proxy: Object.fromEntries(API_PATHS.map((path) => [path, { target: API_URL, secure: false }])),
  },
})
