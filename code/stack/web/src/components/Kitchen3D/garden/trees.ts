import * as THREE from 'three'
import { faceted } from '@/components/Kitchen3D/materials'
import { seeded } from '@/components/Kitchen3D/primitives'
import { berriesOf, blossomOf, fruitsOf, sprinkleOf, tuftOf, tuftsOf, woodOf } from './branches'

/**
 * Un cerisier à facettes (peu de polygones) : un tronc qui penche un peu, des branches maîtresses qui partent au hasard vers le haut et
 * le dehors, chacune avec ses rameaux et leurs brindilles, et beaucoup de petites touffes de feuilles au bout et le long du bois. `seed` fixe le hasard :
 * le même nombre donne le même arbre. Il est en fleurs (blanches) et porte ses cerises ; `apple` : c'est un pommier, aux fleurs rosées,
 * sans fruits. Les fleurs et les cerises ont leur propre tirage : la forme de l'arbre n'en dépend pas.
 */
/** Le tronc d'un cerisier, en deux tronçons qui ne sont pas d'aplomb : son genou et sa fourche (les quatre premiers tirages de l'arbre). */
const trunkOf = (rand: () => number): { knee: THREE.Vector3; fork: THREE.Vector3 } => {
  const knee = new THREE.Vector3((rand() - 0.5) * 0.2, 0.9, (rand() - 0.5) * 0.2)
  const fork = new THREE.Vector3(knee.x + (rand() - 0.5) * 0.25, 1.7, knee.z + (rand() - 0.5) * 0.25)
  return { knee, fork }
}

/** Le milieu du haut du tronc du cerisier de cette graine (entre le genou et la fourche), dans le repère de l'arbre : pour y accrocher quelque chose. */
export const cherryTrunk = (seed: number): THREE.Vector3 => {
  const { knee, fork } = trunkOf(seeded(seed))
  return knee.lerp(fork, 0.5)
}

