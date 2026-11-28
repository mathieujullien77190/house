import * as THREE from 'three'
import { HOUSE_SHIFT } from '@/components/Lights/constants'
import { MAP_HOUSE_HEIGHT, MAP_UNITS_PER_METER } from '@/components/MapPlan/constants'
import { KITCHEN, LAMP_LIGHT, PLAN_HOUSE, ROOM } from './constants'
import { INDOOR, OUTDOOR, indoors } from './layers'
import { BULB_OFF, box } from './primitives'
import type { Lighting, SceneLamp } from './types'

/**
 * La place d'une lampe dans la scène, d'après sa place sur le plan de la maison (unités de la carte). `null` hors de l'espace de vie
 * (chambres, salle de bain, escalier, jardin). D'ouest en est, le plan est à l'échelle (43,5 unités par mètre) ; du nord au sud, la
 * cuisine (2,8 m dans la scène) et le salon n'ont pas la même échelle que le plan : chacun est étiré sur sa propre profondeur.
 */
export const lampPlace = (planX: number, planY: number): { x: number; z: number } | null => {
  const houseX = planX - HOUSE_SHIFT
  const houseY = (planY * PLAN_HOUSE.height) / MAP_HOUSE_HEIGHT
  const { livingWest, east, kitchenSouth, height, stairsWest } = PLAN_HOUSE
  if (houseX < livingWest || houseX > east || houseY < 0 || houseY > height) return null
  if (houseY < kitchenSouth && houseX > stairsWest) return null
  const z = ROOM.zMin + (houseX - livingWest) / MAP_UNITS_PER_METER
  const x =
    houseY <= kitchenSouth
      ? KITCHEN.xMax - (houseY / kitchenSouth) * (KITCHEN.xMax - KITCHEN.xMin)
      : KITCHEN.xMin - ((houseY - kitchenSouth) / (height - kitchenSouth)) * (KITCHEN.xMin - ROOM.xMin)
  return { x, z }
}

interface Fixture {
  bulb: THREE.Mesh
  /** Le nom de la lampe Hue de ce luminaire, s'il est connu. */
  name?: string
  position: THREE.Vector3
}

interface Rig {
  light: THREE.PointLight
  /** L'ampoule dessinée pour une lampe qui n'a pas de luminaire dans la scène. */
  own: THREE.Group
  ownBulb: THREE.MeshBasicMaterial
}

const colorOf = (bulb: THREE.Mesh): THREE.Color => (bulb.material as THREE.MeshBasicMaterial).color

/**
 * L'éclairage de la scène par les vraies lampes Hue. Chaque lampe placée dans l'espace de vie a une source de lumière ; elle part du
 * luminaire qui porte son nom, sinon du luminaire dessiné le plus proche (à moins de `matchDistance`, un luminaire par lampe, les plus proches d'abord), sinon d'une ampoule
 * nue pendue au plafond à sa place. Allumée, sa lumière prend la couleur et l'intensité de la lampe ; éteinte ou injoignable, elle
 * n'éclaire pas et son ampoule est grise. `apply` se rappelle à chaque relecture du pont.
 *
 * Une lampe qui n'éclaire pas a sa source cachée (`visible = false`) : three.js ne compte dans ses programmes que les lumières visibles,
 * et chaque pixel de chaque matériau boucle sur toutes celles-là, même d'intensité nulle. Le prix : quand le nombre de lampes allumées
 * change, three.js recompile ses programmes (un à-coup d'une image), ce qui n'arrive qu'à un clic ou à une relecture du pont.
 */
