// Le plan en données de carte (GeoJSON, longitude et latitude) : la partie fixe (maison, terrasse, cage, portails, chemins) et la partie vivante (haies, arbres, caméras,
// lampe, prise, poignée de caméra), reconstruite quand elles changent. Chaque élément porte son genre (`kind`) et son identifiant pour qu'on puisse le saisir à la souris.
import type { Feature as GeoFeature, FeatureCollection, Geometry } from 'geojson'
import polygonClipping from 'polygon-clipping'
import type { PlanAc, PlanCamera, PlanGate, PlanHedge, PlanLamp, PlanPlug, PlanLabel, PlanShutter, PlanTree, PlanEmoji } from '@house/ui'
import {
  HOUSE_SHIFT,
  PLAN_EXTENSION,
  PLAN_GARAGE_CORNERS,
  PLAN_FLOOR_PATHS,
  PLAN_FLOORS,
  PLAN_ENTRANCE_WALL,
  PLAN_OPENINGS,
  PLAN_ROOMS,
  PLAN_WALLS,
  PLAN_TERRACE,
} from '@/components/Lights/constants'
import { TREE_STEPS, MAP_HOUSE_HEIGHT, MAP_UNITS_PER_METER } from './constants'
import { bulbColor, fromHousePlan } from './helpers'
import { eastLimitAt } from './parcel'
import { planToLngLat, type Point } from './projection'
import { bushRing, coneRing, pathRings, rectRing, seedOf } from './shapes'

/** Une icône posée sur le plan sans rien d'autre (la pompe à chaleur) : on la déplace en modification. `image` est le nom de son image sur la carte. */
export interface PlanDecor {
  id: string
  x: number
  y: number
  image: string
  /** Un clic la choisit et un double clic ouvre sa page (la box), hors modification. */
  clickable?: boolean
}

export type Collection = FeatureCollection<Geometry>
type Feature = GeoFeature<Geometry>
type Properties = Record<string, string | number>

/** Les couleurs du thème (lues sur la page : claires ou sombres comme elle). */
export interface Palette {
  accent: string
  bg: string
  fg: string
  muted: string
  orange: string
  green: string
  danger: string
}

export const readPalette = (): Palette => {
  const style = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    accent: read('--accent', '#2f7de1'),
    bg: read('--bg', '#12151b'),
    fg: read('--text', '#e8ebf1'),
    muted: read('--muted', '#98a1b1'),
    orange: read('--orange', '#f0a940'),
    green: read('--green', '#3fc590'),
    danger: read('--danger', '#f06a6a'),
  }
}

const lngLat = (point: Point): Point => planToLngLat(point[0], point[1])
const polygon = (ring: Point[], properties: Properties): Feature => ({
  type: 'Feature',
  properties,
  geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]].map(lngLat)] },
})
const line = (points: Point[], properties: Properties): Feature => ({
  type: 'Feature',
  properties,
  geometry: { type: 'LineString', coordinates: points.map(lngLat) },
})
const dot = (point: Point, properties: Properties): Feature => ({
  type: 'Feature',
  properties,
  geometry: { type: 'Point', coordinates: lngLat(point) },
})
const collection = (features: Feature[]): Collection => ({ type: 'FeatureCollection', features })

/** Le vert d'un arbre : plus il est gros, plus il est foncé (du vert clair d'un petit arbre au vert sombre d'un grand), un peu transparent. */
const treeColor = (radius: number): string => {
  const share = Math.min(1, Math.max(0, (radius - 15) / 385))
  return `hsla(140, 50%, ${Math.round(62 - 42 * share)}%, 0.45)`
}

/** La largeur du carrelage au sud de la maison : la terrasse de 1,5 m et 50 cm de plus, en unités du plan (39 par mètre). */
const SOUTH_TILES = PLAN_TERRACE + 0.5 * MAP_UNITS_PER_METER

/** Un rectangle de pièce dans le repère de la carte : deux coins opposés (le premier n'est pas forcément le plus haut à gauche tant qu'on le déplace). */
export interface RoomRect {
  x1: number
  y1: number
  x2: number
  y2: number
}

/** Les rectangles de chaque pièce, dans l'ordre de `PLAN_ROOMS`. */
export type RoomRects = RoomRect[][]

