// Les appareils du plan de la mosaïque (la lampe de la cage, la prise) : leurs positions, qu'on déplace, sont gardées dans le navigateur
// de l'appareil (localStorage). Sans position gardée, la position par défaut sert.
import { useCallback, useState } from 'react'

const STORAGE_KEY = 'house-plan-items-v1'

type Positions = Record<string, { x: number; y: number }>

const load = (): Positions => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return typeof parsed === 'object' && parsed !== null ? (parsed as Positions) : {}
  } catch {
    return {}
  }
}

export const usePlanItems = (): { positions: Positions; move: (id: string, x: number, y: number) => void } => {
  const [positions, setPositions] = useState<Positions>(load)
  const move = useCallback((id: string, x: number, y: number) => {
    setPositions((current) => {
      const next = { ...current, [id]: { x, y } }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // pas de stockage : les positions ne survivent pas au rechargement
      }
      return next
    })
  }, [])
  return { positions, move }
}
