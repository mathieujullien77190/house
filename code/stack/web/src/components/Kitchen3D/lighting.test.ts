import * as THREE from 'three'
import { HOUSE_SHIFT } from '@/components/Lights/constants'
import { MAP_HOUSE_HEIGHT, MAP_UNITS_PER_METER } from '@/components/MapPlan/constants'
import { KITCHEN, LAMP_LIGHT, PLAN_HOUSE, ROOM } from './constants'
import { createLighting, lampPlace } from './lighting'
import { BULB_OFF, cylinder, fixtureBulb, standard } from './primitives'
import type { SceneLamp } from './types'

/** Une place du plan de la maison (unités de la carte) d'après une place dans la maison (unités du plan, 540 × 300). */
const fromHouse = (houseX: number, houseY: number) => lampPlace(houseX + HOUSE_SHIFT, (houseY * MAP_HOUSE_HEIGHT) / PLAN_HOUSE.height)

describe('lampPlace', () => {
  it('la cuisine : du mur des fenêtres (nord) à la cloison, étirée sur sa profondeur', () => {
    const corner = fromHouse(PLAN_HOUSE.livingWest, 0)
    expect(corner?.x).toBeCloseTo(KITCHEN.xMax)
    expect(corner?.z).toBeCloseTo(ROOM.zMin)
    const middle = fromHouse(PLAN_HOUSE.livingWest + MAP_UNITS_PER_METER, PLAN_HOUSE.kitchenSouth / 2)
    expect(middle?.x).toBeCloseTo((KITCHEN.xMin + KITCHEN.xMax) / 2)
    expect(middle?.z).toBeCloseTo(ROOM.zMin + 1)
    expect(fromHouse(300, PLAN_HOUSE.kitchenSouth)?.x).toBeCloseTo(KITCHEN.xMin)
  })

  it('le salon : de la cloison à la façade des baies (sud)', () => {
    const middle = fromHouse(300, (PLAN_HOUSE.kitchenSouth + PLAN_HOUSE.height) / 2)
    expect(middle?.x).toBeCloseTo((KITCHEN.xMin + ROOM.xMin) / 2)
    const corner = fromHouse(PLAN_HOUSE.east, PLAN_HOUSE.height)
    expect(corner?.x).toBeCloseTo(ROOM.xMin)
    expect(corner?.z).toBeCloseTo(ROOM.zMin + (PLAN_HOUSE.east - PLAN_HOUSE.livingWest) / MAP_UNITS_PER_METER)
    // Sous l'escalier, côté salon : dans la pièce.
    expect(fromHouse(PLAN_HOUSE.stairsWest + 10, PLAN_HOUSE.kitchenSouth + 10)).not.toBeNull()
  })

  it('hors de l’espace de vie : rien', () => {
    expect(fromHouse(PLAN_HOUSE.livingWest - 1, 100)).toBeNull()
    expect(fromHouse(PLAN_HOUSE.east + 1, 100)).toBeNull()
    expect(fromHouse(300, -1)).toBeNull()
    expect(fromHouse(300, PLAN_HOUSE.height + 1)).toBeNull()
    // L'escalier, à l'est de la cuisine.
    expect(fromHouse(PLAN_HOUSE.stairsWest + 10, PLAN_HOUSE.kitchenSouth - 10)).toBeNull()
  })
})

const lamp = (id: string, x: number, z: number, over: Partial<SceneLamp> = {}): SceneLamp => ({ id, name: id, x, z, on: true, reachable: true, brightness: 254, color: null, ...over })

/** Une scène de deux luminaires (dont un dans un groupe déplacé ; `name` : le nom de lampe du premier) et d'un meuble sans ampoule. */
const stage = (name?: string) => {
  const root = new THREE.Group()
  const first = fixtureBulb(cylinder(0.05, 0.05, 0.1, standard(0xffffff, 1), 0, 2, 0), name)
  const holder = new THREE.Group()
  holder.position.set(1, 0, 0)
  const second = fixtureBulb(cylinder(0.05, 0.05, 0.1, standard(0xffffff, 1), 0, 1.9, 0))
  holder.add(second)
  root.add(first, holder, cylinder(0.3, 0.3, 0.4, standard(0xffffff, 1), 0.5, 0.2, 0), new THREE.Group())
  const lighting = createLighting(root)
  const group = root.children[root.children.length - 1]
  const lights = () => group.children.filter((child): child is THREE.PointLight => (child as THREE.PointLight).isPointLight)
  const owns = () => group.children.filter((child) => child.type === 'Group')
  const colorOf = (mesh: THREE.Mesh) => (mesh.material as THREE.MeshBasicMaterial).color
  return { lighting, group, lights, owns, first, second, colorOf }
}

const hex = (color: string | number) => new THREE.Color(color).getHex()

