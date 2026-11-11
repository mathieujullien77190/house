// Les réglages que la page de House Sync modifie : par caméra (table `settings`) et globaux (table `app_settings`).
import type { DatabaseSync } from 'node:sqlite'
import type { Config } from './config.ts'
import { DEFAULT_ORIENTATION, ORIENTATIONS, type Orientation } from './database.ts'
import { cameraOrderSql } from './cameraOrder.ts'
import { isNight } from './sun.ts'

/** Les intervalles d'image proposés (secondes) : au-delà de 5 min, « l'image à cet instant » serait trop loin. Sous 30 s, un minuteur à part (1 s) s’en occupe : le tour de polling est de 30 s. */
export const SNAPSHOT_CHOICES = [5, 10, 15, 30, 60, 120, 300]
// Les clips : toujours, seulement la nuit (de 30 min avant le coucher du soleil à 30 min après son lever), ou jamais.
export const CLIP_MODES = ['always', 'night', 'off']
export type ClipMode = 'always' | 'night' | 'off'
export const NIGHT_MARGIN_SECONDS = 30 * 60
/** Les yeux qui brillent cherchent en pleine nuit : de 30 min APRÈS le coucher à 30 min AVANT le lever (une marge négative : le contraire des clips de nuit), quand il fait vraiment noir. */
export const EYES_MARGIN_SECONDS = -30 * 60
/**
 * Le mode pluie d'une caméra : off (on ne fait rien) ou on. Allumé, quand la météo dit pluie ou pluie forte, la détection de mouvement est coupée (pas de clips) et une image est prise
 * toutes les `RAIN_SNAPSHOT_SECONDS` ; quand il ne pleut plus, tout revient comme avant (les réglages gardés ne changent jamais).
 */
export const RAIN_MODES = ['off', 'on']
export type RainMode = 'off' | 'on'
/** Le niveau de pluie qui s'applique à une caméra : éteint, pluie ou pluie forte (celui de la météo, quand le mode pluie est allumé). */
export type RainLevel = 'off' | 'rain' | 'heavy'
export const RAIN_SNAPSHOT_SECONDS = 5
/** Les yeux qui brillent, par caméra : off ou on. Allumé, la nuit (de 30 min après le coucher à 30 min avant le lever), chaque image prise est envoyée à l'enregistreur qui cherche des yeux (`eyes.ts`). « night », ancienne valeur, vaut « on ». */
export const EYES_MODES = ['off', 'on']
export type EyesMode = 'off' | 'on'
/** Images par seconde du direct 4K : de 1 à 25 (25 : toutes, au rythme de la caméra). */
export const MAX_LIVE_FPS = 25
/** La sensibilité de la détection de mouvement : de 1 (petits mouvements ignorés) à 5 (très sensible) ; 3 : les seuils de base. */
export const MIN_SENSITIVITY = 1
export const MAX_SENSITIVITY = 5
const DEFAULT_SENSITIVITY = 3
/** La durée minimale d'un mouvement (en secondes entières) pour qu'il compte : de 0 (le premier mouvement compte) à 30 ; 1 par défaut. Un mouvement plus court (pluie, insecte) n'ouvre aucun événement. */
export const MIN_MOTION_SECONDS = 0
export const MAX_MOTION_SECONDS = 30
const DEFAULT_MOTION_SECONDS = 1
// La durée de garde des clips non sauvegardés (jours).
const DEFAULT_RETENTION_DAYS = 15
export const MIN_RETENTION_DAYS = 1
export const MAX_RETENTION_DAYS = 3650
// La cadence de la page invité (guest/) : un seul réglage, le même pour les vignettes (flux léger) et la caméra agrandie (4K), PC et téléphone confondus.
const DEFAULT_GUEST_FPS = 2

export interface CameraSettings {
  camera: string
  clips_mode: ClipMode
  live_fps: number
  light_fps: number
  live_fps_mobile: number
  light_fps_mobile: number
  /** La sensibilité de la détection de mouvement, de 1 à 5 (3 : les seuils de base de l'enregistreur). */
  motion_sensitivity: number
  /** Les secondes pendant lesquelles un mouvement doit durer pour ouvrir un événement (de 0 à 30). */
  motion_min_seconds: number
  snapshot_seconds: number
  /** Paysage (le direct tel quel) ou portrait (caméra posée de côté : image tournée d'un quart de tour horaire). */
  orientation: Orientation
  /** Le mode pluie choisi : off ou on (on : il suit la météo). */
  rain_mode: RainMode
  /** Le niveau de pluie qui s'applique maintenant (le mode et la météo) : off, rain ou heavy. */
  rain_now: RainLevel
  /** La recherche des yeux qui brillent : off ou on. */
  eyes_mode: EyesMode
  /** Vrai quand la recherche tourne maintenant (le mode on et la nuit), rafraîchi chaque minute ; lu par l'API pour l'icône œil de la WebApp. */
  eyes_now: boolean
}

