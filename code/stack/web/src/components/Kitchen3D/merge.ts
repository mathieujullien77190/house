import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** Tout ce qui fait l'allure d'un matériau, mis en texte : deux matériaux de même texte se dessinent pareil (une texture compte par son identité). */
const lookOf = (material: THREE.Material): string =>
  JSON.stringify(
    Object.entries(material)
      .filter(([name]) => name !== 'uuid' && name !== 'version')
      .map(([name, value]: [string, unknown]) => {
        if ((value as THREE.Texture | null)?.isTexture) return [name, (value as THREE.Texture).uuid]
        if ((value as THREE.Color | null)?.isColor) return [name, (value as THREE.Color).toArray()]
        return [name, value]
      }),
  )

/**
 * Les matériaux identiques créés plusieurs fois par les constructeurs n'en font plus qu'un : chaque maillage prend le premier matériau
 * de même allure. `own` : vrai pour un maillage qui garde le sien (sa couleur change toute seule : une ampoule, un voyant).
 */
export const shareMaterials = (root: THREE.Object3D, own: (mesh: THREE.Mesh) => boolean): void => {
  const first = new Map<string, THREE.Material>()
  // (Un matériau déjà vu n'est pas remis en texte : la plupart des maillages en partagent déjà un.)
  const seen = new Map<THREE.Material, THREE.Material>()
  root.traverse((child) => {
    const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.Material>
    if (!mesh.isMesh || own(mesh)) return
    let shared = seen.get(mesh.material)
    if (!shared) {
      const look = lookOf(mesh.material)
      shared = first.get(look) ?? mesh.material
      first.set(look, shared)
      seen.set(mesh.material, shared)
    }
    mesh.material = shared
  })
}

/** Retourne le sens des triangles d'une géométrie (après un miroir, pour que ses faces regardent encore dehors). */
const flip = (geometry: THREE.BufferGeometry): THREE.BufferGeometry => {
  const index = geometry.index ?? new THREE.BufferAttribute(Uint32Array.from({ length: geometry.attributes.position.count }, (_, at) => at), 1)
  for (let corner = 0; corner < index.count; corner += 3) {
    const second = index.getX(corner + 1)
    index.setX(corner + 1, index.getX(corner + 2))
    index.setX(corner + 2, second)
  }
  return geometry.setIndex(index)
}

/**
 * Fond en un seul maillage par matériau tout ce qui ne bouge jamais : chaque maillage simple, visible et opaque de `root` est retiré de
 * son groupe et sa géométrie, mise à sa place dans le repère de `root`, rejoint celles du même matériau (un appel de dessin au lieu d'un
 * par objet). Le résultat est ajouté à `root` dans un groupe nommé `static`.
 *
 * Restent à part : ce qui est marqué (`userData`, sur l'objet ou un de ses parents : volets, pendule, clims, caméras, ampoules,
 * objets sans ombre portée), ce qui est sous un des objets de `live` (les fenêtres à cliquer, la hotte), ce qui est caché, les maillages `InstancedMesh`
 * et les matériaux transparents (leur ordre de dessin dépend de leur distance).
 */
export const mergeStatic = (root: THREE.Object3D, live: THREE.Object3D[]): void => {
  root.updateMatrixWorld(true)
  const toRoot = root.matrixWorld.clone().invert()
  const held = new Set(live)
  const still = (mesh: THREE.Object3D): boolean => {
    for (let up: THREE.Object3D | null = mesh; up && up !== root; up = up.parent) if (!up.visible || held.has(up) || Object.keys(up.userData).length > 0) return false
    return true
  }
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>()
  const merged: THREE.Mesh[] = []
  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh || (mesh as unknown as THREE.InstancedMesh).isInstancedMesh || Array.isArray(mesh.material) || mesh.material.transparent || !still(mesh)) return
    const place = toRoot.clone().multiply(mesh.matrixWorld)
    const geometry = mesh.geometry.clone().applyMatrix4(place)
    const pieces = batches.get(mesh.material) ?? []
    pieces.push(place.determinant() < 0 ? flip(geometry) : geometry)
    batches.set(mesh.material, pieces)
    merged.push(mesh)
  })
  for (const mesh of merged) mesh.removeFromParent()
  const group = new THREE.Group()
  group.name = 'static'
  for (const [material, pieces] of batches) {
    // Les géométries fondues doivent avoir les mêmes attributs, et être toutes indexées ou aucune : une par jeu d'attributs.
    const sets = new Map<string, THREE.BufferGeometry[]>()
    const indexed = pieces.every((piece) => piece.index !== null)
    for (const piece of pieces) {
      const names = Object.keys(piece.attributes).sort().join()
      const set = sets.get(names) ?? []
      set.push(indexed || piece.index === null ? piece : piece.toNonIndexed())
      sets.set(names, set)
    }
    for (const set of sets.values()) group.add(new THREE.Mesh(mergeGeometries(set), material))
  }
  root.add(group)
}
