import * as THREE from 'three'
import { counterObjects } from '@/components/Kitchen3D/kitchen/counter'
import { kitchenDecor, kitchenPendant } from '@/components/Kitchen3D/kitchen/decor'
import type { KitchenMaps, KitchenMaterials } from '@/components/Kitchen3D/materials'
import { standard, woodTexture } from '@/components/Kitchen3D/primitives'
import { beams, entryWalls, livingCeiling, livingFloors, livingWalls, partition, stairWall, thickSkirtings } from './living'
import { outerWalls } from './outer'
import { parquet } from './parquet'
import { bathKitchenWall, corridor, guestAndBath, laundry, matouRoom } from './rest'
import { wallKit } from './walls'
import type { Shell } from './walls'

/**
 * Le gros œuvre, aux cotes du modèle SketchUp : le parquet partout, les murs blancs (lisibles de l'intérieur seulement), le plafond (lambris
 * blanc, plaque de plâtre lisse au-dessus de la cuisine), les plinthes et les poutres de chêne, le mur puis le bar entre la cuisine et le
 * salon, le mur de l'escalier et ses niches, le reste de la maison, les murs extérieurs ; puis ce que portent la cuisine et son plan de travail.
 * Tout est ajouté à un seul groupe, dans cet ordre.
 */
export const buildShell = (materials: KitchenMaterials, maps: KitchenMaps): THREE.Group => {
  const group = new THREE.Group()
  // Les seuils de porte des murs épais sont en chêne clair.
  const shell: Shell = { group, materials, maps, floors: [], sill: standard(woodTexture(0xd9b98a, 113), 0.6), ...wallKit(group, materials) }
  livingFloors(shell)
  livingWalls(shell)
  livingCeiling(shell)
  partition(shell)
  stairWall(shell)
  guestAndBath(shell)
  corridor(shell)
  matouRoom(shell)
  laundry(shell)
  bathKitchenWall(shell)
  outerWalls(shell)
  entryWalls(shell)
  thickSkirtings(shell)
  // Les lames du parquet, d'un seul tenant pour toutes les pièces qui en ont (la même trame partout).
  group.add(parquet(shell.floors))
  beams(shell)
  kitchenDecor(group, materials, maps)
  counterObjects(group)
  kitchenPendant(group, materials)
  return group
}
