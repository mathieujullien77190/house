import * as THREE from 'three'
import { link } from '@/components/RemoteBox3D/helpers'
import { box, cylinder, drawEspBoard, drawEspPins, espPin, material, pinKey, textPlane } from '@/lib/esp32Board'
import { BANDS_330, BANDS_47, BREADBOARD, COLORS, holeX, RAIL_Z, ROW_Z, TOP, type Row } from './constants'
import type { SceneParts } from './types'

const hole = (column: number, row: Row): THREE.Vector3 => new THREE.Vector3(holeX(column), TOP, ROW_Z[row])
const rail = (column: number, kind: 'gnd' | 'plus'): THREE.Vector3 => new THREE.Vector3(holeX(column), TOP, RAIL_Z[kind])

/** Un fil métal plié : une patte qui entre dans un trou, monte, puis part vers la pièce. */
const lead = (points: THREE.Vector3[], radius = 0.3): THREE.Mesh => {
  const path = new THREE.CurvePath<THREE.Vector3>()
  for (let i = 0; i < points.length - 1; i++) path.add(new THREE.LineCurve3(points[i], points[i + 1]))
  return new THREE.Mesh(new THREE.TubeGeometry(path, points.length * 6, radius, 6, false), material(COLORS.lead, { metalness: 0.7, roughness: 0.35 }))
}

/** La plaque d'essai de 400 points : plateau, trous des rangées a à j, deux lignes d'alimentation, chiffres et lettres. */
const buildBoard = (root: THREE.Group, names: THREE.Group) => {
  const { x, width, depth, height } = BREADBOARD
  root.add(box(width, height, depth, COLORS.board, x, height / 2, 0))
  // La gorge du milieu, qui sépare les rangées a à e de f à j.
  root.add(box(width - 2, 0.3, 3, 0xcfcfc8, x, height + 0.05, 0))
  const holeMaterial = material(COLORS.hole)
  const rows = Object.keys(ROW_Z) as Row[]
  for (let column = 1; column <= 30; column++) {
    for (const row of rows) {
      for (const z of [ROW_Z[row], -ROW_Z[row]]) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 1.1), holeMaterial)
        mesh.position.set(holeX(column), TOP + 0.1, z)
        root.add(mesh)
      }
    }
  }
  // Les lignes d'alimentation du bas : GND (bleu, moins) au plus près des trous, 5V (rouge, plus) au bord.
  const length = 29 * 2.54 + 2
  root.add(box(length, 0.3, 0.7, COLORS.railMinus, x + 1.3, TOP + 0.15, RAIL_Z.gnd))
  root.add(box(length, 0.3, 0.7, COLORS.railPlus, x + 1.3, TOP + 0.15, RAIL_Z.plus))
  // Les chiffres des colonnes utilisées, les lettres des rangées, les lignes.
  for (const column of [5, 10, 11, 12, 16, 22]) names.add(textPlane(String(column), COLORS.label, 'center', holeX(column), 17.1, 4, 1.6, true, TOP + 0.3))
  for (const row of rows) names.add(textPlane(row, COLORS.label, 'right', holeX(1) - 2.5, ROW_Z[row], 3, 1.8, true, TOP + 0.3))
  names.add(textPlane('GND  −', '#3b82f6', 'right', holeX(1) - 2.5, RAIL_Z.gnd, 8, 1.8, true, TOP + 0.3))
  names.add(textPlane('5V  +', '#e5534b', 'right', holeX(1) - 2.5, RAIL_Z.plus, 8, 1.8, true, TOP + 0.3))
}

/** Une résistance couchée à plat entre deux trous : corps bleu clair, 5 bagues de couleur, pattes qui entrent dans les trous. */
const resistor = (root: THREE.Group, names: THREE.Group, from: [number, Row], to: [number, Row], bands: number[], label: string) => {
  const a = hole(...from)
  const b = hole(...to)
  const y = TOP + 3
  const mid = (a.x + b.x) / 2
  root.add(cylinder(1.15, 6.4, material(COLORS.resistor), mid, y, a.z, Math.PI / 2))
  const offsets = [-2.6, -1.8, -1, -0.2, 2.3]
  bands.forEach((color, index) => root.add(cylinder(1.22, 0.55, material(color), mid + offsets[index], y, a.z, Math.PI / 2)))
  root.add(lead([new THREE.Vector3(a.x, TOP - 3, a.z), new THREE.Vector3(a.x, y, a.z), new THREE.Vector3(mid - 3.2, y, a.z)]))
  root.add(lead([new THREE.Vector3(b.x, TOP - 3, b.z), new THREE.Vector3(b.x, y, b.z), new THREE.Vector3(mid + 3.2, y, b.z)]))
  names.add(textPlane(label, COLORS.label, 'center', mid, a.z - 4.2, 12, 2.2, true, TOP + 7))
}

