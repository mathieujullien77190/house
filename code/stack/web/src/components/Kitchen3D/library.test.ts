import * as THREE from 'three'
import { LIBRARY, ROOM } from './constants'
import { buildLibrary } from './library'
import { LIBRARY_BOOKS, LIBRARY_CRATES } from './libraryData'

const placeOf = (mesh: THREE.InstancedMesh, index: number) => {
  const matrix = new THREE.Matrix4()
  mesh.getMatrixAt(index, matrix)
  const position = new THREE.Vector3()
  const scale = new THREE.Vector3()
  matrix.decompose(position, new THREE.Quaternion(), scale)
  return { position, scale }
}

/** La caisse du coin : la plus basse, puis la plus près du mur est (u le plus petit). Le switch et le mini PC y sont rangés, sans livres. */
const CORNER = [...LIBRARY_CRATES].sort((a, b) => a[1] - b[1] || a[0] - b[0])[0]
const inCorner = ([u, y]: number[]): boolean => u >= CORNER[0] - 0.001 && u < CORNER[0] + CORNER[3] && y >= CORNER[1] - 0.001 && y < CORNER[1] + CORNER[4]
const sizeOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.BoxGeometry).parameters

describe('buildLibrary', () => {
  const library = buildLibrary()
  const [wood, dark, books] = library.children as THREE.InstancedMesh[]
  const things = library.children.slice(3) as THREE.Mesh[]

  it('trois maillages : panneaux de bois, panneaux noirs, livres', () => {
    const darkCrates = LIBRARY_CRATES.filter((crate) => crate[6] === 1).length
    expect(darkCrates).toBeGreaterThan(0)
    expect(wood.isInstancedMesh).toBe(true)
    expect(wood.count).toBe((LIBRARY_CRATES.length - darkCrates) * 5)
    expect(dark.count).toBe(darkCrates * 5)
    // Tous les livres, sauf ceux de la caisse du coin (vidée pour le switch et le mini PC).
    const emptied = LIBRARY_BOOKS.filter(inCorner).length
    expect(emptied).toBeGreaterThan(0)
    expect(books.count).toBe(LIBRARY_BOOKS.length - emptied)
    expect((wood.material as THREE.MeshStandardMaterial).color.getHex()).toBe(LIBRARY.wood)
    expect((dark.material as THREE.MeshStandardMaterial).color.getHex()).toBe(LIBRARY.dark)
    // Les trois maillages partagent la même boîte d'un mètre, mise à l'échelle par copie.
    expect(dark.geometry).toBe(wood.geometry)
    expect(books.geometry).toBe(wood.geometry)
  })

  it('une caisse devient cinq panneaux : le fond d’abord, contre le mur des baies', () => {
    const [u, y, v, width, height] = LIBRARY_CRATES.find((crate) => crate[6] === 0) as number[]
    const back = placeOf(wood, 0)
    expect(back.position.x).toBeCloseTo(ROOM.xMin + v + LIBRARY.board / 2)
    expect(back.position.y).toBeCloseTo(y + height / 2)
    expect(back.position.z).toBeCloseTo(ROOM.zMax - LIBRARY.gap - (u + width / 2))
    expect(back.scale.x).toBeCloseTo(LIBRARY.board)
    expect(back.scale.y).toBeCloseTo(height)
    expect(back.scale.z).toBeCloseTo(width)
    // Le dessus : une planche à plat en haut de la caisse.
    const top = placeOf(wood, 4)
    expect(top.position.y).toBeCloseTo(y + height - LIBRARY.board / 2)
    expect(top.scale.y).toBeCloseTo(LIBRARY.board)
  })

  it('dans la caisse du coin : le switch PoE et ses six voyants marqués `blink`, le mini PC et son voyant bleu', () => {
    const [poe, ...rest] = things
    const lights = rest.slice(0, 6)
    const [pc, power] = rest.slice(6, 8)
    const [u, y, v, width, height, depth] = CORNER
    // Posés sur le fond de la caisse, entre ses deux côtés, à mi-profondeur.
    for (const device of [poe, pc]) {
      expect(device.position.y - sizeOf(device).height / 2).toBeCloseTo(y + LIBRARY.board)
      expect(device.position.y).toBeLessThan(y + height)
      expect(device.position.x).toBeCloseTo(ROOM.xMin + v + depth / 2)
      expect(device.position.z).toBeLessThan(ROOM.zMax - LIBRARY.gap - u)
      expect(device.position.z).toBeGreaterThan(ROOM.zMax - LIBRARY.gap - u - width)
    }
    // Le switch : bas et large ; le mini PC : un petit pavé carré, plus loin du mur est.
    expect(sizeOf(poe).height).toBe(0.027)
    expect(sizeOf(poe).depth).toBeCloseTo(Math.min(0.21, width * 0.55))
    expect([sizeOf(pc).width, sizeOf(pc).depth]).toEqual([0.128, 0.128])
    expect(pc.position.z).toBeLessThan(poe.position.z)
    // Six voyants en façade du switch, à 2 cm l'un de l'autre : chacun son rang et son matériau (le conteneur les fait clignoter).
    expect(lights.map((light) => light.userData)).toEqual([0, 1, 2, 3, 4, 5].map((blink) => ({ blink })))
    expect(new Set(lights.map((light) => light.material)).size).toBe(6)
    for (const light of lights) {
      expect(light.material).toBeInstanceOf(THREE.MeshBasicMaterial)
      expect((light.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0x35d06a)
      expect(light.position.x).toBeCloseTo(poe.position.x + 0.051)
    }
    expect(lights[1].position.z - lights[0].position.z).toBeCloseTo(0.02)
    expect((lights[0].position.z + lights[5].position.z) / 2).toBeCloseTo(poe.position.z)
    // Le voyant du mini PC : bleu, en façade, sans marque (il ne clignote pas).
    expect((power.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0x3aa0ff)
    expect(power.userData).toEqual({})
    expect(power.position.x).toBeCloseTo(pc.position.x + 0.065)
  })

  it('sur le meuble noir le plus haut : la box, ronde et blanche, barrée de noir, et le pont Hue posé dessus', () => {
    expect(things).toHaveLength(14)
    const [box, stripe, led, bridge, ring] = things.slice(9)
    const tallest = Math.max(...LIBRARY_CRATES.filter((crate) => crate[6] === 1).map((crate) => crate[1] + crate[4]))
    const top = LIBRARY_CRATES.find((crate) => crate[6] === 1 && crate[1] + crate[4] === tallest) as number[]
    expect(box.geometry.type).toBe('CylinderGeometry')
    const { radiusTop, height } = (box.geometry as THREE.CylinderGeometry).parameters
    expect([radiusTop, height]).toEqual([0.1, 0.045])
    expect(box.position.y - height / 2).toBeCloseTo(tallest)
    expect(box.position.x).toBeCloseTo(ROOM.xMin + top[2] + top[5] / 2)
    expect(box.position.z).toBeCloseTo(ROOM.zMax - LIBRARY.gap - top[0] - top[3] * 0.35)
    expect((box.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0xf3f3f0)
    // Le trait noir affleure son dessus ; le voyant vert est sur sa tranche.
    expect((stripe.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0x121314)
    expect(stripe.position.y).toBeCloseTo(box.position.y + height / 2 + 0.001)
    expect((led.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0x35d06a)
    expect(led.position.x).toBeCloseTo(box.position.x + 0.101)
    // Le pont Hue : un petit carré du même blanc, posé sur la box, son anneau bleu à plat sur le dessus.
    expect(bridge.material).toBe(box.material)
    expect([sizeOf(bridge).width, sizeOf(bridge).depth]).toEqual([0.09, 0.09])
    expect(bridge.position.y - sizeOf(bridge).height / 2).toBeCloseTo(box.position.y + height / 2)
    expect(ring.geometry.type).toBe('TorusGeometry')
    expect(ring.rotation.x).toBeCloseTo(Math.PI / 2)
    expect(ring.position.y).toBeGreaterThan(bridge.position.y + sizeOf(bridge).height / 2)
    expect((ring.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0x3aa0ff)
  })

  it('chaque livre est un bloc de sa couleur, à sa place', () => {
    const [u, y, v, width, height, depth, tint] = LIBRARY_BOOKS[0]
    const book = placeOf(books, 0)
    expect(book.position.x).toBeCloseTo(ROOM.xMin + v)
    expect(book.position.y).toBeCloseTo(y)
    expect(book.position.z).toBeCloseTo(ROOM.zMax - LIBRARY.gap - u)
    expect(book.scale.x).toBeCloseTo(depth)
    expect(book.scale.y).toBeCloseTo(height)
    expect(book.scale.z).toBeCloseTo(width)
    const color = new THREE.Color()
    books.getColorAt(0, color)
    expect(color.getHex(THREE.SRGBColorSpace)).toBe(tint)
  })
})
