import * as THREE from 'three'
import { seeded, standard, woodTexture } from '@/components/Kitchen3D/primitives'

/** Une lame de parquet (m) : sa longueur, sa largeur, son épaisseur, et le joint entre deux lames. */
export const PLANK = { length: 1.1, width: 0.18, thickness: 0.014, joint: 0.002 }

/** Les lames du parquet de la salle de bain : plus petites (m). */
export const SMALL_PLANK = { length: 0.6, width: 0.1 }

/**
 * Le parquet, lame par lame : de vraies planches de chêne clair de 110 cm sur 18 cm, toutes dans le même sens (en long sur x), posées au
 * tiers (chaque rangée décalée d'un tiers de lame sur la précédente). La trame est la même pour toute la maison : les lames se suivent d'une
 * pièce à l'autre, coupées au bord de chaque rectangle `[x1, x2, z1, z2]`. Chaque lame a sa teinte ; un joint fin les sépare. Un seul maillage.
 */
export const parquet = (rooms: [number, number, number, number][], size: { length: number; width: number } = PLANK, turned = false): THREE.InstancedMesh => {
  const { thickness, joint } = PLANK
  const { length, width } = size
  // Tournées d'un quart de tour, les lames courent le long de z : on les pose dans un repère où x et z sont échangés.
  const areas = turned ? rooms.map(([x1, x2, z1, z2]): [number, number, number, number] => [z1, z2, x1, x2]) : rooms
  const planks: { x: number; z: number; long: number; wide: number; seed: number }[] = []
  for (const [x1, x2, z1, z2] of areas) {
    for (let row = Math.floor(z1 / width); row * width < z2; row += 1) {
      const offset = ((((row % 3) + 3) % 3) / 3) * length
      const zA = Math.max(row * width + joint / 2, z1)
      const zB = Math.min((row + 1) * width - joint / 2, z2)
      if (zB - zA < 0.004) continue
      for (let index = Math.floor((x1 - offset) / length); offset + index * length < x2; index += 1) {
        const xA = Math.max(offset + index * length + joint / 2, x1)
        const xB = Math.min(offset + (index + 1) * length - joint / 2, x2)
        if (xB - xA < 0.004) continue
        planks.push({ x: (xA + xB) / 2, z: (zA + zB) / 2, long: xB - xA, wide: zB - zA, seed: row * 7919 + index * 104729 })
      }
    }
  }
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), standard(woodTexture(0xf2f2f2, 3), 0.55), planks.length)
  const matrix = new THREE.Matrix4()
  const color = new THREE.Color()
  planks.forEach((plank, index) => {
    if (turned) matrix.makeScale(plank.wide, thickness, plank.long).setPosition(plank.z, -thickness / 2, plank.x)
    else matrix.makeScale(plank.long, thickness, plank.wide).setPosition(plank.x, -thickness / 2, plank.z)
    mesh.setMatrixAt(index, matrix)
    const rand = seeded(plank.seed)
    mesh.setColorAt(index, color.setHSL(0.083 + rand() * 0.012, 0.42 + rand() * 0.1, 0.56 + rand() * 0.1))
  })
  mesh.instanceMatrix.needsUpdate = true
  return mesh
}
