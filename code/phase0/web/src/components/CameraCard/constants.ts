/**
 * Un clip Frigate peut commencer avant l'événement (pre_capture) et finir après (post_capture), mais seulement si
 * Frigate avait des images à ce moment : l'avance réelle se déduit de la durée de la vidéo, bornée à cette valeur.
 */
export const CLIP_MAX_LEAD_SECONDS = 5
export const LIVE_CAPTION = 'Direct'
export const AT_CAPTION_PREFIX = 'Image à '
export const CLIP_CAPTION_PREFIX = 'Clip · '
export const NO_IMAGE_TEXT = 'Direct indisponible : go2rtc ne répond pas.'
export const NO_CLIP_TEXT = 'Clip pas encore copié : House Sync réessaie.'
export const ONGOING_CLIP_TEXT = 'Événement en cours : le clip arrivera à la fin. En attendant, la dernière image.'
export const LAST_EVENT_PREFIX = 'Dernier événement : '
export const NO_EVENT_TEXT = 'Aucun événement'
