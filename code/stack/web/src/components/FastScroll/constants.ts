export const SLOWER_LABEL = 'Plus lent, ou en arrière'
export const FASTER_LABEL = 'Plus vite, ou en avant'
/**
 * Les vitesses du curseur, en fois le temps réel : 1 est normal, 60 une minute de frise par seconde ; négatif : en arrière.
 * `◀` descend d'un cran dans la liste, `▶` monte d'un cran.
 */
export const RATES = [-600, -300, -120, -60, -30, -10, -5, -2, -1, 1, 2, 5, 10, 30, 60, 120, 300, 600]
/** Le rang de ×1 (temps réel, en avant). */
export const NORMAL_RATE = 9
export const BOX_CLASS = 'flex items-center gap-1'
export const RATE_TEXT_CLASS = 'min-w-12 text-center text-xs tabular-nums text-neutral-300'
