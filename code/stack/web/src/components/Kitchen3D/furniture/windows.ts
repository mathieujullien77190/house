import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ENTRY, LAYOUT, PATIO_DOOR, ROOM } from '@/components/Kitchen3D/constants'
import type { FurnitureMaterials } from '@/components/Kitchen3D/materials'
import { box, standard } from '@/components/Kitchen3D/primitives'

/** Une fenêtre blanche dans un mur est ou ouest, à volet roulant gris : cadre, vitre, et le volet à moitié descendu dehors, derrière la vitre. Le côté qui regarde dans la pièce est donné par `dir` (+1 : vers +x). */
export const windowOnWall = (m: FurnitureMaterials, wallX: number, dir: 1 | -1, z: number, width: number, height: number, bottom: number, panes = 2, shutter?: string): THREE.Group => {
  const group = new THREE.Group()
  const bar = 0.05
  const depth = 0.07
  // La fenêtre est au nu du mur intérieur : son cadre est dans l’embrasure, sa face ressort d’un centimètre dans la pièce.
  group.position.set(wallX - (depth / 2 - 0.01) * dir, bottom + height / 2, z)
  for (const side of [-1, 1]) {
    group.add(box(depth, bar, width, m.white, 0, (height / 2 - bar / 2) * side, 0))
    group.add(box(depth, height - bar * 2, bar, m.white, 0, 0, (width / 2 - bar / 2) * side))
  }
  for (let split = 1; split < panes; split += 1) group.add(box(depth, height - bar * 2, bar, m.white, 0, 0, -width / 2 + (width * split) / panes))
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width - bar * 2, height - bar * 2), m.glass)
  glass.rotation.y = (Math.PI / 2) * dir
  group.add(glass)
  // Le volet roulant, dehors derrière la vitre : des lames grises empilées depuis le haut (bien plus sombres que la vitre). Marqué par son
  // nom, il suit le vrai volet de la maison (`shutters.ts`) ; en attendant, il est à moitié descendu.
  const inner = height - bar * 2
  // Des lames d'environ 5 cm, leur pas ajusté pour remplir exactement la hauteur : fermé, le volet ne laisse aucun jour en bas.
  const count = Math.ceil(inner / 0.05)
  const pitch = inner / count
  const slats = new THREE.Group()
  for (let slat = 0; slat < count; slat += 1) {
    // Une lame : son profil (un peu moins haut que le pas, pour qu'on voie les lames, horizontales) sur une âme plus mince qui, elle, touche ses voisines : fermé, le volet est occultant,
    // sans jour entre les lames ni sur les côtés, mais on distingue chaque lame par sa rainure.
    const long = width - bar * 2 + 0.01
    const shape = mergeGeometries([new THREE.BoxGeometry(0.015, pitch - 0.006, long), new THREE.BoxGeometry(0.006, pitch + 0.002, long)])
    const lame = new THREE.Mesh(shape, m.slat)
    lame.position.set(-0.03 * dir, inner / 2 - pitch / 2 - slat * pitch, 0)
    lame.visible = slat < count / 2
    slats.add(lame)
  }
  group.add(slats)
  // Sans volet relié, pas de lames : la fenêtre reste dégagée.
  if (!shutter) slats.visible = false
  if (shutter) {
    // Son nom, et la surface de vitre qu'il découvre (m²) : de quoi calculer le jour qui entre.
    slats.userData.shutter = shutter
    slats.userData.area = width * height
  }
  return group
}

/**
 * Le mur des baies, côté salon : la porte-fenêtre à deux vantaux près du coin de la télé, la grande fenêtre à trois vitres (2,20 m) au-dessus du canapé, et les
 * rideaux bleus tirés de part et d'autre, sur leur tringle noire, chacun avec son voilage blanc à côté.
 */
export const patioWindows = (m: FurnitureMaterials): THREE.Group => {
  const group = new THREE.Group()
  const x = ROOM.xMin
  const { window: bay, curtains } = LAYOUT.bays
  group.add(windowOnWall(m, x, 1, PATIO_DOOR.z, PATIO_DOOR.width, PATIO_DOOR.height, PATIO_DOOR.bottom, 2, 'porte'))
  group.add(windowOnWall(m, x, 1, bay.z, bay.width, bay.height, bay.bottom, 3, 'salon'))
  for (const z of curtains) {
    group.add(box(0.1, 2.24, 0.3, m.curtain, x + 0.2, 1.13, z))
    for (let fold = 0; fold < 3; fold += 1) group.add(box(0.02, 2.24, 0.03, m.black, x + 0.26, 1.13, z - 0.1 + fold * 0.1))
  }
  // Les voilages blancs, juste à côté de chaque rideau bleu, du côté de sa baie.
  const sheer = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, transparent: true, opacity: 0.6 })
  for (const z of [curtains[0] + 0.3, curtains[1] + 0.3, curtains[2] - 0.3]) {
    group.add(box(0.03, 2.24, 0.3, sheer, x + 0.2, 1.13, z))
    for (let fold = 0; fold < 3; fold += 1) group.add(box(0.012, 2.24, 0.04, sheer, x + 0.222, 1.13, z - 0.1 + fold * 0.1))
  }
  // Le petit montage en briques de couleur, collé sous la poutre du poteau, contre le mur des baies.
  const bricks: [number, number, number, number, number, number, number][] = [
    [0.07, 0.012, 0.09, 0.04, 0.006, 0, 0x8fce3a],
    [0.04, 0.012, 0.05, 0.035, 0.008, 0, 0x9a4fc0],
    [0.03, 0.02, 0.05, 0.02, 0.022, -0.03, 0xd0368a],
    [0.03, 0.02, 0.03, 0.02, 0.022, 0.02, 0x1f1f22],
    [0.03, 0.02, 0.06, 0.02, 0.042, 0, 0xf28a1e],
    [0.02, 0.02, 0.03, 0.015, 0.062, -0.02, 0xf2c81e],
    [0.03, 0.02, 0.03, 0.02, 0.062, 0.015, 0xf28a1e],
    [0.02, 0.02, 0.02, 0.012, 0.082, 0.02, 0x9aa0a6],
    [0.02, 0.04, 0.03, 0.012, 0.112, 0.02, 0x8fce3a],
    [0.02, 0.008, 0.03, 0.012, 0.136, 0.02, 0xf2a0c8],
  ]
  for (const [deep, tall, wide, out, down, along, color] of bricks) group.add(box(deep, tall, wide, standard(color, 0.5), x + out, ROOM.height - 0.12 - down, ENTRY.postZ - 0.02 + along))
  const from = curtains[0] - 0.2
  // La tringle s'arrête juste avant la poutre du poteau : le dernier rideau pend donc en deçà d'elle, sur le bord de la fenêtre.
  const to = ENTRY.postZ - 0.08
  group.add(box(0.03, 0.03, to - from, m.metal, x + 0.22, 2.27, (from + to) / 2))
  return group
}
