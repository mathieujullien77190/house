import * as THREE from 'three'
import { REST, ROOM } from './constants'
import { OUTDOOR } from './layers'
import { createSpill } from './spill'

/** Une fenêtre à volet : un groupe (cadre, vitre) qui porte le groupe de ses lames, marqué du nom de son volet. */
const windowAt = (root: THREE.Object3D, key: string, x: number, z: number): void => {
  const window = new THREE.Group()
  window.position.set(x, 1.6, z)
  const slats = new THREE.Group()
  slats.userData.shutter = key
  window.add(slats)
  root.add(window)
}

/** Une scène de quatre fenêtres, une par mur. */
const stage = () => {
  const root = new THREE.Group()
  windowAt(root, 'south', ROOM.xMin, 2)
  windowAt(root, 'north', ROOM.xMax, 0)
  windowAt(root, 'west', 0, REST.west)
  windowAt(root, 'east', -4, ROOM.zMax)
  const spill = createSpill(root)
  const lights = (root.children.at(-1) as THREE.Group).children as THREE.PointLight[]
  return { root, spill, lights }
}

const source = (x: number, z: number, intensity: number, color: number, indoor = true) => ({ position: new THREE.Vector3(x, 2, z), intensity, color: new THREE.Color(color), indoor })

describe('createSpill', () => {
  it('une lumière du dehors par fenêtre à volet, posée à 70 cm devant elle, du côté du mur le plus proche, éteinte', () => {
    const { lights } = stage()
    expect(lights).toHaveLength(4)
    expect(lights.map((light) => light.position.toArray())).toEqual([
      [expect.closeTo(ROOM.xMin - 0.7), 1.3, 2],
      [expect.closeTo(ROOM.xMax + 0.7), 1.3, 0],
      [0, 1.3, expect.closeTo(REST.west - 0.7)],
      [-4, 1.3, expect.closeTo(ROOM.zMax + 0.7)],
    ])
    for (const light of lights) {
      expect(light.isPointLight).toBe(true)
      expect(light.layers.mask).toBe(1 << OUTDOOR)
      expect(light.visible).toBe(false)
      expect(light.intensity).toBe(0)
      expect(light.distance).toBe(5)
    }
  })

  it('volet ouvert, une lampe allumée dans la pièce : la lumière sort, de sa couleur, d’autant plus que la lampe est près', () => {
    const { spill, lights } = stage()
    const [south, north, west, east] = lights
    // À 1,50 m de la fenêtre du sud (sur 6 m de portée) : les trois quarts de sa force comptent.
    spill.apply([source(ROOM.xMin + 1.5, 2, 4, 0xff0000)], {})
    expect(south.visible).toBe(true)
    expect(south.intensity).toBeCloseTo(2.2 * ((0.75 * 4) / 5))
    expect(south.color.getHex()).toBe(0xff0000)
    // Les fenêtres de l'est et du nord, plus loin de la lampe, en reçoivent moins ; celle de l'ouest, à plus de 6 m, rien : elle reste cachée et garde sa couleur.
    expect(east.intensity).toBeGreaterThan(0)
    expect(east.intensity).toBeLessThan(south.intensity)
    expect(north.intensity).toBeLessThan(east.intensity)
    expect(Math.hypot(ROOM.xMin + 1.5, 2 - REST.west)).toBeGreaterThan(6)
    expect(west.visible).toBe(false)
    expect(west.intensity).toBe(0)
    expect(west.color.getHex()).toBe(0xffd9a0)
  })

  it('la part ouverte du volet dose la lumière : à moitié fermé, la moitié ; fermé, plus rien', () => {
    const { spill, lights } = stage()
    const lamps = [source(ROOM.xMin + 1.5, 2, 4, 0xffffff)]
    spill.apply(lamps, { south: 0.5 })
    expect(lights[0].intensity).toBeCloseTo(1.1 * ((0.75 * 4) / 5))
    expect(lights[0].visible).toBe(true)
    spill.apply(lamps, { south: 1 })
    expect(lights[0].intensity).toBe(0)
    expect(lights[0].visible).toBe(false)
    // Rouverte : elle revient.
    spill.apply(lamps, { south: 0 })
    expect(lights[0].visible).toBe(true)
  })

  it('plusieurs lampes s’ajoutent, jusqu’à un plafond, et leurs couleurs se mêlent selon leur part ; une lampe du dehors ne compte pas', () => {
    const { spill, lights } = stage()
    // Deux lampes à la même distance (3 m : la moitié de leur force), une rouge et une bleue trois fois plus forte.
    spill.apply([source(ROOM.xMin + 3, 2, 1, 0xff0000), source(ROOM.xMin - 3, 2, 3, 0x0000ff), source(ROOM.xMin - 1, 2, 50, 0x00ff00, false)], {})
    expect(lights[0].intensity).toBeCloseTo(2.2 * ((0.5 * 1 + 0.5 * 3) / 5))
    expect(lights[0].color.r).toBeCloseTo(0.25)
    expect(lights[0].color.g).toBe(0)
    expect(lights[0].color.b).toBeCloseTo(0.75)
    // Très fortes : la lumière qui sort ne dépasse pas son plafond.
    spill.apply([source(ROOM.xMin + 1, 2, 40, 0xffffff)], {})
    expect(lights[0].intensity).toBeCloseTo(2.2)
    // Seulement une lampe du dehors : rien ne sort.
    spill.apply([source(ROOM.xMin + 1, 2, 40, 0xffffff, false)], {})
    expect(lights.map((light) => light.visible)).toEqual([false, false, false, false])
    // Aucune lampe allumée : pareil.
    spill.apply([], {})
    expect(lights.map((light) => light.intensity)).toEqual([0, 0, 0, 0])
  })

  it('les places sont dans le repère de la scène, même déplacée', () => {
    const root = new THREE.Group()
    root.position.set(10, -0.5, 3)
    windowAt(root, 'south', ROOM.xMin, 2)
    root.updateMatrixWorld(true)
    createSpill(root)
    const [light] = (root.children.at(-1) as THREE.Group).children
    expect(light.position.toArray()).toEqual([expect.closeTo(ROOM.xMin - 0.7), 1.3, expect.closeTo(2)])
  })
})
