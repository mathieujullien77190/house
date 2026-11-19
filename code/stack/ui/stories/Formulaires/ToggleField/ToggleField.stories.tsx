import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ToggleField } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './ToggleField.en.md?raw'
import fr from './ToggleField.fr.md?raw'
import optionCode from './Option.source.md?raw'

const Option = () => {
  const [checked, setChecked] = useState(false)
  return <ToggleField label="Éteindre si le détecteur voit un mouvement" checked={checked} onChange={setChecked} />
}

const meta: Meta<typeof ToggleField> = {
  title: 'Formulaires/ToggleField',
  component: ToggleField,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const OptionStory: StoryObj<typeof ToggleField> = {
  name: 'Option',
  parameters: source(optionCode),
  render: () => <Option />,
}
