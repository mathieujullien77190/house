import * as THREE from 'three'
import { UNITS_PER_METER } from '@/components/Lights/constants'
import { APPLE_BACK_CAMERA, APPLE_CAMERA, BASE, PATIO_DOOR, REST } from '@/components/Kitchen3D/constants'
import { box } from '@/components/Kitchen3D/primitives'
import { reolink } from '@/components/Kitchen3D/reolink'
import { gardenMaterials } from '@/components/Kitchen3D/materials'
import { cageComfort, cageFrame, cagePanels, cageRoof, cageTools, cageWire, planters } from './aviary'
import { binWalls, hedges, pathAndGates } from './borders'
import { CAGE_HEIGHT, GRASS, HEDGE, LOT, PAVING, TERRACE } from './constants'
import { bins, deck, gardenCamera, gardenTable, heatPump, powerLine, upturnedBin } from './equipment'
import { grassTufts, lawnFlowers } from './grass'
import { groundTerrace, lawns, paving, raisedTerrace, retainingWalls } from './ground'
import { laurelBush, roundLaurel } from './laurel'
import { SITE } from './layout'
import { lounge } from './lounge'
import { buildPergola, PERGOLA, PERGOLA_FRONT } from './pergola'
import { gardenX, gardenZ } from './plan'
import { bush, choisya, flowerPatch, paleTree, passionflower, rosemary, vineArch, wildConifer, wisteria } from './plants'
import { cherryTree, cherryTrunk, clippedTree, medlarTree, prunusTree } from './trees'

/** Le cerisier, au coin de la maison côté chambre d’invité (le coin nord-ouest), dans la partie basse du jardin. */
const backCherry = (group: THREE.Group): void => {
  const { house } = SITE
  const cherry = cherryTree(7)
  cherry.name = 'tree'
  cherry.position.set(house[1] + 2, GRASS, house[2] - 2.5)
  group.add(cherry)
}

