/** Trois colonnes dès 1024 px, une seule dessous. Les vignettes ne s'étirent pas : chacune garde sa hauteur. */
export const GRID_CLASS = 'mt-4 grid grid-cols-1 items-start gap-3 lg:grid-cols-3 lg:auto-cols-fr'
/** La même grille quand la caméra de la colonne 2 (l'extérieur) est en portrait : sa colonne fait exactement la largeur de sa vidéo (298 px), donc l'espace entre les caméras est le même (0,75 rem) en horizontal et en vertical ; **les colonnes 1 et 3 ont la même largeur `--col1`**, donc toutes les vignettes en paysage ont la même taille et deux paysage empilés (colonne 1 ou colonne 3) font la hauteur du portrait ; la colonne 1 a la largeur `--col1` (mesurée, `lib/useStackWidth.ts` ; 399 px tant qu'elle n'est pas mesurée, calculée sur la capture : 2 vidéos de 397 px de large + leur marge ≈ la hauteur du portrait) qui fait que les deux paysage empilés ont la hauteur du portrait. */
export const GRID_PORTRAIT_MIDDLE_CLASS = 'mt-4 grid grid-cols-1 items-start gap-3 lg:grid-cols-[var(--col1,399px)_298px_var(--col1,399px)] lg:auto-cols-[var(--col1,399px)]'
/** L'ordre des vignettes (sur téléphone, une colonne, de haut en bas) : l'intérieur de la volière, le toit dessous, puis l'extérieur et le salon de jardin ; une caméra qui n'est pas dans la liste vient après, dans l'ordre de l'API. */
export const MOSAIC_ORDER = ['voliere-interieur', 'voliere-toit', 'voliere-exterieur', 'salon-de-jardin', 'potager', 'pommier-inverse', 'portail', 'pommier']
/** La colonne 1 : l'intérieur de la volière et, collé dessous, le toit (une colonne à part, pour que le toit remonte sous l'intérieur quel que soit le reste de la rangée). */
export const STACK_CAMERAS = ['voliere-interieur', 'voliere-toit']
export const STACK_CLASS = 'flex flex-col gap-3 lg:col-start-1 lg:row-start-1'
/** La colonne 3 : le salon de jardin et, collé dessous, le potager. */
export const RIGHT_STACK_CAMERAS = ['salon-de-jardin', 'potager']
export const RIGHT_STACK_CLASS = 'flex flex-col gap-3 lg:col-start-3 lg:row-start-1'
/** Où les autres caméras se posent dès 1024 px : l'extérieur à droite de la colonne 1 (colonne 2) ; le salon de jardin et le potager sont empilés dans la colonne 3. */
/** La caméra de la colonne 2. */
export const MIDDLE_CAMERA = 'voliere-exterieur'
export const PLACEMENT: Record<string, string> = {
  'voliere-exterieur': 'lg:col-start-2 lg:row-start-1',
  'pommier-inverse': 'lg:col-start-1 lg:row-start-2',
  portail: 'lg:col-start-2 lg:row-start-2',
  pommier: 'lg:col-start-3 lg:row-start-2',
}
/** Les caméras prévues, pas encore branchées : l'API ne les liste pas tant que House Sync ne les connaît pas, la mosaïque montre alors un cadre noir. */
export const PLANNED_CAMERAS = ['potager', 'pommier-inverse', 'pommier', 'portail']
/** Le message du cadre noir d'une caméra prévue qui n'a pas encore de flux. */
export const PLANNED_TEXT = 'Pas encore de flux'
/** Le cadre noir d'une caméra prévue : un 16/9 plein, comme la vidéo d'une vraie vignette en paysage, pour que sa carte ait la même hauteur que les autres (pommier-inverse, portail, pommier ont la même). */
export const PLANNED_MEDIA_CLASS = 'flex aspect-video w-full items-center justify-center bg-black text-[0.85rem] text-white/70'
/** Le pied d'une vignette prévue : le même qu'une caméra sans événement, pour que sa hauteur soit celle des autres vignettes. */
/** Le portail est sous l'extérieur (colonne 2, 298 px de large, faite pour un portrait) : sa vidéo n'est pas en 16/9 mais a la hauteur de celle d'une vignette de la colonne 1 (`--col1`, moins les 2 px de bordure, en 16/9), donc sa carte a la hauteur du pommier-inverse ; le noir comble le reste. */
export const PLANNED_FILL_CAMERAS = ['portail']
export const PLANNED_MEDIA_FILL_CLASS =
  'flex aspect-video w-full items-center justify-center bg-black text-[0.85rem] text-white/70 lg:aspect-auto lg:h-[calc((var(--col1,399px)-2px)*9/16)]'
export const PLANNED_FOOTER = 'Aucun événement'
/** Le pied d'une vignette prévue a la hauteur de celui d'une vignette avec un événement (pied cliquable : 0,25 rem en haut, ligne de 1,3 rem à cause du badge « Non lu »), sinon elle est 5 px plus basse que les autres. */
export const PLANNED_FOOTER_CLASS = 'min-h-[calc(1.3rem+0.25rem)] pt-1'
export const TILE_CLASS = 'rounded-md transition-shadow'
/** La vignette d'une caméra en portrait : sa vidéo a une hauteur fixe de 530 px (`--big-h`), donc 298 px de large, pas toute la cellule. Toutes les cartes en portrait ont **la même hauteur** : la vidéo, le nom, la légende éventuelle (éteinte, démarrage) et le pied (`min-h`), et la carte remplit sa cellule (`[&>*]:h-full`). */
export const TILE_PORTRAIT_CLASS = '[--big-h:530px] w-[min(100%,calc(var(--big-h)*9/16))]'
