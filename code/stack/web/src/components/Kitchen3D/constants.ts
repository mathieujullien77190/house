import type { RunSpec, Vec3 } from './types'

// Dimensions en mètres (1 unité three.js = 1 m), d'après les photos : la cuisine est un U de 2,8 m de large, son fond (la hotte) à z = -1.2,
// le mur des fenêtres à x = 1.4 et, de l'autre côté, la cloison de bar. Le U est ouvert vers +z (l'est). Voir `ROOM` pour les axes.
// Les largeurs de caissons sont estimées sur les photos (plus ou moins 5 cm).
export const VIEW_HEIGHT = 520

export const TITLE = 'La maison en 3D'
export const HINT = 'Glisse (clic gauche ou clic molette) pour tourner, clic droit pour déplacer, molette (ou pincement) pour zoomer. Clique une ampoule ou la clim pour l’allumer ou l’éteindre, une caméra pour l’ouvrir, une fenêtre pour monter ou descendre son volet.'
export const ARIA_LABEL =
  'Cuisine en U en 3D : caissons bas bleu nuit, plan de travail en bois, plaque à induction sous une hotte en inox, évier de ferme blanc, lave-vaisselle et parquet : glisser pour tourner, molette pour zoomer'
/** Les lampes Hue dont le luminaire est dessiné et nommé dans la scène (noms du pont, en minuscules) : elles s'y allument même sans place sur le plan. */
export const LAMP_FIXTURES = ['salon', 'salle à manger', 'ordi 1', 'ordi 2', 'cuisine 1', 'cuisine 2', 'bar 1', 'bar 2', 'entrée', 'couloir', 'chambre', 'sdb 1', 'sdb 3', 'sdb 4', 'sdb 5', 'sdb 6', 'sdb 7', 'hue ambiance lamp 1']
/**
 * La lumière du jour, mise d'une manière générale (pas de rayon par fenêtre) : l'ambiance de nuit (`night`), ce que le plein jour y ajoute
 * tous volets ouverts (`day`), et la force du soleil qui porte les ombres (`sun`). Entre les deux, elle suit la part de vitre découverte et le ciel.
 */
export const DAYLIGHT = { night: 0.2, day: 1.9, sun: 1.5 }
/** Plein jour forcé : la scène est éclairée comme en journée, volets ouverts, quelle que soit l'heure (plus simple pour la retoucher). À `false`, elle suit l'heure, la météo et les volets. */
export const ALWAYS_DAY = true
/** Les vraies caméras des deux modèles de la scène : celle du mât de l'entrée et celle du coin de la cage (les mêmes liens que `PLAN_CAMERA_LINKS` de `Lights/constants.ts`). */
export const MAST_CAMERA = 'voliere-toit'
export const GARDEN_CAMERA = 'salon-de-jardin'
/** La caméra posée dans la cage, juste derrière celle du jardin : elle regarde vers les poubelles, à travers la cage. */
export const CAGE_CAMERA = 'voliere-exterieur'
export const RESET_LABEL = 'Réinitialiser la vue'
export const TOP_LABEL = 'Vue du dessus'
export const NO_WEBGL_TEXT = 'La vue 3D demande WebGL, que ce navigateur ne propose pas.'

/**
 * Tout l'espace de vie, d'après le plan de la maison de la WebApp (`PLAN_ROOMS` de `web/src/components/Lights/constants.ts`, 43,5 unités par mètre d'ouest en est).
 * Les axes de la scène ne sont pas ceux du plan : **x croît vers le nord** (x max : le mur des fenêtres de la cuisine, x min : la façade sud aux baies vitrées)
 * et **z croît vers l'est** (z min : le mur ouest de la télé et de la hotte, z max : le mur est du bureau et de la porte d'entrée).
 * La largeur nord-sud de la cuisine (2,8 m) vient des photos (le plan la donne plus large) ; la longueur ouest-est (7,4 m) vient du plan.
 */