/** Les arbres de devant : un second cerisier et un pommier près de la table blanche, le prunus près des poubelles et l’arbre taillé à côté. */
const frontTrees = (group: THREE.Group): THREE.Vector3 => {
  const { house, wicket, binSouth, binWest, binEast } = SITE
  // Près de la table blanche, entre elle et la maison, devant la chambre de Matou : un second cerisier, et à côté un pommier (plus trapu, avec ses pommes).
  const cherryTwo = cherryTree(19)
  cherryTwo.name = 'tree'
  // Rapproché de 30 cm du pommier, et éloigné de 20 cm de la maison (vers le sud) : 30 cm vers le sud, 28 cm vers l'est.
  cherryTwo.position.set(house[0] - TERRACE - 0.9, 0, REST.west - 0.32)
  const apple = cherryTree(31, true)
  apple.name = 'tree'
  apple.scale.set(1.1, 0.85, 1.1)
  apple.position.set(house[0] - TERRACE - 2.1, 0, REST.west + 3.6)
  group.add(cherryTwo, apple)
  // Sous ces deux arbres poussent de grandes fleurs fuchsia, de 60 cm environ.
  for (const [index, tree] of [cherryTwo, apple].entries()) {
    // Elles ne poussent que dans l'herbe : pas sur les carreaux de la terrasse, ni dans la jardinière et ses murets.
    const onLawn = (x: number, z: number): boolean => tree.position.x + x < house[0] - PERGOLA_FRONT - 0.65 || tree.position.z + z < SITE.terraceWest - 0.1
    const patch = flowerPatch(121 + index, 1.3, 0.6, 0xd6247f, onLawn, 70)
    patch.position.copy(tree.position)
    group.add(patch)
  }
  // Près du coin de la propriété, près du portillon (le coin sud-est ; 1 m à l'écart des spirées de l'est) : un petit néflier, aux branches qui montent.
  const medlar = medlarTree(53)
  medlar.name = 'tree'
  medlar.position.set(gardenX(735), 0, gardenZ(668) - 1)
  group.add(medlar)
  // À droite du portillon, quand on va vers le portail le long de la haie : deux gros buissons, à 1,50 m de la haie. Le plus proche de la table blanche est
  // un conifère (3 m, sans branches qui dépassent) ; à côté, un laurier palme très grand (4 m).
  const inside = (planY: number): [number, number] => {
    const radius = HEDGE.radius - 1.5 * UNITS_PER_METER
    return [LOT.centerX - Math.sqrt(radius ** 2 - (planY - LOT.centerY) ** 2), planY]
  }
  const [coniferPlanX, coniferPlanY] = inside(620)
  // Même forme que le laurier, un peu plus petit (1,20 m de rayon, 4 m), d'un vert plus sombre : ses touffes commencent tout près du sol.
  const bigConifer = roundLaurel(151, 1.2, 4, [0x2f5a35, 0x37663a, 0x284d30], true)
  bigConifer.name = 'tree'
  // Le laurier ne gêne pas le chemin : à 3 m à droite de lui (à l'ouest, quand on va vers le portillon) ; le conifère est reculé de 2 m aussi.
  // Le laurier palme est rond (couronne de 1,25 m de rayon, 4,80 m de haut, du sol) : à 1,40 m de l'axe de la haie, juste ce qu'il faut pour ne pas dépasser sur la rue.
  const [roughX, roughY] = [PAVING.pathWest - 3 * UNITS_PER_METER, 735]
  const pull = (HEDGE.radius - 1.4 * UNITS_PER_METER) / Math.hypot(roughX - LOT.centerX, roughY - LOT.centerY)
  const [palmPlanX, palmPlanY] = [LOT.centerX + (roughX - LOT.centerX) * pull, LOT.centerY + (roughY - LOT.centerY) * pull]
  const palmLaurel = roundLaurel(14, 1.25, 4.8)
  palmLaurel.name = 'tree'
  palmLaurel.position.set(gardenX(palmPlanY), 0, gardenZ(palmPlanX))
  // Le conifère est rapproché de 1 m du laurier (en ligne droite vers lui).
  const gap = Math.hypot(palmPlanX - coniferPlanX, palmPlanY - coniferPlanY)
  const closer = Math.max(0, gap - UNITS_PER_METER) / gap
  bigConifer.position.set(gardenX(palmPlanY + (coniferPlanY - palmPlanY) * closer), 0, gardenZ(palmPlanX + (coniferPlanX - palmPlanX) * closer))
  group.add(bigConifer, palmLaurel)
  // Dans le petit bout de pelouse entre l'escalier, l'allée du garage et la terrasse : un gros buisson qui prend toute la place, comme le laurier de la cage (des branches dans tous les sens) mais à
  // feuilles claires, et feuillu dès le sol (ses troncs nus sont enterrés) ; sa branche la plus haute est raccourcie de 40 cm.
  const patchBush = laurelBush(157, [0x7fb552, 0x8fc25a, 0x6aa548], 6.1)
  patchBush.name = 'tree'
  patchBush.scale.setScalar(0.5)
  patchBush.position.set(gardenX(296), -0.75, gardenZ(-65))
  group.add(patchBush)
  const coniferAt = bigConifer.position
  // Près des poubelles, devant leur muret : un prunus au feuillage bordeaux, qui penche beaucoup du côté du portillon (décalé de 80 cm vers les spirées de l'est, pour l'éloigner du coin).
  const prunus = prunusTree(47)
  prunus.name = 'tree'
  prunus.position.set(binSouth - 1.1, 0, binEast - 0.8)
  const toWicket = new THREE.Vector3(gardenX((wicket.y1 + wicket.y2) / 2) - prunus.position.x, 0, gardenZ((wicket.x1 + wicket.x2) / 2) - prunus.position.z).normalize()
  prunus.quaternion.setFromAxisAngle(new THREE.Vector3(toWicket.z, 0, -toWicket.x), 0.45)
  group.add(prunus)
  // Entre le prunus et le portillon, contre le muret du chemin : un gros romarin touffu.
  const rosemaryBush = rosemary(149)
  rosemaryBush.name = 'tree'
  rosemaryBush.position.set((prunus.position.x + gardenX((wicket.y1 + wicket.y2) / 2)) / 2, 0, gardenZ(PAVING.pathEast) + 0.55)
  rosemaryBush.scale.setScalar(0.95)
  group.add(rosemaryBush)
  // Sur le tronc du pommier, à mi-hauteur : une caméra qui regarde vers le prunus, un peu à sa droite.
  const toPrunus = prunus.position.clone().sub(apple.position).setY(0).normalize()
  const aim = prunus.position.clone().add(new THREE.Vector3(-toPrunus.z, 0, toPrunus.x).multiplyScalar(1.2)).setY(1.2)
  const trunk = cherryTrunk(31).multiply(apple.scale).add(apple.position)
  group.add(reolink(trunk.clone().addScaledVector(toPrunus, 0.15), aim, APPLE_CAMERA))
  // De l'autre côté du tronc, une seconde caméra regarde à l'opposé.
  group.add(reolink(trunk.clone().addScaledVector(toPrunus, -0.15), trunk.clone().addScaledVector(toPrunus, -6).setY(1), APPLE_BACK_CAMERA))
  // À côté du prunus, dans l'angle que font le muret des poubelles et celui du chemin : un arbre haut et touffu qui a pris la forme
  // du coin (posé dans l'angle même : ses deux flancs longent les murets), avec des branches folles.
  const clipped = clippedTree(61)
  clipped.name = 'tree'
  clipped.position.set(binSouth - 0.15 - 0.1, 0, binWest + 0.075 + 0.1)
  group.add(clipped)
  return coniferAt
}

