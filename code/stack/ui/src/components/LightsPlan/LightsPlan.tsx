import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import {
  ACTIVE_NAME_CLASS,
  ACTIVE_NAME_POSITION,
  BULB_GROUP_CLASS,
  BULB_OFF_CLASS,
  BULB_OFF_UNREACHABLE_CLASS,
  BULB_ON_CLASS,
  BULB_ON_UNREACHABLE_CLASS,
  BIG_PLAN_CLASS,
  BULB_RADIUS,
  DRAG_THRESHOLD,
  BACK_ARROW,
  BACK_CLASS,
  EXPANDED_VIEW_WIDTH,
  FIGURE_CLASS,
  GARDEN,
  GARDEN_CLASS,
  GARDEN_LABEL,
  GARDEN_LABEL_POSITION,
  HOUSE_CLASS,
  HOUSE_HEIGHT,
  HOUSE_INSET,
  HOUSE_WIDTH,
  KEY_STEP,
  PLAN_CLASS,
  SIDE_CLASS,
  SIDE_LABEL,
  SIDE_LABEL_CLASS,
  SIDE_LABEL_POSITION,
  SIDE_ZONE,
  ROOM_CLASS,
  ROOM_LABEL_CLASS,
  ROOM_LABEL_OFFSET,
  SIDE_LAMP_NAME_CLASS,
  SIDE_LAMP_NAME_GAP,
  SCREEN_CLASS,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  VIEW_X,
  VIEW_Y,
  WALL_CLASS,
} from './constants'
import { EXPANDED_CLASS } from '../CameraCard/constants'
import { clampToPlan, toPlan } from './helpers'
import type { LightsPlanProps, PlanLamp } from './types'

/** Le glissement en cours : l'ampoule saisie, où le doigt a commencé, et si on a dépassé le seuil (donc ce n'est plus un clic). */
interface Drag {
  id: string
  startX: number
  startY: number
  moved: boolean
}

/** La classe du cercle d'une ampoule : allumée ou éteinte, et cerclée de rouge quand elle est injoignable. */
const bulbClass = (lamp: PlanLamp): string => {
  if (lamp.reachable) return lamp.on ? BULB_ON_CLASS : BULB_OFF_CLASS
  return lamp.on ? BULB_ON_UNREACHABLE_CLASS : BULB_OFF_UNREACHABLE_CLASS
}

/**
 * Le plan de la maison vu de dessus (aux proportions du rez-de-chaussée du site, 540 × 300, dans son jardin) avec une ampoule
 * par lampe : on la glisse pour la placer, on la touche pour l'allumer ou l'éteindre. Les positions sont au parent.
 */
