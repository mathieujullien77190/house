import * as THREE from 'three'
import { fakeContext2d, stubCanvasContext } from '@/test/canvas'
import { CABINET, COLORS, COUNTER_TOP, HOOD, KITCHEN, ROOM, RUNS, SINK, TILES } from './constants'
import { buildScene, butcherTexture, lambrisTexture, parquetTexture, tileTexture } from './helpers'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

describe('les textures dessinées', () => {
  it('le parquet : cinq rangées de deux lames, dessinées trois fois pour se raccorder', () => {
    const context = fakeContext2d()
    stubCanvasContext(context)
    expect((parquetTexture().image as HTMLCanvasElement).width).toBe(512)
    expect(context.fillRect).toHaveBeenCalledTimes(30)
    expect(context.strokeRect).toHaveBeenCalledTimes(30)
    // Six veines par lame.
    expect(context.bezierCurveTo).toHaveBeenCalledTimes(180)
    expect(context.globalAlpha).toBe(1)
  })

  it('le plan de travail : des lames de 18 px coupées en tronçons, sur toute l’image', () => {
    const context = fakeContext2d()
    stubCanvasContext(context)
    butcherTexture()
    const strips = context.fillRect.mock.calls as [number, number, number, number][]
    expect(new Set(strips.map(([, y]) => y)).size).toBe(29)
    for (const [, , length, height] of strips) {
      expect(length).toBeGreaterThanOrEqual(128)
      expect(length).toBeLessThan(358)
      expect(height).toBe(18)
    }
    // Chaque rangée va jusqu'au bord droit.
    const last = strips.filter(([, y]) => y === 0).at(-1) as [number, number, number, number]
    expect(last[0] + last[2]).toBeGreaterThanOrEqual(512)
  })

  it('le carrelage métro : le joint, puis huit rangées de carreaux décalées une sur deux', () => {
    const context = fakeContext2d()
    stubCanvasContext(context)
    expect((tileTexture().image as HTMLCanvasElement).width).toBe(256)
    const calls = context.fillRect.mock.calls as [number, number, number, number][]
    expect(calls[0]).toEqual([0, 0, 256, 256])
    expect(calls).toHaveLength(49)
    expect(calls[1]).toEqual([-62, 2, 60, 28])
    expect(calls[7]).toEqual([-30, 34, 60, 28])
    expect(context.fillStyle).toBe(COLORS.tile)
  })

  it('le lambris : dix lames rainurées', () => {
    const context = fakeContext2d()
    stubCanvasContext(context)
    lambrisTexture()
    expect(context.fillRect).toHaveBeenCalledTimes(21)
    expect(context.fillRect).toHaveBeenNthCalledWith(1, 0, 0, 512, 512)
  })
})

