import { DOT_CLASS, DOT_STATE_CLASS, STATUS_DOT_DIAMETER } from './constants'
import type { StatusDotProps } from './types'

/** La pastille d'état d'une caméra : verte allumée, rouge éteinte, grise quand elle n'est liée à aucune vraie caméra. La même que sur le plan (mêmes couleurs, même taille, liseré noir de 1 px). */
const StatusDot = ({ state, label }: StatusDotProps) => (
  <span
    className={`${DOT_CLASS} ${DOT_STATE_CLASS[state]}`}
    style={{ width: STATUS_DOT_DIAMETER, height: STATUS_DOT_DIAMETER }}
    role={label ? 'img' : undefined}
    aria-label={label}
    title={label}
  />
)

export default StatusDot
