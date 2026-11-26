import * as THREE from 'three'
import { HOUSE_SHIFT, PLAN_CAGE, PLAN_GARAGE_CORNERS, PLAN_GATES, UNITS_PER_METER } from '@/components/Lights/constants'
import { BASE, ENTRY, OUTER_WALL, REST, ROOM, SAS } from './constants'
import { box, canvasTexture, cylinder, seeded, standard, woodTexture } from './primitives'

/** Un point du plan de Home (unités du plan : x vers l'est, y vers le sud). */
type PlanPoint = [number, number]

/**
 * La maison sur le plan de Home : son bord ouest (elle y est poussée de `HOUSE_SHIFT`), sa largeur et sa hauteur, en unités du plan. Le
 * terrain y est dessiné à 39 unités le mètre (`UNITS_PER_METER` : un rayon de 1014 unités pour 26 m, une bande de 78 pour 2 m, une terrasse
 * de 58,5 pour 1,50 m) : c'est cette échelle qui donne au jardin sa vraie taille.
 */
const PLAN = { west: HOUSE_SHIFT, width: 540, height: 300 }
/** La cage à perruches, en vrai : 4 panneaux de 85 cm sur 6 (m). Son coin nord-ouest est celui du plan. */
const CAGE = { width: 4 * 0.85, depth: 6 * 0.85 }
/** Le terrain : un quart de cercle de 1014 unités autour de ce centre (l'arc côté rue, au sud-ouest), plus une bande au nord jusqu'à `north`. */
const LOT = { centerX: 700, centerY: -190, radius: 1014, north: -268, east: 700 }
/** La haie court à 14 unités en dedans de la limite : sur l'arc, sur le bord ouest et nord de la bande du haut, et sur le bord est. */
const HEDGE = { radius: 1000, west: -300, north: -254, east: 686, height: 1.5, thickness: 0.5 }
/** Le pavage : à l'est de la maison jusqu'à la limite, du bas de la cage jusqu'au sud de la terrasse ; et le chemin du portillon. */
const PAVING = { south: 358, pathWest: 498, pathEast: 556, pathEnd: 800, pathEndWest: 789 }
/** La terrasse qui fait le tour de la maison (m). */
const TERRACE = 1.5
/** La hauteur de la cage à perruches et du portail (m). */
const CAGE_HEIGHT = 2.2
const GATE_HEIGHT = 1.4

/**
 * D'une abscisse du plan à la place d'ouest en est dans la scène (z). Sous la maison, le plan est ramené aux murs de la scène (elle y est
 * un peu moins large que sur le plan) ; dehors, il est à l'échelle, compté depuis le mur le plus proche.
 */
export const gardenZ = (planX: number): number => {
  const east = PLAN.west + PLAN.width
  if (planX < PLAN.west) return REST.west - (PLAN.west - planX) / UNITS_PER_METER
  if (planX > east) return ROOM.zMax + (planX - east) / UNITS_PER_METER
  return REST.west + ((planX - PLAN.west) / PLAN.width) * (ROOM.zMax - REST.west)
}

/** D'une ordonnée du plan à la place du nord au sud dans la scène (x, qui croît vers le nord) : même principe que `gardenZ`. */
export const gardenX = (planY: number): number => {
  if (planY < 0) return ROOM.xMax - planY / UNITS_PER_METER
  if (planY > PLAN.height) return ROOM.xMin - (planY - PLAN.height) / UNITS_PER_METER
  return ROOM.xMax - (planY / PLAN.height) * (ROOM.xMax - ROOM.xMin)
}

/**
 * Le carrelage du dehors : des carreaux de terre cuite clairs, rectangulaires (25 × 12,5 cm, deux fois plus longs que larges), posés en
 * damier de paires : deux carreaux couchés, puis deux debout, et ainsi de suite. D'un orangé presque uni, avec un joint fin et sombre.
 * Une image couvre 1 m (les surfaces à plat ont leurs coordonnées en mètres : le motif s'y répète tout seul).
 */
export const terracottaTexture = (): THREE.CanvasTexture =>
  canvasTexture(512, (ctx) => {
    const rand = seeded(17)
    const unit = 512 / 4
    const joint = 4
    ctx.fillStyle = '#4a3a30'
    ctx.fillRect(0, 0, 512, 512)
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        // Chaque case porte deux carreaux : couchés l'un sur l'autre, ou debout côte à côte, en alternance.
        const lying = (row + column) % 2 === 0
        for (const half of [0, 1]) {
          ctx.fillStyle = `hsl(${24 + rand() * 3}, ${62 + rand() * 6}%, ${63 + rand() * 4}%)`
          const x = column * unit + (lying ? 0 : (half * unit) / 2)
          const y = row * unit + (lying ? (half * unit) / 2 : 0)
          ctx.fillRect(x + joint / 2, y + joint / 2, (lying ? unit : unit / 2) - joint, (lying ? unit / 2 : unit) - joint)
        }
      }
    }
  })

