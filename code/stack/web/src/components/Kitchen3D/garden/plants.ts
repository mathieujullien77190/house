import * as THREE from 'three'
import { faceted } from '@/components/Kitchen3D/materials'
import { BATH_WINDOW } from '@/components/Kitchen3D/constants'
import { box, noShadow, seeded } from '@/components/Kitchen3D/primitives'
import { CAGE_HEIGHT, CAGE_LOW, GRASS, HEDGE, LOT, PANEL } from './constants'
import type { PlanPoint } from './constants'
import { piecesOf, tuftsOf, woodOf } from './branches'
import { PERGOLA } from './pergola'
import { gardenX, gardenZ, inLot } from './plan'
import { SITE } from './layout'

/** Une fougère : une touffe de frondes plates qui partent du cœur, montent, s'arquent et retombent tout autour, de plus en plus étroites. */
export const fern = (seed: number): THREE.Group => {
  const group = new THREE.Group()
  const rand = seeded(seed)
  // Les lames d'un même vert font un seul maillage.
  const greens = [0x4c8f3c, 0x5aa046, 0x3f7d34].map((color) => piecesOf(new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true, side: THREE.DoubleSide })))
  const place = new THREE.Object3D()
  // Une foliole : une lame plate de 1 m sur 1 m, couchée, dont la base est à l'origine (on l'étire à la pose).
  const leafGeometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0)
  const leaflet = new THREE.Object3D()
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
      place.position.copy(from).add(to).multiplyScalar(0.5)
      place.lookAt(to)
      place.updateMatrix()
      const span = from.distanceTo(to)
      // La nervure, fine ; de chaque côté, des folioles par paires qui s'écartent vers le bout et raccourcissent vers la pointe.
      material.add(new THREE.BoxGeometry(0.008, 0.006, span), place.matrix)
      const base = place.matrix.clone()
      for (let pair = 0; pair < 5; pair += 1) {
        const share = (index + pair / 5) / 3
        const reach = 0.1 * (1 - 0.7 * share)
        for (const side of [1, -1]) {
          leaflet.position.set(0, 0.002, -span / 2 + (span * (pair + 0.5)) / 5)
          leaflet.rotation.set(side * 0.15, side === 1 ? -0.95 : Math.PI + 0.95, 0)
          leaflet.scale.set(reach, 1, 0.02 * (1 - 0.4 * share) + 0.006)
          leaflet.updateMatrix()
          material.add(leafGeometry.clone(), base.clone().multiply(leaflet.matrix))
        }
      }
    })
  }
  for (const green of greens) green.grow(group)
  return group
}

/** Un oranger du Mexique, encore petit : une boule basse de feuilles luisantes, vert vif, piquée de quelques fleurs blanches. */
export const choisya = (seed: number): THREE.Group => {
  const group = new THREE.Group()
  const rand = seeded(seed)
  // Un maillage par vert pour les feuilles, un pour les fleurs.
  const greens = tuftsOf([0x4f9a3f, 0x5cab49].map((color) => faceted(color, 0.5)))
  const white = tuftsOf([faceted(0xfafaf5, 0.7)])
  for (let leaf = 0; leaf < 16; leaf += 1) {
    const turn = rand() * Math.PI * 2
    const wide = Math.sqrt(rand()) * 0.17
    const size = 0.07 + rand() * 0.04
    const at = new THREE.Vector3(Math.cos(turn) * wide, 0.08 + rand() * 0.25, Math.sin(turn) * wide)
    greens.add(leaf % greens.tints, at, [rand() * 3, rand() * 3, rand() * 3], [size, size, size])
  }
  for (let bloom = 0; bloom < 7; bloom += 1) {
    const turn = rand() * Math.PI * 2
    white.add(0, new THREE.Vector3(Math.cos(turn) * 0.16 * rand(), 0.33 + rand() * 0.08, Math.sin(turn) * 0.16 * rand()), [0, 0, 0], [0.025, 0.025, 0.025])
  }
  greens.grow(group)
  white.grow(group)
  return group
}

/** Un hortensia : un buisson rond de feuilles vertes, et dessus de grosses boules de fleurs, roses et bleues. */
export const hydrangea = (seed: number): THREE.Group => {
  const group = new THREE.Group()
  const rand = seeded(seed)
  // Un maillage par vert pour les feuilles, un par teinte pour les boules de fleurs (plus rondes : un caillou plus fin).
  const greens = tuftsOf([0x3f7a38, 0x4a8a40].map((color) => faceted(color, 0.85)))
  const blooms = tuftsOf([0xd98fc4, 0x9aa8e6, 0xc7a0e0, 0xe6a8cf].map((color) => faceted(color, 0.8)), 1)
  for (let leaf = 0; leaf < 22; leaf += 1) {
    const turn = rand() * Math.PI * 2
    const wide = Math.sqrt(rand()) * 0.3
    const size = 0.1 + rand() * 0.05
    const at = new THREE.Vector3(Math.cos(turn) * wide, 0.12 + rand() * 0.38, Math.sin(turn) * wide)
    greens.add(leaf % greens.tints, at, [rand() * 3, rand() * 3, rand() * 3], [size, size, size])
  }
  for (let bloom = 0; bloom < 9; bloom += 1) {
    const turn = (bloom / 9) * Math.PI * 2 + rand()
    const wide = bloom < 3 ? rand() * 0.12 : 0.22 + rand() * 0.14
    const size = 0.08 + rand() * 0.03
    const tint = Math.floor(rand() * blooms.tints)
    blooms.add(tint, new THREE.Vector3(Math.cos(turn) * wide, bloom < 3 ? 0.6 + rand() * 0.06 : 0.42 + rand() * 0.14, Math.sin(turn) * wide), [0, 0, 0], [size, size * 0.8, size])
  }
  greens.grow(group)
  blooms.grow(group)
  return group
}

