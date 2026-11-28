import * as THREE from 'three'
import { PLAN_GARAGE_CORNERS, UNITS_PER_METER } from '@/components/Lights/constants'
import { BASE, ENTRY, OUTER_WALL, PATIO_DOOR, ROOM, SAS } from '@/components/Kitchen3D/constants'
import { faceted } from '@/components/Kitchen3D/materials'
import type { GardenMaterials } from '@/components/Kitchen3D/materials'
import { formedConcreteTexture } from '@/components/Kitchen3D/textures'
import { box, seeded, standard, woodTexture } from '@/components/Kitchen3D/primitives'
import { CAGE_NORTH, CAGE_WEST, GARAGE_DEPTH, GATE_DROP, GRASS, HEDGE, LOT, LOW, PATH_STEPS, PAVING, PLAN, TERRACE } from './constants'
import type { PlanPoint } from './constants'
import { tuftsOf } from './branches'
import { roundLaurel } from './laurel'
import { SITE } from './layout'
import { PERGOLA_FRONT } from './pergola'
import { arc, flat, gardenX, gardenZ, quad, tiledOn } from './plan'

/**
 * La pelouse, en deux niveaux. Derrière la maison (au nord de sa façade, à l'ouest du pavage et de la cage), le jardin est 20 cm plus
 * bas ; le reste est au niveau du terrain : de la façade nord vers le sud, jusqu'à l'arc, et tout le côté est.
 */
/** La pelouse s'arrête à la haie de l'arc (8 unités au-delà de son axe) : pas d'herbe dehors, derrière le portillon et le portail. */
const LAWN_RADIUS = HEDGE.radius + 8

/**
 * Le chemin de béton le long de la haie : il part de l'angle de la terrasse carrelée (côté ouest), file droit vers la haie, puis la suit en
 * descendant jusqu'au portail, par de longues marches (4 de 25 cm, à peu près 80 cm de giron). Toutes ses cotes sont des unités du plan : son
 * rayon médian (son bord extérieur contre la haie : à 30 cm de son axe) ; `from` : tel que le tronçon droit (34 unités de large) touche le muret du bac (sa face nord, à 3 unités de son axe), sa demi-largeur (45 cm), ses deux bouts (le long de la haie, du haut vers le portail).
 */
const WALK = { radius: HEDGE.radius - 12 - 17, half: 17, from: PLAN.height + (ROOM.xMin - (SITE.house[0] - PERGOLA_FRONT)) * UNITS_PER_METER - 37, endY: PLAN_GARAGE_CORNERS[1][1] + 0.4, steps: 4, drop: 0.25, startX: -31 }
/** Le dessus des murets qui entourent le petit bout de pelouse (entre l'escalier, le tronçon droit et l'allée du garage) : au ras de l'herbe, 1 cm au-dessus d'elle (m). */
const EDGE_TOP = -0.01
/** Le point d'un cercle de ce rayon (autour du centre du terrain, côté ouest) à cette ordonnée du plan. */
const circleAt = (radius: number, planY: number): PlanPoint => [LOT.centerX - Math.sqrt(radius ** 2 - (planY - LOT.centerY) ** 2), planY]
/** Le point d'un cercle de ce rayon à cet angle (autour du centre du terrain). */
const polar = (radius: number, angle: number): PlanPoint => [LOT.centerX + Math.cos(angle) * radius, LOT.centerY + Math.sin(angle) * radius]
/** Les angles qui découpent le chemin le long de la haie en marches : leurs bords sont des rayons du terrain, donc perpendiculaires au chemin. */
const walkAngles = (): number[] => {
  // Il s'arrête quand son bord intérieur (le plus au nord) touche le bord sud de l'allée du garage : sans trou ni bande d'herbe entre les deux.
  const from = circleAt(WALK.radius, WALK.from)
  const [start, end] = [Math.atan2(from[1] - LOT.centerY, from[0] - LOT.centerX), Math.PI - Math.asin((WALK.endY - LOT.centerY) / (WALK.radius - WALK.half))]
  return Array.from({ length: WALK.steps + 1 }, (_, index) => start + ((end - start) * index) / WALK.steps)
}
/** Le coin du triangle comblé au bout du chemin : à l'abscisse du bord extérieur de la dernière marche, sur le bord sud de l'allée du garage. */
const walkEndCorner = (): PlanPoint => [polar(WALK.radius + WALK.half, walkAngles()[WALK.steps])[0], WALK.endY]

/** Le bout du tronçon droit contre la haie : l'abscisse de son bord ouest (au bord extérieur du chemin, un peu au sud de la première marche). */
const walkCorner = (): number => circleAt(WALK.radius + WALK.half, WALK.from + WALK.half * 2)[0]
/**
 * Le contour du chemin dans le plan, tronçon droit compris (il descend aussi, en biais, jusqu'à la hauteur de la première marche) : il troue la pelouse.
 * Le long du bord intérieur des marches, puis le retour par le bord extérieur, puis le tronçon droit.
 */
export const walkOutline = (): PlanPoint[] => {
  const angles = walkAngles()
  return [
    [WALK.startX, WALK.from],
    ...angles.map((angle) => polar(WALK.radius - WALK.half, angle)),
    // Au bout, le triangle entre le bord de la dernière marche (un rayon) et le bord sud de l'allée du garage est creusé aussi (pas de triangle d'herbe).
    walkEndCorner(),
    ...angles.map((angle) => polar(WALK.radius + WALK.half, angle)).reverse(),
    [walkCorner(), WALK.from + WALK.half * 2],
    [WALK.startX, WALK.from + WALK.half * 2],
  ]
}

/**
 * Le chemin le long de la haie, vu comme un creux qui s'ouvre sur l'allée du garage : son contour, de son bord intérieur à son bord extérieur en passant par l'autre bout (de son coude
 * jusqu'à son arrivée), sans le côté de l'arrivée, qui est ouvert sur l'allée. Il sert à creuser la pelouse d'un seul tenant avec l'allée : pas de bande d'herbe entre les deux.
 */
