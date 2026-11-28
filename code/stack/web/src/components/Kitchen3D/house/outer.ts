import * as THREE from 'three'
import { BASE, BATH_WINDOW, ENTRY, GUEST_WINDOW, KITCHEN_BAYS, MAST, MAST_CAMERA, MATOU_WINDOW, NOOK_WINDOW, OUTER_WALL, PASSAGE, REST, ROOM, SALON_BAYS, SAS } from '@/components/Kitchen3D/constants'
import { SITE } from '@/components/Kitchen3D/garden/layout'
import { box, bulbBall, facing, fixtureBulb, standard } from '@/components/Kitchen3D/primitives'
import { reolink } from '@/components/Kitchen3D/reolink'
import { terracottaTexture } from '@/components/Kitchen3D/textures'
import type { Area, Bay, Gap, Shell } from './walls'

/**
 * Les murs extérieurs de la maison : 30 cm d'épaisseur, pleins (vus des deux côtés), posés juste derrière les pans intérieurs et percés
 * aux fenêtres et à la porte d'entrée. `axis` : le sens du mur ; `inner` : sa face intérieure ; `out` : de quel côté est le dehors.
 */
const outerKit = (group: THREE.Group) => {
  const { height } = ROOM
  // Le crépi crème de la façade, le soubassement de pierre claire, et le blanc des appuis de fenêtre.
  const outerMaterial = standard(0xeadfc6, 0.9)
  const baseMaterial = standard(0xcbc7bd, 0.95)
  const sillMaterial = standard(0xf4f4f1, 0.6)
  const outer = (axis: 'x' | 'z', from: number, to: number, inner: number, out: 1 | -1, bays: Bay[] = [], corners: [boolean, boolean] = [false, false]) => {
    const across = inner + out * (OUTER_WALL / 2 + 0.002)
    const piece = (start: number, end: number, bottom: number, top: number) => {
      if (end - start < 0.001 || top - bottom < 0.001) return
      const along = (start + end) / 2
      const middle = (bottom + top) / 2
      group.add(axis === 'z' ? box(OUTER_WALL, top - bottom, end - start, outerMaterial, across, middle, along) : box(end - start, top - bottom, OUTER_WALL, outerMaterial, along, middle, across))
    }
    // Dessous, le muret de soubassement, du terrain au sol de la maison : gris, en retrait du nu du mur, d'un seul tenant sous les baies.
    const baseThick = OUTER_WALL - BASE.setback
    const baseAcross = inner + out * (baseThick / 2 + 0.002)
    // À un angle de la maison (`corners` : le bout de départ, le bout d'arrivée), le muret s'arrête lui aussi en retrait : il tourne le coin d'équerre avec son voisin.
    const baseFrom = from + (corners[0] ? BASE.setback : 0)
    const baseTo = to - (corners[1] ? BASE.setback : 0)
    group.add(axis === 'z' ? box(baseThick, BASE.rise, baseTo - baseFrom, baseMaterial, baseAcross, -BASE.rise / 2, (baseFrom + baseTo) / 2) : box(baseTo - baseFrom, BASE.rise, baseThick, baseMaterial, (baseFrom + baseTo) / 2, -BASE.rise / 2, baseAcross))
    let cursor = from
    for (const bay of [...bays].sort((a, b) => a.z - b.z)) {
      const start = bay.z - bay.width / 2
      const end = bay.z + bay.width / 2
      piece(cursor, start, 0, height)
      piece(start, end, 0, bay.bottom)
      piece(start, end, bay.bottom + bay.height, height)
      // Dehors, pas de cadre autour des fenêtres : seulement, en bas, un rebord blanc horizontal qui couvre le mur dans toute son épaisseur (du nu intérieur au dehors) et déborde de 4 cm.
      if (bay.bottom > 0.3) {
        const deep = OUTER_WALL + 0.04
        const sillAcross = inner + out * (deep / 2 + 0.002)
        group.add(axis === 'z' ? box(deep, 0.03, bay.width + 0.06, sillMaterial, sillAcross, bay.bottom + 0.005, bay.z) : box(bay.width + 0.06, 0.03, deep, sillMaterial, bay.z, bay.bottom + 0.005, sillAcross))
      }
      cursor = end
    }
    piece(cursor, to, 0, height)
  }
  return { outer, outerMaterial }
}

type OuterWall = ReturnType<typeof outerKit>['outer']

