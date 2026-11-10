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
  /** Un double clic sur une caméra du plan, hors modification : ouvre sa page. */
  onOpenCamera?: (id: string) => void
  /** Un double clic sur la prise (le chauffage), hors modification : ouvre sa page. */
  onOpenPlug?: (id: string) => void
  /** Un double clic sur une climatisation, hors modification : ouvre la page Clim. */
  onOpenAc?: (id: string) => void
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
  /** Un toucher (sans glisser) sur la prise : ouvre la page de la prise. */
  onTogglePlug?: (id: string) => void
  /** Une climatisation : la déplacer (modification), un toucher sans glisser l'allume ou l'éteint, et le survol dont la carte écrit le texte. */
  onMoveAc?: (id: string, x: number, y: number) => void
  onToggleAc?: (id: string) => void
  onHoverAc?: (id: string) => void
  /** La caméra survolée (vide : aucune) : son champ de vision s'affiche tant qu'on la survole. */
  onHoverCamera?: (id: string) => void
  /** La prise (le chauffage) survolée (vide : aucune) : la carte écrit son nom. */
  onHoverPlug?: (id: string) => void
  /** Un volet roulant : le déplacer (modification), un toucher sans glisser ouvre leur page, et le survol dont la carte écrit le texte. */
  onMoveShutter?: (id: string, x: number, y: number) => void
  onToggleShutter?: (id: string) => void
  onHoverShutter?: (id: string) => void
  /** Un double clic sur un volet roulant, hors modification : ouvre la page Volet. */
  onOpenShutter?: (id: string) => void
  /** Une étiquette de température : on la déplace en modification. */
  onMoveLabel?: (id: string, x: number, y: number) => void
  /** L'emoji d'un clip : on le déplace (modification), un toucher sans glisser le choisit, un double clic l'ouvre. */
  onMoveEmoji?: (id: string, x: number, y: number) => void
  onToggleEmoji?: (id: string) => void
  onOpenEmoji?: (id: string) => void
}

/** Les bornes du réglage d'une caméra (comme sur le plan seul) et du rayon d'un arbre. */
const FAR_MIN = 60
const FAR_MAX = 700
const FOV_MIN = 10
const FOV_MAX = 140
const HANDLE_RATIO = 0.12
const RADIUS_MIN = 5
const RADIUS_MAX = 400
/** L'ordre des zones de saisie qui se superposent : la première gagne. */
const HIT_PRIORITY = ['camera-handle', 'camera-hit', 'emoji-hit', 'ac-hit', 'shutter-hit', 'plug-hit', 'lamp-hit', 'label-hit']
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
  // Le clic qui suit un geste sur un élément (un glissement, ou un clic qui l'a choisi) ne doit pas tout désélectionner : sinon, si la carte a bougé entre-temps (la vue imposée à la
  // sélection d'une caméra), l'élément n'est plus sous la souris, le clic passe pour un clic dans le vide et ferme tout aussitôt (le premier clic ne marchait pas, le second oui).
  let justDragged = false

  /** Quand plusieurs zones de saisie se superposent (une caméra, une ampoule et une étiquette de température dans la cage), la plus utile passe avant : la caméra d'abord, l'étiquette (qui ne sert qu'en modification) en dernier. */
  const priority = (properties: Record<string, unknown> | null | undefined): number => {
    const index = HIT_PRIORITY.indexOf(String(properties?.kind))
    return index === -1 ? HIT_PRIORITY.length : index
  }

  const pick = (point: { x: number; y: number }) => {
    const found = map.queryRenderedFeatures([point.x, point.y], { layers: [...INTERACTIVE_LAYERS].filter((id) => map.getLayer(id)) })
    for (const layer of INTERACTIVE_LAYERS) {
      const hits = found.filter((feature) => feature.layer.id === layer).sort((a, b) => priority(a.properties) - priority(b.properties))
      if (hits.length > 0) return hits[0].properties
    }
    return null
  }

  const down = (event: MapMouseEvent | MapTouchEvent) => {
    if ('points' in event && event.points.length > 1) return
    // Un nouveau geste : le clic en attente de l'ancien n'a plus lieu d'être ignoré.
    justDragged = false
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
      plug: here.onMovePlug ?? here.onTogglePlug,
      ac: here.onMoveAc ?? here.onToggleAc,
      shutter: here.onMoveShutter ?? here.onToggleShutter,
      label: here.onMoveLabel,
      emoji: here.onMoveEmoji ?? here.onToggleEmoji,
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
        context().onHoverCamera?.(hit?.kind === 'camera-hit' ? String(hit.id) : '')
        context().onHoverPlug?.(hit?.kind === 'plug-hit' ? String(hit.id) : '')
        context().onHoverAc?.(hit?.kind === 'ac-hit' ? String(hit.id) : '')
        context().onHoverShutter?.(hit?.kind === 'shutter-hit' ? String(hit.id) : '')
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
    else if (grab.kind === 'ac') here.onMoveAc?.(grab.id, round(x), round(y))
    else if (grab.kind === 'shutter') here.onMoveShutter?.(grab.id, round(x), round(y))
    else if (grab.kind === 'label') here.onMoveLabel?.(grab.id, round(x), round(y))
    else if (grab.kind === 'emoji') here.onMoveEmoji?.(grab.id, round(x), round(y))
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
    justDragged = true
    if (current.moved) return
    const here = context()
    if (current.kind === 'camera') here.onSelectCamera?.(current.id)
    else if (current.kind === 'hedge') here.onSelectHedge?.(current.id)
    else if (current.kind === 'lamp') {
      here.onToggleLamp?.(current.id)
      here.onHoverLamp?.(current.id)
    } else if (current.kind === 'plug') {
      here.onTogglePlug?.(current.id)
    } else if (current.kind === 'shutter') {
      here.onToggleShutter?.(current.id)
      here.onHoverShutter?.(current.id)
    } else if (current.kind === 'emoji') {
      here.onToggleEmoji?.(current.id)
    } else if (current.kind === 'ac') {
      here.onToggleAc?.(current.id)
      here.onHoverAc?.(current.id)
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
    here.onHoverAc?.('')
    here.onHoverShutter?.('')
  }

  // Le double clic sur une caméra ouvre sa page (le zoom au double clic est coupé sur cette carte).
  const doubleClick = (event: MapMouseEvent) => {
    const hit = pick(event.point)
    if (hit?.kind !== 'camera-hit' && hit?.kind !== 'plug-hit' && hit?.kind !== 'ac-hit' && hit?.kind !== 'emoji-hit' && hit?.kind !== 'shutter-hit') return
    event.preventDefault()
    if (hit.kind === 'camera-hit') context().onOpenCamera?.(String(hit.id))
    else if (hit.kind === 'ac-hit') context().onOpenAc?.(String(hit.id))
    else if (hit.kind === 'emoji-hit') context().onOpenEmoji?.(String(hit.id))
    else if (hit.kind === 'shutter-hit') context().onOpenShutter?.(String(hit.id))
    else context().onOpenPlug?.(String(hit.id))
  }

  map.on('mousedown', down)
  map.on('touchstart', down)
  map.on('mousemove', move)
  map.on('touchmove', move)
  map.on('mouseup', up)
  map.on('touchend', up)
  map.on('touchcancel', up)
  map.on('click', click)
  map.on('dblclick', doubleClick)
  return () => {
    map.off('mousedown', down)
    map.off('touchstart', down)
    map.off('mousemove', move)
    map.off('touchmove', move)
    map.off('mouseup', up)
    map.off('touchend', up)
    map.off('touchcancel', up)
    map.off('click', click)
    map.off('dblclick', doubleClick)
  }
}
