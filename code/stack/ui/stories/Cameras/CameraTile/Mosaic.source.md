```tsx
import { CameraTile, SnapshotImage } from '@house/ui'

<div className="grid gap-3 sm:grid-cols-2">
  <CameraTile name="Caméra : voliere-exterieur" media={<SnapshotImage src={liveUrl} message="Direct" />} caption="En marche · 3,3 W" onOpen={() => open('voliere-exterieur')} />
  <CameraTile name="Caméra : voliere-interieur" media={<SnapshotImage src="" message="Caméra éteinte" />} caption="Éteinte (PoE coupé)" onOpen={() => open('voliere-interieur')} />
</div>
```
