import { Button } from '@house/ui'
import {
  BOX_CLASS,
  FASTER_LABEL,
  RATES,
  RATE_TEXT_CLASS,
  SLOWER_LABEL,
  STEP_BACK_LABEL,
  STEP_BACK_TEXT,
  STEP_FORWARD_LABEL,
  STEP_FORWARD_TEXT,
} from './constants'
import { speedOf } from './helpers'
import type { FastScrollProps } from './types'

/**
 * Le défilement des images de la frise : deux petites flèches, posées à côté de « 10 min, 1 h… » ; `▶` va plus vite (ou plus lentement en arrière), `◀` plus
 * lentement (puis en arrière), et la vitesse s'écrit entre les deux (×1 : temps réel). Le défilement lui-même est dans `Timeline` (`rate`).
 */
const FastScroll = ({ rate, onRate, onStep }: FastScrollProps) => {
  const speed = speedOf(rate)
  // Le temps est arrêté (×0) : deux boutons de plus font défiler les images une par une.
  const stepping = speed === 0 && onStep !== undefined
  return (
    <div className={BOX_CLASS}>
      {stepping ? (
        <Button aria-label={STEP_BACK_LABEL} onClick={() => onStep(-1)}>
          {STEP_BACK_TEXT}
        </Button>
      ) : null}
      <Button aria-label={SLOWER_LABEL} disabled={rate === 0} onClick={() => onRate(rate - 1)}>
        ◀
      </Button>
      <span className={RATE_TEXT_CLASS}>{speed < 0 ? `◀ ×${-speed}` : `×${speed}`}</span>
      <Button aria-label={FASTER_LABEL} disabled={rate === RATES.length - 1} onClick={() => onRate(rate + 1)}>
        ▶
      </Button>
      {stepping ? (
        <Button aria-label={STEP_FORWARD_LABEL} onClick={() => onStep(1)}>
          {STEP_FORWARD_TEXT}
        </Button>
      ) : null}
    </div>
  )
}

export default FastScroll
