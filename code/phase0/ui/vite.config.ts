// La configuration Vite que Storybook reprend : React et Tailwind, rien d'autre (le paquet n'a pas de build).
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
