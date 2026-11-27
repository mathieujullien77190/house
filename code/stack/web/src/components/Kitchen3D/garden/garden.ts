import * as THREE from 'three'
import { BASE, PATIO_DOOR, REST } from '@/components/Kitchen3D/constants'
import { gardenMaterials } from '@/components/Kitchen3D/materials'
import { cageFrame, cagePanels, cageRoof, cageWire, planters } from './aviary'
import { binWalls, hedges, pathAndGates } from './borders'
import { GRASS, PAVING, TERRACE } from './constants'
import { bins, deck, gardenCamera, gardenTable, heatPump, powerLine } from './equipment'
import { grassTufts, lawnFlowers } from './grass'
import { groundTerrace, lawns, paving, raisedTerrace, retainingWalls } from './ground'
import { laurelBush } from './laurel'
import { SITE } from './layout'
import { lounge } from './lounge'
import { buildPergola, PERGOLA, PERGOLA_FRONT } from './pergola'
import { gardenX, gardenZ } from './plan'
import { bush, choisya, creeper, flowerPatch, passionflower, wisteria } from './plants'
import { cherryTree, clippedTree, medlarTree, prunusTree } from './trees'

/** Le cerisier, au coin de la maison côté chambre d’invité (le coin nord-ouest), dans la partie basse du jardin. */
const backCherry = (group: THREE.Group): void => {
  const { house } = SITE
  const cherry = cherryTree(7)
  cherry.position.set(house[1] + 2, GRASS, house[2] - 2.5)
  group.add(cherry)
}

/** Les arbres de devant : un second cerisier et un pommier près de la table blanche, le prunus près des poubelles et l’arbre taillé à côté. */
const frontTrees = (group: THREE.Group): void => {
  const { house, wicket, binSouth, binWest, binEast } = SITE
  // Près de la table blanche, entre elle et la maison, devant la chambre de Matou : un second cerisier, et à côté un pommier (plus trapu, avec ses pommes).
  const cherryTwo = cherryTree(19)
  cherryTwo.position.set(house[0] - TERRACE - 0.6, 0, REST.west - 0.6)
  const apple = cherryTree(31, 0xc8402f)
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
  // Dans le coin de la propriété, près du portillon (le coin sud-est) : un petit néflier, aux branches qui montent.
  const medlar = medlarTree(53)
  medlar.position.set(gardenX(735), 0, gardenZ(668))
  group.add(medlar)
  // Près des poubelles, devant leur muret : un prunus au feuillage bordeaux, qui penche beaucoup du côté du portillon.
  const prunus = prunusTree(47)
  prunus.position.set(binSouth - 1.1, 0, binEast - 1.6)
  const toWicket = new THREE.Vector3(gardenX((wicket.y1 + wicket.y2) / 2) - prunus.position.x, 0, gardenZ((wicket.x1 + wicket.x2) / 2) - prunus.position.z).normalize()
  prunus.quaternion.setFromAxisAngle(new THREE.Vector3(toWicket.z, 0, -toWicket.x), 0.45)
  group.add(prunus)
  // À côté du prunus, dans l'angle que font le muret des poubelles et celui du chemin : un arbre haut et touffu qui a pris la forme
  // du coin (posé dans l'angle même : ses deux flancs longent les murets), avec des branches folles.
  const clipped = clippedTree(61)
  clipped.position.set(binSouth - 0.15 - 0.1, 0, binWest + 0.075 + 0.1)
  group.add(clipped)
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
  pergola.add(wisteria(83))
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
  laurel.position.set(treeX, GRASS, treeZ)
  group.add(laurel)
}

/**
 * Le jardin, d'après le plan de la maison : la pelouse (un quart de cercle, l'arc côté rue, plus une bande au nord), la terrasse autour de la
 * maison et le perron, le pavage à l'est et le chemin du portillon, l'allée de béton du portail, la haie sur la limite (ouverte au portail,
 * au portillon et à droite de la cage), le portail et le portillon, la cage à perruches, les poubelles, la table, la pompe à chaleur, la
 * terrasse en ipé, les arbres et la pergola. Tout est ajouté à un seul groupe, dans cet ordre.
 */
export const buildGarden = (): THREE.Group => {
  const group = new THREE.Group()
  // Le terrain est plus bas que le sol de la maison, qui est surélevée.
  group.position.y = -BASE.rise
  const m = gardenMaterials()
  lawns(group, m)
  grassTufts(group)
  lawnFlowers(group)
  retainingWalls(group, m)
  groundTerrace(group, m)
  paving(group, m)
  hedges(group, m)
  pathAndGates(group, m)
  cageFrame(group, m)
  cageWire(group, m)
  cageRoof(group)
  bins(group, m)
  binWalls(group, m)
  raisedTerrace(group, m)
  gardenTable(group)
  cagePanels(group, m)
  planters(group, m)
  passionflower(group)
  creeper(group)
  heatPump(group, m)
  powerLine(group)
  gardenCamera(group)
  backCherry(group)
  deck(group, m)
  lounge(group)
  frontTrees(group)
  pergolaOnTerrace(group)
  laurelByCage(group)
  return group
}
