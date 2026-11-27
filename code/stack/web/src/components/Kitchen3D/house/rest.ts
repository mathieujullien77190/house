import * as THREE from 'three'
import { BATH_WINDOW, ENTRY, GUEST_WINDOW, KITCHEN, MATOU_WINDOW, PASSAGE, REST, ROOM, SAS, SHELL, WC_ALCOVE } from '@/components/Kitchen3D/constants'
import { box, bulbBall, fixtureBulb, standard } from '@/components/Kitchen3D/primitives'
import { sisalTexture } from '@/components/Kitchen3D/textures'
import type { Area, Gap, Shell } from './walls'

// Le reste de la maison, d'après le plan de la maison : des pièces vides (sol, murs blancs à plinthe, plafond de lambris), lisibles de
// l'intérieur comme les autres. À l'ouest : la chambre 1, la salle de bain, le couloir et la chambre 2 ; à l'est de la cuisine, derrière
// le mur du frigo : la cage de l'escalier.

// Les trois portes du fond du couloir (sans battant) : au bout, celle de la chambre d'invité ; à droite en entrant, celle de la salle de
// bain ; à gauche, celle de la chambre 2.
const END_DOOR: Gap = [REST.corridorSouth + 0.08, REST.corridorNorth - 0.02]
const SIDE_DOOR: Gap = [REST.middle + 0.08, REST.middle + 0.81]

/** La chambre d’invité et la salle de bain (leurs meubles : `furniture/`), leurs cloisons et les murs épais qui les séparent du couloir. */
export const guestAndBath = (shell: Shell): void => {
  const { group, materials, sill, solid, emptyRoom } = shell
  const { xMax, zMin, height } = ROOM
  const { west, middle, corridorNorth, corridorSouth, bathSouth, bathWest, guestEast, guestSouth } = REST
  // La chambre d'invité a un sol de sisal beige ; la salle de bain, du parquet (leurs meubles : `furniture/`).
  emptyRoom([guestSouth, xMax, west, guestEast], standard(sisalTexture(), 0.95), { east: [END_DOOR] }, { west: [GUEST_WINDOW] })
  // Les cloisons de la chambre d'invité, pleines : 8 cm vers la salle de bain, quelques centimètres vers la chambre 2.
  group.add(box(xMax - bathSouth - 0.002, height, bathWest - guestEast - 0.002, materials.wall, (xMax + bathSouth) / 2, height / 2, (bathWest + guestEast) / 2))
  // Celle de la chambre 2 est épaissie de 6 cm, pris sur la chambre 2.
  const matouWall = corridorSouth - 0.06
  // Elle continue jusqu'à la porte de la chambre 2 (le mur ne s'amincit pas au-dessus d'elle).
  const matouTo = SIDE_DOOR[0]
  group.add(box(guestSouth - matouWall - 0.002, height, matouTo - west - 0.002, materials.wall, (guestSouth + matouWall) / 2, height / 2, (matouTo + west) / 2))
  // Et de l'autre côté de la porte, il continue jusqu'au mur d'en face (celui de la penderie), avec un linteau plein au-dessus de la porte.
  const thick = guestSouth - matouWall - 0.002
  const middleX = (guestSouth + matouWall) / 2
  const [, doorTo] = SIDE_DOOR
  group.add(box(thick, height, REST.matouEast - doorTo, materials.wall, middleX, height / 2, (doorTo + REST.matouEast) / 2))
  group.add(box(thick, height - PASSAGE.top, doorTo - matouTo, materials.wall, middleX, (height + PASSAGE.top) / 2, (matouTo + doorTo) / 2))
  emptyRoom([bathSouth, xMax, bathWest, zMin], 'small', { south: [SIDE_DOOR] }, { east: [{ z: WC_ALCOVE.x, width: WC_ALCOVE.width, bottom: WC_ALCOVE.bottom, height: WC_ALCOVE.height }], north: [BATH_WINDOW] })
  // Entre ces pièces, les murs épais sont pleins : celui du couloir à la salle de bain, et celui du bout du couloir à la chambre d'invité.
  // Leurs seuils de porte sont en chêne clair.
  solid('z', middle, zMin, corridorNorth, bathSouth, [SIDE_DOOR], sill)
  solid('x', corridorSouth, bathSouth, guestEast, middle, [END_DOOR], sill)
}

