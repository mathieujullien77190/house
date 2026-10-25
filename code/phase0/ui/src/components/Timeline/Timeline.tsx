import Button from '../Button'
import Tabs from '../Tabs'
import {
  AXIS_CLASS,
  AXIS_LIVE_CLASS,
  CONTROLS_CLASS,
  COVERAGE_CLASS,
  CURSOR_CLASS,
  EARLIER_ARIA,
  EARLIER_LABEL,
  EMPTY_CLASS,
  EMPTY_TEXT,
  HEAD_CLASS,
  HINT,
  LATER_ARIA,
  LATER_LABEL,
  NOW_LABEL,
  OLDER_PREFIX,
  OLDER_SUFFIX,
  RANGE_LABEL,
  TICK_CLASS,
  TICK_LABEL_CLASS,
  WINDOW_CLASS,
  WRAP_CLASS,
} from './constants'
import { clickFraction, markerClass } from './helpers'
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
  cursorX,
  older,
  axisRef,
  onRange,
  onEarlier,
  onLater,
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
          <Button onClick={onEarlier} aria-label={EARLIER_ARIA}>
            {EARLIER_LABEL}
          </Button>
          <Button onClick={onLater} aria-label={LATER_ARIA} disabled={live}>
            {LATER_LABEL}
          </Button>
          <Button variant={live ? 'active' : 'default'} onClick={onNow}>
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
        className={`${AXIS_CLASS} ${live ? AXIS_LIVE_CLASS : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {coverage.map((segment) => (
          <div key={segment.x} className={COVERAGE_CLASS} style={{ left: `${segment.x}%`, width: `${segment.width}%` }} />
        ))}
        {ticks.map((tick) => (
          <div key={tick.x} className={TICK_CLASS} style={{ left: `${tick.x}%` }}>
            <span className={TICK_LABEL_CLASS}>{tick.label}</span>
          </div>
        ))}
        {markers.length === 0 ? <span className={EMPTY_CLASS}>{EMPTY_TEXT}</span> : null}
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
            onClick={(event) => onSelect(marker.id, clickFraction(event.clientX, event.currentTarget.getBoundingClientRect(), marker.scale))}
          />
        ))}
        {cursorX !== null ? <div className={CURSOR_CLASS} style={{ left: `${cursorX}%` }} /> : null}
      </div>
    </div>
  )
}

export default Timeline
