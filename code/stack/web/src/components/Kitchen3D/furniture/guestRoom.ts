import * as THREE from 'three'
import { GUEST_WINDOW, REST, ROOM } from '@/components/Kitchen3D/constants'
import { mirrorGlass } from '@/components/Kitchen3D/materials'
import type { RoomMaterials } from '@/components/Kitchen3D/materials'
import { box, bulbBall, cylinder, fixtureBulb } from '@/components/Kitchen3D/primitives'

/**
 * La chambre d'invité (au nord-ouest), vue de sa porte : le mur du nord en lambris bleu, la clim au-dessus du lit, le lit de bois à tête
 * ajourée (drap bleu nuit, couette et oreillers bordeaux), deux suspensions noires de chaque côté, une table de chevet ronde, le plafonnier
 * en raphia ondulé (la lampe « Chambre »), le rideau bleu nuit, fermé, de la fenêtre du mur ouest ; contre le mur du sud, la commode et sa petite
 * télé, le miroir sur pied ; la porte ouverte, rabattue contre ce mur.
 */
export const guestRoom = (m: RoomMaterials): THREE.Group => {
  const group = new THREE.Group()
  const north = ROOM.xMax
  const south = REST.guestSouth
  const west = REST.west
  const east = REST.guestEast
  const middleZ = (west + east) / 2
  const height = ROOM.height
  // Le lambris bleu, à lames horizontales.
  group.add(box(0.012, height, east - west, m.blueWall, north - 0.006, height / 2, middleZ))
  for (let line = 1; line < 12; line += 1) group.add(box(0.003, 0.004, east - west, m.groove, north - 0.013, line * 0.2, middleZ))
  // Le lit, la tête au nord, centré sur le mur.
  const bedZ = middleZ
  const head = north - 0.05
  group.add(box(2.1, 0.3, 1.72, m.acacia, head - 1.05, 0.2, bedZ), box(2.0, 0.2, 1.6, m.navy, head - 1.05, 0.45, bedZ))
  for (const side of [-1, 1]) for (const end of [0.05, 2.05]) group.add(box(0.07, 0.1, 0.07, m.acacia, head - end, 0.05, bedZ + side * 0.8))
  group.add(box(0.05, 1.05, 1.72, m.acacia, head, 0.525, bedZ))
  for (let slat = 0; slat < 6; slat += 1) group.add(box(0.012, 0.012, 1.6, m.black, head - 0.028, 0.6 + slat * 0.075, bedZ))
  // La couette bordeaux, bien tirée sur tout le lit (elle retombe un peu sur les côtés et au pied), et les deux oreillers à la tête.
  group.add(box(1.62, 0.07, 1.68, m.burgundy, head - 1.26, 0.585, bedZ), box(1.62, 0.2, 0.02, m.burgundy, head - 1.26, 0.5, bedZ - 0.84), box(1.62, 0.2, 0.02, m.burgundy, head - 1.26, 0.5, bedZ + 0.84))
  group.add(box(0.02, 0.2, 1.68, m.burgundy, head - 2.07, 0.5, bedZ))
  for (const side of [-1, 1]) group.add(box(0.42, 0.12, 0.66, m.burgundy, head - 0.28, 0.61, bedZ + side * 0.4))
  // La clim, en haut du lambris ; les deux suspensions noires de part et d'autre du lit ; la table de chevet.
  // La clim : la même qu'au salon (un bloc blanc, une barre en bas, un voyant en bas à droite), reliée à la vraie clim de la chambre
  // d'invité : un clic l'allume ou l'éteint, le voyant dit son état (`live.ts`).
  const acZ = middleZ + 0.05
  const acBody = box(0.22, 0.3, 0.95, m.white, north - 0.12, 2.05, acZ)
  acBody.userData.acUnit = 'chambre-invite'
  const led = box(0.006, 0.015, 0.03, new THREE.MeshBasicMaterial({ color: 0x8a8f96 }), north - 0.233, 1.94, acZ + 0.445)
  led.userData.acLed = 'chambre-invite'
  group.add(acBody, led, box(0.02, 0.02, 0.8, m.metal, north - 0.24, 1.95, acZ))
  for (const z of [bedZ - 0.98, bedZ + 0.98]) {
    group.add(cylinder(0.05, 0.05, 0.02, m.black, north - 0.2, height - 0.01, z), box(0.006, height - 1.36, 0.006, m.black, north - 0.2, (height + 1.36) / 2, z))
    group.add(cylinder(0.03, 0.03, 0.09, m.black, north - 0.2, 1.31, z, 12), new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), m.bulb).translateX(north - 0.2).translateY(1.25).translateZ(z))
  }
  const tableZ = bedZ + 1.06
  group.add(cylinder(0.2, 0.2, 0.03, m.acacia, north - 0.32, 0.5, tableZ))
  for (const turn of [0, 2.1, 4.2]) group.add(box(0.012, 0.5, 0.012, m.black, north - 0.32 + Math.cos(turn) * 0.12, 0.25, tableZ + Math.sin(turn) * 0.12))
  // Le plafonnier : un cône noir au plafond, un fil, une corolle de raphia ondulée et l'ampoule.
  const lampX = (north + south) / 2
  group.add(cylinder(0.02, 0.06, 0.07, m.black, lampX, height - 0.035, middleZ), box(0.008, 0.2, 0.008, m.black, lampX, height - 0.17, middleZ))
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.12, 12, 1, true), m.wicker)
  shade.position.set(lampX, height - 0.31, middleZ)
  group.add(shade, fixtureBulb(bulbBall(0.045, lampX, height - 0.33, middleZ), 'chambre'))
  // La fenêtre du mur ouest (le mur est percé, `house/`) : un cadre blanc à deux vantaux et ses vitres, derrière le rideau.
  const windowY = GUEST_WINDOW.bottom + GUEST_WINDOW.height / 2
  for (const side of [-1, 1]) {
    group.add(box(0.05, GUEST_WINDOW.height, 0.07, m.white, GUEST_WINDOW.z + side * (GUEST_WINDOW.width / 2 - 0.025), windowY, west - 0.025))
    group.add(box(GUEST_WINDOW.width, 0.05, 0.07, m.white, GUEST_WINDOW.z, windowY + side * (GUEST_WINDOW.height / 2 - 0.025), west - 0.025))
  }
  group.add(box(0.06, GUEST_WINDOW.height - 0.1, 0.07, m.white, GUEST_WINDOW.z, windowY, west - 0.025), box(GUEST_WINDOW.width - 0.1, GUEST_WINDOW.height - 0.1, 0.006, m.glass, GUEST_WINDOW.z, windowY, west - 0.025))
  // Le rideau de la fenêtre, contre le mur ouest : le même qu'au salon (bleu nuit, plis sombres, tringle de métal), mais fermé.
  const curtainX = GUEST_WINDOW.z
  const curtainWide = 1.5
  group.add(box(curtainWide, 2.24, 0.1, m.curtain, curtainX, 1.13, west + 0.2))
  for (let fold = 0; fold < 15; fold += 1) group.add(box(0.03, 2.24, 0.02, m.black, curtainX - curtainWide / 2 + 0.05 + fold * 0.1, 1.13, west + 0.26))
  group.add(box(curtainWide + 0.4, 0.03, 0.03, m.metal, curtainX, 2.27, west + 0.22))
  // Contre le mur du sud : la commode à trois tiroirs et sa petite télé, le miroir sur pied, la pile de coussins dans le coin.
  // La commode laisse la place du battant de la porte, rabattu contre ce mur (68 cm) plus 12 cm de jeu.
  const chestZ = east - 0.8 - 0.475
  group.add(box(0.45, 0.72, 0.95, m.acacia, south + 0.27, 0.48, chestZ), box(0.48, 0.03, 0.99, m.acacia, south + 0.27, 0.855, chestZ))
  for (const z of [-0.43, 0.43]) for (const x of [0.08, 0.46]) group.add(box(0.04, 0.12, 0.04, m.acacia, south + x, 0.06, chestZ + z))
  for (let drawer = 0; drawer < 3; drawer += 1) group.add(box(0.006, 0.012, 0.5, m.black, south + 0.497, 0.74 - drawer * 0.22, chestZ))
  group.add(box(0.03, 0.36, 0.62, m.black, south + 0.22, 1.08, chestZ), box(0.12, 0.02, 0.22, m.black, south + 0.22, 0.88, chestZ))
  // Le miroir sur pied, calé dans le coin sud-ouest, tourné vers la pièce et un peu penché en arrière.
  const mirrorZ = west + 0.3
  const mirror = new THREE.Group()
  mirror.position.set(south + 0.3, 0, mirrorZ)
  mirror.rotation.set(0, -Math.PI / 4, -0.1)
  mirror.add(box(0.04, 1.6, 0.5, m.acacia, 0, 0.85, 0), box(0.006, 1.48, 0.4, mirrorGlass(), 0.023, 0.85, 0))
  group.add(mirror)
  // La porte, ouverte d'un quart de tour contre le mur du sud.
  group.add(box(0.04, 2.03, 0.68, m.white, south + 0.04, 1.015, east - 0.36), box(0.03, 0.02, 0.1, m.line, south + 0.075, 1.02, east - 0.63))
  return group
}
