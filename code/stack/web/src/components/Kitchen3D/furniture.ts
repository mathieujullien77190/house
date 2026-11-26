import * as THREE from 'three'
import { ENTRY, KITCHEN, LAYOUT, NICHES, NOOK_WINDOW, ROOM } from './constants'
import { buildLibrary } from './library'
import { box, cylinder, fixtureBulb, seeded, standard } from './primitives'

/** Les matériaux des meubles et du décor (hors cuisine), créés une fois par scène. */
const materialsOf = () => ({
  sofa: standard(0x4a3128, 0.95),
  red: standard(0xb3262a, 0.9),
  orange: standard(0xe39030, 0.9),
  throwRug: standard(0xb9a98f, 1),
  metal: standard(0x1a1c1f, 0.45, 0.7),
  woodOld: standard(0x7b4a2a, 0.55),
  woodDark: standard(0x4a2c18, 0.6),
  woodLight: standard(0xc08a4a, 0.6),
  leather: standard(0x6b3a22, 0.5),
  wicker: standard(0xcaa46a, 0.9, 0, THREE.DoubleSide),
  wickerDark: standard(0x2a2118, 0.9),
  chairOrange: standard(0xd9822b, 0.85),
  chairBlue: standard(0x24385c, 0.85),
  curtain: standard(0x1b2848, 0.95),
  sheer: new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 1, side: THREE.DoubleSide }),
  white: standard(0xf4f4f1, 0.6),
  black: standard(0x15171a, 0.45, 0.3),
  glass: new THREE.MeshStandardMaterial({ color: 0xb8cfe4, roughness: 0.1, transparent: true, opacity: 0.4 }),
  shutter: standard(0xdfe3e6, 0.6),
  screen: new THREE.MeshBasicMaterial({ color: 0x2f5f94 }),
  tvScreen: new THREE.MeshBasicMaterial({ color: 0x4f8cbc }),
  lampRed: new THREE.MeshBasicMaterial({ color: 0xff7a66 }),
  bulb: new THREE.MeshBasicMaterial({ color: 0xffe2b0 }),
  rug: standard(0xd6d6d2, 1),
  crate: standard(0x8a8378, 0.9),
  clock: standard(0xf2ede0, 0.6),
  wire: new THREE.MeshBasicMaterial({ color: 0x15171a, wireframe: true }),
  frame: standard(0x8d8794, 0.7),
  art: standard(0xd9c6a0, 0.8),
  puzzle: standard(0x3b4a8c, 0.8),
  flowers: standard(0xb1423a, 0.8),
  plant: standard(0x3d6b3a, 0.8),
  magnet: standard(0xe0a23c, 0.7),
})

type Materials = ReturnType<typeof materialsOf>

/** Tourne un groupe pour que son devant (+z) regarde dans la direction (dx, dz). */
const facing = (group: THREE.Group, dx: number, dz: number): THREE.Group => {
  group.rotation.y = Math.atan2(dx, dz)
  return group
}

/** Un canapé d'angle marron : le corps de 2,4 m (dossier, accoudoirs, deux assises), une méridienne côté baies, des coussins rouge et orange. Il regarde l'ouest (la télé). */
const sofa = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const width = 2.4
  group.add(box(width, 0.42, 0.95, m.sofa, 0, 0.21, 0))
  group.add(box(width, 0.45, 0.25, m.sofa, 0, 0.64, -0.35))
  for (const side of [-1, 1]) group.add(box(0.22, 0.3, 0.95, m.sofa, (width / 2 - 0.11) * side, 0.57, 0))
  for (const side of [-1, 1]) {
    group.add(box(width / 2 - 0.2, 0.14, 0.7, m.sofa, (width / 4) * side, 0.49, 0.1))
    group.add(box(width / 2 - 0.22, 0.4, 0.2, m.sofa, (width / 4) * side, 0.76, -0.2))
  }
  // La méridienne : un bloc de plus devant, côté ouest (le côté +x de ce repère, tourné vers le nord).
  const chaiseX = width / 2 - 0.475
  group.add(box(0.95, 0.42, 1.05, m.sofa, chaiseX, 0.21, 1))
  group.add(box(0.85, 0.14, 0.95, m.sofa, chaiseX, 0.49, 1))
  group.add(box(0.7, 0.2, 0.4, m.red, chaiseX - 0.1, 0.66, 0.7).rotateY(0.3))
  group.add(box(0.5, 0.18, 0.4, m.orange, -width / 2 + 0.4, 0.66, -0.1).rotateY(-0.2))
  group.add(box(1.1, 0.04, 0.6, m.throwRug, 0.1, 0.58, 0.2).rotateY(0.1))
  return group
}

