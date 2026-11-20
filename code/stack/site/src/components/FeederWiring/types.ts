/** Un fil du schéma : son tracé (points x,y d'un viewBox 760 × 450) et sa couleur. */
export interface WireSpec {
  id: string
  label: string
  color: string
  points: string
}

/** Une ligne du tableau des broches. */
export interface PinRow {
  id: string
  signal: string
  pin: string
  note: string
}