const walkNotch = (): PlanPoint[] => {
  const outline = walkOutline()
  const reversed = [...outline].reverse()
  const innerEnd = outline[WALK.steps + 1]
  const cutAt = reversed.findIndex((point) => point === innerEnd)
  return [...reversed.slice(cutAt), ...reversed.slice(0, cutAt)]
}

/** Le point de l'arc de la pelouse à cette abscisse du plan. */
const arcAt = (planX: number): PlanPoint => [planX, LOT.centerY + Math.sqrt(LAWN_RADIUS ** 2 - (planX - LOT.centerX) ** 2)]
/** Le point de l'arc de la pelouse dans la direction d'un point du plan (vu du centre du terrain). */
const arcToward = ([planX, planY]: PlanPoint): PlanPoint => {
  const scale = LAWN_RADIUS / Math.hypot(planX - LOT.centerX, planY - LOT.centerY)
  return [LOT.centerX + (planX - LOT.centerX) * scale, LOT.centerY + (planY - LOT.centerY) * scale]
}

export const lawns = (group: THREE.Group, m: GardenMaterials): void => {
  const { grass } = m
  const { stepY, stepX, stepWest, midPlan, recessPlan } = SITE
  // Le contour de la pelouse suit l'arc de la haie, mais fait un creux à l'allée du garage et au chemin du portillon (qui descendent en contrebas) : le creux
  // s'ouvre sur l'arc lui-même, donc pas de bande d'herbe derrière le portail ni derrière le portillon.
  const [garageNorth, garageSouth, garageBackSouth, garageBackNorth] = PLAN_GARAGE_CORNERS
  const lawn: PlanPoint[] = [
    [LOT.east, CAGE_NORTH], [stepX, CAGE_NORTH], [stepX, recessPlan], [midPlan, recessPlan], [midPlan, stepY],
    ...arc(LAWN_RADIUS, stepWest, arcToward(garageNorth)),
    garageNorth, garageBackNorth, garageBackSouth,
    [walkNotch()[0][0], garageSouth[1]], ...walkNotch(), [walkEndCorner()[0], garageSouth[1]],
    garageSouth,
    ...arc(LAWN_RADIUS, arcToward(garageSouth), arcAt(PAVING.pathWest)),
    [PAVING.pathWest, PATH_STEPS.from], [PAVING.pathEast, PATH_STEPS.from],
    ...arc(LAWN_RADIUS, arcAt(PAVING.pathEast), [LOT.centerX, LOT.centerY + LAWN_RADIUS]),
    [LOT.east, LOT.centerY + LOT.radius],
  ]
  // Le chemin le long de la haie descend sous la pelouse : elle est creusée, d'un seul tenant avec l'allée du garage.
  group.add(flat(lawn, grass, -0.02))
  // Le petit bout de pelouse enclavé (entre l'allée du garage, l'escalier, son muret et le carrelage) n'est pas de l'herbe mais de la terre : elle remplace l'herbe sur toute sa surface,
  // à 5 mm au-dessus d'elle, jusqu'aux murets (le long de l'escalier, son bord est l'arc de la face côté pelouse de son muret).
  const lopinFace = WALK.radius - WALK.half - 6
  const lopinDown = WALK.from - 6
  const lopinRows = Array.from({ length: 9 }, (_, index) => PLAN_GARAGE_CORNERS[1][1] + 12 + ((lopinDown - PLAN_GARAGE_CORNERS[1][1] - 12) * index) / 8)
  const lopin: PlanPoint[] = [[WALK.startX, PLAN_GARAGE_CORNERS[1][1] + 12], ...lopinRows.map((y): PlanPoint => circleAt(lopinFace, y)), [WALK.startX, lopinDown]]
  group.add(flat(lopin, m.soil, -0.015))
  // Côté rue, le long de l'arc : un mur de la pelouse jusqu'à 2,20 m plus bas, pour qu'on ne voie pas sous le sol. Aux deux passages (le portail du garage et le portillon), il monte
  // seulement jusqu'à leur sol (la rampe, le chemin) : on y passe.
  const angleOf = ([planX, planY]: PlanPoint): number => Math.atan2(planY - LOT.centerY, planX - LOT.centerX)
  // Au portail, il ne s'abaisse qu'entre les deux poteaux de béton (à 15 cm de leur centre) : de chaque côté, il va jusqu'au poteau, sous la haie.
  const post = (0.15 * UNITS_PER_METER) / HEDGE.radius
  const [gateFrom, gateTo] = [angleOf([SITE.gate.x1, SITE.gate.y1]) - post, angleOf([SITE.gate.x2, SITE.gate.y2]) + post]
  const [wicketFrom, wicketTo] = [angleOf(arcAt(PAVING.pathWest)), angleOf(arcAt(PAVING.pathEast))]
  const [first, last] = [angleOf(stepWest), Math.PI / 2]
  const skirt = standard(0x5d5c58, 1, 0, THREE.DoubleSide)
  const steps = 160
  for (let step = 0; step < steps; step += 1) {
    const [from, to] = [first + ((last - first) * step) / steps, first + ((last - first) * (step + 1)) / steps]
    const middle = (from + to) / 2
    // Les angles décroissent de l'ouest vers le sud : le portail puis le portillon.
    const top = middle <= gateFrom && middle >= gateTo ? -1.022 : middle <= wicketFrom && middle >= wicketTo ? -0.008 - PATH_STEPS.count * PATH_STEPS.drop : -0.02
    const [a, b] = [polar(LAWN_RADIUS + 0.4, from), polar(LAWN_RADIUS + 0.4, to)]
    const at = ([planX, planY]: PlanPoint, y: number): THREE.Vector3 => new THREE.Vector3(gardenX(planY), y, gardenZ(planX))
    group.add(quad([at(a, -2.2), at(b, -2.2), at(b, top), at(a, top)], skirt))
  }
  // Le mur continue tout autour jusqu'aux limites de la propriété : l'arc de la partie basse à l'ouest, la limite nord, la limite est (en bas, derrière la haie de thuyas).
  const border = (points: PlanPoint[], top: number): void => {
    const at = ([planX, planY]: PlanPoint, y: number): THREE.Vector3 => new THREE.Vector3(gardenX(planY), y, gardenZ(planX))
    points.slice(1).forEach((point, index) => group.add(quad([at(points[index], -2.2), at(point, -2.2), at(point, top), at(points[index], top)], skirt)))
  }
  const [lowTop, northEast, northWest] = [-LOW - 0.02, [LOT.east, LOT.north] as PlanPoint, [LOT.centerX - LAWN_RADIUS, LOT.north] as PlanPoint]
  border([[LOT.centerX, LOT.centerY + LAWN_RADIUS + 0.4], [LOT.east, LOT.centerY + LOT.radius], [LOT.east, CAGE_NORTH]], -0.02)
  border([[LOT.east, CAGE_NORTH], northEast, northWest, [LOT.centerX - LAWN_RADIUS, LOT.centerY], ...arc(LAWN_RADIUS, [LOT.centerX - LAWN_RADIUS, LOT.centerY], stepWest)], lowTop)
  // Dans la rue, le long de la haie : un trottoir de 1 m, à la hauteur du portail du garage (en bas), qui monte légèrement jusqu'au portillon (au niveau de son chemin),
  // et continue jusqu'au bout de chaque côté au même niveau. Il a 20 cm d'épaisseur.
  const [gateMiddle, wicketMiddle] = [(gateFrom + gateTo) / 2, (wicketFrom + wicketTo) / 2]
  const walk = standard(0xb9b8b2, 0.95, 0, THREE.DoubleSide)
  const pavement = (angle: number): number => {
    const share = Math.min(1, Math.max(0, (angle - gateMiddle) / (wicketMiddle - gateMiddle)))
    return -1.022 + (-0.008 - PATH_STEPS.count * PATH_STEPS.drop + 1.022) * share
  }
  // Il va jusqu'au bout de la haie, de chaque côté (à l'ouest, jusqu'au coin nord-ouest de la propriété) : à la hauteur du portail avant lui, à celle du portillon après.
  const [lowest, highest] = [Math.PI, angleOf([LOT.east, LOT.centerY + LOT.radius])]
  const [inner, outer] = [LAWN_RADIUS + 0.4, LAWN_RADIUS + 0.4 + 1 * UNITS_PER_METER]
  const stripSteps = 320
  for (let step = 0; step < stripSteps; step += 1) {
    const [from, to] = [lowest + ((highest - lowest) * step) / stripSteps, lowest + ((highest - lowest) * (step + 1)) / stripSteps]
    const [levelFrom, levelTo] = [pavement(from), pavement(to)]
    const at = ([planX, planY]: PlanPoint, y: number): THREE.Vector3 => new THREE.Vector3(gardenX(planY), y, gardenZ(planX))
    group.add(quad([at(polar(inner, from), levelFrom), at(polar(inner, to), levelTo), at(polar(outer, to), levelTo), at(polar(outer, from), levelFrom)], walk))
    group.add(quad([at(polar(outer, from), levelFrom), at(polar(outer, to), levelTo), at(polar(outer, to), levelTo - 0.2), at(polar(outer, from), levelFrom - 0.2)], walk))
  }
  // Au coin nord-ouest, l'arc s'arrête mais la propriété continue tout droit vers le nord : le trottoir aussi, le long de la limite ouest, jusqu'au bout (au niveau du portail).
  const streetAt = ([planX, planY]: PlanPoint, y: number): THREE.Vector3 => new THREE.Vector3(gardenX(planY), y, gardenZ(planX))
  const [westInner, westOuter, westLevel] = [LOT.centerX - inner, LOT.centerX - outer, pavement(Math.PI)]
  group.add(quad([streetAt([westInner, LOT.centerY], westLevel), streetAt([westInner, LOT.north], westLevel), streetAt([westOuter, LOT.north], westLevel), streetAt([westOuter, LOT.centerY], westLevel)], walk))
  group.add(quad([streetAt([westOuter, LOT.centerY], westLevel), streetAt([westOuter, LOT.north], westLevel), streetAt([westOuter, LOT.north], westLevel - 0.2), streetAt([westOuter, LOT.centerY], westLevel - 0.2)], walk))
  const lowLawn: PlanPoint[] = [[LOT.east, LOT.north], [LOT.centerX - LAWN_RADIUS, LOT.north], ...arc(LAWN_RADIUS, [LOT.centerX - LAWN_RADIUS, LOT.centerY], stepWest), [midPlan, stepY], [midPlan, recessPlan], [stepX, recessPlan], [stepX, CAGE_NORTH], [LOT.east, CAGE_NORTH]]
  group.add(flat(lowLawn, grass, -LOW - 0.02))
  // L'herbe de la partie basse est surélevée de 10 cm par rapport au béton qui longe la maison : la même surface, moins la bande de béton.
  const bandY = stepY - (TERRACE + BASE.setback) * UNITS_PER_METER
  const bandWest = PLAN.west - (OUTER_WALL + TERRACE) * UNITS_PER_METER
  const highGrass: PlanPoint[] = [[LOT.east, LOT.north], [LOT.centerX - LAWN_RADIUS, LOT.north], ...arc(LAWN_RADIUS, [LOT.centerX - LAWN_RADIUS, LOT.centerY], stepWest), [bandWest, stepY], [bandWest, bandY], [midPlan, bandY], [midPlan, recessPlan], [stepX, recessPlan], [stepX, CAGE_NORTH], [LOT.east, CAGE_NORTH]]
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
  group.add(flat([[PAVING.pathWest, low], [PAVING.pathEast, low], arcAt(PAVING.pathEast), arcAt(PAVING.pathWest)], terrace, level(count)))
  // Le chemin de béton le long de la haie : un tronçon droit depuis l'angle de la terrasse, puis les longues marches qui descendent vers le portail.
  // Le tronçon droit part du carrelage de la terrasse (son bord ouest, dans la largeur des carreaux), file vers la haie et descend en biais, de plain-pied au départ jusqu'à la hauteur de la première
  // marche ; il se termine contre la haie, juste au bas de la première marche.
  const cornerX = walkCorner()
  const at2 = ([planX, planY]: PlanPoint, y: number): THREE.Vector3 => new THREE.Vector3(gardenX(planY), y, gardenZ(planX))
  const [northStart, northEnd, southEnd, southStart]: PlanPoint[] = [[WALK.startX, WALK.from], [cornerX, WALK.from], [cornerX, WALK.from + WALK.half * 2], [WALK.startX, WALK.from + WALK.half * 2]]
  // Le sol de la rampe : uni, rouge brique en pastel ; sous la terrasse, c'est du béton gris.
  const ramp = standard(0xd9a99d, 0.9, 0, THREE.DoubleSide)
  const formed = standard(formedConcreteTexture(), 0.95, 0, THREE.DoubleSide)
  group.add(quad([at2(northStart, -0.006), at2(northEnd, -WALK.drop), at2(southEnd, -WALK.drop), at2(southStart, -0.006)], concrete))
  group.add(quad([at2(southStart, -0.006), at2(southEnd, -WALK.drop), at2(southEnd, -0.006), at2(southStart, -0.006)], formed, true))
  // La tête de l'escalier : le bord de sa première marche (un rayon du terrain), du côté intérieur au côté de la haie.
  const headAngle = walkAngles()[0]
  const [headInner, headOuter] = [polar(WALK.radius - WALK.half, headAngle), polar(WALK.radius + WALK.half, headAngle)]
  // Le raccord entre le tronçon droit et cette tête (un coin en biseau) est comblé par trois triangles, sans chevauchement : le long du bord nord du tronçon (jusqu'au coin intérieur
  // de la tête), puis de part et d'autre du coin du tronçon. Le sol y descend comme le tronçon : de plain-pied au départ, à la hauteur de la première marche au bout.
  group.add(quad([at2(northStart, -0.006), at2(headInner, -WALK.drop), at2(northEnd, -WALK.drop), at2(northStart, -0.006)], concrete))
  group.add(quad([at2(northEnd, -WALK.drop), at2(headInner, -WALK.drop), at2(headOuter, -WALK.drop), at2(northEnd, -WALK.drop)], concrete))
  group.add(quad([at2(northEnd, -WALK.drop), at2(headOuter, -WALK.drop), at2(southEnd, -WALK.drop), at2(northEnd, -WALK.drop)], concrete))
  // Le bord du coin, du côté de la haie (du bout du tronçon droit au bord extérieur de la première marche), a aussi son mur de soutènement : sans lui, on voyait un trou sous la haie.
  group.add(quad([at2(headOuter, -WALK.drop), at2(southEnd, -WALK.drop), at2(southEnd, -0.02), at2(headOuter, -0.02)], formed, true))
  // À droite du tronçon qui descend (côté nord, vers la maison), un muret de béton de 15 cm d'épaisseur, 20 cm au-dessus du sol. Il suit le bord du creux, du carrelage jusqu'au coin intérieur de la
  // tête de l'escalier, où il rejoint exactement le muret de l'escalier (même épaisseur, mêmes deux faces) : les deux murets n'en font qu'un, qui tourne le coin.
  const [wallFrom, wallTo]: PlanPoint[] = [northStart, headInner]
  const [thickFrom, thickTo]: PlanPoint[] = [[wallFrom[0], wallFrom[1] - 6], polar(WALK.radius - WALK.half - 6, headAngle)]
  group.add(quad([at2(wallFrom, -0.006), at2(wallTo, -WALK.drop), at2(wallTo, EDGE_TOP), at2(wallFrom, EDGE_TOP)], formed, true))
  group.add(quad([at2(wallFrom, EDGE_TOP), at2(wallTo, EDGE_TOP), at2(thickTo, EDGE_TOP), at2(thickFrom, EDGE_TOP)], formed, true))
  group.add(quad([at2(thickFrom, EDGE_TOP), at2(thickTo, EDGE_TOP), at2(thickTo, -0.02), at2(thickFrom, -0.02)], formed, true))
  const rows = walkAngles()
  const sunk = (planPoint: PlanPoint, y: number): THREE.Vector3 => new THREE.Vector3(gardenX(planPoint[1]), y, gardenZ(planPoint[0]))
  // Le sol de ce triangle, au niveau de la dernière marche.
  const lastAngle = rows[WALK.steps]
  const endLevel = -WALK.drop * WALK.steps
  group.add(quad([sunk(polar(WALK.radius - WALK.half, lastAngle), endLevel), sunk(walkEndCorner(), endLevel), sunk(polar(WALK.radius + WALK.half, lastAngle), endLevel), sunk(polar(WALK.radius - WALK.half, lastAngle), endLevel)], concrete))
  for (let step = 0; step < WALK.steps; step += 1) {
    const [top, bottom] = [rows[step], rows[step + 1]]
    const level = -WALK.drop * (step + 1)
    const [innerTop, outerTop] = [polar(WALK.radius - WALK.half, top), polar(WALK.radius + WALK.half, top)]
    const [innerBottom, outerBottom] = [polar(WALK.radius - WALK.half, bottom), polar(WALK.radius + WALK.half, bottom)]
    // La marche, puis sa contremarche (au haut) et les deux murets de soutènement de ses côtés.
    group.add(flat([innerTop, outerTop, outerBottom, innerBottom], concrete, level))
    if (step > 0) group.add(quad([sunk(innerTop, level + WALK.drop), sunk(outerTop, level + WALK.drop), sunk(outerTop, level), sunk(innerTop, level)], formed, true))
    group.add(quad([sunk(innerTop, level), sunk(innerBottom, level), sunk(innerBottom, -0.02), sunk(innerTop, -0.02)], formed, true))
    group.add(quad([sunk(outerTop, level), sunk(outerBottom, level), sunk(outerBottom, -0.02), sunk(outerTop, -0.02)], formed, true))
    // Du côté du petit lopin de terre qui reste (le côté intérieur), le chemin est bordé d'un muret de béton de 15 cm d'épaisseur qui dépasse de 20 cm de la pelouse.
    const [edgeTop, edgeBottom] = [polar(WALK.radius - WALK.half - 6, top), polar(WALK.radius - WALK.half - 6, bottom)]
    group.add(quad([sunk(innerTop, -0.02), sunk(innerBottom, -0.02), sunk(innerBottom, EDGE_TOP), sunk(innerTop, EDGE_TOP)], formed, true))
    group.add(quad([sunk(innerTop, EDGE_TOP), sunk(innerBottom, EDGE_TOP), sunk(edgeBottom, EDGE_TOP), sunk(edgeTop, EDGE_TOP)], formed, true))
    // Sa face côté pelouse descend jusqu'au niveau de la marche (et pas seulement jusqu'à l'herbe) : à l'arrivée, elle est à découvert du côté de l'allée du garage, et sans cela on voit à travers.
    group.add(quad([sunk(edgeTop, EDGE_TOP), sunk(edgeBottom, EDGE_TOP), sunk(edgeBottom, level), sunk(edgeTop, level)], formed, true))
  }
  // Le bout du muret de l'escalier, à l'arrivée, est fermé (on ne voit pas dedans), du sol de la dernière marche à son dessus.
  const lastStep = rows[WALK.steps]
  const [capInner, capOuter] = [polar(WALK.radius - WALK.half, lastStep), polar(WALK.radius - WALK.half - 6, lastStep)]
  group.add(quad([sunk(capInner, -WALK.drop * WALK.steps), sunk(capOuter, -WALK.drop * WALK.steps), sunk(capOuter, EDGE_TOP), sunk(capInner, EDGE_TOP)], formed, true))
  // L'allée du garage : une rampe au sol uni, du niveau du portillon (au portail, 50 cm plus bas) jusqu'au devant de la terrasse, à 2 m sous le terrain ; puis,
  // sous la terrasse (les carreaux au-dessus), le sol est plat jusqu'au portail en bois du garage. Trois murs de soutènement : les deux côtés, et le fond.
  const [gateNorth, gateSouth, backSouth, backNorth] = PLAN_GARAGE_CORNERS
  const at = ([planX, planY]: PlanPoint, y: number): THREE.Vector3 => new THREE.Vector3(gardenX(planY), y, gardenZ(planX))
  const [shallow, deep] = [-0.012 - GATE_DROP, -GARAGE_DEPTH]
  const rampEnd = PLAN.west - (OUTER_WALL + TERRACE) * UNITS_PER_METER
  const [rampNorth, rampSouth]: PlanPoint[] = [[rampEnd, gateNorth[1]], [rampEnd, gateSouth[1]]]
  group.add(quad([at(gateNorth, shallow), at(gateSouth, shallow), at(rampSouth, deep), at(rampNorth, deep)], ramp))
  // Côté rue, l'allée continue à plat du portail jusqu'au trottoir (son bord intérieur).
  const toStreet = ([planX, planY]: PlanPoint): PlanPoint => {
    const scale = (LAWN_RADIUS + 0.4) / Math.hypot(planX - LOT.centerX, planY - LOT.centerY)
    return [LOT.centerX + (planX - LOT.centerX) * scale, LOT.centerY + (planY - LOT.centerY) * scale]
  }
  group.add(quad([at(toStreet(gateNorth), shallow), at(toStreet(gateSouth), shallow), at(gateSouth, shallow), at(gateNorth, shallow)], ramp))
  group.add(quad([at(rampNorth, deep), at(rampSouth, deep), at(backSouth, deep), at(backNorth, deep)], concrete))
  // De chaque côté de la descente, un mur de béton de 20 cm d'épaisseur qui dépasse de 20 cm du terrain (`outward` : de quel côté, vers le nord ou vers le sud).
  // `skew` : l'abscisse du bout de départ sur sa face de dehors, quand ce bout est coupé en biais (contre un muret courbe) au lieu d'être d'équerre.
  const concreteWall = (from: PlanPoint, to: PlanPoint, fromLevel: number, toLevel: number, outward: 1 | -1, skew = from[0], top = 0.2): void => {
    const thick = 0.2 * UNITS_PER_METER * outward
    const [outFrom, outTo]: PlanPoint[] = [[skew, from[1] + thick], [to[0], to[1] + thick]]
    group.add(quad([at(from, fromLevel), at(to, toLevel), at(to, top), at(from, top)], formed, true))
    group.add(quad([at(from, top), at(to, top), at(outTo, top), at(outFrom, top)], formed, true))
    group.add(quad([at(outFrom, top), at(outTo, top), at(outTo, -0.02), at(outFrom, -0.02)], formed, true))
    // Les deux bouts du mur sont fermés (sinon on voit dedans, là où le mur s'interrompt).
    group.add(quad([at(from, fromLevel), at(outFrom, fromLevel), at(outFrom, top), at(from, top)], formed, true))
    group.add(quad([at(to, toLevel), at(outTo, toLevel), at(outTo, top), at(to, top)], formed, true))
  }
  // Le côté nord : le talus de la rampe, puis le mur droit sous la terrasse.
  concreteWall(gateNorth, rampNorth, shallow, deep, -1)
  // (Sous la terrasse, les murs s'arrêtent sous son bloc, au niveau du terrain : ils ne dépassent pas dans sa face, où ils scintilleraient.)
  concreteWall(rampNorth, backNorth, deep, deep, -1, rampNorth[0], -0.005)
  // Le côté sud s'interrompt là où le chemin le long de la haie arrive sur la rampe (toute la largeur du chemin, et un peu plus, de part et d'autre de son arrivée).
  // Le mur du côté sud est coupé exactement sur la largeur de l'escalier à son arrivée (la largeur de ses marches) : c'est lui qui prend le relais.
  const endAngle = walkAngles()[WALK.steps]
  // (Du bord extérieur des marches à la face côté pelouse du muret de l'escalier, là où elle coupe le bord de l'allée : le mur de l'allée s'arrête contre ce muret, sans le recouvrir.)
  const muretFace = WALK.radius - WALK.half - 6
  const stairXs = [circleAt(muretFace, gateSouth[1])[0], polar(WALK.radius + WALK.half, endAngle)[0]]
  const shareOf = (x: number): number => (x - gateSouth[0]) / (rampEnd - gateSouth[0])
  const [openLow, openHigh] = [shareOf(Math.min(...stairXs)), shareOf(Math.max(...stairXs))]
  const wallLevel = (share: number): number => shallow + (deep - shallow) * share
  for (const [from, to] of [[0, openLow], [openHigh, 1]]) {
    const [start, end] = [from, to].map((share): PlanPoint => [gateSouth[0] + (rampEnd - gateSouth[0]) * share, gateSouth[1]])
    // Le tronçon d'après l'escalier commence en biais, contre la face courbe du muret de l'escalier : les deux murs se touchent sans se chevaucher.
    // Ce tronçon borde le petit bout de pelouse : son dessus est au ras de l'herbe (1 cm au-dessus), comme les autres murets qui l'entourent.
    concreteWall(start, end, wallLevel(from), wallLevel(to), 1, from === openHigh ? circleAt(muretFace, gateSouth[1] + 0.2 * UNITS_PER_METER)[0] : start[0], from === openHigh ? EDGE_TOP : 0.2)
  }
  concreteWall(rampSouth, backSouth, deep, deep, 1, rampSouth[0], -0.005)
  // Dans la descente, le long de la pente : un muret de béton à 30 cm du mur de droite (10 cm d'épaisseur), depuis l'arrivée de l'escalier.
  const curbFrom = gateSouth[0] + (rampEnd - gateSouth[0]) * openHigh
  const [curbNear, curbFar] = [gateSouth[1] - 0.3 * UNITS_PER_METER, gateSouth[1] - 0.4 * UNITS_PER_METER]
  // Il s'arrête 50 cm avant le bas de la pente, et son dessus est à plat pendant que la rampe descend sous lui.
  const curbTo = rampEnd - 0.5 * UNITS_PER_METER
  const [curbLow, curbHigh] = [wallLevel(openHigh), wallLevel((curbTo - gateSouth[0]) / (rampEnd - gateSouth[0]))]
  // Son dessus est au niveau de la dernière marche de l'escalier (le palier qui avance dans l'allée).
  const curbTop = -WALK.drop * WALK.steps
  const [n0, n1, f0, f1]: PlanPoint[] = [[curbFrom, curbNear], [curbTo, curbNear], [curbFrom, curbFar], [curbTo, curbFar]]
  group.add(quad([at(n0, curbLow), at(n1, curbHigh), at(n1, curbTop), at(n0, curbTop)], formed, true))
  group.add(quad([at(f0, curbLow), at(f1, curbHigh), at(f1, curbTop), at(f0, curbTop)], formed, true))
  group.add(quad([at(n0, curbTop), at(n1, curbTop), at(f1, curbTop), at(f0, curbTop)], formed, true))
  group.add(quad([at(n0, curbLow), at(f0, curbLow), at(f0, curbTop), at(n0, curbTop)], formed, true))
  group.add(quad([at(n1, curbHigh), at(f1, curbHigh), at(f1, curbTop), at(n1, curbTop)], formed, true))
  // Entre ce muret et le mur de droite : de la terre, 5 cm sous le dessus du muret (vue des deux côtés : elle ne dépend pas du sens de son contour).
  group.add(quad([at([curbFrom, curbNear], curbTop - 0.05), at([curbTo, curbNear], curbTop - 0.05), at([curbTo, gateSouth[1]], curbTop - 0.05), at([curbFrom, gateSouth[1]], curbTop - 0.05)], standard(0x4a2e22, 1, 0, THREE.DoubleSide)))
  // Dans cette terre, un arbre étroit, feuillu dès le pied, assez large (80 cm de rayon, 2,60 m), du côté du garage : feuillage sombre, peu dense.
  const column = roundLaurel(163, 2, 6.5, [0x2f5a35, 0x37663a, 0x284d30], false, 150)
  column.name = 'tree'
  column.scale.setScalar(0.4)
  column.position.copy(at([curbFrom + (curbTo - curbFrom) * 0.82, (curbNear + gateSouth[1]) / 2], curbTop - 0.05))
  group.add(column)
  // Là où il s'arrête, un mur plein prend toute la largeur entre lui et le mur de droite (40 cm), et continue jusqu'au portail en bois du garage.
  const [blockStart, blockSlopeEnd, blockEnd]: PlanPoint[] = [[curbTo, curbFar], [rampEnd, curbFar], [backSouth[0], curbFar]]
  const [wallStart, wallEnd]: PlanPoint[] = [[curbTo, gateSouth[1]], [backSouth[0], gateSouth[1]]]
  // Il monte jusque sous le bloc de la terrasse (le niveau du terrain : le bloc de la terrasse est posé dessus).
  const blockTop = 0
  group.add(quad([at(blockStart, curbHigh), at(blockSlopeEnd, deep), at(blockSlopeEnd, blockTop), at(blockStart, blockTop)], formed, true))
  group.add(quad([at(blockSlopeEnd, deep), at(blockEnd, deep), at(blockEnd, blockTop), at(blockSlopeEnd, blockTop)], formed, true))
  group.add(quad([at(blockStart, blockTop), at(blockEnd, blockTop), at(wallEnd, blockTop), at(wallStart, blockTop)], formed, true))
  group.add(quad([at(blockStart, curbHigh), at(wallStart, curbHigh), at(wallStart, blockTop), at(blockStart, blockTop)], formed, true))
  // Là où le chemin arrive sur la rampe : le sol de sa dernière marche et celui de la rampe sont à des hauteurs différentes (la rampe est plus bas) : une contremarche ferme l'écart sur toute l'ouverture du mur.
  const [openFrom, openTo] = [openLow, openHigh].map((share): number => gateSouth[0] + (rampEnd - gateSouth[0]) * share)
  const [stairLevel, y] = [-WALK.drop * WALK.steps, gateSouth[1]]
  // Et le sol, au niveau de la dernière marche, dans toute l'épaisseur du mur (20 cm) : on ne voit plus dessous.
  // (Du même béton que la marche, 2 mm plus bas : là où il passe sous elle, il ne se voit pas et ne scintille pas.)
  group.add(quad([at([openFrom, y], stairLevel - 0.002), at([openTo, y], stairLevel - 0.002), at([openTo, y + 0.2 * UNITS_PER_METER], stairLevel - 0.002), at([openFrom, y + 0.2 * UNITS_PER_METER], stairLevel - 0.002)], concrete))
  // L'escalier avance dans l'allée jusqu'à la face avant du muret de la descente (40 cm : son écart au mur et son épaisseur) : un palier au niveau de la dernière marche, puis la contremarche qui descend au sol de la rampe,
  // et ses deux joues.
  const front = curbFar
  // Cette marche longe le mur de droite jusqu'au poteau de béton du portail (elle y est presque au niveau de la rampe, qui est plus haute près du portail).
  const stepWest = gateSouth[0]
  group.add(quad([at([stepWest, front], stairLevel), at([openTo, front], stairLevel), at([openTo, y], stairLevel), at([stepWest, y], stairLevel)], concrete))
  group.add(quad([at([stepWest, front], stairLevel), at([openTo, front], stairLevel), at([openTo, front], wallLevel(openHigh)), at([stepWest, front], wallLevel(0))], formed, true))
  for (const [edge, share] of [[stepWest, 0], [openTo, openHigh]]) group.add(quad([at([edge, front], stairLevel), at([edge, y], stairLevel), at([edge, y], wallLevel(share)), at([edge, front], wallLevel(share))], formed, true))
  // En bas de la pente, en travers de l'allée : un caniveau à grille pour l'eau, de 8 cm de large (un fond sombre, un cadre et des barrettes de fonte), du mur de gauche au mur plein de droite.
  const drain = { wide: 0.08, z: gardenZ(rampEnd) - 0.01, y: deep + 0.004 }
  const [drainNorth, drainSouth] = [gardenX(gateNorth[1]), gardenX(curbFar)]
  const drainLong = drainNorth - drainSouth
  const drainMiddle = (drainNorth + drainSouth) / 2
  const cast = standard(0x5a5d61, 0.6, 0.5)
  group.add(box(drainLong, 0.006, drain.wide, standard(0x101114, 0.9), drainMiddle, drain.y, drain.z))
  for (const side of [-1, 1]) group.add(box(drainLong, 0.01, 0.012, cast, drainMiddle, drain.y + 0.003, drain.z + side * (drain.wide / 2 - 0.006)))
  const slats = Math.round(drainLong / 0.03)
  for (let slat = 0; slat <= slats; slat += 1) group.add(box(0.012, 0.01, drain.wide, cast, drainSouth + (drainLong * slat) / slats, drain.y + 0.003, drain.z))
  // Sur la terrasse, juste au-dessus de l'allée du garage : une barrière de métal noir (1 m de haut) à barreaux verticaux, sur toute la largeur de l'allée, au bord du carrelage.
  const [railNorth, railSouth, railZ] = [gardenX(gateNorth[1]), gardenX(gateSouth[1]), gardenZ(rampEnd) + 0.04]
  const railLong = railNorth - railSouth
  const railMiddle = (railNorth + railSouth) / 2
  const rail = { tall: 1, floor: SITE.raised }
  group.add(box(railLong, 0.04, 0.04, m.iron, railMiddle, rail.floor + rail.tall, railZ), box(railLong, 0.03, 0.03, m.iron, railMiddle, rail.floor + 0.1, railZ))
  for (const edge of [railNorth - 0.02, railMiddle, railSouth + 0.02]) group.add(box(0.04, rail.tall, 0.04, m.iron, edge, rail.floor + rail.tall / 2, railZ))
  const bars = Math.round(railLong / 0.11)
  for (let bar = 1; bar < bars; bar += 1) group.add(box(0.014, rail.tall - 0.1, 0.014, m.iron, railSouth + (railLong * bar) / bars, rail.floor + 0.1 + (rail.tall - 0.1) / 2, railZ))
  // Du lierre, près de l'arbre sombre : il couvre le mur de droite (du sol de l'allée jusqu'à la barrière), monte sur la barrière (sur toute sa longueur, surtout en bas), et déborde un peu sur l'épaisseur du carrelage.
  const ivy = tuftsOf([0x1f4524, 0x28592d, 0x2f6a34].map((color) => faceted(color, 0.9)))
  const ivyRand = seeded(167)
  const ivyFrom = curbFrom + (curbTo - curbFrom) * 0.5
  const wallFace = gardenX(gateSouth[1]) + 0.05
  // Les touffes sont plates : écrasées dans l'épaisseur du mur (leur normale est celle du mur), à peine inclinées, et petites. Seulement sur le mur de droite, à côté de l'arbre sombre.
  const flatLeaf = (): [number, number, number] => [(ivyRand() - 0.5) * 0.5, (ivyRand() - 0.5) * 0.5, (ivyRand() - 0.5) * 0.5]
  for (const face of [wallFace]) {
    for (let leaf = 0; leaf < 140; leaf += 1) {
      const planX = ivyFrom + (rampEnd - ivyFrom) * Math.sqrt(ivyRand())
      const base = wallLevel((planX - gateSouth[0]) / (rampEnd - gateSouth[0]))
      // De plus en plus rare vers le haut du mur et vers le bout de la zone.
      const height = base + (SITE.raised + rail.tall + 0.1 - base) * ivyRand() ** 1.4
      const size = 0.055 + ivyRand() * 0.05
      ivy.add(Math.floor(ivyRand() * ivy.tints), new THREE.Vector3(face, height, gardenZ(planX)), flatLeaf(), [size * 0.3, size, size])
    }
  }
  // Au-dessus de la bande de terre, sur le mur de droite : du lierre sur toute sa longueur, de la terre jusqu'au haut du mur.
  for (let leaf = 0; leaf < 130; leaf += 1) {
    const size = 0.055 + ivyRand() * 0.05
    const soilTop = curbTop - 0.05
    ivy.add(Math.floor(ivyRand() * ivy.tints), new THREE.Vector3(wallFace, soilTop + ivyRand() * (0.05 - soilTop), gardenZ(curbFrom + ivyRand() * (curbTo - curbFrom))), flatLeaf(), [size * 0.3, size, size])
  }
  // À gauche de l'arbre sombre (vers le garage), le lierre monte sur le mur plein, de son pied jusqu'à la terrasse : sur sa face tournée vers l'allée, du bout de la bande de terre au bord du carrelage.
  const blockFace = gardenX(curbFar) + 0.05
  for (let leaf = 0; leaf < 110; leaf += 1) {
    const size = 0.055 + ivyRand() * 0.05
    const planX = curbTo + ivyRand() * (rampEnd - curbTo)
    const foot = wallLevel((planX - gateSouth[0]) / (rampEnd - gateSouth[0]))
    ivy.add(Math.floor(ivyRand() * ivy.tints), new THREE.Vector3(blockFace, foot + ivyRand() * (SITE.raised - foot), gardenZ(planX)), flatLeaf(), [size * 0.3, size, size])
  }
  // Sur la barrière : des touffes dans ses barreaux, sur toute sa longueur, surtout en bas (de plus en plus rares vers la main courante).
  for (let leaf = 0; leaf < 200; leaf += 1) {
    const size = 0.045 + ivyRand() * 0.035
    ivy.add(Math.floor(ivyRand() * ivy.tints), new THREE.Vector3(railSouth + ivyRand() * railLong, rail.floor + 0.05 + ivyRand() ** 2.8 * rail.tall, railZ), flatLeaf(), [size, size, size * 0.3])
  }
  // Et sur l'épaisseur de la terrasse (la face de son bloc, au-dessus de l'allée), sur toute la largeur de l'allée : des touffes plaquées contre elle, de son pied à son dessus.
  for (let leaf = 0; leaf < 150; leaf += 1) {
    const size = 0.045 + ivyRand() * 0.03
    ivy.add(Math.floor(ivyRand() * ivy.tints), new THREE.Vector3(railSouth + ivyRand() * railLong, 0.02 + ivyRand() * (SITE.raised - 0.02), railZ - 0.06), flatLeaf(), [size, size, size * 0.3])
  }
  ivy.grow(group)
  // Le portail en bois du garage, au fond : trois vantaux de planches verticales dans un cadre, chacun avec deux pentures noires et une barre en biais. Il est plus étroit que l'allée :
  // de chaque côté, un mur de béton de 30 cm le sépare des murs de l'allée (et le dessus est fermé jusqu'à la terrasse).
  const timber = standard(woodTexture(0x8a5a35, 211), 0.8)
  const black = standard(0x1b1c1e, 0.5, 0.4)
  const [northEdge, southEdge, doorZ] = [gardenX(backNorth[1]), gardenX(backSouth[1]), gardenZ(backNorth[0])]
  // (À droite pour qui regarde le garage, au sud, le mur fait 20 cm de plus : 50 cm ; à gauche, 30 cm.)
  const [sideNorth, sideSouth, doorTall] = [0.3, 0.5, 1.9]
  const doorWide = Math.abs(northEdge - southEdge) - sideNorth - sideSouth
  const middleX = (northEdge - sideNorth + southEdge + sideSouth) / 2
  group.add(box(sideNorth, -deep, 0.12, formed, northEdge - sideNorth / 2, deep / 2, doorZ), box(sideSouth, -deep, 0.12, formed, southEdge + sideSouth / 2, deep / 2, doorZ))
  group.add(box(doorWide, -deep - doorTall, 0.12, formed, middleX, deep + doorTall + (-deep - doorTall) / 2, doorZ))
  group.add(box(doorWide, 0.1, 0.1, timber, middleX, deep + doorTall - 0.05, doorZ - 0.02), box(0.1, doorTall, 0.1, timber, middleX + doorWide / 2 - 0.05, deep + doorTall / 2, doorZ - 0.02), box(0.1, doorTall, 0.1, timber, middleX - doorWide / 2 + 0.05, deep + doorTall / 2, doorZ - 0.02))
  const leaves = 3
  const leafWide = (doorWide - 0.2) / leaves
  for (let leaf = 0; leaf < leaves; leaf += 1) {
    const centerX = middleX - doorWide / 2 + 0.1 + leafWide * (leaf + 0.5)
    const planks = 6
    for (let plank = 0; plank < planks; plank += 1) group.add(box(leafWide / planks - 0.01, doorTall - 0.14, 0.05, timber, centerX - leafWide / 2 + (leafWide / planks) * (plank + 0.5), deep + (doorTall - 0.1) / 2, doorZ - 0.04))
    for (const y of [0.35, doorTall - 0.45]) group.add(box(leafWide - 0.04, 0.12, 0.03, timber, centerX, deep + y, doorZ - 0.075))
    const brace = box(Math.hypot(leafWide, doorTall - 0.8), 0.1, 0.03, timber, centerX, deep + (doorTall - 0.1) / 2, doorZ - 0.075)
    brace.rotation.z = (leaf % 2 === 0 ? 1 : -1) * Math.atan2(doorTall - 0.8, leafWide)
    group.add(brace)
    for (const y of [0.4, doorTall - 0.5]) group.add(box(0.35, 0.05, 0.02, black, centerX - leafWide / 2 + 0.18, deep + y, doorZ - 0.1))
    group.add(box(0.03, 0.18, 0.03, black, centerX + leafWide / 2 - 0.08, deep + (doorTall - 0.1) / 2, doorZ - 0.1))
  }
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
  // À l'ouest, ce muret (celui du bac le plus près de la maison) continue au-delà du bout du bac, le long du petit chemin qui descend, jusqu'à la haie (son axe) : il croise ainsi les murets de l'escalier, au lieu de s'arrêter avant eux.
  const muretPlanY = PLAN.height + (ROOM.xMin - muretX) * UNITS_PER_METER
  const hedgeZ = gardenZ(LOT.centerX - Math.sqrt(HEDGE.radius ** 2 - (muretPlanY - LOT.centerY) ** 2))
  group.add(box(0.15, raised, terraceWest - hedgeZ, wall, muretX, raised / 2, (terraceWest + hedgeZ) / 2))
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
