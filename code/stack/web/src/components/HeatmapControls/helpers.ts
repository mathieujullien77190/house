import type { HeatmapStatus } from '@/types'
import { EMPTY_TEXT, FAILED_TEXT, MAX_SENSITIVITY, WAITING_TEXT } from './constants'

/** Le texte à côté du curseur : l'avancement du calcul tant qu'il tourne, sinon rien (la carte se suffit) ou ce qui manque. */
export const statusText = (data: HeatmapStatus | null, failed: boolean): string => {
  if (failed) return FAILED_TEXT
  if (data === null) return WAITING_TEXT
  if (data.computing) return data.total > 0 ? `Calcul ${Math.round((100 * data.done) / data.total)} %` : WAITING_TEXT
  return data.pairs === 0 ? EMPTY_TEXT : ''
}

/** Le seuil montré pour une sensibilité : plus elle est grande, plus le seuil est bas (le rang 0 est le seuil le plus fin). */
export const levelOf = (sensitivity: number, levels: number): number => Math.min(levels - 1, Math.max(0, MAX_SENSITIVITY - sensitivity))
