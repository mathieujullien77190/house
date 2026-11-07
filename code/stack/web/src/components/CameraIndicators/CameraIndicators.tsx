import { LampDot, ValueChips } from '@house/ui'
import { ROW_CLASS } from './constants'
import { lampLabel } from './helpers'
import type { CameraIndicatorsProps } from './types'

/** Ce qui se pose sur la vidéo d'une caméra : ses températures, et le rond de sa lampe (orange allumée, gris éteinte, contour rouge pâle injoignable). */
const CameraIndicators = ({ temperatures, lamp }: CameraIndicatorsProps) => (
  <div className={ROW_CLASS}>
    {temperatures.length > 0 ? <ValueChips values={temperatures} /> : null}
    {lamp ? <LampDot on={lamp.on} reachable={lamp.reachable} label={lampLabel(lamp)} /> : null}
  </div>
)

export default CameraIndicators
