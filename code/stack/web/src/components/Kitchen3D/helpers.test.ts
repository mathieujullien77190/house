import * as THREE from 'three'
import { fakeContext2d, stubCanvasContext } from '@/test/canvas'
import { BASE, CABINET, COLORS, COUNTER_TOP, ENTRY, HOOD, KITCHEN, LAMP_FIXTURES, LAYOUT, OUTER_WALL, REST, ROOM, RUNS, SINK, TILES } from './constants'
import { buildScene, butcherTexture, lambrisTexture, parquet, PLANK, sisalTexture, SMALL_PLANK, tileTexture } from './helpers'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

describe('les textures dessinées', () => {
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

  it('le sisal : des rangs de petites mailles en quinconce sur un fond beige', () => {
    const context = fakeContext2d()
    stubCanvasContext(context)
    sisalTexture()
    const calls = context.fillRect.mock.calls as [number, number, number, number][]
    expect(calls[0]).toEqual([0, 0, 512, 512])
    // Soixante-quatre rangs de trente-trois mailles ; un rang sur deux est décalé d'une demi-maille.
    expect(calls).toHaveLength(1 + 64 * 33)
    expect(calls[1]).toEqual([0, 1, 14, 6])
    expect(calls[34]).toEqual([-8, 9, 14, 6])
  })
})

/** La place et la taille de la lame `index` d'un parquet. */
const plankOf = (mesh: THREE.InstancedMesh, index: number) => {
  const matrix = new THREE.Matrix4()
  mesh.getMatrixAt(index, matrix)
  const position = new THREE.Vector3()
  const scale = new THREE.Vector3()
  matrix.decompose(position, new THREE.Quaternion(), scale)
  return { position, scale }
}

describe('parquet', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('des lames de 110 cm sur 18 cm posées au tiers, coupées au bord de la pièce, un joint entre elles', () => {
    // Deux rangées de 2,20 m : deux lames entières, puis, décalée d'un tiers de lame, une chute, une lame entière et une lame coupée.
    const mesh = parquet([[0, 2.2, 0, 0.36]])
    expect(mesh.count).toBe(5)
    const first = plankOf(mesh, 0)
    expect(first.scale.x).toBeCloseTo(PLANK.length - PLANK.joint)
    expect(first.scale.y).toBeCloseTo(PLANK.thickness)
    expect(first.scale.z).toBeCloseTo(PLANK.width - PLANK.joint)
    expect(first.position.x).toBeCloseTo(PLANK.length / 2)
    expect(first.position.y).toBeCloseTo(-PLANK.thickness / 2)
    expect(first.position.z).toBeCloseTo(PLANK.width / 2)
    const offcut = plankOf(mesh, 2)
    expect(offcut.scale.x).toBeCloseTo(PLANK.length / 3 - PLANK.joint / 2)
    expect(offcut.position.z).toBeCloseTo(PLANK.width * 1.5)
    // Chaque lame a sa teinte.
    const tints = [0, 1, 2, 3, 4].map((index) => {
      const color = new THREE.Color()
      mesh.getColorAt(index, color)
      return color.getHex()
    })
    expect(new Set(tints).size).toBe(5)
  })

  it('une chute de moins de 4 mm, en long comme en large, n’est pas posée', () => {
    expect(parquet([[0, PLANK.length + 0.003, 0, PLANK.width + 0.003]]).count).toBe(1)
  })

  it('la trame est la même pour toute la maison : du côté négatif, le décalage au tiers continue', () => {
    const mesh = parquet([[0, 1.1, -0.18, 0]])
    expect(mesh.count).toBe(2)
    expect(plankOf(mesh, 0).scale.x).toBeCloseTo((PLANK.length * 2) / 3 - PLANK.joint / 2)
    expect(plankOf(mesh, 0).position.z).toBeCloseTo(-PLANK.width / 2)
  })

  it('tournées d’un quart de tour, de petites lames courent le long de z', () => {
    const mesh = parquet([[0, SMALL_PLANK.width, 0, SMALL_PLANK.length]], SMALL_PLANK, true)
    expect(mesh.count).toBe(1)
    const { position, scale } = plankOf(mesh, 0)
    expect(scale.x).toBeCloseTo(SMALL_PLANK.width - PLANK.joint)
    expect(scale.z).toBeCloseTo(SMALL_PLANK.length - PLANK.joint)
    expect(position.x).toBeCloseTo(SMALL_PLANK.width / 2)
    expect(position.z).toBeCloseTo(SMALL_PLANK.length / 2)
  })
})

