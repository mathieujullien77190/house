import * as THREE from 'three'
import { PLAN_GARAGE_CORNERS } from '@/components/Lights/constants'
import { ROOM } from '@/components/Kitchen3D/constants'
import { noShadow, seeded } from '@/components/Kitchen3D/primitives'
import { DECK, GRASS, HEDGE, LOT, PAVING, TERRACE } from './constants'
import { SITE } from './layout'
import { PERGOLA_FRONT } from './pergola'
import { gardenX, gardenZ } from './plan'

/** Les bouquets d'herbe : combien on en tire au hasard sur le terrain (ceux qui tombent hors de l'herbe sont écartés), et leur taille (m). */
const TUFTS = { tries: 2600, tall: 0.2, blades: 11, wide: 0.012 }

/**
 * Un bouquet d'herbe : une dizaine de brins fins qui partent du même pied en gerbe. Chaque brin est un ruban étroit en trois tronçons,
 * qui monte, se courbe vers le dehors et s'effile jusqu'à sa pointe ; leurs hauteurs et leurs courbures diffèrent.
 */
const tuftGeometry = (): THREE.BufferGeometry => {
  const rand = seeded(89)
  const points: number[] = []
  for (let blade = 0; blade < TUFTS.blades; blade += 1) {
    const turn = (blade / TUFTS.blades) * Math.PI * 2 + rand() * 0.6
    const tall = TUFTS.tall * (0.55 + rand() * 0.6)
    const bend = 0.03 + rand() * 0.09
    const out = new THREE.Vector3(Math.cos(turn), 0, Math.sin(turn))
    const side = new THREE.Vector3(-out.z, 0, out.x)
    // Le brin à cette part de sa longueur : son axe (il s'écarte de plus en plus) et sa demi-largeur (elle fond).
    const edge = (share: number, sign: number): THREE.Vector3 => out.clone().multiplyScalar(0.01 + bend * share * share).setY(tall * share).addScaledVector(side, sign * TUFTS.wide * (1 - share) * 0.5)
    for (let step = 0; step < 3; step += 1) {
      const [low, high] = [step / 3, (step + 1) / 3]
      const quad = [edge(low, -1), edge(low, 1), edge(high, 1), edge(low, -1), edge(high, 1), edge(high, -1)]
      for (const corner of quad) points.push(corner.x, corner.y, corner.z)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
  geometry.computeVertexNormals()
  return geometry
}

/** Vrai si le point du plan est dans le polygone. */
const inside = (x: number, y: number, corners: [number, number][]): boolean =>
  corners.reduce((hit, [cornerX, cornerY], index) => {
    const [nextX, nextY] = corners[(index + 1) % corners.length]
    const crosses = cornerY > y !== nextY > y && x < ((nextX - cornerX) * (y - cornerY)) / (nextY - cornerY) + cornerX
    return crosses ? !hit : hit
  }, false)

/**
 * Le niveau de l'herbe en ce point du plan, ou `null` s'il n'y a pas d'herbe là : hors du terrain ou sous une haie, sous la maison et ses
 * terrasses, sur le pavage de l'est et le chemin du portillon, sur l'allée de béton, sous la cage et la terrasse en ipé.
 */
const grassLevel = (planX: number, planY: number): number | null => {
  const { house, stepLine, stepZ, binSouth, cageZ1 } = SITE
  const margin = 30
  const inArc = planY > LOT.centerY && Math.hypot(planX - LOT.centerX, planY - LOT.centerY) < HEDGE.radius - margin
  const inBand = planY <= LOT.centerY && planY > HEDGE.north + margin && planX > HEDGE.west + margin
  if ((!inArc && !inBand) || planX > HEDGE.east - margin) return null
  if (inside(planX, planY, PLAN_GARAGE_CORNERS)) return null
  const [x, z] = [gardenX(planY), gardenZ(planX)]
  // La maison, ses terrasses, la jardinière de devant et la bande de béton de derrière.
  if (x > house[0] - PERGOLA_FRONT - 0.7 && x < house[1] + TERRACE + 0.2 && z > house[2] - TERRACE - 0.15 && z < house[3] + TERRACE) return null
  // Tout l'est de la maison, au nord du muret des poubelles : le pavage, la cage, la dalle.
  if (z > ROOM.zMax - 0.1 && x > binSouth - 0.3) return null
  // Le chemin du portillon et ses murets.
  if (z > gardenZ(PAVING.pathWest) - 0.2 && z < gardenZ(PAVING.pathEast) + 0.2 && x < house[0]) return null
  // Derrière la maison : la terrasse en ipé et ce qui longe la cage.
  const low = x > stepLine && z < stepZ
  if (low && z > cageZ1 - 0.4 - DECK.long - 0.15) return null
  return low ? GRASS : -0.02
}

/**
 * Des bouquets d'herbe çà et là : quelques gerbes de brins fins semées au hasard sur les pelouses unies (un seul maillage), de tailles, d'orientations
 * et de verts variés. `share` : la part des tirages qu'on fait (moins de 1 sur téléphone : moins de bouquets). Ils ne portent pas d'ombre.
 */
export const grassTufts = (group: THREE.Group, share = 1): void => {
  const rand = seeded(97)
  const dummy = new THREE.Object3D()
  const places: THREE.Matrix4[] = []
  for (let attempt = 0; attempt < Math.round(TUFTS.tries * share); attempt += 1) {
    const planX = LOT.centerX - LOT.radius + rand() * (LOT.east - LOT.centerX + LOT.radius)
    const planY = LOT.north + rand() * (LOT.centerY + LOT.radius - LOT.north)
    const level = grassLevel(planX, planY)
    if (level === null) continue
    const size = 0.7 + rand() * 0.9
    dummy.position.set(gardenX(planY), level, gardenZ(planX))
    dummy.rotation.set(0, rand() * Math.PI * 2, 0)
    dummy.scale.set(size, size * (0.7 + rand() * 0.8), size)
    dummy.updateMatrix()
    places.push(dummy.matrix.clone())
  }
  const tufts = new THREE.InstancedMesh(tuftGeometry(), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide }), places.length)
  const tint = new THREE.Color()
  places.forEach((matrix, index) => {
    tufts.setMatrixAt(index, matrix)
    tufts.setColorAt(index, tint.setHSL(0.25 + rand() * 0.06, 0.4 + rand() * 0.2, 0.3 + rand() * 0.14))
  })
  group.add(noShadow(tufts))
}

