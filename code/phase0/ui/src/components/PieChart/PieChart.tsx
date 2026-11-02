import { useState } from 'react'
import {
  ARC_CLASS,
  ARC_DIM_CLASS,
  CENTER_LABEL_CLASS,
  CENTER_VALUE_CLASS,
  CENTER_WRAP_CLASS,
  CHART_CLASS,
  DOT_CLASS,
  DOT_TONE_CLASS,
  HIT_CLASS,
  LEGEND_CLASS,
  NAME_CLASS,
  RADIUS,
  ROW_ACTIVE_CLASS,
  ROW_CLASS,
  ROW_DIM_CLASS,
  SIZE,
  STROKE,
  STROKE_CLASS,
  SVG_CLASS,
  VALUE_CLASS,
  WRAP_CLASS,
} from './constants'
import { buildArcs } from './helpers'
import type { PieChartProps } from './types'

/**
 * Un camembert (anneau) et sa légende : chaque part a un nom, une valeur et une couleur de la maison. Survoler une
 * part ou sa ligne met les deux en avant et estompe le reste (l'état de survol est de la présentation pure).
 */
const PieChart = ({ slices, centerValue, centerLabel, label }: PieChartProps) => {
  const [hovered, setHovered] = useState<string | null>(null)
  const arcs = buildArcs(slices)
  const sliceOf = (id: string) => slices.find((slice) => slice.id === id)
  const enter = (id: string) => () => setHovered(id)
  const leave = () => setHovered(null)
  const dimmed = (id: string) => hovered !== null && hovered !== id

  return (
    <div className={WRAP_CLASS}>
      <div className={CHART_CLASS}>
        <svg className={SVG_CLASS} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label}>
          {arcs.map((arc) => {
            const slice = sliceOf(arc.id)
            return (
              <circle
                key={arc.id}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                strokeWidth={STROKE}
                className={`${STROKE_CLASS[slice?.tone ?? 'line']} ${ARC_CLASS} ${dimmed(arc.id) ? ARC_DIM_CLASS : ''}`}
                strokeDasharray={arc.dashArray}
                strokeDashoffset={arc.dashOffset}
              >
                <title>{slice ? `${slice.label} : ${slice.display}` : arc.id}</title>
              </circle>
            )
          })}
          {arcs.map((arc) => (
            <circle
              key={`${arc.id}-hit`}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              className={HIT_CLASS}
              strokeDasharray={arc.hitDashArray}
              strokeDashoffset={arc.hitDashOffset}
              onMouseEnter={enter(arc.id)}
              onMouseLeave={leave}
            />
          ))}
        </svg>
        <div className={CENTER_WRAP_CLASS}>
          <div className={CENTER_VALUE_CLASS}>{centerValue}</div>
          <div className={CENTER_LABEL_CLASS}>{centerLabel}</div>
        </div>
      </div>
      <ul className={LEGEND_CLASS}>
        {slices.map((slice) => (
          <li
            key={slice.id}
            className={`${ROW_CLASS} ${hovered === slice.id ? ROW_ACTIVE_CLASS : ''} ${dimmed(slice.id) ? ROW_DIM_CLASS : ''}`}
            onMouseEnter={enter(slice.id)}
            onMouseLeave={leave}
          >
            <span className={`${DOT_CLASS} ${DOT_TONE_CLASS[slice.tone]}`} />
            <span className={NAME_CLASS}>{slice.label}</span>
            <span className={VALUE_CLASS}>{slice.display}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default PieChart
