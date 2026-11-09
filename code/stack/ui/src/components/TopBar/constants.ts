/** Une barre qui reste collée en haut de l'écran quand la page défile, pleine largeur (elle déborde des marges de la page). */
export const BAR_CLASS = 'sticky top-0 z-30 -mx-4 mb-3 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur'
export const ROW_CLASS = 'flex items-center gap-x-4'
export const TITLE_CLASS = 'm-0 text-[1.1rem] font-bold'
export const TITLE_BUTTON_CLASS = 'm-0 cursor-pointer border-0 bg-transparent p-0 text-[length:inherit] font-[inherit] text-fg hover:underline focus-visible:outline-2 focus-visible:outline-accent'
/** Les onglets dans la barre : dès 1024 px seulement. */
export const DESKTOP_TABS_CLASS = 'min-w-0 max-lg:hidden'
export const STATUS_CLASS = 'm-0 min-w-0 flex-1 text-right text-[0.85rem] text-muted max-lg:hidden'
export const ERROR_CLASS = 'm-0 min-w-0 flex-1 text-right text-[0.85rem] text-danger max-lg:hidden'
export const SPACER_CLASS = 'flex-1'
/** L'information de la barre : à sa taille, jamais écrasée ; sur téléphone elle reste avant le bouton sandwich. */
export const INFO_CLASS = 'flex shrink-0 items-center'
export const DESKTOP_ACTIONS_CLASS = 'flex items-center gap-2 max-lg:hidden'
/** Le bouton sandwich, en haut à droite, sur téléphone seulement. */
export const BURGER_CLASS = 'ml-auto flex size-11 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-line bg-bg lg:hidden focus-visible:outline-2 focus-visible:outline-accent'
export const BURGER_LINE_CLASS = 'block h-0.5 w-5 rounded bg-fg transition-transform'
export const BURGER_LINE_TOP_OPEN_CLASS = 'translate-y-2 rotate-45'
export const BURGER_LINE_BOTTOM_OPEN_CLASS = '-translate-y-2 -rotate-45'
export const BURGER_LINE_MIDDLE_OPEN_CLASS = 'opacity-0'
/** Le menu qui s'ouvre sous la barre sur téléphone. */
export const PANEL_CLASS = 'absolute inset-x-0 top-full flex flex-col gap-1 border-b border-line bg-card px-4 py-3 shadow-lg lg:hidden'
export const ITEM_CLASS = 'cursor-pointer rounded-lg border-0 px-3 py-3 text-left text-[1rem] focus-visible:outline-2 focus-visible:outline-accent'
export const ITEM_ACTIVE_CLASS = 'bg-accent/15 font-semibold text-accent'
export const ITEM_IDLE_CLASS = 'bg-transparent text-fg'
export const PANEL_STATUS_CLASS = 'm-0 mt-1 border-t border-line px-3 pt-2 text-[0.85rem] text-muted'
export const PANEL_ERROR_CLASS = 'm-0 mt-1 border-t border-line px-3 pt-2 text-[0.85rem] text-danger'
export const PANEL_ACTIONS_CLASS = 'mt-1 flex flex-wrap gap-2 px-3'
/** Une erreur reste visible sur téléphone, sous le titre. */
export const MOBILE_ERROR_CLASS = 'm-0 mt-1 text-[0.8rem] text-danger lg:hidden'
export const BURGER_LABEL = 'Menu'