/** Le couloir : du parquet comme au salon, la porte du salon d’un côté, les trois autres au fond, et son plafonnier. */
export const corridor = (shell: Shell): void => {
  const { group, materials, floors, wall, slab, gapped } = shell
  const { zMin, height } = ROOM
  const { middle, corridorNorth, corridorSouth } = REST
  const corridor: Area = [corridorSouth, corridorNorth, middle, zMin]
  gapped('x', corridorSouth, corridorNorth, middle, 1, [END_DOOR])
  gapped('z', middle, zMin, corridorSouth, 1, [SIDE_DOOR])
  gapped('z', middle, zMin, corridorNorth, -1, [SIDE_DOOR])
  wall('x', corridorSouth, PASSAGE.from, zMin, -1)
  wall('x', PASSAGE.to, corridorNorth, zMin, -1)
  wall('x', PASSAGE.from, PASSAGE.to, zMin, -1, PASSAGE.top)
  // Au-dessus de la porte du couloir, le mur a son épaisseur (5 cm) : un linteau plein, dont on voit le dessous en passant.
  group.add(box(PASSAGE.to - PASSAGE.from, height - PASSAGE.top, 0.05, materials.wall, (PASSAGE.from + PASSAGE.to) / 2, (height + PASSAGE.top) / 2, zMin - 0.026))
  slab(materials.lambris, height, false, corridor)
  slab(materials.floor, -0.0005, true, corridor)
  floors.push(corridor)
  // Le plafonnier du couloir : une rosace noire, une courte tige, une coupole d'osier ouverte vers le bas et son ampoule (la lampe « Couloir »).
  const lampX = (corridorSouth + corridorNorth) / 2
  const lampZ = (middle + zMin) / 2
  const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 20), materials.lamp)
  rosette.position.set(lampX, height - 0.01, lampZ)
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.1, 28, 1, true), standard(0xcaa46a, 0.9, 0, THREE.DoubleSide))
  shade.position.set(lampX, height - 0.2, lampZ)
  group.add(rosette, box(0.012, 0.13, 0.012, materials.lamp, lampX, height - 0.085, lampZ), shade, fixtureBulb(bulbBall(0.045, lampX, height - 0.23, lampZ), 'couloir'))
}

/** La chambre de Matou (la chambre 2) : sa porte ouverte, et le placard encastré entre elle et le mur de la télé. */
export const matouRoom = (shell: Shell): void => {
  const { group, materials, emptyRoom } = shell
  const { xMin, zMin, height } = ROOM
  const { west, corridorSouth, matouEast } = REST
  // Pas de parquet dans les chambres : un sol uni, clair.
  const plain = standard(0xdcd8d0, 0.8)
  // Son mur du couloir est épaissi de 6 cm (voir `guestAndBath`) : la pièce s'arrête à sa face, et la plinthe est contre elle, pas dedans.
  emptyRoom([xMin, corridorSouth - 0.06, west, matouEast], plain, { north: [SIDE_DOOR] }, { south: [MATOU_WINDOW] })
  // Sa porte : un battant blanc ouvert dans la chambre, rabattu du côté du mur du placard (ses gonds sont de ce côté), avec sa poignée noire.
  const leafWide = SIDE_DOOR[1] - SIDE_DOOR[0] - 0.02
  const leafZ = SIDE_DOOR[1] - 0.03
  group.add(box(leafWide, PASSAGE.top - 0.02, 0.04, standard(0xf6f6f3, 0.55), corridorSouth - 0.06 - leafWide / 2, (PASSAGE.top - 0.02) / 2, leafZ))
  for (const side of [-1, 1]) group.add(box(0.12, 0.02, 0.03, materials.lamp, corridorSouth - 0.06 - leafWide + 0.11, 1.02, leafZ + side * 0.035))
  // Entre la chambre et le mur de la télé : un mur blanc épais où est encastré le placard. Quatre portes blanches à cadre (quatre panneaux
  // séparés par des traverses), dans un chambranle blanc, chacune avec sa poignée noire ; les deux du milieu s'ouvrent l'une vers l'autre.
  group.add(box(corridorSouth - xMin - 0.002, height, zMin - matouEast - 0.002, materials.wall, (corridorSouth + xMin) / 2, height / 2, (zMin + matouEast) / 2))
  // Décalé à droite pour qui le regarde (vers le mur des baies) : 10 cm entre son chambranle et ce mur.
  const closet = { x: xMin + 0.1 + 0.07 + 1, width: 2, height: 2.02, door: 0.5 }
  const closetWhite = standard(0xf6f6f3, 0.55)
  const closetShade = standard(0xe4e4e0, 0.6)
  const closetFace = matouEast - 0.012
  group.add(box(closet.width + 0.14, 0.07, 0.02, closetWhite, closet.x, closet.height + 0.035, matouEast - 0.01))
  for (const side of [-1, 1]) group.add(box(0.07, closet.height, 0.02, closetWhite, closet.x + side * (closet.width / 2 + 0.035), closet.height / 2, matouEast - 0.01))
  for (let door = 0; door < 4; door += 1) {
    const doorX = closet.x - closet.width / 2 + closet.door * (door + 0.5)
    group.add(box(closet.door - 0.008, closet.height - 0.01, 0.02, closetWhite, doorX, closet.height / 2, closetFace))
    // Les quatre panneaux en creux, entre le cadre et les traverses.
    for (let panel = 0; panel < 4; panel += 1) group.add(box(closet.door - 0.16, closet.height / 4 - 0.09, 0.004, closetShade, doorX, (closet.height / 4) * (panel + 0.5), closetFace - 0.011))
    // La poignée, du côté où la porte s'ouvre : au milieu pour les portes 2 et 3, vers le milieu aussi pour les deux du bord.
    const handleSide = door < 2 ? 1 : -1
    group.add(box(0.012, 0.14, 0.02, materials.lamp, doorX + handleSide * (closet.door / 2 - 0.045), 0.95, closetFace - 0.025))
  }
}