/** Les rectangles de départ des pièces (`PLAN_ROOMS`, dans le repère de l'ancien plan) dans le repère de la carte. */
export const defaultRoomRects = (): RoomRects =>
  PLAN_ROOMS.map((room) =>
    room.rects.map((rect) => {
      const from = fromHousePlan(rect.x, rect.y)
      const to = fromHousePlan(rect.x + rect.w, rect.y + rect.h)
      return { x1: from.x, y1: from.y, x2: to.x, y2: to.y }
    }),
  )

/** x, y, largeur, hauteur d'un rectangle de pièce (les coins remis dans l'ordre). */
const rectBox = (rect: RoomRect): [number, number, number, number] => [
  Math.min(rect.x1, rect.x2),
  Math.min(rect.y1, rect.y2),
  Math.abs(rect.x2 - rect.x1),
  Math.abs(rect.y2 - rect.y1),
]

/**
 * Toutes les pièces en **un seul contour** (l'union de tous leurs rectangles : ni trait au milieu d'une pièce en L, ni couture entre deux pièces voisines). Des pièces dessinées
 * une à une, à 60 % d'opacité, se chevauchent ou se touchent à peine sur leur côté commun : on y voyait un fin trait clair dans la maison. Dans le repère de la carte.
 */
const roomsFeature = (rooms: RoomRects): Feature => {
  const pieces = rooms.flatMap((room) =>
    room.map((rect) => [rectRing(...rectBox(rect)).map(([x, y]): [number, number] => [x, y])] as [number, number][][]),
  )
  const [first, ...rest] = pieces
  const merged = first ? polygonClipping.union(first, ...rest) : []
  return {
    type: 'Feature',
    properties: { part: 'room' },
    geometry: {
      type: 'MultiPolygon',
      // Seul le contour extérieur de chaque ensemble de pièces : un trou entre des pièces déplacées à la main (un vide au milieu de la maison) est rempli de la couleur de la maison.
      coordinates: merged.map((area) => [area[0].map(([x, y]) => planToLngLat(x, y))]),
    },
  }
}

type Segment = [number, number, number, number]

/** Un segment horizontal ou vertical, moins ce qui tombe sur une ouverture (un morceau de mur qui n'existe pas) : zéro, un ou deux morceaux. */
const cutOpenings = (segment: Segment, openings: { x1: number; y1: number; x2: number; y2: number }[]): Segment[] =>
  openings.reduce<Segment[]>(
    (parts, opening) =>
      parts.flatMap(([ax, ay, bx, by]): Segment[] => {
        const horizontal = ay === by && opening.y1 === opening.y2 && ay === opening.y1
        const vertical = ax === bx && opening.x1 === opening.x2 && ax === opening.x1
        if (!horizontal && !vertical) return [[ax, ay, bx, by]]
        const [lo, hi] = horizontal ? [Math.min(ax, bx), Math.max(ax, bx)] : [Math.min(ay, by), Math.max(ay, by)]
        const [cutLo, cutHi] = horizontal
          ? [Math.min(opening.x1, opening.x2), Math.max(opening.x1, opening.x2)]
          : [Math.min(opening.y1, opening.y2), Math.max(opening.y1, opening.y2)]
        if (cutHi <= lo || cutLo >= hi) return [[ax, ay, bx, by]]
        const kept: Segment[] = []
        if (cutLo > lo) kept.push(horizontal ? [lo, ay, cutLo, ay] : [ax, lo, ax, cutLo])
        if (cutHi < hi) kept.push(horizontal ? [cutHi, ay, hi, ay] : [ax, cutHi, ax, hi])
        return kept
      }),
    [segment],
  )

/** Les ouvertures (des morceaux de mur qui n'existent pas) dans le repère de la carte. */
const mapOpenings = () =>
  PLAN_OPENINGS.map((opening) => {
    const from = fromHousePlan(opening.x1, opening.y1)
    const to = fromHousePlan(opening.x2, opening.y2)
    return { x1: from.x, y1: from.y, x2: to.x, y2: to.y }
  })