/**
 * La pergola, devant la maison : collée à la façade des baies, sur les carreaux surélevés, de la porte-fenêtre jusqu'aux marches. Elle
 * est tournée de façon que son rang de poteaux le plus près du bout des traverses soit contre le mur ; l'autre rang, devant, a ses pieds
 * sur le muret qui borde la terrasse.
 */
const pergolaOnTerrace = (group: THREE.Group): void => {
  const { house, raised, terraceEnd, terraceWest } = SITE
  const pergola = buildPergola()
  // Dans son repère, la profondeur croît vers la maison : le bout des traverses côté `deep` touche le mur.
  pergola.rotation.y = Math.PI / 2
  const pergolaFront = house[0] - PERGOLA.deep
  const pergolaZ = terraceEnd - PERGOLA.rafters.long / 2
  pergola.position.set(pergolaFront, raised, pergolaZ)
  // Une glycine y monte par un seul pied et en couvre la moitié.
  const vine = wisteria(83)
  vine.name = 'tree'
  pergola.add(vine)
  group.add(pergola)
  // Dans la jardinière, du passage de la porte-fenêtre au chemin du portillon : deux orangers du Mexique, encore petits, répartis
  // également sur sa longueur (au tiers et aux deux tiers).
  // Dans l'autre jardinière, en face de la chambre de Matou (du coin de la maison au passage de la porte-fenêtre) : trois buissons
  // d'1,20 m, pas très touffus ; le plus à gauche pour qui regarde la maison (le plus à l'ouest) est en fleurs jaunes.
  const westFrom = terraceWest + 0.15
  const westTo = PATIO_DOOR.z - PATIO_DOOR.width / 2 - 0.1
  // À eux trois, ils prennent toute la longueur de la jardinière : chacun en occupe un tiers.
  const third = (westTo - westFrom) / 3
  for (const index of [0, 1, 2]) {
    const shrub = bush(111 + index, 1.2, third + 0.1, index === 0 ? 0xf2cf2e : undefined)
    shrub.position.set(house[0] - PERGOLA_FRONT - 0.225, raised - 0.04, westFrom + third * (index + 0.5))
    group.add(shrub)
  }
  const bedFrom = PATIO_DOOR.z + PATIO_DOOR.width / 2 + 0.1
  const bedTo = gardenZ(PAVING.pathWest) - 0.075
  for (const [index, share] of [1 / 3, 2 / 3].entries()) {
    const shrub = choisya(91 + index)
    shrub.position.set(house[0] - PERGOLA_FRONT - 0.225, raised - 0.04, bedFrom + (bedTo - bedFrom) * share)
    group.add(shrub)
  }
}

