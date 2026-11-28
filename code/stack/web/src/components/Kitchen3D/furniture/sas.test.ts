import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { SAS } from '@/components/Kitchen3D/constants'
import { roomMaterials } from '@/components/Kitchen3D/materials'
import { BULB_OFF } from '@/components/Kitchen3D/primitives'
import { sas } from './sas'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

const worldOf = (object: THREE.Object3D): THREE.Vector3 => object.getWorldPosition(new THREE.Vector3())

const sizeOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.BoxGeometry).parameters

/** Les maillages d'un groupe sont-ils tous dans ce rectangle `[x1, x2, z1, z2]` (leur centre, à `slack` près) ? */
const inside = (group: THREE.Object3D, [x1, x2, z1, z2]: [number, number, number, number], slack: number): boolean =>
  meshesOf(group).every((mesh) => {
    const { x, z } = worldOf(mesh)
    return x >= x1 - slack && x <= x2 + slack && z >= z1 - slack && z <= z2 + slack
  })

describe('sas', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  const build = () => {
    const m = roomMaterials()
    const group = sas(m)
    group.updateMatrixWorld(true)
    return { m, group, meshes: meshesOf(group) }
  }

  it('tout tient dans le sas (porte, fenêtre et niche sont dans l’épaisseur des murs)', () => {
    const { group, meshes } = build()
    expect(meshes.length).toBeGreaterThan(10)
    expect(inside(group, [SAS.south, SAS.north, SAS.west, SAS.east], 0.3)).toBe(true)
  })

  it('la porte du dehors, au fond de l’embrasure du mur sud : neuf carreaux dépolis, une poignée de chaque côté', () => {
    const { m, meshes } = build()
    const doorZ = (SAS.door[0] + SAS.door[1]) / 2
    const wide = SAS.door[1] - SAS.door[0]
    const [leaf, glazing] = meshes
    expect(leaf.position.toArray()).toEqual([SAS.south - 0.22, 1.01, doorZ])
    expect(sizeOf(leaf).depth).toBeCloseTo(wide - 0.07)
    expect(glazing.material).toBe(m.frosted)
    // Deux petits bois debout et deux couchés : neuf carreaux.
    const bars = meshes.filter((mesh) => sizeOf(mesh).width === 0.056)
    expect(bars).toHaveLength(4)
    expect(bars.filter((bar) => sizeOf(bar).height === 1.05).map((bar) => bar.position.z - doorZ)).toEqual([-(wide - 0.2) / 6, (wide - 0.2) / 6].map((z) => expect.closeTo(z)))
    const handles = meshes.filter((mesh) => mesh.material === m.black && sizeOf(mesh).height === 0.12)
    expect(handles.map((handle) => Math.sign(handle.position.x - leaf.position.x))).toEqual([-1, 1])
  })

  it('la fenêtre du mur est : deux vitres dans leur cadre blanc, habillage de chêne côté pièce', () => {
    const { m, meshes } = build()
    const { z, width, bottom, height } = SAS.window
    const panes = meshes.filter((mesh) => mesh.material === m.glass)
    expect(panes).toHaveLength(2)
    expect((panes[0].position.x + panes[1].position.x) / 2).toBeCloseTo(z)
    for (const pane of panes) {
      expect(pane.position.y).toBeCloseTo(bottom + height / 2)
      expect(pane.position.z).toBeCloseTo(SAS.east + 0.01)
      expect(sizeOf(pane).width).toBeCloseTo(width / 2 - 0.08)
    }
  })

  it('la niche des manteaux, creusée dans le mur nord : fond bleu, banc de chêne sur trois paniers', () => {
    const { m, meshes } = build()
    const [from, to] = SAS.nook
    const lining = meshes.find((mesh) => (mesh.material as THREE.Material).side === THREE.BackSide) as THREE.Mesh
    expect(sizeOf(lining)).toMatchObject({ width: SAS.nookDepth, height: SAS.nookTop })
    expect(sizeOf(lining).depth).toBeCloseTo(to - from)
    expect(lining.position.x).toBeCloseTo(SAS.north + SAS.nookDepth / 2)
    const back = meshes.find((mesh) => mesh.material === m.blueWall) as THREE.Mesh
    expect(back.position.x).toBeGreaterThan(SAS.north)
    const baskets = meshes.filter((mesh) => mesh.material === m.wicker)
    expect(baskets).toHaveLength(3)
    expect(baskets[1].position.z).toBeCloseTo((from + to) / 2)
  })

  it('l’applique à cage de jute entre la buanderie et la niche, et le miroir du mur sud', () => {
    const { m, meshes } = build()
    const cage = meshes.find((mesh) => (mesh.material as THREE.MeshStandardMaterial).wireframe === true) as THREE.Mesh
    // Son ampoule est un luminaire sans nom : elle suit la lampe de la maison la plus proche, et se clique.
    const fixtures = meshes.filter((mesh) => mesh.userData.fixture !== undefined)
    expect(fixtures).toHaveLength(1)
    const [glow] = fixtures
    expect(glow.position.toArray()).toEqual(cage.position.toArray())
    expect(glow.userData).toEqual({ fixture: true })
    expect((glow.material as THREE.MeshBasicMaterial).color.getHex()).toBe(BULB_OFF)
    expect(meshes.filter((mesh) => mesh.material === m.bulb)).toHaveLength(0)
    expect(cage.position.z).toBeCloseTo((SAS.laundry[1] + SAS.nook[0]) / 2)
    const mirror = meshes.find((mesh) => (mesh.material as THREE.MeshStandardMaterial).metalness === 0.8) as THREE.Mesh
    expect(mirror.position.toArray()).toEqual([SAS.south + 0.033, 1.15, SAS.west + 0.5])
  })

  it('le porte-manteau (une barre de chêne et cinq patères) et la plante sur la planche, dans la niche', () => {
    const { m, meshes } = build()
    const [from, to] = SAS.nook
    const rail = meshes.find((mesh) => mesh.material === m.oak && mesh.position.y === 1.55) as THREE.Mesh
    expect(rail.position.z).toBeCloseTo((from + to) / 2)
    expect(meshes.filter((mesh) => mesh.material === m.black && mesh.position.y === 1.55)).toHaveLength(5)
    // La plante : des feuilles et des fleurs (icosaèdres), sur la planche de chêne du haut ou qui retombent devant elle.
    const bits = meshes.filter((mesh) => mesh.geometry.type === 'IcosahedronGeometry')
    expect(bits).toHaveLength(20)
    expect(bits.filter((mesh) => mesh.position.y > 1.9)).toHaveLength(12)
    expect(bits.every((mesh) => mesh.position.z >= from && mesh.position.z <= to)).toBe(true)
  })

  it('la seconde applique du mur du fond : un abat-jour noir en dôme, une ampoule éteinte, rien à relier', () => {
    const { m, meshes } = build()
    const dome = meshes.find((mesh) => mesh.geometry.type === 'SphereGeometry' && mesh.material === m.black) as THREE.Mesh
    expect(worldOf(dome).z).toBeGreaterThan(SAS.west)
    expect(worldOf(dome).y).toBeCloseTo(1.86)
    const bulb = meshes.find((mesh) => mesh.userData.fixture !== true && (mesh.material as THREE.MeshBasicMaterial).color?.getHex() === BULB_OFF) as THREE.Mesh
    expect(worldOf(bulb).y).toBeLessThan(worldOf(dome).y)
    expect(bulb.userData.fixture).toBeUndefined()
  })

  it('deux petits tableaux encadrés de noir : un sur le mur nord, un sur le mur sud, face à la pièce', () => {
    const { group } = build()
    const frames = group.children.filter((child) => child.type === 'Group' && child.position.y === 1.5)
    expect(frames).toHaveLength(2)
    const [north, south] = frames
    expect(north.position.x).toBeLessThan(SAS.north)
    expect(north.rotation.y).toBeCloseTo(-Math.PI / 2)
    expect(south.position.x).toBeGreaterThan(SAS.south)
    expect(south.rotation.y).toBeCloseTo(Math.PI / 2)
    // Cadre, passe-partout, liseré, ciel et dôme : cinq pièces chacun.
    expect(meshesOf(north)).toHaveLength(5)
    expect(meshesOf(south)).toHaveLength(5)
  })

  it('le tapis sombre couvre le sas d’un mur à l’autre jusqu’à la fenêtre, et entre dans l’embrasure de la porte', () => {
    const { meshes } = build()
    const mats = meshes.filter((mesh) => sizeOf(mesh).height === 0.012 && (mesh.material as THREE.MeshStandardMaterial).color.getHex() === 0x3f4247)
    expect(mats).toHaveLength(2)
    expect(sizeOf(mats[0]).width).toBeCloseTo(SAS.north - SAS.south - 0.004)
    expect(mats[0].position.z + sizeOf(mats[0]).depth / 2).toBeCloseTo(SAS.east - 0.001)
    expect(mats[1].position.x).toBeCloseTo(SAS.south - 0.15)
  })
})