/** Le contour d'une pièce en traits de mur : les côtés de l'union de ses rectangles (une pièce en L n'a pas de trait au milieu), moins les ouvertures, dans le repère de la carte. */
const roomWalls = (room: RoomRect[]): Feature[] => {
  const pieces = room.map((rect) => [rectRing(...rectBox(rect))] as [number, number][][])
  const [first, ...rest] = pieces
  const merged = first ? polygonClipping.union(first, ...rest) : []
  const openings = mapOpenings()
  return merged
    .flatMap((area) => area)
    .flatMap((ring) =>
      ring
        .slice(0, -1)
        .map(([x, y], index): Segment => [x, y, ring[(index + 1) % (ring.length - 1)][0], ring[(index + 1) % (ring.length - 1)][1]]),
    )
    .flatMap((segment) => cutOpenings(segment, openings))
    .map(([x1, y1, x2, y2]) =>
      line(
        [
          [x1, y1],
          [x2, y2],
        ],
        { part: 'wall' },
      ),
    )
}

/** Le mur de l'entrée : de la lampe « Entrée » au bord gauche de la pièce « Entrée », à la hauteur de son mur sud (il suit la pièce quand on la déplace) ; rien sans cette pièce. */
const entranceWall = (rooms: RoomRects): Feature[] => {
  const rect = rooms[PLAN_ROOMS.findIndex((room) => room.name === PLAN_ENTRANCE_WALL.room)]?.[0]
  if (!rect) return []
  const y = Math.max(rect.y1, rect.y2)
  return [
    line(
      [
        [fromHousePlan(PLAN_ENTRANCE_WALL.fromX, 0).x, y],
        [Math.min(rect.x1, rect.x2), y],
      ],
      { part: 'wall' },
    ),
  ]
}

/** La partie fixe : chemins de béton, pavage (terrasse et sols), cage, toit, portails. Le toit est celui du plan : 540 unités de large, poussé de `HOUSE_SHIFT`. */
export const staticFeatures = (rooms: RoomRects = defaultRoomRects()): Collection => {
  const inset = 2
  const width = 540
  const roof: Point[] = [
    [inset, inset],
    [width - inset, inset],
    [width - inset, PLAN_EXTENSION.y],
    [PLAN_EXTENSION.x + PLAN_EXTENSION.w, PLAN_EXTENSION.y],
    [PLAN_EXTENSION.x + PLAN_EXTENSION.w, PLAN_EXTENSION.y + PLAN_EXTENSION.h],
    [width - inset, PLAN_EXTENSION.y + PLAN_EXTENSION.h],
    [width - inset, MAP_HOUSE_HEIGHT - inset],
    [inset, MAP_HOUSE_HEIGHT - inset],
  ].map(([x = 0, y = 0]): Point => [x + HOUSE_SHIFT, y])
  const features: Feature[] = [
    // Le côté nord de la terrasse en béton gris clair (du bout gauche de la terrasse à l'angle haut droit de la maison).
    polygon(rectRing(HOUSE_SHIFT - PLAN_TERRACE, -PLAN_TERRACE, width + PLAN_TERRACE, PLAN_TERRACE), { part: 'concrete' }),
    polygon(roof, { part: 'roof' }),
    roomsFeature(rooms),
    ...rooms.flatMap(roomWalls),
    ...entranceWall(rooms),
    ...PLAN_WALLS.map((wall) => {
      const from = fromHousePlan(wall.x1, wall.y1)
      const to = fromHousePlan(wall.x2, wall.y2)
      return line(
        [
          [from.x, from.y],
          [to.x, to.y],
        ],
        { part: 'wall' },
      )
    }),
  ]
  return collection(features)
}

/** Ce qui peut changer : les éléments du plan et ce qui est choisi. */
export interface LiveData {
  /** Les décalages (unités du plan) du chemin du garage et des portes, par identifiant. */
  offsets: Record<string, { dx: number; dy: number }>
  /** Le contour des carreaux gardé dans le plan ; null : le contour calculé. */
  tiles: Point[] | null
  /** Le contour du chemin du garage gardé dans le plan (avant le décalage) ; null : celui de départ. */
  garage: Point[] | null
  /** Les portes (portail du garage, portillon) à leur dessin de départ ; le décalage s'ajoute. */
  gates: PlanGate[]
  /** La cage à perruches (rectangle du plan). */
  cage: { x: number; y: number; w: number; h: number }
  hedges: PlanHedge[]
  trees: PlanTree[]
  cameras: PlanCamera[]
  lamps: PlanLamp[]
  plugs: PlanPlug[]
  acs: PlanAc[]
  shutters: PlanShutter[]
  labels: PlanLabel[]
  emojis: PlanEmoji[]
  decors: PlanDecor[]
  selectedCameraId: string
  /** La caméra survolée : son champ de vision s'affiche aussi, sans poignée. */
  hoveredCameraId: string
  /** La poignée de réglage d'une caméra choisie existe seulement en modification. */
  canAdjustCameras: boolean
}

