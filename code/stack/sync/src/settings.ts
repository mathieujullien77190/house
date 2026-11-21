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
/**
 * Le mode pluie d'une caméra : off (on ne fait rien) ou on. Allumé, quand la météo dit pluie, pluie forte ou brouillard, la détection de mouvement est coupée (pas de clips) et une image est prise
 * toutes les `RAIN_SNAPSHOT_SECONDS` ; quand il ne pleut plus, tout revient comme avant (les réglages gardés ne changent jamais).
 */
export const RAIN_MODES = ['off', 'on']
/** Le nombre de zones du réglage « feuillage » : de 1 à 60 (0 : coupé). */
export const MAX_FOLIAGE_ZONES = 60
export type RainMode = 'off' | 'on'
/** Le niveau de pluie qui s'applique à une caméra : éteint, pluie ou pluie forte (celui de la météo, quand le mode pluie est allumé). */
export type RainLevel = 'off' | 'rain' | 'heavy' | 'fog' | 'wind'
export const RAIN_SNAPSHOT_SECONDS = 5
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
  /** Le mode vent choisi : off ou on (on : il suit le vent de la météo, `WIND_THRESHOLD_KMH`). */
  wind_mode: RainMode
  /** La recherche des yeux qui brillent, la nuit (enregistreur, `eyes.ts`) : off (par défaut) ou on. */
  eyes_mode: RainMode
  /** Le clip lié : un mouvement ou des yeux vus par cette caméra font aussi un clip sur la caméra liée (LINKS de l'enregistreur) : off (par défaut) ou on. */
  link_mode: RainMode
  /** La durée de garde (jours) des clips non sauvegardés, des images et des événements de la caméra. */
  clip_retention_days: number
  /** Les images par seconde de la page invité (public et Chez Matou) pour cette caméra. */
  guest_fps: number
  /** À partir de ce nombre de zones, un mouvement est étiqueté « feuillage » (0 : jamais). */
  foliage_zones: number
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
  link?: string
  wind?: string
  retention?: number
  guestFps?: number
  foliage?: number
}

/** Le mode gardé en base : « on » (et les anciens « auto », « rain », « heavy ») est allumé ; tout le reste est éteint. */
const rainModeOf = (value: string | null | undefined): RainMode =>
  value === 'on' || value === 'auto' || value === 'rain' || value === 'heavy' ? 'on' : 'off'

/** Le niveau qui s'applique : éteint, ou celui de la météo (aucune pluie : éteint, tout revient comme avant). */
const rainNowOf = (mode: RainMode, weather: 'none' | 'rain' | 'heavy' | 'fog', windMode: RainMode, windy: boolean): RainLevel =>
  mode === 'on' && weather !== 'none' ? weather : windMode === 'on' && windy ? 'wind' : 'off'

