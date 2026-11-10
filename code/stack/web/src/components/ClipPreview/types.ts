import type { EventRow } from '@/types'

export interface ClipPreviewProps {
  apiKey: string
  /** Le clip sauvegardé à montrer. */
  event: EventRow
  /** Ouvre le clip dans l'onglet Caméras (le détail de sa caméra, le clip lancé). */
  onOpen: () => void
}
