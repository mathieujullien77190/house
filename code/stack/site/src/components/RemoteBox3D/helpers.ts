import * as THREE from 'three'
import { buildFrame, buildPower, buildWires, ccPin, cssColor, legendOf as ccLegendOf, wireText } from '@/components/ShutterWiring3D/helpers'
import { CC_NUMBERS, CC_ORIGIN, CC_PINS, COLORS as SHUTTER_COLORS, WIRES } from '@/components/ShutterWiring3D/constants'
import type { SceneParts, WireLegendItem } from '@/components/ShutterWiring3D/types'
import { box, cylinder, drawEspPins, espPin, material, pinKey, PIN_TOP, PITCH, textPlane } from '@/lib/esp32Board'
import { BANDS_330, BANDS_47, COLORS, IR_WIRES, PERF } from './constants'

/** Le fil gris foncé est illisible en texte sur fond sombre : son nom est écrit en gris clair. */
const textOf = (color: number) => cssColor(color === COLORS.irMinus ? 0x7d8791 : color)

/** Les 8 fils du CC1101, puis les 3 de l'émetteur infrarouge. */
export const legendOf = (): WireLegendItem[] => [
  ...ccLegendOf(),
  ...IR_WIRES.map((wire) => ({ id: wire.id, color: cssColor(wire.color), pair: wire.pair, where: wire.where })),
]

/** Une position sur la plaque verte : x vers la droite (côté ESP32), z vers le spectateur, par rapport au centre de la plaque. */
const padAt = (lx: number, lz: number, y = 0.8): THREE.Vector3 => new THREE.Vector3(PERF.x + lx, y, PERF.z - 5 + lz)

/** Les pastilles de la plaque : l'embase de 3 broches (côté ESP32) et les pattes des pièces. */
const PADS = {
  g26: padAt(12, -10),
  gnd: padAt(12, 2),
  v5: padAt(12, 20),
  r1a: padAt(8, -10),
  base: padAt(-7.46, 2),
  collector: padAt(-10, 2),
  emitter: padAt(-4.92, 2),
  r1b: padAt(-7.46, -10),
  ledCathode: padAt(-10, 12),
  ledAnode: padAt(-2, 12),
  r2a: padAt(-2, 20),
  r2b: padAt(9, 20),
}

const headerPin = (id: string): THREE.Vector3 => {
  const p = id === 'ir5v' ? PADS.v5 : id === 'irgnd' ? PADS.gnd : PADS.g26
  return new THREE.Vector3(p.x, PIN_TOP, p.z)
}

/** Un fil à embouts Dupont : un tube en arche entre deux broches. */
export const link = (wires: THREE.Group, a: THREE.Vector3, b: THREE.Vector3, color: number, arch: number) => {
  const a1 = a.clone().setY(PIN_TOP + 3)
  const b1 = b.clone().setY(PIN_TOP + 3)
  const mid = a.clone().add(b).multiplyScalar(0.5).setY(PIN_TOP + arch)
  const lift = new THREE.Vector3(0, 3, 0)
  const curve = new THREE.CatmullRomCurve3([a1, a1.clone().add(lift), mid, b1.clone().add(lift), b1], false, 'catmullrom', 0.4)
  wires.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.5, 8, false), material(color, { roughness: 0.45 })))
  for (const end of [a, b]) {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 6, 2.4), new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1 }))
    housing.position.set(end.x, PIN_TOP - 0.7, end.z)
    wires.add(housing)
  }
}

/** Les broches de l'ESP32 (celles du CC1101 et celles de l'émetteur infrarouge, en couleur) et celles du CC1101 et de la plaque. */
const buildPins = (root: THREE.Group, pinNames: THREE.Group) => {
  const pinMaterial = material(SHUTTER_COLORS.pin, { metalness: 0.7, roughness: 0.35 })
  const used = new Map(WIRES.map((wire) => [pinKey(wire.side, wire.index), wireText(wire)]))
  for (const wire of IR_WIRES) used.set(pinKey(wire.side, wire.index), textOf(wire.color))
  drawEspPins(root, pinNames, used)

  // Les broches du CC1101 : ses 8 noms sont des fils, donc toujours là.
  for (const wire of WIRES) {
    const p = ccPin(wire.cc)
    const left = CC_PINS[wire.cc][0] === 0
    root.add(cylinder(0.32, 8, pinMaterial, p.x, 4.5, p.z))
    root.add(textPlane(left ? `${wire.cc} ${CC_NUMBERS[wire.cc]}` : `${CC_NUMBERS[wire.cc]} ${wire.cc}`, wireText(wire), left ? 'right' : 'left', left ? CC_ORIGIN.x - 5.9 : CC_ORIGIN.x + PITCH + 5.9, p.z, 8, 2, true))
  }

  // L'embase de la plaque infrarouge : trois broches nommées.
  for (const wire of IR_WIRES) {
    const p = headerPin(wire.id)
    root.add(cylinder(0.32, 8, pinMaterial, p.x, 4.5, p.z))
    root.add(textPlane(wire.name, textOf(wire.color), 'left', p.x + 5, p.z, 8, 2, true))
  }
}

