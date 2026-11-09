import { Button } from '@house/ui'
import { BOX_CLASS, BUTTON_LABEL, MAX_SENSITIVITY, MIN_SENSITIVITY, SENSITIVITY_LABEL, SLIDER_CLASS, STATUS_CLASS } from './constants'
import { statusText } from './helpers'
import type { HeatmapControlsProps } from './types'

/**
 * Le bouton « Carte de chaleur » et, une fois allumée, le curseur de sensibilité (petit : il faut de gros mouvements ; grand : le moindre changement compte, le vent
 * dans les feuilles aussi) et l'avancement du calcul.
 */
const HeatmapControls = ({ on, onToggle, sensitivity, onSensitivity, data, failed }: HeatmapControlsProps) => (
  <div className={BOX_CLASS}>
    <Button variant={on ? 'active' : 'default'} aria-pressed={on} onClick={onToggle}>
      {BUTTON_LABEL}
    </Button>
    {on ? (
      <>
        <input
          type="range"
          min={MIN_SENSITIVITY}
          max={MAX_SENSITIVITY}
          value={sensitivity}
          aria-label={SENSITIVITY_LABEL}
          title={SENSITIVITY_LABEL}
          className={SLIDER_CLASS}
          onChange={(event) => onSensitivity(Number(event.target.value))}
        />
        <span className={STATUS_CLASS}>{statusText(data, failed)}</span>
      </>
    ) : null}
  </div>
)

export default HeatmapControls
