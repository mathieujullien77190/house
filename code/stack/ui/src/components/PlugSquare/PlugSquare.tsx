import { CHIP_CLASS, SQUARE_CLASS, SQUARE_OFF_CLASS, SQUARE_ON_CLASS } from './constants'
import type { PlugSquareProps } from './types'

/** Le carré d'une prise, posé à côté d'une mesure (comme le rond d'une lampe) : vert allumée, rouge éteinte. */
const PlugSquare = ({ on, label }: PlugSquareProps) => (
  <span className={CHIP_CLASS} role="img" aria-label={label} title={label}>
    <span className={`${SQUARE_CLASS} ${on ? SQUARE_ON_CLASS : SQUARE_OFF_CLASS}`} />
  </span>
)

export default PlugSquare
