export interface ClipPlayerProps {
  /** Adresse de la vidéo (locale ou distante), vide tant qu'elle n'est pas prête. */
  src: string
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
}