export const createLighting = (root: THREE.Group): Lighting => {
  root.updateMatrixWorld(true)
  const fixtures: Fixture[] = []
  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.isMesh && mesh.userData.fixture === true) fixtures.push({ bulb: mesh, name: mesh.userData.fixtureName as string | undefined, position: mesh.getWorldPosition(new THREE.Vector3()) })
  })
  const group = new THREE.Group()
  root.add(group)
  const rigs = new Map<string, Rig>()
  const cordMaterial = new THREE.MeshStandardMaterial({ color: 0x15171a })
  // Où est l'ampoule de chaque lampe, pour la viser à la souris.
  const places = new Map<string, THREE.Vector3>()

  const rigOf = (id: string): Rig => {
    const existing = rigs.get(id)
    if (existing) return existing
    const light = new THREE.PointLight(LAMP_LIGHT.color, 0, 0, 2)
    const ownBulb = new THREE.MeshBasicMaterial({ color: BULB_OFF })
    const own = new THREE.Group()
    const cord = ROOM.height - LAMP_LIGHT.height
    // Marquée `lampBulb` : la vue Matrix la montre comme les ampoules des luminaires.
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), ownBulb)
    bulb.userData.lampBulb = true
    own.add(bulb, box(0.01, cord, 0.01, cordMaterial, 0, cord / 2 + 0.05, 0))
    group.add(light, own)
    const rig = { light, own, ownBulb }
    rigs.set(id, rig)
    return rig
  }

  const apply = (lamps: SceneLamp[], flagUnreachable = false) => {
    // Les paires lampe–luminaire possibles, des plus proches aux plus lointaines : chacun ne sert qu'une fois.
    const pairs = lamps
      .flatMap((lamp) => fixtures.map((fixture) => ({ lamp, fixture, distance: Math.hypot(fixture.position.x - lamp.x, fixture.position.z - lamp.z) })))
      .filter((pair) => pair.distance <= LAMP_LIGHT.matchDistance)
      .sort((a, b) => a.distance - b.distance)
    const fixtureOf = new Map<string, Fixture>()
    const taken = new Set<Fixture>()
    // D'abord par le nom : une lampe du pont qui porte le nom d'un luminaire dessiné est la sienne, où qu'elle soit sur le plan.
    for (const lamp of lamps) {
      const named = fixtures.find((fixture) => fixture.name === lamp.name.trim().toLowerCase() && !taken.has(fixture))
      if (!named) continue
      fixtureOf.set(lamp.id, named)
      taken.add(named)
    }
    for (const { lamp, fixture } of pairs) {
      if (fixtureOf.has(lamp.id) || taken.has(fixture)) continue
      fixtureOf.set(lamp.id, fixture)
      taken.add(fixture)
    }
    for (const fixture of fixtures) if (!taken.has(fixture)) colorOf(fixture.bulb).set(BULB_OFF)

    const seen = new Set<string>()
    places.clear()
    for (const lamp of lamps) {
      seen.add(lamp.id)
      const rig = rigOf(lamp.id)
      const fixture = fixtureOf.get(lamp.id)
      const lit = lamp.on && lamp.reachable
      const level = lit ? Math.max(LAMP_LIGHT.floor, (lamp.brightness ?? 254) / 254) : 0
      const color = new THREE.Color(lamp.color ?? LAMP_LIGHT.color)
      rig.light.color.copy(color)
      rig.light.intensity = level * LAMP_LIGHT.intensity
      rig.light.visible = lit
      // En vue Matrix, une lampe injoignable se voit : son ampoule est rouge.
      const bulbColor = flagUnreachable && !lamp.reachable ? new THREE.Color(0xff2a1f) : lit ? color.clone().lerp(new THREE.Color(0xffffff), 0.35) : new THREE.Color(BULB_OFF)
      if (fixture) {
        // Un peu sous l'ampoule dessinée : une lumière collée à son abat-jour l'éclairerait à blanc.
        rig.light.position.set(fixture.position.x, fixture.position.y - 0.12, fixture.position.z)
        rig.light.layers.set(indoors(fixture.position.x, fixture.position.z) ? INDOOR : OUTDOOR)
        colorOf(fixture.bulb).copy(bulbColor)
        rig.own.visible = false
        places.set(lamp.id, fixture.position)
      } else {
        rig.light.position.set(lamp.x, LAMP_LIGHT.height - 0.12, lamp.z)
        // Une lampe du dedans n'éclaire que la maison, une lampe du dehors que le jardin (voir `layers.ts`).
        rig.light.layers.set(indoors(lamp.x, lamp.z) ? INDOOR : OUTDOOR)
        rig.own.position.set(lamp.x, LAMP_LIGHT.height, lamp.z)
        rig.ownBulb.color.copy(bulbColor)
        rig.own.visible = true
        places.set(lamp.id, rig.own.position)
      }
    }
    for (const [id, rig] of rigs) {
      if (seen.has(id)) continue
      group.remove(rig.light, rig.own)
      rig.light.dispose()
      rigs.delete(id)
    }
  }

  // L'ampoule visée par le rayon (un abat-jour ou un mur devant elle ne gêne pas). Le rayon qui traverse une ampoule (à moins de `hitRadius`
  // de son centre) la désigne, la plus proche de l'œil si deux sont alignées ; sinon c'est l'ampoule la plus près du rayon, à moins de `pickRadius`.
  const pick = (ray: THREE.Ray): string | null => {
    let best: string | null = null
    let nearest: number = LAMP_LIGHT.pickRadius
    let hit: string | null = null
    let hitDepth = Infinity
    for (const [id, place] of places) {
      const depth = place.clone().sub(ray.origin).dot(ray.direction)
      if (depth <= 0) continue
      const distance = ray.distanceToPoint(place)
      if (distance <= LAMP_LIGHT.hitRadius && depth < hitDepth) {
        hitDepth = depth
        hit = id
      }
      if (distance > nearest) continue
      nearest = distance
      best = id
    }
    return hit ?? best
  }

  const sources = () => [...rigs.values()].filter((rig) => rig.light.visible).map((rig) => ({ position: rig.light.position, intensity: rig.light.intensity, color: rig.light.color, indoor: rig.light.layers.mask === 1 << INDOOR }))

  return { apply, pick, sources }
}
