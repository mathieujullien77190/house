import { useState } from 'react'
import {
  ARC_CLASS,
  ARC_ACTIVE_CLASS,
  CENTER_LABEL_CLASS,
  CENTER_VALUE_CLASS,
  CENTER_WRAP_CLASS,
  CHART_CLASS,
  DOT_CLASS,
  DOT_TONE_CLASS,
  HIT_CLASS,
  LEGEND_CLASS,
  NAME_CLASS,
  ROW_ACTIVE_CLASS,
  ROW_CLASS,
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
 * part ou sa ligne éclaircit la part et surligne la ligne (l'état de survol est de la présentation pure).
 */
const PieChart = ({ slices, centerValue, centerLabel, label }: PieChartProps) => {
  const [hovered, setHovered] = useState<string | null>(null)
  const arcs = buildArcs(slices)
  const sliceOf = (id: string) => slices.find((slice) => slice.id === id)
  const enter = (id: string) => () => setHovered(id)
  const leave = () => setHovered(null)

  return (
    <div className={WRAP_CLASS}>
      <div className={CHART_CLASS}>
        <svg className={SVG_CLASS} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label}>
          {arcs.map((arc) => {
            const slice = sliceOf(arc.id)
            return (
              <path
                key={arc.id}
                d={arc.path}
                fill="none"
                strokeWidth={STROKE}
                className={`${STROKE_CLASS[slice?.tone ?? 'line']} ${ARC_CLASS} ${hovered === arc.id ? ARC_ACTIVE_CLASS : ''}`}
              >
                <title>{slice ? `${slice.label} : ${slice.display}` : arc.id}</title>
              </path>
            )
          })}
          {arcs.map((arc) => (
            <path
              key={`${arc.id}-hit`}
              d={arc.hitPath}
              fill="none"
              strokeWidth={STROKE}
              className={HIT_CLASS}
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
            className={`${ROW_CLASS} ${hovered === slice.id ? ROW_ACTIVE_CLASS : ''}`}
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
