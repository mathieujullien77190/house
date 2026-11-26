import * as THREE from 'three'
import { CABINET, COLORS, COUNTER_TOP, ENTRY, FRIDGE_WALL, HOB, HOOD, KITCHEN, LAYOUT, NICHES, PARTITION, ROOM, RUNS, SINK, SPLASH, TILES, WINDOWS, WORKTOP } from './constants'
import { buildFurniture } from './furniture'
import { box, canvasTexture, fixtureBulb, seeded, standard } from './primitives'
import type { ModuleSpec, RunSpec, SceneParts } from './types'

/** Le parquet : de larges lames de chêne clair (19 cm sur 96 cm), décalées d'une rangée à l'autre, séparées par un joint fin. Une image couvre 96 cm. */
export const parquetTexture = (): THREE.CanvasTexture =>
  canvasTexture(512, (ctx) => {
    const rand = seeded(11)
    const rows = 5
    const rowHeight = 512 / rows
    for (let row = 0; row < rows; row += 1) {
      const offset = rand() * 512
      const tone = `hsl(${30 + rand() * 4}, ${44 + rand() * 8}%, ${56 + rand() * 7}%)`
      const joint = offset + 512 * (0.55 + rand() * 0.3)
      // Deux lames par rangée, dessinées aussi décalées d'une image pour que la texture se raccorde.
      for (const [start, length, color] of [
        [offset, joint - offset, tone],
        [joint, 512 + offset - joint, `hsl(${30 + rand() * 4}, ${44 + rand() * 8}%, ${56 + rand() * 7}%)`],
      ] as [number, number, string][]) {
        for (const shift of [0, -512, 512]) {
          const left = start + shift
          ctx.fillStyle = color
          ctx.fillRect(left, row * rowHeight, length, rowHeight)
          ctx.globalAlpha = 0.14
          ctx.strokeStyle = '#6b4220'
          ctx.lineWidth = 1
          for (let line = 0; line < 6; line += 1) {
            const y = row * rowHeight + 8 + rand() * (rowHeight - 16)
            ctx.beginPath()
            ctx.moveTo(left, y)
            ctx.bezierCurveTo(left + length * 0.3, y + (rand() - 0.5) * 8, left + length * 0.7, y + (rand() - 0.5) * 8, left + length, y)
            ctx.stroke()
          }
          ctx.globalAlpha = 0.5
          ctx.strokeStyle = '#7a5a36'
          ctx.lineWidth = 2
          ctx.strokeRect(left, row * rowHeight, length, rowHeight)
          ctx.globalAlpha = 1
        }
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
const mapsOf = () => ({ lambris: lambrisTexture(), tile: tileTexture(), floor: parquetTexture() })

type Maps = ReturnType<typeof mapsOf>

/** Les matériaux de la cuisine, créés une fois par scène. */
const materialsOf = (maps: Maps) => ({
  lambris: standard(maps.lambris, 0.85),
  plaster: standard(0xf7f5f1, 0.95),
  beam: standard(COLORS.beam, 0.6),
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
  floor: standard(maps.floor, 0.55),
  shelf: standard(COLORS.shelf, 0.6),
  bracket: standard(COLORS.bracket, 0.6),
  windowFrame: standard(COLORS.window, 0.5),
  blind: standard(COLORS.blind, 0.9),
  glass: new THREE.MeshStandardMaterial({ color: COLORS.glass, roughness: 0.1, transparent: true, opacity: 0.45 }),
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

/** Le casier à bouteilles : un bloc blanc ouvert vers le bout de la file (côté -x), cinq casiers superposés avec une bouteille au fond de chacun. */
const wineRack = (materials: Materials, width: number): THREE.Group => {
  const group = new THREE.Group()
  const { depth, plinth, body, front: frontDepth } = CABINET
  const inner = depth - frontDepth
  group.add(box(width, plinth, depth - 0.07, materials.plinth, 0, plinth / 2, -0.05 - (depth - 0.07) / 2))
  // Le dessus, le dessous, le fond (côté +x) et quatre étagères.
  const levels = 5
  const step = body / levels
  for (let level = 0; level <= levels; level += 1) {
    group.add(box(width, 0.012, inner, materials.rack, 0, plinth + level * step, -frontDepth - inner / 2))
  }
  group.add(box(0.012, body, inner, materials.rack, width / 2 - 0.006, plinth + body / 2, -frontDepth - inner / 2))
  // Le côté qui regarde l'allée est fermé par une façade.
  group.add(front(materials, width - CABINET.gap, body - CABINET.gap, 0, plinth + body / 2))
  for (let level = 0; level < levels; level += 1) {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.3, 14), materials.bottle)
    bottle.rotation.x = Math.PI / 2
    bottle.position.set(0, plinth + step * (level + 0.5) - 0.02, -0.25)
    group.add(bottle)
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

/** Une fenêtre blanche dans le mur de droite, son store enroulable crème à moitié descendu. */
const windowAt = (materials: Materials, z: number): THREE.Group => {
  const group = new THREE.Group()
  const { width, height, bottom } = WINDOWS
  const bar = 0.05
  const depth = 0.07
  group.position.set(ROOM.xMax - depth / 2, bottom + height / 2, z)
  for (const side of [-1, 1]) {
    group.add(box(depth, bar, width, materials.windowFrame, 0, (height / 2 - bar / 2) * side, 0))
    group.add(box(depth, height - bar * 2, bar, materials.windowFrame, 0, 0, (width / 2 - bar / 2) * side))
  }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width - bar * 2, height - bar * 2), materials.glass)
  glass.rotation.y = -Math.PI / 2
  group.add(glass)
  const blindHeight = (height - bar * 2) * 0.8
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
  const width = xMax - xMin
  const depth = zMax - zMin
  const centerX = (xMin + xMax) / 2
  const centerZ = (zMin + zMax) / 2
  const wall = (axis: 'x' | 'z', from: number, to: number, at: number, facing: 1 | -1, bottom = 0, top = height) =>
    group.add(wallPane(materials.wall, axis, from, to, at, facing, bottom, top))
  // Entre la cuisine et le salon : le milieu de l'épaisseur du mur, sa face côté salon, et l'endroit où le mur plein laisse la place au bar.
  const wallX = KITCHEN.xMin - PARTITION.thickness / 2
  const salonX = KITCHEN.xMin - PARTITION.thickness
  const barStart = zMin + PARTITION.wall
  const returnStart = KITCHEN.zMax - FRIDGE_WALL.length

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), materials.floor)
  floor.rotation.x = -Math.PI / 2
  floor.position.set(centerX, 0, centerZ)
  maps.floor.repeat.set(width / 0.96, depth / 0.96)
  group.add(floor)

  // Les murs du salon : la télé (ouest), les baies (sud), le bureau (est, jusqu'au mur de l'entrée).
  wall('x', xMin, salonX, zMin, 1)
  wall('z', zMin, zMax, xMin, 1)
  wall('x', xMin, ENTRY.x, zMax, -1)
  // Les murs de la cuisine : la hotte (ouest, 30 cm plus à l'est que le mur de la télé) et les fenêtres (nord).
  wall('x', KITCHEN.xMin, KITCHEN.xMax, KITCHEN.zMin, 1)
  wall('z', KITCHEN.zMin, KITCHEN.zMax, xMax, -1)

  // Le plafond : du lambris blanc (lames de 10 cm), et la plaque de plâtre lisse de la cuisine juste en dessous.
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), materials.lambris)
  ceiling.rotation.x = Math.PI / 2
  ceiling.position.set(centerX, height, centerZ)
  maps.lambris.repeat.set(width, depth)
  const kitchenWidth = KITCHEN.xMax - KITCHEN.xMin
  const kitchenDepth = KITCHEN.zMax - KITCHEN.zMin
  const plaster = new THREE.Mesh(new THREE.PlaneGeometry(kitchenWidth, kitchenDepth), materials.plaster)
  plaster.rotation.x = Math.PI / 2
  plaster.position.set((KITCHEN.xMin + KITCHEN.xMax) / 2, height - 0.002, (KITCHEN.zMin + KITCHEN.zMax) / 2)
  group.add(ceiling, plaster)

  // Les plinthes en chêne : le mur de la télé (jusqu'à la porte), la façade des baies, le mur du bureau et le mur des fenêtres après les caissons.
  const skirting = (length: number, x: number, z: number, alongX: boolean) =>
    group.add(box(alongX ? length : 0.016, 0.08, alongX ? 0.016 : length, materials.beam, x, 0.04, z))
  const doorEdge = LAYOUT.door.x - LAYOUT.door.width / 2
  skirting(doorEdge - xMin, (xMin + doorEdge) / 2, zMin + 0.008, true)
  skirting(depth, xMin + 0.008, centerZ, false)
  skirting(ENTRY.x - xMin, (xMin + ENTRY.x) / 2, zMax - 0.008, true)
  skirting(KITCHEN.zMax - 1.3, xMax - 0.008, (1.3 + KITCHEN.zMax) / 2, false)

  // Entre la cuisine et le salon : le mur plein (1,58 m), le bar (un muret, du lambris bleu côté salon, une tablette en bois qui dépasse côté
  // salon), l'ouverture, puis le retour de mur à droite du frigo.
  group.add(box(PARTITION.thickness, height, PARTITION.wall, materials.wall, wallX, height / 2, zMin + PARTITION.wall / 2))
  group.add(box(PARTITION.thickness, PARTITION.height, PARTITION.bar, materials.wall, wallX, PARTITION.height / 2, barStart + PARTITION.bar / 2))
  group.add(box(0.02, PARTITION.height, PARTITION.bar, materials.door, salonX - 0.01, PARTITION.height / 2, barStart + PARTITION.bar / 2))
  group.add(box(PARTITION.topWidth, 0.04, PARTITION.bar + 0.04, materials.shelf, wallX - 0.05, PARTITION.height + 0.02, barStart + PARTITION.bar / 2 + 0.02))
  group.add(box(PARTITION.thickness, height, FRIDGE_WALL.length + 0.05, materials.wall, wallX, height / 2, returnStart + (FRIDGE_WALL.length + 0.05) / 2))

  // Le mur de l'escalier, côté cuisine : des pans pleins entre les deux niches (le cellier, le comptoir à verres) et des linteaux au-dessus.
  let cursor = salonX
  for (const niche of [...NICHES].sort((a, b) => a.x - b.x)) {
    wall('z', cursor, niche.x - niche.width / 2, KITCHEN.zMax, -1)
    wall('z', niche.x - niche.width / 2, niche.x + niche.width / 2, KITCHEN.zMax, -1, niche.height)
    cursor = niche.x + niche.width / 2
    // L'intérieur de la niche : le fond, les deux joues et le plafond (le cellier est plus large que son ouverture).
    const middle = KITCHEN.zMax + niche.depth / 2
    group.add(box(niche.inner, niche.height, 0.02, materials.wall, niche.x, niche.height / 2, KITCHEN.zMax + niche.depth))
    for (const side of [-1, 1]) group.add(box(0.02, niche.height, niche.depth, materials.wall, niche.x + (niche.inner / 2 + 0.01) * side, niche.height / 2, middle))
    group.add(box(niche.inner, 0.02, niche.depth, materials.wall, niche.x, niche.height + 0.01, middle))
  }
  wall('z', cursor, KITCHEN.xMax, KITCHEN.zMax, -1)

  // L'entrée : une petite pièce à l'est du passage. Son mur du fond (celui de la porte), son mur nord, le dos du mur du frigo, et le mur plein qui
  // prolonge le claustra jusqu'au mur du bureau (vu des deux côtés).
  wall('z', ENTRY.x, ENTRY.northX, ENTRY.doorZ, -1)
  wall('x', KITCHEN.zMax, ENTRY.doorZ, ENTRY.northX, -1)
  wall('z', salonX, ENTRY.northX, KITCHEN.zMax + 0.05, 1)
  group.add(box(0.05, height, zMax - ENTRY.wallZ, materials.wall, ENTRY.x, height / 2, (ENTRY.wallZ + zMax) / 2))

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

  // La suspension noire au-dessus du passage de la cuisine, avec son câble jusqu'au plafond.
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.26, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), materials.lamp)
  dome.position.set(0, 1.85, 0.1)
  const light = fixtureBulb(new THREE.Mesh(new THREE.CircleGeometry(0.22, 32)))
  light.rotation.x = Math.PI / 2
  light.position.set(0, 1.852, 0.1)
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
  root.add(room(materials, maps), buildFurniture())
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
