```tsx
import { HeatingPanel } from '@house/ui'

<HeatingPanel
  enabledLabel="Activer la règle"
  enabled
  onEnabledChange={setEnabled}
  fields={[{ id: 'threshold', label: 'Température (°C)', value: '3', kind: 'number', onChange: setThreshold }]}
  saveLabel="Enregistrer"
  saving={false}
  onSave={save}
/>
```
