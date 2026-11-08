/**
 * Les proportions du rez-de-chaussée du site (HOUSE dans src/plan.ts) : 540 × 300. Les positions sont en unités de ce plan,
 * l'origine (0, 0) étant le coin haut gauche de la maison ; le jardin autour a donc des positions négatives ou au-delà de 540 et 300.
 */
export const HOUSE_WIDTH = 540
export const HOUSE_HEIGHT = 300
/** Le contour est rentré pour que son trait ne soit pas rogné par le bord du dessin. */
export const HOUSE_INSET = 2
/** Le jardin autour de la maison : de quoi poser une lampe dehors. */
export const EXTERIOR_MARGIN = 40
/** La zone « À placer », à droite du jardin : là où attendent les ampoules qu'on n'a pas encore posées. */
export const SIDE_WIDTH = 110
/** Le dessin entier : le jardin autour de la maison puis la zone « À placer ». Il commence en (-40, -40). */
export const VIEW_X = -EXTERIOR_MARGIN
export const VIEW_Y = -EXTERIOR_MARGIN
export const VIEW_WIDTH = HOUSE_WIDTH + 2 * EXTERIOR_MARGIN + SIDE_WIDTH
export const VIEW_HEIGHT = HOUSE_HEIGHT + 2 * EXTERIOR_MARGIN

/** Le cadre du jardin et où s'écrit son titre. */
export const GARDEN = { x: VIEW_X + 1, y: VIEW_Y + 1, w: HOUSE_WIDTH + 2 * EXTERIOR_MARGIN - 2, h: VIEW_HEIGHT - 2 }
export const GARDEN_LABEL = 'Extérieur'
export const GARDEN_LABEL_POSITION = { x: VIEW_X + 8, y: VIEW_Y + 16 }
/** Le nom de l'ampoule survolée ou touchée : toujours au même endroit, en bas du jardin, centré sous la maison. */
export const ACTIVE_NAME_POSITION = { x: GARDEN.x + GARDEN.w / 2, y: HOUSE_HEIGHT + EXTERIOR_MARGIN / 2 + 4 }

/** Le cadre de la zone « À placer » (écartée du jardin) et où s'écrit son titre. */
export const SIDE_ZONE = { x: HOUSE_WIDTH + EXTERIOR_MARGIN + 10, y: VIEW_Y + 1, w: SIDE_WIDTH - 12, h: VIEW_HEIGHT - 2 }
export const SIDE_LABEL = 'À placer'
export const SIDE_LABEL_POSITION = { x: SIDE_ZONE.x + SIDE_ZONE.w / 2, y: SIDE_ZONE.y + 16 }

/** Où s'écrit le nom d'une pièce, depuis le coin haut gauche de son premier rectangle. */
export const ROOM_LABEL_OFFSET = { x: 8, y: 16 }

/** Rayon d'une ampoule, en unités du plan. */
export const BULB_RADIUS = 5
/** Un glissement de plus de 4 unités déplace l'ampoule ; en deçà, c'est un clic qui l'allume ou l'éteint. */
export const DRAG_THRESHOLD = 4
/** Un appui sur une flèche du clavier déplace l'ampoule de ce pas. */
export const KEY_STEP = 5

export const GARDEN_CLASS = 'fill-bg stroke-line stroke-1'
export const FIGURE_CLASS = 'relative mt-4'
export const PLAN_CLASS = 'block w-full touch-none select-none'
/** Le dessin sans la zone « À placer » : le jardin et la maison, ce que montre la vue en grand. */
export const EXPANDED_VIEW_WIDTH = VIEW_WIDTH - SIDE_WIDTH
/** Le plus grand cadre de ces proportions qui tient dans l'écran (--big-w et --big-h : voir EXPANDED_CLASS de CameraCard). */
export const BIG_PLAN_CLASS = 'block w-[min(var(--big-w),calc(var(--big-h)*620/380))] touch-none select-none'
/** Le bouton retour de l'écran du téléphone : une flèche en haut à gauche, dans le cadre (qui peut être tourné). */
export const BACK_CLASS =
  'absolute left-2 top-2 z-10 cursor-pointer rounded-lg border border-line bg-bg/80 px-3 py-2 text-[0.9rem] text-fg focus-visible:outline-2 focus-visible:outline-accent'
