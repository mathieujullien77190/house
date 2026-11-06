export const SECTION_CLASS = 'mt-6'
export const HEAD_CLASS = 'flex flex-wrap items-center gap-x-4 gap-y-1'
export const NAME_CLASS = 'm-0 text-[1.15rem] font-semibold'
export const FIGURE_CLASS = 'relative mt-2 max-w-[720px]'
export const CAPTION_CLASS = 'mb-1 text-[0.85rem] text-muted'
export const WARNING_CLASS = 'my-2 text-[0.85rem] text-danger'

export const EXPAND_LABEL = '⛶ Afficher en grand'
export const COLLAPSE_LABEL = '✕ Réduire'

export const CAPTION_ROW_CLASS = 'flex flex-wrap items-center justify-between gap-2'
export const EXPAND_CLASS = 'cursor-pointer rounded-md border border-line bg-bg px-2.5 py-1 text-[0.85rem] text-fg hover:border-accent focus-visible:outline-2 focus-visible:outline-accent'
/**
 * Plein écran : tout l'écran, fond noir. Si l'écran reste en portrait (verrouillage du paysage refusé, iPhone), la
 * vue est posée à plat : largeur et hauteur échangées, tournée d'un quart de tour. `--big-w` et `--big-h` donnent la
 * place réelle au média.
 */
export const EXPANDED_CLASS =
  'fixed inset-0 z-50 m-0 flex overflow-hidden max-w-none items-center justify-center bg-black p-0 [--big-h:100dvh] [--big-w:100dvw] portrait:inset-auto portrait:top-0 portrait:left-0 portrait:h-[100dvw] portrait:w-[100dvh] portrait:origin-top-left portrait:translate-x-[100dvw] portrait:rotate-90 portrait:[--big-h:100dvw] portrait:[--big-w:100dvh]'
/** Le plus grand cadre 16/9 qui tient dans l'écran. */
export const BIG_MEDIA_CLASS = 'w-[min(var(--big-w),calc(var(--big-h)*16/9))]'
/** La zone du média en grand reçoit les gestes : le navigateur ne doit ni défiler ni zoomer la page à sa place. */
export const ZOOM_AREA_CLASS = 'touch-none select-none'
export const COLLAPSE_CLASS = 'absolute top-3 right-3 z-10 cursor-pointer rounded-lg border border-white/30 bg-black/60 px-3 py-2 text-[0.9rem] text-white focus-visible:outline-2 focus-visible:outline-accent'

/**
 * L'écran du téléphone (sous 1024 px, vue d'une caméra) : un écran fixe sans défilement, la vidéo sur le tiers du haut,
 * la frise sur les deux tiers du bas. Les commandes sont posées sur la vidéo ; le bouton retour est fixe en haut à gauche.
 * Le média est le plus grand cadre 16/9 qui tient dans le tiers de l'écran.
 */
export const SCREEN_CLASS = 'fixed inset-0 z-40 flex flex-col bg-bg'
export const SCREEN_VIDEO_CLASS = 'relative m-0 flex h-[33.333dvh] shrink-0 items-center justify-center overflow-hidden bg-black'
export const SCREEN_MEDIA_CLASS = 'w-[min(100%,calc(33.333dvh*16/9))]'
export const SCREEN_TIMELINE_CLASS = 'min-h-0 flex-1 overflow-hidden px-3 pb-3'
export const BACK_CLASS = 'fixed left-2 top-2 z-50 cursor-pointer rounded-lg border border-line bg-bg/80 px-3 py-2 text-[0.9rem] text-fg focus-visible:outline-2 focus-visible:outline-accent'
/** Le bouton retour n'est qu'une flèche ; le nom de la caméra reste son étiquette pour les lecteurs d'écran. */
export const BACK_ARROW = '←'
/** En haut à droite de la vidéo : qualité du direct ou du clip, alimentation. */
export const OVERLAY_TOP_CLASS = 'absolute right-2 top-2 z-10 flex flex-col items-end gap-1'
/** En bas à gauche : les mesures (température), des blocs qui ont chacun leur fond. */
export const OVERLAY_DETAILS_CLASS = 'absolute bottom-2 left-2 z-10'
/** En bas à droite : « Afficher en grand ». */
export const SCREEN_EXPAND_CLASS = 'absolute bottom-2 right-2 z-10 cursor-pointer rounded-md border border-line bg-bg/80 px-2.5 py-1 text-[1rem] text-fg focus-visible:outline-2 focus-visible:outline-accent'
export const SCREEN_EXPAND_ICON = '⛶'
export const SCREEN_WARNING_CLASS = 'absolute inset-x-2 bottom-10 z-10 rounded-md bg-bg/80 px-2 py-1 text-center text-[0.8rem] text-danger'
