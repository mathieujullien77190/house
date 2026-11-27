import * as THREE from 'three'
import { LAYOUT } from '@/components/Kitchen3D/constants'
import type { FurnitureMaterials } from '@/components/Kitchen3D/materials'
import { box, cylinder, facing, standard } from '@/components/Kitchen3D/primitives'

/** Une chaise de salle à manger : coque rembourrée de tissu (assise épaisse, dossier enveloppant incliné), sur un fût et quatre pieds d'acier noir en étoile. */
const chair = (material: THREE.Material, m: FurnitureMaterials): THREE.Group => {
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
export const strawChair = (m: FurnitureMaterials): THREE.Group => {
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
export const dining = (m: FurnitureMaterials): THREE.Group => {
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
