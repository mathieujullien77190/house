import * as THREE from 'three'
import { CABINET, COUNTER_TOP, HOB, HOOD, ROOM, SINK, WORKTOP } from '@/components/Kitchen3D/constants'
import type { KitchenMaterials } from '@/components/Kitchen3D/materials'
import { box } from '@/components/Kitchen3D/primitives'

/** Le plan de travail d'une file : une dalle de 4 cm qui dépasse de 2 cm devant, échancrée devant l'évier s'il y en a un (le bloc blanc la remplit). */
export const worktop = (materials: KitchenMaterials, length: number, sinkX: number | null): THREE.Mesh => {
  const frontEdge = -WORKTOP.overhang
  const back = CABINET.depth
  const shape = new THREE.Shape()
  shape.moveTo(0, frontEdge)
  if (sinkX !== null) {
    const half = SINK.width / 2 - 0.01
    const notch = SINK.depth - SINK.protrusion - 0.04
    shape.lineTo(sinkX - half, frontEdge)
    shape.lineTo(sinkX - half, notch)
    shape.lineTo(sinkX + half, notch)
    shape.lineTo(sinkX + half, frontEdge)
  }
  shape.lineTo(length, frontEdge)
  shape.lineTo(length, back)
  shape.lineTo(0, back)
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: WORKTOP.thickness, bevelEnabled: false })
  // L'extrusion part vers +z : on la couche pour qu'elle monte, et l'axe y de la forme devient la profondeur (vers -z).
  geometry.rotateX(-Math.PI / 2)
  const mesh = new THREE.Mesh(geometry, materials.worktop)
  mesh.position.y = CABINET.plinth + CABINET.body
  return mesh
}

/** L'évier de ferme : un bloc blanc creux dont la façade dépasse devant les portes et dont le bord monte au-dessus du plan, une bonde et un robinet en laiton à col de cygne. */
export const sink = (materials: KitchenMaterials, x: number): THREE.Group => {
  const group = new THREE.Group()
  const { width, depth, height, wall, above, protrusion } = SINK
  group.position.x = x
  const bottom = COUNTER_TOP + above - height
  const centerY = bottom + height / 2
  const centerZ = protrusion - depth / 2
  group.add(box(width, height, wall, materials.sink, 0, centerY, protrusion - wall / 2))
  group.add(box(width, height, wall, materials.sink, 0, centerY, protrusion - depth + wall / 2))
  for (const side of [-1, 1]) group.add(box(wall, height, depth - wall * 2, materials.sink, (width / 2 - wall / 2) * side, centerY, centerZ))
  group.add(box(width - wall * 2, wall, depth - wall * 2, materials.sink, 0, bottom + wall / 2, centerZ))
  const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 24), materials.drain)
  drain.position.set(0, bottom + wall + 0.002, centerZ)
  group.add(drain)
  const tapZ = protrusion - depth - 0.06
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.03, 20), materials.brass)
  foot.position.set(0, COUNTER_TOP + 0.015, tapZ)
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, COUNTER_TOP + 0.02, tapZ),
    new THREE.Vector3(0, COUNTER_TOP + 0.24, tapZ),
    new THREE.Vector3(0, COUNTER_TOP + 0.36, tapZ + 0.03),
    new THREE.Vector3(0, COUNTER_TOP + 0.39, tapZ + 0.12),
    new THREE.Vector3(0, COUNTER_TOP + 0.33, tapZ + 0.19),
  ])
  group.add(foot, new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.012, 10, false), materials.brass))
  return group
}

/** La plaque à induction : une vitre noire posée sur le plan, quatre foyers cerclés et sa commande tactile devant. */
export const hob = (materials: KitchenMaterials, x: number): THREE.Group => {
  const group = new THREE.Group()
  const { width, depth, thickness } = HOB
  group.position.set(x, COUNTER_TOP, -CABINET.depth / 2)
  group.add(box(width, thickness, depth, materials.hob, 0, thickness / 2, 0))
  const zones: [number, number, number][] = [
    [-0.14, -0.1, 0.095],
    [0.14, -0.1, 0.075],
    [-0.14, 0.1, 0.075],
    [0.14, 0.1, 0.095],
  ]
  for (const [zoneX, zoneZ, radius] of zones) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius - 0.006, radius, 40), materials.hobRing)
    ring.rotation.x = -Math.PI / 2
    ring.position.set(zoneX, thickness + 0.0005, zoneZ)
    group.add(ring)
  }
  group.add(box(0.3, 0.001, 0.012, materials.hobRing, 0, thickness + 0.0005, depth / 2 - 0.03))
  return group
}

/** Le corps de la hotte : un tronc de pyramide à trois pans (la face avant et les deux côtés), adossé au mur, sans face arrière ni dessous. Le fond est le plan z = -profondeur / 2. */
const hoodCanopy = (material: THREE.Material): THREE.Mesh => {
  const { bottom, height, widthBottom, depthBottom, widthTop } = HOOD
  const back = -depthBottom / 2
  const frontBottom = depthBottom / 2
  const frontTop = back + widthTop
  const top = bottom + height
  // Quatre coins en bas, quatre en haut : avant gauche, avant droit, fond droit, fond gauche.
  const corners = [
    [-widthBottom / 2, bottom, frontBottom],
    [widthBottom / 2, bottom, frontBottom],
    [widthBottom / 2, bottom, back],
    [-widthBottom / 2, bottom, back],
    [-widthTop / 2, top, frontTop],
    [widthTop / 2, top, frontTop],
    [widthTop / 2, top, back],
    [-widthTop / 2, top, back],
  ]
  const positions = new Float32Array(corners.flat())
  // Les trois pans : devant (0, 1, 5, 4), côté droit (1, 2, 6, 5) et côté gauche (3, 0, 4, 7).
  const index = [0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 3, 0, 4, 3, 4, 7]
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, material)
}

/** La hotte : un tronc de pyramide à trois pans en inox adossé au mur, puis un conduit carré jusqu'au plafond. */
export const hood = (materials: KitchenMaterials, x: number): THREE.Group => {
  const group = new THREE.Group()
  const { bottom, height, depthBottom, widthTop } = HOOD
  const ductHeight = ROOM.height - (bottom + height)
  const duct = box(widthTop, ductHeight, widthTop, materials.steel, 0, bottom + height + ductHeight / 2, -depthBottom / 2 + widthTop / 2)
  // Le bandeau de boutons sous le bord avant.
  const strip = box(0.16, 0.012, 0.012, materials.nickel, 0, bottom + 0.012, depthBottom / 2 - 0.01)
  group.add(hoodCanopy(materials.steel), duct, strip)
  group.position.set(x, 0, -CABINET.depth + depthBottom / 2)
  return group
}
