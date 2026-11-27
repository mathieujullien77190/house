import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { gardenMaterials } from '@/components/Kitchen3D/materials'
import { cageFrame, cagePanels, cageRoof, cageTools, cageWire, planters } from './aviary'
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
  it('onze pans de bois à planches (face sud, côté haie, fond, cloison) et deux portes, la même de chaque côté', () => {
    const { meshes, m } = built(cagePanels)
    const wood = meshes.filter((mesh) => mesh.material === m.post)
    const iron = meshes.filter((mesh) => mesh.material === m.iron)
    // Deux portes à trois pentures (deux pièces chacune) et un loquet : sept pièces de fer chacune.
    expect(iron).toHaveLength(14)
    expect(wood).toHaveLength(meshes.length - 14)
    // Aucune pièce ne dépasse la hauteur de la cage ; toutes sont posées au-dessus du sol.
    for (const piece of meshes) {
      expect(piece.position.y + sizeOf(piece).height / 2).toBeLessThanOrEqual(CAGE_HEIGHT + 0.001)
      expect(piece.position.y - sizeOf(piece).height / 2).toBeGreaterThanOrEqual(-0.001)
    }
    // Les pans sont à planches horizontales : beaucoup de planches d'une douzaine de centimètres.
    const boards = wood.filter((piece) => sizeOf(piece).height < 0.13 && sizeOf(piece).height > 0.1)
    expect(boards.length).toBeGreaterThan(50)
    // Le côté haie : cinq pans côte à côte sous le bas du toit, sur toute la longueur de la cage.
    const hedgeSide = wood.filter((piece) => piece.position.z === SITE.cageZ2 && sizeOf(piece).height < 0.13)
    const xs = hedgeSide.map((piece) => piece.position.x)
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(PANEL * 3)
  })

  it('les deux portes se font face : pentures à droite pour qui les regarde du dehors, loquet à gauche', () => {
    const { meshes, m } = built(cagePanels)
    const iron = meshes.filter((mesh) => mesh.material === m.iron)
    const doorZ = SITE.cageZ2 - PANEL * 1.5
    const midTall = (CAGE_HEIGHT + CAGE_LOW) / 2
    for (const [wallX, hinges] of [
      [SITE.cageX1, iron.slice(0, 7)],
      [SITE.backX, iron.slice(7)],
    ] as const) {
      // Les trois pentures (une plaque et une patte chacune) et le loquet, tous devant le vantail.
      expect(hinges.every((piece) => piece.position.x < wallX)).toBe(true)
      const latch = hinges[6]
      expect(latch.position.y).toBeCloseTo(1.05)
      expect(latch.position.z).toBeLessThan(doorZ)
      const plates = hinges.slice(0, 6).filter((piece) => sizeOf(piece).depth === 0.2)
      expect(plates).toHaveLength(3)
      expect(plates.every((plate) => plate.position.z > doorZ)).toBe(true)
      expect(Math.max(...plates.map((plate) => plate.position.y))).toBeLessThan(midTall)
    }
  })

  it('douze planches par vantail et deux écharpes en biais, l’une montante, l’autre descendante', () => {
    const { meshes, m } = built(cagePanels)
    const doorZ = SITE.cageZ2 - PANEL * 1.5
    const atDoor = meshes.filter((mesh) => mesh.material === m.post && Math.abs(mesh.position.z - doorZ) < PANEL / 2 && Math.abs(mesh.position.x - SITE.cageX1) < 0.05)
    const braces = atDoor.filter((piece) => piece.rotation.x !== 0)
    expect(braces).toHaveLength(2)
    expect(braces[0].rotation.x).toBeLessThan(0)
    expect(braces[1].rotation.x).toBeGreaterThan(0)
    expect(atDoor.filter((piece) => sizeOf(piece).width === 0.016)).toHaveLength(12)
  })
})

