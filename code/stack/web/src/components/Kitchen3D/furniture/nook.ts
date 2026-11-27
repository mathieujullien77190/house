import * as THREE from 'three'
import { KITCHEN, LAYOUT, NICHES, NOOK_WINDOW, RECESS, ROOM } from '@/components/Kitchen3D/constants'
import { oldBrass } from '@/components/Kitchen3D/materials'
import type { FurnitureMaterials } from '@/components/Kitchen3D/materials'
import { box, cylinder, facing, seeded, standard } from '@/components/Kitchen3D/primitives'
import { clockDialTexture } from '@/components/Kitchen3D/textures'
import { strawChair } from './dining'
import { windowOnWall } from './windows'

/** Une niche du mur de l'escalier. */
type Niche = (typeof NICHES)[number]

/** La petite table de bistrot à pied en fonte, ses deux sets de table et ses deux chaises paillées, sous la fenêtre. */
const bistro = (group: THREE.Group, m: FurnitureMaterials): void => {
  const { x, z } = LAYOUT.bistro
  group.add(box(0.72, 0.04, 0.72, m.woodOld, x, 0.74, z))
  group.add(cylinder(0.04, 0.05, 0.7, m.metal, x, 0.37, z))
  for (const angle of [0, 2.1, 4.2]) group.add(box(0.4, 0.04, 0.04, m.metal, x + Math.cos(angle) * 0.18, 0.03, z + Math.sin(angle) * 0.18).rotateY(-angle))
  // Deux sets de table gris, un devant chaque chaise.
  for (const side of [-1, 1]) group.add(box(0.28, 0.004, 0.4, standard(0x8c9096, 0.9), x + side * 0.19, 0.762, z))
  const seat = facing(strawChair(m), 1, 0)
  seat.position.set(x - 0.6, 0, z)
  const second = facing(strawChair(m), -1, 0)
  second.position.set(x + 0.6, 0, z)
  group.add(seat, second)
}

/** Le cellier : une niche encadrée de bois, à étagères et bocaux. */
const cellar = (group: THREE.Group, m: FurnitureMaterials, niche: Niche): void => {
  const wallZ = KITCHEN.zMax
  const middle = wallZ + niche.depth / 2
  const rand = seeded(33)
  // L'encadrement en bois de l'ouverture : deux montants et un linteau.
  for (const side of [-1, 1]) group.add(box(0.03, niche.height, 0.04, m.woodLight, niche.x + (niche.width / 2 - 0.015) * side, niche.height / 2, wallZ))
  group.add(box(niche.width, 0.03, 0.04, m.woodLight, niche.x, niche.height - 0.015, wallZ))
  // Le cellier : cinq niveaux d'étagères en U (le fond et les deux joues), blanches à chant de chêne, chargées de bocaux à couvercle
  // d'inox, de boîtes et de bouteilles ; une caisse au sol, et les oiseaux en fil de fer au-dessus de l'ouverture.
  const deep = 0.2
  const back = wallZ + niche.depth
  const lid = standard(0xb9bcc0, 0.4, 0.6)
  const tints = [0xd9c9a0, 0xe6dcc0, 0xc98a4a, 0x7a5a3a, 0xf2ede0, 0xc23b2f, 0x3f8f4a]
  // Le fond et les deux joues sont en lambris blanc, à lames verticales.
  for (let line = 1; line < 10; line += 1) group.add(box(0.003, niche.height, 0.003, m.shutter, niche.x - niche.inner / 2 + line * (niche.inner / 10), niche.height / 2, back - 0.002))
  for (const side of [-1, 1]) for (let line = 1; line < 6; line += 1) group.add(box(0.003, niche.height, 0.003, m.shutter, niche.x + (niche.inner / 2 - 0.002) * side, niche.height / 2, wallZ + line * (niche.depth / 6)))
  // Les bras des étagères s'arrêtent en retrait du mur : rien ne dépasse de l'ouverture.
  const inset = 0.06
  // Leur largeur : celle du renfoncement derrière le montant de l'ouverture, pas plus (elles ne dépassent pas dans le passage).
  const arm = (niche.inner - niche.width) / 2
  for (let level = 0; level < 5; level += 1) {
    const y = 0.42 + level * 0.36
    // Le fond du U, puis ses deux bras le long des joues ; chacun a son chant de chêne côté intérieur.
    group.add(box(niche.inner, 0.025, deep, m.white, niche.x, y, back - deep / 2), box(niche.inner - arm * 2, 0.04, 0.015, m.woodLight, niche.x, y, back - deep))
    for (const side of [-1, 1]) {
      const armX = niche.x + (niche.inner / 2 - arm / 2) * side
      group.add(box(arm, 0.025, niche.depth - deep - inset, m.white, armX, y, wallZ + inset + (niche.depth - deep - inset) / 2))
      group.add(box(0.015, 0.04, niche.depth - deep - inset, m.woodLight, armX - (arm / 2) * side, y, wallZ + inset + (niche.depth - deep - inset) / 2))
    }
    // Sur le fond : des bocaux et des boîtes ; sur chaque bras : un bocal ou deux.
    for (let item = 0; item < 5; item += 1) {
      const tall = 0.12 + rand() * 0.1
      const itemX = niche.x - niche.inner / 2 + 0.12 + item * ((niche.inner - 0.24) / 4)
      const tint = standard(tints[Math.floor(rand() * tints.length)], 0.6)
      if (rand() < 0.35) group.add(box(0.07, tall + 0.04, 0.05, tint, itemX, y + 0.0125 + (tall + 0.04) / 2, back - 0.1))
      else group.add(cylinder(0.045, 0.045, tall, tint, itemX, y + 0.0125 + tall / 2, back - 0.1), cylinder(0.047, 0.047, 0.015, lid, itemX, y + 0.02 + tall, back - 0.1))
    }
    for (const side of [-1, 1]) {
      const tall = 0.1 + rand() * 0.1
      group.add(cylinder(0.035, 0.035, tall, standard(tints[Math.floor(rand() * tints.length)], 0.6), niche.x + (niche.inner / 2 - arm / 2) * side, y + 0.0125 + tall / 2, wallZ + 0.2))
    }
  }
  group.add(box(0.5, 0.25, 0.3, m.glass, niche.x, 0.125, middle))
  group.add(box(0.7, 0.006, 0.006, m.black, niche.x + 0.05, niche.height + 0.12, wallZ - 0.01).rotateZ(-0.12))
  for (let bird = 0; bird < 4; bird += 1) {
    const body = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.004, 5, 14), m.black)
    body.scale.y = 1.6
    body.position.set(niche.x - 0.2 + bird * 0.15, niche.height + 0.2 - bird * 0.018, wallZ - 0.01)
    group.add(body)
  }
}

