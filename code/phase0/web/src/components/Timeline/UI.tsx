import ClipPlayer from '@/components/ClipPlayer'
import Tabs from '@/components/Tabs'
import { describeEvent } from '@/lib/format'
import {
  AXIS_CLASS,
  DETAIL_CLASS,
  DETAIL_TEXT_CLASS,
  EMPTY_CLASS,
  EMPTY_TEXT,
  HEAD_CLASS,
  HINT,
  MARKER_CLASS,
  MARKER_IDLE_CLASS,
  MARKER_SELECTED_CLASS,
  NO_CLIP_TEXT,
  OLDER_PREFIX,
  OLDER_SUFFIX,
  RANGE_LABEL,
  TICK_CLASS,
  TICK_LABEL_CLASS,
  WRAP_CLASS,
} from './constants'
import type { TimelineUIProps } from './types'

const TimelineUI = ({ apiKey, ranges, range, ticks, markers, older, selected, onRange, onSelect, onClose }: TimelineUIProps) => {
  return (
    <div className={WRAP_CLASS}>
      <div className={HEAD_CLASS}>
        <span>
          {HINT}
          {older > 0 ? ` ${OLDER_PREFIX}${older}${OLDER_SUFFIX}.` : ''}
        </span>
        <Tabs label={RANGE_LABEL} options={ranges} value={range} onChange={onRange} />
      </div>
      <div className={AXIS_CLASS}>
        {ticks.map((tick) => (
          <div key={tick.x} className={TICK_CLASS} style={{ left: `${tick.x}%` }}>
            <span className={TICK_LABEL_CLASS}>{tick.label}</span>
          </div>
        ))}
        {markers.length === 0 ? <span className={EMPTY_CLASS}>{EMPTY_TEXT}</span> : null}
        {markers.map((marker) => (
          <button
            key={marker.event.id}
            type="button"
            title={marker.text}
            aria-label={marker.text}
            aria-pressed={marker.selected}
            className={`${MARKER_CLASS} ${marker.selected ? MARKER_SELECTED_CLASS : MARKER_IDLE_CLASS}`}
            style={{ left: `${marker.x}%`, width: `${marker.width}%` }}
            onClick={() => (marker.selected ? onClose() : onSelect(marker.event.id))}
          />
        ))}
      </div>
      {selected ? (
        <div className={DETAIL_CLASS}>
          <p className={DETAIL_TEXT_CLASS}>{describeEvent(selected)}</p>
          {selected.clip ? <ClipPlayer apiKey={apiKey} path={selected.clip} onClose={onClose} /> : <p className={DETAIL_TEXT_CLASS}>{NO_CLIP_TEXT}</p>}
        </div>
      ) : null}
    </div>
  )
}

export default TimelineUI
