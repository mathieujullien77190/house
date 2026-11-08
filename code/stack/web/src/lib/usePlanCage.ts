// La cage à perruches du plan de la mosaïque : sa position est gardée dans le navigateur de l'appareil (localStorage), à partir de celle dessinée au départ.
import { useCallback, useState } from 'react'

export interface PlanCage {
  x: number
  y: number
  w: number
  h: number
}

const STORAGE_KEY = 'house-plan-cage-v1'

const load = (defaults: PlanCage): PlanCage => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (
      parsed &&
      typeof parsed === 'object' &&
      'x' in parsed &&
      'y' in parsed &&
      typeof parsed.x === 'number' &&
      typeof parsed.y === 'number'
    ) {
      // Seule la place est gardée : la taille reste celle du plan.
      return { ...defaults, x: parsed.x, y: parsed.y }
    }
  } catch {
    // stockage illisible : la place de départ
  }
  return defaults
}

export const usePlanCage = (defaults: PlanCage): { cage: PlanCage; move: (x: number, y: number) => void } => {
  const [cage, setCage] = useState<PlanCage>(() => load(defaults))
  const move = useCallback((x: number, y: number) => {
    setCage((current) => {
      const next = { ...current, x, y }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }))
      } catch {
        // pas de stockage : la cage ne garde pas sa place
      }
      return next
    })
  }, [])
  return { cage, move }
}
