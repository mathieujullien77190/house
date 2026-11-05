export type ClipMode = 'always' | 'night' | 'off'

export interface CameraSetting {
  camera: string
  /** Les clips gardés : toujours, seulement la nuit, ou jamais. */
  clips_mode: ClipMode
  /** Images par seconde du direct 4K, de 1 à 25. */
  live_fps: number
  /** Images par seconde du direct léger, de 1 à 25. */
  light_fps: number
  /** Une image gardée toutes les N secondes. */
  snapshot_seconds: number
}