export const BACK_ARROW = '←'
export const HOUSE_CLASS = 'fill-card stroke-fg stroke-[3]'
export const WALL_CLASS = 'stroke-fg stroke-[2.5] [stroke-linecap:round]'
/** Les séparations des pièces ont le même style que les cloisons : un mur est un mur. */
/** Un claustra : le même trait qu'un mur, mais en pointillés. */
export const SCREEN_CLASS = 'stroke-fg stroke-[2.5] [stroke-dasharray:3_3]'
export const ROOM_CLASS = 'fill-none stroke-fg stroke-[2.5] [stroke-linejoin:round]'
export const ROOM_LABEL_CLASS = 'pointer-events-none fill-muted text-[11px]'
/** Le nom, toujours écrit, d'une ampoule de la zone « À placer » : petit pour tenir dans la zone, au-dessus de l'ampoule. */
export const SIDE_LAMP_NAME_CLASS = 'pointer-events-none fill-muted text-[7px] [text-anchor:middle]'
export const SIDE_LAMP_NAME_GAP = 3
export const ACTIVE_NAME_CLASS = 'pointer-events-none fill-fg text-xs font-semibold [text-anchor:middle]'
export const SIDE_CLASS = 'fill-none stroke-line stroke-1 [stroke-dasharray:4_3]'
export const SIDE_LABEL_CLASS = 'pointer-events-none fill-muted text-[11px] [text-anchor:middle]'
export const BULB_ON_CLASS = 'fill-orange stroke-fg stroke-1'
export const BULB_OFF_CLASS = 'fill-bg stroke-muted stroke-1'
export const BULB_GROUP_CLASS =
  'cursor-grab outline-none focus-visible:[&>circle]:stroke-accent focus-visible:[&>circle]:stroke-2 active:cursor-grabbing'
/** Une ampoule injoignable (coupée à l'interrupteur ?) : le même contour, d'un rouge pastel (comme un rouge grisé). */
export const BULB_ON_UNREACHABLE_CLASS = 'fill-orange stroke-danger/50 stroke-1'
export const BULB_OFF_UNREACHABLE_CLASS = 'fill-bg stroke-danger/50 stroke-1'
/** Le contour de la cage à perruches : rouge. */
export const CAGE_CLASS = 'fill-none stroke-[#dc2626] stroke-[3]'
/** L'intérieur de la cage : rouge pastel. */
export const CAGE_FILL_CLASS = 'fill-[#fecaca]'
/** Un arbre : un rond vert, qu'on attrape à la souris ou au doigt. */
export const TREE_CLASS = 'cursor-grab fill-green/40 stroke-green stroke-[1.5] active:cursor-grabbing'
export const TREE_STATIC_CLASS = 'fill-green/40 stroke-green stroke-[1.5]'
export const TREE_LABEL = 'Arbre'
/** Le toit de la maison vu du dessus : un gris plein, lisible en clair comme en sombre. */
export const ROOF_CLASS = 'fill-[#374151] stroke-[#1f2937] stroke-[3] [stroke-linejoin:round]'
/** Tout le pavage (terrasse, sol à droite, chemin, sol de la cage) : un seul tracé orange clair, sans trait. */
export const TERRACE_CLASS = 'fill-[#fdba74]'
/** Le côté nord de la terrasse : du béton, gris clair. */
export const CONCRETE_CLASS = 'fill-[#d1d5db] stroke-[#9ca3af] stroke-1'
/** L'arbre sélectionné : son contour passe à la couleur d'accent. */
export const TREE_SELECTED_CLASS = 'cursor-grab fill-green/40 stroke-accent stroke-[3] active:cursor-grabbing'
/** Un portail ou un portillon : un trait épais brun, sur le contour du terrain. */
export const GATE_CLASS = 'stroke-[#92400e] stroke-[9] [stroke-linecap:butt]'
/** Une haie : un gros trait vert aux bouts arrondis. */
export const HEDGE_CLASS = 'fill-none stroke-[#15803d] stroke-[28] [stroke-linecap:round] [stroke-linejoin:round]'
/** Le champ de vision d'une caméra (montré au clic sur son icône) : un croissant transparent aux couleurs d'accent ; la caméra, l'icône BsFillCameraVideoFill. */
export const FOV_CLASS = 'fill-accent/30 stroke-accent stroke-[1.5]'
/** L'icône d'une caméra : un caméscope plein, dessiné en SVG (grille de 16, comme l'icône Bootstrap « camera-video-fill »), de cette taille en unités du plan. */
export const CAMERA_ICON_SIZE = 26
export const CAMERA_ICON_PATH =
  'M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2V5z'
