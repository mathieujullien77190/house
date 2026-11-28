import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { PLAN_GARAGE_CORNERS, UNITS_PER_METER } from '@/components/Lights/constants'
import { BASE, ENTRY, OUTER_WALL, PATIO_DOOR, ROOM, SAS } from '@/components/Kitchen3D/constants'
import { gardenMaterials } from '@/components/Kitchen3D/materials'
import { GARAGE_DEPTH, GATE_DROP, GRASS, HEDGE, LOT, LOW, PATH_DROP, PATH_STEPS, PAVING, PLAN, TERRACE } from './constants'
import type { PlanPoint } from './constants'
import { groundTerrace, lawns, paving, raisedTerrace, retainingWalls, walkOutline } from './ground'
import { SITE } from './layout'
import { PERGOLA_FRONT } from './pergola'
import { gardenX, gardenZ, planOf } from './plan'

const built = (build: (group: THREE.Group, m: ReturnType<typeof gardenMaterials>) => void) => {
  const group = new THREE.Group()
  const m = gardenMaterials()
  build(group, m)
  return { meshes: group.children as THREE.Mesh[], m }
}

const sizeOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.BoxGeometry).parameters
const boundsOf = (mesh: THREE.Object3D) => new THREE.Box3().setFromObject(mesh)
const colorOf = (mesh: THREE.Mesh) => (mesh.material as THREE.MeshStandardMaterial).color.getHex()
const boxesOf = (meshes: THREE.Mesh[]) => meshes.filter((mesh) => mesh.isMesh && mesh.geometry.type === 'BoxGeometry')
/** Les quadrilatères (deux triangles : six sommets) d'une liste de maillages. */
const quadsOf = (meshes: THREE.Mesh[]) => meshes.filter((mesh) => mesh.isMesh && mesh.geometry.type === 'BufferGeometry' && mesh.geometry.attributes.position.count === 6)
/** Ceux de béton banché : les seuls à porter des coordonnées de texture. */
const formedOf = (meshes: THREE.Mesh[]) => quadsOf(meshes).filter((mesh) => mesh.geometry.attributes.uv !== undefined)
/** Les hauteurs des sommets d'un maillage, au millimètre. */
const heightsOf = (mesh: THREE.Mesh) => Array.from(mesh.geometry.attributes.position.array).filter((_, index) => index % 3 === 1).map((y) => Math.round(y * 1000) / 1000)
const topOf = (mesh: THREE.Mesh) => Math.max(...heightsOf(mesh))
const footOf = (mesh: THREE.Mesh) => Math.min(...heightsOf(mesh))
const mm = (y: number) => Math.round(y * 1000) / 1000
/** La pelouse s'arrête 8 unités au-delà de l'axe de la haie de l'arc ; le mur côté rue et le trottoir commencent 0,4 unité plus loin. */
const LAWN_RADIUS = HEDGE.radius + 8
/** L'ordonnée de l'arc de la pelouse à cette abscisse du plan. */
const arcY = (planX: number) => LOT.centerY + Math.sqrt(LAWN_RADIUS ** 2 - (planX - LOT.centerX) ** 2)
/** Le chemin de béton le long de la haie : son rayon médian, sa demi-largeur, l'ordonnée de son tronçon droit (unités du plan), ses marches. */
const WALK = { radius: HEDGE.radius - 29, half: 17, from: PLAN.height + (ROOM.xMin - (SITE.house[0] - PERGOLA_FRONT)) * UNITS_PER_METER - 37, startX: -31, steps: 4, drop: 0.25 }
/** La distance d'un point du plan au centre du terrain. */
const fromCenter = ([planX, planY]: PlanPoint) => Math.hypot(planX - LOT.centerX, planY - LOT.centerY)
/** Le bord de la terrasse au-dessus de l'allée du garage (z de la scène), là où finit la rampe. */
const RAMP_END = gardenZ(PLAN.west - (OUTER_WALL + TERRACE) * UNITS_PER_METER)
/** Le niveau du sol au portail du garage, et celui du chemin au portillon. */
const GATE_LEVEL = mm(-0.012 - GATE_DROP)
const WICKET_LEVEL = mm(-0.008 - PATH_DROP)

beforeEach(() => {
  stubCanvasContext(null)
})

describe('walkOutline', () => {
  it('le contour du chemin le long de la haie : le tronçon droit depuis la terrasse, puis quatre marches entre deux arcs, jusqu’au bord sud de l’allée du garage', () => {
    const outline = walkOutline()
    // Le départ du tronçon droit, cinq rayons le long du bord intérieur, le coin du triangle du bout, cinq le long du bord extérieur, les deux coins du tronçon.
    expect(outline).toHaveLength(14)
    expect(outline[0]).toEqual([WALK.startX, WALK.from])
    expect(outline[13]).toEqual([WALK.startX, WALK.from + WALK.half * 2])
    for (const point of outline.slice(1, 6)) expect(fromCenter(point)).toBeCloseTo(WALK.radius - WALK.half)
    for (const point of outline.slice(7, 12)) expect(fromCenter(point)).toBeCloseTo(WALK.radius + WALK.half)
    // Le bord extérieur est à 12 unités (30 cm) de l'axe de la haie.
    expect(HEDGE.radius - (WALK.radius + WALK.half)).toBe(12)
    // Chaque marche est coupée par un rayon du terrain : ses deux bouts sont dans la même direction.
    const turn = ([planX, planY]: PlanPoint) => Math.atan2(planY - LOT.centerY, planX - LOT.centerX)
    for (let row = 0; row <= WALK.steps; row += 1) expect(turn(outline[1 + row])).toBeCloseTo(turn(outline[11 - row]))
    // Il commence au droit du tronçon (sur le rayon médian), et finit quand son bord intérieur touche le bord sud de l'allée du garage (1 cm au-delà).
    expect((outline[1][1] + outline[11][1]) / 2).toBeCloseTo(WALK.from, 0)
    const south = PLAN_GARAGE_CORNERS[1][1] + 0.4
    expect(outline[5][1]).toBeCloseTo(south)
    // Le triangle du bout : son coin est sur ce bord, à l'abscisse du bord extérieur de la dernière marche.
    expect(outline[6]).toEqual([outline[7][0], south])
    // Le tronçon droit va jusqu'au bord extérieur du chemin, contre la haie.
    expect(fromCenter(outline[12])).toBeCloseTo(WALK.radius + WALK.half)
    expect(outline[12][1]).toBe(WALK.from + WALK.half * 2)
    // De longues marches : de 55 cm à 1 m de giron, du bord intérieur au bord extérieur.
    const tread = Math.hypot(outline[2][0] - outline[1][0], outline[2][1] - outline[1][1]) / UNITS_PER_METER
    expect(tread).toBeGreaterThan(0.5)
    expect(tread).toBeLessThan(1.1)
  })
})

