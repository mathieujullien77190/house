import type { Meta, StoryObj } from '@storybook/react-vite'
import { LampDot, ValueChips } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './LampDot.en.md?raw'
import fr from './LampDot.fr.md?raw'
import statesCode from './States.source.md?raw'

const meta: Meta<typeof LampDot> = {
  title: 'Caméras/LampDot',
  component: LampDot,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const StatesStory: StoryObj<typeof LampDot> = {
  name: 'États',
  parameters: source(statesCode),
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1">
        <ValueChips values={['9,5 °C']} />
        <LampDot on reachable label="Lampe Perruche : allumée" />
      </div>
      <LampDot on={false} reachable label="Lampe Perruche : éteinte" />
      <LampDot on={false} reachable={false} label="Lampe Perruche : injoignable" />
    </div>
  ),
}
