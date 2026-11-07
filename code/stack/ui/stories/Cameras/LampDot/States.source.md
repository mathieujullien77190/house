```tsx
import { LampDot, ValueChips } from '@house/ui'

<div className="flex gap-1">
  <ValueChips values={['9,5 °C']} />
  <LampDot on reachable label="Lampe Perruche : allumée" />
</div>
<LampDot on={false} reachable label="Lampe Perruche : éteinte" />
<LampDot on={false} reachable={false} label="Lampe Perruche : injoignable" />
```