/** Les points d'un arc du plan, centré sur le centre du terrain, d'un point à l'autre (ses deux bouts compris), un tous les 60 unités environ. */
const arc = (radius: number, from: PlanPoint, to: PlanPoint): PlanPoint[] => {
  const angle = ([x, y]: PlanPoint) => Math.atan2(y - LOT.centerY, x - LOT.centerX)
  const start = angle(from)
  const end = angle(to)
  const steps = Math.max(1, Math.ceil((Math.abs(end - start) * radius) / 60))
  return Array.from({ length: steps + 1 }, (_, index) => {
    const turn = start + ((end - start) * index) / steps
    return [LOT.centerX + radius * Math.cos(turn), LOT.centerY + radius * Math.sin(turn)]
  })
}

/** Une surface à plat sur le sol, donnée par son contour sur le plan. */
const flat = (points: PlanPoint[], material: THREE.Material, y: number): THREE.Mesh => {
  // Dans le repère de la forme : (x de la scène, −z de la scène) ; couchée d'un quart de tour, elle retombe à sa place.
  const shape = new THREE.Shape(points.map(([planX, planY]) => new THREE.Vector2(gardenX(planY), -gardenZ(planX))))
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = y
  return mesh
}

/** Un pavé couché le long d'une ligne du plan (une haie, un portail) : un tronçon par segment. */
const along = (points: PlanPoint[], material: THREE.Material, height: number, thickness: number): THREE.Mesh[] =>
  points.slice(1).map((point, index) => {
    const [fromX, fromZ] = [gardenX(points[index][1]), gardenZ(points[index][0])]
    const [toX, toZ] = [gardenX(point[1]), gardenZ(point[0])]
    const piece = box(thickness, height, Math.hypot(toX - fromX, toZ - fromZ) + thickness / 2, material, (fromX + toX) / 2, height / 2, (fromZ + toZ) / 2)
    piece.rotation.y = Math.atan2(toX - fromX, toZ - fromZ)
    return piece
  })

/**
 * Le jardin, d'après le plan de Home : la pelouse (un quart de cercle, l'arc côté rue, plus une bande au nord), la terrasse autour de la
 * maison et le perron, le pavage à l'est et le chemin du portillon, l'allée de béton du portail, la haie sur la limite (ouverte au portail,
 * au portillon et à droite de la cage), le portail et le portillon, la cage à perruches et les poubelles. Pas d'arbres.
 */