/**
 * Les pièces d'une fleur de passiflore, à plat dans le plan xy, tournée vers +z (9 cm de large) : dix pétales pâles en étoile ; dessus, la
 * couronne de filaments violets, fins et rayonnants, autour d'un cœur sombre ; au centre, la colonne verte qui porte cinq étamines jaunes
 * en étoile et, plus haut, trois stigmates violets.
 */
const passionBloom = (): THREE.Mesh[] => {
  const flat = (color: number): THREE.Material => new THREE.MeshStandardMaterial({ color, roughness: 0.7, side: THREE.DoubleSide })
  const outline = (points: number, reach: (turn: number, index: number) => number): THREE.ShapeGeometry =>
    new THREE.ShapeGeometry(new THREE.Shape(Array.from({ length: points }, (_, index) => {
      const turn = (index / points) * Math.PI * 2
      return new THREE.Vector2(Math.cos(turn) * reach(turn, index), Math.sin(turn) * reach(turn, index))
    })))
  const at = (mesh: THREE.Mesh, x: number, y: number, z: number): THREE.Mesh => {
    mesh.position.set(x, y, z)
    return mesh
  }
  const petals = new THREE.Mesh(outline(80, (turn) => 0.012 + 0.034 * Math.abs(Math.cos(turn * 5)) ** 0.6), flat(0xe6def2))
  const corona = at(new THREE.Mesh(outline(96, (_, index) => (index % 2 === 0 ? 0.031 : 0.011)), flat(0x6d3fc4)), 0, 0, 0.004)
  const heart = at(new THREE.Mesh(outline(16, () => 0.012), flat(0x35195f)), 0, 0, 0.006)
  const green = new THREE.MeshStandardMaterial({ color: 0xb4c76a, roughness: 0.7 })
  const column = at(new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0045, 0.03, 8), green), 0, 0, 0.02)
  column.rotation.x = Math.PI / 2
  const yellow = new THREE.MeshStandardMaterial({ color: 0xe8cf4a, roughness: 0.7 })
  const purple = new THREE.MeshStandardMaterial({ color: 0x5a2a86, roughness: 0.6 })
  const stamens = Array.from({ length: 5 }, (_, index) => {
    const turn = (index / 5) * Math.PI * 2
    const stamen = at(new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.005, 0.003), yellow), Math.cos(turn) * 0.011, Math.sin(turn) * 0.011, 0.024)
    stamen.rotation.z = turn
    return stamen
  })
  const stigmas = Array.from({ length: 3 }, (_, index) => {
    const turn = (index / 3) * Math.PI * 2 + 0.5
    return at(new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), purple), Math.cos(turn) * 0.007, Math.sin(turn) * 0.007, 0.036)
  })
  return [petals, corona, heart, column, ...stamens, ...stigmas]
}

/**
 * La passiflore du grand bac : une tige courte sort de la terre et monte au pan de l'ouest, puis ce ne sont plus que des feuilles plates, palmées
 * à cinq doigts (un seul `InstancedMesh`), penchées en tous sens et plus ou moins décollées du grillage : serrées sur les pans grillagés
 * verticaux, surtout près du bac, sur les toits, des chemins de feuilles qui partent du haut des pans (sept sur le grillage, deux courts sur la tôle). Elles ne portent pas d'ombre.
 */
