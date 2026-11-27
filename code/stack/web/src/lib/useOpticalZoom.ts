// Le zoom optique d'une caméra à objectif motorisé (RLC-811A) : la position est lue à l'API (`GET /cameras/<nom>/zoom`) quand la vue le demande (`enabled`),
// puis le geste (molette, pincement : `usePinchZoom`) la change ici tout de suite, et elle part à l'API après un court silence, une requête à la fois, la dernière valeur gagne.
// Une caméra dont la lecture échoue (404 : pas de zoom optique, 502 : muette) n'a pas d'étage optique : le zoom numérique reste seul, comme avant.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchCameraZoom, setCameraZoom } from '@/lib/api'
import type { OpticalStage } from '@/lib/usePinchZoom'

/** L'objectif va de ×1 à ×5 : la position de la caméra (0 à 28) est montrée sur cette échelle. */
export const OPTICAL_MAX_LEVEL = 5
/** Le silence après le dernier cran de molette avant d'envoyer la position. */
export const SEND_DELAY_MS = 300
/** Le temps que le niveau reste affiché après le dernier changement. */
export const LEVEL_SHOWN_MS = 1500

interface Range {
  min: number
  max: number
}

/** Le niveau (1 à 5) d'une position de la caméra. */
export const levelOf = (pos: number, range: Range): number => 1 + ((pos - range.min) / (range.max - range.min)) * (OPTICAL_MAX_LEVEL - 1)

/** La position de la caméra (entière) la plus proche d'un niveau. */
export const posOf = (level: number, range: Range): number => range.min + Math.round(((level - 1) / (OPTICAL_MAX_LEVEL - 1)) * (range.max - range.min))

export interface OpticalZoom {
  /** À donner à `usePinchZoom` ; null : pas de zoom optique (caméra sans objectif motorisé, ou vue qui ne le permet pas). */
  stage: OpticalStage | null
  /** Le niveau visé, de 1 à 5, calculé de la position (celle qui part à la caméra) ; null tant que la caméra n'a pas répondu. */
  level: number | null
  /** Vrai pendant un changement et un moment après : le niveau s'affiche. */
  changing: boolean
}

/** Ce qui change à chaque geste, hors du rendu. */
interface Work {
  /** Le niveau exact (les petits mouvements s'additionnent avant de faire un cran). */
  level: number
  /** La dernière position visée. */
  pos: number | null
  /** La position à envoyer, null si rien n'attend. */
  pending: number | null
  busy: boolean
  sendTimer: ReturnType<typeof setTimeout> | undefined
  hideTimer: ReturnType<typeof setTimeout> | undefined
}

export const useOpticalZoom = (apiKey: string, camera: string, enabled: boolean): OpticalZoom => {
  const [range, setRange] = useState<Range | null>(null)
  const [pos, setPos] = useState<number | null>(null)
  const [changing, setChanging] = useState(false)
  const work = useRef<Work>({ level: 1, pos: null, pending: null, busy: false, sendTimer: undefined, hideTimer: undefined })

  // La position de l'objectif, relue à chaque fois que la vue s'ouvre (elle a pu changer ailleurs).
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetchCameraZoom(apiKey, camera).then(
      (zoom) => {
        if (cancelled) return
        work.current.level = levelOf(zoom.pos, zoom)
        work.current.pos = zoom.pos
        setRange({ min: zoom.min, max: zoom.max })
        setPos(zoom.pos)
      },
      () => {
        if (!cancelled) setRange(null)
      },
    )
    return () => {
      cancelled = true
    }
  }, [enabled, apiKey, camera])

  // Une requête à la fois : pendant qu'une position part, la suivante attend, et seule la dernière demandée est envoyée. Un échec est ignoré (la prochaine ouverture relit la caméra).
  const push = useCallback(async () => {
    const state = work.current
    if (state.busy) return
    state.busy = true
    while (state.pending !== null) {
      const next = state.pending
      state.pending = null
      await setCameraZoom(apiKey, camera, next).catch(() => undefined)
    }
    state.busy = false
  }, [apiKey, camera])

  const commit = useCallback(() => {
    const state = work.current
    if (state.sendTimer === undefined) return
    clearTimeout(state.sendTimer)
    state.sendTimer = undefined
    void push()
  }, [push])

  // L'écran se ferme : la position en attente part tout de suite, l'affichage n'a plus de minuteur.
  useEffect(() => {
    const state = work.current
    return () => {
      clearTimeout(state.hideTimer)
      commit()
    }
  }, [commit])

  const zoomBy = useCallback(
    (factor: number): boolean => {
      const state = work.current
      // Sans plage connue il n'y a pas d'étage (`stage` est null) : garde pour TypeScript.
      /* v8 ignore next */
      if (!range) return false
      const level = Math.min(OPTICAL_MAX_LEVEL, Math.max(1, state.level * factor))
      // Déjà en butée dans ce sens : le zoom numérique prend la suite.
      if (level === state.level) return false
      state.level = level
      setChanging(true)
      clearTimeout(state.hideTimer)
      state.hideTimer = setTimeout(() => setChanging(false), LEVEL_SHOWN_MS)
      const next = posOf(level, range)
      if (next !== state.pos) {
        state.pos = next
        state.pending = next
        setPos(next)
        clearTimeout(state.sendTimer)
        state.sendTimer = setTimeout(() => {
          state.sendTimer = undefined
          void push()
        }, SEND_DELAY_MS)
      }
      return true
    },
    [range, push],
  )

  const stage = useMemo(() => (enabled && range ? { zoomBy, commit } : null), [enabled, range, zoomBy, commit])
  return { stage, level: range && pos !== null ? levelOf(pos, range) : null, changing }
}
