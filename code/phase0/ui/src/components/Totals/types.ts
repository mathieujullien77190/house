export interface Total {
  id: string
  /** Le chiffre, déjà mis en forme (« 49.2 Mo »). */
  value: string
  label: string
}

export interface TotalsProps {
  totals: Total[]
}
