import type { Preview } from '@storybook/react-vite'
import './storybook.css'

// L'ordre des sections (de la base vers la page) doit être écrit en clair ici : Storybook le lit sans exécuter le fichier.
const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    options: { storySort: { order: ['Base', 'Formulaires', 'Données', 'Médias', 'Caméras', 'Pages'] } },
    docs: { source: { language: 'tsx' } },
  },
}

export default preview
