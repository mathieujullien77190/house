import * as THREE from 'three'
import { euro } from '@/catalog'
import { box, cylinder, drawEspBoard, drawEspPins, espName, espPin, material, pinKey, PIN_TOP, textPlane } from '@/lib/esp32Board'
import { CHANNELS, COLORS, ESP_WIRES, HORN, PCA, PCA_HEADER, PURCHASES, PURCHASES_UNKNOWN_PRICE, SERVO, SERVO_ROW, SERVOS, SUPPLY, TERMINAL } from './constants'
import type { EspWireSpec, PurchaseRow, SceneParts, ServoLegendItem, ServoSpec, WireLegendItem } from './types'

/** Couleur CSS d'une couleur three.js. */
export const cssColor = (hex: number): string => `#${hex.toString(16).padStart(6, '0')}`

const textColor = (item: { color: number; textColor?: string }) => item.textColor ?? cssColor(item.color)

/** Les 4 fils de l'ESP32 à la carte, dans l'ordre de la légende. */
export const legendOf = (): WireLegendItem[] =>
  ESP_WIRES.map((spec) => ({
    id: spec.pca,
    color: cssColor(spec.color),
    pair: `${spec.pca} (carte)  →  ${espName(spec.side, spec.index)}`,
    where: `colonne de ${spec.side === 'L' ? 'gauche' : 'droite'} de l’ESP32, ${spec.index + 1}${spec.index === 0 ? 're' : 'e'} broche en partant du haut`,
  }))

/** Les 9 servos et le canal de la carte où chacun se branche (le rang du servo). */
export const servoLegendOf = (): ServoLegendItem[] =>
  SERVOS.map((servo, i) => ({
    id: `${servo.remote}-${servo.action}`,
    color: cssColor(servo.color),
    pair: `${servo.remote} · ${servo.action}`,
    where: `canal ${i} de la carte : marron côté GND, rouge au milieu, signal côté PWM`,
  }))

/** La liste d'achats prête à afficher, et le total des lignes dont le prix est relevé. */
export const purchasesOf = (): { rows: PurchaseRow[]; total: string } => ({
  rows: PURCHASES.map((item) => ({ id: item.id, label: item.label, note: item.note, price: item.price === undefined ? PURCHASES_UNKNOWN_PRICE : euro(item.price), url: item.url })),
  total: euro(PURCHASES.reduce((sum, item) => sum + (item.price ?? 0), 0)),
})

/** Où est le servo de ce rang : x de son centre, et z de son centre. */
export const servoAt = (i: number): { x: number; z: number } => ({ x: PCA.x + (i - 4) * SERVO_ROW.dx, z: SERVO_ROW.z })

/** Le x de ce canal de la carte (0 à 15) : groupes de 4 séparés d'un petit espace. */
export const channelX = (k: number): number => CHANNELS.x0 + k * 2.54 + Math.floor(k / 4) * CHANNELS.gap

/** Où est la broche de ce nom sur le connecteur de commande de la carte (le bout de la broche). */
const headerPin = (name: string): THREE.Vector3 => {
  const n = PCA_HEADER.names.indexOf(name)
  return new THREE.Vector3(PCA_HEADER.x, PIN_TOP, -6.35 + n * 2.54)
}

/** Un fil : un tube qui suit une courbe lisse par ces points. */
const wire = (points: THREE.Vector3[], color: number, radius = 0.5): THREE.Mesh =>
  new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4), 64, radius, 8, false), material(color, { roughness: 0.45 }))

/** Un petit boîtier de connecteur à un bout de fil. */
const housing = (at: THREE.Vector3, color: number): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3, 2.4), material(color))
  mesh.position.copy(at)
  return mesh
}

/** Le contour de la corne simple (le même que dans le modèle de la boîte) : deux arcs reliés par les tangentes, le moyeu en 0 et le bout à `tipAt` sur l'axe y de la forme. */
const hornShape = (): THREE.Shape => {
  const { hubR, tipR, tipAt } = HORN
  const beta = Math.acos((hubR - tipR) / tipAt)
  const points: THREE.Vector2[] = []
  const arc = (centre: number, radius: number, from: number, to: number, steps: number) => {
    for (let k = 0; k <= steps; k++) {
      const angle = from + ((to - from) * k) / steps
      // En x la largeur, en y la longueur : une fois la forme couchée, la corne pointe vers +z.
      points.push(new THREE.Vector2(radius * Math.sin(angle), centre + radius * Math.cos(angle)))
    }
  }
  arc(0, hubR, beta, 2 * Math.PI - beta, 24)
  arc(tipAt, tipR, -beta, beta, 12)
  return new THREE.Shape(points)
}

