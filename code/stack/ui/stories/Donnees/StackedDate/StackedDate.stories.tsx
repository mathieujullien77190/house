import type { Meta, StoryObj } from '@storybook/react-vite'
import { StackedDate } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './StackedDate.en.md?raw'
import fr from './StackedDate.fr.md?raw'
import dateCode from './Date.source.md?raw'

const meta: Meta<typeof StackedDate> = {
  title: 'Données/StackedDate',
  component: StackedDate,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const DateStory: StoryObj<typeof StackedDate> = {
  name: 'Date et heure',
  parameters: source(dateCode),
  render: () => <StackedDate date="07/11/2026" time="19:25:01" />,
}
