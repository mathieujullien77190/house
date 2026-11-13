import type { Camera, EventRow } from '@/types'

export interface HomeProps {
  apiKey: string
  /** Les vraies caméras (leurs noms servent à la carte). */
  cameras: Camera[]
  /** Ouvre la page d'une caméra (l'onglet Caméras, son détail). */
  onOpenCamera: (camera: string, eventId?: string) => void
  /** Les événements récents et la lecture des clips (pour la miniature de la carte). */
  events: EventRow[]
  isRead: (id: string) => boolean
  /** Ouvre l'onglet Clim. */
  onOpenAc: () => void
  /** Ouvre l'onglet Volet. */
  onOpenShutter: () => void
  /** Ouvre l'onglet Prise. */
  onOpenPlug: () => void
  /** Ouvre l'onglet Box. */
  onOpenBox: () => void
}
