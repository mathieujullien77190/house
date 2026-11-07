import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Checkbox } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './Checkbox.en.md?raw'
import fr from './Checkbox.fr.md?raw'
import optionCode from './Option.source.md?raw'

const Option = () => {
  const [checked, setChecked] = useState(false)
  return <Checkbox label="Éteindre si le détecteur voit un mouvement" checked={checked} onChange={setChecked} />
}

const meta: Meta<typeof Checkbox> = {
  title: 'Formulaires/Checkbox',
  component: Checkbox,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const OptionStory: StoryObj<typeof Checkbox> = {
  name: 'Option',
  parameters: source(optionCode),
  render: () => <Option />,
}
