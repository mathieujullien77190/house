import type { Camera } from '@/types'

export interface CameraMosaicProps {
  apiKey: string
  cameras: Camera[]
  /** Appelé avec le nom de la caméra dont on clique la vignette. */
  onOpen: (camera: string) => void
}
