```tsx
import { SimpleTable } from '@house/ui'

<SimpleTable
  columns={['Adresse', 'Matériel', 'Port']}
  rows={[
    ['192.168.1.254', 'Freebox (la box)', ''],
    ['192.168.1.139 (mini.local)', 'Mini PC ACEMAGIC K1', '22, 8080, 8081, 8090'],
  ]}
  keys={['192.168.1.254', '192.168.1.139']}
/>
```
