/** Dès 1024 px, un tableau quadrillé (qui défile de côté s'il est large) ; en dessous, une fiche par ligne (« colonne : valeur »). */
export const WRAP_CLASS = 'mt-2 lg:overflow-x-auto'
export const TABLE_CLASS = 'w-full border-collapse font-mono text-[0.85rem] max-lg:block'
export const HEAD_GROUP_CLASS = 'max-lg:hidden'
export const BODY_CLASS = 'max-lg:block'
export const HEAD_CELL_CLASS = 'border border-line bg-card px-3 py-1.5 text-left font-semibold text-fg'
export const ROW_CLASS = 'max-lg:mb-2 max-lg:block max-lg:rounded-lg max-lg:border max-lg:border-line max-lg:px-2.5 max-lg:py-1.5'
export const CELL_CLASS =
  'whitespace-nowrap border border-line px-3 py-1.5 align-top max-lg:flex max-lg:gap-3 max-lg:whitespace-normal max-lg:border-0 max-lg:px-0 max-lg:py-0.5 max-lg:before:w-24 max-lg:before:shrink-0 max-lg:before:text-muted max-lg:before:content-[attr(data-label)]'
