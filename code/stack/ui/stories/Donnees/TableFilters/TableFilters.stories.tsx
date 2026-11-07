import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { TableFilters } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './TableFilters.en.md?raw'
import fr from './TableFilters.fr.md?raw'
import cameraCode from './Camera.source.md?raw'

const CAMERAS = ['voliere-exterieur', 'voliere-interieur']

const Camera = () => {
  const [camera, setCamera] = useState('')
  const [day, setDay] = useState('')
  return (
    <TableFilters
      match={{ label: 'Caméra', allLabel: 'Toutes', value: camera, options: CAMERAS, onChange: setCamera }}
      date={{ label: 'Date', value: day, onChange: setDay }}
      clear={{ label: 'Effacer les filtres', onClear: () => { setCamera(''); setDay('') } }}
    />
  )
}

const meta: Meta<typeof TableFilters> = {
  title: 'Données/TableFilters',
  component: TableFilters,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const CameraStory: StoryObj<typeof TableFilters> = {
  name: 'Caméra et date',
  parameters: source(cameraCode),
  render: () => <Camera />,
}
