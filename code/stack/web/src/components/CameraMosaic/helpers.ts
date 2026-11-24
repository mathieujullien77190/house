import type { Camera } from '@/types'
import { MOSAIC_ORDER, PLANNED_CAMERAS } from './constants'

/** Les caméras dans l'ordre des vignettes (`MOSAIC_ORDER`) ; celles qui n'y sont pas gardent leur ordre, à la suite. */
export const orderedCameras = (cameras: Camera[]): Camera[] => {
  const rank = (camera: Camera) => {
    const index = MOSAIC_ORDER.indexOf(camera.name)
    return index === -1 ? MOSAIC_ORDER.length : index
  }
  return [...cameras].sort((a, b) => rank(a) - rank(b))
}

/** Les caméras prévues (`PLANNED_CAMERAS`) que l'API ne liste pas encore. */
export const plannedMissing = (cameras: Camera[]): string[] => PLANNED_CAMERAS.filter((name) => !cameras.some((camera) => camera.name === name))
