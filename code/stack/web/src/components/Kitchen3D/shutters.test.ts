import * as THREE from 'three'
import { applyShutters, closedOf, SHUTTER_KEYS, SHUTTER_TRAVEL_S, shutterWindows, skyOf, stepShutters } from './shutters'

/** Une fenêtre à volet : son groupe, et dedans le groupe de ses lames (marqué par le nom du volet et la surface de la vitre). */
const windowOf = (key: string, area: number, slats = 10): { frame: THREE.Group; shutter: THREE.Group } => {
  const frame = new THREE.Group()
  const shutter = new THREE.Group()
  for (let slat = 0; slat < slats; slat += 1) shutter.add(new THREE.Mesh())
  shutter.userData.shutter = key
  shutter.userData.area = area
  frame.add(shutter)
  return { frame, shutter }
}

const shown = (shutter: THREE.Group): number => shutter.children.filter((slat) => slat.visible).length

describe('closedOf, skyOf', () => {
  it('la part fermée suit le dernier ordre ; un arrêt ou rien de connu : à moitié', () => {
    expect(SHUTTER_KEYS).toEqual(['cuisine', 'salon', 'pc', 'porte'])
    expect(closedOf('down')).toBe(1)
    expect(closedOf('up')).toBe(0)
    expect(closedOf('stop')).toBe(0.5)
    expect(closedOf(null)).toBe(0.5)
  })

  it('la clarté du ciel : nuit, dégagé, nuageux, couvert', () => {
    expect(skyOf({ isDay: false, code: 0 }, 12)).toBe(0)
    expect(skyOf({ isDay: true, code: 1 }, 12)).toBe(1)
    expect(skyOf({ isDay: true, code: 3 }, 12)).toBe(0.7)
    expect(skyOf({ isDay: true, code: 61 }, 12)).toBe(0.45)
  })

  it('sans météo, l’heure fait foi : jour moyen de 8 h à 18 h', () => {
    expect(skyOf(null, 7)).toBe(0)
    expect(skyOf(null, 8)).toBe(0.7)
    expect(skyOf(null, 17)).toBe(0.7)
    expect(skyOf(null, 18)).toBe(0)
  })
})

describe('applyShutters', () => {
  it('place chaque volet d’un coup et rend la part de vitre découverte, pesée par les surfaces', () => {
    const root = new THREE.Group()
    const kitchen = windowOf('cuisine', 1)
    const living = windowOf('salon', 3)
    const unknown = windowOf('pc', 4)
    root.add(kitchen.frame, living.frame, unknown.frame, new THREE.Mesh())
    // La cuisine fermée, le salon ouvert, le troisième sans état connu : à moitié.
    expect(applyShutters(root, { cuisine: 1, salon: 0 })).toBeCloseTo((0 + 3 + 2) / 8)
    expect([shown(kitchen.shutter), shown(living.shutter), shown(unknown.shutter)]).toEqual([10, 0, 5])
    expect(kitchen.shutter.userData).toMatchObject({ goal: 1, level: 1 })
    expect(unknown.shutter.userData).toMatchObject({ goal: 0.5, level: 0.5 })
  })

  it('sans volet dans la scène : aucun jour', () => {
    expect(applyShutters(new THREE.Group(), { cuisine: 0 })).toBe(0)
  })

  it('animé : le volet garde sa place et reçoit son but ; un volet jamais placé y va d’un coup', () => {
    const root = new THREE.Group()
    const kitchen = windowOf('cuisine', 1)
    const living = windowOf('salon', 1)
    root.add(kitchen.frame)
    applyShutters(root, { cuisine: 0 })
    root.add(living.frame)
    expect(applyShutters(root, { cuisine: 1, salon: 1 }, true)).toBe(0)
    expect(kitchen.shutter.userData).toMatchObject({ goal: 1, level: 0 })
    expect(shown(kitchen.shutter)).toBe(0)
    expect(living.shutter.userData).toMatchObject({ goal: 1, level: 1 })
    expect(shown(living.shutter)).toBe(10)
  })
})

describe('stepShutters', () => {
  it('les lames se déroulent vers le but, sans le dépasser, puis remontent', () => {
    const root = new THREE.Group()
    const { frame, shutter } = windowOf('cuisine', 1)
    // Un objet sans volet (ni but ni place) est laissé tel quel.
    root.add(frame)
    applyShutters(root, { cuisine: 0 })
    applyShutters(root, { cuisine: 1 }, true)
    stepShutters(root, SHUTTER_TRAVEL_S / 2)
    expect(shutter.userData.level).toBeCloseTo(0.5)
    expect(shown(shutter)).toBe(5)
    stepShutters(root, SHUTTER_TRAVEL_S)
    expect(shutter.userData.level).toBe(1)
    expect(shown(shutter)).toBe(10)
    // Arrivé : plus rien ne bouge.
    stepShutters(root, 1)
    expect(shutter.userData.level).toBe(1)
    applyShutters(root, { cuisine: 0.5 }, true)
    stepShutters(root, SHUTTER_TRAVEL_S / 4)
    expect(shutter.userData.level).toBeCloseTo(0.75)
    stepShutters(root, SHUTTER_TRAVEL_S)
    expect(shutter.userData.level).toBe(0.5)
    expect(shown(shutter)).toBe(5)
  })
})

describe('shutterWindows', () => {
  it('rend, pour chaque volet, la fenêtre entière qui le porte', () => {
    const root = new THREE.Group()
    const kitchen = windowOf('cuisine', 1)
    const living = windowOf('salon', 1)
    root.add(kitchen.frame, living.frame, new THREE.Group())
    expect(shutterWindows(root)).toEqual([
      { key: 'cuisine', object: kitchen.frame },
      { key: 'salon', object: living.frame },
    ])
  })

  it('un volet sans fenêtre autour de lui n’est pas visé', () => {
    const { shutter } = windowOf('cuisine', 1)
    shutter.removeFromParent()
    expect(shutterWindows(shutter)).toEqual([])
  })
})