/** Une caméra noire, au contour bleu d'accent (celui des bordures), fin : visible sur le plan clair comme sombre. */
export const CAMERA_ICON_GLYPH_CLASS = 'fill-black stroke-accent stroke-[1] [stroke-linejoin:round] select-none'
/** La zone qu'on touche pour une caméra : un rond invisible, plus large que l'icône. */
export const CAMERA_HIT_CLASS = 'fill-transparent'
export const CAMERA_HIT_RADIUS = 18
export const CAMERA_ICON_CLASS =
  'cursor-grab outline-none active:cursor-grabbing focus:outline-none [-webkit-tap-highlight-color:transparent]'
/** La poignée qui tourne une caméra sélectionnée : un petit rond bleu contre l'icône, du côté où elle regarde. */
export const CAMERA_HANDLE_CLASS = 'cursor-grab fill-accent stroke-white stroke-[2] active:cursor-grabbing'
export const CAMERA_HANDLE_DISTANCE = 22
export const CAMERA_HANDLE_RADIUS = 6
export const CAMERA_HANDLE_LABEL = 'Tourner la caméra, allonger ou raccourcir sa vue'
/** La poignée est à cette part de la longueur de la vue (au moins CAMERA_HANDLE_DISTANCE) : la tirer vers l'avant allonge la vue et l'écarte. */
export const CAMERA_HANDLE_RATIO = 0.12
export const CAMERA_FAR_MIN = 60
export const CAMERA_FAR_MAX = 700
export const CAMERA_FOV_MIN = 10
export const CAMERA_FOV_MAX = 140
/** Une prise connectée : un petit carré arrondi, vert quand elle est allumée, rouge quand elle est éteinte (son état est dans l'infobulle). */
export const PLUG_SIZE = 18
export const PLUG_ON_CLASS = 'fill-green stroke-fg stroke-[1.5]'
export const PLUG_OFF_CLASS = 'fill-[#dc2626] stroke-fg stroke-[1.5]'
export const PLUG_ON_TEXT = 'Marche'
export const PLUG_OFF_TEXT = 'Arrêt'
/** Une caméra éteinte : toujours noire, mais le contour passe au rouge (et s'épaissit un peu). */
export const CAMERA_ICON_OFF_CLASS = 'fill-black stroke-[#dc2626] stroke-[2.2] [stroke-linejoin:round] select-none'
/** Une prise qu'on peut déplacer : la main qui attrape. */
export const PLUG_GROUP_CLASS = 'cursor-grab active:cursor-grabbing'
/** Une haie qu'on peut déplacer (sur le plan de la mosaïque), et la haie choisie, dont les sommets se montrent. */
export const HEDGE_MOVABLE_CLASS = `${HEDGE_CLASS} cursor-grab active:cursor-grabbing`
export const HEDGE_SELECTED_CLASS = `${HEDGE_MOVABLE_CLASS} [stroke-opacity:0.7]`
export const HEDGE_LABEL = 'Haie'
export const HEDGE_HANDLE_LABEL = 'Sommet de la haie (glisser pour le déplacer)'
/** La poignée sur le bord de l'arbre choisi : la glisser change son rayon, entre ces bornes (unités du plan). */
export const TREE_HANDLE_LABEL = "Taille de l'arbre (glisser pour l'agrandir ou le réduire)"
export const TREE_RADIUS_MIN = 5
export const TREE_RADIUS_MAX = 80
