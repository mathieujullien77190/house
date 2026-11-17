import type { SliceTone } from '../PieChart'

export interface ChartPoint {
  /** L'abscisse (secondes depuis 1970). */
  x: number
  /** La valeur. */
  y: number
}

export interface ChartSeries {
  id: string
  label: string
  tone: SliceTone
  /** Les points, du plus ancien au plus récent. */
  points: ChartPoint[]
}

export interface MultiLineChartProps {
  series: ChartSeries[]
  /** L'unité des repères de l'échelle verticale (« °C »). */
  unit?: string
  /** Un texte pour les lecteurs d'écran. */
  label: string
  /** Le repère du bord gauche et du bord droit. */
  startLabel?: string
  endLabel?: string
  /** Affiché quand aucune série n'a deux points. */
  emptyText: string
}
