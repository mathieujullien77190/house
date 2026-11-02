```tsx
import { Timeline } from '@house/ui'

<Timeline
  ranges={RANGES}
  range={range}
  live={live}
  windowText="24/10/2026 16:00 → 25/10/2026 16:00 · 24 h"
  ticks={ticks}
  markers={markers}
  coverage={coverage}
  nowX={nowX}
  cursorX={cursorX}
  older={4}
  axisRef={axisRef}
  onRange={setRange}
  onNow={now}
  onSelect={(id) => openEvent(id)}
  onPointerDown={startDrag}
  onPointerMove={drag}
  onPointerUp={endDrag}
/>
```
