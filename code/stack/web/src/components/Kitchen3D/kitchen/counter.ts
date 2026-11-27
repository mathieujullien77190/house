import * as THREE from 'three'
import { CABINET, COUNTER_TOP, KITCHEN, PARTITION, ROOM } from '@/components/Kitchen3D/constants'
import { box, seeded, standard, woodTexture } from '@/components/Kitchen3D/primitives'

/** Où sont posés, au bout du plan de travail côté fenêtres, le four à micro-ondes, puis à sa gauche le grille-pain et la bouilloire (m). */
const MICROWAVE = { x: ROOM.xMax - 0.22, z: 1.02 }
const TOASTER_Z = MICROWAVE.z - 0.4
const KETTLE = { x: MICROWAVE.x - 0.03, z: TOASTER_Z - 0.24 }

/** Le four à micro-ondes blanc, au bout du plan de travail côté fenêtres : porte vitrée sombre et bandeau de commandes vers la cuisine. */
const microwave = (group: THREE.Group): void => {
  const ovenWhite = standard(0xf1f1ee, 0.45)
  group.add(box(0.36, 0.28, 0.48, ovenWhite, MICROWAVE.x, COUNTER_TOP + 0.15, MICROWAVE.z))
  group.add(box(0.006, 0.2, 0.3, standard(0x1c1e21, 0.15, 0.3), MICROWAVE.x - 0.183, COUNTER_TOP + 0.15, MICROWAVE.z - 0.06))
  group.add(box(0.006, 0.03, 0.07, standard(0x2a2d31, 0.4), MICROWAVE.x - 0.183, COUNTER_TOP + 0.23, MICROWAVE.z + 0.17))
  group.add(box(0.012, 0.05, 0.05, standard(0xc9cbcc, 0.4, 0.3), MICROWAVE.x - 0.186, COUNTER_TOP + 0.1, MICROWAVE.z + 0.17))
}

/** Le grille-pain chromé : deux fentes, sa grille relevée. */
const toaster = (group: THREE.Group, chrome: THREE.Material, dark: THREE.Material): void => {
  group.add(box(0.26, 0.17, 0.16, chrome, MICROWAVE.x - 0.02, COUNTER_TOP + 0.095, TOASTER_Z), box(0.24, 0.01, 0.14, dark, MICROWAVE.x - 0.02, COUNTER_TOP + 0.005, TOASTER_Z))
  for (const slot of [-1, 1]) group.add(box(0.2, 0.004, 0.028, dark, MICROWAVE.x - 0.02, COUNTER_TOP + 0.181, TOASTER_Z + slot * 0.035))
  for (const side of [-1, 1]) group.add(box(0.004, 0.07, 0.004, chrome, MICROWAVE.x - 0.02 + side * 0.09, COUNTER_TOP + 0.215, TOASTER_Z))
  group.add(box(0.19, 0.004, 0.09, chrome, MICROWAVE.x - 0.02, COUNTER_TOP + 0.25, TOASTER_Z), box(0.012, 0.03, 0.03, dark, MICROWAVE.x - 0.155, COUNTER_TOP + 0.12, TOASTER_Z))
}

/** La bouilloire rouge en poire sur son socle noir, couvercle chromé, bouton et bec. */
const kettle = (group: THREE.Group, chrome: THREE.Material, dark: THREE.Material): void => {
  const red = standard(0xa8202b, 0.3, 0.3)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.085, 0.17, 24), red)
  body.position.set(KETTLE.x, COUNTER_TOP + 0.105, KETTLE.z)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 24), dark)
  base.position.set(KETTLE.x, COUNTER_TOP + 0.01, KETTLE.z)
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.047, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), chrome)
  lid.position.set(KETTLE.x, COUNTER_TOP + 0.19, KETTLE.z)
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), dark)
  knob.position.set(KETTLE.x, COUNTER_TOP + 0.245, KETTLE.z)
  const spout = box(0.05, 0.02, 0.025, red, KETTLE.x + 0.075, COUNTER_TOP + 0.16, KETTLE.z)
  spout.rotation.z = 0.5
  group.add(body, base, lid, knob, spout)
}

