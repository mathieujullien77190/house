import { useEffect, useState } from 'react'
import { fetchPlug } from '@/lib/api'

/** Le nombre de prises se relit lentement : il ne change que si on en branche une autre. */
const POLL_MS = 60_000

/** 1 tant que la prise connectée répond (pour l'en-tête de la page) ; null sans prise configurée ou tant qu'elle n'est pas lue. */
export const usePlugCount = (apiKey: string, enabled: boolean): number | null => {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const load = () =>
      fetchPlug(apiKey)
        .then(() => {
          if (!cancelled) setCount(1)
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