export const passionflower = (group: THREE.Group): void => {
  const { cageX1, cageX2, cageZ1, cageZ2, backX, turnZ } = SITE
  const step = PANEL
  const rand = seeded(43)
  // Les pans grillagés, mis bout à bout en une bande `u` (m) : le pan du fond de l'ouest (`turnZ`), le pan de l'ouest (`backX`), puis le grand
  // côté grillagé (`cageZ1`) ; `v` est la hauteur. Du côté du bac, dehors.
  const wide = step * 3 + cageX2 - backX
  const onWalls = (u: number, v: number): THREE.Vector3 => {
    if (u < step) return new THREE.Vector3(cageX1 + u, v, turnZ - 0.04)
    if (u < step * 3) return new THREE.Vector3(backX - 0.04, v, turnZ - (u - step))
    return new THREE.Vector3(backX + (u - step * 3), v, cageZ1 - 0.04)
  }
  // Là où la tige arrive sur le pan de l'ouest, au-dessus du bac.
  const foot = step * 3 - 0.45
  const wood = woodOf(faceted(0x5b6b2e, 0.95))
  wood.limb(new THREE.Vector3(backX - 0.3, 0.44, cageZ1 + 0.45), onWalls(foot, 0.85), 0.014, 0.011)
  wood.limb(onWalls(foot, 0.85), onWalls(foot + 0.06, 1.25), 0.011, 0.006)
  wood.grow(group)
  // Une feuille de passiflore : plate, palmée, à cinq doigts larges qui rayonnent du pétiole (son contour, en coordonnées polaires).
  const finger = (40 * Math.PI) / 180
  const points = 40
  const outline = Array.from({ length: points }, (_, index) => {
    const turn = (index / points) * Math.PI * 2 - Math.PI
    const lobe = Math.abs(turn) <= finger * 2.5 ? Math.abs(Math.cos((Math.PI * turn) / finger)) ** 1.1 : 0
    const reach = 0.02 + 0.08 * lobe
    return new THREE.Vector2(Math.sin(turn) * reach, Math.cos(turn) * reach)
  })
  // Chaque feuille : sa place et l'axe du pan contre lequel elle est (x, y pour le toit, z).
  const spots: [THREE.Vector3, 'x' | 'y' | 'z'][] = []
  // Sur les pans verticaux : partout, mais de moins en moins en s'éloignant du bac. Elles ne sont pas toutes dans le même plan : plus ou moins décollées du grillage.
  for (let attempt = 0; attempt < 1500; attempt += 1) {
    const u = rand() * wide
    const v = 0.25 + rand() * (CAGE_HEIGHT - 0.3)
    if (rand() > 1.05 - (Math.abs(u - foot) / wide) * 0.9) continue
    const flat = u >= step && u < step * 3 ? 'x' : 'z'
    const out = rand() * 0.09
    spots.push([onWalls(u, v).add(new THREE.Vector3(flat === 'x' ? -out : 0, 0, flat === 'z' ? -out : 0)), flat])
  }
  // Sur les toits : des chemins de feuilles. Chacun part du haut d'un pan et serpente sur le dessus, une feuille tous les 6 cm environ.
  const trail = (fromX: number, fromZ: number, heading: number, long: number, tin: boolean): void => {
    let [x, z, turn] = [fromX, fromZ, heading]
    for (let walked = 0; walked < long; walked += 0.06) {
      turn += (rand() - 0.5) * 0.5 - (turn - heading) * 0.15
      x += Math.cos(turn) * 0.06
      z += Math.sin(turn) * 0.06
      if (x < (tin ? cageX1 : backX) || x > cageX2 - 0.05 || z < cageZ1 || z > (tin ? cageZ2 : turnZ)) return
      const y = tin ? CAGE_HEIGHT + 0.1 - ((z - turnZ) / (cageZ2 - turnZ)) * (CAGE_HEIGHT - CAGE_LOW) : CAGE_HEIGHT + 0.04
      spots.push([new THREE.Vector3(x + (rand() - 0.5) * 0.08, y + rand() * 0.05, z + (rand() - 0.5) * 0.08), 'y'])
    }
  }
  // Le toit grillagé : quatre chemins montent du pan de l'ouest, trois du grand côté grillagé.
  for (let index = 0; index < 4; index += 1) trail(backX, cageZ1 + 0.15 + rand() * (turnZ - cageZ1 - 0.3), 0, 1 + rand() * 1.5, false)
  for (let index = 0; index < 3; index += 1) trail(backX + 0.1 + rand() * step * 2, cageZ1, Math.PI / 2, 0.8 + rand() * 0.9, false)
  // La tôle : deux chemins courts, depuis le pan du fond de l'ouest.
  for (let index = 0; index < 2; index += 1) trail(cageX1 + 0.1 + rand() * (step - 0.2), turnZ, Math.PI / 2, 0.5 + rand() * 0.6, true)
  const leaves = new THREE.InstancedMesh(new THREE.ShapeGeometry(new THREE.Shape(outline)), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide }), spots.length)
  const dummy = new THREE.Object3D()
  const tint = new THREE.Color()
  spots.forEach(([at, flat], index) => {
    const size = 0.7 + rand() * 0.8
    // La feuille tourne dans son plan (au hasard), se couche contre son pan, puis penche franchement d'un côté ou de l'autre.
    const [tiltX, tiltY] = [(rand() - 0.5) * 1.3, (rand() - 0.5) * 1.3]
    dummy.position.copy(at)
    dummy.rotation.set(flat === 'y' ? -Math.PI / 2 + tiltX : tiltX, flat === 'x' ? Math.PI / 2 + tiltY : tiltY, rand() * Math.PI * 2)
    dummy.scale.set(size, size, size)
    dummy.updateMatrix()
    leaves.setMatrixAt(index, dummy.matrix)
    leaves.setColorAt(index, tint.setHSL(0.3 + rand() * 0.05, 0.45 + rand() * 0.15, 0.13 + rand() * 0.09))
  })
  group.add(noShadow(leaves))
  // Une dizaine de fleurs, sur les pans près du bac, devant les feuilles, tournées vers le dehors.
  const parts = passionBloom()
  for (let bloom = 0; bloom < 10; bloom += 1) {
    const u = Math.max(0.1, Math.min(wide - 0.1, foot + (rand() - 0.5) * 3.4))
    const flat = u >= step && u < step * 3 ? 'x' : 'z'
    const flower = new THREE.Group()
    for (const part of parts) flower.add(part.clone())
    flower.position.copy(onWalls(u, 0.6 + rand() * (CAGE_HEIGHT - 0.8))).add(new THREE.Vector3(flat === 'x' ? -0.1 : 0, 0, flat === 'z' ? -0.1 : 0))
    flower.rotation.set((rand() - 0.5) * 0.5, (flat === 'x' ? -Math.PI / 2 : Math.PI) + (rand() - 0.5) * 0.5, rand() * Math.PI * 2, 'YXZ')
    group.add(flower)
  }
}