/** L’anse de la bouilloire, côté cuisine : un arc noir du haut au bas du corps. */
const kettleHandle = (group: THREE.Group, dark: THREE.Material): void => {
  group.add(box(0.012, 0.13, 0.018, dark, KETTLE.x - 0.115, COUNTER_TOP + 0.11, KETTLE.z), box(0.06, 0.012, 0.018, dark, KETTLE.x - 0.085, COUNTER_TOP + 0.175, KETTLE.z), box(0.04, 0.012, 0.018, dark, KETTLE.x - 0.097, COUNTER_TOP + 0.045, KETTLE.z))
}

/** À droite de la plaque : la grande planche à découper en bois clair, à rigole, au ras du bord du plan. */
const cuttingBoard = (group: THREE.Group): void => {
  const boardX = 0.47
  const boardZ = KITCHEN.zMin + CABINET.depth - 0.2
  const boardWood = standard(woodTexture(0xd9b98a, 67), 0.75)
  group.add(box(0.46, 0.018, 0.4, boardWood, boardX, COUNTER_TOP + 0.009, boardZ))
  const groove = standard(0xb89766, 0.85)
  for (const side of [-1, 1]) group.add(box(0.008, 0.002, 0.33, groove, boardX + side * 0.2, COUNTER_TOP + 0.0185, boardZ), box(0.4, 0.002, 0.008, groove, boardX, COUNTER_TOP + 0.0185, boardZ + side * 0.165))
}

/** Dans le coin du fond, côté fenêtres : un plateau de bois carré qui porte la lavande dans son pot gris et un panier d’osier aux bananes. */
const cornerTray = (group: THREE.Group): void => {
  const { xMax } = ROOM
  const nookX = xMax - 0.24
  const nookZ = KITCHEN.zMin + 0.24
  const trayWood = standard(woodTexture(0xa87040, 83), 0.6)
  const osier = standard(0xc9a46a, 0.9)
  // Le fond est en retrait des rebords, et les rebords ne se chevauchent pas aux angles : deux faces au même endroit scintilleraient.
  group.add(box(0.36, 0.012, 0.36, trayWood, nookX, COUNTER_TOP + 0.007, nookZ))
  for (const side of [-1, 1]) group.add(box(0.38, 0.05, 0.012, trayWood, nookX, COUNTER_TOP + 0.0255, nookZ + side * 0.184), box(0.012, 0.048, 0.356, trayWood, nookX + side * 0.184, COUNTER_TOP + 0.0245, nookZ))
  const lavenderX = nookX + 0.1
  const lavenderZ = nookZ - 0.1
  const lavenderPot = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.1, 20), standard(0x6f747b, 0.8))
  lavenderPot.position.set(lavenderX, COUNTER_TOP + 0.062, lavenderZ)
  group.add(lavenderPot)
  const leafGreen = standard(0x3d6b3a, 0.8)
  const lavender = standard(0x8a6fc9, 0.8)
  const sprig = seeded(91)
  for (let stem = 0; stem < 9; stem += 1) {
    const turn = sprig() * Math.PI * 2
    const lean = 0.1 + sprig() * 0.35
    const tall = 0.14 + sprig() * 0.1
    const holder = new THREE.Group()
    holder.position.set(lavenderX, COUNTER_TOP + 0.11, lavenderZ)
    holder.rotation.set(Math.cos(turn) * lean, 0, Math.sin(turn) * lean)
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, tall, 5), leafGreen)
    stalk.position.y = tall / 2
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.02, tall * 0.7, 5), leafGreen)
    leaf.position.y = tall * 0.35
    const flower = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.07, 7), lavender)
    flower.position.y = tall + 0.03
    holder.add(stalk, leaf, flower)
    group.add(holder)
  }
  const basketX = nookX - 0.06
  const basketZ = nookZ + 0.06
  group.add(box(0.2, 0.012, 0.18, osier, basketX, COUNTER_TOP + 0.022, basketZ))
  for (const side of [-1, 1]) group.add(box(0.232, 0.07, 0.012, osier, basketX, COUNTER_TOP + 0.055, basketZ + side * 0.1), box(0.012, 0.068, 0.186, osier, basketX + side * 0.11, COUNTER_TOP + 0.054, basketZ))
  const banana = standard(0xe8c63a, 0.6)
  for (const [turn, dz] of [[0.3, -0.02], [-0.2, 0.03]]) {
    const fruit = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.12, 4, 8), banana)
    fruit.rotation.set(0, turn, Math.PI / 2)
    fruit.position.set(basketX, COUNTER_TOP + 0.05, basketZ + dz)
    group.add(fruit)
  }
}

