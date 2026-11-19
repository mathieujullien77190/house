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
  /** Des bâtons à la place de la courbe : un trait vertical du bas du graphique jusqu'à la valeur de chaque point. */
  bars?: boolean
}

export interface MultiLineChartProps {
  series: ChartSeries[]
  /** L'unité des repères de l'échelle verticale (« °C »). */
  unit?: string
  /** Un texte pour les lecteurs d'écran. */
  label: string
  /** Les bornes de l'échelle horizontale (secondes) ; par défaut, celles des points. */
  domain?: { from: number; to: number }
  /** Des repères répartis à égale distance sous l'échelle horizontale (du plus ancien au plus récent) ; prennent le pas sur `startLabel` et `endLabel`. */
  timeLabels?: string[]
  /** Le repère du bord gauche et du bord droit. */
  startLabel?: string
  endLabel?: string
  /** Affiché quand aucune série n'a deux points. */
  emptyText: string
}
