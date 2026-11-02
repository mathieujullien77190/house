/** De 360 à 1024 px, chaque ligne est un bloc (le nom au-dessus de sa valeur) ; dès 1024 px (`lg`), deux colonnes. */
export const WRAP_CLASS =
  'mt-3 grid grid-cols-1 gap-x-6 rounded-xl border border-line bg-card px-4 py-1.5 text-[0.9rem] lg:grid-cols-[max-content_minmax(0,1fr)] lg:gap-y-1.5 lg:py-3'
export const ITEM_CLASS = 'flex min-w-0 flex-col gap-0.5 border-b border-line/60 py-2 last:border-b-0 lg:contents'
export const LABEL_CLASS = 'min-w-0 break-words text-muted'
export const VALUE_CLASS = 'min-w-0 whitespace-pre-line font-medium tabular-nums [overflow-wrap:anywhere]'
