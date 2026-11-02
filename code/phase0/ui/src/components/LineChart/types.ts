import type { SliceTone } from '../PieChart'

export interface LineChartProps {
  /** Les mesures, de la plus ancienne à la plus récente. */
  values: number[]
  /** Le nombre de mesures que le graphique peut contenir : la courbe se remplit depuis la droite. */
  capacity: number
  /** La valeur du haut du graphique (100 pour un pourcentage). */
  max: number
  tone: SliceTone
  title: string
  /** La valeur actuelle, déjà mise en forme (« 12 % »). */
  valueText: string
  /** Un texte pour les lecteurs d'écran. */
  label: string
  /** L'unité des repères de l'échelle verticale (« % »), vide sans unité. */
  unit?: string
  /** Le repère du bord gauche (« −2 min ») et du bord droit (« maintenant ») ; rien s'ils manquent. */
  startLabel?: string
  endLabel?: string
}
