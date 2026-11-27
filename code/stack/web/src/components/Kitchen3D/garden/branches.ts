import * as THREE from 'three'
import { faceted } from '@/components/Kitchen3D/materials'
import { seeded } from '@/components/Kitchen3D/primitives'
import { inSeason } from './seasons'
import type { SeasonKey } from './seasons'

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
 * écrasé si `squash` est donné (sa hauteur : le premier nombre, plus au hasard jusqu'au second). `key` : sa marque de saison (des
 * feuilles qui tombent, ou un feuillage qui reste).
 */
export const tuftOf =
  (group: THREE.Group, rand: () => number, tints: THREE.Material[], squash?: [number, number], key?: SeasonKey) =>
  (at: THREE.Vector3, size: number): void => {
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 0), tints[Math.floor(rand() * tints.length)])
    leaves.position.copy(at)
    if (squash) leaves.scale.set(1, squash[0] + rand() * squash[1], 1)
    leaves.rotation.set(rand() * 3, rand() * 3, rand() * 3)
    if (key) inSeason(leaves, key)
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

/**
 * Les fleurs d'un arbre : `per` petites fleurs à facettes de cette couleur sur le pourtour de chaque touffe (sa place, sa taille), en un
 * seul maillage, qu'on ne voit qu'au printemps. Elles ont leur propre tirage (`seed`) : la forme de l'arbre n'en dépend pas.
 */
export const blossomOf = (tufts: [THREE.Vector3, number][], color: number, seed: number, per: number): THREE.InstancedMesh => {
  const rand = seeded(seed)
  const blossom = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), faceted(color, 0.7), tufts.length * per)
  const dummy = new THREE.Object3D()
  tufts.forEach(([at, size], index) => {
    for (let flower = 0; flower < per; flower += 1) {
      const turn = rand() * Math.PI * 2
      // Plutôt sur le dessus et les flancs de la touffe que dessous.
      const rise = rand() * 1.4 - 0.4
      const wide = Math.sqrt(1 - rise ** 2)
      const big = 0.05 + rand() * 0.04
      dummy.position.set(at.x + Math.cos(turn) * wide * size * 0.9, at.y + rise * size * 0.7, at.z + Math.sin(turn) * wide * size * 0.9)
      dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3)
      dummy.scale.set(big, big * 0.7, big)
      dummy.updateMatrix()
      blossom.setMatrixAt(index * per + flower, dummy.matrix)
    }
  })
  return inSeason(blossom, 'blossom')
}

/** De petits fruits ronds de ce rayon et de cette couleur, à ces places : un seul maillage, marqué de sa saison. */
export const berriesOf = (places: THREE.Vector3[], radius: number, color: number, key: SeasonKey): THREE.InstancedMesh => {
  const berries = new THREE.InstancedMesh(new THREE.SphereGeometry(radius, 6, 4), faceted(color, 0.5), places.length)
  const dummy = new THREE.Object3D()
  places.forEach((at, index) => {
    dummy.position.copy(at)
    dummy.updateMatrix()
    berries.setMatrixAt(index, dummy.matrix)
  })
  return inSeason(berries, key)
}
