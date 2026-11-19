```tsx
import { useState } from 'react'
import { Toggle } from '@house/ui'

const [on, setOn] = useState(false)

<Toggle label="Prise du chauffage" checked={on} onChange={setOn} />
```
