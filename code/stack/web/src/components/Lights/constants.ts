import type { PlanRoom, PlanWall } from '@house/ui'
import type { Positions } from './types'

export const POLL_MS = 5000
export const AUTOMATIONS_TITLE = 'Automatisations'
/** Les règles du pont changent rarement : on les relit chaque minute. */
export const AUTOMATIONS_POLL_MS = 60_000
/** « Calme depuis 02/11 15:44 » : le début, puis la date écrite à la française. */
export const CALM_TEXT = 'Calme depuis'
export const MOTION_TEXT = 'Mouvement'
export const UNKNOWN_MOTION_TEXT = 'Mouvement inconnu'
export const DARK_TEXT = 'sombre'
/** La clé de « busy » pendant « Tout allumer » ou « Tout éteindre » (la même que celle de @house/ui). */
export const ALL_KEY = 'all'
/** Le nom de l'étage, lu par les lecteurs d'écran (il n'est pas écrit dans le plan). */
export const PLAN_TITLE = 'Rez-de-chaussée'
/** Le nom du bouton retour de l'écran du plan (téléphone), lu par les lecteurs d'écran. */
export const ERROR_TEXT = 'Le pont Hue n’a pas répondu.'
export const NOT_CONFIGURED_TEXT = 'Le pont Hue n’est pas configuré (HUE_APP_KEY).'
export const EMPTY_TEXT = 'Aucune lampe trouvée.'
/** La puissance max du pont : allumer une lampe envoie toujours cette luminosité. */
export const MAX_BRI = 254
export const LOADING_TEXT = 'Chargement des lumières…'
/**
 * Les zones de la maison et leurs lampes, par identifiant de lampe du pont (leurs noms peuvent changer, pas leur identifiant) :
 * une zone se commande d'un coup (allumer, éteindre, luminosité), à la place des pièces du pont, qui ne suivent pas la maison.
 */
export const ZONES: { id: string; name: string; lights: string[]; sensors?: string[] }[] = [
  // L'ordre de la liste : la volière (la lampe des perruches et les détecteurs de la cage), le salon, la cuisine, l'entrée, puis le reste. Les zones allumées ne remontent plus.
  // Les deux détecteurs de mouvement de la cage à perruches (identifiants du pont) : mouvement, température et luminosité.
  { id: 'voliere', name: 'Volière', lights: ['26'], sensors: ['54', '57'] },
  { id: 'salon', name: 'Salon', lights: ['11', '16', '18', '22'] },
  { id: 'cuisine', name: 'Cuisine', lights: ['13', '14', '3', '5'] },
  { id: 'entree', name: 'Entrée', lights: ['27'] },
  { id: 'chambre-1', name: 'Chambre 1', lights: ['15'] },
  // Les lampes du pont qui ne sont dans aucune zone (« SdB 2 », la lampe 1, par exemple) ne sont pas dans l'application.
  { id: 'sdb', name: 'SdB', lights: ['9', '10', '19', '8', '6', '4'] },
  { id: 'wc', name: 'WC', lights: ['28'] },
  { id: 'couloir', name: 'Couloir', lights: ['7'] },
]
/** Les zones que « Tout allumer » et « Tout éteindre » ne touchent pas : la volière (la lampe des perruches) reste à part. */
export const EXCLUDED_FROM_ALL = ['voliere']

/**
 * Les positions que le navigateur gardait avant que l'API ne les garde : lues comme les plus anciennes, jamais effacées ni réécrites.
 */
export const LEGACY_STORAGE_KEY = 'house-lights-positions-v1'

/**
 * Les pièces du rez-de-chaussée, la même géométrie que GROUND_ROOMS dans src/plan.ts du site, ramenée à l'origine de la maison
 * (le site la place en 180, 100). Le salon est en L : il monte jusqu'à la cuisine.
 */