/** La niche du comptoir à verres. */
const glassNiche = (group: THREE.Group, m: FurnitureMaterials, niche: Niche): void => {
  const wallZ = KITCHEN.zMax
  const middle = wallZ + niche.depth / 2
  // La niche à verres, vue de la cuisine (la gauche est côté +x) : un plan de chêne qui dépasse du mur, un fond de lambris blanc à lames
  // horizontales, le robinet de laiton ; à gauche le plateau de bois (boîte en fer ouverte, bocal dépoli, machine à café noire), à droite
  // le set noir (boîte à thé haute, bocal de capsules, pot noir, tasses). Au-dessus, deux tablettes de chêne sur équerres noires : verres
  // à pied, bocal dépoli et dessous-de-plat en bas ; verres retournés et carafe en haut. Un spot au plafond ; dessous, le cadre du casier carré.
  const back = wallZ + niche.depth
  const top = niche.bottom + 0.02
  const brass = oldBrass()
  const frosted = new THREE.MeshStandardMaterial({ color: 0xe8eef0, roughness: 0.6, transparent: true, opacity: 0.55 })
  const steelGrey = standard(0xb9bcc0, 0.35, 0.7)
  group.add(box(niche.width + 0.02, 0.04, niche.depth + 0.04, m.woodLight, niche.x, niche.bottom, middle - 0.02))
  for (let line = 1; line < 11; line += 1) group.add(box(niche.inner, 0.003, 0.003, m.shutter, niche.x, niche.bottom + line * 0.095, back - 0.002))
  group.add(cylinder(0.011, 0.011, 0.05, brass, niche.x + 0.1, niche.bottom + 0.42, back - 0.025).rotateX(Math.PI / 2), cylinder(0.012, 0.009, 0.06, brass, niche.x + 0.1, niche.bottom + 0.385, back - 0.05), box(0.045, 0.008, 0.012, brass, niche.x + 0.1, niche.bottom + 0.45, back - 0.04))
  // À gauche : le plateau et ce qu'il porte.
  const trayX = niche.x + 0.21
  const trayZ = middle + 0.03
  group.add(box(0.36, 0.02, 0.26, m.woodOld, trayX, top + 0.01, trayZ))
  for (const side of [-1, 1]) group.add(box(0.36, 0.035, 0.012, m.woodOld, trayX, top + 0.027, trayZ + side * 0.124))
  group.add(box(0.15, 0.05, 0.11, steelGrey, trayX + 0.08, top + 0.045, trayZ - 0.02))
  const tinLid = box(0.15, 0.11, 0.006, steelGrey, trayX + 0.08, top + 0.12, trayZ + 0.045)
  tinLid.rotation.x = 0.25
  group.add(tinLid, cylinder(0.035, 0.035, 0.17, frosted, trayX - 0.03, top + 0.105, trayZ + 0.07), cylinder(0.036, 0.036, 0.012, m.black, trayX - 0.03, top + 0.196, trayZ + 0.07))
  group.add(box(0.11, 0.23, 0.2, m.black, trayX - 0.12, top + 0.135, trayZ + 0.02), box(0.11, 0.05, 0.08, m.black, trayX - 0.12, top + 0.2, trayZ - 0.12), box(0.1, 0.012, 0.09, steelGrey, trayX - 0.12, top + 0.03, trayZ - 0.12))
  // À droite : le set noir, la boîte à thé, le bocal, le pot noir et les tasses.
  const matX = niche.x - 0.2
  group.add(box(0.36, 0.003, 0.3, standard(0x2a2c30, 0.9), matX, top + 0.0015, middle - 0.05))
  group.add(cylinder(0.045, 0.045, 0.3, m.black, matX + 0.04, top + 0.15, back - 0.08), cylinder(0.042, 0.042, 0.11, frosted, matX + 0.1, top + 0.058, middle + 0.02), cylinder(0.043, 0.043, 0.012, steelGrey, matX + 0.1, top + 0.118, middle + 0.02))
  group.add(cylinder(0.04, 0.04, 0.06, m.black, matX + 0.16, top + 0.03, middle + 0.06))
  const cups: [number, number, number, number, number][] = [
    [0.08, -0.06, 0.032, 0.06, 0xf0e8d8],
    [-0.03, 0, 0.042, 0.1, 0xb8402c],
    [-0.02, 0.09, 0.03, 0.055, 0x4a2622],
    [-0.06, -0.1, 0.03, 0.06, 0x5a2a26],
  ]
  for (const [dx, dz, radius, tall, tint] of cups) group.add(cylinder(radius, radius * 0.85, tall, standard(tint, 0.5), matX + dx, top + tall / 2 + 0.003, middle + dz), box(0.008, tall * 0.55, 0.02, standard(tint, 0.5), matX + dx - radius - 0.006, top + tall / 2, middle + dz))
  // Les deux tablettes et leurs équerres.
  const shelfZ = back - 0.1
  for (const [level, y] of [1.6, 1.88].entries()) {
    group.add(box(niche.inner - 0.04, 0.03, 0.2, m.woodLight, niche.x, y, shelfZ))
    for (const side of [-1, 1]) group.add(box(0.018, 0.09, 0.012, m.black, niche.x + 0.22 * side, y - 0.06, back - 0.008), box(0.018, 0.01, 0.16, m.black, niche.x + 0.22 * side, y - 0.02, shelfZ))
    const on = y + 0.015
    if (level === 0) {
      for (const offset of [0.32, 0.17, 0.02]) group.add(cylinder(0.03, 0.03, 0.004, m.glass, niche.x + offset, on + 0.002, shelfZ, 14), cylinder(0.004, 0.004, 0.09, m.glass, niche.x + offset, on + 0.047, shelfZ, 8), cylinder(0.04, 0.02, 0.1, m.glass, niche.x + offset, on + 0.14, shelfZ, 14))
      group.add(cylinder(0.045, 0.045, 0.13, frosted, niche.x - 0.3, on + 0.065, shelfZ, 14), cylinder(0.046, 0.046, 0.012, steelGrey, niche.x - 0.3, on + 0.136, shelfZ, 14), cylinder(0.04, 0.04, 0.012, steelGrey, niche.x - 0.17, on + 0.006, shelfZ + 0.02, 14))
    } else {
      for (let glass = 0; glass < 4; glass += 1) for (const row of [-0.04, 0.04]) group.add(cylinder(0.03, 0.036, 0.075, m.glass, niche.x + 0.33 - glass * 0.08, on + 0.0375, shelfZ + row, 12))
      for (let stack = 0; stack < 3; stack += 1) group.add(cylinder(0.032, 0.036, 0.1, m.glass, niche.x - 0.02 - stack * 0.085, on + 0.05, shelfZ, 12))
      group.add(cylinder(0.05, 0.035, 0.1, m.glass, niche.x - 0.31, on + 0.05, shelfZ, 14), cylinder(0.025, 0.05, 0.06, m.glass, niche.x - 0.31, on + 0.13, shelfZ, 14))
    }
  }
  group.add(cylinder(0.035, 0.035, 0.008, m.shutter, niche.x, niche.height - 0.004, middle - 0.04))
  const tall = RECESS.top - RECESS.bottom
  for (const side of [-1, 1]) {
    group.add(box(0.02, tall, 0.02, m.woodLight, niche.x + (RECESS.width / 2 - 0.01) * side, (RECESS.top + RECESS.bottom) / 2, wallZ))
    group.add(box(RECESS.width, 0.02, 0.02, m.woodLight, niche.x, (RECESS.top + RECESS.bottom) / 2 + (tall / 2 - 0.01) * side, wallZ))
  }
}