/** La table basse : un plateau de vieux bois dans un cadre d'acier, et une étagère en bas. */
const coffeeTable = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  group.add(box(1.3, 0.05, 0.6, m.woodOld, 0, 0.42, 0))
  group.add(box(1.3, 0.03, 0.04, m.metal, 0, 0.4, 0.3))
  group.add(box(1.3, 0.03, 0.04, m.metal, 0, 0.4, -0.3))
  group.add(box(1.14, 0.03, 0.46, m.woodDark, 0, 0.14, 0))
  for (const x of [-0.6, 0.6]) for (const z of [-0.26, 0.26]) group.add(box(0.04, 0.4, 0.04, m.metal, x, 0.2, z))
  return group
}

/** Le fauteuil en cuir cloué sur une structure en bois courbe. Il regarde le sud. */
const armchair = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  group.add(box(0.62, 0.12, 0.6, m.leather, 0, 0.42, 0))
  group.add(box(0.62, 0.5, 0.1, m.leather, 0, 0.72, -0.26))
  for (const side of [-1, 1]) {
    group.add(box(0.07, 0.07, 0.62, m.woodDark, 0.33 * side, 0.62, 0))
    group.add(box(0.07, 0.4, 0.07, m.woodDark, 0.33 * side, 0.4, 0.27))
    group.add(box(0.07, 0.4, 0.07, m.woodDark, 0.33 * side, 0.2, -0.27))
  }
  return group
}

/** La télé au mur, son meuble bas en métal vieilli à portes vitrées, le pouf tressé, un cadre posé au sol et un tabouret en rotin, le long du mur ouest. */
const tvCorner = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const wall = ROOM.zMin
  const { x, width } = LAYOUT.tv
  group.add(box(width, 0.7, 0.04, m.black, x, 1.4, wall + 0.04))
  group.add(box(width - 0.05, 0.65, 0.005, m.tvScreen, x, 1.4, wall + 0.065))
  const standX = x
  group.add(box(1.9, 0.05, 0.4, m.metal, standX, 0.5, wall + 0.25))
  group.add(box(1.9, 0.02, 0.4, m.metal, standX, 0.05, wall + 0.25))
  for (const side of [-1, 1]) {
    group.add(box(0.04, 0.5, 0.4, m.metal, 0.93 * side + standX, 0.27, wall + 0.25))
    group.add(box(0.7, 0.36, 0.01, m.woodDark, 0.47 * side + standX, 0.28, wall + 0.45))
  }
  group.add(box(0.04, 0.5, 0.4, m.metal, standX, 0.27, wall + 0.25))
  const pouf = cylinder(0.33, 0.35, 0.4, m.wicker, LAYOUT.pouf.x, 0.2, LAYOUT.pouf.z)
  const band = cylinder(0.345, 0.355, 0.1, m.wickerDark, LAYOUT.pouf.x, 0.15, LAYOUT.pouf.z)
  group.add(pouf, band)
  group.add(box(0.5, 0.8, 0.03, m.art, x - 0.95, 0.4, wall + 0.12).rotateX(-0.12))
  group.add(cylinder(0.2, 0.2, 0.4, m.wickerDark, x - 0.95, 0.2, wall + 0.55))
  return group
}

/** La porte blanche du mur ouest (celle du couloir, à côté de la cloison). */
const northWall = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const wall = ROOM.zMin
  const { x, width } = LAYOUT.door
  group.add(box(width + 0.1, 2.1, 0.03, m.white, x, 1.05, wall + 0.015))
  group.add(box(width, 2.05, 0.04, m.white, x, 1.025, wall + 0.04))
  group.add(box(0.1, 0.02, 0.03, m.shutter, x + width / 2 - 0.08, 1.02, wall + 0.075))
  return group
}

