import * as THREE from 'three'
import { ENTRY, KITCHEN, LAYOUT, NICHES, NOOK_WINDOW, PARTITION, RECESS, ROOM, MATOU_WINDOW } from './constants'
import { buildLibrary } from './library'
import { buildRooms } from './rooms'
import { SCREEN_BLUE, TV_BLACK } from './live'
import { box, cylinder, fixtureBulb, seeded, standard, canvasTexture, woodTexture, bulbBall } from './primitives'

/** Les matériaux des meubles et du décor (hors cuisine), créés une fois par scène. */
const materialsOf = () => ({
  sofa: standard(0x4a3128, 0.95),
  red: standard(0xb3262a, 0.9),
  orange: standard(0xe39030, 0.9),
  throwRug: standard(0xb9a98f, 1),
  metal: standard(0x1a1c1f, 0.45, 0.7),
  woodOld: standard(woodTexture(0x91603a, 11), 0.6),
  // Le bois de la table de la salle à manger, plus clair : son plateau et ses poutres.
  tableTop: standard(woodTexture(0xb08458, 29), 0.6),
  tableBeam: standard(woodTexture(0x9c6c42, 31), 0.6),
  woodDark: standard(woodTexture(0x6b4429, 23), 0.6),
  woodLight: standard(woodTexture(0xc08a4a, 37), 0.6),
  leather: standard(0x6b3a22, 0.5),
  wicker: standard(0xcaa46a, 0.9, 0, THREE.DoubleSide),
  wickerDark: standard(0x2a2118, 0.9),
  chairOrange: standard(0xd9822b, 0.85),
  chairBlue: standard(0x24385c, 0.85),
  curtain: standard(0x1b2848, 0.95),
  sheer: new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 1, side: THREE.DoubleSide }),
  white: standard(0xf4f4f1, 0.6),
  black: standard(0x15171a, 0.45, 0.3),
  glass: new THREE.MeshStandardMaterial({ color: 0xd4e4f2, roughness: 0.05, transparent: true, opacity: 0.14 }),
  shutter: standard(0xdfe3e6, 0.6),
  // Les lames des volets : blanc cassé, un peu lumineuses d'elles-mêmes pour ne pas virer au noir quand il fait sombre dehors.
  slat: new THREE.MeshStandardMaterial({ color: 0xe6e8ea, roughness: 0.7, emissive: 0xe6e8ea, emissiveIntensity: 0.25 }),
  screen: new THREE.MeshBasicMaterial({ color: SCREEN_BLUE }),
  lampRed: new THREE.MeshBasicMaterial({ color: 0xff7a66 }),
  bulb: new THREE.MeshBasicMaterial({ color: 0xffe2b0 }),
  rug: standard(0xd6d6d2, 1),
  crate: standard(0x8a8378, 0.9),
  clock: standard(0xf2ede0, 0.6),
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

/**
 * Un plafonnier à pétales, posé sous le plafond (son origine) : une rosace noire, huit grands pétales cerclés de noir qui partent du centre
 * et retombent vers l'extérieur en se chevauchant (un sur deux un peu plus bas), l'ampoule au milieu. Les pétales sont pleins, en cannage
 * (salon), ou `wire` : vides, tendus de rayons d'acier qui partent de leur pointe (bureau).
 */
const petalLamp = (m: Materials, wire: boolean, name: string, size = 1): THREE.Group => {
  const group = new THREE.Group()
  const flower = new THREE.Group()
  flower.position.y = -0.14
  flower.scale.setScalar(size)
  for (let petal = 0; petal < 8; petal += 1) {
    const holder = new THREE.Group()
    holder.rotation.y = (petal / 8) * Math.PI * 2
    const leaf = new THREE.Group()
    leaf.scale.set(1, 1.6, 1)
    leaf.rotation.x = Math.PI / 2 + 0.22
    leaf.position.set(0, -(petal % 2) * 0.04, 0.42)
    leaf.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.008, 6, 28), m.black))
    if (wire) {
      // Les rayons : de la pointe du pétale (côté centre) vers son pourtour.
      for (let spoke = -5; spoke <= 5; spoke += 1) {
        const angle = (spoke / 5) * 2.4
        const acrossX = 0.3 * Math.sin(angle)
        const acrossY = 0.3 * Math.cos(angle) + 0.3
        const rod = box(0.004, Math.hypot(acrossX, acrossY), 0.004, m.black, acrossX / 2, acrossY / 2 - 0.3, 0)
        rod.rotation.z = Math.atan2(-acrossX, acrossY)
        leaf.add(rod)
      }
    } else {
      leaf.add(new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), m.wicker))
    }
    holder.add(leaf)
    flower.add(holder)
  }
  flower.add(fixtureBulb(bulbBall(0.055, 0, -0.12, 0), name))
  group.add(flower, cylinder(0.07, 0.07, 0.025, m.black, 0, -0.012, 0), box(0.012, 0.12, 0.012, m.black, 0, -0.08, 0))
  return group
}

/** Un canapé d'angle marron : le corps de 2,2 m (dossier, accoudoirs, deux assises), une méridienne côté baies, trois coussins de dossier, et trois coussins (deux orange, un rouge). Il regarde l'ouest (la télé). */
const sofa = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const width = 2.2
  const depth = 0.88
  // La méridienne : sa largeur, et ce dont elle dépasse devant le canapé.
  const chaise = { width: 0.75, length: 0.9 }
  group.add(box(width, 0.42, depth, m.sofa, 0, 0.21, 0))
  group.add(box(width, 0.45, 0.24, m.sofa, 0, 0.64, -depth / 2 + 0.12))
  for (const side of [-1, 1]) group.add(box(0.2, 0.3, depth, m.sofa, (width / 2 - 0.1) * side, 0.57, 0))
  // Deux places à gauche de la méridienne : chacune son coussin d'assise et son gros coussin de dossier, un peu penché en arrière.
  const chaiseX = width / 2 - chaise.width / 2
  const backCushion = (x: number, wide: number) => {
    const cushion = box(wide, 0.46, 0.2, m.sofa, x, 0.78, -0.17)
    cushion.rotation.x = -0.18
    return cushion
  }
  // Les coussins marron se touchent bord à bord, d'un accoudoir à l'autre, et débordent un peu devant l'assise.
  const seats: [number, number][] = [
    [-0.595, 0.61],
    [0.02, 0.62],
  ]
  const chaiseSeat = { x: 0.68, width: 0.7 }
  for (const [x, wide] of seats) group.add(box(wide, 0.15, 0.72, m.sofa, x, 0.495, 0.13), backCushion(x, wide))
  group.add(backCushion(chaiseSeat.x, chaiseSeat.width))
  // Les coussins : un orange contre l'accoudoir de gauche ; un orange et un rouge dans l'angle de la méridienne, appuyés au dossier.
  const pillow = (material: THREE.Material, x: number, z: number, turn: number) => {
    const holder = new THREE.Group()
    holder.position.set(x, 0.74, z)
    holder.rotation.y = turn
    const cushion = box(0.42, 0.42, 0.11, material, 0, 0, 0)
    cushion.rotation.x = -0.45
    holder.add(cushion)
    return holder
  }
  group.add(pillow(m.orange, -0.66, 0.12, 0.5), pillow(m.orange, chaiseX - 0.2, 0.02, -0.15), pillow(m.red, chaiseX + 0.1, 0.1, 0.2))
  // La méridienne : un bloc de plus devant, côté ouest (le côté +x de ce repère, tourné vers le nord).
  const chaiseZ = depth / 2 + chaise.length / 2
  group.add(box(chaise.width, 0.42, chaise.length, m.sofa, chaiseX, 0.21, chaiseZ))
  group.add(box(chaiseSeat.width, 0.15, chaise.length + 0.52, m.sofa, chaiseSeat.x, 0.495, chaiseZ - 0.19))
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

