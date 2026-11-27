import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { ROOM } from './constants'
import { buildGarden } from './garden/garden'
import { SITE } from './garden/layout'
import { box, snowTop } from './primitives'
import { AIR, createWeather, FALL, sheltered, SKIES, WEATHER_LOOK } from './weather'
import { WIND } from './wind'

/** Une petite scène : un muret et une terrasse en lattes où la neige tient, un toit en pente, un arbre qui se balance, un objet sans marque. */
const yard = () => {
  const scene = new THREE.Scene()
  const root = new THREE.Group()
  const wall = snowTop(box(0.15, 0.3, 2, new THREE.MeshStandardMaterial(), 1, 0.15, 2))
  wall.rotation.y = 0.4
  wall.scale.z = 1.5
  const deck = snowTop(new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.025, 1), new THREE.MeshStandardMaterial(), 3), 0.04)
  deck.setMatrixAt(2, new THREE.Matrix4().makeTranslation(3, 0, 1))
  const roof = new THREE.Group()
  roof.rotation.x = 0.1
  const sheet = snowTop(box(2, 0.012, 2, new THREE.MeshStandardMaterial(), 0, 0, 0), 0.035)
  roof.add(sheet)
  const tree = new THREE.Group()
  tree.userData.sway = 0.03
  const plain = box(1, 1, 1, new THREE.MeshStandardMaterial(), 0, 0, 0)
  root.add(wall, deck, roof, tree, plain)
  scene.add(root)
  return { scene, root, wall, deck, roof, sheet, tree, plain }
}

const rainOf = (scene: THREE.Scene) => scene.getObjectByName('rain') as THREE.LineSegments
const snowOf = (scene: THREE.Scene) => scene.getObjectByName('snow') as THREE.Points
const pointsOf = (object: THREE.LineSegments | THREE.Points): Float32Array => object.geometry.attributes.position.array as Float32Array
const capsOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const caps: THREE.Mesh[] = []
  root.traverse((object) => {
    if (((object as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined)?.polygonOffset) caps.push(object as THREE.Mesh)
  })
  return caps
}

beforeEach(() => {
  stubCanvasContext(null)
})

describe('WEATHER_LOOK, AIR, sheltered', () => {
  it('par beau temps rien ne change ; la pluie et la neige grisent le ciel et effacent le soleil', () => {
    expect(SKIES).toEqual(['sun', 'rain', 'snow'])
    expect(WEATHER_LOOK.sun).toEqual({ ambient: 1, sun: 1, background: null })
    expect(WEATHER_LOOK.rain.ambient).toBeLessThan(WEATHER_LOOK.snow.ambient)
    expect(WEATHER_LOOK.snow.ambient).toBeLessThan(1)
    expect(WEATHER_LOOK.rain.sun).toBeLessThan(WEATHER_LOOK.snow.sun)
    expect(WEATHER_LOOK.snow.sun).toBeLessThan(0.5)
  })

  it('l’air couvre tout le terrain, maison comprise, du sol du jardin jusqu’au-dessus du laurier', () => {
    const [x1, x2, z1, z2] = SITE.house
    expect(AIR.x1).toBeLessThan(x1 - 10)
    expect(AIR.x2).toBeGreaterThan(x2 + 5)
    expect(AIR.z1).toBeLessThan(z1 - 8)
    expect(AIR.z2).toBeGreaterThan(z2)
    expect(AIR.floor).toBeLessThan(-0.5)
    expect(AIR.top).toBeGreaterThan(7)
    expect(AIR.roof).toBeGreaterThan(ROOM.height)
  })

  it('à l’abri : la maison et le sas, pas le jardin', () => {
    expect(sheltered(0, 0)).toBe(true)
    expect(sheltered(ROOM.xMin + 0.1, ROOM.zMax - 0.1)).toBe(true)
    // Le sas dépasse de la maison, à l'est.
    expect(sheltered(-2, ROOM.zMax + 1)).toBe(true)
    expect(sheltered(1, ROOM.zMax + 1)).toBe(false)
    expect(sheltered(ROOM.xMin - 3, 0)).toBe(false)
    expect(sheltered(0, -12)).toBe(false)
  })
})

