import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { UNITS_PER_METER } from '@/components/Lights/constants'
import { APPLE_BACK_CAMERA, APPLE_CAMERA, BASE, CAGE_CAMERA, GARDEN_CAMERA, INNER_CAGE_CAMERA, REST } from '@/components/Kitchen3D/constants'
import { cameraMeshes } from '@/components/Kitchen3D/live'
import { GRASS, HEDGE, LOT, PAVING, TERRACE } from './constants'
import { buildGarden } from './garden'
import { laurelBush, roundLaurel } from './laurel'
import { SITE } from './layout'
import { gardenX, gardenZ, planOf } from './plan'
import { PERGOLA } from './pergola'
import { cherryTree, clippedTree, medlarTree, prunusTree } from './trees'

/** Les maillages d'une plante, par leur forme et leur couleur (une plante tient en quelques maillages : son bois, ses touffes par teinte, ses fleurs, ses fruits). */
const partsOf = (plant: THREE.Object3D): string =>
  (plant.children as THREE.Mesh[]).map((child) => (child.isMesh ? `${child.geometry.type} ${(child.material as THREE.MeshStandardMaterial).color.getHex()}` : child.type)).join()

/** Les enfants directs du jardin qui sont des groupes faits des mêmes pièces que ce modèle, à leur place près. */
const groupsLike = (garden: THREE.Group, model: THREE.Group): THREE.Group[] =>
  (garden.children as THREE.Group[]).filter((child) => child.type === 'Group' && child.children.length > 0 && partsOf(child) === partsOf(model))

