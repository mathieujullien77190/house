```tsx
import { useState } from 'react'
import { Tabs } from '@house/ui'

type TabId = 'cameras' | 'lights' | 'api'
const OPTIONS: { id: TabId; label: string }[] = [
  { id: 'cameras', label: 'Caméras' },
  { id: 'lights', label: 'Lumière' },
  { id: 'api', label: 'API' },
]

const [tab, setTab] = useState<TabId>('cameras')
<Tabs label="Pages" options={OPTIONS} value={tab} onChange={setTab} />
```
