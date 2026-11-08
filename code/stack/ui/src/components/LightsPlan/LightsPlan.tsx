import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import {
  ACTIVE_NAME_CLASS,
  ACTIVE_NAME_POSITION,
  BULB_GROUP_CLASS,
  CAGE_CLASS,
  CAGE_FILL_CLASS,
  ROOF_CLASS,
  TERRACE_CLASS,
  CONCRETE_CLASS,
  GATE_CLASS,
  HEDGE_CLASS,
  HEDGE_HANDLE_LABEL,
  HEDGE_LABEL,
  HEDGE_MOVABLE_CLASS,
  HEDGE_SELECTED_CLASS,
  TREE_HANDLE_LABEL,
  TREE_RADIUS_MAX,
  TREE_RADIUS_MIN,
  FOV_CLASS,
  CAMERA_HANDLE_CLASS,
  CAMERA_FAR_MAX,
  CAMERA_FAR_MIN,
  CAMERA_FOV_MAX,
  CAMERA_FOV_MIN,
  CAMERA_HANDLE_DISTANCE,
  CAMERA_HANDLE_RATIO,
  CAMERA_HANDLE_LABEL,
  CAMERA_HANDLE_RADIUS,
  CAMERA_ICON_GLYPH_CLASS,
  CAMERA_ICON_OFF_CLASS,
  PLUG_GROUP_CLASS,
  PLUG_OFF_CLASS,
  PLUG_OFF_TEXT,
  PLUG_ON_CLASS,
  PLUG_ON_TEXT,
  PLUG_SIZE,
  CAMERA_ICON_PATH,
  CAMERA_ICON_SIZE,
  CAMERA_HIT_CLASS,
  CAMERA_HIT_RADIUS,
  CAMERA_ICON_CLASS,
  TREE_SELECTED_CLASS,
  TREE_CLASS,
  TREE_LABEL,
  TREE_STATIC_CLASS,
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
import { clampToPlan, fieldOfView, tileArea, toPlan, treeFill, planScale, pointerInPlan } from './helpers'
import type { LightsPlanProps, PlanLamp, PlanTree, PlanHedge } from './types'

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
const LightsPlan = ({
  title,
  rooms,
  walls,
  lamps,
  onMove,
  onToggle,
  screen = false,
  bare = false,
  cage,
  cageLabel = '',
  gardenOutline,
  view,
  roof = false,
  terrace = 0,
  houseShift = 0,
  houseHeight = HOUSE_HEIGHT,
  floors = [],
  floorPaths = [],
  extension,
  concreteNorth = false,
  selectedTreeId,
  onSelectTree,
  onResizeTree,
  gates = [],
  hedges = [],
  selectedHedgeId,
  onSelectHedge,
  onMoveHedge,
  cameras = [],
  selectedCameraId,
  onSelectCamera,
  onMoveCamera,
  onAdjustCamera,
  plugs = [],
  lampRadius = BULB_RADIUS,
  onMovePlug,
  paths = [],
  trees = [],
  onMoveTree,
  gesture,
  onBack,
  backLabel = '',
}: LightsPlanProps) => {
  // Sur l'écran du téléphone, le dessin s'arrête avant la zone « À placer ».
  const viewWidth = screen || bare ? EXPANDED_VIEW_WIDTH : VIEW_WIDTH
  const svg = useRef<SVGSVGElement>(null)
  // Le pointeur dans les unités du plan (par la matrice du SVG : juste même posé tourné sur une carte).
  const planPoint = (clientX: number, clientY: number) => pointerInPlan(svg.current, clientX, clientY)
  const drag = useRef<Drag | null>(null)
  const [active, setActive] = useState<string | null>(null)

  // Une caméra : un clic la sélectionne (son champ de vision s'affiche), un glissement (au-delà du seuil) la déplace.
  const cameraDrag = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null)
  const cameraDown = (event: PointerEvent<SVGGElement>, id: string) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    cameraDrag.current = { id, startX: event.clientX, startY: event.clientY, moved: false }
  }
  const cameraMove = (event: PointerEvent<SVGGElement>) => {
    const current = cameraDrag.current
    const box = svg.current?.getBoundingClientRect()
    if (!current || !box || !onMoveCamera || screen) return
    const area = view ?? { x: VIEW_X, y: VIEW_Y, w: viewWidth, h: VIEW_HEIGHT }
    const scale = planScale(svg.current)
    if (!current.moved && Math.hypot(event.clientX - current.startX, event.clientY - current.startY) * scale <= DRAG_THRESHOLD) return
    current.moved = true
    const { x, y } = planPoint(event.clientX, event.clientY)
    onMoveCamera(
      current.id,
      Math.round(Math.min(area.x + area.w, Math.max(area.x, x))),
      Math.round(Math.min(area.y + area.h, Math.max(area.y, y))),
    )
  }
  const cameraUp = (event: PointerEvent<SVGGElement>) => {
    const current = cameraDrag.current
    cameraDrag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (current && !current.moved) onSelectCamera?.(current.id)
  }
  const cameraCancel = (event: PointerEvent<SVGGElement>) => {
    cameraDrag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  // La poignée d'une caméra, devant son icône : la glisser règle la caméra (direction, longueur et écartement de sa vue).
  const adjusting = useRef<{ id: string; far: number; fov: number } | null>(null)
  const handleDown = (event: PointerEvent<SVGCircleElement>, camera: { id: string; far: number; fov: number }) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    adjusting.current = { id: camera.id, far: camera.far, fov: camera.fov }
  }
  const handleMove = (event: PointerEvent<SVGCircleElement>, camera: { x: number; y: number }) => {
    event.stopPropagation()
    const box = svg.current?.getBoundingClientRect()
    const start = adjusting.current
    if (start === null || !box || !onAdjustCamera) return
    const point = planPoint(event.clientX, event.clientY)
    const dx = point.x - camera.x
    const dy = point.y - camera.y
    if (dx === 0 && dy === 0) return
    // La poignée est à CAMERA_HANDLE_RATIO de la longueur de la vue : sa distance donne la longueur ; l'écartement suit (même proportion).
    const far = Math.round(Math.min(CAMERA_FAR_MAX, Math.max(CAMERA_FAR_MIN, Math.hypot(dx, dy) / CAMERA_HANDLE_RATIO)))
    const fov = Math.round(Math.min(CAMERA_FOV_MAX, Math.max(CAMERA_FOV_MIN, (start.fov * far) / start.far)))
    onAdjustCamera(start.id, { angle: Math.round((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360, far, fov })
  }
  const handleUp = (event: PointerEvent<SVGCircleElement>) => {
    event.stopPropagation()
    adjusting.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  // Une prise : on l'attrape et elle suit le pointeur (hors écran du téléphone).
  const plugDrag = useRef<string | null>(null)
  const plugDown = (event: PointerEvent<SVGGElement>, id: string) => {
    if (screen || !onMovePlug) return
    event.currentTarget.setPointerCapture(event.pointerId)
    plugDrag.current = id
  }
  const plugMove = (event: PointerEvent<SVGGElement>) => {
    const box = svg.current?.getBoundingClientRect()
    if (plugDrag.current === null || !box || !onMovePlug) return
    const area = view ?? { x: VIEW_X, y: VIEW_Y, w: viewWidth, h: VIEW_HEIGHT }
    const { x, y } = planPoint(event.clientX, event.clientY)
    onMovePlug(
      plugDrag.current,
      Math.round(Math.min(area.x + area.w, Math.max(area.x, x))),
      Math.round(Math.min(area.y + area.h, Math.max(area.y, y))),
    )
  }
  const plugUp = (event: PointerEvent<SVGGElement>) => {
    plugDrag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  // L'arbre saisi : il suit le pointeur tant qu'il est tenu.
  const treeDrag = useRef<string | null>(null)
  const treeDown = (event: PointerEvent<SVGCircleElement>, tree: PlanTree) => {
    if (screen || !onMoveTree) return
    event.currentTarget.setPointerCapture(event.pointerId)
    treeDrag.current = tree.id
    onSelectTree?.(tree.id)
  }
  const treeMove = (event: PointerEvent<SVGCircleElement>) => {
    const box = svg.current?.getBoundingClientRect()
    if (treeDrag.current === null || !box || !onMoveTree) return
    // Un arbre reste dans la zone dessinée (celle du terrain si `view` est donnée).
    const area = view ?? { x: VIEW_X, y: VIEW_Y, w: viewWidth, h: VIEW_HEIGHT }
    const { x, y } = planPoint(event.clientX, event.clientY)
    onMoveTree(
      treeDrag.current,
      Math.round(Math.min(area.x + area.w, Math.max(area.x, x))),
      Math.round(Math.min(area.y + area.h, Math.max(area.y, y))),
    )
  }
  const treeUp = (event: PointerEvent<SVGCircleElement>) => {
    treeDrag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  // La poignée sur le bord de l'arbre choisi : sa distance au centre devient le rayon.
  const treeResize = useRef<string | null>(null)
  const treeHandleDown = (event: PointerEvent<SVGCircleElement>, tree: PlanTree) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    treeResize.current = tree.id
  }
  const treeHandleMove = (event: PointerEvent<SVGCircleElement>, tree: PlanTree) => {
    event.stopPropagation()
    if (treeResize.current !== tree.id || !onResizeTree) return
    const point = planPoint(event.clientX, event.clientY)
    onResizeTree(tree.id, Math.round(Math.min(TREE_RADIUS_MAX, Math.max(TREE_RADIUS_MIN, Math.hypot(point.x - tree.x, point.y - tree.y)))))
  }
  const treeHandleUp = (event: PointerEvent<SVGCircleElement>) => {
    event.stopPropagation()
    treeResize.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  // Une haie : un clic la choisit (ses sommets apparaissent), un glissement la déplace entière ; un sommet de la haie choisie se glisse seul.
  const hedgeDrag = useRef<{ id: string; from: { x: number; y: number }; points: [number, number][]; moved: boolean } | null>(null)
  const hedgeDown = (event: PointerEvent<SVGPolylineElement>, hedge: PlanHedge) => {
    if (screen || !onMoveHedge) return
    event.currentTarget.setPointerCapture(event.pointerId)
    hedgeDrag.current = { id: hedge.id, from: planPoint(event.clientX, event.clientY), points: hedge.points, moved: false }
  }
  const hedgeMove = (event: PointerEvent<SVGPolylineElement>) => {
    const current = hedgeDrag.current
    if (!current || !onMoveHedge) return
    const point = planPoint(event.clientX, event.clientY)
    const dx = point.x - current.from.x
    const dy = point.y - current.from.y
    if (!current.moved && Math.hypot(dx, dy) <= DRAG_THRESHOLD) return
    current.moved = true
    onMoveHedge(
      current.id,
      current.points.map(([x, y]) => [Math.round(x + dx), Math.round(y + dy)]),
    )
  }
  const hedgeUp = (event: PointerEvent<SVGPolylineElement>) => {
    const current = hedgeDrag.current
    hedgeDrag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (current && !current.moved) onSelectHedge?.(current.id)
  }
  const hedgeVertex = useRef<{ id: string; index: number } | null>(null)
  const vertexDown = (event: PointerEvent<SVGCircleElement>, hedge: PlanHedge, index: number) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    hedgeVertex.current = { id: hedge.id, index }
  }
  const vertexMove = (event: PointerEvent<SVGCircleElement>, hedge: PlanHedge) => {
    event.stopPropagation()
    const current = hedgeVertex.current
    if (!current || current.id !== hedge.id || !onMoveHedge) return
    const point = planPoint(event.clientX, event.clientY)
    onMoveHedge(
      hedge.id,
      hedge.points.map((old, index) => (index === current.index ? [Math.round(point.x), Math.round(point.y)] : old)),
    )
  }
  const vertexUp = (event: PointerEvent<SVGCircleElement>) => {
    event.stopPropagation()
    hedgeVertex.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

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
    const scale = planScale(svg.current)
    if (!current.moved && Math.hypot(event.clientX - current.startX, event.clientY - current.startY) * scale <= DRAG_THRESHOLD) return
    current.moved = true
    // Sur l'écran du téléphone (parfois tourné d'un quart de tour), on ne déplace pas : seul un toucher allume ou éteint.
    if (screen) return
    if (view) {
      // Zone dessinée sur mesure : l'ampoule reste entière dedans.
      const { x, y } = planPoint(event.clientX, event.clientY)
      onMove(
        current.id,
        Math.round(Math.min(view.x + view.w - BULB_RADIUS, Math.max(view.x + BULB_RADIUS, x))),
        Math.round(Math.min(view.y + view.h - BULB_RADIUS, Math.max(view.y + BULB_RADIUS, y))),
      )
      return
    }
    const next = toPlan(event.clientX, event.clientY, box, viewWidth)
    onMove(current.id, next.x, next.y)
  }

  const up = (event: PointerEvent<SVGGElement>) => {
    const current = drag.current
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (current && !current.moved) onToggle(current.id)
  }

  // Le navigateur reprend le geste (défilement, pincement) : ce n'est pas un toucher, rien ne s'allume.
  const cancel = (event: PointerEvent<SVGGElement>) => {
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
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
      viewBox={view ? `${view.x} ${view.y} ${view.w} ${view.h}` : `${VIEW_X} ${VIEW_Y} ${viewWidth} ${VIEW_HEIGHT}`}
      role="group"
      aria-label={title}
      onPointerDown={(event) => {
        // Un toucher ailleurs que sur une ampoule efface le nom (au tactile, il n'y a pas de « souris qui quitte »).
        if (!(event.target as Element).closest('[role="button"]')) {
          setActive(null)
          // Un clic à côté des caméras les désélectionne (id vide).
          onSelectCamera?.('')
        }
      }}
    >
      {gardenOutline ? (
        <path className={GARDEN_CLASS} d={gardenOutline} />
      ) : (
        <rect className={GARDEN_CLASS} x={GARDEN.x} y={GARDEN.y} width={GARDEN.w} height={GARDEN.h} />
      )}
      {gardenOutline ? null : (
        <text className={ROOM_LABEL_CLASS} x={GARDEN_LABEL_POSITION.x} y={GARDEN_LABEL_POSITION.y}>
          {GARDEN_LABEL}
        </text>
      )}
      {paths.map((path) => (
        <path key={path} className={CONCRETE_CLASS} d={path} />
      ))}
      {terrace > 0 || floors.length > 0 || floorPaths.length > 0 ? (
        <path className={TERRACE_CLASS} d={tileArea(terrace, houseShift, floors, floorPaths, houseHeight)} />
      ) : null}
      {/* La cage (intérieur rouge pastel et contour rouge) passe sous tout le reste : les caméras et les objets connectés (lampe, prise) sont dessus. */}
      {cage ? (
        <>
          <rect className={CAGE_FILL_CLASS} x={cage.x} y={cage.y} width={cage.w} height={cage.h} />
          <rect className={CAGE_CLASS} x={cage.x} y={cage.y} width={cage.w} height={cage.h} rx={2}>
            {cageLabel ? <title>{cageLabel}</title> : null}
          </rect>
        </>
      ) : null}
      <g transform={`translate(${houseShift} 0)`}>
        {terrace > 0 && concreteNorth ? (
          <rect className={CONCRETE_CLASS} x={-terrace} y={-terrace} width={HOUSE_WIDTH + terrace} height={terrace} />
        ) : null}
        {extension ? (
          // Le toit et l'avancée ne font qu'une forme : un seul contour, sans trait entre les deux.
          <path
            className={roof ? ROOF_CLASS : HOUSE_CLASS}
            d={`M ${HOUSE_INSET} ${HOUSE_INSET} H ${HOUSE_WIDTH - HOUSE_INSET} V ${extension.y} H ${extension.x + extension.w} V ${extension.y + extension.h} H ${HOUSE_WIDTH - HOUSE_INSET} V ${houseHeight - HOUSE_INSET} H ${HOUSE_INSET} Z`}
          />
        ) : (
          <rect
            className={roof ? ROOF_CLASS : HOUSE_CLASS}
            x={HOUSE_INSET}
            y={HOUSE_INSET}
            width={HOUSE_WIDTH - 2 * HOUSE_INSET}
            height={houseHeight - 2 * HOUSE_INSET}
          />
        )}
      </g>
      {screen || bare ? null : (
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
            room.rects.map((rect) => (
              <rect key={`${rect.x}-${rect.y}`} className={ROOM_CLASS} x={rect.x} y={rect.y} width={rect.w} height={rect.h} />
            ))
          )}
          <text className={ROOM_LABEL_CLASS} x={room.rects[0].x + ROOM_LABEL_OFFSET.x} y={room.rects[0].y + ROOM_LABEL_OFFSET.y}>
            {room.name}
          </text>
        </g>
      ))}
      {walls.map((wall) => (
        <line
          key={`${wall.x1}-${wall.y1}-${wall.x2}-${wall.y2}`}
          className={wall.screen ? SCREEN_CLASS : WALL_CLASS}
          x1={wall.x1}
          y1={wall.y1}
          x2={wall.x2}
          y2={wall.y2}
        />
      ))}
      {hedges.map((hedge) => (
        <polyline
          key={hedge.id}
          className={hedge.id === selectedHedgeId ? HEDGE_SELECTED_CLASS : onMoveHedge && !screen ? HEDGE_MOVABLE_CLASS : HEDGE_CLASS}
          points={hedge.points.map(([x, y]) => `${x},${y}`).join(' ')}
          onPointerDown={(event) => hedgeDown(event, hedge)}
          onPointerMove={hedgeMove}
          onPointerUp={hedgeUp}
          onPointerCancel={hedgeUp}
        >
          <title>{HEDGE_LABEL}</title>
        </polyline>
      ))}
      {/* Les sommets de la haie choisie : des poignées, une par sommet. */}
      {hedges
        .filter((hedge) => hedge.id === selectedHedgeId && onMoveHedge && !screen)
        .map((hedge) =>
          hedge.points.map(([x, y], index) => (
            <circle
              key={`${hedge.id}-${index}`}
              className={CAMERA_HANDLE_CLASS}
              cx={x}
              cy={y}
              r={CAMERA_HANDLE_RADIUS}
              onPointerDown={(event) => vertexDown(event, hedge, index)}
              onPointerMove={(event) => vertexMove(event, hedge)}
              onPointerUp={vertexUp}
              onPointerCancel={vertexUp}
            >
              <title>{HEDGE_HANDLE_LABEL}</title>
            </circle>
          )),
        )}
      {gates.map((gate) => (
        <line key={gate.id} className={GATE_CLASS} x1={gate.x1} y1={gate.y1} x2={gate.x2} y2={gate.y2}>
          <title>{gate.name}</title>
        </line>
      ))}
      {trees.map((tree) => (
        <circle
          key={tree.id}
          className={tree.id === selectedTreeId ? TREE_SELECTED_CLASS : onMoveTree && !screen ? TREE_CLASS : TREE_STATIC_CLASS}
          cx={tree.x}
          cy={tree.y}
          style={{ fill: treeFill(tree.r) }}
          r={tree.r}
          onPointerDown={(event) => treeDown(event, tree)}
          onPointerMove={treeMove}
          onPointerUp={treeUp}
          onPointerCancel={treeUp}
        >
          <title>{TREE_LABEL}</title>
        </circle>
      ))}
      {/* La poignée de l'arbre choisi, sur son bord droit : la glisser change sa taille. */}
      {trees
        .filter((tree) => tree.id === selectedTreeId && onResizeTree && !screen)
        .map((tree) => (
          <circle
            key={`${tree.id}-handle`}
            className={CAMERA_HANDLE_CLASS}
            cx={tree.x + tree.r}
            cy={tree.y}
            r={CAMERA_HANDLE_RADIUS}
            onPointerDown={(event) => treeHandleDown(event, tree)}
            onPointerMove={(event) => treeHandleMove(event, tree)}
            onPointerUp={treeHandleUp}
            onPointerCancel={treeHandleUp}
          >
            <title>{TREE_HANDLE_LABEL}</title>
          </circle>
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
          onPointerCancel={cancel}
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
          {!bare && lamp.x >= SIDE_ZONE.x ? (
            <text className={SIDE_LAMP_NAME_CLASS} x={lamp.x} y={lamp.y - BULB_RADIUS - SIDE_LAMP_NAME_GAP}>
              {lamp.name}
            </text>
          ) : null}
          <circle className={bulbClass(lamp)} cx={lamp.x} cy={lamp.y} r={lampRadius} />
        </g>
      ))}
      {/* Le nom de l'ampoule survolée ou touchée, toujours en bas du jardin, centré (pas sur le plan nu). */}
      {bare ? null : (
        <text className={ACTIVE_NAME_CLASS} x={ACTIVE_NAME_POSITION.x} y={ACTIVE_NAME_POSITION.y}>
          {activeLamp?.name ?? ''}
        </text>
      )}
      {plugs.map((plug) => (
        <g
          key={plug.id}
          className={onMovePlug && !screen ? PLUG_GROUP_CLASS : undefined}
          onPointerDown={(event) => plugDown(event, plug.id)}
          onPointerMove={plugMove}
          onPointerUp={plugUp}
          onPointerCancel={plugUp}
        >
          <rect
            className={plug.on ? PLUG_ON_CLASS : PLUG_OFF_CLASS}
            x={plug.x - PLUG_SIZE / 2}
            y={plug.y - PLUG_SIZE / 2}
            width={PLUG_SIZE}
            height={PLUG_SIZE}
            rx={4}
          >
            <title>{`${plug.name} : ${plug.on ? PLUG_ON_TEXT : PLUG_OFF_TEXT}`}</title>
          </rect>
        </g>
      ))}
      {/* Les caméras sont dessinées en dernier : au-dessus de tout le reste. */}
      {cameras.map((camera) => (
        <g
          key={camera.id}
          className={onSelectCamera ? CAMERA_ICON_CLASS : undefined}
          role="button"
          tabIndex={0}
          aria-label={camera.name}
          aria-pressed={camera.id === selectedCameraId}
          onPointerDown={(event) => cameraDown(event, camera.id)}
          onPointerMove={cameraMove}
          onPointerUp={cameraUp}
          onPointerCancel={cameraCancel}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onSelectCamera?.(camera.id)
            }
          }}
        >
          {camera.id === selectedCameraId ? (
            <path className={FOV_CLASS} d={fieldOfView(camera.x, camera.y, camera.angle, camera.fov, camera.near, camera.far)} />
          ) : null}
          <circle className={CAMERA_HIT_CLASS} cx={camera.x} cy={camera.y} r={CAMERA_HIT_RADIUS} />
          {/* L'icône (en SVG, pointe vers la droite à 0°) tournée vers où la caméra regarde : 0° = haut, donc -90°. */}
          <g transform={`translate(${camera.x} ${camera.y}) rotate(${camera.angle - 90}) scale(${CAMERA_ICON_SIZE / 16}) translate(-8 -8)`}>
            <path className={camera.off ? CAMERA_ICON_OFF_CLASS : CAMERA_ICON_GLYPH_CLASS} d={CAMERA_ICON_PATH} />
          </g>
          {camera.id === selectedCameraId && onAdjustCamera && !screen ? (
            <circle
              className={CAMERA_HANDLE_CLASS}
              cx={camera.x + Math.max(CAMERA_HANDLE_DISTANCE, camera.far * CAMERA_HANDLE_RATIO) * Math.sin((camera.angle * Math.PI) / 180)}
              cy={camera.y - Math.max(CAMERA_HANDLE_DISTANCE, camera.far * CAMERA_HANDLE_RATIO) * Math.cos((camera.angle * Math.PI) / 180)}
              r={CAMERA_HANDLE_RADIUS}
              onPointerDown={(event) => handleDown(event, camera)}
              onPointerMove={(event) => handleMove(event, camera)}
              onPointerUp={handleUp}
              onPointerCancel={handleUp}
            >
              <title>{CAMERA_HANDLE_LABEL}</title>
            </circle>
          ) : null}
          <title>{camera.name}</title>
        </g>
      ))}
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