/**
 * Le sas : l'avancée derrière la porte d'entrée. Ses murs intérieurs (la porte d'entrée à l'ouest, la porte de la buanderie au nord, la
 * porte du dehors au sud, la fenêtre à l'est), son plafond de lambris et son parquet (le même qu'au salon) ; puis ses trois murs extérieurs.
 */
const sasShell = (shell: Shell, outer: OuterWall, outerMaterial: THREE.Material): void => {
  const { group, materials, floors, sill, wall, slab, pierced, gapped, solid } = shell
  const { zMax, height } = ROOM
  const sasArea: Area = [SAS.south, SAS.north, SAS.west, SAS.east]
  // Le mur de la porte d'entrée fait 5 cm : plein, percé de la porte, son pan côté sas posé sur sa face.
  const entryDoorGap: Gap = [ENTRY.doorX - ENTRY.doorWidth / 2, ENTRY.doorX + ENTRY.doorWidth / 2]
  gapped('x', SAS.south, SAS.north, SAS.west + 0.05, 1, [entryDoorGap])
  solid('x', SAS.south, SAS.north, SAS.west, SAS.west + 0.05, [entryDoorGap], sill)
  // Le mur nord : la porte de la buanderie, puis la niche des manteaux (le pan s'arrête à ses bords et reprend au-dessus).
  gapped('z', SAS.west, SAS.nook[0], SAS.north, -1, [SAS.laundry])
  wall('z', SAS.nook[0], SAS.nook[1], SAS.north, -1, SAS.nookTop)
  wall('z', SAS.nook[1], SAS.east, SAS.north, -1)
  gapped('z', zMax, SAS.east, SAS.south, 1, [SAS.door])
  pierced('x', SAS.south, SAS.north, SAS.east, -1, [SAS.window])
  slab(materials.lambris, height, false, sasArea)
  slab(materials.floor, -0.0005, true, sasArea)
  floors.push(sasArea)
  outer('x', SAS.south - OUTER_WALL, SAS.north + OUTER_WALL, SAS.east, 1, [SAS.window], [true, true])
  // Dehors, à la hauteur du haut de cette fenêtre, entre elle et le bout du mur (à droite pour qui la regarde du dehors), un poteau
  // d'acier carré de 4 cm monte d'1,50 m et dépasse le mur ; il en est écarté de 10 cm, tenu par deux pattes.
  const steel = standard(0x8f9499, 0.4, 0.8)
  group.add(box(0.04, MAST.tall, 0.04, steel, MAST.x, MAST.from + MAST.tall / 2, MAST.z))
  for (const y of [MAST.from + 0.05, ROOM.height - 0.08]) group.add(box(0.03, 0.01, 0.1, steel, MAST.x, y, MAST.z - 0.07))
  // Sur ce poteau, à la hauteur du haut du mur, une caméra Reolink regarde la cage à perruches : son milieu, à hauteur de perchoir (le jardin est plus bas que le
  // sol de la maison).
  group.add(reolink(new THREE.Vector3(MAST.x, ROOM.height - 0.05, MAST.z + 0.045), new THREE.Vector3(SITE.middleX, 1.2 - BASE.rise, (SITE.cageZ1 + SITE.cageZ2) / 2), MAST_CAMERA))
  outer('z', zMax + OUTER_WALL, SAS.east, SAS.south, -1, [{ z: (SAS.door[0] + SAS.door[1]) / 2, width: SAS.door[1] - SAS.door[0], bottom: 0, height: PASSAGE.top }])
  // Le mur extérieur nord est creusé par la niche : il n'en reste, derrière elle, qu'une peau de quelques centimètres.
  const nookMiddle = (SAS.nook[0] + SAS.nook[1]) / 2
  const nookWide = SAS.nook[1] - SAS.nook[0]
  outer('z', zMax + OUTER_WALL, SAS.east, SAS.north, 1, [{ z: nookMiddle, width: nookWide, bottom: 0, height: SAS.nookTop }])
  const skin = OUTER_WALL - SAS.nookDepth
  group.add(box(skin, SAS.nookTop, nookWide, outerMaterial, SAS.north + 0.002 + OUTER_WALL - skin / 2, SAS.nookTop / 2, nookMiddle))
}

/**
 * La lanterne de l'entrée, sur le mur du sas à droite de sa porte, vers 1,95 m : une platine blanche en cartouche, un bras courbe, et la lanterne
 * à quatre pans (verre dépoli éclairé, armature sombre, toit en pyramide et pointe). Son ampoule est un luminaire de la scène (`fixtureBulb`).
 */
