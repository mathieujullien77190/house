import type { EventRow } from '@/types'

export interface HomeProps {
  apiKey: string
}

export interface HomeUIProps {
  apiKey: string
  /** Les clips sauvegardés, ou null tant qu'ils ne sont pas lus. */
  events: EventRow[] | null
  /** La lecture a échoué. */
  failed: boolean
  /** Le clip ouvert en lecture, ou null : la liste. */
  opened: EventRow | null
  /** La durée de la vidéo de chaque clip (secondes), par identifiant, une fois ses métadonnées chargées. */
  durations: Record<string, number>
  onDuration: (id: string, seconds: number) => void
  /** Le clip ouvert est-il sauvegardé (jamais effacé) ? Il peut être libéré ici ; il quitte alors la liste au retour. */
  saved: boolean
  onSave: (saved: boolean) => void
  /** La libération du clip a échoué. */
  saveFailed: boolean
  /** Pose la note d'un clip (vide : la supprime). */
  onNote: (id: string, note: string) => Promise<unknown>
  onOpen: (id: string) => void
  onBack: () => void
}
