```tsx
import { HeatingPanel } from '@house/ui'

<HeatingPanel
  title="Chauffage automatique"
  enabledLabel="Activer la règle"
  enabled
  onEnabledChange={setEnabled}
  fields={[{ id: 'threshold', label: 'Température (°C)', value: '3', kind: 'number', onChange: setThreshold }]}
  saveLabel="Enregistrer"
  saving={false}
  onSave={save}
  status="Pas assez froid"
  logTitle="Journal"
  columns={{ when: 'Quand', origin: 'Origine', duration: 'Durée', temperature: 'Température', cost: 'Coût' }}
  rows={rows}
  emptyText="Aucune activation"
  total={{ label: 'Total', value: '0,05 €' }}
/>
```
