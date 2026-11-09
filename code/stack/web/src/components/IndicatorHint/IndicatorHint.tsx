import { useEffect, useRef, useState } from 'react'
import { BUTTON_CLASS, HINT_CLASS, HINT_DELAY_MS, WRAP_CLASS } from './constants'
import type { IndicatorHintProps } from './types'

/**
 * Un petit indicateur posé sur une vidéo (température, rond de la lampe, carré de la prise, pluie) rendu cliquable : un clic ouvre au-dessus de lui une petite infobulle qui
 * l'explique ; un autre clic, un clic ailleurs, Échap ou quelques secondes la ferment. Un clic ici n'ouvre pas la caméra de la vignette.
 */
const IndicatorHint = ({ text, children }: IndicatorHintProps) => {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const timer = setTimeout(() => setOpen(false), HINT_DELAY_MS)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <span ref={wrap} className={WRAP_CLASS}>
      <button
        type="button"
        className={BUTTON_CLASS}
        aria-label={text}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
      >
        {children}
      </button>
      {open ? (
        <span role="tooltip" className={HINT_CLASS}>
          {text}
        </span>
      ) : null}
    </span>
  )
}

export default IndicatorHint