/** Un servo debout (Miuzei MF90), le grand côté vers z : corps, oreilles, embase, axe et corne noire, avec le nom de sa touche devant. */
const buildServo = (root: THREE.Group, servo: ServoSpec, i: number) => {
  const { x, z } = servoAt(i)
  const { length, width, height, earsLength, earsAt, earsThickness, shaftFromEnd, bossR, bossH, shaftR, shaftH } = SERVO
  root.add(box(width, height, length, COLORS.servo, x, height / 2, z))
  root.add(box(width, earsThickness, earsLength, COLORS.servo, x, earsAt + earsThickness / 2, z))
  const axisZ = z + length / 2 - shaftFromEnd
  root.add(cylinder(bossR, bossH, material(COLORS.boss), x, height + bossH / 2, axisZ))
  root.add(cylinder(shaftR, shaftH, material(COLORS.shaft, { metalness: 0.6, roughness: 0.4 }), x, height + bossH + shaftH / 2, axisZ))
  const horn = new THREE.Mesh(new THREE.ExtrudeGeometry(hornShape(), { depth: HORN.thickness, bevelEnabled: false }), material(COLORS.horn))
  horn.rotation.x = Math.PI / 2
  horn.position.set(x, height + bossH + 0.5 + HORN.thickness, axisZ)
  root.add(horn)
  root.add(textPlane(servo.action, COLORS.titleText, 'center', x, z + 26, 15, 2.2, true, 0.3))
  if (i % 3 === 0) root.add(textPlane(servo.remote, textColor(servo), 'center', x + SERVO_ROW.dx, z + 31, 20, 3, true, 0.3))
}

/** La carte PCA9685 : circuit bleu, condensateur, bornier vert, puce, connecteur de commande et 16 canaux de 3 broches (signal jaune, + rouge, GND noir). */
const buildPca = (root: THREE.Group, pinNames: THREE.Group, used: Map<string, string>) => {
  const left = PCA.x - PCA.length / 2
  root.add(box(PCA.length, 1.6, PCA.depth, COLORS.pcaBoard, PCA.x, 0, 0))
  root.add(cylinder(4, 11, material(COLORS.capacitor), left + 12, 6.8, -5.5))
  root.add(cylinder(4.05, 2, material(COLORS.capStripe), left + 12, 11, -5.5))
  root.add(box(7, 2, 7, COLORS.chip, left + 27, 1.8, -3))
  root.add(textPlane('PCA9685', COLORS.titleText, 'center', PCA.x, -17, 22, 3, true))
  root.add(textPlane('16 canaux · I2C', COLORS.mutedText, 'center', PCA.x, 18.5, 22, 2.2))

  // Le bornier vert de l'alimentation des servos, avec ses deux bornes.
  root.add(box(10.2, 9, 7.6, COLORS.terminal, TERMINAL.x, 5.8, TERMINAL.z))
  root.add(textPlane('+', '#b8352f', 'center', TERMINAL.plusX, TERMINAL.z + 7, 4, 3, true, 0.95))
  root.add(textPlane('−', COLORS.titleText, 'center', TERMINAL.minusX, TERMINAL.z + 7, 4, 3, true, 0.95))

  // Le connecteur de commande : 6 broches sur le petit côté tourné vers l'ESP32, leurs noms à côté.
  const pinMaterial = material(COLORS.pin, { metalness: 0.7, roughness: 0.35 })
  root.add(box(2.5, 2.5, 6 * 2.54, COLORS.header, PCA_HEADER.x, 2.05, 0))
  PCA_HEADER.names.forEach((name) => {
    const p = headerPin(name)
    root.add(cylinder(0.32, 8, pinMaterial, p.x, 4.5, p.z))
    const color = used.get(name)
    const label = textPlane(name, color ?? COLORS.mutedText, 'left', PCA_HEADER.x + 11, p.z, 8, 2, color !== undefined)
    if (color !== undefined) root.add(label)
    else pinNames.add(label)
  })

  // Les 16 canaux : le petit support noir, trois broches et leurs capuchons colorés ; le numéro des 9 canaux utilisés.
  const rows = [
    { z: CHANNELS.signalZ, color: COLORS.capYellow },
    { z: CHANNELS.plusZ, color: COLORS.capRed },
    { z: CHANNELS.minusZ, color: COLORS.capBlack },
  ]
  for (let k = 0; k < 16; k++) {
    const x = channelX(k)
    root.add(box(2.54, 2.5, 3 * 2.54, COLORS.header, x, 2.05, (CHANNELS.signalZ + CHANNELS.minusZ) / 2))
    for (const row of rows) {
      root.add(cylinder(0.32, 8, pinMaterial, x, 4.5, row.z))
      root.add(box(2, 2.4, 2, row.color, x, 6.9, row.z))
    }
    if (k < SERVOS.length) root.add(textPlane(String(k), COLORS.titleText, 'center', x, -0.2, 2.6, 1.8, true))
  }
  root.add(textPlane('signal', '#b8941a', 'left', channelX(15) + 4, CHANNELS.signalZ, 8, 2, false))
  root.add(textPlane('+ 5 V', '#b8352f', 'left', channelX(15) + 4, CHANNELS.plusZ, 8, 2, false))
  root.add(textPlane('GND', COLORS.mutedText, 'left', channelX(15) + 4, CHANNELS.minusZ, 8, 2, false))
}

