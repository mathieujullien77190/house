import {
  BADGE_CLASS,
  BADGE_RADIUS,
  BOLT_CLASS,
  BOLT_PATH,
  PHONE,
  PHONE_DETAIL_CLASS,
  PHONE_SCREEN_CLASS,
  SUB_CLASS,
  SUB_DY,
  TITLE_CLASS,
  TITLE_DY,
  ZONE_CLASS,
  ZONE_SHIFT,
  ZONE_Y,
} from './constants'
import type { DiagramNodeUIProps } from './types'

const DiagramNodeUI = ({ n, mains, ghost, groupClass, rectClass, ariaLabel, onPointerDown, onPointerMove, onPointerUp, onKeyDown }: DiagramNodeUIProps) => {
  const cx = n.x + n.w / 2
  const shift = n.zone ? ZONE_SHIFT : 0
  return (
    <g
      className={groupClass}
      tabIndex={ghost ? -1 : 0}
      role="button"
      aria-label={ariaLabel}
      aria-hidden={ghost || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={n.kind === 'phone' ? 10 : 8} className={rectClass} />
      {n.kind === 'phone' && (
        <g aria-hidden="true">
          <rect
            x={n.x + PHONE.inset}
            y={n.y + PHONE.inset + PHONE.notchY}
            width={n.w - PHONE.inset * 2}
            height={n.h - PHONE.inset * 2 - PHONE.notchY - PHONE.barY}
            rx="3"
            className={PHONE_SCREEN_CLASS}
          />
          <line x1={cx - PHONE.notchW / 2} y1={n.y + PHONE.notchY} x2={cx + PHONE.notchW / 2} y2={n.y + PHONE.notchY} className={PHONE_DETAIL_CLASS} />
          <line x1={cx - PHONE.barW / 2} y1={n.y + n.h - PHONE.barY} x2={cx + PHONE.barW / 2} y2={n.y + n.h - PHONE.barY} className={PHONE_DETAIL_CLASS} />
        </g>
      )}
      {mains && (
        <g transform={`translate(${n.x + n.w - 3} ${n.y + 3})`} aria-hidden="true">
          <circle r={BADGE_RADIUS} className={BADGE_CLASS} />
          <path d={BOLT_PATH} className={BOLT_CLASS} />
        </g>
      )}
      {n.zone && (
        <text x={cx} y={n.y + ZONE_Y} textAnchor="middle" className={ZONE_CLASS}>
          {n.zone}
        </text>
      )}
      <text x={cx} y={n.kind === 'phone' ? n.y + n.h + PHONE.textGap : n.y + n.h / 2 + TITLE_DY + shift} textAnchor="middle" className={TITLE_CLASS}>
        {n.title}
      </text>
      <text x={cx} y={n.kind === 'phone' ? n.y + n.h + PHONE.textGap + PHONE.subGap : n.y + n.h / 2 + SUB_DY + shift} textAnchor="middle" className={SUB_CLASS}>
        {n.sub}
      </text>
    </g>
  )
}

export default DiagramNodeUI