export const cherryTree = (seed: number, apple = false): THREE.Group => {
  const group = new THREE.Group()
  const rand = seeded(seed)
  const greens = [0x4f8a3a, 0x5f9a44, 0x437a34].map((color) => faceted(color, 0.9))
  const wood = woodOf(faceted(0x5a3a2a, 0.95))
  const { limb } = wood
  // Une touffe de feuilles, un peu écrasée.
  const crown = tuftsOf(greens)
  const leaves = tuftOf(rand, crown, [0.75, 0.2])
  // La place et la taille de chaque touffe : les fleurs et les cerises s'y posent.
  const tufts: [THREE.Vector3, number][] = []
  const tuft = (at: THREE.Vector3, size: number) => {
    leaves(at, size)
    tufts.push([at.clone(), size])
    // Le pommier tire un nombre par touffe (autrefois : y pendre ou non une pomme) : sans ce tirage, sa forme changerait.
    if (apple) rand()
  }
  // Les touffes déjà posées : celles du cœur de la couronne s'accrochent à la plus proche.
  const nodes: THREE.Vector3[] = []
  // Quelques touffes le long d'un tronçon, un peu écartées du bois.
  const along = (from: THREE.Vector3, to: THREE.Vector3, tufts: number, size: number) => {
    for (let index = 0; index < tufts; index += 1) {
      // Chaque touffe tient au bois par une brindille.
      const base = from.clone().lerp(to, 0.35 + rand() * 0.65)
      const at = base.clone().add(new THREE.Vector3((rand() - 0.5) * 0.3, rand() * 0.2, (rand() - 0.5) * 0.3))
      limb(base, at, 0.008, 0.005)
      nodes.push(at)
      tuft(at, size * (0.8 + rand() * 0.4))
    }
  }
  // Le tronc, en deux tronçons qui ne sont pas d'aplomb.
  const { knee, fork } = trunkOf(rand)
  limb(new THREE.Vector3(0, 0, 0), knee, 0.16, 0.13)
  limb(knee, fork, 0.13, 0.11)
  // Les branches maîtresses : chacune part de la fourche (ou d'un peu plus bas) dans sa direction, monte, puis se divise en rameaux, qui
  // portent eux-mêmes des brindilles.
  const count = 8 + Math.floor(rand() * 3)
  for (let branch = 0; branch < count; branch += 1) {
    const turn = (branch / count) * Math.PI * 2 + (rand() - 0.5) * 1.1
    const reach = 0.8 + rand() * 0.8
    const start = fork.clone().lerp(knee, rand() * 0.45)
    const elbow = new THREE.Vector3(start.x + Math.cos(turn) * reach * 0.55, start.y + 0.35 + rand() * 0.5, start.z + Math.sin(turn) * reach * 0.55)
    const tip = new THREE.Vector3(start.x + Math.cos(turn + (rand() - 0.5) * 0.7) * reach * 1.3, elbow.y + 0.4 + rand() * 0.7, start.z + Math.sin(turn + (rand() - 0.5) * 0.7) * reach * 1.3)
    limb(start, elbow, 0.07, 0.05)
    limb(elbow, tip, 0.05, 0.02)
    tuft(tip, 0.2 + rand() * 0.08)
    along(elbow, tip, 3, 0.2)
    // Les branches ne font pas que monter : du bout (et parfois du coude) part une branche qui s'écarte encore puis retombe.
    for (const from of rand() < 0.5 ? [tip, elbow] : [tip]) {
      const out = turn + (rand() - 0.5) * 0.8
      const far = 0.35 + rand() * 0.4
      const bend = new THREE.Vector3(from.x + Math.cos(out) * far, from.y - 0.05 - rand() * 0.2, from.z + Math.sin(out) * far)
      const hang = new THREE.Vector3(bend.x + Math.cos(out) * far * 0.6, bend.y - 0.35 - rand() * 0.5, bend.z + Math.sin(out) * far * 0.6)
      limb(from, bend, 0.03, 0.02)
      limb(bend, hang, 0.02, 0.01)
      tuft(hang, 0.17 + rand() * 0.07)
      along(from, bend, 2, 0.17)
      along(bend, hang, 3, 0.17)
    }
    const twigs = 3 + Math.floor(rand() * 2)
    for (let twig = 0; twig < twigs; twig += 1) {
      const from = twig < 2 ? elbow : elbow.clone().lerp(tip, 0.3 + rand() * 0.5)
      const side = turn + (twig % 2 === 0 ? 1 : -1) * (0.6 + rand() * 0.8)
      const length = 0.4 + rand() * 0.5
      const end = new THREE.Vector3(from.x + Math.cos(side) * length, from.y + 0.2 + rand() * 0.45, from.z + Math.sin(side) * length)
      limb(from, end, 0.035, 0.015)
      tuft(end, 0.17 + rand() * 0.08)
      along(from, end, 2, 0.17)
      // Une brindille au bout du rameau.
      const sprig = new THREE.Vector3(end.x + (rand() - 0.5) * 0.5, end.y + 0.15 + rand() * 0.3, end.z + (rand() - 0.5) * 0.5)
      limb(from.clone().lerp(end, 0.6), sprig, 0.018, 0.01)
      tuft(sprig, 0.14 + rand() * 0.06)
    }
  }
  // Le sommet : une branche qui continue le tronc, et sa touffe.
  const top = new THREE.Vector3(fork.x + (rand() - 0.5) * 0.4, fork.y + 1.3 + rand() * 0.4, fork.z + (rand() - 0.5) * 0.4)
  limb(fork, top, 0.09, 0.03)
  tuft(top, 0.24)
  along(fork, top, 5, 0.2)
  // Le cœur et le dessus de la couronne sont les plus touffus : des branches courtes qui montent de la fourche, et un nuage de touffes
  // dans un dôme au-dessus d'elle, plus serré vers le haut.
  for (let inner = 0; inner < 6; inner += 1) {
    const turn = rand() * Math.PI * 2
    const spread = 0.2 + rand() * 0.5
    const end = new THREE.Vector3(fork.x + Math.cos(turn) * spread, fork.y + 0.8 + rand() * 0.8, fork.z + Math.sin(turn) * spread)
    limb(fork.clone().lerp(top, rand() * 0.4), end, 0.04, 0.015)
    tuft(end, 0.2 + rand() * 0.06)
    along(fork, end, 3, 0.19)
  }
  for (let fill = 0; fill < 70; fill += 1) {
    const turn = rand() * Math.PI * 2
    const rise = Math.sqrt(rand())
    const wide = (0.25 + rand() * 0.85) * (1.15 - rise * 0.75)
    const at = new THREE.Vector3(fork.x + Math.cos(turn) * wide, fork.y + 0.5 + rise * 1.45, fork.z + Math.sin(turn) * wide)
    const near = nodes.reduce((best, node) => (node.distanceTo(at) < best.distanceTo(at) ? node : best), nodes[0])
    limb(near, at, 0.01, 0.005)
    tuft(at, 0.17 + rand() * 0.09)
  }
  // Tout le bois fait un seul maillage, les touffes un par teinte.
  wood.grow(group)
  crown.grow(group)
  // L'arbre est en fleurs (blanches, rosées pour le pommier), et le cerisier porte ses cerises, par deux sous une touffe sur cinq.
  group.add(blossomOf(tufts, apple ? 0xffdbe6 : 0xfff3f7, seed + 5000, 3))
  if (!apple) {
    const pick = seeded(seed + 6000)
    const cherries = tufts.filter(() => pick() < 0.2).flatMap(([at, size]) => [-1, 1].map((side) => new THREE.Vector3(at.x + side * 0.022, at.y - size * 0.8 - 0.02, at.z + (pick() - 0.5) * 0.03)))
    group.add(berriesOf(cherries, 0.02, 0xb3122a))
  }
  return group
}

