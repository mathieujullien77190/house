import * as THREE from 'three'
import { COUNTER_TOP, KITCHEN, ROOM, TILES, WINDOWS } from '@/components/Kitchen3D/constants'
import type { KitchenMaps, KitchenMaterials } from '@/components/Kitchen3D/materials'
import { box, bulbBall, fixtureBulb } from '@/components/Kitchen3D/primitives'

/** Une tablette en bois sur deux équerres noires. */
const shelf = (materials: KitchenMaterials, x: number, width: number): THREE.Group => {
  const group = new THREE.Group()
  group.position.set(x, 1.72, KITCHEN.zMin + 0.1)
  group.add(box(width, 0.03, 0.2, materials.shelf, 0, 0, 0))
  for (const side of [-1, 1]) group.add(box(0.012, 0.1, 0.02, materials.bracket, (width / 2 - 0.12) * side, -0.065, -0.07))
  return group
}

/** Une petite fenêtre blanche dans le mur de droite : sa vitre, et à l'intérieur un store enroulable crème toujours baissé. */
const windowAt = (materials: KitchenMaterials, z: number): THREE.Group => {
  const group = new THREE.Group()
  const { width, height, bottom } = WINDOWS
  const bar = 0.05
  const depth = 0.07
  // La fenêtre est au nu du mur intérieur : son cadre est dans l’embrasure, sa face ressort d’un centimètre dans la pièce.
  group.position.set(ROOM.xMax + depth / 2 - 0.01, bottom + height / 2, z)
  for (const side of [-1, 1]) {
    group.add(box(depth, bar, width, materials.windowFrame, 0, (height / 2 - bar / 2) * side, 0))
    group.add(box(depth, height - bar * 2, bar, materials.windowFrame, 0, 0, (width / 2 - bar / 2) * side))
  }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width - bar * 2, height - bar * 2), materials.glass)
  glass.rotation.y = -Math.PI / 2
  group.add(glass)
  const blindHeight = height - bar * 2
  group.add(box(0.012, blindHeight, width - bar * 2 - 0.02, materials.blind, -0.012, (height - bar * 2) / 2 - blindHeight / 2, 0))
  const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, width - bar * 2, 14), materials.blind)
  roller.rotation.x = Math.PI / 2
  roller.position.set(-0.025, (height - bar * 2) / 2 - 0.01, 0)
  group.add(roller)
  return group
}

/** Ce que portent les murs de la cuisine : la crédence carrelée, les deux étagères de part et d’autre de la hotte, et les deux petites fenêtres. */
export const kitchenDecor = (group: THREE.Group, materials: KitchenMaterials, maps: KitchenMaps): void => {
  const { xMax } = ROOM
  const kitchenWidth = KITCHEN.xMax - KITCHEN.xMin
  // Le carrelage métro de la crédence : quatre rangées de 7,5 cm au-dessus du plan, sur le fond et sur le mur des fenêtres (au-dessus de la file de droite).
  const tiled = (length: number, material: THREE.MeshStandardMaterial) => {
    const map = maps.tile.clone()
    map.needsUpdate = true
    map.repeat.set(length / 0.6, TILES.height / 0.6)
    material.map = map
    return new THREE.Mesh(new THREE.PlaneGeometry(length, TILES.height), material)
  }
  const tileBack = tiled(kitchenWidth, materials.tile.clone())
  tileBack.position.set((KITCHEN.xMin + KITCHEN.xMax) / 2, COUNTER_TOP + TILES.height / 2, KITCHEN.zMin + 0.003)
  const tileRight = tiled(2.5, materials.tile.clone())
  tileRight.rotation.y = -Math.PI / 2
  tileRight.position.set(xMax - 0.003, COUNTER_TOP + TILES.height / 2, KITCHEN.zMin + 1.25)
  group.add(tileBack, tileRight)

  group.add(shelf(materials, -0.85, 0.9))
  group.add(shelf(materials, 0.75, 1.1))
  for (const z of WINDOWS.z) group.add(windowAt(materials, z))
}

/** La suspension noire au-dessus du passage de la cuisine, avec son câble jusqu'au plafond. */
export const kitchenPendant = (group: THREE.Group, materials: KitchenMaterials): void => {
  const { height } = ROOM
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.26, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), materials.lamp)
  dome.position.set(0, 1.85, 0.1)
  const light = fixtureBulb(bulbBall(0.07, 0, 1.9, 0.1), 'cuisine 1')
  const cord = box(0.01, height - 2.1, 0.01, materials.lamp, 0, 2.1 + (height - 2.1) / 2, 0.1)
  group.add(dome, light, cord)
}
