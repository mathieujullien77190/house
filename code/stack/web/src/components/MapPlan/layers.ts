// Les couches du plan sur la carte : une source fixe, une source vivante pour les formes et une pour les points (poignées et zones de saisie). Les largeurs de trait
// se donnent en unités du plan (donc en mètres) : elles suivent le zoom comme le plan lui-même.
import type { FeatureCollection } from 'geojson'
import {
  SHUTTER_CLOSED_IMAGE,
  SHUTTER_OPEN_IMAGE,
  PLUG_IMAGE,
  EMOJI_PREFIX,
  TEMPERATURE_PREFIX,
  AC_IMAGE,
  CAMERA_IMAGE,
  CAMERA_DOT_MISSING_IMAGE,
  CAMERA_DOT_OFF_IMAGE,
  CAMERA_DOT_ON_IMAGE,
  SHUTTER_DOT_CLOSED_IMAGE,
  SHUTTER_DOT_OPEN_IMAGE,
  LAMP_PREFIX,
  AC_HOVER_IMAGE,
  CAMERA_HOVER_IMAGE,
  LAMP_HOVER_PREFIX,
  PLUG_HOVER_IMAGE,
  SHUTTER_CLOSED_HOVER_IMAGE,
  SHUTTER_OPEN_HOVER_IMAGE,
} from './icons'
import type { ExpressionSpecification, FilterSpecification, LayerSpecification, Map as MapLibreMap } from 'maplibre-gl'
import { MAP_CENTER, MAP_PLAN_OPACITY, MAP_UNITS_PER_METER, ROOM_FILL, ROOM_LINE } from './constants'
import type { Palette } from './features'
import { metersPerPixel } from './helpers'

export const STATIC_SOURCE = 'plan-fixe'
export const SHAPES_SOURCE = 'plan-formes'
export const POINTS_SOURCE = 'plan-points'
/** La ligne entre l'objet choisi et son bloc (une ligne, ou rien). */
export const LINK_SOURCE = 'plan-lien'

/** Le filtre du survol quand rien n'est survolé : aucun point n'a cet identifiant. */
export const HOVER_NONE: FilterSpecification = ['==', ['get', 'id'], '__aucun__']

/** Les couches du plan, de bas en haut. */
export const PLAN_LAYERS = [
  'plan-garage',
  'plan-pavage',
  'plan-beton',
  'plan-cage',
  'plan-cage-trait',
  'plan-toit',
  'plan-pieces',
  'plan-cloisons',
  'plan-haies',
  'plan-portails',
  'plan-lien',
  'plan-cameras',
  'plan-survol-cameras',
  'plan-cameras-etat',
  'plan-arbres',
  'plan-arbres-trait',
  'plan-vue',
  'plan-lampes',
  'plan-survol-lampes',
  'plan-clims',
  'plan-survol-clims',
  'plan-clims-etat',
  'plan-volets',
  'plan-survol-volets',
  'plan-volets-etat',
  'plan-prises',
  'plan-survol-prises',
  'plan-prises-etat',
  'plan-etiquettes',
  'plan-decors',
  'plan-emojis',
  'plan-saisie',
  'plan-poignees',
] as const

/** Ce qu'on peut saisir à la souris, du plus au moins prioritaire : la poignée d'une caméra, puis les icônes. */
export const INTERACTIVE_LAYERS = ['plan-poignees', 'plan-saisie'] as const

/**
 * Le jumeau d'un calque d'icônes pour le survol : mêmes position, taille et rotation, mais l'image de l'icône sur fond **bleu pâle** (le fond blanc du rond devient bleu). Il ne montre
 * que l'objet survolé (son filtre est réglé par `edit.ts`) et se pose juste au-dessus de l'icône normale, sous sa pastille d'état.
 */
const hoverTwin = (base: LayerSpecification, id: string, image: ExpressionSpecification | string): LayerSpecification =>
  ({ ...base, id, filter: HOVER_NONE, layout: { ...(base as { layout?: object }).layout, 'icon-image': image } }) as LayerSpecification

