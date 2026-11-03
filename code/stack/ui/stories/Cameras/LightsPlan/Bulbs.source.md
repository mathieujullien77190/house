```tsx
import { LightsPlan } from '@house/ui'

<LightsPlan
  title="Rez-de-chaussée"
  rooms={rooms}
  walls={walls}
  lamps={lamps}
  onMove={(id, x, y) => move(id, x, y)}
  onToggle={(id) => toggle(id)}
/>
```
