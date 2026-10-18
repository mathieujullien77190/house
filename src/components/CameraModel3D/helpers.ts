import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { BOARD, CAMERA, COLORS, GPIO, LABEL_CLASS, MODELS, PORTS, REOLINK, RIBBON } from './constants'
import type { CameraModelKind } from './types'

const material = (color: number, options: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...options })

const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  mesh.position.set(x, y, z)
  return mesh
}

/** Tube qui suit des points 3D (câbles). */
const cable = (points: [number, number, number][], radius: number, color: number) => {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 10, false), material(color, { roughness: 0.8 }))
}

const roundedRect = (w: number, h: number, r: number) => {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

/** Cylindre dont l'axe suit X, entre x0 et x1. */
const cylinderX = (radius: number, x0: number, x1: number, mat: THREE.Material, openEnded = false) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, x1 - x0, 40, 1, openEnded), mat)
  mesh.rotation.z = -Math.PI / 2
  mesh.position.x = (x0 + x1) / 2
  return mesh
}

/** Le Pi Zero 2 W : carte, puce, ports, connecteur caméra et pastilles GPIO. */
export const buildBoard = (): THREE.Group => {
  const g = new THREE.Group()
  const t = BOARD.t
  const metal = material(COLORS.metal, { metalness: 0.8, roughness: 0.35 })

  const pcbGeometry = new THREE.ExtrudeGeometry(roundedRect(BOARD.w, BOARD.d, BOARD.radius), { depth: t, bevelEnabled: false })
  pcbGeometry.rotateX(-Math.PI / 2)
  g.add(new THREE.Mesh(pcbGeometry, material(COLORS.pcb)))

  g.add(box(12, 1.6, 12, metal, 0, t + 0.8, -1))
  g.add(box(5, 1, 5, material(COLORS.chip), -12, t + 0.5, -6))
  g.add(box(15, 1.8, 11.5, metal, -30, t + 0.9, 0))
  g.add(box(11.2, 3.2, 7.6, metal, PORTS.hdmiX, t + 1.6, PORTS.edgeZ))
  g.add(box(7.6, 2.6, 5.6, metal, PORTS.usbX, t + 1.3, PORTS.edgeZ))
  g.add(box(7.6, 2.6, 5.6, metal, PORTS.powerX, t + 1.3, PORTS.edgeZ))
  g.add(box(3, 2.2, 17.5, material(COLORS.chip), 30.2, t + 1.1, 0))

  const gold = material(COLORS.gold, { metalness: 0.9, roughness: 0.3 })
  const pad = new THREE.CylinderGeometry(0.55, 0.55, 0.3, 8)
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < GPIO.cols; i++) {
      const mesh = new THREE.Mesh(pad, gold)
      mesh.position.set((i - (GPIO.cols - 1) / 2) * GPIO.pitch, t + 0.15, GPIO.z + row * GPIO.pitch)
      g.add(mesh)
    }
  }
  return g
}

/** Camera Module 3 NoIR : carte, bloc optique, objectif violacé et connecteur de nappe. */
export const buildCamera = (): THREE.Group => {
  const g = new THREE.Group()
  const front = CAMERA.t / 2
  g.add(box(CAMERA.w, CAMERA.h, CAMERA.t, material(COLORS.cameraPcb), 0, 0, 0))
  g.add(box(8.5, 8.5, 4, material(COLORS.lensBody), 0, 0, front + 2))

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(3.9, 3.9, 4, 28), material(COLORS.lensBody, { roughness: 0.4 }))
  barrel.rotation.x = Math.PI / 2
  barrel.position.z = front + 6
  g.add(barrel)

  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(2.9, 28),
    material(COLORS.lensGlass, { metalness: 0.9, roughness: 0.1, emissive: 0x1a0f33 }),
  )
  glass.position.z = front + 8.02
  g.add(glass)

  g.add(box(16, 2.4, 1.6, material(COLORS.chip), 0, -8, -front - 0.8))

  g.rotation.y = Math.PI / 2
  g.position.set(CAMERA.x, CAMERA.y, 0)
  return g
}

/** Nappe plate : une bande suivie le long d'une courbe, large dans la direction z. */
export const buildRibbon = (): THREE.Mesh => {
  const curve = new THREE.CatmullRomCurve3(RIBBON.points.map(([x, y]) => new THREE.Vector3(x, y, 0)))
  const half = RIBBON.width / 2
  const positions: number[] = []
  const index: number[] = []
  for (let i = 0; i <= RIBBON.steps; i++) {
    const p = curve.getPoint(i / RIBBON.steps)
    positions.push(p.x, p.y, -half, p.x, p.y, half)
  }
  for (let i = 0; i < RIBBON.steps; i++) {
    const a = i * 2
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, material(COLORS.ribbon, { side: THREE.DoubleSide, roughness: 0.7 }))
}

