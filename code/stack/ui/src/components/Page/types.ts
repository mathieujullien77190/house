import type { ReactNode } from 'react'

export interface PageProps {
  children: ReactNode
}

export type StatusTone = 'muted' | 'error'

export interface PageHeaderProps {
  title: string
  /** Un clic sur le titre (par exemple : revenir à l'accueil) ; sans lui, le titre est un simple texte. */
  onTitle?: () => void
  /** Le texte d'état à côté du titre (nombre de caméras, heure de mise à jour, erreur…). */
  status: string
  tone?: StatusTone
  /** Les boutons à droite. */
  actions?: ReactNode
}
