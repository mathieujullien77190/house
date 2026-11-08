// Les réglages que la page de House Sync modifie : par caméra (table `settings`) et globaux (table `app_settings`).
import type { DatabaseSync } from 'node:sqlite'
import type { Config } from './config.ts'
import { DEFAULT_ORIENTATION, ORIENTATIONS, type Orientation } from './database.ts'
import { isNight } from './sun.ts'

/** Les intervalles d'image proposés (secondes) : au-delà de 5 min, « l'image à cet instant » serait trop loin. */
export const SNAPSHOT_CHOICES = [30, 60, 120, 300]
// Les clips : toujours, seulement la nuit (de 30 min avant le coucher du soleil à 30 min après son lever), ou jamais.
export const CLIP_MODES = ['always', 'night', 'off']
export type ClipMode = 'always' | 'night' | 'off'
export const NIGHT_MARGIN_SECONDS = 30 * 60
/** Images par seconde du direct 4K : de 1 à 25 (25 : toutes, au rythme de la caméra). */
export const MAX_LIVE_FPS = 25
/** La sensibilité de la détection de mouvement : de 1 (petits mouvements ignorés) à 5 (très sensible) ; 3 : les seuils de base. */
export const MIN_SENSITIVITY = 1
export const MAX_SENSITIVITY = 5
const DEFAULT_SENSITIVITY = 3
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
  snapshot_seconds: number
  /** Paysage (le direct tel quel) ou portrait (caméra posée de côté : image tournée d'un quart de tour horaire). */
  orientation: Orientation
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
  seconds: number
  orientation: string
}

export const createSettings = (db: DatabaseSync, config: Config) => {
  const settingsOf = db.prepare('SELECT clips_enabled, clips_mode, live_fps, light_fps, live_fps_mobile, light_fps_mobile, motion_sensitivity, snapshot_seconds, orientation FROM settings WHERE camera = ?')
  const saveSettings = db.prepare(
    'INSERT INTO settings (camera, clips_enabled, clips_mode, live_fps, light_fps, live_fps_mobile, light_fps_mobile, motion_sensitivity, snapshot_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(camera) DO UPDATE SET clips_enabled = excluded.clips_enabled, clips_mode = excluded.clips_mode, live_fps = excluded.live_fps, light_fps = excluded.light_fps, live_fps_mobile = excluded.live_fps_mobile, light_fps_mobile = excluded.light_fps_mobile, motion_sensitivity = excluded.motion_sensitivity, snapshot_seconds = excluded.snapshot_seconds',
  )
  const setOrientation = db.prepare('UPDATE settings SET orientation = ? WHERE camera = ?')
  const knownCameras = db.prepare('SELECT camera FROM last_images ORDER BY camera')
  const retentionRow = db.prepare("SELECT value FROM app_settings WHERE key = 'clip_retention_days'")
  const saveRetention = db.prepare("INSERT INTO app_settings (key, value) VALUES ('clip_retention_days', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
  const guestFpsRow = db.prepare("SELECT value FROM app_settings WHERE key = 'guest_fps'")
  const saveGuestFps = db.prepare("INSERT INTO app_settings (key, value) VALUES ('guest_fps', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")

  const cameraSettings = (camera: string): CameraSettings => {
    const row = settingsOf.get(camera) as
      | { clips_enabled: number; clips_mode: string | null; live_fps: number | null; light_fps: number | null; live_fps_mobile: number | null; light_fps_mobile: number | null; motion_sensitivity: number | null; snapshot_seconds: number; orientation: string | null }
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
      snapshot_seconds: row?.snapshot_seconds ?? config.snapshotIntervalSeconds,
      orientation: row?.orientation && ORIENTATIONS.includes(row.orientation) ? (row.orientation as Orientation) : DEFAULT_ORIENTATION,
    }
  }

  return {
    cameraSettings,
    /** Le clip d'un événement qui commence à cet instant (secondes) est-il à garder ? */
    keepsClip: (camera: string, startTime: number): boolean => {
      const mode = cameraSettings(camera).clips_mode
      return mode === 'always' || (mode === 'night' && isNight(startTime, config.housePosition, NIGHT_MARGIN_SECONDS))
    },
    /** Les caméras connues (celles dont l'enregistreur a donné une image), par ordre alphabétique. */
    knownCameras: (): string[] => (knownCameras.all() as { camera: string }[]).map((row) => row.camera),
    saveCameraSettings: (update: CameraSettingsUpdate): void => {
      saveSettings.run(update.camera, update.mode === 'off' ? 0 : 1, update.mode, update.fps, update.light, update.fpsMobile, update.lightMobile, update.sensitivity, update.seconds)
      setOrientation.run(update.orientation, update.camera)
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
