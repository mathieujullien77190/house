import * as THREE from 'three'
import { REST, ROOM } from '@/components/Kitchen3D/constants'
import type { RoomMaterials } from '@/components/Kitchen3D/materials'
import { box, bulbBall, cylinder, fixtureBulb } from '@/components/Kitchen3D/primitives'

/**
 * La chambre de Matou : sa suspension au milieu de la pièce (reliée à sa lampe Hue), et sa clim, en haut du mur ouest (le mur de la maison le plus près du portail). La même qu'au salon (un bloc blanc,
 * une barre en bas, un voyant en bas à droite), reliée à la vraie clim de la chambre : un clic l'allume ou l'éteint, le voyant dit son
 * état (`live.ts`).
 */
export const matouRoom = (m: RoomMaterials): THREE.Group => {
  const group = new THREE.Group()
  const wall = REST.west
  const acX = (ROOM.xMin + REST.corridorSouth) / 2
  const acBody = box(0.95, 0.3, 0.22, m.white, acX, 2.05, wall + 0.12)
  acBody.userData.acUnit = 'chambre-matou'
  const led = box(0.03, 0.015, 0.006, new THREE.MeshBasicMaterial({ color: 0x8a8f96 }), acX - 0.445, 1.94, wall + 0.233)
  led.userData.acLed = 'chambre-matou'
  group.add(acBody, led, box(0.8, 0.02, 0.02, m.metal, acX, 1.95, wall + 0.24))
  // La suspension, en plein milieu de la pièce : une rosace, un fil, un abat-jour en cloche et son ampoule. C'est la lampe Hue de la
  // chambre (elle s'appelle « Hue ambiance lamp 1 » sur le pont) : elle s'allume avec elle, et un clic la commande.
  const lampX = (ROOM.xMin + REST.corridorSouth) / 2
  const lampZ = (REST.west + REST.matouEast) / 2
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.16, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.9, side: THREE.DoubleSide }))
  shade.position.set(lampX, ROOM.height - 0.48, lampZ)
  group.add(cylinder(0.05, 0.05, 0.02, m.black, lampX, ROOM.height - 0.01, lampZ), box(0.006, 0.4, 0.006, m.black, lampX, ROOM.height - 0.22, lampZ), shade, fixtureBulb(bulbBall(0.045, lampX, ROOM.height - 0.52, lampZ), 'hue ambiance lamp 1'))
  return group
}
