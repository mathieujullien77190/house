/** Trois colonnes dès 1024 px : en haut la caméra en paysage (une colonne, réduite), dessous le plan sur deux colonnes et, tout contre lui, la caméra posée de côté (portrait, 300 px). */
export const GRID_CLASS = 'mt-4 grid grid-cols-1 items-start gap-3 lg:grid-cols-3'
/** La colonne de droite : la vignette de la caméra posée de côté (sa hauteur est réglée pour égaler celle de la carte, voir useMatchHeight). */
export const RIGHT_CLASS = 'flex flex-col gap-3 lg:col-start-3 lg:row-start-2'
/** L'ordre des vignettes : la porte d'abord, puis le fond ; une caméra qui n'est pas dans la liste vient après, dans l'ordre de l'API. */
export const MOSAIC_ORDER = ['voliere-interieur', 'voliere-exterieur']
/** La section du plan : cachée sous 1024 px. Son cadre (un carré) entoure tout le dessin. */
export const PLAN_SECTION_CLASS = 'hidden lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:block'
export const PLAN_CLASS = 'mt-2 overflow-hidden border border-line lg:w-[calc((200%_-_3rem)/3_+_0.75rem)] [&>figure]:mt-0'
/** Ni pièces ni cloisons : la maison du plan de la mosaïque n'est qu'un toit gris. */
export const NO_ROOMS: never[] = []
/** La vignette dont la caméra est sélectionnée sur le plan : en surbrillance (un anneau bleu autour). */
export const TILE_CLASS = 'self-start rounded-md transition-shadow'
export const TILE_HIGHLIGHT_CLASS = 'ring-2 ring-accent'
/** L'identifiant de la prise sur le plan (la clé de sa position gardée). */
export const PLUG_ID = 'prise'
/** La vignette d'une caméra en portrait : aussi large que sa vidéo (300 px), pas toute la cellule de la grille. */
export const TILE_PORTRAIT_CLASS = 'w-[min(100%,calc(var(--big-h,530px)*9/16))]'
/** La carte prend toute la largeur de la section (le dessin seul est plus étroit). */
export const MAP_WRAPPER_CLASS = 'min-w-0'