/** Un calque d'icônes de caméra : l'image (fond blanc, caméra noire), de taille presque fixe, tournée vers où regarde la caméra. */
const cameraLayer = (id: string): LayerSpecification => ({
  id,
  type: 'symbol',
  source: POINTS_SOURCE,
  filter: ['==', ['get', 'kind'], 'camera-hit'],
  layout: {
    'icon-image': CAMERA_IMAGE,
    'icon-size': CAMERA_SIZE,
    // L'icône regarde à droite (90° depuis le haut) ; l'angle du plan se compte depuis le haut, dans le sens des aiguilles d'une montre.
    'icon-rotate': ['-', ['get', 'angle'], 90],
    'icon-rotation-alignment': 'viewport',
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
  },
})

/** La pastille d'état d'une caméra : un petit disque **centré sur le contour** de son rond, en haut à droite (à 45° : le rayon du rond, 14,5 px, fois cos 45°) (vert allumée, rouge éteinte, gris quand elle n'existe pas), sans rotation : il reste au coin quand l'icône tourne. */
const cameraDotLayer = (id: string): LayerSpecification => ({
  id,
  type: 'symbol',
  source: POINTS_SOURCE,
  filter: ['==', ['get', 'kind'], 'camera-hit'],
  layout: {
    'icon-image': ['match', ['get', 'state'], 'off', CAMERA_DOT_OFF_IMAGE, 'missing', CAMERA_DOT_MISSING_IMAGE, CAMERA_DOT_ON_IMAGE],
    'icon-size': CAMERA_SIZE,
    'icon-offset': [10.3, -10.3],
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
  },
})

