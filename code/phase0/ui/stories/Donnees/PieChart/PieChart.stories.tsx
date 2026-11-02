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
    centerValue: '879.4 Go',
    centerLabel: 'libres sur 935.3 Go',
    slices: [
      { id: 'clips', label: 'Clips vidéo', value: 6e8, display: '572.2 Mo', tone: 'accent' },
      { id: 'snapshots', label: 'Images par minute', value: 1e8, display: '95.4 Mo', tone: 'green' },
      { id: 'db', label: 'Base SQLite', value: 36864, display: '36.0 Ko', tone: 'orange' },
      { id: 'other', label: 'Autres fichiers (système, enregistrements)', value: 17e9, display: '15.8 Go', tone: 'muted' },
      { id: 'reserved', label: 'Réservé au système (ext4)', value: 41948340224, display: '39.1 Go', tone: 'danger' },
      { id: 'free', label: 'Libre', value: 944120147968, display: '879.3 Go', tone: 'line' },
    ],
  },
}
