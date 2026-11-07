import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button, TopBar } from '../../../src'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './TopBar.en.md?raw'
import fr from './TopBar.fr.md?raw'
import barCode from './Bar.source.md?raw'

const TABS = [
  { id: 'db', label: 'Base' },
  { id: 'disk', label: 'Disque' },
  { id: 'system', label: 'Machine' },
]

const Bar = () => {
  const [tab, setTab] = useState('db')
  return <TopBar title="House Sync" status="mis à jour 19:25:01" tabs={{ label: 'Pages', options: TABS, value: tab, onChange: setTab }} actions={<Button>Quitter</Button>} />
}

const meta: Meta<typeof TopBar> = {
  title: 'Pages/TopBar',
  component: TopBar,
  parameters: prose({ fr, en }),
}

export default meta

export const BarStory: StoryObj<typeof TopBar> = {
  name: 'Titre, onglets et état',
  parameters: source(barCode),
  render: () => <Bar />,
}
