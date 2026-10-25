```tsx
import { useState } from 'react'
import { Tabs } from '@house/ui'

type TabId = 'cameras' | 'api' | 'frigate'
const OPTIONS: { id: TabId; label: string }[] = [
  { id: 'cameras', label: 'Caméras' },
  { id: 'api', label: 'API' },
  { id: 'frigate', label: 'Frigate' },
]

const [tab, setTab] = useState<TabId>('cameras')
<Tabs label="Pages" options={OPTIONS} value={tab} onChange={setTab} />
```
