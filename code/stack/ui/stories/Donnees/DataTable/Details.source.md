```tsx
import { useState } from 'react'
import { DataTable } from '@house/ui'

const [openKey, setOpenKey] = useState<string | null>(null)

<DataTable
  title="guest_visits"
  description="Un clic sur une ligne montre le reste."
  detail={`${visits.length} ligne(s)`}
  columns={['id', 'ip', 'origin']}
  rows={visits.map((visit) => [visit.id, visit.ip, visit.origin])}
  keys={visits.map((visit) => String(visit.id))}
  details={visits.map((visit) => <span>{visit.device} · {visit.camera} · {visit.duration} s</span>)}
  openKey={openKey}
  onRowClick={(key) => setOpenKey((current) => (current === key ? null : key))}
  page={0}
  size={10}
  total={visits.length}
  onPage={setPage}
/>
```
