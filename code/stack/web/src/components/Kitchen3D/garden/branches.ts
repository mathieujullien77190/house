import * as THREE from 'three'

const UP = new THREE.Vector3(0, 1, 0)

/** Rend de quoi poser sur `group` un tronçon de bois entre deux points, plus fin au bout. */
export const limbOf =
  (group: THREE.Group, bark: THREE.Material) =>
  (from: THREE.Vector3, to: THREE.Vector3, thick: number, thin: number): void => {
    const span = to.clone().sub(from)
    const piece = new THREE.Mesh(new THREE.CylinderGeometry(thin, thick, span.length(), 5), bark)
    piece.position.copy(from).add(to).multiplyScalar(0.5)
    piece.quaternion.setFromUnitVectors(UP, span.clone().normalize())
    group.add(piece)
  }

/**
 * Rend de quoi poser sur `group` une touffe de feuilles : un caillou à facettes d'une des teintes données, tourné au hasard, et un peu
 * écrasé si `squash` est donné (sa hauteur : le premier nombre, plus au hasard jusqu'au second).
 */
export const tuftOf =
  (group: THREE.Group, rand: () => number, tints: THREE.Material[], squash?: [number, number]) =>
  (at: THREE.Vector3, size: number): void => {
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 0), tints[Math.floor(rand() * tints.length)])
    leaves.position.copy(at)
    if (squash) leaves.scale.set(1, squash[0] + rand() * squash[1], 1)
    leaves.rotation.set(rand() * 3, rand() * 3, rand() * 3)
    group.add(leaves)
  }

/**
 * Rend de quoi semer des touffes espacées le long d'un tronçon (une tous les `every` mètres environ), chacune au bout d'une brindille,
 * un peu écartée du bois (`lift` : la part de l'écart qui descend sous le bois).
 */
export const sprinkleOf =
  (rand: () => number, limb: ReturnType<typeof limbOf>, tuft: (at: THREE.Vector3) => void, every: number, lift: number) =>
  (from: THREE.Vector3, to: THREE.Vector3): void => {
    const count = Math.max(1, Math.round(from.distanceTo(to) / every))
    for (let index = 0; index < count; index += 1) {
      const base = from.clone().lerp(to, (index + 0.3 + rand() * 0.6) / count)
      const at = base.clone().add(new THREE.Vector3((rand() - 0.5) * 0.4, (rand() - lift) * 0.3, (rand() - 0.5) * 0.4))
      limb(base, at, 0.008, 0.005)
      tuft(at)
    }
  }
