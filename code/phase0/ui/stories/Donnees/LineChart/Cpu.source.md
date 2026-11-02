```tsx
import { LineChart } from '@house/ui'

<LineChart
  title="Processeur"
  valueText="34 %"
  label="Utilisation du processeur sur les deux dernières minutes"
  tone="orange"
  max={100}
  capacity={60}
  unit="%"
  startLabel="−2 min"
  endLabel="maintenant"
  values={[5, 8, 6, 12, 30, 55, 42, 38, 20, 14, 34]}
/>
```