/**
 * Le fauteuil colonial, à côté du canapé : un châssis bas en bois sombre sur patins, une assise et un dossier incliné en cuir brun patiné
 * (le dossier dans son cadre de bois, deux étiquettes de voyage dessus), et deux accoudoirs cintrés qui partent du dossier et retombent en
 * boucle jusqu'au patin. Il regarde +z dans son repère.
 */
const armchair = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const sticker = standard(0x3f8f6a, 0.7)
  // L'assise et son châssis : deux patins, une ceinture basse, le coussin de cuir.
  group.add(box(0.56, 0.1, 0.56, m.leather, 0, 0.36, 0.02), box(0.6, 0.05, 0.6, m.woodDark, 0, 0.28, 0), box(0.5, 0.04, 0.04, m.woodDark, 0, 0.14, 0.28))
  for (const post of [-0.12, 0, 0.12]) group.add(box(0.025, 0.1, 0.03, m.woodDark, post, 0.2, 0.28))
  // Le dossier, incliné vers l'arrière : un cadre de bois, le cuir dedans, la traverse haute et ses étiquettes.
  const back = new THREE.Group()
  back.position.set(0, 0.4, -0.26)
  back.rotation.x = -0.28
  back.add(box(0.6, 0.56, 0.04, m.woodDark, 0, 0.28, -0.03), box(0.5, 0.42, 0.05, m.leather, 0, 0.25, 0.01), box(0.6, 0.09, 0.05, m.woodDark, 0, 0.53, 0))
  back.add(box(0.09, 0.06, 0.004, sticker, -0.14, 0.53, 0.028), box(0.07, 0.05, 0.004, sticker, 0.18, 0.54, 0.028))
  group.add(back)
  for (const side of [-1, 1]) {
    const armX = 0.33 * side
    group.add(box(0.07, 0.06, 0.66, m.woodDark, armX, 0.03, 0))
    // L'accoudoir : une lame plate du dossier vers l'avant, puis la boucle qui redescend au patin.
    group.add(box(0.07, 0.035, 0.42, m.woodDark, armX, 0.6, -0.04), box(0.06, 0.5, 0.05, m.woodDark, armX, 0.31, -0.27))
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 8, 20, Math.PI), m.woodDark)
    loop.scale.set(0.6, 1, 2.6)
    loop.rotation.set(0, Math.PI / 2, -Math.PI / 2)
    loop.position.set(armX, 0.33, 0.17)
    group.add(loop)
  }
  group.add(box(0.05, 0.004, 0.05, sticker, -0.33, 0.62, 0.12))
  return group
}

