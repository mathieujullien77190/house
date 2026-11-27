import * as THREE from 'three'
import { UNITS_PER_METER } from '@/components/Lights/constants'
import { ROOM } from '@/components/Kitchen3D/constants'
import type { GardenMaterials } from '@/components/Kitchen3D/materials'
import { faceted } from '@/components/Kitchen3D/materials'
import { box, standard } from '@/components/Kitchen3D/primitives'
import { GATE_HEIGHT, HEDGE, LOT, LOW, PATH_DROP, PATH_STEPS, PAVING, PLAN, TERRACE } from './constants'
import type { PlanPoint } from './constants'
import { SITE } from './layout'
import { PERGOLA_FRONT } from './pergola'
import { along, arc, gardenX, gardenZ, tiledOn } from './plan'
import { spireaHedge } from './plants'

/** Un point de l'arc de la haie, avancé de `meters` le long de l'arc (vers le portillon et l'est ; négatif : en arrière). */
const along_ = ([x, y]: PlanPoint, meters: number): PlanPoint => {
  const turn = (-meters * UNITS_PER_METER) / HEDGE.radius
  const [dx, dy] = [x - LOT.centerX, y - LOT.centerY]
  return [LOT.centerX + dx * Math.cos(turn) - dy * Math.sin(turn), LOT.centerY + dx * Math.sin(turn) + dy * Math.cos(turn)]
}

/** La haie : l’arc en cinq morceaux (spirées, lierre ; il s’ouvre au portail et au portillon), le bord ouest et nord de la bande du haut, le bord est sous la cage. */
export const hedges = (group: THREE.Group, m: GardenMaterials, leafy = true): void => {
  const { hedge } = m
  const { cageSouth, gate, wicket } = SITE
  const cornerNorthWest: PlanPoint = [HEDGE.west, LOT.centerY]
  // Du portail du garage jusqu'à la hauteur du cerisier (devant la chambre de Matou), ce qui ressemblait à des spirées est du lierre.
  const cherryY = PLAN.height + (ROOM.xMin - (SITE.house[0] - TERRACE - 0.6)) * UNITS_PER_METER
  // La haie s'arrête avant les poteaux de béton (20 cm avant leur centre : leur demi-largeur et un peu de jour).
  const stop = 0.2
  const toGarage = arc(HEDGE.radius, along_([gate.x2, gate.y2], stop), along_([wicket.x2, wicket.y2], -stop))
  const cut = Math.max(1, toGarage.findIndex(([, y]) => y >= cherryY))
  const lines: { points: PlanPoint[]; seed: number; ivy?: boolean; low?: boolean; spread?: number }[] = [
    // De l'autre côté du portail, sur 3 m, c'est aussi du lierre (même chevauchement doux avec les spirées, 75 cm de chaque côté de la limite).
    { points: arc(HEDGE.radius, cornerNorthWest, along_([gate.x1, gate.y1], -3 + 0.75)), seed: 71, low: true },
    { points: arc(HEDGE.radius, along_([gate.x1, gate.y1], -3 - 0.75), along_([gate.x1, gate.y1], -stop)), seed: 82, ivy: true, low: true },
    // Les deux tronçons se chevauchent de part et d'autre du cerisier (un segment de 1,50 m chacun) : le lierre se mêle peu à peu aux spirées, sans coupure nette.
    { points: toGarage.slice(0, cut + 2), seed: 81, ivy: true },
    { points: toGarage.slice(Math.max(0, cut - 1)), seed: 72 },
    { points: arc(HEDGE.radius, along_([wicket.x1, wicket.y1], stop), [LOT.east, LOT.centerY + HEDGE.radius]), seed: 73, spread: 1.9 },
  ]
  // L'arc est une haie de spirées, haute et libre, qui retombe sur le jardin (sauf le lierre) ; le bord ouest du terrain descend jusqu'au sol de la partie basse.
  // Dans le coin du prunus et du romarin (après le portillon), les rameaux retombent bien plus loin sur le terrain (près de deux fois).
  for (const { points, seed, ivy, low, spread } of lines) group.add(spireaHedge(points, 2.6, low ? LOW : 0, seed, leafy, ivy, spread, spread !== undefined))
  // La bande du nord reste une haie taillée, unie.
  for (const piece of along([[HEDGE.west, HEDGE.north], [HEDGE.east, HEDGE.north]], hedge, HEDGE.height + LOW, HEDGE.thickness)) {
    piece.position.y -= LOW
    group.add(piece)
  }
  // Les spirées continuent, au bout de l'arc, le long du bord ouest de la bande du haut, jusqu'au coin de la propriété.
  group.add(spireaHedge([cornerNorthWest, [HEDGE.west, HEDGE.north]], 2.6, LOW, 77, leafy))
  // La haie de l'est, sous la cage (face au sas) : épaisse de 85 cm, et plus haute que les autres (2,50 m).
  // Elle commence au ras de la cage, sans y entrer.
  // Elle s'arrête au muret des poubelles ; de là jusqu'à l'arc, la haie de l'est est en spirées, comme lui.
  // La haie de thuyas va jusqu'au bout : 35 cm plus loin que le muret des poubelles, où les spirées prennent le relais.
  const spireaFrom = PLAN.height + (ROOM.xMin - (SITE.binSouth - 0.15 - 0.35)) * UNITS_PER_METER
  // C'est une haie de thuyas : un simple bloc vert (un tronçon déborde d'un quart de son épaisseur à chaque bout : le départ en tient compte).
  // Elle s'arrête à 20 cm de la cage (avant la porte), pas contre elle.
  const thujaStart = cageSouth + (HEDGE.eastThickness / 4) * UNITS_PER_METER + 2 + 0.2 * UNITS_PER_METER
  group.add(...along([[HEDGE.east, thujaStart], [HEDGE.east, spireaFrom]], faceted(0x2f6a34, 1), 2.5, HEDGE.eastThickness))
  // Dans ce coin, les rameaux retombent bien plus loin et jusqu'à terre.
  group.add(spireaHedge([[HEDGE.east, spireaFrom], [HEDGE.east, LOT.centerY + HEDGE.radius]], 2.6, 0, 79, leafy, false, 1.9, true))
}

