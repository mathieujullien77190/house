import { PLAN_GATES, UNITS_PER_METER } from '@/components/Lights/constants'
import { BASE, OUTER_WALL, REST, ROOM } from '@/components/Kitchen3D/constants'
import { BINS_FROM_FACADE, CAGE, CAGE_NORTH, CAGE_WEST, HEDGE, LOT, PANEL, PATH_SHIFT, PAVING, TERRACE } from './constants'
import type { PlanPoint } from './constants'
import { gardenX, gardenZ } from './plan'

// Les repères du jardin, calculés une fois : ce que plusieurs constructeurs ont besoin de savoir les uns des autres.

/** L'emprise de la maison, murs extérieurs compris : [x1, x2, z1, z2]. */
const house: [number, number, number, number] = [ROOM.xMin - OUTER_WALL, ROOM.xMax + OUTER_WALL, REST.west - OUTER_WALL, ROOM.zMax + OUTER_WALL]
// La limite entre les deux niveaux de la pelouse suit le nu du muret de soubassement (en retrait du mur), sur le plan puis dans la scène.
const stepY = -(OUTER_WALL - BASE.setback) * UNITS_PER_METER
const stepLine = house[1] - BASE.setback
const stepX = CAGE_WEST - 4
const stepWest: PlanPoint = [LOT.centerX - Math.sqrt(LOT.radius ** 2 - (stepY - LOT.centerY) ** 2), stepY]
// La cage, en unités du plan : son bas, son bord est, le milieu du bac à fleurs posé contre elle (là où s'arrêtent les carreaux), et sa
// face en retrait d'un panneau, à gauche de la porte.
const cageSouth = CAGE_NORTH + CAGE.depth * UNITS_PER_METER
const cageEast = CAGE_WEST + CAGE.width * UNITS_PER_METER
const midPlan = CAGE_WEST + 0.7 * UNITS_PER_METER
const recessPlan = cageSouth - PANEL * UNITS_PER_METER
// La cage dans la scène : ses quatre bords, puis le coin de son plan en L (`backX`, `turnZ`).
const [cageX1, cageX2] = [gardenX(cageSouth), gardenX(CAGE_NORTH)]
const [cageZ1, cageZ2] = [gardenZ(CAGE_WEST), gardenZ(cageEast)]
const backX = cageX1 + PANEL
// Les poubelles : leur rang, le bord sud de leur carrelage, et de où à où va le muret devant elles.
const binX = house[0] - BINS_FROM_FACADE - 0.28
// Le portillon suit son allée.
const wicket = { ...PLAN_GATES[1], x1: PLAN_GATES[1].x1 - PATH_SHIFT, x2: PLAN_GATES[1].x2 - PATH_SHIFT }

export const SITE = {
  house,
  stepY,
  stepLine,
  stepX,
  stepZ: gardenZ(stepX),
  stepWest,
  cageSouth,
  cageEast,
  midPlan,
  midZ: gardenZ(midPlan),
  recessPlan,
  cageFace: gardenX(recessPlan),
  cageX1,
  cageX2,
  cageZ1,
  cageZ2,
  cageDepth: cageX2 - cageX1,
  middleX: (cageX1 + cageX2) / 2,
  backX,
  turnZ: cageZ1 + PANEL * 2,
  gate: PLAN_GATES[0],
  wicket,
  binX,
  binEnd: gardenZ(HEDGE.east) - HEDGE.eastThickness / 2 - 0.35,
  binSouth: binX - 0.4,
  binWest: gardenZ(PAVING.pathEast),
  binEast: gardenZ(HEDGE.east) - HEDGE.eastThickness / 2,
  // La terrasse surélevée le long de la façade des baies : sa hauteur, et de où à où elle va (d'ouest en est).
  raised: BASE.rise - 0.04,
  terraceEnd: 3.2,
  terraceWest: house[2] - TERRACE,
  // Le pied du laurier, devant le long bac de la cage.
  treeX: (backX + cageX2) / 2,
  treeZ: cageZ1 - 0.4 - 0.65,
}