const LightsPlan = ({ title, rooms, walls, lamps, onMove, onToggle, screen = false, gesture, onBack, backLabel = '' }: LightsPlanProps) => {
  // Sur l'écran du téléphone, le dessin s'arrête avant la zone « À placer ».
  const viewWidth = screen ? EXPANDED_VIEW_WIDTH : VIEW_WIDTH
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<Drag | null>(null)
  const [active, setActive] = useState<string | null>(null)

  const down = (event: PointerEvent<SVGGElement>, lamp: PlanLamp) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { id: lamp.id, startX: event.clientX, startY: event.clientY, moved: false }
    setActive(lamp.id)
  }

  const move = (event: PointerEvent<SVGGElement>) => {
    const current = drag.current
    const box = svg.current?.getBoundingClientRect()
    if (!current || !box) return
    // Le seuil se mesure en unités du plan, comme celui des caméras du site : un tremblement du doigt n'est pas un glissement.
    const scale = viewWidth / box.width
    if (!current.moved && Math.hypot(event.clientX - current.startX, event.clientY - current.startY) * scale <= DRAG_THRESHOLD) return
    current.moved = true
    // Sur l'écran du téléphone (parfois tourné d'un quart de tour), on ne déplace pas : seul un toucher allume ou éteint.
    if (screen) return
    const next = toPlan(event.clientX, event.clientY, box, viewWidth)
    onMove(current.id, next.x, next.y)
  }

  const up = (event: PointerEvent<SVGGElement>) => {
    const current = drag.current
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (current && !current.moved) onToggle(current.id)
  }

  // Au clavier : Entrée ou espace allume, les flèches déplacent.
  const key = (event: KeyboardEvent<SVGGElement>, lamp: PlanLamp) => {
    const step = { ArrowLeft: [-KEY_STEP, 0], ArrowRight: [KEY_STEP, 0], ArrowUp: [0, -KEY_STEP], ArrowDown: [0, KEY_STEP] }[event.key]
    if (step) {
      event.preventDefault()
      const next = clampToPlan(lamp.x + step[0], lamp.y + step[1])
      onMove(lamp.id, next.x, next.y)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onToggle(lamp.id)
    }
  }

  const activeLamp = lamps.find((lamp) => lamp.id === active)
  const plan = (
      <svg
        ref={svg}
        className={PLAN_CLASS}
        style={screen ? gesture?.style : undefined}
        viewBox={`${VIEW_X} ${VIEW_Y} ${viewWidth} ${VIEW_HEIGHT}`}
        role="group"
        aria-label={title}
        onPointerDown={(event) => {
          // Un toucher ailleurs que sur une ampoule efface le nom (au tactile, il n'y a pas de « souris qui quitte »).
          if (!(event.target as Element).closest('[role="button"]')) setActive(null)
        }}
      >
        <rect className={GARDEN_CLASS} x={GARDEN.x} y={GARDEN.y} width={GARDEN.w} height={GARDEN.h} />
        <text className={ROOM_LABEL_CLASS} x={GARDEN_LABEL_POSITION.x} y={GARDEN_LABEL_POSITION.y}>
          {GARDEN_LABEL}
        </text>
        <rect className={HOUSE_CLASS} x={HOUSE_INSET} y={HOUSE_INSET} width={HOUSE_WIDTH - 2 * HOUSE_INSET} height={HOUSE_HEIGHT - 2 * HOUSE_INSET} />
        {screen ? null : (
          <>
            <rect className={SIDE_CLASS} x={SIDE_ZONE.x} y={SIDE_ZONE.y} width={SIDE_ZONE.w} height={SIDE_ZONE.h} />
            <text className={SIDE_LABEL_CLASS} x={SIDE_LABEL_POSITION.x} y={SIDE_LABEL_POSITION.y}>
              {SIDE_LABEL}
            </text>
          </>
        )}
        {rooms.map((room) => (
          <g key={room.name}>
            {room.outline ? (
              <path className={ROOM_CLASS} d={room.outline} />
            ) : (
              room.rects.map((rect) => <rect key={`${rect.x}-${rect.y}`} className={ROOM_CLASS} x={rect.x} y={rect.y} width={rect.w} height={rect.h} />)
            )}
            <text className={ROOM_LABEL_CLASS} x={room.rects[0].x + ROOM_LABEL_OFFSET.x} y={room.rects[0].y + ROOM_LABEL_OFFSET.y}>
              {room.name}
            </text>
          </g>
        ))}
        {walls.map((wall) => (
          <line key={`${wall.x1}-${wall.y1}-${wall.x2}-${wall.y2}`} className={wall.screen ? SCREEN_CLASS : WALL_CLASS} x1={wall.x1} y1={wall.y1} x2={wall.x2} y2={wall.y2} />
        ))}
        {lamps.map((lamp) => (
          <g
            key={lamp.id}
            className={BULB_GROUP_CLASS}
            role="button"
            tabIndex={0}
            aria-label={lamp.name}
            aria-pressed={lamp.on}
            onPointerDown={(event) => down(event, lamp)}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onPointerEnter={() => setActive(lamp.id)}
            onPointerLeave={(event) => {
              // La souris quitte l'ampoule : son nom part (sauf pendant un glissement).
              if (event.pointerType === 'mouse' && !drag.current) setActive(null)
            }}
            onFocus={() => setActive(lamp.id)}
            onBlur={() => setActive(null)}
            onKeyDown={(event) => key(event, lamp)}
          >
            {/* Une ampoule qui attend dans la zone « À placer » garde son nom écrit : on sait laquelle on déplace. */}
            {lamp.x >= SIDE_ZONE.x ? (
              <text className={SIDE_LAMP_NAME_CLASS} x={lamp.x} y={lamp.y - BULB_RADIUS - SIDE_LAMP_NAME_GAP}>
                {lamp.name}
              </text>
            ) : null}
            <circle className={bulbClass(lamp)} cx={lamp.x} cy={lamp.y} r={BULB_RADIUS} />
          </g>
        ))}
        {/* Le nom de l'ampoule survolée ou touchée, toujours en bas du jardin, centré. */}
        <text className={ACTIVE_NAME_CLASS} x={ACTIVE_NAME_POSITION.x} y={ACTIVE_NAME_POSITION.y}>
          {activeLamp?.name ?? ''}
        </text>
      </svg>
  )
  if (!screen) return <figure className={FIGURE_CLASS}>{plan}</figure>
  // Un doigt sur une ampoule l'allume : seuls les gestes commencés ailleurs servent au zoom.
  const handlers = gesture?.handlers
  const zoom = handlers && {
    ...handlers,
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (!(event.target as Element).closest('[role="button"]')) handlers.onPointerDown?.(event)
    },
  }
  return (
    <figure className={EXPANDED_CLASS}>
      <div className={BIG_PLAN_CLASS} {...zoom}>
        {plan}
      </div>
      {onBack ? (
        <button type="button" className={BACK_CLASS} aria-label={backLabel} title={backLabel} onClick={onBack}>
          {BACK_ARROW}
        </button>
      ) : null}
    </figure>
  )
}

export default LightsPlan
