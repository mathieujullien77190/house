export const SECTION_CLASS = 'mt-6'
export const HEAD_CLASS = 'flex flex-wrap items-center gap-x-4 gap-y-1'
export const NAME_CLASS = 'm-0 text-[1.15rem] font-semibold'
export const FIGURE_CLASS = 'mt-2 max-w-[720px]'
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
  'fixed inset-0 z-50 m-0 flex max-w-none items-center justify-center bg-black p-0 [--big-h:100dvh] [--big-w:100dvw] portrait:inset-auto portrait:top-0 portrait:left-0 portrait:h-[100dvw] portrait:w-[100dvh] portrait:origin-top-left portrait:translate-x-[100dvw] portrait:rotate-90 portrait:[--big-h:100dvw] portrait:[--big-w:100dvh]'
/** Le plus grand cadre 16/9 qui tient dans l'écran. */
export const BIG_MEDIA_CLASS = 'w-[min(var(--big-w),calc(var(--big-h)*16/9))]'
export const COLLAPSE_CLASS = 'absolute top-3 right-3 z-10 cursor-pointer rounded-lg border border-white/30 bg-black/60 px-3 py-2 text-[0.9rem] text-white focus-visible:outline-2 focus-visible:outline-accent'
