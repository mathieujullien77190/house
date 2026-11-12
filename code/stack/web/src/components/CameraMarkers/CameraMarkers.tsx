import { useRef } from 'react'
import { HiOutlineVideoCamera } from 'react-icons/hi2'
import MapIcon from '@/components/MapIcon'
import {
  DRAG_DISTANCE,
  LAYER_CLASS,
  MARKER_CLASS,
  MARKER_FIXED_CLASS,
  MARKER_INACTIVE_CLASS,
  MARKER_MOVABLE_CLASS,
  MARKERS_EDITABLE,
  OPEN_PREFIX,
} from './constants'
import type { CameraMarkersProps } from './types'

/**
 * Les repères posés sur l'image d'une caméra : une icône de caméra par autre caméra, que l'on déplace en le glissant ; un clic (sans glisser) ouvre cette autre caméra ; un clic droit (ou un appui long) retire le repère. Tant que `MARKERS_EDITABLE` est à false, les places sont figées : ni glisser ni retirer, un clic ouvre seulement la caméra. Les places sont des parts de
 * l'image visible ; un repère peut être posé hors de la vidéo (dans le bloc qui l'entoure). Le glisser ne déclenche ni le zoom ni le déplacement de la vidéo.
 */
const CameraMarkers = ({ markers, onMove, onCommit, onRemove, onOpen, inactive = [] }: CameraMarkersProps) => {
  const layer = useRef<HTMLDivElement>(null)
  // Le repère en train d'être glissé : d'où il est parti, et s'il a vraiment bougé (sinon c'est un clic).
  const drag = useRef<{ target: string; startX: number; startY: number; moved: boolean } | null>(null)

  const place = (event: React.PointerEvent, target: string) => {
    const box = layer.current?.getBoundingClientRect()
    if (!box || box.width === 0 || box.height === 0) return
    onMove(target, (event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height)
  }

  return (
    <div ref={layer} className={LAYER_CLASS}>
      {markers.map((marker) => {
        // Une caméra inactive (éteinte) : son repère est grisé et ne fait rien.
        const off = inactive.includes(marker.target)
        return (
          <button
            key={marker.target}
            type="button"
            className={`${MARKER_CLASS} ${off ? MARKER_INACTIVE_CLASS : MARKERS_EDITABLE ? MARKER_MOVABLE_CLASS : MARKER_FIXED_CLASS}`}
            style={{ '--x': `${marker.x * 100}%`, '--y': `${marker.y * 100}%` } as React.CSSProperties}
            title={marker.target}
            aria-label={`${OPEN_PREFIX}${marker.target}`}
            onPointerDown={(event) => {
              // Seulement le bouton principal (ou le doigt) : le clic droit retire le repère, il n'ouvre rien.
              if (event.button !== 0) return
              event.stopPropagation()
              drag.current = { target: marker.target, startX: event.clientX, startY: event.clientY, moved: false }
              // Le doigt ou la souris reste attaché au repère même hors de lui ; sans capture possible, on glisse quand même tant qu'on reste dessus.
              try {
                event.currentTarget.setPointerCapture(event.pointerId)
              } catch {
                /* pas de capture : le glisser marche tant que le pointeur reste sur le repère */
              }
            }}
            onPointerMove={(event) => {
              const current = drag.current
              // Places figées (`MARKERS_EDITABLE` à false) : on ne glisse pas, un appui ouvre seulement la caméra.
              if (!MARKERS_EDITABLE || !current || current.target !== marker.target) return
              if (!current.moved && Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < DRAG_DISTANCE) return
              current.moved = true
              place(event, marker.target)
            }}
            onPointerUp={(event) => {
              const current = drag.current
              drag.current = null
              try {
                event.currentTarget.releasePointerCapture(event.pointerId)
              } catch {
                /* rien à relâcher */
              }
              if (!current || current.target !== marker.target) return
              if (current.moved) onCommit()
              else onOpen(marker.target)
            }}
            onContextMenu={(event) => {
              if (!MARKERS_EDITABLE) return
              event.preventDefault()
              drag.current = null
              onRemove(marker.target)
            }}
            onPointerCancel={() => {
              drag.current = null
            }}
          >
            {/* Le même rond que l'icône de la caméra sur la carte : fond blanc, bordure noire, caméra noire. */}
            <MapIcon label={marker.target}>
              <HiOutlineVideoCamera aria-hidden="true" />
            </MapIcon>
          </button>
        )
      })}
    </div>
  )
}

export default CameraMarkers
