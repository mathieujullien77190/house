import * as THREE from 'three'
import { KITCHEN, LAYOUT, NOOK_WINDOW, PARTITION, ROOM, SHELL } from '@/components/Kitchen3D/constants'
import type { FurnitureMaterials } from '@/components/Kitchen3D/materials'
import { box, cylinder, seeded, standard } from '@/components/Kitchen3D/primitives'
import { photoTexture } from '@/components/Kitchen3D/textures'

/**
 * Sur l'étagère à gauche de la hotte : un ficus dans son pot blanc à bande bleue, côté coin, puis le service à thé japonais (une théière
 * crème à anse noire et quatre gobelets, deux rouges et deux crème).
 */
export const teaShelf = (m: FurnitureMaterials): THREE.Group => {
  const group = new THREE.Group()
  group.position.set(-0.85, 1.735, KITCHEN.zMin + 0.1)
  const cream = standard(0xeee6d2, 0.6)
  group.add(cylinder(0.075, 0.06, 0.13, m.white, -0.3, 0.065, 0), cylinder(0.077, 0.066, 0.04, standard(0x3f7fb5, 0.7), -0.3, 0.03, 0))
  const leaves = seeded(19)
  for (let leaf = 0; leaf < 14; leaf += 1) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.05 + leaves() * 0.03, 8, 6), m.plant)
    ball.position.set(-0.3 + (leaves() - 0.5) * 0.24, 0.2 + leaves() * 0.2, (leaves() - 0.5) * 0.12)
    group.add(ball)
  }
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), cream)
  pot.scale.y = 0.85
  pot.position.set(0.2, 0.065, 0)
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.005, 6, 20, Math.PI), m.black)
  handle.position.set(0.2, 0.1, 0)
  group.add(pot, handle, cylinder(0.012, 0.016, 0.05, cream, 0.12, 0.09, 0), cylinder(0.02, 0.02, 0.015, cream, 0.2, 0.135, 0))
  const cups: [number, number, THREE.Material][] = [
    [0.03, -0.02, cream],
    [0.08, 0.04, m.red],
    [0.33, 0.04, m.red],
    [0.39, -0.02, cream],
  ]
  for (const [x, z, material] of cups) group.add(cylinder(0.03, 0.026, 0.07, material, x, 0.035, z))
  return group
}

/**
 * Sur l'étagère à droite de la hotte : une coupe en bois à anse (deux citrons dedans), des gobelets et de petits godets en grès, un grand plat
 * appuyé au mur et un pichet, côté coin.
 */
export const potteryShelf = (m: FurnitureMaterials): THREE.Group => {
  const group = new THREE.Group()
  group.position.set(0.75, 1.735, KITCHEN.zMin + 0.1)
  const stone = standard(0xd9c9a8, 0.8)
  const glaze = standard(0xc98a4a, 0.8)
  group.add(cylinder(0.15, 0.11, 0.07, m.woodOld, -0.36, 0.035, 0), box(0.04, 0.2, 0.04, m.woodDark, -0.36, 0.14, 0))
  for (const side of [-1, 1]) {
    const lemon = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), standard(0xe8c63a, 0.7))
    lemon.position.set(-0.36 + 0.08 * side, 0.08, 0.01)
    group.add(lemon)
  }
  for (const [index, x] of [-0.12, -0.02, 0.06, 0.16, 0.27].entries()) {
    group.add(cylinder(0.035, 0.022, 0.07, index % 2 === 0 ? stone : glaze, x, 0.055, -0.02), cylinder(0.02, 0.025, 0.02, stone, x, 0.01, -0.02))
  }
  for (const x of [-0.13, -0.04, 0, 0.04]) group.add(cylinder(0.018, 0.014, 0.035, glaze, x, 0.018, 0.05))
  const plate = cylinder(0.13, 0.13, 0.012, stone, 0.34, 0.135, -0.07, 24)
  plate.rotation.x = Math.PI / 2 - 0.15
  const ring = cylinder(0.07, 0.07, 0.014, glaze, 0.34, 0.135, -0.069, 24)
  ring.rotation.x = Math.PI / 2 - 0.15
  const jug = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), stone)
  jug.position.set(0.46, 0.06, 0)
  group.add(plate, ring, jug, cylinder(0.03, 0.04, 0.07, stone, 0.46, 0.13, 0), cylinder(0.061, 0.061, 0.02, glaze, 0.46, 0.05, 0))
  return group
}

