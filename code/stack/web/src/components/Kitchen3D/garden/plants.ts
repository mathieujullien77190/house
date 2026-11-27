import * as THREE from 'three'
import { faceted } from '@/components/Kitchen3D/materials'
import { box, seeded, standard } from '@/components/Kitchen3D/primitives'
import { CAGE_HEIGHT, GRASS, LOT, PANEL } from './constants'
import type { PlanPoint } from './constants'
import { limbOf } from './branches'
import { PERGOLA } from './pergola'
import { gardenX, gardenZ } from './plan'
import { SITE } from './layout'

/** Une fougère : une touffe de frondes plates qui partent du cœur, montent, s'arquent et retombent tout autour, de plus en plus étroites. */
export const fern = (seed: number): THREE.Group => {
  const group = new THREE.Group()
  const rand = seeded(seed)
  const greens = [0x4c8f3c, 0x5aa046, 0x3f7d34].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true, side: THREE.DoubleSide }))
  const fronds = 11 + Math.floor(rand() * 4)
  for (let frond = 0; frond < fronds; frond += 1) {
    const turn = (frond / fronds) * Math.PI * 2 + (rand() - 0.5) * 0.5
    const long = 0.75 + rand() * 0.5
    const material = greens[Math.floor(rand() * greens.length)]
    // La nervure passe par quatre points (écart au cœur, hauteur) ; entre eux, trois lames de plus en plus étroites.
    const spine: [number, number][] = [[0, 0], [0.14 * long, 0.2 * long], [0.32 * long, 0.3 * long], [0.5 * long, 0.2 * long + (rand() - 0.5) * 0.06]]
    spine.slice(1).forEach(([out, y], index) => {
      const [fromOut, fromY] = spine[index]
      const from = new THREE.Vector3(Math.cos(turn) * fromOut, fromY, Math.sin(turn) * fromOut)
      const to = new THREE.Vector3(Math.cos(turn) * out, y, Math.sin(turn) * out)
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09 - index * 0.025, 0.006, from.distanceTo(to)), material)
      blade.position.copy(from).add(to).multiplyScalar(0.5)
      blade.lookAt(to)
      group.add(blade)
    })
  }
  return group
}

/** Un oranger du Mexique, encore petit : une boule basse de feuilles luisantes, vert vif, piquée de quelques fleurs blanches. */
export const choisya = (seed: number): THREE.Group => {
  const group = new THREE.Group()
  const rand = seeded(seed)
  const greens = [0x4f9a3f, 0x5cab49].map((color) => faceted(color, 0.5))
  const white = faceted(0xfafaf5, 0.7)
  for (let leaf = 0; leaf < 16; leaf += 1) {
    const turn = rand() * Math.PI * 2
    const wide = Math.sqrt(rand()) * 0.17
    const tuft = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07 + rand() * 0.04, 0), greens[leaf % greens.length])
    tuft.position.set(Math.cos(turn) * wide, 0.08 + rand() * 0.25, Math.sin(turn) * wide)
    tuft.rotation.set(rand() * 3, rand() * 3, rand() * 3)
    group.add(tuft)
  }
  for (let bloom = 0; bloom < 7; bloom += 1) {
    const turn = rand() * Math.PI * 2
    const flower = new THREE.Mesh(new THREE.IcosahedronGeometry(0.025, 0), white)
    flower.position.set(Math.cos(turn) * 0.16 * rand(), 0.33 + rand() * 0.08, Math.sin(turn) * 0.16 * rand())
    group.add(flower)
  }
  return group
}

