import type { ReactNode, RefObject } from 'react'

export interface CameraCardProps {
  name: string
  /** Légende au-dessus du média : « Dernière image », « Image à … », « Clip · … ». */
  caption: string
  /** Un avertissement au-dessus du média (événement en cours, image indisponible), vide sinon. */
  warning?: string
  /** Ce qui est montré en haut : l'image, le lecteur du clip, l'image d'un instant… */
  media: ReactNode
  /** Les actions à côté du nom (allumer, éteindre…), rendues par le parent ; rien par défaut. */
  actions?: ReactNode
  /** La frise, rendue par le parent. */
  timeline: ReactNode
  /** L'élément qui passe en plein écran : le parent le lit pour appeler l'API plein écran du navigateur. */
  figureRef?: RefObject<HTMLElement | null>
  /** Le média occupe tout l'écran, en paysage (tourné de 90° si le téléphone reste droit). */
  expanded?: boolean
  /** Le bouton « Afficher en grand » n'apparaît que si le parent sait l'ouvrir. */
  onExpand?: () => void
  onCollapse?: () => void
}
