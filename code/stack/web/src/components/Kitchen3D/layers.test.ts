import * as THREE from 'three'
import { REST, ROOM, SAS } from './constants'
import { INDOOR, OUTDOOR, indoors, renderLayers, splitLayers } from './layers'

describe('indoors', () => {
  const [sasX, sasZ] = [(SAS.south + SAS.north) / 2, ROOM.zMax + 0.6]

  it('dans la maison, murs extérieurs compris (30 cm)', () => {
    expect(indoors(0, 0)).toBe(true)
    expect(indoors(ROOM.xMin - 0.29, 0)).toBe(true)
    expect(indoors(ROOM.xMax + 0.29, 0)).toBe(true)
    expect(indoors(0, REST.west - 0.29)).toBe(true)
    expect(indoors(ROOM.xMax, ROOM.zMax + 0.29)).toBe(true)
  })

  it('dehors : au-delà de chaque mur', () => {
    expect(indoors(ROOM.xMin - 0.31, 0)).toBe(false)
    expect(indoors(ROOM.xMax + 0.31, 0)).toBe(false)
    expect(indoors(0, REST.west - 0.31)).toBe(false)
    expect(indoors(ROOM.xMax, ROOM.zMax + 0.31)).toBe(false)
  })

  it('le sas, en avancée sur le mur est, est dedans ; à côté de lui ou au-delà, c’est dehors', () => {
    expect(sasZ).toBeLessThan(SAS.east)
    expect(indoors(sasX, sasZ)).toBe(true)
    expect(indoors(sasX, SAS.east + 0.29)).toBe(true)
    expect(indoors(sasX, SAS.east + 0.31)).toBe(false)
    expect(indoors(SAS.south - 0.31, sasZ)).toBe(false)
    expect(indoors(SAS.north + 0.31, sasZ)).toBe(false)
    // À l'ouest de la maison, à la hauteur du sas : ni l'une ni l'autre.
    expect(indoors(sasX, REST.west - 1)).toBe(false)
  })
})

describe('splitLayers', () => {
  const named = (name: string, parent: THREE.Object3D): THREE.Group => {
    const group = new THREE.Group()
    group.name = name
    parent.add(group)
    return group
  }

  it('le jardin et les arbres passent dans la couche du dehors ; la maison garde la sienne', () => {
    const root = new THREE.Group()
    const garden = named('garden', root)
    const tree = named('tree', garden)
    const shell = named('shell', root)
    const rock = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())
    const wall = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())
    const chair = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())
    garden.add(rock)
    tree.add(trunk)
    shell.add(wall)
    root.add(chair)
    // Ce qui est dehors, devant l'entrée, est un groupe `garden` dans le gros œuvre.
    const steps = named('garden', shell)
    const step = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())
    steps.add(step)
    splitLayers(root)
    for (const outside of [garden, tree, rock, trunk, steps, step]) expect(outside.layers.mask).toBe(1 << OUTDOOR)
    for (const inside of [root, shell, wall, chair]) expect(inside.layers.mask).toBe(1 << INDOOR)
  })

  it('les matériaux transparents du jardin n’écrivent plus dans la profondeur (la maison se voit à travers le grillage) ; ceux de la maison, si', () => {
    const root = new THREE.Group()
    const garden = named('garden', root)
    const wire = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ transparent: true }))
    const post = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())
    const both = new THREE.Mesh(new THREE.BoxGeometry(), [new THREE.MeshStandardMaterial({ transparent: true }), new THREE.MeshStandardMaterial()])
    garden.add(wire, post, both)
    const glass = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ transparent: true }))
    root.add(glass)
    splitLayers(root)
    expect(wire.material.depthWrite).toBe(false)
    expect(post.material.depthWrite).toBe(true)
    expect(both.material.map((material) => material.depthWrite)).toEqual([false, true])
    expect(glass.material.depthWrite).toBe(true)
  })
})

describe('renderLayers', () => {
  /** Un faux rendu : à chaque image, il retient les couches que voit la caméra et si l'image d'avant est effacée. */
  const stage = () => {
    const drawn: { mask: number; autoClear: boolean }[] = []
    const camera = new THREE.PerspectiveCamera()
    const renderer = { autoClear: true, shadowMap: { needsUpdate: false }, render: vi.fn((_scene: THREE.Scene, shot: THREE.Camera) => drawn.push({ mask: shot.layers.mask, autoClear: renderer.autoClear })) }
    const scene = new THREE.Scene()
    return { drawn, camera, renderer, scene, draw: (shadows: boolean) => renderLayers(renderer as unknown as THREE.WebGLRenderer, scene, camera, shadows) }
  }

  it('le jardin d’abord, puis la maison par-dessus, sans effacer l’image', () => {
    const { drawn, renderer, scene, camera, draw } = stage()
    draw(false)
    expect(drawn).toEqual([
      { mask: 1 << OUTDOOR, autoClear: true },
      { mask: 1 << INDOOR, autoClear: false },
    ])
    expect(renderer.render).toHaveBeenCalledWith(scene, camera)
    // Après coup, le rendu efface de nouveau avant de dessiner, et l'ombre n'a pas été redemandée.
    expect(renderer.autoClear).toBe(true)
    expect(renderer.shadowMap.needsUpdate).toBe(false)
  })

  it('l’ombre du soleil à refaire : une première passe, toutes couches vues, la met à jour', () => {
    const { drawn, renderer, draw } = stage()
    draw(true)
    expect(renderer.shadowMap.needsUpdate).toBe(true)
    const all = new THREE.Layers()
    all.enableAll()
    expect(drawn).toEqual([
      { mask: all.mask, autoClear: true },
      { mask: 1 << OUTDOOR, autoClear: true },
      { mask: 1 << INDOOR, autoClear: false },
    ])
    expect(renderer.autoClear).toBe(true)
  })
})
