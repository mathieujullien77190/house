import type { ReactNode } from 'react'

export interface PageProps {
  children: ReactNode
}

export type StatusTone = 'muted' | 'error'

export interface PageHeaderProps {
  title: string
  /** Le texte d'état à côté du titre (nombre de caméras, heure de mise à jour, erreur…). */
  status: string
  tone?: StatusTone
  /** Les boutons à droite. */
  actions?: ReactNode
}
