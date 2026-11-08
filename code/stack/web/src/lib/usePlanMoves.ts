// Les éléments du plan de la mosaïque qu'on déplace en entier, avec leur décalage gardé dans le navigateur de l'appareil (localStorage) : le chemin du garage et les deux
// portes (le portail du garage et le portillon). Le décalage se compte par rapport au dessin de départ, en unités du plan.
import { useCallback, useState } from 'react'

export interface Offset {
  dx: number
  dy: number
}

export type Offsets = Record<string, Offset>

const STORAGE_KEY = 'house-plan-moves-v1'

const load = (): Offsets => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!parsed || typeof parsed !== 'object') return {}
    const offsets: Offsets = {}
    for (const [id, value] of Object.entries(parsed)) {
      if (
        value &&
        typeof value === 'object' &&
        'dx' in value &&
        'dy' in value &&
        typeof value.dx === 'number' &&
        typeof value.dy === 'number'
      ) {
        offsets[id] = { dx: value.dx, dy: value.dy }
      }
    }
    return offsets
  } catch {
    return {}
  }
}

export const usePlanMoves = (): { offsets: Offsets; move: (id: string, dx: number, dy: number) => void } => {
  const [offsets, setOffsets] = useState<Offsets>(load)
  const move = useCallback((id: string, dx: number, dy: number) => {
    setOffsets((current) => {
      const next = { ...current, [id]: { dx, dy } }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // pas de stockage : l'élément ne garde pas sa place
      }
      return next
    })
  }, [])
  return { offsets, move }
}
