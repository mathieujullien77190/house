import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tabs } from '../../../src'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './Tabs.en.md?raw'
import fr from './Tabs.fr.md?raw'
import pagesCode from './Pages.source.md?raw'

type TabId = 'cameras' | 'api' | 'frigate'

const OPTIONS: { id: TabId; label: string }[] = [
  { id: 'cameras', label: 'Caméras' },
  { id: 'api', label: 'API' },
  { id: 'frigate', label: 'Frigate' },
]

/** L'état de l'onglet est au parent : la story le tient ici. */
const Pages = () => {
  const [tab, setTab] = useState<TabId>('cameras')
  return <Tabs label="Pages" options={OPTIONS} value={tab} onChange={setTab} />
}

const meta: Meta<typeof Tabs> = {
  title: 'Base/Tabs',
  component: Tabs,
  parameters: prose({ fr, en }),
}

export default meta

export const PagesStory: StoryObj<typeof Tabs> = {
  name: 'Pages',
  parameters: source(pagesCode),
  render: () => <Pages />,
}