describe('lawns', () => {
  it('la pelouse sur deux niveaux, la terre du lopin enclavé, l’herbe surélevée de la partie basse, et le muret qui la tient', () => {
    const { meshes, m } = built(lawns)
    const [lawn, lopin] = meshes
    const [lowLawn, highGrass, curb] = meshes.slice(-3)
    for (const surface of [lawn, lowLawn, highGrass]) {
      expect(surface.geometry.type).toBe('ShapeGeometry')
      expect(surface.material).toBe(m.grass)
      expect(surface.rotation.x).toBeCloseTo(-Math.PI / 2)
    }
    expect(lawn.position.y).toBe(-0.02)
    expect(lowLawn.position.y).toBeCloseTo(-LOW - 0.02)
    expect(highGrass.position.y).toBeCloseTo(GRASS)
    // La pelouse du haut va de la marche (la façade nord) jusqu'au bas de l'arc, côté rue.
    const high = boundsOf(lawn)
    expect(high.min.x).toBeCloseTo(gardenX(LOT.centerY + LOT.radius))
    expect(high.max.x).toBeCloseTo(SITE.cageX2)
    expect(high.max.z).toBeCloseTo(gardenZ(LOT.east))
    // La partie basse commence à la marche et va jusqu'à la limite nord.
    const low = boundsOf(lowLawn)
    expect(low.min.x).toBeCloseTo(SITE.stepLine)
    expect(low.max.x).toBeCloseTo(gardenX(LOT.north))
    // Le muret de béton : du niveau bas jusqu'à 4 cm au-dessus de l'herbe.
    expect(curb.material).toBe(m.wall)
    expect(sizeOf(curb).height).toBeCloseTo(GRASS + 0.04 + LOW)
    expect(curb.position.y - sizeOf(curb).height / 2).toBeCloseTo(-LOW)
    expect(curb.position.x).toBeCloseTo(SITE.stepLine + TERRACE + BASE.setback + 0.06)
    // Le petit lopin entre l'allée du garage, l'escalier et la terrasse : de la terre, 5 mm au-dessus de l'herbe.
    expect(lopin.geometry.type).toBe('ShapeGeometry')
    expect(lopin.material).toBe(m.soil)
    expect(lopin.position.y).toBe(-0.015)
    const patch = boundsOf(lopin)
    const lopinNorth = PLAN_GARAGE_CORNERS[1][1] + 12
    expect(patch.max.z).toBeCloseTo(gardenZ(WALK.startX))
    expect(patch.max.x).toBeCloseTo(gardenX(lopinNorth))
    expect(patch.min.x).toBeCloseTo(gardenX(WALK.from - 6))
    // Elle s'arrête à la face du muret de l'escalier (6 unités en dedans de son bord intérieur).
    expect(patch.min.z).toBeCloseTo(gardenZ(LOT.centerX - Math.sqrt((WALK.radius - WALK.half - 6) ** 2 - (lopinNorth - LOT.centerY) ** 2)))
  })

  it('la pelouse fait un creux à l’allée du garage, au chemin le long de la haie et au chemin du portillon : pas d’herbe au-dessus d’eux', () => {
    const { meshes } = built(lawns)
    const [lawn] = meshes
    // La pelouse vue du dessus : un rayon qui tombe la touche, ou non.
    const seen = lawn.clone()
    seen.material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
    seen.updateMatrixWorld(true)
    const grassAt = (planX: number, planY: number): boolean => new THREE.Raycaster(new THREE.Vector3(gardenX(planY), 5, gardenZ(planX)), new THREE.Vector3(0, -1, 0)).intersectObject(seen).length > 0
    // Sur la pelouse, entre la maison et la haie.
    expect(grassAt(200, 600)).toBe(true)
    // L'allée du garage, jusque sous la maison.
    const [gateNorth, gateSouth, backSouth] = PLAN_GARAGE_CORNERS
    expect(grassAt(-100, (gateNorth[1] + gateSouth[1]) / 2)).toBe(false)
    expect(grassAt(backSouth[0] - 5, gateSouth[1] - 5)).toBe(false)
    // Le chemin le long de la haie : son tronçon droit, et une marche.
    expect(grassAt(-100, WALK.from + WALK.half)).toBe(false)
    const outline = walkOutline()
    expect(grassAt((outline[2][0] + outline[10][0]) / 2, (outline[2][1] + outline[10][1]) / 2)).toBe(false)
    // Le lopin entre eux reste de l'herbe sous sa terre.
    expect(grassAt(-100, gateSouth[1] + 30)).toBe(true)
    // Le chemin du portillon, après ses marches : creusé jusqu'à l'arc.
    const pathMiddle = (PAVING.pathWest + PAVING.pathEast) / 2
    expect(grassAt(pathMiddle, PATH_STEPS.from + 20)).toBe(false)
    expect(grassAt(pathMiddle, PATH_STEPS.from - 20)).toBe(true)
    expect(grassAt(PAVING.pathWest - 20, PATH_STEPS.from + 20)).toBe(true)
  })

  it('côté rue, un mur tout autour de la propriété, de la pelouse jusqu’à 2,20 m plus bas ; il s’abaisse au portail du garage et au portillon', () => {
    const { meshes } = built(lawns)
    const skirt = quadsOf(meshes).filter((mesh) => colorOf(mesh) === 0x5d5c58)
    // 160 pans le long de l'arc, deux à l'est, et le tour de la partie basse (le nord, l'ouest, son arc).
    expect(skirt.length).toBeGreaterThan(165)
    expect(new Set(skirt.map((pan) => pan.material)).size).toBe(1)
    expect((skirt[0].material as THREE.Material).side).toBe(THREE.DoubleSide)
    for (const pan of skirt) expect(footOf(pan)).toBe(-2.2)
    // Quatre hauteurs : la pelouse, la partie basse, le sol du portail du garage, le chemin du portillon.
    expect(new Set(skirt.map(topOf))).toEqual(new Set([-0.02, mm(-LOW - 0.02), GATE_LEVEL, WICKET_LEVEL]))
    // Au portail du garage : seulement entre ses deux poteaux de béton.
    const atGate = skirt.filter((pan) => topOf(pan) === GATE_LEVEL)
    expect(atGate.length).toBeGreaterThan(2)
    for (const pan of atGate) {
      expect(boundsOf(pan).min.x).toBeGreaterThan(gardenX(SITE.gate.y2) - 0.5)
      expect(boundsOf(pan).max.x).toBeLessThan(gardenX(SITE.gate.y1) + 0.5)
    }
    // Au portillon : sur la largeur de son chemin.
    const atWicket = skirt.filter((pan) => topOf(pan) === WICKET_LEVEL)
    expect(atWicket.length).toBeGreaterThan(0)
    for (const pan of atWicket) {
      expect(boundsOf(pan).min.z).toBeGreaterThan(gardenZ(PAVING.pathWest) - 0.3)
      expect(boundsOf(pan).max.z).toBeLessThan(gardenZ(PAVING.pathEast) + 0.3)
    }
    // Le tour de la partie basse va jusqu'à la limite nord.
    expect(Math.max(...skirt.map((pan) => boundsOf(pan).max.x))).toBeCloseTo(gardenX(LOT.north))
    // À l'ouest, il suit le bord de la pelouse (le même rayon que le mur de l'arc), pas la limite du terrain.
    expect(Math.min(...skirt.filter((pan) => topOf(pan) === mm(-LOW - 0.02)).map((pan) => boundsOf(pan).min.z))).toBeCloseTo(gardenZ(LOT.centerX - LAWN_RADIUS))
  })

  it('dans la rue, le long de la haie : un trottoir de 1 m, épais de 20 cm, qui monte du niveau du portail du garage à celui du portillon ; il continue tout droit le long de la limite ouest', () => {
    const { meshes } = built(lawns)
    const all = quadsOf(meshes).filter((mesh) => colorOf(mesh) === 0xb9b8b2)
    // 320 pas le long de l'arc : un dessus et un chant chacun ; puis la bande droite du coin nord-ouest : un dessus et un chant.
    expect(all).toHaveLength(642)
    const pavement = all.slice(0, 640)
    const [stripTop, stripEdge] = all.slice(640)
    // La bande droite : à plat, au niveau du portail du garage, du bout de l'arc (à l'ouest du centre) jusqu'à la limite nord, large de 1 m ; son chant descend de 20 cm.
    expect([footOf(stripTop), topOf(stripTop)]).toEqual([GATE_LEVEL, GATE_LEVEL])
    expect([footOf(stripEdge), topOf(stripEdge)]).toEqual([mm(GATE_LEVEL - 0.2), GATE_LEVEL])
    const strip = boundsOf(stripTop)
    expect([strip.min.x, strip.max.x].sort((a, b) => a - b)).toEqual([gardenX(LOT.centerY), gardenX(LOT.north)].sort((a, b) => a - b).map((x) => expect.closeTo(x)))
    expect(strip.max.z - strip.min.z).toBeCloseTo(1, 1)
    expect(strip.max.z).toBeCloseTo(gardenZ(LOT.centerX - LAWN_RADIUS - 0.4))
    expect(boundsOf(stripEdge).max.z).toBeCloseTo(strip.min.z)
    const tops = pavement.filter((_, index) => index % 2 === 0)
    const edges = pavement.filter((_, index) => index % 2 === 1)
    // Il ne redescend jamais : de l'ouest (avant le portail) vers le sud puis l'est (après le portillon).
    const level = tops.map(topOf)
    level.slice(1).forEach((y, index) => expect(y).toBeGreaterThanOrEqual(level[index]))
    expect(footOf(tops[0])).toBe(GATE_LEVEL)
    expect(level.at(-1)).toBe(WICKET_LEVEL)
    // À plat avant le portail et après le portillon ; en pente entre les deux.
    expect(level.filter((y) => y === WICKET_LEVEL).length).toBeGreaterThan(20)
    expect(tops.filter((top) => topOf(top) === GATE_LEVEL).length).toBeGreaterThan(20)
    expect(new Set(level).size).toBeGreaterThan(20)
    // Son chant descend de 20 cm sous lui.
    edges.forEach((edge, index) => expect(footOf(edge)).toBeCloseTo(footOf(tops[index]) - 0.2))
    // Large de 1 m, depuis le pied du mur.
    const corner = (index: number) => new THREE.Vector3().fromBufferAttribute(tops[0].geometry.attributes.position, index).setY(0)
    expect(corner(1).distanceTo(corner(2))).toBeCloseTo(1, 1)
    const [planX, planY] = planOf(corner(0).x, corner(0).z)
    expect(fromCenter([planX, planY])).toBeCloseTo(LAWN_RADIUS + 0.4)
  })
})

