import { DOT_CLASS, ROUND_CLASS } from './constants'
import type { MapIconProps } from './types'

/** Le même rond que les icônes de la carte de la maison (caméra, ampoule, chauffage) : fond blanc, bordure noire, l'icône dedans, et une pastille d'état sur le contour si on en donne une. */
const MapIcon = ({ children, label, color, dot }: MapIconProps) => (
  <span className={ROUND_CLASS} role="img" aria-label={label} title={label} style={color ? { color } : undefined}>
    {children}
    {dot ? <span className={DOT_CLASS} style={{ backgroundColor: dot }} data-testid="map-icon-dot" /> : null}
  </span>
)

export default MapIcon
