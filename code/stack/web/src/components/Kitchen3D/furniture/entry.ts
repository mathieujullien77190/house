import * as THREE from 'three'
import { ENTRY, KITCHEN, LAYOUT, ROOM } from '@/components/Kitchen3D/constants'
import { oldBrass } from '@/components/Kitchen3D/materials'
import type { FurnitureMaterials } from '@/components/Kitchen3D/materials'
import { box, bulbBall, cylinder, fixtureBulb, standard } from '@/components/Kitchen3D/primitives'

/** La porte blanche du mur ouest (celle du couloir, à côté de la cloison), ouverte, le battant dans le salon. */
export const corridorDoor = (m: FurnitureMaterials): THREE.Group => {
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

/**
 * L'entrée : la porte blanche au fond de la petite pièce et son paillasson, la suspension en rotin, le poteau de chêne, le passage ouvert,
 * puis le muret bas coiffé de bois qui porte le claustra en lames de chêne jusqu'au mur.
 */
export const entry = (m: FurnitureMaterials): THREE.Group => {
  const group = new THREE.Group()
  const { x, postZ, claustraZ, wallZ, doorZ, doorX, doorWidth, doorHeight, northX, muret } = ENTRY
  // La porte d'entrée blanche : quatre panneaux moulurés, un hublot en demi-lune au verre turquoise, une poignée de laiton côté cuisine.
  const face = doorZ - 0.058
  group.add(box(doorWidth, doorHeight, 0.05, m.white, doorX, doorHeight / 2, doorZ - 0.03))
  for (const side of [-1, 1]) for (const [panelY, tall] of [[0.52, 0.6], [1.22, 0.62]]) group.add(box(0.26, tall, 0.008, m.shutter, doorX + 0.17 * side, panelY, face))
  const moon = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24, 0, Math.PI), standard(0x58c2c0, 0.3))
  moon.rotation.y = Math.PI
  moon.position.set(doorX, 1.62, face)
  group.add(moon)
  // Son dos, côté sas, a le même décor : les quatre panneaux et la demi-lune ; et la poignée de laiton est des deux côtés.
  const rear = doorZ - 0.002
  for (const side of [-1, 1]) for (const [panelY, tall] of [[0.52, 0.6], [1.22, 0.62]]) group.add(box(0.26, tall, 0.008, m.shutter, doorX + 0.17 * side, panelY, rear))
  const rearMoon = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24, 0, Math.PI), standard(0x58c2c0, 0.3))
  rearMoon.position.set(doorX, 1.62, rear + 0.005)
  group.add(rearMoon)
  const brass = oldBrass()
  for (const [plate, lever] of [[doorZ - 0.07, doorZ - 0.09], [doorZ + 0.01, doorZ + 0.03]]) group.add(box(0.03, 0.2, 0.02, brass, doorX - doorWidth / 2 + 0.09, 1.05, plate), box(0.11, 0.02, 0.03, brass, doorX - doorWidth / 2 + 0.14, 1.07, lever))
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
