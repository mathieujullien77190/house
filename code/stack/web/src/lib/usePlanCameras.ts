// Les caméras du plan de la mosaïque : leurs positions et leurs angles (qu'on déplace et tourne) sont gardés dans le navigateur de l'appareil (localStorage).
import { useCallback, useState } from 'react'
import type { PlanCamera } from '@house/ui'

const STORAGE_KEY = 'house-plan-cameras-v1'

type Positions = Record<string, { x?: number; y?: number; angle?: number; far?: number; fov?: number }>

const load = (): Positions => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return typeof parsed === 'object' && parsed !== null ? (parsed as Positions) : {}
  } catch {
    return {}
  }
}

export const usePlanCameras = (
  defaults: PlanCamera[],
): {
  cameras: PlanCamera[]
  move: (id: string, x: number, y: number) => void
  adjust: (id: string, setting: { angle: number; far: number; fov: number }) => void
} => {
  const [positions, setPositions] = useState<Positions>(load)
  const change = useCallback((id: string, patch: { x?: number; y?: number; angle?: number; far?: number; fov?: number }) => {
    setPositions((current) => {
      const next = { ...current, [id]: { ...current[id], ...patch } }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // pas de stockage : les réglages ne survivent pas au rechargement
      }
      return next
    })
  }, [])
  const move = useCallback((id: string, x: number, y: number) => change(id, { x, y }), [change])
  const adjust = useCallback((id: string, setting: { angle: number; far: number; fov: number }) => change(id, setting), [change])
  const cameras = defaults.map((camera) => ({ ...camera, ...positions[camera.id] }))
  return { cameras, move, adjust }
}
