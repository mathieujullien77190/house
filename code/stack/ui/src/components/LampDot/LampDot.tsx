import { BRIGHTNESS_FLOOR, BRIGHTNESS_MAX, CHIP_CLASS, DOT_CLASS, DOT_OFF_CLASS, DOT_ON_CLASS, DOT_UNREACHABLE_CLASS } from './constants'
import type { LampDotProps } from './types'

/** Le rond d'une lampe, posé à côté d'une mesure : le même dessin que son ampoule sur le plan des lumières. */
const LampDot = ({ on, reachable, brightness = null, label }: LampDotProps) => {
  const state = !reachable ? DOT_UNREACHABLE_CLASS : on ? DOT_ON_CLASS : DOT_OFF_CLASS
  // Allumée : la luminosité en opacité (1 à 254 → plancher à 1).
  const opacity =
    on && reachable && brightness !== null
      ? BRIGHTNESS_FLOOR + (1 - BRIGHTNESS_FLOOR) * Math.min(1, Math.max(0, brightness / BRIGHTNESS_MAX))
      : 1
  return (
    <span className={CHIP_CLASS} role="img" aria-label={label} title={label}>
      <span className={`${DOT_CLASS} ${state}`} style={{ opacity }} />
    </span>
  )
}

export default LampDot
