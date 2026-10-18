import {
  AREA_LABEL_CLASS,
  DOOR,
  DOOR_CLASS,
  EARTH_CLASS,
  EARTH_LABEL_CLASS,
  GARDEN,
  GARDEN_CLASS,
  GARDEN_LABEL,
  GATE,
  GATE_CLASS,
  GATE_LABEL,
  HOUSE,
  HOUSE_CLASS,
  NICHOIR,
  NICHOIR_CLASS,
  NICHOIR_LABEL_CLASS,
  PATH,
  PATH_CLASS,
  ROOM_CLASS,
  ROOM_LABEL_CLASS,
  ROOM_LABEL_OFFSET,
  STAIRS,
  STEP_CLASS,
} from './constants'
import { toBox } from './helpers'
import type { HousePlanUIProps } from './types'

const HousePlanUI = ({ floor, rooms, steps }: HousePlanUIProps) => {
  const ground = floor === 'rdc'
  return (
    <g className="pointer-events-none" aria-hidden="true">
      {/* terrain : jardin au rez-de-chaussée, terre au sous-sol */}
      <rect {...toBox(GARDEN)} rx="18" className={ground ? GARDEN_CLASS : EARTH_CLASS} />
      <text x={GARDEN_LABEL.x} y={GARDEN_LABEL.y} className={ground ? AREA_LABEL_CLASS : EARTH_LABEL_CLASS}>
        {ground ? 'Jardin' : 'Sous-sol'}
      </text>

      {ground && (
        <>
          {/* chemin, porte et portail */}
          <rect {...toBox(PATH)} className={PATH_CLASS} />
          <line x1={GATE.x} y1={GATE.leaf1[0]} x2={GATE.x} y2={GATE.leaf1[1]} className={GATE_CLASS} />
          <line x1={GATE.x} y1={GATE.leaf2[0]} x2={GATE.x} y2={GATE.leaf2[1]} className={GATE_CLASS} />
          <text x={GATE_LABEL.x} y={GATE_LABEL.y} textAnchor="middle" className={ROOM_LABEL_CLASS}>Portail</text>

          {/* nichoir */}
          <rect {...toBox(NICHOIR)} rx="4" className={NICHOIR_CLASS} />
          <text x={NICHOIR.x + NICHOIR.w / 2} y={NICHOIR.y + 18} textAnchor="middle" className={NICHOIR_LABEL_CLASS}>
            Nichoir
          </text>
        </>
      )}

      {/* maison */}
      <rect {...toBox(HOUSE)} className={HOUSE_CLASS} />
      {rooms.map((r) => (
        <g key={r.name}>
          {r.outline ? (
            <path d={r.outline} className={ROOM_CLASS} />
          ) : (
            <rect {...toBox(r.rects[0])} className={ROOM_CLASS} />
          )}
          <text x={r.rects[0].x + ROOM_LABEL_OFFSET.x} y={r.rects[0].y + ROOM_LABEL_OFFSET.y} className={ROOM_LABEL_CLASS}>
            {r.name}
          </text>
        </g>
      ))}
      {ground && <line x1={DOOR.x} y1={DOOR.y1} x2={DOOR.x} y2={DOOR.y2} className={DOOR_CLASS} />}

      {/* marches de l'escalier */}
      {steps.map((y) => (
        <line key={y} x1={STAIRS.x + 14} y1={y + 6} x2={STAIRS.x + STAIRS.w - 14} y2={y + 6} className={STEP_CLASS} />
      ))}
    </g>
  )
}

export default HousePlanUI
