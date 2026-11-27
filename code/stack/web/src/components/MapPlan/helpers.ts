import { HOUSE_SHIFT } from '@/components/Lights/constants'
import { MAP_HOUSE_HEIGHT } from './constants'

export const METERS_PER_DEGREE = 111320

/** La hauteur de la maison de l'ancien plan des lumières (540 × 300) : la carte l'allonge à `MAP_HOUSE_HEIGHT` pour coller au bâti. */
const OLD_HOUSE_HEIGHT = 300

/** Un point de l'ancien plan des lumières (origine en haut à gauche de la maison) en point du plan de la carte : la maison est poussée de `HOUSE_SHIFT` et allongée. */
export const fromHousePlan = (x: number, y: number): { x: number; y: number } => ({
  x: x + HOUSE_SHIFT,
  y: (y * MAP_HOUSE_HEIGHT) / OLD_HOUSE_HEIGHT,
})
