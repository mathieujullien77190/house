```tsx
import { useState } from 'react'
import { LightsPanel } from '@house/ui'

const [drafts, setDrafts] = useState<Record<string, number>>({})
<LightsPanel
  rooms={rooms}
  busy=""
  dimmable={['26']} // seule cette lampe garde un curseur de luminosité
  drafts={drafts}
  onAll={(on) => setAll(on)}
  onRoom={(id, change) => setRoom(id, change)}
  onLight={(id, change) => setLight(id, change)}
  onDraft={(key, percent) => setDrafts((current) => ({ ...current, [key]: percent }))}
/>
```
