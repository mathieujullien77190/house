import type { ReactNode } from 'react'

export interface RotatedMediaProps {
  /** Vrai : le média est tourné d'un quart de tour horaire et le cadre est en portrait. */
  turned: boolean
  children: ReactNode
  /** Posé sur le cadre, droit (il ne tourne pas avec le média) : les commandes d'un clip. */
  overlay?: ReactNode
}