/** La télé au mur, son meuble bas en métal vieilli à portes vitrées, le pouf tressé, un cadre posé au sol et un tabouret en rotin, le long du mur ouest. */
const tvCorner = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const wall = ROOM.zMin
  const { x, width } = LAYOUT.tv
  group.add(box(width, 0.72, 0.04, m.black, x, 1.4, wall + 0.04))
  // La dalle de la télé montre aussi les caméras au clic (`live.ts`).
  const tvScreen = box(width - 0.03, 0.69, 0.005, new THREE.MeshBasicMaterial({ color: TV_BLACK }), x, 1.4, wall + 0.065)
  tvScreen.userData.cameraScreen = 'tv'
  tvScreen.userData.screenOff = TV_BLACK
  tvScreen.userData.screenFacing = 1
  group.add(tvScreen)
  // La petite peluche jaune posée sur la télé : un poisson rond à gros yeux blancs, deux nageoires et une crête.
  const plushYellow = standard(0xf2dc1e, 0.95)
  const plush = new THREE.Group()
  plush.position.set(x + 0.02, 1.76, wall + 0.045)
  const plushBody = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), plushYellow)
  plushBody.scale.set(1.15, 0.85, 0.9)
  plushBody.position.y = 0.04
  plush.add(plushBody)
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 14, 10), m.white)
    eye.scale.z = 0.4
    eye.position.set(side * 0.024, 0.048, 0.04)
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), m.black)
    pupil.scale.z = 0.4
    pupil.position.set(side * 0.02, 0.044, 0.048)
    const fin = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), plushYellow)
    fin.position.set(side * 0.062, 0.02, 0.01)
    plush.add(eye, pupil, fin)
  }
  for (const lean of [-0.25, 0.2]) {
    const crest = cylinder(0.008, 0.01, 0.04, plushYellow, lean * 0.04, 0.095, -0.005)
    crest.rotation.z = -lean
    plush.add(crest)
  }
  group.add(plush)
  // Le meuble télé : une caisse de métal sombre sur quatre pieds en fer plat, un plateau de vieux bois serti dans son cadre, et trois portes
  // (deux carreaux de verre en haut, un panneau de bois en bas) aux coins rivetés.
  const stand = { width: 1.75, depth: 0.42, height: 0.5, legs: 0.1 }
  const standZ = wall + stand.depth / 2 + 0.02
  const front = standZ + stand.depth / 2
  const body = stand.height - stand.legs
  group.add(box(stand.width, body, stand.depth, m.metal, x, stand.legs + body / 2, standZ))
  group.add(box(stand.width - 0.06, 0.012, stand.depth - 0.06, m.woodOld, x, stand.height + 0.006, standZ))
  for (const side of [-1, 1]) for (const back of [-1, 1]) group.add(box(0.03, stand.legs, 0.08, m.metal, x + (stand.width / 2 - 0.1) * side, stand.legs / 2, standZ + (stand.depth / 2 - 0.06) * back))
  const leaf = (stand.width - 0.06) / 3
  for (const index of [-1, 0, 1]) {
    const leafX = x + index * leaf
    group.add(box(leaf - 0.08, 0.17, 0.008, m.woodDark, leafX, stand.legs + 0.125, front + 0.004))
    for (const pane of [-1, 1]) group.add(box((leaf - 0.1) / 2, 0.11, 0.008, m.glass, leafX + ((leaf - 0.08) / 4) * pane, stand.legs + 0.3, front + 0.004))
    for (const corner of [-1, 1]) for (const level of [0.06, 0.34]) group.add(box(0.03, 0.03, 0.01, m.wickerDark, leafX + (leaf / 2 - 0.03) * corner, stand.legs + level, front + 0.006))
  }
  const pouf = cylinder(0.26, 0.28, 0.34, m.wicker, LAYOUT.pouf.x, 0.17, LAYOUT.pouf.z)
  const band = cylinder(0.275, 0.285, 0.09, m.wickerDark, LAYOUT.pouf.x, 0.13, LAYOUT.pouf.z)
  group.add(pouf, band)
  // À gauche de la télé : le puzzle japonais dans son cadre noir, posé sur le tabouret et appuyé au mur (ciel rose, brume bleue, pré vert, cartouche rouge),
  // et dessous le tabouret en rotin à coussin crème.
  // Sur le bout gauche du meuble télé : l'enceinte Google Home Mini (un galet de tissu anthracite), un aloès dans son pot gris foncé,
  // et une petite coupelle bleue et crème.
  const endX = x - stand.width / 2
  const mini = new THREE.Mesh(new THREE.SphereGeometry(0.049, 24, 12), standard(0x3a3d42, 0.95))
  mini.scale.y = 0.42
  mini.position.set(endX + 0.12, stand.height + 0.021, wall + 0.12)
  const potGrey = standard(0x35373b, 0.9)
  group.add(mini, cylinder(0.055, 0.042, 0.1, potGrey, endX + 0.27, stand.height + 0.05, wall + 0.11))
  for (let leaf = 0; leaf < 9; leaf += 1) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.2, 5), m.plant)
    const turn = (leaf * Math.PI * 2) / 9
    const lean = leaf % 3 === 0 ? 0.25 : 0.75
    blade.position.set(endX + 0.27 + Math.sin(turn) * 0.07 * lean, stand.height + 0.1 + 0.09 * Math.cos(lean), wall + 0.11 + Math.cos(turn) * 0.07 * lean)
    blade.rotation.set(Math.cos(turn) * lean, 0, -Math.sin(turn) * lean)
    group.add(blade)
  }
  group.add(cylinder(0.045, 0.03, 0.03, standard(0x232a5c, 0.5), endX + 0.2, stand.height + 0.015, wall + 0.3), cylinder(0.038, 0.038, 0.004, standard(0xe9dcc0, 0.8), endX + 0.2, stand.height + 0.031, wall + 0.3))
  const leftX = x - 1.17
  const picture = new THREE.Group()
  picture.position.set(leftX, 0.795, wall + 0.15)
  picture.rotation.x = -0.35
  picture.add(box(0.58, 0.82, 0.02, m.black, 0, 0, 0))
  // Sa photo (`public/kitchen3d/fuji.jpg`).
  const fuji = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}kitchen3d/fuji.jpg`)
  fuji.colorSpace = THREE.SRGBColorSpace
  const fujiImage = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.79), new THREE.MeshStandardMaterial({ map: fuji, roughness: 0.75 }))
  fujiImage.position.set(0, 0, 0.012)
  picture.add(fujiImage)
  group.add(picture)
  group.add(cylinder(0.2, 0.22, 0.34, m.wickerDark, leftX, 0.17, wall + 0.32), cylinder(0.2, 0.2, 0.07, standard(0xe6d8bd, 0.95), leftX, 0.375, wall + 0.32))
  return group
}

/** La porte blanche du mur ouest (celle du couloir, à côté de la cloison), ouverte, le battant dans le salon. */
const northWall = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const wall = ROOM.zMin
  const { x, width } = LAYOUT.door
  // Ouverte : l'huisserie blanche autour du passage (deux montants, une traverse), et le battant rabattu d'un quart de tour dans le
  // salon, le long du mur du bar, ses gonds côté cuisine, sa poignée au bout.
  for (const side of [-1, 1]) group.add(box(0.05, 2.05, 0.1, m.white, x + (width / 2 + 0.025) * side, 1.025, wall))
  group.add(box(width + 0.1, 0.05, 0.1, m.white, x, 2.075, wall))
  const hinge = x + width / 2 - 0.02
  group.add(box(0.04, 2.03, width - 0.02, m.white, hinge, 1.015, wall + 0.05 + (width - 0.02) / 2))
  for (const side of [-1, 1]) group.add(box(0.03, 0.02, 0.1, m.shutter, hinge + 0.035 * side, 1.02, wall + width - 0.06))
  return group
}

/** Une chaise de salle à manger : coque rembourrée de tissu (assise épaisse, dossier enveloppant incliné), sur un fût et quatre pieds d'acier noir en étoile. */
const chair = (material: THREE.Material, m: Materials): THREE.Group => {
  const group = new THREE.Group()
  group.add(box(0.48, 0.09, 0.46, material, 0, 0.47, 0.01))
  const back = box(0.46, 0.42, 0.07, material, 0, 0.72, -0.23)
  back.rotation.x = -0.14
  group.add(back)
  // Les deux joues qui prolongent le dossier vers l'avant.
  for (const side of [-1, 1]) {
    const wing = box(0.06, 0.2, 0.2, material, side * 0.22, 0.6, -0.14)
    wing.rotation.x = -0.14
    group.add(wing)
  }
  group.add(cylinder(0.025, 0.025, 0.14, m.black, 0, 0.36, 0))
  for (let leg = 0; leg < 4; leg += 1) {
    const pivot = new THREE.Group()
    pivot.position.set(0, 0.3, 0)
    pivot.rotation.y = Math.PI / 4 + (leg * Math.PI) / 2
    const bar = box(0.02, 0.44, 0.03, m.black, 0.14, -0.15, 0)
    bar.rotation.z = 0.75
    pivot.add(bar)
    group.add(pivot)
  }
  return group
}

/**
 * La chaise paillée de la cuisine, en bois foncé : assise en paille tressée (quatre triangles vers le centre) dans un cadre, pieds avant sabre,
 * montants arrière inclinés, traverse haute chantournée, trois barreaux en éventail, traverse basse et barreaux entre les pieds.
 */
const strawChair = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const wood = m.woodDark
  const seatY = 0.45
  // Le cadre de l'assise et la paille, un peu bombée.
  for (const side of [-1, 1]) group.add(box(0.03, 0.045, 0.4, wood, side * 0.195, seatY - 0.02, 0), box(0.42, 0.045, 0.03, wood, 0, seatY - 0.02, side * 0.185))
  const straw = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.035, 4, 1), standard(0xc9a05a, 0.95))
  straw.rotation.y = Math.PI / 4
  straw.scale.set(1, 1, 0.95)
  straw.position.set(0, seatY + 0.012, 0)
  group.add(straw, box(0.37, 0.02, 0.35, standard(0xb98a45, 0.95), 0, seatY - 0.005, 0))
  // Quatre pieds droits, d'aplomb sous les coins de l'assise.
  for (const side of [-1, 1]) {
    const front = box(0.035, seatY, 0.035, wood, side * 0.195, seatY / 2, 0.185)
    // Le pied arrière, droit lui aussi ; le montant du dossier le prolonge, incliné vers l'arrière au-dessus de l'assise.
    const rear = box(0.035, seatY, 0.035, wood, side * 0.195, seatY / 2, -0.185)
    const post = box(0.035, 0.46, 0.03, wood, side * 0.19, seatY + 0.22, -0.225)
    post.rotation.x = -0.14
    group.add(front, rear, post)
    // Les deux barreaux de côté entre les pieds.
    for (const y of [0.2, 0.3]) group.add(box(0.016, 0.016, 0.37, wood, side * 0.195, y, 0))
  }
  group.add(box(0.37, 0.016, 0.016, wood, 0, 0.25, 0.19), box(0.37, 0.016, 0.016, wood, 0, 0.22, -0.2))
  // Le dossier : traverse haute à chapeau, traverse basse cintrée, trois barreaux en éventail.
  const topY = seatY + 0.42
  group.add(box(0.4, 0.07, 0.025, wood, 0, topY, -0.257), box(0.2, 0.03, 0.025, wood, 0, topY + 0.045, -0.262))
  group.add(box(0.36, 0.045, 0.022, wood, 0, seatY + 0.17, -0.222), box(0.14, 0.025, 0.022, wood, 0, seatY + 0.2, -0.226))
  for (const fan of [-1, 0, 1]) {
    const bar = box(0.022, 0.22, 0.014, wood, fan * 0.045, seatY + 0.295, -0.24)
    bar.rotation.set(-0.14, 0, -fan * 0.2)
    group.add(bar)
  }
  return group
}

/** La table ronde en vieux bois massif sur son pied de trois poutres croisées, et ses quatre chaises (deux orange, deux bleues). */
const dining = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  group.position.set(LAYOUT.dining.x, 0, LAYOUT.dining.z)
  // Le plateau rond (1,20 m) en vieux bois épais, au chant légèrement rentré en dessous.
  group.add(cylinder(0.6, 0.6, 0.06, m.tableTop, 0, 0.745, 0, 48), cylinder(0.585, 0.57, 0.02, m.tableTop, 0, 0.705, 0, 48))
  // Le pied : trois grosses poutres de bois qui se croisent au centre, chacune penchée du sol au plateau, serrées dans un nœud d'acier noir.
  const tilt = 0.72
  const span = 0.69 / Math.cos(tilt)
  for (let beam = 0; beam < 3; beam += 1) {
    const pivot = new THREE.Group()
    pivot.position.set(0, 0.35, 0)
    pivot.rotation.y = (beam * Math.PI * 2) / 3 + 0.3
    const wood = box(0.1, span, 0.1, m.tableBeam, 0, 0, 0)
    wood.rotation.z = tilt
    const sleeve = box(0.108, 0.3, 0.108, m.black, 0, 0, 0)
    sleeve.rotation.z = tilt
    pivot.add(wood, sleeve)
    group.add(pivot)
  }
  const knot = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), m.black)
  knot.position.set(0, 0.35, 0)
  group.add(knot)
  const chairs: [number, THREE.Material][] = [
    [0.5, m.chairOrange],
    [2.4, m.chairBlue],
    [3.9, m.chairOrange],
    [5.3, m.chairBlue],
  ]
  for (const [angle, material] of chairs) {
    const seat = facing(chair(material, m), -Math.sin(angle), -Math.cos(angle))
    seat.position.set(Math.sin(angle) * 0.82, 0, Math.cos(angle) * 0.82)
    group.add(seat)
  }
  return group
}

/** Un écran, au fond du bureau, sans pied (il a l'air fixé au mur) : un cadre noir et la dalle bleue tournée vers le fauteuil (−z). */
const monitor = (m: Materials, x: number, key: string): THREE.Group => {
  const group = new THREE.Group()
  group.position.set(x, 0.77, 0.12)
  group.add(box(0.58, 0.34, 0.025, m.black, 0, 0.3, 0.02))
  const screen = box(0.55, 0.31, 0.005, m.screen, 0, 0.3, 0.005)
  // Chaque écran montre les caméras au clic : il a son propre matériau, sa marque, sa couleur d'écran éteint et son côté visible (`live.ts`).
  screen.material = new THREE.MeshBasicMaterial({ color: SCREEN_BLUE })
  screen.userData.cameraScreen = key
  screen.userData.screenOff = SCREEN_BLUE
  screen.userData.screenFacing = -1
  group.add(screen)
  return group
}

/** Le coin bureau contre le mur est : le plateau en bois sur deux tréteaux, deux écrans, deux lampes rouges, le fauteuil noir, le tapis gris, la clim au-dessus et le grand luminaire en fils noirs. */
const office = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const { x, z } = LAYOUT.desk
  group.position.set(x, 0, z)
  group.add(box(1.7, 0.04, 0.68, m.woodLight, 0, 0.75, 0))
  // Deux tréteaux de bois foncé : chacun fait de deux cadres en A (deux pieds écartés vers l'avant et l'arrière, deux traverses) reliés par
  // un chapeau sous le plateau et deux tablettes, à mi-hauteur et près du sol.
  const legTall = 0.71
  const spread = 0.17
  const legLength = Math.hypot(legTall, spread)
  const levels = [0.14, 0.42]
  for (const side of [-1, 1]) {
    const trestle = new THREE.Group()
    trestle.position.set(0.6 * side, 0, 0)
    for (const frame of [-1, 1]) {
      for (const way of [-1, 1]) {
        const leg = box(0.03, legLength, 0.06, m.woodDark, 0.16 * frame, legTall / 2, way * (0.11 + spread / 2))
        leg.rotation.x = way * Math.atan2(spread, legTall)
        trestle.add(leg)
      }
      // Les traverses du cadre : plus longues en bas, où les pieds s'écartent.
      for (const y of levels) trestle.add(box(0.03, 0.07, 2 * (0.11 + spread * (1 - y / legTall)) + 0.04, m.woodDark, 0.16 * frame, y, 0))
    }
    trestle.add(box(0.38, 0.03, 0.26, m.woodDark, 0, legTall + 0.005, 0))
    for (const y of levels) trestle.add(box(0.3, 0.018, 2 * (0.11 + spread * (1 - y / legTall)) - 0.02, m.woodDark, 0, y + 0.03, 0))
    group.add(trestle)
  }
  // Deux écrans côte à côte, et devant eux un clavier et une souris noirs (la souris à droite de qui est assis).
  // Chacun montre le direct d'une caméra quand on le clique (celui de gauche, pour qui est assis, est côté +x).
  group.add(monitor(m, -0.3, 'right'), monitor(m, 0.3, 'left'))
  group.add(box(0.44, 0.02, 0.14, m.black, 0, 0.78, -0.16), box(0.06, 0.03, 0.1, m.black, -0.34, 0.785, -0.16))
  // La tour du PC, noire (23 × 45 × 47 cm), posée par terre dans le coin, entre le tréteau de gauche et le mur qui prolonge le claustra.
  const corner = ENTRY.x - 0.06 - LAYOUT.desk.x
  group.add(box(0.23, 0.47, 0.45, m.black, corner - 0.135, 0.235, 0.14))
  // Les deux lampes rouges, poussées contre le mur : un pied, une tige, un abat-jour, et l'ampoule qui dépasse dessous.
  for (const side of [-1, 1]) {
    const lampX = 0.75 * side
    group.add(cylinder(0.07, 0.08, 0.02, m.red, lampX, 0.78, 0.26), cylinder(0.012, 0.012, 0.07, m.red, lampX, 0.825, 0.26), cylinder(0.06, 0.1, 0.12, m.red, lampX, 0.92, 0.26))
    group.add(fixtureBulb(bulbBall(0.04, lampX, 0.88, 0.26), side === 1 ? 'ordi 2' : 'ordi 1'))
  }
  // Le tapis clair part du coin de gauche, contre les deux murs.
  group.add(box(1.9, 0.015, 1.54, m.rug, corner - 0.95, 0.008, -0.38))
  const seat = facing(new THREE.Group(), 0, 1)
  seat.position.set(0, 0, -0.9)
  seat.add(cylinder(0.26, 0.24, 0.08, m.black, 0, 0.5, 0))
  seat.add(box(0.5, 0.45, 0.08, m.black, 0, 0.78, -0.22))
  seat.add(cylinder(0.03, 0.03, 0.4, m.metal, 0, 0.26, 0))
  group.add(seat)
  // La clim (un bloc blanc fixé au mur).
  // Marquée `acUnit` : un clic dessus l'allume ou l'éteint (`Kitchen3D.tsx`).
  // Centrée sur le mur du bureau (du mur des baies au mur qui prolonge le claustra).
  const acX = (ROOM.xMin + ENTRY.x - 0.06) / 2 - x
  const acBody = box(0.95, 0.3, 0.22, m.white, acX, 2.05, ROOM.zMax - z - 0.12)
  acBody.userData.acUnit = 'salon'
  group.add(acBody)
  // Son voyant, en bas à droite de la façade : vert en marche, rouge à l'arrêt (`live.ts`).
  const led = box(0.03, 0.015, 0.006, new THREE.MeshBasicMaterial({ color: 0x8a8f96 }), acX - 0.445, 1.94, ROOM.zMax - z - 0.233)
  led.userData.acLed = 'salon'
  group.add(led)
  group.add(box(0.8, 0.02, 0.02, m.metal, acX, 1.95, ROOM.zMax - z - 0.24))
  // Le plafonnier du bureau : le même modèle que celui du salon, en plus petit, à pétales en fil d'acier.
  const flower = petalLamp(m, true, 'salle à manger', 0.65)
  flower.position.set(0, ROOM.height, -0.7)
  group.add(flower)
  return group
}

/** Une fenêtre blanche dans un mur est ou ouest, à volet roulant gris : cadre, vitre, et le volet à moitié descendu dehors, derrière la vitre. Le côté qui regarde dans la pièce est donné par `dir` (+1 : vers +x). */
const windowOnWall = (m: Materials, wallX: number, dir: 1 | -1, z: number, width: number, height: number, bottom: number, panes = 2, shutter?: string): THREE.Group => {
  const group = new THREE.Group()
  const bar = 0.05
  const depth = 0.07
  // La fenêtre est au nu du mur intérieur : son cadre est dans l’embrasure, sa face ressort d’un centimètre dans la pièce.
  group.position.set(wallX - (depth / 2 - 0.01) * dir, bottom + height / 2, z)
  for (const side of [-1, 1]) {
    group.add(box(depth, bar, width, m.white, 0, (height / 2 - bar / 2) * side, 0))
    group.add(box(depth, height - bar * 2, bar, m.white, 0, 0, (width / 2 - bar / 2) * side))
  }
  for (let split = 1; split < panes; split += 1) group.add(box(depth, height - bar * 2, bar, m.white, 0, 0, -width / 2 + (width * split) / panes))
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width - bar * 2, height - bar * 2), m.glass)
  glass.rotation.y = (Math.PI / 2) * dir
  group.add(glass)
  // Le volet roulant, dehors derrière la vitre : des lames grises empilées depuis le haut (bien plus sombres que la vitre). Marqué par son
  // nom, il suit le vrai volet de la maison (`shutters.ts`) ; en attendant, il est à moitié descendu.
  const inner = height - bar * 2
  // Des lames d'environ 5 cm, leur pas ajusté pour remplir exactement la hauteur : fermé, le volet ne laisse aucun jour en bas.
  const count = Math.ceil(inner / 0.05)
  const pitch = inner / count
  const slats = new THREE.Group()
  for (let slat = 0; slat < count; slat += 1) {
    const lame = box(0.015, pitch - 0.006, width - bar * 2 - 0.02, m.slat, -0.03 * dir, inner / 2 - pitch / 2 - slat * pitch, 0)
    lame.visible = slat < count / 2
    slats.add(lame)
  }
  group.add(slats)
  // Sans volet relié, pas de lames : la fenêtre reste dégagée.
  if (!shutter) slats.visible = false
  if (shutter) {
    // Son nom, et la surface de vitre qu'il découvre (m²) : de quoi calculer le jour qui entre.
    slats.userData.shutter = shutter
    slats.userData.area = width * height
  }
  return group
}

/**
 * Le mur des baies, côté salon : la porte-fenêtre à deux vantaux près du coin de la télé, la grande fenêtre à trois vitres (2,20 m) au-dessus du canapé, et les
 * rideaux bleus tirés de part et d'autre, sur leur tringle noire, chacun avec son voilage blanc à côté.
 */
const patioWindows = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const x = ROOM.xMin
  const { door, window: bay, curtains } = LAYOUT.bays
  group.add(windowOnWall(m, x, 1, door.z, door.width, 2.15, 0.05, 2, 'porte'))
  group.add(windowOnWall(m, x, 1, bay.z, bay.width, bay.height, bay.bottom, 3, 'salon'))
  for (const z of curtains) {
    group.add(box(0.1, 2.24, 0.3, m.curtain, x + 0.2, 1.13, z))
    for (let fold = 0; fold < 3; fold += 1) group.add(box(0.02, 2.24, 0.03, m.black, x + 0.26, 1.13, z - 0.1 + fold * 0.1))
  }
  // Les voilages blancs, juste à côté de chaque rideau bleu, du côté de sa baie.
  const sheer = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, transparent: true, opacity: 0.6 })
  for (const z of [curtains[0] + 0.3, curtains[1] + 0.3, curtains[2] - 0.3]) {
    group.add(box(0.03, 2.24, 0.3, sheer, x + 0.2, 1.13, z))
    for (let fold = 0; fold < 3; fold += 1) group.add(box(0.012, 2.24, 0.04, sheer, x + 0.222, 1.13, z - 0.1 + fold * 0.1))
  }
  // Le petit montage en briques de couleur, collé sous la poutre du poteau, contre le mur des baies.
  const bricks: [number, number, number, number, number, number, number][] = [
    [0.07, 0.012, 0.09, 0.04, 0.006, 0, 0x8fce3a],
    [0.04, 0.012, 0.05, 0.035, 0.008, 0, 0x9a4fc0],
    [0.03, 0.02, 0.05, 0.02, 0.022, -0.03, 0xd0368a],
    [0.03, 0.02, 0.03, 0.02, 0.022, 0.02, 0x1f1f22],
    [0.03, 0.02, 0.06, 0.02, 0.042, 0, 0xf28a1e],
    [0.02, 0.02, 0.03, 0.015, 0.062, -0.02, 0xf2c81e],
    [0.03, 0.02, 0.03, 0.02, 0.062, 0.015, 0xf28a1e],
    [0.02, 0.02, 0.02, 0.012, 0.082, 0.02, 0x9aa0a6],
    [0.02, 0.04, 0.03, 0.012, 0.112, 0.02, 0x8fce3a],
    [0.02, 0.008, 0.03, 0.012, 0.136, 0.02, 0xf2a0c8],
  ]
  for (const [deep, tall, wide, out, down, along, color] of bricks) group.add(box(deep, tall, wide, standard(color, 0.5), x + out, ROOM.height - 0.12 - down, ENTRY.postZ - 0.02 + along))
  const from = curtains[0] - 0.2
  // La tringle s'arrête juste avant la poutre du poteau : le dernier rideau pend donc en deçà d'elle, sur le bord de la fenêtre.
  const to = ENTRY.postZ - 0.08
  group.add(box(0.03, 0.03, to - from, m.metal, x + 0.22, 2.27, (from + to) / 2))
  return group
}

/** Le grand luminaire en pétales de rotin au-dessus du salon, et le luminaire en verre strié du coin repas. */
const lamps = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  // Le plafonnier du salon, à pétales de cannage.
  const flower = petalLamp(m, false, 'salon', 0.65)
  flower.position.set(-3.7, ROOM.height, 0.9)
  group.add(flower)
  // La suspension en verre du coin repas, avec son capuchon en bois.
  const { x: nookX, z: nookZ } = LAYOUT.nookLamp
  const glass = cylinder(0.1, 0.1, 0.28, m.glass, nookX - 0.3, 1.9, nookZ)
  group.add(fixtureBulb(bulbBall(0.05, nookX - 0.3, 1.9, nookZ), 'cuisine 2'))
  group.add(glass, cylinder(0.05, 0.05, 0.08, m.woodLight, nookX - 0.3, 2.1, nookZ), box(0.01, ROOM.height - 2.14, 0.01, m.black, nookX - 0.3, 2.14 + (ROOM.height - 2.14) / 2, nookZ))
  // Les deux ampoules suspendues au-dessus de la cloison de bar.
  for (const [index, [z, y]] of [[0.4, 1.74], [1, 1.74]].entries()) {
    // Rien qu'une ampoule ronde au bout de son fil, sous une douille de laiton.
    const barX = KITCHEN.xMin - 0.09
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), m.bulb)
    globe.position.set(barX, y, z)
    group.add(box(0.006, ROOM.height - y - 0.1, 0.006, m.black, barX, (ROOM.height + y + 0.1) / 2, z), cylinder(0.02, 0.022, 0.05, standard(0xb08d3a, 0.4, 0.7), barX, y + 0.075, z), fixtureBulb(globe, `bar ${2 - index}`))
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
  group.add(cylinder(0.04, 0.05, 0.7, m.metal, x, 0.37, z))
  for (const angle of [0, 2.1, 4.2]) group.add(box(0.4, 0.04, 0.04, m.metal, x + Math.cos(angle) * 0.18, 0.03, z + Math.sin(angle) * 0.18).rotateY(-angle))
  // Deux sets de table gris, un devant chaque chaise.
  for (const side of [-1, 1]) group.add(box(0.28, 0.004, 0.4, standard(0x8c9096, 0.9), x + side * 0.19, 0.762, z))
  const seat = facing(strawChair(m), 1, 0)
  seat.position.set(x - 0.6, 0, z)
  const second = facing(strawChair(m), -1, 0)
  second.position.set(x + 0.6, 0, z)
  group.add(seat, second)

  const wallZ = KITCHEN.zMax
  const rand = seeded(33)
  for (const niche of NICHES.filter((item) => item.id !== 'fridge')) {
    const middle = wallZ + niche.depth / 2
    if (niche.id === 'cellar') {
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
    } else {
      // La niche à verres, vue de la cuisine (la gauche est côté +x) : un plan de chêne qui dépasse du mur, un fond de lambris blanc à lames
      // horizontales, le robinet de laiton ; à gauche le plateau de bois (boîte en fer ouverte, bocal dépoli, machine à café noire), à droite
      // le set noir (boîte à thé haute, bocal de capsules, pot noir, tasses). Au-dessus, deux tablettes de chêne sur équerres noires : verres
      // à pied, bocal dépoli et dessous-de-plat en bas ; verres retournés et carafe en haut. Un spot au plafond ; dessous, le cadre du casier carré.
      const back = wallZ + niche.depth
      const top = niche.bottom + 0.02
      const brass = standard(0xb08d3a, 0.4, 0.7)
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
  }

  // Le frigo noir : sa façade (vers la cuisine) couverte d'aimants colorés, et l'horloge ronde au-dessus.
  const fridge = new THREE.Group()
  fridge.position.set(LAYOUT.fridge.x, 0, wallZ + 0.25)
  fridge.rotation.y = -Math.PI / 2
  fridge.add(box(0.6, 1.85, 0.65, m.black, 0, 0.925, 0))
  fridge.add(box(0.6, 0.015, 0.64, m.metal, 0, 0.62, 0))
  const magnets = seeded(44)
  for (let index = 0; index < 18; index += 1) {
    const color = [0xe0a23c, 0xc23b2f, 0x2f7ac2, 0xf2ede0][Math.floor(magnets() * 4)]
    fridge.add(box(0.005, 0.06 + magnets() * 0.04, 0.06 + magnets() * 0.04, standard(color, 0.7), -0.303, 0.8 + magnets() * 0.95, -0.24 + magnets() * 0.48))
  }
  group.add(fridge)
  // La pendule ronde, centrée au-dessus du trou du frigo : un cerclage de bois brun, un cadran blanc et deux aiguilles noires.
  const clockY = 2.12
  const clock = cylinder(0.19, 0.19, 0.03, m.clock, LAYOUT.fridge.x, clockY, wallZ - 0.02)
  clock.rotation.x = Math.PI / 2
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.195, 0.014, 8, 40), m.woodOld)
  rim.position.set(LAYOUT.fridge.x, clockY, wallZ - 0.03)
  group.add(clock, rim)
  // Le cadran : les douze nombres en chiffres hauts et étroits, chacun tourné selon son heure, et « QUARTZ » sous le centre.
  const dial = canvasTexture(512, (ctx) => {
    ctx.fillStyle = '#f1efe9'
    ctx.fillRect(0, 0, 512, 512)
    ctx.fillStyle = '#17181b'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let hour = 1; hour <= 12; hour += 1) {
      ctx.save()
      ctx.translate(256, 256)
      ctx.rotate((hour * Math.PI) / 6)
      ctx.translate(0, -196)
      ctx.scale(0.5, 1)
      ctx.font = '300 76px Georgia, serif'
      ctx.fillText(String(hour), 0, 0)
      ctx.restore()
    }
    ctx.font = '14px sans-serif'
    ctx.fillText('Q U A R T Z', 256, 330)
  })
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.182, 48), new THREE.MeshStandardMaterial({ map: dial, roughness: 0.6 }))
  face.rotation.y = Math.PI
  face.position.set(LAYOUT.fridge.x, clockY, wallZ - 0.0355)
  group.add(face)
  // Les aiguilles tournent autour du centre du cadran ; `clock.ts` les met à l'heure.
  for (const [kind, length, thick] of [['hour', 0.11, 0.009], ['minute', 0.16, 0.006]] as [string, number, number][]) {
    const hand = new THREE.Group()
    hand.position.set(LAYOUT.fridge.x, clockY, wallZ - 0.038)
    hand.userData.clockHand = kind
    hand.add(box(thick, length, 0.004, m.black, 0, length / 2 - 0.015, 0))
    group.add(hand)
  }
  group.add(windowOnWall(m, ROOM.xMax, -1, NOOK_WINDOW.z, NOOK_WINDOW.width, NOOK_WINDOW.height, NOOK_WINDOW.bottom, 2, 'cuisine'))
  return group
}

/**
 * L'entrée : la porte blanche au fond de la petite pièce et son paillasson, la suspension en rotin, le poteau de chêne, le passage ouvert,
 * puis le muret bas coiffé de bois qui porte le claustra en lames de chêne jusqu'au mur.
 */
const entry = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const { x, postZ, claustraZ, wallZ, doorZ, doorX, doorWidth, doorHeight, northX, muret } = ENTRY
  // La porte d'entrée blanche : quatre panneaux moulurés, un hublot en demi-lune au verre turquoise, une poignée de laiton côté cuisine.
  const face = doorZ - 0.058
  group.add(box(doorWidth, doorHeight, 0.05, m.white, doorX, doorHeight / 2, doorZ - 0.03))
  for (const side of [-1, 1]) for (const [panelY, tall] of [[0.52, 0.6], [1.22, 0.62]]) group.add(box(0.26, tall, 0.008, m.shutter, doorX + 0.17 * side, panelY, face))
  const moon = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24, 0, Math.PI), standard(0x58c2c0, 0.3))
  moon.rotation.y = Math.PI
  moon.position.set(doorX, 1.62, face)
  group.add(moon, box(0.03, 0.2, 0.02, standard(0xb08d3a, 0.4, 0.7), doorX + doorWidth / 2 - 0.09, 1.05, doorZ - 0.07), box(0.11, 0.02, 0.03, standard(0xb08d3a, 0.4, 0.7), doorX + doorWidth / 2 - 0.14, 1.07, doorZ - 0.09))
  // Le paillasson gris devant la porte.
  group.add(box(0.8, 0.015, 0.5, standard(0x77797c, 0.95), doorX, 0.008, doorZ - 0.36))
  // Le placard de l'entrée, encastré dans le mur de gauche jusqu'au plafond : de bas en haut deux portes, deux tiroirs, une porte, deux portes
  // (des façades blanches moulurées à boutons noirs, à fleur du mur), et côté porte une colonne ouverte de tablettes à classeurs.
  const flush = northX - 0.008
  const doorsZ = doorZ - 0.5
  const fronts: [number, number, number][] = [
    [0.1, 0.66, 2],
    [0.78, 0.16, 1],
    [0.96, 0.16, 1],
    [1.14, 0.6, 1],
    [1.76, 0.56, 2],
  ]
  for (const [bottom, tall, leaves] of fronts) {
    for (let part = 0; part < leaves; part += 1) {
      const wide = 0.6 / leaves
      const partZ = doorsZ - 0.3 + wide * (part + 0.5)
      group.add(box(0.016, tall, wide - 0.008, m.white, flush, bottom + tall / 2, partZ), box(0.004, tall - 0.1, wide - 0.1, m.shutter, flush - 0.01, bottom + tall / 2, partZ))
      const knobZ = leaves === 2 ? doorsZ + (part === 0 ? -0.03 : 0.03) : partZ
      group.add(cylinder(0.012, 0.012, 0.02, m.black, flush - 0.02, bottom + (tall > 0.3 ? (bottom > 1.5 ? 0.08 : tall - 0.08) : tall / 2), knobZ).rotateZ(Math.PI / 2))
    }
  }
  const columnZ = doorsZ + 0.36
  group.add(box(0.004, 2.28, 0.1, m.shutter, northX - 0.002, 1.18, columnZ))
  for (let tray = 0; tray < 6; tray += 1) {
    group.add(box(0.02, 0.015, 0.1, m.white, northX - 0.01, 0.04 + tray * 0.4, columnZ))
    group.add(box(0.012, 0.28, 0.06, standard([0xc23b2f, 0xc23b2f, 0x2a2a2a, 0x8a2f5a, 0x9ab52f, 0xf2ede0][tray], 0.7), northX - 0.008, 0.19 + tray * 0.4, columnZ))
  }
  // La suspension de l'entrée : une rosace et un cône noirs, et un large abat-jour plat en rotin tressé.
  const lampX = (x + northX) / 2
  const lampZ = (KITCHEN.zMax + doorZ) / 2
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.12, 28, 1, true), m.wicker)
  shade.position.set(lampX, 1.98, lampZ)
  group.add(shade, cylinder(0.05, 0.05, 0.02, m.black, lampX, ROOM.height - 0.01, lampZ), cylinder(0.015, 0.05, 0.08, m.black, lampX, 2.08, lampZ))
  group.add(box(0.01, ROOM.height - 2.12, 0.01, m.black, lampX, 2.12 + (ROOM.height - 2.12) / 2, lampZ), fixtureBulb(bulbBall(0.05, lampX, 1.98, lampZ), 'entrée'))
  group.add(box(0.1, ROOM.height, 0.1, m.woodLight, x, ROOM.height / 2, postZ))
  // Le pied du poteau : un sabot d'acier noir sur sa platine, et une prise blanche juste au-dessus, côté salon.
  group.add(box(0.112, 0.1, 0.112, m.black, x, 0.055, postZ), box(0.15, 0.006, 0.15, m.metal, x, 0.003, postZ))
  group.add(box(0.012, 0.08, 0.08, m.white, x - 0.056, 0.15, postZ), cylinder(0.022, 0.022, 0.004, m.shutter, x - 0.063, 0.15, postZ).rotateZ(Math.PI / 2))
  // Du poteau au début du claustra, rien : le passage est ouvert.
  const length = wallZ - claustraZ
  group.add(box(0.12, muret, length, m.white, x, muret / 2, claustraZ + length / 2))
  group.add(box(0.14, 0.02, length, m.woodLight, x, muret + 0.01, claustraZ + length / 2))
  const slats = 13
  const top = ROOM.height - 0.12
  for (let slat = 0; slat < slats; slat += 1) group.add(box(0.08, top - muret - 0.02, 0.02, m.woodLight, x, (top + muret + 0.02) / 2, claustraZ + 0.03 + (slat * (length - 0.06)) / (slats - 1)))
  return group
}

/**
 * Le buffet du salon, contre le mur des baies entre le rideau et la bibliothèque : une carcasse de métal noir sur quatre pieds, un plateau de
 * vieux bois, et trois portes à panneau de bois surmonté de deux carreaux de verre.
 */
const sideboard = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const { z, width, depth, height } = LAYOUT.sideboard
  const x = ROOM.xMin + depth / 2 + 0.02
  group.add(box(depth, height - 0.1, width, m.metal, x, 0.08 + (height - 0.1) / 2, z))
  group.add(box(depth + 0.02, 0.03, width + 0.02, m.woodOld, x, height, z))
  for (const side of [-1, 1]) for (const back of [-1, 1]) group.add(box(0.04, 0.08, 0.04, m.metal, x + (depth / 2 - 0.04) * back, 0.04, z + (width / 2 - 0.04) * side))
  const front = x + depth / 2
  const door = width / 3
  for (const index of [-1, 0, 1]) {
    const doorZ = z + index * door
    group.add(box(0.01, 0.42, door - 0.1, m.woodDark, front + 0.005, 0.36, doorZ))
    for (const pane of [-1, 1]) group.add(box(0.01, 0.2, (door - 0.12) / 2, m.glass, front + 0.005, 0.73, doorZ + ((door - 0.1) / 4) * pane))
  }
  return group
}

/**
 * Sur l'étagère à gauche de la hotte : un ficus dans son pot blanc à bande bleue, côté coin, puis le service à thé japonais (une théière
 * crème à anse noire et quatre gobelets, deux rouges et deux crème).
 */
const teaShelf = (m: Materials): THREE.Group => {
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
const potteryShelf = (m: Materials): THREE.Group => {
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
const frames = (m: Materials): THREE.Group => {
  const group = new THREE.Group()
  const { x, y, z, width, height } = LAYOUT.puzzle
  group.add(box(0.02, height, width, m.woodLight, x + 0.01, y, z))
  // L'image du puzzle : sa photo (`public/kitchen3d/puzzle.jpg`), collée sur un plan qui regarde la cuisine.
  const picture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}kitchen3d/puzzle.jpg`)
  picture.colorSpace = THREE.SRGBColorSpace
  const image = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.08, height - 0.08), new THREE.MeshStandardMaterial({ map: picture, roughness: 0.75 }))
  image.rotation.y = Math.PI / 2
  image.position.set(x + 0.022, y, z)
  group.add(image)
  // Sur le mur plein du bar, côté salon : un puzzle sans bords collé à même le mur (la mer : ciel rose, vagues bleues, fonds sombres, coraux),
  // au contour en dents irrégulières.
  const seaX = KITCHEN.xMin - PARTITION.thickness - 0.003
  // Sa photo détourée (`public/kitchen3d/sea.png`, le mur rendu transparent) sur un plan qui regarde le salon.
  const sea = { y: 1.38, z: -0.7, width: 0.9, height: 0.66 }
  const seaPicture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}kitchen3d/sea.png`)
  seaPicture.colorSpace = THREE.SRGBColorSpace
  const seaImage = new THREE.Mesh(new THREE.PlaneGeometry(sea.width, sea.height), new THREE.MeshStandardMaterial({ map: seaPicture, roughness: 0.8, alphaTest: 0.5 }))
  seaImage.rotation.y = -Math.PI / 2
  seaImage.position.set(seaX, sea.y, sea.z)
  group.add(seaImage)
  // Sur le petit bout de mur de l'entrée (le dos du retour de mur du frigo) : une affiche ancienne sur fond vert, dans un cadre de bois sombre.
  const letterX = KITCHEN.xMin - PARTITION.thickness
  const letterZ = ENTRY.doorZ - ENTRY.depth - 0.3
  group.add(box(0.02, 0.58, 0.44, m.woodDark, letterX - 0.01, 1.5, letterZ))
  group.add(box(0.004, 0.53, 0.39, standard(0x9fae8a, 0.8), letterX - 0.022, 1.5, letterZ))
  group.add(box(0.004, 0.47, 0.33, standard(0xe6dcc0, 0.9), letterX - 0.025, 1.5, letterZ))
  for (const side of [-1, 1]) group.add(box(0.002, 0.3, 0.13, standard(0x6f6a5c, 0.9), letterX - 0.028, 1.5, letterZ + 0.075 * side))
  // Dans la cuisine, à droite de la grande fenêtre : une petite aquarelle de bord de mer, passe-partout blanc et large cadre gris.
  const shoreZ = (NOOK_WINDOW.z + NOOK_WINDOW.width / 2 + KITCHEN.zMax) / 2
  group.add(box(0.02, 0.33, 0.4, m.frame, ROOM.xMax - 0.01, 1.6, shoreZ))
  // Sa photo, cadre compris (`public/kitchen3d/shore.jpg`), sur la face du cadre.
  const shore = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}kitchen3d/shore.jpg`)
  shore.colorSpace = THREE.SRGBColorSpace
  const shoreImage = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.33), new THREE.MeshStandardMaterial({ map: shore, roughness: 0.7 }))
  shoreImage.rotation.y = -Math.PI / 2
  shoreImage.position.set(ROOM.xMax - 0.0205, 1.6, shoreZ)
  group.add(shoreImage)
  // Sur la bande de bois du rebord, devant le mur plein côté cuisine : la rangée de pots à épices en inox. Et sur le bout du mur plein,
  // face au bar : le petit cadre de bois clair aux vaches.
  const spiceX = KITCHEN.xMin + PARTITION.ledge / 2
  const steel = standard(0xb9bcc0, 0.35, 0.7)
  for (let jar = 0; jar < 17; jar += 1) group.add(cylinder(0.022, 0.022, 0.09, steel, spiceX, PARTITION.height + 0.085, KITCHEN.zMin + 0.12 + jar * 0.055, 10))
  const endZ = ROOM.zMin + PARTITION.wall
  const cowX = KITCHEN.xMin - PARTITION.thickness / 2
  // Sa planche des races de vaches : la photo redressée (`public/kitchen3d/cows.jpg`).
  group.add(box(0.16, 0.21, 0.015, m.woodLight, cowX, 1.5, endZ + 0.008))
  const cows = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}kitchen3d/cows.jpg`)
  cows.colorSpace = THREE.SRGBColorSpace
  const cowImage = new THREE.Mesh(new THREE.PlaneGeometry(0.115, 0.161), new THREE.MeshStandardMaterial({ map: cows, roughness: 0.7 }))
  cowImage.position.set(cowX, 1.5, endZ + 0.0165)
  group.add(cowImage)
  // Au-dessus du buffet : un cadre de chêne, un grand passe-partout blanc et la gravure d'une ville vue du ciel, en touches violettes et roses.
  const wallX = ROOM.xMin
  const print = { y: 1.55, z: LAYOUT.sideboard.z, width: 0.9, height: 0.6 }
  group.add(box(0.02, print.height, print.width, m.woodLight, wallX + 0.01, print.y, print.z))
  // Sa photo (`public/kitchen3d/city.jpg`) : le passe-partout et la gravure, dans le cadre.
  const city = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}kitchen3d/city.jpg`)
  city.colorSpace = THREE.SRGBColorSpace
  const cityImage = new THREE.Mesh(new THREE.PlaneGeometry(print.width - 0.05, print.height - 0.05), new THREE.MeshStandardMaterial({ map: city, roughness: 0.7 }))
  cityImage.rotation.y = Math.PI / 2
  cityImage.position.set(wallX + 0.021, print.y, print.z)
  group.add(cityImage)
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
  const seat = facing(armchair(m), -0.25, -1)
  seat.position.set(LAYOUT.armchair.x, 0, LAYOUT.armchair.z)
  root.add(livingSofa, table, seat, tvCorner(m), northWall(m), dining(m), office(m), buildLibrary(), patioWindows(m), lamps(m), nook(m), entry(m), frames(m), sideboard(m), teaShelf(m), potteryShelf(m), buildRooms())
  root.add(windowOnWall(m, ROOM.xMin, 1, LAYOUT.libraryWindow.z, 1, 1.1, 1.05, 2, 'pc'))
  // La fenêtre à trois vitres de la chambre de Matou (pas de volet relié).
  root.add(windowOnWall(m, ROOM.xMin, 1, MATOU_WINDOW.z, MATOU_WINDOW.width, MATOU_WINDOW.height, MATOU_WINDOW.bottom, 3))
  return root
}