/** Une chaise de salle à manger : assise, dossier capitonné et quatre pieds. Elle regarde (dx, dz). */
const chair = (material: THREE.Material, m: Materials): THREE.Group => {
  const group = new THREE.Group()
  group.add(box(0.46, 0.08, 0.46, material, 0, 0.46, 0))
  group.add(box(0.46, 0.4, 0.07, material, 0, 0.72, -0.2))
  for (const x of [-0.2, 0.2]) for (const z of [-0.2, 0.2]) group.add(box(0.03, 0.44, 0.03, m.metal, x, 0.22, z))
  return group
}

/** La table ronde en bois massif sur un pied en croix noir, et ses quatre chaises (deux orange, deux bleues). */
const dining = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  group.position.set(LAYOUT.dining.x, 0, LAYOUT.dining.z)
  group.add(cylinder(0.56, 0.56, 0.05, m.woodOld, 0, 0.74, 0, 40))
  group.add(cylinder(0.06, 0.06, 0.7, m.metal, 0, 0.37, 0))
  group.add(box(1.0, 0.04, 0.05, m.metal, 0, 0.05, 0).rotateY(0.6))
  group.add(box(1.0, 0.04, 0.05, m.metal, 0, 0.05, 0).rotateY(-0.6))
  const chairs: [number, THREE.Material][] = [
    [0.5, m.chairOrange],
    [2.4, m.chairBlue],
    [3.9, m.chairOrange],
    [5.3, m.chairBlue],
  ]
  for (const [angle, material] of chairs) {
    const seat = facing(chair(material, m), -Math.sin(angle), -Math.cos(angle))
    seat.position.set(Math.sin(angle) * 0.78, 0, Math.cos(angle) * 0.78)
    group.add(seat)
  }
  return group
}

/** Un écran : un cadre noir, la dalle bleue et un pied. */
const monitor = (m: Materials, x: number): THREE.Group => {
  const group = new THREE.Group()
  group.position.set(x, 0.77, 0)
  group.add(box(0.14, 0.2, 0.05, m.black, 0, 0.1, 0))
  group.add(box(0.58, 0.34, 0.025, m.black, 0, 0.3, 0.02))
  group.add(box(0.55, 0.31, 0.005, m.screen, 0, 0.3, 0.035))
  return group
}

/** Le coin bureau contre le mur est : le plateau en bois sur deux tréteaux, deux écrans, deux lampes rouges, le fauteuil noir, le tapis gris, la clim au-dessus et le grand luminaire en fils noirs. */
const office = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const { x, z } = LAYOUT.desk
  group.position.set(x, 0, z)
  group.add(box(1.7, 0.04, 0.68, m.woodLight, 0, 0.75, 0))
  for (const side of [-1, 1]) {
    group.add(box(0.05, 0.75, 0.05, m.woodDark, 0.7 * side, 0.375, 0.28))
    group.add(box(0.05, 0.75, 0.05, m.woodDark, 0.7 * side, 0.375, -0.28))
    group.add(box(0.05, 0.05, 0.6, m.woodDark, 0.7 * side, 0.4, 0))
  }
  group.add(monitor(m, -0.4), monitor(m, 0.3))
  for (const side of [-1, 1]) group.add(fixtureBulb(cylinder(0.06, 0.07, 0.12, m.bulb, 0.75 * side, 0.83, -0.12)))
  group.add(box(1.9, 0.015, 1.4, m.rug, 0, 0.008, -0.45))
  const seat = facing(new THREE.Group(), 0, 1)
  seat.position.set(0, 0, -0.9)
  seat.add(cylinder(0.26, 0.24, 0.08, m.black, 0, 0.5, 0))
  seat.add(box(0.5, 0.45, 0.08, m.black, 0, 0.78, -0.22))
  seat.add(cylinder(0.03, 0.03, 0.4, m.metal, 0, 0.26, 0))
  group.add(seat)
  // La clim (un bloc blanc fixé au mur) et le luminaire en fils.
  group.add(box(0.95, 0.3, 0.22, m.white, 0.1, 2.05, ROOM.zMax - z - 0.12))
  group.add(box(0.8, 0.02, 0.02, m.metal, 0.1, 1.95, ROOM.zMax - z - 0.24))
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.12, 32, 1, true), m.wire)
  shade.position.set(0, 1.95, -0.7)
  group.add(shade)
  group.add(box(0.01, ROOM.height - 2, 0.01, m.black, 0, 2 + (ROOM.height - 2) / 2, -0.7))
  group.add(fixtureBulb(cylinder(0.05, 0.05, 0.08, m.bulb, 0, 1.95, -0.7)))
  return group
}

