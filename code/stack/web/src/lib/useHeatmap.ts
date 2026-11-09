import { useEffect, useState } from 'react'
import { fetchHeatmap } from '@/lib/api'
import type { HeatmapStatus } from '@/types'

/** Tant que l'API calcule, on relit l'état (et la carte qui grandit) à ce rythme. */
export const HEATMAP_POLL_MS = 2500

/**
 * La carte de chaleur d'une caméra : la demande lance (ou reprend) le calcul des images arrivées depuis la dernière fois, puis on relit l'état tant qu'il tourne.
 * Éteinte (`enabled` faux), rien n'est demandé.
 */
export const useHeatmap = (apiKey: string, camera: string, enabled: boolean): { data: HeatmapStatus | null; failed: boolean } => {
  const [data, setData] = useState<HeatmapStatus | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = () => {
      fetchHeatmap(apiKey, camera)
        .then((status) => {
          if (cancelled) return
          setData(status)
          setFailed(false)
          if (status.computing) timer = setTimeout(load, HEATMAP_POLL_MS)
        })
        .catch(() => {
          if (cancelled) return
          setFailed(true)
          timer = setTimeout(load, HEATMAP_POLL_MS)
        })
    }
    load()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [apiKey, camera, enabled])

  return { data, failed }
}