describe('retainingWalls', () => {
  it('la marche de 20 cm entre les deux niveaux : six murets du même béton, et le soubassement qui descend sous la façade nord', () => {
    const { meshes, m } = built(retainingWalls)
    expect(meshes).toHaveLength(7)
    for (const wall of meshes) {
      expect(sizeOf(wall).height).toBe(LOW)
      expect(wall.position.y).toBeCloseTo(-LOW / 2)
    }
    expect(meshes.slice(0, 6).every((wall) => wall.material === m.riser)).toBe(true)
    // Le long du fond de la cage, jusqu'à la limite est.
    expect(meshes[0].position.x).toBeCloseTo(SITE.cageX2 + 0.06)
    expect(sizeOf(meshes[0]).depth).toBeCloseTo(gardenZ(LOT.east) - SITE.stepZ)
    // Le soubassement : de l'épaisseur du mur moins son retrait, sur toute la façade.
    const base = meshes[6]
    expect(base.material).not.toBe(m.riser)
    expect(sizeOf(base).width).toBeCloseTo(OUTER_WALL - BASE.setback)
    expect(sizeOf(base).depth).toBeCloseTo(SITE.house[3] - BASE.setback - SITE.house[2])
  })
})

describe('groundTerrace', () => {
  it('trois bandes carrelées d’1,50 m (sud, ouest, est), la bande de béton de derrière et le perron', () => {
    const { meshes, m } = built(groundTerrace)
    expect(meshes).toHaveLength(5)
    const [south, west, east, band, porch] = meshes
    for (const tiled of [south, west, east]) {
      expect(tiled.material).toBe(m.terrace)
      expect(tiled.position.y).toBe(-0.004)
    }
    const { house } = SITE
    const southBox = boundsOf(south)
    expect(southBox.min.x).toBeCloseTo(house[0] - TERRACE)
    expect(southBox.min.z).toBeCloseTo(house[2] - TERRACE)
    expect(southBox.max.z).toBeCloseTo(house[3] + TERRACE)
    expect(boundsOf(west).max.x).toBeCloseTo(house[1])
    expect(boundsOf(east).max.x).toBeCloseTo(SITE.stepLine)
    // Derrière la maison, du béton, dans la partie basse.
    expect(band.material).toBe(m.concrete)
    expect(band.position.y).toBeCloseTo(-LOW - 0.001)
    expect(sizeOf(band).width).toBeCloseTo(TERRACE + BASE.setback)
    // Le perron, devant la porte d'entrée, de la largeur du sas.
    expect(porch.material).toBe(m.terrace)
    expect(sizeOf(porch).width).toBeCloseTo(SAS.north - SAS.south)
    expect(sizeOf(porch).depth).toBeCloseTo(house[3] - ENTRY.doorZ - OUTER_WALL)
  })
})

