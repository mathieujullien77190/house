```tsx
import { ApiExplorer } from '@house/ui'

<ApiExplorer
  services={SERVICES}
  selected={selected}
  busy={busy}
  result={result}
  note="/clips/<id> renvoie la vidéo d’un événement (mp4) : pas de JSON."
  onCall={(path) => callService(path)}
/>
```
