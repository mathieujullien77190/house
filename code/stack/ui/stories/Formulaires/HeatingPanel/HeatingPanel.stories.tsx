import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { HeatingPanel } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './HeatingPanel.en.md?raw'
import fr from './HeatingPanel.fr.md?raw'
import journalCode from './Journal.source.md?raw'

const columns = { when: 'Quand', origin: 'Origine', duration: 'Durée', temperature: 'Température', cost: 'Coût' }
const rows = [
  { id: '2', when: '9 nov. 03:12', origin: 'Automatique', duration: '5 min', temperature: '2,1 °C', cost: '0,0265 €' },
  { id: '1', when: '9 nov. 02:52', origin: 'Manuel', duration: '5 min', temperature: '–', cost: '0,0265 €' },
]

const Demo = () => {
  const [enabled, setEnabled] = useState(true)
  const [threshold, setThreshold] = useState('3')
  const [price, setPrice] = useState('0,1589')
  return (
    <HeatingPanel
      title="Chauffage automatique"
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
      status="Froid et nuit : la règle chauffera"
      logTitle="Journal des activations"
      columns={columns}
      rows={rows}
      emptyText="Aucune activation pour l’instant"
      total={{ label: 'Total', value: '0,053 €' }}
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

export const Journal: StoryObj<typeof HeatingPanel> = {
  parameters: source(journalCode),
  render: () => <Demo />,
}
