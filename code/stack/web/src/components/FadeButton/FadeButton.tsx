import { Button } from '@house/ui'
import { useFade } from '@/lib/useFade'
import { FADE_CANCEL_LABEL, FADE_FAILED_TEXT, FADE_LABEL, FAILED_CLASS } from './constants'
import type { FadeButtonProps } from './types'

/**
 * Le bouton « Éteindre la lumière en 15 min » d'une lampe : sa luminosité descend au minimum en 15 minutes puis elle s'éteint (le pont fait tout) ; il annule tant que ça dure, avec le temps restant.
 * Il n'existe que pour une lampe allumée (ou dont l'extinction est en cours).
 */
const FadeButton = ({ apiKey, lampId, on }: FadeButtonProps) => {
  const fade = useFade(apiKey, lampId, true)
  if (!on && !fade.fading) return null
  const left = fade.remaining === null ? '' : ` (${Math.floor(fade.remaining / 60)}:${String(fade.remaining % 60).padStart(2, '0')})`
  return (
    <>
      <Button variant={fade.fading ? 'danger' : 'default'} disabled={fade.busy} onClick={() => void fade.toggle()}>
        {fade.fading ? `${FADE_CANCEL_LABEL}${left}` : FADE_LABEL}
      </Button>
      {fade.failed ? <span className={FAILED_CLASS}>{FADE_FAILED_TEXT}</span> : null}
    </>
  )
}

export default FadeButton
