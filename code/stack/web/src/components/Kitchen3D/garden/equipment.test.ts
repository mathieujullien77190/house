import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { BASE, CAGE_CAMERA, GARDEN_CAMERA, INNER_CAGE_CAMERA, MAST, OUTER_WALL, REST, ROOM, SAS } from '@/components/Kitchen3D/constants'
import { gardenMaterials } from '@/components/Kitchen3D/materials'
import { DECK, GRASS, HEDGE, PANEL, TERRACE } from './constants'
import { bins, deck, gardenCamera, gardenTable, heatPump, powerLine, upturnedBin } from './equipment'
import { SITE } from './layout'
import { gardenX, gardenZ } from './plan'

const built = (build: (group: THREE.Group, m: ReturnType<typeof gardenMaterials>) => void) => {
  const group = new THREE.Group()
  const m = gardenMaterials()
  build(group, m)
  return { children: group.children, meshes: group.children as THREE.Mesh[], m }
}

const sizeOf = (object: THREE.Object3D) => ((object as THREE.Mesh).geometry as THREE.BoxGeometry).parameters
const colorOf = (mesh: THREE.Mesh) => (mesh.material as THREE.MeshStandardMaterial).color.getHex()

beforeEach(() => {
  stubCanvasContext(null)
})

describe('bins', () => {
  it('quatre poubelles à deux roues, en rang contre la haie de l’est : trois grises, une verte', () => {
    const { meshes, m } = built(bins)
    expect(meshes).toHaveLength(16)
    const wheels = meshes.filter((mesh) => mesh.geometry.type === 'CylinderGeometry')
    expect(wheels).toHaveLength(8)
    expect(wheels.every((wheel) => wheel.material === m.iron && wheel.position.y === 0.09)).toBe(true)
    const bodies = meshes.filter((mesh) => sizeOf(mesh).height === 0.9)
    expect(bodies).toHaveLength(4)
    // Les trois grises partagent leur matériau ; la verte a le sien.
    expect(new Set(bodies.map((body) => body.material)).size).toBe(2)
    expect(bodies.map(colorOf)).toEqual([0x7f8388, 0x7f8388, 0x7f8388, 0x2c3a33])
    // Les couvercles : marron, jaune, jaune, vert.
    const lids = meshes.filter((mesh) => sizeOf(mesh).height === 0.06)
    expect(lids.map(colorOf)).toEqual([0x7a5540, 0xe6cf3a, 0xe6cf3a, 0x2c3a33])
    // En rang d'est en ouest, tous les 62 cm, à 1,16 m de la façade.
    expect(bodies.every((body) => body.position.x === SITE.binX)).toBe(true)
    expect(bodies.map((body) => body.position.z)).toEqual([0, 1, 2, 3].map((index) => SITE.binEnd - index * 0.62))
  })
})

describe('gardenTable', () => {
  it('la table blanche ovale sur ses quatre pieds, et quatre chaises tournées vers elle', () => {
    const group = new THREE.Group()
    gardenTable(group)
    expect(group.children).toHaveLength(9)
    const [top, ...rest] = group.children as THREE.Mesh[]
    expect(top.geometry.type).toBe('CylinderGeometry')
    expect(top.scale.z).toBe(1.5)
    expect(top.position.x).toBeCloseTo(SITE.house[0] - TERRACE - 3)
    expect(top.position.z).toBeCloseTo(REST.west + 2.95 - 0.76)
    const legs = rest.slice(0, 4)
    expect(legs.every((leg) => sizeOf(leg).height === 0.7 && leg.position.y === 0.35)).toBe(true)
    const chairs = rest.slice(4)
    expect(chairs.every((chair) => chair.type === 'Group' && chair.children.length === 8)).toBe(true)
    expect(chairs.map((chair) => chair.rotation.y)).toEqual([0, Math.PI, Math.PI / 2, -Math.PI / 2])
    // Chaque chaise regarde la table : son devant (+z, tourné) pointe vers elle.
    for (const chair of chairs) {
      const front = new THREE.Vector3(0, 0, 1).applyEuler(chair.rotation)
      const toTable = new THREE.Vector3(top.position.x - chair.position.x, 0, top.position.z - chair.position.z).normalize()
      expect(front.distanceTo(toTable)).toBeCloseTo(0)
    }
    // Tout est du même plastique blanc.
    const materials = new Set<THREE.Material | THREE.Material[]>()
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) materials.add((child as THREE.Mesh).material)
    })
    expect(materials.size).toBe(1)
  })
})