describe('buildScene', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('la pièce, le mobilier et les trois files de caissons', () => {
    const { root } = buildScene()
    expect(root.children).toHaveLength(2 + RUNS.length)
    const runs = root.children.slice(2)
    expect(runs.map((run) => [run.position.x, run.position.z, run.rotation.y])).toEqual(RUNS.map((spec) => [spec.x, spec.z, spec.angle]))
    // Tout maillage reçoit les ombres ; seules les ampoules des luminaires n'en portent pas.
    const meshes = meshesOf(root)
    expect(meshes.length).toBeGreaterThan(400)
    const bulbs = meshes.filter((mesh) => mesh.userData.fixture === true)
    expect(bulbs).toHaveLength(9)
    for (const mesh of meshes) {
      expect(mesh.receiveShadow).toBe(true)
      expect(mesh.castShadow).toBe(mesh.userData.fixture !== true)
    }
  })

  it('la hotte est au-dessus de la plaque, dans la file du fond, et se cache à part', () => {
    const { root, hood } = buildScene()
    const back = root.children[2]
    expect(hood.parent).toBe(back)
    expect(hood.children).toHaveLength(1)
    const [parts] = hood.children
    // Le four est le deuxième caisson du fond (40 cm puis 60 cm) : son milieu est à 70 cm.
    expect(parts.position.x).toBeCloseTo(0.7)
    expect(parts.position.z).toBeCloseTo(-CABINET.depth + HOOD.depthBottom / 2)
    // Le corps à trois pans (six triangles), le conduit jusqu'au plafond et le bandeau.
    const [canopy, duct] = parts.children as THREE.Mesh[]
    expect(canopy.geometry.getIndex()?.count).toBe(18)
    expect(canopy.geometry.getAttribute('position').count).toBe(8)
    expect(canopy.geometry.getAttribute('normal').count).toBe(8)
    expect(duct.position.y + (duct.geometry as THREE.BoxGeometry).parameters.height / 2).toBeCloseTo(ROOM.height)
    // La plaque est posée sur le plan, au même endroit.
    const hob = back.children.find((child) => child.type === 'Group' && Math.abs(child.position.y - COUNTER_TOP) < 1e-9)
    expect(hob?.position.x).toBeCloseTo(0.7)
    expect(hob?.children).toHaveLength(6)
  })

  it('chaque file a ses caissons et son plan de travail, échancré devant l’évier', () => {
    const { root } = buildScene()
    const [back, right, left] = root.children.slice(2)
    const worktopOf = (run: THREE.Object3D) => run.children.find((child) => (child as THREE.Mesh).geometry?.type === 'ExtrudeGeometry') as THREE.Mesh
    const outline = (run: THREE.Object3D) => (worktopOf(run).geometry as THREE.ExtrudeGeometry).parameters.shapes as THREE.Shape
    // Le plan droit : quatre coins ; avec l'évier : quatre de plus.
    expect(outline(back).getPoints()).toHaveLength(5)
    expect(outline(left).getPoints()).toHaveLength(5)
    expect(outline(right).getPoints()).toHaveLength(9)
    expect(worktopOf(right).position.y).toBeCloseTo(CABINET.plinth + CABINET.body)
    const lengthOf = (index: number) => RUNS[index].modules.reduce((sum, module) => sum + module.width, 0)
    for (const [index, run] of [back, right, left].entries()) {
      const box = new THREE.Box3().setFromBufferAttribute(worktopOf(run).geometry.getAttribute('position') as THREE.BufferAttribute)
      expect(box.max.x - box.min.x).toBeCloseTo(lengthOf(index))
    }
    // Les caissons sont posés bout à bout : le premier est centré sur sa demi-largeur.
    expect(back.children[0].position.x).toBeCloseTo(0.2)
    expect(back.children[1].position.x).toBeCloseTo(0.7)
    expect(left.children.slice(0, 5).map((child) => child.position.x)).toEqual([0.1, 0.65, 1.3, 1.7, 2.2].map((x) => expect.closeTo(x)))
    // L'évier de ferme est au milieu du deuxième caisson de la file des fenêtres, son bord au-dessus du plan.
    const sink = right.children[5]
    expect(sink.position.x).toBeCloseTo(0.9)
    const rim = sink.children[0] as THREE.Mesh
    expect(rim.position.y + (rim.geometry as THREE.BoxGeometry).parameters.height / 2).toBeCloseTo(COUNTER_TOP + SINK.above)
    // Seule la file des fenêtres a un panneau de bout, après son dernier caisson.
    expect(right.children.at(-1)?.position.x).toBeCloseTo(lengthOf(1))
    expect(right.children).toHaveLength(7)
  })

  it('les façades : porte, tiroirs, four, lave-vaisselle, évier et casier à bouteilles', () => {
    const { root } = buildScene()
    const [back, right, left] = root.children.slice(2)
    const groupsOf = (cabinet: THREE.Object3D) => cabinet.children.filter((child) => child.type === 'Group').length
    // Une porte : sa façade et sa poignée debout ; le lave-vaisselle a la sienne couchée.
    const door = back.children[0]
    expect(groupsOf(door)).toBe(2)
    expect(door.children[3].children[0].rotation.z).toBe(0)
    const dishwasher = right.children[2]
    expect(dishwasher.children[3].children[0].rotation.z).toBeCloseTo(Math.PI / 2)
    // Trois tiroirs : trois façades et trois poignées.
    expect(groupsOf(left.children[1])).toBe(6)
    // Le four et le casier à bouteilles sont un seul bloc chacun.
    expect(groupsOf(back.children[1])).toBe(1)
    expect(left.children[0].children).toHaveLength(1)
    expect(meshesOf(left.children[0]).filter((mesh) => mesh.geometry.type === 'CylinderGeometry')).toHaveLength(5)
    // Sous l'évier, le corps du caisson est plus bas.
    const carcass = (cabinet: THREE.Object3D) => ((cabinet.children[1] as THREE.Mesh).geometry as THREE.BoxGeometry).parameters.height
    expect(carcass(right.children[1])).toBeCloseTo(CABINET.body - 0.11)
    expect(carcass(right.children[0])).toBeCloseTo(CABINET.body)
  })

  it('la pièce : parquet et plafond aux cotes, carrelage répété à sa longueur, murs tournés vers l’intérieur', () => {
    const { root } = buildScene()
    const room = root.children[0]
    const width = ROOM.xMax - ROOM.xMin
    const depth = ROOM.zMax - ROOM.zMin
    const planes = (room.children as THREE.Mesh[]).filter((child) => child.geometry?.type === 'PlaneGeometry')
    const [floor] = planes
    expect((floor.geometry as THREE.PlaneGeometry).parameters).toMatchObject({ width, height: depth })
    expect(floor.rotation.x).toBeCloseTo(-Math.PI / 2)
    const floorMap = (floor.material as THREE.MeshStandardMaterial).map as THREE.Texture
    expect(floorMap.repeat.x).toBeCloseTo(width / 0.96)
    expect(floorMap.repeat.y).toBeCloseTo(depth / 0.96)
    const ceiling = planes.find((plane) => plane.position.y === ROOM.height) as THREE.Mesh
    expect(((ceiling.material as THREE.MeshStandardMaterial).map as THREE.Texture).repeat.toArray()).toEqual([width, depth])
    // Les deux pans de crédence ont chacun leur copie du carrelage, répétée sur leur longueur.
    const tiles = planes.filter((plane) => (plane.geometry as THREE.PlaneGeometry).parameters.height === TILES.height)
    expect(tiles).toHaveLength(2)
    const maps = tiles.map((tile) => (tile.material as THREE.MeshStandardMaterial).map as THREE.Texture)
    expect(maps[0]).not.toBe(maps[1])
    expect(maps[0].repeat.x).toBeCloseTo((KITCHEN.xMax - KITCHEN.xMin) / 0.6)
    expect(maps[1].repeat.x).toBeCloseTo(2.5 / 0.6)
    expect(maps[1].repeat.y).toBeCloseTo(TILES.height / 0.6)
    // Les murs : le mur de la télé (le long de x, face vers +z), celui du bureau en face (retourné), la façade des baies (le long de z).
    const walls = planes.filter((plane) => plane.material === planes[1].material)
    expect(walls[0].rotation.y).toBe(0)
    expect(walls[0].position.z).toBe(ROOM.zMin)
    expect(walls[1].rotation.y).toBeCloseTo(Math.PI / 2)
    expect(walls[1].position.x).toBe(ROOM.xMin)
    expect(walls[2].rotation.y).toBeCloseTo(Math.PI)
    expect(walls[2].position.z).toBe(ROOM.zMax)
    expect(walls[4].rotation.y).toBeCloseTo(-Math.PI / 2)
    // Au-dessus d'une niche, le mur ne reprend qu'au linteau.
    expect(walls.some((wall) => (wall.geometry as THREE.PlaneGeometry).parameters.height < ROOM.height - 2)).toBe(true)
  })
})
