/** Trois colonnes dès 1024 px, une seule dessous. Les vignettes ne s'étirent pas : chacune garde sa hauteur. */
export const GRID_CLASS = 'mt-4 grid grid-cols-1 items-start gap-3 lg:grid-cols-3'
/** La même grille quand la caméra de la colonne 2 (l'extérieur) est en portrait : sa colonne fait exactement la largeur de sa vidéo (298 px), donc l'espace entre les caméras est le même (0,75 rem) en horizontal et en vertical ; la colonne 1 a la largeur `--col1` (mesurée, `lib/useStackWidth.ts` ; 399 px tant qu'elle n'est pas mesurée, calculée sur la capture : 2 vidéos de 397 px de large + leur marge ≈ la hauteur du portrait) qui fait que les deux paysage empilés ont la hauteur du portrait. */
export const GRID_PORTRAIT_MIDDLE_CLASS = 'mt-4 grid grid-cols-1 items-start gap-3 lg:grid-cols-[var(--col1,399px)_298px_1fr]'
/** L'ordre des vignettes (sur téléphone, une colonne, de haut en bas) : l'intérieur de la volière, le toit dessous, puis l'extérieur et le salon de jardin ; une caméra qui n'est pas dans la liste vient après, dans l'ordre de l'API. */
export const MOSAIC_ORDER = ['voliere-interieur', 'voliere-toit', 'voliere-exterieur', 'salon-de-jardin']
/** La colonne 1 : l'intérieur de la volière et, collé dessous, le toit (une colonne à part, pour que le toit remonte sous l'intérieur quel que soit le reste de la rangée). */
export const STACK_CAMERAS = ['voliere-interieur', 'voliere-toit']
export const STACK_CLASS = 'flex flex-col gap-3 lg:col-start-1 lg:row-start-1'
/** Où les autres caméras se posent dès 1024 px : l'extérieur à droite de la colonne 1 (colonne 2), le salon de jardin à côté (colonne 3). */
/** La caméra de la colonne 2. */
export const MIDDLE_CAMERA = 'voliere-exterieur'
export const PLACEMENT: Record<string, string> = {
  'voliere-exterieur': 'lg:col-start-2 lg:row-start-1',
  'salon-de-jardin': 'lg:col-start-3 lg:row-start-1',
}
export const TILE_CLASS = 'rounded-md transition-shadow'
/** La vignette d'une caméra en portrait : sa vidéo a une hauteur fixe de 530 px (`--big-h`), donc 298 px de large, pas toute la cellule. */
export const TILE_PORTRAIT_CLASS = '[--big-h:530px] w-[min(100%,calc(var(--big-h)*9/16))]'
