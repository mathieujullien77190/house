import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { HeatingPanel } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './HeatingPanel.en.md?raw'
import fr from './HeatingPanel.fr.md?raw'
import formCode from './Form.source.md?raw'

const Demo = () => {
  const [enabled, setEnabled] = useState(true)
  const [threshold, setThreshold] = useState('3')
  const [price, setPrice] = useState('0,1589')
  return (
    <HeatingPanel
      enabledLabel="Activer la règle"
      enabled={enabled}
      onEnabledChange={setEnabled}
      fields={[
        { id: 'threshold', label: 'Température (°C)', value: threshold, kind: 'number', onChange: setThreshold },
        { id: 'price', label: 'Prix du kWh heures creuses (€ TTC)', value: price, kind: 'decimal', onChange: setPrice },
        { id: 'start', label: 'Début des heures creuses', value: '23:10', kind: 'time', onChange: () => undefined },
      ]}
      saveLabel="Enregistrer"
      saving={false}
      onSave={() => undefined}
    />
  )
}

const meta: Meta<typeof HeatingPanel> = {
  title: 'Formulaires/HeatingPanel',
  component: HeatingPanel,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const Formulaire: StoryObj<typeof HeatingPanel> = {
  parameters: source(formCode),
  render: () => <Demo />,
}