describe('createWeather', () => {
  it('prépare la pluie et la neige une fois, cachées par beau temps : un seul objet chacune', () => {
    const { scene } = yard()
    createWeather(scene, scene.children[0])
    const rain = rainOf(scene)
    const snow = snowOf(scene)
    expect(rain.isLineSegments).toBe(true)
    expect(snow.isPoints).toBe(true)
    // Deux points par goutte (un trait), un par flocon.
    expect(rain.geometry.attributes.position.count).toBe(FALL.rain.count * 2)
    expect(snow.geometry.attributes.position.count).toBe(FALL.snow.count)
    expect(FALL.rain.count).toBeLessThanOrEqual(6000)
    expect(FALL.snow.count).toBeLessThanOrEqual(6000)
    for (const fall of [rain, snow]) {
      expect(fall.visible).toBe(false)
      expect(fall.frustumCulled).toBe(false)
      expect(fall.parent).toBe(scene)
    }
    expect(scene.background).toBeNull()
    expect((snow.material as THREE.PointsMaterial).size).toBe(FALL.snow.size)
    expect((snow.material as THREE.PointsMaterial).map).not.toBeNull()
  })

  it('la couche de neige : une copie blanche de chaque objet marqué, soulevée de son épaisseur, cachée tant qu’il ne neige pas', () => {
    const { scene, root, wall, deck, roof, sheet, plain } = yard()
    const before = root.children.length
    const weather = createWeather(scene, root)
    const caps = capsOf(root)
    expect(caps).toHaveLength(3)
    expect(root.children).toHaveLength(before + 2)
    expect(new Set(caps.map((cap) => cap.material)).size).toBe(1)
    const capOf = (source: THREE.Mesh): THREE.Mesh => caps.find((cap) => cap.geometry === source.geometry) as THREE.Mesh
    const [wallCap, deckCap, sheetCap] = [capOf(wall), capOf(deck), capOf(sheet)]
    // Le muret : la même forme, à la même place, tournée et étirée comme lui, 3 cm plus haut.
    expect(wallCap.geometry).toBe(wall.geometry)
    expect(wallCap.parent).toBe(root)
    expect(wallCap.position.toArray()).toEqual([1, 0.15 + 0.03, 2])
    expect(wallCap.quaternion.equals(wall.quaternion)).toBe(true)
    expect(wallCap.scale.toArray()).toEqual([1, 1, 1.5])
    expect(wallCap.receiveShadow).toBe(true)
    // Les lattes : un maillage de copies, aux mêmes places.
    expect((deckCap as THREE.InstancedMesh).isInstancedMesh).toBe(true)
    expect((deckCap as THREE.InstancedMesh).count).toBe(3)
    expect(Array.from((deckCap as THREE.InstancedMesh).instanceMatrix.array)).toEqual(Array.from(deck.instanceMatrix.array))
    expect(deckCap.position.y).toBe(0.04)
    // La tôle du toit : sa neige reste dans le groupe du toit, et suit sa pente.
    expect(sheetCap.parent).toBe(roof)
    expect(sheetCap.position.y).toBe(sheet.position.y + 0.035)
    // Blanche, et ses flancs passent derrière ceux de l'objet.
    const white = wallCap.material as THREE.MeshStandardMaterial
    expect(white.color.getHex()).toBe(0xf6f8fb)
    expect(white.polygonOffsetFactor).toBeGreaterThan(0)
    expect(caps.every((cap) => !cap.visible)).toBe(true)
    weather.apply('rain', false)
    expect(caps.every((cap) => !cap.visible)).toBe(true)
    weather.apply('snow', false)
    expect(caps.every((cap) => cap.visible)).toBe(true)
    expect(plain.visible).toBe(true)
    weather.apply('sun', false)
    expect(caps.every((cap) => !cap.visible)).toBe(true)
  })

  it('dans le vrai jardin : la neige tient sur les pelouses, les carrelages, les haies, les murets, la pergola, la table et le toit de la cage', () => {
    const scene = new THREE.Scene()
    const garden = buildGarden()
    scene.add(garden)
    const marks: THREE.Mesh[] = []
    garden.traverse((object) => {
      if (typeof object.userData.snow === 'number') marks.push(object as THREE.Mesh)
    })
    createWeather(scene, garden)
    const caps = capsOf(garden)
    expect(caps).toHaveLength(marks.length)
    expect(caps.length).toBeGreaterThan(60)
    const types = new Set(marks.map((mark) => mark.geometry.type))
    expect(types).toEqual(new Set(['ShapeGeometry', 'BoxGeometry', 'CylinderGeometry']))
    // Les trois pelouses et le pavage : 4 cm de neige.
    expect(marks.filter((mark) => mark.geometry.type === 'ShapeGeometry' && mark.userData.snow === 0.04).length).toBeGreaterThanOrEqual(10)
    // La table (un plateau rond) et les lattes de la terrasse en ipé.
    expect(marks.filter((mark) => mark.geometry.type === 'CylinderGeometry')).toHaveLength(1)
    expect(marks.filter((mark) => (mark as THREE.InstancedMesh).isInstancedMesh)).toHaveLength(1)
  })

  it('le ciel suit le temps : gris sous la pluie, clair sous la neige, pas de fond par beau temps', () => {
    const { scene, root } = yard()
    const weather = createWeather(scene, root)
    weather.apply('rain', false)
    expect(rainOf(scene).visible).toBe(true)
    expect(snowOf(scene).visible).toBe(false)
    expect((scene.background as THREE.Color).getHex()).toBe(WEATHER_LOOK.rain.background)
    weather.apply('snow', false)
    expect(rainOf(scene).visible).toBe(false)
    expect(snowOf(scene).visible).toBe(true)
    expect((scene.background as THREE.Color).getHex()).toBe(WEATHER_LOOK.snow.background)
    weather.apply('sun', true)
    expect(rainOf(scene).visible).toBe(false)
    expect(snowOf(scene).visible).toBe(false)
    expect(scene.background).toBeNull()
  })

  it('par beau temps, rien ne tombe : les gouttes ne sont pas déplacées', () => {
    const { scene, root } = yard()
    const weather = createWeather(scene, root)
    const flakes = Array.from(pointsOf(snowOf(scene)))
    weather.step(0.1)
    expect(pointsOf(rainOf(scene)).every((value) => value === 0)).toBe(true)
    expect(Array.from(pointsOf(snowOf(scene)))).toEqual(flakes)
  })

  it('la pluie sans vent tombe d’aplomb : des traits verticaux, qui descendent vite', () => {
    const { scene, root } = yard()
    const weather = createWeather(scene, root)
    weather.apply('rain', false)
    weather.step(0.01)
    const points = pointsOf(rainOf(scene))
    const first = Array.from(points)
    expect((rainOf(scene).geometry.attributes.position as THREE.BufferAttribute).version).toBeGreaterThan(0)
    for (let drop = 0; drop < FALL.rain.count; drop += 1) {
      const at = drop * 6
      // Le bout du trait est juste au-dessus de la goutte.
      expect(points[at + 3]).toBe(points[at])
      expect(points[at + 5]).toBe(points[at + 2])
      expect(points[at + 4] - points[at + 1]).toBeCloseTo(FALL.rain.long)
    }
    weather.step(0.01)
    let fallen = 0
    for (let drop = 0; drop < FALL.rain.count; drop += 1) {
      const at = drop * 6
      expect(points[at]).toBe(first[at])
      const down = first[at + 1] - points[at + 1]
      // (Une goutte arrivée en bas est repartie d'en haut.)
      if (down > 0) {
        fallen += 1
        expect(down).toBeGreaterThan(FALL.rain.fall * 0.01 * 0.74)
        expect(down).toBeLessThan(FALL.rain.fall * 0.01 * 1.26)
      }
    }
    expect(fallen).toBeGreaterThan(FALL.rain.count * 0.95)
  })

  it('avec le vent, la pluie tombe en biais : les traits penchent du côté où il souffle, et les gouttes dérivent', () => {
    const { scene, root } = yard()
    const weather = createWeather(scene, root)
    weather.apply('rain', true)
    weather.step(0.01)
    const points = pointsOf(rainOf(scene))
    const first = Array.from(points)
    weather.step(0.01)
    const slant = Math.hypot(FALL.rain.fall, FALL.rain.drift)
    let drifted = 0
    for (let drop = 0; drop < FALL.rain.count; drop += 1) {
      const at = drop * 6
      expect(points[at] - points[at + 3]).toBeCloseTo((WIND.x * FALL.rain.drift * FALL.rain.long) / slant)
      expect(points[at + 2] - points[at + 5]).toBeCloseTo((WIND.z * FALL.rain.drift * FALL.rain.long) / slant)
      expect(points[at + 4]).toBeGreaterThan(points[at + 1])
      if (Math.abs(points[at] - first[at] - WIND.x * FALL.rain.drift * 0.01) < 1e-4) drifted += 1
    }
    expect(drifted).toBeGreaterThan(FALL.rain.count * 0.95)
  })

  it('il ne pleut ni ne neige dans la maison : au-dessus d’elle, rien ne descend sous le haut des murs ; tout reste dans l’air du terrain', () => {
    for (const sky of ['rain', 'snow'] as const) {
      const { scene, root } = yard()
      const weather = createWeather(scene, root)
      weather.apply(sky, true)
      const fall = sky === 'rain' ? rainOf(scene) : snowOf(scene)
      const stride = sky === 'rain' ? 6 : 3
      let above = 0
      for (let frame = 0; frame < 40; frame += 1) {
        // (Le plus grand pas de la boucle de dessin : un quart de seconde.)
        weather.step(0.25)
        const points = pointsOf(fall)
        let outside = 0
        let indoors = 0
        for (let at = 0; at < points.length; at += stride) {
          const [x, y, z] = [points[at], points[at + 1], points[at + 2]]
          if (x < AIR.x1 || x > AIR.x2 || z < AIR.z1 || z > AIR.z2 || y < AIR.floor || y > AIR.top) outside += 1
          if (sheltered(x, z)) {
            if (y < AIR.roof) indoors += 1
            else above += 1
          }
        }
        expect(outside).toBe(0)
        expect(indoors).toBe(0)
      }
      // Il pleut bien au-dessus de la maison aussi.
      expect(above).toBeGreaterThan(1000)
    }
  })

  it('la neige tombe lentement, en flottant ; avec le vent elle part en biais', () => {
    const { scene, root } = yard()
    const weather = createWeather(scene, root)
    weather.apply('snow', false)
    const points = pointsOf(snowOf(scene))
    const start = Array.from(points)
    weather.step(0.05)
    expect((snowOf(scene).geometry.attributes.position as THREE.BufferAttribute).version).toBeGreaterThan(0)
    for (let at = 0; at < points.length; at += 3) {
      const down = start[at + 1] - points[at + 1]
      if (down > 0) expect(down).toBeLessThan(FALL.snow.fall * 0.05 * 1.26)
      // Elle flotte : un petit écart de côté, d'un sens ou de l'autre.
      const aside = Math.abs(points[at] - start[at])
      // (Sauf celui qui, au bord de l'air, est rentré par le bord d'en face.)
      if (aside < 1) expect(aside).toBeLessThanOrEqual(0.25 * 0.05 + 1e-6)
    }
    expect(FALL.snow.fall).toBeLessThan(FALL.rain.fall / 5)
    // Avec le vent, presque tous partent du côté où il souffle (les autres sont rentrés par le bord d'en face).
    const calm = Array.from(points)
    weather.apply('snow', true)
    weather.step(0.05)
    let pushed = 0
    for (let at = 0; at < points.length; at += 3) {
      if (points[at] - calm[at] > (WIND.x * FALL.snow.drift - 0.25) * 0.05 - 1e-6 && points[at + 2] - calm[at + 2] > (WIND.z * FALL.snow.drift - 0.25) * 0.05 - 1e-6) pushed += 1
    }
    expect(pushed).toBeGreaterThan(FALL.snow.count * 0.97)
  })

  it('un flocon qui sort de l’air y rentre par le bord opposé ; arrivé au sol, il repart d’en haut', () => {
    const { scene, root } = yard()
    const weather = createWeather(scene, root)
    const points = pointsOf(snowOf(scene))
    const fill = (x: number, y: number, z: number) => {
      for (let at = 0; at < points.length; at += 3) points.set([x, y, z], at)
    }
    // Sans vent, un flocon au bord de l'air flotte dehors d'un côté ou de l'autre : il revient par le bord d'en face.
    weather.apply('snow', false)
    fill(AIR.x1, 5, AIR.z1)
    weather.step(0.05)
    const xs = Array.from({ length: FALL.snow.count }, (_, index) => points[index * 3])
    const zs = Array.from({ length: FALL.snow.count }, (_, index) => points[index * 3 + 2])
    expect(xs.some((x) => x > AIR.x2 - 0.1)).toBe(true)
    expect(xs.some((x) => x < AIR.x1 + 0.1)).toBe(true)
    expect(zs.some((z) => z > AIR.z2 - 0.1)).toBe(true)
    expect(zs.some((z) => z < AIR.z1 + 0.1)).toBe(true)
    // Avec le vent, ceux du bord sous le vent ressortent tous de l'autre côté.
    weather.apply('snow', true)
    fill(AIR.x2, 5, AIR.z2)
    weather.step(0.25)
    for (let at = 0; at < points.length; at += 3) {
      expect(points[at]).toBeLessThan(AIR.x1 + 1)
      expect(points[at + 2]).toBeLessThan(AIR.z1 + 1)
    }
    // Au sol du jardin : il repart d'en haut. Sur la maison : dès le haut des murs.
    weather.apply('snow', false)
    fill(AIR.x1 + 2, AIR.floor + 0.001, AIR.z1 + 2)
    weather.step(0.05)
    for (let at = 1; at < points.length; at += 3) expect(points[at]).toBeGreaterThan(AIR.top - 0.2)
    fill(0, AIR.roof + 0.001, 0)
    weather.step(0.05)
    for (let at = 1; at < points.length; at += 3) expect(points[at]).toBeGreaterThan(AIR.top - 0.2)
  })

  it('le vent seul balance ce qui est marqué, quel que soit le temps ; quand il tombe, tout se redresse', () => {
    const { scene, root, tree, plain } = yard()
    const weather = createWeather(scene, root)
    weather.step(0.1)
    expect(tree.matrixAutoUpdate).toBe(true)
    weather.apply('sun', true)
    weather.step(0.1)
    expect(tree.matrixAutoUpdate).toBe(false)
    expect(tree.matrix.equals(new THREE.Matrix4())).toBe(false)
    expect(plain.matrixAutoUpdate).toBe(true)
    const leaning = tree.matrix.clone()
    weather.step(0.1)
    expect(tree.matrix.equals(leaning)).toBe(false)
    // Le vent continue sous la pluie.
    weather.apply('rain', true)
    weather.step(0.1)
    expect(tree.matrixAutoUpdate).toBe(false)
    weather.apply('rain', false)
    expect(tree.matrixAutoUpdate).toBe(true)
    expect(tree.matrix.equals(new THREE.Matrix4())).toBe(true)
    weather.step(0.1)
    expect(tree.matrix.equals(new THREE.Matrix4())).toBe(true)
  })
})