/** Une fenêtre blanche dans un mur est ou ouest, à volet roulant gris : cadre, vitre et volet à moitié descendu. Le côté qui regarde dans la pièce est donné par `dir` (+1 : vers +x). */
const windowOnWall = (m: Materials, wallX: number, dir: 1 | -1, z: number, width: number, height: number, bottom: number): THREE.Group => {
  const group = new THREE.Group()
  const bar = 0.05
  const depth = 0.07
  group.position.set(wallX + (depth / 2) * dir, bottom + height / 2, z)
  for (const side of [-1, 1]) {
    group.add(box(depth, bar, width, m.white, 0, (height / 2 - bar / 2) * side, 0))
    group.add(box(depth, height - bar * 2, bar, m.white, 0, 0, (width / 2 - bar / 2) * side))
  }
  group.add(box(depth, height - bar * 2, bar, m.white, 0, 0, 0))
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width - bar * 2, height - bar * 2), m.glass)
  glass.rotation.y = (Math.PI / 2) * dir
  group.add(glass)
  group.add(box(0.015, (height - bar * 2) * 0.55, width - bar * 2 - 0.02, m.shutter, 0.02 * dir, (height - bar * 2) * 0.225, 0))
  return group
}

/** Les baies vitrées de la façade sud : trois battants, un voilage blanc et deux rideaux bleu nuit de chaque côté. */
const patioWindows = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const z0 = ROOM.zMin + 0.8
  const length = 3
  const x = ROOM.xMin
  group.add(windowOnWall(m, x, 1, z0 + length / 2, length, 2.15, 0.05))
  group.add(box(0.01, 2.26, length + 0.2, m.sheer, x + 0.2, 1.15, z0 + length / 2))
  for (const [z, width] of [
    [z0 - 0.25, 0.55],
    [z0 + length + 0.25, 0.55],
  ] as [number, number][]) {
    group.add(box(0.1, 2.28, width, m.curtain, x + 0.2, 1.15, z))
    for (let fold = 0; fold < 4; fold += 1) group.add(box(0.02, 2.28, 0.03, m.black, x + 0.26, 1.15, z - width / 2 + 0.07 + fold * 0.13))
  }
  group.add(box(0.03, 0.03, length + 1.4, m.metal, x + 0.22, 2.31, z0 + length / 2))
  return group
}

/** Le grand luminaire en pétales de rotin au-dessus du salon, et le luminaire en verre strié du coin repas. */
const lamps = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const flower = new THREE.Group()
  flower.position.set(-3.7, 2, 0.9)
  for (let petal = 0; petal < 8; petal += 1) {
    const angle = (petal / 8) * Math.PI * 2
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), m.wicker)
    leaf.scale.set(1, 1.6, 1)
    leaf.rotation.x = Math.PI / 2 - 0.12
    const holder = new THREE.Group()
    holder.rotation.y = angle
    leaf.position.z = 0.4
    holder.add(leaf)
    flower.add(holder)
  }
  flower.add(fixtureBulb(cylinder(0.07, 0.07, 0.1, m.bulb, 0, -0.03, 0)))
  group.add(flower)
  group.add(box(0.01, ROOM.height - 2, 0.01, m.black, -3.7, 2 + (ROOM.height - 2) / 2, 0.9))
  // La suspension en verre du coin repas, avec son capuchon en bois.
  const { x: nookX, z: nookZ } = LAYOUT.bistro
  const glass = cylinder(0.1, 0.1, 0.28, m.glass, nookX - 0.3, 1.9, nookZ)
  group.add(fixtureBulb(cylinder(0.04, 0.04, 0.1, m.bulb, nookX - 0.3, 1.9, nookZ)))
  group.add(glass, cylinder(0.05, 0.05, 0.08, m.woodLight, nookX - 0.3, 2.1, nookZ), box(0.01, ROOM.height - 2.14, 0.01, m.black, nookX - 0.3, 2.14 + (ROOM.height - 2.14) / 2, nookZ))
  // Les deux ampoules suspendues au-dessus de la cloison de bar.
  for (const z of [0.4, 1]) {
    group.add(box(0.01, ROOM.height - 2, 0.01, m.black, KITCHEN.xMin - 0.09, 2 + (ROOM.height - 2) / 2, z), fixtureBulb(cylinder(0.06, 0.06, 0.14, m.bulb, KITCHEN.xMin - 0.09, 1.95, z)))
  }
  return group
}

