```tsx
import { useState } from 'react'
import { KeyForm } from '@house/ui'

const [value, setValue] = useState('')
const [busy, setBusy] = useState(false)

<KeyForm
  value={value}
  busy={busy}
  hint="La clé de House API (API_KEY dans le fichier .env du PC). Elle reste dans cet onglet."
  onChange={setValue}
  onSubmit={() => checkKey(value)}
/>
```
