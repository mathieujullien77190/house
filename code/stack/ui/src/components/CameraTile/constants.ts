export const OPEN_PREFIX = 'Ouvrir la camÃ©ra '

export const TILE_CLASS =
  'relative overflow-hidden rounded-md border border-line bg-card transition-colors duration-150 hover:border-accent'
export const BUTTON_CLASS =
  'absolute inset-0 cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
export const MEDIA_CLASS = 'relative'
export const OVERLAY_CLASS = 'absolute bottom-2 left-2'
export const NAME_CLASS = 'px-3 pb-1.5 pt-2 text-[0.95rem] font-semibold'
export const CAPTION_CLASS = 'px-3 pb-2 text-[0.8rem] text-muted'
export const FOOTER_CLASS = 'flex items-center gap-2 px-3 pb-2 text-[0.8rem] text-muted'
/** Le média de la vignette : coins du haut arrondis, ceux du bas droits. */
export const MEDIA_INNER_CLASS = '[&_div]:rounded-b-none [&_img]:rounded-b-none'
/** Le pied cliquable : au-dessus du bouton qui couvre la vignette, pour ouvrir le clip plutôt que la caméra. */
export const FOOTER_BUTTON_CLASS =
  'relative z-10 flex w-full cursor-pointer items-center gap-2 px-3 pb-2 pt-1 text-left text-[0.8rem] text-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent'
/** La vignette d'une caméra éteinte : la bordure est rouge (y compris au survol). */
export const TILE_ALERT_CLASS =
  'relative overflow-hidden rounded-md border border-danger bg-card transition-colors duration-150 hover:border-danger'
