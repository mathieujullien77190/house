export const EMPTY_TEXT = 'vide'
export const EXPAND_ARIA = 'Déplier'
export const MORE_TEXT = 'Voir le détail'
export const LESS_TEXT = 'Masquer le détail'
export const COLLAPSE_ARIA = 'Replier'

export const CARD_CLASS = 'mt-3 rounded-xl border border-line bg-card px-3.5 py-3'
export const HEAD_CLASS = 'flex flex-wrap items-baseline gap-x-3 gap-y-1'
export const TOGGLE_CLASS = 'flex cursor-pointer items-baseline gap-2 border-0 bg-transparent p-0 text-left text-fg'
export const CHEVRON_CLASS = 'inline-block w-3 text-[0.75rem] text-muted transition-transform'
export const CHEVRON_OPEN_CLASS = 'rotate-90'
export const TITLE_CLASS = 'm-0 font-mono text-[0.95rem] font-semibold text-orange'
export const DETAIL_CLASS = 'text-[0.8rem] text-muted'
export const DESCRIPTION_CLASS = 'mt-1 mb-2 text-[0.85rem] text-muted'
/** Dès 1024 px, un tableau (qui défile de côté s'il est large) ; en dessous, une fiche par ligne (« nom : valeur »). */
export const WRAP_CLASS = 'lg:overflow-x-auto'
export const TABLE_CLASS = 'w-full border-collapse font-mono text-[0.78rem] max-lg:block'
export const HEAD_GROUP_CLASS = 'max-lg:hidden'
export const BODY_CLASS = 'max-lg:block'
export const HEAD_CELL_CLASS = 'border-b-2 border-line px-2 py-1.5 text-left font-semibold text-muted'
export const CELL_CLASS =
  'border-b border-line px-2 py-1.5 align-top break-words max-lg:flex max-lg:gap-3 max-lg:border-b-0 max-lg:px-0 max-lg:py-0.5 max-lg:before:w-28 max-lg:before:shrink-0 max-lg:before:break-all max-lg:before:text-muted max-lg:before:content-[attr(data-label)]'
export const VALUE_CLASS = 'flex min-w-0 flex-wrap items-baseline gap-x-2 [overflow-wrap:anywhere]'
export const ROW_CLASS = 'even:bg-accent/5 max-lg:mb-2 max-lg:block max-lg:rounded-lg max-lg:border max-lg:border-line max-lg:px-2.5 max-lg:py-1.5'
export const EMPTY_CLASS = 'text-[0.85rem] text-muted'
/** Une ligne qui se déplie au clic. */
export const ROW_CLICK_CLASS = 'cursor-pointer hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-accent'
export const ROW_OPEN_CLASS = 'bg-accent/10 max-lg:mb-0! max-lg:rounded-b-none! max-lg:border-accent! max-lg:border-b-0!'
export const DETAIL_ROW_CLASS = 'bg-accent/5 max-lg:mb-2 max-lg:block max-lg:rounded-t-none max-lg:rounded-b-lg max-lg:border max-lg:border-t-0 max-lg:border-accent'
export const DETAIL_CELL_CLASS = 'border-b border-line px-2 py-2 max-lg:block max-lg:border-b-0 max-lg:px-2.5'
/** Les filtres, sous la description. */
export const FILTERS_CLASS = 'mb-1'
/** Sur téléphone, une ligne qui se déplie le dit : un pied de fiche « Voir le détail ▾ » (caché dès 1024 px, où le curseur et le survol suffisent). */
export const HINT_CELL_CLASS = 'mt-1 block border-t border-line pt-1.5 text-[0.8rem] font-semibold text-accent lg:hidden'
export const HINT_ARROW = ['▾', '▴']
