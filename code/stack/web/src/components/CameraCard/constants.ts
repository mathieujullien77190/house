/**
 * Un clip commence `preSeconds` avant l'événement et finit `postSeconds` après, mais seulement si
 * l'enregistrement avait des segments à ce moment : l'avance réelle se déduit de la durée de la vidéo, bornée à cette valeur.
 */
export const CLIP_MAX_LEAD_SECONDS = 5
export const CAMERA_TITLE_PREFIX = 'Caméra : '
export const LIVE_CAPTION = 'Direct'
/** Le détecteur du pont Hue dont la température s'affiche sur la vidéo de chaque caméra (identifiants du pont) : « motion fond » et « motion porte ». */
export const CAMERA_SENSOR: Record<string, string> = { 'perruche-fond': '54', 'perruche-porte': '57' }
export const TEMPERATURE_LABEL = 'Température · '
export const TEMPERATURE_UNKNOWN_TEXT = 'inconnue'
/** Le direct est un flux MJPEG que l'API relaie depuis go2rtc (le flux léger de la caméra, recodé en JPEG). */
export const LIVE_FORMAT = 'MJPEG'
export const AT_CAPTION_PREFIX = 'Image à '
export const CLIP_CAPTION_PREFIX = 'Clip · '
export const QUALITY_LABEL = 'Qualité de la vidéo'
export const QUALITY_OPTIONS = [
  { id: 'h264', label: 'H.264 · 720p' },
  { id: 'original', label: 'H.265 · 4K' },
] as const
/** Sur téléphone, le commutateur est posé sur la vidéo : juste la définition, sans le codec. */
export const QUALITY_OPTIONS_SHORT = [
  { id: 'h264', label: '720p' },
  { id: 'original', label: '4K' },
] as const
export const LIVE_QUALITY_LABEL = 'Qualité du direct'
export const LIVE_QUALITY_OPTIONS = [
  { id: 'light', label: 'Léger' },
  { id: 'hd', label: '4K' },
] as const
export const NO_IMAGE_TEXT = 'Direct indisponible : go2rtc ne répond pas.'
export const CAMERA_OFF_TEXT = 'Caméra éteinte'
export const CAMERA_STARTING_TEXT = 'Caméra en démarrage…'
export const NO_CLIP_TEXT = 'Clip en cours de copie par House Sync… il apparaîtra dès qu’il est prêt.'
export const ONGOING_CLIP_TEXT = 'Événement en cours : le clip arrivera à la fin du mouvement.'

/** Le lecteur du clip se charge sans se voir (sr-only le garde dans la page : un `display: none` empêcherait le téléphone de charger la vidéo). */
export const HIDDEN_PLAYER_CLASS = 'sr-only'
