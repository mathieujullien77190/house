import type { RunSpec, Vec3 } from './types'

// Dimensions en mètres (1 unité three.js = 1 m), d'après les photos : la cuisine est un U de 2,8 m de large, son fond (la hotte) à z = -1.2,
// le mur des fenêtres à x = 1.4 et, de l'autre côté, la cloison de bar. Le U est ouvert vers +z (l'est). Voir `ROOM` pour les axes.
// Les largeurs de caissons sont estimées sur les photos (plus ou moins 5 cm).
export const VIEW_HEIGHT = 520

export const TITLE = 'Séjour et cuisine en 3D (test)'
export const INTRO =
  'Un essai d’après les photos : tout l’espace de vie. La cuisine en U (caissons bleu nuit à cadre et poignées coquille, plan de travail en lames de bois clair, plaque à induction sous une hotte inox, évier de ferme blanc qui dépasse, lave-vaisselle, crédence de quatre rangées de carreaux), le séjour (canapé d’angle, télé, baies vitrées), la salle à manger ronde, le coin bureau, le coin repas avec le frigo et l’entrée ; parquet partout, lambris blanc au plafond et plaque de plâtre dans la cuisine. Positions et dimensions estimées, à corriger.'
export const HINT = 'Glisse (clic gauche ou clic molette) pour tourner, clic droit pour déplacer, molette (ou pincement) pour zoomer.'
export const ARIA_LABEL =
  'Cuisine en U en 3D : caissons bas bleu nuit, plan de travail en bois, plaque à induction sous une hotte en inox, évier de ferme blanc, lave-vaisselle et parquet : glisser pour tourner, molette pour zoomer'
export const HOOD_LABEL = 'Hotte'
export const RESET_LABEL = 'Réinitialiser la vue'
export const TOP_LABEL = 'Vue du dessus'
export const NO_WEBGL_TEXT = 'La vue 3D demande WebGL, que ce navigateur ne propose pas.'

/**
 * Tout l'espace de vie, d'après le plan de la maison de la WebApp (`PLAN_ROOMS` de `web/src/components/Lights/constants.ts`, 43,5 unités par mètre d'ouest en est).
 * Les axes de la scène ne sont pas ceux du plan : **x croît vers le nord** (x max : le mur des fenêtres de la cuisine, x min : la façade sud aux baies vitrées)
 * et **z croît vers l'est** (z min : le mur ouest de la télé et de la hotte, z max : le mur est du bureau et de la porte d'entrée).
 * La largeur nord-sud de la cuisine (2,8 m) vient des photos (le plan la donne plus large) ; la longueur ouest-est (7,4 m) vient du plan.
 */
export const ROOM = { xMin: -5.48, xMax: 1.4, zMin: -1.5, zMax: 5.99, height: 2.38 }
/** La cuisine : du mur ouest au mur de l'escalier (4,8 m), entre le mur des fenêtres et la cloison de bar. Son plafond est en plaque de plâtre, le reste de la pièce a un lambris blanc. */
export const KITCHEN = { xMin: -1.4, xMax: 1.4, zMin: -1.2, zMax: 3.47 }
/** L'entrée : un couloir sous l'escalier, entre la cuisine et la porte du mur est ; le claustra (x) le sépare du salon à partir du poteau (z). */
export const ENTRY = { x: -2.56, postZ: 2.74, claustraZ: 3.85, wallZ: 4.71, doorZ: 4.94, doorX: -1.84, doorWidth: 0.98, doorHeight: 2.11, northX: -0.68, muret: 0.58 }
/** Le retour de mur à droite du frigo : un bout de mur qui part du mur de l'escalier et revient de 50 cm vers le bar, à la limite de la cuisine et du salon. */
export const FRIDGE_WALL = { length: 0.5 }
/** Où se trouvent les meubles (centres, en mètres), d'après les photos : à corriger avec les vraies cotes. */
export const LAYOUT = {
  tv: { x: -4, width: 1.5 },
  door: { x: -2.05, width: 0.8 },
  pouf: { x: -2.85, z: -1.15 },
  sofa: { x: -4.03, z: 1.7 },
  coffee: { x: -3.35, z: 0.45 },
  armchair: { x: -2.2, z: 1.9 },
  dining: { x: -4, z: 3.75 },
  desk: { x: -3.8, z: 5.6 },
  libraryWindow: { z: 4.63 },
  bistro: { x: 0.95, z: 2.35 },
  cellar: { x: -0.08 },
  fridge: { x: -1.08 },
}

