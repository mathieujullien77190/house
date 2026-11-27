import * as THREE from 'three'

/** D'où souffle le vent, à plat (x vers le nord, z vers l'est) : du sud-ouest. La pluie et la neige penchent de ce côté, les plantes aussi. */
export const WIND = { x: 0.6, z: 0.8 }

/** Ce qui se balance dans le vent : les objets marqués par leur constructeur (`userData.sway` : de combien ils penchent, par mètre de hauteur). */
export const swaying = (root: THREE.Object3D): THREE.Object3D[] => {
  const found: THREE.Object3D[] = []
  root.traverse((object) => {
    if (typeof object.userData.sway === 'number') found.push(object)
  })
  return found
}

const shear = new THREE.Matrix4()

/**
 * Le vent à cet instant (s) : chaque objet penche du côté où va le vent, d'autant plus qu'on monte (son pied ne bouge pas), et se balance
 * à son rythme : une houle lente, un frémissement plus rapide, un peu de travers. Rien n'est créé : la matrice de l'objet est recalculée
 * sur place.
 */
export const sway = (objects: THREE.Object3D[], time: number): void => {
  for (let index = 0; index < objects.length; index += 1) {
    const object = objects[index]
    const amount = object.userData.sway as number
    const lean = amount * (0.45 + 0.4 * Math.sin(time * 1.9 + index * 1.3) + 0.15 * Math.sin(time * 4.3 + index * 0.7))
    const cross = amount * 0.15 * Math.sin(time * 2.7 + index)
    object.matrixAutoUpdate = false
    object.updateMatrix()
    shear.set(1, lean * WIND.x - cross * WIND.z, 0, 0, 0, 1, 0, 0, 0, lean * WIND.z + cross * WIND.x, 1, 0, 0, 0, 0, 1)
    object.matrix.multiply(shear)
  }
}

/** Le vent tombe : chaque objet se redresse. */
export const still = (objects: THREE.Object3D[]): void => {
  for (const object of objects) {
    object.matrixAutoUpdate = true
    object.updateMatrix()
  }
}
