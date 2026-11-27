import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { gardenMaterials } from '@/components/Kitchen3D/materials'
import { cageFrame, cagePanels, cageRoof, cageWire, planters } from './aviary'
import { CAGE_HEIGHT, CAGE_LOW, GRASS, LOW, PANEL } from './constants'
import { SITE } from './layout'

const built = (build: (group: THREE.Group, m: ReturnType<typeof gardenMaterials>) => void) => {
  const group = new THREE.Group()
  const m = gardenMaterials()
  build(group, m)
  return { children: group.children, meshes: group.children as THREE.Mesh[], m }
}

const sizeOf = (object: THREE.Object3D) => ((object as THREE.Mesh).geometry as THREE.BoxGeometry).parameters

beforeEach(() => {
  stubCanvasContext(null)
})

describe('cageFrame', () => {
  it('onze poteaux de douglas sur le plan en L, plus courts côté haie, et la ceinture du haut', () => {
    const { meshes, m } = built(cageFrame)
    expect(meshes).toHaveLength(18)
    expect(meshes.every((mesh) => mesh.material === m.post)).toBe(true)
    const posts = meshes.slice(0, 11)
    for (const post of posts) {
      const { width, height, depth } = sizeOf(post)
      expect([width, depth]).toEqual([0.08, 0.08])
      // Sous le bas du toit de tôle (côté haie), la cage ne fait plus que 2 m.
      expect(height).toBe(post.position.z === SITE.cageZ2 ? CAGE_LOW : CAGE_HEIGHT)
      expect(post.position.y).toBe(height / 2)
    }
    expect(posts.filter((post) => sizeOf(post).height === CAGE_LOW)).toHaveLength(3)
    // La cage fait 4 panneaux de large sur 5 de profondeur.
    const xs = posts.map((post) => post.position.x)
    const zs = posts.map((post) => post.position.z)
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(4 * PANEL)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(5 * PANEL)
    // Le coin sud-ouest est dehors : aucun poteau n'y est.
    expect(posts.some((post) => post.position.x === SITE.cageX1 && post.position.z === SITE.cageZ1)).toBe(false)
    // Le grand côté grillagé (à l'ouest) : cinq poteaux, un par panneau.
    expect(posts.filter((post) => post.position.z === SITE.cageZ1)).toHaveLength(5)
  })

  it('sous le toit, les lisses de l’avant et du fond suivent sa pente', () => {
    const { meshes } = built(cageFrame)
    const sloped = meshes.filter((mesh) => mesh.rotation.x !== 0)
    expect(sloped).toHaveLength(2)
    expect(sloped.map((rail) => rail.position.x)).toEqual([SITE.cageX1, SITE.cageX2])
    for (const rail of sloped) {
      expect(rail.rotation.x).toBeCloseTo(Math.atan2(CAGE_HEIGHT - CAGE_LOW, SITE.cageZ2 - SITE.turnZ))
      expect(rail.position.y).toBeCloseTo((CAGE_HEIGHT + CAGE_LOW) / 2)
    }
  })
})

describe('cageWire', () => {
  it('quatre pans de grillage (trois debout, un à plat sur le dessus), l’arête du milieu et trois chevrons', () => {
    const { meshes, m } = built(cageWire)
    expect(meshes).toHaveLength(8)
    const wires = meshes.slice(0, 4)
    for (const wire of wires) {
      const material = wire.material as THREE.MeshStandardMaterial
      expect(wire.geometry.type).toBe('PlaneGeometry')
      expect(material.transparent).toBe(true)
      expect(material.side).toBe(THREE.DoubleSide)
      expect(material.depthWrite).toBe(false)
      // Le grillage laisse passer le soleil : pas d'ombre portée.
      expect(wire.userData.noShadow).toBe(true)
      // Une image couvre 20 cm : elle se répète sur tout le pan.
      const { width, height } = (wire.geometry as THREE.PlaneGeometry).parameters
      expect(material.map?.repeat.x).toBeCloseTo(width / 0.2)
      expect(material.map?.repeat.y).toBeCloseTo(height / 0.2)
    }
    // Chaque pan a sa propre copie de la texture (sa répétition lui est propre).
    expect(new Set(wires.map((wire) => (wire.material as THREE.MeshStandardMaterial).map)).size).toBe(4)
    const [west, turn, back, top] = wires
    expect((west.geometry as THREE.PlaneGeometry).parameters.width).toBeCloseTo(SITE.cageDepth - PANEL)
    expect(west.position.z).toBe(SITE.cageZ1)
    expect(turn.position.z).toBe(SITE.turnZ)
    expect(back.rotation.y).toBeCloseTo(Math.PI / 2)
    expect(back.position.x).toBe(SITE.backX)
    expect(top.rotation.x).toBeCloseTo(-Math.PI / 2)
    expect(top.position.y).toBeCloseTo(CAGE_HEIGHT + 0.03)
    // Le bois : l'arête d'où part le toit, sur toute la profondeur, et un chevron entre chaque panneau du dessus.
    const wood = meshes.slice(4)
    expect(wood.every((mesh) => mesh.material === m.post)).toBe(true)
    expect(sizeOf(wood[0]).width).toBeCloseTo(SITE.cageDepth)
    expect(wood[0].position.z).toBe(SITE.turnZ)
    expect(wood.slice(1).map((rafter) => rafter.position.x - SITE.backX)).toEqual([PANEL, PANEL * 2, PANEL * 3].map((offset) => expect.closeTo(offset) as number))
  })
})

