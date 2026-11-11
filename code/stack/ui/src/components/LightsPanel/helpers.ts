import { COUNT_SUFFIX } from './constants'
import type { LightsRoom } from './types'

/** La puissance max du pont : « allumer » envoie toujours cette luminosité. */
export const MAX_BRI = 254

/** La luminosité du pont (1 à 254) en pourcentage (1 à 100). */
export const percentOf = (bri: number): number => Math.max(1, Math.round((bri / MAX_BRI) * 100))

/** Un pourcentage (1 à 100) en luminosité du pont (1 à 254). */
export const briOf = (percent: number): number => Math.min(MAX_BRI, Math.max(1, Math.round((percent / 100) * MAX_BRI)))

/** « 2/7 allumée(s) » à côté du titre d'une pièce. */
export const countText = (room: LightsRoom): string => `${room.lights.filter((light) => light.on).length}/${room.lights.length}${COUNT_SUFFIX}`

/** La part de la couleur orange d'un bloc de lampe allumée selon sa luminosité (en %, de 1 à 100) : de 25 % (presque blanc) à 100 % ; le reste est le fond. Plus la lampe est basse, plus le jaune s'éclaircit. */
export const orangeShare = (percent: number): number => 25 + (75 * Math.min(100, Math.max(0, percent))) / 100

/** Le dessin de la petite ampoule (viewBox 24 × 24) : le verre rond et le culot. */
export const BULB_PATH = 'M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.7A7 7 0 0 0 12 2z'
