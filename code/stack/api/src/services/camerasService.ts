// Les caméras : ce que la WebApp affiche (le direct passe par /stream, relayé de go2rtc).
import type { CamerasRepository } from '../repositories/camerasRepository.ts'
import type { CameraRow } from '../types.ts'

export const createCamerasService = (cameras: CamerasRepository) => ({
  liveStreams: (): CameraRow[] => cameras.liveStreams(),
  lastImages: (): CameraRow[] => cameras.lastImages(),
})

export type CamerasService = ReturnType<typeof createCamerasService>
