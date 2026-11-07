```tsx
import { useState } from 'react'
import { Select } from '@house/ui'

const [camera, setCamera] = useState('')

<Select
  label="Caméra"
  options={[
    { value: '', label: 'Toutes' },
    { value: 'voliere-interieur', label: 'voliere-interieur' },
  ]}
  value={camera}
  onChange={setCamera}
/>
```
