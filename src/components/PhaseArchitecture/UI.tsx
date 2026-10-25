import Card from '@/components/UI/Card'
import SegmentedControl from '@/components/UI/SegmentedControl'
import {
  ARROW_CLASS,
  ARROW_DASHED_CLASS,
  BOX_CLASS,
  BOX_LINE_CLASS,
  BOX_TITLE_CLASS,
  DISK_CLASS,
  DISK_SHAPE,
  DISK_TOP_CLASS,
  DOCKER_TITLE_CLASS,
  LABEL_CLASS,
  MARKER_CLASS,
  MARKER_ID,
  NOTE_CLASS,
  PANEL_CLASS,
  PANEL_TITLE_CLASS,
  VIEW_GROUP_LABEL,
} from './constants'
import { diskLineY, diskPath, diskTitleY, lineY, panelTitlePos, titleY } from './helpers'
import type { ArchView, PhaseArchitectureUIProps } from './types'

const DiagramSvg = ({ view }: { view: ArchView }) => {
  const { disks = [] } = view
  return (
    <svg viewBox={view.viewBox} role="img" aria-label={view.ariaLabel} className="h-auto w-full">
      <defs>
        <marker id={MARKER_ID} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className={MARKER_CLASS} />
        </marker>
      </defs>

      {view.panels.map((p) => {
        const pos = panelTitlePos(p)
        return (
          <g key={p.id}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={p.tone === 'warm' ? 10 : 14} className={PANEL_CLASS[p.tone]} />
            <text x={pos.x} y={pos.y} textAnchor={pos.anchor} className={p.tone === 'warm' ? DOCKER_TITLE_CLASS : PANEL_TITLE_CLASS}>
              {p.title}
            </text>
          </g>
        )
      })}

      {disks.map((disk) => (
        <g key={disk.id}>
          <path d={diskPath(disk)} className={DISK_CLASS} />
          <ellipse cx={disk.cx} cy={disk.cy} rx={disk.rx ?? DISK_SHAPE.rx} ry={DISK_SHAPE.ry} className={DISK_TOP_CLASS} />
          <text x={disk.cx} y={diskTitleY(disk)} textAnchor="middle" className={BOX_TITLE_CLASS}>
            {disk.title}
          </text>
          {disk.lines.map((line, i) => (
            <text key={line} x={disk.cx} y={diskLineY(disk, i)} textAnchor="middle" className={BOX_LINE_CLASS}>
              {line}
            </text>
          ))}
        </g>
      ))}

      {view.boxes.map((b) => (
        <g key={b.id}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={10} className={BOX_CLASS[b.tone]} />
          <text x={b.x + b.w / 2} y={titleY(b)} textAnchor="middle" className={BOX_TITLE_CLASS}>
            {b.title}
          </text>
          {b.lines.map((line, i) => (
            <text key={line} x={b.x + b.w / 2} y={lineY(b, i)} textAnchor="middle" className={BOX_LINE_CLASS}>
              {line}
            </text>
          ))}
        </g>
      ))}

      {view.arrows.map((a) => (
        <path
          key={a.id}
          d={a.d}
          className={a.dashed ? ARROW_DASHED_CLASS : ARROW_CLASS}
          markerStart={a.both ? `url(#${MARKER_ID})` : undefined}
          markerEnd={`url(#${MARKER_ID})`}
        />
      ))}

      {view.labels.map((l) => (
        <text key={l.id} x={l.x} y={l.y} textAnchor={l.anchor ?? 'start'} className={l.note ? NOTE_CLASS : LABEL_CLASS}>
          {l.text}
        </text>
      ))}
    </svg>
  )
}

const PhaseArchitectureUI = ({ title, viewId, view, intro, options, onViewChange, children }: PhaseArchitectureUIProps) => {
  return (
    <Card as="section" className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-[1.15rem] font-semibold">{title}</h2>
        <SegmentedControl label={VIEW_GROUP_LABEL} options={options} value={viewId} onChange={onViewChange} />
      </div>
      <div className="mb-3 mt-1 space-y-1.5 text-[0.9rem] text-muted">
        {intro.map((paragraph) => (
          <p key={paragraph} className="m-0">
            {paragraph}
          </p>
        ))}
      </div>
      {view ? <DiagramSvg view={view} /> : children}
    </Card>
  )
}

export default PhaseArchitectureUI
