export interface SnapshotImageProps {
  /** Adresse de l'image, vide tant qu'elle se charge ou s'il n'y en a pas. */
  src: string
  /** Message montré à la place de l'image quand `src` est vide. */
  message: string
  /** Appelé quand l'image est chargée, avec sa taille réelle en pixels (pour un flux MJPEG : à la première image). */
  onSize?: (width: number, height: number) => void
}
