import { useEffect, useState } from 'react'
import { fetchLights } from '@/lib/api'
import { placedLampCount } from './helpers'

/** Le nombre de lampes se relit lentement : il ne change que si on ajoute ou retire une lampe du pont. */
const POLL_MS = 60_000

/**
 * Le nombre de lampes des zones de la maison, sans celles qui sont encore à placer (pour l'en-tête de la page) ; null tant qu'il
 * n'est pas lu, ou sans pont Hue configuré.
 */
export const useLampCount = (apiKey: string, enabled: boolean): number | null => {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const load = () =>
      fetchLights(apiKey)
        .then((rooms) => {
          if (!cancelled) setCount(placedLampCount(rooms))
        })
        .catch(() => {
          if (!cancelled) setCount(null)
        })
    load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [apiKey, enabled])
  return count
}
