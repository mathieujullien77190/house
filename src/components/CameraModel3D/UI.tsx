import Button from '@/components/UI/Button'
import { VIEW_HEIGHT } from './constants'
import type { CameraModel3DUIProps } from './types'

const CameraModel3DUI = ({
  hostRef, supported, showLabels, legend, ariaLabel, onToggleLabels, onResetView,
}: CameraModel3DUIProps) => {
  if (!supported) {
    return <p className="text-muted">La vue 3D demande WebGL, que ce navigateur ne propose pas.</p>
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <Button variant={showLabels ? 'active' : 'default'} aria-pressed={showLabels} onClick={onToggleLabels}>
          Noms des pièces
        </Button>
        <Button onClick={onResetView}>Réinitialiser la vue</Button>
      </div>

      <div
        ref={hostRef}
        className="relative w-full cursor-grab overflow-hidden rounded-lg border border-line bg-bg active:cursor-grabbing"
        style={{ height: VIEW_HEIGHT }}
        role="img"
        aria-label={ariaLabel}
      />

      <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs text-muted">
        {legend.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mb-0 mt-2 text-xs text-muted">
        Glisse pour tourner ; Ctrl + molette (ou pincement) pour zoomer, la molette seule fait défiler la page. Dimensions approximatives.
      </p>
    </div>
  )
}

export default CameraModel3DUI
