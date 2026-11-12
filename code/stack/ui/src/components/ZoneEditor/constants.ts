/** Le nombre de sommets au-delà duquel on n'en ajoute plus, et en dessous duquel on n'en retire plus. */
export const MIN_POINTS = 3
export const MAX_POINTS = 1000

export const VERTEX_LABEL = 'Sommet de la zone (glisser pour déplacer, double clic pour retirer)'
export const EDGE_LABEL = 'Milieu d’un côté (glisser pour ajouter un sommet)'

/** Posé sur toute la vidéo ; `touch-none` pour que le glisser au doigt ne fasse pas défiler la page. */
export const LAYER_CLASS = 'absolute inset-0 z-10 touch-none select-none'
export const SVG_CLASS = 'pointer-events-none absolute inset-0 h-full w-full'
/** Ce qui est hors de la zone : assombri. */
export const OUTSIDE_CLASS = 'fill-black/50'
export const OUTLINE_CLASS = 'fill-none stroke-accent stroke-2'
export const VERTEX_CLASS =
  'absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-accent shadow active:cursor-grabbing'
export const EDGE_CLASS =
  'absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 cursor-copy rounded-full border border-accent bg-white/80 hover:bg-white'