/**
 * Une haie de spirées le long d'une ligne du plan : un bloc vert au cœur, et autour une masse très dense de rameaux. Chaque rameau part du pied, monte haut,
 * s'arque et retombe ; la plupart retombent du côté du jardin (vers le centre du terrain), quelques-uns de l'autre. Tout du long, de
 * petits amas de feuilles et des bouquets de fleurs blanches, plus serrés sur la retombée. `sink` : de combien le pied est sous le niveau
 * du terrain (là où le jardin est plus bas). Deux maillages par ligne (feuilles, fleurs), plus le bloc de chaque tronçon. Seul le bloc porte une ombre, pas les bouquets. `leafy` faux : le bloc seul. `ivy` : c'est en fait du lierre (le tronçon du portail du garage au cerisier) : pas de fleurs blanches, et un vert bien plus foncé. `spread` : de combien les rameaux avancent sur le terrain (1 : comme d'habitude). `toGround` : ils retombent jusqu'à terre.
 */
export const spireaHedge = (points: PlanPoint[], height: number, sink: number, seed: number, leafy = true, ivy = false, spread = 1, toGround = false): THREE.Group => {
  const group = new THREE.Group()
  const rand = seeded(seed)
  const heart = new THREE.Vector3(gardenX(LOT.centerY), 0, gardenZ(LOT.centerX))
  const core = faceted(ivy ? 0x1f4524 : 0x3f7a3a, 1)
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
    const body = box(ivy ? 0.56 : 0.6, block + sink, long + 0.3, core, (from.x + to.x) / 2, (block - sink) / 2, (from.z + to.z) / 2)
    body.rotation.y = Math.atan2(to.x - from.x, to.z - from.z)
    group.add(body)
    // Sur ce bloc, la haie est la plus dense : de gros bouquets de feuilles posés sur ses flancs et son dessus, et des fleurs parmi eux.
    for (let clump = 0; clump < long * (toGround ? 40 : 70); clump += 1) {
      const at = from.clone().lerp(to, rand())
      const onTop = rand() < 0.35
      const side = onTop ? (rand() - 0.5) * 0.6 : (rand() < 0.5 ? -1 : 1) * (0.3 + rand() * 0.08)
      const y = onTop ? block + rand() * 0.12 : rand() * block
      // La face de la haie côté dehors (hors de la propriété) n'a ni bouquet ni fleur : ils ne sont que côté jardin.
      if (side < -0.05) continue
      at.addScaledVector(across, side)
      spots.push([at.x, y - sink, at.z, 0.11 + rand() * 0.08])
      if (!ivy && rand() < 0.45) blooms.push([at.x + (rand() - 0.5) * 0.1, y - sink + 0.08, at.z + (rand() - 0.5) * 0.1, 0.035 + rand() * 0.03])
    }
    // Retombant jusqu'à terre, la haie a moins de rameaux et moins de bouquets (plus gros là où elle descend sur l'herbe).
    const canes = Math.round(long * (toGround ? 10 : 16))
    for (let cane = 0; cane < canes; cane += 1) {
      const foot = from.clone().lerp(to, rand()).addScaledVector(across, (rand() - 0.5) * 0.4)
      // Trois rameaux sur quatre retombent vers le jardin, tout près du bloc (à moins d'un mètre) ; les autres de l'autre côté, encore plus près.
      const inward = rand() < 0.75
      // Les rameaux qui retombent de l'autre côté, hors de la propriété, ne sont pas dessinés.
      if (!inward) continue
      const reach = (0.5 + rand() * 0.5) * (0.8 + rand() * 0.4) * spread
      const tall = height * (0.8 + rand() * 0.4)
      const drop = toGround ? tall * rand() * 0.08 : tall * (0.3 + rand() * 0.3)
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
        if (toGround) {
          // En haut : peu de bouquets, petits ; là où le rameau descend sur l'herbe : les plus gros ; tout au bout, vers l'herbe : plus petits.
          if (t < 0.45 && rand() > 0.3) continue
          const big = t >= 0.45 && t < 0.85
          spots.push([at.x + jitter(), y - sink + jitter(), at.z + jitter(), big ? 0.11 + rand() * 0.07 : 0.045 + rand() * 0.03])
        } else spots.push([at.x + jitter(), y - sink + jitter(), at.z + jitter(), (0.05 + rand() * 0.045) * (inBlock ? 1.9 : 1)])
        // Les fleurs : en bouquets sur la moitié haute et la retombée.
        if (!ivy && t > 0.4 && rand() < 0.75) blooms.push([at.x + jitter(), y - sink + 0.04 + jitter(), at.z + jitter(), 0.03 + rand() * 0.03])
      }
    }
  })
  const dummy = new THREE.Object3D()
  // Ce qui dépasserait de la propriété (de l'autre côté de la limite) n'est pas dessiné.
  const scatter = (all: [number, number, number, number][], material: THREE.Material): THREE.InstancedMesh => {
    const places = all.filter(([x, , z]) => inLot(x, z))
    const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), material, places.length)
    places.forEach(([x, y, z, size], index) => {
      dummy.position.set(x, y, z)
      dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3)
      dummy.scale.set(size, size * 0.8, size)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    group.add(noShadow(mesh))
    return mesh
  }
  // Sur téléphone (`leafy` faux) il ne reste que le bloc vert : les feuilles et les fleurs font près de la moitié des triangles de la scène.
  if (leafy) {
    scatter(spots, faceted(ivy ? 0x28592d : 0x5c9a4a, 0.9))
    if (!ivy) scatter(blooms, faceted(0xf8f8f3, 0.7))
  }
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
  const wood = woodOf(faceted(0x7a6f62, 0.95))
  const { limb } = wood
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
  wood.grow(group)
  group.add(leaves, noShadow(clusters))
  return group
}

