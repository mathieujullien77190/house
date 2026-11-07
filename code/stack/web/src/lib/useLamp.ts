// Une lampe du pont Hue, relue toutes les 5 secondes tant que `enabled` ; null avant la première réponse, sans pont ou si la lampe n'existe pas.
import { useEffect, useState } from 'react'
import { allLights } from '@/components/Lights/helpers'
import { fetchLights } from '@/lib/api'
import type { HueLight } from '@/types'

const REFRESH_MS = 5_000

/** Comme sur le plan des lumières, une lampe injoignable est rendue éteinte (coupée à l'interrupteur). */
export const useLamp = (apiKey: string, lampId: string | undefined, enabled: boolean): HueLight | null => {
  const [lamp, setLamp] = useState<HueLight | null>(null)

  useEffect(() => {
    if (!enabled || lampId === undefined) return
    let alive = true
    const load = () =>
      fetchLights(apiKey)
        .then((rooms) => {
          if (alive) setLamp(allLights(rooms).find((light) => light.id === lampId) ?? null)
        })
        .catch(() => undefined)
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [apiKey, lampId, enabled])

  return lamp
}
