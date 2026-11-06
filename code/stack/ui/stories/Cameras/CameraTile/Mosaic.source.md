```tsx
import { CameraTile, SnapshotImage } from '@house/ui'

<div className="grid gap-3 sm:grid-cols-2">
  <CameraTile name="Caméra : perruche-fond" media={<SnapshotImage src={liveUrl} message="Direct" />} caption="En marche · 3,3 W" onOpen={() => open('perruche-fond')} />
  <CameraTile name="Caméra : perruche-porte" media={<SnapshotImage src="" message="Caméra éteinte" />} caption="Éteinte (PoE coupé)" onOpen={() => open('perruche-porte')} />
</div>
```
