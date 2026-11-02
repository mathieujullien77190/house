import type { ReactNode } from 'react'

export interface AppUIProps {
  title: string
  subtitle: string
  /** Explication du dernier branchement automatique (absente si aucun). */
  notice?: string
  hint: string
  diagram: ReactNode
  legend: ReactNode
  info: ReactNode
  /** Schéma d'architecture : vues matériel, logiciel, interfaces, code et déploiement. */
  architecture: ReactNode
  /** Panneau secteur 230 V. */
  mains: ReactNode
  pricing: ReactNode
  /** Bloc de définition qui monte depuis le bas. */
  sheet: ReactNode
}
