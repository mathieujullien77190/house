import type { Meta, StoryObj } from '@storybook/react-vite'
import { Totals } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './Totals.en.md?raw'
import fr from './Totals.fr.md?raw'
import backupCode from './Backup.source.md?raw'

const meta: Meta<typeof Totals> = {
  title: 'Données/Totals',
  component: Totals,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const Backup: StoryObj<typeof Totals> = {
  parameters: source(backupCode),
  args: {
    totals: [
      { id: 'clips', value: '49.2 Mo', label: '6 vidéo(s) sur le disque backup' },
      { id: 'snapshots', value: '1.7 Mo', label: '48 image(s) par minute' },
      { id: 'db', value: '36.0 Ko', label: 'base SQLite · 7 événement(s)' },
    ],
  },
}
