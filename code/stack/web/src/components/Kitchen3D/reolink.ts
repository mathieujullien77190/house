import * as THREE from 'three'
import { box, standard } from './primitives'

/**
 * Une caméra Reolink (le modèle tube des caméras de la maison) : un fût blanc, sa face noire, une casquette, sur une rotule. Elle est
 * posée à `at` (la rotule) et tournée vers `target`, dans le repère de son parent. `camera` est le nom de la vraie caméra, gardé dans
 * `userData.camera` : un clic sur le modèle l'ouvre.
 */
export const reolink = (at: THREE.Vector3, target: THREE.Vector3, camera: string): THREE.Group => {
  const eye = new THREE.Group()
  const white = standard(0xf2f2ee, 0.5)
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.17, 20), white)
  barrel.rotation.x = Math.PI / 2
  barrel.position.z = 0.115
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 20), standard(0x0c0d10, 0.2, 0.3))
  lens.rotation.x = Math.PI / 2
  lens.position.z = 0.203
  eye.add(barrel, lens, box(0.08, 0.006, 0.19, white, 0, 0.038, 0.125), new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), white))
  eye.position.copy(at)
  eye.lookAt(target)
  eye.userData.camera = camera
  return eye
}
