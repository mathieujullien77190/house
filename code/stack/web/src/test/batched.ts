import * as THREE from 'three'

// Les plantes du jardin sont dessinées par lots (un maillage `InstancedMesh` par teinte de touffes, un seul maillage fondu pour le bois) :
// ces outils en retrouvent les morceaux, pour les tests.

/** Une touffe d'un lot : sa place, son étirement (son rayon, ou plus si elle est écrasée), son tour, et le maillage dont elle est une copie. */
export interface Tuft {
  at: THREE.Vector3
  size: THREE.Vector3
  turn: THREE.Quaternion
  mesh: THREE.InstancedMesh
  material: THREE.MeshStandardMaterial
}

/** Les maillages `InstancedMesh` posés directement dans un groupe. */
export const instancedIn = (group: THREE.Object3D): THREE.InstancedMesh[] => (group.children as THREE.InstancedMesh[]).filter((child) => child.isInstancedMesh)

/** Les maillages simples (pas `InstancedMesh`) posés directement dans un groupe : le bois fondu, les lames d'une fougère. */
export const plainIn = (group: THREE.Object3D): THREE.Mesh[] => (group.children as THREE.Mesh[]).filter((child) => child.isMesh && !(child as THREE.InstancedMesh).isInstancedMesh)

/** Les copies d'un maillage `InstancedMesh`, chacune avec sa place, son étirement et son tour. */
export const copiesOf = (mesh: THREE.InstancedMesh): Tuft[] =>
  Array.from({ length: mesh.count }, (_, index) => {
    const matrix = new THREE.Matrix4()
    mesh.getMatrixAt(index, matrix)
    const tuft: Tuft = { at: new THREE.Vector3(), size: new THREE.Vector3(), turn: new THREE.Quaternion(), mesh, material: mesh.material as THREE.MeshStandardMaterial }
    matrix.decompose(tuft.at, tuft.turn, tuft.size)
    return tuft
  })

/** Toutes les touffes d'une plante : les copies de ses maillages de cailloux à facettes (icosaèdres). */
export const tuftsIn = (group: THREE.Object3D): Tuft[] =>
  instancedIn(group)
    .filter((mesh) => mesh.geometry.type === 'IcosahedronGeometry')
    .flatMap(copiesOf)

/** Un tronçon de bois retrouvé dans un maillage fondu : son pied, son bout, son milieu, et ses deux rayons. */
export interface Limb {
  from: THREE.Vector3
  to: THREE.Vector3
  mid: THREE.Vector3
  thick: number
  thin: number
  material: THREE.Material
}

/** Un cylindre à cinq pans a 34 sommets : six en haut du fût (le premier répété), six en bas, puis les deux couvercles. */
const LIMB_POINTS = 34

/** Les tronçons d'un maillage de bois fondu (des cylindres à cinq pans, mis bout à bout dans la géométrie). */
export const limbsOf = (mesh: THREE.Mesh): Limb[] => {
  const points = mesh.geometry.attributes.position
  const ring = (start: number): { center: THREE.Vector3; radius: number } => {
    const center = new THREE.Vector3()
    for (let index = 0; index < 5; index += 1) center.add(new THREE.Vector3().fromBufferAttribute(points, start + index))
    center.multiplyScalar(1 / 5)
    return { center, radius: center.distanceTo(new THREE.Vector3().fromBufferAttribute(points, start)) }
  }
  return Array.from({ length: points.count / LIMB_POINTS }, (_, index) => {
    const top = ring(index * LIMB_POINTS)
    const bottom = ring(index * LIMB_POINTS + 6)
    return { from: bottom.center, to: top.center, mid: bottom.center.clone().add(top.center).multiplyScalar(0.5), thick: bottom.radius, thin: top.radius, material: mesh.material as THREE.Material }
  })
}

/** Tous les tronçons de bois d'une plante. */
export const limbsIn = (group: THREE.Object3D): Limb[] => plainIn(group).flatMap(limbsOf)

/** Vrai si deux nombres sont égaux à la précision des géométries (des `Float32`). */
export const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-5
