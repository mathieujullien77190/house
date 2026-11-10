// Les lampes du pont Hue prêtes pour la carte des caméras : relues toutes les 5 s tant que `enabled`, placées d'après le plan (`items`) ou, à défaut, l'ancien plan des lumières
// (`useLegacyPositions`), avec de quoi en allumer ou éteindre une : **un clic sur une lampe éteinte ou à 0 % l'allume à 100 %, un clic sur une lampe allumée l'éteint**. Vide sans pont Hue ou avant la première réponse.
import { useCallback, useEffect, useState } from 'react'
import type { PlanLamp } from '@house/ui'
import { MAX_BRI } from '@/components/Lights/constants'
import { allLights, planLamps } from '@/components/Lights/helpers'
import { fetchLights, setHue } from '@/lib/api'
import { useLegacyPositions } from '@/lib/useLegacyPositions'
import type { HueLight } from '@/types'

const REFRESH_MS = 5_000
/** La luminosité la plus basse du pont : 0 % à l'écran. */
const MIN_BRI = 1

export interface LampPlan {
  lamps: PlanLamp[]
  toggle: (id: string) => void
}

export const useLampPlan = (apiKey: string, items: Record<string, { x: number; y: number }>, enabled: boolean): LampPlan => {
  const [lights, setLights] = useState<HueLight[]>([])
  const legacy = useLegacyPositions(apiKey, enabled)

  useEffect(() => {
    if (!enabled) return
    let alive = true
    const load = () =>
      fetchLights(apiKey)
        .then((rooms) => {
          if (alive) setLights(allLights(rooms))
        })
        .catch(() => undefined)
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [apiKey, enabled])

  const toggle = useCallback(
    (id: string) => {
      const light = lights.find((item) => item.id === id)
      if (!light?.reachable) return
      // Éteinte ou à 0 % (luminosité au minimum) : un clic l'allume **à 100 %** ; allumée : un clic l'éteint.
      const dark = !light.on || (light.bri !== null && light.bri <= MIN_BRI)
      setHue(apiKey, 'lights', id, dark ? { on: true, bri: MAX_BRI } : { on: false })
        .then((rooms) => setLights(allLights(rooms)))
        .catch(() => undefined)
    },
    [apiKey, lights],
  )

  return { lamps: planLamps(lights, items, legacy), toggle }
}
