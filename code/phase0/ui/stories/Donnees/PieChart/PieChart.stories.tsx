import type { Meta, StoryObj } from '@storybook/react-vite'
import { PieChart } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './PieChart.en.md?raw'
import fr from './PieChart.fr.md?raw'
import diskCode from './Disk.source.md?raw'

const meta: Meta<typeof PieChart> = {
  title: 'Données/PieChart',
  component: PieChart,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const Disk: StoryObj<typeof PieChart> = {
  parameters: source(diskCode),
  args: {
    label: 'Répartition de la place sur le disque',
    centerValue: '931.0 Go',
    centerLabel: 'libres sur 953.9 Go',
    slices: [
      { id: 'clips', label: 'Clips vidéo', value: 12e9, display: '11.2 Go', tone: 'accent' },
      { id: 'snapshots', label: 'Images par minute', value: 3e9, display: '2.8 Go', tone: 'green' },
      { id: 'db', label: 'Base SQLite', value: 5e7, display: '47.7 Mo', tone: 'orange' },
      { id: 'other', label: 'Autres fichiers', value: 8e9, display: '7.5 Go', tone: 'muted' },
      { id: 'free', label: 'Libre', value: 9.99e11, display: '931.0 Go', tone: 'line' },
    ],
  },
}
