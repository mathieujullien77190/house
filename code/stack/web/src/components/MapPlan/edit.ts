// Prendre un élément du plan à la souris (ou au doigt) sur la carte : caméra (la déplacer, la choisir), sa poignée (tourner, allonger), lampe, prise, clim, volet,
// étiquette, emoji et icône seule (les déplacer). Les arbres, haies, cage, portes, carreaux, chemin et murs ne se modifient pas. Pendant qu'on tient un élément la carte ne bouge pas.
import type { Map as MapLibreMap, MapMouseEvent, MapTouchEvent } from 'maplibre-gl'
import type { PlanCamera } from '@house/ui'
import { HOVER_NONE, INTERACTIVE_LAYERS } from './layers'
import { lngLatToPlan } from './projection'

/** Le plan vu par l'édition : les éléments à jour et ce qu'on en fait. Lu à chaque geste (il change à chaque rendu). */
export interface EditContext {
  cameras: PlanCamera[]
  onMoveCamera?: (id: string, x: number, y: number) => void
  onAdjustCamera?: (id: string, setting: { angle: number; far: number; fov: number }) => void
  onSelectCamera?: (id: string) => void
  /** Un double clic sur une caméra du plan, hors modification : ouvre sa page. */
  onOpenCamera?: (id: string) => void
  /** Un double clic sur la prise (le chauffage), hors modification : ouvre sa page. */
  onOpenPlug?: (id: string) => void
  /** Un double clic sur une climatisation, hors modification : ouvre la page Clim. */
  onOpenAc?: (id: string) => void
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
  /** Une icône seule (la pompe à chaleur) : on la déplace en modification. */
  onMoveDecor?: (id: string, x: number, y: number) => void
  /** Un toucher (sans glisser) sur une icône seule cliquable (la box), hors modification : la choisit ; son double clic l'ouvre. */
  onToggleDecor?: (id: string) => void
  onOpenDecor?: (id: string) => void
  /** L'emoji d'un clip : on le déplace (modification), un toucher sans glisser le choisit, un double clic l'ouvre. */
  onMoveEmoji?: (id: string, x: number, y: number) => void
  onToggleEmoji?: (id: string) => void
  onOpenEmoji?: (id: string) => void
}

/** Les bornes du réglage d'une caméra (comme sur le plan seul). */
const FAR_MIN = 60
const FAR_MAX = 700
const FOV_MIN = 10
const FOV_MAX = 140
const HANDLE_RATIO = 0.12
/** L'ordre des zones de saisie qui se superposent : la première gagne. */
const HIT_PRIORITY = ['camera-handle', 'camera-hit', 'emoji-hit', 'ac-hit', 'shutter-hit', 'plug-hit', 'lamp-hit', 'label-hit', 'decor-hit']
/** Un glissement commence au-delà de ce nombre de pixels : en deçà c'est un clic. */
const MOVE_THRESHOLD = 4

