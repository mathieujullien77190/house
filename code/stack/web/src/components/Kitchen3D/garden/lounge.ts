import * as THREE from 'three'
import { box, cylinder, facing, standard } from '@/components/Kitchen3D/primitives'
import { woodOf } from './branches'
import { DECK } from './constants'
import { SITE } from './layout'

/** Les matières du salon de jardin : le métal crème de l'ossature, la corde beige foncé, les lattes claires de la table, les coussins. */
interface LoungeMaterials {
  metal: THREE.Material
  rope: THREE.Material
  slat: THREE.Material
  cushion: THREE.Material
}

/** La hauteur de l'assise, du bout des accoudoirs (devant) et du dossier (m). */
const SEAT = { level: 0.3, arm: 0.5, back: 0.72, deep: 0.72, corner: 0.2 }

/**
 * Un siège du salon de jardin (d'après photo), de tant de places : une ossature de métal crème (quatre pieds ronds, une assise à lattes), et
 * autour un arceau gainé de corde qui part du haut des pieds de devant, monte le long des côtés et fait le dossier, les coins arrondis ; des
 * brins de corde serrés le relient à l'assise. Dessus, des coussins : un d'assise et un de dossier par place. Il regarde vers +z.
 */
const seat = (places: number, m: LoungeMaterials): THREE.Group => {
  const group = new THREE.Group()
  const place = 0.6
  const wide = places * place + 0.16
  const { level, arm, back, deep, corner } = SEAT
  const [halfWide, halfDeep] = [wide / 2, deep / 2]
  group.add(box(wide - 0.04, 0.025, deep - 0.04, m.metal, 0, level - 0.0125, 0))
  for (const side of [-1, 1]) {
    group.add(cylinder(0.02, 0.02, arm, m.metal, side * halfWide, arm / 2, halfDeep, 12), cylinder(0.02, 0.02, level, m.metal, side * (halfWide - 0.05), level / 2, -halfDeep + 0.05, 12))
  }
  // L'arceau, vu de dessus : le côté gauche de l'avant vers l'arrière, un quart de rond, le dos, un quart de rond, le côté droit. Il monte le
  // long des côtés, de la hauteur des accoudoirs à celle du dossier.
  const path: THREE.Vector3[] = []
  const sideLong = deep - corner
  const rise = (share: number): number => arm + (back - arm) * Math.min(1, share) ** 0.8
  const steps = { side: Math.ceil(sideLong / 0.05), corner: 6, back: Math.ceil((wide - corner * 2) / 0.05) }
  for (let index = 0; index < steps.side; index += 1) path.push(new THREE.Vector3(-halfWide, rise(index / steps.side), halfDeep - (index / steps.side) * sideLong))
  for (let index = 0; index < steps.corner; index += 1) {
    const turn = (index / steps.corner) * (Math.PI / 2)
    path.push(new THREE.Vector3(-halfWide + corner - Math.cos(turn) * corner, back, -halfDeep + corner - Math.sin(turn) * corner))
  }
  for (let index = 0; index <= steps.back; index += 1) path.push(new THREE.Vector3(-halfWide + corner + (index / steps.back) * (wide - corner * 2), back, -halfDeep))
  // L'autre moitié : le miroir de la première.
  const mirrored = path.slice(0, steps.side + steps.corner).reverse().map((point) => new THREE.Vector3(-point.x, point.y, point.z))
  path.push(...mirrored)
  const cord = woodOf(m.rope)
  path.slice(1).forEach((point, index) => {
    cord.limb(path[index], point, 0.022, 0.022)
    // Un brin de corde descend de l'arceau au bord de l'assise, un peu en dedans.
    cord.limb(point, new THREE.Vector3(point.x * 0.96, level, point.z * 0.96), 0.004, 0.004)
  })
  cord.grow(group)
  for (let index = 0; index < places; index += 1) {
    const x = -((places - 1) * place) / 2 + index * place
    const pillow = box(place - 0.04, 0.36, 0.12, m.cushion, x, level + 0.3, -halfDeep + 0.16)
    pillow.rotation.x = -0.14
    group.add(box(place - 0.03, 0.1, deep - 0.12, m.cushion, x, level + 0.05, 0.03), pillow)
  }
  return group
}

/** La table basse (d'après photo) : un plateau de lattes claires en travers, dans un cadre, sur quatre pieds ronds de métal crème posés aux coins, qui dépassent un peu du plateau. */
const table = (m: LoungeMaterials): THREE.Group => {
  const group = new THREE.Group()
  const top = { long: 1.1, wide: 0.6, tall: 0.4, slats: 16 }
  group.add(box(top.long, 0.02, top.wide, m.slat, 0, top.tall - 0.02, 0))
  const pitch = (top.long - 0.06) / top.slats
  for (let slat = 0; slat < top.slats; slat += 1) group.add(box(pitch - 0.007, 0.012, top.wide - 0.06, m.slat, -top.long / 2 + 0.03 + pitch * (slat + 0.5), top.tall - 0.004, 0))
  // Le cadre : un jonc autour des lattes.
  for (const side of [-1, 1]) {
    group.add(box(top.long, 0.014, 0.025, m.slat, 0, top.tall - 0.003, side * (top.wide / 2 - 0.0125)), box(0.025, 0.014, top.wide, m.slat, side * (top.long / 2 - 0.0125), top.tall - 0.003, 0))
    for (const end of [-1, 1]) group.add(cylinder(0.022, 0.022, top.tall + 0.03, m.metal, end * (top.long / 2 + 0.012), (top.tall + 0.03) / 2, side * (top.wide / 2 + 0.012), 12))
  }
  return group
}

/**
 * Le salon de jardin, sur la terrasse en ipé : un canapé de trois places le dos à la cage (il regarde le jardin), une table
 * basse devant lui, et deux fauteuils (le même siège, à une place) face à face aux deux bouts de la table. Métal crème, corde, coussins beiges.
 */
export const lounge = (group: THREE.Group): void => {
  const { cageZ1, treeX } = SITE
  const m: LoungeMaterials = { metal: standard(0xd8d3c4, 0.6, 0.2), rope: standard(0x9b7c5e, 0.95), slat: standard(0xb99b74, 0.8), cushion: standard(0xdccfb4, 0.95) }
  const far = cageZ1 - 0.4 - DECK.long
  const set = new THREE.Group()
  set.position.set(treeX, DECK.top, far)
  // Le canapé tourne le dos à la cage (et au bac du laurier, juste derrière lui) : il regarde le jardin.
  const sofa = facing(seat(3, m), 0, -1)
  sofa.position.set(0, 0, 1.4)
  const low = table(m)
  low.position.set(0, 0, 0.5)
  set.add(sofa, low)
  for (const side of [-1, 1]) {
    const chair = facing(seat(1, m), -side, 0)
    chair.position.set(side * 1.25, 0, 0.5)
    set.add(chair)
  }
  group.add(set)
}
