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
