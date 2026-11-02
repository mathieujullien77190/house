import type { Meta, StoryObj } from '@storybook/react-vite'
import { Notice, SectionTitle } from '../../../src'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './SectionTitle.en.md?raw'
import fr from './SectionTitle.fr.md?raw'
import withDetailCode from './WithDetail.source.md?raw'

const meta: Meta<typeof SectionTitle> = {
  title: 'Base/SectionTitle',
  component: SectionTitle,
  parameters: prose({ fr, en }),
}

export default meta

export const WithDetail: StoryObj<typeof SectionTitle> = {
  name: 'With detail',
  parameters: source(withDetailCode),
  render: () => (
    <div>
      <SectionTitle text="Base SQLite" detail="/data/events.db" />
      <Notice text="Chargement…" />
      <Notice text="clé refusée" tone="error" />
    </div>
  ),
}
