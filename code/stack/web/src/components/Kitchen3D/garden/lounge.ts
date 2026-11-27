import * as THREE from 'three'
import { box, facing, standard } from '@/components/Kitchen3D/primitives'
import { DECK } from './constants'
import { SITE } from './layout'

/** Un siège du salon de jardin, de tant de places : une caisse de résine tressée marron (assise, dossier, deux accoudoirs) et des coussins beiges, un d'assise et un de dossier par place. Il regarde vers +z. */
const seat = (places: number, brown: THREE.Material, beige: THREE.Material): THREE.Group => {
  const group = new THREE.Group()
  const place = 0.6
  const arm = 0.12
  const wide = places * place + arm * 2
  const deep = 0.78
  group.add(box(wide, 0.28, deep, brown, 0, 0.14, 0), box(wide, 0.62, 0.12, brown, 0, 0.31, -deep / 2 + 0.06))
  for (const side of [-1, 1]) group.add(box(arm, 0.56, deep, brown, side * (wide / 2 - arm / 2), 0.28, 0))
  for (let index = 0; index < places; index += 1) {
    const x = -((places - 1) * place) / 2 + index * place
    const back = box(place - 0.04, 0.4, 0.12, beige, x, 0.58, -deep / 2 + 0.2)
    back.rotation.x = -0.12
    group.add(box(place - 0.03, 0.12, deep - 0.2, beige, x, 0.34, 0.06), back)
  }
  return group
}

/**
 * Le salon de jardin, sur la terrasse en ipé : un canapé de trois places le dos à la cage (il regarde le jardin), une table
 * basse devant lui, et deux fauteuils face à face aux deux bouts de la table. Résine tressée marron, coussins beiges.
 */
export const lounge = (group: THREE.Group): void => {
  const { cageZ1, treeX } = SITE
  const brown = standard(0x4a3426, 0.9)
  const beige = standard(0xdccfb4, 0.95)
  const far = cageZ1 - 0.4 - DECK.long
  const set = new THREE.Group()
  set.position.set(treeX, DECK.top, far)
  // Le canapé tourne le dos à la cage (et au bac du laurier, juste derrière lui) : il regarde le jardin.
  const sofa = facing(seat(3, brown, beige), 0, -1)
  sofa.position.set(0, 0, 1.4)
  // La table basse : un plateau sur une caisse tressée, un peu en retrait.
  set.add(sofa, box(0.95, 0.04, 0.55, brown, 0, 0.38, 0.5), box(0.85, 0.36, 0.45, brown, 0, 0.18, 0.5))
  for (const side of [-1, 1]) {
    const chair = facing(seat(1, brown, beige), -side, 0)
    chair.position.set(side * 1.25, 0, 0.5)
    set.add(chair)
  }
  group.add(set)
}