/** Un caisson bas : un socle en retrait, le corps, puis le plan de travail de 4 cm (85 cm au total). Les façades ont un cadre de 5,5 cm qui dépasse de 6 mm du panneau. */
export const CABINET = { depth: 0.6, plinth: 0.1, plinthSetback: 0.05, body: 0.78, front: 0.02, gap: 0.004, frame: 0.055, relief: 0.006 }
export const WORKTOP = { thickness: 0.04, overhang: 0.02 }
/** Le haut du plan de travail. */
export const COUNTER_TOP = CABINET.plinth + CABINET.body + WORKTOP.thickness

/** Les trois files du U. Le fond va de gauche à droite ; le côté droit (fenêtres) du fond vers l'avant ; le côté gauche (cloison) de l'avant vers le fond. */
export const RUNS: RunSpec[] = [
  {
    id: 'back',
    x: -0.8,
    z: -0.6,
    angle: 0,
    modules: [
      { kind: 'door', width: 0.4 },
      { kind: 'oven', width: 0.6 },
      { kind: 'door', width: 0.2 },
      { kind: 'door', width: 0.4 },
    ],
  },
  {
    id: 'right',
    x: 0.8,
    z: -1.2,
    angle: -Math.PI / 2,
    endPanel: true,
    modules: [
      { kind: 'door', width: 0.6 },
      { kind: 'sink', width: 0.6 },
      { kind: 'dishwasher', width: 0.6 },
      { kind: 'door', width: 0.7 },
    ],
  },
  {
    id: 'left',
    x: -0.8,
    z: 1.3,
    angle: Math.PI / 2,
    modules: [
      { kind: 'wine', width: 0.2 },
      { kind: 'drawers', width: 0.9 },
      { kind: 'door', width: 0.4 },
      { kind: 'door', width: 0.4 },
      { kind: 'door', width: 0.6 },
    ],
  },
]

/** La plaque : sur le four, au milieu du fond. */
export const HOB = { run: 'back', module: 1, width: 0.58, depth: 0.51, thickness: 0.006 }
/** La hotte inox au-dessus de la plaque : le bas du caisson, sa hauteur, sa largeur et sa profondeur en bas, la largeur du conduit jusqu'au plafond. */
export const HOOD = { bottom: 1.57, height: 0.32, widthBottom: 0.6, depthBottom: 0.5, widthTop: 0.2 }
/** La crédence en inox derrière la plaque. */
export const SPLASH = { width: 0.6, height: 0.7 }
/** L'évier de ferme : un bloc blanc de 60 cm dont la façade dépasse de 3 cm devant les portes et dont le bord monte de 10 cm au-dessus du plan. */
export const SINK = { width: 0.6, depth: 0.52, height: 0.22, wall: 0.04, above: 0.1, protrusion: 0.03 }
/** Le carrelage beige (métro) entre le plan de travail et les étagères. */
export const TILES = { height: 0.3 }
/** Entre la cuisine et le salon, depuis le mur ouest : un mur plein de 1,60 m (jusqu'à la porte du couloir, dans l'angle), puis le bar de 1,20 m (un muret coiffé d'une tablette en bois, lambris bleu côté salon), puis l'ouverture. */
export const PARTITION = { wall: 1.59, bar: 1.24, height: 1.09, thickness: 0.18, topWidth: 0.34 }
export const WINDOWS = { z: [-0.6, 0.3], width: 0.6, height: 1.15, bottom: 1.12 }
/** La fenêtre du coin repas, à côté de la petite table. */
export const NOOK_WINDOW = { z: 2.35, width: 1.2, height: 1.15, bottom: 1.12 }

