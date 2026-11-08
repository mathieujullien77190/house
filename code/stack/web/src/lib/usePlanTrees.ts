// Les arbres du plan de la mosaïque : leurs positions et leurs rayons sont gardées dans le navigateur de l'appareil (localStorage).
import { useCallback, useState } from 'react'
import type { PlanTree } from '@house/ui'

const STORAGE_KEY = 'house-plan-trees-v5'

const load = (defaults: PlanTree[]): PlanTree[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!Array.isArray(parsed)) return defaults
    const saved = parsed.filter(
      (tree): tree is PlanTree =>
        typeof tree?.id === 'string' && typeof tree?.x === 'number' && typeof tree?.y === 'number' && typeof tree?.r === 'number',
    )
    return saved.length > 0 ? saved : defaults
  } catch {
    return defaults
  }
}

const save = (trees: PlanTree[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trees))
  } catch {
    // pas de stockage : les arbres ne survivent pas au rechargement
  }
}

export const usePlanTrees = (defaults: PlanTree[]): { trees: PlanTree[]; move: (id: string, x: number, y: number) => void } => {
  const [trees, setTrees] = useState<PlanTree[]>(() => load(defaults))
  const change = useCallback((id: string, patch: Partial<PlanTree>) => {
    setTrees((current) => {
      const next = current.map((tree) => (tree.id === id ? { ...tree, ...patch } : tree))
      save(next)
      return next
    })
  }, [])
  const move = useCallback((id: string, x: number, y: number) => change(id, { x, y }), [change])
  return { trees, move }
}
