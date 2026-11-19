```tsx
import { useState } from 'react'
import { ToggleField } from '@house/ui'

const [checked, setChecked] = useState(false)

<ToggleField label="Éteindre si le détecteur voit un mouvement" checked={checked} onChange={setChecked} />
```
