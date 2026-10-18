import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { clusterBox, computeLinkPaths } from '@/geometry'
import { linkClass, type LinkLevel } from '@/lib/linkStyles'
import { isMainsKind, type DiagramNode } from '@/nodes'
import UI from './UI'
import { DRAG_THRESHOLD, FLOORS, LINK_DIM_CLASS, ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from './constants'
import { clampZoom, keyDelta, svgWidth, toSvgPoint, zoomLabel } from './helpers'
import type { DiagramProps, LinkView } from './types'

const Diagram = ({
  nodes, links, floor, selectedNode, selectedLink, onFloorChange, onSelectNode, onActivateNode, onSelectLink, onMove,
}: DiagramProps) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ id: string; dx: number; dy: number; x0: number; y0: number; moved: boolean } | null>(null)
  const [zoom, setZoom] = useState(ZOOM_DEFAULT)

  const changeZoom = (delta: number) => setZoom((z) => clampZoom(z + delta))

  const handleDown = (e: PointerEvent<SVGGElement>, n: DiagramNode) => {
    onSelectNode(n.id)
    const p = toSvgPoint(svgRef.current, e)
    drag.current = { id: n.id, dx: p.x - n.x, dy: p.y - n.y, x0: p.x, y0: p.y, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleMove = (e: PointerEvent<SVGGElement>) => {
    const d = drag.current
    if (!d) return
    const p = toSvgPoint(svgRef.current, e)
    // Sous le seuil, c'est un clic : le composant ne bouge pas.
    if (!d.moved && Math.hypot(p.x - d.x0, p.y - d.y0) < DRAG_THRESHOLD) return
    d.moved = true
    onMove(d.id, p.x - d.dx, p.y - d.dy)
  }

  const handleUp = () => {
    const d = drag.current
    drag.current = null
    if (d && !d.moved) onActivateNode(d.id)
  }

  const handleKey = (e: KeyboardEvent<SVGGElement>, n: DiagramNode) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelectNode(n.id)
      onActivateNode(n.id)
      return
    }
    const delta = keyDelta(e)
    if (delta) {
      e.preventDefault()
      onMove(n.id, n.x + delta.x, n.y + delta.y)
    }
  }

  const floorOf = (id: string) => nodes.find((n) => n.id === id)?.floor
  const paths = computeLinkPaths(nodes, links)
  const rank = { normal: 0, highlight: 1, selected: 2 }
  const linkViews = links
    .flatMap((l): (LinkView & { level: LinkLevel })[] => {
      const g = paths[l.id]
      if (!g) return []
      const touches = selectedNode !== null && (l.from === selectedNode || l.to === selectedNode)
      const level: LinkLevel = selectedLink === l.id ? 'selected' : touches ? 'highlight' : 'normal'
      // Un lien normal est estompé s'il touche l'autre étage ou si un composant est sélectionné.
      const crossFloor = floorOf(l.from) !== floor || floorOf(l.to) !== floor
      const faded = level === 'normal' && (crossFloor || selectedNode !== null)
      const className = `${linkClass(l.type, level)} ${faded ? LINK_DIM_CLASS : ''}`
      return [{ id: l.id, d: g.d, className, level, onSelect: () => onSelectLink(l.id) }]
    })
    // Les liaisons mises en évidence sont dessinées par-dessus les autres.
    .sort((a, b) => rank[a.level] - rank[b.level])

  return (
    <UI
      svgRef={svgRef}
      width={svgWidth(zoom)}
      zoomLabel={zoomLabel(zoom)}
      canZoomIn={zoom < ZOOM_MAX}
      canZoomOut={zoom > ZOOM_MIN}
      onZoomIn={() => changeZoom(ZOOM_STEP)}
      onZoomOut={() => changeZoom(-ZOOM_STEP)}
      onZoomReset={() => setZoom(ZOOM_DEFAULT)}
      floor={floor}
      floors={FLOORS}
      onFloorChange={onFloorChange}
      cluster={clusterBox(nodes.filter((n) => n.floor === floor))}
      links={linkViews}
      nodes={nodes.map((n) => ({
        n,
        selected: selectedNode === n.id,
        mains: isMainsKind(n.kind),
        ghost: n.floor !== floor,
        onPointerDown: handleDown,
        onPointerMove: handleMove,
        onPointerUp: handleUp,
        onKeyDown: handleKey,
      }))}
    />
  )
}

export default Diagram
