import * as THREE from 'three'
import { createMatrix, MATRIX_CAMERA, MATRIX_COLORS, MATRIX_SHUTTER } from './matrix'
import { KINDS } from './merge'

const boxAt = (name: string, parent: THREE.Object3D, material: THREE.Material = new THREE.MeshStandardMaterial({ color: 0x884422 })): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
  mesh.name = name
  mesh.position.set(1, 2, 3)
  parent.add(mesh)
  return mesh
}

const group = (name: string, parent: THREE.Object3D): THREE.Group => {
  const made = new THREE.Group()
  made.name = name
  parent.add(made)
  return made
}

const linesOf = (root: THREE.Object3D): THREE.LineSegments[] => {
  const lines: THREE.LineSegments[] = []
  root.traverse((child) => {
    if ((child as THREE.LineSegments).isLineSegments) lines.push(child as THREE.LineSegments)
  })
  return lines
}

const ringsOf = (root: THREE.Object3D): THREE.Group[] => {
  const rings: THREE.Group[] = []
  root.traverse((child) => {
    if (child.type === 'Group' && child.children.length === 3 && child.children.every((part) => (part as THREE.LineLoop).isLineLoop)) rings.push(child as THREE.Group)
  })
  return rings
}

describe('les couleurs de la vue Matrix', () => {
  it('une teinte par genre, du vert, et des couleurs vives pour les caméras et les volets', () => {
    expect(Object.keys(MATRIX_COLORS).sort()).toEqual([...KINDS].sort())
    expect(new Set(Object.values(MATRIX_COLORS)).size).toBe(KINDS.length)
    // Tous les verts : le canal vert domine.
    for (const color of Object.values(MATRIX_COLORS)) {
      const rgb = new THREE.Color(color)
      expect(rgb.g).toBeGreaterThan(rgb.r)
      expect(rgb.g).toBeGreaterThan(rgb.b)
    }
    expect(MATRIX_CAMERA).toBe(0xff3b30)
    expect(MATRIX_SHUTTER).toBe(0xffb020)
  })
})