/** Un hortensia : un buisson rond de feuilles vertes, et dessus de grosses boules de fleurs, roses et bleues. */
export const hydrangea = (seed: number): THREE.Group => {
  const group = new THREE.Group()
  const rand = seeded(seed)
  const greens = [0x3f7a38, 0x4a8a40].map((color) => faceted(color, 0.85))
  const blooms = [0xd98fc4, 0x9aa8e6, 0xc7a0e0, 0xe6a8cf].map((color) => faceted(color, 0.8))
  for (let leaf = 0; leaf < 22; leaf += 1) {
    const turn = rand() * Math.PI * 2
    const wide = Math.sqrt(rand()) * 0.3
    const tuft = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1 + rand() * 0.05, 0), greens[leaf % greens.length])
    tuft.position.set(Math.cos(turn) * wide, 0.12 + rand() * 0.38, Math.sin(turn) * wide)
    tuft.rotation.set(rand() * 3, rand() * 3, rand() * 3)
    group.add(tuft)
  }
  for (let bloom = 0; bloom < 9; bloom += 1) {
    const turn = (bloom / 9) * Math.PI * 2 + rand()
    const wide = bloom < 3 ? rand() * 0.12 : 0.22 + rand() * 0.14
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08 + rand() * 0.03, 1), blooms[Math.floor(rand() * blooms.length)])
    head.position.set(Math.cos(turn) * wide, bloom < 3 ? 0.6 + rand() * 0.06 : 0.42 + rand() * 0.14, Math.sin(turn) * wide)
    head.scale.y = 0.8
    group.add(head)
  }
  return group
}

/**
 * La passiflore du grand bac : elle a grimpé sur les deux pans derrière le bac et sur le pan de droite, a gagné le dessus (le grillage
 * puis un peu la tôle) et commence à courir sur le grand côté grillagé. Des feuilles plates (un seul maillage), des tiges, des fleurs violettes en étoile.
 */
export const passionflower = (group: THREE.Group): void => {
  const { cageX1, cageZ1, backX, turnZ } = SITE
  const step = PANEL
  const rand = seeded(43)
  // Chaque zone : son nombre de feuilles, l'axe sur lequel elles sont à plat, et la place d'une feuille tirée au hasard.
  const zones: [number, 'x' | 'y' | 'z', () => [number, number, number]][] = [
    [300, 'x', () => [backX - 0.03 + rand() * 0.04, 0.45 + rand() * (CAGE_HEIGHT - 0.45), cageZ1 + rand() * step * 2]],
    [140, 'z', () => [cageX1 + rand() * step, 0.3 + rand() * (CAGE_HEIGHT - 0.3), turnZ - 0.03 + rand() * 0.04]],
    [230, 'y', () => [backX + rand() * rand() * 2.4, CAGE_HEIGHT + 0.05 + rand() * 0.04, cageZ1 + rand() * step * 2]],
    [70, 'y', () => {
      const along = rand() * 0.9
      return [cageX1 + rand() * 1.8, CAGE_HEIGHT + 0.11 - along * 0.06 + rand() * 0.03, turnZ - 0.1 + along]
    }],
    [60, 'z', () => [backX + rand() * rand() * 2.6, 0.2 + rand() * (CAGE_HEIGHT - 0.2), cageZ1 - 0.03 + rand() * 0.04]],
  ]
  const total = zones.reduce((sum, [count]) => sum + count, 0)
  // Une feuille de passiflore : plate, palmée, à cinq doigts étroits qui rayonnent du pétiole (son contour, en coordonnées polaires).
  const finger = (40 * Math.PI) / 180
  const outline = Array.from({ length: 90 }, (_, index) => {
    const turn = (index / 90) * Math.PI * 2 - Math.PI
    const lobe = Math.abs(turn) <= finger * 2.5 ? Math.abs(Math.cos((Math.PI * turn) / finger)) ** 3 : 0
    const reach = 0.012 + 0.085 * lobe
    return new THREE.Vector2(Math.sin(turn) * reach, Math.cos(turn) * reach)
  })
  const leaves = new THREE.InstancedMesh(new THREE.ShapeGeometry(new THREE.Shape(outline)), standard(0x3f7d34, 0.9, 0, THREE.DoubleSide), total)
  // Une fleur de passiflore : une étoile plate à dix branches fines, violette.
  const star = Array.from({ length: 20 }, (_, index) => {
    const turn = (index / 20) * Math.PI * 2
    const reach = index % 2 === 0 ? 0.06 : 0.02
    return new THREE.Vector2(Math.cos(turn) * reach, Math.sin(turn) * reach)
  })
  const flowers = new THREE.InstancedMesh(new THREE.ShapeGeometry(new THREE.Shape(star)), standard(0x7b4fd0, 0.6, 0, THREE.DoubleSide), 40)
  const dummy = new THREE.Object3D()
  let leafIndex = 0
  let flowerIndex = 0
  for (const [count, flat, place] of zones) {
    for (let leaf = 0; leaf < count; leaf += 1) {
      const [x, y, z] = place()
      const size = 0.7 + rand() * 0.8
      dummy.position.set(x, y, z)
      // La feuille tourne d'abord dans son plan (au hasard), puis se couche contre son pan, avec un peu de jeu.
      const tilt = (rand() - 0.5) * 0.7
      dummy.rotation.set(flat === 'y' ? -Math.PI / 2 + tilt : tilt, flat === 'x' ? Math.PI / 2 + tilt : tilt, rand() * Math.PI * 2)
      dummy.scale.set(size, size, size)
      dummy.updateMatrix()
      leaves.setMatrixAt(leafIndex, dummy.matrix)
      leafIndex += 1
      // Une fleur de temps en temps, posée devant sa feuille.
      if (flowerIndex < 40 && rand() < 0.06) {
        dummy.position.set(x - (flat === 'x' ? 0.04 : 0), y + (flat === 'y' ? 0.04 : 0), z - (flat === 'z' ? 0.04 : 0))
        // Elle garde l'orientation de sa feuille : à plat contre le pan.
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        flowers.setMatrixAt(flowerIndex, dummy.matrix)
        flowerIndex += 1
      }
    }
  }
  flowers.count = flowerIndex
  const stem = standard(0x5b6b2e, 0.9)
  group.add(leaves, flowers)
  for (const dz of [0.25, 0.7, 1.15]) group.add(box(0.015, 0.9, 0.015, stem, backX - 0.03, 0.9, cageZ1 + dz))
}