/** Des places tirées au hasard sur l'herbe (celles qui tombent ailleurs sont écartées) : leurs coordonnées dans la scène. */
const onGrass = (tries: number, rand: () => number): THREE.Vector3[] => {
  const places: THREE.Vector3[] = []
  for (let attempt = 0; attempt < tries; attempt += 1) {
    const planX = LOT.centerX - LOT.radius + rand() * (LOT.east - LOT.centerX + LOT.radius)
    const planY = LOT.north + rand() * (LOT.centerY + LOT.radius - LOT.north)
    const level = grassLevel(planX, planY)
    if (level !== null) places.push(new THREE.Vector3(gardenX(planY), level, gardenZ(planX)))
  }
  return places
}

/**
 * Les fleurs de la pelouse, éparses : des pâquerettes (une collerette blanche à plat, un cœur jaune) et, plus rares, de petites fleurs de
 * couleur (jaunes, violettes, roses, bleues) un peu plus hautes. Trois maillages en tout. Elles ne portent pas d'ombre.
 */
export const lawnFlowers = (group: THREE.Group): void => {
  const rand = seeded(103)
  const dummy = new THREE.Object3D()
  const daisies = onGrass(1100, rand)
  const petals = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.022, 0.022, 0.004, 8), new THREE.MeshStandardMaterial({ color: 0xfbfbf6, roughness: 0.8 }), daisies.length)
  const hearts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshStandardMaterial({ color: 0xf2c531, roughness: 0.7 }), daisies.length)
  daisies.forEach((at, index) => {
    const size = 0.8 + rand() * 0.6
    dummy.position.set(at.x, at.y + 0.035 + rand() * 0.02, at.z)
    dummy.rotation.set((rand() - 0.5) * 0.5, 0, (rand() - 0.5) * 0.5)
    dummy.scale.set(size, 1, size)
    dummy.updateMatrix()
    petals.setMatrixAt(index, dummy.matrix)
    dummy.position.y += 0.004
    dummy.updateMatrix()
    hearts.setMatrixAt(index, dummy.matrix)
  })
  const wild = onGrass(500, rand)
  const blooms = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.017, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true }), wild.length)
  const tints = [0xf0cf3a, 0x8f6fd6, 0xe58fb4, 0x6f9be0, 0xf0cf3a]
  const tint = new THREE.Color()
  wild.forEach((at, index) => {
    const size = 0.8 + rand() * 0.7
    dummy.position.set(at.x, at.y + 0.06 + rand() * 0.05, at.z)
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3)
    dummy.scale.set(size, size, size)
    dummy.updateMatrix()
    blooms.setMatrixAt(index, dummy.matrix)
    blooms.setColorAt(index, tint.setHex(tints[Math.floor(rand() * tints.length)]))
  })
  group.add(noShadow(petals), noShadow(hearts), noShadow(blooms))
}