describe('paving', () => {
  it('le pavage de l’est, le sol de la cage et le chemin du portillon en terre cuite, avec ses trois marches', () => {
    const { meshes, m } = built(paving)
    const [east, tiles, soil, pathTop, ...rest] = meshes
    expect(meshes.slice(0, 4).map((mesh) => mesh.material)).toEqual([m.terrace, m.terrace, m.soil, m.terrace])
    expect(east.position.y).toBe(-0.008)
    expect([tiles.position.y, soil.position.y]).toEqual([-0.008, -0.008])
    // Le sol de la cage : des carreaux, sauf une bande de terre le long du grillage de devant ; à eux deux, ils couvrent toute la cage.
    const floor = boundsOf(tiles)
    const earth = boundsOf(soil)
    expect(floor.min.x).toBeCloseTo(SITE.cageX1)
    expect(floor.max.x).toBeCloseTo(SITE.cageX2)
    expect(floor.max.z).toBeCloseTo(SITE.cageZ2)
    expect(earth.min.z).toBeCloseTo(SITE.cageZ1)
    expect(earth.min.x).toBeCloseTo(gardenX(SITE.recessPlan))
    expect(earth.max.x).toBeCloseTo(SITE.cageX2)
    // La terre touche les carreaux : la bande est devant (du côté du bac), les carreaux derrière.
    expect(earth.max.z).toBeCloseTo(floor.min.z)
    expect(earth.max.z - earth.min.z).toBeGreaterThan(0.5)
    expect(floor.min.z).toBeGreaterThan(SITE.cageZ1)
    // Le chemin du portillon part du sud du pavage, de plain-pied, puis descend de trois marches de 17 cm.
    const top = boundsOf(pathTop)
    expect(top.max.x).toBeCloseTo(gardenX(PAVING.south))
    expect(top.min.x).toBeCloseTo(gardenX(PATH_STEPS.from))
    expect(top.min.z).toBeCloseTo(gardenZ(PAVING.pathWest))
    expect(top.max.z).toBeCloseTo(gardenZ(PAVING.pathEast))
    const steps = rest.slice(0, 6)
    // Chaque marche : une surface, un cran plus bas que la précédente, puis sa contremarche.
    for (let step = 0; step < PATH_STEPS.count; step += 1) {
      const [tread, riser] = [steps[step * 2], steps[step * 2 + 1]]
      expect(tread.position.y).toBeCloseTo(-0.008 - PATH_STEPS.drop * (step + 1))
      expect(sizeOf(riser).height).toBeCloseTo(PATH_STEPS.drop)
      expect(sizeOf(riser).width).toBe(0.02)
      expect(riser.position.y).toBeCloseTo(-0.008 - PATH_STEPS.drop * step - PATH_STEPS.drop / 2)
      expect(sizeOf(riser).depth).toBeCloseTo(gardenZ(PAVING.pathEast) - gardenZ(PAVING.pathWest))
    }
    // En contrebas, après la dernière marche, jusqu'à l'arc de la haie (le portillon).
    const lowPath = rest[6]
    expect(lowPath.position.y).toBeCloseTo(-0.008 - PATH_DROP)
    expect(boundsOf(lowPath).min.x).toBeCloseTo(gardenX(arcY(PAVING.pathEast)))
    expect(boundsOf(lowPath).max.x).toBeCloseTo(gardenX(PATH_STEPS.from + PATH_STEPS.count * PATH_STEPS.tread))
  })

  it('le chemin de béton le long de la haie : un tronçon droit qui descend en biais, puis quatre marches de 25 cm entre des murets de béton banché', () => {
    const { meshes, m } = built(paving)
    // Les quatre marches : les seules surfaces de béton à plat, chacune 25 cm sous la précédente.
    const treads = meshes.filter((mesh) => mesh.isMesh && mesh.geometry.type === 'ShapeGeometry' && mesh.material === m.concrete)
    expect(treads.map((tread) => tread.position.y)).toEqual([-0.25, -0.5, -0.75, -1])
    const outline = walkOutline()
    // La première part de la tête de l'escalier, la dernière arrive au bord sud de l'allée du garage.
    expect(boundsOf(treads[0]).min.x).toBeCloseTo(gardenX(Math.max(outline[1][1], outline[11][1])))
    expect(boundsOf(treads[3]).max.x).toBeCloseTo(gardenX(outline[5][1]))
    // Le tronçon droit : le premier quadrilatère de béton, de plain-pied au carrelage, 25 cm plus bas contre la haie.
    const concrete = quadsOf(meshes).filter((mesh) => mesh.material === m.concrete)
    const [straight, ...corner] = concrete.slice(0, 4)
    expect([topOf(straight), footOf(straight)]).toEqual([-0.006, -WALK.drop])
    const run = boundsOf(straight)
    expect(run.max.z).toBeCloseTo(gardenZ(WALK.startX))
    expect(run.max.x).toBeCloseTo(gardenX(WALK.from))
    expect(run.min.x).toBeCloseTo(gardenX(WALK.from + WALK.half * 2))
    expect(run.min.z).toBeCloseTo(gardenZ(outline[12][0]))
    // Le coin entre le tronçon et la première marche : trois triangles (des quadrilatères dont le dernier sommet revient au premier).
    for (const triangle of corner) {
      const points = Array.from({ length: 6 }, (_, index) => new THREE.Vector3().fromBufferAttribute(triangle.geometry.attributes.position, index))
      expect(points[0].distanceTo(points[5])).toBe(0)
    }
    expect([topOf(corner[0]), footOf(corner[0])]).toEqual([-0.006, -WALK.drop])
    for (const triangle of corner.slice(1)) expect(new Set(heightsOf(triangle))).toEqual(new Set([-WALK.drop]))
    // Le triangle du bout, au niveau de la dernière marche.
    expect(new Set(heightsOf(concrete[4]))).toEqual(new Set([-1]))
    // Les murets et les contremarches : du béton banché, avec des coordonnées de texture en mètres ; un seul matériau, vu des deux côtés.
    const formed = formedOf(meshes)
    expect(formed.length).toBeGreaterThan(60)
    expect(new Set(formed.map((mesh) => mesh.material)).size).toBe(1)
    const banche = formed[0].material as THREE.MeshStandardMaterial
    expect(banche.map).not.toBeNull()
    expect(banche.side).toBe(THREE.DoubleSide)
    // Trois contremarches (la première marche n'en a pas : le tronçon droit y arrive de plain-pied) : 25 cm chacune, sur la largeur du chemin.
    const risers = formed.filter((mesh) => {
      const bounds = boundsOf(mesh)
      return mm(topOf(mesh) - footOf(mesh)) === WALK.drop && topOf(mesh) <= -WALK.drop && Math.hypot(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) > 0.7
    })
    expect(risers.map(topOf)).toEqual([-0.25, -0.5, -0.75])
    // Les murets qui bordent le lopin de terre dépassent à peine de l'herbe (1 cm au-dessus d'elle).
    expect(formed.filter((mesh) => topOf(mesh) === -0.01).length).toBeGreaterThan(15)
  })

  it('l’allée du garage : une rampe au sol uni du portail jusqu’au pied de la terrasse, 2 m sous le terrain, puis du béton à plat jusqu’au portail en bois', () => {
    const { meshes, m } = built(paving)
    const [gateNorth, gateSouth, backSouth, backNorth] = PLAN_GARAGE_CORNERS
    // Deux pans du même rouge brique pastel : la rampe, et son prolongement à plat jusqu'au trottoir.
    const [ramp, toStreet] = quadsOf(meshes).filter((mesh) => colorOf(mesh) === 0xd9a99d)
    expect(toStreet.material).toBe(ramp.material)
    expect([topOf(ramp), footOf(ramp)]).toEqual([GATE_LEVEL, -GARAGE_DEPTH])
    expect(boundsOf(ramp).max.x).toBeCloseTo(gardenX(gateNorth[1]))
    expect(boundsOf(ramp).min.x).toBeCloseTo(gardenX(gateSouth[1]))
    // Elle est à l'ouest de la maison, et s'arrête au bord de sa terrasse.
    expect(boundsOf(ramp).max.z).toBeCloseTo(RAMP_END)
    expect(RAMP_END).toBeCloseTo(SITE.house[2] - TERRACE)
    expect(new Set(heightsOf(toStreet))).toEqual(new Set([GATE_LEVEL]))
    // Côté rue, elle va jusqu'au bord intérieur du trottoir.
    for (const index of [0, 1]) {
      const point = new THREE.Vector3().fromBufferAttribute(toStreet.geometry.attributes.position, index)
      expect(fromCenter(planOf(point.x, point.z))).toBeCloseTo(LAWN_RADIUS + 0.4)
    }
    // Sous la terrasse : du béton à plat, au fond, jusqu'au portail en bois (sous la terrasse, avant le mur de la maison).
    const flatFloor = quadsOf(meshes).filter((mesh) => mesh.material === m.concrete).find((mesh) => topOf(mesh) === -GARAGE_DEPTH) as THREE.Mesh
    expect(footOf(flatFloor)).toBe(-GARAGE_DEPTH)
    expect(boundsOf(flatFloor).min.z).toBeCloseTo(RAMP_END)
    expect(boundsOf(flatFloor).max.z).toBeCloseTo(gardenZ(backNorth[0]))
    expect(gardenZ(backSouth[0])).toBeGreaterThan(RAMP_END + 0.5)
    expect(gardenZ(backSouth[0])).toBeLessThan(SITE.house[2])
    // Les murs de béton banché : ils dépassent de 20 cm du terrain le long de la rampe, et s'arrêtent sous la terrasse (5 mm sous le terrain), sans dépasser dans son bloc.
    const tops = formedOf(meshes).map(topOf)
    expect(tops.filter((y) => y === 0.2).length).toBeGreaterThanOrEqual(10)
    expect(tops.filter((y) => y === -0.005)).toHaveLength(10)
    expect(Math.max(...tops)).toBe(0.2)
    expect(Math.min(...formedOf(meshes).map(footOf))).toBe(-GARAGE_DEPTH)
    // Le mur plein, du muret de la descente au portail en bois : il monte jusqu'au niveau du terrain, sous le bloc de la terrasse.
    expect(tops.filter((y) => y === 0)).toHaveLength(4)
  })

  it('dans la descente : le muret et sa bande de terre, un arbre étroit, le palier de l’escalier, du lierre sur le mur et la barrière', () => {
    const { meshes, m } = built(paving)
    const gateSouth = PLAN_GARAGE_CORNERS[1]
    const landing = -WALK.drop * WALK.steps
    // La terre, 5 cm sous le dessus du muret (au niveau de la dernière marche de l'escalier), sur 30 cm de large contre le mur de droite.
    const soil = quadsOf(meshes).find((mesh) => colorOf(mesh) === 0x4a2e22) as THREE.Mesh
    expect(new Set(heightsOf(soil))).toEqual(new Set([landing - 0.05]))
    const bed = boundsOf(soil)
    expect(bed.max.x).toBeCloseTo(gardenX(gateSouth[1] - 0.3 * UNITS_PER_METER))
    expect(bed.min.x).toBeCloseTo(gardenX(gateSouth[1]))
    // L'arbre étroit : un groupe nommé « tree » (la vue Matrix), réduit à 40 %, planté dans cette terre, du côté du garage.
    const column = (meshes as THREE.Object3D[]).find((child) => child.name === 'tree') as THREE.Group
    expect(column.scale.toArray()).toEqual([0.4, 0.4, 0.4])
    expect(column.position.y).toBeCloseTo(landing - 0.05)
    expect(column.position.x).toBeCloseTo((bed.min.x + bed.max.x) / 2)
    expect(column.position.z).toBeGreaterThan((bed.min.z + bed.max.z) / 2)
    expect(column.position.z).toBeLessThan(bed.max.z)
    expect((column.children as THREE.InstancedMesh[]).filter((child) => child.isInstancedMesh).reduce((sum, lot) => sum + lot.count, 0)).toBe(150)
    // Le palier de l'escalier avance de 40 cm dans l'allée, au niveau de sa dernière marche, depuis le poteau du portail.
    const step = quadsOf(meshes).filter((mesh) => mesh.material === m.concrete).at(-1) as THREE.Mesh
    expect(new Set(heightsOf(step))).toEqual(new Set([landing]))
    expect(boundsOf(step).min.z).toBeCloseTo(gardenZ(gateSouth[0]))
    expect(boundsOf(step).min.x).toBeCloseTo(gardenX(gateSouth[1]))
    expect(boundsOf(step).max.x).toBeCloseTo(gardenX(gateSouth[1] - 0.4 * UNITS_PER_METER))
    // Le lierre : des touffes plates de trois verts sombres (un lot par teinte), sur le mur, la barrière et l'épaisseur de la terrasse.
    const ivy = (meshes as THREE.InstancedMesh[]).filter((mesh) => mesh.isInstancedMesh)
    expect(ivy.map(colorOf)).toEqual([0x1f4524, 0x28592d, 0x2f6a34])
    expect(ivy.reduce((sum, lot) => sum + lot.count, 0)).toBe(140 + 130 + 110 + 200 + 150)
    const matrix = new THREE.Matrix4()
    const [at, turn, size] = [new THREE.Vector3(), new THREE.Quaternion(), new THREE.Vector3()]
    for (const lot of ivy) {
      for (let index = 0; index < lot.count; index += 1) {
        lot.getMatrixAt(index, matrix)
        matrix.decompose(at, turn, size)
        // Plates : écrasées à 30 % dans une direction. Du sol de l'allée à la main courante de la barrière, jamais au-delà du bord de la terrasse.
        expect(Math.min(size.x, size.z) / Math.max(size.x, size.z)).toBeCloseTo(0.3)
        expect(at.y).toBeGreaterThan(-GARAGE_DEPTH - 0.01)
        expect(at.y).toBeLessThan(SITE.raised + 1.11)
        expect(at.z).toBeLessThan(RAMP_END + 0.05)
      }
    }
  })

  it('en bas de la pente, un caniveau à grille en travers de l’allée ; au-dessus, sur la terrasse, une barrière noire de 1 m à barreaux', () => {
    const { meshes, m } = built(paving)
    const [gateNorth, gateSouth] = PLAN_GARAGE_CORNERS
    const boxes = boxesOf(meshes)
    const long = gardenX(gateNorth[1]) - gardenX(gateSouth[1])
    const drainLong = gardenX(gateNorth[1]) - gardenX(gateSouth[1] - 0.4 * UNITS_PER_METER)
    // Le caniveau : un fond sombre de 8 cm de large, deux bords et des barrettes de fonte, 1 cm avant le pied de la terrasse.
    const bottom = boxes.find((mesh) => colorOf(mesh) === 0x101114) as THREE.Mesh
    expect(sizeOf(bottom).depth).toBe(0.08)
    expect(bottom.position.z).toBeCloseTo(RAMP_END - 0.01)
    expect(bottom.position.y).toBeCloseTo(-GARAGE_DEPTH + 0.004)
    // Du mur de gauche au mur plein de droite (40 cm du plan en deçà du mur de l'allée).
    expect(sizeOf(bottom).width).toBeCloseTo(drainLong)
    const cast = boxes.filter((mesh) => colorOf(mesh) === 0x5a5d61)
    expect(new Set(cast.map((piece) => piece.material)).size).toBe(1)
    const slats = cast.filter((piece) => sizeOf(piece).depth === 0.08)
    expect(cast.length - slats.length).toBe(2)
    expect(slats).toHaveLength(Math.round(sizeOf(bottom).width / 0.03) + 1)
    // La barrière : une main courante à 1 m des carreaux surélevés, une lisse basse, trois poteaux et des barreaux fins tous les 11 cm environ.
    const iron = boxes.filter((mesh) => mesh.material === m.iron)
    const [handrail, lowRail, ...uprights] = iron
    expect(sizeOf(handrail).width).toBeCloseTo(long)
    expect(handrail.position.y).toBeCloseTo(SITE.raised + 1)
    expect(lowRail.position.y).toBeCloseTo(SITE.raised + 0.1)
    const posts = uprights.filter((piece) => sizeOf(piece).width === 0.04)
    const bars = uprights.filter((piece) => sizeOf(piece).width === 0.014)
    expect(posts).toHaveLength(3)
    expect(posts.every((post) => sizeOf(post).height === 1 && Math.abs(post.position.y - (SITE.raised + 0.5)) < 1e-9)).toBe(true)
    expect(bars).toHaveLength(Math.round(long / 0.11) - 1)
    expect(posts.length + bars.length).toBe(uprights.length)
    // Elle est au bord du carrelage, au-dessus de l'allée.
    for (const piece of iron) expect(piece.position.z).toBeCloseTo(RAMP_END + 0.04)
  })

  it('au fond de l’allée, le portail en bois du garage : trois vantaux de six planches dans un cadre, entre deux murs de béton', () => {
    const { meshes } = built(paving)
    const [, , backSouth, backNorth] = PLAN_GARAGE_CORNERS
    const boxes = boxesOf(meshes)
    const doorZ = gardenZ(backNorth[0])
    const wide = gardenX(backNorth[1]) - gardenX(backSouth[1])
    const banche = formedOf(meshes)[0].material
    // Les deux murs de côté (30 cm au nord, 50 cm au sud) et le linteau, du béton banché des murs, sur toute la hauteur de l'allée.
    const walls = boxes.filter((mesh) => mesh.material === banche)
    expect(walls.map((wall) => sizeOf(wall).width)).toEqual([0.3, 0.5, expect.closeTo(wide - 0.8)])
    expect(walls.slice(0, 2).every((wall) => sizeOf(wall).height === GARAGE_DEPTH && wall.position.y === -GARAGE_DEPTH / 2)).toBe(true)
    // Le linteau ferme le dessus, du haut du portail (1,90 m) jusqu'au terrain.
    const lintel = walls[2]
    expect(lintel.position.y - sizeOf(lintel).height / 2).toBeCloseTo(-GARAGE_DEPTH + 1.9)
    expect(lintel.position.y + sizeOf(lintel).height / 2).toBeCloseTo(0)
    for (const wall of walls) expect(wall.position.z).toBeCloseTo(doorZ)
    // Le bois : un cadre de trois pièces, dix-huit planches, six traverses et trois barres en biais, d'un seul matériau.
    const planks = boxes.filter((mesh) => sizeOf(mesh).depth === 0.05 && Math.abs(sizeOf(mesh).height - 1.76) < 1e-9)
    expect(planks).toHaveLength(18)
    const timber = boxes.filter((mesh) => mesh.material === planks[0].material)
    expect(timber).toHaveLength(3 + 18 + 6 + 3)
    // Les barres en biais penchent d'un côté puis de l'autre, d'un vantail au suivant.
    const braces = timber.filter((piece) => piece.rotation.z !== 0)
    expect(braces.map((brace) => Math.sign(brace.rotation.z))).toEqual([1, -1, 1])
    // La ferrure noire : deux pentures et une poignée par vantail.
    const black = boxes.filter((mesh) => colorOf(mesh) === 0x1b1c1e)
    expect(black).toHaveLength(9)
    expect(black.filter((piece) => sizeOf(piece).width === 0.35)).toHaveLength(6)
    // Tout le portail tient entre les deux murs de côté, sous le linteau, devant eux.
    for (const piece of planks) {
      expect(piece.position.x).toBeLessThan(gardenX(backNorth[1]) - 0.3)
      expect(piece.position.x).toBeGreaterThan(gardenX(backSouth[1]) + 0.5)
      expect(piece.position.y + sizeOf(piece).height / 2).toBeLessThan(-GARAGE_DEPTH + 1.9)
      expect(piece.position.z).toBeLessThan(doorZ)
    }
  })
})

