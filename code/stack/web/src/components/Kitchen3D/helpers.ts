import * as THREE from 'three'
import { CABINET, COLORS, COUNTER_TOP, ENTRY, FRIDGE_WALL, HOB, HOOD, KITCHEN, LAYOUT, NICHES, NOOK_WINDOW, PARTITION, RECESS, ROOM, RUNS, SINK, SPLASH, TILES, WINDOWS, WORKTOP, REST, OUTER_WALL, WC_ALCOVE, GUEST_WINDOW, MATOU_WINDOW, SAS, BASE, BATH_WINDOW } from './constants'
import { buildFurniture } from './furniture'
import { buildGarden, terracottaTexture } from './garden'
import { box, canvasTexture, fixtureBulb, seeded, standard, woodTexture, bulbBall } from './primitives'
import type { ModuleSpec, RunSpec, SceneParts } from './types'

/** Une lame de parquet (m) : sa longueur, sa largeur, son épaisseur, et le joint entre deux lames. */
export const PLANK = { length: 1.1, width: 0.18, thickness: 0.014, joint: 0.002 }

/** Les lames du parquet de la salle de bain : plus petites (m). */
export const SMALL_PLANK = { length: 0.6, width: 0.1 }

/**
 * Le parquet, lame par lame : de vraies planches de chêne clair de 110 cm sur 18 cm, toutes dans le même sens (en long sur x), posées au
 * tiers (chaque rangée décalée d'un tiers de lame sur la précédente). La trame est la même pour toute la maison : les lames se suivent d'une
 * pièce à l'autre, coupées au bord de chaque rectangle `[x1, x2, z1, z2]`. Chaque lame a sa teinte ; un joint fin les sépare. Un seul maillage.
 */
export const parquet = (rooms: [number, number, number, number][], size: { length: number; width: number } = PLANK, turned = false): THREE.InstancedMesh => {
  const { thickness, joint } = PLANK
  const { length, width } = size
  // Tournées d'un quart de tour, les lames courent le long de z : on les pose dans un repère où x et z sont échangés.
  const areas = turned ? rooms.map(([x1, x2, z1, z2]): [number, number, number, number] => [z1, z2, x1, x2]) : rooms
  const planks: { x: number; z: number; long: number; wide: number; seed: number }[] = []
  for (const [x1, x2, z1, z2] of areas) {
    for (let row = Math.floor(z1 / width); row * width < z2; row += 1) {
      const offset = ((((row % 3) + 3) % 3) / 3) * length
      const zA = Math.max(row * width + joint / 2, z1)
      const zB = Math.min((row + 1) * width - joint / 2, z2)
      if (zB - zA < 0.004) continue
      for (let index = Math.floor((x1 - offset) / length); offset + index * length < x2; index += 1) {
        const xA = Math.max(offset + index * length + joint / 2, x1)
        const xB = Math.min(offset + (index + 1) * length - joint / 2, x2)
        if (xB - xA < 0.004) continue
        planks.push({ x: (xA + xB) / 2, z: (zA + zB) / 2, long: xB - xA, wide: zB - zA, seed: row * 7919 + index * 104729 })
      }
    }
  }
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), standard(woodTexture(0xf2f2f2, 3), 0.55), planks.length)
  const matrix = new THREE.Matrix4()
  const color = new THREE.Color()
  planks.forEach((plank, index) => {
    if (turned) matrix.makeScale(plank.wide, thickness, plank.long).setPosition(plank.z, -thickness / 2, plank.x)
    else matrix.makeScale(plank.long, thickness, plank.wide).setPosition(plank.x, -thickness / 2, plank.z)
    mesh.setMatrixAt(index, matrix)
    const rand = seeded(plank.seed)
    mesh.setColorAt(index, color.setHSL(0.083 + rand() * 0.012, 0.42 + rand() * 0.1, 0.56 + rand() * 0.1))
  })
  mesh.instanceMatrix.needsUpdate = true
  return mesh
}

/** Le sisal : une natte beige tissée serré, des rangs de petites mailles claires et sombres en quinconce. Une image couvre 1 m. */
export const sisalTexture = (): THREE.CanvasTexture =>
  canvasTexture(512, (ctx) => {
    const rand = seeded(29)
    ctx.fillStyle = '#c9b184'
    ctx.fillRect(0, 0, 512, 512)
    const stitch = 8
    for (let row = 0; row * stitch < 512; row += 1) {
      for (let column = 0; column * stitch * 2 < 512 + stitch * 2; column += 1) {
        const light = 62 + rand() * 12
        ctx.fillStyle = `hsl(${38 + rand() * 6}, ${36 + rand() * 10}%, ${light}%)`
        ctx.fillRect(column * stitch * 2 - (row % 2) * stitch, row * stitch + 1, stitch * 2 - 2, stitch - 2)
      }
    }
  })

/** Le plan de travail : des lames de bois clair collées en long (3,5 cm), coupées en tronçons de 25 à 70 cm, de tons légèrement différents. Une image couvre 1 m. */
export const butcherTexture = (): THREE.CanvasTexture =>
  canvasTexture(512, (ctx) => {
    const rand = seeded(5)
    const strip = 18
    for (let row = 0; row * strip < 512; row += 1) {
      let x = -rand() * 200
      while (x < 512) {
        const length = 128 + rand() * 230
        ctx.fillStyle = `hsl(${36 + rand() * 6}, ${62 + rand() * 10}%, ${60 + rand() * 11}%)`
        ctx.fillRect(x, row * strip, length, strip)
        ctx.globalAlpha = 0.12
        ctx.strokeStyle = '#7a4a1c'
        ctx.beginPath()
        ctx.moveTo(x, row * strip + 6 + rand() * 6)
        ctx.lineTo(x + length, row * strip + 6 + rand() * 6)
        ctx.stroke()
        ctx.globalAlpha = 0.35
        ctx.strokeStyle = '#a9773c'
        ctx.strokeRect(x, row * strip, length, strip)
        ctx.globalAlpha = 1
        x += length
      }
    }
  })

/** Le carrelage métro beige (7,5 cm sur 15 cm), joints plus foncés. Une image couvre 60 cm. */
export const tileTexture = (): THREE.CanvasTexture =>
  canvasTexture(256, (ctx) => {
    const rand = seeded(9)
    ctx.fillStyle = COLORS.tileGrout
    ctx.fillRect(0, 0, 256, 256)
    for (let row = 0; row < 8; row += 1) {
      const shift = row % 2 === 0 ? 0 : 32
      for (let column = -1; column < 5; column += 1) {
        ctx.fillStyle = COLORS.tile
        ctx.globalAlpha = 0.85 + rand() * 0.15
        ctx.fillRect(column * 64 + shift + 2, row * 32 + 2, 60, 28)
      }
    }
    ctx.globalAlpha = 1
  })

/** Le lambris blanc du plafond : des lames de 10 cm rainurées en long. Une image couvre 1 m. */
export const lambrisTexture = (): THREE.CanvasTexture =>
  canvasTexture(512, (ctx) => {
    ctx.fillStyle = '#f6f4ef'
    ctx.fillRect(0, 0, 512, 512)
    for (let board = 0; board < 10; board += 1) {
      ctx.fillStyle = '#d9d5cb'
      ctx.fillRect(board * 51.2, 0, 3, 512)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(board * 51.2 + 3, 0, 2, 512)
    }
  })

/** Les textures que la pièce règle elle-même (leur répétition dépend des cotes). */
const mapsOf = () => ({ lambris: lambrisTexture(), tile: tileTexture() })

type Maps = ReturnType<typeof mapsOf>

/** Les matériaux de la cuisine, créés une fois par scène. */
const materialsOf = (maps: Maps) => ({
  lambris: standard(maps.lambris, 0.85),
  plaster: standard(0xf7f5f1, 0.95),
  beam: standard(woodTexture(COLORS.beam, 41), 0.6),
  door: standard(COLORS.cabinet, 0.5),
  carcass: standard(COLORS.carcass, 0.7),
  plinth: standard(COLORS.plinth, 0.8),
  worktop: standard(butcherTexture(), 0.5),
  sink: standard(COLORS.sink, 0.1),
  drain: standard(0x2a2d31, 0.5, 0.4),
  brass: standard(COLORS.brass, 0.3, 0.9),
  hob: standard(COLORS.hob, 0.08, 0.1),
  hobRing: standard(COLORS.hobRing, 0.4),
  steel: standard(COLORS.steel, 0.3, 0.85, THREE.DoubleSide),
  nickel: standard(COLORS.nickel, 0.3, 0.9, THREE.DoubleSide),
  ovenGlass: standard(COLORS.ovenGlass, 0.05, 0.2),
  wall: standard(COLORS.wall, 0.95),
  tile: standard(maps.tile, 0.4),
  // Ce qu'on voit dans les joints du parquet.
  floor: standard(0xc8a070, 0.9),
  shelf: standard(woodTexture(COLORS.shelf, 53), 0.6),
  bracket: standard(COLORS.bracket, 0.6),
  windowFrame: standard(COLORS.window, 0.5),
  blind: standard(COLORS.blind, 0.9),
  glass: new THREE.MeshStandardMaterial({ color: COLORS.glass, roughness: 0.1, transparent: true, opacity: 0.14 }),
  lamp: standard(COLORS.lamp, 0.5, 0, THREE.DoubleSide),
  bottle: standard(COLORS.bottle, 0.2),
  rack: standard(COLORS.rack, 0.6),
})