/**
 * Un buisson de cette hauteur, étiré sur cette longueur (le long de z) : une masse allongée de touffes de feuilles, pas très serrées (on
 * voit ses tiges au travers), sur une rangée de tiges ; avec `bloom`, il est piqué de fleurs de cette couleur, surtout en haut.
 * `seed` fixe le hasard.
 */
export const bush = (seed: number, height: number, long: number, bloom?: number): THREE.Group => {
  const group = new THREE.Group()
  const rand = seeded(seed)
  // Un maillage par vert pour les feuilles, un pour les tiges, un pour les fleurs.
  const greens = tuftsOf([0x3f7a38, 0x4a8a40, 0x356b31].map((color) => faceted(color, 0.85)))
  const wood = woodOf(faceted(0x4a3b30, 0.95))
  const { limb } = wood
  const wide = 0.42
  const stems = Math.max(5, Math.round(long * 4))
  for (let stem = 0; stem < stems; stem += 1) {
    const z = -long / 2 + 0.15 + (stem / (stems - 1)) * (long - 0.3)
    limb(new THREE.Vector3((rand() - 0.5) * 0.1, 0, z * 0.6), new THREE.Vector3((rand() - 0.5) * wide, height * (0.55 + rand() * 0.3), z + (rand() - 0.5) * 0.3), 0.02, 0.008)
  }
  const flowers = bloom === undefined ? null : tuftsOf([faceted(bloom, 0.7)])
  const tufts = Math.round(long * 42)
  for (let leaf = 0; leaf < tufts; leaf += 1) {
    const turn = rand() * Math.PI * 2
    const rise = rand()
    // La largeur de la masse à cette hauteur : étroite au pied, pleine à mi-hauteur, arrondie en haut.
    const reach = Math.sin(Math.PI * (0.12 + rise * 0.8)) * Math.sqrt(rand())
    const at = new THREE.Vector3(Math.cos(turn) * reach * wide, 0.12 + rise * (height - 0.2), Math.sin(turn) * reach * (long / 2))
    const size = 0.09 + rand() * 0.06
    greens.add(leaf % greens.tints, at, [rand() * 3, rand() * 3, rand() * 3], [size, size, size])
    if (flowers && rise > 0.35 && rand() < 0.45) {
      const big = 0.035 + rand() * 0.02
      flowers.add(0, new THREE.Vector3(at.x * 1.12, at.y + 0.08, at.z), [0, 0, 0], [big, big, big])
    }
  }
  wood.grow(group)
  greens.grow(group)
  flowers?.grow(group)
  return group
}