/** La taille des icônes de caméra (et de leur pastille) selon le zoom. */
const CAMERA_SIZE: ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], 18, 0.5, 20, 0.9, 22, 1.4]

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
  map.addSource(LINK_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  const only = (source: string, ...tests: unknown[]) => ({ source, filter: ['all', ...tests] as FilterSpecification })
  const part = (name: string) => ['==', ['get', 'part'], name]
  const kind = (name: string) => ['==', ['get', 'kind'], name]
  const opacity = MAP_PLAN_OPACITY

  // Le chemin du garage : du béton, comme le reste.
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
  // Le béton derrière la maison passe au-dessus des carreaux.
  map.addLayer({
    id: 'plan-beton',
    type: 'fill',
    ...only(STATIC_SOURCE, part('concrete')),
    paint: { 'fill-color': '#d1d5db', 'fill-opacity': opacity },
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
  // Toit caché : les pièces (un fond clair), leurs murs, et les cloisons.
  map.addLayer({
    id: 'plan-pieces',
    type: 'fill',
    ...only(STATIC_SOURCE, part('room')),
    layout: { visibility: 'none' },
    paint: { 'fill-color': ROOM_FILL, 'fill-opacity': 0.6 },
  })
  map.addLayer({
    id: 'plan-cloisons',
    type: 'line',
    ...only(STATIC_SOURCE, part('wall')),
    layout: { visibility: 'none', 'line-cap': 'round' },
    paint: { 'line-color': ROOM_LINE, 'line-width': widthByZoom(5) },
  })
  map.addLayer({
    id: 'plan-haies',
    type: 'line',
    ...only(SHAPES_SOURCE, kind('hedge')),
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#15803d',
      'line-width': widthByZoom(56),
      'line-opacity': opacity,
    },
  })
  map.addLayer({
    id: 'plan-portails',
    type: 'line',
    ...only(SHAPES_SOURCE, kind('gate')),
    layout: { 'line-cap': 'butt' },
    paint: { 'line-color': '#92400e', 'line-width': widthByZoom(9), 'line-opacity': opacity },
  })
  // La ligne bleue de l'objet choisi à son bloc : **sous les icônes** (calques posés avant elles), au-dessus du plan.
  map.addLayer({
    id: 'plan-lien',
    type: 'line',
    source: LINK_SOURCE,
    layout: { 'line-cap': 'round' },
    paint: { 'line-color': palette.accent, 'line-width': 2 },
  })
  // Les caméras (l'icône à la place de chaque point, tournée vers où regarde la caméra) : toutes **sous les arbres** (ils sont translucides, on les voit à travers).
  map.addLayer(cameraLayer('plan-cameras'))
  map.addLayer(hoverTwin(cameraLayer('plan-cameras'), 'plan-survol-cameras', CAMERA_HOVER_IMAGE))
  map.addLayer(cameraDotLayer('plan-cameras-etat'))
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
  // Les ampoules : l'icône d'ampoule à la place de chaque point (orange allumée, grise éteinte, rouge injoignable), d'opacité suivant la luminosité.
  const lampsLayer: LayerSpecification = {
    id: 'plan-lampes',
    type: 'symbol',
    source: POINTS_SOURCE,
    filter: ['==', ['get', 'kind'], 'lamp-hit'],
    layout: {
      // Une image par couleur, dessinée à la demande (`watchDynamicImages`) : `lamp-#ffa85a`.
      'icon-image': ['concat', LAMP_PREFIX, ['get', 'color']],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 18, 0.4, 20, 0.7, 22, 1.1],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  }
  map.addLayer(lampsLayer)
  map.addLayer(hoverTwin(lampsLayer, 'plan-survol-lampes', ['concat', LAMP_HOVER_PREFIX, ['get', 'color']]))
  // Les climatisations : l'icône de climatisation (fond blanc, noire, orientée selon son mur) à la place de chaque point, et sa pastille d'état sur le contour (verte allumée, rouge éteinte, grise injoignable).
  const acsLayer: LayerSpecification = {
    id: 'plan-clims',
    type: 'symbol',
    source: POINTS_SOURCE,
    filter: ['==', ['get', 'kind'], 'ac-hit'],
    layout: {
      'icon-image': AC_IMAGE,
      'icon-size': CAMERA_SIZE,
      // L'orientation de la climatisation (degrés, sens horaire) : posée à la main selon le mur où elle est.
      'icon-rotate': ['get', 'rotate'],
      'icon-rotation-alignment': 'viewport',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  }
  map.addLayer(acsLayer)
  map.addLayer(hoverTwin(acsLayer, 'plan-survol-clims', AC_HOVER_IMAGE))
  map.addLayer({
    id: 'plan-clims-etat',
    type: 'symbol',
    source: POINTS_SOURCE,
    filter: ['==', ['get', 'kind'], 'ac-hit'],
    layout: {
      'icon-image': ['match', ['get', 'state'], 'off', CAMERA_DOT_OFF_IMAGE, 'lost', CAMERA_DOT_MISSING_IMAGE, CAMERA_DOT_ON_IMAGE],
      'icon-size': CAMERA_SIZE,
      'icon-offset': [10.3, -10.3],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  })
  // Les volets roulants : l'icône d'une fenêtre fermée ou ouverte à la place de chaque point (fermée seulement si le dernier ordre était « descendre »).
  const shuttersLayer: LayerSpecification = {
    id: 'plan-volets',
    type: 'symbol',
    source: POINTS_SOURCE,
    filter: ['==', ['get', 'kind'], 'shutter-hit'],
    layout: {
      'icon-image': ['case', ['==', ['get', 'closed'], 1], SHUTTER_CLOSED_IMAGE, SHUTTER_OPEN_IMAGE],
      // Le rond du volet est aussi gros que celui d'une caméra.
      'icon-size': CAMERA_SIZE,
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  }
  map.addLayer(shuttersLayer)
  map.addLayer(
    hoverTwin(shuttersLayer, 'plan-survol-volets', [
      'case',
      ['==', ['get', 'closed'], 1],
      SHUTTER_CLOSED_HOVER_IMAGE,
      SHUTTER_OPEN_HOVER_IMAGE,
    ]),
  )
  // La pastille d'état du volet, sur le contour de son rond comme celle d'une caméra : bleue ouvert, violette fermé.
  map.addLayer({
    id: 'plan-volets-etat',
    type: 'symbol',
    source: POINTS_SOURCE,
    filter: ['==', ['get', 'kind'], 'shutter-hit'],
    layout: {
      'icon-image': ['case', ['==', ['get', 'closed'], 1], SHUTTER_DOT_CLOSED_IMAGE, SHUTTER_DOT_OPEN_IMAGE],
      'icon-size': CAMERA_SIZE,
      'icon-offset': [10.3, -10.3],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  })
  // La prise (le chauffage) : un radiateur noir sur un rond blanc à la place de son point, et sa pastille d'état sur le contour (verte allumée, rouge éteinte).
  const plugsLayer: LayerSpecification = {
    id: 'plan-prises',
    type: 'symbol',
    source: POINTS_SOURCE,
    filter: ['==', ['get', 'kind'], 'plug-hit'],
    layout: {
      'icon-image': PLUG_IMAGE,
      'icon-size': CAMERA_SIZE,
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  }
  map.addLayer(plugsLayer)
  map.addLayer(hoverTwin(plugsLayer, 'plan-survol-prises', PLUG_HOVER_IMAGE))
  map.addLayer({
    id: 'plan-prises-etat',
    type: 'symbol',
    source: POINTS_SOURCE,
    filter: ['==', ['get', 'kind'], 'plug-hit'],
    layout: {
      'icon-image': ['case', ['==', ['get', 'on'], 1], CAMERA_DOT_ON_IMAGE, CAMERA_DOT_OFF_IMAGE],
      'icon-size': CAMERA_SIZE,
      'icon-offset': [10.3, -10.3],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  })
  // Les étiquettes de température posées sur le plan (dehors, dans la cage) : le même rectangle arrondi, centré sur son point.
  map.addLayer({
    id: 'plan-etiquettes',
    type: 'symbol',
    source: POINTS_SOURCE,
    filter: ['all', ['==', ['get', 'kind'], 'label-hit'], ['!=', ['get', 'temp'], '']],
    layout: {
      'icon-image': ['concat', TEMPERATURE_PREFIX, ['get', 'temp']],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 18, 0.4, 20, 0.7, 22, 1.1],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  })
  // Les icônes seules (la pompe à chaleur) : sans rond, posées sur leur point.
  map.addLayer({
    id: 'plan-decors',
    type: 'symbol',
    source: POINTS_SOURCE,
    filter: ['==', ['get', 'kind'], 'decor-hit'],
    layout: {
      'icon-image': ['get', 'image'],
      'icon-size': CAMERA_SIZE,
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  })
  // Les emoji des clips sauvegardés : un rond blanc à contour noir avec le pictogramme, posé sur son point.
  map.addLayer({
    id: 'plan-emojis',
    type: 'symbol',
    source: POINTS_SOURCE,
    filter: ['==', ['get', 'kind'], 'emoji-hit'],
    layout: {
      'icon-image': ['concat', EMOJI_PREFIX, ['get', 'emoji']],
      'icon-size': CAMERA_SIZE,
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  })
  // La zone de saisie des caméras, lampes et prises : un rond transparent plus large que le dessin, pour les attraper même de loin.
  map.addLayer({
    id: 'plan-saisie',
    type: 'circle',
    source: POINTS_SOURCE,
    filter: [
      'in',
      ['get', 'kind'],
      ['literal', ['camera-hit', 'lamp-hit', 'plug-hit', 'ac-hit', 'shutter-hit', 'label-hit', 'emoji-hit', 'decor-hit']],
    ],
    paint: { 'circle-radius': 14, 'circle-color': '#000000', 'circle-opacity': 0 },
  })
  map.addLayer({
    id: 'plan-poignees',
    type: 'circle',
    source: POINTS_SOURCE,
    filter: ['==', ['get', 'kind'], 'camera-handle'],
    paint: { 'circle-radius': 7, 'circle-color': palette.accent, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 },
  })
}
