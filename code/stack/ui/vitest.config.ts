import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Les tests tournent dans jsdom, avec la même configuration Vite que Storybook (React, Tailwind).
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
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          // Hors du code mesuré : les tests et leurs doubles.
          'src/**/*.test.{ts,tsx}',
          'src/test/**',
          // Barrels : réexports sans logique.
          'src/**/index.ts',
          // Types purs : aucune instruction exécutable.
          'src/**/types.ts',
        ],
        reporter: ['text', 'text-summary', 'html'],
        thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
      },
    },
  }),
)
