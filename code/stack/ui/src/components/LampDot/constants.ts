/** Le même bloc que les valeurs de `ValueChips` : un fond de la page à demi transparent, pour rester lisible posé sur une image. */
export const CHIP_CLASS = 'inline-flex items-center rounded-md border border-line bg-bg/80 px-2 py-1.5'
/** Le rond, comme l'ampoule du plan des lumières : orange allumée, fond de la page et contour gris éteinte, contour rouge pâle injoignable. */
export const DOT_CLASS = 'block h-3.5 w-3.5 rounded-full border'
export const DOT_ON_CLASS = 'border-fg bg-orange'
export const DOT_OFF_CLASS = 'border-muted bg-bg'
/** L'opacité du rond allumé selon la luminosité : jamais sous ce plancher (une lampe à 1 % reste visible). */
export const BRIGHTNESS_MAX = 254
export const BRIGHTNESS_FLOOR = 0.25
export const DOT_UNREACHABLE_CLASS = 'border-danger/50 bg-bg'
