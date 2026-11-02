import type { Meta, StoryObj } from '@storybook/react-vite'
import { LineChart } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './LineChart.en.md?raw'
import fr from './LineChart.fr.md?raw'
import cpuCode from './Cpu.source.md?raw'

const meta: Meta<typeof LineChart> = {
  title: 'Données/LineChart',
  component: LineChart,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const Cpu: StoryObj<typeof LineChart> = {
  parameters: source(cpuCode),
  args: {
    title: 'Processeur',
    valueText: '34 %',
    label: 'Utilisation du processeur sur les deux dernières minutes',
    tone: 'orange',
    max: 100,
    capacity: 60,
    unit: '%',
    startLabel: '−2 min',
    endLabel: 'maintenant',
    values: [5, 8, 6, 12, 30, 55, 42, 38, 20, 14, 9, 7, 6, 18, 44, 61, 58, 40, 34, 33, 36, 31, 28, 34],
  },
}
