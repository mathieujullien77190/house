import * as THREE from 'three'
import { ENTRY, LAYOUT, ROOM, SCREEN_OFF } from '@/components/Kitchen3D/constants'
import type { FurnitureMaterials } from '@/components/Kitchen3D/materials'
import { box, bulbBall, cylinder, facing, fixtureBulb } from '@/components/Kitchen3D/primitives'
import { petalLamp } from './lamps'

/** Un écran, au fond du bureau, sans pied (il a l'air fixé au mur) : un cadre noir et la dalle éteinte tournée vers le fauteuil (−z). */
const monitor = (m: FurnitureMaterials, x: number): THREE.Group => {
  const group = new THREE.Group()
  group.position.set(x, 0.77, 0.12)
  group.add(box(0.58, 0.34, 0.025, m.black, 0, 0.3, 0.02))
  group.add(box(0.55, 0.31, 0.005, new THREE.MeshBasicMaterial({ color: SCREEN_OFF }), 0, 0.3, 0.005))
  return group
}

/** Le coin bureau contre le mur est : le plateau en bois sur deux tréteaux, deux écrans, deux lampes rouges, le fauteuil noir, le tapis gris, la clim au-dessus et le grand luminaire en fils noirs. */
export const office = (m: FurnitureMaterials): THREE.Group => {
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
  group.add(monitor(m, -0.3), monitor(m, 0.3))
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
