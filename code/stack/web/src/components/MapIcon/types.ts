import type { ReactNode } from 'react'

export interface MapIconProps {
  /** L'icône dans le rond (noire par défaut ; une couleur donnée par `color`). */
  children: ReactNode
  /** Le nom du rond (infobulle et lecteurs d'écran). */
  label: string
  /** La couleur de l'icône (n'importe quelle couleur CSS) ; noire sans. */
  color?: string
  /** Une pastille d'état sur le contour, en haut à droite (une couleur CSS : vert allumé, rouge éteint) ; sans pastille si absente. */
  dot?: string
}
