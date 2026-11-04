// Les détecteurs de mouvement du pont Hue (température, luminosité, pile), relus régulièrement tant que `enabled`.
import { useEffect, useState } from 'react'
import { fetchSensors } from '@/lib/api'
import type { HueSensor } from '@/types'

const REFRESH_MS = 30_000

export const useSensors = (apiKey: string, enabled: boolean): HueSensor[] => {
  const [sensors, setSensors] = useState<HueSensor[]>([])

  useEffect(() => {
    if (!enabled) return
    let alive = true
    // Sans pont (503) ou injoignable : la carte n'affiche simplement rien.
    const load = () =>
      fetchSensors(apiKey)
        .then((found) => {
          if (alive) setSensors(found)
        })
        .catch(() => undefined)
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [apiKey, enabled])

  return sensors
}