/**
 * Un prunus à feuillage bordeaux, à facettes : un tronc qui se sépare tôt en deux charpentières bien écartées, chacune avec son bouquet de
 * branches, et rien entre les deux. Un feuillage léger : de petites touffes espacées, chacune sur sa brindille. `seed` fixe le hasard.
 * Il n'a pas de fleurs.
 */
export const prunusTree = (seed: number): THREE.Group => {
  const group = new THREE.Group()
  const rand = seeded(seed)
  const wood = woodOf(faceted(0x3f2c2a, 0.95))
  const { limb } = wood
  const crown = tuftsOf([0x6b1f33, 0x7d2a3d, 0x561a2b].map((color) => faceted(color, 0.85)))
  const leaves = tuftOf(rand, crown)
  const tuft = (at: THREE.Vector3) => leaves(at, 0.14 + rand() * 0.08)
  // Des touffes espacées le long d'un tronçon (une tous les 25 cm environ), chacune au bout d'une brindille.
  const along = sprinkleOf(rand, limb, tuft, 0.25, 0.2)
  const fork = new THREE.Vector3((rand() - 0.5) * 0.15, 1.1, (rand() - 0.5) * 0.15)
  limb(new THREE.Vector3(0, 0, 0), fork, 0.14, 0.11)
  // Les deux charpentières partent à l'opposé l'une de l'autre ; chacune monte, puis s'ouvre en un bouquet de branches.
  const heading = rand() * Math.PI
  for (const side of [0, Math.PI]) {
    const way = heading + side + (rand() - 0.5) * 0.4
    const elbow = new THREE.Vector3(fork.x + Math.cos(way) * 0.75, fork.y + 0.9 + rand() * 0.3, fork.z + Math.sin(way) * 0.75)
    const head = new THREE.Vector3(fork.x + Math.cos(way) * 1.25, elbow.y + 0.8 + rand() * 0.3, fork.z + Math.sin(way) * 1.25)
    limb(fork, elbow, 0.09, 0.065)
    limb(elbow, head, 0.065, 0.04)
    for (let branch = 0; branch < 9; branch += 1) {
      const turn = way + (branch - 4) * 0.5 + (rand() - 0.5) * 0.5
      const reach = 0.7 + rand() * 0.6
      const start = elbow.clone().lerp(head, 0.3 + rand() * 0.7)
      const tip = new THREE.Vector3(start.x + Math.cos(turn) * reach, start.y + 0.4 + rand() * 0.8, start.z + Math.sin(turn) * reach)
      limb(start, tip, 0.035, 0.012)
      along(start.clone().lerp(tip, 0.3), tip)
      tuft(tip)
      // Un rameau de côté, feuillu lui aussi.
      const from = start.clone().lerp(tip, 0.5)
      const twig = new THREE.Vector3(from.x + (rand() - 0.5) * 0.9, from.y + 0.2 + rand() * 0.5, from.z + (rand() - 0.5) * 0.9)
      limb(from, twig, 0.018, 0.008)
      along(from, twig)
      tuft(twig)
    }
  }
  wood.grow(group)
  crown.grow(group)
  return group
}

