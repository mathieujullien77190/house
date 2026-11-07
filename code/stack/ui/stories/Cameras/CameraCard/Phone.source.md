```tsx
import { CameraCard, SnapshotImage, Timeline } from '@house/ui'

// Téléphone (sous 1024 px) : un écran fixe, la vidéo sur le tiers du haut (actions, mesures et « ⛶ » posés dessus),
// la frise verticale sur les deux tiers du bas, un bouton retour (une flèche) en haut à gauche.
<CameraCard
  screen
  onBack={backToList}
  backLabel="voliere-exterieur"
  name="voliere-exterieur"
  caption="Direct"
  actions={<LiveQualityTabs />}
  details={<SpecList items={temperatures} />}
  onExpand={openBigView}
  media={<SnapshotImage src={liveUrl} message="Direct" />}
  timeline={<Timeline vertical fill {...timelineProps} />}
/>
```
