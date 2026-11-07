import type { ReactNode } from 'react'
import type { TabOption } from '../Tabs/types'

export interface TopBarProps<T extends string = string> {
  title: string
  /** Un clic sur le titre (par exemple : revenir à l'accueil) ; sans lui, le titre est un simple texte. */
  onTitle?: () => void
  /** Le texte d'état (heure de mise à jour, erreur…). */
  status?: string
  tone?: 'muted' | 'error'
  /** Les pages : des onglets dans la barre dès 1024 px, et dans le menu « sandwich » (en haut à droite) en dessous. Sans elles, ni onglets ni menu. */
  tabs?: { label: string; options: TabOption<T>[]; value: T | ''; onChange: (id: T) => void }
  /** Les boutons à droite (dans le menu sur téléphone). */
  actions?: ReactNode
}
