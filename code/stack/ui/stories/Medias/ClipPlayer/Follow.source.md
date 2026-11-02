```tsx
import { useState } from 'react'
import { ClipPlayer } from '@house/ui'

const [time, setTime] = useState(0)
const [duration, setDuration] = useState(0)

<ClipPlayer src={blobUrl} error="" startAt={3} onClose={close} onTime={setTime} onDuration={setDuration} />
```
