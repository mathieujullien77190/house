import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// Les services de House API, que le serveur de développement relaie vers l'API (certificat de la maison accepté).
const API_PATHS = ['/auth', '/direct', '/image', '/events', '/clips', '/snapshots', '/snapshot', '/stream', '/frame', '/poe', '/hue', '/welcome']
const API_URL = process.env.HOUSE_API_URL ?? 'https://localhost:8080'

export default defineConfig({
  // React Compiler : mémoïsation automatique des composants et hooks (pas sous Vitest : son code ajouté fausserait la couverture).
  plugins: [react(), ...(process.env.VITEST ? [] : [babel({ presets: [reactCompilerPreset()] })]), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    // @house/ui est un lien vers ../ui, consommé en source : React doit venir d'ici, une seule fois.
    preserveSymlinks: true,
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: { exclude: ['@house/ui'] },
  server: {
    port: 5180,
    proxy: Object.fromEntries(API_PATHS.map((path) => [path, { target: API_URL, secure: false }])),
  },
})
