export interface SnapshotImageProps {
  apiKey: string
  camera: string
  /** L'instant demandé, en secondes. */
  at: number
}

export interface SnapshotImageUIProps {
  /** Adresse locale (blob) de l'image, vide tant qu'elle se charge ou s'il n'y en a pas. */
  src: string
  /** Message quand il n'y a pas d'image ; vide sinon. */
  message: string
}
