import type { Camera } from '@/types'

export interface LiveTileProps {
  apiKey: string
  camera: Camera
  /** Appelé au clic : la page ouvre le détail de la caméra. */
  onOpen: () => void
}
