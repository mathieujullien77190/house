import Button from '../Button'
import Tabs from '../Tabs'
import {
  AXIS_CLASS,
  AXIS_FILL_CLASS,
  AXIS_VERTICAL_CLASS,
  CLIP_SPAN_CLASS,
  CLIP_SPAN_TITLE,
  CLIP_SPAN_VERTICAL_CLASS,
  CONTROLS_CLASS,
  COVERAGE_CLASS,
  COVERAGE_VERTICAL_CLASS,
  CURSOR_CLASS,
  CURSOR_VERTICAL_CLASS,
  FUTURE_CLASS,
  FUTURE_VERTICAL_CLASS,
  HEAD_CLASS,
  NOW_BUTTON_CLASS,
  NOW_LABEL,
  NOW_LINE_CLASS,
  NOW_LINE_VERTICAL_CLASS,
  NOW_MARK,
  NOW_MARK_CLASS,
  NOW_MARK_VERTICAL_CLASS,
  RANGE_LABEL,
  TICK_CLASS,
  TICK_LABEL_CLASS,
  TICK_LABEL_VERTICAL_CLASS,
  TICK_VERTICAL_CLASS,
  WRAP_CLASS,
  WRAP_FILL_CLASS,
} from './constants'
import { markerClass, pointStyle, spanStyle } from './helpers'
import type { TimelineProps } from './types'

/**
 * La frise : des graduations, une bande de couverture, un bloc par événement, un curseur. Tout est calculé
 * par le parent (positions en %) ; la frise ne fait que dessiner et remonter les gestes.
 */
const Timeline = <T extends string>({
  vertical = false,
  fill = false,
  ranges,
  range,
  live,
  ticks,
  markers,
  coverage,
  nowX = null,
  clipSpan = null,
  cursorX,
  axisRef,
  onRange,
  onNow,
  onSelect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: TimelineProps<T>) => {
  return (
    <div className={fill ? WRAP_FILL_CLASS : WRAP_CLASS}>
      <div className={HEAD_CLASS}>
        <div className={CONTROLS_CLASS}>
          <Button variant={live ? 'active' : 'default'} className={NOW_BUTTON_CLASS} onClick={onNow}>
            {NOW_LABEL}
          </Button>
          <Tabs label={RANGE_LABEL} options={ranges} value={range} onChange={onRange} />
        </div>
      </div>
      <div
        ref={axisRef}
        className={vertical ? (fill ? AXIS_FILL_CLASS : AXIS_VERTICAL_CLASS) : AXIS_CLASS}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {nowX !== null ? <div className={vertical ? FUTURE_VERTICAL_CLASS : FUTURE_CLASS} style={vertical ? { height: `${100 - nowX}%` } : { left: `${nowX}%` }} /> : null}
        {coverage.map((segment) => (
          <div key={segment.x} className={vertical ? COVERAGE_VERTICAL_CLASS : COVERAGE_CLASS} style={spanStyle(segment.x, segment.width, vertical)} />
        ))}
        {ticks.map((tick) => (
          <div key={tick.x} className={vertical ? TICK_VERTICAL_CLASS : TICK_CLASS} style={pointStyle(tick.x, vertical)}>
            <span className={vertical ? TICK_LABEL_VERTICAL_CLASS : TICK_LABEL_CLASS}>{tick.label}</span>
          </div>
        ))}
        {clipSpan ? <div title={CLIP_SPAN_TITLE} className={vertical ? CLIP_SPAN_VERTICAL_CLASS : CLIP_SPAN_CLASS} style={spanStyle(clipSpan.x, clipSpan.width, vertical)} /> : null}
        {markers.map((marker) => (
          <button
            key={marker.id}
            type="button"
            title={marker.text}
            aria-label={marker.text}
            aria-pressed={marker.selected}
            className={markerClass(marker, vertical)}
            style={spanStyle(marker.x, marker.width, vertical)}
            onPointerDown={(event) => event.stopPropagation()}
            // Le relâchement d'un clic sur un bloc ne doit pas être pris par l'axe (il y poserait le curseur et fermerait le clip).
            onPointerUp={(event) => event.stopPropagation()}
            onClick={() => onSelect(marker.id)}
          />
        ))}
        {nowX !== null ? (
          <div className={vertical ? NOW_LINE_VERTICAL_CLASS : NOW_LINE_CLASS} style={pointStyle(nowX, vertical)}>
            <span className={vertical ? NOW_MARK_VERTICAL_CLASS : NOW_MARK_CLASS}>{NOW_MARK}</span>
          </div>
        ) : null}
        {cursorX !== null ? <div className={vertical ? CURSOR_VERTICAL_CLASS : CURSOR_CLASS} style={pointStyle(cursorX, vertical)} /> : null}
      </div>
    </div>
  )
}

export default Timeline
