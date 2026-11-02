```tsx
import { MediaPanel } from '@house/ui'

{media ? (
  <MediaPanel kind={media.kind} title={media.path} src={`/files/${media.path}`} onClose={() => setMedia(null)} />
) : null}
```