describe('raisedTerrace', () => {
  it('le massif carrelé presque au niveau de la maison, ses deux marches, le muret prolongé jusqu’à la haie, et les murets de la jardinière ouverte devant la porte-fenêtre', () => {
    const { meshes, m } = built(raisedTerrace)
    expect(meshes).toHaveLength(18)
    const { house, raised, terraceEnd, terraceWest } = SITE
    const wide = PERGOLA_FRONT - 0.075
    // Devant les baies : le massif et ses carreaux, à la hauteur surélevée.
    const [block, tiles, westBlock, westTiles] = meshes
    expect(sizeOf(block).width).toBeCloseTo(wide)
    expect(sizeOf(block).depth).toBeCloseTo(terraceEnd - terraceWest)
    expect(tiles.material).toBe(m.terrace)
    expect(tiles.position.y).toBeCloseTo(raised)
    expect(boundsOf(tiles).min.x).toBeCloseTo(house[0] - wide)
    // Il tourne le coin et longe la façade ouest.
    expect(sizeOf(westBlock).depth).toBe(TERRACE)
    expect(westTiles.position.y).toBeCloseTo(raised)
    expect(boundsOf(westTiles).max.x).toBeCloseTo(house[1] - BASE.setback)
    // Deux marches de 30 cm, aux deux tiers puis au tiers de la hauteur.
    expect(meshes[5].position.y).toBeCloseTo((raised * 2) / 3)
    expect(meshes[7].position.y).toBeCloseTo(raised / 3)
    expect(boundsOf(meshes[7]).min.z).toBeCloseTo(terraceEnd + 0.3)
    expect(boundsOf(meshes[7]).max.z).toBeCloseTo(terraceEnd + 0.6)
    // Les murets : tous de la hauteur des carreaux surélevés, posés au sol.
    const walls = meshes.filter((mesh) => mesh.material === m.wall)
    expect(walls).toHaveLength(8)
    for (const wall of walls) {
      expect(sizeOf(wall).height).toBeCloseTo(raised)
      expect(wall.position.y).toBeCloseTo(raised / 2)
    }
    // Le premier est sur la ligne des pieds de devant de la pergola.
    expect(walls[0].position.x).toBeCloseTo(house[0] - PERGOLA_FRONT)
    // À l'ouest, ce muret continue au-delà du bout de la terrasse, le long du chemin de béton, jusqu'à l'axe de la haie de l'arc.
    const toHedge = boundsOf(walls[2])
    expect(walls[2].position.x).toBeCloseTo(house[0] - PERGOLA_FRONT)
    expect(toHedge.max.z).toBeCloseTo(terraceWest)
    const muretPlanY = PLAN.height + (ROOM.xMin - (house[0] - PERGOLA_FRONT)) * UNITS_PER_METER
    expect(toHedge.min.z).toBeCloseTo(gardenZ(LOT.centerX - Math.sqrt(HEDGE.radius ** 2 - (muretPlanY - LOT.centerY) ** 2)))
    // La terre des deux jardinières s'interrompt devant la porte-fenêtre.
    const earth = meshes.filter((mesh) => mesh.geometry.type === 'BoxGeometry' && Math.abs(sizeOf(mesh).width - 0.28) < 1e-9)
    expect(earth).toHaveLength(2)
    expect(earth[0].material).toBe(earth[1].material)
    expect(boundsOf(earth[0]).max.z).toBeLessThan(PATIO_DOOR.z - PATIO_DOOR.width / 2)
    expect(boundsOf(earth[1]).min.z).toBeGreaterThan(PATIO_DOOR.z + PATIO_DOOR.width / 2)
    expect(boundsOf(earth[1]).max.z).toBeLessThan(gardenZ(PAVING.pathWest))
    // Tout reste sous le sol de la maison.
    for (const mesh of meshes) expect(boundsOf(mesh).max.y).toBeLessThanOrEqual(BASE.rise)
    expect(ROOM.xMin).toBeGreaterThan(boundsOf(block).max.x)
  })
})
