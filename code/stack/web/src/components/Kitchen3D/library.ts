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
  // La caisse tout en bas à gauche (pour qui regarde la bibliothèque : la plus basse, contre le mur est) ne porte pas de livres : le switch et le mini PC y sont rangés.
  const corner = LIBRARY_CRATES.reduce((best, crate) => (crate[1] < best[1] - 0.001 || (Math.abs(crate[1] - best[1]) <= 0.001 && crate[0] < best[0]) ? crate : best), LIBRARY_CRATES[0])
  const inCorner = ([u, y]: number[]): boolean => u >= corner[0] - 0.001 && u < corner[0] + corner[3] && y >= corner[1] - 0.001 && y < corner[1] + corner[4]
  const shelved = LIBRARY_BOOKS.filter((book) => !inCorner(book))
  const books = new THREE.InstancedMesh(unit, standard(0xffffff, 0.8), shelved.length)
  const color = new THREE.Color()
  shelved.forEach(([u, y, v, width, height, depth, tint], index) => {
    place(books, index, { u, y, v, width, height, depth })
    books.setColorAt(index, color.setHex(tint, THREE.SRGBColorSpace))
  })
  group.add(panels(0, standard(LIBRARY.wood, 0.75)), panels(1, standard(LIBRARY.dark, 0.5, 0.5)), books)
  {
    const [u, y, v, width, , depth] = corner
    const floor = y + LIBRARY.board
    const inside = (along: number, tall: number): THREE.Vector3 => new THREE.Vector3(ROOM.xMin + v + depth / 2, floor + tall / 2, ROOM.zMax - LIBRARY.gap - u - width * along)
    // Le switch PoE : un boîtier de métal sombre, bas et large, avec ses voyants verts ; le mini PC : un petit cube noir, un voyant bleu.
    const metal = standard(0x23262b, 0.5, 0.6)
    const poe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.027, Math.min(0.21, width * 0.55)), metal)
    poe.position.copy(inside(0.32, 0.027))
    // Ses six voyants, en façade : chacun a son matériau et sa marque `userData.blink` (son rang), le conteneur les fait clignoter en vert et en jaune.
    const lights = Array.from({ length: 6 }, (_, port) => {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.005, 0.008), new THREE.MeshBasicMaterial({ color: 0x35d06a }))
      light.position.copy(inside(0.32, 0.027)).add(new THREE.Vector3(0.051, 0.004, (port - 2.5) * 0.02))
      light.userData.blink = port
      return light
    })
    const pc = new THREE.Mesh(new THREE.BoxGeometry(0.128, 0.05, 0.128), standard(0x15171a, 0.4, 0.3))
    pc.position.copy(inside(0.78, 0.05))
    const power = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.005, 0.005), new THREE.MeshBasicMaterial({ color: 0x3aa0ff }))
    power.position.copy(inside(0.78, 0.05)).add(new THREE.Vector3(0.065, 0, 0.04))
    group.add(poe, ...lights, pc, power)
  }
  // Sur le dessus du meuble noir (sa caisse la plus haute) : la box (un boîtier blanc rond et plat, un trait noir sur le dessus, un voyant) et, posé sur elle, le pont Hue (un petit carré blanc, son anneau bleu).
  const dark = LIBRARY_CRATES.filter((crate) => crate[6] === 1)
  const top = dark.reduce((best, crate) => (crate[1] + crate[4] > best[1] + best[4] ? crate : best), dark[0])
  {
    const [u, y, v, width, height, depth] = top
    const at = (along: number, tall: number): THREE.Vector3 => new THREE.Vector3(ROOM.xMin + v + depth / 2, y + height + tall / 2, ROOM.zMax - LIBRARY.gap - u - width * along)
    const white = standard(0xf3f3f0, 0.5)
    const box = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.045, 36), white)
    box.position.copy(at(0.35, 0.045))
    // Un trait noir en travers de son dessus.
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.002, 0.14), standard(0x121314, 0.4))
    stripe.position.copy(at(0.35, 0.045)).add(new THREE.Vector3(0.068, 0.0235, 0))
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.006, 0.03), new THREE.MeshBasicMaterial({ color: 0x35d06a }))
    led.position.copy(at(0.35, 0.045)).add(new THREE.Vector3(0.101, 0, 0))
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.026, 0.09), white)
    bridge.position.copy(at(0.35, 0.026)).add(new THREE.Vector3(0, 0.045, 0))
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.003, 8, 24), new THREE.MeshBasicMaterial({ color: 0x3aa0ff }))
    ring.rotation.x = Math.PI / 2
    ring.position.copy(at(0.35, 0.026)).add(new THREE.Vector3(0, 0.045 + 0.014, 0))
    group.add(box, stripe, led, bridge, ring)
  }
  return group
}
