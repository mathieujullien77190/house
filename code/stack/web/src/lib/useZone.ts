// La zone de surveillance du mouvement d'une caméra : un polygone dessiné sur son image, gardé par House API (l'enregistreur n'y cherche le
// mouvement que dedans). Sans zone enregistrée, le polygone est toute l'image (les quatre coins).
import { useCallback, useEffect, useState } from 'react'
import type { ZonePoint } from '@house/ui'
import { fetchZones, putZone } from '@/lib/api'

/** Toute l'image : les quatre coins. */
export const FULL_ZONE: ZonePoint[] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
]

/** Vrai quand le polygone n'est plus toute l'image. */
export const isReduced = (points: ZonePoint[]): boolean =>
  points.length !== FULL_ZONE.length || points.some(([x, y], index) => x !== FULL_ZONE[index][0] || y !== FULL_ZONE[index][1])

export const useZone = (apiKey: string, camera: string) => {
  const [points, setPoints] = useState<ZonePoint[]>(FULL_ZONE)
  // L'enregistrement a échoué : la zone dessinée n'est pas celle de l'enregistreur.
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchZones(apiKey)
      .then((zones) => {
        if (!cancelled) setPoints(zones[camera] ?? FULL_ZONE)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [apiKey, camera])

  const save = useCallback(
    (next: ZonePoint[] | null) => {
      putZone(apiKey, camera, next).then(
        () => setFailed(false),
        () => setFailed(true),
      )
    },
    [apiKey, camera],
  )
  /** Pendant le glisser : seulement l'affichage. */
  const change = useCallback((next: ZonePoint[]) => setPoints(next), [])
  /** Au relâchement : on enregistre (toute l'image = aucune zone). */
  const commit = useCallback(
    (next: ZonePoint[]) => {
      setPoints(next)
      save(isReduced(next) ? next : null)
    },
    [save],
  )
  const reset = useCallback(() => {
    setPoints(FULL_ZONE)
    save(null)
  }, [save])

  return { points, reduced: isReduced(points), failed, change, commit, reset }
}