/**
 * Une haie de spirées le long d'une ligne du plan : un bloc vert au cœur, et autour une masse très dense de rameaux. Chaque rameau part du pied, monte haut,
 * s'arque et retombe ; la plupart retombent du côté du jardin (vers le centre du terrain), quelques-uns de l'autre. Tout du long, de
 * petits amas de feuilles et des bouquets de fleurs blanches, plus serrés sur la retombée. `sink` : de combien le pied est sous le niveau
 * du terrain (là où le jardin est plus bas). Deux maillages par ligne (feuilles, fleurs), plus le bloc de chaque tronçon.
 */
export const spireaHedge = (points: PlanPoint[], height: number, sink: number, seed: number): THREE.Group => {
  const group = new THREE.Group()
  const rand = seeded(seed)
  const heart = new THREE.Vector3(gardenX(LOT.centerY), 0, gardenZ(LOT.centerX))
  const core = faceted(0x3f7a3a, 1)
  // La hauteur du bloc vert du cœur (m).
  const block = 2.1
  const spots: [number, number, number, number][] = []
  const blooms: [number, number, number, number][] = []
  points.slice(1).forEach((point, index) => {
    const from = new THREE.Vector3(gardenX(points[index][1]), 0, gardenZ(points[index][0]))
    const to = new THREE.Vector3(gardenX(point[1]), 0, gardenZ(point[0]))
    const heading = to.clone().sub(from).normalize()
    const across = new THREE.Vector3(heading.z, 0, -heading.x)
    // Le côté du jardin : celui du centre du terrain.
    if (across.dot(heart.clone().sub(from)) < 0) across.negate()
    // Le cœur de la haie : un bloc vert, plein, d'où sortent les rameaux.
    const long = from.distanceTo(to)
    const body = box(0.6, block + sink, long + 0.3, core, (from.x + to.x) / 2, (block - sink) / 2, (from.z + to.z) / 2)
    body.rotation.y = Math.atan2(to.x - from.x, to.z - from.z)
    group.add(body)
    // Sur ce bloc, la haie est la plus dense : de gros bouquets de feuilles posés sur ses flancs et son dessus, et des fleurs parmi eux.
    for (let clump = 0; clump < long * 70; clump += 1) {
      const at = from.clone().lerp(to, rand())
      const onTop = rand() < 0.35
      const side = onTop ? (rand() - 0.5) * 0.6 : (rand() < 0.5 ? -1 : 1) * (0.3 + rand() * 0.08)
      const y = onTop ? block + rand() * 0.12 : rand() * block
      at.addScaledVector(across, side)
      spots.push([at.x, y - sink, at.z, 0.11 + rand() * 0.08])
      if (rand() < 0.45) blooms.push([at.x + (rand() - 0.5) * 0.1, y - sink + 0.08, at.z + (rand() - 0.5) * 0.1, 0.035 + rand() * 0.03])
    }
    const canes = Math.round(long * 16)
    for (let cane = 0; cane < canes; cane += 1) {
      const foot = from.clone().lerp(to, rand()).addScaledVector(across, (rand() - 0.5) * 0.4)
      // Trois rameaux sur quatre retombent vers le jardin, tout près du bloc (à moins d'un mètre) ; les autres de l'autre côté, encore plus près.
      const inward = rand() < 0.75
      const reach = (inward ? 0.5 + rand() * 0.5 : -(0.25 + rand() * 0.3)) * (0.8 + rand() * 0.4)
      const tall = height * (0.8 + rand() * 0.4)
      const drop = tall * (0.3 + rand() * 0.3)
      const lean = (rand() - 0.5) * 0.5
      // Le rameau suit une courbe : du pied, par un sommet au-dessus de lui, jusqu'à sa pointe qui pend.
      for (let step = 0; step < 13; step += 1) {
        const t = 0.12 + (step / 12) * 0.88
        const out = 2 * (1 - t) * t * reach * 0.2 + t * t * reach
        const y = 2 * (1 - t) * t * tall * 1.35 + t * t * drop
        const at = foot.clone().addScaledVector(across, out).addScaledVector(heading, lean * t)
        const jitter = (): number => (rand() - 0.5) * 0.14
        // Dans le bloc (près du pied, sous son dessus), les bouquets sont plus gros.
        const inBlock = Math.abs(out) < 0.45 && y < block + 0.15
        spots.push([at.x + jitter(), y - sink + jitter(), at.z + jitter(), (0.05 + rand() * 0.045) * (inBlock ? 1.9 : 1)])
        // Les fleurs : en bouquets sur la moitié haute et la retombée.
        if (t > 0.4 && rand() < 0.75) blooms.push([at.x + jitter(), y - sink + 0.04 + jitter(), at.z + jitter(), 0.03 + rand() * 0.03])
      }
    }
  })
  const dummy = new THREE.Object3D()
  const scatter = (places: [number, number, number, number][], material: THREE.Material) => {
    const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), material, places.length)
    places.forEach(([x, y, z, size], index) => {
      dummy.position.set(x, y, z)
      dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3)
      dummy.scale.set(size, size * 0.8, size)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    group.add(mesh)
  }
  scatter(spots, faceted(0x5c9a4a, 0.9))
  scatter(blooms, faceted(0xf8f8f3, 0.7))
  return group
}