describe('planters', () => {
  it('le grand bac et le long bac, creux (quatre planches) et pleins de terre, avec trois fougères et un hortensia', () => {
    const { children, m } = built(planters)
    // Chaque bac : quatre planches et sa terre ; puis les quatre plantes.
    expect(children).toHaveLength(14)
    const bigBoards = children.slice(0, 4) as THREE.Mesh[]
    const bigSoil = children[4] as THREE.Mesh
    const sideBoards = children.slice(5, 9) as THREE.Mesh[]
    const sideSoil = children[9] as THREE.Mesh
    expect([...bigBoards, ...sideBoards].every((board) => board.material === m.post)).toBe(true)
    expect([bigSoil.material, sideSoil.material]).toEqual([m.soil, m.soil])
    // Le grand bac descend jusqu'au sol de la partie basse et monte à 45 cm ; la terre reste un peu sous le bord.
    const bottom = (box: THREE.Mesh) => box.position.y - sizeOf(box).height / 2
    const top = (box: THREE.Mesh) => box.position.y + sizeOf(box).height / 2
    expect(Math.min(...bigBoards.map(bottom))).toBeCloseTo(-LOW)
    expect(Math.max(...bigBoards.map(top))).toBeCloseTo(0.45)
    expect(top(bigSoil)).toBeCloseTo(0.43)
    // Le long bac, posé sur l'herbe, deux fois moins haut et deux fois moins large, va jusqu'au fond de la cage.
    expect(Math.min(...sideBoards.map(bottom))).toBeCloseTo(GRASS)
    expect(Math.max(...sideBoards.map(top))).toBeCloseTo(GRASS + 0.225)
    expect(top(sideSoil)).toBeCloseTo(GRASS + 0.205)
    expect(Math.max(...sideBoards.map((board) => board.position.x + sizeOf(board).width / 2))).toBeCloseTo(SITE.cageX2)
    // Creux : la terre est plus étroite que le bac.
    expect(sizeOf(sideSoil).depth).toBeCloseTo(0.4 - 0.08)
    // Les plantes : des groupes posés sur la terre du long bac, les fougères vers le grand bac, l'hortensia au bout.
    const plants = children.slice(10)
    expect(plants).toHaveLength(4)
    expect(plants.every((plant) => plant.type === 'Group' && plant.children.length > 0)).toBe(true)
    for (const plant of plants) {
      expect(plant.position.y).toBeCloseTo(GRASS + 0.215)
      expect(plant.position.z).toBeCloseTo(SITE.cageZ1 - 0.2)
    }
    expect(plants.map((plant) => plant.position.x)).toEqual([...plants.map((plant) => plant.position.x)].sort((a, b) => a - b))
    expect(plants[3].position.x).toBeCloseTo(SITE.cageX2 - 0.55)
    // Trois fougères différentes (une graine chacune).
    expect(new Set(plants.slice(0, 3).map((plant) => (plant.children[0] as THREE.Mesh).geometry.attributes.position.getX(0))).size).toBe(3)
  })
})

describe('cageTools', () => {
  it('quatre outils pendus au pan de la haie (bêche, pioche, râteau, balai), une cisaille et un sécateur sur la cloison', () => {
    const { children, m } = built(cageTools)
    expect(children).toHaveLength(6)
    const [spade, pick, rake, broom, shears, pruner] = children as THREE.Group[]
    // Contre le pan de la haie, dos à lui, du plus proche de la cloison au plus loin, à 19 cm l'un de l'autre.
    for (const [index, tool] of [spade, pick, rake, broom].entries()) {
      expect(tool.position.x).toBeCloseTo(SITE.backX - 0.14 - index * 0.19)
      expect(tool.position.y).toBe(0)
      expect(tool.position.z).toBeCloseTo(SITE.cageZ2 - 0.012)
      expect(tool.rotation.y).toBeCloseTo(Math.PI)
    }
    // Le râteau a ses neuf dents de fer (plus le clou et la barre) ; la bêche, sa lame et le clou.
    expect(rake.children.filter((child) => (child as THREE.Mesh).material === m.iron)).toHaveLength(11)
    expect(spade.children.filter((child) => (child as THREE.Mesh).material === m.iron)).toHaveLength(2)
    expect(broom.children.length).toBeGreaterThan(2)
    expect(pick.children.length).toBeGreaterThan(2)
    // Contre la cloison, côté pièce : deux lames croisées et leur axe ; le sécateur est plus petit que la cisaille.
    for (const tool of [shears, pruner]) {
      expect(tool.position.x).toBeCloseTo(SITE.backX - 0.03)
      expect(tool.position.y).toBe(1.35)
      expect(tool.rotation.y).toBeCloseTo(-Math.PI / 2)
      expect(tool.children).toHaveLength(3)
    }
    expect(pruner.position.z).toBeGreaterThan(shears.position.z)
    const length = (tool: THREE.Group) => ((tool.children[0].children[0] as THREE.Mesh).geometry as THREE.BoxGeometry).parameters.height
    expect(length(shears)).toBeGreaterThan(length(pruner))
  })
})
