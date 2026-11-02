export interface ClipPlayerProps {
  /** Plus utilisé pour télécharger : le cookie de session suffit. Gardé pour que le parent n'ait rien à changer. */
  apiKey?: string
  /** Chemin du service clips (/clips/id). */
  path: string
  /** Appelé par le bouton Fermer, montré seulement en cas d'erreur (sinon la frise a « Maintenant »). */
  onClose: () => void
  /** Appelé quand la première image de la vidéo est prête. */
  onReady?: () => void
  /** Position de lecture, en secondes depuis le début du clip, à chaque avancée de la vidéo. */
  onTime?: (seconds: number) => void
  /** La durée de la vidéo, connue une fois ses métadonnées chargées. */
  onDuration?: (seconds: number) => void
  /** Où démarrer (ou reprendre) la lecture, en secondes depuis le début du clip ; change à chaque nouveau clic. */
  startAt?: number
  /** Change à chaque nouveau clic : le clip repart de `startAt`, même s'il n'a pas changé. */
  restart?: number
}
