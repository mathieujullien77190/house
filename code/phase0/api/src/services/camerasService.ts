// Les caméras : ce que la WebApp affiche (direct et dernière image viennent de Frigate, pas de l'API).
import type { CamerasRepository } from '../repositories/camerasRepository.ts'
import type { CameraRow } from '../types.ts'

export const createCamerasService = (cameras: CamerasRepository) => ({
  liveStreams: (): CameraRow[] => cameras.liveStreams(),
  lastImages: (): CameraRow[] => cameras.lastImages(),
})

export type CamerasService = ReturnType<typeof createCamerasService>
