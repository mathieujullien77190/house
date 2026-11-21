export type ClipMode = 'always' | 'night' | 'off'

export type Orientation = 'landscape' | 'portrait'

/** Le mode pluie : off ou on (on : il suit la météo). */
export type RainMode = 'off' | 'on'

/** Le niveau de pluie qui s'applique maintenant : off, rain ou heavy. */
export type RainLevel = 'off' | 'rain' | 'heavy' | 'fog' | 'wind'

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
  /** La recherche des yeux qui brillent, la nuit : off (par défaut) ou on. */
  eyes_mode?: RainMode
  /** Le clip lié : un mouvement ou des yeux vus par cette caméra font aussi un clip sur la caméra liée de l'enregistreur : off (par défaut) ou on. */
  link_mode?: RainMode
  /** Le mode vent : allumé, le vent au-dessus du seuil agit comme la pluie (pas de clips, une image toutes les 5 s). */
  wind_mode?: RainMode
  /** La durée de garde (jours) des clips non sauvegardés, des images et des événements de la caméra. */
  clip_retention_days: number
  /** Les images par seconde de la page invité (public et Chez Matou) pour cette caméra, de 1 à 25. */
  guest_fps: number
  /** À partir de ce nombre de zones (sur 30 % des images du mouvement), le mouvement est étiqueté feuillage : 0 = coupé. */
  foliage_zones: number
}
