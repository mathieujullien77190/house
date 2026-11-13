import type { Camera, EventRow } from '@/types'

export interface HouseMapProps {
  apiKey: string
  /** Les vraies caméras : leurs noms servent au lien de chaque caméra du plan (en mode modification). */
  cameras: Camera[]
  /** Ouvre la page d'une vraie caméra (son détail, avec ses clips) : un clic sur sa caméra du plan. */
  onOpenCamera: (camera: string, eventId?: string) => void
  /** Les événements récents de toutes les caméras (du plus récent au plus ancien) et si un clip a déjà été ouvert : la miniature de la carte est celle de la liste des caméras (dernier événement, lu / non lu). */
  events: EventRow[]
  isRead: (id: string) => boolean
  /** Ouvre la page des climatisations : un clic sur le rectangle d'une climatisation. */
  onOpenAc: () => void
  /** Ouvre l'onglet Volet. */
  onOpenShutter: () => void
  /** Ouvre la page de la prise : un clic sur la prise du plan. */
  onOpenPlug: () => void
  /** Ouvre l'onglet Box : un double clic sur la box du plan. */
  onOpenBox: () => void
}
