import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Pager } from '../../../src'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './Pager.en.md?raw'
import fr from './Pager.fr.md?raw'
import pagesCode from './Pages.source.md?raw'

const Pages = () => {
  const [page, setPage] = useState(0)
  return <Pager page={page} size={20} total={143} onPage={setPage} />
}

const meta: Meta<typeof Pager> = {
  title: 'Données/Pager',
  component: Pager,
  parameters: prose({ fr, en }),
}

export default meta

export const PagesStory: StoryObj<typeof Pager> = {
  name: 'Pages',
  parameters: source(pagesCode),
  render: () => <Pages />,
}
