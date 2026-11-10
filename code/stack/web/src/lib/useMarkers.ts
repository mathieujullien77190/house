// Les repères de caméras posés sur l'image d'une caméra : une icône de caméra par autre caméra, que l'on place où on veut (House API garde les places, pour tous les appareils) et que l'on peut
// retirer. Sans rien d'enregistré pour la caméra, tous les repères sont là, alignés en haut de l'image ; dès qu'une liste est enregistrée, seuls ceux de la liste sont montrés.
import { useCallback, useEffect, useState } from 'react'
import { fetchMarkers, putMarkers } from '@/lib/api'
import type { CameraMarker } from '@/types'

/** Les places permises, en parts de l'image : un repère peut sortir de la vidéo d'une demi-image de chaque côté (la même plage que House API). */
export const MIN_PLACE = -0.5
export const MAX_PLACE = 1.5
const clampPlace = (value: number): number => Math.min(MAX_PLACE, Math.max(MIN_PLACE, value))

/** La place de départ du repère `index` parmi `count` : alignés en haut de l'image, répartis sur sa largeur. */
export const defaultMarker = (target: string, index: number, count: number): CameraMarker => ({
  target,
  x: Math.round(((index + 1) / (count + 1)) * 10000) / 10000,
  y: 0.14,
})

/**
 * Les repères à montrer. Sans liste enregistrée (`saved` null) : un par autre caméra, à sa place de départ. Avec une liste : ceux de la liste dont la caméra existe encore, à leur place
 * (une caméra retirée de la liste ne revient pas toute seule). `moved` : les places en cours de glisser.
 */
export const markersFor = (others: string[], saved: CameraMarker[] | null, moved: Record<string, CameraMarker>): CameraMarker[] =>
  saved === null
    ? others.map((target, index) => moved[target] ?? defaultMarker(target, index, others.length))
    : saved.filter((marker) => others.includes(marker.target)).map((marker) => moved[marker.target] ?? marker)

export const useMarkers = (apiKey: string, camera: string, others: string[]) => {
  // Chaque état garde la caméra à laquelle il appartient : en changeant de caméra, les places de la précédente ne s'appliquent plus (sans effet pour les remettre à zéro).
  const [saved, setSaved] = useState<{ camera: string; list: CameraMarker[] | null }>({ camera: '', list: null })
  // Les repères déplacés depuis le dernier enregistrement (pendant le glisser : seulement l'affichage).
  const [moved, setMoved] = useState<{ camera: string; positions: Record<string, CameraMarker> }>({ camera: '', positions: {} })

  useEffect(() => {
    let cancelled = false
    fetchMarkers(apiKey)
      .then((all) => {
        if (!cancelled) setSaved({ camera, list: all[camera] ?? null })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [apiKey, camera])

  const markers = markersFor(others, saved.camera === camera ? saved.list : null, moved.camera === camera ? moved.positions : {})

  const move = useCallback(
    (target: string, x: number, y: number) => {
      setMoved((current) => ({
        camera,
        positions: { ...(current.camera === camera ? current.positions : {}), [target]: { target, x: clampPlace(x), y: clampPlace(y) } },
      }))
    },
    [camera],
  )

  /** Au relâchement : les places sont enregistrées (toutes, pas seulement celle qui a bougé). */
  const commit = useCallback(() => {
    const list = markers.map((marker) => ({ ...marker, x: Math.round(marker.x * 10000) / 10000, y: Math.round(marker.y * 10000) / 10000 }))
    setSaved({ camera, list })
    setMoved({ camera, positions: {} })
    putMarkers(apiKey, camera, list).catch(() => undefined)
  }, [apiKey, camera, markers])

  /** Retire le repère d'une caméra (clic droit) : la liste restante est enregistrée. */
  const remove = useCallback(
    (target: string) => {
      const list = markers.filter((marker) => marker.target !== target)
      setSaved({ camera, list })
      setMoved({ camera, positions: {} })
      putMarkers(apiKey, camera, list).catch(() => undefined)
    },
    [apiKey, camera, markers],
  )

  return { markers, move, commit, remove }
}
