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
/** Le titre de la section repliable du plan. */
export const PLAN_SECTION_TITLE = 'Plan'
/** Le plan est ouvert au départ sur grand écran (dès 1024 px), fermé sur mobile. */
export const DESKTOP_QUERY = '(min-width: 1024px)'
export const ERROR_TEXT = 'Le pont Hue n’a pas répondu.'
export const NOT_CONFIGURED_TEXT = 'Le pont Hue n’est pas configuré (HUE_APP_KEY).'
export const EMPTY_TEXT = 'Aucune lampe trouvée.'
export const LOADING_TEXT = 'Chargement des lumières…'
/**
 * Les zones de la maison et leurs lampes, par identifiant de lampe du pont (leurs noms peuvent changer, pas leur identifiant) :
 * une zone se commande d'un coup (allumer, éteindre, luminosité), à la place des pièces du pont, qui ne suivent pas la maison.
 */
export const ZONES: { id: string; name: string; lights: string[]; sensors?: string[] }[] = [
  { id: 'chambre-1', name: 'Chambre 1', lights: ['15'] },
  // « SdB 2 » (lampe 1) n'est dans aucune zone : elle est dans le groupe « À placer » tant qu'on ne sait pas où la mettre.
  { id: 'sdb', name: 'SdB', lights: ['9', '10', '19', '8', '6', '4'] },
  { id: 'wc', name: 'WC', lights: ['28'] },
  { id: 'cuisine', name: 'Cuisine', lights: ['13', '14', '3'] },
  { id: 'couloir', name: 'Couloir', lights: ['7'] },
  { id: 'entree', name: 'Entrée', lights: ['27'] },
  { id: 'salon', name: 'Salon', lights: ['11', '16', '18', '22'] },
  // Les deux détecteurs de mouvement de la cage à perruches (identifiants du pont) : mouvement, température et luminosité.
  { id: 'voliere', name: 'Volière', lights: ['26'], sensors: ['54', '57'] },
]
/** Les zones que « Tout allumer » et « Tout éteindre » ne touchent pas : la volière (la lampe des perruches) reste à part. */
export const EXCLUDED_FROM_ALL = ['voliere']
/** Les lampes d'aucune zone, qu'il reste à placer : réunies dans un groupe « À placer », sans commande groupée. */
export const OTHER_ZONE = 'other'
export const OTHER_ZONE_NAME = 'À placer'

/**
 * Les positions que le navigateur gardait avant que l'API ne les garde : lues une fois, envoyées à l'API, puis effacées.
 */
export const LEGACY_STORAGE_KEY = 'house-lights-positions-v1'
/** Le temps de calme après un déplacement avant d'envoyer la position à l'API (le glisser en produit des dizaines). */
export const SAVE_DELAY_MS = 400

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
  { name: 'Entrée', rects: [{ x: 480, y: 140, w: 60, h: 50 }] },
  { name: 'Chambre 2', rects: [{ x: 0, y: 190, w: 210, h: 110 }] },
  {
    name: 'Salon',
    rects: [
      { x: 210, y: 140, w: 270, h: 160 },
      { x: 420, y: 190, w: 120, h: 110 },
    ],
    outline: 'M 210 140 H 480 V 190 H 540 V 300 H 210 Z',
  },
]

/**
 * Les cloisons en plus du contour des pièces, en unités du plan. Entre « WC » et « SdB 5 », dans la colonne de la salle de bain
 * (x de 150 à 210) : un mur collé au mur de droite (x = 210) qui s'arrête à 170 et laisse 20 unités d'ouverture avant le mur de gauche.
 */
export const PLAN_WALLS: PlanWall[] = [
  { x1: 170, y1: 90, x2: 210, y2: 90 },
  // Le claustra de l'entrée : le prolongement du mur sud de l'entrée (y = 190, de x = 480) jusqu'à la lampe « Entrée » (x = 404).
  { x1: 404, y1: 190, x2: 480, y2: 190, screen: true },
]

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

/** La zone « À placer » (la même que SIDE_ZONE de LightsPlan dans @house/ui) : les ampoules s'y rangent en colonnes de 10. */
export const SIDE_ZONE = { x: 590, w: 98 }
export const SIDE_TOP = -2
export const SIDE_ROW_HEIGHT = 32
export const SIDE_ROWS = 10
export const SIDE_COLUMN_WIDTH = 48
