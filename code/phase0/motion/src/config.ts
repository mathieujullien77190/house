// La configuration de l'enregistreur, lue dans l'environnement avec des valeurs par défaut sobres.
import { DEFAULT_CONFIG, type DetectorConfig } from './detector.ts'

export interface Config {
  /** Les caméras, par leur nom. Pour chacune, go2rtc sert les flux `<nom>_main` (enregistrement) et `<nom>_sub` (détection). */
  cameras: string[]
  /** go2rtc : son RTSP (lecture des flux) et son API (image à l'instant). Interne, jamais publié. */
  go2rtcRtsp: string
  go2rtcApi: string
  /** Images analysées par seconde, et leur taille : plus petit = plus rapide et moins sensible au bruit. */
  fps: number
  width: number
  height: number
  /** Les segments du flux principal (copie sans transcodage), gardés `retentionSeconds`, et les clips des événements. */
  recordingsDir: string
  clipsDir: string
  stateFile: string
  segmentSeconds: number
  retentionSeconds: number
  /** Un clip commence `preSeconds` avant l'événement et finit `postSeconds` après. */
  preSeconds: number
  postSeconds: number
  /** Étiquette vidéo du MP4 : hvc1 pour du H.265 (la caméra), vide pour du H.264. */
  videoTag: string
  /** L'API pour House Sync. */
  port: number
  detector: DetectorConfig
}

const number = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return value !== undefined && Number.isFinite(parsed) ? parsed : fallback
}

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => ({
  cameras: (env.CAMERAS ?? 'portail').split(',').map((name) => name.trim()).filter(Boolean),
  go2rtcRtsp: (env.GO2RTC_RTSP ?? 'rtsp://go2rtc:8554').replace(/\/$/, ''),
  go2rtcApi: (env.GO2RTC_API ?? 'http://go2rtc:1984').replace(/\/$/, ''),
  fps: number(env.FPS, 5),
  width: number(env.WIDTH, 160),
  height: number(env.HEIGHT, 90),
  recordingsDir: env.RECORDINGS_DIR ?? '/recordings',
  clipsDir: env.CLIPS_DIR ?? '/data/clips',
  stateFile: env.STATE_FILE ?? '/data/events.json',
  segmentSeconds: number(env.SEGMENT_SECONDS, 10),
  retentionSeconds: number(env.RETENTION_HOURS, 6) * 3600,
  preSeconds: number(env.PRE_SECONDS, 5),
  postSeconds: number(env.POST_SECONDS, 5),
  videoTag: env.VIDEO_TAG ?? 'hvc1',
  port: number(env.PORT, 8080),
  detector: {
    pixelThreshold: number(env.PIXEL_THRESHOLD, DEFAULT_CONFIG.pixelThreshold),
    areaThreshold: number(env.AREA_THRESHOLD, DEFAULT_CONFIG.areaThreshold),
    lightChangeThreshold: number(env.LIGHT_CHANGE_THRESHOLD, DEFAULT_CONFIG.lightChangeThreshold),
    startFrames: number(env.START_FRAMES, DEFAULT_CONFIG.startFrames),
    endSeconds: number(env.END_SECONDS, DEFAULT_CONFIG.endSeconds),
  },
})
