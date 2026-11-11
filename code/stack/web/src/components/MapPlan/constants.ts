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
export const MAP_ZOOM = 19.85
/** Le centre de la vue de départ, [latitude, longitude] : choisi à la main, il n'est pas celui du plan (`MAP_CENTER`, l'origine du plan, qui ne doit pas bouger). */
export const MAP_VIEW_CENTER: [number, number] = [48.522045, 2.650143]
export const MAP_MAX_ZOOM = 22
export const MAP_PLAN_OPACITY = 0.8

/** Le seul fond de carte : la photo aérienne (IGN, Géoplateforme, sans clé, dernier niveau natif 19 en tuiles de 256 px). */
const WMTS = 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'
export const RASTER_MAX_ZOOM = 19
export const RASTER_TILE_SIZE = 256
export const SATELLITE = { id: 'satellite', tiles: `${WMTS}&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg` }
export const ATTRIBUTION = '© IGN — Géoplateforme'

/** Les objets connectés ne se déplacent (et la caméra ne se règle) que quand ce bouton est enfoncé ; il ne l'est pas au départ. */
export const EDIT_LABEL = 'Modifier'
/** Le choix de la vraie caméra liée à la caméra du plan choisie (en mode modification). */
export const LINK_LABEL = 'Caméra liée'
export const LINK_NONE = 'Aucune'

export const WRAPPER_CLASS = 'relative'
export const MAP_CLASS = 'h-[530px] w-full overflow-hidden rounded-md border border-line'
/** Sur téléphone : la carte, en paysage, remplit l'espace qui reste sous la barre du haut (la hauteur de l'écran moins la barre et les marges), au moins 15 rem. */
export const MAP_FILL_CLASS = 'h-[calc(100dvh-8.5rem)] min-h-[15rem] w-full overflow-hidden rounded-md border border-line'
/** Sur téléphone, la marge (px) laissée sous la carte : le bas de la page (`py-4`). La hauteur est mesurée (`fitHeight`) ; `MAP_FILL_CLASS` n'est que la valeur avant la mesure. */
export const FILL_BOTTOM_GAP = 16
/** Les commandes posées sur la carte (au-dessus de ses couches : z 10) : le choix de la caméra liée (en modification) et l'erreur en haut à droite, les cases à cocher en bas à gauche, « Modifier » tout en bas à gauche, suivi des cases à cocher. */
export const LAYERS_CLASS = 'absolute right-2.5 top-2.5 z-10 flex flex-col items-end gap-2'
/** Le bouton « Modifier » tout en bas à gauche de la carte, suivi des cases à cocher sur la même ligne. */
export const ACTIONS_CLASS = 'absolute bottom-2.5 left-2.5 z-10 flex flex-wrap items-center gap-2'
/** L'erreur de la carte, sous les commandes (courte, qui se coupe). */
export const PROBLEM_CLASS = 'max-w-[16rem] text-[0.75rem] text-danger [overflow-wrap:anywhere]'

/** L'opacité d'une ampoule allumée selon sa luminosité (1 à 254) : jamais sous ce plancher (une lampe à 1 % reste visible). */
export const BRIGHTNESS_MAX = 254
export const BRIGHTNESS_FLOOR = 0.25
/** Le rayon d'une ampoule sur la carte, en unités du plan (assez gros pour la toucher du doigt). */
/** Le nombre de côtés du polygone d'un arbre : une carte ne sait dessiner que des segments, donc un « rond » est un polygone ; à 180 côtés l'écart au vrai cercle est sous 0,1 px même au zoom maximal avec le plus grand arbre (400 unités).  */
export const TREE_STEPS = 180
/** Les pièces vues toit caché. */
export const ROOM_FILL = '#f3f4f6'
export const ROOM_LINE = '#374151'
/** Le nom de l'ampoule touchée ou survolée, en bas de la carte et centré. */
export const LAMP_LABEL_CLASS =
  'pointer-events-none absolute bottom-14 left-1/2 z-10 -translate-x-1/2 rounded-md border border-line bg-bg/85 px-2 py-1 text-[0.8rem] text-fg'

/**
 * Les cases à cocher qui montrent ou cachent les icônes par type, en bas à gauche de la carte : **toutes cochées au départ**. Chaque type a ses calques (cachés avec la case) et son type de
 * zone de saisie (retirée du filtre de `plan-saisie` : une icône cachée ne se prend plus à la souris).
 */
export const FILTERS: { id: 'ac' | 'camera' | 'lamp' | 'shutter' | 'plug' | 'emoji'; label: string; layers: string[]; hit: string }[] = [
  { id: 'ac', label: 'Clim', layers: ['plan-clims', 'plan-clims-etat'], hit: 'ac-hit' },
  {
    id: 'camera',
    label: 'Caméra',
    layers: ['plan-cameras', 'plan-cameras-etat', 'plan-vue'],
    hit: 'camera-hit',
  },
  { id: 'lamp', label: 'Lumière', layers: ['plan-lampes'], hit: 'lamp-hit' },
  { id: 'shutter', label: 'Volet', layers: ['plan-volets', 'plan-volets-etat'], hit: 'shutter-hit' },
  { id: 'plug', label: 'Chauffage', layers: ['plan-prises', 'plan-prises-etat'], hit: 'plug-hit' },
  { id: 'emoji', label: 'Clip', layers: ['plan-emojis'], hit: 'emoji-hit' },
]
/** Les zones de saisie qui restent toujours (les étiquettes de température, la pompe à chaleur). */
export const ALWAYS_HIT = ['label-hit', 'decor-hit']
/** Les cases à cocher, **alignées en une ligne, à droite du bouton « Modifier », en bas à gauche de la carte** (elles passent à la ligne sur un écran étroit). */
/** Sur téléphone (`fill`) : les cases sont dans un petit menu qui s'ouvre au-dessus du bouton « Filtres ». */
export const FILTERS_LABEL = 'Filtres'
export const FILTERS_MENU_WRAPPER_CLASS = 'relative'
export const FILTERS_MENU_CLASS =
  'absolute bottom-full left-0 mb-2 flex flex-col gap-2 whitespace-nowrap rounded-md border border-line bg-card px-3 py-2 shadow-lg'
export const FILTERS_BAR_CLASS = 'flex flex-row flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line bg-card/90 px-2 py-1.5'
