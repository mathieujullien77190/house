import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { faceted } from '@/components/Kitchen3D/materials'
import { noShadow, seeded } from '@/components/Kitchen3D/primitives'

const UP = new THREE.Vector3(0, 1, 0)

/**
 * Des morceaux qui partagent un matériau, fondus en un seul maillage (un seul appel de dessin) : `add` pose un morceau à sa place,
 * `grow` les fond, ajoute le maillage au groupe et le rend. Sans morceau, rien n'est ajouté.
 */
export interface Pieces {
  add: (geometry: THREE.BufferGeometry, matrix: THREE.Matrix4) => void
  grow: (group: THREE.Object3D) => THREE.Mesh[]
}

/** Les morceaux d'un matériau, à fondre en un maillage. */
export const piecesOf = (material: THREE.Material): Pieces => {
  const pieces: THREE.BufferGeometry[] = []
  return {
    add: (geometry, matrix) => {
      pieces.push(geometry.applyMatrix4(matrix))
    },
    grow: (group) => {
      if (pieces.length === 0) return []
      const mesh = new THREE.Mesh(mergeGeometries(pieces), material)
      group.add(mesh)
      return [mesh]
    },
  }
}

/** Le bois d'une plante : `limb` pose un tronçon entre deux points, plus fin au bout ; `grow` fond tous les tronçons en un seul maillage. */
export interface Wood {
  limb: (from: THREE.Vector3, to: THREE.Vector3, thick: number, thin: number) => void
  grow: Pieces['grow']
}

/** Le bois d'une plante, de cette écorce : tous ses tronçons font un seul maillage. */
export const woodOf = (bark: THREE.Material): Wood => {
  const pieces = piecesOf(bark)
  const place = new THREE.Object3D()
  return {
    limb: (from, to, thick, thin) => {
      const span = to.clone().sub(from)
      place.position.copy(from).add(to).multiplyScalar(0.5)
      place.quaternion.setFromUnitVectors(UP, span.clone().normalize())
      place.updateMatrix()
      pieces.add(new THREE.CylinderGeometry(thin, thick, span.length(), 5), place.matrix)
    },
    grow: pieces.grow,
  }
}

/**
 * Des touffes à facettes (des cailloux à vingt faces) : un maillage `InstancedMesh` par teinte, quel que soit leur nombre. `add` pose
 * une touffe de la teinte `tint` (son rang), tournée et étirée ; `grow` ajoute les maillages au groupe et les rend (rien pour une
 * teinte sans touffe).
 */
export interface Tufts {
  /** Le nombre de teintes. */
  tints: number
  add: (tint: number, at: THREE.Vector3, turn: [number, number, number], size: [number, number, number]) => void
  grow: (group: THREE.Object3D) => THREE.InstancedMesh[]
}

/** Des touffes de ces teintes (un matériau chacune) ; `detail` : la finesse du caillou (0 : vingt faces). */
export const tuftsOf = (tints: THREE.Material[], detail = 0): Tufts => {
  const places: THREE.Matrix4[][] = tints.map(() => [])
  const place = new THREE.Object3D()
  return {
    tints: tints.length,
    add: (tint, at, turn, size) => {
      place.position.copy(at)
      place.rotation.set(...turn)
      place.scale.set(...size)
      place.updateMatrix()
      places[tint].push(place.matrix.clone())
    },
    grow: (group) => {
      const stone = new THREE.IcosahedronGeometry(1, detail)
      return tints.flatMap((material, tint) => {
        if (places[tint].length === 0) return []
        const mesh = new THREE.InstancedMesh(stone, material, places[tint].length)
        places[tint].forEach((matrix, index) => mesh.setMatrixAt(index, matrix))
        group.add(mesh)
        return [mesh]
      })
    },
  }
}

/**
 * Rend de quoi poser une touffe de feuilles parmi `tufts` : d'une de leurs teintes, tournée au hasard, et un peu écrasée si `squash`
 * est donné (sa hauteur : le premier nombre, plus au hasard jusqu'au second).
 */
export const tuftOf =
  (rand: () => number, tufts: Tufts, squash?: [number, number]) =>
  (at: THREE.Vector3, size: number): void => {
    const tint = Math.floor(rand() * tufts.tints)
    const tall = squash ? squash[0] + rand() * squash[1] : 1
    tufts.add(tint, at, [rand() * 3, rand() * 3, rand() * 3], [size, size * tall, size])
  }

/**
 * Rend de quoi semer des touffes espacées le long d'un tronçon (une tous les `every` mètres environ), chacune au bout d'une brindille,
 * un peu écartée du bois (`lift` : la part de l'écart qui descend sous le bois).
 */
export const sprinkleOf =
  (rand: () => number, limb: Wood['limb'], tuft: (at: THREE.Vector3) => void, every: number, lift: number) =>
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
 * seul maillage. Elles ont leur propre tirage (`seed`) : la forme de l'arbre n'en dépend pas. Trop
 * petites pour porter une ombre.
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
  return noShadow(blossom)
}

/** De petits fruits ronds de ce rayon et de cette couleur, à ces places : un seul maillage, sans ombre portée. */
export const berriesOf = (places: THREE.Vector3[], radius: number, color: number): THREE.InstancedMesh => {
  const berries = new THREE.InstancedMesh(new THREE.SphereGeometry(radius, 6, 4), faceted(color, 0.5), places.length)
  const dummy = new THREE.Object3D()
  places.forEach((at, index) => {
    dummy.position.copy(at)
    dummy.updateMatrix()
    berries.setMatrixAt(index, dummy.matrix)
  })
  return noShadow(berries)
}

/** Des fruits ronds à facettes de ce rayon et de cette couleur, à ces places : un seul maillage, sans ombre portée. */
export const fruitsOf = (places: THREE.Vector3[], radius: number, color: number): THREE.InstancedMesh => {
  const fruits = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(radius, 0), faceted(color, 0.6), places.length)
  const dummy = new THREE.Object3D()
  places.forEach((at, index) => {
    dummy.position.copy(at)
    dummy.updateMatrix()
    fruits.setMatrixAt(index, dummy.matrix)
  })
  return noShadow(fruits)
}
