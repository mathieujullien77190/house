import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { BASE, ENTRY, MAST, MAST_CAMERA, NOOK_WINDOW, OUTER_WALL, REST, ROOM, SAS } from '@/components/Kitchen3D/constants'
import { kitchenMaps, kitchenMaterials } from '@/components/Kitchen3D/materials'
import { outerWalls } from './outer'
import { wallKit } from './walls'
import type { Shell } from './walls'

/** Les murs extérieurs, dans un gros œuvre vide. */
const built = (): Shell => {
  const maps = kitchenMaps()
  const materials = kitchenMaterials(maps)
  const group = new THREE.Group()
  const shell: Shell = { group, materials, maps, floors: [], sill: new THREE.MeshStandardMaterial(), ...wallKit(group, materials) }
  outerWalls(shell)
  return shell
}
const boxOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.BoxGeometry).parameters
const colorOf = (mesh: THREE.Mesh) => (mesh.material as THREE.MeshStandardMaterial).color.getHex()
const boxes = (shell: Shell) => (shell.group.children as THREE.Mesh[]).filter((child) => child.geometry?.type === 'BoxGeometry')

describe('outerWalls', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('30 cm de crépi, d’un seul matériau, tout contre les pans intérieurs', () => {
    const facade = boxes(built()).filter((mesh) => colorOf(mesh) === 0xeadfc6)
    expect(facade.length).toBeGreaterThan(30)
    expect(new Set(facade.map((piece) => piece.material)).size).toBe(1)
    // Tous de l'épaisseur du mur, sauf la peau du mur creusé par la niche des manteaux, plus mince.
    const thin = facade.filter((piece) => ![boxOf(piece).width, boxOf(piece).depth].some((side) => Math.abs(side - OUTER_WALL) < 1e-9))
    expect(thin).toHaveLength(1)
    expect(boxOf(thin[0]).width).toBeCloseTo(OUTER_WALL - SAS.nookDepth)
    expect(boxOf(thin[0]).height).toBe(SAS.nookTop)
    // Le mur ouest est tout contre le pan intérieur de la chambre d'invité, dehors.
    expect(facade[0].position.z).toBeCloseTo(REST.west - OUTER_WALL / 2 - 0.002)
    // Aucun morceau vide : sous une porte (bas à 0), il n'y a pas d'allège.
    for (const piece of facade) expect(Math.min(boxOf(piece).width, boxOf(piece).height, boxOf(piece).depth)).toBeGreaterThan(0.001)
  })

  it('un muret de soubassement par pan de façade, en retrait, qui tourne les coins d’équerre', () => {
    const base = boxes(built()).filter((mesh) => colorOf(mesh) === 0xcbc7bd)
    expect(base).toHaveLength(8)
    for (const piece of base) {
      expect(boxOf(piece).height).toBe(BASE.rise)
      expect(piece.position.y).toBeCloseTo(-BASE.rise / 2)
      expect(Math.min(boxOf(piece).width, boxOf(piece).depth)).toBeCloseTo(OUTER_WALL - BASE.setback)
    }
    // Le mur ouest fait deux angles : son muret est plus court de deux retraits. Le mur sud n'en fait qu'un, à l'est.
    const [west, south] = base
    expect(boxOf(west).width).toBeCloseTo(ROOM.xMax - ROOM.xMin + OUTER_WALL * 2 - BASE.setback * 2)
    expect(boxOf(south).depth).toBeCloseTo(ROOM.zMax + OUTER_WALL - REST.west - BASE.setback)
    // Le mur du bureau n'a pas d'angle : son muret va d'un bout à l'autre.
    expect(boxOf(base[3]).width).toBeCloseTo(ENTRY.x + 0.05 - ROOM.xMin)
  })

  it('un appui blanc sous chaque fenêtre, pas sous les portes ni sous la niche', () => {
    const sills = boxes(built()).filter((mesh) => colorOf(mesh) === 0xf4f4f1 && boxOf(mesh).height === 0.04)
    expect(sills).toHaveLength(9)
    expect(new Set(sills.map((sill) => sill.material)).size).toBe(1)
    // Celui de la fenêtre du sas dépasse du mur est.
    const sasSill = sills.find((sill) => Math.abs(sill.position.x - SAS.window.z) < 1e-9) as THREE.Mesh
    expect(sasSill.position.z).toBeCloseTo(SAS.east + OUTER_WALL + 0.02)
    expect(sasSill.position.y).toBeCloseTo(SAS.window.bottom - 0.02)
    expect(boxOf(sasSill).width).toBeCloseTo(SAS.window.width + 0.1)
  })

  it('le sas : son parquet est inscrit, sa porte d’entrée a un seuil, deux marches carrelées devant sa porte du dehors', () => {
    const shell = built()
    expect(shell.floors).toEqual([[SAS.south, SAS.north, SAS.west, SAS.east]])
    expect(boxes(shell).filter((mesh) => mesh.material === shell.sill)).toHaveLength(1)
    // Les marches, carrelées de terre cuite : la première à la hauteur du sol de la maison, la seconde à mi-hauteur.
    const steps = boxes(shell).filter((mesh) => Math.abs(boxOf(mesh).depth - 1.2) < 1e-9 && boxOf(mesh).width === 0.3 && mesh.position.y < 0)
    expect(steps.map((step) => boxOf(step).height)).toEqual([BASE.rise, BASE.rise / 2])
    expect(steps[0].position.y + BASE.rise / 2).toBeCloseTo(0)
    expect(steps[1].position.y - BASE.rise / 4).toBeCloseTo(-BASE.rise)
    expect(steps[1].material).toBe(steps[0].material)
    expect(steps[1].position.x).toBeCloseTo(steps[0].position.x - 0.3)
    expect(steps[0].position.z).toBeCloseTo((SAS.door[0] + SAS.door[1]) / 2)
    expect(((steps[0].material as THREE.MeshStandardMaterial).map as THREE.Texture).repeat.toArray()).toEqual([0.3, expect.closeTo(1.2)])
  })

  it('la lanterne de l’entrée, à droite de la porte du sas vers 1,80 m, tournée vers le dehors : un luminaire non nommé, sur sa platine', () => {
    const shell = built()
    const lantern = shell.group.children.find((child) => child.type === 'Group' && child.children.some((part) => part.userData.fixture === true)) as THREE.Group
    expect(lantern.position.y).toBe(1.8)
    expect(lantern.position.z).toBeCloseTo((SAS.door[1] + SAS.east) / 2)
    // Contre le mur sud du sas, la face vers le dehors (−x).
    expect(lantern.position.x).toBeCloseTo(SAS.south - OUTER_WALL - 0.002)
    expect(new THREE.Vector3(0, 0, 1).applyEuler(lantern.rotation).x).toBeCloseTo(-1)
    // Platine, bras, quatre montants, deux plateaux, pointe, verre, toit, ampoule.
    const bulb = lantern.children.find((part) => part.userData.fixture === true) as THREE.Mesh
    expect(bulb.userData.fixtureName).toBeUndefined()
    expect(lantern.children.filter((part) => (part as THREE.Mesh).geometry?.type === 'ConeGeometry')).toHaveLength(1)
    expect(lantern.children.filter((part) => (part as THREE.Mesh).geometry?.type === 'CylinderGeometry')).toHaveLength(1)
  })

  it('le soupirail de la cave sous la fenêtre du coin repas : un cadre clair, une vitre sombre et trois barreaux, dans le soubassement', () => {
    const shell = built()
    const vent = boxes(shell).filter((mesh) => mesh.position.y === -BASE.rise / 2 && mesh.position.x > ROOM.xMax + OUTER_WALL - BASE.setback)
    // Le cadre, la vitre, trois barreaux.
    expect(vent).toHaveLength(5)
    const [frame, glass, ...bars] = vent
    expect(boxOf(frame).depth).toBeCloseTo(0.55 + 0.06)
    expect(boxOf(glass).depth).toBeCloseTo(0.55)
    expect(boxOf(glass).height).toBeCloseTo(0.2)
    expect(colorOf(frame)).toBe(0xf1efe8)
    expect(glass.position.z).toBeCloseTo(NOOK_WINDOW.z)
    bars.forEach((bar, index) => expect(bar.position.z - NOOK_WINDOW.z).toBeCloseTo(((index - 1) * 0.55) / 3))
  })

  it('le poteau d’acier du sas, ses deux pattes, et la caméra du mât tournée vers la cage', () => {
    const shell = built()
    const mast = boxes(shell).find((mesh) => boxOf(mesh).height === MAST.tall) as THREE.Mesh
    expect(boxOf(mast)).toMatchObject({ width: 0.04, depth: 0.04 })
    expect(mast.position.toArray()).toEqual([MAST.x, MAST.from + MAST.tall / 2, MAST.z])
    // Il est dehors, écarté du mur.
    expect(MAST.z - 0.02).toBeGreaterThan(SAS.east + OUTER_WALL)
    const lugs = boxes(shell).filter((mesh) => mesh.material === mast.material && mesh !== mast)
    expect(lugs).toHaveLength(2)
    for (const lug of lugs) expect(lug.position.z).toBeLessThan(MAST.z)
    const cameras = shell.group.children.filter((child) => child.userData.camera !== undefined)
    expect(cameras.map((camera) => camera.userData.camera)).toEqual([MAST_CAMERA])
    expect(cameras[0].position.x).toBe(MAST.x)
    expect(cameras[0].position.y).toBeCloseTo(ROOM.height - 0.05)
    // Elle regarde vers le bas : le jardin est plus bas que le haut du mur.
    expect(cameras[0].getWorldDirection(new THREE.Vector3()).y).toBeLessThan(0)
  })
})
