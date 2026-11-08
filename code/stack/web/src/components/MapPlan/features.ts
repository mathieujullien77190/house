// Le plan en données de carte (GeoJSON, longitude et latitude) : la partie fixe (maison, terrasse, cage, portails, chemins) et la partie vivante (haies, arbres, caméras,
// lampe, prise, poignées), reconstruite quand elles changent. Chaque élément porte son genre (`kind`) et son identifiant pour qu'on puisse le saisir à la souris.
import type { Feature as GeoFeature, FeatureCollection, Geometry } from 'geojson'
import polygonClipping from 'polygon-clipping'
import type { PlanCamera, PlanGate, PlanHedge, PlanLamp, PlanPlug, PlanRoom, PlanTree } from '@house/ui'
import {
  HOUSE_SHIFT,
  PLAN_EXTENSION,
  PLAN_FLOOR_PATHS,
  PLAN_FLOORS,
  PLAN_ROOMS,
  PLAN_WALLS,
  PLAN_PATHS,
  PLAN_TERRACE,
} from '@/components/Lights/constants'
import { LAMP_RADIUS, MAP_HOUSE_HEIGHT, MAP_UNITS_PER_METER } from './constants'
import { bulbOpacity, fromHousePlan } from './helpers'
import { eastLimitAt } from './parcel'
import { planToLngLat, type Point } from './projection'
import { cameraRing, circleRing, fovRing, pathRings, rectRing } from './shapes'

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
  return `hsla(140, 50%, ${Math.round(62 - 42 * share)}%, 0.85)`
}

/** La largeur du carrelage au sud de la maison : la terrasse de 1,5 m et 50 cm de plus, en unités du plan (39 par mètre). */
const SOUTH_TILES = PLAN_TERRACE + 0.5 * MAP_UNITS_PER_METER

/** Une pièce de l'ancien plan des lumières en un seul contour (l'union de ses rectangles : une pièce en L n'a pas de trait au milieu), dans le repère de la carte. */
const roomFeature = (room: PlanRoom): Feature => {
  const pieces = room.rects.map(
    (rect) =>
      [
        rectRing(rect.x, rect.y, rect.w, rect.h).map(([x, y]): [number, number] => {
          const mapped = fromHousePlan(x, y)
          return [mapped.x, mapped.y]
        }),
      ] as [number, number][][],
  )
  const [first, ...rest] = pieces
  const merged = first ? polygonClipping.union(first, ...rest) : []
  return {
    type: 'Feature',
    properties: { part: 'room', name: room.name },
    geometry: {
      type: 'MultiPolygon',
      coordinates: merged.map((area) => area.map((ring) => ring.map(([x, y]) => planToLngLat(x, y)))),
    },
  }
}

/** La partie fixe : chemins de béton, pavage (terrasse et sols), cage, toit, portails. Le toit est celui du plan : 540 unités de large, poussé de `HOUSE_SHIFT`. */
export const staticFeatures = (): Collection => {
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
    ...PLAN_ROOMS.map(roomFeature),
    ...PLAN_WALLS.map((wall) => {
      const from = fromHousePlan(wall.x1, wall.y1)
      const to = fromHousePlan(wall.x2, wall.y2)
      return line(
        [
          [from.x, from.y],
          [to.x, to.y],
        ],
        { part: 'wall', screen: wall.screen ? 1 : 0 },
      )
    }),
  ]
  return collection(features)
}

