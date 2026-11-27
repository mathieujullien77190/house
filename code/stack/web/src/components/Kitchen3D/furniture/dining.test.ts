import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { LAYOUT } from '@/components/Kitchen3D/constants'
import { furnitureMaterials } from '@/components/Kitchen3D/materials'
import { dining, strawChair } from './dining'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

describe('dining', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('la table ronde de 1,20 m, à sa place, sur trois poutres croisées', () => {
    const m = furnitureMaterials()
    const group = dining(m)
    expect(group.position.toArray()).toEqual([LAYOUT.dining.x, 0, LAYOUT.dining.z])
    const top = group.children[0] as THREE.Mesh
    expect((top.geometry as THREE.CylinderGeometry).parameters.radiusTop).toBe(0.6)
    expect(top.material).toBe(m.tableTop)
    // Le dessus du plateau est à 77,5 cm.
    expect(top.position.y + 0.03).toBeCloseTo(0.775)
    const beams = meshesOf(group).filter((mesh) => mesh.material === m.tableBeam)
    expect(beams).toHaveLength(3)
    expect(new Set(beams.map((beam) => beam.parent?.rotation.y)).size).toBe(3)
  })

  it('quatre chaises tournées vers la table, deux orange et deux bleues en alternance', () => {
    const m = furnitureMaterials()
    const group = dining(m)
    // Les trois poutres du pied sont des groupes au centre ; les chaises sont autour.
    const groups = group.children.filter((child) => child.type === 'Group')
    expect(groups).toHaveLength(7)
    const chairs = groups.filter((child) => Math.hypot(child.position.x, child.position.z) > 0.1)
    expect(chairs).toHaveLength(4)
    for (const chair of chairs) {
      expect(Math.hypot(chair.position.x, chair.position.z)).toBeCloseTo(0.82)
      // Son devant (+z, tourné) pointe vers le centre de la table.
      expect(Math.sin(chair.rotation.y)).toBeCloseTo(-chair.position.x / 0.82)
      expect(Math.cos(chair.rotation.y)).toBeCloseTo(-chair.position.z / 0.82)
      // Une coque (assise, dossier, deux joues), un fût et quatre pieds.
      expect(meshesOf(chair)).toHaveLength(9)
    }
    expect(chairs.map((chair) => (chair.children[0] as THREE.Mesh).material)).toEqual([m.chairOrange, m.chairBlue, m.chairOrange, m.chairBlue])
  })
})

describe('strawChair', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('une chaise paillée en bois foncé : assise à 45 cm, quatre pieds d’aplomb, dossier à trois barreaux en éventail', () => {
    const m = furnitureMaterials()
    const chair = strawChair(m)
    const meshes = meshesOf(chair)
    const straw = meshes.filter((mesh) => mesh.geometry.type === 'ConeGeometry')
    expect(straw).toHaveLength(1)
    expect(straw[0].position.y).toBeCloseTo(0.462)
    // Tout le reste est du même bois, sauf la paille et son fond.
    expect(meshes.filter((mesh) => mesh.material === m.woodDark)).toHaveLength(meshes.length - 2)
    const legs = meshes.filter((mesh) => (mesh.geometry as THREE.BoxGeometry).parameters.height === 0.45)
    expect(legs.map((leg) => [leg.position.x, leg.position.z])).toEqual([
      [-0.195, 0.185],
      [-0.195, -0.185],
      [0.195, 0.185],
      [0.195, -0.185],
    ])
    const fan = meshes.filter((mesh) => (mesh.geometry as THREE.BoxGeometry).parameters.height === 0.22)
    expect(fan.map((bar) => bar.rotation.z)).toEqual([0.2, -0, -0.2])
    // Le haut du dossier : la traverse à chapeau.
    const box = new THREE.Box3().setFromObject(chair)
    expect(box.max.y).toBeGreaterThan(0.9)
    expect(box.max.y).toBeLessThan(1)
    expect(box.min.y).toBeCloseTo(0)
  })
})
