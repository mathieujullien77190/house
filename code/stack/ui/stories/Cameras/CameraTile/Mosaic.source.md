```tsx
import { CameraTile, SnapshotImage } from '@house/ui'

<div className="grid gap-3 sm:grid-cols-2">
  <CameraTile name="Caméra : portail" media={<SnapshotImage src={liveUrl} message="Direct" />} caption="En marche · 3,3 W" onOpen={() => open('portail')} />
  <CameraTile name="Caméra : camera2" media={<SnapshotImage src="" message="Caméra éteinte" />} caption="Éteinte (PoE coupé)" onOpen={() => open('camera2')} />
</div>
```