describe('cageRoof', () => {
  it('un toit de tôle en biais, au-dessus de la porte : une plaque et vingt-quatre ondes dans le sens de la pente', () => {
    const group = new THREE.Group()
    cageRoof(group)
    expect(group.children).toHaveLength(1)
    const roof = group.children[0]
    expect(roof.type).toBe('Group')
    expect(roof.children).toHaveLength(25)
    expect(roof.position.x).toBeCloseTo(SITE.middleX)
    expect(roof.position.z).toBeCloseTo((SITE.cageZ2 + SITE.turnZ) / 2)
    expect(roof.rotation.x).toBeCloseTo(Math.atan2(CAGE_HEIGHT - CAGE_LOW, SITE.cageZ2 - SITE.turnZ))
    const [sheet, ...waves] = roof.children as THREE.Mesh[]
    // Il déborde de la cage : 15 cm à chaque bout, 10 cm de chaque côté.
    expect(sizeOf(sheet).width).toBeCloseTo(SITE.cageDepth + 0.3)
    expect(sizeOf(sheet).depth).toBeCloseTo(SITE.cageZ2 - SITE.turnZ + 0.2)
    expect(new Set(roof.children.map((child) => (child as THREE.Mesh).material)).size).toBe(1)
    // Les ondes sont réparties d'un bord à l'autre de la plaque.
    expect(waves[0].position.x).toBeCloseTo(-sizeOf(sheet).width / 2 + 0.05)
    expect(waves[23].position.x).toBeCloseTo(sizeOf(sheet).width / 2 - 0.05)
  })
})

describe('cagePanels', () => {
  it('les pans de bois de la face sud, du côté haie et du fond, et la porte sur ses trois pentures', () => {
    const { meshes, m } = built(cagePanels)
    expect(meshes).toHaveLength(10)
    const wood = meshes.filter((mesh) => mesh.material === m.post)
    const iron = meshes.filter((mesh) => mesh.material === m.iron)
    expect(wood).toHaveLength(6)
    expect(iron).toHaveLength(4)
    // Aucun pan ne dépasse la hauteur de la cage ; tous sont posés au sol.
    for (const pan of wood) {
      expect(sizeOf(pan).height).toBeLessThanOrEqual(CAGE_HEIGHT)
      expect(pan.position.y).toBeCloseTo(sizeOf(pan).height / 2)
    }
    // Le côté haie : cinq panneaux d'un seul tenant, sous le bas du toit.
    expect(sizeOf(wood[1]).width).toBeCloseTo(PANEL * 5)
    expect(sizeOf(wood[1]).height).toBe(CAGE_LOW)
    expect(wood[1].position.z).toBe(SITE.cageZ2)
    // La porte : un panneau moins son jeu, devant la face sud, à mi-pente du toit.
    const door = wood[5]
    expect(sizeOf(door).depth).toBeCloseTo(PANEL - 0.02)
    expect(sizeOf(door).height).toBeCloseTo((CAGE_HEIGHT + CAGE_LOW) / 2)
    expect(door.position.x).toBeCloseTo(SITE.cageX1 - 0.02)
    expect(door.position.z).toBeCloseTo(SITE.cageZ2 - PANEL * 1.5)
    // Trois pentures du même côté, et la poignée de l'autre.
    const [low, middle, high, handle] = iron
    expect([low, middle, high].map((hinge) => hinge.position.y)).toEqual([0.25, 1.1, 1.95])
    expect(low.position.z).toBeGreaterThan(door.position.z)
    expect(handle.position.z).toBeLessThan(door.position.z)
  })
})

describe('planters', () => {
  it('le grand bac et le long bac, pleins de terre, avec trois fougères et un hortensia', () => {
    const { children, m } = built(planters)
    expect(children).toHaveLength(8)
    const [big, bigSoil, side, sideSoil] = children as THREE.Mesh[]
    expect([big.material, side.material]).toEqual([m.post, m.post])
    expect([bigSoil.material, sideSoil.material]).toEqual([m.soil, m.soil])
    // Le grand bac descend jusqu'au sol de la partie basse et monte à 45 cm.
    expect(big.position.y - sizeOf(big).height / 2).toBeCloseTo(-LOW)
    expect(big.position.y + sizeOf(big).height / 2).toBeCloseTo(0.45)
    // Le long bac, posé sur l'herbe, deux fois moins haut et deux fois moins large, va jusqu'au fond de la cage.
    expect(sizeOf(side).height).toBeCloseTo(0.225)
    expect(sizeOf(side).depth).toBe(0.4)
    expect(side.position.y - sizeOf(side).height / 2).toBeCloseTo(GRASS)
    expect(side.position.x + sizeOf(side).width / 2).toBeCloseTo(SITE.cageX2)
    // Les plantes : des groupes posés sur la terre du long bac, les fougères vers le grand bac, l'hortensia au bout.
    const plants = children.slice(4)
    expect(plants.every((plant) => plant.type === 'Group' && plant.children.length > 0)).toBe(true)
    for (const plant of plants) {
      expect(plant.position.y).toBeCloseTo(GRASS + 0.24)
      expect(plant.position.z).toBeCloseTo(SITE.cageZ1 - 0.2)
    }
    expect(plants.map((plant) => plant.position.x)).toEqual([...plants.map((plant) => plant.position.x)].sort((a, b) => a - b))
    expect(plants[3].position.x).toBeCloseTo(SITE.cageX2 - 0.55)
    // Trois fougères différentes (une graine chacune).
    expect(new Set(plants.slice(0, 3).map((plant) => (plant.children[0] as THREE.Mesh).geometry.attributes.position.getX(0))).size).toBe(3)
  })
})