/**
 * La glycine de la pergola, dans le repère de celle-ci : un seul pied, au poteau d'angle de devant, du côté des marches ; son tronc
 * s'enroule autour du poteau, puis ses sarments partent sur le dessus, chacun à sa longueur : elle gagne à peu près la moitié de la
 * pergola, mais par avancées inégales, pas en nappe. Les feuilles suivent les sarments, et dessous pendent des grappes de fleurs mauves.
 */
export const wisteria = (seed: number): THREE.Group => {
  const group = new THREE.Group()
  const rand = seeded(seed)
  const limb = limbOf(group, faceted(0x7a6f62, 0.95))
  // (La pergola est retournée : son rang de devant est le premier, et le bout des marches est celui des x négatifs.)
  const postX = PERGOLA.posts.along[0]
  const postZ = PERGOLA.posts.rows[0]
  const top = PERGOLA.top
  // Le tronc : une spirale serrée autour du poteau, du sol jusqu'aux chevrons.
  let last = new THREE.Vector3(postX + 0.09, 0, postZ)
  for (let step = 1; step <= 12; step += 1) {
    const turn = step * 1.1
    const next = new THREE.Vector3(postX + Math.cos(turn) * 0.085, (top * step) / 12, postZ + Math.sin(turn) * 0.085)
    limb(last, next, 0.04 - step * 0.0015, 0.04 - (step + 1) * 0.0015)
    last = next
  }
  // Les sarments : du haut du poteau, chacun file vers l'autre bout de la pergola en dérivant sur sa profondeur, et s'arrête où il veut
  // (certains tout près, d'autres au-delà du milieu). Les feuilles et les grappes se posent autour d'eux.
  const head = new THREE.Vector3(postX, top + 0.03, postZ)
  const leafSpots: THREE.Vector3[] = []
  for (let runner = 0; runner < 14; runner += 1) {
    // Dix restent sur sa moitié, sans la remplir toute ; quatre passent le milieu et gagnent un peu l'autre.
    const reach = runner % 4 === 3 ? 2.6 + rand() * 1.2 : 0.6 + rand() * 1.7
    const endZ = Math.min(PERGOLA.deep - 0.05, Math.max(0.05, postZ - 0.5 + rand() * PERGOLA.deep * 1.05))
    let from = head
    const steps = Math.max(2, Math.round(reach / 0.45))
    for (let step = 1; step <= steps; step += 1) {
      const share = step / steps
      const to = new THREE.Vector3(postX - 0.12 + reach * share + (rand() - 0.5) * 0.2, top + 0.03 + rand() * 0.05, postZ + (endZ - postZ) * share + (rand() - 0.5) * 0.25)
      limb(from, to, 0.02 - share * 0.012, 0.018 - share * 0.012)
      // Autour de ce tronçon : une poignée de places pour les feuilles.
      for (let spot = 0; spot < 6; spot += 1) leafSpots.push(from.clone().lerp(to, rand()).add(new THREE.Vector3((rand() - 0.5) * 0.45, rand() * 0.08, (rand() - 0.5) * 0.45)))
      from = to
    }
  }
  const dummy = new THREE.Object3D()
  const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), faceted(0x6aa84f, 0.9), leafSpots.length)
  leafSpots.forEach((at, index) => {
    // Quelques-unes retombent sous les chevrons.
    const droop = rand() < 0.2 ? rand() * 0.35 : 0
    const size = 0.07 + rand() * 0.08
    dummy.position.set(at.x, at.y - droop, at.z)
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3)
    dummy.scale.set(size, size * 0.45, size)
    dummy.updateMatrix()
    leaves.setMatrixAt(index, dummy.matrix)
  })
  // Les grappes : des cônes mauves pointe en bas, sous une feuille sur quatre.
  const hung = leafSpots.filter((_, index) => index % 4 === 0)
  const clusters = new THREE.InstancedMesh(new THREE.ConeGeometry(0.055, 1, 5), faceted(0xa98be0, 0.8), hung.length)
  hung.forEach((at, index) => {
    const long = 0.22 + rand() * 0.25
    dummy.position.set(at.x, top - PERGOLA.rafters.tall - long / 2 + 0.05, at.z)
    dummy.rotation.set(Math.PI + (rand() - 0.5) * 0.2, rand() * 3, (rand() - 0.5) * 0.2)
    dummy.scale.set(0.8 + rand() * 0.5, long, 0.8 + rand() * 0.5)
    dummy.updateMatrix()
    clusters.setMatrixAt(index, dummy.matrix)
  })
  group.add(leaves, clusters)
  return group
}

