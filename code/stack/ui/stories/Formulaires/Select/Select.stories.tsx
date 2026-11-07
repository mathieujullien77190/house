import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Select } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './Select.en.md?raw'
import fr from './Select.fr.md?raw'
import cameraCode from './Camera.source.md?raw'

const OPTIONS = [
  { value: '', label: 'Toutes' },
  { value: 'voliere-exterieur', label: 'voliere-exterieur' },
  { value: 'voliere-interieur', label: 'voliere-interieur' },
]

const Camera = () => {
  const [camera, setCamera] = useState('')
  return <Select label="Caméra" options={OPTIONS} value={camera} onChange={setCamera} />
}

const meta: Meta<typeof Select> = {
  title: 'Formulaires/Select',
  component: Select,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const CameraStory: StoryObj<typeof Select> = {
  name: 'Caméra',
  parameters: source(cameraCode),
  render: () => <Camera />,
}
