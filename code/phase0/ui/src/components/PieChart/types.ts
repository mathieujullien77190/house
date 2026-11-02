export type SliceTone = 'accent' | 'green' | 'orange' | 'danger' | 'muted' | 'line'

export interface PieSlice {
  id: string
  label: string
  /** La valeur brute, qui sert à la taille de la part. */
  value: number
  /** La valeur déjà mise en forme (« 49.2 Mo »), montrée dans la légende. */
  display: string
  tone: SliceTone
}

export interface PieChartProps {
  slices: PieSlice[]
  /** Le chiffre au centre, déjà mis en forme (« 953.9 Go »). */
  centerValue: string
  centerLabel: string
  /** Le texte lu par les lecteurs d'écran pour le graphique. */
  label: string
}
