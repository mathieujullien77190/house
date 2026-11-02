```tsx
import { CameraCard, SnapshotImage, Timeline } from '@house/ui'

<CameraCard
  name="portail"
  caption="Image à 25/10/2026 15:43"
  media={<SnapshotImage src={snapshotUrl} message="Pas d’image gardée à cet instant." />}
  timeline={<Timeline {...timelineProps} />}
/>
```
