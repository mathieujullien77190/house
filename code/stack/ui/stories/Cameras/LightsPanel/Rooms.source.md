```tsx
import { useState } from 'react'
import { LightsPanel } from '@house/ui'

const [drafts, setDrafts] = useState<Record<string, number>>({})
<LightsPanel
  rooms={rooms}
  busy=""
  drafts={drafts}
  onAll={(on) => setAll(on)}
  onRoom={(id, change) => setRoom(id, change)}
  onLight={(id, change) => setLight(id, change)}
  onDraft={(key, percent) => setDrafts((current) => ({ ...current, [key]: percent }))}
/>
```
