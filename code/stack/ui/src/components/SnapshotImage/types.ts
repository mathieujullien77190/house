export interface SnapshotImageProps {
  /** Adresse de l'image, vide tant qu'elle se charge ou s'il n'y en a pas. */
  src: string
  /** Texte posé en bas à gauche de l'image (l'identifiant de l'image gardée) ; rien s'il est absent. */
  label?: string
  /** Message montré à la place de l'image quand `src` est vide. */
  message: string
  /** Appelé quand l'image est chargée, avec sa taille réelle en pixels (pour un flux MJPEG : à la première image). */
  onSize?: (width: number, height: number) => void
  /** Le cadre est tourné d'un quart de tour horaire par le parent : le texte (chargement, message, identifiant) est remis droit. */
  upright?: boolean
}
