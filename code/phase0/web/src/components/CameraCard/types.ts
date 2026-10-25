import type { Camera, EventRow } from '@/types'

export interface CameraCardProps {
  apiKey: string
  camera: Camera
  /** Les événements de cette caméra seulement, du plus récent au plus ancien. */
  events: EventRow[]
}

export interface CameraCardUIProps {
  apiKey: string
  name: string
  /** Adresse de la dernière image avec son paramètre anti-cache, vide si Frigate n'en donne pas. */
  imageSrc: string
  lastEventText: string
  events: EventRow[]
  onImageError: () => void
}
