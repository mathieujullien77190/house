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
  onOpen: (id: string) => void
  onBack: () => void
}
