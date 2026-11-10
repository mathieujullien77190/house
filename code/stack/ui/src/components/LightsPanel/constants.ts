export const ON_LABEL = 'ON'
export const OFF_LABEL = 'OFF'
export const BUSY_LABEL = '…'
export const UNREACHABLE_TEXT = 'injoignable'
export const BRIGHTNESS_LABEL = 'Luminosité'
export const ALL_ON_LABEL = 'Tout allumer'
export const ALL_OFF_LABEL = 'Tout éteindre'
/** La clé de « busy » quand « Tout allumer » ou « Tout éteindre » travaille. */
export const ALL_KEY = 'all'
export const COUNT_SUFFIX = ' allumée(s)'

export const LIST_CLASS = 'mt-3 flex flex-col gap-2'
/** Le rectangle d'une zone. */
export const GROUP_CLASS = 'rounded-lg border border-line bg-card px-3 pb-3'
/** Les deux petits boutons ON / OFF de la zone, sur la ligne de son nom. */
export const ZONE_BUTTON_CLASS = 'w-14 px-2 py-1 text-center'
/** La grille des cases : 3 par ligne sur téléphone, 4 dès `sm:`, 6 dès `lg:`. */
export const GRID_CLASS = 'mt-2 grid grid-cols-3 gap-2 border-t border-line pt-3 sm:grid-cols-4 lg:grid-cols-6'
/** Une case : la lampe et, dessous, ce que le parent ajoute (lampExtra) pour une lampe sans curseur. */
export const TILE_CLASS = 'flex min-w-0 flex-col gap-1'
/** Le bloc d'une lampe : le cadre (bordure arrondie, fond ON / OFF) qui contient le bouton et le curseur de luminosité. */
export const TILE_BOX_CLASS = 'relative flex w-full min-w-0 flex-col gap-0.5 rounded-lg border px-2 pt-2 pb-1 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent'
/** Le bouton d'une case, sans cadre (c'est celui du bloc) : nom court (tronqué) puis ON / OFF. */
export const TILE_BUTTON_CLASS =
  'flex w-full min-w-0 cursor-pointer flex-col items-start gap-0.5 pr-9 text-left disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none'
/** Le bloc d'une lampe est neutre, allumée ou non : c'est la petite ampoule qui dit l'état. */
export const TILE_OFF_CLASS = 'border-line bg-bg text-fg hover:border-accent'
/** La petite ampoule, en haut à droite du bloc. */
export const TILE_BULB_CLASS = 'pointer-events-none absolute right-1.5 top-1.5 h-8 w-8'
/** Le curseur de luminosité dans le bloc de la lampe : fin, de la largeur du bloc. */
export const TILE_SLIDER_CLASS = 'h-3 w-full accent-accent'
export const TILE_NAME_CLASS = 'w-full truncate text-[0.85rem]'
export const TILE_STATE_CLASS = 'text-[0.8rem] font-semibold'
/** Les lampes à curseur : une ligne pleine largeur sous la grille. */
/** Un trait entre les cases et les détecteurs. */
export const SENSORS_CLASS = 'mt-2 border-t border-line'
/** Un mouvement détecté : une pastille pleine ; calme : du texte discret. */
export const MOTION_ON_CLASS = 'rounded-md bg-orange px-2 py-0.5 text-[0.85rem] font-semibold text-bg'
export const MOTION_OFF_CLASS = 'text-[0.85rem] text-muted'
export const ROW_CLASS = 'flex flex-wrap items-center gap-x-3 gap-y-2 py-2 lg:gap-x-4'
/** Le nom d'une lampe à curseur ou d'un détecteur : une colonne de largeur fixe (sur grand écran). */
export const NAME_CLASS = 'w-full lg:w-56 lg:shrink-0'
/** « Tout allumer » et « Tout éteindre » : en haut de la liste, côte à côte. */
export const ALL_ROW_CLASS = 'flex flex-wrap gap-2'
export const ALL_BUTTON_CLASS = 'w-36 text-center'
export const MUTED_CLASS = 'text-[0.85rem] text-muted'
