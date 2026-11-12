import { useRef, type PointerEvent } from 'react'
import { EDGE_CLASS, EDGE_LABEL, LAYER_CLASS, OUTLINE_CLASS, OUTSIDE_CLASS, SVG_CLASS, VERTEX_CLASS, VERTEX_LABEL } from './constants'
import { edgeMiddle, insertAfter, moveTo, outlinePoints, outsidePath, pointOf, removeAt } from './helpers'
import type { ZoneEditorProps } from './types'

/**
 * Le polygone d'une zone dessinée sur la vidéo : ce qui est dehors est assombri, des ronds aux sommets se glissent pour réduire la zone, un petit rond
 * au milieu de chaque côté se glisse pour ajouter un sommet, un double clic ou un clic droit sur un sommet le retire. Se pose sur la vidéo (position relative du parent) ;
 * aucune donnée : les sommets viennent du parent, qui les enregistre.
 */
const ZoneEditor = ({ points, onChange, onCommit, quarterTurn = false }: ZoneEditorProps) => {
  const layer = useRef<HTMLDivElement>(null)
  // Le sommet tenu (son rang), ou null.
  const dragging = useRef<number | null>(null)

  const grab = (event: PointerEvent<HTMLElement>, index: number) => {
    event.stopPropagation()
    // Le clic droit ne tient rien : sinon la capture du pointeur envoie le menu contextuel au calque et le sommet ne reçoit jamais son clic droit (retrait).
    if (event.button !== 0) return
    layer.current?.setPointerCapture(event.pointerId)
    dragging.current = index
  }
  // Un sommet tenu suit le pointeur.
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const box = layer.current?.getBoundingClientRect()
    if (dragging.current === null || !box || box.width === 0 || box.height === 0) return
    onChange(moveTo(points, dragging.current, pointOf(event.clientX, event.clientY, box, quarterTurn)))
  }
  const release = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current === null) return
    dragging.current = null
    if (layer.current?.hasPointerCapture(event.pointerId)) layer.current.releasePointerCapture(event.pointerId)
    onCommit(points)
  }
  // Le milieu d'un côté tenu devient un sommet, qu'on continue de glisser.
  const split = (event: PointerEvent<HTMLElement>, index: number) => {
    if (event.button !== 0) return
    const next = insertAfter(points, index, edgeMiddle(points, index))
    if (next === points) return
    onChange(next)
    grab(event, index + 1)
  }
  const drop = (index: number) => {
    const next = removeAt(points, index)
    if (next === points) return
    onChange(next)
    onCommit(next)
  }

  return (
    <div ref={layer} className={LAYER_CLASS} onPointerMove={move} onPointerUp={release} onPointerCancel={release}>
      <svg className={SVG_CLASS} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path className={OUTSIDE_CLASS} d={outsidePath(points)} fillRule="evenodd" />
        <polygon className={OUTLINE_CLASS} points={outlinePoints(points)} vectorEffect="non-scaling-stroke" />
      </svg>
      {points.map(([x, y], index) => {
        const [mx, my] = edgeMiddle(points, index)
        return (
          <div key={index}>
            <span
              role="button"
              tabIndex={-1}
              aria-label={EDGE_LABEL}
              title={EDGE_LABEL}
              className={EDGE_CLASS}
              style={{ left: `${mx * 100}%`, top: `${my * 100}%` }}
              onPointerDown={(event) => split(event, index)}
            />
            <span
              role="button"
              tabIndex={-1}
              aria-label={VERTEX_LABEL}
              title={VERTEX_LABEL}
              className={VERTEX_CLASS}
              style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
              onPointerDown={(event) => grab(event, index)}
              onDoubleClick={() => drop(index)}
              onContextMenu={(event) => {
                event.preventDefault()
                drop(index)
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

export default ZoneEditor
