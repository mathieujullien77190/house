```tsx
import { useState } from 'react'
import { Checkbox } from '@house/ui'

const [checked, setChecked] = useState(false)

<Checkbox label="Éteindre si le détecteur voit un mouvement" checked={checked} onChange={setChecked} />
```