/** Le frigo noir, posé devant le mur et calé contre le retour de mur : sa façade (vers la cuisine) couverte d’aimants colorés. */
const fridge = (group: THREE.Group, m: FurnitureMaterials): void => {
  const wallZ = KITCHEN.zMax
  const body = new THREE.Group()
  body.position.set(LAYOUT.fridge.x, 0, wallZ + 0.25)
  body.rotation.y = -Math.PI / 2
  body.add(box(0.6, 1.85, 0.65, m.black, 0, 0.925, 0))
  body.add(box(0.6, 0.015, 0.64, m.metal, 0, 0.62, 0))
  const magnets = seeded(44)
  for (let index = 0; index < 18; index += 1) {
    const color = [0xe0a23c, 0xc23b2f, 0x2f7ac2, 0xf2ede0][Math.floor(magnets() * 4)]
    body.add(box(0.005, 0.06 + magnets() * 0.04, 0.06 + magnets() * 0.04, standard(color, 0.7), -0.303, 0.8 + magnets() * 0.95, -0.24 + magnets() * 0.48))
  }
  group.add(body)
}

/** La pendule ronde, centrée au-dessus du trou du frigo : un cerclage de bois brun, un cadran blanc et deux aiguilles noires. */
const clock = (group: THREE.Group, m: FurnitureMaterials): void => {
  const wallZ = KITCHEN.zMax
  const clockY = 2.12
  const dialBack = cylinder(0.19, 0.19, 0.03, m.clock, LAYOUT.fridge.x, clockY, wallZ - 0.02)
  dialBack.rotation.x = Math.PI / 2
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.195, 0.014, 8, 40), m.woodOld)
  rim.position.set(LAYOUT.fridge.x, clockY, wallZ - 0.03)
  group.add(dialBack, rim)
  const dial = clockDialTexture()
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.182, 48), new THREE.MeshStandardMaterial({ map: dial, roughness: 0.6 }))
  face.rotation.y = Math.PI
  face.position.set(LAYOUT.fridge.x, clockY, wallZ - 0.0355)
  group.add(face)
  // Les aiguilles tournent autour du centre du cadran ; `applyClock` (`live.ts`) les met à l'heure.
  for (const [kind, length, thick] of [['hour', 0.11, 0.009], ['minute', 0.16, 0.006]] as [string, number, number][]) {
    const hand = new THREE.Group()
    hand.position.set(LAYOUT.fridge.x, clockY, wallZ - 0.038)
    hand.userData.clockHand = kind
    hand.add(box(thick, length, 0.004, m.black, 0, length / 2 - 0.015, 0))
    group.add(hand)
  }
}

/**
 * Le bout est de la cuisine : la petite table de bistrot à pied en fonte et sa chaise sous la fenêtre, puis, sur le mur de l'escalier, le frigo
 * noir plein d'aimants (posé devant le mur, calé contre le retour de mur), l'horloge, le cellier (une niche encadrée de bois, à étagères et
 * bocaux) et la niche du comptoir à verres.
 */
export const nook = (m: FurnitureMaterials): THREE.Group => {
  const group = new THREE.Group()
  bistro(group, m)
  for (const niche of NICHES.filter((item) => item.id !== 'fridge')) {
    if (niche.id === 'cellar') cellar(group, m, niche)
    else glassNiche(group, m, niche)
  }
  fridge(group, m)
  clock(group, m)
  group.add(windowOnWall(m, ROOM.xMax, -1, NOOK_WINDOW.z, NOOK_WINDOW.width, NOOK_WINDOW.height, NOOK_WINDOW.bottom, 2, 'cuisine'))
  return group
}