export const COLORS = {
  cabinet: 0x1c3250,
  carcass: 0x142438,
  plinth: 0x14181d,
  wall: 0xf2efe9,
  tile: '#d9cfbb',
  tileGrout: '#b9ae9a',
  sink: 0xf8f8f5,
  brass: 0xb8923c,
  hob: 0x14171a,
  hobRing: 0x8a9096,
  steel: 0xc3c7cc,
  nickel: 0xb4b7ba,
  ovenGlass: 0x0e1012,
  wood: 0xd9a65c,
  shelf: 0xc08a4a,
  beam: 0xc08a4a,
  bracket: 0x15171a,
  window: 0xffffff,
  blind: 0xf1ead8,
  glass: 0xb8cfe4,
  lamp: 0x16181b,
  lampLight: 0xffd9a0,
  bottle: 0x2b5a3a,
  rack: 0xf4f1ea,
}

export const START: Vec3 = { x: -9.5, y: 7, z: 10.5 }
export const TOP: Vec3 = { x: -2.2, y: 13, z: 2.9 }
export const TARGET: Vec3 = { x: -2.2, y: 0.6, z: 2.5 }

/** Le plan de la maison de Home, en unités du plan (540 × 300) : le mur ouest de la cuisine et du salon, le mur est, le mur entre la cuisine et le salon, et le mur ouest de l'escalier. */
export const PLAN_HOUSE = { livingWest: 210, east: 540, kitchenSouth: 140, height: 300, stairsWest: 420 }
/**
 * La lumière d'une lampe Hue dans la scène : sa teinte sans couleur donnée (blanc chaud), son intensité à pleine puissance, le plancher
 * d'une lampe allumée au minimum, la hauteur d'une ampoule sans luminaire, et la distance sous laquelle une lampe prend un luminaire dessiné.
 */
export const LAMP_LIGHT = { color: '#ffd9a0', intensity: 5, floor: 0.12, height: 2.1, matchDistance: 2 }
export const LAMPS_ON_TEXT = (on: number, total: number): string => `${on} lampe${on > 1 ? 's' : ''} allumée${on > 1 ? 's' : ''} sur ${total} dans la pièce`

export const TITLE_CLASS = 'm-0 text-[1.15rem] font-semibold text-fg'
export const INTRO_CLASS = 'mb-3 mt-0.5 text-[0.9rem] text-muted'
export const BUTTONS_CLASS = 'mb-2 flex flex-wrap items-center gap-2'
export const HOST_CLASS = 'w-full overflow-hidden rounded-lg border border-line'
export const HINT_CLASS = 'mb-0 mt-2 text-xs text-muted'

/** La bibliothèque (caisses et livres du projet « order ») : l'écart avec le mur est, l'épaisseur d'un panneau, le bois des caisses et le noir du meuble vitré. */
export const LIBRARY = { gap: 0.05, board: 0.012, wood: 0xb08a5a, dark: 0x1a1c1f }

/**
 * Le mur est de la cuisine (celui de l'escalier), d'après le modèle SketchUp. Le frigo est posé devant, calé contre le retour de mur.
 * Deux niches y sont percées : le cellier (une ouverture de 66 cm sur 2 m, un réduit de 1,04 m de large et 52 cm de profondeur derrière)
 * et, vers les fenêtres, la niche du comptoir à verres (un meuble bas de 1,03 m et des tablettes au-dessus).
 */
export const NICHES = [
  { id: 'cellar', x: LAYOUT.cellar.x, width: 0.66, height: 2.02, inner: 1.04, depth: 0.52 },
  { id: 'bar', x: 0.94, width: 0.9, height: 2.1, inner: 0.9, depth: 0.49 },
]