interface Grab {
  kind: string
  id: string
  screen: { x: number; y: number }
  moved: boolean
  /** Le réglage d'une caméra à la saisie. */
  camera?: { far: number; fov: number }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Le calque jumeau (fond bleu pâle) de chaque genre d'icône à rond. */
const HOVER_LAYERS: Record<string, string> = {
  'camera-hit': 'plan-survol-cameras',
  'lamp-hit': 'plan-survol-lampes',
  'ac-hit': 'plan-survol-clims',
  'shutter-hit': 'plan-survol-volets',
  'plug-hit': 'plan-survol-prises',
}

/**
 * Une icône sans flux ou injoignable (une caméra éteinte, une lampe coupée) : **hors modification**, on ne peut ni la choisir, ni cliquer dessus, ni la survoler ; en modification, on la déplace
 * comme les autres (il faut pouvoir la placer). La modification est reconnue à ses rappels de déplacement.
 */
const disabled = (properties: Record<string, unknown> | null | undefined, here: EditContext): boolean =>
  properties?.inactive === 1 && here.onMoveCamera === undefined && here.onMoveLamp === undefined

/**
 * Le curseur au-dessus d'un objet : la main qui attrape quand on peut le déplacer (modification), le doigt qui pointe quand un clic fait quelque chose (une caméra, une lampe, une
 * clim, un volet, la prise, un emoji de clip hors modification), rien pour le reste (la pompe à chaleur, hors modification).
 */
const cursorFor = (kind: unknown, here: EditContext, clickable = false): string => {
  const movers: Record<string, unknown> = {
    'camera-hit': here.onMoveCamera,
    'lamp-hit': here.onMoveLamp,
    'plug-hit': here.onMovePlug,
    'ac-hit': here.onMoveAc,
    'shutter-hit': here.onMoveShutter,
    'emoji-hit': here.onMoveEmoji,
    'decor-hit': here.onMoveDecor,
    'label-hit': here.onMoveLabel,
  }
  if (typeof kind !== 'string') return ''
  if (!(kind in movers)) return 'grab'
  if (kind === 'decor-hit' && !movers[kind]) return clickable && here.onToggleDecor ? 'pointer' : ''
  if (movers[kind]) return 'grab'
  return ['camera-hit', 'lamp-hit', 'plug-hit', 'ac-hit', 'shutter-hit', 'emoji-hit'].includes(kind) ? 'pointer' : ''
}

export const attachEditing = (map: MapLibreMap, context: () => EditContext): (() => void) => {
  let grab: Grab | null = null
  // Le clic qui suit un geste sur un élément (un glissement, ou un clic qui l'a choisi) ne doit pas tout désélectionner : sinon, si la carte a bougé entre-temps (la vue imposée à la
  // sélection d'une caméra), l'élément n'est plus sous la souris, le clic passe pour un clic dans le vide et ferme tout aussitôt (le premier clic ne marchait pas, le second oui).
  let justDragged = false
  // L'objet dont l'icône est montrée sur fond bleu pâle (`kind:id`), pour ne régler les filtres que quand il change.
  let hovered = ''

  /** Au survol d'une icône à rond (caméra, lampe, clim, volet, prise), son rond blanc passe au bleu pâle : le calque jumeau de ce genre ne montre que l'objet survolé. */
  const showHover = (hit: Record<string, unknown> | null) => {
    const kind = hit ? String(hit.kind) : ''
    const wanted = kind in HOVER_LAYERS ? `${kind}:${String(hit?.id)}` : ''
    if (wanted === hovered) return
    const [previous] = hovered.split(':')
    hovered = wanted
    if (previous in HOVER_LAYERS && map.getLayer(HOVER_LAYERS[previous])) map.setFilter(HOVER_LAYERS[previous], HOVER_NONE)
    if (wanted && map.getLayer(HOVER_LAYERS[kind]))
      map.setFilter(HOVER_LAYERS[kind], ['all', ['==', ['get', 'kind'], kind], ['==', ['get', 'id'], String(hit?.id)]])
  }

  /** Quand plusieurs zones de saisie se superposent (une caméra, une ampoule et une étiquette de température dans la cage), la plus utile passe avant : la caméra d'abord, l'étiquette (qui ne sert qu'en modification) en dernier. */
  const priority = (properties: Record<string, unknown> | null | undefined): number => {
    const index = HIT_PRIORITY.indexOf(String(properties?.kind))
    return index === -1 ? HIT_PRIORITY.length : index
  }

  const pick = (point: { x: number; y: number }) => {
    const found = map.queryRenderedFeatures([point.x, point.y], { layers: [...INTERACTIVE_LAYERS].filter((id) => map.getLayer(id)) })
    for (const layer of INTERACTIVE_LAYERS) {
      const hits = found
        .filter((feature) => feature.layer.id === layer && !disabled(feature.properties, context()))
        .sort((a, b) => priority(a.properties) - priority(b.properties))
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
    const here = context()
    const handlers: Record<string, unknown> = {
      camera: here.onMoveCamera,
      'camera-handle': here.onAdjustCamera,
      lamp: here.onMoveLamp ?? here.onToggleLamp,
      plug: here.onMovePlug ?? here.onTogglePlug,
      ac: here.onMoveAc ?? here.onToggleAc,
      shutter: here.onMoveShutter ?? here.onToggleShutter,
      label: here.onMoveLabel,
      emoji: here.onMoveEmoji ?? here.onToggleEmoji,
      decor: here.onMoveDecor ?? (properties.clickable === 1 ? here.onToggleDecor : undefined),
    }
    if (!handlers[kind] && kind !== 'camera') return
    event.preventDefault()
    const camera = here.cameras.find((item) => item.id === id)
    grab = {
      kind,
      id,
      screen: { x: event.point.x, y: event.point.y },
      moved: false,
      camera: camera ? { far: camera.far, fov: camera.fov } : undefined,
    }
    map.getCanvas().style.cursor = 'grabbing'
  }

  const move = (event: MapMouseEvent | MapTouchEvent) => {
    if (!grab) {
      if (!('points' in event)) {
        const hit = pick(event.point)
        const lamp = hit?.kind === 'lamp-hit'
        const cursor = cursorFor(hit?.kind, context(), hit?.clickable === 1)
        map.getCanvas().style.cursor = cursor
        showHover(hit && cursor !== '' ? hit : null)
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
    else if (grab.kind === 'decor') here.onMoveDecor?.(grab.id, round(x), round(y))
    else {
      const camera = here.cameras.find((item) => item.id === grab?.id)
      const start = grab.camera
      if (!camera || !start || (x === camera.x && y === camera.y)) return
      const dx = x - camera.x
      const dy = y - camera.y
      // La poignée est à HANDLE_RATIO de la longueur de la vue : sa distance donne la longueur ; l'écartement suit (même proportion).
      const far = round(clamp(Math.hypot(dx, dy) / HANDLE_RATIO, FAR_MIN, FAR_MAX))
      const fov = round(clamp((start.fov * far) / start.far, FOV_MIN, FOV_MAX))
      here.onAdjustCamera?.(camera.id, { angle: (round((Math.atan2(dx, -dy) * 180) / Math.PI) + 360) % 360, far, fov })
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
    } else if (current.kind === 'decor') {
      here.onToggleDecor?.(current.id)
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
    here.onHoverLamp?.('')
    here.onHoverAc?.('')
    here.onHoverShutter?.('')
  }

  // Le double clic sur une caméra ouvre sa page (le zoom au double clic est coupé sur cette carte).
  const doubleClick = (event: MapMouseEvent) => {
    const hit = pick(event.point)
    if (
      hit?.kind !== 'camera-hit' &&
      hit?.kind !== 'plug-hit' &&
      hit?.kind !== 'ac-hit' &&
      hit?.kind !== 'emoji-hit' &&
      hit?.kind !== 'shutter-hit' &&
      !(hit?.kind === 'decor-hit' && hit.clickable === 1)
    )
      return
    event.preventDefault()
    if (hit.kind === 'camera-hit') context().onOpenCamera?.(String(hit.id))
    else if (hit.kind === 'ac-hit') context().onOpenAc?.(String(hit.id))
    else if (hit.kind === 'emoji-hit') context().onOpenEmoji?.(String(hit.id))
    else if (hit.kind === 'shutter-hit') context().onOpenShutter?.(String(hit.id))
    else if (hit.kind === 'decor-hit') context().onOpenDecor?.(String(hit.id))
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
