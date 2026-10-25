import Button from '../Button'
import Tabs from '../Tabs'
import {
  AXIS_CLASS,
  CLIP_SPAN_CLASS,
  CLIP_SPAN_TITLE,
  CONTROLS_CLASS,
  COVERAGE_CLASS,
  CURSOR_CLASS,
  FUTURE_CLASS,
  HEAD_CLASS,
  HINT,
  NOW_BUTTON_CLASS,
  NOW_LABEL,
  NOW_LINE_CLASS,
  NOW_MARK,
  NOW_MARK_CLASS,
  OLDER_PREFIX,
  OLDER_SUFFIX,
  RANGE_LABEL,
  TICK_CLASS,
  TICK_LABEL_CLASS,
  WINDOW_CLASS,
  WRAP_CLASS,
} from './constants'
import { markerClass } from './helpers'
import type { TimelineProps } from './types'

/**
 * La frise : des graduations, une bande de couverture, un bloc par événement, un curseur. Tout est calculé
 * par le parent (positions en %) ; la frise ne fait que dessiner et remonter les gestes.
 */
const Timeline = <T extends string>({
  ranges,
  range,
  live,
  windowText,
  ticks,
  markers,
  coverage,
  nowX = null,
  clipSpan = null,
  cursorX,
  older,
  axisRef,
  onRange,
  onNow,
  onSelect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: TimelineProps<T>) => {
  return (
    <div className={WRAP_CLASS}>
      <div className={HEAD_CLASS}>
        <span>{HINT}</span>
        <div className={CONTROLS_CLASS}>
          <Button variant={live ? 'active' : 'default'} className={NOW_BUTTON_CLASS} onClick={onNow}>
            {NOW_LABEL}
          </Button>
          <Tabs label={RANGE_LABEL} options={ranges} value={range} onChange={onRange} />
        </div>
      </div>
      <div className={WINDOW_CLASS}>
        {windowText}
        {older > 0 ? ` · ${OLDER_PREFIX}${older}${OLDER_SUFFIX}` : ''}
      </div>
      <div
        ref={axisRef}
        className={AXIS_CLASS}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {nowX !== null ? <div className={FUTURE_CLASS} style={{ left: `${nowX}%` }} /> : null}
        {coverage.map((segment) => (
          <div key={segment.x} className={COVERAGE_CLASS} style={{ left: `${segment.x}%`, width: `${segment.width}%` }} />
        ))}
        {ticks.map((tick) => (
          <div key={tick.x} className={TICK_CLASS} style={{ left: `${tick.x}%` }}>
            <span className={TICK_LABEL_CLASS}>{tick.label}</span>
          </div>
        ))}
        {clipSpan ? <div title={CLIP_SPAN_TITLE} className={CLIP_SPAN_CLASS} style={{ left: `${clipSpan.x}%`, width: `${clipSpan.width}%` }} /> : null}
        {markers.map((marker) => (
          <button
            key={marker.id}
            type="button"
            title={marker.text}
            aria-label={marker.text}
            aria-pressed={marker.selected}
            className={markerClass(marker)}
            style={{ left: `${marker.x}%`, width: `${marker.width}%` }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onSelect(marker.id)}
          />
        ))}
        {nowX !== null ? (
          <div className={NOW_LINE_CLASS} style={{ left: `${nowX}%` }}>
            <span className={NOW_MARK_CLASS}>{NOW_MARK}</span>
          </div>
        ) : null}
        {cursorX !== null ? <div className={CURSOR_CLASS} style={{ left: `${cursorX}%` }} /> : null}
      </div>
    </div>
  )
}

export default Timeline