/**
 * Un buisson de cette hauteur, étiré sur cette longueur (le long de z) : une masse allongée de touffes de feuilles, pas très serrées (on
 * voit ses tiges au travers), sur une rangée de tiges ; avec `bloom`, il est piqué de fleurs de cette couleur, surtout en haut. `seed`
 * fixe le hasard.
 */
export const bush = (seed: number, height: number, long: number, bloom?: number): THREE.Group => {
  const group = new THREE.Group()
  const rand = seeded(seed)
  const greens = [0x3f7a38, 0x4a8a40, 0x356b31].map((color) => faceted(color, 0.85))
  const limb = limbOf(group, faceted(0x4a3b30, 0.95))
  const wide = 0.42
  const stems = Math.max(5, Math.round(long * 4))
  for (let stem = 0; stem < stems; stem += 1) {
    const z = -long / 2 + 0.15 + (stem / (stems - 1)) * (long - 0.3)
    limb(new THREE.Vector3((rand() - 0.5) * 0.1, 0, z * 0.6), new THREE.Vector3((rand() - 0.5) * wide, height * (0.55 + rand() * 0.3), z + (rand() - 0.5) * 0.3), 0.02, 0.008)
  }
  const flowers = bloom === undefined ? null : faceted(bloom, 0.7)
  const tufts = Math.round(long * 42)
  for (let leaf = 0; leaf < tufts; leaf += 1) {
    const turn = rand() * Math.PI * 2
    const rise = rand()
    // La largeur de la masse à cette hauteur : étroite au pied, pleine à mi-hauteur, arrondie en haut.
    const reach = Math.sin(Math.PI * (0.12 + rise * 0.8)) * Math.sqrt(rand())
    const at = new THREE.Vector3(Math.cos(turn) * reach * wide, 0.12 + rise * (height - 0.2), Math.sin(turn) * reach * (long / 2))
    const tuft = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09 + rand() * 0.06, 0), greens[leaf % greens.length])
    tuft.position.copy(at)
    tuft.rotation.set(rand() * 3, rand() * 3, rand() * 3)
    group.add(tuft)
    if (flowers && rise > 0.35 && rand() < 0.45) {
      const flower = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035 + rand() * 0.02, 0), flowers)
      flower.position.set(at.x * 1.12, at.y + 0.08, at.z)
      group.add(flower)
    }
  }
  return group
}

