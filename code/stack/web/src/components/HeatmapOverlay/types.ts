import type { HeatmapStatus } from '@/types'

export interface HeatmapOverlayProps {
  /** Ce que l'API a calculé jusqu'ici. */
  data: HeatmapStatus
  /** Le seuil de changement montré : son rang dans `data.levels` (0 : le plus fin). */
  level: number
}
