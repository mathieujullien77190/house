import type { CSSProperties, HTMLAttributes, ReactNode, RefObject } from 'react'

/** Le zoom au doigt du média en grand, tenu par le parent : les gestes de la zone, et le style du contenu qui bouge. */
export interface MediaGesture {
  /** Les gestes de la zone ; `ref` : la zone elle-même (la molette s'y accroche hors de React, pour empêcher le défilement de la page). */
  handlers: HTMLAttributes<HTMLDivElement> & { ref?: (element: HTMLDivElement | null) => void }
  style: CSSProperties
}

export interface CameraCardProps {
  /** Écran du téléphone (sous 1024 px) : vidéo sur le tiers du haut avec ses commandes dessus, frise sur les deux tiers du bas, sans titre. */
  screen?: boolean
  /** Le bouton retour fixe en haut à gauche de l'écran du téléphone (rien sans lui). */
  onBack?: () => void
  /** L'étiquette du bouton retour, une simple flèche (le nom de la caméra : infobulle et lecteurs d'écran). */
  backLabel?: string
  name: string
  /** Légende au-dessus du média : « Dernière image », « Image à … », « Clip · … ». */
  caption: string
  /** Un avertissement au-dessus du média (événement en cours, image indisponible), vide sinon. */
  warning?: string
  /** Ce qui est montré en haut : l'image, le lecteur du clip, l'image d'un instant… */
  media: ReactNode
  /** Les actions à côté du nom (allumer, éteindre…), rendues par le parent ; rien par défaut. */
  actions?: ReactNode
  /** Des mesures ou des détails sous le média (température d'un capteur, par exemple), rendus par le parent ; rien par défaut. */
  details?: ReactNode
  /** Posé sur la vidéo, en bas à gauche, en vue normale comme en vue en grand (bureau) : par exemple les températures. */
  overlay?: ReactNode
  /** L'heure, en bas à droite de la vidéo, en vue en grand seulement (téléphone et bureau). */
  clock?: ReactNode
  /** La frise, rendue par le parent. */
  timeline: ReactNode
  /** L'élément qui passe en plein écran : le parent le lit pour appeler l'API plein écran du navigateur. */
  figureRef?: RefObject<HTMLElement | null>
  /** Le média occupe tout l'écran, en paysage (tourné de 90° si le téléphone reste droit). */
  expanded?: boolean
  /** Le bouton « Afficher en grand » n'apparaît que si le parent sait l'ouvrir. */
  onExpand?: () => void
  onCollapse?: () => void
  /** Zoom au doigt (pincer, déplacer, double toucher), seulement en vue en grand ; sans lui, le média ne bouge pas. */
  mediaGesture?: MediaGesture
  /** Le média est en portrait : la vue en grand garde l'écran tel quel (pas de quart de tour quand il est droit). */
  portraitMedia?: boolean
}