/** La poignée d'une caméra choisie : devant son icône, plus loin quand sa vue est longue (mêmes proportions que sur le plan seul). */
export const cameraHandle = (camera: PlanCamera): Point =>
  polar(camera.x, camera.y, camera.angle, Math.max(HANDLE_DISTANCE, camera.far * HANDLE_RATIO))
const polar = (x: number, y: number, angle: number, radius: number): Point => {
  const radians = (angle * Math.PI) / 180
  return [x + radius * Math.sin(radians), y - radius * Math.cos(radians)]
}
export const HANDLE_DISTANCE = 22
export const HANDLE_RATIO = 0.12

/**
 * Toute la zone carrelée en **un seul polygone** (l'union de ses morceaux, sans couture) : la terrasse autour de la maison, le carrelage plus large au sud (la terrasse et 50 cm
 * de plus) qui va, vers l'est, jusqu'à la limite de propriété, les sols à droite de la maison (qui montent jusqu'au bas de la cage, où qu'elle soit, et vont jusqu'à la limite,
 * qui est de biais) et le chemin du portillon.
 */
const tilesPieces = (cage: { x: number; y: number; w: number; h: number }): Point[][] => {
  const width = 540
  const cageBottom = cage.y + cage.h
  const [east, joint] = PLAN_FLOORS
  const pieces: Point[][] = [
    rectRing(HOUSE_SHIFT - PLAN_TERRACE, -PLAN_TERRACE, width + 2 * PLAN_TERRACE, MAP_HOUSE_HEIGHT + 2 * PLAN_TERRACE),
    [
      [HOUSE_SHIFT - PLAN_TERRACE, MAP_HOUSE_HEIGHT],
      [eastLimitAt(MAP_HOUSE_HEIGHT), MAP_HOUSE_HEIGHT],
      [eastLimitAt(MAP_HOUSE_HEIGHT + SOUTH_TILES), MAP_HOUSE_HEIGHT + SOUTH_TILES],
      [HOUSE_SHIFT - PLAN_TERRACE, MAP_HOUSE_HEIGHT + SOUTH_TILES],
    ],
    ...(east
      ? [
          [
            [east.x, cageBottom],
            [eastLimitAt(cageBottom), cageBottom],
            [eastLimitAt(east.y + east.h), east.y + east.h],
            [east.x, east.y + east.h],
          ] as Point[],
        ]
      : []),
    // Le joint sous la cage, entre elle et la terrasse.
    ...(joint ? [rectRing(cage.x, cageBottom, joint.w, joint.h)] : []),
    ...PLAN_FLOOR_PATHS.flatMap(pathRings),
  ]
  return pieces
}

/** Le polygone d'un ensemble de morceaux : leur union (sans couture), en un seul objet de la carte. */
const mergedTiles = (cage: { x: number; y: number; w: number; h: number }) => {
  // Il y a toujours au moins la terrasse : `pieces` n'est jamais vide.
  const [first, ...rest] = tilesPieces(cage).map((ring) => [ring.map(([x, y]): [number, number] => [x, y])] as [number, number][][])
  return polygonClipping.union(first, ...rest)
}

/** Les carreaux : l'union de leurs morceaux, ou le contour modifié à la main. */
const tilesFeature = (cage: { x: number; y: number; w: number; h: number }, custom: Point[] | null): Feature => ({
  type: 'Feature',
  properties: { kind: 'tiles', id: 'tiles' },
  geometry: custom
    ? { type: 'Polygon', coordinates: [[...custom, custom[0]].map(lngLat)] }
    : {
        type: 'MultiPolygon',
        coordinates: mergedTiles(cage).map((area) => area.map((ring) => ring.map(([x, y]) => planToLngLat(x, y)))),
      },
})

