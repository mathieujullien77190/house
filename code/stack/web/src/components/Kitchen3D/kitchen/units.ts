import * as THREE from 'three'
import { CABINET, WORKTOP } from '@/components/Kitchen3D/constants'
import type { KitchenMaterials } from '@/components/Kitchen3D/materials'
import { box, standard } from '@/components/Kitchen3D/primitives'
import type { ModuleSpec } from '@/components/Kitchen3D/types'

/** Une poignée coquille en nickel brossé, devant la façade (z = 0) : une demi-coquille debout (porte) ou couchée (tiroir). */
const cupHandle = (materials: KitchenMaterials, horizontal: boolean, x: number, y: number): THREE.Group => {
  const group = new THREE.Group()
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.1, 16, 1, true, -Math.PI / 2, Math.PI), materials.nickel)
  if (horizontal) shell.rotation.z = Math.PI / 2
  shell.position.z = 0.002
  group.add(shell)
  group.position.set(x, y, 0)
  return group
}

/** Une façade à cadre (style shaker) : un fond en retrait de 6 mm et quatre bandes qui l'entourent, jusqu'à z = 0. */
const front = (materials: KitchenMaterials, width: number, height: number, x: number, y: number): THREE.Group => {
  const group = new THREE.Group()
  const { front: thickness, frame, relief } = CABINET
  const band = Math.min(frame, height / 4)
  group.add(box(width, height, thickness - relief, materials.door, 0, 0, -relief - (thickness - relief) / 2))
  for (const side of [-1, 1]) {
    group.add(box(width, band, thickness, materials.door, 0, (height / 2 - band / 2) * side, -thickness / 2))
    group.add(box(band, height - band * 2, thickness, materials.door, (width / 2 - band / 2) * side, 0, -thickness / 2))
  }
  group.position.set(x, y, 0)
  return group
}

/** Le range-bouteilles : un bloc blanc sans porte, ouvert vers l'allée, six casiers superposés avec une bouteille couchée dans chacun (le goulot vers l'allée). */
const wineRack = (materials: KitchenMaterials, width: number): THREE.Group => {
  const group = new THREE.Group()
  const { depth, plinth, body, gap } = CABINET
  const white = standard(0xf2f2ef, 0.6)
  group.add(box(width, plinth, depth - 0.07, materials.plinth, 0, plinth / 2, -0.05 - (depth - 0.07) / 2))
  // Les deux côtés, le fond, puis le dessous, les cinq tablettes et le dessus.
  for (const side of [-1, 1]) group.add(box(0.016, body, depth, white, side * ((width - gap) / 2 - 0.008), plinth + body / 2, -depth / 2))
  group.add(box(width - gap, body, 0.016, white, 0, plinth + body / 2, -depth + 0.008))
  const levels = 6
  const step = body / levels
  for (let level = 0; level <= levels; level += 1) group.add(box(width - gap, 0.012, depth, white, 0, plinth + Math.min(Math.max(level * step, 0.006), body - 0.006), -depth / 2))
  for (let level = 0; level < levels; level += 1) {
    const y = plinth + step * (level + 0.5) - 0.015
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.22, 14), materials.bottle)
    bottle.rotation.x = Math.PI / 2
    bottle.position.set(0, y, -0.27)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.03, 0.1, 12), materials.bottle)
    neck.rotation.x = Math.PI / 2
    neck.position.set(0, y, -0.11)
    group.add(bottle, neck)
  }
  return group
}

/** Le four encastré sous le plan : un tiroir bleu en bas, la porte en verre noir avec sa barre, le bandeau en inox et ses deux boutons. */
const oven = (materials: KitchenMaterials, width: number): THREE.Group => {
  const group = new THREE.Group()
  const { plinth, body, gap } = CABINET
  const faceWidth = width - gap
  const drawer = 0.13
  group.add(front(materials, faceWidth, drawer - gap, 0, plinth + drawer / 2))
  group.add(cupHandle(materials, true, 0, plinth + drawer / 2 + 0.01))
  const top = plinth + body
  const fascia = 0.06
  const doorHeight = top - plinth - drawer - fascia - 0.02
  const doorY = plinth + drawer + 0.01 + doorHeight / 2
  group.add(box(faceWidth, doorHeight, 0.02, materials.ovenGlass, 0, doorY, -0.01))
  group.add(box(faceWidth, fascia, 0.02, materials.steel, 0, top - fascia / 2 - 0.005, -0.01))
  group.add(box(faceWidth - 0.14, 0.012, 0.014, materials.steel, 0, doorY + doorHeight / 2 - 0.045, 0.012))
  for (const side of [-1, 1]) {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 16), materials.steel)
    knob.rotation.x = Math.PI / 2
    knob.position.set(0.16 * side, top - fascia / 2 - 0.005, 0.008)
    group.add(knob)
  }
  return group
}

/** Un caisson : le socle en retrait, le corps, puis sa façade. Le fond est à z = -profondeur, la façade à z = 0. */
export const cabinet = (materials: KitchenMaterials, spec: ModuleSpec, x: number): THREE.Group => {
  const { depth, plinth, plinthSetback, body, front: frontDepth, gap } = CABINET
  const { kind, width } = spec
  const group = new THREE.Group()
  group.position.x = x
  if (kind === 'wine') {
    group.add(wineRack(materials, width))
    return group
  }
  const plinthDepth = depth - plinthSetback - 0.02
  group.add(box(width - gap, plinth, plinthDepth, materials.plinth, 0, plinth / 2, -plinthSetback - plinthDepth / 2))
  // Sous l'évier, le corps est plus bas : le bloc blanc y descend.
  const carcass = kind === 'sink' ? body - 0.11 : body
  group.add(box(width - gap, carcass, depth - frontDepth, materials.carcass, 0, plinth + carcass / 2, -frontDepth - (depth - frontDepth) / 2))
  if (kind === 'oven') {
    group.add(oven(materials, width))
    return group
  }
  const faceWidth = width - gap
  if (kind === 'drawers') {
    const drawer = body / 3
    for (let index = 0; index < 3; index += 1) {
      const y = plinth + drawer * (index + 0.5)
      group.add(front(materials, faceWidth, drawer - gap, 0, y))
      group.add(cupHandle(materials, true, 0, y + drawer * 0.22))
    }
    return group
  }
  group.add(front(materials, faceWidth, body - gap, 0, plinth + body / 2))
  // Le lave-vaisselle a sa poignée en haut au milieu ; une porte l'a debout près du bord, en haut.
  if (kind === 'dishwasher') group.add(cupHandle(materials, true, 0, plinth + body - 0.07))
  else group.add(cupHandle(materials, false, faceWidth / 2 - 0.06, plinth + body - 0.12))
  return group
}

/** Un panneau de lambris bleu (lames verticales rainurées) sur le bout d'une file. */
export const endPanel = (materials: KitchenMaterials, x: number): THREE.Group => {
  const group = new THREE.Group()
  const height = CABINET.plinth + CABINET.body + WORKTOP.thickness
  group.position.x = x
  group.add(box(0.02, height - 0.04, CABINET.depth + 0.01, materials.door, 0.01, (height - 0.04) / 2 + 0.02, -CABINET.depth / 2))
  for (let line = 0; line < 7; line += 1) {
    group.add(box(0.004, height - 0.1, 0.003, materials.carcass, 0.02, (height - 0.04) / 2 + 0.02, -0.05 - line * 0.085))
  }
  return group
}
