/** Taille de la pastille d'état, en pixels CSS, **commune à la liste des caméras et au plan** (le plan la dessine dans un canvas avec les mêmes valeurs, le liseré en pixels d image : l icône du plan est à peu près à l échelle 1) : 9 px de diamètre en tout, dont un liseré noir de 1 px. */
export const STATUS_DOT_DIAMETER = 9
export const STATUS_DOT_RING = 1

export const DOT_CLASS = 'inline-block shrink-0 rounded-full border border-black'
export const DOT_STATE_CLASS = { on: 'bg-green', off: 'bg-danger', missing: 'bg-muted' } as const
