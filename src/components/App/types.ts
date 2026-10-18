import type { ReactNode } from 'react'

export interface AppUIProps {
  title: string
  subtitle: string
  /** Choix de la phase de déploiement. */
  phaseSwitch: ReactNode
  /** Explication du dernier branchement automatique (absente si aucun). */
  notice?: string
  hint: string
  diagram: ReactNode
  legend: ReactNode
  info: ReactNode
  mains: ReactNode
  k3s: ReactNode
  pricing: ReactNode
  /** Bloc de définition qui monte depuis le bas. */
  sheet: ReactNode
}
