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

describe('buildLibrary', () => {
  const [wood, dark, books] = buildLibrary().children as THREE.InstancedMesh[]

  it('trois maillages : panneaux de bois, panneaux noirs, livres', () => {
    const darkCrates = LIBRARY_CRATES.filter((crate) => crate[6] === 1).length
    expect(darkCrates).toBeGreaterThan(0)
    expect(wood.isInstancedMesh).toBe(true)
    expect(wood.count).toBe((LIBRARY_CRATES.length - darkCrates) * 5)
    expect(dark.count).toBe(darkCrates * 5)
    expect(books.count).toBe(LIBRARY_BOOKS.length)
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