export const createSettings = (db: DatabaseSync, config: Config) => {
  const settingsOf = db.prepare('SELECT clips_enabled, clips_mode, live_fps, light_fps, live_fps_mobile, light_fps_mobile, motion_sensitivity, motion_min_seconds, snapshot_seconds, orientation, rain_mode, wind_mode, eyes_mode, link_mode, retention_days, guest_fps, foliage_zones FROM settings WHERE camera = ?')
  const saveSettings = db.prepare(
    'INSERT INTO settings (camera, clips_enabled, clips_mode, live_fps, light_fps, live_fps_mobile, light_fps_mobile, motion_sensitivity, snapshot_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(camera) DO UPDATE SET clips_enabled = excluded.clips_enabled, clips_mode = excluded.clips_mode, live_fps = excluded.live_fps, light_fps = excluded.light_fps, live_fps_mobile = excluded.live_fps_mobile, light_fps_mobile = excluded.light_fps_mobile, motion_sensitivity = excluded.motion_sensitivity, snapshot_seconds = excluded.snapshot_seconds',
  )
  const setMinSeconds = db.prepare('UPDATE settings SET motion_min_seconds = ? WHERE camera = ?')
  const setOrientation = db.prepare('UPDATE settings SET orientation = ? WHERE camera = ?')
  const setRain = db.prepare('UPDATE settings SET rain_mode = ? WHERE camera = ?')
  const setRainNow = db.prepare('UPDATE settings SET rain_now = ? WHERE camera = ?')
  const setWind = db.prepare('UPDATE settings SET wind_mode = ? WHERE camera = ?')
  const setEyesNow = db.prepare('UPDATE settings SET eyes_now = ? WHERE camera = ?')
  const setEyes = db.prepare('UPDATE settings SET eyes_mode = ? WHERE camera = ?')
  const setLink = db.prepare('UPDATE settings SET link_mode = ? WHERE camera = ?')
  const setRetentionDays = db.prepare('UPDATE settings SET retention_days = ? WHERE camera = ?')
  const setGuestFps = db.prepare('UPDATE settings SET guest_fps = ? WHERE camera = ?')
  const setFoliage = db.prepare('UPDATE settings SET foliage_zones = ? WHERE camera = ?')
  const settingsCameras = db.prepare('SELECT camera FROM settings')
  // La météo : aucune pluie, pluie ou pluie forte (lue par weather.ts).
  let weatherRain: 'none' | 'rain' | 'heavy' | 'fog' = 'none'
  // Le vent (km/h) de la météo : le mode vent s'active au-delà du seuil.
  let weatherWind = 0
  const knownCameras = db.prepare(`SELECT camera FROM last_images ORDER BY ${cameraOrderSql()}`)
  const retentionRow = db.prepare("SELECT value FROM app_settings WHERE key = 'clip_retention_days'")
  const guestFpsRow = db.prepare("SELECT value FROM app_settings WHERE key = 'guest_fps'")
  const saveGuestFps = db.prepare("INSERT INTO app_settings (key, value) VALUES ('guest_fps', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
  const sunsetEnabledRow = db.prepare("SELECT value FROM app_settings WHERE key = 'sunset_lights_enabled'")
  const saveSunsetEnabled = db.prepare("INSERT INTO app_settings (key, value) VALUES ('sunset_lights_enabled', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
  const sunsetDayRow = db.prepare("SELECT value FROM app_settings WHERE key = 'sunset_lights_last_day'")
  const saveSunsetDay = db.prepare("INSERT INTO app_settings (key, value) VALUES ('sunset_lights_last_day', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")

  // Les valeurs de départ des caméras qui n'ont pas la leur : le réglage commun d'avant (app_settings), sinon le défaut.
  const defaultRetentionDays = (): number => {
    const row = retentionRow.get() as { value: string } | undefined
    const days = Number(row?.value ?? config.retentionDaysEnv ?? DEFAULT_RETENTION_DAYS)
    return Number.isInteger(days) && days >= MIN_RETENTION_DAYS && days <= MAX_RETENTION_DAYS ? days : DEFAULT_RETENTION_DAYS
  }
  const defaultGuestFps = (): number => {
    const row = guestFpsRow.get() as { value: string } | undefined
    const fps = Number(row?.value ?? DEFAULT_GUEST_FPS)
    return Number.isInteger(fps) && fps >= 1 && fps <= MAX_LIVE_FPS ? fps : DEFAULT_GUEST_FPS
  }

  const cameraSettings = (camera: string): CameraSettings => {
    const row = settingsOf.get(camera) as
      | { clips_enabled: number; clips_mode: string | null; live_fps: number | null; light_fps: number | null; live_fps_mobile: number | null; light_fps_mobile: number | null; motion_sensitivity: number | null; motion_min_seconds: number | null; snapshot_seconds: number; orientation: string | null; rain_mode: string | null; wind_mode: string | null; eyes_mode: string | null; link_mode: string | null; retention_days: number | null; guest_fps: number | null; foliage_zones: number | null }
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
      rain_now: rainNowOf(rainModeOf(row?.rain_mode), weatherRain, rainModeOf(row?.wind_mode), weatherWind >= config.windThresholdKmh),
      wind_mode: rainModeOf(row?.wind_mode),
      eyes_mode: row?.eyes_mode === 'on' ? 'on' : 'off',
      link_mode: row?.link_mode === 'on' ? 'on' : 'off',
      clip_retention_days: row?.retention_days && row.retention_days >= MIN_RETENTION_DAYS && row.retention_days <= MAX_RETENTION_DAYS ? row.retention_days : defaultRetentionDays(),
      guest_fps: row?.guest_fps && row.guest_fps >= 1 && row.guest_fps <= MAX_LIVE_FPS ? row.guest_fps : defaultGuestFps(),
      foliage_zones: row?.foliage_zones && row.foliage_zones > 0 && row.foliage_zones <= MAX_FOLIAGE_ZONES ? row.foliage_zones : 0,
    }
  }
  /** Les réglages qui comptent vraiment : en mode pluie, pas de clips et une image toutes les 5 s, quoi que dise la page. */
  const effectiveSettings = (camera: string): CameraSettings => {
    const own = cameraSettings(camera)
    return own.rain_now === 'off' ? own : { ...own, clips_mode: 'off', snapshot_seconds: RAIN_SNAPSHOT_SECONDS }
  }

  return {
    cameraSettings,
    effectiveSettings,
    /** La météo a changé : le niveau de pluie de chaque caméra (celles dont le mode pluie est allumé) suit, et se range en base pour l'API. */
    setWeatherRain: (level: 'none' | 'rain' | 'heavy' | 'fog'): void => {
      weatherRain = level
      for (const { camera } of settingsCameras.all() as { camera: string }[]) setRainNow.run(cameraSettings(camera).rain_now, camera)
    },
    /** Le vent a changé (km/h) : le niveau de chaque caméra dont le mode vent est allumé suit, et se range en base pour l'API. */
    setWeatherWind: (kmh: number): void => {
      weatherWind = kmh
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
      if (update.wind !== undefined) setWind.run(update.wind, update.camera)
      if (update.eyes !== undefined) setEyes.run(update.eyes, update.camera)
      if (update.link !== undefined) setLink.run(update.link, update.camera)
      if (update.retention !== undefined) setRetentionDays.run(update.retention, update.camera)
      if (update.guestFps !== undefined) setGuestFps.run(update.guestFps, update.camera)
      if (update.foliage !== undefined) setFoliage.run(update.foliage, update.camera)
      setRainNow.run(cameraSettings(update.camera).rain_now, update.camera)
    },
    /** La durée de garde de départ (celle des caméras sans la leur). */
    clipRetentionDays: defaultRetentionDays,
    guestFps: defaultGuestFps,
    saveGuestFps: (fps: number): void => void saveGuestFps.run(String(fps)),
    /** La recherche des yeux est-elle demandée pour cette caméra (réglage de la caméra, éteint par défaut) ? */
    eyesDetectionEnabled: (camera: string): boolean => cameraSettings(camera).eyes_mode === 'on',
    /** Elle ne tourne que la nuit : de 30 min après le coucher du soleil jusqu'à 30 min avant son lever (marge côté jour : `NIGHT_MARGIN_SECONDS`, l'enregistreur n'a pas de soleil). */
    eyesNight: (at: number): boolean => isNight(at, config.housePosition, -NIGHT_MARGIN_SECONDS),
    /** Range pour l'API si la recherche des yeux tourne sur la caméra. */
    saveEyesNow: (camera: string, running: boolean): void => void setEyesNow.run(running ? 1 : 0, camera),
    /** L'allumage au coucher du soleil (sunsetLights.ts) : allumé tant que l'utilisateur ne l'a pas coupé. */
    sunsetLightsEnabled: (): boolean => (sunsetEnabledRow.get() as { value: string } | undefined)?.value !== '0',
    saveSunsetLightsEnabled: (enabled: boolean): void => void saveSunsetEnabled.run(enabled ? '1' : '0'),
    /** Le jour (UTC, « 2026-11-18 ») de la dernière exécution, ou null. */
    sunsetLightsLastDay: (): string | null => (sunsetDayRow.get() as { value: string } | undefined)?.value ?? null,
    saveSunsetLightsLastDay: (day: string): void => void saveSunsetDay.run(day),
  }
}

export type Settings = ReturnType<typeof createSettings>
