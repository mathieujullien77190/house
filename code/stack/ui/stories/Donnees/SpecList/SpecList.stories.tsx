import type { Meta, StoryObj } from '@storybook/react-vite'
import { SpecList } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './SpecList.en.md?raw'
import fr from './SpecList.fr.md?raw'
import machineCode from './Machine.source.md?raw'

const meta: Meta<typeof SpecList> = {
  title: 'Données/SpecList',
  component: SpecList,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const Machine: StoryObj<typeof SpecList> = {
  parameters: source(machineCode),
  args: {
    items: [
      { id: 'cpu', label: 'Processeur', value: 'AMD Ryzen 5 7530U (6 cœurs, 12 threads, 4.5 GHz)' },
      { id: 'memory', label: 'Mémoire', value: '14.5 Go vus par le système' },
      { id: 'disk', label: 'Disque', value: 'CF450 1TB · 953.9 Go · SSD' },
      { id: 'os', label: 'Système', value: 'Ubuntu 26.04.1 LTS · noyau 7.0.0-42-generic' },
    ],
  },
}
