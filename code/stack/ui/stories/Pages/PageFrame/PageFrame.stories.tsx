import type { Meta, StoryObj } from '@storybook/react-vite'
import { PageFrame } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './PageFrame.en.md?raw'
import fr from './PageFrame.fr.md?raw'
import unknownCode from './Unknown.source.md?raw'

const meta: Meta<typeof PageFrame> = {
  title: 'Pages/PageFrame',
  component: PageFrame,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const Unknown: StoryObj<typeof PageFrame> = {
  parameters: source(unknownCode),
  args: {
    src: '',
    title: 'Frigate',
    intro: 'L’interface de Frigate, telle quelle.',
    emptyText: 'Adresse de Frigate inconnue : House Sync n’a pas encore écrit celle du direct.',
  },
}
