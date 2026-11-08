import type { ReactNode } from 'react'

export interface RotatedMediaProps {
  /** Vrai : le média est tourné d'un quart de tour horaire et le cadre est en portrait. */
  turned: boolean
  children: ReactNode
}