/**
 * Le bout est de la cuisine : la petite table de bistrot à pied en fonte et sa chaise sous la fenêtre, puis, sur le mur de l'escalier, le frigo
 * noir plein d'aimants (posé devant le mur, calé contre le retour de mur), l'horloge, le cellier (une niche encadrée de bois, à étagères et
 * bocaux) et la niche du comptoir à verres.
 */
const nook = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const { x, z } = LAYOUT.bistro
  group.add(box(0.72, 0.04, 0.72, m.woodOld, x, 0.74, z))
  group.add(box(0.5, 0.005, 0.5, m.rug, x, 0.762, z))
  group.add(cylinder(0.04, 0.05, 0.7, m.metal, x, 0.37, z))
  for (const angle of [0, 2.1, 4.2]) group.add(box(0.4, 0.04, 0.04, m.metal, x + Math.cos(angle) * 0.18, 0.03, z + Math.sin(angle) * 0.18).rotateY(-angle))
  const seat = facing(chair(m.woodDark, m), 0, -1)
  seat.position.set(x, 0, z + 0.6)
  group.add(seat)

  const wallZ = KITCHEN.zMax
  const rand = seeded(33)
  for (const niche of NICHES) {
    // L'encadrement en bois de l'ouverture : deux montants et un linteau.
    for (const side of [-1, 1]) group.add(box(0.03, niche.height, 0.04, m.woodLight, niche.x + (niche.width / 2 - 0.015) * side, niche.height / 2, wallZ))
    group.add(box(niche.width, 0.03, 0.04, m.woodLight, niche.x, niche.height - 0.015, wallZ))
    const middle = wallZ + niche.depth / 2
    if (niche.id === 'cellar') {
      // Le cellier : cinq étagères sur toute la largeur du réduit, des bocaux dessus.
      for (let shelf = 0; shelf < 5; shelf += 1) {
        const y = 0.3 + shelf * 0.36
        group.add(box(niche.inner - 0.04, 0.03, niche.depth - 0.06, m.woodLight, niche.x, y, middle))
        for (let jar = 0; jar < 4; jar += 1) {
          const tall = 0.14 + rand() * 0.08
          group.add(cylinder(0.05, 0.05, tall, standard(0x6a6a52 + Math.floor(rand() * 0x404040), 0.6), niche.x - 0.3 + jar * 0.2, y + 0.015 + tall / 2, middle - 0.08 + rand() * 0.1))
        }
      }
    } else {
      // Le comptoir à verres : un meuble bas à plateau de bois, puis deux tablettes de verres à pied.
      group.add(box(niche.inner, 1, niche.depth - 0.04, m.white, niche.x, 0.5, middle))
      group.add(box(niche.inner, 0.04, niche.depth, m.woodLight, niche.x, 1.02, middle))
      for (const y of [1.45, 1.75]) {
        group.add(box(niche.inner - 0.06, 0.025, 0.2, m.woodLight, niche.x, y, wallZ + niche.depth - 0.12))
        for (let glass = 0; glass < 4; glass += 1) group.add(cylinder(0.035, 0.02, 0.12, m.glass, niche.x - 0.3 + glass * 0.2, y + 0.075, wallZ + niche.depth - 0.12, 12))
      }
    }
  }

  // Le frigo noir : sa façade (vers la cuisine) couverte d'aimants colorés, et l'horloge ronde au-dessus.
  const fridge = new THREE.Group()
  fridge.position.set(LAYOUT.fridge.x, 0, wallZ - 0.33)
  fridge.rotation.y = -Math.PI / 2
  fridge.add(box(0.6, 1.85, 0.65, m.black, 0, 0.925, 0))
  fridge.add(box(0.6, 0.015, 0.64, m.metal, 0, 0.62, 0))
  const magnets = seeded(44)
  for (let index = 0; index < 18; index += 1) {
    const color = [0xe0a23c, 0xc23b2f, 0x2f7ac2, 0xf2ede0][Math.floor(magnets() * 4)]
    fridge.add(box(0.005, 0.06 + magnets() * 0.04, 0.06 + magnets() * 0.04, standard(color, 0.7), -0.303, 0.8 + magnets() * 0.95, -0.24 + magnets() * 0.48))
  }
  group.add(fridge)
  const clock = cylinder(0.2, 0.2, 0.03, m.clock, LAYOUT.fridge.x + 0.15, 2.12, wallZ - 0.02)
  clock.rotation.x = Math.PI / 2
  group.add(clock)
  group.add(windowOnWall(m, ROOM.xMax, -1, NOOK_WINDOW.z, NOOK_WINDOW.width, NOOK_WINDOW.height, NOOK_WINDOW.bottom))
  return group
}