/** Splitter PoE, adaptateur USB-OTG et câbles : masquables pour voir la carte seule. */
export const buildExtras = (): THREE.Group => {
  const g = new THREE.Group()
  g.add(box(44, 14, 26, material(COLORS.splitter), 20, 7, 62))
  g.add(box(14, 6, 16, material(COLORS.adapter, { roughness: 0.4 }), PORTS.usbX, 3.5, 24))
  g.add(cable([[PORTS.powerX, 5, 49], [PORTS.powerX, 3.2, 34], [PORTS.powerX, 2.6, 17]], 1.2, COLORS.powerCable))
  g.add(cable([[PORTS.usbX, 4, 49], [PORTS.usbX, 4, 40], [PORTS.usbX, 3.5, 32]], 1.2, COLORS.dataCable))
  g.add(cable([[20, 7, 75], [20, 7, 95], [24, 5, 125]], 1.8, COLORS.dataCable))
  return g
}

/** Caméra Reolink : boîtier, pare-soleil, objectif, LED infrarouges, support et câble RJ45. */
export const buildReolink = (): THREE.Group => {
  const g = new THREE.Group()
  const R = REOLINK
  const shell = material(COLORS.shell, { roughness: 0.35 })
  const dark = material(COLORS.lensBody, { roughness: 0.5 })

  g.add(cylinderX(R.bodyR, 0, R.bodyL, shell))
  g.add(cylinderX(R.visorR, R.bodyL - 3, R.bodyL + R.visorL, material(COLORS.shell, { roughness: 0.35, side: THREE.DoubleSide }), true))
  g.add(cylinderX(R.bodyR - 1, R.bodyL, R.bodyL + 1, dark))
  g.add(cylinderX(R.lensR, R.bodyL, R.bodyL + 10, dark))

  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(R.glassR, 32),
    material(0x1b2a5c, { metalness: 0.9, roughness: 0.1, emissive: 0x0c1330 }),
  )
  glass.rotation.y = Math.PI / 2
  glass.position.x = R.bodyL + 10.05
  g.add(glass)

  const ledMaterial = material(COLORS.led, { emissive: 0x7a1010, roughness: 0.3 })
  const led = new THREE.SphereGeometry(2.4, 12, 12)
  for (let i = 0; i < R.ledCount; i++) {
    const a = (i / R.ledCount) * Math.PI * 2
    const mesh = new THREE.Mesh(led, ledMaterial)
    mesh.position.set(R.bodyL + 1.5, Math.cos(a) * R.ledRingR, Math.sin(a) * R.ledRingR)
    g.add(mesh)
  }

  const bracket = material(COLORS.bracket, { metalness: 0.5, roughness: 0.4 })
  const ball = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 20), bracket)
  ball.position.set(35, R.ballY, 0)
  g.add(ball)
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, R.ballY - R.plateY - 2, 16), bracket)
  stem.position.set(35, (R.ballY + R.plateY) / 2, 0)
  g.add(stem)
  g.add(box(60, 4, 60, bracket, 35, R.plateY, 0))

  g.add(cable([[-2, 0, 0], [-30, -10, 0], [-55, -40, 10], [-90, R.plateY, 30]], 2.2, COLORS.dataCable))
  g.add(box(12, 9, 15, material(0xb9bec8, { roughness: 0.4 }), -94, R.plateY, 32))
  return g
}

/** Étiquette HTML ancrée à une position 3D. */
const buildLabel = (text: string, at: [number, number, number]): CSS2DObject => {
  const element = document.createElement('div')
  element.className = LABEL_CLASS
  element.textContent = text
  const label = new CSS2DObject(element)
  label.position.set(...at)
  return label
}

export interface BuiltScene {
  root: THREE.Group
  extras: THREE.Group
}

export const buildScene = (kind: CameraModelKind): BuiltScene => {
  const root = new THREE.Group()
  const extras = kind === 'zero' ? buildExtras() : new THREE.Group()
  if (kind === 'zero') root.add(buildBoard(), buildCamera(), buildRibbon(), extras)
  else root.add(buildReolink())

  const grid = new THREE.GridHelper(260, 26, COLORS.grid, COLORS.grid)
  grid.position.set(30, MODELS[kind].floorY, 40)
  const gridMaterial = grid.material as THREE.Material
  gridMaterial.transparent = true
  gridMaterial.opacity = 0.35
  root.add(grid)

  for (const { text, at, extra } of MODELS[kind].labels) {
    ;(extra ? extras : root).add(buildLabel(text, at))
  }

  return { root, extras }
}

/** Libère la géométrie et les matériaux d'un objet three.js. */
export const disposeObject = (object: THREE.Object3D): void => {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    mesh.geometry?.dispose()
    const mat = mesh.material
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
    else mat?.dispose()
  })
}

let webglSupport: boolean | undefined

/**
 * Vrai si le navigateur sait créer un contexte WebGL. Le test ne se fait qu'une fois et libère
 * aussitôt son contexte : les navigateurs en limitent le nombre (autour de 16) et en perdent
 * les plus anciens, ce qui vidait la vue 3D après plusieurs ouvertures.
 */
export const supportsWebGL = (): boolean => {
  if (webglSupport === undefined) {
    try {
      const gl = document.createElement('canvas').getContext('webgl2')
      webglSupport = gl !== null
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      webglSupport = false
    }
  }
  return webglSupport
}

/** Affiche ou masque un groupe et ses étiquettes (les étiquettes HTML ne suivent pas la visibilité du parent). */
export const setGroupVisible = (group: THREE.Object3D, visible: boolean): void => {
  group.traverse((child) => {
    child.visible = visible
  })
}
