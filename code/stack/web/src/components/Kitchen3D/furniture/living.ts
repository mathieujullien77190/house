import * as THREE from 'three'
import { LAYOUT, ROOM, SCREEN_OFF } from '@/components/Kitchen3D/constants'
import type { FurnitureMaterials } from '@/components/Kitchen3D/materials'
import { box, cylinder, standard } from '@/components/Kitchen3D/primitives'
import { photoTexture } from '@/components/Kitchen3D/textures'

/** Un canapé d'angle marron : le corps de 2,2 m (dossier, accoudoirs, deux assises), une méridienne côté baies, trois coussins de dossier, et trois coussins (deux orange, un rouge). Il regarde l'ouest (la télé). */
export const sofa = (m: FurnitureMaterials): THREE.Group => {
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
export const coffeeTable = (m: FurnitureMaterials): THREE.Group => {
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
export const armchair = (m: FurnitureMaterials): THREE.Group => {
  const group = new THREE.Group()
  // L'assise et son châssis : deux patins, une ceinture basse, le coussin de cuir.
  group.add(box(0.56, 0.1, 0.56, m.leather, 0, 0.36, 0.02), box(0.6, 0.05, 0.6, m.woodDark, 0, 0.28, 0), box(0.5, 0.04, 0.04, m.woodDark, 0, 0.14, 0.28))
  for (const post of [-0.12, 0, 0.12]) group.add(box(0.025, 0.1, 0.03, m.woodDark, post, 0.2, 0.28))
  // Le dossier, incliné vers l'arrière : un cadre de bois, le cuir dedans, la traverse haute.
  const back = new THREE.Group()
  back.position.set(0, 0.4, -0.26)
  back.rotation.x = -0.28
  back.add(box(0.6, 0.56, 0.04, m.woodDark, 0, 0.28, -0.03), box(0.5, 0.42, 0.05, m.leather, 0, 0.25, 0.01), box(0.6, 0.09, 0.05, m.woodDark, 0, 0.53, 0))
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
  return group
}

/** La télé au mur, son meuble bas en métal vieilli à portes vitrées, le pouf tressé, un cadre posé au sol et un tabouret en rotin, le long du mur ouest. */
export const tvCorner = (m: FurnitureMaterials): THREE.Group => {
  const group = new THREE.Group()
  const wall = ROOM.zMin
  const { x, width } = LAYOUT.tv
  group.add(box(width, 0.72, 0.04, m.black, x, 1.4, wall + 0.04))
  // La dalle de la télé, éteinte.
  // L'écran de la télé : marqué `userData.tv`, il se clique et montre alors la vue d'une caméra de la scène (`tv.ts`).
  const tvScreen = box(width - 0.03, 0.69, 0.005, new THREE.MeshBasicMaterial({ color: SCREEN_OFF }), x, 1.4, wall + 0.065)
  tvScreen.userData.tv = true
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
  const fuji = photoTexture('fuji.jpg')
  const fujiImage = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.79), new THREE.MeshStandardMaterial({ map: fuji, roughness: 0.75 }))
  fujiImage.position.set(0, 0, 0.012)
  picture.add(fujiImage)
  group.add(picture)
  group.add(cylinder(0.2, 0.22, 0.34, m.wickerDark, leftX, 0.17, wall + 0.32), cylinder(0.2, 0.2, 0.07, standard(0xe6d8bd, 0.95), leftX, 0.375, wall + 0.32))
  return group
}

/**
 * Le buffet du salon, contre le mur des baies entre le rideau et la bibliothèque : une carcasse de métal noir sur quatre pieds, un plateau de
 * vieux bois, et trois portes à panneau de bois surmonté de deux carreaux de verre.
 */
export const sideboard = (m: FurnitureMaterials): THREE.Group => {
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