/**
 * Un massif de grandes fleurs, au pied d'un arbre : des tiges droites de cette hauteur à peu près, semées dans un rond de ce rayon, chacune
 * avec deux feuilles et, en haut, sa fleur de cette couleur. Trois maillages (tiges, feuilles, fleurs). `seed` fixe le hasard ; `keep` écarte les places où rien ne pousse.
 */
export const flowerPatch = (seed: number, radius: number, height: number, color: number, keep: (x: number, z: number) => boolean = () => true, tries = 45): THREE.Group => {
  const group = new THREE.Group()
  const rand = seeded(seed)
  // Les pieds : tirés dans le rond, sauf là où il ne pousse rien (`keep` : la place est-elle bonne, dans le repère du massif).
  const feet: [number, number][] = []
  for (let attempt = 0; attempt < tries; attempt += 1) {
    const turn = rand() * Math.PI * 2
    const reach = 0.25 + Math.sqrt(rand()) * (radius - 0.25)
    const foot: [number, number] = [Math.cos(turn) * reach, Math.sin(turn) * reach]
    if (keep(foot[0], foot[1])) feet.push(foot)
  }
  const count = feet.length
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.008, 1, 5), faceted(0x4f8a3f, 0.9), count)
  const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), faceted(0x5a9a48, 0.9), count * 2)
  const blooms = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), faceted(color, 0.7), count)
  const dummy = new THREE.Object3D()
  for (let stem = 0; stem < count; stem += 1) {
    const [x, z] = feet[stem]
    const tall = height * (0.75 + rand() * 0.4)
    dummy.rotation.set(0, 0, 0)
    dummy.position.set(x, tall / 2, z)
    dummy.scale.set(1, tall, 1)
    dummy.updateMatrix()
    stems.setMatrixAt(stem, dummy.matrix)
    for (let leaf = 0; leaf < 2; leaf += 1) {
      const side = rand() * Math.PI * 2
      dummy.position.set(x + Math.cos(side) * 0.05, tall * (0.3 + leaf * 0.25), z + Math.sin(side) * 0.05)
      dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3)
      dummy.scale.set(0.05, 0.015, 0.03)
      dummy.updateMatrix()
      leaves.setMatrixAt(stem * 2 + leaf, dummy.matrix)
    }
    const size = 0.04 + rand() * 0.025
    dummy.position.set(x, tall + size * 0.5, z)
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3)
    dummy.scale.set(size, size * 0.8, size)
    dummy.updateMatrix()
    blooms.setMatrixAt(stem, dummy.matrix)
  }
  group.add(stems, leaves, blooms)
  return group
}

