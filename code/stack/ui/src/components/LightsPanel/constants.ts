export const TURN_OFF_LABEL = 'Éteindre'
export const TURN_ON_LABEL = 'Allumer'
export const BUSY_LABEL = '…'
export const UNREACHABLE_TEXT = 'injoignable'
export const BRIGHTNESS_LABEL = 'Luminosité'
export const ALL_ON_LABEL = 'Tout allumer'
export const ALL_OFF_LABEL = 'Tout éteindre'
/** La clé de « busy » quand « Tout allumer » ou « Tout éteindre » travaille. */
export const ALL_KEY = 'all'
export const COUNT_SUFFIX = ' allumée(s)'

export const LIST_CLASS = 'mt-3 flex flex-col gap-2'
/** Le cadre autour d'un groupe de lampes. */
export const GROUP_CLASS = 'rounded-lg border border-line bg-card px-3 pb-2'
/** Un trait entre le nom du groupe et ses lampes. */
export const LAMPS_CLASS = 'mt-1 border-t border-line'
/** Un mouvement détecté : une pastille pleine ; calme : du texte discret. */
export const MOTION_ON_CLASS = 'rounded-md bg-orange px-2 py-0.5 text-[0.85rem] font-semibold text-bg'
export const MOTION_OFF_CLASS = 'text-[0.85rem] text-muted'
export const ROW_CLASS = 'flex flex-wrap items-center gap-x-3 gap-y-2 py-2 lg:gap-x-4'
/** Le nom d'une lampe : une colonne de largeur fixe (sur grand écran) pour que le bouton et le curseur soient alignés d'une ligne à l'autre. */
export const NAME_CLASS = 'w-full lg:w-56 lg:shrink-0'
/** Le bouton a toujours la même largeur, quel que soit son texte (Allumer, Éteindre, …). */
export const BUTTON_CLASS = 'w-24 text-center'
/** « Tout allumer » et « Tout éteindre » : en haut de la liste, côte à côte. */
export const ALL_ROW_CLASS = 'flex flex-wrap gap-2'
export const ALL_BUTTON_CLASS = 'w-36 text-center'
export const MUTED_CLASS = 'text-[0.85rem] text-muted'
export const SLIDER_CLASS = 'w-full basis-full accent-accent lg:w-48 lg:basis-auto'
export const PERCENT_CLASS = 'w-10 text-right text-[0.85rem] tabular-nums text-muted'
