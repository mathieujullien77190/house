// Prendre un élément du plan à la souris (ou au doigt) sur la carte : caméra (la déplacer, la choisir), sa poignée (tourner, allonger), arbre et sa poignée (taille),
// haie (la déplacer, ses sommets), lampe et prise (les déplacer). Pendant qu'on tient un élément la carte ne bouge pas.
import type { Map as MapLibreMap, MapMouseEvent, MapTouchEvent } from 'maplibre-gl'
import type { PlanCamera, PlanHedge, PlanTree } from '@house/ui'
import { INTERACTIVE_LAYERS } from './layers'
import { lngLatToPlan, type Point } from './projection'

/** Le plan vu par l'édition : les éléments à jour et ce qu'on en fait. Lu à chaque geste (il change à chaque rendu). */
export interface EditContext {
  cameras: PlanCamera[]
  trees: PlanTree[]
  hedges: PlanHedge[]
  onMoveCamera?: (id: string, x: number, y: number) => void
  onAdjustCamera?: (id: string, setting: { angle: number; far: number; fov: number }) => void
  onSelectCamera?: (id: string) => void
  onMoveTree?: (id: string, x: number, y: number) => void
  onResizeTree?: (id: string, r: number) => void
  onSelectTree?: (id: string) => void
  onMoveHedge?: (id: string, points: [number, number][]) => void
  onSelectHedge?: (id: string) => void
  /** Le chemin du garage et les portes : leur décalage actuel, et le rappel (identifiant, nouveau décalage) quand on les déplace. */
  offsets: Record<string, { dx: number; dy: number }>
  onMoveOffset?: (id: string, dx: number, dy: number) => void
  /** La cage à perruches : sa place (coin haut gauche) et le rappel quand on la déplace. */
  cage: { x: number; y: number; w: number; h: number }
  onMoveCage?: (x: number, y: number) => void
  onMoveLamp?: (id: string, x: number, y: number) => void
  /** Un toucher (sans glisser) sur une ampoule : l'allumer ou l'éteindre. */
  onToggleLamp?: (id: string) => void
  /** L'ampoule survolée ou touchée (vide : aucune), dont la carte écrit le nom. */
  onHoverLamp?: (id: string) => void
  onMovePlug?: (id: string, x: number, y: number) => void
}

/** Les bornes du réglage d'une caméra (comme sur le plan seul) et du rayon d'un arbre. */
const FAR_MIN = 60
const FAR_MAX = 700
const FOV_MIN = 10
const FOV_MAX = 140
const HANDLE_RATIO = 0.12
const RADIUS_MIN = 5
const RADIUS_MAX = 400
/** Un glissement commence au-delà de ce nombre de pixels : en deçà c'est un clic. */
const MOVE_THRESHOLD = 4