/** L’allée du portillon est bordée de deux murets de béton bas, de la terrasse jusqu’au portillon, lui-même entre deux piquets de béton ; puis le portail et le portillon. */
export const pathAndGates = (group: THREE.Group, m: GardenMaterials): void => {
  const { iron, wall } = m
  const { gate, wicket } = SITE
  // Tous les murets ont la même hauteur : celle des carreaux surélevés de la terrasse.
  // Chacun part d'un coin à angle droit, sans décroché : celui de l'ouest du bout du muret de la terrasse, celui de l'est du bout du
  // muret des poubelles. (Un tronçon déborde d'un quart de son épaisseur à chaque bout : le départ en tient compte.)
  const startAt = (lineX: number): number => PLAN.height + (ROOM.xMin - (lineX + 0.0375)) * UNITS_PER_METER
  const westStart = startAt(SITE.house[0] - PERGOLA_FRONT)
  const eastStart = startAt(SITE.binSouth - 0.075)
  // Après les trois marches (`PATH_STEPS`), le chemin est en contrebas : ses murets descendent avec lui, jusqu'au fond du chemin.
  const stepsAt = PATH_STEPS.from
  group.add(...along([[PAVING.pathWest, westStart], [PAVING.pathWest, stepsAt]], wall, SITE.raised, 0.15), ...along([[PAVING.pathEast, eastStart], [PAVING.pathEast, stepsAt]], wall, SITE.raised, 0.15))
  for (const piece of [...along([[PAVING.pathWest, stepsAt], [PAVING.pathWest, PAVING.pathEndWest - 6]], wall, SITE.raised + PATH_DROP, 0.15), ...along([[PAVING.pathEast, stepsAt], [PAVING.pathEast, PAVING.pathEnd - 6]], wall, SITE.raised + PATH_DROP, 0.15)]) {
    piece.position.y -= PATH_DROP / 2
    group.add(piece)
  }
  // À gauche du chemin pour qui regarde la maison (à l'ouest), un second muret double le premier à 30 cm, du portillon jusqu'au second
  // muret de devant la maison, qu'il rejoint à angle droit ; entre les deux, de la terre, qui continue celle de la jardinière de devant.
  const bed = 0.3
  const outerPath = PAVING.pathWest - (0.15 + bed) * UNITS_PER_METER
  const earthPath = PAVING.pathWest - (0.075 + bed / 2) * UNITS_PER_METER
  const outerStart = startAt(SITE.house[0] - PERGOLA_FRONT - 0.15 - bed)
  group.add(...along([[outerPath, outerStart], [outerPath, PAVING.pathEndWest - 6]], wall, SITE.raised, 0.15))
  group.add(...along([[earthPath, westStart + 2], [earthPath, PAVING.pathEndWest - 10]], standard(0x4a2e22, 1), SITE.raised - 0.04, bed - 0.02))
  // Le portail et le portillon, en fer sombre.
  // Le portail du garage monte à 2,10 m, un peu sous la haie ; le portillon reste à 1,40 m.
  // Le portillon est au bout du chemin, en contrebas : il descend avec lui.
  // Le portail du garage aussi : il est au niveau du portillon (en haut de la rampe de l'allée).
  for (const door of [gate, wicket]) {
    for (const piece of along([[door.x1, door.y1], [door.x2, door.y2]], iron, door === gate ? 2.1 : GATE_HEIGHT, 0.06)) {
      piece.position.y -= PATH_DROP
      group.add(piece)
    }
  }
  // Le portail du garage et le portillon ont de chaque côté un piquet de béton, dans l'axe du portail, large (30 cm) et à peine plus haut que la haie (2,30 m).
  // de chaque haie (sinon la haie, haute et épaisse, les cache).
  // Les poteaux du portail du garage sont les plus hauts (2,50 m), ceux du portillon plus bas (2,20 m), tous deux un peu sous le niveau de la haie.
  const post = { wide: 0.3, inset: 0 }
  for (const [door, tall] of [[gate, 2.5], [wicket, 2.2]] as const) {
    const [x1, z1] = [gardenX(door.y1), gardenZ(door.x1)]
    const [x2, z2] = [gardenX(door.y2), gardenZ(door.x2)]
    const long = Math.hypot(x2 - x1, z2 - z1)
    const [dx, dz] = [(x2 - x1) / long, (z2 - z1) / long]
    for (const [x, z, way] of [[x1, z1, 1], [x2, z2, -1]]) {
      const pole = box(post.wide, tall, post.wide, m.concrete, x + dx * post.inset * way, tall / 2, z + dz * post.inset * way)
      pole.rotation.y = Math.atan2(dx, dz)
      // Aux portails (en contrebas), le poteau descend avec le chemin : même sommet, plus long.
      pole.scale.y = (tall + PATH_DROP) / tall
      pole.position.y -= PATH_DROP / 2
      group.add(pole)
    }
  }
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
