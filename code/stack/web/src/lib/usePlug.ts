// La prise connectée, relue toutes les 5 secondes tant que `enabled` ; null avant la première réponse, sans prise configurée (503) ou si elle ne répond pas.
import { useEffect, useState } from 'react'
import { fetchPlug } from '@/lib/api'
import type { PlugState } from '@/types'

const REFRESH_MS = 5_000

export const usePlug = (apiKey: string, enabled: boolean): PlugState | null => {
  const [plug, setPlug] = useState<PlugState | null>(null)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    const load = () =>
      fetchPlug(apiKey)
        .then((state) => {
          if (alive) setPlug(state)
        })
        .catch(() => {
          if (alive) setPlug(null)
        })
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [apiKey, enabled])
  return plug
}
