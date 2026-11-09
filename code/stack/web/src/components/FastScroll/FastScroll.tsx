import { Button } from '@house/ui'
import { BOX_CLASS, FASTER_LABEL, RATES, RATE_TEXT_CLASS, SLOWER_LABEL } from './constants'
import { speedOf } from './helpers'
import type { FastScrollProps } from './types'

/**
 * Le défilement des images de la frise : deux petites flèches, posées à côté de « 10 min, 1 h… » ; `▶` va plus vite (ou plus lentement en arrière), `◀` plus
 * lentement (puis en arrière), et la vitesse s'écrit entre les deux (×1 : temps réel). Le défilement lui-même est dans `Timeline` (`rate`).
 */
const FastScroll = ({ rate, onRate }: FastScrollProps) => {
  const speed = speedOf(rate)
  return (
    <div className={BOX_CLASS}>
      <Button aria-label={SLOWER_LABEL} disabled={rate === 0} onClick={() => onRate(rate - 1)}>
        ◀
      </Button>
      <span className={RATE_TEXT_CLASS}>{speed < 0 ? `◀ ×${-speed}` : `×${speed}`}</span>
      <Button aria-label={FASTER_LABEL} disabled={rate === RATES.length - 1} onClick={() => onRate(rate + 1)}>
        ▶
      </Button>
    </div>
  )
}

export default FastScroll
