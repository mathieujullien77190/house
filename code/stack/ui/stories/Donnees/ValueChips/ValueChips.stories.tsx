import type { Meta, StoryObj } from '@storybook/react-vite'
import { ValueChips } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './ValueChips.en.md?raw'
import fr from './ValueChips.fr.md?raw'
import temperaturesCode from './Temperatures.source.md?raw'

const meta: Meta<typeof ValueChips> = {
  title: 'Données/ValueChips',
  component: ValueChips,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const Temperatures: StoryObj<typeof ValueChips> = {
  parameters: source(temperaturesCode),
  args: { values: ['9,5 °C', '12,1 °C'] },
}
