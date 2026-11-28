import * as THREE from 'three'
import { SAS } from '@/components/Kitchen3D/constants'
import { mirrorGlass } from '@/components/Kitchen3D/materials'
import type { RoomMaterials } from '@/components/Kitchen3D/materials'
import { box, BULB_OFF, bulbBall, cylinder, facing, fixtureBulb, standard } from '@/components/Kitchen3D/primitives'

/** Un petit tableau : un cadre noir large, un passe-partout crème, et dedans une vue en deux plans (le ciel et la mer d'un côté, un dôme de l'autre), liseré de `edge`. Il regarde vers +z. */
const framed = (wide: number, tall: number, [sky, dome]: [number, number], [edge]: [number]): THREE.Group => {
  const group = new THREE.Group()
  const black = standard(0x15110f, 0.6)
  group.add(box(wide, tall, 0.025, black, 0, 0, 0))
  group.add(box(wide - 0.07, tall - 0.07, 0.006, standard(0xe7e0cc, 0.9), 0, 0, 0.014))
  group.add(box(wide - 0.12, tall - 0.12, 0.006, standard(edge, 0.7), 0, 0, 0.018))
  group.add(box(wide - 0.13, tall - 0.13, 0.006, standard(sky, 0.7), 0, 0, 0.021))
  group.add(box((wide - 0.13) * 0.3, (tall - 0.13) * 0.45, 0.006, standard(dome, 0.7), (wide - 0.13) * 0.18, -(tall - 0.13) * 0.12, 0.024))
  return group
}

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
  // Le porte-manteau : une barre de chêne sur le fond bleu (vers 1,55 m), et cinq patères noires, la pointe relevée.
  const rail = north + deep - 0.03
  group.add(box(0.03, 0.07, nookWide - 0.1, m.oak, rail, 1.55, nookZ))
  for (let hook = 0; hook < 5; hook += 1) {
    const hookZ = nookFrom + 0.1 + (hook * (nookWide - 0.2)) / 4
    group.add(box(0.06, 0.016, 0.016, m.black, rail - 0.04, 1.55, hookZ), box(0.016, 0.04, 0.016, m.black, rail - 0.07, 1.56, hookZ))
  }
  // La plante artificielle (un hibiscus orange) : posée sur la planche de chêne (l'étagère haute), du côté gauche, en touffe de feuilles et de fleurs, dont des brins retombent devant la planche.
  const leaf = standard(0x3f7a38, 0.8)
  const bloom = standard(0xe8632a, 0.7)
  const front = north + 0.02
  for (let part = 0; part < 20; part += 1) {
    const blossom = part % 3 === 1
    const piece = new THREE.Mesh(new THREE.IcosahedronGeometry(blossom ? 0.035 : 0.05, 0), blossom ? bloom : leaf)
    if (part < 12) {
      // Sur la planche : un buisson de 20 cm de haut, au bout gauche.
      piece.position.set(north + 0.05 + (part % 4) * 0.045, 1.95 + ((part * 7) % 5) * 0.03, nookFrom + 0.06 + (part % 3) * 0.05)
    } else {
      // Les brins qui retombent devant la planche, le long du fond bleu (vers le porte-manteau).
      const drop = (part - 12) / 7
      piece.position.set(front - 0.02 - (part % 2) * 0.03, 1.88 - drop * 0.3, nookFrom + 0.06 + Math.sin(part * 1.7) * 0.03 + drop * 0.06)
    }
    piece.scale.set(1, blossom ? 0.7 : 0.6, 1.2)
    group.add(piece)
  }
  // L'applique, sur le mur entre la porte de la buanderie et la niche : une rosace noire, un bras, une cage de jute et son ampoule.
  const lampZ = (SAS.laundry[1] + nookFrom) / 2
  group.add(cylinder(0.06, 0.06, 0.02, m.black, north - 0.01, 2.0, lampZ).rotateZ(Math.PI / 2), box(0.26, 0.012, 0.012, m.black, north - 0.14, 2.05, lampZ))
  const cage = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), new THREE.MeshStandardMaterial({ color: 0xb08a55, roughness: 0.9, wireframe: true }))
  cage.position.set(north - 0.26, 1.92, lampZ)
  // Son ampoule est un luminaire de la scène (`fixtureBulb`) : elle suit la lampe de la maison la plus proche, se clique, et se voit en vue Matrix (ses trois cercles rouges).
  group.add(cage, fixtureBulb(bulbBall(0.035, cage.position.x, cage.position.y, cage.position.z)))
  // Une seconde applique, au mur du fond côté maison (d'après photo) : une platine ronde noire, un bras coudé et un abat-jour noir en dôme, qui regarde vers le bas.
  // Elle n'est reliée à rien (la vraie s'allume et s'éteint, mais ne fait rien) : ni luminaire marqué, ni lumière, et son ampoule reste éteinte.
  const sideX = (south + north) / 2
  const sideZ = west + 0.02
  const spot = new THREE.Group()
  spot.add(cylinder(0.05, 0.05, 0.015, m.black, 0, 0, 0.0075).rotateX(Math.PI / 2), box(0.012, 0.012, 0.16, m.black, 0, 0, 0.09), box(0.012, 0.1, 0.012, m.black, 0, -0.05, 0.17))
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.black)
  dome.position.set(0, -0.09, 0.17)
  dome.rotation.x = Math.PI
  const spotBulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), new THREE.MeshBasicMaterial({ color: BULB_OFF }))
  spotBulb.position.set(0, -0.12, 0.17)
  spot.add(dome, spotBulb)
  spot.position.set(sideX, 1.95, sideZ)
  group.add(spot)
  // Le miroir encadré de chêne, sur le mur sud, près de la porte d'entrée.
  group.add(box(0.03, 1.5, 0.55, m.oak, south + 0.015, 1.15, west + 0.5), box(0.006, 1.36, 0.42, mirrorGlass(), south + 0.033, 1.15, west + 0.5))
  // Deux petits tableaux de la même série (cadre noir strié, large passe-partout crème, une vue des Cyclades) : l'un en noir et blanc à droite du porte-manteau,
  // sur le bout du mur nord ; l'autre en couleurs, à gauche de la porte du dehors, sur le mur sud.
  const gap = 0.02
  const north2 = framed(0.22, 0.17, [0x8c8f92, 0x2f6fbf], [0x27475f])
  north2.position.set(north - gap, 1.5, (SAS.nook[1] + east) / 2)
  group.add(facing(north2, -1, 0))
  const south2 = framed(0.22, 0.17, [0x2e7bd6, 0xb4562c], [0xd9542c])
  south2.position.set(south + gap, 1.5, (SAS.door[1] + east) / 2)
  group.add(facing(south2, 1, 0))
  return group
}