/**
 * Un massif de grandes fleurs, au pied d'un arbre : des tiges droites de cette hauteur à peu près, semées dans un rond de ce rayon, chacune
 * avec deux feuilles et, en haut, sa fleur de cette couleur. Trois maillages (tiges, feuilles, fleurs). `seed` fixe le hasard ; `keep` écarte les places où rien ne pousse.
 * Trop fin pour porter une ombre.
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
  group.add(noShadow(stems), noShadow(leaves), noShadow(blooms))
  return group
}

/**
 * L'arche en treillis de bois, au fond du jardin, en face de la fenêtre de la salle de bain, devant la bande de béton qui longe la haie du nord :
 * une arche carrée : deux côtés en échelle (deux montants, des barreaux, un croisillon) réunis par un dessus à plat, et une vigne qui y grimpe (un cep
 * qui s'enroule d'un pied à l'autre, des feuilles en touffes, plus serrées en haut, des grappes de raisin, des bouquets de feuilles par terre). `timber` : le bois de l'arche.
 */
export const vineArch = (group: THREE.Group, timber: THREE.Material): void => {
  const rand = seeded(131)
  const arch = { half: 0.6, deep: 0.2, legs: 2.1, stick: 0.016 }
  const x = gardenX(HEDGE.north) - HEDGE.thickness / 2 - 0.3 - arch.deep - 0.12
  const z = BATH_WINDOW.z
  const wood = woodOf(timber)
  // Un point de l'arche : `along` va de 0 (pied de gauche) à 1 (pied de droite) en passant par le cintre ; `side` : devant ou derrière.
  const legShare = arch.legs / (arch.legs * 2 + arch.half * 2)
  const on = (along: number, side: number): THREE.Vector3 => {
    if (along < legShare) return new THREE.Vector3(x + side * arch.deep, GRASS + (along / legShare) * arch.legs, z - arch.half)
    if (along > 1 - legShare) return new THREE.Vector3(x + side * arch.deep, GRASS + ((1 - along) / legShare) * arch.legs, z + arch.half)
    // Le dessus : à plat, d'un montant à l'autre (l'arche est carrée).
    return new THREE.Vector3(x + side * arch.deep, GRASS + arch.legs, z - arch.half + ((along - legShare) / (1 - legShare * 2)) * arch.half * 2)
  }
  const steps = 36
  for (let index = 0; index < steps; index += 1) {
    const [from, to] = [index / steps, (index + 1) / steps]
    for (const side of [-1, 1]) wood.limb(on(from, side), on(to, side), arch.stick, arch.stick)
    // Un barreau à chaque pas, et un croisillon un pas sur deux.
    wood.limb(on(to, -1), on(to, 1), arch.stick * 0.7, arch.stick * 0.7)
    if (index % 2 === 0) wood.limb(on(from, -1), on(to, 1), arch.stick * 0.6, arch.stick * 0.6)
  }
  wood.grow(group)
  // Le cep : il part du pied de gauche et s'enroule autour de l'arche jusqu'à l'autre pied.
  const vine = woodOf(faceted(0x5a4a3a, 0.95))
  const twist = (along: number): THREE.Vector3 => on(along, Math.sin(along * 22) * 0.9).add(new THREE.Vector3(0, 0, Math.cos(along * 22) * 0.03))
  for (let index = 0; index < 60; index += 1) vine.limb(twist(index / 62), twist((index + 1) / 62), 0.014 - index * 0.00015, 0.014 - (index + 1) * 0.00015)
  vine.grow(group)
  const leaves = tuftsOf([0x4f8f3a, 0x5c9e42, 0x3f7a34].map((color) => faceted(color, 0.85)))
  for (let leaf = 0; leaf < 90; leaf += 1) {
    // Plus de feuilles sur le cintre que sur les pieds.
    const along = 0.5 + (rand() - 0.5) * (rand() < 0.6 ? 0.5 : 0.96)
    const size = 0.07 + rand() * 0.06
    const at = on(along, (rand() - 0.5) * 2.4).add(new THREE.Vector3(0, (rand() - 0.3) * 0.12, (rand() - 0.5) * 0.14))
    leaves.add(leaf % leaves.tints, at, [rand() * 3, rand() * 3, rand() * 3], [size, size * 0.6, size])
  }
  leaves.grow(group)
  // Les grappes de raisin : des grains sombres serrés en cône, pendus sous le dessus et le haut des côtés.
  const grapes = tuftsOf([0x4a2a5e, 0x3a2350, 0x5b3470].map((color) => faceted(color, 0.5)), 1)
  for (let bunch = 0; bunch < 12; bunch += 1) {
    const top = on(0.28 + rand() * 0.44, (rand() - 0.5) * 1.6).add(new THREE.Vector3(0, -0.05, 0))
    for (let grain = 0; grain < 9; grain += 1) {
      const down = rand() * 0.14
      const wide = (0.14 - down) * 0.22
      grapes.add(grain % grapes.tints, top.clone().add(new THREE.Vector3((rand() - 0.5) * wide * 2, -down, (rand() - 0.5) * wide * 2)), [0, 0, 0], [0.017, 0.017, 0.017])
    }
  }
  for (const mesh of grapes.grow(group)) noShadow(mesh)
  // Par terre, autour de l'arche : des bouquets de feuilles, comme ceux de la vigne.
  const ground = tuftsOf([0x4f8f3a, 0x5c9e42, 0x3f7a34].map((color) => faceted(color, 0.85)))
  for (let leaf = 0; leaf < 45; leaf += 1) {
    const turn = rand() * Math.PI * 2
    const far = Math.sqrt(rand()) * 1.5
    const size = 0.07 + rand() * 0.06
    ground.add(leaf % ground.tints, new THREE.Vector3(x - 0.3 + Math.cos(turn) * far * 0.7, GRASS + size * 0.3, z + Math.sin(turn) * far), [rand() * 3, rand() * 3, rand() * 3], [size, size * 0.6, size])
  }
  for (const mesh of ground.grow(group)) noShadow(mesh)
}