/**
 * L'entrée : la porte blanche au fond de la petite pièce et son paillasson, la suspension en rotin, le poteau de chêne, le passage ouvert,
 * puis le muret bas coiffé de bois qui porte le claustra en lames de chêne jusqu'au mur.
 */
const entry = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const { x, postZ, claustraZ, wallZ, doorZ, doorX, doorWidth, doorHeight, northX, muret } = ENTRY
  group.add(box(doorWidth, doorHeight, 0.05, m.white, doorX, doorHeight / 2, doorZ - 0.03))
  group.add(box(0.06, 0.03, 0.04, m.metal, doorX - doorWidth / 2 + 0.1, 1.02, doorZ - 0.07))
  group.add(box(0.8, 0.012, 0.5, m.black, doorX, 0.006, doorZ - 0.4))
  // La suspension de l'entrée : un abat-jour conique en rotin au bout de son câble.
  const lampX = (x + northX) / 2
  const lampZ = (KITCHEN.zMax + doorZ) / 2
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.2, 24, 1, true), m.wicker)
  shade.position.set(lampX, 2, lampZ)
  group.add(shade, box(0.01, ROOM.height - 2.1, 0.01, m.black, lampX, 2.1 + (ROOM.height - 2.1) / 2, lampZ), fixtureBulb(cylinder(0.05, 0.05, 0.09, m.bulb, lampX, 1.93, lampZ)))
  group.add(box(0.1, ROOM.height, 0.1, m.woodLight, x, ROOM.height / 2, postZ))
  // Du poteau au début du claustra, rien : le passage est ouvert.
  const length = wallZ - claustraZ
  group.add(box(0.12, muret, length, m.white, x, muret / 2, claustraZ + length / 2))
  group.add(box(0.14, 0.02, length, m.woodLight, x, muret + 0.01, claustraZ + length / 2))
  const slats = 13
  const top = ROOM.height - 0.12
  for (let slat = 0; slat < slats; slat += 1) group.add(box(0.08, top - muret - 0.02, 0.02, m.woodLight, x, (top + muret + 0.02) / 2, claustraZ + 0.03 + (slat * (length - 0.06)) / (slats - 1)))
  return group
}

/** Le tableau encadré au mur de la cuisine, à côté de la fenêtre du coin repas. */
const frames = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  group.add(box(0.01, 0.4, 0.5, m.frame, ROOM.xMax - 0.01, 1.7, 3.1))
  group.add(box(0.01, 0.3, 0.4, m.art, ROOM.xMax - 0.02, 1.7, 3.1))
  group.add(box(0.01, 0.7, 0.5, m.frame, ROOM.xMin + 0.01, 1.5, 3.3))
  return group
}

/** Tout le mobilier et le décor hors cuisine : le séjour, la salle à manger, le bureau, le coin repas et l'entrée. */
export const buildFurniture = (): THREE.Group => {
  const m = materialsOf()
  const root = new THREE.Group()
  const livingSofa = facing(sofa(m), 0, -1)
  livingSofa.position.set(LAYOUT.sofa.x, 0, LAYOUT.sofa.z)
  const table = coffeeTable(m)
  table.position.set(LAYOUT.coffee.x, 0, LAYOUT.coffee.z)
  const seat = facing(armchair(m), -1, 0)
  seat.position.set(LAYOUT.armchair.x, 0, LAYOUT.armchair.z)
  root.add(livingSofa, table, seat, tvCorner(m), northWall(m), dining(m), office(m), buildLibrary(), patioWindows(m), lamps(m), nook(m), entry(m), frames(m))
  root.add(windowOnWall(m, ROOM.xMin, 1, LAYOUT.libraryWindow.z, 1, 1.1, 1.05))
  return root
}