describe('buildScene', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('la maison, le mobilier, le jardin et les trois files de caissons', () => {
    const { root } = buildScene()
    expect(root.children).toHaveLength(3 + RUNS.length)
    // Le jardin est plus bas que le sol de la maison.
    expect(root.children[2].position.y).toBe(-BASE.rise)
    const runs = root.children.slice(3)
    expect(runs.map((run) => [run.position.x, run.position.z, run.rotation.y])).toEqual(RUNS.map((spec) => [spec.x, spec.z, spec.angle]))
    // Tout maillage reçoit les ombres ; seules les ampoules des luminaires n'en portent pas.
    const meshes = meshesOf(root)
    expect(meshes.length).toBeGreaterThan(1500)
    // Une ampoule par lampe Hue nommée dans la scène.
    const bulbs = meshes.filter((mesh) => mesh.userData.fixture === true)
    expect(bulbs.map((bulb) => bulb.userData.fixtureName as string).sort()).toEqual([...LAMP_FIXTURES].sort())
    for (const mesh of meshes) {
      expect(mesh.receiveShadow).toBe(true)
      expect(mesh.castShadow).toBe(mesh.userData.fixture !== true)
    }
  })

  it('la hotte est au-dessus de la plaque, dans la file du fond, et se cache à part', () => {
    const { root, hood } = buildScene()
    const back = root.children[3]
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
    const [back, right, left] = root.children.slice(3)
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
    expect(left.children.slice(0, 5).map((child) => child.position.x)).toEqual([0.1, 0.65, 1.3, 1.7, 2.215].map((x) => expect.closeTo(x)))
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
    const [back, right, left] = root.children.slice(3)
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
    // Six casiers, une bouteille couchée dans chacun : son corps et son goulot.
    expect(meshesOf(left.children[0]).filter((mesh) => mesh.geometry.type === 'CylinderGeometry')).toHaveLength(12)
    // Sous l'évier, le corps du caisson est plus bas.
    const carcass = (cabinet: THREE.Object3D) => ((cabinet.children[1] as THREE.Mesh).geometry as THREE.BoxGeometry).parameters.height
    expect(carcass(right.children[1])).toBeCloseTo(CABINET.body - 0.11)
    expect(carcass(right.children[0])).toBeCloseTo(CABINET.body)
  })

  it('l’espace de vie : dalles aux cotes des pièces, parquet lame par lame, lambris au plafond, carrelage répété à sa longueur', () => {
    const { root } = buildScene()
    const room = root.children[0]
    const planes = (room.children as THREE.Mesh[]).filter((child) => child.geometry?.type === 'PlaneGeometry')
    // La première dalle : le fond sombre du salon (ce qu'on voit dans les joints), du mur des baies au claustra.
    const [floor] = planes
    expect((floor.geometry as THREE.PlaneGeometry).parameters).toMatchObject({ width: expect.closeTo(ENTRY.x - ROOM.xMin), height: expect.closeTo(ROOM.zMax - ROOM.zMin) })
    expect(floor.rotation.x).toBeCloseTo(-Math.PI / 2)
    expect(floor.position.y).toBeLessThan(0)
    // Deux parquets : les petites lames de la salle de bain, puis celui de tout le reste, d'un seul maillage.
    const parquets = (room.children as THREE.InstancedMesh[]).filter((child) => child.isInstancedMesh)
    expect(parquets).toHaveLength(2)
    expect(parquets[0].count).toBeGreaterThan(80)
    expect(parquets[1].count).toBeGreaterThan(300)
    const ceilings = planes.filter((plane) => plane.position.y === ROOM.height)
    // Le salon, la bande du claustra, l'entrée, la cuisine, puis les quatre pièces du reste de la maison, le couloir et le sas.
    expect(ceilings).toHaveLength(10)
    expect(new Set(ceilings.map((plane) => plane.material)).size).toBe(1)
    expect(((ceilings[0].material as THREE.MeshStandardMaterial).map as THREE.Texture).repeat.toArray()).toEqual([1, 1])
    // Les deux pans de crédence ont chacun leur copie du carrelage, répétée sur leur longueur.
    const tiles = planes.filter((plane) => (plane.geometry as THREE.PlaneGeometry).parameters.height === TILES.height)
    expect(tiles).toHaveLength(2)
    const maps = tiles.map((tile) => (tile.material as THREE.MeshStandardMaterial).map as THREE.Texture)
    expect(maps[0]).not.toBe(maps[1])
    expect(maps[0].repeat.x).toBeCloseTo((KITCHEN.xMax - KITCHEN.xMin) / 0.6)
    expect(maps[1].repeat.x).toBeCloseTo(2.5 / 0.6)
    expect(maps[1].repeat.y).toBeCloseTo(TILES.height / 0.6)
  })

  it('les murs intérieurs : tournés vers la pièce, percés de la porte du couloir, avec un linteau de chaque côté', () => {
    const { root } = buildScene()
    const planes = (root.children[0].children as THREE.Mesh[]).filter((child) => child.geometry?.type === 'PlaneGeometry')
    const door = LAYOUT.door
    const tvWall = planes.filter((plane) => plane.position.z === ROOM.zMin && Math.abs(plane.rotation.x) < 1e-9 && plane.position.x > REST.corridorSouth - 0.01 && plane.position.x < REST.corridorNorth + 0.01)
    // Au droit du couloir, le mur de la télé a un linteau au-dessus de la porte, côté salon (face vers +z) comme côté couloir (retourné).
    const lintels = tvWall.filter((plane) => Math.abs(plane.position.x - door.x) < 1e-9)
    expect(lintels.map((plane) => plane.rotation.y)).toEqual([0, expect.closeTo(Math.PI)])
    for (const lintel of lintels) expect((lintel.geometry as THREE.PlaneGeometry).parameters).toMatchObject({ width: expect.closeTo(door.width), height: expect.closeTo(ROOM.height - 2.05) })
    // La façade des baies, le long de z, regarde le nord (+x) ; le mur des fenêtres de la cuisine, en face, le sud.
    expect(planes.some((plane) => plane.position.x === ROOM.xMin && Math.abs(plane.rotation.y - Math.PI / 2) < 1e-9)).toBe(true)
    expect(planes.some((plane) => plane.position.x === ROOM.xMax && Math.abs(plane.rotation.y + Math.PI / 2) < 1e-9)).toBe(true)
  })

  it('les murs extérieurs : 30 cm de crépi sur un soubassement en retrait, un appui blanc sous chaque fenêtre', () => {
    const { root } = buildScene()
    const boxes = (root.children[0].children as THREE.Mesh[]).filter((child) => child.geometry?.type === 'BoxGeometry')
    const sizeOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.BoxGeometry).parameters
    const colorOf = (mesh: THREE.Mesh) => (mesh.material as THREE.MeshStandardMaterial).color.getHex()
    const facade = boxes.filter((mesh) => colorOf(mesh) === 0xeadfc6)
    expect(facade.length).toBeGreaterThan(30)
    // Tous de l'épaisseur du mur, sauf la peau du mur creusé par la niche des manteaux, plus mince.
    const thin = facade.filter((piece) => ![sizeOf(piece).width, sizeOf(piece).depth].some((side) => Math.abs(side - OUTER_WALL) < 1e-9))
    expect(thin).toHaveLength(1)
    expect(sizeOf(thin[0]).width).toBeLessThan(OUTER_WALL / 2)
    // Le mur ouest est tout contre le pan intérieur de la chambre d'invité, dehors.
    expect(facade[0].position.z).toBeCloseTo(REST.west - OUTER_WALL / 2 - 0.002)
    const base = boxes.filter((mesh) => colorOf(mesh) === 0xcbc7bd)
    // Un muret par pan de façade.
    expect(base).toHaveLength(8)
    for (const piece of base) {
      expect(sizeOf(piece).height).toBe(BASE.rise)
      expect(piece.position.y).toBeCloseTo(-BASE.rise / 2)
      expect(Math.min(sizeOf(piece).width, sizeOf(piece).depth)).toBeCloseTo(OUTER_WALL - BASE.setback)
    }
    // Neuf fenêtres ont un appui ; les portes-fenêtres, la porte du sas et la niche n'en ont pas.
    expect(boxes.filter((mesh) => colorOf(mesh) === 0xf4f4f1 && sizeOf(mesh).height === 0.04)).toHaveLength(9)
  })

  it('le reste de la maison : le plafonnier du couloir, le placard à quatre portes de la chambre de Matou, les deux marches du sas', () => {
    const { root } = buildScene()
    const room = root.children[0]
    const corridorLamp = meshesOf(room).find((mesh) => mesh.userData.fixtureName === 'couloir') as THREE.Mesh
    expect(corridorLamp.position.x).toBeCloseTo(LAYOUT.door.x)
    expect(corridorLamp.position.z).toBeCloseTo((REST.middle + ROOM.zMin) / 2)
    const boxes = (room.children as THREE.Mesh[]).filter((child) => child.geometry?.type === 'BoxGeometry')
    const sizeOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.BoxGeometry).parameters
    const doors = boxes.filter((mesh) => Math.abs(sizeOf(mesh).width - 0.492) < 1e-9 && Math.abs(sizeOf(mesh).height - 2.01) < 1e-9)
    expect(doors).toHaveLength(4)
    for (const door of doors) expect(door.position.z).toBeCloseTo(REST.matouEast - 0.012)
    // Les marches, carrelées de terre cuite : la première à la hauteur du sol de la maison, la seconde à mi-hauteur.
    const steps = boxes.filter((mesh) => Math.abs(sizeOf(mesh).depth - 1.2) < 1e-9 && sizeOf(mesh).width === 0.3 && mesh.position.y < 0)
    expect(steps.map((step) => sizeOf(step).height)).toEqual([BASE.rise, BASE.rise / 2])
    expect(steps[0].position.y + BASE.rise / 2).toBeCloseTo(0)
    expect(steps[1].material).toBe(steps[0].material)
  })
})