describe('createLighting', () => {
  it('sans lampe : aucune source, les luminaires restent éteints', () => {
    const { lighting, group, first, second, colorOf } = stage()
    expect(group.children).toHaveLength(0)
    lighting.apply([])
    expect(group.children).toHaveLength(0)
    expect(colorOf(first).getHex()).toBe(BULB_OFF)
    expect(colorOf(second).getHex()).toBe(BULB_OFF)
  })

  it('chaque lampe prend le luminaire le plus proche, un par lampe ; les autres ont une ampoule nue', () => {
    const { lighting, lights, owns, first, second, colorOf } = stage()
    lighting.apply([lamp('a', 0.1, 0, { color: '#ff0000', brightness: 127 }), lamp('b', 0.2, 0), lamp('c', 0.3, 0, { brightness: null }), lamp('far', 4, 4, { brightness: 1 })])
    const [a, b, c, far] = lights()
    expect(lights()).toHaveLength(4)
    // a est la plus proche du premier luminaire : la lumière part d'un peu sous son ampoule, qui prend sa couleur éclaircie.
    expect(a.position.toArray()).toEqual([0, 2 - 0.12, 0])
    expect(a.color.getHex()).toBe(hex('#ff0000'))
    expect(a.intensity).toBeCloseTo((127 / 254) * LAMP_LIGHT.intensity)
    expect(colorOf(first).getHex()).toBe(new THREE.Color('#ff0000').lerp(new THREE.Color(0xffffff), 0.35).getHex())
    // c prend le second (sa place dans la scène, groupe compris) ; sans couleur ni luminosité : blanc chaud, pleine puissance.
    expect(c.position.x).toBeCloseTo(1)
    expect(c.position.y).toBeCloseTo(1.9 - 0.12)
    expect(c.color.getHex()).toBe(hex(LAMP_LIGHT.color))
    expect(c.intensity).toBeCloseTo(LAMP_LIGHT.intensity)
    expect(colorOf(second).getHex()).toBe(new THREE.Color(LAMP_LIGHT.color).lerp(new THREE.Color(0xffffff), 0.35).getHex())
    // b n'a plus de luminaire libre, far n'en a aucun à moins de deux mètres : une ampoule nue pendue à leur place.
    expect(b.position.toArray()).toEqual([0.2, LAMP_LIGHT.height - 0.12, 0])
    expect(far.position.toArray()).toEqual([4, LAMP_LIGHT.height - 0.12, 4])
    // Allumée au minimum, une lampe garde un plancher de lumière.
    expect(far.intensity).toBeCloseTo(LAMP_LIGHT.floor * LAMP_LIGHT.intensity)
    // Allumées, leurs sources comptent toutes dans le rendu.
    expect(lights().map((light) => light.visible)).toEqual([true, true, true, true])
    const [ownA, ownB, ownC, ownFar] = owns()
    expect([ownA.visible, ownB.visible, ownC.visible, ownFar.visible]).toEqual([false, true, false, true])
    expect(ownB.position.toArray()).toEqual([0.2, LAMP_LIGHT.height, 0])
    expect(ownFar.position.toArray()).toEqual([4, LAMP_LIGHT.height, 4])
    // L'ampoule nue : une ampoule et son fil jusqu'au plafond.
    expect(ownB.children).toHaveLength(2)
    expect(colorOf(ownB.children[0] as THREE.Mesh).getHex()).toBe(new THREE.Color(LAMP_LIGHT.color).lerp(new THREE.Color(0xffffff), 0.35).getHex())
  })

  it('éteinte ou injoignable : pas de lumière, ampoule grise', () => {
    const { lighting, lights, owns, first, colorOf } = stage()
    lighting.apply([lamp('a', 0, 0, { on: false, color: '#00ff00' }), lamp('far', 4, 4, { reachable: false })])
    expect(lights().map((light) => light.intensity)).toEqual([0, 0])
    // Sa source est cachée : three.js ne la compte plus dans ses programmes (une lampe éteinte ne coûte rien à chaque pixel).
    expect(lights().map((light) => light.visible)).toEqual([false, false])
    // Rallumée, elle revient ; l'autre, toujours injoignable, reste cachée.
    lighting.apply([lamp('a', 0, 0, { color: '#00ff00' }), lamp('far', 4, 4, { reachable: false })])
    expect(lights().map((light) => light.visible)).toEqual([true, false])
    lighting.apply([lamp('a', 0, 0, { on: false, color: '#00ff00' }), lamp('far', 4, 4, { reachable: false })])
    expect(lights().map((light) => light.visible)).toEqual([false, false])
    expect(colorOf(first).getHex()).toBe(BULB_OFF)
    expect(colorOf(owns()[1].children[0] as THREE.Mesh).getHex()).toBe(BULB_OFF)
  })

  it('à chaque relecture : les sources sont réutilisées, une lampe disparue est retirée et son luminaire s’éteint', () => {
    const { lighting, group, lights, owns, first, second, colorOf } = stage()
    lighting.apply([lamp('a', 0, 0), lamp('c', 1, 0)])
    const [a, c] = lights()
    const dispose = vi.spyOn(c, 'dispose')
    lighting.apply([lamp('a', 0, 0, { brightness: 127 })])
    expect(lights()).toEqual([a])
    expect(a.intensity).toBeCloseTo((127 / 254) * LAMP_LIGHT.intensity)
    expect(owns()).toHaveLength(1)
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(colorOf(second).getHex()).toBe(BULB_OFF)
    expect(colorOf(first).getHex()).not.toBe(BULB_OFF)
    // Une lampe déplacée loin de tout luminaire reprend son ampoule nue.
    lighting.apply([lamp('a', 4, 4)])
    expect(lights()).toEqual([a])
    expect(owns()[0].visible).toBe(true)
    expect(colorOf(first).getHex()).toBe(BULB_OFF)
    lighting.apply([])
    expect(group.children).toHaveLength(0)
  })

  it('le nom passe avant la place : la lampe qui porte le nom d’un luminaire est la sienne, où qu’elle soit', () => {
    const { lighting, lights, owns, first, second, colorOf } = stage('salon')
    // « near » est tout contre le luminaire nommé, mais c'est « Salon », loin de tout, qui le prend ; une seconde lampe du même nom n'en a pas.
    lighting.apply([lamp('near', 0, 0), lamp('named', 4, 4, { name: ' Salon ', color: '#0000ff' }), lamp('twin', 4, 4, { name: 'salon' })])
    const [near, named, twin] = lights()
    expect(named.position.toArray()).toEqual([0, 2 - 0.12, 0])
    expect(colorOf(first).getHex()).toBe(new THREE.Color('#0000ff').lerp(new THREE.Color(0xffffff), 0.35).getHex())
    // « near » se rabat sur l'autre luminaire, à un mètre ; la jumelle garde une ampoule nue.
    expect(near.position.x).toBeCloseTo(1)
    expect(colorOf(second).getHex()).not.toBe(BULB_OFF)
    expect(twin.position.toArray()).toEqual([4, LAMP_LIGHT.height - 0.12, 4])
    expect(owns().map((own) => own.visible)).toEqual([false, false, true])
  })
})

