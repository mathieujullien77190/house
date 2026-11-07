import type { HueLight } from '@/types'

export interface CameraIndicatorsProps {
  /** Les températures déjà mises en forme (« 9,5 °C »), un bloc chacune. */
  temperatures: string[]
  /** La lampe de la caméra, ou null : pas de rond. */
  lamp: HueLight | null
}
