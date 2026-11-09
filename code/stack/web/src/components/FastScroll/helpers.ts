import { RATES } from './constants'

/** La vitesse (fois le temps réel, négative en arrière) d'un rang de `RATES` ; hors liste, le temps réel. */
export const speedOf = (rate: number): number => RATES[rate] ?? 1