describe('pick', () => {
  /** Un rayon horizontal le long de x, à la hauteur `y` et à la profondeur `z`, parti de `fromX` vers les x croissants. */
  const ray = (fromX: number, y: number, z: number) => new THREE.Ray(new THREE.Vector3(fromX, y, z), new THREE.Vector3(1, 0, 0))

  it('sans lampe, ou loin de toute ampoule : rien', () => {
    const { lighting } = stage()
    expect(lighting.pick(ray(-5, 2, 0))).toBeNull()
    lighting.apply([lamp('a', 0, 0), lamp('c', 1, 0)])
    expect(lighting.pick(ray(-5, 2, 1))).toBeNull()
    // Une ampoule derrière l'œil ne compte pas.
    expect(lighting.pick(ray(5, 2, 0))).toBeNull()
  })

  it('le rayon qui traverse une ampoule la désigne, la plus proche de l’œil si deux sont alignées', () => {
    const { lighting } = stage()
    // a prend le premier luminaire (0, 2, 0) ; b, sans luminaire à portée, a son ampoule nue à 4 m, dix centimètres plus haut.
    lighting.apply([lamp('b', 4, 0), lamp('a', 0, 0)])
    expect(lighting.pick(ray(-5, 2.02, 0))).toBe('a')
    expect(lighting.pick(ray(1.5, LAMP_LIGHT.height, 0.01))).toBe('b')
    // Vu de l'autre bout, en visant entre les deux hauteurs : b d'abord.
    expect(lighting.pick(new THREE.Ray(new THREE.Vector3(8, 2.05, 0), new THREE.Vector3(-1, 0, 0)))).toBe('b')
  })

  it('sinon, l’ampoule la plus près du rayon, à moins du rayon de visée', () => {
    const { lighting } = stage()
    lighting.apply([lamp('a', 0, 0), lamp('c', 1, 0)])
    // Le rayon passe à 15 cm du premier luminaire (y = 2) et à 25 cm du second (y = 1,9) : trop loin pour le traverser, assez près du premier.
    expect(lighting.pick(ray(-5, 2.15, 0))).toBe('a')
    // À 10 cm de l'un et 20 cm de l'autre, parti de l'autre côté : toujours le plus près du rayon.
    expect(lighting.pick(new THREE.Ray(new THREE.Vector3(5, 2.1, 0), new THREE.Vector3(-1, 0, 0)))).toBe('a')
    expect(lighting.pick(ray(-5, 1.75, 0))).toBe('c')
  })
})
