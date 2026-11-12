/**
 * Un clip commence `preSeconds` avant l'événement et finit `postSeconds` après, mais seulement si
 * l'enregistrement avait des segments à ce moment : l'avance réelle se déduit de la durée de la vidéo, bornée à cette valeur.
 */
export const CLIP_MAX_LEAD_SECONDS = 5
/** Le titre de la carte : le nom de la caméra, sans préfixe. */
export const CAMERA_TITLE_PREFIX = ''
/** Le détecteur du pont Hue dont la température s'affiche sur la vidéo de chaque caméra (identifiants du pont) : « motion exterieur » (57) pour voliere-exterieur, « motion interieur » (54) pour voliere-interieur. */
export const CAMERA_SENSOR: Record<string, string> = { 'voliere-exterieur': '57', 'voliere-interieur': '54' }
/** La lampe dont le rond s'affiche à côté de la température sur la vidéo d'une caméra (identifiant du pont) : « Perruche » pour voliere-interieur. */
export const CAMERA_LAMP: Record<string, string> = { 'voliere-interieur': '26' }
/** Les caméras dont la vidéo montre aussi le carré de la prise connectée (celle de la volière), à côté du rond de la lampe. */
export const CAMERA_WITH_PLUG: string[] = ['voliere-interieur']
export const TEMPERATURE_LABEL = 'Température · '
export const TEMPERATURE_UNKNOWN_TEXT = 'inconnue'
/** Le direct est un flux MJPEG que l'API relaie depuis go2rtc (le flux léger de la caméra, recodé en JPEG). */
export const SAVE_LABEL = 'Sauvegarder le clip (jamais effacé)'
export const SAVE_OPTIONS = [
  { id: 'no', label: 'Non sauvegardé' },
  { id: 'yes', label: 'Sauvegardé' },
] as const
export const LIVE_QUALITY_LABEL = 'Qualité du direct'
/** « Léger » s'écrit « L » : le sélecteur, posé sur la vidéo, prend peu de place (téléphone et grand écran). */
export const LIVE_QUALITY_OPTIONS_SHORT = [
  { id: 'light', label: 'L' },
  { id: 'hd', label: '4K' },
] as const
/** « Off » : éteint la caméra (PoE coupé) ; L ou 4K la rallume. Absent sans switch. */
export const LIVE_OFF_OPTION = { id: 'off', label: 'Off' } as const
export const POWER_ERROR_TEXT = 'Le switch n’a pas répondu.'
export const NO_IMAGE_TEXT = 'Direct indisponible : go2rtc ne répond pas.'
export const CAMERA_OFF_TEXT = 'Caméra éteinte'
export const CAMERA_STARTING_TEXT = 'Caméra en démarrage…'
export const NO_CLIP_TEXT = 'Clip en cours de copie par House Sync…\nIl apparaîtra dès qu’il est prêt.'
/** Un événement fini depuis plus longtemps que ça (secondes) et sans clip n'en aura pas : House Sync copie un clip en une ou deux minutes. */
export const CLIP_WAIT_SECONDS = 600
export const NEVER_CLIP_TEXT = 'Pas de clip pour cet événement.\nLes clips étaient coupés : mode pluie ou brouillard, ou réglage de la caméra.'
export const ONGOING_CLIP_TEXT = 'Événement en cours : le clip arrivera à la fin du mouvement.'

/** Le lecteur du clip se charge sans se voir (sr-only le garde dans la page : un `display: none` empêcherait le téléphone de charger la vidéo). */
export const HIDDEN_PLAYER_CLASS = 'sr-only'
/** Le flux 4K qui se charge derrière le flux léger : dans la page mais invisible et sans prise sur les clics. */
export const HD_PRELOAD_CLASS = 'pointer-events-none absolute inset-0 opacity-0'

/** Le bouton qui montre le polygone de la zone où on cherche le mouvement (par défaut toute l'image), à réduire en glissant ses sommets. */
export const ZONE_BUTTON_LABEL = 'Zone de surveillance'
export const ZONE_RESET_LABEL = 'Toute l’image'
export const ZONE_FAILED_TEXT = 'Zone non enregistrée'
export const ZONE_FAILED_CLASS = 'text-[0.8rem] text-danger'
/** Dans la vidéo d'une caméra tournée, en bas, droite : l'endroit où le lecteur pose ses commandes. */
export const CONTROLS_OVERLAY_CLASS = 'absolute inset-x-0 bottom-0'
/** Le cadre de la vidéo, sur lequel se pose le polygone. */
export const MEDIA_HOST_CLASS = 'relative overflow-hidden rounded-md'

/** L'enregistrement d'un clip à la main (`components/RecordButton`, un rond en haut à gauche de la vidéo) : le clip est sauvegardé d'office. */
export const RECORD_FAILED_TEXT = 'Enregistrement impossible'
export const RECORD_STOPPED_TEXT = 'Clip en cours de copie par House Sync…'
export const RECORD_STOPPED_DETAIL = 'Il apparaîtra dès qu’il est prêt.'
export const RECORD_NOTE_CLASS = 'text-[0.8rem] text-muted'

/**
 * Le fondu d'une image sur la précédente suit la vitesse du défilement : une image gardée par minute de frise, donc une toutes les 60 / vitesse secondes ;
 * le fondu en dure `FADE_SHARE` (au moins `FADE_MIN_MS`, au plus `FADE_MAX_MS`) : plus ça va vite, plus il est court.
 */
export const FADE_MIN_MS = 40
export const FADE_MAX_MS = 400
export const FADE_SHARE = 0.8
export const IMAGE_SECONDS = 60