/**
 * Un conifère jamais taillé, pris dans une haie qui court le long de z : un tronc nu jusqu'à 1 m, puis une masse de touffes sombres, à peine
 * plus étroite en haut, étirée le long de la haie ; au-dessus de `over` (m), des branches partent vers −x (par-dessus la cage) avec leurs touffes.
 * `tall` : sa hauteur (m). `mingle` : jusqu'où ses branches s'allongent le long de la haie, vers −z, pour se mêler à l'arbre voisin (m ; 0 : pas de voisin).
 */
export const wildConifer = (seed: number, tall: number, over: number, mingle = 0): THREE.Group => {
  const group = new THREE.Group()
  const rand = seeded(seed)
  const wood = woodOf(faceted(0x4a3a2c, 0.95))
  const lean = new THREE.Vector3((rand() - 0.5) * 0.2, tall * 0.95, (rand() - 0.5) * 0.3)
  wood.limb(new THREE.Vector3(0, 0, 0), lean, 0.07, 0.015)
  // Du plus sombre au plus clair : le cœur de l'arbre est plus foncé que son pourtour (`out` : de 0, au tronc, à 1, au bord).
  const greens = tuftsOf([0x1a3622, 0x234529, 0x2f5a35, 0x3f7040].map((color) => faceted(color, 0.95)))
  const tuft = (at: THREE.Vector3, size: number, out: number): void =>
    greens.add(Math.min(greens.tints - 1, Math.floor(out * 3 + rand())), at, [rand() * 3, rand() * 3, rand() * 3], [size, size * (0.7 + rand() * 0.5), size])
  const low = 1 / tall
  for (let index = 0; index < 85; index += 1) {
    const share = low + rand() * (1 - low)
    // Une masse presque droite : elle ne s'affine que sur son dernier tiers ; deux fois plus longue le long de la haie qu'en travers.
    const wide = (0.3 + rand() * 0.45) * Math.min(1, (1 - share) * 3 + 0.25)
    const turn = rand() * Math.PI * 2
    tuft(lean.clone().multiplyScalar(share).add(new THREE.Vector3(Math.cos(turn) * wide, (rand() - 0.5) * 0.15, Math.sin(turn) * wide * 2)), 0.2 + rand() * 0.14, wide / 0.75)
  }
  // Les branches qui passent par-dessus la cage : elles partent du tronc au-dessus de `over`, s'allongent vers −x en retombant un peu.
  for (let branch = 0; over < tall * 0.9 && branch < 7; branch += 1) {
    const from = lean.clone().multiplyScalar((over + 0.15 + rand() * (tall * 0.9 - over - 0.15)) / lean.y)
    const reach = 0.7 + rand() * 0.9
    const to = from.clone().add(new THREE.Vector3(-reach, -0.05 - rand() * 0.2, (rand() - 0.5) * 1.6))
    to.y = Math.max(over + 0.12, to.y)
    wood.limb(from, to, 0.025, 0.008)
    for (let index = 0; index < 5; index += 1) tuft(from.clone().lerp(to, 0.35 + index * 0.16).add(new THREE.Vector3(0, (rand() - 0.3) * 0.1, (rand() - 0.5) * 0.2)), 0.13 + rand() * 0.1, 0.4 + index * 0.15)
  }
  // Les branches qui vont se mêler au voisin : elles filent le long de la haie, garnies de touffes jusqu'au bout.
  for (let branch = 0; mingle > 0 && branch < 7; branch += 1) {
    const from = lean.clone().multiplyScalar(0.4 + rand() * 0.5)
    const to = from.clone().add(new THREE.Vector3((rand() - 0.5) * 0.6, (rand() - 0.4) * 0.5, -mingle * (0.75 + rand() * 0.4)))
    wood.limb(from, to, 0.025, 0.008)
    for (let index = 0; index < 7; index += 1) tuft(from.clone().lerp(to, 0.3 + index * 0.115).add(new THREE.Vector3((rand() - 0.5) * 0.25, (rand() - 0.5) * 0.25, 0)), 0.15 + rand() * 0.12, 0.4 + index * 0.1)
  }
  wood.grow(group)
  greens.grow(group)
  return group
}

