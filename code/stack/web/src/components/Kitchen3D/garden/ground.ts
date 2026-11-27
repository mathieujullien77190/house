import * as THREE from 'three'
import { PLAN_GARAGE_CORNERS, UNITS_PER_METER } from '@/components/Lights/constants'
import { BASE, ENTRY, OUTER_WALL, PATIO_DOOR, SAS } from '@/components/Kitchen3D/constants'
import type { GardenMaterials } from '@/components/Kitchen3D/materials'
import { box, standard } from '@/components/Kitchen3D/primitives'
import { CAGE_NORTH, CAGE_WEST, GARAGE_DEPTH, GRASS, LOT, LOW, PATH_DROP, PATH_STEPS, PAVING, PLAN, TERRACE } from './constants'
import type { PlanPoint } from './constants'
import { SITE } from './layout'
import { PERGOLA_FRONT } from './pergola'
import { arc, flat, gardenX, gardenZ, quad, tiledOn } from './plan'

/**
 * La pelouse, en deux niveaux. Derrière la maison (au nord de sa façade, à l'ouest du pavage et de la cage), le jardin est 20 cm plus
 * bas ; le reste est au niveau du terrain : de la façade nord vers le sud, jusqu'à l'arc, et tout le côté est.
 */
export const lawns = (group: THREE.Group, m: GardenMaterials): void => {
  const { grass } = m
  const { stepY, stepX, stepWest, midPlan, recessPlan } = SITE
  const lawn: PlanPoint[] = [[LOT.east, CAGE_NORTH], [stepX, CAGE_NORTH], [stepX, recessPlan], [midPlan, recessPlan], [midPlan, stepY], ...arc(LOT.radius, stepWest, [LOT.centerX, LOT.centerY + LOT.radius]), [LOT.east, LOT.centerY + LOT.radius]]
  // Le chemin du portillon s'enfonce dans le terrain après ses trois marches : la pelouse y est trouée.
  const trench: PlanPoint[] = [[PAVING.pathWest, PATH_STEPS.from], [PAVING.pathEast, PATH_STEPS.from], [PAVING.pathEast, PAVING.pathEnd], [PAVING.pathWest, PAVING.pathEndWest]]
  // L'allée du garage descend aussi en contrebas : elle troue la pelouse.
  group.add(flat(lawn, grass, -0.02, [trench, PLAN_GARAGE_CORNERS]))
  const lowLawn: PlanPoint[] = [[LOT.east, LOT.north], [LOT.centerX - LOT.radius, LOT.north], ...arc(LOT.radius, [LOT.centerX - LOT.radius, LOT.centerY], stepWest), [midPlan, stepY], [midPlan, recessPlan], [stepX, recessPlan], [stepX, CAGE_NORTH], [LOT.east, CAGE_NORTH]]
  group.add(flat(lowLawn, grass, -LOW - 0.02))
  // L'herbe de la partie basse est surélevée de 10 cm par rapport au béton qui longe la maison : la même surface, moins la bande de béton.
  const bandY = stepY - (TERRACE + BASE.setback) * UNITS_PER_METER
  const bandWest = PLAN.west - (OUTER_WALL + TERRACE) * UNITS_PER_METER
  const highGrass: PlanPoint[] = [[LOT.east, LOT.north], [LOT.centerX - LOT.radius, LOT.north], ...arc(LOT.radius, [LOT.centerX - LOT.radius, LOT.centerY], stepWest), [bandWest, stepY], [bandWest, bandY], [midPlan, bandY], [midPlan, recessPlan], [stepX, recessPlan], [stepX, CAGE_NORTH], [LOT.east, CAGE_NORTH]]
  group.add(flat(highGrass, grass, GRASS))
  const bandNorth = gardenX(bandY)
  const bandFrom = gardenZ(bandWest)
  // Un muret de béton tient ce terrain surélevé, tout le long de la bande derrière la maison : il dépasse un peu de l'herbe.
  const curb = GRASS + 0.04 + LOW
  group.add(box(0.12, curb, gardenZ(midPlan) - bandFrom, m.wall, bandNorth + 0.06, -LOW + curb / 2, (gardenZ(midPlan) + bandFrom) / 2))
}

