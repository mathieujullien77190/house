export type ClipMode = 'always' | 'night' | 'off'

export type Orientation = 'landscape' | 'portrait'

/** Le mode pluie : off ou on (on : il suit la météo). */
export type RainMode = 'off' | 'on'

/** Le niveau de pluie qui s'applique maintenant : off, rain ou heavy. */
export type RainLevel = 'off' | 'rain' | 'heavy'

export interface CameraSetting {
  camera: string
  /** Les clips gardés : toujours, seulement la nuit, ou jamais. */
  clips_mode: ClipMode
  /** Paysage ou portrait (caméra posée de côté) : les nouveaux clips gardent celle de leur début. */
  orientation: Orientation
  /** Images par seconde du direct 4K, de 1 à 25. */
  live_fps: number
  /** Images par seconde du direct léger, de 1 à 25. */
  light_fps: number
  /** Les mêmes deux cadences sur un écran de moins de 1024 px (téléphone). */
  live_fps_mobile: number
  light_fps_mobile: number
  /** La sensibilité de la détection de mouvement, de 1 à 5 (3 : le réglage de base). */
  motion_sensitivity: number
  /** Les secondes pendant lesquelles un mouvement doit durer pour compter (de 0 à 30) : un plus court (pluie, insecte) est ignoré. */
  motion_min_seconds: number
  /** Une image gardée toutes les N secondes. */
  snapshot_seconds: number
  /** Le mode pluie : allumé, pas de clips (détection coupée) et une image toutes les 5 s ; les autres réglages reviennent à l'extinction. */
  rain_mode?: RainMode
  /** Le niveau de pluie qui s'applique maintenant (le mode et la météo). */
  rain_now?: RainLevel
}
