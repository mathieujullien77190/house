import * as THREE from 'three'
import { drawServo, housing, wire, cssColor } from '@/components/ServoWiring3D/helpers'
import { SERVO } from '@/components/ServoWiring3D/constants'
import { box, cylinder, material, PIN_TOP, PITCH, textPlane } from '@/lib/esp32Board'
import { BOARD, CHARGER, COLORS, DUPONT, HEADER, PINS_LEFT, PINS_RIGHT, REFERENCE_PINS, SERVO_NAMES, SERVO_WIRE_X, SERVO_X, SERVO_Z, USB_X, WIRE_GROUPS, Y_SPLIT } from './constants'
import type { RowSide, SceneParts, WireLegendItem } from './types'

/** Les quatre groupes de fils, dans l'ordre de la légende. */
export const legendOf = (): WireLegendItem[] => WIRE_GROUPS.map((group) => ({ id: group.id, color: cssColor(group.color), pair: group.pair, where: group.where }))

/** Le bout de la broche de ce rang de cette rangée. */
export const pinAt = (side: RowSide, index: number): THREE.Vector3 => new THREE.Vector3(side === 'L' ? -HEADER.x : HEADER.x, PIN_TOP, HEADER.z0 + index * PITCH)

/** La couleur des broches utilisées, par nom. */
const usedColor = (side: RowSide, name: string): number | undefined => {
  if (side === 'R' && (name === '1' || name === '2')) return COLORS.signal
  if (side === 'L' && name === '5V') return COLORS.plus
  if (side === 'R' && name === 'GND') return COLORS.minus
  return undefined
}

const hex = (color: number) => cssColor(color)

/** La carte Freenove : circuit noir, module WROOM avec son antenne qui dépasse, caméra sur sa nappe orange, ports USB-C, boutons, LED et les deux rangées de broches. */
const buildBoard = (root: THREE.Group, pinNames: THREE.Group) => {
  const { width, length, thickness } = BOARD
  root.add(box(width, thickness, length, COLORS.board, 0, 0, 0))
  // Le module : sa partie métal, puis son antenne imprimée qui dépasse du bord du haut.
  root.add(box(18, 3.2, 19.5, COLORS.chip, 0, 2.4, -14.5))
  root.add(box(18, 1, 6, COLORS.antennaZone, 0, 1.3, -length / 2 - 0.5))
  root.add(textPlane('ESP32-S3', '#4a525c', 'center', 0, -19.5, 12, 2, true, 4.05))
  // La nappe orange part du connecteur FPC, monte sur le module et porte la caméra.
  root.add(box(14, 2, 3, COLORS.header, 0, 1.8, 2))
  root.add(box(8, 3, 0.3, COLORS.flex, 0, 3.4, 0.4))
  root.add(box(8, 0.3, 14, COLORS.flex, 0, 4.2, -6.7))
  root.add(box(8.5, 5, 8.5, COLORS.camera, 0, 7, -14))
  root.add(cylinder(2.8, 2, material(COLORS.lens, { metalness: 0.5, roughness: 0.2 }), 0, 10, -14))
  // Deux ports USB-C au bord du bas, deux boutons et trois LED.
  USB_X.forEach((x) => root.add(box(9, 3.2, 7.5, COLORS.usb, x, 2.4, length / 2 - 3.5)))
  root.add(box(3.6, 2, 3.6, COLORS.button, -8, 1.8, 16))
  root.add(box(3.6, 2, 3.6, COLORS.button, 8, 1.8, 16))
  root.add(box(1.4, 0.8, 1.4, COLORS.led.red, -3, 1.2, 12))
  root.add(box(1.4, 0.8, 1.4, COLORS.led.green, 0, 1.2, 12))
  root.add(box(1.4, 0.8, 1.4, COLORS.led.blue, 3, 1.2, 12))
  root.add(textPlane('Freenove ESP32-S3 WROOM CAM', COLORS.titleText, 'center', 0, -39, 36, 3, true, 0.3))

  // Les rangées de 20 broches : support noir, broches dorées, bouchon coloré et nom pour celles qui servent.
  const pinMaterial = material(COLORS.pin, { metalness: 0.7, roughness: 0.35 })
  for (const side of ['L', 'R'] as const) {
    const x = side === 'L' ? -HEADER.x : HEADER.x
    root.add(box(2.5, 2.5, HEADER.count * PITCH, COLORS.header, x, 2.05, HEADER.z0 + ((HEADER.count - 1) * PITCH) / 2))
    ;(side === 'L' ? PINS_LEFT : PINS_RIGHT).forEach((name, index) => {
      const p = pinAt(side, index)
      root.add(cylinder(0.32, 8, pinMaterial, p.x, 4.5, p.z))
      const color = usedColor(side, name)
      if (color !== undefined) root.add(box(2.2, 3, 2.2, color, p.x, 7, p.z))
      if (color === undefined && !REFERENCE_PINS.includes(name)) return
      const label = textPlane(name, color === undefined ? COLORS.mutedText : hex(color), side === 'L' ? 'right' : 'left', side === 'L' ? -19.6 : 19.6, p.z, 8, 2, color !== undefined)
      pinNames.add(label)
    })
  }
}

