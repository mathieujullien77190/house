import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { LAYOUT, ROOM, SCREEN_OFF } from '@/components/Kitchen3D/constants'
import { furnitureMaterials } from '@/components/Kitchen3D/materials'
import { armchair, coffeeTable, sideboard, sofa, tvCorner } from './living'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

const sizeOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.BoxGeometry).parameters

describe('le séjour', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('le canapé d’angle : un corps de 2,20 m, une méridienne devant, deux coussins orange et un rouge', () => {
    const m = furnitureMaterials()
    const group = sofa(m)
    const meshes = meshesOf(group)
    expect(sizeOf(meshes[0]).width).toBe(2.2)
    const pillows = meshes.filter((mesh) => mesh.material !== m.sofa)
    expect(pillows.map((pillow) => pillow.material)).toEqual([m.orange, m.orange, m.red])
    for (const pillow of pillows) expect(pillow.parent?.position.y).toBe(0.74)
    // La méridienne dépasse de 90 cm devant l'assise, du côté +x ; son coussin déborde encore de quelques centimètres.
    const box = new THREE.Box3().setFromObject(group)
    expect(box.max.z).toBeGreaterThanOrEqual(0.44 + 0.9)
    expect(box.max.z).toBeLessThan(0.44 + 0.9 + 0.1)
    expect(box.min.x).toBeCloseTo(-1.1)
    expect(box.max.x).toBeCloseTo(1.1)
    const chaise = meshes.find((mesh) => sizeOf(mesh).depth === 0.9) as THREE.Mesh
    expect(chaise.position.x).toBeCloseTo(1.1 - 0.375)
  })

  it('la table basse : un plateau de vieux bois à 42 cm, une étagère, quatre pieds d’acier', () => {
    const m = furnitureMaterials()
    const meshes = meshesOf(coffeeTable(m))
    expect(meshes).toHaveLength(8)
    expect(meshes[0].material).toBe(m.woodOld)
    expect(meshes[0].position.y).toBe(0.42)
    const legs = meshes.filter((mesh) => sizeOf(mesh).height === 0.4)
    expect(legs.map((leg) => [leg.position.x, leg.position.z])).toEqual([
      [-0.6, -0.26],
      [-0.6, 0.26],
      [0.6, -0.26],
      [0.6, 0.26],
    ])
    for (const leg of legs) expect(leg.material).toBe(m.metal)
  })

  it('le fauteuil colonial : cuir sur bois sombre, dossier incliné, deux accoudoirs en boucle symétriques', () => {
    const m = furnitureMaterials()
    const group = armchair(m)
    const meshes = meshesOf(group)
    expect(meshes.filter((mesh) => mesh.material === m.leather)).toHaveLength(2)
    expect(meshes.filter((mesh) => mesh.material !== m.leather && mesh.material !== m.woodDark)).toHaveLength(0)
    const loops = meshes.filter((mesh) => mesh.geometry.type === 'TorusGeometry')
    expect(loops.map((loop) => loop.position.toArray())).toEqual([
      [-0.33, 0.33, 0.17],
      [0.33, 0.33, 0.17],
    ])
    const back = group.children.find((child) => child.type === 'Group') as THREE.Group
    expect(back.rotation.x).toBe(-0.28)
    expect(back.children).toHaveLength(3)
  })

  it('le coin télé : la dalle éteinte au mur ouest, le meuble dessous, le pouf, et la photo du cadre posé au sol', () => {
    const load = vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(() => new THREE.Texture())
    const m = furnitureMaterials()
    const group = tvCorner(m)
    const meshes = meshesOf(group)
    const [frame, slab] = meshes
    expect(frame.position.toArray()).toEqual([LAYOUT.tv.x, 1.4, ROOM.zMin + 0.04])
    expect(sizeOf(slab).width).toBeCloseTo(LAYOUT.tv.width - 0.03)
    expect((slab.material as THREE.MeshBasicMaterial).type).toBe('MeshBasicMaterial')
    expect((slab.material as THREE.MeshBasicMaterial).color.getHex()).toBe(SCREEN_OFF)
    // Marquée : elle se clique et montre alors la vue d'une caméra (`tv.ts`).
    expect(slab.userData).toEqual({ tv: true })
    // Devant le cadre de la télé.
    expect(slab.position.z).toBeGreaterThan(frame.position.z)
    expect(load.mock.calls.map(([url]) => url)).toEqual([`${import.meta.env.BASE_URL}kitchen3d/fuji.jpg`])
    const pouf = meshes.find((mesh) => mesh.material === m.wicker) as THREE.Mesh
    expect(pouf.position.toArray()).toEqual([LAYOUT.pouf.x, 0.17, LAYOUT.pouf.z])
    // Le meuble télé : trois portes, deux carreaux de verre chacune ; l'aloès a neuf feuilles.
    expect(meshes.filter((mesh) => mesh.material === m.glass)).toHaveLength(6)
    expect(meshes.filter((mesh) => mesh.geometry.type === 'ConeGeometry')).toHaveLength(9)
    // Tout reste contre le mur ouest (à 2 cm près : ce qui est appuyé au mur y mord un peu).
    expect(new THREE.Box3().setFromObject(group).min.z).toBeGreaterThan(ROOM.zMin - 0.02)
  })

  it('le buffet : contre le mur des baies, un plateau de vieux bois, trois portes à deux carreaux', () => {
    const m = furnitureMaterials()
    const group = sideboard(m)
    const { z, width, depth, height } = LAYOUT.sideboard
    const meshes = meshesOf(group)
    expect(meshes[0].position.x).toBeCloseTo(ROOM.xMin + depth / 2 + 0.02)
    expect(meshes[1].material).toBe(m.woodOld)
    expect(meshes[1].position.y).toBe(height)
    const doors = meshes.filter((mesh) => mesh.material === m.woodDark)
    expect(doors.map((door) => door.position.z)).toEqual([z - width / 3, z, z + width / 3].map((at) => expect.closeTo(at)))
    expect(meshes.filter((mesh) => mesh.material === m.glass)).toHaveLength(6)
    const box = new THREE.Box3().setFromObject(group)
    expect(box.min.x).toBeGreaterThan(ROOM.xMin)
    expect(box.max.y).toBeCloseTo(height + 0.015)
  })
})
