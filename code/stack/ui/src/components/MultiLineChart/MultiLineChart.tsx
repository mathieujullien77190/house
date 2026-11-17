import {
  BG_CLASS,
  BODY_CLASS,
  EMPTY_CLASS,
  GRID,
  GRID_CLASS,
  HEIGHT,
  LEGEND_CLASS,
  LEGEND_ITEM_CLASS,
  LINE_CLASS,
  SCALE_CLASS,
  STROKE_CLASS,
  SVG_CLASS,
  SWATCH_CLASS,
  TICK_CLASS,
  TICKS,
  TIME_CLASS,
  WIDTH,
  WRAP_CLASS,
} from './constants'
import { extentOf, formatTick, pathOf } from './helpers'
import type { MultiLineChartProps } from './types'

/** Plusieurs courbes sur la même échelle, avec leur légende : le plus ancien à gauche, le plus récent à droite. */
const MultiLineChart = ({ series, unit = '', label, startLabel, endLabel, emptyText }: MultiLineChartProps) => {
  const extent = extentOf(series)
  if (!extent) {
    return (
      <div className={WRAP_CLASS}>
        <p className={EMPTY_CLASS}>{emptyText}</p>
      </div>
    )
  }
  return (
    <div className={WRAP_CLASS}>
      <div className={BODY_CLASS}>
        <div className={SCALE_CLASS} aria-hidden="true">
          {TICKS.map((fraction) => (
            <span key={fraction} className={TICK_CLASS} style={{ top: `${(1 - fraction) * 100}%` }}>
              {formatTick(extent.minY + (extent.maxY - extent.minY) * fraction, unit)}
            </span>
          ))}
        </div>
        <svg className={SVG_CLASS} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={label}>
          {GRID.map((fraction) => (
            <line key={fraction} x1={0} x2={WIDTH} y1={HEIGHT * fraction} y2={HEIGHT * fraction} strokeWidth={1} strokeDasharray="3 4" className={`${GRID_CLASS} [vector-effect:non-scaling-stroke]`} />
          ))}
          {series.map((s) =>
            s.points.length >= 2 ? <path key={s.id} d={pathOf(s, extent)} strokeWidth={1.5} strokeLinejoin="round" className={`${LINE_CLASS} ${STROKE_CLASS[s.tone]}`} /> : null,
          )}
        </svg>
      </div>
      <div className={TIME_CLASS}>
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
      <ul className={LEGEND_CLASS}>
        {series.map((s) => (
          <li key={s.id} className={LEGEND_ITEM_CLASS}>
            <span className={`${SWATCH_CLASS} ${BG_CLASS[s.tone]}`} aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default MultiLineChart
