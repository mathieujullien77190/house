```tsx
import { useState } from 'react'
import { TableFilters } from '@house/ui'

const [camera, setCamera] = useState('')
const [day, setDay] = useState('')

<TableFilters
  match={{ label: 'Caméra', allLabel: 'Toutes', value: camera, options: cameras, onChange: setCamera }}
  date={{ label: 'Date', value: day, onChange: setDay }}
  clear={{ label: 'Effacer les filtres', onClear: () => { setCamera(''); setDay('') } }}
/>
```