/**
 * La vigne vierge de la cage : elle part du long bac, du côté des fougères, grimpe sur le grand côté grillagé (serrée près du pied, plus
 * clairsemée en s'éloignant) et déborde sur le dessus. Des feuilles plates à cinq folioles larges, d'un vert sombre, quelques-unes
 * rougies ; deux tiges. Un seul maillage pour les feuilles.
 */
export const creeper = (group: THREE.Group): void => {
  const { backX, cageZ1 } = SITE
  const rand = seeded(59)
  const finger = (36 * Math.PI) / 180
  const outline = Array.from({ length: 80 }, (_, index) => {
    const turn = (index / 80) * Math.PI * 2 - Math.PI
    const lobe = Math.abs(turn) <= finger * 2.5 ? Math.abs(Math.cos((Math.PI * turn) / finger)) ** 1.4 : 0
    const reach = 0.015 + 0.075 * lobe
    return new THREE.Vector2(Math.sin(turn) * reach, Math.cos(turn) * reach)
  })
  const spread = 2.1
  const spots: [number, number, number, boolean][] = []
  // Sur le grillage : plus on s'éloigne du pied (le long du mur ou vers le haut), moins il y a de feuilles.
  for (let attempt = 0; attempt < 900; attempt += 1) {
    const along = rand() * spread
    const rise = rand()
    if (rand() > (1 - along / spread) * (1.15 - rise * 0.5)) continue
    spots.push([backX + 0.05 + along, GRASS + 0.3 + rise * (CAGE_HEIGHT - GRASS - 0.3), cageZ1 - 0.02 - rand() * 0.04, false])
  }
  // Sur le dessus, au-dessus du pied.
  for (let attempt = 0; attempt < 160; attempt += 1) spots.push([backX + 0.05 + rand() * rand() * spread, CAGE_HEIGHT + 0.05 + rand() * 0.03, cageZ1 + rand() * rand() * 0.9, true])
  const leaves = new THREE.InstancedMesh(new THREE.ShapeGeometry(new THREE.Shape(outline)), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide }), spots.length)
  const dummy = new THREE.Object3D()
  const tint = new THREE.Color()
  spots.forEach(([x, y, z, flatOnTop], index) => {
    const size = 0.8 + rand() * 0.7
    const tilt = (rand() - 0.5) * 0.6
    dummy.position.set(x, y, z)
    dummy.rotation.set(flatOnTop ? -Math.PI / 2 + tilt : tilt, tilt, rand() * Math.PI * 2)
    dummy.scale.set(size, size, size)
    dummy.updateMatrix()
    leaves.setMatrixAt(index, dummy.matrix)
    leaves.setColorAt(index, rand() < 0.12 ? tint.setHSL(0.02 + rand() * 0.03, 0.6, 0.32 + rand() * 0.08) : tint.setHSL(0.3 + rand() * 0.04, 0.45 + rand() * 0.1, 0.22 + rand() * 0.1))
  })
  group.add(leaves)
  const limb = limbOf(group, faceted(0x5a4a3a, 0.95))
  for (const lean of [0.5, 1.3]) limb(new THREE.Vector3(backX + 0.2, GRASS + 0.22, cageZ1 - 0.2), new THREE.Vector3(backX + 0.2 + lean, CAGE_HEIGHT - 0.1, cageZ1 - 0.02), 0.014, 0.006)
}
