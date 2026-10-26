import {
  ARIA_LABEL,
  ARROWS,
  ARROW_CLASS,
  ARROW_DASHED_CLASS,
  BOXES,
  BOX_CLASS,
  BOX_DASHED_CLASS,
  BOX_TITLE_CLASS,
  CHIP_CLASS,
  CHIP_STROKE,
  CHIP_TEXT_CLASS,
  FRAMES,
  FRAME_CLASS,
  FRAME_STROKE,
  GROUP_CLASS,
  LABELS,
  LABEL_CLASS,
  MARKER_CLASS,
  MARKER_ID,
  NOTE_CLASS,
  STORYBOOK_CLASS,
  STORYBOOK_HINT,
  STORYBOOK_HINT_CLASS,
  STORYBOOK_LABEL,
  STORYBOOK_LINK_CLASS,
  STORYBOOK_URL,
  SUB_CLASS,
  TITLE_CLASS,
  VIEW_BOX,
} from './constants'
import type { InterfacesMapUIProps } from './types'

const InterfacesMapUI = ({ layout }: InterfacesMapUIProps) => {
  return (
    <div>
      <p className={STORYBOOK_CLASS}>
        <a className={STORYBOOK_LINK_CLASS} href={STORYBOOK_URL} target="_blank" rel="noreferrer">
          {STORYBOOK_LABEL}
        </a>
        <span className={STORYBOOK_HINT_CLASS}>{STORYBOOK_HINT}</span>
      </p>
      <div className="overflow-x-auto">
      <svg viewBox={VIEW_BOX} role="img" aria-label={ARIA_LABEL} className="h-auto w-full min-w-[900px]">
        <defs>
          <marker id={MARKER_ID} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" className={MARKER_CLASS} />
          </marker>
        </defs>

        {FRAMES.map((f) => (
          <g key={f.id}>
            <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={12} className={`${FRAME_CLASS} ${FRAME_STROKE[f.role]}`} />
            <text x={f.x + 22} y={f.y + 28} className={TITLE_CLASS}>
              {f.title}
            </text>
            <text x={f.x + 22} y={f.y + 47} className={SUB_CLASS}>
              {f.sub}
            </text>
            {f.notes?.map((n) => (
              <text key={n.text} x={f.x + 22} y={n.y} className={SUB_CLASS}>
                {n.text}
              </text>
            ))}
          </g>
        ))}

        {layout.labels.map((l) => (
          <text key={l.id} x={l.x} y={l.y} className={l.kind === 'group' ? GROUP_CLASS : NOTE_CLASS}>
            {l.text}
          </text>
        ))}

        {layout.chips.map((c) => (
          <g key={c.id}>
            <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={6} className={`${CHIP_CLASS} ${CHIP_STROKE[c.role]}`} />
            <text x={c.x + c.w / 2} y={c.y + 16} textAnchor="middle" className={CHIP_TEXT_CLASS}>
              {c.text}
            </text>
          </g>
        ))}

        {BOXES.map((b) => (
          <g key={b.id}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} className={`${b.dashed ? BOX_DASHED_CLASS : BOX_CLASS} ${FRAME_STROKE[b.role]}`} />
            <text x={b.x + b.w / 2} y={b.lines.length === 0 ? b.y + b.h / 2 + 4 : b.y + 22} textAnchor="middle" className={BOX_TITLE_CLASS}>
              {b.title}
            </text>
            {b.lines.map((line, i) => (
              <text key={line} x={b.x + b.w / 2} y={b.y + (b.h > 100 ? 48 : 41) + i * (b.h > 100 ? 20 : 16)} textAnchor="middle" className={NOTE_CLASS}>
                {line}
              </text>
            ))}
          </g>
        ))}

        {ARROWS.map((a) => (
          <path key={a.id} d={a.d} className={a.dashed ? ARROW_DASHED_CLASS : ARROW_CLASS} markerEnd={`url(#${MARKER_ID})`} />
        ))}

        {LABELS.map((l) => (
          <text
            key={l.id}
            x={l.x}
            y={l.y}
            textAnchor={l.anchor ?? 'start'}
            transform={l.rotate ? `rotate(${l.rotate} ${l.x} ${l.y})` : undefined}
            className={LABEL_CLASS}
          >
            {l.text}
          </text>
        ))}
      </svg>
      </div>
    </div>
  )
}

export default InterfacesMapUI
