export const IMAGE_REFRESH_MS = 1_000
/**
 * Un clip Frigate peut commencer avant l'événement (pre_capture) et finir après (post_capture), mais seulement si
 * Frigate avait des images à ce moment : l'avance réelle se déduit de la durée de la vidéo, bornée à cette valeur.
 */
export const CLIP_MAX_LEAD_SECONDS = 5
export const IMAGE_CAPTION = 'Dernière image'
export const AT_CAPTION_PREFIX = 'Image à '
export const CLIP_CAPTION_PREFIX = 'Clip · '
export const NO_CLIP_TEXT = 'Pas de clip pour cet événement.'
export const IMAGE_ALT = 'Dernière image de la caméra'
export const NO_IMAGE_TEXT = 'Pas d’image : Frigate n’a pas donné d’adresse.'
export const IMAGE_ERROR_TEXT = 'Image indisponible : ouvrez Frigate (onglet Frigate) et connectez-vous.'
export const LAST_EVENT_PREFIX = 'Dernier événement : '
export const NO_EVENT_TEXT = 'Aucun événement'

export const SECTION_CLASS = 'mt-6'
export const NAME_CLASS = 'm-0 text-[1.15rem] font-semibold'
export const FIGURE_CLASS = 'mt-2 max-w-[720px]'
export const CAPTION_CLASS = 'mb-1 text-[0.85rem] text-muted'
export const IMAGE_CLASS = 'block aspect-video w-full rounded-md border border-line bg-black object-contain'
export const LAST_CLASS = 'my-2'
export const NO_CLIP_CLASS = 'flex aspect-video w-full items-center justify-center rounded-md border border-line bg-black text-[0.85rem] text-muted'
export const WARNING_CLASS = 'my-2 text-[0.85rem] text-danger'