/** Ce qui peut changer : les éléments du plan et ce qui est choisi. */
export interface LiveData {
  /** Les décalages (unités du plan) du chemin du garage et des portes, par identifiant. */
  offsets: Record<string, { dx: number; dy: number }>
  /** Les portes (portail du garage, portillon) à leur dessin de départ ; le décalage s'ajoute. */
  gates: PlanGate[]
  /** La cage à perruches (rectangle du plan), qu'on peut déplacer. */
  cage: { x: number; y: number; w: number; h: number }
  hedges: PlanHedge[]
  trees: PlanTree[]
  cameras: PlanCamera[]
  lamps: PlanLamp[]
  plugs: PlanPlug[]
  selectedHedgeId: string
  selectedTreeId: string
  selectedCameraId: string
  /** Les poignées (taille d'un arbre, réglage d'une caméra, sommets d'une haie) existent seulement si l'élément est éditable. */
  canEditHedges: boolean
  canResizeTrees: boolean
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
const tilesFeature = (cage: { x: number; y: number; w: number; h: number }): Feature => {
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
  // Il y a toujours au moins la terrasse : `pieces` n'est jamais vide.
  const [first, ...rest] = pieces.map((ring) => [ring.map(([x, y]): [number, number] => [x, y])] as [number, number][][])
  const merged = polygonClipping.union(first, ...rest)
  return {
    type: 'Feature',
    properties: { kind: 'tiles', id: 'tiles' },
    geometry: {
      type: 'MultiPolygon',
      coordinates: merged.map((polygon) => polygon.map((ring) => ring.map(([x, y]) => planToLngLat(x, y)))),
    },
  }
}

export const liveFeatures = (data: LiveData, palette: Palette): { shapes: Collection; points: Collection } => {
  const shift = (id: string) => data.offsets[id] ?? { dx: 0, dy: 0 }
  const garage = shift('garage')
  const shapes: Feature[] = [
    tilesFeature(data.cage),
    ...PLAN_PATHS.flatMap(pathRings).map((ring) =>
      polygon(
        ring.map(([x, y]): Point => [x + garage.dx, y + garage.dy]),
        { kind: 'garage', id: 'garage' },
      ),
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
    shapes.push(line(hedge.points, { kind: 'hedge', id: hedge.id, selected: hedge.id === data.selectedHedgeId ? 1 : 0 }))
    if (hedge.id === data.selectedHedgeId && data.canEditHedges) {
      hedge.points.forEach((point, index) => points.push(dot(point, { kind: 'hedge-vertex', id: hedge.id, index })))
    }
  }
  for (const tree of data.trees) {
    const selected = tree.id === data.selectedTreeId
    shapes.push(
      polygon(circleRing(tree.x, tree.y, tree.r), {
        kind: 'tree',
        id: tree.id,
        color: treeColor(tree.r),
        stroke: selected ? palette.accent : palette.green,
        strokeWidth: selected ? 3 : 1.5,
      }),
    )
    if (selected && data.canResizeTrees) points.push(dot([tree.x + tree.r, tree.y], { kind: 'tree-handle', id: tree.id }))
  }
  for (const camera of data.cameras) {
    const selected = camera.id === data.selectedCameraId
    if (selected)
      shapes.push(polygon(fovRing(camera.x, camera.y, camera.angle, camera.fov, camera.near, camera.far), { kind: 'fov', id: camera.id }))
    shapes.push(
      polygon(cameraRing(camera.x, camera.y, camera.angle), {
        kind: 'camera',
        id: camera.id,
        stroke: camera.off ? palette.danger : palette.accent,
      }),
    )
    points.push(dot([camera.x, camera.y], { kind: 'camera-hit', id: camera.id }))
    if (selected && data.canAdjustCameras) points.push(dot(cameraHandle(camera), { kind: 'camera-handle', id: camera.id }))
  }
  for (const lamp of data.lamps) {
    const color = lamp.on && lamp.reachable ? palette.orange : palette.bg
    const stroke = !lamp.reachable ? palette.danger : lamp.on ? palette.fg : palette.muted
    shapes.push(
      polygon(circleRing(lamp.x, lamp.y, LAMP_RADIUS, 96), {
        kind: 'lamp',
        id: lamp.id,
        color,
        stroke,
        opacity: bulbOpacity(lamp.on, lamp.reachable, lamp.brightness),
      }),
    )
    points.push(dot([lamp.x, lamp.y], { kind: 'lamp-hit', id: lamp.id }))
  }
  for (const plug of data.plugs) {
    shapes.push(
      polygon(rectRing(plug.x - 9, plug.y - 9, 18, 18), {
        kind: 'plug',
        id: plug.id,
        color: plug.on ? palette.green : palette.danger,
        stroke: palette.fg,
      }),
    )
    points.push(dot([plug.x, plug.y], { kind: 'plug-hit', id: plug.id }))
  }
  return { shapes: collection(shapes), points: collection(points) }
}
