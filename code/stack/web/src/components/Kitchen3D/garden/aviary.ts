import * as THREE from 'three'
import type { GardenMaterials } from '@/components/Kitchen3D/materials'
import { box, standard } from '@/components/Kitchen3D/primitives'
import { wireTexture } from '@/components/Kitchen3D/textures'
import { CAGE_HEIGHT, CAGE_LOW, GRASS, LOW, PANEL } from './constants'
import { SITE } from './layout'
import { fern, hydrangea } from './plants'

/** La cage à perruches : des poteaux et une ceinture en haut. */
export const cageFrame = (group: THREE.Group, m: GardenMaterials): void => {
  const { post } = m
  const { cageX1, cageX2, cageZ1, cageZ2, cageDepth, middleX, backX, turnZ } = SITE
  // Son plan est en L : à gauche de la porte (pour qui la regarde du dehors), la cage tourne d'équerre vers le fond sur un panneau, puis
  // repart d'équerre vers l'ouest sur deux panneaux. Le coin sud-ouest (deux panneaux sur un) est donc dehors.
  const step = PANEL
  const corners: [number, number][] = [[cageX1, turnZ], [cageX1, cageZ2], [cageX2, cageZ2], [cageX2, cageZ1], [backX, cageZ1], [backX, turnZ], [middleX, cageZ2]]
  // Le grand côté grillagé (à l'ouest) fait quatre panneaux de 85 cm : un poteau entre chacun.
  for (const index of [1, 2, 3]) corners.push([backX + step * index, cageZ1])
  // La face en retrait (derrière le grand bac) fait deux panneaux : un poteau entre eux.
  corners.push([backX, cageZ1 + step])
  for (const [x, z] of corners) {
    const tall = z === cageZ2 ? CAGE_LOW : CAGE_HEIGHT
    group.add(box(0.08, tall, 0.08, post, x, tall / 2, z))
  }
  // La ceinture du haut, sur tout le tour.
  group.add(box(cageDepth, 0.06, 0.06, post, middleX, CAGE_LOW, cageZ2), box(cageDepth - step, 0.06, 0.06, post, (backX + cageX2) / 2, CAGE_HEIGHT, cageZ1))
  group.add(box(0.06, 0.06, turnZ - cageZ1, post, cageX2, CAGE_HEIGHT, (turnZ + cageZ1) / 2))
  // Sous le toit de tôle, les lisses de l'avant et du fond suivent sa pente (rien ne le traverse).
  const slope = Math.atan2(CAGE_HEIGHT - CAGE_LOW, cageZ2 - turnZ)
  for (const x of [cageX1, cageX2]) {
    const rail = box(0.06, 0.06, cageZ2 - turnZ, post, x, (CAGE_HEIGHT + CAGE_LOW) / 2, (cageZ2 + turnZ) / 2)
    rail.rotation.x = slope
    group.add(rail)
  }
  group.add(box(step, 0.06, 0.06, post, cageX1 + step / 2, CAGE_HEIGHT, turnZ), box(0.06, 0.06, step * 2, post, backX, CAGE_HEIGHT, cageZ1 + step))
}

/** Le grillage de la cage : des pans gris à peine opaques, là où il n’y a pas de bois, et sur le dessus. */
export const cageWire = (group: THREE.Group, m: GardenMaterials): void => {
  const { post } = m
  const { cageX1, cageX2, cageZ1, cageDepth, middleX, backX, turnZ } = SITE
  const step = PANEL
  const wireMap = wireTexture()
  const wire = (long: number, tall: number): THREE.Mesh => {
    const map = wireMap.clone()
    map.repeat.set(long / 0.2, tall / 0.2)
    map.needsUpdate = true
    return new THREE.Mesh(new THREE.PlaneGeometry(long, tall), new THREE.MeshStandardMaterial({ map, transparent: true, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.4, depthWrite: false }))
  }
  // Du grillage seulement là où il n'y a pas de bois : le côté ouest, le retour d'un panneau à gauche de la porte, puis les deux panneaux
  // en retrait (ni derrière la porte, ni derrière les pans de bois).
  const westWire = wire(cageDepth - step, CAGE_HEIGHT)
  westWire.position.set((backX + cageX2) / 2, CAGE_HEIGHT / 2, cageZ1)
  const turnWire = wire(step, CAGE_HEIGHT)
  turnWire.position.set(cageX1 + step / 2, CAGE_HEIGHT / 2, turnZ)
  const backWire = wire(step * 2, CAGE_HEIGHT)
  backWire.rotation.y = Math.PI / 2
  backWire.position.set(backX, CAGE_HEIGHT / 2, cageZ1 + step)
  // Le dessus de la partie grillagée : des pans de grillage de 85 cm de large, entre des chevrons ; et l'arête du milieu, d'où part le toit.
  const topWire = wire(cageDepth - step, step * 2)
  topWire.rotation.x = -Math.PI / 2
  topWire.position.set((backX + cageX2) / 2, CAGE_HEIGHT + 0.03, cageZ1 + step)
  group.add(westWire, turnWire, backWire, topWire, box(cageDepth, 0.06, 0.06, post, middleX, CAGE_HEIGHT, turnZ))
  for (const index of [1, 2, 3]) group.add(box(0.05, 0.05, step * 2, post, backX + step * index, CAGE_HEIGHT, cageZ1 + step))
}

