import * as THREE from 'three'
import { mergeStatic, shareMaterials } from './merge'

const boxAt = (material: THREE.Material | THREE.Material[], x: number, y: number, z: number): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
  mesh.position.set(x, y, z)
  return mesh
}

const boundsOf = (mesh: THREE.Mesh): number[][] => {
  mesh.geometry.computeBoundingBox()
  const box = mesh.geometry.boundingBox as THREE.Box3
  return [box.min.toArray(), box.max.toArray()]
}

const fusedOf = (root: THREE.Object3D): THREE.Mesh[] => (root.children.at(-1) as THREE.Group).children as THREE.Mesh[]

/** Pour chaque triangle : vrai si sa face regarde vers le dehors (à l'opposé du centre donné). */
const facingOut = (mesh: THREE.Mesh, center: THREE.Vector3): boolean[] => {
  const points = mesh.geometry.attributes.position
  const index = mesh.geometry.index
  const count = index ? index.count : points.count
  const at = (corner: number): THREE.Vector3 => new THREE.Vector3().fromBufferAttribute(points, index ? index.getX(corner) : corner)
  return Array.from({ length: count / 3 }, (_, face) => {
    const [a, b, c] = [at(face * 3), at(face * 3 + 1), at(face * 3 + 2)]
    const normal = b.clone().sub(a).cross(c.clone().sub(a))
    return normal.dot(a.clone().add(b).add(c).multiplyScalar(1 / 3).sub(center)) > 0
  })
}

describe('shareMaterials', () => {
  it('deux matériaux de même allure n’en font qu’un : le premier rencontré', () => {
    const root = new THREE.Group()
    const first = boxAt(new THREE.MeshStandardMaterial({ color: 0xc23b2f, roughness: 0.6 }), 0, 0, 0)
    const same = boxAt(new THREE.MeshStandardMaterial({ color: 0xc23b2f, roughness: 0.6 }), 1, 0, 0)
    const rougher = boxAt(new THREE.MeshStandardMaterial({ color: 0xc23b2f, roughness: 0.7 }), 2, 0, 0)
    const other = boxAt(new THREE.MeshStandardMaterial({ color: 0xc23b30, roughness: 0.6 }), 3, 0, 0)
    const basic = boxAt(new THREE.MeshBasicMaterial({ color: 0xc23b2f }), 4, 0, 0)
    const inner = new THREE.Group()
    inner.add(same, rougher)
    root.add(first, inner, other, basic)
    const kept = first.material
    shareMaterials(root, () => false)
    expect(first.material).toBe(kept)
    expect(same.material).toBe(kept)
    expect(new Set([first, rougher, other, basic].map((mesh) => mesh.material)).size).toBe(4)
  })

  it('une texture compte par son identité ; une marque du matériau (`userData`) aussi', () => {
    const root = new THREE.Group()
    const map = new THREE.Texture()
    const mapped = boxAt(new THREE.MeshStandardMaterial({ map }), 0, 0, 0)
    const sameMap = boxAt(new THREE.MeshStandardMaterial({ map }), 1, 0, 0)
    const otherMap = boxAt(new THREE.MeshStandardMaterial({ map: new THREE.Texture() }), 2, 0, 0)
    const leaves = ['a', 'a', 'b'].map((mark, index) => {
      const material = new THREE.MeshStandardMaterial({ color: 0x4f8a3a, flatShading: true })
      material.userData.mark = { mark }
      return boxAt(material, 3 + index, 0, 0)
    })
    root.add(mapped, sameMap, otherMap, ...leaves)
    shareMaterials(root, () => false)
    expect(sameMap.material).toBe(mapped.material)
    expect(otherMap.material).not.toBe(mapped.material)
    expect(leaves[1].material).toBe(leaves[0].material)
    expect(leaves[2].material).not.toBe(leaves[0].material)
  })

  it('un maillage qui garde le sien (`own`) n’est ni remplacé ni pris comme modèle', () => {
    const root = new THREE.Group()
    const bulb = boxAt(new THREE.MeshBasicMaterial({ color: 0x4a4640 }), 0, 0, 0)
    bulb.userData.fixture = true
    const first = boxAt(new THREE.MeshBasicMaterial({ color: 0x4a4640 }), 1, 0, 0)
    const second = boxAt(new THREE.MeshBasicMaterial({ color: 0x4a4640 }), 2, 0, 0)
    const own = bulb.material
    root.add(bulb, first, second, new THREE.PointLight())
    shareMaterials(root, (mesh) => mesh.userData.fixture === true)
    expect(bulb.material).toBe(own)
    expect(first.material).not.toBe(own)
    expect(second.material).toBe(first.material)
  })
})

