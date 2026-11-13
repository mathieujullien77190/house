import LegendUI from './UI'
import { LEGEND_ITEMS } from './constants'
import { toSwatches } from './helpers'

const Legend = () => {
  return <LegendUI swatches={toSwatches(LEGEND_ITEMS)} />
}

export default Legend
