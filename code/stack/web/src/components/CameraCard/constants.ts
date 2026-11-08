/**
 * Un clip commence `preSeconds` avant l'événement et finit `postSeconds` après, mais seulement si
 * l'enregistrement avait des segments à ce moment : l'avance réelle se déduit de la durée de la vidéo, bornée à cette valeur.
 */
export const CLIP_MAX_LEAD_SECONDS = 5
/** Le titre de la carte : le nom de la caméra, sans préfixe. */
export const CAMERA_TITLE_PREFIX = ''
export const LIVE_CAPTION = 'Direct'
/** Le détecteur du pont Hue dont la température s'affiche sur la vidéo de chaque caméra (identifiants du pont) : « motion exterieur » (57) pour voliere-exterieur, « motion interieur » (54) pour voliere-interieur. */
export const CAMERA_SENSOR: Record<string, string> = { 'voliere-exterieur': '57', 'voliere-interieur': '54' }
/** La lampe dont le rond s'affiche à côté de la température sur la vidéo d'une caméra (identifiant du pont) : « Perruche » pour voliere-interieur. */
export const CAMERA_LAMP: Record<string, string> = { 'voliere-interieur': '26' }
/** Les caméras dont la vidéo montre aussi le carré de la prise connectée (celle de la volière), à côté du rond de la lampe. */
export const CAMERA_WITH_PLUG: string[] = ['voliere-interieur']
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
export const SAVE_LABEL = 'Sauvegarder le clip (jamais effacé)'
export const SAVE_OPTIONS = [
  { id: 'no', label: 'Non sauvegardé' },
  { id: 'yes', label: 'Sauvegardé' },
] as const
export const LIVE_QUALITY_LABEL = 'Qualité du direct'
export const LIVE_QUALITY_OPTIONS = [
  { id: 'light', label: 'Léger' },
  { id: 'hd', label: '4K' },
] as const
export const NO_IMAGE_TEXT = 'Direct indisponible : go2rtc ne répond pas.'
export const CAMERA_OFF_TEXT = 'Caméra éteinte'
export const CAMERA_STARTING_TEXT = 'Caméra en démarrage…'
export const NO_CLIP_TEXT = 'Clip en cours de copie par House Sync…\nIl apparaîtra dès qu’il est prêt.'
export const ONGOING_CLIP_TEXT = 'Événement en cours : le clip arrivera à la fin du mouvement.'

/** Le lecteur du clip se charge sans se voir (sr-only le garde dans la page : un `display: none` empêcherait le téléphone de charger la vidéo). */
export const HIDDEN_PLAYER_CLASS = 'sr-only'

/** Le bouton qui montre le polygone de la zone où on cherche le mouvement (par défaut toute l'image), à réduire en glissant ses sommets. */
export const ZONE_BUTTON_LABEL = 'Zone de surveillance'
export const ZONE_RESET_LABEL = 'Toute l’image'
export const ZONE_FAILED_TEXT = 'Zone non enregistrée'
export const ZONE_FAILED_CLASS = 'text-[0.8rem] text-danger'
/** Dans la vidéo d'une caméra tournée, en bas, droite : l'endroit où le lecteur pose ses commandes. */
export const CONTROLS_OVERLAY_CLASS = 'absolute inset-x-0 bottom-0'
/** Le cadre de la vidéo, sur lequel se pose le polygone. */
export const MEDIA_HOST_CLASS = 'relative'

/** Le bouton qui enregistre un clip à la main : « Enregistrer » commence, « Arrêter » (avec le temps écoulé) termine ; le clip est sauvegardé d'office. */
export const RECORD_LABEL = 'Enregistrer un clip'
export const RECORD_STOP_LABEL = 'Arrêter'
export const RECORD_FAILED_TEXT = 'Enregistrement impossible'
export const RECORD_STOPPED_TEXT = 'Clip en cours de copie par House Sync…'
export const RECORD_STOPPED_DETAIL = 'Il apparaîtra dès qu’il est prêt.'
export const RECORD_NOTE_CLASS = 'text-[0.8rem] text-muted'
