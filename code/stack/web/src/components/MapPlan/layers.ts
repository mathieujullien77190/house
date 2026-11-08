// Les couches du plan sur la carte : une source fixe, une source vivante pour les formes et une pour les points (poignées et zones de saisie). Les largeurs de trait
// se donnent en unités du plan (donc en mètres) : elles suivent le zoom comme le plan lui-même.
import type { FeatureCollection } from 'geojson'
import type { ExpressionSpecification, FilterSpecification, Map as MapLibreMap } from 'maplibre-gl'
import { ICON_STROKE_WIDTH, ICON_STROKE_ZOOM, MAP_CENTER, MAP_PLAN_OPACITY, MAP_UNITS_PER_METER, ROOM_FILL, ROOM_LINE } from './constants'
import type { Palette } from './features'
import { metersPerPixel } from './helpers'

export const STATIC_SOURCE = 'plan-fixe'
export const SHAPES_SOURCE = 'plan-formes'
export const POINTS_SOURCE = 'plan-points'

/** Le contour des lampes, des caméras et des prises : 1 px de loin, 2 px dès `ICON_STROKE_ZOOM`. */
const ICON_STROKE: ExpressionSpecification = ['step', ['zoom'], 1, ICON_STROKE_ZOOM, ICON_STROKE_WIDTH]

/** Les couches du plan, de bas en haut. */
export const PLAN_LAYERS = [
  'plan-beton',
  'plan-garage',
  'plan-pavage',
  'plan-cage',
  'plan-cage-trait',
  'plan-toit',
  'plan-pieces',
  'plan-pieces-trait',
  'plan-cloisons',
  'plan-claustras',
  'plan-haies',
  'plan-portails',
  'plan-portes',
  'plan-arbres',
  'plan-arbres-trait',
  'plan-vue',
  'plan-cameras',
  'plan-cameras-trait',
  'plan-lampes',
  'plan-lampes-trait',
  'plan-prises',
  'plan-prises-trait',
  'plan-saisie',
  'plan-poignees',
] as const

/** Ce qu'on peut saisir à la souris, du plus au moins prioritaire. */
export const INTERACTIVE_LAYERS = [
  'plan-poignees',
  'plan-saisie',
  'plan-portes',
  'plan-arbres',
  'plan-haies',
  'plan-cage',
  'plan-garage',
] as const

/** Une largeur en unités du plan, en pixels, selon le zoom : exponentielle de base 2 (la carte double à chaque niveau), donc exacte entre les deux bornes. */
const widthByZoom = (units: number): ExpressionSpecification => {
  const meters = units / MAP_UNITS_PER_METER
  const at = (zoom: number) => meters / metersPerPixel(MAP_CENTER[0], zoom + 1)
  return ['interpolate', ['exponential', 2], ['zoom'], 8, at(8), 24, at(24)]
}

