import { HOUSE_SHIFT } from '@/components/Lights/constants'

/** Le centre du bâti de la maison au cadastre (parcelle AO 0018 : un rectangle de 12,4 m sur 7,65 m, bâtiment 45761832 du Parcellaire Express) : latitude et longitude. */
export const MAP_CENTER: [number, number] = [48.52206745, 2.65013952]
/** Les unités du plan par mètre : la maison du plan fait 540 unités de large, le bâti 12,4 m. */
export const MAP_UNITS_PER_METER = 540 / 12.4
/** La hauteur de la maison sur la carte : les 7,65 m du bâti (le plan la dessine en 300 unités, soit 6,9 m ; ici elle est allongée pour coller au bâti). */
export const MAP_HOUSE_HEIGHT = Math.round(7.65 * MAP_UNITS_PER_METER)
/** Le point du plan posé sur ce centre : le milieu de la maison (540 de large, poussée de HOUSE_SHIFT vers la droite). */
export const MAP_ANCHOR = { x: HOUSE_SHIFT + 270, y: MAP_HOUSE_HEIGHT / 2 }
/**
 * Le plan est dessiné nord en haut ; sur le terrain, le grand côté de la maison fait 37,7° (sens horaire) avec l'est. La carte est tournée d'autant
 * (`bearing`), pour que la maison soit droite à l'écran ; le plan est tourné de cet angle dans le repère de la carte.
 */
export const MAP_ROTATION_DEG = 37.7
/** Le zoom de départ et le plus grand (MapLibre, tuiles de 512 px : un cran de moins que Leaflet pour la même échelle). */
export const MAP_ZOOM = 19.7
export const MAP_MAX_ZOOM = 22
export const MAP_PLAN_OPACITY = 0.8

/** Les fonds de carte : deux en images (IGN, Géoplateforme, sans clé, dernier niveau natif 19 en tuiles de 256 px), un en vecteur (Plan IGN, net à tout zoom). */
const WMTS = 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'
export const RASTER_MAX_ZOOM = 19
export const RASTER_TILE_SIZE = 256
export const BASES = [
  { id: 'satellite', label: 'Satellite', tiles: `${WMTS}&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg` },
  { id: 'vector', label: 'Vectoriel', tiles: '' },
] as const
export type BaseId = (typeof BASES)[number]['id']
/** Le fond de départ : la photo aérienne (le plan IGN en vecteur se choisit à côté). */
export const DEFAULT_BASE: BaseId = 'satellite'
/** Le style officiel du Plan IGN en tuiles vectorielles (sources, polices et pictogrammes compris) : la carte part de lui, la photo aérienne s'y ajoute. */
export const VECTOR_STYLE_URL = 'https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json'
export const ATTRIBUTION = '© IGN — Géoplateforme'

export const BASES_LABEL = 'Fond de carte'
/** Le plan ne se modifie (déplacer, régler, redimensionner) que quand ce bouton est enfoncé ; il ne l'est pas au départ. */
export const EDIT_LABEL = 'Modifier'
/** Le choix de la vraie caméra liée à la caméra du plan choisie (en mode modification). */
export const LINK_LABEL = 'Caméra liée'
export const LINK_NONE = 'Aucune'
export const RECENTER_LABEL = 'Recentrer'

export const WRAPPER_CLASS = 'relative'
export const MAP_CLASS = 'h-[530px] w-full overflow-hidden rounded-md border border-line'
/** Les commandes posées sur la carte (au-dessus de ses couches : z 10) : le choix du fond en haut à droite, « Recentrer » et « Modifier » en bas à droite. */
export const LAYERS_CLASS = 'absolute right-2.5 top-2.5 z-10 flex flex-col items-end gap-2'
export const ACTIONS_CLASS = 'absolute bottom-2.5 right-2.5 z-10 flex gap-2'
/** L'erreur de la carte, sous les commandes (courte, qui se coupe). */
export const PROBLEM_CLASS = 'max-w-[16rem] text-[0.75rem] text-danger [overflow-wrap:anywhere]'

/** L'opacité d'une ampoule allumée selon sa luminosité (1 à 254) : jamais sous ce plancher (une lampe à 1 % reste visible). */
export const BRIGHTNESS_MAX = 254
export const BRIGHTNESS_FLOOR = 0.25
/** Le rayon d'une ampoule sur la carte, en unités du plan (assez gros pour la toucher du doigt). */
export const LAMP_RADIUS = 6
/** Le contour d'une lampe, d'une caméra ou d'une prise : 1 px de loin, 2 px dès ce zoom. */
export const ICON_STROKE_ZOOM = 20.5
export const ICON_STROKE_WIDTH = 2
/** La marge autour des lampes quand la carte des lumières les cadre toutes, en pixels. */
export const FIT_PADDING = 48
/** Le toit se cache pour voir les pièces, les cloisons et les lampes. */
export const HIDE_ROOF_LABEL = 'Cacher le toit'
export const SHOW_ROOF_LABEL = 'Montrer le toit'
export const BACK_ARROW = '←'
/** Les pièces vues toit caché. */
export const ROOM_FILL = '#f3f4f6'
export const ROOM_LINE = '#374151'
/** L'écran du téléphone : la carte prend tout l'écran, avec un zoom de départ plus grand (la maison le remplit, en paysage comme en portrait). */
export const SCREEN_ZOOM = 20.6
export const SCREEN_WRAPPER_CLASS = 'fixed inset-0 z-30 bg-bg'
export const SCREEN_MAP_CLASS = 'h-full w-full overflow-hidden'
export const BACK_CLASS =
  'absolute left-2 top-2 z-10 cursor-pointer rounded-lg border border-line bg-bg/80 px-3 py-2 text-[0.9rem] text-fg focus-visible:outline-2 focus-visible:outline-accent'
/** Le nom de l'ampoule touchée ou survolée, en bas de la carte et centré. */
export const LAMP_LABEL_CLASS =
  'pointer-events-none absolute bottom-2.5 left-1/2 z-10 -translate-x-1/2 rounded-md border border-line bg-bg/85 px-2 py-1 text-[0.8rem] text-fg'
