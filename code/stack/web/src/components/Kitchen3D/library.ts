import * as THREE from 'three'
import { LIBRARY, ROOM } from './constants'
import { LIBRARY_BOOKS, LIBRARY_CRATES } from './libraryData'
import { standard } from './primitives'

/** Une boîte de la bibliothèque dans la scène : son centre et ses cotes le long du mur (u), en hauteur (y) et en profondeur (v). */
interface Block {
  u: number
  y: number
  v: number
  width: number
  height: number
  depth: number
}

const matrix = new THREE.Matrix4()
const position = new THREE.Vector3()
const scale = new THREE.Vector3()
const upright = new THREE.Quaternion()

/**
 * Pose une boîte à sa place dans la pièce : la bibliothèque longe le mur des baies (x min), ses caisses en bois dans le coin du mur est ;
 * u court donc vers l'ouest (z décroissant) et v s'éloigne du mur (x croissant).
 */
const place = (mesh: THREE.InstancedMesh, index: number, block: Block): void => {
  position.set(ROOM.xMin + block.v, block.y, ROOM.zMax - LIBRARY.gap - block.u)
  scale.set(block.depth, block.height, block.width)
  mesh.setMatrixAt(index, matrix.compose(position, upright, scale))
}

/** Les cinq panneaux d'une caisse ouverte devant : le fond, les deux côtés, le dessous et le dessus. */
const panelsOf = ([u, y, v, width, height, depth]: number[]): Block[] => {
  const board = LIBRARY.board
  return [
    { u: u + width / 2, y: y + height / 2, v: v + board / 2, width, height, depth: board },
    { u: u + board / 2, y: y + height / 2, v: v + depth / 2, width: board, height, depth },
    { u: u + width - board / 2, y: y + height / 2, v: v + depth / 2, width: board, height, depth },
    { u: u + width / 2, y: y + board / 2, v: v + depth / 2, width, height: board, depth },
    { u: u + width / 2, y: y + height - board / 2, v: v + depth / 2, width, height: board, depth },
  ]
}

/**
 * La bibliothèque du salon, simplifiée d'après le projet « order » (`libraryData.ts`) : des caisses en bois empilées et un meuble noir,
 * réduits à leurs panneaux, et les livres réduits à des blocs de leur couleur. Trois maillages en tout (les boîtes sont des copies).
 */
export const buildLibrary = (): THREE.Group => {
  const group = new THREE.Group()
  const unit = new THREE.BoxGeometry(1, 1, 1)
  const panels = (dark: number, material: THREE.Material) => {
    const blocks = LIBRARY_CRATES.filter((crate) => crate[6] === dark).flatMap(panelsOf)
    const mesh = new THREE.InstancedMesh(unit, material, blocks.length)
    blocks.forEach((block, index) => place(mesh, index, block))
    return mesh
  }
  const books = new THREE.InstancedMesh(unit, standard(0xffffff, 0.8), LIBRARY_BOOKS.length)
  const color = new THREE.Color()
  LIBRARY_BOOKS.forEach(([u, y, v, width, height, depth, tint], index) => {
    place(books, index, { u, y, v, width, height, depth })
    books.setColorAt(index, color.setHex(tint, THREE.SRGBColorSpace))
  })
  group.add(panels(0, standard(LIBRARY.wood, 0.75)), panels(1, standard(LIBRARY.dark, 0.5, 0.5)), books)
  return group
}