/** Ce que la page change pour une caméra (tout est déjà validé). */
export interface CameraSettingsUpdate {
  camera: string
  mode: string
  fps: number
  light: number
  fpsMobile: number
  lightMobile: number
  sensitivity: number
  /** La durée minimale d'un mouvement, en secondes (sans elle, elle ne change pas). */
  minSeconds?: number
  seconds: number
  orientation: string
  rain?: string
  eyes?: string
}

/** Le mode gardé en base : « on » (et les anciens « auto », « rain », « heavy ») est allumé ; tout le reste est éteint. */
const rainModeOf = (value: string | null | undefined): RainMode =>
  value === 'on' || value === 'auto' || value === 'rain' || value === 'heavy' ? 'on' : 'off'

/** Le niveau qui s'applique : éteint, ou celui de la météo (aucune pluie : éteint, tout revient comme avant). */
const rainNowOf = (mode: RainMode, weather: 'none' | 'rain' | 'heavy'): RainLevel => (mode === 'off' || weather === 'none' ? 'off' : weather)

export const createSettings = (db: DatabaseSync, config: Config) => {
  const settingsOf = db.prepare('SELECT clips_enabled, clips_mode, live_fps, light_fps, live_fps_mobile, light_fps_mobile, motion_sensitivity, motion_min_seconds, snapshot_seconds, orientation, rain_mode, eyes_mode, eyes_now FROM settings WHERE camera = ?')
  const saveSettings = db.prepare(
    'INSERT INTO settings (camera, clips_enabled, clips_mode, live_fps, light_fps, live_fps_mobile, light_fps_mobile, motion_sensitivity, snapshot_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(camera) DO UPDATE SET clips_enabled = excluded.clips_enabled, clips_mode = excluded.clips_mode, live_fps = excluded.live_fps, light_fps = excluded.light_fps, live_fps_mobile = excluded.live_fps_mobile, light_fps_mobile = excluded.light_fps_mobile, motion_sensitivity = excluded.motion_sensitivity, snapshot_seconds = excluded.snapshot_seconds',
  )
  const setMinSeconds = db.prepare('UPDATE settings SET motion_min_seconds = ? WHERE camera = ?')
  const setOrientation = db.prepare('UPDATE settings SET orientation = ? WHERE camera = ?')
  const setRain = db.prepare('UPDATE settings SET rain_mode = ? WHERE camera = ?')
  const setRainNow = db.prepare('UPDATE settings SET rain_now = ? WHERE camera = ?')
  const setEyes = db.prepare('UPDATE settings SET eyes_mode = ? WHERE camera = ?')
  const setEyesNow = db.prepare('UPDATE settings SET eyes_now = ? WHERE camera = ?')
  const settingsCameras = db.prepare('SELECT camera FROM settings')
  // La météo : aucune pluie, pluie ou pluie forte (lue par weather.ts).
  let weatherRain: 'none' | 'rain' | 'heavy' = 'none'
  const knownCameras = db.prepare(`SELECT camera FROM last_images ORDER BY ${cameraOrderSql()}`)
  const retentionRow = db.prepare("SELECT value FROM app_settings WHERE key = 'clip_retention_days'")
  const saveRetention = db.prepare("INSERT INTO app_settings (key, value) VALUES ('clip_retention_days', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
  const guestFpsRow = db.prepare("SELECT value FROM app_settings WHERE key = 'guest_fps'")
  const saveGuestFps = db.prepare("INSERT INTO app_settings (key, value) VALUES ('guest_fps', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")

  const cameraSettings = (camera: string): CameraSettings => {
    const row = settingsOf.get(camera) as
      | { clips_enabled: number; clips_mode: string | null; live_fps: number | null; light_fps: number | null; live_fps_mobile: number | null; light_fps_mobile: number | null; motion_sensitivity: number | null; motion_min_seconds: number | null; snapshot_seconds: number; orientation: string | null; rain_mode: string | null; eyes_mode: string | null; eyes_now: number | null }
      | undefined
    const mode = row?.clips_mode && CLIP_MODES.includes(row.clips_mode) ? (row.clips_mode as ClipMode) : row && row.clips_enabled !== 1 ? 'off' : 'always'
    return {
      camera,
      clips_mode: mode,
      live_fps: row?.live_fps ?? MAX_LIVE_FPS,
      light_fps: row?.light_fps ?? MAX_LIVE_FPS,
      live_fps_mobile: row?.live_fps_mobile ?? MAX_LIVE_FPS,
      light_fps_mobile: row?.light_fps_mobile ?? MAX_LIVE_FPS,
      motion_sensitivity: row?.motion_sensitivity ?? DEFAULT_SENSITIVITY,
      motion_min_seconds: row?.motion_min_seconds ?? DEFAULT_MOTION_SECONDS,
      snapshot_seconds: row?.snapshot_seconds ?? config.snapshotIntervalSeconds,
      orientation: row?.orientation && ORIENTATIONS.includes(row.orientation) ? (row.orientation as Orientation) : DEFAULT_ORIENTATION,
      rain_mode: rainModeOf(row?.rain_mode),
      rain_now: rainNowOf(rainModeOf(row?.rain_mode), weatherRain),
      eyes_mode: row?.eyes_mode === 'on' || row?.eyes_mode === 'night' ? 'on' : 'off',
      eyes_now: row?.eyes_now === 1,
    }
  }
  /** Les réglages qui comptent vraiment : en mode pluie, pas de clips et une image toutes les 5 s, quoi que dise la page. */
  const effectiveSettings = (camera: string): CameraSettings => {
    const own = cameraSettings(camera)
    return own.rain_now === 'off' ? own : { ...own, clips_mode: 'off', snapshot_seconds: RAIN_SNAPSHOT_SECONDS }
  }

  /** La recherche des yeux est-elle active à cet instant (secondes) ? Le mode « on » et la pleine nuit (de 30 min après le coucher à 30 min avant le lever). */
  const eyesActive = (camera: string, at: number): boolean => cameraSettings(camera).eyes_mode === 'on' && isNight(at, config.housePosition, EYES_MARGIN_SECONDS)

  return {
    cameraSettings,
    effectiveSettings,
    eyesActive,
    /** Range en base, pour l'API, si la recherche des yeux tourne maintenant (chaque minute et après un changement de réglage). */
    refreshEyes: (at: number): void => {
      for (const { camera } of settingsCameras.all() as { camera: string }[]) setEyesNow.run(eyesActive(camera, at) ? 1 : 0, camera)
    },
    /** La météo a changé : le niveau de pluie de chaque caméra (celles dont le mode pluie est allumé) suit, et se range en base pour l'API. */
    setWeatherRain: (level: 'none' | 'rain' | 'heavy'): void => {
      weatherRain = level
      for (const { camera } of settingsCameras.all() as { camera: string }[]) setRainNow.run(cameraSettings(camera).rain_now, camera)
    },
    /** Le clip d'un événement qui commence à cet instant (secondes) est-il à garder ? */
    keepsClip: (camera: string, startTime: number): boolean => {
      const mode = effectiveSettings(camera).clips_mode
      return mode === 'always' || (mode === 'night' && isNight(startTime, config.housePosition, NIGHT_MARGIN_SECONDS))
    },
    /** Les caméras connues (celles dont l'enregistreur a donné une image), par ordre alphabétique. */
    knownCameras: (): string[] => (knownCameras.all() as { camera: string }[]).map((row) => row.camera),
    saveCameraSettings: (update: CameraSettingsUpdate): void => {
      saveSettings.run(update.camera, update.mode === 'off' ? 0 : 1, update.mode, update.fps, update.light, update.fpsMobile, update.lightMobile, update.sensitivity, update.seconds)
      setOrientation.run(update.orientation, update.camera)
      if (update.minSeconds !== undefined) setMinSeconds.run(update.minSeconds, update.camera)
      if (update.rain !== undefined) setRain.run(update.rain, update.camera)
      if (update.eyes !== undefined) setEyes.run(update.eyes, update.camera)
      setRainNow.run(cameraSettings(update.camera).rain_now, update.camera)
    },
    clipRetentionDays: (): number => {
      const row = retentionRow.get() as { value: string } | undefined
      const days = Number(row?.value ?? config.retentionDaysEnv ?? DEFAULT_RETENTION_DAYS)
      return Number.isInteger(days) && days >= MIN_RETENTION_DAYS && days <= MAX_RETENTION_DAYS ? days : DEFAULT_RETENTION_DAYS
    },
    saveRetention: (days: number): void => void saveRetention.run(String(days)),
    guestFps: (): number => {
      const row = guestFpsRow.get() as { value: string } | undefined
      const fps = Number(row?.value ?? DEFAULT_GUEST_FPS)
      return Number.isInteger(fps) && fps >= 1 && fps <= MAX_LIVE_FPS ? fps : DEFAULT_GUEST_FPS
    },
    saveGuestFps: (fps: number): void => void saveGuestFps.run(String(fps)),
  }
}

export type Settings = ReturnType<typeof createSettings>
