import { HOUSE_SHIFT, PLAN_CAGE, UNITS_PER_METER } from '@/components/Lights/constants'

/** Un point du plan de la maison (unités du plan : x vers l'est, y vers le sud). */
export type PlanPoint = [number, number]

/**
 * La maison sur le plan de la maison : son bord ouest (elle y est poussée de `HOUSE_SHIFT`), sa largeur et sa hauteur, en unités du plan. Le
 * terrain y est dessiné à 39 unités le mètre (`UNITS_PER_METER` : un rayon de 1014 unités pour 26 m, une bande de 78 pour 2 m, une terrasse
 * de 58,5 pour 1,50 m) : c'est cette échelle qui donne au jardin sa vraie taille.
 */
export const PLAN = { west: HOUSE_SHIFT, width: 540, height: 300 }
/** Un panneau de la cage à perruches (m). */
export const PANEL = 0.85
/** La cage à perruches, en vrai : 4 panneaux de 85 cm sur 5 (m) ; le cinquième, à l'est, est au droit de la haie (85 cm elle aussi). Son coin nord-ouest est celui du plan. */
export const CAGE = { width: 4 * PANEL, depth: 5 * PANEL }
/** Son bord ouest, en unités du plan : un panneau plus à l'est que sur le plan (le dernier, à l'est, reste au droit de la haie). */
export const CAGE_WEST = PLAN_CAGE.x + PANEL * UNITS_PER_METER
/** Son bord nord : la cage est translatée de 70 cm vers la maison (vers le sud, vers la pompe à chaleur) ; les haies, elles, ne bougent pas. */
export const CAGE_NORTH = PLAN_CAGE.y + 0.7 * UNITS_PER_METER
/** Le terrain : un quart de cercle de 1014 unités autour de ce centre (l'arc côté rue, au sud-ouest), plus une bande au nord jusqu'à `north` (mesuré : la limite est à 6,87 m du mur extérieur de la cuisine, soit 30 cm plus loin que sur le plan). */
export const LOT = { centerX: 700, centerY: -190, radius: 1014, north: -280, east: 748 }
/**
 * La haie court à 14 unités en dedans de la limite : sur l'arc, sur le bord ouest et nord de la bande du haut, et sur le bord est. Le bord
 * est est à 1 m de plus que sur le plan : mesuré, la haie est à 1,69 m du mur du sas (au droit du bord est de la cage), et elle y est
 * épaisse de 85 cm (`eastThickness`).
 */
export const HEDGE = { radius: 1000, west: -300, north: -266, east: 732, height: 1.5, thickness: 0.5, eastThickness: 0.85 }
/** L'allée du portillon est 10 cm plus à l'est que sur le plan (elle a été reculée de 50 cm vers l'ouest, puis ramenée de 60 cm vers l'est : à droite pour qui regarde la maison), en unités du plan. Ce qu'on en retranche des abscisses. */
export const PATH_SHIFT = -0.1 * UNITS_PER_METER
/** Le pavage : à l'est de la maison jusqu'à la limite, du bas de la cage jusqu'au sud de la terrasse ; et le chemin du portillon. */
export const PAVING = { south: 358, pathWest: 498 - PATH_SHIFT, pathEast: 556 - PATH_SHIFT, pathEnd: 800, pathEndWest: 789 }
/**
 * Sur l'allée du portillon, entre le romarin et le néflier, le chemin descend de trois marches et s'enfonce dans le terrain : où elles
 * commencent (ordonnée du plan), leur nombre, leur giron (unités du plan), la hauteur de chacune (m) ; `PATH_DROP` : de combien le chemin est plus bas ensuite.
 */
export const PATH_STEPS = { from: 615, count: 3, tread: 15, drop: 0.17 }
export const PATH_DROP = PATH_STEPS.count * PATH_STEPS.drop
/**
 * L'allée du garage : du portail, au niveau du chemin du portillon (`PATH_DROP` sous le terrain), elle descend en rampe jusqu'au pied de la
 * terrasse, devant la fenêtre de la chambre d'invité, où le garage est en dessous : 2 m plus bas que le terrain (m).
 */
export const GARAGE_DEPTH = 2
/** La terrasse qui fait le tour de la maison (m). */
export const TERRACE = 1.5
/** La hauteur de la cage à perruches, puis celle du portail (m). */
export const CAGE_HEIGHT = 2.1
/** Sous le bas du toit de tôle (côté haie), la cage ne fait plus que tant de haut (m). */
export const CAGE_LOW = 2
export const GATE_HEIGHT = 1.4
/** Derrière la maison, le jardin est plus bas que le reste du terrain, de tant (m). */
export const LOW = 0.2
/** Dans cette partie basse, l'herbe est 10 cm plus haute que la bande de béton qui longe la maison : son niveau (m). */
export const GRASS = -LOW + 0.1
/** Les poubelles sont à 1,16 m de la façade des baies (mesuré). */
export const BINS_FROM_FACADE = 1.16

/** La terrasse en ipé : la longueur de ses lattes, et la hauteur de leur dessus (m). */
export const DECK = { long: 3, thick: 0.025, top: GRASS + 0.14 + 0.025 }