/** Le transistor BC337 : boîtier noir à face plate vers le spectateur, trois pattes dans e10, e11 et e12 (C, B, E). */
const buildTransistor = (root: THREE.Group, names: THREE.Group) => {
  const row: Row = 'e'
  const columns: [number, string][] = [
    [10, 'C'],
    [11, 'B'],
    [12, 'E'],
  ]
  const centre = hole(11, row)
  root.add(cylinder(2.4, 4.6, material(COLORS.transistor), centre.x, TOP + 4.6, centre.z))
  // La face plate, tournée vers le spectateur (+z).
  root.add(box(4.5, 4.6, 0.3, COLORS.transistorFace, centre.x, TOP + 4.6, centre.z + 1.6))
  for (const [column, letter] of columns) {
    const p = hole(column, row)
    root.add(lead([new THREE.Vector3(p.x, TOP - 3, p.z), new THREE.Vector3(p.x, TOP + 2.4, p.z)]))
    names.add(textPlane(letter, COLORS.label, 'center', p.x, 0, 3, 2, true, TOP + 0.35))
  }
  names.add(textPlane('BC337 : face plate vers toi', COLORS.label, 'center', centre.x, -8.5, 20, 2.2, true, TOP + 7))
}

/** La LED infrarouge : dôme transparent, patte courte (−) en c10 et patte longue (+) en c16. */
const buildLed = (root: THREE.Group, names: THREE.Group) => {
  const cathode = hole(10, 'c')
  const anode = hole(16, 'c')
  const midX = (cathode.x + anode.x) / 2
  const ledMaterial = material(COLORS.led, { transparent: true, opacity: 0.75 })
  root.add(cylinder(3, 0.7, ledMaterial, midX, TOP + 4.6, cathode.z))
  root.add(cylinder(2.6, 5.5, ledMaterial, midX, TOP + 7.7, cathode.z))
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), ledMaterial)
  dome.position.set(midX, TOP + 10.45, cathode.z)
  root.add(dome)
  root.add(lead([new THREE.Vector3(cathode.x, TOP - 3, cathode.z), new THREE.Vector3(cathode.x, TOP + 2.5, cathode.z), new THREE.Vector3(midX - 1.3, TOP + 4.3, cathode.z)]))
  root.add(lead([new THREE.Vector3(anode.x, TOP - 3, anode.z), new THREE.Vector3(anode.x, TOP + 2.5, anode.z), new THREE.Vector3(midX + 1.3, TOP + 4.3, anode.z)]))
  names.add(textPlane('LED infrarouge', COLORS.label, 'center', midX, cathode.z + 7.2, 14, 2.2, true, TOP + 12))
  names.add(textPlane('patte courte −', '#3b82f6', 'center', cathode.x - 1, cathode.z + 4, 12, 1.8, true, TOP + 0.35))
  names.add(textPlane('patte longue +', '#e5534b', 'center', anode.x + 3, cathode.z + 4, 12, 1.8, true, TOP + 0.35))
}

/** Les fils : deux jumpers courts sur la plaque, et trois câbles Dupont de l'ESP32 à la plaque. */
const buildWires = (wires: THREE.Group) => {
  link(wires, hole(12, 'a'), rail(12, 'gnd'), COLORS.wireBlack, 6)
  link(wires, hole(22, 'a'), rail(22, 'plus'), COLORS.wireRed, 7)
  link(wires, espPin('L', 9), hole(5, 'a'), COLORS.g26, 16)
  link(wires, espPin('L', 13), rail(2, 'gnd'), COLORS.gnd, 12)
  link(wires, espPin('L', 18), rail(2, 'plus'), COLORS.v5, 18)
}

export const buildScene = (): SceneParts => {
  const root = new THREE.Group()
  const wires = new THREE.Group()
  const names = new THREE.Group()

  drawEspBoard(root)
  // Seules trois broches servent : G26, GND (celui de la colonne de gauche) et 5V ; leurs noms sont toujours là.
  drawEspPins(
    root,
    names,
    new Map([
      [pinKey('L', 9), '#e879a9'],
      [pinKey('L', 13), '#7d8791'],
      [pinKey('L', 18), '#ff7043'],
    ]),
  )
  buildBoard(root, names)
  buildTransistor(root, names)
  resistor(root, names, [5, 'd'], [11, 'd'], BANDS_330, 'R1 : 330 Ω')
  resistor(root, names, [16, 'b'], [22, 'b'], BANDS_47, 'R2 : 47 Ω')
  buildLed(root, names)
  buildWires(wires)

  const grid = new THREE.GridHelper(220, 22, 0x9aa3b2, 0x9aa3b2)
  grid.position.set(-50, -1.2, 4)
  const gridMaterial = grid.material as THREE.Material
  gridMaterial.transparent = true
  gridMaterial.opacity = 0.3
  root.add(grid)

  root.add(wires, names)
  return { root, wires, names }
}