describe('heatPump', () => {
  it('le caisson blanc sur deux plots, sa grille ronde en façade, sur une dalle dans l’angle du sas', () => {
    const { meshes, m } = built(heatPump)
    expect(meshes).toHaveLength(5)
    const [slab, body, footOne, footTwo, grille] = meshes
    // La dalle : du mur du sas au nu du soubassement, sans dépasser de la maison.
    expect(slab.material).toBe(m.concrete)
    const slabBox = new THREE.Box3().setFromObject(slab)
    expect(slabBox.min.x).toBeCloseTo(SAS.north + OUTER_WALL - 0.05)
    expect(slabBox.min.z).toBeCloseTo(SITE.house[3] - BASE.setback - 0.03)
    expect(slabBox.max.x).toBeCloseTo(SITE.house[1] - BASE.setback)
    expect(slabBox.max.z).toBeCloseTo(SAS.east + OUTER_WALL - BASE.setback)
    expect(slabBox.max.y).toBeCloseTo(0.12)
    // Le caisson, sur ses plots, eux-mêmes sur la dalle.
    expect(sizeOf(body)).toMatchObject({ width: 0.85, height: 0.6, depth: 0.33 })
    expect(body.position.x).toBeCloseTo(SAS.north + OUTER_WALL + 1.25)
    expect(body.position.z).toBeCloseTo(ROOM.zMax + OUTER_WALL + 0.3)
    expect([footOne.material, footTwo.material]).toEqual([m.iron, m.iron])
    expect(footOne.position.y - 0.04).toBeCloseTo(0.12)
    expect(footOne.position.y + 0.04).toBeCloseTo(body.position.y - 0.3)
    // La grille : un disque debout, sur la façade du caisson.
    expect(grille.geometry.type).toBe('CylinderGeometry')
    expect(grille.rotation.x).toBeCloseTo(Math.PI / 2)
    expect(grille.position.z).toBeCloseTo(body.position.z + 0.33 / 2 + 0.005)
  })
})

