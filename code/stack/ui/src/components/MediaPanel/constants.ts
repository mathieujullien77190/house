export const CLOSE_LABEL = 'Fermer'
export const IMAGE_ALT = 'Image'

/** Le panneau reste en haut de la page, sous la barre de navigation (top-16), pendant qu'on fait défiler ; il ne déplace pas ce qui est dessous. */
export const PANEL_CLASS = 'sticky top-16 z-10 mt-3 rounded-xl border border-accent bg-card p-3 shadow-lg'
export const HEAD_CLASS = 'mb-2 flex items-center justify-between gap-3'
export const TITLE_CLASS = 'font-mono text-[0.8rem] text-muted break-all'
export const MEDIA_CLASS = 'block aspect-video w-full max-w-[720px] rounded-md bg-black object-contain'
/** Le cadre d'un média tourné : un rectangle portrait ; le média, aussi grand que le cadre est haut, y est tourné d'un quart de tour horaire. */
export const ROTATED_FRAME_CLASS = 'relative aspect-[9/16] w-full max-w-[405px] overflow-hidden rounded-md bg-black [container-type:size]'
export const ROTATED_MEDIA_CLASS = 'absolute left-1/2 top-1/2 h-[100cqw] w-[100cqh] max-w-none -translate-x-1/2 -translate-y-1/2 rotate-90 object-contain'
/** Les commandes d'une vidéo tournée, droites, sous le cadre (les commandes natives tourneraient avec la vidéo) : lecture ou pause et barre de temps. */
export const BAR_CLASS = 'mt-2 flex w-full max-w-[405px] items-center gap-2'
export const PLAY_BUTTON_CLASS =
  'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-line bg-card text-[0.75rem] leading-none text-fg hover:border-accent focus-visible:outline-2 focus-visible:outline-accent'
export const SEEK_CLASS = 'h-3 min-w-0 flex-1 cursor-pointer accent-accent'
export const PLAY_LABEL = 'Lecture'
export const PAUSE_LABEL = 'Pause'
export const PLAY_ICON = '▶'
export const PAUSE_ICON = '❚❚'
export const SEEK_LABEL = 'Position dans le clip'