export const PLAN_ROOMS: PlanRoom[] = [
  // La chambre 1 descend jusqu'au mur de la chambre 2 (y = 190) : la partie gauche de l'ancien couloir est la chambre.
  // Le mur entre la chambre 1 et la salle de bain / le couloir est à x = 135 (15 unités plus à gauche que sur le schéma du site).
  { name: 'Chambre 1', rects: [{ x: 0, y: 0, w: 135, h: 190 }] },
  { name: 'SdB', rects: [{ x: 135, y: 0, w: 75, h: 140 }] },
  { name: 'Cuisine', rects: [{ x: 210, y: 0, w: 210, h: 140 }] },
  { name: 'Escalier ↓ sous-sol', rects: [{ x: 420, y: 0, w: 120, h: 140 }] },
  // Le couloir est la petite zone entre le mur de la chambre 1 (x = 135) et celui du salon (x = 210), là où est la lampe « Couloir ».
  { name: 'Couloir', rects: [{ x: 135, y: 140, w: 75, h: 50 }] },
  // L'entrée est deux fois plus étroite que sur le schéma du site (60 au lieu de 120), collée au mur est ; la place libérée est au salon.
  // Devant la porte, dehors, le carré de l'entrée (1,5 m de large, de la même hauteur que la pièce : ses murs nord et sud sont dans l'alignement de ceux de l'entrée) : la maison n'est pas un rectangle parfait. Fondue à la pièce (un seul contour).
  {
    name: 'Entrée',
    rects: [
      { x: 480, y: 140, w: 60, h: 50 },
      { x: 540, y: 140, w: 59, h: 50 },
    ],
  },
  { name: 'Chambre 2', rects: [{ x: 0, y: 190, w: 210, h: 110 }] },
  {
    name: 'Salon',
    rects: [
      { x: 210, y: 140, w: 270, h: 160 },
      { x: 420, y: 190, w: 120, h: 110 },
    ],
  },
]

/**
 * Les cloisons en plus du contour des pièces, en unités du plan. Entre « WC » et « SdB 5 », dans la colonne de la salle de bain
 * (x de 150 à 210) : un mur collé au mur de droite (x = 210) qui s'arrête à 170 et laisse 20 unités d'ouverture avant le mur de gauche.
 */
export const PLAN_WALLS: PlanWall[] = [
  { x1: 170, y1: 90, x2: 210, y2: 90 },
]

/**
 * Le mur de l'entrée (c'était un claustra en pointillé) : le prolongement du mur sud de la pièce « Entrée » vers la gauche, jusqu'à la lampe « Entrée » (x = 404). Il suit le mur sud de la pièce, où qu'on
 * l'ait déplacé (les murs de la maison se modifient) : son ordonnée est celle du bas de la pièce, son bout droit son bord gauche.
 */
export const PLAN_ENTRANCE_WALL = { room: 'Entrée', fromX: 404 }

/**
 * Où sont posées les ampoules, par identifiant de lampe du pont : celles que tu as placées sur le plan (540 × 300, origine en haut
 * à gauche de la maison). Une lampe qui n'est pas ici attend dans la zone « À placer », à droite de la maison.
 */
export const LAMP_POSITIONS: Positions = {
  '3': { x: 331, y: 140 },
  '4': { x: 205, y: 14 },
  '6': { x: 207, y: 40 },
  '7': { x: 171, y: 166 },
  '8': { x: 194, y: 66 },
  '9': { x: 162, y: 24 },
  '10': { x: 163, y: 117 },
  '11': { x: 263, y: 237 },
  '13': { x: 263, y: 68 },
  '14': { x: 289, y: 140 },
  '15': { x: 65, y: 75 },
  '16': { x: 455, y: 236 },
  '18': { x: 527, y: 263 },
  '19': { x: 162, y: 64 },
  '22': { x: 526, y: 211 },
  '26': { x: 559, y: -22 },
  '27': { x: 404, y: 162 },
  '28': { x: 204, y: 115 },
}

