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
  /** Schéma d'architecture, vues matériel et logiciel (phase 0 seulement). */
  architecture: ReactNode
  /** Panneau secteur (absent en phase 0). */
  mains: ReactNode
  /** Panneau k3s (absent en phase 0 : pas de cluster). */
  k3s: ReactNode
  pricing: ReactNode
  /** Bloc de définition qui monte depuis le bas. */
  sheet: ReactNode
}
