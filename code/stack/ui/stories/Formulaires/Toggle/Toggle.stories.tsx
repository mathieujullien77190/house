import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Toggle } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './Toggle.en.md?raw'
import fr from './Toggle.fr.md?raw'
import switchCode from './Switch.source.md?raw'

const Switch = () => {
  const [on, setOn] = useState(false)
  return <Toggle label="Prise du chauffage" checked={on} onChange={setOn} />
}

const meta: Meta<typeof Toggle> = {
  title: 'Formulaires/Toggle',
  component: Toggle,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const SwitchStory: StoryObj<typeof Toggle> = {
  name: 'Interrupteur',
  parameters: source(switchCode),
  render: () => <Switch />,
}
