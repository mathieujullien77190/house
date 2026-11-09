import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  // React Compiler : mémoïsation automatique des composants et hooks.
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  // GitHub Pages sert le site sous /house/ ; en dev on reste a la racine.
  base: command === 'build' ? '/house/' : '/',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { open: true },
}))