export const addPlanLayers = (
  map: MapLibreMap,
  palette: Palette,
  shapes: FeatureCollection,
  points: FeatureCollection,
  fixed: FeatureCollection,
) => {
  map.addSource(STATIC_SOURCE, { type: 'geojson', data: fixed })
  map.addSource(SHAPES_SOURCE, { type: 'geojson', data: shapes })
  map.addSource(POINTS_SOURCE, { type: 'geojson', data: points })
  const only = (source: string, ...tests: unknown[]) => ({ source, filter: ['all', ...tests] as FilterSpecification })
  const part = (name: string) => ['==', ['get', 'part'], name]
  const kind = (name: string) => ['==', ['get', 'kind'], name]
  const opacity = MAP_PLAN_OPACITY

  map.addLayer({
    id: 'plan-beton',
    type: 'fill',
    ...only(STATIC_SOURCE, part('concrete')),
    paint: { 'fill-color': '#d1d5db', 'fill-opacity': opacity },
  })
  // Le chemin du garage : du béton, comme le reste, mais déplaçable.
  map.addLayer({
    id: 'plan-garage',
    type: 'fill',
    ...only(SHAPES_SOURCE, kind('garage')),
    paint: { 'fill-color': '#d1d5db', 'fill-opacity': opacity },
  })
  map.addLayer({
    id: 'plan-pavage',
    type: 'fill',
    ...only(SHAPES_SOURCE, kind('tiles')),
    paint: { 'fill-color': '#fdba74', 'fill-opacity': opacity },
  })
  map.addLayer({
    id: 'plan-cage',
    type: 'fill',
    ...only(SHAPES_SOURCE, kind('cage')),
    paint: { 'fill-color': '#fecaca', 'fill-opacity': opacity },
  })
  map.addLayer({
    id: 'plan-cage-trait',
    type: 'line',
    ...only(SHAPES_SOURCE, kind('cage')),
    paint: { 'line-color': '#dc2626', 'line-width': widthByZoom(3), 'line-opacity': opacity },
  })
  map.addLayer({
    id: 'plan-toit',
    type: 'fill',
    ...only(STATIC_SOURCE, part('roof')),
    paint: { 'fill-color': '#374151', 'fill-opacity': opacity },
  })
  // Toit caché : les pièces (un fond clair), leurs murs, les cloisons et les claustras (en pointillés).
  map.addLayer({
    id: 'plan-pieces',
    type: 'fill',
    ...only(STATIC_SOURCE, part('room')),
    layout: { visibility: 'none' },
    paint: { 'fill-color': ROOM_FILL, 'fill-opacity': 0.6 },
  })
  map.addLayer({
    id: 'plan-pieces-trait',
    type: 'line',
    ...only(STATIC_SOURCE, part('room')),
    layout: { visibility: 'none', 'line-join': 'round' },
    paint: { 'line-color': ROOM_LINE, 'line-width': widthByZoom(5) },
  })
  map.addLayer({
    id: 'plan-cloisons',
    type: 'line',
    ...only(STATIC_SOURCE, part('wall'), ['!=', ['get', 'screen'], 1]),
    layout: { visibility: 'none', 'line-cap': 'round' },
    paint: { 'line-color': ROOM_LINE, 'line-width': widthByZoom(5) },
  })
  map.addLayer({
    id: 'plan-claustras',
    type: 'line',
    ...only(STATIC_SOURCE, part('wall'), ['==', ['get', 'screen'], 1]),
    layout: { visibility: 'none' },
    paint: { 'line-color': ROOM_LINE, 'line-width': widthByZoom(5), 'line-dasharray': [2, 2] },
  })
  map.addLayer({
    id: 'plan-haies',
    type: 'line',
    ...only(SHAPES_SOURCE, kind('hedge')),
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#15803d',
      'line-width': widthByZoom(28),
      'line-opacity': ['case', ['==', ['get', 'selected'], 1], 0.6, opacity],
    },
  })
  map.addLayer({
    id: 'plan-portails',
    type: 'line',
    ...only(SHAPES_SOURCE, kind('gate')),
    layout: { 'line-cap': 'butt' },
    paint: { 'line-color': '#92400e', 'line-width': widthByZoom(9), 'line-opacity': opacity },
  })
  // La zone de saisie des portes : un trait transparent bien plus épais que le dessin (une porte est fine, 23 cm).
  map.addLayer({
    id: 'plan-portes',
    type: 'line',
    ...only(SHAPES_SOURCE, kind('gate')),
    paint: { 'line-color': '#000000', 'line-opacity': 0, 'line-width': 20 },
  })
  map.addLayer({ id: 'plan-arbres', type: 'fill', ...only(SHAPES_SOURCE, kind('tree')), paint: { 'fill-color': ['get', 'color'] } })
  map.addLayer({
    id: 'plan-arbres-trait',
    type: 'line',
    ...only(SHAPES_SOURCE, kind('tree')),
    paint: { 'line-color': ['get', 'stroke'], 'line-width': ['get', 'strokeWidth'] },
  })
  map.addLayer({
    id: 'plan-vue',
    type: 'fill',
    ...only(SHAPES_SOURCE, kind('fov')),
    paint: { 'fill-color': palette.accent, 'fill-opacity': 0.3, 'fill-outline-color': palette.accent },
  })
  map.addLayer({
    id: 'plan-cameras',
    type: 'fill',
    ...only(SHAPES_SOURCE, kind('camera')),
    paint: { 'fill-color': '#000000' },
  })
  // Le contour d'une caméra : bleu, ou rouge quand sa vraie caméra est éteinte ou qu'elle n'est liée à aucune (la couleur vient de l'élément).
  map.addLayer({
    id: 'plan-cameras-trait',
    type: 'line',
    ...only(SHAPES_SOURCE, kind('camera')),
    layout: { 'line-join': 'round' },
    paint: { 'line-color': ['get', 'stroke'], 'line-width': ICON_STROKE },
  })
  map.addLayer({
    id: 'plan-lampes',
    type: 'fill',
    ...only(SHAPES_SOURCE, kind('lamp')),
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'opacity'], 'fill-outline-color': ['get', 'stroke'] },
  })
  // Le contour des lampes : 1 px de loin, 2 px zoomé (celui d’un remplissage n’en a qu’un fixe).
  map.addLayer({
    id: 'plan-lampes-trait',
    type: 'line',
    ...only(SHAPES_SOURCE, kind('lamp')),
    layout: { 'line-join': 'round' },
    paint: { 'line-color': ['get', 'stroke'], 'line-width': ICON_STROKE },
  })
  map.addLayer({
    id: 'plan-prises',
    type: 'fill',
    ...only(SHAPES_SOURCE, kind('plug')),
    paint: { 'fill-color': ['get', 'color'], 'fill-outline-color': ['get', 'stroke'] },
  })
  map.addLayer({
    id: 'plan-prises-trait',
    type: 'line',
    ...only(SHAPES_SOURCE, kind('plug')),
    layout: { 'line-join': 'round' },
    paint: { 'line-color': ['get', 'stroke'], 'line-width': ICON_STROKE },
  })
  // La zone de saisie des caméras, lampes et prises : un rond transparent plus large que le dessin, pour les attraper même de loin.
  map.addLayer({
    id: 'plan-saisie',
    type: 'circle',
    source: POINTS_SOURCE,
    filter: ['in', ['get', 'kind'], ['literal', ['camera-hit', 'lamp-hit', 'plug-hit']]],
    paint: { 'circle-radius': 14, 'circle-color': '#000000', 'circle-opacity': 0 },
  })
  map.addLayer({
    id: 'plan-poignees',
    type: 'circle',
    source: POINTS_SOURCE,
    filter: ['in', ['get', 'kind'], ['literal', ['camera-handle', 'tree-handle', 'hedge-vertex']]],
    paint: { 'circle-radius': 7, 'circle-color': palette.accent, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 },
  })
}
