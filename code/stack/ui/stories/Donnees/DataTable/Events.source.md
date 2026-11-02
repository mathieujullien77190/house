```tsx
import { useState } from 'react'
import { Button, DataTable } from '@house/ui'

const [page, setPage] = useState(0)
const [collapsed, setCollapsed] = useState(false)
const rows = events.slice(page * 5, page * 5 + 5)

<DataTable
  collapsed={collapsed}
  onToggle={() => setCollapsed((value) => !value)}
  title="events"
  description="Les événements de Frigate copiés ici : identifiant, caméra, étiquette, début et le chemin du clip."
  detail={`${events.length} ligne(s)`}
  columns={['id', 'camera', 'label', 'started_at', 'clip_path']}
  rows={rows.map((row) => [row.id, row.camera, row.label, row.started_at, <Button>voir</Button>])}
  keys={rows.map((row) => row.id)}
  page={page}
  size={5}
  total={events.length}
  onPage={setPage}
/>
```