/** Le laurier, à côté de la cage, devant son grand côté grillagé (dans la partie basse du jardin), tout contre le long bac. */
const laurelByCage = (group: THREE.Group): void => {
  const { treeX, treeZ } = SITE
  const laurel = laurelBush(11)
  laurel.name = 'tree'
  laurel.position.set(treeX, GRASS, treeZ)
  group.add(laurel)
}

/**
 * Le jardin, d'après le plan de la maison : la pelouse (un quart de cercle, l'arc côté rue, plus une bande au nord), la terrasse autour de la
 * maison et le perron, le pavage à l'est et le chemin du portillon, l'allée de béton du portail, la haie sur la limite (ouverte au portail,
 * au portillon et à droite de la cage), le portail et le portillon, la cage à perruches, les poubelles, la table, la pompe à chaleur, la
 * terrasse en ipé, les arbres et la pergola. Tout est ajouté à un seul groupe, dans cet ordre. `grass` : la part des bouquets d'herbe
 * semés (1 : tous).
 */
export const buildGarden = (grass = 1, leafyHedges = true): THREE.Group => {
  const group = new THREE.Group()
  // Le terrain est plus bas que le sol de la maison, qui est surélevée.
  group.position.y = -BASE.rise
  const m = gardenMaterials()
  lawns(group, m)
  grassTufts(group, grass)
  lawnFlowers(group)
  retainingWalls(group, m)
  groundTerrace(group, m)
  paving(group, m)
  hedges(group, m, leafyHedges)
  pathAndGates(group, m)
  cageFrame(group, m)
  cageWire(group, m)
  cageRoof(group)
  bins(group, m)
  binWalls(group, m)
  raisedTerrace(group, m)
  cagePanels(group, m)
  cageTools(group, m)
  cageComfort(group)
  planters(group, m)
  passionflower(group)
  vineArch(group, m.post)
  // Derrière la cage, jusqu'à la haie du nord et à la limite de l'est : pas d'herbe, de la terre.
  const [soilNorth, soilEast] = [gardenX(HEDGE.north), gardenZ(LOT.east)]
  group.add(box(soilNorth - SITE.cageX2, 0.02, soilEast - SITE.cageZ1, m.soil, (soilNorth + SITE.cageX2) / 2, GRASS, (soilEast + SITE.cageZ1) / 2))
  upturnedBin(group, m, new THREE.Vector3(gardenX(HEDGE.north) - HEDGE.thickness / 2 - 0.38, GRASS, SITE.cageZ2 - 0.35))
  // Derrière la cage, son tronc dans la haie du nord, au droit du milieu du toit : un conifère jamais taillé, qui suit la haie, dépasse la cage et tend des branches par-dessus.
  const [coniferZ, paleZ] = [(SITE.cageZ1 + SITE.cageZ2) / 2, SITE.cageZ1 - 0.9]
  const conifer = wildConifer(137, 4.3, CAGE_HEIGHT - GRASS, coniferZ - paleZ)
  conifer.name = 'tree'
  conifer.position.set(gardenX(HEDGE.north), GRASS, coniferZ)
  group.add(conifer)
  // À côté de lui, du côté du salon de jardin, dans la haie aussi : un arbre aussi haut, à feuilles claires ; les branches du conifère vont jusqu'à lui et s'y mêlent.
  const pale = paleTree(139, 4.3)
  pale.name = 'tree'
  pale.position.set(gardenX(HEDGE.north), GRASS, paleZ)
  group.add(pale)
  heatPump(group, m)
  powerLine(group)
  gardenCamera(group)
  backCherry(group)
  deck(group, m)
  lounge(group)
  gardenTable(group, frontTrees(group))
  pergolaOnTerrace(group)
  laurelByCage(group)
  return group
}