/** Les fils : 4 de l'ESP32 au connecteur de commande de la carte, et 3 par servo (signal, rouge, marron) jusqu'aux trois broches de son canal. */
const buildWires = (wires: THREE.Group) => {
  for (const spec of ESP_WIRES as EspWireSpec[]) {
    const a = espPin(spec.side, spec.index)
    const b = headerPin(spec.pca)
    const lift = new THREE.Vector3(0, 8, 0)
    const mid = a.clone().add(b).multiplyScalar(0.5).setY(spec.arch)
    wires.add(wire([a, a.clone().add(lift), mid, b.clone().add(lift), b], spec.color))
    wires.add(housing(a.clone().setY(a.y - 0.7), spec.color), housing(b.clone().setY(b.y - 0.7), spec.color))
  }

  SERVOS.forEach((servo, i) => {
    const { x, z } = servoAt(i)
    const exitZ = z - SERVO.length / 2
    const pins = [
      { z: CHANNELS.signalZ, color: servo.color, offset: 2.6, height: 18 },
      { z: CHANNELS.plusZ, color: COLORS.plus, offset: 0, height: 20 },
      { z: CHANNELS.minusZ, color: COLORS.minus, offset: -2.6, height: 22 },
    ]
    for (const pin of pins) {
      const start = new THREE.Vector3(x + pin.offset, 7, exitZ)
      const end = new THREE.Vector3(channelX(i), PIN_TOP, pin.z)
      const mid = new THREE.Vector3((start.x + end.x) / 2, pin.height, (start.z + end.z) / 2)
      wires.add(wire([start, start.clone().add(new THREE.Vector3(0, 6, -4)), mid, end.clone().add(new THREE.Vector3(0, 6, 0)), end], pin.color))
      wires.add(housing(start, pin.color), housing(end.clone().setY(end.y - 0.7), pin.color))
    }
  })
}

/** Le courant des servos : le bloc 5 V, ses deux fils vers le bornier vert ; et le câble USB-C de l'ESP32. */
const buildPower = (power: THREE.Group) => {
  power.add(box(40, 16, 26, COLORS.supply, SUPPLY.x, 8, SUPPLY.z))
  power.add(textPlane('Alimentation 5 V', COLORS.titleText, 'center', SUPPLY.x, SUPPLY.z - 17, 26, 2.4, true, 0.3))
  power.add(textPlane('servos seulement · 2 A minimum', COLORS.mutedText, 'center', SUPPLY.x, SUPPLY.z + 18, 32, 2.2, false, 0.3))
  const out = (toX: number, fromZ: number, color: number, arch: number) =>
    power.add(
      wire(
        [
          new THREE.Vector3(SUPPLY.x - 20, 8, SUPPLY.z + fromZ),
          new THREE.Vector3(SUPPLY.x - 32, arch, SUPPLY.z + fromZ + 4),
          new THREE.Vector3(toX + 8, arch, TERMINAL.z - 6),
          new THREE.Vector3(toX, 12.5, TERMINAL.z),
        ],
        color,
        0.9,
      ),
    )
  out(TERMINAL.plusX, -5, COLORS.supplyPlus, 24)
  out(TERMINAL.minusX, 5, COLORS.supplyMinus, 20)

  // Le câble USB-C de l'ESP32, vers un chargeur hors du dessin.
  const cable = [new THREE.Vector3(0, 2.4, 36), new THREE.Vector3(0, 2.4, 40), new THREE.Vector3(0, 8, 44), new THREE.Vector3(0, 8, 64)]
  power.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cable), 32, 1.6, 8, false), material(COLORS.usbCable, { roughness: 0.8 })))
  power.add(box(10, 4.2, 10, COLORS.supplyMinus, 0, 2.4, 31))
  power.add(textPlane('USB-C : alimente l’ESP32', COLORS.mutedText, 'right', -8, 52, 20, 2.2, false, 0.3))
}

export const buildScene = (): SceneParts => {
  const root = new THREE.Group()
  const power = new THREE.Group()
  const wires = new THREE.Group()
  const pinNames = new THREE.Group()

  drawEspBoard(root)
  drawEspPins(root, pinNames, new Map(ESP_WIRES.map((spec) => [pinKey(spec.side, spec.index), textColor(spec)])))
  buildPca(root, pinNames, new Map(ESP_WIRES.map((spec) => [spec.pca, textColor(spec)])))
  SERVOS.forEach((servo, i) => buildServo(root, servo, i))
  buildPower(power)
  buildWires(wires)

  const grid = new THREE.GridHelper(320, 32, COLORS.grid, COLORS.grid)
  grid.position.set(80, -1.2, 20)
  const gridMaterial = grid.material as THREE.Material
  gridMaterial.transparent = true
  gridMaterial.opacity = 0.35
  root.add(grid)

  root.add(power, wires, pinNames)
  return { root, power, wires, pinNames }
}
