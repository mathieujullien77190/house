```tsx
import { useState } from 'react'
import { Pager } from '@house/ui'

const [page, setPage] = useState(0)
<Pager page={page} size={20} total={143} onPage={setPage} />
```