/** Une piste de cuivre colorée, droite et horizontale ou verticale, entre deux pastilles. */
const track = (root: THREE.Group, a: THREE.Vector3, b: THREE.Vector3, color: number) => {
  const width = 1.1
  const dx = Math.abs(b.x - a.x)
  const dz = Math.abs(b.z - a.z)
  root.add(box(dx + width, 0.3, dz + width, color, (a.x + b.x) / 2, 0.95, (a.z + b.z) / 2))
}

const pad = (root: THREE.Group, p: THREE.Vector3) => root.add(cylinder(1.4, 0.35, material(COLORS.perfHole, { metalness: 0.6, roughness: 0.35 }), p.x, 0.98, p.z))

const RESISTOR_SCALE = 1.3

/** Une résistance couchée entre deux pastilles : corps bleu clair, 5 bagues de couleur lisibles, pattes jusqu'aux pastilles. */
const resistorOn = (root: THREE.Group, names: THREE.Group, a: THREE.Vector3, b: THREE.Vector3, bands: number[], label: string) => {
  const mid = (a.x + b.x) / 2
  const y = 3.6
  const length = 6.4 * RESISTOR_SCALE
  root.add(cylinder(1.15 * RESISTOR_SCALE, length, material(0x8fc7e8), mid, y, a.z, Math.PI / 2))
  const offsets = [-2.6, -1.8, -1, -0.2, 2.3]
  bands.forEach((color, index) => root.add(cylinder(1.22 * RESISTOR_SCALE, 0.6, material(color), mid + offsets[index] * RESISTOR_SCALE, y, a.z, Math.PI / 2)))
  const metal = material(SHUTTER_COLORS.pin, { metalness: 0.7, roughness: 0.35 })
  for (const [end, sign] of [[a, -1], [b, 1]] as const) {
    root.add(cylinder(0.3, y - 0.8, metal, end.x, 0.8 + (y - 0.8) / 2, end.z))
    const reach = Math.abs(end.x - mid) - length / 2
    root.add(cylinder(0.3, reach + 0.3, metal, end.x - sign * (reach / 2), y, end.z, Math.PI / 2))
  }
  names.add(textPlane(label, '#1b2230', 'center', mid, a.z - 4.5, 14, 2.4, true, y + 3))
}

/** Le transistor BC337 : boîtier noir à face plate vers le spectateur ; ses pattes C, B, E sont sur les pastilles. */
const transistorOn = (root: THREE.Group, names: THREE.Group) => {
  const centre = PADS.base
  root.add(cylinder(2.4, 4.6, material(0x1b1b1b), centre.x, 3.4, centre.z - 2))
  root.add(box(4.5, 4.6, 0.3, 0x4a4f57, centre.x, 3.4, centre.z - 2 + 1.6))
  const metal = material(SHUTTER_COLORS.pin, { metalness: 0.7, roughness: 0.35 })
  for (const [p, letter] of [[PADS.collector, 'C'], [PADS.base, 'B'], [PADS.emitter, 'E']] as const) {
    root.add(box(0.5, 2.6, 0.5, 0xc7ccd1, p.x, 1.6, p.z - 1))
    root.add(cylinder(0.3, 1.2, metal, p.x, 1.4, p.z))
    names.add(textPlane(letter, '#ffffff', 'center', p.x, p.z + 2.4, 3, 2, true, 1.3))
  }
  names.add(textPlane('BC337', '#ffffff', 'center', centre.x, centre.z - 7.2, 14, 2.2, true, 6))
}