export const ROOM = { xMin: -5.48, xMax: 1.4, zMin: -1.5, zMax: 5.95, height: 2.36 }
/** La cuisine : du mur ouest au mur de l'escalier (4,8 m), entre le mur des fenêtres et la cloison de bar. Son plafond est en plaque de plâtre, le reste de la pièce a un lambris blanc. */
export const KITCHEN = { xMin: -1.4, xMax: 1.4, zMin: -1.2, zMax: 3.39 }
/** L'entrée : un couloir sous l'escalier, entre la cuisine et la porte du mur est ; le claustra (x) le sépare du salon à partir du poteau (z). Mesuré face à la porte : 19 cm de mur à droite (côté claustra), 3 cm à gauche, puis le mur nord revient de 1,43 m (`depth`) avant de rejoindre, 23,5 cm plus au sud, le retour de mur du frigo. */
export const ENTRY = { x: -2.59, postZ: 2.74, claustraZ: 3.85, wallZ: 4.71, doorZ: 4.94, doorX: -1.88, doorWidth: 0.88, doorHeight: 2.11, northX: -1.36, depth: 1.43, muret: 0.86 }
/** Le retour de mur à droite du frigo : un bout de mur qui part du mur de l'escalier et revient vers le bar (61 cm côté entrée, 49 cm côté cuisine), à la limite de la cuisine et du salon. */
const FRIDGE_WALL = { length: 0.49 }
/** Où se trouvent les meubles (centres, en mètres), d'après les photos : à corriger avec les vraies cotes. */
export const LAYOUT = {
  tv: { x: -3.95, width: 1.25 },
  door: { x: -2.05, width: 0.73 },
  pouf: { x: -2.72, z: -1.15 },
  sofa: { x: -4.35, z: 1.5 },
  coffee: { x: -3.75, z: 0.45 },
  armchair: { x: -2.84, z: 1.45 },
  dining: { x: -4, z: 3.15 },
  desk: { x: -3.72, z: 5.56 },
  libraryWindow: { z: 4.63 },
  bays: { door: { z: -0.55, width: 1.2 }, window: { z: 1.55, width: 2.2, height: 1.25, bottom: 0.95 }, curtains: [-1.32, 0.25, 2.46] },
  // Le buffet va du dernier rideau (son bord est à 2,61) jusqu'à 10 cm de la fenêtre du bureau.
  sideboard: { z: 3.33, width: 1.4, depth: 0.4, height: 0.9 },
  bistro: { x: 0.13, z: 2.53 },
  nookLamp: { x: 0.3, z: 2.35 },
  puzzle: { x: KITCHEN.xMin, y: 1.72, z: -0.5, width: 0.8, height: 0.58 },
  cellar: { x: 0.13 },
  fridge: { x: -0.925 },
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
    x: -0.75,
    z: 1.33,
    angle: Math.PI / 2,
    modules: [
      { kind: 'wine', width: 0.2 },
      { kind: 'drawers', width: 0.9 },
      { kind: 'door', width: 0.4 },
      { kind: 'door', width: 0.4 },
      { kind: 'door', width: 0.63 },
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
export const PARTITION = { wall: 1.59, bar: 1.24, height: 1.09, thickness: 0.22, ledge: 0.05 }
export const WINDOWS = { z: [-0.6, 0.45], width: 0.6, height: 2.27 - (COUNTER_TOP + TILES.height + 0.04), bottom: COUNTER_TOP + TILES.height + 0.04 }
/** La fenêtre du coin repas, à côté de la petite table. */
export const NOOK_WINDOW = { z: 1.95, width: 1.2, height: 1.15, bottom: 1.12 }

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
  shelf: 0xc08a4a,
  beam: 0xc08a4a,
  bracket: 0x15171a,
  window: 0xffffff,
  blind: 0xf1ead8,
  glass: 0xb8cfe4,
  lamp: 0x16181b,
  bottle: 0x2b5a3a,
}

export const START: Vec3 = { x: -9.5, y: 7, z: 10.5 }
export const TOP: Vec3 = { x: -2.2, y: 13, z: 2.9 }
export const TARGET: Vec3 = { x: -2.2, y: 0.6, z: 2.5 }

/** Le plan de la maison, en unités du plan (540 × 300) : le mur ouest de la cuisine et du salon, le mur est, le mur entre la cuisine et le salon, et le mur ouest de l'escalier. */
export const PLAN_HOUSE = { livingWest: 210, east: 540, kitchenSouth: 140, height: 300, stairsWest: 420 }
/**
 * La lumière d'une lampe Hue dans la scène : sa teinte sans couleur donnée (blanc chaud), son intensité à pleine puissance, le plancher
 * d'une lampe allumée au minimum, la hauteur d'une ampoule sans luminaire, et la distance sous laquelle une lampe prend un luminaire dessiné.
 */
export const LAMP_LIGHT = { color: '#ffd9a0', intensity: 5, floor: 0.12, height: 2.1, pickRadius: 0.2, hitRadius: 0.07, matchDistance: 2 }
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
 * et, vers les fenêtres, la niche à verres : elle ne s'ouvre qu'à partir de sa tablette en bois (`bottom`), le mur est plein en dessous, sauf un
 * casier carré encadré de bois (`RECESS`).
 */
export const NICHES = [
  // Le trou du frigo : il y rentre presque en entier, sa façade dépasse de 5 cm. Mesuré : le frigo est à 15 cm du mur de la poutre et à 40 cm du cellier.
  { id: 'fridge', x: LAYOUT.fridge.x, width: 0.68, bottom: 0, height: 1.9, inner: 0.68, depth: 0.62 },
  { id: 'cellar', x: LAYOUT.cellar.x, width: 0.66, bottom: 0, height: 2.02, inner: 0.84, depth: 0.52 },
  { id: 'bar', x: 0.97, width: 0.84, bottom: 1, height: 2.05, inner: 0.84, depth: 0.4 },
]
/** Le casier carré sous la niche à verres : un creux en contreplaqué clair, encadré de bois. */
export const RECESS = { width: 0.62, bottom: 0.28, top: 0.86, depth: 0.35 }

/** Un clic sur une ampoule : la souris n'a pas glissé de plus de tant de pixels entre l'appui et le relâchement. */
export const CLICK_SLOP = 5
/** La couleur d'un écran éteint : les deux du bureau et la télé. */
export const SCREEN_OFF = 0x06070a

/**
 * Le reste de la maison, tiré du plan de la maison (`PLAN_ROOMS`) : les pièces qu'on n'a pas meublées, à l'ouest de l'espace de vie. `west` : le
 * mur extérieur ouest (le plan y est à 0, le mur de la télé à 210) ; `middle` : le mur entre la chambre 1 et la salle de bain / le couloir ;
 * `corridorNorth` et `corridorSouth` : les deux murs du couloir (au nord la salle de bain, au sud la chambre 2, dont le mur borne aussi la chambre 1).
 */
/** La salle de bain fait 2,02 m d'est en ouest ; une cloison de 8 cm la sépare de la chambre d'invité (la chambre 1 du plan), qui en fait 2,54. */
const BATH_WEST = ROOM.zMin - 2.02
const GUEST_EAST = BATH_WEST - 0.08
export const REST = {
  // Le mur ouest de la maison : là où finit la chambre d'invité (mesures), à 18 cm près de ce que dit le plan.
  west: GUEST_EAST - 2.54,
  // La chambre d'invité, mesurée : 3,77 m du nord au sud (depuis le mur nord) sur 2,54 m d'est en ouest.
  guestEast: GUEST_EAST,
  guestSouth: ROOM.xMax - 3.77,
  // Le couloir des chambres, mesuré : 1,80 m de long (du mur de la télé au mur de la chambre 1) sur 78 cm de large, centré sur sa porte.
  middle: ROOM.zMin - 1.8,
  corridorNorth: LAYOUT.door.x + 0.39,
  corridorSouth: LAYOUT.door.x - 0.39,
  // La salle de bain, mesurée : 2,85 m du nord au sud (depuis le mur nord) sur 2,02 m d'est en ouest (depuis le mur de la cuisine).
  bathSouth: ROOM.xMax - 2.85,
  bathWest: BATH_WEST,
  // La chambre de Matou (la chambre 2 du plan), mesurée : 3,86 m d'est en ouest depuis le mur ouest (sur 3,01 m du nord au sud) ; le
  // reste, jusqu'au mur de la télé, est pris par le placard bleu.
  matouEast: GUEST_EAST - 2.54 + 3.86,
}
/** Après un clic sur un volet de la scène, le temps pendant lequel son changement d'état est animé (au-delà, les volets se placent d'un coup). */
export const SHUTTER_ANIMATE_MS = 15_000
/** L'épaisseur des murs extérieurs de la maison (m). */
export const OUTER_WALL = 0.3

/** L'alcôve des WC, creusée dans le mur épais derrière la cuvette : son milieu le long du mur, sa largeur, son bas, sa hauteur et sa profondeur (m). */
export const WC_ALCOVE = { x: REST.bathSouth + 0.48, width: 0.36, bottom: 1.44, height: 0.56, depth: 0.15 }

/** La fenêtre de la chambre d'invité, dans le mur ouest, derrière son rideau : son milieu le long du mur (x), sa largeur, son bas et sa hauteur (m). */
export const GUEST_WINDOW = { z: 0.1, width: 1.2, bottom: 0.85, height: 1.3 }

/** La fenêtre de la chambre de Matou, dans le mur des baies : à trois vitres, de la taille de celle du salon, centrée dans la pièce (`z` : son milieu le long du mur). */
export const MATOU_WINDOW = { ...LAYOUT.bays.window, z: (REST.west + REST.matouEast) / 2 }

/**
 * Le sas, derrière la porte d'entrée : l'avancée de la maison vers l'est (1,50 m au-delà du mur du bureau). `south` et `north` : ses deux
 * murs longs ; `west` : la porte d'entrée ; `east` : le mur de sa fenêtre. `laundry` : la porte de la buanderie, dans le mur nord ;
 * `door` : la porte qui donne dehors, dans le mur sud, au-delà du bureau ; `window` : la fenêtre du mur est (`z` : son milieu le long du mur).
 */
export const SAS = {
  south: ENTRY.x + 0.06,
  // Mesuré : 1,34 m de large. Son mur nord (côté groupe de la pompe à chaleur) est donc plus au nord que celui de l’entrée.
  north: ENTRY.x + 0.06 + 1.34,
  west: ENTRY.doorZ,
  east: ROOM.zMax + 1.5,
  laundry: [ENTRY.doorZ + 0.1, ENTRY.doorZ + 0.8] as [number, number],
  door: [ROOM.zMax + 0.4, ROOM.zMax + 1.3] as [number, number],
  window: { z: ENTRY.x + 0.06 + 1.34 / 2, width: 0.86, bottom: 1.0, height: 1.0 },
  // Le coin des manteaux : une niche creusée dans le mur nord (un mur extérieur, de 30 cm), de où à où, sa hauteur et sa profondeur.
  nook: [ROOM.zMax + 0.4, ROOM.zMax + 1.25] as [number, number],
  nookTop: 2.15,
  nookDepth: 0.24,
}

/**
 * La maison est surélevée : son sol est à `rise` au-dessus du terrain, sur un muret de soubassement. Le muret est en retrait de `setback`
 * par rapport au nu du mur (l'isolation par l'extérieur, au-dessus, dépasse de lui).
 */
export const BASE = { rise: 0.33, setback: 0.08 }

/** La fenêtre de la salle de bain, dans le mur nord : à 35 cm du mur ouest (à gauche, vue de la pièce) et à 5 cm du mur est (`z` : son milieu le long du mur), son bas et sa hauteur (m). */
export const BATH_WINDOW = { z: (REST.bathWest + 0.35 + ROOM.zMin - 0.05) / 2, width: ROOM.zMin - REST.bathWest - 0.4, bottom: 1.28, height: 1.02 }

/** La porte du couloir, dans le mur de la télé (ouverte) : de où à où le long du mur ; `top` : la hauteur de toutes les portes intérieures. */
export const PASSAGE = { from: LAYOUT.door.x - LAYOUT.door.width / 2, to: LAYOUT.door.x + LAYOUT.door.width / 2, top: 2.05 }

/** Les repères du gros œuvre de l'espace de vie, tirés des cotes ci-dessus. */
export const SHELL = {
  // Entre la cuisine et le salon : le milieu de l'épaisseur du mur, sa face côté salon, et l'endroit où le mur plein laisse la place au bar.
  wallX: KITCHEN.xMin - PARTITION.thickness / 2,
  salonX: KITCHEN.xMin - PARTITION.thickness,
  barStart: ROOM.zMin + PARTITION.wall,
  // Là où commence le retour de mur du frigo.
  returnStart: KITCHEN.zMax - FRIDGE_WALL.length,
  // Le fond de l'entrée, côté frigo : à 1,43 m de la porte, soit 12 cm derrière le mur de l'escalier (son épaisseur).
  entryBack: ENTRY.doorZ - ENTRY.depth,
  // Le dos du mur de l'escalier : derrière la plus profonde de ses niches.
  shellBack: KITCHEN.zMax + Math.max(...NICHES.map((niche) => niche.depth)) + 0.04,
}

/** La porte-fenêtre du salon et la fenêtre du bureau (celle de la bibliothèque), dans le mur des baies : milieu le long du mur, largeur, bas et hauteur (m). */
export const PATIO_DOOR = { ...LAYOUT.bays.door, bottom: 0.05, height: 2.15 }
export const LIBRARY_WINDOW = { z: LAYOUT.libraryWindow.z, width: 1, bottom: 1.05, height: 1.1 }
/** Les baies du mur sud de l'espace de vie, et celles du mur nord de la cuisine (les deux petites fenêtres et celle du coin repas). */
export const SALON_BAYS = [PATIO_DOOR, LAYOUT.bays.window, LIBRARY_WINDOW]
export const KITCHEN_BAYS = [...WINDOWS.z.map((z) => ({ z, width: WINDOWS.width, bottom: WINDOWS.bottom, height: WINDOWS.height })), NOOK_WINDOW]

/**
 * Le poteau d'acier du sas, dehors : un carré de 4 cm entre la fenêtre et le bout du mur, écarté du mur de 10 cm, qui part de la hauteur du
 * haut de la fenêtre et monte d'1,50 m. `x` et `z` : sa place ; `from` : son pied ; `tall` : sa hauteur. Le câble électrique arrive à son sommet.
 */
export const MAST = {
  x: (SAS.window.z + SAS.window.width / 2 + SAS.north + OUTER_WALL) / 2,
  z: SAS.east + OUTER_WALL + 0.12,
  from: SAS.window.bottom + SAS.window.height,
  tall: 1.5,
}
