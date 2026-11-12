import * as THREE from 'three'
import { box, cylinder, drawEspBoard, drawEspPins, espName, espPin, material, pinKey, PIN_TOP, PITCH, textPlane } from '@/lib/esp32Board'
import { CC_NUMBERS, CC_ORIGIN, CC_PINS, COLORS, POWER, WIRES } from './constants'
import type { CcPin, SceneParts, WireLegendItem, WireSpec } from './types'

/** Couleur CSS d'une couleur three.js. */
export const cssColor = (hex: number): string => `#${hex.toString(16).padStart(6, '0')}`

const ccPin = (name: CcPin) => {
  const [col, row] = CC_PINS[name]
  return new THREE.Vector3(CC_ORIGIN.x + col * PITCH, PIN_TOP, CC_ORIGIN.z + row * PITCH)
}

const wireText = (wire: WireSpec) => wire.textColor ?? cssColor(wire.color)

/** Les fils, dans l'ordre de la légende. */
export const legendOf = (): WireLegendItem[] =>
  WIRES.map((wire) => ({
    id: wire.cc,
    color: cssColor(wire.color),
    pair: `${wire.cc} (broche ${CC_NUMBERS[wire.cc]})  →  ${espName(wire.side, wire.index)}`,
    where: wire.where,
  }))

const buildFrame = (root: THREE.Group) => {
  drawEspBoard(root)

  // Le module CC1101 : carte bleue, connecteur SMA et antenne.
  root.add(box(24, 1.6, 38, COLORS.ccBoard, 48, 0, -2))
  root.add(box(8, 2.2, 8, COLORS.chip, 53, 1.9, -2))
  root.add(cylinder(1.7, 6, material(COLORS.sma, { metalness: 0.5, roughness: 0.4 }), 62.6, 2.6, -2, Math.PI / 2))
  root.add(cylinder(1.1, 46, material(COLORS.rod), 66, 25, -2))
  root.add(box(5.2, 2.5, 10.4, COLORS.header, CC_ORIGIN.x + PITCH / 2, 2.05, CC_ORIGIN.z + 3.81))
  root.add(textPlane('CC1101', COLORS.titleText, 'center', 48, -26.5, 16, 3.5, true))
  root.add(textPlane('Antenne', COLORS.mutedText, 'center', 66, 5, 10, 2.5))
}

const buildPins = (root: THREE.Group, pinNames: THREE.Group) => {
  const pinMaterial = material(COLORS.pin, { metalness: 0.7, roughness: 0.35 })
  drawEspPins(root, pinNames, new Map(WIRES.map((wire) => [pinKey(wire.side, wire.index), wireText(wire)])))

  // Les broches du CC1101 : ses 8 noms sont des fils, donc toujours là.
  for (const wire of WIRES) {
    const p = ccPin(wire.cc)
    const left = CC_PINS[wire.cc][0] === 0
    root.add(cylinder(0.32, 8, pinMaterial, p.x, 4.5, p.z))
    root.add(textPlane(left ? `${wire.cc} ${CC_NUMBERS[wire.cc]}` : `${CC_NUMBERS[wire.cc]} ${wire.cc}`, wireText(wire), left ? 'right' : 'left', left ? CC_ORIGIN.x - 5.9 : CC_ORIGIN.x + PITCH + 5.9, p.z, 8, 2, true))
  }
}

/** Les fils : un tube en arche, avec un petit boîtier (le bout du câble Dupont) à chaque extrémité. */
const buildWires = (wires: THREE.Group) => {
  for (const wire of WIRES) {
    const a = ccPin(wire.cc)
    const b = espPin(wire.side, wire.index)
    const color = new THREE.Color(wire.color)
    const a1 = a.clone().setY(PIN_TOP + 3)
    const b1 = b.clone().setY(PIN_TOP + 3)
    const mid = a.clone().add(b).multiplyScalar(0.5).setY(PIN_TOP + wire.arch)
    const lift = new THREE.Vector3(0, 3, 0)
    const curve = new THREE.CatmullRomCurve3([a1, a1.clone().add(lift), mid, b1.clone().add(lift), b1], false, 'catmullrom', 0.4)
    wires.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.5, 8, false), material(wire.color, { roughness: 0.45 })))
    for (const end of [a, b]) {
      const housing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 6, 2.4), new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1 }))
      housing.position.set(end.x, PIN_TOP - 0.7, end.z)
      wires.add(housing)
    }
  }
}

/** Le courant : prise murale, chargeur USB, câble USB-C jusqu'à l'ESP32. Le CC1101 est alimenté par le fil VCC. */
const buildPower = (power: THREE.Group) => {
  const { chargerZ, chargerDepth, chargerSize, y, wallZ } = POWER
  const back = chargerZ + chargerDepth
  const wallFace = wallZ - 1.5

  // Le chargeur USB, avec son port côté ESP32 et deux broches côté mur.
  power.add(box(chargerSize, chargerSize, chargerDepth, COLORS.charger, 0, y, chargerZ + chargerDepth / 2))
  power.add(box(12, 6, 1.2, COLORS.chargerPort, 0, y, chargerZ - 0.2))
  const pinMaterial = material(COLORS.pin, { metalness: 0.7, roughness: 0.35 })
  for (const x of [-9.5, 9.5]) {
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, wallFace - back, 16), pinMaterial)
    pin.rotation.x = Math.PI / 2
    pin.position.set(x, y, (back + wallFace) / 2)
    power.add(pin)
  }

  // La prise murale, translucide pour ne pas cacher le reste.
  const wall = new THREE.Mesh(new THREE.BoxGeometry(70, 70, 3), material(COLORS.wall, { transparent: true, opacity: 0.4 }))
  wall.position.set(0, y, wallZ)
  power.add(wall)

  // Le câble USB-C et ses deux embouts.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 2.4, 36),
    new THREE.Vector3(0, 2.4, 39),
    new THREE.Vector3(0, 8, 41.5),
    new THREE.Vector3(0, y, chargerZ - 8),
  ])
  power.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 1.6, 8, false), material(COLORS.usbCable, { roughness: 0.8 })))
  power.add(box(10, 4.2, 10, COLORS.chargerPort, 0, 2.4, 31))
  power.add(box(11, 5, 10, COLORS.chargerPort, 0, y, chargerZ - 3))

  power.add(textPlane('Câble USB-C', COLORS.mutedText, 'right', -16, 40, 16, 2))
  power.add(textPlane('Chargeur USB 5 V', COLORS.titleText, 'right', -24, chargerZ + chargerDepth / 2, 16, 2, true))
  power.add(textPlane('Prise murale 230 V', COLORS.titleText, 'center', 0, wallZ + 7, 22, 2.5, true))
}

export const buildScene = (): SceneParts => {
  const root = new THREE.Group()
  const power = new THREE.Group()
  const wires = new THREE.Group()
  const pinNames = new THREE.Group()

  buildFrame(root)
  buildPins(root, pinNames)
  buildPower(power)
  buildWires(wires)

  const grid = new THREE.GridHelper(160, 16, COLORS.grid, COLORS.grid)
  grid.position.set(24, -1.2, 12)
  const gridMaterial = grid.material as THREE.Material
  gridMaterial.transparent = true
  gridMaterial.opacity = 0.35
  root.add(grid)

  root.add(power, wires, pinNames)
  return { root, power, wires, pinNames }
}
