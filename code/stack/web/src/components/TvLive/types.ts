import type { Camera } from '@/types'

export interface TvLiveProps {
  /** La caméra dont on voit le direct en grand. */
  camera: Camera
  /** Retour (ou Échap) : on ferme et la carte revient. */
  onClose: () => void
}

export interface TvLiveUIProps {
  src: string
  /** Caméra posée de côté (portrait) : le direct est tourné d'un quart de tour horaire. */
  turned: boolean
  name: string
}
