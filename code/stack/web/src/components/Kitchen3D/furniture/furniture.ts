import * as THREE from 'three'
import { LAYOUT, LIBRARY_WINDOW, MATOU_WINDOW, ROOM } from '@/components/Kitchen3D/constants'
import { buildLibrary } from '@/components/Kitchen3D/library'
import { furnitureMaterials } from '@/components/Kitchen3D/materials'
import { facing } from '@/components/Kitchen3D/primitives'
import { frames, potteryShelf, teaShelf } from './decor'
import { dining } from './dining'
import { corridorDoor, entry } from './entry'
import { lamps } from './lamps'
import { armchair, coffeeTable, sideboard, sofa, tvCorner } from './living'
import { nook } from './nook'
import { office } from './office'
import { buildRooms } from './rooms'
import { patioWindows, windowOnWall } from './windows'

/** Tout le mobilier et le décor hors cuisine : le séjour, la salle à manger, le bureau, le coin repas et l'entrée. */
export const buildFurniture = (): THREE.Group => {
  const m = furnitureMaterials()
  const root = new THREE.Group()
  const livingSofa = facing(sofa(m), 0, -1)
  livingSofa.position.set(LAYOUT.sofa.x, 0, LAYOUT.sofa.z)
  const table = coffeeTable(m)
  table.position.set(LAYOUT.coffee.x, 0, LAYOUT.coffee.z)
  const seat = facing(armchair(m), -0.25, -1)
  seat.position.set(LAYOUT.armchair.x, 0, LAYOUT.armchair.z)
  root.add(livingSofa, table, seat, tvCorner(m), corridorDoor(m), dining(m), office(m), buildLibrary(), patioWindows(m), lamps(m), nook(m), entry(m), frames(m), sideboard(m), teaShelf(m), potteryShelf(m), buildRooms())
  root.add(windowOnWall(m, ROOM.xMin, 1, LIBRARY_WINDOW.z, LIBRARY_WINDOW.width, LIBRARY_WINDOW.height, LIBRARY_WINDOW.bottom, 2, 'pc'))
  // La fenêtre à trois vitres de la chambre de Matou (pas de volet relié).
  root.add(windowOnWall(m, ROOM.xMin, 1, MATOU_WINDOW.z, MATOU_WINDOW.width, MATOU_WINDOW.height, MATOU_WINDOW.bottom, 3))
  return root
}
