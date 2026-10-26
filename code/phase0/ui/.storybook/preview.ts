import type { Preview } from '@storybook/react-vite'
import { themes } from 'storybook/theming'
import './storybook.css'

// L'ordre des sections (de la base vers la page) doit être écrit en clair ici : Storybook le lit sans exécuter le fichier.
const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    options: { storySort: { order: ['Base', 'Formulaires', 'Données', 'Médias', 'Caméras', 'Pages'] } },
    // La doc sur fond foncé, comme les jetons sombres de storybook.css.
    docs: { theme: themes.dark, source: { language: 'tsx' } },
    backgrounds: { disable: true },
  },
}

export default preview