/** Un arbre à feuilles claires pris dans une haie : un tronc nu, quelques branches qui s'écartent, et une couronne haute de touffes vert tendre. `tall` : sa hauteur (m). */
export const paleTree = (seed: number, tall: number): THREE.Group => {
  const group = new THREE.Group()
  const rand = seeded(seed)
  const wood = woodOf(faceted(0x6a5a48, 0.95))
  const top = new THREE.Vector3((rand() - 0.5) * 0.3, tall * 0.8, (rand() - 0.5) * 0.3)
  wood.limb(new THREE.Vector3(0, 0, 0), top, 0.06, 0.02)
  const greens = tuftsOf([0x8fc25a, 0xa3d16a, 0x7fb552, 0xb4d97c].map((color) => faceted(color, 0.85)))
  const heart = top.clone().multiplyScalar(0.8)
  for (let branch = 0; branch < 6; branch += 1) {
    const turn = (branch / 6) * Math.PI * 2 + rand()
    const from = top.clone().multiplyScalar(0.45 + rand() * 0.4)
    wood.limb(from, from.clone().add(new THREE.Vector3(Math.cos(turn) * 0.7, 0.4 + rand() * 0.5, Math.sin(turn) * 0.7)), 0.025, 0.008)
  }
  for (let tuft = 0; tuft < 60; tuft += 1) {
    // Une couronne en œuf : plus haute que large.
    const turn = rand() * Math.PI * 2
    const rise = (rand() - 0.5) * 2
    const wide = Math.sqrt(1 - rise * rise) * (0.5 + rand() * 0.5) * 0.95
    const size = 0.2 + rand() * 0.14
    greens.add(tuft % greens.tints, heart.clone().add(new THREE.Vector3(Math.cos(turn) * wide, rise * tall * 0.3, Math.sin(turn) * wide)), [rand() * 3, rand() * 3, rand() * 3], [size, size * 0.8, size])
  }
  wood.grow(group)
  greens.grow(group)
  return group
}

/**
 * Un romarin touffu : une touffe qui part de l'intérieur (un cœur dense, au pied) et file vers l'extérieur : une quinzaine de tiges ligneuses
 * rayonnent du centre, montent puis s'arquent vers le dehors, de plus en plus garnies de touffes d'aiguilles sombres vers le bout, où se
 * trouvent de petites fleurs bleu pâle.
 */
export const rosemary = (seed: number): THREE.Group => {
  const group = new THREE.Group()
  const rand = seeded(seed)
  const wood = woodOf(faceted(0x5b4a38, 0.95))
  const greens = tuftsOf([0x4a6b45, 0x3d5c3b, 0x56774a, 0x33503a].map((color) => faceted(color, 0.9)))
  const blue = tuftsOf([faceted(0x9db8e0, 0.7)], 1)
  // Le cœur : quelques touffes serrées au centre.
  for (let core = 0; core < 12; core += 1) {
    const turn = rand() * Math.PI * 2
    const wide = rand() * 0.18
    const size = 0.1 + rand() * 0.07
    greens.add(Math.floor(rand() * greens.tints), new THREE.Vector3(Math.cos(turn) * wide, 0.12 + rand() * 0.22, Math.sin(turn) * wide), [rand() * 3, rand() * 3, rand() * 3], [size, size * 1.1, size])
  }
  for (let stem = 0; stem < 15; stem += 1) {
    const turn = (stem / 15) * Math.PI * 2 + (rand() - 0.5) * 0.4
    const out = new THREE.Vector3(Math.cos(turn), 0, Math.sin(turn))
    const reach = 0.55 + rand() * 0.45
    const rise = 0.35 + rand() * 0.3
    let last = new THREE.Vector3(0, 0.03, 0)
    for (let step = 1; step <= 6; step += 1) {
      const t = step / 6
      // La tige monte vite puis s'arque : de plus en plus vers l'extérieur, de moins en moins vers le haut.
      const at = out.clone().multiplyScalar(reach * t * t * 0.8 + reach * t * 0.2).setY(0.03 + rise * (1 - (1 - t) ** 2) * (1 - t * 0.25))
      wood.limb(last, at, 0.014 * (1 - t * 0.6), 0.014 * (1 - (t + 1 / 6) * 0.6))
      last = at
      // Les touffes se multiplient et grossissent vers le bout.
      for (let tuft = 0; tuft < (step >= 3 ? 2 : 1); tuft += 1) {
        const size = 0.07 + t * 0.06 + rand() * 0.03
        greens.add(Math.floor(rand() * greens.tints), at.clone().add(new THREE.Vector3((rand() - 0.5) * 0.1, (rand() - 0.3) * 0.08, (rand() - 0.5) * 0.1)), [rand() * 3, rand() * 3, rand() * 3], [size * 0.8, size * 1.15, size * 0.8])
      }
      if (step >= 5 && rand() < 0.7) blue.add(0, at.clone().add(new THREE.Vector3(0, 0.07, 0)), [0, 0, 0], [0.022, 0.022, 0.022])
    }
  }
  wood.grow(group)
  greens.grow(group)
  blue.grow(group)
  return group
}