/**
 * Au-dessus de la porte et du pan de bois à sa droite, un toit de tôle, de l'avant jusqu'au fond de la cage. Il est en biais : au plus
 * haut sur l'arête du milieu de la cage (2,10 m), au plus bas côté haie (2 m). Ses ondes suivent la pente.
 */
export const cageRoof = (group: THREE.Group): void => {
  const { cageZ2, cageDepth, middleX, turnZ } = SITE
  const sheet = standard(0xb4b8bc, 0.45, 0.6)
  const roofSpan = cageZ2 - turnZ
  const roofLong = cageDepth + 0.3
  const roof = new THREE.Group()
  // Il déborde de 10 cm de chaque côté : côté haie, et côté milieu de la cage, par-dessus l'arête.
  roof.position.set(middleX, (CAGE_HEIGHT + CAGE_LOW) / 2 + 0.04, (cageZ2 + turnZ) / 2)
  roof.rotation.x = Math.atan2(CAGE_HEIGHT - CAGE_LOW, roofSpan)
  roof.add(box(roofLong, 0.012, roofSpan + 0.2, sheet, 0, 0, 0))
  for (let wave = 0; wave < 24; wave += 1) roof.add(box(0.05, 0.02, roofSpan + 0.2, sheet, -roofLong / 2 + 0.05 + wave * ((roofLong - 0.1) / 23), 0.01, 0))
  group.add(roof)
}

/** Les pans de bois de la cage et sa porte. */
export const cagePanels = (group: THREE.Group, m: GardenMaterials): void => {
  const { iron, post } = m
  const { cageX1, cageX2, cageZ2 } = SITE
  const pan = PANEL
  // Les pans de bois de la cage (85 cm chacun), devant le grillage : sur la face sud, la porte puis un pan plein à sa droite (pour qui
  // la regarde du dehors) ; derrière, côté haie de l'est, cinq pans (tout le côté) ; et au fond, contre la haie du nord, quatre pans
  // (tout le fond).
  const doorZ = cageZ2 - pan * 1.5
  // Sous le toit, les pans de bois et la porte s'arrêtent sous la tôle : le panneau près de l'arête à mi-pente, celui du bord au plus bas.
  const midTall = (CAGE_HEIGHT + CAGE_LOW) / 2
  group.add(box(0.03, CAGE_LOW, pan, post, cageX1, CAGE_LOW / 2, cageZ2 - pan / 2))
  group.add(box(pan * 5, CAGE_LOW, 0.03, post, cageX2 - (pan * 5) / 2, CAGE_LOW / 2, cageZ2))
  group.add(box(0.03, CAGE_HEIGHT, pan * 2, post, cageX2, CAGE_HEIGHT / 2, cageZ2 - pan * 3), box(0.03, midTall, pan, post, cageX2, midTall / 2, cageZ2 - pan * 1.5), box(0.03, CAGE_LOW, pan, post, cageX2, CAGE_LOW / 2, cageZ2 - pan / 2))
  // La porte : un pan de bois comme les autres, de toute la hauteur, sur trois pentures noires, avec sa poignée.
  const doorFace = cageX1 - 0.02
  group.add(box(0.03, midTall, pan - 0.02, post, doorFace, midTall / 2, doorZ))
  for (const y of [0.25, 1.1, 1.95]) group.add(box(0.02, 0.05, 0.2, iron, doorFace - 0.02, y, doorZ + pan / 2 - 0.12))
  group.add(box(0.03, 0.14, 0.03, iron, doorFace - 0.03, 1.05, doorZ - pan / 2 + 0.08))
}

/** Les bacs de bois pleins de terre, devant la cage, et leurs plantes. */
export const planters = (group: THREE.Group, m: GardenMaterials): void => {
  const { post, soil } = m
  const { cageX2, cageZ1, backX } = SITE
  // Le bac de bois plein de terre, sur le devant, contre la face en retrait ; il continue le long du grand côté grillagé (à l'ouest, dans
  // la partie basse du jardin), deux fois moins haut et deux fois moins large.
  // Il avance vers l'ouest jusqu'au bord extérieur du long bac du côté : les deux se rejoignent à l'angle.
  const planterLong = 1.05 + 0.4
  const planterZ = cageZ1 - 0.4 + planterLong / 2
  group.add(box(0.8, 0.45 + LOW, planterLong, post, backX - 0.45, (0.45 - LOW) / 2, planterZ), box(0.7, 0.02, planterLong - 0.1, soil, backX - 0.45, 0.455, planterZ))
  // Le long bac part du grand, collé à lui.
  const sideFrom = backX - 0.05
  const sideLong = cageX2 - sideFrom
  group.add(box(sideLong, 0.225, 0.4, post, (cageX2 + sideFrom) / 2, GRASS + 0.1125, cageZ1 - 0.2), box(sideLong - 0.1, 0.02, 0.3, soil, (cageX2 + sideFrom) / 2 + 0.03, GRASS + 0.23, cageZ1 - 0.2))
  // Dans le long bac : trois fougères à droite pour qui le regarde face à la cage (le bout sud, vers le grand bac), un hortensia à gauche.
  const bedY = GRASS + 0.24
  ;[0.4, 0.95, 1.5].forEach((along, index) => {
    const plant = fern(21 + index)
    plant.position.set(sideFrom + along, bedY, cageZ1 - 0.2)
    group.add(plant)
  })
  const bush = hydrangea(5)
  bush.position.set(cageX2 - 0.55, bedY, cageZ1 - 0.2)
  group.add(bush)
}