/**
 * Le coin du plan de travail, entre le mur du bar et le mur du fond. Le long du mur du bar : le bloc à couteaux en bambou (cinq manches
 * d'inox), le présentoir incliné de douze pots à épices sur son tapis noir, puis le rouleau d'essuie-tout debout dans son plateau vert.
 * Contre le mur du fond : le pot carré en bambou des ustensiles (fouet, spatule grise, écumoire).
 */
const barCorner = (group: THREE.Group, dark: THREE.Material): void => {
  const cornerX = KITCHEN.xMin + PARTITION.ledge
  const cornerZ = KITCHEN.zMin
  const bamboo = standard(woodTexture(0xc9995a, 71), 0.6)
  const inox = standard(0xb9bcc0, 0.3, 0.8)
  group.add(box(0.3, 0.003, 0.42, dark, cornerX + 0.19, COUNTER_TOP + 0.0015, cornerZ + 0.27))
  const block = box(0.1, 0.2, 0.16, bamboo, cornerX + 0.1, COUNTER_TOP + 0.1, cornerZ + 0.11)
  block.rotation.z = 0.22
  group.add(block)
  for (let knife = 0; knife < 5; knife += 1) {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.11 - knife * 0.01, 10), inox)
    handle.position.set(cornerX + 0.07, COUNTER_TOP + 0.245 - knife * 0.008, cornerZ + 0.05 + knife * 0.03)
    handle.rotation.z = 0.22
    group.add(handle)
  }
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.09, 12), inox)
      jar.rotation.z = Math.PI / 2 + 0.35
      jar.position.set(cornerX + 0.166 - row * 0.018, COUNTER_TOP + 0.04 + row * 0.052, cornerZ + 0.2 + column * 0.052)
      group.add(jar)
    }
  }
  const trayGreen = standard(0x6f8f1e, 0.6)
  const towelZ = cornerZ + 0.62
  group.add(box(0.2, 0.012, 0.26, trayGreen, cornerX + 0.14, COUNTER_TOP + 0.006, towelZ))
  for (const side of [-1, 1]) group.add(box(0.2, 0.04, 0.01, trayGreen, cornerX + 0.14, COUNTER_TOP + 0.02, towelZ + side * 0.125), box(0.01, 0.04, 0.26, trayGreen, cornerX + 0.14 + side * 0.095, COUNTER_TOP + 0.02, towelZ))
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.23, 24), standard(0xf4f4f1, 0.95))
  roll.position.set(cornerX + 0.14, COUNTER_TOP + 0.127, towelZ)
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.232, 12), standard(0xb8946a, 0.9))
  core.position.copy(roll.position)
  group.add(roll, core)
  const potX = cornerX + 0.5
  const potZ = cornerZ + 0.11
  group.add(box(0.11, 0.14, 0.11, bamboo, potX, COUNTER_TOP + 0.07, potZ))
  const whisk = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc4c7cb, metalness: 0.8, roughness: 0.3, wireframe: true }))
  whisk.scale.y = 1.9
  whisk.position.set(potX - 0.025, COUNTER_TOP + 0.26, potZ - 0.01)
  group.add(whisk, box(0.012, 0.12, 0.012, inox, potX - 0.025, COUNTER_TOP + 0.16, potZ - 0.01))
  group.add(box(0.05, 0.07, 0.006, standard(0x4a5560, 0.6), potX + 0.025, COUNTER_TOP + 0.24, potZ), box(0.006, 0.1, 0.006, inox, potX + 0.025, COUNTER_TOP + 0.17, potZ))
  const skimmer = box(0.006, 0.2, 0.006, inox, potX + 0.07, COUNTER_TOP + 0.2, potZ + 0.01)
  skimmer.rotation.z = -0.6
  group.add(skimmer)
}

/** Tout ce qui est posé sur le plan de travail. Le chrome et le noir sont partagés d'un objet à l'autre. */
export const counterObjects = (group: THREE.Group): void => {
  const chrome = standard(0xd5d8dc, 0.15, 0.9)
  const dark = standard(0x17181b, 0.5)
  microwave(group)
  toaster(group, chrome, dark)
  kettle(group, chrome, dark)
  cuttingBoard(group)
  cornerTray(group)
  barCorner(group, dark)
  kettleHandle(group, dark)
}
