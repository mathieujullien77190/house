export interface FastScrollProps {
  /** Le rang de la vitesse dans `RATES`. */
  rate: number
  onRate: (rate: number) => void
  /** Vitesse 0 : les deux boutons « image précédente / suivante » se montrent et appellent ceci (-1 : précédente, 1 : suivante) ; sans lui, rien. */
  onStep?: (direction: -1 | 1) => void
}