/** La cage de l’escalier, qui sert aussi de buanderie : sa porte donne sur le sas. */
export const laundry = (shell: Shell): void => {
  const { group, materials, sill, solid, emptyRoom } = shell
  const { xMax, zMax, height } = ROOM
  const { shellBack } = SHELL
  // Le mur entre elle et l'entrée (puis le sas) fait 5 cm : plein, percé de la porte, avec son seuil.
  const laundryWall = 0.05
  // Le sas est plus large que l'entrée : la cage commence à son mur nord, et l'écart derrière le mur de l'entrée est plein.
  emptyRoom([SAS.north + laundryWall, xMax, shellBack, zMax], standard(0x8f9296, 0.8), { south: [SAS.laundry] })
  solid('z', shellBack, zMax, SAS.north, SAS.north + laundryWall, [SAS.laundry], sill)
  group.add(box(SAS.north - ENTRY.northX, height, SAS.west - shellBack, materials.wall, (SAS.north + ENTRY.northX) / 2, height / 2, (SAS.west + shellBack) / 2))
}

/** Le mur épais entre la salle de bain et la cuisine (30 cm), plein. */
export const bathKitchenWall = (shell: Shell): void => {
  const { group, materials } = shell
  const { xMax, zMin, height } = ROOM
  // Il est plein sur toute son épaisseur, sauf derrière l'alcôve des WC, où il est en retrait de sa profondeur.
  const alcoveFrom = WC_ALCOVE.x - WC_ALCOVE.width / 2
  const alcoveTo = WC_ALCOVE.x + WC_ALCOVE.width / 2
  const thickWall = (from: number, to: number, setback: number) =>
    group.add(box(to - from - 0.002, height, KITCHEN.zMin - zMin - setback - 0.002, materials.wall, (from + to) / 2, height / 2, (KITCHEN.zMin + zMin + setback) / 2))
  thickWall(KITCHEN.xMin, alcoveFrom, 0)
  thickWall(alcoveFrom, alcoveTo, WC_ALCOVE.depth)
  // Le retrait ne vaut qu'à la hauteur de l'alcôve : au-dessus (jusqu'au plafond) et en dessous (jusqu'au sol), le mur est plein.
  const alcoveTop = WC_ALCOVE.bottom + WC_ALCOVE.height
  const alcoveZ = zMin + WC_ALCOVE.depth / 2
  group.add(box(WC_ALCOVE.width - 0.002, height - alcoveTop, WC_ALCOVE.depth, materials.wall, WC_ALCOVE.x, (height + alcoveTop) / 2, alcoveZ))
  group.add(box(WC_ALCOVE.width - 0.002, WC_ALCOVE.bottom, WC_ALCOVE.depth, materials.wall, WC_ALCOVE.x, WC_ALCOVE.bottom / 2, alcoveZ))
  thickWall(alcoveTo, xMax, 0)
}
