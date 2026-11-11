import type { ReactNode } from 'react'

export interface ClipPlayerProps {
  /** Adresse de la vidéo (locale ou distante), vide tant qu'elle n'est pas prête. */
  src: string
  /** Adresse du son du clip (un fichier à part de la vidéo), joué avec elle : il suit sa lecture, sa pause, ses sauts et sa vitesse ; absente : un clip sans son. */
  audioSrc?: string
  /** Message d'erreur ; quand il est là, un bouton Fermer apparaît. */
  error: string
  /** Où démarrer (ou reprendre) la lecture, en secondes ; à chaque changement la lecture saute là. */
  startAt: number
  /** Change à chaque nouveau clic sur le même clip : la lecture repart de `startAt` même si cette position n'a pas changé. */
  restart?: number
  onClose: () => void
  /** La vidéo a de quoi afficher sa première image : le parent peut la montrer. */
  onReady?: () => void
  /** La vidéo ne se lit pas : le code d'erreur du navigateur (2 réseau, 3 décodage, 4 format non pris en charge). */
  onFailure?: (code: number) => void
  /** Position de lecture, en secondes, à chaque avancée de la vidéo. */
  onTime: (seconds: number) => void
  /** Durée de la vidéo, une fois ses métadonnées connues. */
  onDuration: (seconds: number) => void
  /**
   * Un élément hors du lecteur où poser des commandes maison (lecture ou pause, barre de temps, position) à la place des commandes natives : pour une
   * vidéo tournée d'un quart de tour, les commandes restent droites. Absent (ou null) : les commandes natives, sur la vidéo.
   */
  controlsHost?: HTMLElement | null
  /** Un calque posé par-dessus l'image de la vidéo, dans son cadre exactement (ni le bouton du son ni les commandes n'en font partie). */
  overlay?: ReactNode
  /** La barre de commandes posée dans l'image s'arrête avant les boutons posés en bas à droite de la vidéo (agrandir, son, repères). Sans effet avec `controlsHost`. */
  barInset?: boolean
}
