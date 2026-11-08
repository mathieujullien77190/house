import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Les services de House Sync, relayés vers lui en développement (certificat de la maison accepté).
const SYNC_PATHS = ['/api', '/login', '/logout', '/files']
const SYNC_URL = process.env.HOUSE_SYNC_URL ?? 'https://localhost:8081'
// Le cookie de session est Secure : le serveur de développement doit être en HTTPS, avec le certificat de la maison.
const CERT = fileURLToPath(new URL('../../data/certs/cert.pem', import.meta.url))
const KEY = fileURLToPath(new URL('../../data/certs/key.pem', import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    // @house/ui est un lien vers ../../ui, consommé en source : React doit venir d'ici, une seule fois.
    preserveSymlinks: true,
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: { exclude: ['@house/ui'] },
  server: {
    port: 5181,
    https: existsSync(CERT) && existsSync(KEY) ? { cert: readFileSync(CERT), key: readFileSync(KEY) } : undefined,
    proxy: Object.fromEntries(SYNC_PATHS.map((path) => [path, { target: SYNC_URL, secure: false }])),
  },
  // Les essais (Vitest, jsdom) : la couverture ne mesure que le code de cette page (src), pas @house/ui, qui a ses propres essais.
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // main.tsx monte l'application dans la page (aucune logique) ; les fichiers types.ts ne contiennent que des types ; test-setup.ts est un outil des essais.
      exclude: ['src/main.tsx', 'src/**/types.ts', 'src/test-setup.ts', 'src/lib/fixtures.ts', 'src/**/*.test.{ts,tsx}'],
      reporter: ['text'],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
})
