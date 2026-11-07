```tsx
import { Timeline } from '@house/ui'

<Timeline
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