/** La LED infrarouge : dôme transparent, patte courte (−) sur la pastille de gauche, patte longue (+) sur celle de droite. */
const ledOn = (root: THREE.Group, names: THREE.Group) => {
  const a = PADS.ledCathode
  const b = PADS.ledAnode
  const midX = (a.x + b.x) / 2
  const glass = material(0xcfd8e8, { transparent: true, opacity: 0.8 })
  root.add(cylinder(3, 0.7, glass, midX, 3.2, a.z))
  root.add(cylinder(2.6, 5.5, glass, midX, 6.3, a.z))
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), glass)
  dome.position.set(midX, 9.05, a.z)
  root.add(dome)
  const metal = material(SHUTTER_COLORS.pin, { metalness: 0.7, roughness: 0.35 })
  root.add(cylinder(0.3, 2.6, metal, a.x, 2.1, a.z))
  root.add(cylinder(0.3, 2.6, metal, b.x, 2.1, b.z))
  names.add(textPlane('LED infrarouge', '#1b2230', 'center', midX, a.z + 6, 16, 2.4, true, 12))
  names.add(textPlane('−', '#9db8ff', 'center', a.x, a.z + 2.8, 3, 2.2, true, 1.3))
  names.add(textPlane('+', '#ff9d94', 'center', b.x, b.z + 2.8, 3, 2.2, true, 1.3))
}

/** La plaque verte de l'émetteur infrarouge : pastilles, pistes colorées, transistor, deux résistances et LED. Une piste de même couleur relie ce qui est branché ensemble. */
const buildIrBoard = (root: THREE.Group, names: THREE.Group) => {
  const { x, z, width, depth } = PERF
  root.add(box(width, 1.6, depth, COLORS.perf, x, 0, z))
  const pink = COLORS.irSignal
  const grey = 0x9aa3ad
  const violet = 0xb58cf5
  const amber = 0xf2a93b
  const orange = COLORS.irPlus
  // Les pistes : G26 → R1 → base, émetteur → GND, collecteur → LED, LED → R2 → 5V.
  track(root, PADS.g26, PADS.r1a, pink)
  track(root, PADS.r1b, PADS.base, pink)
  track(root, PADS.emitter, PADS.gnd, grey)
  track(root, PADS.collector, PADS.ledCathode, violet)
  track(root, PADS.ledAnode, PADS.r2a, amber)
  track(root, PADS.r2b, PADS.v5, orange)
  for (const p of Object.values(PADS)) pad(root, p)
  root.add(box(2.5, 2.5, 22, SHUTTER_COLORS.header, PADS.g26.x, 2.05, (PADS.g26.z + PADS.v5.z) / 2))
  transistorOn(root, names)
  resistorOn(root, names, PADS.r1a, PADS.r1b, BANDS_330, 'R1 : 330 Ω')
  resistorOn(root, names, PADS.r2a, PADS.r2b, BANDS_47, 'R2 : 47 Ω')
  ledOn(root, names)
  // Ce que chaque piste transporte.
  names.add(textPlane('signal G26 (ESP32)', '#ff9fc8', 'center', x + 2, PADS.g26.z - 3.6, 22, 2.1, true, 1.3))
  names.add(textPlane('GND', '#cfd5da', 'center', PADS.gnd.x + 1.6, PADS.gnd.z + 3.2, 5, 2, true, 1.3))
  names.add(textPlane('5V', '#ffb089', 'center', PADS.v5.x + 1.6, PADS.v5.z + 3.2, 5, 2, true, 1.3))
  names.add(textPlane('Émetteur infrarouge', SHUTTER_COLORS.titleText, 'center', x, z + depth / 2 + 4, 26, 3.2, true))
}

/** Les trois fils de l'émetteur infrarouge : de la broche de l'ESP32 à l'embase de la plaque. */
const buildIrWires = (wires: THREE.Group) => {
  for (const wire of IR_WIRES) link(wires, espPin(wire.side, wire.index), headerPin(wire.id), wire.color, wire.arch)
}

export const buildScene = (): SceneParts => {
  const root = new THREE.Group()
  const power = new THREE.Group()
  const wires = new THREE.Group()
  const pinNames = new THREE.Group()

  // `buildFrame` dessine la carte ESP32 puis le module CC1101.
  buildFrame(root)
  buildIrBoard(root, pinNames)
  buildPins(root, pinNames)
  buildPower(power)
  buildWires(wires)
  buildIrWires(wires)

  const grid = new THREE.GridHelper(200, 20, SHUTTER_COLORS.grid, SHUTTER_COLORS.grid)
  grid.position.set(8, -1.2, 14)
  const gridMaterial = grid.material as THREE.Material
  gridMaterial.transparent = true
  gridMaterial.opacity = 0.35
  root.add(grid)

  root.add(power, wires, pinNames)
  return { root, power, wires, pinNames }
}
