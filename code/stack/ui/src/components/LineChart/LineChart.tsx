import {
  BODY_CLASS,
  FILL_CLASS,
  GRID,
  GRID_CLASS,
  HEAD_CLASS,
  HEIGHT,
  LINE_CLASS,
  SCALE_CLASS,
  STROKE_CLASS,
  SVG_CLASS,
  TICK_CLASS,
  TICKS,
  TIME_CLASS,
  TITLE_CLASS,
  VALUE_CLASS,
  WIDTH,
  WRAP_CLASS,
} from './constants'
import { buildPaths, formatTick } from './helpers'
import type { LineChartProps } from './types'

/** Une courbe en direct : le titre, la valeur actuelle et l'historique récent, de la gauche (ancien) à la droite (maintenant). */
const LineChart = ({ values, capacity, max, tone, title, valueText, label, unit = '', startLabel, endLabel }: LineChartProps) => {
  const paths = buildPaths(values, capacity, max)
  return (
    <div className={WRAP_CLASS}>
      <div className={HEAD_CLASS}>
        <span className={TITLE_CLASS}>{title}</span>
        <span className={VALUE_CLASS}>{valueText}</span>
      </div>
      <div className={BODY_CLASS}>
        <div className={SCALE_CLASS} aria-hidden="true">
          {TICKS.map((fraction) => (
            <span key={fraction} className={TICK_CLASS} style={{ top: `${(1 - fraction) * 100}%` }}>
              {formatTick(max * fraction, unit)}
            </span>
          ))}
        </div>
        <svg className={SVG_CLASS} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={label}>
        {GRID.map((fraction) => (
          <line key={fraction} x1={0} x2={WIDTH} y1={HEIGHT * fraction} y2={HEIGHT * fraction} strokeWidth={1} strokeDasharray="3 4" className={`${GRID_CLASS} [vector-effect:non-scaling-stroke]`} />
        ))}
        {paths ? (
          <>
            <path d={paths.area} className={FILL_CLASS[tone]} />
            <path d={paths.line} strokeWidth={1.5} strokeLinejoin="round" className={`${LINE_CLASS} ${STROKE_CLASS[tone]}`} />
          </>
        ) : null}
        </svg>
      </div>
      {startLabel || endLabel ? (
        <div className={TIME_CLASS}>
          <span>{startLabel}</span>
          <span>{endLabel}</span>
        </div>
      ) : null}
    </div>
  )
}

export default LineChart