const entryLantern = (group: THREE.Group): void => {
  const lantern = new THREE.Group()
  const dark = standard(0x26282a, 0.5, 0.3)
  const white = standard(0xf1efe8, 0.6)
  lantern.add(box(0.2, 0.15, 0.025, white, 0, 0, 0.0125), box(0.04, 0.04, 0.09, dark, 0, 0.0, 0.07))
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.26, 4, 1, true), standard(0xe9eee8, 0.4))
  body.rotation.y = Math.PI / 4
  body.position.set(0, 0.2, 0.16)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.09, 4), dark)
  roof.rotation.y = Math.PI / 4
  roof.position.set(0, 0.375, 0.16)
  lantern.add(body, roof, box(0.014, 0.05, 0.014, dark, 0, 0.44, 0.16), box(0.14, 0.02, 0.14, dark, 0, 0.06, 0.16))
  for (const corner of [0, 1, 2, 3]) lantern.add(box(0.012, 0.26, 0.012, dark, Math.cos(corner * (Math.PI / 2)) * 0.063, 0.2, 0.16 + Math.sin(corner * (Math.PI / 2)) * 0.063))
  lantern.add(fixtureBulb(bulbBall(0.05, 0, 0.2, 0.16)))
  const z = (SAS.door[1] + SAS.east) / 2
  lantern.position.set(SAS.south - OUTER_WALL - 0.002, 1.8, z)
  group.add(facing(lantern, -1, 0))
}

/** Deux marches carrelées devant la porte du sas : le sol de la maison est plus haut que le terrain (côté baies, la terrasse est surélevée : `garden/ground.ts`). */
const entrySteps = (group: THREE.Group): void => {
  const z = (SAS.door[0] + SAS.door[1]) / 2
  const wide = SAS.door[1] - SAS.door[0] + 0.3
  // Carrelées de la même terre cuite que la terrasse (le motif d'un mètre est ramené à la taille du dessus de la marche).
  const tiles = terracottaTexture()
  tiles.repeat.set(0.3, wide)
  const tiled = standard(tiles, 0.85)
  for (const [index, tall] of [BASE.rise, BASE.rise / 2].entries()) group.add(box(0.3, tall, wide, tiled, SAS.south - OUTER_WALL - 0.15 - index * 0.3, tall / 2 - BASE.rise, z))
}

/**
 * Les murs extérieurs : l'ouest (chambres), le sud (chambre 2 et baies du salon), le nord (chambre 1, salle de bain, fenêtres de la cuisine,
 * escalier), puis l'est en trois morceaux : le mur du bureau, le sas (en avancée) et le mur de l'escalier.
 */
export const outerWalls = (shell: Shell): void => {
  const { xMin, xMax, zMax } = ROOM
  const { outer, outerMaterial } = outerKit(shell.group)
  outer('x', xMin - OUTER_WALL, xMax + OUTER_WALL, REST.west, -1, [GUEST_WINDOW], [true, true])
  outer('z', REST.west, zMax + OUTER_WALL, xMin, -1, [MATOU_WINDOW, ...SALON_BAYS], [false, true])
  outer('z', REST.west, zMax + OUTER_WALL, xMax, 1, [BATH_WINDOW, ...KITCHEN_BAYS], [false, true])
  // Sous la fenêtre du coin repas, dans le soubassement : le soupirail de la cave, petit : un cadre clair, une vitre sombre et trois barreaux.
  const face = xMax + OUTER_WALL - BASE.setback + 0.002
  const vent = { z: NOOK_WINDOW.z, wide: 0.55, tall: 0.2, y: -BASE.rise / 2 }
  const frame = standard(0xf1efe8, 0.6)
  shell.group.add(box(0.03, vent.tall + 0.06, vent.wide + 0.06, frame, face + 0.012, vent.y, vent.z), box(0.02, vent.tall, vent.wide, standard(0x14181c, 0.2, 0.3), face + 0.026, vent.y, vent.z))
  for (const bar of [-1, 0, 1]) shell.group.add(box(0.012, vent.tall, 0.012, standard(0x2a2c2f, 0.5, 0.5), face + 0.036, vent.y, vent.z + bar * (vent.wide / 3)))
  outer('x', xMin, ENTRY.x + 0.05, zMax, 1)
  sasShell(shell, outer, outerMaterial)
  entrySteps(shell.group)
  entryLantern(shell.group)
  outer('x', SAS.north + 0.01, xMax, zMax, 1)
}