/** Les deux servos MF90, chacun avec ses trois fils terminés par un boîtier Dupont à 3 broches. */
const buildServos = (root: THREE.Group, wires: THREE.Group) => {
  SERVO_X.forEach((x, i) => {
    drawServo(root, x, SERVO_Z)
    root.add(textPlane(SERVO_NAMES[i], COLORS.titleText, 'center', x, SERVO_Z + 18, 28, 3, true, 0.3))
    const exitZ = SERVO_Z - SERVO.length / 2
    root.add(box(DUPONT.length, DUPONT.height, DUPONT.depth, COLORS.dupont, x, DUPONT.height / 2, DUPONT.z))
    const flying = [
      { dx: SERVO_WIRE_X.minus, color: COLORS.minus },
      { dx: SERVO_WIRE_X.plus, color: COLORS.plus },
      { dx: SERVO_WIRE_X.signal, color: COLORS.signal },
    ]
    for (const { dx, color } of flying) {
      const start = new THREE.Vector3(x + dx, 7, exitZ)
      const end = new THREE.Vector3(x + dx, DUPONT.height + 0.6, DUPONT.z + 1)
      wires.add(wire([start, new THREE.Vector3(x + dx, 5, (exitZ + DUPONT.z) / 2 + 4), end], color))
      wires.add(housing(start, color))
      root.add(box(2.2, 1.2, 2.2, color, x + dx, DUPONT.height + 0.6, DUPONT.z))
    }
  })
}

/** Le bout mâle d'un fil serti : une petite broche métal enfoncée dans le trou de la prise du servo, sur sa face tournée vers -z. */
const maleEnd = (wires: THREE.Group, x: number, color: number): THREE.Vector3 => {
  const hole = new THREE.Vector3(x, DUPONT.height / 2, DUPONT.z - DUPONT.depth / 2)
  wires.add(box(0.8, 0.8, 5, COLORS.pin, hole.x, hole.y, hole.z - 1.5))
  wires.add(box(2.2, 2.2, 3, color, hole.x, hole.y, hole.z - 5.5))
  return new THREE.Vector3(hole.x, hole.y, hole.z - 7)
}

/** Un fil serti d'une broche de la carte (femelle) à un trou de la prise d'un servo (mâle). */
const single = (wires: THREE.Group, from: THREE.Vector3, servoX: number, dx: number, color: number, arch: number) => {
  const end = maleEnd(wires, servoX + dx, color)
  wires.add(wire([from, from.clone().add(new THREE.Vector3(0, 8, 0)), new THREE.Vector3((from.x + end.x) / 2, arch, (from.z + end.z) / 2), end.clone().add(new THREE.Vector3(0, 5, -4)), end], color))
  wires.add(housing(from.clone().setY(from.y - 0.7), color))
}

/** Un câble en Y : une femelle sur la broche de la carte, un fil qui se sépare après 30 mm en deux, chacun terminé par un mâle dans la prise d'un servo. */
const yHarness = (wires: THREE.Group, from: THREE.Vector3, dx: number, color: number, arch: number) => {
  const split = new THREE.Vector3(from.x + Y_SPLIT, arch, from.z - 4)
  wires.add(wire([from, from.clone().add(new THREE.Vector3(0, 8, 0)), split], color))
  wires.add(housing(from.clone().setY(from.y - 0.7), color))
  SERVO_X.forEach((x, i) => {
    const end = maleEnd(wires, x + dx, color)
    wires.add(wire([split, new THREE.Vector3((split.x + end.x) / 2, arch - 4 + i * 3, 2 + i * 2), end.clone().add(new THREE.Vector3(0, 5, -4)), end], color))
  })
}

/** Les fils sertis : un par signal, et un Y pour le 5V et un Y pour le GND. */
const buildWires = (wires: THREE.Group) => {
  SERVO_X.forEach((x, i) => single(wires, pinAt('R', PINS_RIGHT.indexOf(String(i + 1))), x, SERVO_WIRE_X.signal, COLORS.signal, 24 + i * 8))
  yHarness(wires, pinAt('L', PINS_LEFT.indexOf('5V')), SERVO_WIRE_X.plus, COLORS.plus, 28)
  yHarness(wires, pinAt('R', PINS_RIGHT.indexOf('GND')), SERVO_WIRE_X.minus, COLORS.minus, 20)
}

/** Le chargeur USB-C blanc et son câble gris jusqu'au port de droite de la carte. */
const buildPower = (power: THREE.Group) => {
  const { x, z, width, height, depth } = CHARGER
  power.add(box(width, height, depth, COLORS.charger, x, height / 2, z))
  power.add(textPlane('Chargeur USB-C 5 V', COLORS.titleText, 'center', x, z + depth / 2 + 4, 30, 2.6, true, 0.3))
  power.add(textPlane('2 à 3 A · câble court et épais', COLORS.mutedText, 'center', x, z + depth / 2 + 8, 34, 2.2, false, 0.3))
  const portZ = BOARD.length / 2
  power.add(box(8, 2.8, 9, COLORS.plug, USB_X[1], 2.4, portZ + 3))
  const path = [new THREE.Vector3(USB_X[1], 2.4, portZ + 7), new THREE.Vector3(USB_X[1], 3, portZ + 20), new THREE.Vector3(x, 6, z - depth / 2 - 12), new THREE.Vector3(x, 8, z - depth / 2)]
  power.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), 32, 1.6, 8, false), material(COLORS.cable, { roughness: 0.8 })))
}

export const buildScene = (): SceneParts => {
  const root = new THREE.Group()
  const power = new THREE.Group()
  const wires = new THREE.Group()
  const pinNames = new THREE.Group()

  buildBoard(root, pinNames)
  buildServos(root, wires)
  buildWires(wires)
  buildPower(power)

  const grid = new THREE.GridHelper(320, 32, COLORS.grid, COLORS.grid)
  grid.position.set(60, -1.2, 35)
  const gridMaterial = grid.material as THREE.Material
  gridMaterial.transparent = true
  gridMaterial.opacity = 0.35
  root.add(grid)

  root.add(power, wires, pinNames)
  return { root, power, wires, pinNames }
}