/**
 * Les ouvertures : des morceaux de mur qui n'existent pas (la cuisine est ouverte sur le salon). Le contour d'une pièce est dessiné en traits de mur, et ce qui tombe sur une ouverture n'est
 * pas dessiné. Un segment horizontal ou vertical, en unités du plan (540 × 300) : ici le mur entre la cuisine et le salon : il porte les ampoules « Bar 1 » (x = 289) et « Bar 2 » (x = 331) et va jusqu'à « Bar 2 ; de là au mur de droite (x = 420), la cuisine est ouverte.
 */
export const PLAN_OPENINGS: PlanWall[] = [{ x1: 331, y1: 140, x2: 420, y2: 140 }]

/** La zone « À placer » de l ancien plan : une position gardée à droite de cette abscisse veut dire « pas encore placée ». */
export const SIDE_ZONE = { x: 590, w: 98 }
/** La cage à perruches : 5 m sur 3 m (tournée d'un quart de tour : 117 × 195 unités), dans l'angle nord-est du jardin, à droite de la maison. */
// La cage fait exactement 6 × 85 cm sur 4 × 85 cm (5,1 m sur 3,4 m, le grand côté vertical), à l'échelle réelle de la carte (la maison de 12,4 m fait 540 unités) ; elle est
// décalée de 50 cm vers le bas par rapport au dessin d'origine (y = -262).
const CAGE_UNITS_PER_METER = 540 / 12.4
export const PLAN_CAGE = {
  x: 583,
  y: Math.round(-262 + 0.5 * CAGE_UNITS_PER_METER),
  w: Math.round(4 * 0.85 * CAGE_UNITS_PER_METER),
  h: Math.round(6 * 0.85 * CAGE_UNITS_PER_METER),
}
/** L'échelle du plan de la mosaïque : la maison fait 14 m (les 540 unités) sur 7,5 m (les 300), soit environ 39 unités le mètre. */
export const UNITS_PER_METER = 39
/** La terrasse orange clair autour de la maison : 1,5 m de large. */
export const PLAN_TERRACE = 1.5 * UNITS_PER_METER
export const PLAN_CAGE_LABEL = 'Cage à perruches'
/** La zone dessinée du plan de la mosaïque : un terrain bien plus large que la maison, qui paraît plus petite. */
export const PLAN_VIEW = { x: -325, y: -278, w: 1035, h: 1113 }
/** Le terrain : un quart de cercle de 26 m de rayon (1014 unités, centre (700, -190), l arc côté rue au sud-ouest) plus une bande de 2 m (78 unités) au nord. */
export const PLAN_GARDEN = 'M 700 -268 L -314 -268 L -314 -190 A 1014 1014 0 0 0 700 824 Z'
/** Les arbres du terrain au départ (le plan de la mosaïque les laisse déplacer et garde leurs positions). */
export const DEFAULT_TREES = [
  { id: 't1', x: -242, y: -124, r: 16 },
  { id: 't2', x: -196, y: 136, r: 18 },
  { id: 't3', x: -60, y: 362, r: 14 },
  { id: 't4', x: 113, y: 562, r: 18 },
  { id: 't5', x: 348, y: 681, r: 16 },
  { id: 't6', x: 601, y: 754, r: 14 },
  { id: 't7', x: -150, y: -110, r: 16 },
  { id: 't8', x: 80, y: -120, r: 14 },
  { id: 't9', x: 250, y: -130, r: 18 },
  { id: 't10', x: 640, y: 470, r: 16 },
  { id: 't11', x: 650, y: 640, r: 14 },
  { id: 't12', x: 600, y: 780, r: 16 },
  // Trois arbres de plus, posés dehors de la propriété (à l'ouest, au-delà de l'arc de la rue) : à placer à la souris.
  { id: 'dehors-1', x: -480, y: -120, r: 30 },
  { id: 'dehors-2', x: -430, y: 120, r: 30 },
  { id: 'dehors-3', x: -290, y: 430, r: 30 },
  { id: 't13', x: 330, y: 560, r: 18 },
  { id: 't14', x: 110, y: 600, r: 14 },
  { id: 't15', x: 430, y: 690, r: 16 },
]
/** Le portail (à gauche, en haut mais pas tout en haut) et le portillon (en bas à droite, mais pas tout à droite), sur l'arc du terrain. */
export const PLAN_GATES = [
  { id: 'portail', name: 'Portail', x1: -273, y1: 40, x2: -228, y2: 184 },
  { id: 'portillon', name: 'Portillon', x1: 552, y1: 799, x2: 501, y2: 790 },
]
/** La maison est poussée de 1 m vers la droite (vers l'est). */
export const HOUSE_SHIFT = UNITS_PER_METER
/** L entrée : une avancée de 1,5 m (sur 2 m de large), fondue dans le toit de la maison (un seul contour) et centrée sur la pièce Entrée (centre à 183 sur la carte de 333 de haut, d où y = 140). */
export const PLAN_EXTENSION = { x: 540, y: 140, w: Math.round(1.5 * UNITS_PER_METER), h: 2 * UNITS_PER_METER }
/** Le sol carrelé : à droite de la maison, de sa terrasse à la limite de propriété (x = 700) et jusqu au bas de la cage ; le sol de la cage elle-même ; le chemin du portillon. */
export const PLAN_FLOORS = [
  {
    // Commence 2 unités en deçà du bord de la terrasse (637,5) : elles se chevauchent, pas de liseré entre elles.
    x: Math.floor(540 + HOUSE_SHIFT + PLAN_TERRACE) - 2,
    y: PLAN_CAGE.y + PLAN_CAGE.h,
    w: 700 - Math.floor(540 + HOUSE_SHIFT + PLAN_TERRACE) + 2,
    h: 358 - (PLAN_CAGE.y + PLAN_CAGE.h),
  },
  // Le joint entre le bas de la cage (y = -67) et le haut de la terrasse (y = -58,5), à droite de la maison : sans lui, un liseré sombre entre les carreaux.
  { x: PLAN_CAGE.x, y: PLAN_CAGE.y + PLAN_CAGE.h, w: Math.round(540 + HOUSE_SHIFT + PLAN_TERRACE) - PLAN_CAGE.x, h: 10 },
]
/**
 * La haie sur toute la limite de propriété (à 14 unités en dedans) : l'arc, sauf au portail et au portillon ; le bord ouest et le bord nord
 * de la bande du haut ; le bord est, sauf à droite de la cage à perruches (de y = -262 à -67), seul endroit sans haie.
 */
