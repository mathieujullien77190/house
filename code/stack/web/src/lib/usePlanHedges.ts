// Les haies du plan de la mosaïque : leurs sommets sont gardés dans le navigateur de l'appareil (localStorage), à partir de celles dessinées sur la limite de la parcelle.
import { useCallback, useState } from 'react'
import type { PlanHedge } from '@house/ui'

const STORAGE_KEY = 'house-plan-hedges-v1'

const isPoint = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number'

const load = (defaults: PlanHedge[]): PlanHedge[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!Array.isArray(parsed)) return defaults
    const saved = parsed.filter(
      (hedge): hedge is PlanHedge =>
        typeof hedge?.id === 'string' && Array.isArray(hedge?.points) && hedge.points.length > 1 && hedge.points.every(isPoint),
    )
    return saved.length > 0 ? saved : defaults
  } catch {
    return defaults
  }
}

const save = (hedges: PlanHedge[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hedges))
  } catch {
    // pas de stockage : les haies ne survivent pas au rechargement
  }
}

export const usePlanHedges = (defaults: PlanHedge[]): { hedges: PlanHedge[]; move: (id: string, points: [number, number][]) => void } => {
  const [hedges, setHedges] = useState<PlanHedge[]>(() => load(defaults))
  const move = useCallback((id: string, points: [number, number][]) => {
    setHedges((current) => {
      const next = current.map((hedge) => (hedge.id === id ? { ...hedge, points } : hedge))
      save(next)
      return next
    })
  }, [])
  return { hedges, move }
}
