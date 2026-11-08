export const GRID_CLASS = 'mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3'
/** L'ordre des vignettes : la porte d'abord, puis le fond ; une caméra qui n'est pas dans la liste vient après, dans l'ordre de l'API. */
export const MOSAIC_ORDER = ['voliere-interieur', 'voliere-exterieur']
/** Les titres des deux sections de la vue : les caméras, puis le plan (bureau seulement). */
export const CAMERAS_TITLE = 'Caméra'
export const PLAN_TITLE_TEXT = 'Plan'
/** La section du plan : cachée sous 1024 px. Son cadre (un carré) entoure tout le dessin. */
export const PLAN_SECTION_CLASS = 'hidden lg:block'
export const PLAN_CLASS = 'mt-2 overflow-hidden border border-line lg:w-[calc((200%_-_3rem)/3_+_0.75rem)] [&>figure]:mt-0'
export const noop = (): void => {}
/** Ni pièces ni cloisons : la maison du plan de la mosaïque n'est qu'un toit gris. */
export const NO_ROOMS: never[] = []
/** La vignette dont la caméra est sélectionnée sur le plan : en surbrillance (un anneau bleu autour). */
export const TILE_CLASS = 'rounded-md transition-shadow'
export const TILE_HIGHLIGHT_CLASS = 'ring-2 ring-accent'
/** L'identifiant de la prise sur le plan (la clé de sa position gardée). */
export const PLUG_ID = 'prise'