export const PLAN_HEDGES = [
  'M -300 -190 A 1000 1000 0 0 0 -273 40',
  'M -228 184 A 1000 1000 0 0 0 501 790',
  'M 552 799 A 1000 1000 0 0 0 700 810',
  'M -300 -190 L -300 -254 L 686 -254',
  'M 686 -67 L 686 810',
]
/**
 * Deux caméras sur la cage à perruches : une en bas à droite qui regarde tout droit en haut, une en haut à gauche qui regarde tout droit
 * en bas ; leur champ de vision est un croissant (40 à 50°, de 24 unités (0,6 m) jusqu à 190 ou 260 : il part tout près de la caméra).
 */
export const PLAN_CAMERAS = [
  {
    id: 'cage-bas-droite',
    name: 'Caméra voliere-interieur (bas à droite de la cage, regarde vers le haut)',
    x: 655,
    y: -73,
    angle: 0,
    fov: 50,
    near: 18,
    far: 190,
  },
  {
    id: 'cage-haut-gauche',
    name: 'Caméra voliere-exterieur (haut à gauche de la cage, regarde vers le bas)',
    x: 628,
    y: -256,
    angle: 180,
    fov: 50,
    near: 18,
    far: 190,
  },
  // Sur l'avancée de l'entrée (x 579 à 638, y 72 à 150 après le décalage de la maison), regarde vers la cage : presque tout droit en haut (5° vers la droite).
  {
    id: 'entree',
    name: 'Caméra voliere-toit (sur la maison, regarde vers la cage)',
    x: 608,
    y: 90,
    angle: 5,
    fov: 40,
    near: 18,
    far: 260,
  },
  // À côté de la cage, sur son flanc gauche, regarde le jardin à gauche (270° : tout droit vers la gauche).
  {
    id: 'cage-jardin',
    name: 'Caméra à côté de la cage (regarde le jardin à gauche)',
    x: 566,
    y: -165,
    angle: 270,
    fov: 60,
    near: 18,
    far: 330,
  },
  // Six caméras de plus (5 à 10), posées au nord de la maison en attendant d'être placées à la main (mode « Modifier » de la carte) ; liées à aucune vraie caméra au départ.
  { id: 'camera-5', name: 'Caméra 5 (à placer)', x: 170, y: -100, angle: 0, fov: 60, near: 18, far: 200 },
  { id: 'camera-7', name: 'Caméra 7 (à placer)', x: 170, y: -170, angle: 0, fov: 60, near: 18, far: 200 },
  { id: 'camera-8', name: 'Caméra 8 (à placer)', x: 330, y: -170, angle: 0, fov: 60, near: 18, far: 200 },
  { id: 'camera-9', name: 'Caméra 9 (à placer)', x: 170, y: -240, angle: 0, fov: 60, near: 18, far: 200 },
]
/**
 * Les quatre coins du chemin de béton gris clair, du portail au pavage de la maison (x = -21,75) : un peu plus large que le portail (3 unités de chaque côté, dans le prolongement
 * du portail) pour qu'il arrive pile à lui et pile aux carreaux ; il passe sous le pavage. Dans l'ordre : haut gauche, bas gauche (côté portail), bas droite, haut droite.
 * En modification, on déplace chaque coin à la main (`garage-corner-<n>` dans les éléments du plan gardé par l'API).
 */
