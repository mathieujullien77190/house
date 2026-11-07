import { CHIP_CLASS, DOT_CLASS, DOT_OFF_CLASS, DOT_ON_CLASS, DOT_UNREACHABLE_CLASS } from './constants'
import type { LampDotProps } from './types'

/** Le rond d'une lampe, posé à côté d'une mesure : le même dessin que son ampoule sur le plan des lumières. */
const LampDot = ({ on, reachable, label }: LampDotProps) => {
  const state = !reachable ? DOT_UNREACHABLE_CLASS : on ? DOT_ON_CLASS : DOT_OFF_CLASS
  return (
    <span className={CHIP_CLASS} role="img" aria-label={label} title={label}>
      <span className={`${DOT_CLASS} ${state}`} />
    </span>
  )
}

export default LampDot
