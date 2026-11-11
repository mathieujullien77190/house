export const LOADING_TEXT = 'Chargement des clips sauvegardés…'
export const LOAD_ERROR_TEXT = 'Les clips sauvegardés n’ont pas pu être lus.'
export const EMPTY_TEXT = 'Aucun clip sauvegardé : ouvre un clip dans une caméra et choisis « Sauvegardé » pour le garder pour toujours.'
export const BACK_LABEL = '← Clips sauvegardés'
export const TITLE_TEXT = 'Clips sauvegardés'
export const ACTIONS_CLASS = 'flex flex-wrap items-center gap-2'
export const OPENED_CAPTION_CLASS = 'mb-0 mt-6'
export const GRID_CLASS = 'mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3'
export const SECTION_CLASS = 'mt-4'
export const THUMB_CLASS = 'aspect-video w-full bg-black object-cover'
export const PLAYER_WRAP_CLASS = 'relative mt-3'
/** Une vignette et sa note : le repère de l'emoji, posé sur la vignette. */
export const ITEM_CLASS = 'relative'
/** L'emoji du clip : en haut à droite du clip, au-dessus du bouton qui couvre la vignette. */
export const EMOJI_SLOT_CLASS = 'absolute right-2 top-2 z-20'
/** Sauvegardé ou non : le même interrupteur que dans le détail d'une caméra. Libéré, le clip reste ouvert ; il quitte la liste au retour. */
export const SAVE_LABEL = 'Sauvegarder le clip (jamais effacé)'
export const SAVE_FAILED_TEXT = 'Le clip n’a pas pu être libéré.'
export const SAVE_FAILED_CLASS = 'text-[0.8rem] text-danger'
export const SAVE_OPTIONS = [
  { id: 'no', label: 'Non sauvegardé' },
  { id: 'yes', label: 'Sauvegardé' },
] as const
/**
 * La vignette d'un clip d'une caméra posée de côté : même cadre 16/9 que les autres (la taille ne change pas), la vidéo y est tournée d'un quart de tour horaire et tient dans la hauteur du cadre
 * (sa largeur avant rotation est la hauteur du cadre : `cqh`).
 */
export const THUMB_BOX_CLASS = 'relative aspect-video w-full overflow-hidden bg-black [container-type:size]'
export const THUMB_TURNED_CLASS =
  'absolute left-1/2 top-1/2 aspect-video w-[100cqh] max-w-none -translate-x-1/2 -translate-y-1/2 rotate-90 bg-black object-cover'
