import { CHIP_CLASS, ROW_CLASS, STRETCH_CHIP_CLASS, STRETCH_ROW_CLASS } from './constants'
import type { ValueChipsProps } from './types'

/** Des valeurs seules, chacune dans son bloc, côte à côte : une mesure sans son nom (le parent a déjà mis les unités). */
const ValueChips = ({ values, stretch = false }: ValueChipsProps) => (
  <div className={stretch ? STRETCH_ROW_CLASS : ROW_CLASS}>
    {values.map((value, index) => (
      <span key={`${index}-${value}`} className={stretch ? STRETCH_CHIP_CLASS : CHIP_CLASS}>
        {value}
      </span>
    ))}
  </div>
)

export default ValueChips