describe('createMatrix', () => {
  it('chaque maillage devient des arêtes à sa place, dans la teinte de son genre, et le maillage se cache ; puis tout revient', () => {
    const root = new THREE.Group()
    const shell = group('shell', root)
    const tree = group('tree', root)
    const plain = group('', root)
    const wall = boxAt('wall', shell)
    wall.scale.set(2, 1, 1)
    wall.rotation.y = 0.5
    const trunk = boxAt('trunk', tree)
    const chair = boxAt('chair', plain)
    const show = createMatrix(root)
    // Rien n'est calculé ni changé avant la première demande.
    expect(linesOf(root)).toHaveLength(0)
    show(true)
    expect([wall.visible, trunk.visible, chair.visible]).toEqual([false, false, false])
    const lines = linesOf(root)
    expect(lines).toHaveLength(3)
    expect(lines.every((line) => line.visible)).toBe(true)
    // Les arêtes sont voisines du maillage : même parent, même place, mêmes échelle et tour.
    const edgesOf = (mesh: THREE.Mesh) => lines.find((line) => line.parent === mesh.parent) as THREE.LineSegments
    expect(edgesOf(wall).position.toArray()).toEqual(wall.position.toArray())
    expect(edgesOf(wall).scale.toArray()).toEqual([2, 1, 1])
    expect(edgesOf(wall).quaternion.equals(wall.quaternion)).toBe(true)
    // La teinte vient du genre : gros œuvre, arbre, et mobilier pour ce qui n'est dans aucun groupe nommé.
    const colorOf = (mesh: THREE.Mesh) => ((edgesOf(mesh).material as THREE.LineBasicMaterial).color.getHex())
    expect(colorOf(wall)).toBe(MATRIX_COLORS.shell)
    expect(colorOf(trunk)).toBe(MATRIX_COLORS.tree)
    expect(colorOf(chair)).toBe(MATRIX_COLORS.furniture)
    // Les arêtes d'un même genre partagent leur matériau, à demi transparent.
    const material = edgesOf(wall).material as THREE.LineBasicMaterial
    expect(material.transparent).toBe(true)
    expect(material.opacity).toBeLessThan(1)
    show(false)
    expect([wall.visible, trunk.visible, chair.visible]).toEqual([true, true, true])
    expect(lines.some((line) => line.visible)).toBe(false)
  })

  it('un genre inconnu du jardin (`garden`) a sa teinte aussi', () => {
    const root = new THREE.Group()
    const garden = group('garden', root)
    const rock = boxAt('rock', garden)
    createMatrix(root)(true)
    const [edges] = linesOf(root)
    expect((edges.material as THREE.LineBasicMaterial).color.getHex()).toBe(MATRIX_COLORS.garden)
    expect(rock.visible).toBe(false)
  })

  it('ce qui était caché reste caché : ses arêtes ne se montrent pas, et il ne réapparaît pas à la sortie', () => {
    const root = new THREE.Group()
    const hidden = boxAt('hidden', root)
    const shown = boxAt('shown', root)
    hidden.visible = false
    const show = createMatrix(root)
    show(true)
    const edges = linesOf(root)
    expect(edges).toHaveLength(2)
    expect(edges.filter((line) => line.visible)).toHaveLength(1)
    show(false)
    expect(hidden.visible).toBe(false)
    expect(shown.visible).toBe(true)
    // Une seconde fois : même chose, sans recalculer les arêtes.
    show(true)
    expect(linesOf(root)).toHaveLength(2)
    expect(edges.filter((line) => line.visible)).toHaveLength(1)
    show(false)
    expect(hidden.visible).toBe(false)
  })

  it('les copies (herbe, feuilles) et un maillage sans parent sont simplement cachés, sans arêtes', () => {
    const root = new THREE.Group()
    const grass = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial(), 4)
    root.add(grass)
    const show = createMatrix(grass)
    show(true)
    expect(grass.visible).toBe(false)
    expect(linesOf(root)).toHaveLength(0)
    show(false)
    expect(grass.visible).toBe(true)
    // Un maillage racine, sans parent.
    const lone = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial())
    const showLone = createMatrix(lone)
    showLone(true)
    expect(lone.visible).toBe(false)
    showLone(false)
    expect(lone.visible).toBe(true)
  })

  it('une ampoule de luminaire ou de lampe nue garde son matériau et son maillage, entourée de trois cercles rouges', () => {
    const root = new THREE.Group()
    const fixtureMaterial = new THREE.MeshBasicMaterial({ color: 0xffd080 })
    const fixture = boxAt('fixture', root, fixtureMaterial)
    fixture.userData.fixture = true
    const bare = boxAt('bare', root, new THREE.MeshBasicMaterial({ color: 0x4a4640 }))
    bare.userData.lampBulb = true
    const show = createMatrix(root)
    show(true)
    expect(fixture.visible).toBe(true)
    expect(bare.visible).toBe(true)
    expect(fixture.material).toBe(fixtureMaterial)
    // Pas d'arêtes pour une ampoule : seulement ses cercles, rouges, dans trois plans.
    expect(linesOf(root).filter((line) => !(line as unknown as THREE.LineLoop).isLineLoop)).toHaveLength(0)
    const rings = ringsOf(root)
    expect(rings).toHaveLength(2)
    expect(rings.every((ring) => ring.visible && ring.scale.x === 1)).toBe(true)
    const [flat, upright, side] = rings[0].children as THREE.LineLoop[]
    expect((flat.material as THREE.LineBasicMaterial).color.getHex()).toBe(MATRIX_CAMERA)
    expect([flat.rotation.x, upright.rotation.x, side.rotation.y]).toEqual([0, Math.PI / 2, Math.PI / 2])
    // Cercles de 10 cm de rayon.
    flat.geometry.computeBoundingSphere()
    expect(flat.geometry.boundingSphere?.radius).toBeCloseTo(0.1)
    show(false)
    expect(rings.some((ring) => ring.visible)).toBe(false)
    expect(fixture.visible).toBe(true)
  })

  it('une lampe qui apparaît après la première fois (ampoule nue d’une lampe lue plus tard) est prise à l’appel suivant, sans refaire le reste', () => {
    const root = new THREE.Group()
    const wall = boxAt('wall', root)
    const show = createMatrix(root)
    show(true)
    show(false)
    const late = boxAt('late', root, new THREE.MeshBasicMaterial({ color: 0x4a4640 }))
    late.userData.lampBulb = true
    show(true)
    expect(linesOf(root)).toHaveLength(1)
    expect(ringsOf(root)).toHaveLength(1)
    expect(wall.visible).toBe(false)
    expect(late.visible).toBe(true)
    show(false)
    expect(wall.visible).toBe(true)
    expect(ringsOf(root)[0].visible).toBe(false)
  })

  it('un volet roulant reste en place, en fil de fer ambre, puis retrouve son matériau', () => {
    const root = new THREE.Group()
    const window = group('', root)
    const slats = group('', window)
    slats.userData.shutter = 'cuisine'
    const material = new THREE.MeshStandardMaterial({ color: 0xddddcc })
    const slat = boxAt('slat', slats, material)
    const show = createMatrix(root)
    show(true)
    expect(slat.visible).toBe(true)
    const wire = slat.material as THREE.MeshBasicMaterial
    expect(wire.wireframe).toBe(true)
    expect(wire.color.getHex()).toBe(MATRIX_SHUTTER)
    expect(linesOf(root)).toHaveLength(0)
    show(false)
    expect(slat.material).toBe(material)
  })

  it('une caméra : son modèle en blanc plein, un seul jeu de trois cercles rouges, plus larges, pour tout le modèle', () => {
    const root = new THREE.Group()
    const model = group('', root)
    model.userData.camera = 'voliere-toit'
    const body = group('', model)
    const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0xf2f2ee })
    const lensMaterial = new THREE.MeshStandardMaterial({ color: 0x0c0d10 })
    const barrel = boxAt('barrel', body, barrelMaterial)
    const lens = boxAt('lens', body, lensMaterial)
    const show = createMatrix(root)
    show(true)
    for (const part of [barrel, lens]) {
      expect(part.visible).toBe(true)
      const white = part.material as THREE.MeshBasicMaterial
      expect(white.color.getHex()).toBe(0xffffff)
      expect(white.wireframe).toBe(false)
    }
    // Les deux morceaux partagent le même blanc.
    expect(barrel.material).toBe(lens.material)
    const rings = ringsOf(root)
    expect(rings).toHaveLength(1)
    expect(rings[0].parent).toBe(model)
    expect(rings[0].scale.x).toBe(2)
    expect(rings[0].position.z).toBeCloseTo(0.12)
    expect(rings[0].visible).toBe(true)
    expect(linesOf(root).filter((line) => !(line as unknown as THREE.LineLoop).isLineLoop)).toHaveLength(0)
    show(false)
    expect(barrel.material).toBe(barrelMaterial)
    expect(lens.material).toBe(lensMaterial)
    expect(rings[0].visible).toBe(false)
  })
})