describe('deck', () => {
  it('des lattes d’ipé de 3 m en un seul maillage, coupées en deux autour du carré de l’arbre, et la planche de rive', () => {
    const { children, m } = built(deck)
    expect(children).toHaveLength(11)
    const slats = children[1] as THREE.InstancedMesh
    expect(slats.isInstancedMesh).toBe(true)
    // Le nombre de lattes : ce qui tient entre la bande de béton et la haie du fond, à 14 cm la latte et 1 cm d'écart, ajustées pour que la dernière touche la haie.
    const from = SITE.stepLine + TERRACE + BASE.setback + 0.03
    const end = gardenX(HEDGE.north) - HEDGE.thickness / 2 - 0.005
    const count = Math.round((end - from + 0.01) / 0.15)
    const wide = (end - from + 0.01) / count - 0.01
    expect(wide).toBeGreaterThan(0.13)
    expect(wide).toBeLessThan(0.15)
    // Celles qui passent sur le carré de l'arbre (1 m de côté) sont en deux morceaux.
    const cut = Array.from({ length: count }, (_, index) => from + wide / 2 + index * (wide + 0.01)).filter((x) => Math.abs(x - SITE.treeX) < 0.5 + wide / 2).length
    expect(cut).toBeGreaterThanOrEqual(7)
    expect(slats.count).toBe(count + cut)
    // Plus claire que l'ipé d'origine, et sa dernière latte touche la haie.
    expect(new THREE.Box3().setFromObject(slats).max.x).toBeCloseTo(end)
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const lengths: number[] = []
    for (let index = 0; index < slats.count; index += 1) {
      slats.getMatrixAt(index, matrix)
      matrix.decompose(position, new THREE.Quaternion(), scale)
      // Le dessus de chaque latte est au niveau de la terrasse.
      expect(position.y + DECK.thick / 2).toBeCloseTo(DECK.top)
      lengths.push(scale.z)
    }
    expect(lengths.filter((length) => Math.abs(length - DECK.long) < 1e-6)).toHaveLength(count - cut)
    // Les deux morceaux d'une latte coupée laissent 1 m pour l'arbre.
    expect(lengths.filter((length) => length < DECK.long - 0.5).reduce((sum, length) => sum + length, 0)).toBeCloseTo(cut * (DECK.long - 1))
    // La planche de rive, de l'herbe au dessus des lattes, dans le même bois.
    const rim = children.slice(2, 6) as THREE.Mesh[]
    for (const board of rim) {
      expect(board.material).toBe(slats.material)
      expect(board.position.y - sizeOf(board).height / 2).toBeCloseTo(GRASS)
      expect(board.position.y + sizeOf(board).height / 2).toBeCloseTo(DECK.top)
    }
    // Le bac de l'arbre : quatre planches de douglas, 15 cm plus hautes que la terrasse, autour de la terre.
    const pot = children.slice(6, 10) as THREE.Mesh[]
    for (const board of pot) {
      expect(board.material).toBe(m.post)
      expect(board.position.y + sizeOf(board).height / 2).toBeCloseTo(DECK.top + 0.15)
    }
    const soil = children[10] as THREE.Mesh
    expect(soil.material).toBe(m.soil)
    expect(soil.position.x).toBe(SITE.treeX)
    expect(soil.position.z).toBe(SITE.treeZ)
    expect(sizeOf(soil)).toMatchObject({ width: 1, depth: 1 })
  })

  it('une bande de béton de 30 cm longe le pied de la haie du fond, de la terrasse à la haie de l’ouest, 5 cm au-dessus de l’herbe', () => {
    const { children, m } = built(deck)
    const strip = children[0] as THREE.Mesh
    expect(strip.material).toBe(m.concrete)
    expect(sizeOf(strip)).toMatchObject({ width: 0.3, height: 0.1 })
    expect(strip.position.y + sizeOf(strip).height / 2).toBeCloseTo(GRASS + 0.05)
    // Elle touche la haie par un bord, le bois de la terrasse par l'autre.
    expect(strip.position.x + 0.15).toBeCloseTo(gardenX(HEDGE.north) - HEDGE.thickness / 2)
    const west = strip.position.z - sizeOf(strip).depth / 2
    expect(west).toBeCloseTo(gardenZ(HEDGE.west) + HEDGE.thickness / 2)
    expect(strip.position.z + sizeOf(strip).depth / 2).toBeCloseTo(SITE.cageZ1 - 0.4 - 3)
  })
})

