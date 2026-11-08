import type { Camera } from '@/types'
import { MOSAIC_ORDER } from './constants'

/** Les caméras dans l'ordre des vignettes (`MOSAIC_ORDER`) ; celles qui n'y sont pas gardent leur ordre, à la suite. */
export const orderedCameras = (cameras: Camera[]): Camera[] => {
  const rank = (camera: Camera) => {
    const index = MOSAIC_ORDER.indexOf(camera.name)
    return index === -1 ? MOSAIC_ORDER.length : index
  }
  return [...cameras].sort((a, b) => rank(a) - rank(b))
}

