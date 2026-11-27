import * as THREE from 'three'
import { faceted } from '@/components/Kitchen3D/materials'
import { seeded } from '@/components/Kitchen3D/primitives'
import { sprinkleOf, tuftOf, tuftsOf, woodOf } from './branches'

/**
 * Un laurier à facettes : une cépée de gros troncs gris-brun, bien espacés au pied, plutôt droits mais un peu tordus, nus en bas ; à
 * mi-hauteur chaque tronc se sépare en branches, l'une qui monte haut (jusqu'à 5-6 m), les autres plus vers les côtés. Rien ne retombe. Un feuillage persistant sombre, en
 * petites touffes nombreuses mais espacées : on voit le bois et le jour à travers. `seed` fixe le hasard.
 */
export const laurelBush = (seed: number): THREE.Group => {
  const group = new THREE.Group()
  const rand = seeded(seed)
  const wood = woodOf(faceted(0x77716a, 0.95))
  const { limb } = wood
  const crown = tuftsOf([0x2f5d2c, 0x386b33, 0x274f26].map((color) => faceted(color, 0.6)))
  const leaves = tuftOf(rand, crown, [0.8, 0.3])
  const tuft = (at: THREE.Vector3) => leaves(at, 0.13 + rand() * 0.08)
  // Des touffes espacées le long d'un tronçon (une tous les 30 cm environ), un peu écartées du bois.
  const along = sprinkleOf(rand, limb, tuft, 0.3, 0.5)
  // Les bouts de branches : les touffes du dessus s'y accrochent.
  const tips: THREE.Vector3[] = []
  const forks: THREE.Vector3[] = []
  const trunks = 7 + Math.floor(rand() * 2)
  for (let trunk = 0; trunk < trunks; trunk += 1) {
    const turn = (trunk / trunks) * Math.PI * 2 + (rand() - 0.5) * 0.7
    // Resserrés au pied, ils partent chacun un peu de son côté, à droite ou à gauche.
    const spread = 0.15 + rand() * 0.15
    const lean = 0.35 + rand() * 0.6
    // Presque tous s'ouvrent en bouquet vers le dehors ; deux partent au contraire vers le dedans et traversent le cœur de la cépée.
    const away = (trunk === 3 || trunk === 5 ? turn + Math.PI : turn) + (rand() - 0.5) * 1.6
    // Il se sépare bas : les branches feuillues partent d'à peine plus haut qu'un homme assis.
    const split = 1.3 + rand() * 0.7
    // Le tronc : trois tronçons presque d'aplomb, chaque nœud un peu décalé (il est tordu), jusqu'à l'endroit où il se sépare.
    const joints = [new THREE.Vector3(Math.cos(turn) * spread, 0, Math.sin(turn) * spread)]
    for (let step = 1; step <= 3; step += 1) {
      const drift = (lean * step) / 3
      joints.push(new THREE.Vector3(joints[0].x + Math.cos(away) * drift + (rand() - 0.5) * 0.22, (split * step) / 3, joints[0].z + Math.sin(away) * drift + (rand() - 0.5) * 0.22))
      limb(joints[step - 1], joints[step], 0.1 - (step - 1) * 0.015, 0.1 - step * 0.015)
    }
    const fork = joints[3]
    forks.push(fork)
    // Deux ou trois troncs se séparent dès le bas : un second tronc en sort, part de son côté et monte à part, avec ses propres branches.
    if (trunk < 3) {
      const base = joints[0].clone().lerp(joints[1], 0.4 + rand() * 0.3)
      const side = away + (rand() < 0.5 ? 1 : -1) * (0.9 + rand() * 0.7)
      const high = 1.7 + rand() * 0.8
      const stem = [base]
      for (let step = 1; step <= 3; step += 1) {
        const drift = (0.5 + rand() * 0.2) * step * 0.4
        stem.push(new THREE.Vector3(base.x + Math.cos(side) * drift + (rand() - 0.5) * 0.18, base.y + ((high - base.y) * step) / 3, base.z + Math.sin(side) * drift + (rand() - 0.5) * 0.18))
        limb(stem[step - 1], stem[step], 0.075 - (step - 1) * 0.015, 0.075 - step * 0.015)
      }
      forks.push(stem[3])
      for (const turnBy of [0, 1.9, -1.9]) {
        const way = side + turnBy + (rand() - 0.5) * 0.8
        const reach = turnBy === 0 ? 0.4 + rand() * 0.4 : 0.9 + rand() * 0.7
        const tip = new THREE.Vector3(stem[3].x + Math.cos(way) * reach, stem[3].y + (turnBy === 0 ? 2 + rand() * 0.9 : 0.5 + rand() * 0.6), stem[3].z + Math.sin(way) * reach)
        limb(stem[3], tip, 0.04, 0.012)
        along(stem[3], tip)
        tuft(tip)
        tips.push(tip)
      }
    }
    // Là, il se sépare en cinq : une branche qui continue de monter, haut, deux qui partent plus vers les côtés que vers le haut, et deux entre les deux (dont une vers le cœur de la cépée).
    // Chacune fait un coude, porte un rameau, et ne retombe pas.
    const arms: [number, number, number][] = [
      [turn + (rand() - 0.5) * 0.8, 0.3 + rand() * 0.5, 3.1 + rand() * 1.1],
      [turn + 0.7 + rand() * 0.8, 1.2 + rand() * 0.9, 0.7 + rand() * 0.8],
      [turn - 0.7 - rand() * 0.8, 1.2 + rand() * 0.9, 0.7 + rand() * 0.8],
      [turn + (rand() - 0.5) * 2.4, 0.7 + rand() * 0.8, 2.2 + rand() * 1],
      [turn + Math.PI + (rand() - 0.5) * 1.6, 0.8 + rand() * 0.8, 1.6 + rand() * 1],
    ]
    for (const [way, reach, rise] of arms) {
      const elbow = new THREE.Vector3(fork.x + Math.cos(way) * reach * 0.5 + (rand() - 0.5) * 0.2, fork.y + rise * 0.5, fork.z + Math.sin(way) * reach * 0.5 + (rand() - 0.5) * 0.2)
      const tip = new THREE.Vector3(fork.x + Math.cos(way) * reach, fork.y + rise, fork.z + Math.sin(way) * reach)
      limb(fork, elbow, 0.055, 0.035)
      limb(elbow, tip, 0.035, 0.012)
      along(fork.clone().lerp(elbow, 0.5), elbow)
      along(elbow, tip)
      tuft(tip)
      tips.push(tip)
      for (const side of [1, -1]) {
        const aside = way + side * (0.6 + rand() * 0.7)
        const from = side === 1 ? elbow : elbow.clone().lerp(tip, 0.5)
        const twig = new THREE.Vector3(from.x + Math.cos(aside) * (0.5 + rand() * 0.5), from.y + 0.2 + rand() * 0.5, from.z + Math.sin(aside) * (0.5 + rand() * 0.5))
        limb(from, twig, 0.025, 0.01)
        along(from, twig)
        tuft(twig)
        tips.push(twig)
      }
    }
  }
  // Au centre, un tronc de plus : il file droit (un peu tordu lui aussi) plus haut que tous les autres, avec des bouquets de feuilles sur
  // de courts rameaux tout le long de sa moitié haute, et un toupet au sommet.
  const leader = [new THREE.Vector3(0, 0, 0)]
  for (let step = 1; step <= 6; step += 1) {
    leader.push(new THREE.Vector3((rand() - 0.5) * 0.3, (6.9 * step) / 6, (rand() - 0.5) * 0.3))
    limb(leader[step - 1], leader[step], 0.09 - (step - 1) * 0.013, 0.09 - step * 0.013)
  }
  for (let step = 3; step <= 6; step += 1) {
    along(leader[step - 1], leader[step])
    for (let twig = 0; twig < 3; twig += 1) {
      const way = rand() * Math.PI * 2
      const from = leader[step - 1].clone().lerp(leader[step], rand())
      const reach = 0.5 + rand() * 0.6 - (step - 3) * 0.08
      const end = new THREE.Vector3(from.x + Math.cos(way) * reach, from.y + 0.25 + rand() * 0.4, from.z + Math.sin(way) * reach)
      limb(from, end, 0.022, 0.01)
      along(from, end)
      tuft(end)
    }
  }
  tuft(leader[6])
  tips.push(leader[6])
  // Vers le devant (le côté opposé à la cage, −z), des branches partent des fourches, s'allongent, puis retombent un peu.
  for (let front = 0; front < 7; front += 1) {
    const fork = forks[front % forks.length]
    const way = -Math.PI / 2 + (rand() - 0.5) * 1.5
    const reach = 1.2 + rand() * 0.9
    const start = fork.clone().add(new THREE.Vector3(0, rand() * 0.5, 0))
    const bend = new THREE.Vector3(start.x + Math.cos(way) * reach, start.y + 0.2 + rand() * 0.4, start.z + Math.sin(way) * reach)
    const hang = new THREE.Vector3(bend.x + Math.cos(way) * reach * 0.45, bend.y - 0.3 - rand() * 0.45, bend.z + Math.sin(way) * reach * 0.45)
    limb(start, bend, 0.04, 0.022)
    limb(bend, hang, 0.022, 0.01)
    along(start.clone().lerp(bend, 0.4), bend)
    along(bend, hang)
    tuft(hang)
  }
  // Le dessus : quelques touffes de plus autour des bouts de branches, chacune sur sa brindille.
  for (let fill = 0; fill < 45; fill += 1) {
    const tip = tips[Math.floor(rand() * tips.length)]
    const at = tip.clone().add(new THREE.Vector3((rand() - 0.5) * 0.9, (rand() - 0.3) * 0.7, (rand() - 0.5) * 0.9))
    limb(tip, at, 0.01, 0.005)
    tuft(at)
  }
  // Tout le bois fait un seul maillage, les touffes un par teinte.
  wood.grow(group)
  crown.grow(group)
  return group
}