/**
 * L'arbre du coin : il a pris la forme de l'angle où il pousse. Vu de dessus, sa masse est un triangle : deux flancs droits le long des
 * deux murets (l'angle droit à l'origine, un flanc vers −x, l'autre vers +z) et un grand côté en biais ; elle monte droit, touffue dès le
 * bas, et s'arrondit en haut. Des boules de feuilles sombres posées sans régularité, et des branches folles qui en sortent n'importe où.
 */
export const clippedTree = (seed: number): THREE.Group => {
  const clipped = new THREE.Group()
  const dark = [0x23472a, 0x2b5432, 0x1d3d24].map((color) => faceted(color, 0.9))
  const pick = seeded(seed)
  const shape = { leg: 1.5, tall: 3.3, foot: 0.2 }
  const wood = woodOf(faceted(0x4a3a2c, 0.95))
  const bough = wood.limb
  const mass = tuftsOf(dark)
  const ball = tuftOf(pick, mass)
  // Le tronc, au cœur du triangle.
  const heart = new THREE.Vector3(-shape.leg / 3, 0, shape.leg / 3)
  bough(heart, new THREE.Vector3(heart.x + (pick() - 0.5) * 0.15, shape.tall - 0.3, heart.z + (pick() - 0.5) * 0.15), 0.11, 0.03)
  // Un point du tour du triangle, à cette part de son périmètre (les deux flancs des murets, puis le biais).
  const rim = (share: number, leg: number): [number, number] => {
    const lap = share * (2 + Math.SQRT2)
    if (lap < 1) return [-lap * leg, 0]
    if (lap < 2) return [0, (lap - 1) * leg]
    const along = (lap - 2) / Math.SQRT2
    return [-leg * along, leg * (1 - along)]
  }
  const levels = 13
  for (let level = 0; level < levels; level += 1) {
    const share = level / (levels - 1)
    const y = shape.foot + share * (shape.tall - shape.foot)
    // Le tour de l'étage : plein jusqu'aux trois quarts de la hauteur, puis il se resserre vers le cœur (le haut s'arrondit).
    const shrink = share < 0.75 ? 1 : 1 - ((share - 0.75) / 0.25) ** 2 * 0.75
    const count = Math.round(20 * shrink) + 3
    const offset = pick()
    for (let index = 0; index < count; index += 1) {
      const [x, z] = rim((offset + index / count + (pick() - 0.5) * 0.04) % 1, shape.leg)
      const at = new THREE.Vector3(heart.x + (x - heart.x) * shrink + (pick() - 0.5) * 0.16, y + (pick() - 0.5) * 0.2, heart.z + (z - heart.z) * shrink + (pick() - 0.5) * 0.16)
      ball(at, 0.14 + pick() * 0.11)
    }
    // Quelques boules en dedans, pour que ce soit touffu.
    for (let fill = 0; fill < 4; fill += 1) {
      const [x, z] = rim(pick(), shape.leg * 0.55 * shrink)
      ball(new THREE.Vector3(heart.x * 0.45 + x, y + (pick() - 0.5) * 0.2, heart.z * 0.45 + z), 0.15 + pick() * 0.1)
    }
  }
  // Les branches folles : elles sortent de la masse dans n'importe quel sens (sauf à travers les murets), avec leurs touffes.
  for (let stray = 0; stray < 12; stray += 1) {
    const from = new THREE.Vector3(heart.x, 0.6 + pick() * (shape.tall - 0.9), heart.z)
    const turn = Math.PI * 0.55 + pick() * Math.PI * 0.9
    const reach = 0.9 + pick() * 0.9
    const tip = new THREE.Vector3(from.x + Math.cos(turn) * reach, from.y + (pick() - 0.3) * 0.9, from.z + Math.sin(turn) * reach)
    bough(from, tip, 0.03, 0.008)
    ball(tip, 0.11 + pick() * 0.07)
    ball(from.clone().lerp(tip, 0.75).add(new THREE.Vector3(0, 0.1, 0)), 0.1 + pick() * 0.06)
  }
  // Et deux ou trois qui montent au-dessus de la tête.
  for (let spike = 0; spike < 3; spike += 1) {
    const from = new THREE.Vector3(heart.x + (pick() - 0.5) * 0.4, shape.tall - 0.5, heart.z + (pick() - 0.5) * 0.4)
    const tip = new THREE.Vector3(from.x + (pick() - 0.5) * 0.5, shape.tall + 0.3 + pick() * 0.5, from.z + (pick() - 0.5) * 0.5)
    bough(from, tip, 0.025, 0.008)
    ball(tip, 0.1 + pick() * 0.06)
  }
  wood.grow(clipped)
  mass.grow(clipped)
  return clipped
}