export const liveFeatures = (data: LiveData, palette: Palette): { shapes: Collection; points: Collection } => {
  const shift = (id: string) => data.offsets[id] ?? { dx: 0, dy: 0 }
  const garage = shift('garage')
  const shapes: Feature[] = [
    tilesFeature(data.cage, data.tiles),
    polygon(
      (data.garage ?? PLAN_GARAGE_CORNERS).map(([x, y]): Point => [x + garage.dx, y + garage.dy]),
      { kind: 'garage', id: 'garage' },
    ),
    polygon(rectRing(data.cage.x, data.cage.y, data.cage.w, data.cage.h), { kind: 'cage', id: 'cage' }),
    ...data.gates.map((gate) => {
      const { dx, dy } = shift(gate.id)
      return line(
        [
          [gate.x1 + dx, gate.y1 + dy],
          [gate.x2 + dx, gate.y2 + dy],
        ],
        { kind: 'gate', id: gate.id },
      )
    }),
  ]
  const points: Feature[] = []
  for (const hedge of data.hedges) {
    shapes.push(line(hedge.points, { kind: 'hedge', id: hedge.id }))
  }
  for (const tree of data.trees) {
    shapes.push(
      polygon(bushRing(tree.x, tree.y, tree.r, seedOf(tree.id), TREE_STEPS), {
        kind: 'tree',
        id: tree.id,
        color: treeColor(tree.r),
        stroke: palette.green,
        strokeWidth: 1.5,
      }),
    )
  }
  for (const camera of data.cameras) {
    const selected = camera.id === data.selectedCameraId
    if (selected || camera.id === data.hoveredCameraId)
      shapes.push(polygon(coneRing(camera.x, camera.y, camera.angle, camera.fov, camera.far), { kind: 'fov', id: camera.id }))
    points.push(
      dot([camera.x, camera.y], {
        kind: 'camera-hit',
        id: camera.id,
        state: camera.missing ? 'missing' : camera.off ? 'off' : 'on',
        // Une caméra éteinte ou liée à aucune vraie caméra n'a pas de flux : hors modification, on ne peut ni la choisir ni cliquer dessus.
        inactive: camera.missing ? 1 : 0,
        angle: camera.angle,
      }),
    )
    if (selected && data.canAdjustCameras) points.push(dot(cameraHandle(camera), { kind: 'camera-handle', id: camera.id }))
  }
  for (const lamp of data.lamps) {
    // L'ampoule est une icône (calque de symboles sur son point) dessinée **dans la couleur de l'ampoule** : sa vraie couleur quand elle est allumée (orange par défaut si on ne la connaît pas), grise éteinte, rouge injoignable ; `opacity` suit la luminosité.
    const color = !lamp.reachable ? palette.danger : lamp.on ? (lamp.color ?? palette.orange) : palette.muted
    points.push(
      dot([lamp.x, lamp.y], {
        kind: 'lamp-hit',
        id: lamp.id,
        color: bulbColor(color, lamp.on, lamp.reachable, lamp.brightness),
        inactive: lamp.reachable ? 0 : 1,
      }),
    )
  }
  for (const ac of data.acs) {
    // La climatisation est une icône (calque de symboles sur son point) : `state` choisit l'image (allumée, éteinte, injoignable).
    const state = !ac.reachable ? 'lost' : ac.on ? 'on' : 'off'
    points.push(dot([ac.x, ac.y], { kind: 'ac-hit', id: ac.id, state, rotate: ac.rotation ?? 0 }))
  }
  for (const decor of data.decors) points.push(dot([decor.x, decor.y], { kind: 'decor-hit', id: decor.id, image: decor.image, clickable: decor.clickable ? 1 : 0 }))
  for (const item of data.emojis) points.push(dot([item.x, item.y], { kind: 'emoji-hit', id: item.id, emoji: item.emoji }))
  for (const label of data.labels) points.push(dot([label.x, label.y], { kind: 'label-hit', id: label.id, temp: label.text }))
  for (const shutter of data.shutters) {
    // Le volet est une icône (calque de symboles sur son point) : fermée ou ouverte selon son dernier ordre.
    points.push(dot([shutter.x, shutter.y], { kind: 'shutter-hit', id: shutter.id, closed: shutter.closed ? 1 : 0 }))
  }
  for (const plug of data.plugs) {
    // La prise est une icône (calque de symboles sur son point) : `on` choisit l'image (verte allumée, rouge éteinte).
    points.push(dot([plug.x, plug.y], { kind: 'plug-hit', id: plug.id, on: plug.on ? 1 : 0 }))
  }
  return { shapes: collection(shapes), points: collection(points) }
}
