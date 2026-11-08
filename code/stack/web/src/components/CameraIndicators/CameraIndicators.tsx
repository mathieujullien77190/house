import { LampDot, PlugSquare, ValueChips } from '@house/ui'
import { ROW_CLASS } from './constants'
import { lampLabel, plugLabel } from './helpers'
import type { CameraIndicatorsProps } from './types'

/** Ce qui se pose sur la vidéo d'une caméra : ses températures, le rond de sa lampe (orange allumée, gris éteinte, contour rouge pâle injoignable) et le carré de sa prise (vert allumée, rouge éteinte). */
const CameraIndicators = ({ temperatures, lamp, plug }: CameraIndicatorsProps) => (
  <div className={ROW_CLASS}>
    {temperatures.length > 0 ? <ValueChips values={temperatures} /> : null}
    {lamp ? <LampDot on={lamp.on} reachable={lamp.reachable} brightness={lamp.bri} label={lampLabel(lamp)} /> : null}
    {plug ? <PlugSquare on={plug.on} label={plugLabel(plug)} /> : null}
  </div>
)

export default CameraIndicators
