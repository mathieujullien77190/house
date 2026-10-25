import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { COLORS, LABEL_CLASS, MODEL, REOLINK } from './constants'

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

/** Cylindre dont l'axe suit X, entre x0 et x1. */
const cylinderX = (radius: number, x0: number, x1: number, mat: THREE.Material, openEnded = false) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, x1 - x0, 40, 1, openEnded), mat)
  mesh.rotation.z = -Math.PI / 2
  mesh.position.x = (x0 + x1) / 2
  return mesh
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

export const buildScene = (): THREE.Group => {
  const root = new THREE.Group()
  root.add(buildReolink())

  const grid = new THREE.GridHelper(260, 26, COLORS.grid, COLORS.grid)
  grid.position.set(30, MODEL.floorY, 40)
  const gridMaterial = grid.material as THREE.Material
  gridMaterial.transparent = true
  gridMaterial.opacity = 0.35
  root.add(grid)

  for (const { text, at } of MODEL.labels) root.add(buildLabel(text, at))

  return root
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
