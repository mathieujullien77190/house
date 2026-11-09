import type { HeatmapStatus } from '@/types'

export interface HeatmapControlsProps {
  on: boolean
  onToggle: () => void
  /** De 1 (peu sensible) à 8 (très sensible). */
  sensitivity: number
  onSensitivity: (sensitivity: number) => void
  /** Ce que l'API a rendu jusqu'ici, ou null avant la première réponse. */
  data: HeatmapStatus | null
  /** La dernière demande a échoué. */
  failed: boolean
}
