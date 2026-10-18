import DiagramNode from '@/components/DiagramNode'
import HousePlan from '@/components/HousePlan'
import Button from '@/components/UI/Button'
import SegmentedControl from '@/components/UI/SegmentedControl'
import {
  ARIA_LABEL,
  CLUSTER_LABEL_CLASS,
  CLUSTER_RECT_CLASS,
  CLUSTER_TITLE,
  LINK_HIT_CLASS,
  SVG_CLASS,
  VIEWPORT_CLASS,
  VIEW_BOX,
  ZOOM_BAR_CLASS,
  ZOOM_BUTTON_CLASS,
  ZOOM_LABEL_CLASS,
} from './constants'
import type { DiagramUIProps } from './types'

const DiagramUI = ({
  svgRef, width, zoomLabel, canZoomIn, canZoomOut, onZoomIn, onZoomOut, onZoomReset,
  floor, floors, onFloorChange, cluster, links, nodes,
}: DiagramUIProps) => {
  return (
    <div>
      <div className={ZOOM_BAR_CLASS} role="toolbar" aria-label="Étage et zoom du schéma">
        <SegmentedControl label="Étage" options={floors} value={floor} onChange={onFloorChange} />
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        <Button className={ZOOM_BUTTON_CLASS} aria-label="Dézoomer" disabled={!canZoomOut} onClick={onZoomOut}>
          −
        </Button>
        <span className={ZOOM_LABEL_CLASS} aria-live="polite">
          {zoomLabel}
        </span>
        <Button className={ZOOM_BUTTON_CLASS} aria-label="Zoomer" disabled={!canZoomIn} onClick={onZoomIn}>
          +
        </Button>
        <Button onClick={onZoomReset}>100 %</Button>
      </div>

      <div className={VIEWPORT_CLASS}>
        <svg ref={svgRef} viewBox={VIEW_BOX} className={SVG_CLASS} style={{ width }} role="img" aria-label={`${ARIA_LABEL} – ${floor === 'rdc' ? 'rez-de-chaussée' : 'sous-sol'}`}>
          <HousePlan floor={floor} />

          {cluster && (
            <>
              <rect x={cluster.x} y={cluster.y} width={cluster.w} height={cluster.h} rx="10" className={CLUSTER_RECT_CLASS} />
              <text x={cluster.x + 10} y={cluster.y + 14} className={CLUSTER_LABEL_CLASS}>
                {CLUSTER_TITLE}
              </text>
            </>
          )}

          {links.map((l) => (
            <g key={l.id}>
              <path d={l.d} className={`fill-none ${l.className}`} />
              <path d={l.d} className={LINK_HIT_CLASS} onClick={l.onSelect} />
            </g>
          ))}

          {nodes.map((props) => (
            <DiagramNode key={props.n.id} {...props} />
          ))}
        </svg>
      </div>
    </div>
  )
}

export default DiagramUI