interface Grab {
  kind: string
  id: string
  index: number
  screen: { x: number; y: number }
  start: Point
  moved: boolean
  /** Les sommets d'une haie, ou le réglage d'une caméra, au moment de la saisie. */
  hedge?: [number, number][]
  camera?: { far: number; fov: number }
  /** La place de la cage et le décalage du chemin ou de la porte saisis, à la saisie. */
  cage?: { x: number; y: number }
  offset?: { dx: number; dy: number }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const attachEditing = (map: MapLibreMap, context: () => EditContext): (() => void) => {
  let grab: Grab | null = null
  // Un clic qui finit un glissement ne doit pas tout désélectionner.
  let justDragged = false

  const pick = (point: { x: number; y: number }) => {
    const found = map.queryRenderedFeatures([point.x, point.y], { layers: [...INTERACTIVE_LAYERS].filter((id) => map.getLayer(id)) })
    for (const layer of INTERACTIVE_LAYERS) {
      const hit = found.find((feature) => feature.layer.id === layer)
      if (hit) return hit.properties
    }
    return null
  }

  const down = (event: MapMouseEvent | MapTouchEvent) => {
    if ('points' in event && event.points.length > 1) return
    const properties = pick(event.point)
    if (!properties) return
    const kind = String(properties.kind).replace(/-hit$/, '')
    const id = String(properties.id)
    const index = Number(properties.index ?? 0)
    const here = context()
    const handlers: Record<string, unknown> = {
      camera: here.onMoveCamera,
      'camera-handle': here.onAdjustCamera,
      tree: here.onMoveTree,
      'tree-handle': here.onResizeTree,
      hedge: here.onMoveHedge,
      cage: here.onMoveCage,
      garage: here.onMoveOffset,
      gate: here.onMoveOffset,
      'hedge-vertex': here.onMoveHedge,
      lamp: here.onMoveLamp ?? here.onToggleLamp,
      plug: here.onMovePlug,
    }
    if (kind === 'tree') here.onSelectTree?.(id)
    if (!handlers[kind] && kind !== 'camera') return
    event.preventDefault()
    const camera = here.cameras.find((item) => item.id === id)
    grab = {
      kind,
      id,
      index,
      screen: { x: event.point.x, y: event.point.y },
      start: lngLatToPlan(event.lngLat.lng, event.lngLat.lat),
      moved: false,
      hedge: here.hedges.find((item) => item.id === id)?.points,
      camera: camera ? { far: camera.far, fov: camera.fov } : undefined,
      cage: { x: here.cage.x, y: here.cage.y },
      offset: here.offsets[id] ?? { dx: 0, dy: 0 },
    }
    map.getCanvas().style.cursor = 'grabbing'
  }

  const move = (event: MapMouseEvent | MapTouchEvent) => {
    if (!grab) {
      if (!('points' in event)) {
        const hit = pick(event.point)
        const lamp = hit?.kind === 'lamp-hit'
        map.getCanvas().style.cursor = hit ? (lamp && !context().onMoveLamp ? 'pointer' : 'grab') : ''
        context().onHoverLamp?.(lamp ? String(hit?.id) : '')
      }
      return
    }
    if (!grab.moved && Math.hypot(event.point.x - grab.screen.x, event.point.y - grab.screen.y) <= MOVE_THRESHOLD) return
    grab.moved = true
    const [x, y] = lngLatToPlan(event.lngLat.lng, event.lngLat.lat)
    const here = context()
    const round = Math.round
    if (grab.kind === 'camera') here.onMoveCamera?.(grab.id, round(x), round(y))
    else if (grab.kind === 'lamp') here.onMoveLamp?.(grab.id, round(x), round(y))
    else if (grab.kind === 'plug') here.onMovePlug?.(grab.id, round(x), round(y))
    else if (grab.kind === 'tree') here.onMoveTree?.(grab.id, round(x), round(y))
    else if (grab.kind === 'cage' && grab.cage)
      here.onMoveCage?.(round(grab.cage.x + x - grab.start[0]), round(grab.cage.y + y - grab.start[1]))
    else if ((grab.kind === 'garage' || grab.kind === 'gate') && grab.offset)
      here.onMoveOffset?.(grab.id, round(grab.offset.dx + x - grab.start[0]), round(grab.offset.dy + y - grab.start[1]))
    else if (grab.kind === 'tree-handle') {
      const tree = here.trees.find((item) => item.id === grab?.id)
      if (tree) here.onResizeTree?.(tree.id, round(clamp(Math.hypot(x - tree.x, y - tree.y), RADIUS_MIN, RADIUS_MAX)))
    } else if (grab.kind === 'camera-handle') {
      const camera = here.cameras.find((item) => item.id === grab?.id)
      const start = grab.camera
      if (!camera || !start || (x === camera.x && y === camera.y)) return
      const dx = x - camera.x
      const dy = y - camera.y
      // La poignée est à HANDLE_RATIO de la longueur de la vue : sa distance donne la longueur ; l'écartement suit (même proportion).
      const far = round(clamp(Math.hypot(dx, dy) / HANDLE_RATIO, FAR_MIN, FAR_MAX))
      const fov = round(clamp((start.fov * far) / start.far, FOV_MIN, FOV_MAX))
      here.onAdjustCamera?.(camera.id, { angle: (round((Math.atan2(dx, -dy) * 180) / Math.PI) + 360) % 360, far, fov })
    } else if (grab.kind === 'hedge' && grab.hedge) {
      const dx = x - grab.start[0]
      const dy = y - grab.start[1]
      here.onMoveHedge?.(
        grab.id,
        grab.hedge.map(([px, py]) => [round(px + dx), round(py + dy)]),
      )
    } else if (grab.kind === 'hedge-vertex' && grab.hedge) {
      const index = grab.index
      here.onMoveHedge?.(
        grab.id,
        grab.hedge.map((old, position) => (position === index ? [round(x), round(y)] : old)),
      )
    }
  }

  const up = () => {
    const current = grab
    grab = null
    map.getCanvas().style.cursor = ''
    if (!current) return
    justDragged = current.moved
    if (current.moved) return
    const here = context()
    if (current.kind === 'camera') here.onSelectCamera?.(current.id)
    else if (current.kind === 'hedge') here.onSelectHedge?.(current.id)
    else if (current.kind === 'lamp') {
      here.onToggleLamp?.(current.id)
      here.onHoverLamp?.(current.id)
    }
  }

  // Un clic à côté de tout : rien n'est plus choisi.
  const click = (event: MapMouseEvent) => {
    if (justDragged) {
      justDragged = false
      return
    }
    if (pick(event.point)) return
    const here = context()
    here.onSelectCamera?.('')
    here.onSelectTree?.('')
    here.onSelectHedge?.('')
    here.onHoverLamp?.('')
  }

  map.on('mousedown', down)
  map.on('touchstart', down)
  map.on('mousemove', move)
  map.on('touchmove', move)
  map.on('mouseup', up)
  map.on('touchend', up)
  map.on('touchcancel', up)
  map.on('click', click)
  return () => {
    map.off('mousedown', down)
    map.off('touchstart', down)
    map.off('mousemove', move)
    map.off('touchmove', move)
    map.off('mouseup', up)
    map.off('touchend', up)
    map.off('touchcancel', up)
    map.off('click', click)
  }
}
