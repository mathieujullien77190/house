import * as THREE from 'three'
import { REST, ROOM, SAS } from './constants'
import { kindOf } from './merge'

/**
 * La scène est dessinée en deux couches, pour que les lampes ne traversent pas les murs : la maison (couche 0), éclairée par les lampes du dedans, et le
 * jardin (couche 1), éclairé par celles du dehors. Le soleil et l'ambiance éclairent les deux. Sans cela, la nuit, volets fermés, les lampes de la maison
 * éclairaient le jardin (une `PointLight` sans ombre ne connaît pas les murs).
 */
export const INDOOR = 0
export const OUTDOOR = 1

/** Vrai si ce point de la scène (x, z) est dans la maison (ses murs extérieurs compris) ou dans son sas. */
export const indoors = (x: number, z: number): boolean => {
  const wall = 0.3
  const inHouse = x > ROOM.xMin - wall && x < ROOM.xMax + wall && z > REST.west - wall && z < ROOM.zMax + wall
  const inSas = x > SAS.south - wall && x < SAS.north + wall && z >= ROOM.zMax && z < SAS.east + wall
  return inHouse || inSas
}

/**
 * Range chaque objet du jardin (genre `garden` ou `tree`, voir `kindOf`) dans la couche du dehors ; le reste garde celle de la maison. Les matériaux
 * transparents du jardin (le grillage) n'écrivent plus dans la profondeur : le jardin est dessiné avant la maison, qui doit rester visible à travers eux.
 */
export const splitLayers = (root: THREE.Object3D): void => {
  root.traverse((object) => {
    const kind = kindOf(object)
    if (kind !== 'garden' && kind !== 'tree') return
    object.layers.set(OUTDOOR)
    const material = (object as THREE.Mesh).material
    for (const one of Array.isArray(material) ? material : material ? [material] : []) if (one.transparent) one.depthWrite = false
  })
}

/**
 * Dessine la scène : le jardin d'abord, puis la maison par-dessus (même image, même profondeur). `shadows` : l'ombre du soleil est à refaire, et elle
 * doit compter les objets des deux couches : une première passe, toutes couches vues, la met à jour.
 */
export const renderLayers = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, shadows: boolean): void => {
  if (shadows) {
    camera.layers.enableAll()
    renderer.shadowMap.needsUpdate = true
    renderer.render(scene, camera)
  }
  camera.layers.set(OUTDOOR)
  renderer.render(scene, camera)
  camera.layers.set(INDOOR)
  renderer.autoClear = false
  renderer.render(scene, camera)
  renderer.autoClear = true
}