/** La gravure encadrée au-dessus du buffet, et le puzzle encadré de chêne (une boutique de fleurs) sur le mur plein du bar, côté cuisine. */
export const frames = (m: FurnitureMaterials): THREE.Group => {
  const group = new THREE.Group()
  const { x, y, z, width, height } = LAYOUT.puzzle
  group.add(box(0.02, height, width, m.woodLight, x + 0.01, y, z))
  // L'image du puzzle : sa photo (`public/kitchen3d/puzzle.jpg`), collée sur un plan qui regarde la cuisine.
  const picture = photoTexture('puzzle.jpg')
  const image = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.08, height - 0.08), new THREE.MeshStandardMaterial({ map: picture, roughness: 0.75 }))
  image.rotation.y = Math.PI / 2
  image.position.set(x + 0.022, y, z)
  group.add(image)
  // Sur le mur plein du bar, côté salon : un puzzle sans bords collé à même le mur (la mer : ciel rose, vagues bleues, fonds sombres, coraux),
  // au contour en dents irrégulières.
  const seaX = SHELL.salonX - 0.003
  // Sa photo détourée (`public/kitchen3d/sea.png`, le mur rendu transparent) sur un plan qui regarde le salon.
  const sea = { y: 1.38, z: -0.7, width: 0.9, height: 0.66 }
  const seaPicture = photoTexture('sea.png')
  const seaImage = new THREE.Mesh(new THREE.PlaneGeometry(sea.width, sea.height), new THREE.MeshStandardMaterial({ map: seaPicture, roughness: 0.8, alphaTest: 0.5 }))
  seaImage.rotation.y = -Math.PI / 2
  seaImage.position.set(seaX, sea.y, sea.z)
  group.add(seaImage)
  // Sur le petit bout de mur de l'entrée (le dos du retour de mur du frigo) : une affiche ancienne sur fond vert, dans un cadre de bois sombre.
  const letterX = SHELL.salonX
  const letterZ = SHELL.entryBack - 0.3
  group.add(box(0.02, 0.58, 0.44, m.woodDark, letterX - 0.01, 1.5, letterZ))
  group.add(box(0.004, 0.53, 0.39, standard(0x9fae8a, 0.8), letterX - 0.022, 1.5, letterZ))
  group.add(box(0.004, 0.47, 0.33, standard(0xe6dcc0, 0.9), letterX - 0.025, 1.5, letterZ))
  for (const side of [-1, 1]) group.add(box(0.002, 0.3, 0.13, standard(0x6f6a5c, 0.9), letterX - 0.028, 1.5, letterZ + 0.075 * side))
  // Dans la cuisine, à droite de la grande fenêtre : une petite aquarelle de bord de mer, passe-partout blanc et large cadre gris.
  const shoreZ = (NOOK_WINDOW.z + NOOK_WINDOW.width / 2 + KITCHEN.zMax) / 2
  group.add(box(0.02, 0.33, 0.4, m.frame, ROOM.xMax - 0.01, 1.6, shoreZ))
  // Sa photo, cadre compris (`public/kitchen3d/shore.jpg`), sur la face du cadre.
  const shore = photoTexture('shore.jpg')
  const shoreImage = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.33), new THREE.MeshStandardMaterial({ map: shore, roughness: 0.7 }))
  shoreImage.rotation.y = -Math.PI / 2
  shoreImage.position.set(ROOM.xMax - 0.0205, 1.6, shoreZ)
  group.add(shoreImage)
  // Sur la bande de bois du rebord, devant le mur plein côté cuisine : la rangée de pots à épices en inox. Et sur le bout du mur plein,
  // face au bar : le petit cadre de bois clair aux vaches.
  const spiceX = KITCHEN.xMin + PARTITION.ledge / 2
  const steel = standard(0xb9bcc0, 0.35, 0.7)
  for (let jar = 0; jar < 17; jar += 1) group.add(cylinder(0.022, 0.022, 0.09, steel, spiceX, PARTITION.height + 0.085, KITCHEN.zMin + 0.12 + jar * 0.055, 10))
  const endZ = SHELL.barStart
  const cowX = SHELL.wallX
  // Sa planche des races de vaches : la photo redressée (`public/kitchen3d/cows.jpg`).
  group.add(box(0.16, 0.21, 0.015, m.woodLight, cowX, 1.5, endZ + 0.008))
  const cows = photoTexture('cows.jpg')
  const cowImage = new THREE.Mesh(new THREE.PlaneGeometry(0.115, 0.161), new THREE.MeshStandardMaterial({ map: cows, roughness: 0.7 }))
  cowImage.position.set(cowX, 1.5, endZ + 0.0165)
  group.add(cowImage)
  // Au-dessus du buffet : un cadre de chêne, un grand passe-partout blanc et la gravure d'une ville vue du ciel, en touches violettes et roses.
  const wallX = ROOM.xMin
  const print = { y: 1.55, z: LAYOUT.sideboard.z, width: 0.9, height: 0.6 }
  group.add(box(0.02, print.height, print.width, m.woodLight, wallX + 0.01, print.y, print.z))
  // Sa photo (`public/kitchen3d/city.jpg`) : le passe-partout et la gravure, dans le cadre.
  const city = photoTexture('city.jpg')
  const cityImage = new THREE.Mesh(new THREE.PlaneGeometry(print.width - 0.05, print.height - 0.05), new THREE.MeshStandardMaterial({ map: city, roughness: 0.7 }))
  cityImage.rotation.y = Math.PI / 2
  cityImage.position.set(wallX + 0.021, print.y, print.z)
  group.add(cityImage)
  return group
}
