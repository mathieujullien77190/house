export interface ClipPlayerProps {
  apiKey: string
  /** Chemin du service clips (/clips/id). */
  path: string
  onClose: () => void
}

export interface ClipPlayerUIProps {
  /** Adresse locale (blob) de la vidéo, vide tant qu'elle se télécharge. */
  src: string
  error: string
  onClose: () => void
}
