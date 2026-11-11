```tsx
import { CameraCard, SnapshotImage, Timeline } from '@house/ui'

<CameraCard
  name="voliere-exterieur"
  media={<SnapshotImage src={snapshotUrl} message="Pas d’image gardée à cet instant." />}
  timeline={<Timeline {...timelineProps} />}
/>
```