export const buildGarden = (): THREE.Group => {
  const group = new THREE.Group()
  // Le terrain est plus bas que le sol de la maison, qui est surélevée.
  group.position.y = -BASE.rise
  const grass = standard(0x6f9a4a, 1, 0, THREE.DoubleSide)
  // Dehors, tout ce qui est carrelé (la terrasse, le pavage, le sol de la cage, le chemin du portillon) l'est en terre cuite.
  const terrace = standard(terracottaTexture(), 0.85, 0, THREE.DoubleSide)
  const paving = terrace
  const concrete = standard(0xb9b9b4, 0.9, 0, THREE.DoubleSide)
  const hedge = standard(0x2f5a2c, 1)
  const iron = standard(0x2a2d31, 0.6, 0.4)

  // La pelouse : la bande du nord, puis l'arc du coin nord-ouest au coin sud-est.
  const lawn: PlanPoint[] = [[LOT.east, LOT.north], [LOT.centerX - LOT.radius, LOT.north], ...arc(LOT.radius, [LOT.centerX - LOT.radius, LOT.centerY], [LOT.centerX, LOT.centerY + LOT.radius])]
  group.add(flat(lawn, grass, -0.02))

  // La terrasse : une bande autour de la maison (murs compris), trouée de la maison elle-même ; et le perron, devant la porte d'entrée.
  const house: [number, number, number, number] = [ROOM.xMin - OUTER_WALL, ROOM.xMax + OUTER_WALL, REST.west - OUTER_WALL, ROOM.zMax + OUTER_WALL]
  const around = new THREE.Shape([
    new THREE.Vector2(house[0] - TERRACE, -(house[2] - TERRACE)),
    new THREE.Vector2(house[1] + TERRACE, -(house[2] - TERRACE)),
    new THREE.Vector2(house[1] + TERRACE, -(house[3] + TERRACE)),
    new THREE.Vector2(house[0] - TERRACE, -(house[3] + TERRACE)),
  ])
  around.holes.push(new THREE.Path([new THREE.Vector2(house[0], -house[2]), new THREE.Vector2(house[1], -house[2]), new THREE.Vector2(house[1], -house[3]), new THREE.Vector2(house[0], -house[3])]))
  const band = new THREE.Mesh(new THREE.ShapeGeometry(around), terrace)
  band.rotation.x = -Math.PI / 2
  band.position.y = -0.004
  group.add(band)
  const porchFrom = ENTRY.doorZ + OUTER_WALL
  group.add(box(ENTRY.northX - ENTRY.x - 0.06, 0.004, house[3] - porchFrom, terrace, (ENTRY.northX + ENTRY.x + 0.06) / 2, -0.006, (house[3] + porchFrom) / 2))

  // Le pavage : à l'est de la maison, du bas de la cage au sud de la terrasse ; le sol de la cage ; le chemin du portillon.
  // Le bas et le bord est de la cage, en unités du plan, d'après sa vraie taille.
  const cageSouth = PLAN_CAGE.y + CAGE.depth * UNITS_PER_METER
  const cageEast = PLAN_CAGE.x + CAGE.width * UNITS_PER_METER
  const east = PLAN.west + PLAN.width
  group.add(flat([[east, cageSouth], [LOT.east, cageSouth], [LOT.east, PAVING.south], [east, PAVING.south]], paving, -0.008))
  group.add(flat([[PLAN_CAGE.x, PLAN_CAGE.y], [cageEast, PLAN_CAGE.y], [cageEast, cageSouth], [PLAN_CAGE.x, cageSouth]], paving, -0.008))
  group.add(flat([[PAVING.pathWest, PAVING.south], [PAVING.pathEast, PAVING.south], [PAVING.pathEast, PAVING.pathEnd], [PAVING.pathWest, PAVING.pathEndWest]], paving, -0.008))
  // L'allée de béton, du portail à la terrasse.
  group.add(flat(PLAN_GARAGE_CORNERS, concrete, -0.012))

  // La haie : l'arc en trois morceaux (il s'ouvre au portail et au portillon), le bord ouest et nord de la bande du haut, le bord est sous la cage.
  const [gate, wicket] = PLAN_GATES
  const cornerNorthWest: PlanPoint = [HEDGE.west, LOT.centerY]
  const lines: PlanPoint[][] = [
    arc(HEDGE.radius, cornerNorthWest, [gate.x1, gate.y1]),
    arc(HEDGE.radius, [gate.x2, gate.y2], [wicket.x2, wicket.y2]),
    arc(HEDGE.radius, [wicket.x1, wicket.y1], [LOT.east, LOT.centerY + HEDGE.radius]),
    [cornerNorthWest, [HEDGE.west, HEDGE.north], [HEDGE.east, HEDGE.north]],
    [[HEDGE.east, cageSouth], [HEDGE.east, LOT.centerY + HEDGE.radius]],
  ]
  for (const line of lines) group.add(...along(line, hedge, HEDGE.height, HEDGE.thickness))
  // L'allée du portillon est bordée de deux murets de béton bas, de la terrasse jusqu'au portillon, lui-même entre deux piliers de pierre claire.
  const wall = standard(0xa9a79f, 0.95)
  group.add(...along([[PAVING.pathWest, PAVING.south + 4], [PAVING.pathWest, PAVING.pathEndWest - 6]], wall, 0.4, 0.15), ...along([[PAVING.pathEast, PAVING.south + 4], [PAVING.pathEast, PAVING.pathEnd - 6]], wall, 0.4, 0.15))
  const pillar = standard(0xd9d5cb, 0.9)
  for (const [planX, planY] of [[wicket.x1, wicket.y1], [wicket.x2, wicket.y2]]) group.add(box(0.3, 1.6, 0.3, pillar, gardenX(planY), 0.8, gardenZ(planX)))
  // Le portail et le portillon, en fer sombre.
  for (const door of PLAN_GATES) group.add(...along([[door.x1, door.y1], [door.x2, door.y2]], iron, GATE_HEIGHT, 0.06))

  // La cage à perruches : des poteaux, une ceinture en haut, et du grillage (des pans gris à peine opaques) sur les quatre côtés et le dessus.
  const [cageX1, cageX2] = [gardenX(cageSouth), gardenX(PLAN_CAGE.y)]
  const [cageZ1, cageZ2] = [gardenZ(PLAN_CAGE.x), gardenZ(cageEast)]
  const mesh = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.6, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
  const post = standard(woodTexture(0xb5683c, 131), 0.8)
  const cageWidth = cageZ2 - cageZ1
  const cageDepth = cageX2 - cageX1
  const middleX = (cageX1 + cageX2) / 2
  const middleZ = (cageZ1 + cageZ2) / 2
  for (const x of [cageX1, middleX, cageX2]) for (const z of [cageZ1, cageZ2]) group.add(box(0.08, CAGE_HEIGHT, 0.08, post, x, CAGE_HEIGHT / 2, z))
  for (const z of [cageZ1, cageZ2]) group.add(box(cageDepth, 0.06, 0.06, post, middleX, CAGE_HEIGHT, z), box(cageDepth, CAGE_HEIGHT, 0.01, mesh, middleX, CAGE_HEIGHT / 2, z))
  for (const x of [cageX1, cageX2]) group.add(box(0.06, 0.06, cageWidth, post, x, CAGE_HEIGHT, middleZ), box(0.01, CAGE_HEIGHT, cageWidth, mesh, x, CAGE_HEIGHT / 2, middleZ))
  group.add(box(cageDepth, 0.01, cageWidth, mesh, middleX, CAGE_HEIGHT + 0.03, middleZ))

  // Les quatre poubelles à roulettes, sur le pavage : une grise à couvercle marron, deux grises à
  // couvercle jaune, une vert sombre.
  const grey = standard(0x7f8388, 0.7)
  const bins: [number, number][] = [
    [0x7f8388, 0x7a5540],
    [0x7f8388, 0xe6cf3a],
    [0x7f8388, 0xe6cf3a],
    [0x2c3a33, 0x2c3a33],
  ]
  // En rang d'ouest en est, le dos au bord sud du pavage, poussées contre la haie de l'est.
  const binX = gardenX(PAVING.south) + 0.4
  const binEnd = gardenZ(HEDGE.east) - HEDGE.thickness / 2 - 0.35
  bins.forEach(([body, lid], index) => {
    const z = binEnd - index * 0.62
    group.add(box(0.56, 0.9, 0.5, body === 0x7f8388 ? grey : standard(body, 0.7), binX, 0.55, z), box(0.62, 0.06, 0.54, standard(lid, 0.6), binX + 0.02, 1.03, z))
    for (const side of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 14), iron)
      wheel.rotation.x = Math.PI / 2
      wheel.position.set(binX - 0.22, 0.09, z + side * 0.23)
      group.add(wheel)
    }
  })
  // Une surface carrelée à plat, donnée en mètres de la scène (le motif de terre cuite s'y répète tout seul).
  const tiled = (x1: number, x2: number, z1: number, z2: number, y: number) => {
    const shape = new THREE.Shape([new THREE.Vector2(x1, -z1), new THREE.Vector2(x2, -z1), new THREE.Vector2(x2, -z2), new THREE.Vector2(x1, -z2)])
    const surface = new THREE.Mesh(new THREE.ShapeGeometry(shape), terrace)
    surface.rotation.x = -Math.PI / 2
    surface.position.y = y
    group.add(surface)
  }
  // Le long de la façade des baies, la terrasse est surélevée, presque au niveau du sol de la maison : un massif carrelé d'1,50 m de
  // large, du coin ouest jusqu'entre la fenêtre du salon et celle du bureau, où deux marches (sur toute sa largeur) redescendent au pavage.
  const clay = standard(0xd98f5a, 0.85)
  const raised = BASE.rise - 0.04
  const terraceEnd = 3.2
  const terraceWest = house[2] - TERRACE
  group.add(box(TERRACE, raised - 0.002, terraceEnd - terraceWest, clay, house[0] - TERRACE / 2, (raised - 0.002) / 2, (terraceEnd + terraceWest) / 2))
  tiled(house[0] - TERRACE, house[0], terraceWest, terraceEnd, raised)
  for (const [index, share] of [2 / 3, 1 / 3].entries()) {
    const from = terraceEnd + index * 0.3
    group.add(box(TERRACE, raised * share - 0.002, 0.3, clay, house[0] - TERRACE / 2, (raised * share - 0.002) / 2, from + 0.15))
    tiled(house[0] - TERRACE, house[0], from, from + 0.3, raised * share)
  }
  // Un muret de béton bas borde la terrasse côté pelouse, près des marches ; et sur la pelouse, la table de jardin blanche et ses quatre chaises.
  group.add(box(0.15, 0.3, 1.6, wall, house[0] - TERRACE - 0.075, 0.15, terraceEnd - 0.6))
  const plastic = standard(0xf2f2ee, 0.6)
  const tableX = house[0] - TERRACE - 4
  const tableZ = REST.west + 1.5
  const top = cylinder(0.55, 0.55, 0.04, plastic, tableX, 0.72, tableZ, 28)
  top.scale.z = 1.5
  group.add(top)
  for (const [dx, dz] of [[-0.3, -0.5], [0.3, -0.5], [-0.3, 0.5], [0.3, 0.5]]) group.add(box(0.04, 0.7, 0.04, plastic, tableX + dx, 0.35, tableZ + dz))
  for (const [dx, dz, turn] of [[0, -1.2, 0], [0, 1.2, Math.PI], [-0.9, 0, Math.PI / 2], [0.9, 0, -Math.PI / 2]]) {
    const chair = new THREE.Group()
    chair.position.set(tableX + dx, 0, tableZ + dz)
    chair.rotation.y = turn
    chair.add(box(0.48, 0.04, 0.46, plastic, 0, 0.42, 0), box(0.48, 0.5, 0.04, plastic, 0, 0.68, -0.23))
    for (const side of [-1, 1]) chair.add(box(0.04, 0.42, 0.04, plastic, side * 0.21, 0.21, 0.2), box(0.04, 0.42, 0.04, plastic, side * 0.21, 0.21, -0.2), box(0.04, 0.03, 0.44, plastic, side * 0.24, 0.6, 0))
    group.add(chair)
  }

  // La cage à perruches a un abri de bois (du mélèze) dans son angle sud-est : des parois en lames, un toit clair qui déborde, et sur sa
  // face sud une porte à écharpes en Z, sur trois pentures noires. Devant la volière, un bac de bois plein de terre et sa plante grimpante.
  const shed = { width: 1.3, depth: 2 }
  const shedX = cageX1 + shed.depth / 2
  const shedZ = cageZ2 - shed.width / 2
  group.add(box(shed.depth, CAGE_HEIGHT, shed.width, post, shedX, CAGE_HEIGHT / 2, shedZ), box(shed.depth + 0.2, 0.04, shed.width + 0.2, standard(0xe4e6e8, 0.5), shedX, CAGE_HEIGHT + 0.04, shedZ))
  const doorFace = cageX1 - 0.02
  const doorWood = standard(woodTexture(0xc57a4a, 137), 0.8)
  group.add(box(0.03, 1.9, 0.8, doorWood, doorFace, 1.0, shedZ))
  for (const y of [0.12, 1.0, 1.88]) group.add(box(0.035, 0.09, 0.8, post, doorFace - 0.012, y, shedZ), box(0.02, 0.05, 0.2, iron, doorFace - 0.03, y, shedZ + 0.36))
  for (const [y, lean] of [[0.56, 1], [1.44, -1]]) {
    const brace = box(0.035, 1.15, 0.08, post, doorFace - 0.012, y, shedZ)
    brace.rotation.x = lean * 0.72
    group.add(brace)
  }
  const planterZ = cageZ1 + 0.7
  group.add(box(0.8, 0.45, 1.3, post, cageX1 - 0.45, 0.225, planterZ), box(0.7, 0.02, 1.2, standard(0x4a2e22, 1), cageX1 - 0.45, 0.455, planterZ))
  const climber = standard(0x5f8a3a, 1)
  const leaf = seeded(43)
  for (let tuft = 0; tuft < 16; tuft += 1) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16 + leaf() * 0.12, 8, 6), climber)
    ball.position.set(cageX1 - 0.04, 0.6 + leaf() * 1.5, cageZ1 + 0.1 + leaf() * 1.5)
    group.add(ball)
  }

  // Le groupe extérieur de la pompe à chaleur : un caisson blanc sur deux plots noirs, sa grille ronde en façade, posé sur une dalle de
  // béton dans l'angle que font le sas et le mur de l'escalier.
  const pumpX = SAS.north + OUTER_WALL + 0.75
  const pumpZ = ROOM.zMax + OUTER_WALL + 0.3
  group.add(box(1.6, 0.12, 1.5, concrete, pumpX + 0.05, 0.06, pumpZ + 0.45))
  group.add(box(0.85, 0.6, 0.33, standard(0xf0f0ee, 0.5), pumpX, 0.5, pumpZ))
  for (const side of [-1, 1]) group.add(box(0.1, 0.08, 0.4, iron, pumpX + side * 0.28, 0.16, pumpZ))
  const grille = cylinder(0.24, 0.24, 0.012, standard(0x9da1a6, 0.5, 0.4), pumpX - 0.1, 0.5, pumpZ + 0.17, 28)
  grille.rotation.x = Math.PI / 2
  group.add(grille)
  return group
}
