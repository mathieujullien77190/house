import * as THREE from 'three'
import { SAS } from '@/components/Kitchen3D/constants'
import { mirrorGlass } from '@/components/Kitchen3D/materials'
import type { RoomMaterials } from '@/components/Kitchen3D/materials'
import { box, cylinder, standard } from '@/components/Kitchen3D/primitives'

/**
 * Le sas : la porte du dehors, blanche, à neuf carreaux dépolis, dans le mur sud ; la fenêtre à deux vantaux du mur est, encadrée de chêne ; dessous, l'étagère à chaussures ; dans le mur nord, la niche des manteaux (fond bleu, banc de chêne sur
 * trois paniers, étagère haute), et l'applique à cage de jute ; le miroir encadré de chêne sur le
 * mur sud.
 */
export const sas = (m: RoomMaterials): THREE.Group => {
  const group = new THREE.Group()
  const { south, north, west, east } = SAS
  // La porte du dehors, dans son embrasure : un panneau plein en bas, neuf carreaux dépolis en haut, une poignée noire.
  const doorZ = (SAS.door[0] + SAS.door[1]) / 2
  const doorWide = SAS.door[1] - SAS.door[0]
  // La porte est au fond de l'embrasure, dans l'épaisseur du mur (30 cm).
  const doorX = south - 0.22
  const glazed = doorWide - 0.2
  group.add(box(0.045, 2.0, doorWide - 0.07, m.white, doorX, 1.01, doorZ), box(0.05, 1.05, glazed, m.frosted, doorX, 1.42, doorZ))
  for (const cut of [-1, 1]) group.add(box(0.056, 1.05, 0.025, m.white, doorX, 1.42, doorZ + (cut * glazed) / 6), box(0.056, 0.025, glazed, m.white, doorX, 1.42 + cut * 0.175, doorZ))
  // Sa poignée, des deux côtés (dedans et dehors).
  for (const side of [-1, 1]) group.add(box(0.05, 0.12, 0.02, m.black, doorX + side * 0.03, 1.02, doorZ - doorWide / 2 + 0.09), box(0.02, 0.02, 0.1, m.black, doorX + side * 0.06, 1.05, doorZ - doorWide / 2 + 0.13))
  // L'habillage de chêne de l'embrasure, pris dans l'épaisseur du mur, au nu du mur intérieur : deux montants et la traverse du dessus.
  for (const side of [-1, 1]) group.add(box(0.3, 2.05, 0.03, m.oak, south - 0.148, 1.025, doorZ + side * (doorWide / 2 - 0.015)))
  group.add(box(0.3, 0.03, doorWide, m.oak, south - 0.148, 2.035, doorZ))
  // La fenêtre du mur est : cadre de chêne, deux vantaux blancs, leurs vitres.
  const { z: windowX, width, bottom, height: tall } = SAS.window
  const middleY = bottom + tall / 2
  for (const side of [-1, 1]) {
    group.add(box(0.03, tall + 0.06, 0.04, m.oak, windowX + side * (width / 2 + 0.015), middleY, east - 0.02), box(width + 0.06, 0.03, 0.04, m.oak, windowX, middleY + side * (tall / 2 + 0.015), east - 0.02))
    group.add(box(0.05, tall, 0.04, m.white, windowX + side * (width / 2 - 0.025), middleY, east + 0.01), box(width, 0.05, 0.04, m.white, windowX, middleY + side * (tall / 2 - 0.025), east + 0.01))
    group.add(box(width / 2 - 0.08, tall - 0.1, 0.008, m.glass, windowX + side * (width / 4 - 0.01), middleY, east + 0.01))
  }
  group.add(box(0.07, tall, 0.04, m.white, windowX, middleY, east + 0.01))
  // Le grand tapis sombre, du milieu du sas jusqu'au mur de la fenêtre.
  // Il part de l'aplomb de l'applique du mur nord et couvre tout le reste du sas, d'un mur à l'autre et jusqu'au mur de la fenêtre ;
  // il entre dans l'embrasure de la porte du dehors.
  const matFrom = (SAS.laundry[1] + SAS.nook[0]) / 2
  group.add(box(north - south - 0.004, 0.012, east - matFrom - 0.002, standard(0x3f4247, 0.95), (north + south) / 2, 0.006, (east + matFrom) / 2))
  group.add(box(0.3, 0.012, SAS.door[1] - SAS.door[0], standard(0x3f4247, 0.95), south - 0.15, 0.006, (SAS.door[0] + SAS.door[1]) / 2))
  // Sous la fenêtre : l'étagère à chaussures en lattes de bois, deux niveaux.
  const rackX = windowX - 0.05
  for (const y of [0.14, 0.3]) group.add(box(0.7, 0.02, 0.26, m.oak, rackX, y, east - 0.16))
  for (const side of [-1, 1]) group.add(box(0.02, 0.3, 0.26, m.oak, rackX + side * 0.34, 0.15, east - 0.16))
  // Le coin des manteaux : une niche creusée dans le mur nord (le mur est percé, `house/outer.ts`). Ses joues et son plafond blancs, son fond
  // bleu, le banc de chêne sur trois paniers (son plateau dépasse un peu du mur), et l'étagère haute.
  const [nookFrom, nookTo] = SAS.nook
  const nookZ = (nookFrom + nookTo) / 2
  const nookWide = nookTo - nookFrom
  const deep = SAS.nookDepth
  const lining = new THREE.Mesh(new THREE.BoxGeometry(deep, SAS.nookTop, nookWide), new THREE.MeshStandardMaterial({ color: 0xf4f4f1, roughness: 0.6, side: THREE.BackSide }))
  lining.position.set(north + deep / 2, SAS.nookTop / 2, nookZ)
  group.add(lining, box(0.008, SAS.nookTop - 0.46, nookWide - 0.004, m.blueWall, north + deep - 0.006, (SAS.nookTop + 0.46) / 2, nookZ))
  group.add(box(deep, 0.42, nookWide - 0.004, m.white, north + deep / 2, 0.21, nookZ), box(deep + 0.05, 0.04, nookWide - 0.004, m.oak, north + deep / 2 - 0.025, 0.44, nookZ))
  for (const cut of [-1, 0, 1]) group.add(box(0.02, 0.28, nookWide / 3 - 0.04, m.wicker, north - 0.004, 0.2, nookZ + (cut * nookWide) / 3))
  group.add(box(deep - 0.02, 0.03, nookWide - 0.004, m.oak, north + deep / 2, 1.9, nookZ))
  // L'applique, sur le mur entre la porte de la buanderie et la niche : une rosace noire, un bras, une cage de jute et son ampoule.
  const lampZ = (SAS.laundry[1] + nookFrom) / 2
  group.add(cylinder(0.06, 0.06, 0.02, m.black, north - 0.01, 2.0, lampZ).rotateZ(Math.PI / 2), box(0.26, 0.012, 0.012, m.black, north - 0.14, 2.05, lampZ))
  const cage = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), new THREE.MeshStandardMaterial({ color: 0xb08a55, roughness: 0.9, wireframe: true }))
  cage.position.set(north - 0.26, 1.92, lampZ)
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), m.bulb)
  glow.position.copy(cage.position)
  group.add(cage, glow)
  // Le miroir encadré de chêne, sur le mur sud, près de la porte d'entrée.
  group.add(box(0.03, 1.5, 0.55, m.oak, south + 0.015, 1.15, west + 0.5), box(0.006, 1.36, 0.42, mirrorGlass(), south + 0.033, 1.15, west + 0.5))
  return group
}
