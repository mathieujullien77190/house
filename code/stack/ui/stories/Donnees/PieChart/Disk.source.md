```tsx
import { PieChart } from '@house/ui'

<PieChart
  label="Répartition de la place sur le disque"
  centerValue="931.0 Go"
  centerLabel="libres sur 953.9 Go"
  slices={[
    { id: 'clips', label: 'Clips vidéo', value: 12e9, display: '11.2 Go', tone: 'accent' },
    { id: 'snapshots', label: 'Images par minute', value: 3e9, display: '2.8 Go', tone: 'green' },
    { id: 'free', label: 'Libre', value: 9.99e11, display: '931.0 Go', tone: 'line' },
  ]}
/>
```
