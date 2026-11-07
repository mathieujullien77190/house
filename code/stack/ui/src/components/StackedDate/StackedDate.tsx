import { LINE_CLASS, WRAP_CLASS } from './constants'
import type { StackedDateProps } from './types'

/** Une date et son heure sur deux lignes, pour les colonnes de dates des tableaux (la colonne reste étroite). */
const StackedDate = ({ date, time }: StackedDateProps) => (
  <span className={WRAP_CLASS}>
    <span className={LINE_CLASS}>{date}</span>
    <span className={LINE_CLASS}>{time}</span>
  </span>
)

export default StackedDate
