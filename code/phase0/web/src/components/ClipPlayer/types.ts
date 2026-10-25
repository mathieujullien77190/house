export interface ClipPlayerProps {
  apiKey: string
  /** Chemin du service clips (/clips/id). */
  path: string
  /** Appelé par le bouton Fermer, montré seulement en cas d'erreur (sinon la carte a son propre bouton). */
  onClose: () => void
  /** Position de lecture, en secondes depuis le début du clip, à chaque avancée de la vidéo. */
  onTime?: (seconds: number) => void
  /** Où démarrer (ou reprendre) la lecture, en secondes depuis le début du clip ; change à chaque nouveau clic. */
  startAt?: number
  /** La durée de la vidéo, connue une fois ses métadonnées chargées. */
  onDuration?: (seconds: number) => void
}

export interface ClipPlayerUIProps {
  /** Adresse locale (blob) de la vidéo, vide tant qu'elle se télécharge. */
  src: string
  error: string
  startAt: number
  onClose: () => void
  onTime: (seconds: number) => void
  onDuration: (seconds: number) => void
}
