export const CANVAS_CLASS = 'pointer-events-none absolute inset-0 h-full w-full'

/**
 * Les couleurs de la carte, du plus calme au plus agité : pas de couleur, bleu, vert, jaune, rouge. Chaque arrêt : la valeur (0 à 1) et sa couleur (rouge, vert, bleu, opacité 0 à 255).
 * L'opacité monte avec la valeur : les endroits où rien ne bouge laissent voir la vidéo.
 */
export const COLOR_STOPS: [number, [number, number, number, number]][] = [
  [0, [0, 60, 255, 0]],
  [0.25, [0, 90, 255, 90]],
  [0.5, [0, 220, 120, 140]],
  [0.75, [255, 220, 0, 175]],
  [1, [255, 40, 0, 205]],
]

/** La couleur est réglée sur ce rang des valeurs non nulles (0,99 : le 99ᵉ centile) : une case isolée très agitée ne ternit pas toute la carte. */
export const SCALE_PERCENTILE = 0.99
/** L'échelle est écrasée par une racine (exposant < 1) : les endroits peu agités se voient aussi. */
export const GAMMA = 0.6
