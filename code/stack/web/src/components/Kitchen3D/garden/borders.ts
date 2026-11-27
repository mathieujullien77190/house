import * as THREE from 'three'
import { UNITS_PER_METER } from '@/components/Lights/constants'
import { ROOM } from '@/components/Kitchen3D/constants'
import type { GardenMaterials } from '@/components/Kitchen3D/materials'
import { faceted } from '@/components/Kitchen3D/materials'
import { box, standard } from '@/components/Kitchen3D/primitives'
import { GATE_HEIGHT, HEDGE, LOT, LOW, PAVING, PLAN } from './constants'
import type { PlanPoint } from './constants'
import { SITE } from './layout'
import { PERGOLA_FRONT } from './pergola'
import { along, arc, gardenX, gardenZ, tiledOn } from './plan'
import { spireaHedge } from './plants'

/** La haie : l’arc en trois morceaux (il s’ouvre au portail et au portillon), le bord ouest et nord de la bande du haut, le bord est sous la cage. */
export const hedges = (group: THREE.Group, m: GardenMaterials): void => {
  const { hedge } = m
  const { cageSouth, gate, wicket } = SITE
  const cornerNorthWest: PlanPoint = [HEDGE.west, LOT.centerY]
  const lines: PlanPoint[][] = [
    arc(HEDGE.radius, cornerNorthWest, [gate.x1, gate.y1]),
    arc(HEDGE.radius, [gate.x2, gate.y2], [wicket.x2, wicket.y2]),
    arc(HEDGE.radius, [wicket.x1, wicket.y1], [LOT.east, LOT.centerY + HEDGE.radius]),
    [[HEDGE.west, HEDGE.north], [HEDGE.east, HEDGE.north]],
  ]
  // Les haies qui bordent la partie basse du jardin (l'arc de l'ouest, la bande du nord) descendent jusqu'à son sol.
  // L'arc (les trois premiers morceaux) est une haie de spirées, haute et libre, qui retombe sur le jardin ; la bande du nord reste une haie taillée, unie.
  lines.forEach((line, index) => {
    const low = index === 0 || index === 3 ? LOW : 0
    if (index < 3) {
      group.add(spireaHedge(line, 2.6, low, 71 + index))
      return
    }
    for (const piece of along(line, hedge, HEDGE.height + low, HEDGE.thickness)) {
      piece.position.y -= low
      group.add(piece)
    }
  })
  // Les spirées continuent, au bout de l'arc, le long du bord ouest de la bande du haut, jusqu'au coin de la propriété.
  group.add(spireaHedge([cornerNorthWest, [HEDGE.west, HEDGE.north]], 2.6, LOW, 77))
  // La haie de l'est, sous la cage (face au sas) : épaisse de 85 cm, et plus haute que les autres (2,50 m).
  // Elle commence au ras de la cage, sans y entrer.
  // Elle s'arrête au muret des poubelles ; de là jusqu'à l'arc, la haie de l'est est en spirées, comme lui.
  const spireaFrom = PLAN.height + (ROOM.xMin - (SITE.binSouth - 0.15)) * UNITS_PER_METER
  // C'est une haie de thuyas : un simple bloc vert (un tronçon déborde d'un quart de son épaisseur à chaque bout : le départ en tient compte).
  const thujaStart = cageSouth + (HEDGE.eastThickness / 4) * UNITS_PER_METER + 2
  group.add(...along([[HEDGE.east, thujaStart], [HEDGE.east, spireaFrom]], faceted(0x2f6a34, 1), 2.5, HEDGE.eastThickness))
  group.add(spireaHedge([[HEDGE.east, spireaFrom], [HEDGE.east, LOT.centerY + HEDGE.radius]], 2.6, 0, 79))
}

/** L’allée du portillon est bordée de deux murets de béton bas, de la terrasse jusqu’au portillon, lui-même entre deux piliers de pierre claire ; puis le portail et le portillon. */
export const pathAndGates = (group: THREE.Group, m: GardenMaterials): void => {
  const { iron, wall } = m
  const { gate, wicket } = SITE
  // Tous les murets ont la même hauteur : celle des carreaux surélevés de la terrasse.
  // Chacun part d'un coin à angle droit, sans décroché : celui de l'ouest du bout du muret de la terrasse, celui de l'est du bout du
  // muret des poubelles. (Un tronçon déborde d'un quart de son épaisseur à chaque bout : le départ en tient compte.)
  const startAt = (lineX: number): number => PLAN.height + (ROOM.xMin - (lineX + 0.0375)) * UNITS_PER_METER
  const westStart = startAt(SITE.house[0] - PERGOLA_FRONT)
  const eastStart = startAt(SITE.binSouth - 0.075)
  group.add(...along([[PAVING.pathWest, westStart], [PAVING.pathWest, PAVING.pathEndWest - 6]], wall, SITE.raised, 0.15), ...along([[PAVING.pathEast, eastStart], [PAVING.pathEast, PAVING.pathEnd - 6]], wall, SITE.raised, 0.15))
  // À gauche du chemin pour qui regarde la maison (à l'ouest), un second muret double le premier à 30 cm, du portillon jusqu'au second
  // muret de devant la maison, qu'il rejoint à angle droit ; entre les deux, de la terre, qui continue celle de la jardinière de devant.
  const bed = 0.3
  const outerPath = PAVING.pathWest - (0.15 + bed) * UNITS_PER_METER
  const earthPath = PAVING.pathWest - (0.075 + bed / 2) * UNITS_PER_METER
  const outerStart = startAt(SITE.house[0] - PERGOLA_FRONT - 0.15 - bed)
  group.add(...along([[outerPath, outerStart], [outerPath, PAVING.pathEndWest - 6]], wall, SITE.raised, 0.15))
  group.add(...along([[earthPath, westStart + 2], [earthPath, PAVING.pathEndWest - 10]], standard(0x4a2e22, 1), SITE.raised - 0.04, bed - 0.02))
  const pillar = standard(0xd9d5cb, 0.9)
  for (const [planX, planY] of [[wicket.x1, wicket.y1], [wicket.x2, wicket.y2]]) group.add(box(0.3, 1.6, 0.3, pillar, gardenX(planY), 0.8, gardenZ(planX)))
  // Le portail et le portillon, en fer sombre.
  for (const door of [gate, wicket]) group.add(...along([[door.x1, door.y1], [door.x2, door.y2]], iron, GATE_HEIGHT, 0.06))
}

/** Sous les poubelles, le carrelage continue ; juste devant elles (au sud), un muret de béton bas va du chemin du portillon jusqu’à la haie. */
export const binWalls = (group: THREE.Group, m: GardenMaterials): void => {
  const { terrace, wall } = m
  const { binSouth, binWest, binEast } = SITE
  const tiled = tiledOn(group, terrace)
  tiled(binSouth, gardenX(PAVING.south), binWest, gardenZ(LOT.east), -0.007)
  // Le muret des poubelles part du muret est du chemin, à angle droit avec lui (il va jusqu'à sa face extérieure).
  const lineX = binSouth - 0.075
  group.add(box(0.15, SITE.raised, binEast - binWest + 0.075, wall, lineX, SITE.raised / 2, (binEast + binWest - 0.075) / 2))
}