describe('powerLine', () => {
  it('un poteau de bois dans la rue, et le câble qui pend jusqu’au sommet du poteau d’acier du sas', () => {
    const group = new THREE.Group()
    powerLine(group)
    expect(group.children).toHaveLength(3)
    const [pole, arm, cable] = group.children as THREE.Mesh[]
    expect((pole.geometry as THREE.CylinderGeometry).parameters.height).toBe(7.5)
    expect(pole.position.toArray()).toEqual([gardenX(880), 3.75, gardenZ(600)])
    expect(arm.material).toBe(pole.material)
    // Il est dans la rue : au-delà de l'arc de la haie.
    expect(Math.hypot(600 - 700, 880 + 190)).toBeGreaterThan(HEDGE.radius)
    const curve = (cable.geometry as THREE.TubeGeometry).parameters.path as THREE.CatmullRomCurve3
    expect(curve.points).toHaveLength(17)
    const first = curve.points[0]
    const last = curve.points[16]
    expect(first.toArray()).toEqual([pole.position.x, 7.2, pole.position.z])
    // Le sommet du poteau d'acier, dans le repère du jardin (plus bas que le sol de la maison).
    expect(last.x).toBeCloseTo(MAST.x)
    expect(last.y).toBeCloseTo(MAST.from + MAST.tall + BASE.rise)
    expect(last.z).toBeCloseTo(MAST.z)
    // Au milieu, le câble pend de 90 cm sous la ligne droite.
    expect(curve.points[8].y).toBeCloseTo((first.y + last.y) / 2 - 0.9)
  })
})

describe('gardenCamera', () => {
  it('trois Reolink : celle du salon de jardin, celle du coin de la cage, celle posée dans la cage, marquées du nom de la vraie caméra', () => {
    const group = new THREE.Group()
    gardenCamera(group)
    expect(group.children.map((child) => child.userData.camera)).toEqual([GARDEN_CAMERA, CAGE_CAMERA, INNER_CAGE_CAMERA])
    const [outside, corner, inside] = group.children
    // Dehors, à 1 m de l'herbe, devant le grand côté grillagé ; elle regarde le jardin (vers l'ouest, vers le bas).
    expect(outside.position.y).toBeCloseTo(GRASS + 1)
    expect(outside.position.z).toBeLessThan(SITE.cageZ1)
    const outward = new THREE.Vector3(0, 0, 1).applyQuaternion(outside.quaternion)
    expect(outward.z).toBeLessThan(-0.8)
    expect(outward.y).toBeLessThan(0)
    // Au coin de la cage, à 50 cm du sol, un panneau plus loin du coin qu'avant ; elle regarde vers les poubelles (vers le sud).
    expect(corner.position.y).toBe(0.5)
    expect(corner.position.z).toBeCloseTo(SITE.cageZ1 + 0.14 + PANEL)
    expect(corner.position.x).toBeLessThan(SITE.cageX2)
    const toBins = new THREE.Vector3(0, 0, 1).applyQuaternion(corner.quaternion)
    expect(toBins.x).toBeLessThan(-0.8)
    // Dans la cage, sur le pan plein à côté de la porte intérieure, à 70 cm du sol ; elle regarde droit devant elle, vers le fond (vers le nord).
    expect(inside.position.toArray()).toEqual([SITE.backX + 0.08, 0.7, SITE.cageZ2 - PANEL / 2])
    const ahead = new THREE.Vector3(0, 0, 1).applyQuaternion(inside.quaternion)
    expect(ahead.x).toBeCloseTo(1)
    expect(ahead.z).toBeCloseTo(0)
  })
})

describe('upturnedBin', () => {
  it('une poubelle grise retournée sur la terre : son corps debout au sol, ses deux roulettes en l’air, à l’endroit voulu', () => {
    const { children, m } = built((group, materials) => upturnedBin(group, materials, new THREE.Vector3(1, GRASS, 2)))
    expect(children).toHaveLength(1)
    const bin = children[0]
    expect(bin.position.toArray()).toEqual([1, GRASS, 2])
    const [body, ...wheels] = bin.children as THREE.Mesh[]
    expect(sizeOf(body)).toMatchObject({ width: 0.68, height: 1.08, depth: 0.6 })
    expect(colorOf(body)).toBe(0x7f8388)
    // Sans couvercle : un seul pavé gris et deux roulettes de fer, en haut (le bac est retourné).
    expect(wheels).toHaveLength(2)
    expect(wheels.every((wheel) => wheel.material === m.iron && wheel.position.y > 0.9)).toBe(true)
    expect(wheels.map((wheel) => wheel.position.z)).toEqual([-0.25, 0.25])
  })
})
