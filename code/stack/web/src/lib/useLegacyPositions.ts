// Les positions d'ampoules de l'ancien plan des lumières (coordonnées de l'ancien dessin 540 × 300, `/hue/positions` de l'API et l'ancienne copie du navigateur) : lues une fois,
// jamais réécrites ni effacées. La carte les convertit à la lecture (`planLamps`) tant qu'une lampe n'a pas de place dans le plan.
import { useEffect, useState } from 'react'
import { readLegacyPositions } from '@/components/Lights/helpers'
import type { Positions } from '@/components/Lights/types'
import { fetchLampPositions } from '@/lib/api'

export const useLegacyPositions = (apiKey: string, enabled = true): Positions => {
  const [positions, setPositions] = useState<Positions>(readLegacyPositions)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetchLampPositions(apiKey)
      .then((saved) => {
        // Celles de l'API passent avant la copie du navigateur (comme avant : l'API gagne).
        if (!cancelled) setPositions({ ...readLegacyPositions(), ...saved })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [apiKey, enabled])

  return positions
}
