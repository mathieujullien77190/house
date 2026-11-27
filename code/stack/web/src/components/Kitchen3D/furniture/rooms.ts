import * as THREE from 'three'
import { roomMaterials } from '@/components/Kitchen3D/materials'
import { bathroom } from './bathroom'
import { guestRoom } from './guestRoom'
import { matouRoom } from './matouRoom'
import { sas } from './sas'

/** Les pièces meublées hors de l'espace de vie : la chambre d'invité, la salle de bain, le sas, et la clim de la chambre de Matou. */
export const buildRooms = (): THREE.Group => {
  const m = roomMaterials()
  const group = new THREE.Group()
  group.add(guestRoom(m), bathroom(m), sas(m), matouRoom(m))
  return group
}