export const PLAN_GARAGE_CORNERS: [number, number][] = [
  [-274, 37],
  [-227, 187],
  [-10, 187],
  [-10, 37],
]
/**
 * Le chemin carrelé de 1,5 m de large du portillon à la terrasse de la maison (y = 358) : son bout bas suit l'arc de la haie (rayon 1000)
 * pour ne pas dépasser dehors. Fondu dans le même tracé que le reste du pavage.
 */
export const PLAN_FLOOR_PATHS = ['M 498 358 H 556 V 800 A 1000 1000 0 0 1 498 789 Z']
/**
 * Les caméras de la maison qui sont sur le plan : le nom de la caméra (celui de l'API, le titre de sa vignette) et l'identifiant de son icône.
 * Passer la souris sur la vignette sélectionne l'icône ; sélectionner l'icône met la vignette en surbrillance.
 */
export const PLAN_CAMERA_LINKS: Record<string, string> = { 'voliere-interieur': 'cage-bas-droite', 'voliere-exterieur': 'cage-haut-gauche', 'salon-de-jardin': 'cage-jardin', 'voliere-toit': 'entree' }
/** La lampe « Perruche » (identifiant 26 du pont) dans la cage : au milieu (la cage va de 583 à 700 sur x, de -262 à -67 sur y). Son état est celui du pont. */
export const PLAN_LAMP_POSITION = { x: 657, y: -143 }
/** La prise connectée dans la cage, sous la lampe : son état (marche ou arrêt) est lu sur la prise. */
export const PLAN_PLUG_POSITION = { x: 641, y: -96 }
/** La lampe de la cage est dessinée de la taille de la prise (18 unités de large : rayon 9). */
export const PLAN_LAMP_RADIUS = 9
