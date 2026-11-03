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
export const PLAN_CLASS = 'mt-4 block w-full touch-none select-none'
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
export const BULB_GROUP_CLASS = 'cursor-grab outline-none focus-visible:[&>circle]:stroke-accent focus-visible:[&>circle]:stroke-2 active:cursor-grabbing'
export const UNREACHABLE_CLASS = 'opacity-40'
