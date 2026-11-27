import * as THREE from 'three'
import { box, snowTop, standard, woodTexture } from '@/components/Kitchen3D/primitives'

/**
 * La pergola, d'après son modèle SketchUp (`pergolas.dae`, exporté en Collada et lu une fois ; il n'est pas dans le dépôt). Toutes les cotes
 * en viennent, en mètres. Dans son repère : x le long de sa longueur (son milieu à 0), y vers le haut (0 : le dessous des platines de ses
 * pieds), z en profondeur (0 : le bout des traverses d'un côté, `PERGOLA.deep` de l'autre).
 */
export const PERGOLA = {
  // Les six poteaux de 9 × 9 cm : trois le long de la longueur, sur deux rangs.
  posts: { along: [-2.39, 0, 2.39], rows: [0.565, 2.165], side: 0.09, tall: 2.31 },
  // Les traverses : des planches de 28 × 145 mm posées par paires, de part et d'autre de chaque poteau, sur toute la profondeur.
  ties: { along: [-2.437, -2.342, -0.047, 0.048, 2.343, 2.438], thick: 0.028, tall: 0.145 },
  // Les chevrons : sept planches de 27 × 145 mm sur toute la longueur (elles dépassent des poteaux aux deux bouts).
  rafters: { rows: [0.245, 0.518, 0.612, 0.885, 1.365, 1.845, 2.118], long: 5.106, thick: 0.027, tall: 0.145 },
  // Dix fils d'acier tendus en travers, au-dessus, pour les plantes grimpantes.
  wires: { along: [-2.045, -1.62, -1.195, -0.77, -0.345, 0.345, 0.77, 1.195, 1.62, 2.045], long: 2, at: 1.13 },
  // Les jambes de force, à 45° : 65 cm de long, leur milieu à 24 cm du poteau.
  brace: { long: 0.651, wide: 0.067, tall: 0.09, out: 0.243, height: 2.362 },
  deep: 2.21,
  // Le haut des planches du dessus, et la hauteur du pied en acier sous chaque poteau.
  top: 2.625,
  foot: 0.17,
}

/** De la façade au rang de poteaux de devant, une fois la pergola collée au mur (m) : c'est aussi la ligne du muret qui borde la terrasse. */
export const PERGOLA_FRONT = PERGOLA.deep - PERGOLA.posts.rows[0]

/** La pergola : six poteaux sur pieds d'acier, leurs chapeaux, les traverses par paires, les chevrons, les jambes de force et les fils. */
export const buildPergola = (): THREE.Group => {
  const group = new THREE.Group()
  const wood = standard(woodTexture(0xc9a273, 163), 0.8)
  const steel = standard(0x3a3d42, 0.5, 0.6)
  const { posts, ties, rafters, wires, brace, deep, foot } = PERGOLA
  const beamY = PERGOLA.top - rafters.tall / 2
  for (const x of posts.along) {
    for (const z of posts.rows) {
      // Le pied : une platine au sol, une tige, une platine sous le poteau ; puis le poteau et son chapeau.
      group.add(box(0.1, 0.005, 0.1, steel, x, 0.0025, z), box(0.02, 0.16, 0.02, steel, x, 0.085, z), box(0.07, 0.005, 0.07, steel, x, 0.1675, z))
      group.add(box(posts.side, posts.tall, posts.side, wood, x, foot + posts.tall / 2, z), box(0.067, 0.08, 0.067, wood, x, foot + posts.tall + 0.04, z))
      // Les jambes de force en profondeur : une de chaque côté du poteau, penchée vers le haut en s'éloignant de lui (là où la traverse continue).
      for (const side of [-1, 1]) {
        // Pas de jambe au-delà du bout des traverses.
        if (z + side * brace.out > deep - 0.1) continue
        const strut = box(brace.wide, brace.tall, brace.long, wood, x, brace.height, z + side * brace.out)
        strut.rotation.x = (-Math.PI / 4) * side
        group.add(strut)
      }
    }
  }
  // Les jambes de force dans la longueur : entre les poteaux d'un même rang, vers la travée.
  for (const z of posts.rows) {
    for (const [x, side] of [[posts.along[0], 1], [posts.along[1], -1], [posts.along[1], 1], [posts.along[2], -1]]) {
      const strut = box(brace.long, brace.tall, brace.wide, wood, x + side * brace.out, brace.height, z)
      strut.rotation.z = (Math.PI / 4) * side
      group.add(strut)
    }
  }
  // La neige tient sur le chant des traverses et des chevrons.
  for (const x of ties.along) group.add(snowTop(box(ties.thick, ties.tall, deep, wood, x, beamY, deep / 2)))
  for (const z of rafters.rows) group.add(snowTop(box(rafters.long, rafters.tall, rafters.thick, wood, 0, beamY, z)))
  for (const x of wires.along) group.add(box(0.006, 0.006, wires.long, steel, x, PERGOLA.top + 0.005, wires.at))
  return group
}
