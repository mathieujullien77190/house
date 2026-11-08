// Les lampes du pont Hue prêtes pour la carte des caméras : relues toutes les 5 s tant que `enabled`, placées d'après le plan (`items`) ou, à défaut, l'ancien plan des lumières
// (`useLegacyPositions`), avec de quoi en allumer ou éteindre une. Vide sans pont Hue ou avant la première réponse.
import { useCallback, useEffect, useState } from 'react'
import type { PlanLamp } from '@house/ui'
import { allLights, planLamps } from '@/components/Lights/helpers'
import { fetchLights, setHue } from '@/lib/api'
import { useLegacyPositions } from '@/lib/useLegacyPositions'
import type { HueLight } from '@/types'

const REFRESH_MS = 5_000

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
      setHue(apiKey, 'lights', id, { on: !light.on })
        .then((rooms) => setLights(allLights(rooms)))
        .catch(() => undefined)
    },
    [apiKey, lights],
  )

  return { lamps: planLamps(lights, items, legacy), toggle }
}
