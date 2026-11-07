```tsx
import { Timeline } from '@house/ui'

// Téléphone (sous 1024 px) : le plus récent en haut. Les positions restent en % du plus ancien (0) au plus récent (100).
<Timeline
  vertical
  ranges={RANGES}
  range={range}
  live={live}
  ticks={ticks}
  markers={markers}
  coverage={coverage}
  nowX={nowX}
  cursorX={cursorX}
  axisRef={axisRef}
  onRange={setRange}
  onNow={now}
  onSelect={(id) => openEvent(id)}
  onPointerDown={startDrag}
  onPointerMove={drag}
  onPointerUp={endDrag}
/>
```