describe('mergeStatic', () => {
  it('les maillages d’un même matériau, où qu’ils soient, font un seul maillage, à leur place dans le repère de la scène', () => {
    const root = new THREE.Group()
    // (La scène elle-même peut être posée ailleurs : ce qui est fondu reste dans son repère.)
    root.position.set(50, 0, 0)
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a2a })
    const steel = new THREE.MeshStandardMaterial({ color: 0x888888 })
    const room = new THREE.Group()
    room.position.set(10, 0, 0)
    const table = new THREE.Group()
    table.position.set(0, 2, 0)
    table.rotation.y = Math.PI / 2
    const top = boxAt(wood, 0, 0, 3)
    const leg = boxAt(steel, 0, -1, 0)
    table.add(top, leg)
    room.add(table)
    const shelf = boxAt(wood, -4, 0, 0)
    shelf.scale.set(2, 1, 1)
    root.add(room, shelf)
    mergeStatic(root, [])
    expect(root.children).toHaveLength(2)
    expect(root.children.at(-1)?.name).toBe('static')
    // Retirés de leurs groupes, qui restent.
    expect(table.children).toHaveLength(0)
    expect(table.parent).toBe(room)
    expect(shelf.parent).toBeNull()
    const fused = fusedOf(root)
    expect(fused.map((mesh) => mesh.material)).toEqual([wood, steel])
    const [woods, steels] = fused
    // Le plateau : tourné d'un quart de tour autour de la verticale, il est à x = 10 + 3 ; l'étagère est étirée.
    const [min, max] = boundsOf(woods)
    expect(min).toEqual([-5, -0.5, expect.closeTo(-0.5)])
    expect(max).toEqual([expect.closeTo(13.5), 2.5, expect.closeTo(0.5)])
    expect(woods.geometry.attributes.position.count).toBe(48)
    expect(boundsOf(steels)).toEqual([
      [9.5, 0.5, -0.5],
      [10.5, 1.5, 0.5],
    ])
    // Les normales suivent : celle de la première face du plateau (+x du pavé) regarde vers −z après le quart de tour.
    const normal = new THREE.Vector3().fromBufferAttribute(woods.geometry.attributes.normal, 0)
    expect(normal.distanceTo(new THREE.Vector3(0, 0, -1))).toBeCloseTo(0)
    expect(woods.position.toArray()).toEqual([0, 0, 0])
  })

  it('reste à part : ce qui est marqué (lui ou un parent), ce qui est sous un objet à garder, ce qui est caché, les copies, le transparent', () => {
    const root = new THREE.Group()
    const paint = new THREE.MeshStandardMaterial()
    const plain = boxAt(paint, 0, 0, 0)
    const marked = boxAt(paint, 1, 0, 0)
    marked.userData.acUnit = 'salon'
    const hands = new THREE.Group()
    hands.userData.clockHand = 'hour'
    const hand = boxAt(paint, 2, 0, 0)
    hands.add(hand)
    const window = new THREE.Group()
    const frame = boxAt(paint, 3, 0, 0)
    const slats = new THREE.Group()
    const slat = boxAt(paint, 3, 1, 0)
    slats.add(slat)
    window.add(frame, slats)
    const hidden = boxAt(paint, 4, 0, 0)
    hidden.visible = false
    const closed = new THREE.Group()
    closed.visible = false
    const inside = boxAt(paint, 5, 0, 0)
    closed.add(inside)
    const copies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), paint, 2)
    const glass = boxAt(new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.2 }), 6, 0, 0)
    const several = boxAt([paint, paint], 7, 0, 0)
    root.add(plain, marked, hands, window, hidden, closed, copies, glass, several, new THREE.PointLight())
    mergeStatic(root, [window])
    const fused = fusedOf(root)
    expect(fused).toHaveLength(1)
    expect(boundsOf(fused[0])).toEqual([
      [-0.5, -0.5, -0.5],
      [0.5, 0.5, 0.5],
    ])
    expect(plain.parent).toBeNull()
    expect([marked.parent, hands.parent, window.parent, hidden.parent, closed.parent, copies.parent, glass.parent, several.parent]).toEqual([root, root, root, root, root, root, root, root])
    expect([hand.parent, frame.parent, slat.parent, inside.parent]).toEqual([hands, window, slats, closed])
  })

  it('sans rien à fondre : un groupe vide', () => {
    const root = new THREE.Group()
    mergeStatic(root, [])
    expect(fusedOf(root)).toEqual([])
  })

  it('des géométries indexées et d’autres non se fondent quand même ; des jeux d’attributs différents font des maillages à part', () => {
    const root = new THREE.Group()
    const paint = new THREE.MeshStandardMaterial()
    const cube = boxAt(paint, 0, 0, 0)
    const stone = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), paint)
    stone.position.set(5, 0, 0)
    const bare = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3)), paint)
    root.add(cube, stone, bare)
    mergeStatic(root, [])
    const fused = fusedOf(root)
    expect(fused).toHaveLength(2)
    const [full, flat] = fused
    // Le pavé (indexé, 12 triangles) et le caillou (20 triangles, sans index) : 32 triangles sans index.
    expect(full.geometry.index).toBeNull()
    expect(full.geometry.attributes.position.count).toBe((12 + 20) * 3)
    expect(Object.keys(full.geometry.attributes).sort()).toEqual(['normal', 'position', 'uv'])
    expect(Object.keys(flat.geometry.attributes)).toEqual(['position'])
    expect(flat.geometry.attributes.position.count).toBe(3)
    // Tous indexés : l'index est gardé.
    const again = new THREE.Group()
    again.add(boxAt(paint, 0, 0, 0), boxAt(paint, 2, 0, 0))
    mergeStatic(again, [])
    expect(fusedOf(again)[0].geometry.index?.count).toBe(72)
  })

  it('un objet retourné en miroir garde ses faces vers le dehors : le sens de ses triangles est inversé', () => {
    const paint = new THREE.MeshStandardMaterial()
    for (const geometry of [new THREE.BoxGeometry(1, 1, 1), new THREE.IcosahedronGeometry(1, 0)]) {
      const root = new THREE.Group()
      const straight = new THREE.Mesh(geometry, paint)
      straight.position.set(-3, 0, 0)
      const mirrored = new THREE.Mesh(geometry, paint)
      mirrored.position.set(3, 0, 0)
      mirrored.scale.x = -1
      root.add(straight)
      mergeStatic(root, [])
      const other = new THREE.Group()
      other.add(mirrored)
      mergeStatic(other, [])
      expect(facingOut(fusedOf(root)[0], new THREE.Vector3(-3, 0, 0)).every((out) => out)).toBe(true)
      expect(facingOut(fusedOf(other)[0], new THREE.Vector3(3, 0, 0)).every((out) => out)).toBe(true)
      // La géométrie d'origine, partagée, n'est pas touchée.
      expect(facingOut(new THREE.Mesh(geometry, paint), new THREE.Vector3()).every((out) => out)).toBe(true)
    }
  })
})
