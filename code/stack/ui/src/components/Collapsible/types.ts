import type { ReactNode } from 'react'

export interface CollapsibleProps {
  title: string
  /** Un détail en petit à côté du titre (chemin, nombre…). */
  detail?: string
  /** Des commandes (bouton, curseur) sur la ligne du titre, à droite : les toucher ne plie ni ne déplie la section. */
  actions?: ReactNode
  /** Des classes en plus pour le titre (sa largeur, par exemple, pour aligner les commandes d'une liste de sections). */
  headClass?: string
  /** Moins d'espace au-dessus du titre : pour des sections qui se suivent de près. */
  compact?: boolean
  /** Ouvert au départ ; le visiteur l'ouvre et le ferme ensuite (le navigateur retient l'état). */
  defaultOpen?: boolean
  /** Le visiteur l'ouvre ou le ferme : le parent peut ainsi ne fabriquer son contenu (une carte, par exemple) qu'une fois ouvert. */
  onToggle?: (open: boolean) => void
  children: ReactNode
}