describe('buildGarden', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('un seul groupe, plus bas que le sol de la maison, toujours le même', () => {
    const garden = buildGarden()
    expect(garden.position.y).toBe(-BASE.rise)
    const again = buildGarden()
    expect(again.children).toHaveLength(garden.children.length)
    expect(again.children.map((child) => child.position.toArray())).toEqual(garden.children.map((child) => child.position.toArray()))
    expect(garden.children.length).toBeGreaterThan(150)
    // Les arbres et les arbustes sont dessinés par lots. Le mur côté rue, le trottoir et les murs de béton sont faits de petits pans (un millier) : avec eux, le jardin tient en
    // moins de 2 500 maillages, que la scène fond ensuite par matière (voir « peu d'appels de dessin », `helpers.test.ts`).
    let meshes = 0
    garden.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) meshes += 1
    })
    expect(meshes).toBeLessThan(2500)
  })

  it('les caméras du jardin portent le nom de la vraie : celle du salon de jardin, celle du coin de la cage, celle posée dedans et les deux du pommier', () => {
    const cameras = cameraMeshes(buildGarden())
    expect(cameras.map((camera) => camera.name).sort()).toEqual([APPLE_BACK_CAMERA, APPLE_CAMERA, CAGE_CAMERA, GARDEN_CAMERA, INNER_CAGE_CAMERA].sort())
    const position = (name: string) => (cameras.find((camera) => camera.name === name) as (typeof cameras)[number]).object.position
    const [corner, inside] = [position(GARDEN_CAMERA), position(CAGE_CAMERA)]
    // Toutes deux au coin de la cage ; celle du jardin est plus haute.
    expect(corner.x).toBeCloseTo(SITE.cageX2 - 0.08)
    expect(inside.x).toBeCloseTo(SITE.cageX2 - 0.2)
    expect(corner.y).toBeGreaterThan(inside.y)
  })

  it('le cerisier du fond et le laurier sont dans la partie basse, au niveau de l’herbe', () => {
    const garden = buildGarden()
    const { house, treeX, treeZ } = SITE
    const laurel = groupsLike(garden, laurelBush(11)).find((tree) => tree.position.x === treeX) as THREE.Group
    expect(laurel.position.toArray()).toEqual([treeX, GRASS, treeZ])
    const cherries = groupsLike(garden, cherryTree(7))
    expect(cherries.some((tree) => tree.position.x === house[1] + 2 && tree.position.y === GRASS && tree.position.z === house[2] - 2.5)).toBe(true)
  })

  it('devant : un second cerisier, un pommier trapu, un massif de fleurs fuchsia sous chacun', () => {
    const garden = buildGarden()
    const { house } = SITE
    const apple = (garden.children as THREE.Group[]).find((child) => child.scale.y === 0.85) as THREE.Group
    expect(apple.scale.toArray()).toEqual([1.1, 0.85, 1.1])
    expect(apple.children).toHaveLength(cherryTree(31, true).children.length)
    expect(apple.position.z).toBeCloseTo(REST.west + 3.6)
    const cherryTwo = groupsLike(garden, cherryTree(19)).find((tree) => tree.position.y === 0) as THREE.Group
    expect(cherryTwo.position.x).toBeCloseTo(house[0] - TERRACE - 0.9)
    expect(cherryTwo.position.z).toBeCloseTo(REST.west - 0.32)
    // Un massif : trois maillages de copies, posé au pied de son arbre.
    const patches = (garden.children as THREE.Group[]).filter((child) => child.children.length === 3 && child.children.every((part) => (part as THREE.InstancedMesh).isInstancedMesh))
    const fuchsia = patches.filter((patch) => ((patch.children[2] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.getHex() === 0xd6247f)
    expect(fuchsia.map((patch) => patch.position.toArray())).toEqual([cherryTwo.position.toArray(), apple.position.toArray()])
    for (const patch of fuchsia) {
      const stems = patch.children[0] as THREE.InstancedMesh
      // Rien ne pousse sur les carreaux : moins de pieds que de tirages.
      expect(stems.count).toBeGreaterThan(0)
      expect(stems.count).toBeLessThanOrEqual(70)
    }
  })

  it('le néflier au coin du portillon, le prunus penché vers lui, l’arbre taillé dans l’angle des murets', () => {
    const garden = buildGarden()
    const { binSouth, binWest, binEast } = SITE
    const prunus = groupsLike(garden, prunusTree(47)).find((tree) => tree.position.x === binSouth - 1.1) as THREE.Group
    expect(prunus.position.z).toBe(binEast - 0.8)
    // Penché de 0,45 rad.
    expect(2 * Math.acos(prunus.quaternion.w)).toBeCloseTo(0.45)
    const clipped = groupsLike(garden, clippedTree(61)).find((tree) => tree.position.z === binWest + 0.075 + 0.1) as THREE.Group
    expect(clipped.position.x).toBeCloseTo(binSouth - 0.25)
    const medlar = groupsLike(garden, medlarTree(53))
    expect(medlar.length).toBeGreaterThan(0)
  })

  it('les arbres portent le nom « tree » (la vue Matrix les distingue du reste du jardin) : le conifère et l’arbre clair derrière la cage, le romarin, les deux gros buissons', () => {
    const garden = buildGarden()
    const trees = (garden.children as THREE.Group[]).filter((child) => child.name === 'tree')
    // L'arbre étroit de l'allée du garage, le cerisier du fond, le second, le pommier, le néflier, le conifère et le laurier à droite du portillon, le buisson clair du lopin, le prunus, le romarin,
    // l'arbre taillé, les deux derrière la cage, le laurier de la cage.
    expect(trees).toHaveLength(14)
    // Derrière la cage, dans la haie du nord : le conifère au droit du milieu du toit, l'arbre clair du côté du salon de jardin, tous deux hauts de plus de 4 m.
    const behind = trees.filter((tree) => tree.position.x === gardenX(HEDGE.north))
    expect(behind).toHaveLength(2)
    const [conifer, pale] = behind
    expect(conifer.position.toArray()).toEqual([gardenX(HEDGE.north), GRASS, (SITE.cageZ1 + SITE.cageZ2) / 2])
    expect(pale.position.toArray()).toEqual([gardenX(HEDGE.north), GRASS, SITE.cageZ1 - 0.9])
    // La pergola porte sa glycine, elle aussi nommée.
    const pergola = (garden.children as THREE.Group[]).find((child) => child.rotation.y === Math.PI / 2 && child.position.y === SITE.raised) as THREE.Group
    expect((pergola.children.at(-1) as THREE.Group).name).toBe('tree')
  })

  it('à droite du portillon : un conifère sombre et un laurier palme, ronds et feuillus dès le sol, en dedans de la haie ; la table blanche près du conifère', () => {
    const garden = buildGarden()
    const planOfTree = (tree: THREE.Object3D) => planOf(tree.position.x, tree.position.z)
    const fromCenter = (tree: THREE.Object3D) => Math.hypot(planOfTree(tree)[0] - LOT.centerX, planOfTree(tree)[1] - LOT.centerY)
    const [conifer] = groupsLike(garden, roundLaurel(151, 1.2, 4, [0x2f5a35, 0x37663a, 0x284d30], true)).filter((tree) => tree.scale.x === 1)
    const [palm] = groupsLike(garden, roundLaurel(14, 1.25, 4.8))
    for (const tree of [conifer, palm]) {
      expect(tree.name).toBe('tree')
      expect(tree.position.y).toBe(0)
    }
    // Le laurier est à 1,40 m de l'axe de la haie (sa couronne de 1,25 m ne dépasse pas sur la rue), à l'ouest du chemin du portillon.
    expect(fromCenter(palm)).toBeCloseTo(HEDGE.radius - 1.4 * UNITS_PER_METER)
    expect(palm.position.z).toBeLessThan(gardenZ(PAVING.pathWest) - 1.25)
    // Le conifère est plus à l'ouest le long de la haie, en dedans d'elle, à plus de 2,45 m du laurier (leurs couronnes ne se mêlent pas).
    expect(conifer.position.z).toBeLessThan(palm.position.z)
    expect(fromCenter(conifer)).toBeLessThan(HEDGE.radius - 1.2 * UNITS_PER_METER)
    expect(conifer.position.distanceTo(palm.position)).toBeGreaterThan(2.45)
    // La table blanche (un groupe : un plateau ovale, quatre pieds, quatre chaises), posée après les arbres, à moins de 4 m du conifère.
    const table = (garden.children as THREE.Group[]).find((child) => child.type === 'Group' && child.children.length === 9 && (child.children[0] as THREE.Mesh).geometry?.type === 'CylinderGeometry') as THREE.Group
    expect(table.children[0].scale.z).toBe(1.5)
    expect(table.position.y).toBe(0)
    expect(table.position.distanceTo(conifer.position)).toBeLessThan(4)
    expect(garden.children.indexOf(table)).toBeGreaterThan(garden.children.indexOf(conifer))
  })

  it('sur le lopin de terre entre l’allée du garage, l’escalier et la terrasse : un gros buisson à feuilles claires, à demi-taille, ses troncs nus enterrés', () => {
    const garden = buildGarden()
    const [bush] = groupsLike(garden, laurelBush(157, [0x7fb552, 0x8fc25a, 0x6aa548], 6.1))
    expect(bush.name).toBe('tree')
    expect(bush.scale.toArray()).toEqual([0.5, 0.5, 0.5])
    expect(bush.position.toArray()).toEqual([gardenX(296), -0.75, gardenZ(-65)])
    // L'arbre étroit de l'allée du garage, lui, est en contrebas, à l'ouest de la maison.
    const column = (garden.children as THREE.Group[]).find((child) => child.name === 'tree' && child.scale.x === 0.4) as THREE.Group
    expect(column.position.y).toBeCloseTo(-1.05)
    expect(column.position.z).toBeLessThan(SITE.house[2])
  })

  it('derrière la cage : de la terre à la place de l’herbe, une poubelle renversée, les outils de la cage', () => {
    const garden = buildGarden()
    // De la terre jusqu'à la haie du nord et à la limite de l'est.
    const soil = (garden.children as THREE.Mesh[]).find((child) => child.isMesh && child.position.y === GRASS && (child.geometry as THREE.BoxGeometry).parameters.height === 0.02) as THREE.Mesh
    const bounds = new THREE.Box3().setFromObject(soil)
    expect(bounds.min.x).toBeCloseTo(SITE.cageX2)
    expect(bounds.max.x).toBeCloseTo(gardenX(HEDGE.north))
    expect(bounds.min.z).toBeCloseTo(SITE.cageZ1)
    expect(bounds.max.z).toBeCloseTo(gardenZ(LOT.east))
    // La poubelle renversée : le gris des poubelles, retournée, au pied de la haie, près de la cage.
    const bin = (garden.children as THREE.Group[]).find((child) => child.type === 'Group' && child.position.z === SITE.cageZ2 - 0.35) as THREE.Group
    expect(bin.position.y).toBe(GRASS)
    expect(bin.children).toHaveLength(3)
    // Les six outils : accrochés dans la partie de la cage derrière la porte d'entrée.
    const tools = (garden.children as THREE.Group[]).filter((child) => child.type === 'Group' && child.position.z === SITE.cageZ2 - 0.012)
    expect(tools).toHaveLength(4)
  })

  it('sur téléphone (`leafyHedges` faux) : les haies sont réduites à leur bloc vert, tout le reste du jardin est le même', () => {
    const copies = (garden: THREE.Group): number => {
      let count = 0
      garden.traverse((child) => {
        if ((child as THREE.InstancedMesh).isInstancedMesh) count += (child as THREE.InstancedMesh).count
      })
      return count
    }
    const leafy = buildGarden()
    const bare = buildGarden(1, false)
    expect(copies(bare)).toBeLessThan(copies(leafy) - 1000)
    // Les mêmes enfants directs, sauf les feuilles et les fleurs des haies.
    expect(bare.children).toHaveLength(leafy.children.length)
  })

  it('la pergola contre la façade des baies, sur la terrasse surélevée, avec sa glycine ; cinq arbustes dans les jardinières', () => {
    const garden = buildGarden()
    const { house, raised, terraceEnd } = SITE
    const pergola = (garden.children as THREE.Group[]).find((child) => child.rotation.y === Math.PI / 2 && child.position.y === raised) as THREE.Group
    expect(pergola.position.x).toBeCloseTo(house[0] - PERGOLA.deep)
    expect(pergola.position.z).toBeCloseTo(terraceEnd - PERGOLA.rafters.long / 2)
    // La glycine est le dernier objet ajouté à la pergola : un groupe, avec ses deux maillages de feuilles et de grappes.
    const vine = pergola.children.at(-1) as THREE.Group
    expect(vine.type).toBe('Group')
    expect((vine.children as THREE.InstancedMesh[]).filter((child) => child.isInstancedMesh)).toHaveLength(2)
    // Les arbustes des deux jardinières : tous à la même distance de la façade, un peu enfoncés dans la terre.
    const shrubs = (garden.children as THREE.Group[]).filter((child) => child.type === 'Group' && Math.abs(child.position.y - (raised - 0.04)) < 1e-9)
    expect(shrubs).toHaveLength(5)
    expect(new Set(shrubs.map((shrub) => shrub.position.x)).size).toBe(1)
    // Un seul buisson est en fleurs jaunes : le plus à l'ouest.
    const yellow = shrubs.filter((shrub) => (shrub.children as THREE.Mesh[]).some((part) => part.isMesh && (part.material as THREE.MeshStandardMaterial).color.getHex() === 0xf2cf2e))
    expect(yellow).toHaveLength(1)
    expect(yellow[0].position.z).toBe(Math.min(...shrubs.map((shrub) => shrub.position.z)))
  })
})
