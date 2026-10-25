/**
 * Un clip commence `preSeconds` avant l'événement et finit `postSeconds` après, mais seulement si
 * l'enregistrement avait des segments à ce moment : l'avance réelle se déduit de la durée de la vidéo, bornée à cette valeur.
 */
export const CLIP_MAX_LEAD_SECONDS = 5
export const CAMERA_TITLE_PREFIX = 'Caméra : '
export const LIVE_CAPTION = 'Direct'
export const AT_CAPTION_PREFIX = 'Image à '
export const CLIP_CAPTION_PREFIX = 'Clip · '
export const NO_IMAGE_TEXT = 'Direct indisponible : go2rtc ne répond pas.'
export const CAMERA_OFF_TEXT = 'Caméra éteinte'
export const CAMERA_STARTING_TEXT = 'Caméra en démarrage…'
export const NO_CLIP_TEXT = 'Clip en cours de copie par House Sync… il apparaîtra dès qu’il est prêt.'
export const ONGOING_CLIP_TEXT = 'Événement en cours : le clip arrivera à la fin du mouvement.'
