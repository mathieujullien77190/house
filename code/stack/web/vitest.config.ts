import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Les tests tournent dans jsdom, avec la même résolution que le build (alias `@/`, @house/ui lu en source).
// Le build (vite.config.ts) ne connaît pas Vitest : les fichiers `*.test.*` n'y entrent jamais (rien ne les importe).
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      restoreMocks: true,
      unstubGlobals: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          // Hors du code mesuré : les tests et leurs doubles.
          'src/**/*.test.{ts,tsx}',
          'src/test/**',
          // Point d'entrée : monte l'application dans #root (aucune logique, il ne se charge que dans la page).
          'src/main.tsx',
          // Types purs : aucune instruction exécutable.
          'src/**/types.ts',
          'src/types.ts',
          // Réexports (`export { default } from './X'`) : aucune logique.
          'src/**/index.ts',
        ],
        reporter: ['text', 'text-summary', 'html'],
        thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
      },
    },
  }),
)
