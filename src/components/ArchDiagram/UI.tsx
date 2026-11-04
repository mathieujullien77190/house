import {
  ARROW_CLASS,
  ARROW_DASHED_CLASS,
  ARROW_LIVE_CLASS,
  ARROW_VPN_CLASS,
  BOX_CLASS,
  BOX_LINE_CLASS,
  BOX_TITLE_CLASS,
  DISK_CLASS,
  DISK_SHAPE,
  DISK_TOP_CLASS,
  DOCKER_TITLE_CLASS,
  LABEL_CLASS,
  LIVE_LABEL_CLASS,
  MARKER_CLASS,
  MARKER_LIVE_CLASS,
  NOTE_CLASS,
  PANEL_CLASS,
  PANEL_TITLE_CLASS,
  VPN_LABEL_CLASS,
} from './constants'
import { diskLineY, diskPath, diskTitleY, lineY, markerId, panelTitlePos, titleY } from './helpers'
import type { ArchDiagramProps } from './types'

const ArchDiagramUI = ({ view }: ArchDiagramProps) => {
  const { disks = [] } = view
  const marker = markerId(view.id)
  const liveMarker = `${marker}-live`
  return (
    <svg viewBox={view.viewBox} role="img" aria-label={view.ariaLabel} className="h-auto w-full">
      <defs>
        <marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className={MARKER_CLASS} />
        </marker>
        <marker id={liveMarker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className={MARKER_LIVE_CLASS} />
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

      {view.arrows.map((a) => {
        const tip = a.live ? liveMarker : marker
        return (
          <path
            key={a.id}
            d={a.d}
            className={a.live ? ARROW_LIVE_CLASS : a.vpn ? ARROW_VPN_CLASS : a.dashed ? ARROW_DASHED_CLASS : ARROW_CLASS}
            markerStart={a.both ? `url(#${tip})` : undefined}
            markerEnd={`url(#${tip})`}
          />
        )
      })}

      {view.labels.map((l) => (
        <text key={l.id} x={l.x} y={l.y} textAnchor={l.anchor ?? 'start'} className={l.live ? LIVE_LABEL_CLASS : l.vpn ? VPN_LABEL_CLASS : l.note ? NOTE_CLASS : LABEL_CLASS}>
          {l.text}
        </text>
      ))}
    </svg>
  )
}

export default ArchDiagramUI
