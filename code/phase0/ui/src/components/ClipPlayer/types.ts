export interface ClipPlayerProps {
  /** Adresse de la vidéo (locale ou distante), vide tant qu'elle n'est pas prête. */
  src: string
  /** Message d'erreur ; quand il est là, un bouton Fermer apparaît. */
  error: string
  /** Où démarrer (ou reprendre) la lecture, en secondes ; à chaque changement la lecture saute là. */
  startAt: number
  onClose: () => void
  /** Position de lecture, en secondes, à chaque avancée de la vidéo. */
  onTime: (seconds: number) => void
  /** Durée de la vidéo, une fois ses métadonnées connues. */
  onDuration: (seconds: number) => void
}
