import { CARD_CLASS, LABEL_CLASS, VALUE_CLASS, WRAP_CLASS } from './constants'
import type { TotalsProps } from './types'

/** Des chiffres en tête de page, une carte chacun. */
const Totals = ({ totals }: TotalsProps) => {
  return (
    <div className={WRAP_CLASS}>
      {totals.map((total) => (
        <div key={total.id} className={CARD_CLASS}>
          <div className={VALUE_CLASS}>{total.value}</div>
          <div className={LABEL_CLASS}>{total.label}</div>
        </div>
      ))}
    </div>
  )
}

export default Totals