/**
 * La marche entre les deux niveaux : un petit mur de soutènement, le long de la façade nord (et au-delà, jusqu'à la limite ouest), puis
 * le long du pavage, de la maison à la limite nord.
 */
export const retainingWalls = (group: THREE.Group, m: GardenMaterials): void => {
  const { riser } = m
  const { house, stepLine, stepZ, stepWest, midZ, cageFace } = SITE
  // Derrière la cage aussi, jusqu'à la haie du fond, le sol est bas : la marche longe le fond de la cage.
  const stepNorth = gardenX(CAGE_NORTH)
  const lotEast = gardenZ(LOT.east)
  group.add(box(0.12, LOW, lotEast - stepZ, riser, stepNorth + 0.06, -LOW / 2, (lotEast + stepZ) / 2))
  const stepFar = gardenZ(stepWest[0])
  const baseThick = OUTER_WALL - BASE.setback
  group.add(box(0.12, LOW, house[2] - stepFar, riser, stepLine - 0.06, -LOW / 2, (house[2] + stepFar) / 2), box(stepNorth - cageFace, LOW, 0.12, riser, (stepNorth + cageFace) / 2, -LOW / 2, stepZ + 0.06))
  const baseEnd = house[3] - BASE.setback
  group.add(box(cageFace - stepLine, LOW, 0.12, riser, (cageFace + stepLine) / 2, -LOW / 2, midZ + 0.06), box(0.12, LOW, midZ - stepZ, riser, cageFace + 0.06, -LOW / 2, (midZ + stepZ) / 2), box(0.12, LOW, midZ - baseEnd, riser, stepLine - 0.06, -LOW / 2, (midZ + baseEnd) / 2))
  // Sous la façade nord, c'est le muret de soubassement lui-même qui descend de 20 cm de plus, au même nu.
  group.add(box(baseThick, LOW, baseEnd - house[2], standard(0xcbc7bd, 0.95), stepLine - baseThick / 2, -LOW / 2, (baseEnd + house[2]) / 2))
}

/**
 * La terrasse : une bande carrelée d'1,50 m sur trois côtés de la maison (sud, ouest, est), qui va jusque sous le muret de soubassement,
 * en retrait du mur : on ne voit pas d'herbe à son pied. Et le perron, devant la porte d'entrée.
 */
export const groundTerrace = (group: THREE.Group, m: GardenMaterials): void => {
  const { terrace, concrete } = m
  const { house, stepLine, midZ } = SITE
  const tiled = tiledOn(group, terrace)
  const foot = BASE.setback + 0.03
  tiled(house[0] - TERRACE, house[0] + foot, house[2] - TERRACE, house[3] + TERRACE, -0.004)
  tiled(house[0] + foot, house[1], house[2] - TERRACE, house[2] + foot, -0.004)
  tiled(house[0] + foot, stepLine, house[3] - foot, house[3] + TERRACE, -0.004)
  // Derrière la maison (au nord), pas de carreaux : une bande de béton, dans la partie basse du jardin.
  const lowWest = house[2] - TERRACE
  group.add(box(TERRACE + BASE.setback, 0.004, midZ - lowWest, concrete, stepLine + (TERRACE + BASE.setback) / 2, -LOW - 0.001, (midZ + lowWest) / 2))
  const porchFrom = ENTRY.doorZ + OUTER_WALL
  group.add(box(SAS.north - SAS.south, 0.004, house[3] - porchFrom, terrace, (SAS.north + SAS.south) / 2, -0.006, (house[3] + porchFrom) / 2))
}

