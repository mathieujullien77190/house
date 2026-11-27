import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { BASE, CAGE_CAMERA, GARDEN_CAMERA, REST } from '@/components/Kitchen3D/constants'
import { cameraMeshes } from '@/components/Kitchen3D/live'
import { GRASS, TERRACE } from './constants'
import { buildGarden } from './garden'
import { laurelBush } from './laurel'
import { SITE } from './layout'
import { PERGOLA } from './pergola'
import { cherryTree, clippedTree, medlarTree, prunusTree } from './trees'

/** Les enfants directs du jardin qui sont des groupes faits de ce nombre de pièces, à cette place près. */
const groupsLike = (garden: THREE.Group, model: THREE.Group): THREE.Group[] =>
  (garden.children as THREE.Group[]).filter((child) => child.type === 'Group' && child.children.length === model.children.length && child.children.length > 0)

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
  })

  it('les deux caméras du jardin portent le nom de la vraie : celle du coin de la cage et celle posée dedans', () => {
    const cameras = cameraMeshes(buildGarden())
    expect(cameras.map((camera) => camera.name)).toEqual([GARDEN_CAMERA, CAGE_CAMERA])
    const [corner, inside] = cameras.map((camera) => camera.object.position)
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

  it('devant : un second cerisier, un pommier trapu avec ses pommes, un massif de fleurs fuchsia sous chacun', () => {
    const garden = buildGarden()
    const { house } = SITE
    const apple = (garden.children as THREE.Group[]).find((child) => child.scale.y === 0.85) as THREE.Group
    expect(apple.scale.toArray()).toEqual([1.1, 0.85, 1.1])
    expect(apple.children).toHaveLength(cherryTree(31, 0xc8402f).children.length)
    expect(apple.position.z).toBeCloseTo(REST.west + 3.6)
    const cherryTwo = groupsLike(garden, cherryTree(19)).find((tree) => tree.position.y === 0) as THREE.Group
    expect(cherryTwo.position.x).toBeCloseTo(house[0] - TERRACE - 0.6)
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
    expect(prunus.position.z).toBe(binEast - 1.6)
    // Penché de 0,45 rad.
    expect(2 * Math.acos(prunus.quaternion.w)).toBeCloseTo(0.45)
    const clipped = groupsLike(garden, clippedTree(61)).find((tree) => tree.position.z === binWest + 0.075 + 0.1) as THREE.Group
    expect(clipped.position.x).toBeCloseTo(binSouth - 0.25)
    const medlar = groupsLike(garden, medlarTree(53))
    expect(medlar.length).toBeGreaterThan(0)
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
    const yellow = shrubs.filter((shrub) => (shrub.children as THREE.Mesh[]).some((part) => (part.material as THREE.MeshStandardMaterial).color.getHex() === 0xf2cf2e))
    expect(yellow).toHaveLength(1)
    expect(yellow[0].position.z).toBe(Math.min(...shrubs.map((shrub) => shrub.position.z)))
  })
})