type Materials = ReturnType<typeof materialsOf>

/** Une poignée coquille en nickel brossé, devant la façade (z = 0) : une demi-coquille debout (porte) ou couchée (tiroir). */
const cupHandle = (materials: Materials, horizontal: boolean, x: number, y: number): THREE.Group => {
  const group = new THREE.Group()
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.1, 16, 1, true, -Math.PI / 2, Math.PI), materials.nickel)
  if (horizontal) shell.rotation.z = Math.PI / 2
  shell.position.z = 0.002
  group.add(shell)
  group.position.set(x, y, 0)
  return group
}

/** Une façade à cadre (style shaker) : un fond en retrait de 6 mm et quatre bandes qui l'entourent, jusqu'à z = 0. */
const front = (materials: Materials, width: number, height: number, x: number, y: number): THREE.Group => {
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
const wineRack = (materials: Materials, width: number): THREE.Group => {
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
const oven = (materials: Materials, width: number): THREE.Group => {
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
const cabinet = (materials: Materials, spec: ModuleSpec, x: number): THREE.Group => {
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

/** Le plan de travail d'une file : une dalle de 4 cm qui dépasse de 2 cm devant, échancrée devant l'évier s'il y en a un (le bloc blanc la remplit). */
const worktop = (materials: Materials, length: number, sinkX: number | null): THREE.Mesh => {
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
const sink = (materials: Materials, x: number): THREE.Group => {
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
const hob = (materials: Materials, x: number): THREE.Group => {
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
const hood = (materials: Materials, x: number): THREE.Group => {
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

/** Un panneau de lambris bleu (lames verticales rainurées) sur le bout d'une file. */
const endPanel = (materials: Materials, x: number): THREE.Group => {
  const group = new THREE.Group()
  const height = CABINET.plinth + CABINET.body + WORKTOP.thickness
  group.position.x = x
  group.add(box(0.02, height - 0.04, CABINET.depth + 0.01, materials.door, 0.01, (height - 0.04) / 2 + 0.02, -CABINET.depth / 2))
  for (let line = 0; line < 7; line += 1) {
    group.add(box(0.004, height - 0.1, 0.003, materials.carcass, 0.02, (height - 0.04) / 2 + 0.02, -0.05 - line * 0.085))
  }
  return group
}

/** Une file de caissons avec son plan de travail, et ce qu'elle porte (évier, plaque, hotte, panneau de bout). Repère de la file : x le long de la file, z vers le devant (0 = façade). */
const run = (materials: Materials, spec: RunSpec, hoodParts: THREE.Group): THREE.Group => {
  const group = new THREE.Group()
  group.position.set(spec.x, 0, spec.z)
  group.rotation.y = spec.angle
  let cursor = 0
  const centers = spec.modules.map((module) => {
    const center = cursor + module.width / 2
    cursor += module.width
    return center
  })
  spec.modules.forEach((module, index) => group.add(cabinet(materials, module, centers[index])))
  const sinkIndex = spec.modules.findIndex((module) => module.kind === 'sink')
  group.add(worktop(materials, cursor, sinkIndex >= 0 ? centers[sinkIndex] : null))
  if (sinkIndex >= 0) group.add(sink(materials, centers[sinkIndex]))
  if (spec.id === HOB.run) {
    group.add(hob(materials, centers[HOB.module]))
    // La crédence en inox derrière la plaque, contre le mur.
    group.add(box(SPLASH.width, SPLASH.height, 0.01, materials.steel, centers[HOB.module], COUNTER_TOP + SPLASH.height / 2, -CABINET.depth + 0.005))
    hoodParts.add(hood(materials, centers[HOB.module]))
    group.add(hoodParts)
  }
  if (spec.endPanel) group.add(endPanel(materials, cursor))
  return group
}

/** Une tablette en bois sur deux équerres noires. */
const shelf = (materials: Materials, x: number, width: number): THREE.Group => {
  const group = new THREE.Group()
  group.position.set(x, 1.72, KITCHEN.zMin + 0.1)
  group.add(box(width, 0.03, 0.2, materials.shelf, 0, 0, 0))
  for (const side of [-1, 1]) group.add(box(0.012, 0.1, 0.02, materials.bracket, (width / 2 - 0.12) * side, -0.065, -0.07))
  return group
}

/** Une petite fenêtre blanche dans le mur de droite : sa vitre, et à l'intérieur un store enroulable crème toujours baissé. */
const windowAt = (materials: Materials, z: number): THREE.Group => {
  const group = new THREE.Group()
  const { width, height, bottom } = WINDOWS
  const bar = 0.05
  const depth = 0.07
  // La fenêtre est au nu du mur intérieur : son cadre est dans l’embrasure, sa face ressort d’un centimètre dans la pièce.
  group.position.set(ROOM.xMax + depth / 2 - 0.01, bottom + height / 2, z)
  for (const side of [-1, 1]) {
    group.add(box(depth, bar, width, materials.windowFrame, 0, (height / 2 - bar / 2) * side, 0))
    group.add(box(depth, height - bar * 2, bar, materials.windowFrame, 0, 0, (width / 2 - bar / 2) * side))
  }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width - bar * 2, height - bar * 2), materials.glass)
  glass.rotation.y = -Math.PI / 2
  group.add(glass)
  const blindHeight = height - bar * 2
  group.add(box(0.012, blindHeight, width - bar * 2 - 0.02, materials.blind, -0.012, (height - bar * 2) / 2 - blindHeight / 2, 0))
  const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, width - bar * 2, 14), materials.blind)
  roller.rotation.x = Math.PI / 2
  roller.position.set(-0.025, (height - bar * 2) / 2 - 0.01, 0)
  group.add(roller)
  return group
}

/** Un pan de mur blanc dans un plan vertical, lisible d'un seul côté. `axis` : le mur court le long de x ou de z ; `facing` : le sens de sa face visible sur l'autre axe. */
const wallPane = (material: THREE.Material, axis: 'x' | 'z', from: number, to: number, at: number, facing: 1 | -1, bottom: number, top: number): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(to - from, top - bottom), material)
  const middle = (from + to) / 2
  if (axis === 'x') {
    mesh.rotation.y = facing === 1 ? 0 : Math.PI
    mesh.position.set(middle, (bottom + top) / 2, at)
  } else {
    mesh.rotation.y = (Math.PI / 2) * facing
    mesh.position.set(at, (bottom + top) / 2, middle)
  }
  return mesh
}

/**
 * La pièce, aux cotes du modèle SketchUp : le parquet partout, les murs blancs (lisibles de l'intérieur seulement), le plafond (lambris blanc,
 * plaque de plâtre lisse au-dessus de la cuisine), les plinthes et les poutres de chêne, la crédence (quatre rangées de carreaux), le mur puis le
 * bar entre la cuisine et le salon, le mur de l'escalier et ses niches, la petite pièce de l'entrée, les étagères, les fenêtres et la suspension noire.
 */
const room = (materials: Materials, maps: Maps): THREE.Group => {
  const group = new THREE.Group()
  const { xMin, xMax, zMin, zMax, height } = ROOM
  // Une plinthe de chêne (8 cm) au pied d'un mur : le long de x ou de z, plaquée du côté `facing`. Aux angles, c'est la plinthe le long de z
  // qui recouvre l'autre : elle dépasse de son épaisseur à chaque bout (dans un angle rentrant, ce bout est caché dans le mur). Celle le long
  // de x est un cheveu plus basse, pour que leurs dessus ne soient jamais au même endroit.
  const skirting = (axis: 'x' | 'z', from: number, to: number, at: number, facing: 1 | -1) => {
    const thick = 0.016
    const length = to - from
    const middle = (from + to) / 2
    group.add(axis === 'x' ? box(length, 0.0796, thick, materials.beam, middle, 0.0398, at + (thick / 2) * facing) : box(thick, 0.08, length + thick * 2, materials.beam, at + (thick / 2) * facing, 0.04, middle))
  }
  // Un pan de mur blanc ; s'il part du sol, il a sa plinthe (sauf `skirt` à faux : l'intérieur d'une niche).
  const wall = (axis: 'x' | 'z', from: number, to: number, at: number, facing: 1 | -1, bottom = 0, top = height, skirt = true) => {
    group.add(wallPane(materials.wall, axis, from, to, at, facing, bottom, top))
    if (skirt && bottom === 0) skirting(axis, from, to, at, facing)
  }
  // Entre la cuisine et le salon : le milieu de l'épaisseur du mur, sa face côté salon, et l'endroit où le mur plein laisse la place au bar.
  const wallX = KITCHEN.xMin - PARTITION.thickness / 2
  const salonX = KITCHEN.xMin - PARTITION.thickness
  const barStart = zMin + PARTITION.wall
  const returnStart = KITCHEN.zMax - FRIDGE_WALL.length
  // Le fond de l'entrée, côté frigo : à 1,43 m de la porte, soit 12 cm derrière le mur de l'escalier (son épaisseur).
  const entryBack = ENTRY.doorZ - ENTRY.depth

  // Le sol et le plafond ne couvrent que les pièces (pas le dehors, derrière l'entrée ou le mur de l'escalier) : le salon, la bande entre le
  // claustra et la cuisine, l'entrée, la cuisine. Chaque dalle porte sa texture aux cotes de la pièce (`scale` : mètres par motif, en x puis en z), pour que
  // les lames se suivent d'une dalle à l'autre.
  const rooms: [number, number, number, number][] = [
    [xMin, ENTRY.x, zMin, zMax],
    [ENTRY.x, KITCHEN.xMin, zMin, entryBack],
    [ENTRY.x, ENTRY.northX, entryBack, ENTRY.doorZ],
    [KITCHEN.xMin, KITCHEN.xMax, KITCHEN.zMin, KITCHEN.zMax],
  ]
  const slab = (material: THREE.Material, y: number, up: boolean, scale: [number, number], [x1, x2, z1, z2]: [number, number, number, number]) => {
    const geometry = new THREE.PlaneGeometry(x2 - x1, z2 - z1)
    const position = geometry.getAttribute('position')
    const uv = geometry.getAttribute('uv')
    const middleX = (x1 + x2) / 2
    const middleZ = (z1 + z2) / 2
    for (let index = 0; index < position.count; index += 1) uv.setXY(index, (middleX + position.getX(index)) / scale[0], (middleZ + position.getY(index)) / scale[1])
    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = up ? -Math.PI / 2 : Math.PI / 2
    mesh.position.set(middleX, y, middleZ)
    group.add(mesh)
  }
  // Le sol : un fond sombre (le joint), et par-dessus les lames du parquet, posées en fin de pièce (le cellier s'y ajoute).
  const floors: [number, number, number, number][] = [...rooms]
  for (const area of rooms) slab(materials.floor, -0.0005, true, [1, 1], area)

  // Les murs du salon : la télé (ouest), les baies (sud), le bureau (est, jusqu'au mur de l'entrée).
  // Le mur de la télé, percé de la porte du couloir (ouverte) : un pan de chaque côté et le linteau au-dessus.
  const passage = { from: LAYOUT.door.x - LAYOUT.door.width / 2, to: LAYOUT.door.x + LAYOUT.door.width / 2, top: 2.05 }
  wall('x', xMin, passage.from, zMin, 1)
  wall('x', passage.to, salonX, zMin, 1)
  wall('x', passage.from, passage.to, zMin, 1, passage.top)
  // Un mur percé de fenêtres : des pans autour de chaque baie (du sol à l'allège, du linteau au plafond), pour qu'on voie dehors à travers
  // la vitre. Chaque baie est donnée par son milieu, sa largeur, son bas et sa hauteur.
  const pierced = (axis: 'x' | 'z', from: number, to: number, at: number, facing: 1 | -1, bays: { z: number; width: number; bottom: number; height: number }[]) => {
    let cursor = from
    for (const bay of [...bays].sort((a, b) => a.z - b.z)) {
      const start = bay.z - bay.width / 2
      const end = bay.z + bay.width / 2
      wall(axis, cursor, start, at, facing, 0, height, false)
      wall(axis, start, end, at, facing, 0, bay.bottom, false)
      wall(axis, start, end, at, facing, bay.bottom + bay.height, height, false)
      cursor = end
    }
    wall(axis, cursor, to, at, facing, 0, height, false)
    skirting(axis, from, to, at, facing)
  }
  const { door: bayDoor, window: bayWindow } = LAYOUT.bays
  pierced('z', zMin, zMax, xMin, 1, [
    { z: bayDoor.z, width: bayDoor.width, bottom: 0.05, height: 2.15 },
    bayWindow,
    { z: LAYOUT.libraryWindow.z, width: 1, bottom: 1.05, height: 1.1 },
  ])
  wall('x', xMin, ENTRY.x, zMax, -1)
  // Les murs de la cuisine : la hotte (ouest, 30 cm plus à l'est que le mur de la télé) et les fenêtres (nord).
  wall('x', KITCHEN.xMin, KITCHEN.xMax, KITCHEN.zMin, 1)
  pierced('z', KITCHEN.zMin, KITCHEN.zMax, xMax, -1, [...WINDOWS.z.map((z) => ({ z, width: WINDOWS.width, bottom: WINDOWS.bottom, height: WINDOWS.height })), NOOK_WINDOW])

  // Le plafond : du lambris blanc (lames de 10 cm), et la plaque de plâtre lisse de la cuisine juste en dessous.
  maps.lambris.repeat.set(1, 1)
  for (const area of rooms) slab(materials.lambris, height, false, [1, 1], area)
  const kitchenWidth = KITCHEN.xMax - KITCHEN.xMin
  const kitchenDepth = KITCHEN.zMax - KITCHEN.zMin
  const plaster = new THREE.Mesh(new THREE.PlaneGeometry(kitchenWidth, kitchenDepth), materials.plaster)
  plaster.rotation.x = Math.PI / 2
  plaster.position.set((KITCHEN.xMin + KITCHEN.xMax) / 2, height - 0.002, (KITCHEN.zMin + KITCHEN.zMax) / 2)
  group.add(plaster)

  // Entre la cuisine et le salon : le mur plein (1,58 m), le bar (un muret, du lambris bleu côté salon, une tablette en bois qui dépasse côté
  // salon), l'ouverture, puis le retour de mur à droite du frigo.
  group.add(box(PARTITION.thickness, height, PARTITION.wall, materials.wall, wallX, height / 2, zMin + PARTITION.wall / 2))
  // Le lambris bleu du bar (2 cm) est pris dans l'épaisseur du muret : sa face est au nu du mur plein, côté salon, et la plinthe file droit.
  group.add(box(PARTITION.thickness - 0.02, PARTITION.height, PARTITION.bar, materials.wall, wallX + 0.01, PARTITION.height / 2, barStart + PARTITION.bar / 2))
  group.add(box(0.02, PARTITION.height, PARTITION.bar, materials.door, salonX + 0.01, PARTITION.height / 2, barStart + PARTITION.bar / 2))
  // La planche du bar (une seule, 29 cm) couvre le muret et le rebord, bute contre le mur plein et s'y prolonge par la bande qui dépasse ; côté cuisine, un rebord bas de 5 cm d'épaisseur longe tout le mur, du fond de la cuisine
  // au bout du bar, à la hauteur du bar : le plan de travail vient buter dessus. Devant le mur plein, il est coiffé d'une fine bande de bois.
  const ledgeX = KITCHEN.xMin + PARTITION.ledge
  // Ces planches courent le long de z : leur bois est tourné d'un quart de tour, pour que les veines suivent la longueur.
  const longGrain = woodTexture(COLORS.beam, 41)
  longGrain.center.set(0.5, 0.5)
  longGrain.rotation = Math.PI / 2
  const shelfLong = standard(longGrain, 0.6)
  const topFrom = salonX - 0.05
  group.add(box(ledgeX + 0.01 - topFrom, 0.04, PARTITION.bar + 0.04, shelfLong, (ledgeX + 0.01 + topFrom) / 2, PARTITION.height + 0.02, barStart + PARTITION.bar / 2 + 0.02))
  const ledgeEnd = barStart + PARTITION.bar
  group.add(box(PARTITION.ledge, PARTITION.height, ledgeEnd - KITCHEN.zMin, materials.wall, KITCHEN.xMin + PARTITION.ledge / 2, PARTITION.height / 2, (KITCHEN.zMin + ledgeEnd) / 2))
  group.add(box(PARTITION.ledge + 0.01, 0.04, barStart - KITCHEN.zMin, shelfLong, KITCHEN.xMin + (PARTITION.ledge + 0.01) / 2, PARTITION.height + 0.02, (KITCHEN.zMin + barStart) / 2))
  // Le bout du bar, vu de l'ouverture : fermé par du lambris bleu, sur l'épaisseur du muret (jusqu'à la tablette) puis sur le bout de la file de
  // caissons (jusque sous le plan de travail), avec une plinthe de chêne en bas.
  const barEnd = barStart + PARTITION.bar
  const runEnd = KITCHEN.xMin + PARTITION.ledge + CABINET.depth
  const underTop = COUNTER_TOP - WORKTOP.thickness
  group.add(box(PARTITION.thickness, PARTITION.height, 0.02, materials.door, wallX, PARTITION.height / 2, barEnd + 0.01))
  group.add(box(runEnd - KITCHEN.xMin, underTop, 0.02, materials.door, (runEnd + KITCHEN.xMin) / 2, underTop / 2, barEnd + 0.01))
  for (let line = 1; line < 8; line += 1) group.add(box(0.004, underTop - 0.1, 0.003, materials.carcass, salonX + ((runEnd - salonX) * line) / 8, underTop / 2 + 0.04, barEnd + 0.021))
  group.add(box(runEnd - salonX, 0.0796, 0.016, materials.beam, (runEnd + salonX) / 2, 0.0398, barEnd + 0.028))
  group.add(box(PARTITION.thickness, height, entryBack - returnStart, materials.wall, wallX, height / 2, (returnStart + entryBack) / 2))

  // Le mur de l'escalier, côté cuisine : des pans pleins entre les deux niches (le cellier, le comptoir à verres) et des linteaux au-dessus.
  let cursor = salonX
  for (const niche of [...NICHES].sort((a, b) => a.x - b.x)) {
    wall('x', cursor, niche.x - niche.width / 2, KITCHEN.zMax, -1)
    wall('x', niche.x - niche.width / 2, niche.x + niche.width / 2, KITCHEN.zMax, -1, niche.height)
    cursor = niche.x + niche.width / 2
    // L'intérieur de la niche : le fond, les deux joues et le plafond (le cellier est plus large que son ouverture).
    // Des pans lisibles de l'intérieur seulement : vus de dehors, rien ne dépasse derrière le mur.
    const back = KITCHEN.zMax + niche.depth
    wall('x', niche.x - niche.inner / 2, niche.x + niche.inner / 2, back, -1, niche.bottom, niche.height, false)
    wall('z', KITCHEN.zMax, back, niche.x - niche.inner / 2, 1, niche.bottom, niche.height, false)
    wall('z', KITCHEN.zMax, back, niche.x + niche.inner / 2, -1, niche.bottom, niche.height, false)
    if (niche.id === 'cellar') {
      // Le cellier est une petite pièce : du parquet au sol, des plinthes au fond et sur ses deux joues.
      const cellarFloor: [number, number, number, number] = [niche.x - niche.inner / 2, niche.x + niche.inner / 2, KITCHEN.zMax, back]
      slab(materials.floor, -0.0005, true, [1, 1], cellarFloor)
      floors.push(cellarFloor)
      skirting('x', niche.x - niche.inner / 2, niche.x + niche.inner / 2, back, -1)
      skirting('z', KITCHEN.zMax, back, niche.x - niche.inner / 2, 1)
      skirting('z', KITCHEN.zMax, back, niche.x + niche.inner / 2, -1)
    }
    if (niche.bottom > 0) {
      // Sous la niche, le mur est plein, sauf le casier carré : quatre pans autour de son ouverture, et un creux en contreplaqué dont on ne
      // voit que l'intérieur.
      const left = niche.x - niche.width / 2
      const right = niche.x + niche.width / 2
      wall('x', left, right, KITCHEN.zMax, -1, 0, RECESS.bottom)
      wall('x', left, right, KITCHEN.zMax, -1, RECESS.top, niche.bottom)
      wall('x', left, niche.x - RECESS.width / 2, KITCHEN.zMax, -1, RECESS.bottom, RECESS.top)
      wall('x', niche.x + RECESS.width / 2, right, KITCHEN.zMax, -1, RECESS.bottom, RECESS.top)
      const plywood = standard(0xe2c9a0, 0.8)
      plywood.side = THREE.BackSide
      const hollow = new THREE.Mesh(new THREE.BoxGeometry(RECESS.width, RECESS.top - RECESS.bottom, RECESS.depth), plywood)
      hollow.position.set(niche.x, (RECESS.top + RECESS.bottom) / 2, KITCHEN.zMax + RECESS.depth / 2)
      group.add(hollow)
    }
    const top = new THREE.Mesh(new THREE.PlaneGeometry(niche.inner, niche.depth), materials.wall)
    top.rotation.x = Math.PI / 2
    top.position.set(niche.x, niche.height, KITCHEN.zMax + niche.depth / 2)
    group.add(top)
  }
  wall('x', cursor, KITCHEN.xMax, KITCHEN.zMax, -1)
  // Le dos du mur de l'escalier : un bloc blanc fermé (le fond, les deux bouts, le dessus), lisible de dehors seulement. Vu de derrière ou
  // de dessus, on ne voit ni l'intérieur des niches ni le frigo ; vu de la cuisine, rien ne change.
  const shellBack = KITCHEN.zMax + Math.max(...NICHES.map((niche) => niche.depth)) + 0.04
  wall('x', ENTRY.northX, KITCHEN.xMax, shellBack, 1, 0, height, false)
  wall('z', KITCHEN.zMax, shellBack, KITCHEN.xMax, 1, 0, height, false)
  wall('z', KITCHEN.zMax, shellBack, ENTRY.northX, -1, 0, height, false)
  const shellTop = new THREE.Mesh(new THREE.PlaneGeometry(KITCHEN.xMax - ENTRY.northX, shellBack - KITCHEN.zMax), materials.wall)
  shellTop.rotation.x = -Math.PI / 2
  shellTop.position.set((KITCHEN.xMax + ENTRY.northX) / 2, height + 0.004, (KITCHEN.zMax + shellBack) / 2)
  group.add(shellTop)

  // Le reste de la maison, d'après le plan de Home : des pièces vides (sol, murs blancs à plinthe, plafond de lambris), lisibles de
  // l'intérieur comme les autres. À l'ouest : la chambre 1, la salle de bain, le couloir et la chambre 2 ; à l'est de la cuisine, derrière
  // le mur du frigo : la cage de l'escalier.
  const { west, middle, corridorNorth, corridorSouth, bathSouth, bathWest, guestEast, guestSouth, matouEast } = REST
  // Un passage de porte dans un mur : de où à où, le long du mur. Une ouverture en hauteur (fenêtre, alcôve) : son milieu le long du mur, sa largeur, son bas, sa hauteur.
  type Gap = [number, number]
  type Bay = { z: number; width: number; bottom: number; height: number }
  // Un pan de mur percé de passages de porte (jusqu'à la hauteur de la porte du couloir, donnés dans l'ordre le long du mur), avec son linteau au-dessus de chacun.
  const gapped = (axis: 'x' | 'z', from: number, to: number, at: number, facing: 1 | -1, gaps: Gap[] = []) => {
    let cursor = from
    for (const [start, end] of gaps) {
      wall(axis, cursor, start, at, facing)
      wall(axis, start, end, at, facing, passage.top)
      cursor = end
    }
    wall(axis, cursor, to, at, facing)
  }
  // Un mur épais plein (vu des deux côtés), le long de `axis`, entre `low` et `high` en travers ; percé des mêmes passages, il garde
  // son linteau au-dessus et reçoit un seuil au sol.
  const solid = (axis: 'x' | 'z', from: number, to: number, low: number, high: number, gaps: Gap[], threshold: THREE.Material) => {
    const across = (low + high) / 2
    const thick = high - low - 0.002
    const piece = (start: number, end: number, bottom: number, top: number, material: THREE.Material) => {
      const tall = top - bottom
      group.add(axis === 'x' ? box(end - start, tall, thick, material, (start + end) / 2, bottom + tall / 2, across) : box(thick, tall, end - start, material, across, bottom + tall / 2, (start + end) / 2))
    }
    let cursor = from
    for (const [start, end] of gaps) {
      piece(cursor, start, 0, height, materials.wall)
      piece(start, end, passage.top, height, materials.wall)
      piece(start, end, -0.01, 0, threshold)
      cursor = end
    }
    piece(cursor, to, 0, height, materials.wall)
  }
  // Une pièce vide : ses quatre murs (west et east : ceux de z1 et z2 ; south et north : ceux de x1 et x2), percés de leurs portes.
  const emptyRoom = ([x1, x2, z1, z2]: [number, number, number, number], floor: THREE.Material | 'small', doors: { west?: Gap[]; east?: Gap[]; south?: Gap[]; north?: Gap[] } = {}, bays: { west?: Bay[]; east?: Bay[]; south?: Bay[]; north?: Bay[] } = {}) => {
    // Les murs ouest et est peuvent être percés d'ouvertures en hauteur (une fenêtre, une alcôve) au lieu de portes.
    if (bays.west) pierced('x', x1, x2, z1, 1, bays.west)
    else gapped('x', x1, x2, z1, 1, doors.west)
    if (bays.east) pierced('x', x1, x2, z2, -1, bays.east)
    else gapped('x', x1, x2, z2, -1, doors.east)
    if (bays.south) pierced('z', z1, z2, x1, 1, bays.south)
    else gapped('z', z1, z2, x1, 1, doors.south)
    if (bays.north) pierced('z', z1, z2, x2, -1, bays.north)
    else gapped('z', z1, z2, x2, -1, doors.north)
    slab(materials.lambris, height, false, [1, 1], [x1, x2, z1, z2])
    if (floor === 'small') {
      slab(materials.floor, -0.0005, true, [1, 1], [x1, x2, z1, z2])
      // Le même parquet qu'au salon (même pose au tiers), en lames plus petites, tournées d'un quart de tour.
      group.add(parquet([[x1, x2, z1, z2]], SMALL_PLANK, true))
    } else slab(floor, 0, true, [1, 1], [x1, x2, z1, z2])
  }
  // Pas de parquet dans les chambres : un sol uni, clair.
  const plain = standard(0xdcd8d0, 0.8)
  // Les trois portes du fond du couloir (sans battant) : au bout, celle de la chambre d'invité ; à droite en entrant, celle de la salle de
  // bain ; à gauche, celle de la chambre 2.
  const endDoor: Gap = [corridorSouth + 0.08, corridorNorth - 0.02]
  const sideDoor: Gap = [middle + 0.08, middle + 0.81]
  // La chambre d'invité a un sol de sisal beige ; la salle de bain, du parquet (leurs meubles : `rooms.ts`).
  emptyRoom([guestSouth, xMax, west, guestEast], standard(sisalTexture(), 0.95), { east: [endDoor] }, { west: [GUEST_WINDOW] })
  // Les cloisons de la chambre d'invité, pleines : 8 cm vers la salle de bain, quelques centimètres vers la chambre 2.
  group.add(box(xMax - bathSouth - 0.002, height, bathWest - guestEast - 0.002, materials.wall, (xMax + bathSouth) / 2, height / 2, (bathWest + guestEast) / 2))
  // Celle de la chambre 2 est épaissie de 3 cm, pris sur la chambre 2.
  const matouWall = corridorSouth - 0.03
  group.add(box(guestSouth - matouWall - 0.002, height, guestEast - west - 0.002, materials.wall, (guestSouth + matouWall) / 2, height / 2, (guestEast + west) / 2))
  emptyRoom([bathSouth, xMax, bathWest, zMin], 'small', { south: [sideDoor] }, { east: [{ z: WC_ALCOVE.x, width: WC_ALCOVE.width, bottom: WC_ALCOVE.bottom, height: WC_ALCOVE.height }], north: [BATH_WINDOW] })
  // Entre ces pièces, les murs épais sont pleins : celui du couloir à la salle de bain, et celui du bout du couloir à la chambre d'invité.
  // Leurs seuils de porte sont en chêne clair.
  const sill = standard(woodTexture(0xd9b98a, 113), 0.6)
  solid('z', middle, zMin, corridorNorth, bathSouth, [sideDoor], sill)
  solid('x', corridorSouth, bathSouth, guestEast, middle, [endDoor], sill)
  // Le couloir : du parquet comme au salon, la porte du salon d'un côté, les trois autres au fond, et son plafonnier.
  const corridor: [number, number, number, number] = [corridorSouth, corridorNorth, middle, zMin]
  gapped('x', corridorSouth, corridorNorth, middle, 1, [endDoor])
  gapped('z', middle, zMin, corridorSouth, 1, [sideDoor])
  gapped('z', middle, zMin, corridorNorth, -1, [sideDoor])
  wall('x', corridorSouth, passage.from, zMin, -1)
  wall('x', passage.to, corridorNorth, zMin, -1)
  wall('x', passage.from, passage.to, zMin, -1, passage.top)
  // Au-dessus de la porte du couloir, le mur a son épaisseur (5 cm) : un linteau plein, dont on voit le dessous en passant.
  group.add(box(passage.to - passage.from, height - passage.top, 0.05, materials.wall, (passage.from + passage.to) / 2, (height + passage.top) / 2, zMin - 0.026))
  slab(materials.lambris, height, false, [1, 1], corridor)
  slab(materials.floor, -0.0005, true, [1, 1], corridor)
  floors.push(corridor)
  // Le plafonnier du couloir : une rosace noire, une courte tige, une coupole d'osier ouverte vers le bas et son ampoule (la lampe « Couloir »).
  const lampX = (corridorSouth + corridorNorth) / 2
  const lampZ = (middle + zMin) / 2
  const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 20), materials.lamp)
  rosette.position.set(lampX, height - 0.01, lampZ)
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.1, 28, 1, true), standard(0xcaa46a, 0.9, 0, THREE.DoubleSide))
  shade.position.set(lampX, height - 0.2, lampZ)
  group.add(rosette, box(0.012, 0.13, 0.012, materials.lamp, lampX, height - 0.085, lampZ), shade, fixtureBulb(bulbBall(0.045, lampX, height - 0.23, lampZ), 'couloir'))
  emptyRoom([xMin, corridorSouth, west, matouEast], plain, { north: [sideDoor] }, { south: [MATOU_WINDOW] })
  // Entre la chambre et le mur de la télé : un mur blanc épais où est encastré le placard. Quatre portes blanches à cadre (quatre panneaux
  // séparés par des traverses), dans un chambranle blanc, chacune avec sa poignée noire ; les deux du milieu s'ouvrent l'une vers l'autre.
  group.add(box(corridorSouth - xMin - 0.002, height, zMin - matouEast - 0.002, materials.wall, (corridorSouth + xMin) / 2, height / 2, (zMin + matouEast) / 2))
  // Décalé à droite pour qui le regarde (vers le mur des baies) : 10 cm entre son chambranle et ce mur.
  const closet = { x: xMin + 0.1 + 0.07 + 1, width: 2, height: 2.02, door: 0.5 }
  const closetWhite = standard(0xf6f6f3, 0.55)
  const closetShade = standard(0xe4e4e0, 0.6)
  const closetFace = matouEast - 0.012
  group.add(box(closet.width + 0.14, 0.07, 0.02, closetWhite, closet.x, closet.height + 0.035, matouEast - 0.01))
  for (const side of [-1, 1]) group.add(box(0.07, closet.height, 0.02, closetWhite, closet.x + side * (closet.width / 2 + 0.035), closet.height / 2, matouEast - 0.01))
  for (let door = 0; door < 4; door += 1) {
    const doorX = closet.x - closet.width / 2 + closet.door * (door + 0.5)
    group.add(box(closet.door - 0.008, closet.height - 0.01, 0.02, closetWhite, doorX, closet.height / 2, closetFace))
    // Les quatre panneaux en creux, entre le cadre et les traverses.
    for (let panel = 0; panel < 4; panel += 1) group.add(box(closet.door - 0.16, closet.height / 4 - 0.09, 0.004, closetShade, doorX, (closet.height / 4) * (panel + 0.5), closetFace - 0.011))
    // La poignée, du côté où la porte s'ouvre : au milieu pour les portes 2 et 3, vers le milieu aussi pour les deux du bord.
    const handleSide = door < 2 ? 1 : -1
    group.add(box(0.012, 0.14, 0.02, materials.lamp, doorX + handleSide * (closet.door / 2 - 0.045), 0.95, closetFace - 0.025))
  }
  // La cage de l'escalier sert aussi de buanderie : sa porte donne sur le sas.
  // Le mur entre elle et l'entrée (puis le sas) fait 5 cm : plein, percé de la porte, avec son seuil.
  const laundryWall = 0.05
  emptyRoom([ENTRY.northX + laundryWall, xMax, shellBack, zMax], standard(0x8f9296, 0.8), { south: [SAS.laundry] })
  solid('z', shellBack, zMax, ENTRY.northX, ENTRY.northX + laundryWall, [SAS.laundry], sill)
  // Le mur épais entre la salle de bain et la cuisine (30 cm), plein.
  // Il est plein sur toute son épaisseur, sauf derrière l'alcôve des WC, où il est en retrait de sa profondeur.
  const alcoveFrom = WC_ALCOVE.x - WC_ALCOVE.width / 2
  const alcoveTo = WC_ALCOVE.x + WC_ALCOVE.width / 2
  const thickWall = (from: number, to: number, setback: number) =>
    group.add(box(to - from - 0.002, height, KITCHEN.zMin - zMin - setback - 0.002, materials.wall, (from + to) / 2, height / 2, (KITCHEN.zMin + zMin + setback) / 2))
  thickWall(KITCHEN.xMin, alcoveFrom, 0)
  thickWall(alcoveFrom, alcoveTo, WC_ALCOVE.depth)
  // Le retrait ne vaut qu'à la hauteur de l'alcôve : au-dessus (jusqu'au plafond) et en dessous (jusqu'au sol), le mur est plein.
  const alcoveTop = WC_ALCOVE.bottom + WC_ALCOVE.height
  const alcoveZ = zMin + WC_ALCOVE.depth / 2
  group.add(box(WC_ALCOVE.width - 0.002, height - alcoveTop, WC_ALCOVE.depth, materials.wall, WC_ALCOVE.x, (height + alcoveTop) / 2, alcoveZ))
  group.add(box(WC_ALCOVE.width - 0.002, WC_ALCOVE.bottom, WC_ALCOVE.depth, materials.wall, WC_ALCOVE.x, WC_ALCOVE.bottom / 2, alcoveZ))
  thickWall(alcoveTo, xMax, 0)

  // Les murs extérieurs de la maison : 30 cm d'épaisseur, pleins (vus des deux côtés), posés juste derrière les pans intérieurs et percés
  // aux fenêtres et à la porte d'entrée. `axis` : le sens du mur ; `inner` : sa face intérieure ; `out` : de quel côté est le dehors.
  // Le crépi crème de la façade, le soubassement de pierre claire, et le blanc des appuis de fenêtre.
  const outerMaterial = standard(0xeadfc6, 0.9)
  const baseMaterial = standard(0xcbc7bd, 0.95)
  const sillMaterial = standard(0xf4f4f1, 0.6)
  const outer = (axis: 'x' | 'z', from: number, to: number, inner: number, out: 1 | -1, bays: { z: number; width: number; bottom: number; height: number }[] = []) => {
    const across = inner + out * (OUTER_WALL / 2 + 0.002)
    const piece = (start: number, end: number, bottom: number, top: number) => {
      if (end - start < 0.001 || top - bottom < 0.001) return
      const along = (start + end) / 2
      const middle = (bottom + top) / 2
      group.add(axis === 'z' ? box(OUTER_WALL, top - bottom, end - start, outerMaterial, across, middle, along) : box(end - start, top - bottom, OUTER_WALL, outerMaterial, along, middle, across))
    }
    // Dessous, le muret de soubassement, du terrain au sol de la maison : gris, en retrait du nu du mur, d'un seul tenant sous les baies.
    const baseThick = OUTER_WALL - BASE.setback
    const baseAcross = inner + out * (baseThick / 2 + 0.002)
    group.add(axis === 'z' ? box(baseThick, BASE.rise, to - from, baseMaterial, baseAcross, -BASE.rise / 2, (from + to) / 2) : box(to - from, BASE.rise, baseThick, baseMaterial, (from + to) / 2, -BASE.rise / 2, baseAcross))
    let cursor = from
    for (const bay of [...bays].sort((a, b) => a.z - b.z)) {
      const start = bay.z - bay.width / 2
      const end = bay.z + bay.width / 2
      piece(cursor, start, 0, height)
      piece(start, end, 0, bay.bottom)
      piece(start, end, bay.bottom + bay.height, height)
      // Sous chaque fenêtre, un appui blanc qui dépasse un peu du mur.
      if (bay.bottom > 0.3) {
        const sillAcross = inner + out * (OUTER_WALL + 0.02)
        group.add(axis === 'z' ? box(0.1, 0.04, bay.width + 0.1, sillMaterial, sillAcross, bay.bottom - 0.02, bay.z) : box(bay.width + 0.1, 0.04, 0.1, sillMaterial, bay.z, bay.bottom - 0.02, sillAcross))
      }
      cursor = end
    }
    piece(cursor, to, 0, height)
  }
  // L'ouest (chambres), le sud (chambre 2 et baies du salon), le nord (chambre 1, salle de bain, fenêtres de la cuisine, escalier), puis
  // l'est en trois morceaux : le mur du bureau, le mur de la porte d'entrée (en retrait : le carré du perron est dehors) et celui de l'escalier.
  outer('x', xMin - OUTER_WALL, xMax + OUTER_WALL, REST.west, -1, [GUEST_WINDOW])
  outer('z', REST.west, zMax + OUTER_WALL, xMin, -1, [
    MATOU_WINDOW,
    { z: bayDoor.z, width: bayDoor.width, bottom: 0.05, height: 2.15 },
    bayWindow,
    { z: LAYOUT.libraryWindow.z, width: 1, bottom: 1.05, height: 1.1 },
  ])
  outer('z', REST.west, zMax + OUTER_WALL, xMax, 1, [BATH_WINDOW, ...WINDOWS.z.map((z) => ({ z, width: WINDOWS.width, bottom: WINDOWS.bottom, height: WINDOWS.height })), NOOK_WINDOW])
  outer('x', xMin, ENTRY.x + 0.05, zMax, 1)
  // Le sas : l'avancée derrière la porte d'entrée. Ses murs intérieurs (la porte d'entrée à l'ouest, la porte de la buanderie au nord, la
  // porte du dehors au sud, la fenêtre à l'est), son plafond de lambris et son parquet (le même qu'au salon) ; puis ses trois murs extérieurs.
  const sasArea: [number, number, number, number] = [SAS.south, SAS.north, SAS.west, SAS.east]
  // Le mur de la porte d'entrée fait 5 cm : plein, percé de la porte, son pan côté sas posé sur sa face.
  const entryDoorGap: Gap = [ENTRY.doorX - ENTRY.doorWidth / 2, ENTRY.doorX + ENTRY.doorWidth / 2]
  gapped('x', SAS.south, SAS.north, SAS.west + 0.05, 1, [entryDoorGap])
  solid('x', SAS.south, SAS.north, SAS.west, SAS.west + 0.05, [entryDoorGap], sill)
  // Le mur nord : la porte de la buanderie, puis la niche des manteaux (le pan s'arrête à ses bords et reprend au-dessus).
  gapped('z', SAS.west, SAS.nook[0], SAS.north, -1, [SAS.laundry])
  wall('z', SAS.nook[0], SAS.nook[1], SAS.north, -1, SAS.nookTop)
  wall('z', SAS.nook[1], SAS.east, SAS.north, -1)
  gapped('z', zMax, SAS.east, SAS.south, 1, [SAS.door])
  pierced('x', SAS.south, SAS.north, SAS.east, -1, [SAS.window])
  slab(materials.lambris, height, false, [1, 1], sasArea)
  slab(materials.floor, -0.0005, true, [1, 1], sasArea)
  floors.push(sasArea)
  outer('x', SAS.south - OUTER_WALL, SAS.north + OUTER_WALL, SAS.east, 1, [SAS.window])
  outer('z', zMax + OUTER_WALL, SAS.east, SAS.south, -1, [{ z: (SAS.door[0] + SAS.door[1]) / 2, width: SAS.door[1] - SAS.door[0], bottom: 0, height: passage.top }])
  // Le mur extérieur nord est creusé par la niche : il n'en reste, derrière elle, qu'une peau de quelques centimètres.
  const nookMiddle = (SAS.nook[0] + SAS.nook[1]) / 2
  const nookWide = SAS.nook[1] - SAS.nook[0]
  outer('z', zMax + OUTER_WALL, SAS.east, SAS.north, 1, [{ z: nookMiddle, width: nookWide, bottom: 0, height: SAS.nookTop }])
  const skin = OUTER_WALL - SAS.nookDepth
  group.add(box(skin, SAS.nookTop, nookWide, outerMaterial, SAS.north + 0.002 + OUTER_WALL - skin / 2, SAS.nookTop / 2, nookMiddle))
  // Deux marches carrelées devant la porte du sas : le sol de la maison est plus haut que le terrain (côté baies, la terrasse est surélevée : `garden.ts`).
  const steps = (z: number, wide: number, wallX: number) => {
    // Carrelées de la même terre cuite que la terrasse (le motif d'un mètre est ramené à la taille du dessus de la marche).
    const tiles = terracottaTexture()
    tiles.repeat.set(0.3, wide)
    const tiled = standard(tiles, 0.85)
    for (const [index, tall] of [BASE.rise, BASE.rise / 2].entries()) group.add(box(0.3, tall, wide, tiled, wallX - OUTER_WALL - 0.15 - index * 0.3, tall / 2 - BASE.rise, z))
  }
  steps((SAS.door[0] + SAS.door[1]) / 2, SAS.door[1] - SAS.door[0] + 0.3, SAS.south)
  outer('x', ENTRY.northX + 0.01, xMax, zMax, 1)

  // L'entrée : une petite pièce à l'est du passage. Son mur du fond (celui de la porte), son mur nord, le dos du mur du frigo, et le mur plein qui
  // prolonge le claustra jusqu'au mur du bureau (vu des deux côtés).
  wall('x', ENTRY.x, ENTRY.northX, ENTRY.doorZ, -1)
  wall('z', entryBack, ENTRY.doorZ, ENTRY.northX, -1)
  wall('x', salonX, ENTRY.northX, entryBack, 1)
  group.add(box(0.12, height, zMax - ENTRY.wallZ, materials.wall, ENTRY.x, height / 2, (ENTRY.wallZ + zMax) / 2))

  // Les plinthes des murs épais (des pavés, vus des deux côtés) : le mur plein et le bar côté salon, le retour de mur du frigo, le mur qui
  // prolonge le claustra et le muret du claustra.
  // Côté salon, une seule plinthe pour le mur plein et le bar (au même nu), jusqu'à celle du bout du bar : elles se rejoignent à l'angle.
  skirting('z', zMin, barStart + PARTITION.bar + 0.02, salonX, -1)
  skirting('z', returnStart, entryBack, salonX, -1)
  skirting('z', returnStart, KITCHEN.zMax, KITCHEN.xMin, 1)
  for (const side of [-1, 1] as const) {
    skirting('z', ENTRY.claustraZ, zMax, ENTRY.x + 0.06 * side, side)
  }
  // Et sur l'épaisseur des murs, là où ils s'arrêtent : le bout du retour de mur du frigo (vers l'ouverture), son autre bout dans l'entrée,
  // et le bout du muret du claustra.
  skirting('x', salonX, KITCHEN.xMin, returnStart, -1)
  skirting('x', ENTRY.x - 0.06, ENTRY.x + 0.06, ENTRY.claustraZ, -1)

  group.add(parquet(floors))

  // Les poutres de chêne (12 cm) : au-dessus du bar et de l'ouverture, du poteau au mur du claustra, celle d'un mètre qui les relie, et celle
  // qui coupe le salon en deux, du poteau au mur des baies.
  const beamY = height - 0.06
  group.add(box(0.12, 0.12, returnStart - barStart, materials.beam, wallX, beamY, (barStart + returnStart) / 2))
  group.add(box(0.12, 0.12, ENTRY.wallZ - ENTRY.postZ, materials.beam, ENTRY.x, beamY, (ENTRY.postZ + ENTRY.wallZ) / 2))
  group.add(box(wallX - ENTRY.x, 0.12, 0.12, materials.beam, (wallX + ENTRY.x) / 2, beamY, ENTRY.postZ))
  group.add(box(ENTRY.x - xMin, 0.12, 0.12, materials.beam, (ENTRY.x + xMin) / 2, beamY, ENTRY.postZ))

  // Le carrelage métro de la crédence : quatre rangées de 7,5 cm au-dessus du plan, sur le fond et sur le mur des fenêtres (au-dessus de la file de droite).
  const tiled = (length: number, material: THREE.MeshStandardMaterial) => {
    const map = maps.tile.clone()
    map.needsUpdate = true
    map.repeat.set(length / 0.6, TILES.height / 0.6)
    material.map = map
    return new THREE.Mesh(new THREE.PlaneGeometry(length, TILES.height), material)
  }
  const tileBack = tiled(kitchenWidth, materials.tile.clone())
  tileBack.position.set((KITCHEN.xMin + KITCHEN.xMax) / 2, COUNTER_TOP + TILES.height / 2, KITCHEN.zMin + 0.003)
  const tileRight = tiled(2.5, materials.tile.clone())
  tileRight.rotation.y = -Math.PI / 2
  tileRight.position.set(xMax - 0.003, COUNTER_TOP + TILES.height / 2, KITCHEN.zMin + 1.25)
  group.add(tileBack, tileRight)

  group.add(shelf(materials, -0.85, 0.9))
  group.add(shelf(materials, 0.75, 1.1))
  for (const z of WINDOWS.z) group.add(windowAt(materials, z))

  // Le four à micro-ondes blanc, au bout du plan de travail côté fenêtres : porte vitrée sombre et bandeau de commandes vers la cuisine.
  const ovenX = xMax - 0.22
  const ovenZ = 1.02
  const ovenWhite = standard(0xf1f1ee, 0.45)
  group.add(box(0.36, 0.28, 0.48, ovenWhite, ovenX, COUNTER_TOP + 0.15, ovenZ))
  group.add(box(0.006, 0.2, 0.3, standard(0x1c1e21, 0.15, 0.3), ovenX - 0.183, COUNTER_TOP + 0.15, ovenZ - 0.06))
  group.add(box(0.006, 0.03, 0.07, standard(0x2a2d31, 0.4), ovenX - 0.183, COUNTER_TOP + 0.23, ovenZ + 0.17))
  group.add(box(0.012, 0.05, 0.05, standard(0xc9cbcc, 0.4, 0.3), ovenX - 0.186, COUNTER_TOP + 0.1, ovenZ + 0.17))
  // À sa gauche : le grille-pain chromé (deux fentes, sa grille relevée) puis la bouilloire rouge en poire sur son socle noir, anse et bouton noirs.
  const toasterZ = ovenZ - 0.4
  const chrome = standard(0xd5d8dc, 0.15, 0.9)
  const dark = standard(0x17181b, 0.5)
  group.add(box(0.26, 0.17, 0.16, chrome, ovenX - 0.02, COUNTER_TOP + 0.095, toasterZ), box(0.24, 0.01, 0.14, dark, ovenX - 0.02, COUNTER_TOP + 0.005, toasterZ))
  for (const slot of [-1, 1]) group.add(box(0.2, 0.004, 0.028, dark, ovenX - 0.02, COUNTER_TOP + 0.181, toasterZ + slot * 0.035))
  for (const side of [-1, 1]) group.add(box(0.004, 0.07, 0.004, chrome, ovenX - 0.02 + side * 0.09, COUNTER_TOP + 0.215, toasterZ))
  group.add(box(0.19, 0.004, 0.09, chrome, ovenX - 0.02, COUNTER_TOP + 0.25, toasterZ), box(0.012, 0.03, 0.03, dark, ovenX - 0.155, COUNTER_TOP + 0.12, toasterZ))
  const kettleX = ovenX - 0.03
  const kettleZ = toasterZ - 0.24
  const red = standard(0xa8202b, 0.3, 0.3)
  const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.085, 0.17, 24), red)
  kettle.position.set(kettleX, COUNTER_TOP + 0.105, kettleZ)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 24), dark)
  base.position.set(kettleX, COUNTER_TOP + 0.01, kettleZ)
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.047, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), chrome)
  lid.position.set(kettleX, COUNTER_TOP + 0.19, kettleZ)
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), dark)
  knob.position.set(kettleX, COUNTER_TOP + 0.245, kettleZ)
  const spout = box(0.05, 0.02, 0.025, red, kettleX + 0.075, COUNTER_TOP + 0.16, kettleZ)
  spout.rotation.z = 0.5
  group.add(kettle, base, lid, knob, spout)
  // À droite de la plaque : la grande planche à découper en bois clair, à rigole, au ras du bord du plan.
  const boardX = 0.47
  const boardZ = KITCHEN.zMin + CABINET.depth - 0.2
  const boardWood = standard(woodTexture(0xd9b98a, 67), 0.75)
  group.add(box(0.46, 0.018, 0.4, boardWood, boardX, COUNTER_TOP + 0.009, boardZ))
  const groove = standard(0xb89766, 0.85)
  for (const side of [-1, 1]) group.add(box(0.008, 0.002, 0.33, groove, boardX + side * 0.2, COUNTER_TOP + 0.0185, boardZ), box(0.4, 0.002, 0.008, groove, boardX, COUNTER_TOP + 0.0185, boardZ + side * 0.165))
  // Dans le coin du fond, côté fenêtres : un plateau de bois carré qui porte la lavande dans son pot gris et un panier d'osier aux bananes.
  const nookX = xMax - 0.24
  const nookZ = KITCHEN.zMin + 0.24
  const trayWood = standard(woodTexture(0xa87040, 83), 0.6)
  const osier = standard(0xc9a46a, 0.9)
  // Le fond est en retrait des rebords, et les rebords ne se chevauchent pas aux angles : deux faces au même endroit scintilleraient.
  group.add(box(0.36, 0.012, 0.36, trayWood, nookX, COUNTER_TOP + 0.007, nookZ))
  for (const side of [-1, 1]) group.add(box(0.38, 0.05, 0.012, trayWood, nookX, COUNTER_TOP + 0.0255, nookZ + side * 0.184), box(0.012, 0.048, 0.356, trayWood, nookX + side * 0.184, COUNTER_TOP + 0.0245, nookZ))
  const lavenderX = nookX + 0.1
  const lavenderZ = nookZ - 0.1
  const lavenderPot = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.1, 20), standard(0x6f747b, 0.8))
  lavenderPot.position.set(lavenderX, COUNTER_TOP + 0.062, lavenderZ)
  group.add(lavenderPot)
  const leafGreen = standard(0x3d6b3a, 0.8)
  const lavender = standard(0x8a6fc9, 0.8)
  const sprig = seeded(91)
  for (let stem = 0; stem < 9; stem += 1) {
    const turn = sprig() * Math.PI * 2
    const lean = 0.1 + sprig() * 0.35
    const tall = 0.14 + sprig() * 0.1
    const holder = new THREE.Group()
    holder.position.set(lavenderX, COUNTER_TOP + 0.11, lavenderZ)
    holder.rotation.set(Math.cos(turn) * lean, 0, Math.sin(turn) * lean)
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, tall, 5), leafGreen)
    stalk.position.y = tall / 2
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.02, tall * 0.7, 5), leafGreen)
    leaf.position.y = tall * 0.35
    const flower = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.07, 7), lavender)
    flower.position.y = tall + 0.03
    holder.add(stalk, leaf, flower)
    group.add(holder)
  }
  const basketX = nookX - 0.06
  const basketZ = nookZ + 0.06
  group.add(box(0.2, 0.012, 0.18, osier, basketX, COUNTER_TOP + 0.022, basketZ))
  for (const side of [-1, 1]) group.add(box(0.232, 0.07, 0.012, osier, basketX, COUNTER_TOP + 0.055, basketZ + side * 0.1), box(0.012, 0.068, 0.186, osier, basketX + side * 0.11, COUNTER_TOP + 0.054, basketZ))
  const banana = standard(0xe8c63a, 0.6)
  for (const [turn, dz] of [[0.3, -0.02], [-0.2, 0.03]]) {
    const fruit = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.12, 4, 8), banana)
    fruit.rotation.set(0, turn, Math.PI / 2)
    fruit.position.set(basketX, COUNTER_TOP + 0.05, basketZ + dz)
    group.add(fruit)
  }
  // Le coin du plan de travail, entre le mur du bar et le mur du fond. Le long du mur du bar : le bloc à couteaux en bambou (cinq manches
  // d'inox), le présentoir incliné de douze pots à épices sur son tapis noir, puis le rouleau d'essuie-tout debout dans son plateau vert.
  // Contre le mur du fond : le pot carré en bambou des ustensiles (fouet, spatule grise, écumoire).
  const cornerX = KITCHEN.xMin + PARTITION.ledge
  const cornerZ = KITCHEN.zMin
  const bamboo = standard(woodTexture(0xc9995a, 71), 0.6)
  const inox = standard(0xb9bcc0, 0.3, 0.8)
  group.add(box(0.3, 0.003, 0.42, dark, cornerX + 0.19, COUNTER_TOP + 0.0015, cornerZ + 0.27))
  const block = box(0.1, 0.2, 0.16, bamboo, cornerX + 0.1, COUNTER_TOP + 0.1, cornerZ + 0.11)
  block.rotation.z = 0.22
  group.add(block)
  for (let knife = 0; knife < 5; knife += 1) {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.11 - knife * 0.01, 10), inox)
    handle.position.set(cornerX + 0.07, COUNTER_TOP + 0.245 - knife * 0.008, cornerZ + 0.05 + knife * 0.03)
    handle.rotation.z = 0.22
    group.add(handle)
  }
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.09, 12), inox)
      jar.rotation.z = Math.PI / 2 + 0.35
      jar.position.set(cornerX + 0.166 - row * 0.018, COUNTER_TOP + 0.04 + row * 0.052, cornerZ + 0.2 + column * 0.052)
      group.add(jar)
    }
  }
  const trayGreen = standard(0x6f8f1e, 0.6)
  const towelZ = cornerZ + 0.62
  group.add(box(0.2, 0.012, 0.26, trayGreen, cornerX + 0.14, COUNTER_TOP + 0.006, towelZ))
  for (const side of [-1, 1]) group.add(box(0.2, 0.04, 0.01, trayGreen, cornerX + 0.14, COUNTER_TOP + 0.02, towelZ + side * 0.125), box(0.01, 0.04, 0.26, trayGreen, cornerX + 0.14 + side * 0.095, COUNTER_TOP + 0.02, towelZ))
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.23, 24), standard(0xf4f4f1, 0.95))
  roll.position.set(cornerX + 0.14, COUNTER_TOP + 0.127, towelZ)
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.232, 12), standard(0xb8946a, 0.9))
  core.position.copy(roll.position)
  group.add(roll, core)
  const potX = cornerX + 0.5
  const potZ = cornerZ + 0.11
  group.add(box(0.11, 0.14, 0.11, bamboo, potX, COUNTER_TOP + 0.07, potZ))
  const whisk = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc4c7cb, metalness: 0.8, roughness: 0.3, wireframe: true }))
  whisk.scale.y = 1.9
  whisk.position.set(potX - 0.025, COUNTER_TOP + 0.26, potZ - 0.01)
  group.add(whisk, box(0.012, 0.12, 0.012, inox, potX - 0.025, COUNTER_TOP + 0.16, potZ - 0.01))
  group.add(box(0.05, 0.07, 0.006, standard(0x4a5560, 0.6), potX + 0.025, COUNTER_TOP + 0.24, potZ), box(0.006, 0.1, 0.006, inox, potX + 0.025, COUNTER_TOP + 0.17, potZ))
  const skimmer = box(0.006, 0.2, 0.006, inox, potX + 0.07, COUNTER_TOP + 0.2, potZ + 0.01)
  skimmer.rotation.z = -0.6
  group.add(skimmer)
  // L'anse, côté cuisine : un arc noir du haut au bas du corps.
  group.add(box(0.012, 0.13, 0.018, dark, kettleX - 0.115, COUNTER_TOP + 0.11, kettleZ), box(0.06, 0.012, 0.018, dark, kettleX - 0.085, COUNTER_TOP + 0.175, kettleZ), box(0.04, 0.012, 0.018, dark, kettleX - 0.097, COUNTER_TOP + 0.045, kettleZ))

  // La suspension noire au-dessus du passage de la cuisine, avec son câble jusqu'au plafond.
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.26, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), materials.lamp)
  dome.position.set(0, 1.85, 0.1)
  const light = fixtureBulb(bulbBall(0.07, 0, 1.9, 0.1), 'cuisine 1')
  const cord = box(0.01, height - 2.1, 0.01, materials.lamp, 0, 2.1 + (height - 2.1) / 2, 0.1)
  group.add(dome, light, cord)
  return group
}

/** La scène : la pièce, les trois files de caissons, l'évier, la plaque et la hotte. */
export const buildScene = (): SceneParts => {
  const maps = mapsOf()
  const materials = materialsOf(maps)
  const root = new THREE.Group()
  const hoodParts = new THREE.Group()
  root.add(room(materials, maps), buildFurniture(), buildGarden())
  for (const spec of RUNS) root.add(run(materials, spec, hoodParts))
  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.isMesh) {
      mesh.castShadow = mesh.userData.fixture !== true
      mesh.receiveShadow = true
    }
  })
  return { root, hood: hoodParts }
}