/** Le pavage : à l’est de la maison, du bas de la cage au sud de la terrasse ; le sol de la cage ; le chemin du portillon ; et l’allée de béton du portail. */
export const paving = (group: THREE.Group, m: GardenMaterials): void => {
  const { terrace, concrete } = m
  const { stepY, cageSouth, cageEast, midPlan, recessPlan } = SITE
  const east = PLAN.west + PLAN.width
  group.add(flat([[east, stepY], [midPlan, stepY], [midPlan, cageSouth], [LOT.east, cageSouth], [LOT.east, PAVING.south], [east, PAVING.south]], terrace, -0.008))
  // Le sol de la cage : carrelé, sauf le long du grillage de devant (le grand côté, derrière le bac), où c'est de la terre.
  group.add(flat([[midPlan, CAGE_NORTH], [cageEast, CAGE_NORTH], [cageEast, cageSouth], [midPlan, cageSouth]], terrace, -0.008))
  group.add(flat([[CAGE_WEST, CAGE_NORTH], [midPlan, CAGE_NORTH], [midPlan, recessPlan], [CAGE_WEST, recessPlan]], m.soil, -0.008))
  // Le chemin du portillon : de plain-pied jusqu'aux marches, puis trois marches qui descendent, puis il continue en contrebas jusqu'au portillon.
  const { from, count, tread, drop } = PATH_STEPS
  const level = (steps: number): number => -0.008 - drop * steps
  const pathWide = gardenZ(PAVING.pathEast) - gardenZ(PAVING.pathWest)
  group.add(flat([[PAVING.pathWest, PAVING.south], [PAVING.pathEast, PAVING.south], [PAVING.pathEast, from], [PAVING.pathWest, from]], terrace, level(0)))
  for (let step = 0; step < count; step += 1) {
    const [top, bottom] = [from + step * tread, from + (step + 1) * tread]
    group.add(flat([[PAVING.pathWest, top], [PAVING.pathEast, top], [PAVING.pathEast, bottom], [PAVING.pathWest, bottom]], terrace, level(step + 1)))
    // La contremarche, au haut de chaque marche.
    group.add(box(0.02, drop, pathWide, terrace, gardenX(top), level(step) - drop / 2, (gardenZ(PAVING.pathWest) + gardenZ(PAVING.pathEast)) / 2))
  }
  const low = from + count * tread
  group.add(flat([[PAVING.pathWest, low], [PAVING.pathEast, low], [PAVING.pathEast, PAVING.pathEnd], [PAVING.pathWest, PAVING.pathEndWest]], terrace, level(count)))
  // L'allée de béton, du portail à la terrasse : une rampe, du niveau du portillon (au portail) à 2 m sous le terrain (au pied de la terrasse, où est le garage),
  // entre trois murs de soutènement (les deux côtés, et le fond sous la terrasse).
  const [gateNorth, gateSouth, backSouth, backNorth] = PLAN_GARAGE_CORNERS
  const at = ([planX, planY]: PlanPoint, y: number): THREE.Vector3 => new THREE.Vector3(gardenX(planY), y, gardenZ(planX))
  const [shallow, deep] = [-0.012 - PATH_DROP, -GARAGE_DEPTH]
  group.add(quad([at(gateNorth, shallow), at(gateSouth, shallow), at(backSouth, deep), at(backNorth, deep)], concrete))
  const retain = m.wall
  group.add(quad([at(backNorth, deep), at(gateNorth, shallow), at(gateNorth, 0), at(backNorth, 0)], retain))
  group.add(quad([at(backSouth, deep), at(gateSouth, shallow), at(gateSouth, 0), at(backSouth, 0)], retain))
  group.add(quad([at(backNorth, deep), at(backSouth, deep), at(backSouth, 0), at(backNorth, 0)], retain))
}

/**
 * Le long de la façade des baies, la terrasse est surélevée, presque au niveau du sol de la maison : un massif carrelé d'1,50 m de
 * large, du coin ouest jusqu'entre la fenêtre du salon et celle du bureau, où deux marches (sur toute sa largeur) redescendent au pavage.
 * Un muret de béton bas la borde côté pelouse.
 */