/**
 * Un néflier, petit : un tronc court, puis des branches qui partent toutes vers le haut, en vase serré ; de grosses touffes de feuilles
 * sombres au bout et le long, et quelques nèfles orangées. `seed` fixe le hasard.
 */
export const medlarTree = (seed: number): THREE.Group => {
  const group = new THREE.Group()
  const rand = seeded(seed)
  const wood = woodOf(faceted(0x4a3b30, 0.95))
  const { limb } = wood
  const crown = tuftsOf([0x2f6131, 0x3a7038, 0x28552b].map((color) => faceted(color, 0.8)))
  const tuft = tuftOf(rand, crown)
  const fruits: THREE.Vector3[] = []
  const fork = new THREE.Vector3((rand() - 0.5) * 0.08, 0.55, (rand() - 0.5) * 0.08)
  limb(new THREE.Vector3(0, 0, 0), fork, 0.07, 0.055)
  const branches = 6
  for (let branch = 0; branch < branches; branch += 1) {
    const turn = (branch / branches) * Math.PI * 2 + (rand() - 0.5) * 0.7
    // Elles montent : peu d'écart, beaucoup de hauteur.
    const out = 0.25 + rand() * 0.25
    const mid = new THREE.Vector3(fork.x + Math.cos(turn) * out * 0.6, fork.y + 0.5 + rand() * 0.2, fork.z + Math.sin(turn) * out * 0.6)
    const tip = new THREE.Vector3(fork.x + Math.cos(turn) * out, mid.y + 0.5 + rand() * 0.4, fork.z + Math.sin(turn) * out)
    limb(fork, mid, 0.035, 0.025)
    limb(mid, tip, 0.025, 0.01)
    tuft(tip, 0.16 + rand() * 0.06)
    for (let leaf = 0; leaf < 3; leaf += 1) {
      const base = mid.clone().lerp(tip, rand())
      const at = base.clone().add(new THREE.Vector3((rand() - 0.5) * 0.3, rand() * 0.15, (rand() - 0.5) * 0.3))
      limb(base, at, 0.008, 0.005)
      tuft(at, 0.13 + rand() * 0.06)
      if (rand() < 0.35) fruits.push(new THREE.Vector3(at.x, at.y - 0.14, at.z))
    }
  }
  wood.grow(group)
  crown.grow(group)
  group.add(fruitsOf(fruits, 0.035, 0xe2a23a))
  return group
}
