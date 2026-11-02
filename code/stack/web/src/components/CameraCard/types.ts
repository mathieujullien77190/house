import type { Camera, EventRow } from '@/types'

export interface CameraCardProps {
  apiKey: string
  camera: Camera
  /** Les événements de cette caméra seulement, du plus récent au plus ancien. */
  events: EventRow[]
}