export const raisedTerrace = (group: THREE.Group, m: GardenMaterials): void => {
  const { terrace, wall } = m
  const { house, raised, terraceEnd, terraceWest } = SITE
  const tiled = tiledOn(group, terrace)
  const clay = standard(0xd98f5a, 0.85)
  // Devant la maison, le massif va jusqu'au muret, qui passe sous les pieds de devant de la pergola.
  const wide = PERGOLA_FRONT - 0.075
  group.add(box(wide, raised - 0.002, terraceEnd - terraceWest, clay, house[0] - wide / 2, (raised - 0.002) / 2, (terraceEnd + terraceWest) / 2))
  tiled(house[0] - wide, house[0], terraceWest, terraceEnd, raised)
  // Côté chambre d'invité (la façade ouest), le carrelage est au même niveau : le massif tourne le coin et longe toute la façade, jusqu'au coin de l'arrière.
  const westNorth = house[1] - BASE.setback
  group.add(box(westNorth - house[0], raised - 0.002, TERRACE, clay, (westNorth + house[0]) / 2, (raised - 0.002) / 2, house[2] - TERRACE / 2))
  tiled(house[0], westNorth, terraceWest, house[2], raised)
  for (const [index, share] of [2 / 3, 1 / 3].entries()) {
    const from = terraceEnd + index * 0.3
    group.add(box(wide, raised * share - 0.002, 0.3, clay, house[0] - wide / 2, (raised * share - 0.002) / 2, from + 0.15))
    tiled(house[0] - wide, house[0], from, from + 0.3, raised * share)
  }
  // Le muret court sur toute la longueur des carreaux, du coin ouest jusqu'au muret ouest du chemin du portillon, qu'il rejoint à angle
  // droit (il longe donc aussi les marches).
  // Il est sur la ligne des pieds de devant de la pergola (ils sont posés dessus). Il arrive à la hauteur des carreaux surélevés, d'un bout à
  // l'autre (comme tous les murets du jardin).
  const muretEnd = gardenZ(PAVING.pathWest) + 0.075
  const muretX = house[0] - PERGOLA_FRONT
  group.add(box(0.15, raised, terraceEnd - terraceWest, wall, muretX, raised / 2, (terraceEnd + terraceWest) / 2), box(0.15, raised, muretEnd - terraceEnd, wall, muretX, raised / 2, (muretEnd + terraceEnd) / 2))
  // Devant lui, à 30 cm, un second muret de même hauteur, du muret du chemin du portillon jusqu'au bout de la maison ; entre
  // les deux, de la terre (une jardinière), fermée au bout ouest (à l'est, c'est le muret du chemin qui la ferme).
  const bed = 0.3
  const frontX = muretX - 0.15 - bed
  const bedEnd = muretEnd - 0.15
  // Devant la porte-fenêtre, il n'y en a pas : la jardinière s'interrompt sur sa largeur (un passage vers le jardin) et reprend après.
  const gap = [PATIO_DOOR.z - PATIO_DOOR.width / 2 - 0.1, PATIO_DOOR.z + PATIO_DOOR.width / 2 + 0.1]
  const earth = standard(0x4a2e22, 1)
  const middleX = muretX - 0.075 - bed / 2
  for (const [from, to, closedEnd] of [[terraceWest, gap[0], false], [gap[1], bedEnd, true]] as [number, number, boolean][]) {
    // Au bout du chemin, le second muret s'arrête au second muret du chemin (30 cm avant le premier) ; la terre, elle, va jusqu'au premier.
    const muretTo = closedEnd ? to - bed : to
    group.add(box(0.15, raised, muretTo - from, wall, frontX, raised / 2, (from + muretTo) / 2), box(bed - 0.02, raised - 0.04, to - from - 0.04, earth, middleX, (raised - 0.04) / 2, (from + to) / 2))
    // (La terre est un rien plus étroite et plus courte que son bac : ses faces ne se confondent pas avec celles des murets.)
    // Un petit muret ferme chaque bout (sauf au chemin du portillon, dont le muret la ferme déjà).
    group.add(box(bed, raised, 0.15, wall, middleX, raised / 2, from + 0.075))
    if (!closedEnd) group.add(box(bed, raised, 0.15, wall, middleX, raised / 2, to - 0.075))
  }
}
